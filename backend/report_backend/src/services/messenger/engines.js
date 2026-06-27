import axios from "axios";
import fs from "fs";

function apiBase(baseUrl, token) {
  const base = String(baseUrl || "https://tapi.bale.ai").replace(/\/$/, "");
  return `${base}/bot${token}`;
}

async function postMultipart(url, fields, filePath, fileFieldName, fileName) {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    if (v != null && v !== "") form.append(k, String(v));
  }
  const buf = fs.readFileSync(filePath);
  form.append(fileFieldName, new Blob([buf]), fileName || "report.txt");
  const res = await fetch(url, { method: "POST", body: form });
  const data = await res.json();
  if (!res.ok) {
    const err = data?.description || data?.error || res.statusText;
    throw new Error(String(err));
  }
  return data;
}

export async function baleSendMessage({ token, baseUrl, chatId, text, parseMode }) {
  const url = `${apiBase(baseUrl, token)}/sendMessage`;
  const payload = { chat_id: chatId, text };
  if (parseMode) payload.parse_mode = parseMode;
  try {
    const res = await axios.post(url, payload, { timeout: 60000 });
    if (res.data?.ok === false) throw new Error(res.data?.description || "خطای بله");
    return res.data;
  } catch (e) {
    const msg = e.response?.data?.description || e.response?.data?.error || e.message;
    throw new Error(msg);
  }
}

export async function baleSendDocument({ token, baseUrl, chatId, filePath, fileName, caption, parseMode }) {
  const url = `${apiBase(baseUrl, token)}/sendDocument`;
  const fields = { chat_id: chatId };
  if (caption) fields.caption = caption;
  if (parseMode) fields.parse_mode = parseMode;
  return postMultipart(url, fields, filePath, "document", fileName);
}

export async function telegramSendMessage({ token, baseUrl, chatId, text, parseMode }) {
  const url = `${apiBase(baseUrl || "https://api.telegram.org", token)}/sendMessage`;
  const payload = { chat_id: chatId, text };
  if (parseMode) payload.parse_mode = parseMode;
  const res = await axios.post(url, payload, { timeout: 60000 });
  return res.data;
}

export async function telegramSendDocument({ token, baseUrl, chatId, filePath, fileName, caption, parseMode }) {
  const url = `${apiBase(baseUrl || "https://api.telegram.org", token)}/sendDocument`;
  const fields = { chat_id: chatId };
  if (caption) fields.caption = caption;
  if (parseMode) fields.parse_mode = parseMode;
  return postMultipart(url, fields, filePath, "document", fileName);
}

/** ایتا — ساختار مشابه بله تا زمان تفکیک API */
export async function eitaaSendMessage(opts) {
  return baleSendMessage({ ...opts, baseUrl: opts.baseUrl || "https://eitaayar.ir/api" });
}

export async function eitaaSendDocument(opts) {
  return baleSendDocument({ ...opts, baseUrl: opts.baseUrl || "https://eitaayar.ir/api" });
}
