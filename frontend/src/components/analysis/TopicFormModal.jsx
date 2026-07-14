import React from "react";
import { X } from "lucide-react";
import TopicFormFields from "./TopicFormFields.jsx";
import { ANALYSIS_TERMS } from "../../constants/analysisTerminology.js";

export default function TopicFormModal({
  open,
  onClose,
  editingTopic,
  form,
  setForm,
  theme,
  isDarkMode,
  history = [],
  returnComment,
  onSubmit,
  submitLabel,
}) {
  if (!open) return null;

  const title = editingTopic ? ANALYSIS_TERMS.editAxis : ANALYSIS_TERMS.newAxis;

  return (
    <div className="v3-modal-overlay" onClick={onClose}>
      <div
        className="v3-modal-box"
        style={{ background: theme.card, border: `1px solid ${theme.border}`, maxWidth: 640 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="v3-modal-header-new">
          <button
            type="button"
            onClick={onClose}
            className="v3-icon-btn"
            style={{ color: "#f87171", border: "none" }}
          >
            <X size={18} />
          </button>
          <span>{title}</span>
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
            submitLabel={submitLabel}
          />
        </div>
      </div>
    </div>
  );
}
