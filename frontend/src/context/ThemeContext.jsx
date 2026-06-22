import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const STORAGE_KEY = "theme";

/** خواندن تم ذخیره‌شده؛ بدون مقدار = تیره (هم‌راستا با SystemSetting قبلی) */
export function readStoredThemeIsDark() {
  if (typeof window === "undefined") return true;
  const t = localStorage.getItem(STORAGE_KEY);
  if (!t) return true;
  return t === "dark";
}

/** اعمال کلاس روی body و ذخیره در localStorage (منبع حقیقت برای CSS سراسری) */
export function applyDocumentTheme(isDark) {
  if (typeof document === "undefined") return;
  document.body.classList.toggle("dark", !!isDark);
  document.body.classList.toggle("light", !isDark);
  localStorage.setItem(STORAGE_KEY, isDark ? "dark" : "light");
}

const ThemeContext = createContext(undefined);

export function ThemeProvider({ children }) {
  const [isDarkMode, setIsDarkModeState] = useState(readStoredThemeIsDark);

  const setIsDarkMode = useCallback((next) => {
    setIsDarkModeState((prev) => {
      const v = typeof next === "function" ? next(prev) : next;
      return !!v;
    });
  }, []);

  const toggleDarkMode = useCallback(() => {
    setIsDarkModeState((d) => !d);
  }, []);

  useEffect(() => {
    applyDocumentTheme(isDarkMode);
  }, [isDarkMode]);

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === STORAGE_KEY && e.newValue != null) {
        setIsDarkModeState(e.newValue === "dark");
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const value = useMemo(
    () => ({ isDarkMode, setIsDarkMode, toggleDarkMode }),
    [isDarkMode, setIsDarkMode, toggleDarkMode]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useAppTheme() {
  const ctx = useContext(ThemeContext);
  if (ctx === undefined) {
    throw new Error("useAppTheme must be used within ThemeProvider");
  }
  return ctx;
}
