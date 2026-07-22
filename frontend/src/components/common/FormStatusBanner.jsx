import React from "react";

const VARIANTS = {
  success: {
    dark: { bg: "rgba(16,185,129,0.16)", border: "rgba(52,211,153,0.5)" },
    light: { bg: "#ecfdf5", border: "rgba(16,185,129,0.45)" },
  },
  error: {
    dark: { bg: "rgba(239,68,68,0.16)", border: "rgba(248,113,113,0.5)" },
    light: { bg: "#fef2f2", border: "rgba(248,113,113,0.45)" },
  },
  warning: {
    dark: { bg: "rgba(245,158,11,0.16)", border: "rgba(251,191,36,0.5)" },
    light: { bg: "#fffbeb", border: "rgba(245,158,11,0.45)" },
  },
  info: {
    dark: { bg: "rgba(56,189,248,0.12)", border: "rgba(56,189,248,0.4)" },
    light: { bg: "#f0f9ff", border: "rgba(14,165,233,0.35)" },
  },
};

/** بنر یکپارچه پیام — موفقیت/خطا/هشدار با پالت درست در تم تیره */
export default function FormStatusBanner({
  variant = "success",
  children,
  isDarkMode,
  theme,
  style,
}) {
  if (!children) return null;
  const palette = VARIANTS[variant] || VARIANTS.info;
  const colors = isDarkMode ? palette.dark : palette.light;

  return (
    <div
      style={{
        marginBottom: 14,
        padding: "10px 14px",
        borderRadius: 8,
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        color: theme?.text || "inherit",
        fontSize: 13,
        lineHeight: 1.75,
        whiteSpace: "pre-wrap",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
