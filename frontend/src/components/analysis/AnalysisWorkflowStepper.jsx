import React from "react";
import { Check } from "lucide-react";
import { WORKFLOW_STEPS } from "../../constants/analysisTerminology.js";
import { toPersianDigits } from "../../utils/analysisMonitorUtils.js";

const STEP_ORDER = ["propose", "ratify", "assign", "analyze"];

function stepIndex(stepId) {
  return STEP_ORDER.indexOf(stepId);
}

function isStepComplete(stepId, topicStatus) {
  if (!topicStatus) return false;
  const statusOrder = {
    Draft: 0,
    Submitted: 1,
    UnderReview: 1,
    Rejected: 1,
    Approved: 2,
    Assigned: 3,
    Closed: 2,
  };
  const idx = statusOrder[topicStatus] ?? 0;
  const stepIdx = stepIndex(stepId);
  if (stepIdx < 2) return idx >= stepIdx + 1;
  if (stepId === "ratify") return idx >= 2;
  if (stepId === "assign") return idx >= 3;
  if (stepId === "analyze") return idx >= 3;
  return false;
}

export default function AnalysisWorkflowStepper({ currentStep, topicStatus, compact = false }) {
  const currentIdx = stepIndex(currentStep);

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: compact ? 6 : 8,
        marginBottom: compact ? 12 : 16,
        padding: compact ? "10px 12px" : "12px 14px",
        borderRadius: 12,
        background: "rgba(56,189,248,0.06)",
        border: "1px solid rgba(56,189,248,0.15)",
      }}
    >
      {WORKFLOW_STEPS.map((step, i) => {
        const done = isStepComplete(step.id, topicStatus);
        const active = step.id === currentStep;
        const upcoming = i > currentIdx && !done;
        const color = done ? "#22c55e" : active ? "#38bdf8" : upcoming ? "#64748b" : "#94a3b8";

        return (
          <React.Fragment key={step.id}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: compact ? 11 : 12,
                fontWeight: active ? 700 : 500,
                color,
                opacity: upcoming ? 0.65 : 1,
              }}
            >
              <span
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 10,
                  background: done ? "rgba(34,197,94,0.15)" : active ? "rgba(56,189,248,0.15)" : "rgba(148,163,184,0.12)",
                  border: `1px solid ${color}44`,
                }}
              >
                {done ? <Check size={12} /> : toPersianDigits(i + 1)}
              </span>
              {step.label}
            </div>
            {i < WORKFLOW_STEPS.length - 1 && (
              <span style={{ color: "#64748b", opacity: 0.5, alignSelf: "center" }}>←</span>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
