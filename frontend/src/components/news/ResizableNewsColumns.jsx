import React, { useCallback, useEffect, useRef, useState } from "react";

const LS_KEY = "news_monitor_column_widths";

function loadWidths(defaults) {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    return {
      list: Number(parsed.list) || defaults.list,
      review: Number(parsed.review) || defaults.review,
    };
  } catch {
    return defaults;
  }
}

function saveWidths(w) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(w));
  } catch {
    /* ignore */
  }
}

function ResizeHandle({ onDragStart }) {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      onMouseDown={onDragStart}
      style={{
        width: 6,
        flexShrink: 0,
        cursor: "col-resize",
        background: "transparent",
        position: "relative",
        zIndex: 3,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: 2,
          background: "rgba(148,163,184,0.35)",
          borderRadius: 2,
        }}
      />
    </div>
  );
}

/** سه ستون RTL: راست=review، وسط=center، چپ=list */
export default function ResizableNewsColumns({
  listPane,
  centerPane,
  reviewPane,
  defaultListWidth = 340,
  defaultReviewWidth = 272,
  minList = 220,
  maxList = 520,
  minReview = 200,
  maxReview = 420,
  theme,
}) {
  const [widths, setWidths] = useState(() => loadWidths({
    list: defaultListWidth,
    review: defaultReviewWidth,
  }));

  const dragRef = useRef(null);

  useEffect(() => {
    saveWidths(widths);
  }, [widths]);

  const startDrag = useCallback((side) => (e) => {
    e.preventDefault();
    dragRef.current = {
      side,
      startX: e.clientX,
      startW: side === "list" ? widths.list : widths.review,
    };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, [widths.list, widths.review]);

  useEffect(() => {
    const onMove = (e) => {
      const d = dragRef.current;
      if (!d) return;
      const dx = e.clientX - d.startX;
      setWidths((prev) => {
        if (d.side === "review") {
          const next = Math.min(maxReview, Math.max(minReview, d.startW - dx));
          return { ...prev, review: next };
        }
        const next = Math.min(maxList, Math.max(minList, d.startW + dx));
        return { ...prev, list: next };
      });
    };
    const onUp = () => {
      dragRef.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [maxList, maxReview, minList, minReview]);

  const paneShell = (child, w) => (
    <div
      style={{
        width: w,
        flexShrink: 0,
        minHeight: 0,
        height: "100%",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        borderRadius: 10,
        border: `1px solid ${theme?.border || "rgba(148,163,184,0.2)"}`,
        background: theme?.card || "transparent",
      }}
    >
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden", padding: 6 }}>
        {child}
      </div>
    </div>
  );

  return (
    <div
      dir="rtl"
      style={{
        display: "flex",
        flexDirection: "row",
        flex: 1,
        minHeight: 0,
        height: "100%",
        alignItems: "stretch",
      }}
    >
      {paneShell(reviewPane, widths.review)}
      <ResizeHandle onDragStart={startDrag("review")} />
      <div
        style={{
          flex: 1,
          minWidth: 180,
          minHeight: 0,
          height: "100%",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {centerPane}
      </div>
      <ResizeHandle onDragStart={startDrag("list")} />
      {paneShell(listPane, widths.list)}
    </div>
  );
}
