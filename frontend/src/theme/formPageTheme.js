/** پالت یکسان صفحات فرم — هم‌راستا با AnalysisMonitorLayout */

export function getFormPageTheme(isDarkMode) {
  return {
    bg: isDarkMode ? "#0f172a" : "#f8fafc",
    card: isDarkMode ? "#1e293b" : "#ffffff",
    border: isDarkMode ? "rgba(255,255,255,0.1)" : "#e2e8f0",
    text: isDarkMode ? "#f1f5f9" : "#1e293b",
    muted: isDarkMode ? "#94a3b8" : "#64748b",
    inputBg: isDarkMode ? "rgba(0,0,0,0.2)" : "#fff",
    accent: "#38bdf8",
  };
}
