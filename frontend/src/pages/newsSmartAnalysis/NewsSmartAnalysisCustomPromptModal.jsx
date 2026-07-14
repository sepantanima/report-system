import React, { useEffect, useState } from "react";

import { Loader2, Sparkles, X } from "lucide-react";

import { toPersianDigits } from "../../utils/analysisMonitorUtils.js";

import {

  MAX_CUSTOM_PROMPT_LEN,

  MAX_CUSTOM_PROMPT_TITLE_LEN,

  MIN_CUSTOM_PROMPT_LEN,

} from "../../services/newsSmartAnalysisService.js";



function validationMessage({ titleTrimmed, promptTrimmed, promptLen }) {

  if (!titleTrimmed) return { text: "عنوان پرامپت الزامی است", tone: "error" };

  if (promptLen < MIN_CUSTOM_PROMPT_LEN) {

    return { text: `متن پرامپت باید حداقل ${toPersianDigits(MIN_CUSTOM_PROMPT_LEN)} کاراکتر باشد`, tone: "warn" };

  }

  if (promptLen > MAX_CUSTOM_PROMPT_LEN) {

    return {

      text: `متن پرامپت بیش از حد مجاز است (حداکثر ${toPersianDigits(MAX_CUSTOM_PROMPT_LEN)} کاراکتر)`,

      tone: "error",

    };

  }

  return { text: "آمادهٔ اجرا", tone: "ok" };

}



export default function NewsSmartAnalysisCustomPromptModal({

  open,

  theme,

  slotLabel,

  initialTitle = "",

  initialPrompt = "",

  policyHint = "",

  loading = false,

  onSubmit,

  onDismiss,

}) {

  const [title, setTitle] = useState(initialTitle);

  const [prompt, setPrompt] = useState(initialPrompt);



  useEffect(() => {

    if (open) {

      setTitle(initialTitle || "");

      setPrompt(initialPrompt || "");

    }

  }, [open, initialTitle, initialPrompt]);



  if (!open) return null;



  const border = theme?.border || "#e2e8f0";

  const card = theme?.card || "#fff";

  const text = theme?.text || "#1e293b";

  const titleTrimmed = title.trim();

  const promptTrimmed = prompt.trim();

  const promptLen = promptTrimmed.length;

  const status = validationMessage({ titleTrimmed, promptTrimmed, promptLen });

  const canSubmit = titleTrimmed.length > 0

    && promptLen >= MIN_CUSTOM_PROMPT_LEN

    && promptLen <= MAX_CUSTOM_PROMPT_LEN;



  const statusColor = status.tone === "error"

    ? "#ef4444"

    : status.tone === "warn"

      ? "#f59e0b"

      : theme?.muted;



  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit?.({ title: titleTrimmed, prompt: promptTrimmed });
  };



  return (

    <div className="v3-modal-overlay" onClick={() => !loading && onDismiss?.()}>

      <div

        className="v3-modal-box"

        style={{ background: card, border: `1px solid ${border}`, maxWidth: 560 }}

        onClick={(e) => e.stopPropagation()}

      >

        <div className="v3-modal-header-new">

          <button

            type="button"

            onClick={() => !loading && onDismiss?.()}

            className="v3-icon-btn"

            style={{ color: "#f87171", border: "none" }}

            disabled={loading}

          >

            <X size={18} />

          </button>

          <span>تحلیل با پرامپت شخصی{slotLabel ? ` — ${slotLabel}` : ""}</span>

        </div>

        <div className="v3-modal-body" style={{ color: text }}>

          <p style={{ fontSize: 12, lineHeight: 1.7, margin: "0 0 10px", color: theme?.muted }}>

            عنوان و دستور تحلیل را بنویسید. هوش مصنوعی بر اساس اخبار فریزشدهٔ همین بسته پاسخ می‌دهد.

            حداکثر {toPersianDigits(3)} تحلیل شخصی برای هر بسته.

          </p>

          {policyHint && (
            <div style={{
              marginBottom: 10,
              padding: "8px 10px",
              borderRadius: 8,
              fontSize: 11,
              lineHeight: 1.7,
              color: theme?.muted,
              background: theme?.isDarkMode ? "rgba(168,85,247,0.08)" : "rgba(124,58,237,0.06)",
              border: `1px solid ${border}`,
            }}
            >
              <strong style={{ color: theme?.text }}>الزامات سیستمی (خودکار):</strong>
              {" "}
              {policyHint}
            </div>
          )}

          <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>

            عنوان پرامپت

            <span style={{ color: "#ef4444" }}> *</span>

          </label>

          <input

            value={title}

            onChange={(e) => setTitle(e.target.value.slice(0, MAX_CUSTOM_PROMPT_TITLE_LEN))}

            disabled={loading}

            placeholder="مثال: تحلیل امنیتی تهران"

            style={{

              width: "100%",

              boxSizing: "border-box",

              padding: 10,

              borderRadius: 8,

              border: `1px solid ${!titleTrimmed && title.length > 0 ? "#ef4444" : border}`,

              background: theme?.input || card,

              color: text,

              fontFamily: "inherit",

              fontSize: 13,

              marginBottom: 10,

            }}

          />

          <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>متن پرامپت</label>

          <textarea

            value={prompt}

            onChange={(e) => setPrompt(e.target.value)}

            disabled={loading}

            rows={7}

            placeholder="مثال: روند اخبار امنیتی را با تمرکز بر تهران خلاصه کن و نکات قابل اقدام را فهرست کن."

            style={{

              width: "100%",

              boxSizing: "border-box",

              padding: 10,

              borderRadius: 8,

              border: `1px solid ${promptLen > MAX_CUSTOM_PROMPT_LEN ? "#ef4444" : border}`,

              background: theme?.input || card,

              color: text,

              fontFamily: "inherit",

              fontSize: 13,

              lineHeight: 1.8,

              resize: "vertical",

            }}

          />

          <div style={{

            display: "flex",

            justifyContent: "space-between",

            alignItems: "center",

            marginTop: 6,

            fontSize: 11,

            color: statusColor,

          }}

          >

            <span>{status.text}</span>

            <span style={{ color: promptLen > MAX_CUSTOM_PROMPT_LEN ? "#ef4444" : theme?.muted }}>

              {toPersianDigits(promptLen)}

              {" / "}

              {toPersianDigits(MAX_CUSTOM_PROMPT_LEN)}

            </span>

          </div>

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 14 }}>

            <button

              type="button"

              disabled={loading}

              onClick={onDismiss}

              style={btnStyle(theme, false)}

            >

              انصراف

            </button>

            <button

              type="button"

              disabled={loading || !canSubmit}

              onClick={handleSubmit}

              style={btnStyle(theme, true)}

            >

              {loading

                ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />

                : <Sparkles size={14} />}

              تولید تحلیل

            </button>

          </div>

        </div>

      </div>

    </div>

  );

}



function btnStyle(theme, primary) {

  return {

    display: "inline-flex",

    alignItems: "center",

    gap: 6,

    padding: "8px 14px",

    borderRadius: 8,

    border: primary ? "none" : `1px solid ${theme?.border || "#e2e8f0"}`,

    background: primary ? "#7c3aed" : theme?.card || "#fff",

    color: primary ? "#fff" : theme?.text || "#1e293b",

    cursor: "pointer",

    fontFamily: "inherit",

    fontSize: 13,

    opacity: primary ? 1 : 1,

  };

}


