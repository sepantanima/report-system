import React from "react";
import { toPersianDigits } from "../../utils/analysisMonitorUtils.js";

export default function CharCounter({ current, max, style }) {
  if (max == null) return null;
  const len = Number(current) || 0;
  const over = len > max;
  return (
    <span
      style={{
        fontSize: 10,
        color: over ? "#ef4444" : "#94a3b8",
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {toPersianDigits(len)}/{toPersianDigits(max)}
    </span>
  );
}
