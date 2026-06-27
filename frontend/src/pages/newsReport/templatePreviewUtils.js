/** جایگزینی {{placeholder}} — همان منطق backend */
export function applyTemplate(template, vars) {
  let out = String(template || "");
  for (const [key, val] of Object.entries(vars)) {
    out = out.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), String(val ?? ""));
  }
  return out;
}

const SAMPLE_NEWS = [
  {
    index: "۱",
    news_date: "۱۴۰۴/۰۱/۱۵",
    news_time: "۱۰:۳۰",
    news_source: "خبرگزاری نمونه",
    news_text: "این متن نمونه برای پیش‌نمایش قالب است. محتوای واقعی خبر اینجا نمایش داده می‌شود.",
  },
  {
    index: "۲",
    news_date: "۱۴۰۴/۰۱/۱۵",
    news_time: "۱۱:۴۵",
    news_source: "فضای مجازی",
    news_text: "خبر دوم نمونه با متن کوتاه‌تر.",
  },
];

function sampleCardHtml(color = "#c00000") {
  return SAMPLE_NEWS.map((n) => `
<div class="card">
  <div class="card-header">
    <span class="number">خبر ${n.index}</span>
    <span class="datetime">${n.news_date} | ${n.news_time}</span>
    <span class="source">${n.news_source}</span>
  </div>
  <div class="card-text">${n.news_text}</div>
</div>`).join("");
}

function sampleTableRows() {
  return SAMPLE_NEWS.map((n) => `
<tr>
<td>${n.index}</td>
<td>${n.news_time}</td>
<td class="text">${n.news_text}</td>
<td>${n.news_source}</td>
<td>در حال بررسی</td>
</tr>`).join("");
}

function buildNewsListFromItemTemplate(itemTemplate) {
  return SAMPLE_NEWS.map((n) => applyTemplate(itemTemplate, n)).join("\n\n");
}

function baseVars(settings = {}, templateKey = "") {
  const cardMeta = `
  <div class="meta-item"><span class="label">تاریخ گزارش:</span><span class="value">۱۴۰۴/۰۱/۱۵</span></div>
  <div class="meta-item"><span class="label">بازه:</span><span class="value">۰۶:۰۰ تا ۱۲:۰۰</span></div>
  <div class="meta-item"><span class="label">تعداد:</span><span class="value">۲</span></div>`;
  const tableMeta = "تاریخ گزارش: ۱۴۰۴/۰۱/۱۵ | بازه: ۰۶:۰۰-۱۲:۰۰ | تعداد: ۲";

  return {
    label: settings.default_label || "گزارش اخبار نمونه",
    report_date: "۱۴۰۴/۰۱/۱۵",
    display_from: "۱۴۰۴/۰۱/۱۵ ۰۶:۰۰",
    display_to: "۱۴۰۴/۰۱/۱۵ ۱۲:۰۰",
    news_count: "۲",
    news_count_text: "۲ خبر",
    signature: settings.signature_text || "سامانه پایش و تحلیل اخبار",
    hashtags: settings.hashtags || "#پایش_خبر",
    color: settings.report_color || "#c00000",
    org_block: settings.organization_name
      ? `<div class="org">${settings.organization_name}</div>`
      : "",
    meta: templateKey === "html_card_template" ? cardMeta : tableMeta,
    cards: sampleCardHtml(settings.report_color),
    table_rows: sampleTableRows(),
  };
}

/** @returns {{ type: 'html'|'text', content: string }} */
export function buildTemplatePreview(templateKey, template, settings = {}) {
  const vars = baseVars(settings, templateKey);
  const itemTpl = settings.news_item_template || "{{index}}) {{news_date}} {{news_time}}\n{{news_source}}\n{{news_text}}";
  vars.news_list = buildNewsListFromItemTemplate(itemTpl);

  if (templateKey === "news_item_template") {
    return {
      type: "text",
      content: applyTemplate(template, SAMPLE_NEWS[0]),
    };
  }

  if (templateKey === "html_card_template" || templateKey === "html_table_template") {
    return {
      type: "html",
      content: applyTemplate(template, vars),
    };
  }

  return {
    type: "text",
    content: applyTemplate(template, vars),
  };
}
