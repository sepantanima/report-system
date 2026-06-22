import React, { useRef, useEffect, useCallback, useState } from "react";
import { Bold, Underline, Heading2, Heading3, Palette, Maximize2, Minimize2, Code2 } from "lucide-react";
import { plainTextLength, stripHtml as stripHtmlUtil } from "../../constants/analysisFieldLimits.js";
import { toPersianDigits } from "../../utils/analysisMonitorUtils.js";
import { pxToEm } from "../../utils/pageFontSize.js";
import "./RichTextEditor.css";

export { stripHtmlUtil as stripHtml };

const COLOR_PRESETS = [
  { label: "پیش‌فرض", value: "inherit" },
  { label: "قرمز", value: "#ef4444" },
  { label: "آبی", value: "#38bdf8" },
  { label: "سبز", value: "#22c55e" },
];

function useIsMobile() {
  const [mobile, setMobile] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(max-width: 768px)").matches : false
  );
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const handler = (e) => setMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return mobile;
}

function Toolbar({ isMobile, isDarkMode, activeCmd, exec, applyHeading, showColors, setShowColors, applyColor }) {
  const btn = (cmd, title, children, onClick = () => exec(cmd)) => (
    <button
      type="button"
      className={`rich-text-toolbar-btn${activeCmd === cmd ? " active" : ""}`}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      title={title}
    >
      {children}
    </button>
  );

  return (
    <div className="rich-text-toolbar" style={{ flexWrap: "wrap", gap: 4, display: "flex", alignItems: "center" }}>
      {btn("bold", "بولد", <Bold />)}
      {btn("underline", "زیرخط", <Underline />)}
      {!isMobile && btn("italic", "ایتالیک", <em style={{ fontStyle: "italic", fontSize: pxToEm(12) }}>I</em>)}
      <button
        type="button"
        className="rich-text-toolbar-btn"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => applyHeading("h2")}
        title="عنوان"
      >
        <Heading2 />
      </button>
      {!isMobile && (
        <button
          type="button"
          className="rich-text-toolbar-btn"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => applyHeading("h3")}
          title="زیرعنوان"
        >
          <Heading3 />
        </button>
      )}
      {!isMobile && (
        <div style={{ position: "relative" }}>
          <button
            type="button"
            className={`rich-text-toolbar-btn${showColors ? " active" : ""}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setShowColors((v) => !v)}
            title="رنگ متن"
          >
            <Palette />
          </button>
          {showColors && (
            <div style={{
              position: "absolute", top: "100%", right: 0, marginTop: 4, zIndex: 20,
              display: "flex", gap: 5, padding: 6, borderRadius: 8,
              background: isDarkMode ? "#1e293b" : "#fff",
              border: `1px solid ${isDarkMode ? "#334155" : "#cbd5e1"}`,
              boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
            }}
            >
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  title={c.label}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => applyColor(c.value)}
                  style={{
                    width: 20, height: 20, borderRadius: "50%",
                    border: `2px solid ${isDarkMode ? "#475569" : "#cbd5e1"}`,
                    background: c.value === "inherit" ? (isDarkMode ? "#94a3b8" : "#64748b") : c.value,
                    cursor: "pointer",
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function RichTextEditor({
  value = "",
  onChange,
  onPlainTextChange,
  placeholder = "متن را وارد کنید...",
  isDarkMode = true,
  minHeight = 120,
  readOnly = false,
  maxLength,
  allowFullscreen = true,
  allowSourceView = false,
  resizable = false,
  maxHeight,
}) {
  const editorRef = useRef(null);
  const isMobile = useIsMobile();
  const [showColors, setShowColors] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [sourceMode, setSourceMode] = useState(false);
  const [sourceHtml, setSourceHtml] = useState("");
  const [plainLen, setPlainLen] = useState(() => plainTextLength(value));

  const emitChange = useCallback(() => {
    const html = editorRef.current?.innerHTML || "";
    const plain = stripHtmlUtil(html);
    setPlainLen(plain.length);
    onChange?.(html);
    onPlainTextChange?.(plain);
  }, [onChange, onPlainTextChange]);

  useEffect(() => {
    if (sourceMode) {
      const normalized = value || "";
      setSourceHtml(normalized);
      setPlainLen(plainTextLength(normalized));
      return;
    }
    const el = editorRef.current;
    if (!el || document.activeElement === el) return;
    const normalized = value || "";
    if (el.innerHTML !== normalized) el.innerHTML = normalized || "";
    setPlainLen(plainTextLength(value));
  }, [value, sourceMode]);

  useEffect(() => {
    if (!fullscreen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [fullscreen]);

  const focusEditor = () => editorRef.current?.focus();
  const exec = (command, val = null) => { focusEditor(); document.execCommand(command, false, val); emitChange(); };
  const applyHeading = (tag) => { focusEditor(); document.execCommand("formatBlock", false, tag); emitChange(); };
  const applyColor = (color) => { color === "inherit" ? exec("removeFormat") : exec("foreColor", color); setShowColors(false); };

  const handleInput = () => {
    if (maxLength && plainTextLength(editorRef.current?.innerHTML || "") > maxLength) {
      editorRef.current.innerHTML = value || "";
      return;
    }
    emitChange();
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const paste = e.clipboardData.getData("text/plain");
    if (!paste) return;
    const current = plainTextLength(editorRef.current?.innerHTML || "");
    const room = maxLength != null ? maxLength - current : paste.length;
    const toInsert = maxLength != null ? paste.slice(0, Math.max(0, room)) : paste;
    if (toInsert) document.execCommand("insertText", false, toInsert);
    handleInput();
  };

  const toggleFullscreen = () => {
    emitChange();
    setFullscreen((v) => !v);
  };

  const toggleSourceMode = () => {
    if (sourceMode) {
      const html = sourceHtml;
      if (editorRef.current) editorRef.current.innerHTML = html || "";
      setSourceMode(false);
      const plain = stripHtmlUtil(html);
      setPlainLen(plain.length);
      onChange?.(html);
      onPlainTextChange?.(plain);
    } else {
      const html = editorRef.current?.innerHTML || value || "";
      setSourceHtml(html);
      setSourceMode(true);
    }
  };

  const handleSourceChange = (e) => {
    const html = e.target.value;
    setSourceHtml(html);
    const plain = stripHtmlUtil(html);
    setPlainLen(plain.length);
    if (maxLength != null && plain.length > maxLength) return;
    onChange?.(html);
    onPlainTextChange?.(plain);
  };

  if (readOnly) {
    return <div className={`rich-text-content ${isDarkMode ? "dark" : "light"}`} style={{ minHeight }} dangerouslySetInnerHTML={{ __html: value || "" }} />;
  }

  return (
    <div
      className={`rich-text-editor ${isDarkMode ? "dark" : "light"}${fullscreen ? " rich-text-editor--fullscreen" : ""}${resizable ? " rich-text-editor--resizable" : ""}${maxHeight ? " rich-text-editor--fixed-height" : ""}`}
      style={fullscreen ? {
        position: "fixed",
        inset: 0,
        zIndex: 3000,
        background: isDarkMode ? "#0f172a" : "#f8fafc",
        padding: 16,
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
      } : resizable ? {
        display: "flex",
        flexDirection: "column",
        flex: 1,
        minHeight: 0,
        height: "100%",
      } : maxHeight ? {
        display: "flex",
        flexDirection: "column",
        flex: 1,
        minHeight: 0,
        overflow: "hidden",
      } : undefined}
    >
      <div className="rich-text-editor-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap", flexShrink: 0 }}>
        {!sourceMode ? (
          <Toolbar
            isMobile={isMobile}
            isDarkMode={isDarkMode}
            activeCmd={null}
            exec={exec}
            applyHeading={applyHeading}
            showColors={showColors}
            setShowColors={setShowColors}
            applyColor={applyColor}
          />
        ) : (
          <span style={{ fontSize: pxToEm(11), opacity: 0.75 }}>نمایش HTML / متن خام (با تگ‌ها)</span>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          {maxLength != null && (
            <span style={{ fontSize: pxToEm(10), color: plainLen > maxLength ? "#ef4444" : "#94a3b8", whiteSpace: "nowrap" }}>
              {toPersianDigits(plainLen)}/{toPersianDigits(maxLength)}
            </span>
          )}
          {allowSourceView && (
            <button
              type="button"
              className={`rich-text-toolbar-btn rich-text-fs-btn${sourceMode ? " active" : ""}`}
              onClick={toggleSourceMode}
              title={sourceMode ? "بازگشت به ویرایش بصری" : "نمایش HTML / متن ساده"}
            >
              <Code2 />
            </button>
          )}
          {allowFullscreen && (
            <button type="button" className="rich-text-toolbar-btn rich-text-fs-btn" onClick={toggleFullscreen} title={fullscreen ? "خروج از تمام‌صفحه" : "تمام‌صفحه"}>
              {fullscreen ? <Minimize2 /> : <Maximize2 />}
            </button>
          )}
        </div>
      </div>
      {sourceMode ? (
        <textarea
          className="rich-text-source-area"
          value={sourceHtml}
          onChange={handleSourceChange}
          spellCheck={false}
          style={{
            width: "100%",
            flex: fullscreen || resizable ? 1 : undefined,
            minHeight: fullscreen ? "60vh" : minHeight,
            maxHeight: fullscreen ? undefined : maxHeight,
            overflowY: maxHeight ? "auto" : undefined,
            fontFamily: "ui-monospace, Consolas, monospace",
            fontSize: pxToEm(12),
            lineHeight: 1.6,
            direction: "rtl",
            resize: resizable ? "vertical" : "none",
            boxSizing: "border-box",
            padding: 10,
            border: `1px solid ${isDarkMode ? "#334155" : "#cbd5e1"}`,
            borderRadius: 8,
            background: isDarkMode ? "#0f172a" : "#fff",
            color: isDarkMode ? "#e2e8f0" : "#1e293b",
          }}
        />
      ) : (
      <div
        ref={editorRef}
        className={`rich-text-area${resizable ? " rich-text-area--resizable" : ""}${maxHeight ? " rich-text-area--fixed-mobile" : ""}`}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        style={{
          minHeight: fullscreen ? "60vh" : minHeight,
          maxHeight: fullscreen ? undefined : maxHeight,
          flex: fullscreen || resizable ? 1 : undefined,
          overflowY: maxHeight ? "auto" : undefined,
        }}
        onInput={handleInput}
        onBlur={emitChange}
        onPaste={handlePaste}
      />
      )}
    </div>
  );
}
