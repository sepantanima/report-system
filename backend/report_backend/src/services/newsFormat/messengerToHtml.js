import { escapeHtml } from "./htmlUtils.js";
import { SOURCE_PLATFORM, normalizeSourcePlatform } from "./dialects.js";

/**
 * پارس inline Markdown کلاسیک (*bold* _italic_ `code`)
 * @param {string} line
 * @returns {string} HTML fragment (بدون p)
 */
export function parseInlineMarkdown(line) {
  const src = String(line ?? "");
  let out = "";
  let i = 0;

  const readUntil = (delim, allowEmpty = false) => {
    let j = i;
    let buf = "";
    while (j < src.length) {
      if (src[j] === "\\" && j + 1 < src.length) {
        buf += src[j + 1];
        j += 2;
        continue;
      }
      if (src[j] === delim) break;
      buf += src[j];
      j += 1;
    }
    if (j >= src.length || (!allowEmpty && !buf)) return null;
    i = j + 1;
    return buf;
  };

  while (i < src.length) {
    if (src[i] === "\\" && i + 1 < src.length) {
      out += escapeHtml(src[i + 1]);
      i += 2;
      continue;
    }

    if (src[i] === "*" && src[i + 1] === "*") {
      i += 2;
      const inner = readUntil("*", false);
      if (inner == null) {
        out += escapeHtml("**");
        continue;
      }
      if (src[i] === "*") i += 1;
      out += `<strong>${escapeHtml(inner)}</strong>`;
      continue;
    }

    if (src[i] === "*") {
      i += 1;
      const inner = readUntil("*", false);
      if (inner == null) {
        out += escapeHtml("*");
        continue;
      }
      out += `<strong>${escapeHtml(inner)}</strong>`;
      continue;
    }

    if (src[i] === "_" && src[i + 1] === "_") {
      i += 2;
      const inner = readUntil("_", false);
      if (inner == null) {
        out += escapeHtml("__");
        continue;
      }
      if (src[i] === "_") i += 1;
      out += `<u>${escapeHtml(inner)}</u>`;
      continue;
    }

    if (src[i] === "_") {
      i += 1;
      const inner = readUntil("_", false);
      if (inner == null) {
        out += escapeHtml("_");
        continue;
      }
      out += `<em>${escapeHtml(inner)}</em>`;
      continue;
    }

    if (src[i] === "`") {
      i += 1;
      const inner = readUntil("`", false);
      if (inner == null) {
        out += escapeHtml("`");
        continue;
      }
      out += `<code>${escapeHtml(inner)}</code>`;
      continue;
    }

    out += escapeHtml(src[i]);
    i += 1;
  }

  return out;
}

/**
 * @param {string} text
 * @param {string} [platform]
 */
export function messengerToHtml(text, platform = SOURCE_PLATFORM.AUTO) {
  const raw = String(text ?? "");
  if (!raw.trim()) return "";

  const p = normalizeSourcePlatform(platform) || SOURCE_PLATFORM.AUTO;

  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  const paragraphs = [];
  let buf = [];

  const flush = () => {
    if (!buf.length) return;
    const inner = buf.map((l) => parseInlineMarkdown(l)).join("<br>");
    paragraphs.push(`<p>${inner}</p>`);
    buf = [];
  };

  for (const line of lines) {
    if (!line.trim()) {
      flush();
      continue;
    }
    buf.push(line);
  }
  flush();

  if (!paragraphs.length) return "";
  return paragraphs.join("");
}
