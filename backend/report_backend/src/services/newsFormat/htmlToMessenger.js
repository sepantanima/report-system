import { TELEGRAM_MDV2_ESCAPE_RE, FORMAT, BALE_UNDERLINE_AS_ITALIC } from "./dialects.js";
import { htmlToAst, astToPlain, isLikelyHtml } from "./htmlUtils.js";

function escapeTelegramMdV2(text) {
  return String(text ?? "").replace(TELEGRAM_MDV2_ESCAPE_RE, "\\$&");
}

function escapeBaleMarkdown(text) {
  return String(text ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/`/g, "\\`");
}

function wrapTelegram(type, inner) {
  const escaped = escapeTelegramMdV2(inner);
  if (type === "bold") return `*${escaped}*`;
  if (type === "italic") return `_${escaped}_`;
  if (type === "underline") return `__${escaped}__`;
  if (type === "code") return `\`${escaped}\``;
  return escaped;
}

function wrapBale(type, inner) {
  const escaped = escapeBaleMarkdown(inner);
  if (type === "bold") return `*${escaped}*`;
  if (type === "italic") return `_${escaped}_`;
  if (type === "underline") {
    if (BALE_UNDERLINE_AS_ITALIC) return `_${escaped}_`;
    return `__${escaped}__`;
  }
  if (type === "code") return `\`${escaped}\``;
  return escaped;
}

function astToMessenger(nodes, platform) {
  const wrap = platform === FORMAT.TELEGRAM ? wrapTelegram : wrapBale;

  const walk = (list, blockContext = false) => {
    let out = "";
    for (const n of list) {
      if (n.type === "text") {
        const t = n.value;
        out += platform === FORMAT.TELEGRAM ? escapeTelegramMdV2(t) : escapeBaleMarkdown(t);
        continue;
      }
      if (n.type === "br") {
        out += "\n";
        continue;
      }
      if (n.type === "strong" || n.type === "b") {
        out += wrap("bold", walkInline(n.children));
        continue;
      }
      if (n.type === "em" || n.type === "i") {
        out += wrap("italic", walkInline(n.children));
        continue;
      }
      if (n.type === "u") {
        out += wrap("underline", walkInline(n.children));
        continue;
      }
      if (n.type === "code") {
        out += wrap("code", walkInline(n.children));
        continue;
      }
      if (n.type === "h2" || n.type === "h3") {
        if (out && !out.endsWith("\n\n")) out += blockContext ? "\n" : "\n\n";
        const heading = walkInline(n.children);
        out += platform === FORMAT.TELEGRAM
          ? `*${escapeTelegramMdV2(heading)}*\n\n`
          : `*${escapeBaleMarkdown(heading)}*\n\n`;
        continue;
      }
      if (n.type === "p") {
        if (out && !out.endsWith("\n\n") && blockContext) out += "\n";
        out += walk(n.children, true);
        out += "\n\n";
        continue;
      }
      if (n.type === "ul" || n.type === "ol") {
        if (out && !out.endsWith("\n")) out += "\n";
        out += walk(n.children, true);
        if (!out.endsWith("\n")) out += "\n";
        continue;
      }
      if (n.type === "li") {
        if (out && !out.endsWith("\n")) out += "\n";
        const item = walkInline(n.children).trim() || walk(n.children, true).trim();
        out += `• ${item}\n`;
        continue;
      }
      if (n.children) out += walk(n.children, blockContext);
    }
    return out;
  };

  const walkInline = (list) => {
    let out = "";
    for (const n of list) {
      if (n.type === "text") out += n.value;
      else if (n.type === "br") out += "\n";
      else if (n.type === "strong" || n.type === "b") out += wrap("bold", walkInline(n.children));
      else if (n.type === "em" || n.type === "i") out += wrap("italic", walkInline(n.children));
      else if (n.type === "u") out += wrap("underline", walkInline(n.children));
      else if (n.type === "code") out += wrap("code", walkInline(n.children));
      else if (n.children) out += walkInline(n.children);
    }
    return out;
  };

  return walk(nodes).replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * @param {string} htmlOrText
 * @param {string} platform - FORMAT.BALE | FORMAT.TELEGRAM
 */
export function htmlToMessenger(htmlOrText, platform) {
  const src = String(htmlOrText ?? "");
  if (!src.trim()) return "";

  const ast = isLikelyHtml(src)
    ? htmlToAst(src)
    : [{ type: "p", children: [{ type: "text", value: src }] }];

  return astToMessenger(ast, platform);
}

export function htmlToPlainFromContent(htmlOrText) {
  const src = String(htmlOrText ?? "");
  if (!src.trim()) return "";
  if (!isLikelyHtml(src)) return src.trim();
  return astToPlain(htmlToAst(src));
}
