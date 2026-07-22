import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toPersianDigits } from "../../utils/analysisMonitorUtils.js";

const STEPS = [
  { id: 1, label: "استخراج" },
  { id: 2, label: "انتخاب" },
  { id: 3, label: "گزارش" },
];

export default function NewsReportStepNav({
  step,
  onStepChange,
  canGoToStep2,
  canGoToStep3,
  theme,
  isMobile,
}) {
  const canGo = (id) => {
    if (id === 1) return true;
    if (id === 2) return canGoToStep2;
    if (id === 3) return canGoToStep3;
    return false;
  };

  const goPrev = () => { if (step > 1) onStepChange(step - 1); };
  const goNext = () => {
    if (step === 1 && canGoToStep2) onStepChange(2);
    else if (step === 2 && canGoToStep3) onStepChange(3);
  };

  const nextDisabled = (step === 1 && !canGoToStep2) || (step === 2 && !canGoToStep3) || step === 3;

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 8,
      width: "100%",
      marginBottom: 0,
      flexShrink: 0,
    }}
    >
      <button
        type="button"
        disabled={step <= 1}
        onClick={goPrev}
        title="مرحله قبل"
        style={navBtn(theme, step <= 1)}
      >
        <ChevronRight size={16} />
        {!isMobile && <span>قبلی</span>}
      </button>

      <div style={{
        display: "flex",
        flex: 1,
        gap: 6,
        justifyContent: "center",
        flexWrap: "wrap",
      }}
      >
        {STEPS.map((s) => {
          const enabled = canGo(s.id);
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
                  ? (theme.isDarkMode ? "rgba(56,189,248,0.15)" : "rgba(14,165,233,0.1)")
                  : "transparent",
                color: active ? theme.accent : (enabled ? theme.text : theme.muted),
                fontSize: 12,
                fontWeight: active ? 700 : 500,
                cursor: enabled ? "pointer" : "not-allowed",
                opacity: enabled ? 1 : 0.45,
                fontFamily: "inherit",
                whiteSpace: "nowrap",
              }}
            >
              {toPersianDigits(s.id)}. {s.label}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        disabled={nextDisabled}
        onClick={goNext}
        title="مرحله بعد"
        style={navBtn(theme, nextDisabled)}
      >
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
    flexShrink: 0,
  };
}
