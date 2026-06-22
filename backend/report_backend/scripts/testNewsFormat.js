import test from "node:test";
import assert from "node:assert/strict";
import {
  convertNewsText,
  exportCleanedText,
  ingestRawToCleanedHtml,
  messengerToHtml,
  FORMAT,
  SOURCE_PLATFORM,
} from "../src/services/newsFormat/index.js";

test("bale bold to html", () => {
  const html = messengerToHtml("این *مهم* است", SOURCE_PLATFORM.BALE);
  assert.match(html, /<strong>مهم<\/strong>/);
});

test("italic and code", () => {
  const html = messengerToHtml("_italic_ and `code`", SOURCE_PLATFORM.BALE);
  assert.match(html, /<em>italic<\/em>/);
  assert.match(html, /<code>code<\/code>/);
});

test("telegram underline __", () => {
  const html = messengerToHtml("__زیرخط__", SOURCE_PLATFORM.TELEGRAM);
  assert.match(html, /<u>زیرخط<\/u>/);
});

test("html to bale roundtrip content", () => {
  const html = "<p>سلام <strong>دنیا</strong></p>";
  const bale = exportCleanedText(html, "bale");
  assert.match(bale, /\*دنیا\*/);
});

test("html to telegram escapes parens", () => {
  const html = "<p>متن (پرانتز)</p>";
  const tg = exportCleanedText(html, "telegram");
  assert.match(tg, /\\\(پرانتز\\\)/);
});

test("ingest preserves non-html as html", () => {
  const html = ingestRawToCleanedHtml("*خبر* جدید", SOURCE_PLATFORM.BALE);
  assert.match(html, /<strong>خبر<\/strong>/);
});

test("ingest html unchanged", () => {
  const src = "<p><strong>x</strong></p>";
  assert.equal(ingestRawToCleanedHtml(src, SOURCE_PLATFORM.BALE), src);
});

test("export plain strips markup", () => {
  const plain = exportCleanedText("<p><strong>الف</strong> ب</p>", "plain");
  assert.equal(plain, "الف ب");
});

test("convert plain to telegram", () => {
  const out = convertNewsText("hello", { from: "plain", to: "telegram" });
  assert.equal(typeof out, "string");
});
