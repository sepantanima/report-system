import React, { useMemo, useState } from "react";
import { toPersianDigits } from "../../../utils/analysisMonitorUtils.js";
import { IRAN_PROVINCES_SVG, matchHeatToProvince } from "./iranProvincesSvg.js";

const FILL = {
  green: "#22c55e99",
  yellow: "#eab30899",
  red: "#ef444499",
  gray: "#94a3b866",
};
const STROKE = {
  green: "#16a34a",
  yellow: "#ca8a04",
  red: "#dc2626",
  gray: "#64748b",
};

export default function IranMapWidget({ provinces = [], theme, onSelectProvince }) {
  const [hover, setHover] = useState(null);

  const byMeta = useMemo(() => {
    const map = new Map();
    for (const meta of IRAN_PROVINCES_SVG) {
      const hit = (provinces || []).find((p) => matchHeatToProvince(p, meta));
      map.set(meta.id, hit || null);
    }
    return map;
  }, [provinces]);

  const tip = hover
    ? {
        name: hover.name,
        heat: byMeta.get(hover.id),
      }
    : null;

  return (
    <div style={{ position: "relative" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 10, fontSize: 11, color: theme.muted }}>
        <span><span style={{ color: STROKE.green }}>■</span> مطلوب</span>
        <span><span style={{ color: STROKE.yellow }}>■</span> نیازمند توجه</span>
        <span><span style={{ color: STROKE.red }}>■</span> بحرانی</span>
        <span><span style={{ color: STROKE.gray }}>■</span> بدون داده / غیرفعال</span>
      </div>

      <svg
        viewBox="0 0 1000 900"
        width="100%"
        style={{ maxHeight: 420, background: theme.bg, borderRadius: 12, border: `1px solid ${theme.border}` }}
        role="img"
        aria-label="نقشه استان‌های ایران"
      >
        {IRAN_PROVINCES_SVG.map((p) => {
          const heat = byMeta.get(p.id);
          const st = heat?.status || "gray";
          const selected = hover?.id === p.id;
          return (
            <path
              key={p.id}
              d={p.d}
              fill={FILL[st]}
              stroke={selected ? theme.accent : STROKE[st]}
              strokeWidth={selected ? 3 : 1.5}
              style={{ cursor: "pointer" }}
              onMouseEnter={() => setHover(p)}
              onMouseLeave={() => setHover(null)}
              onClick={() => onSelectProvince?.(heat?.id || p.name)}
            >
              <title>{p.name}</title>
            </path>
          );
        })}
      </svg>

      {tip ? (
        <div
          style={{
            marginTop: 10,
            padding: "10px 12px",
            borderRadius: 10,
            border: `1px solid ${theme.border}`,
            background: theme.card,
            fontSize: 12,
          }}
        >
          <strong>{tip.name}</strong>
          <div style={{ color: theme.muted, marginTop: 4, lineHeight: 1.7 }}>
            {tip.heat ? (
              <>
                سلامت: {tip.heat.health_score == null ? "—" : toPersianDigits(tip.heat.health_score)}
                <br />
                یگان: {toPersianDigits(tip.heat.units ?? 0)} · فعالیت: {toPersianDigits(tip.heat.activity ?? 0)}
              </>
            ) : (
              "در داده‌های بازه فعلی رکوردی برای این استان نیست"
            )}
          </div>
        </div>
      ) : (
        <div style={{ marginTop: 8, fontSize: 11, color: theme.muted }}>روی استان بروید یا کلیک کنید تا فیلتر شود</div>
      )}
    </div>
  );
}
