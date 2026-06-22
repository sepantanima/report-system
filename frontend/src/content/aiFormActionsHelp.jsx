import React from "react";
import {
  AI_FORM_ACTION_SIMPLE_FLOW_FA,
  UNIFIED_AI_ASSEMBLY_HINT_FA,
} from "../constants/aiFormNames.js";

export const AI_FORM_ACTIONS_HELP = () => (
  <div style={{ fontSize: 13, lineHeight: 1.9, textAlign: "justify", color: "inherit" }}>
    <p style={{ marginTop: 0, fontWeight: 600 }}>منطق کلی (بدون اصطلاح فنی اضافه)</p>
    <p style={{ margin: "0 0 10px", opacity: 0.95 }}>
      این صفحه دقیقاً سه چیز را به هم وصل می‌کند: <b>کدام فرم</b>، <b>کدام دکمه</b>، و وقتی زده شد{" "}
      <b>چه متنی به مدل برود</b> و <b>از کدام تنظیمات API</b> (همان صفحهٔ «مدیریت API هوش») زده شود.
    </p>
    <ul style={{ margin: 0, paddingRight: 20, lineHeight: 1.9 }}>
      {AI_FORM_ACTION_SIMPLE_FLOW_FA.map((line, i) => (
        <li key={i} style={{ marginBottom: 4 }}>{line}</li>
      ))}
    </ul>
    <p style={{ marginBottom: 0, marginTop: 12, fontSize: 12, opacity: 0.85 }}>{UNIFIED_AI_ASSEMBLY_HINT_FA}</p>
  </div>
);
