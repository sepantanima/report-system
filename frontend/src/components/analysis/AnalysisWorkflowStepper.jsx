import React from "react";
import { Check } from "lucide-react";
import { WORKFLOW_STEPS } from "../../constants/analysisTerminology.js";
import { toPersianDigits } from "../../utils/analysisMonitorUtils.js";

const STEP_ORDER = ["propose", "ratify", "assign", "analyze", "review", "finalize"];

function stepIndex(stepId) {
  return STEP_ORDER.indexOf(stepId);
}

function topicStepProgress(topicStatus) {
  const statusOrder = {
    Draft: 0,
    Submitted: 1,
    UnderReview: 1,
    Rejected: 1,
    Approved: 2,
    Assigned: 3,
    Completed: 6,
    Closed: 1,
  };
  return statusOrder[topicStatus] ?? 0;
}

function missionStepProgress(missionStatus) {
  const map = {
    Assigned: 3,
    InProgress: 3,
    Submitted: 4,
    UnderReview: 4,
    NeedsRevision: 3,
    Revised: 4,
    FinalApproved: 5,
    Archived: 5,
    Cancelled: 3,
  };
  return map[missionStatus] ?? 3;
}

function isStepComplete(stepId, topicStatus, missionStatus) {
  const stepIdx = stepIndex(stepId);
  if (stepIdx < 0) return false;

  const progress = missionStatus != null
    ? missionStepProgress(missionStatus)
    : topicStepProgress(topicStatus);

  if (stepId === "propose") return progress >= 1;
  if (stepId === "ratify") return progress >= 2;
  if (stepId === "assign") return progress >= 3;
  if (stepId === "analyze") return progress >= 4 || ["Submitted", "UnderReview", "NeedsRevision", "Revised"].includes(missionStatus);
  if (stepId === "review") return progress >= 4 && missionStatus !== "Assigned" && missionStatus !== "InProgress";
  if (stepId === "finalize") return progress >= 5 || topicStatus === "Completed";
  return false;
}

export default function AnalysisWorkflowStepper({
  currentStep,
  topicStatus,
  missionStatus,
  compact = false,
}) {
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
        const done = isStepComplete(step.id, topicStatus, missionStatus);
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
