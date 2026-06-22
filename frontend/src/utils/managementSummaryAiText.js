/**
 * تبدیل خروجی سادهٔ Markdown مدل (**bold**، ****عنوان****) به HTML برای RichTextEditor.
 * خط خالی بعد از تیترها با <p><br></p> حفظ می‌شود.
 */

const H_START = "\uE000";
const H_END = "\uE001";
const B_START = "\uE002";
const B_END = "\uE003";

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function aiMarkdownToHtml(raw) {
  let s = String(raw ?? "").replace(/\r\n/g, "\n").trim();
  if (!s) return "";

  s = s.replace(/\*\*\*\*([\s\S]*?)\*\*\*\*/g, (_, inner) => `${H_START}${inner.trim()}${H_END}`);
  s = s.replace(/\*\*([\s\S]*?)\*\*/g, (_, inner) => `${B_START}${inner.trim()}${B_END}`);

  s = escapeHtml(s);

  s = s.replace(new RegExp(`${H_START}([\\s\\S]*?)${H_END}`, "g"), (_, inner) => {
    const t = inner.trim();
    return t
      ? `<h3 style="margin:12px 0 8px;font-size:1.06em;font-weight:700">${t}</h3><p><br></p>`
      : "";
  });
  s = s.replace(new RegExp(`${B_START}([\\s\\S]*?)${B_END}`, "g"), (_, inner) => {
    const t = inner.trim();
    return t ? `<strong>${t}</strong>` : "";
  });

  return s
    .split("\n")
    .map((line) => (line.trim() === "" ? "<p><br></p>" : `<p>${line}</p>`))
    .join("");
}
