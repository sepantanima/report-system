import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toPersianDigits } from "../../utils/analysisMonitorUtils.js";

const STEPS = [
  { id: 1, label: "جستجو" },
  { id: 2, label: "انتخاب" },
];

export default function NewsSmartAnalysisStepNav({
  step, onStepChange, canGoToStep2, theme, isMobile, blocked = false,
}) {
  const canGo = (id) => {
    if (id === 1) return true;
    if (id === 2) return canGoToStep2;
    return false;
  };

  const goPrev = () => { if (!blocked && step > 1) onStepChange(step - 1); };
  const goNext = () => {
    if (blocked) return;
    if (step === 1 && canGoToStep2) onStepChange(2);
  };

  const nextDisabled = blocked || (step === 1 && !canGoToStep2) || step === 2;

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 12,
    }}
    >
      <button type="button" disabled={blocked || step <= 1} onClick={goPrev} style={navBtn(theme, blocked || step <= 1)}>
        <ChevronRight size={16} />
        {!isMobile && <span>قبلی</span>}
      </button>

      <div style={{ display: "flex", flex: 1, gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
        {STEPS.map((s) => {
          const enabled = !blocked && canGo(s.id);
          const active = step === s.id;
          return (
            <button
              key={s.id}
              type="button"
              disabled={!enabled}
              onClick={() => enabled && onStepChange(s.id)}
              style={{
                padding: "6px 12px",
                borderRadius: 8,
                border: `1px solid ${active ? theme.accent : theme.border}`,
                background: active
                  ? (theme.isDarkMode ? "rgba(168,85,247,0.15)" : "rgba(124,58,237,0.1)")
                  : "transparent",
                color: active ? (theme.accentPurple || "#a855f7") : (enabled ? theme.text : theme.muted),
                fontSize: 12,
                fontWeight: active ? 700 : 500,
                cursor: enabled ? "pointer" : "not-allowed",
                opacity: enabled ? 1 : 0.45,
                fontFamily: "inherit",
              }}
            >
              {toPersianDigits(s.id)}. {s.label}
            </button>
          );
        })}
      </div>

      <button type="button" disabled={nextDisabled} onClick={goNext} style={navBtn(theme, nextDisabled)}>
        {!isMobile && <span>بعدی</span>}
        <ChevronLeft size={16} />
      </button>
    </div>
  );
}

function navBtn(theme, disabled) {
  return {
    display: "flex",
    alignItems: "center",
    gap: 4,
    padding: "6px 12px",
    borderRadius: 8,
    border: `1px solid ${theme.border}`,
    background: theme.card,
    color: disabled ? theme.muted : theme.text,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
    fontFamily: "inherit",
    fontSize: 12,
  };
}
