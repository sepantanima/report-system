import React from "react";
import { Star } from "lucide-react";
import { toPersianDigits } from "../../utils/analysisMonitorUtils.js";

export default function StarRating({ value = 0, onChange, max = 5, readOnly = false, size = 22 }) {
  return (
    <div style={{ display: "inline-flex", gap: 4, direction: "ltr" }}>
      {Array.from({ length: max }, (_, i) => i + 1).map((star) => {
        const filled = star <= value;
        return (
          <button
            key={star}
            type="button"
            disabled={readOnly}
            onClick={() => !readOnly && onChange?.(star)}
            aria-label={`${toPersianDigits(star)} ستاره`}
            style={{
              background: "none",
              border: "none",
              padding: 2,
              cursor: readOnly ? "default" : "pointer",
              color: filled ? "#f59e0b" : "#475569",
              opacity: readOnly && !filled ? 0.35 : 1,
            }}
          >
            <Star size={size} fill={filled ? "#f59e0b" : "none"} />
          </button>
        );
      })}
    </div>
  );
}
