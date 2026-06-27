import { existsSync } from "fs";
import puppeteer from "puppeteer-core";

const PAPER_SIZES = {
  A4: { width: "8.27in", height: "11.69in", widthIn: 8.27, heightIn: 11.69 },
  A5: { width: "5.83in", height: "8.27in", widthIn: 5.83, heightIn: 8.27 },
};

let browserPromise = null;

function resolvePaper(settings = {}) {
  const size = settings.print_config?.paper_size || settings.pdf_paper_size || "A4";
  return PAPER_SIZES[size] || PAPER_SIZES.A4;
}

function resolveMargins(settings = {}) {
  const pc = settings.print_config || {};
  return {
    top: `${Number(pc.margin_top ?? 10)}mm`,
    bottom: `${Number(pc.margin_bottom ?? 10)}mm`,
    left: `${Number(pc.margin_left ?? 10)}mm`,
    right: `${Number(pc.margin_right ?? 10)}mm`,
  };
}

function mmToIn(mm) {
  return (Number(mm) / 25.4).toFixed(3);
}

function formatFetchError(e, url) {
  const cause = e?.cause;
  const bits = [e?.message || "fetch failed"];
  if (cause?.code) bits.push(cause.code);
  if (cause?.address) bits.push(`${cause.address}:${cause.port ?? "?"}`);
  bits.push(`url=${url}`);
  return bits.join(" | ");
}

/** PM2 on host cannot resolve Docker service name «gotenberg» — remap to published localhost port */
function normalizeGotenbergBase(raw) {
  if (!raw) return raw;
  try {
    const u = new URL(raw);
    const publishPort = String(process.env.GOTENBERG_PUBLISH_PORT || "3001").trim();
    if (u.hostname === "gotenberg" && process.platform !== "win32") {
      const fixed = `http://127.0.0.1:${publishPort}`;
      console.warn(`[pdf] GOTENBERG_URL uses docker hostname (${raw}) → ${fixed}`);
      return fixed;
    }
    if (
      (u.hostname === "127.0.0.1" || u.hostname === "localhost") &&
      (u.port === "3000" || u.port === "") &&
      publishPort !== "3000"
    ) {
      const fixed = `http://127.0.0.1:${publishPort}`;
      console.warn(`[pdf] GOTENBERG_URL port ${u.port || "3000"} likely wrong → ${fixed}`);
      return fixed;
    }
  } catch {
    /* keep raw */
  }
  return raw;
}

export function gotenbergUrl() {
  let raw = String(process.env.GOTENBERG_URL || process.env.GOTENBERG_API_URL || "").trim();
  raw = raw.replace(/\/$/, "");
  raw = raw.replace(/\/forms\/chromium\/convert\/html$/i, "");
  return normalizeGotenbergBase(raw);
}

/** مسیر Chrome/Chromium — ویندوز، لینوکس و macOS */
export function resolveChromeExecutable() {
  const isWin = process.platform === "win32";
  const candidates = [
    process.env.CHROME_EXECUTABLE_PATH,
    process.env.PUPPETEER_EXECUTABLE_PATH,
    "/usr/bin/google-chrome-stable",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
    "/snap/bin/chromium",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    ...(isWin
      ? [
          "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
          "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
        ]
      : []),
  ].filter(Boolean);
  for (const p of candidates) {
    if (!isWin && /^[A-Za-z]:[\\/]/.test(p)) continue;
    if (existsSync(p)) return p;
  }
  return null;
}

export function chromeAvailable() {
  return resolveChromeExecutable() != null;
}

/** استایل چاپ برای وسط‌چین شدن محتوا در PDF */
export function prepareHtmlForPdf(html, settings = {}) {
  const paperKey = settings.print_config?.paper_size || settings.pdf_paper_size || "A4";
  const paper = paperKey === "A5" ? "A5" : "A4";
  const m = resolveMargins(settings);
  const patch = `<style id="pdf-print-patch">
@page { size: ${paper}; margin: ${m.top} ${m.right} ${m.bottom} ${m.left}; }
html, body {
  width: 100%;
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
body {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  background: #eef1f4 !important;
}
.page {
  width: 100% !important;
  max-width: 100% !important;
  margin: 0 auto !important;
  padding: 0 4px !important;
  box-sizing: border-box !important;
}
.card, .empty {
  break-inside: avoid !important;
  page-break-inside: avoid !important;
}
.card-text { font-size: 16px !important; }
</style>`;
  if (html.includes("</head>")) {
    return html.replace("</head>", `${patch}</head>`);
  }
  return `${patch}${html}`;
}

async function htmlToPdfViaGotenberg(html, settings = {}) {
  const baseUrl = gotenbergUrl();
  if (!baseUrl) return null;

  const paper = resolvePaper(settings);
  const margins = resolveMargins(settings);
  const prepared = prepareHtmlForPdf(html, settings);
  const form = new FormData();
  form.append("files", new Blob([prepared], { type: "text/html;charset=utf-8" }), "index.html");
  form.append("paperWidth", String(paper.widthIn));
  form.append("paperHeight", String(paper.heightIn));
  form.append("marginTop", mmToIn(parseFloat(margins.top)));
  form.append("marginBottom", mmToIn(parseFloat(margins.bottom)));
  form.append("marginLeft", mmToIn(parseFloat(margins.left)));
  form.append("marginRight", mmToIn(parseFloat(margins.right)));
  form.append("printBackground", "true");
  form.append("preferCssPageSize", "false");
  form.append("scale", "1");

  const url = `${baseUrl}/forms/chromium/convert/html`;
  const timeoutMs = parseInt(process.env.GOTENBERG_TIMEOUT_MS || "120000", 10);
  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (e) {
    throw new Error(formatFetchError(e, url));
  }
  if (!res.ok) {
    const errText = await res.text().catch(() => res.statusText);
    throw new Error(`Gotenberg ${res.status}: ${errText}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

async function getBrowser() {
  if (!browserPromise) {
    const executablePath = resolveChromeExecutable();
    if (!executablePath) {
      throw new Error(
        "Chrome محلی یافت نشد. GOTENBERG_URL را در .env سرور تنظیم کنید (مثلاً http://127.0.0.1:3001).",
      );
    }
    browserPromise = puppeteer.launch({
      executablePath,
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--font-render-hinting=none"],
    });
  }
  return browserPromise;
}

async function htmlToPdfViaPuppeteer(html, settings = {}) {
  const paper = resolvePaper(settings);
  const margins = resolveMargins(settings);
  const prepared = prepareHtmlForPdf(html, settings);
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(prepared, { waitUntil: "networkidle0", timeout: 60000 });
    const pdf = await page.pdf({
      width: paper.width,
      height: paper.height,
      printBackground: true,
      preferCSSPageSize: false,
      scale: 1,
      margin: margins,
    });
    return Buffer.from(pdf);
  } finally {
    await page.close();
  }
}

function buildPdfFailureMessage(gotenbergError) {
  const url = gotenbergUrl();
  const chromePath = resolveChromeExecutable();
  const parts = [];
  if (gotenbergError) {
    parts.push(`Gotenberg: ${gotenbergError}`);
  } else if (!url) {
    parts.push("GOTENBERG_URL در .env سرور تنظیم نشده");
  }
  if (!chromeAvailable()) {
    const badWin = process.env.CHROME_EXECUTABLE_PATH?.includes(":\\")
      ? ` (مسیر ویندوز در .env نادیده گرفته شد: ${process.env.CHROME_EXECUTABLE_PATH})`
      : "";
    parts.push(`Chrome محلی یافت نشد${badWin}`);
  } else {
    parts.push(`Chrome: ${chromePath}`);
  }
  parts.push(
    "راه‌حل: GOTENBERG_URL=http://127.0.0.1:3001 در .env سرور (docker: 127.0.0.1:3001->3000)؛ سپس pm2 restart report-backend --update-env",
  );
  return parts.join(" — ");
}

/**
 * تبدیل HTML به PDF — اولویت با Gotenberg (اگر GOTENBERG_URL تنظیم شده باشد)
 */
export async function htmlToPdfBuffer(html, settings = {}) {
  const engine = String(process.env.PDF_ENGINE || "auto").toLowerCase();
  const useGotenberg = engine === "gotenberg" || (engine === "auto" && Boolean(gotenbergUrl()));
  let gotenbergError = null;

  if (useGotenberg) {
    try {
      const buf = await htmlToPdfViaGotenberg(html, settings);
      if (buf) return buf;
      if (engine === "gotenberg") {
        throw new Error("Gotenberg پاسخ خالی داد — GOTENBERG_URL را بررسی کنید");
      }
    } catch (e) {
      gotenbergError = e.message;
      if (engine === "gotenberg") {
        throw new Error(buildPdfFailureMessage(gotenbergError));
      }
      console.warn("[newsReportPdf] Gotenberg failed:", gotenbergError);
    }
  }

  if (!chromeAvailable()) {
    throw new Error(buildPdfFailureMessage(gotenbergError));
  }

  try {
    return await htmlToPdfViaPuppeteer(html, settings);
  } catch (e) {
    throw new Error(`${buildPdfFailureMessage(gotenbergError)} | Puppeteer: ${e.message}`);
  }
}

export async function closePdfBrowser() {
  if (browserPromise) {
    const b = await browserPromise;
    await b.close();
    browserPromise = null;
  }
}

export function getPdfEngineInfo() {
  const url = gotenbergUrl();
  return {
    engine: url ? (process.env.PDF_ENGINE || "auto") : "puppeteer",
    gotenberg_configured: Boolean(url),
    gotenberg_url: url ? url.replace(/:\/\/[^@]+@/, "://***@") : null,
    chrome_path: resolveChromeExecutable(),
    chrome_available: chromeAvailable(),
    pdf_engine_env: process.env.PDF_ENGINE || "auto",
  };
}

/** تست اتصال Gotenberg — برای endpoint تشخیص */
export async function probePdfEngine() {
  const info = getPdfEngineInfo();
  if (info.gotenberg_configured) {
    const base = gotenbergUrl();
    try {
      const res = await fetch(`${base}/health`, { signal: AbortSignal.timeout(8000) });
      info.gotenberg_reachable = res.ok;
      if (!res.ok) info.gotenberg_error = `health ${res.status}`;
    } catch (e) {
      info.gotenberg_reachable = false;
      info.gotenberg_error = formatFetchError(e, `${base}/health`);
      info.gotenberg_attempted_url = `${base}/health`;
    }
  } else {
    info.gotenberg_reachable = false;
    info.gotenberg_error = "GOTENBERG_URL not set";
  }
  return info;
}
