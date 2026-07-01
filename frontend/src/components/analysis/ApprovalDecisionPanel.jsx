import React from "react";
import { ANALYSIS_TERMS, APPROVAL_DECISIONS } from "../../constants/analysisTerminology.js";
import { ANALYSIS_FIELD_LIMITS } from "../../constants/analysisFieldLimits.js";
import { clampText } from "../../utils/limitInput.js";

export default function ApprovalDecisionPanel({
  decision,
  onDecisionChange,
  comment,
  onCommentChange,
  onSubmit,
  styles = {},
  isDarkMode = false,
}) {
  const border = isDarkMode ? "#334155" : "#e2e8f0";
  const S = styles;

  return (
    <div
      style={{
        padding: 16,
        borderRadius: 12,
        border: `1px solid ${border}`,
        background: isDarkMode ? "rgba(56,189,248,0.04)" : "rgba(56,189,248,0.03)",
      }}
    >
      <h4 style={{ margin: "0 0 14px", fontSize: 13, fontWeight: 700, color: "#38bdf8" }}>
        {ANALYSIS_TERMS.ratifyDecision}
      </h4>

      <div style={S.inputWrapper}>
        <label style={S.labelStyle}>نوع تصمیم</label>
        <select style={S.selectStyle} value={decision} onChange={(e) => onDecisionChange(e.target.value)}>
          {APPROVAL_DECISIONS.map((d) => (
            <option key={d.value} value={d.value}>{d.label}</option>
          ))}
        </select>
      </div>

      <div style={S.inputWrapper}>
        <label style={S.labelStyle}>توضیح</label>
        <textarea
          style={{ ...S.textareaStyle, height: 80 }}
          value={comment}
          maxLength={ANALYSIS_FIELD_LIMITS.description}
          onChange={(e) => onCommentChange(clampText(e.target.value, ANALYSIS_FIELD_LIMITS.description))}
        />
      </div>

      <button type="button" style={{ ...S.sendBtn, width: "100%" }} onClick={onSubmit}>
        ثبت تصمیم
      </button>
    </div>
  );
}
