import React from "react";
import { toPersianDigits } from "../../utils/analysisMonitorUtils.js";

/** شمارنده: current/max با اعداد فارسی؛ dir=ltr برای خوانایی در صفحات RTL. */
export default function CharCounter({ current, max, style }) {
  if (max == null) return null;
  const len = Number(current) || 0;
  const over = len > max;
  return (
    <span
      dir="ltr"
      style={{
        fontSize: 10,
        color: over ? "#ef4444" : "#94a3b8",
        whiteSpace: "nowrap",
        display: "inline-block",
        unicodeBidi: "embed",
        ...style,
      }}
    >
      {toPersianDigits(len)}/{toPersianDigits(max)}
    </span>
  );
}
