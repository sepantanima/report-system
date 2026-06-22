export function escapeHtml(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function isLikelyHtml(text) {
  const s = String(text ?? "").trim();
  if (!s) return false;
  return /<\/?[a-z][a-z0-9]*[\s>]/i.test(s);
}

/** تبدیل HTML محدود به درخت ساده برای سریالایزر */
export function htmlToAst(html = "") {
  const src = String(html ?? "").trim();
  if (!src) return [{ type: "text", value: "" }];

  const nodes = [];
  const stack = [{ type: "root", children: nodes }];
  const tagRe = /<\/?([a-z0-9]+)[^>]*>|([^<]+)/gi;
  let m;
  while ((m = tagRe.exec(src)) !== null) {
    const full = m[0];
    if (full.startsWith("</")) {
      const name = full.replace(/<\/?([a-z0-9]+)[^>]*>/i, "$1").toLowerCase();
      if (stack.length > 1 && stack[stack.length - 1].type === name) {
        stack.pop();
      }
      continue;
    }
    if (full.startsWith("<")) {
      const name = m[1]?.toLowerCase();
      if (name === "br") {
        stack[stack.length - 1].children.push({ type: "br" });
        continue;
      }
      if (["p", "strong", "b", "em", "i", "u", "code", "h2", "h3"].includes(name)) {
        const node = { type: name, children: [] };
        stack[stack.length - 1].children.push(node);
        stack.push(node);
        continue;
      }
      continue;
    }
    const text = m[2] ?? "";
    if (text) {
      stack[stack.length - 1].children.push({ type: "text", value: text });
    }
  }
  return nodes;
}

export function astToHtml(nodes) {
  const walk = (list) => {
    let out = "";
    for (const n of list) {
      if (n.type === "text") out += escapeHtml(n.value);
      else if (n.type === "br") out += "<br>";
      else if (n.type === "p") out += `<p>${walk(n.children)}</p>`;
      else if (n.type === "strong" || n.type === "b") out += `<strong>${walk(n.children)}</strong>`;
      else if (n.type === "em" || n.type === "i") out += `<em>${walk(n.children)}</em>`;
      else if (n.type === "u") out += `<u>${walk(n.children)}</u>`;
      else if (n.type === "code") out += `<code>${walk(n.children)}</code>`;
      else if (n.type === "h2") out += `<h2>${walk(n.children)}</h2>`;
      else if (n.type === "h3") out += `<h3>${walk(n.children)}</h3>`;
      else if (n.children) out += walk(n.children);
    }
    return out;
  };
  const body = walk(nodes);
  if (!body.includes("<p>") && !body.includes("<h2") && !body.includes("<h3")) {
    return body ? `<p>${body}</p>` : "";
  }
  return body;
}

export function astToPlain(nodes) {
  const walk = (list) => {
    let out = "";
    for (const n of list) {
      if (n.type === "text") out += n.value;
      else if (n.type === "br") out += "\n";
      else if (n.type === "p" || n.type === "h2" || n.type === "h3") {
        if (out && !out.endsWith("\n")) out += "\n";
        out += walk(n.children);
        out += "\n";
      } else if (n.children) out += walk(n.children);
    }
    return out;
  };
  return walk(nodes).replace(/\n{3,}/g, "\n\n").trim();
}
