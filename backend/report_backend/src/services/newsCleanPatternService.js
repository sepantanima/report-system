import pool from "../db.js";
import { compilePhraseToRegExp, compilePatternRow, compileRawRegex, detectMatchKind } from "./newsIngest/newsPatternCompiler.js";
import { cleanNewsPlainText } from "./newsIngest/newsPatternCleaner.js";

const CACHE_TTL_MS = 60_000;
let cache = { at: 0, rows: [] };

export function invalidatePatternCache() {
  cache = { at: 0, rows: [] };
}

function mapCompiledRow(row) {
  const regex = compilePatternRow(row);
  if (!regex) return null;
  return {
    ...row,
    regex,
    remove_mode: row.remove_mode === "line" ? "line" : "phrase",
  };
}

export async function listPatterns() {
  const res = await pool.query(
    `SELECT id, title_fa, phrase, match_kind, remove_mode, is_regex, is_enabled, sort_order, is_builtin, created_at, updated_at
     FROM tbl_news_clean_patterns
     ORDER BY sort_order ASC, id ASC`,
  );
  return res.rows;
}

export async function listEnabledPatternsCompiled() {
  if (cache.loaded && Date.now() - cache.at < CACHE_TTL_MS) {
    return cache.rows;
  }
  try {
    const res = await pool.query(
      `SELECT id, title_fa, phrase, match_kind, remove_mode, is_regex
       FROM tbl_news_clean_patterns
       WHERE is_enabled = true
       ORDER BY sort_order ASC, id ASC`,
    );
    cache = {
      at: Date.now(),
      loaded: true,
      rows: res.rows.map(mapCompiledRow).filter(Boolean),
    };
    return cache.rows;
  } catch (e) {
    if (e?.code === "42P01") return [];
    throw e;
  }
}

export async function getPatternById(id) {
  const pid = parseInt(id, 10);
  if (!Number.isFinite(pid)) return null;
  const res = await pool.query(
    `SELECT id, title_fa, phrase, match_kind, remove_mode, is_regex, is_enabled, sort_order, is_builtin, created_at, updated_at
     FROM tbl_news_clean_patterns WHERE id = $1`,
    [pid],
  );
  return res.rows[0] || null;
}

function normalizeRemoveMode(v) {
  return v === "line" ? "line" : "phrase";
}

function validatePatternBody(body = {}) {
  const phrase = String(body.phrase ?? "").trim();
  if (!phrase) return "عبارت الزامی است";
  if (phrase.length > 500) return "عبارت حداکثر ۵۰۰ کاراکتر";
  const title = body.title_fa != null ? String(body.title_fa).trim() : "";
  if (title.length > 120) return "عنوان حداکثر ۱۲۰ کاراکتر";
  const isRegex = !!body.is_regex;
  if (isRegex) {
    if (!compileRawRegex(phrase)) return "الگوی عبارت منظم (Regex) نامعتبر است";
  } else {
    const kind = String(body.match_kind ?? "auto").trim();
    if (!["auto", "phrase", "domain", "handle", "hashtag", "url_path"].includes(kind)) {
      return "نوع تطبیق نامعتبر است";
    }
    if (!compilePhraseToRegExp(phrase, kind)) return "عبارت قابل تبدیل به الگو نیست";
  }
  const rm = normalizeRemoveMode(body.remove_mode);
  if (!["phrase", "line"].includes(rm)) return "حالت حذف نامعتبر است";
  return null;
}

export async function createPattern(body = {}) {
  const err = validatePatternBody(body);
  if (err) throw new Error(err);
  const phrase = String(body.phrase).trim();
  const isRegex = !!body.is_regex;
  const matchKind = isRegex ? "regex" : detectMatchKind(phrase, String(body.match_kind ?? "auto"));
  const removeMode = normalizeRemoveMode(body.remove_mode);
  const res = await pool.query(
    `INSERT INTO tbl_news_clean_patterns (title_fa, phrase, match_kind, remove_mode, is_regex, is_enabled, sort_order, is_builtin)
     VALUES ($1, $2, $3, $4, $5, $6, $7, false)
     RETURNING *`,
    [
      String(body.title_fa ?? "").trim() || null,
      phrase,
      matchKind,
      removeMode,
      isRegex,
      body.is_enabled !== false,
      Number.isFinite(Number(body.sort_order)) ? Number(body.sort_order) : 1000,
    ],
  );
  invalidatePatternCache();
  return res.rows[0];
}

export async function updatePattern(id, body = {}) {
  const existing = await getPatternById(id);
  if (!existing) return null;
  const phrase = body.phrase !== undefined ? String(body.phrase).trim() : existing.phrase;
  const isRegex = body.is_regex !== undefined ? !!body.is_regex : !!existing.is_regex;
  const matchKind = body.match_kind !== undefined || body.is_regex !== undefined
    ? (isRegex ? "regex" : detectMatchKind(phrase, String(body.match_kind ?? existing.match_kind ?? "auto")))
    : existing.match_kind;
  const removeMode = body.remove_mode !== undefined
    ? normalizeRemoveMode(body.remove_mode)
    : normalizeRemoveMode(existing.remove_mode);
  const err = validatePatternBody({
    phrase,
    title_fa: body.title_fa !== undefined ? body.title_fa : existing.title_fa,
    match_kind: matchKind,
    is_regex: isRegex,
    remove_mode: removeMode,
  });
  if (err) throw new Error(err);

  const res = await pool.query(
    `UPDATE tbl_news_clean_patterns SET
       title_fa = $1,
       phrase = $2,
       match_kind = $3,
       remove_mode = $4,
       is_regex = $5,
       is_enabled = COALESCE($6, is_enabled),
       sort_order = COALESCE($7, sort_order),
       updated_at = CURRENT_TIMESTAMP
     WHERE id = $8
     RETURNING *`,
    [
      body.title_fa !== undefined ? (String(body.title_fa).trim() || null) : existing.title_fa,
      phrase,
      matchKind,
      removeMode,
      isRegex,
      body.is_enabled !== undefined ? !!body.is_enabled : null,
      body.sort_order !== undefined ? Number(body.sort_order) : null,
      existing.id,
    ],
  );
  invalidatePatternCache();
  return res.rows[0];
}

export async function deletePattern(id) {
  const existing = await getPatternById(id);
  if (!existing) return null;
  if (existing.is_builtin) {
    throw new Error("الگوهای پیش‌فرض قابل حذف نیستند؛ می‌توانید غیرفعال کنید");
  }
  await pool.query("DELETE FROM tbl_news_clean_patterns WHERE id = $1", [existing.id]);
  invalidatePatternCache();
  return existing;
}

export async function testPatternClean(text) {
  const patterns = await listEnabledPatternsCompiled();
  const before = String(text ?? "");
  const result = cleanNewsPlainText(before, patterns);
  const matched = patterns.filter((p) => p.id != null && result.removedPatternIds.includes(p.id));
  return {
    before,
    after: result.text,
    summary: result.summary,
    removed_builtin_count: result.removedBuiltin.length,
    matched_patterns: matched.map((p) => ({
      id: p.id,
      title_fa: p.title_fa,
      phrase: p.phrase,
      remove_mode: p.remove_mode,
      is_regex: p.is_regex,
    })),
  };
}
