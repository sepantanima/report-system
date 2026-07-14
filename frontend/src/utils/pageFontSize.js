import { useCallback, useEffect, useState } from "react";
import { toPersianDigits } from "./analysisMonitorUtils.js";

const STORAGE_KEY = "page_font_level";
const MIN = 1;
const MAX = 6;
const DEFAULT = 2;

/** اندازه ثابت UI (دکمه‌ها، برچسب‌ها، عناوین) — ورودی‌ها و متن کارت‌ها با --input-font-size مقیاس می‌شوند */
export const BASE_PAGE_FONT_PX = "14px";

export function readPageFontLevel() {
  if (typeof window === "undefined") return DEFAULT;
  const v = parseInt(localStorage.getItem(STORAGE_KEY), 10);
  return v >= MIN && v <= MAX ? v : DEFAULT;
}

export function savePageFontLevel(level) {
  const n = Math.min(MAX, Math.max(MIN, Number(level) || DEFAULT));
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, String(n));
  }
  return n;
}

/** سطح ۱–۶ → px (پیش‌فرض ۲ ≈ ۱۴px) */
export function pageFontLevelToPx(level) {
  const lv = Math.min(MAX, Math.max(MIN, Number(level) || DEFAULT));
  return `${10 + lv * 2}px`;
}

/** تبدیل px ثابت (بر پایه ۱۴) به em — با font-size والد مقیاس می‌شود */
export function pxToEm(px, base = 14) {
  return `${px / base}em`;
}

export function usePageFontSize() {
  const [level, setLevelState] = useState(readPageFontLevel);

  const setLevel = useCallback((next) => {
    setLevelState((prev) => {
      const raw = typeof next === "function" ? next(prev) : next;
      return savePageFontLevel(raw);
    });
  }, []);

  const cycleFont = useCallback(() => {
    setLevel((l) => (l >= MAX ? MIN : l + 1));
  }, [setLevel]);

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === STORAGE_KEY && e.newValue != null) {
        setLevelState(readPageFontLevel());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return {
    level,
    setLevel,
    cycleFont,
    fontSizePx: pageFontLevelToPx(level),
    label: toPersianDigits(level),
  };
}
