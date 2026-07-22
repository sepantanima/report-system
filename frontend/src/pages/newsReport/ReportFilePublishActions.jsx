import React, { useState } from "react";
import { Loader2, Send } from "lucide-react";
import newsReportService from "../../services/newsReportService.js";
import MessengerChannelSendModal from "./MessengerChannelSendModal.jsx";

export default function ReportFilePublishActions({
  reportId,
  fileName,
  status = "ready",
  destinations = [],
  theme,
  onError,
  onPublished,
  compact = false,
}) {
  const [publishing, setPublishing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const onSendToChannels = async (destIds) => {
    setPublishing(true);
    onError?.("");
    const failed = [];
    try {
      for (const id of destIds) {
        try {
          await newsReportService.publishReport(reportId, { destination_id: id });
        } catch (e) {
          failed.push({ id, error: e.response?.data?.error || e.message });
        }
      }
      setModalOpen(false);
      if (failed.length === destIds.length) {
        onError?.(failed.map((f) => f.error).join(" · "));
      } else if (failed.length) {
        onError?.(`برخی کانال‌ها ناموفق: ${failed.map((f) => f.error).join(" · ")}`);
        onPublished?.();
      } else {
        onPublished?.();
      }
    } finally {
      setPublishing(false);
    }
  };

  if (!destinations.length) return null;

  return (
    <>
      <button
        type="button"
        disabled={status !== "ready" || publishing}
        onClick={() => setModalOpen(true)}
        title={`ارسال ${fileName || ""}`}
        style={{
          border: `1px solid ${theme.border}`,
          background: theme.card,
          borderRadius: 6,
          padding: compact ? "4px 8px" : "6px 10px",
          cursor: status !== "ready" ? "not-allowed" : "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          color: "#22c55e",
          fontSize: 11,
          fontFamily: "inherit",
          opacity: status !== "ready" ? 0.5 : 1,
          flexShrink: 0,
        }}
      >
        {publishing ? <Loader2 size={14} className="spin" /> : <Send size={14} />}
        ارسال
      </button>

      <MessengerChannelSendModal
        open={modalOpen}
        onClose={() => !publishing && setModalOpen(false)}
        title="ارسال فایل گزارش"
        description={fileName ? `فایل: ${fileName}` : undefined}
        destinations={destinations}
        onSend={onSendToChannels}
        sending={publishing}
        theme={theme}
      />
    </>
  );
}
