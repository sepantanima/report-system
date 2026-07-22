export function escapeHtml(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const ALLOWED_TAGS = ["p", "strong", "b", "em", "i", "u", "code", "h2", "h3", "ul", "ol", "li", "span", "font", "s", "strike"];

const FONT_SIZE_MAP = {
  1: "10px",
  2: "13px",
  3: "16px",
  4: "18px",
  5: "24px",
  6: "32px",
  7: "48px",
};

const SAFE_COLOR_RE = /^(#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})|rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\)|hsla?\(\s*\d{1,3}(?:\.\d+)?\s*,\s*\d{1,3}%\s*,\s*\d{1,3}%(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\)|inherit|currentcolor|black|white|red|blue|green|gray|grey|orange|purple|yellow|navy|teal|maroon|olive|silver|lime|aqua|fuchsia)$/i;
const SAFE_FONT_SIZE_RE = /^\d+(\.\d+)?(px|em|rem|%)$/i;

export function isLikelyHtml(text) {
  const s = String(text ?? "").trim();
  if (!s) return false;
  return /<\/?(?:p|br|strong|b|em|i|u|code|h2|h3|ul|ol|li|div|span|font|s|strike)[\s>]/i.test(s);
}

function getAttr(tagHtml, name) {
  const re = new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i");
  const m = String(tagHtml || "").match(re);
  if (!m) return "";
  return m[2] ?? m[3] ?? m[4] ?? "";
}

function sanitizeColor(value) {
  const v = String(value || "").trim();
  if (!v || v.length > 64) return "";
  if (/url\s*\(|expression\s*\(|javascript:|@/i.test(v)) return "";
  return SAFE_COLOR_RE.test(v) ? v : "";
}

function sanitizeFontSize(value) {
  const v = String(value || "").trim();
  if (!v || v.length > 24) return "";
  return SAFE_FONT_SIZE_RE.test(v) ? v : "";
}

/** فقط color و font-size امن از style/attribute */
export function extractSafeInlineStyle(tagHtml = "", tagName = "") {
  const styles = [];
  const rawStyle = getAttr(tagHtml, "style");
  if (rawStyle) {
    for (const part of rawStyle.split(";")) {
      const idx = part.indexOf(":");
      if (idx < 0) continue;
      const prop = part.slice(0, idx).trim().toLowerCase();
      const val = part.slice(idx + 1).trim();
      if (prop === "color") {
        const c = sanitizeColor(val);
        if (c) styles.push(`color:${c}`);
      } else if (prop === "font-size") {
        const fs = sanitizeFontSize(val);
        if (fs) styles.push(`font-size:${fs}`);
      }
    }
  }

  if (String(tagName).toLowerCase() === "font") {
    const c = sanitizeColor(getAttr(tagHtml, "color"));
    if (c && !styles.some((s) => s.startsWith("color:"))) styles.push(`color:${c}`);
    const sizeAttr = getAttr(tagHtml, "size");
    const mapped = FONT_SIZE_MAP[String(parseInt(sizeAttr, 10))];
    if (mapped && !styles.some((s) => s.startsWith("font-size:"))) styles.push(`font-size:${mapped}`);
  }

  return styles.join(";");
}

/** تبدیل HTML محدود به درخت ساده برای سریالایزر */
export function htmlToAst(html = "") {
  let src = String(html ?? "").trim();
  if (!src) return [{ type: "text", value: "" }];

  src = src
    .replace(/<\s*(script|style|iframe|object|embed|link|meta)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
    .replace(/<\s*(script|style|iframe|object|embed|link|meta)[^>]*\/?\s*>/gi, "")
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");

  const nodes = [];
  const stack = [{ type: "root", children: nodes }];
  const tagRe = /<\/?([a-z0-9]+)([^>]*)>|([^<]+)/gi;
  let m;
  while ((m = tagRe.exec(src)) !== null) {
    const full = m[0];
    if (full.startsWith("</")) {
      const name = String(m[1] || "").toLowerCase();
      const normalized = name === "font" ? "span"
        : name === "strike" ? "s"
        : name === "b" ? "strong"
        : name === "i" ? "em"
        : name;
      if (stack.length > 1 && stack[stack.length - 1].type === normalized) {
        stack.pop();
      }
      continue;
    }
    if (full.startsWith("<")) {
      const name = String(m[1] || "").toLowerCase();
      const attrs = m[2] || "";
      if (name === "br") {
        stack[stack.length - 1].children.push({ type: "br" });
        continue;
      }
      if (!ALLOWED_TAGS.includes(name)) continue;

      const style = extractSafeInlineStyle(`<${name}${attrs}>`, name);
      let type = name;
      if (name === "font") type = "span";
      if (name === "strike") type = "s";
      if (name === "b") type = "strong";
      if (name === "i") type = "em";

      const node = { type, children: [] };
      if (style) node.style = style;
      stack[stack.length - 1].children.push(node);
      stack.push(node);
      continue;
    }
    const text = m[3] ?? "";
    if (text) {
      stack[stack.length - 1].children.push({ type: "text", value: text });
    }
  }
  return nodes;
}

function openTag(name, style) {
  return style ? `<${name} style="${escapeHtml(style)}">` : `<${name}>`;
}

export function astToHtml(nodes) {
  const walk = (list) => {
    let out = "";
    for (const n of list) {
      if (n.type === "text") out += escapeHtml(n.value);
      else if (n.type === "br") out += "<br>";
      else if (n.type === "p") out += `${openTag("p", n.style)}${walk(n.children)}</p>`;
      else if (n.type === "strong" || n.type === "b") out += `${openTag("strong", n.style)}${walk(n.children)}</strong>`;
      else if (n.type === "em" || n.type === "i") out += `${openTag("em", n.style)}${walk(n.children)}</em>`;
      else if (n.type === "u") out += `${openTag("u", n.style)}${walk(n.children)}</u>`;
      else if (n.type === "s" || n.type === "strike") out += `${openTag("s", n.style)}${walk(n.children)}</s>`;
      else if (n.type === "code") out += `${openTag("code", n.style)}${walk(n.children)}</code>`;
      else if (n.type === "span") {
        const inner = walk(n.children);
        out += n.style ? `${openTag("span", n.style)}${inner}</span>` : inner;
      } else if (n.type === "h2") out += `${openTag("h2", n.style)}${walk(n.children)}</h2>`;
      else if (n.type === "h3") out += `${openTag("h3", n.style)}${walk(n.children)}</h3>`;
      else if (n.type === "ul") out += `<ul>${walk(n.children)}</ul>`;
      else if (n.type === "ol") out += `<ol>${walk(n.children)}</ol>`;
      else if (n.type === "li") out += `${openTag("li", n.style)}${walk(n.children)}</li>`;
      else if (n.children) out += walk(n.children);
    }
    return out;
  };
  const body = walk(nodes);
  if (
    !body.includes("<p>")
    && !body.includes("<h2")
    && !body.includes("<h3")
    && !body.includes("<ul")
    && !body.includes("<ol")
  ) {
    return body ? `<p>${body}</p>` : "";
  }
  return body;
}

/** پاکسازی HTML به تگ‌های مجاز راهبردی (+ color/font-size امن) */
export function sanitizeHtmlAllowlist(html = "") {
  const src = String(html ?? "").trim();
  if (!src) return "";
  if (!isLikelyHtml(src)) return src;
  return astToHtml(htmlToAst(src));
}

export function astToPlain(nodes) {
  const walk = (list) => {
    let out = "";
    for (const n of list) {
      if (n.type === "text") out += n.value;
      else if (n.type === "br") out += "\n";
      else if (n.type === "li") {
        if (out && !out.endsWith("\n")) out += "\n";
        out += `• ${walk(n.children).trim()}`;
        out += "\n";
      } else if (n.type === "ul" || n.type === "ol") {
        if (out && !out.endsWith("\n")) out += "\n";
        out += walk(n.children);
        if (!out.endsWith("\n")) out += "\n";
      } else if (n.type === "p" || n.type === "h2" || n.type === "h3") {
        if (out && !out.endsWith("\n")) out += "\n";
        out += walk(n.children);
        out += "\n";
      } else if (n.children) out += walk(n.children);
    }
    return out;
  };
  return walk(nodes).replace(/\n{3,}/g, "\n\n").trim();
}
