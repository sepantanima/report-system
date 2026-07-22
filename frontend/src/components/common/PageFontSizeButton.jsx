import React from "react";
import { Type } from "lucide-react";
import { toPersianDigits } from "../../utils/analysisMonitorUtils.js";

export default function PageFontSizeButton({ level, onCycle, className = "v3-icon-btn-gentle" }) {
  return (
    <button
      type="button"
      onClick={onCycle}
      className={className}
      title={`اندازه فونت ورودی و کارت: ${toPersianDigits(level)} از ${toPersianDigits(6)}`}
      style={{ position: "relative" }}
    >
      <Type size={18} />
      <span
        style={{
          position: "absolute",
          bottom: 3,
          left: 5,
          fontSize: 9,
          fontWeight: 800,
          lineHeight: 1,
          pointerEvents: "none",
        }}
      >
        {toPersianDigits(level)}
      </span>
    </button>
  );
}
