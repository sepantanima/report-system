import React from "react";
import { X } from "lucide-react";
import TopicFormFields from "./TopicFormFields.jsx";
import { ANALYSIS_TERMS } from "../../constants/analysisTerminology.js";

export default function TopicFormModal({
  open, onClose, onSubmit, form, setForm, isEdit, theme, isDarkMode, history = [], returnComment,
}) {
  if (!open) return null;

  return (
    <div className="v3-modal-overlay" onClick={onClose}>
      <div className="v3-modal-box" style={{ background: theme.card, border: `1px solid ${theme.border}` }} onClick={(e) => e.stopPropagation()}>
        <div className="v3-modal-header-new">
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer" }}><X size={18} /></button>
          <span>{isEdit ? ANALYSIS_TERMS.editAxis : ANALYSIS_TERMS.newAxis}</span>
        </div>
        <div className="v3-modal-body">
          <TopicFormFields
            form={form}
            setForm={setForm}
            theme={theme}
            isDarkMode={isDarkMode}
            history={history}
            returnComment={returnComment}
            onSubmit={onSubmit}
            onCancel={onClose}
            submitLabel={isEdit ? "ذخیره تغییرات" : ANALYSIS_TERMS.registerAxis}
          />
        </div>
      </div>
    </div>
  );
}
