import React, { useState, useEffect, useCallback } from "react";
import BriefSubmissionCard from "../../components/analysis/BriefSubmissionCard.jsx";
import BriefSubmissionDetail from "../../components/analysis/BriefSubmissionDetail.jsx";
import analysisService from "../../services/analysisService";
import useAnalysisToast from "../../hooks/useAnalysisToast.jsx";

export default function TopicManagementBriefProposalsTab({ theme, searchTerm }) {
  const { showToast, Toast } = useAnalysisToast();
  const [briefs, setBriefs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBrief, setSelectedBrief] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const list = await analysisService.getBriefSubmissions({
        status: "Submitted",
        entry_mode: "topic_proposal",
        search: searchTerm || undefined,
      });
      setBriefs(list || []);
    } catch {
      setBriefs([]);
    } finally {
      setLoading(false);
    }
  }, [searchTerm]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleReject = async (payload) => {
    if (!selectedBrief) return;
    if (!payload?.reject_reason?.trim()) return showToast("دلیل رد الزامی است");
    setActionLoading(true);
    try {
      const updated = await analysisService.updateBriefStatus(selectedBrief.id, {
        status: "Rejected",
        ...payload,
      });
      setSelectedBrief(updated);
      showToast("پیشنهاد رد شد");
      loadData();
    } catch (err) {
      showToast(err.response?.data?.error || "خطا");
    } finally {
      setActionLoading(false);
    }
  };

  const handleArchive = async (payload) => {
    if (!selectedBrief) return;
    setActionLoading(true);
    try {
      const updated = await analysisService.updateBriefStatus(selectedBrief.id, { status: "Archived", ...payload });
      setSelectedBrief(updated);
      showToast("بایگانی شد");
      loadData();
    } catch (err) {
      showToast(err.response?.data?.error || "خطا");
    } finally {
      setActionLoading(false);
    }
  };

  const handlePromoteTopic = async (opts) => {
    if (!selectedBrief) return;
    setActionLoading(true);
    try {
      const result = await analysisService.promoteBriefToTopic(selectedBrief.id, opts);
      setSelectedBrief(result.brief);
      showToast("به محور تبدیل شد");
      loadData();
    } catch (err) {
      showToast(err.response?.data?.error || "خطا");
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditContent = async (payload) => {
    if (!selectedBrief) return;
    setActionLoading(true);
    try {
      const updated = await analysisService.editBriefContent(selectedBrief.id, payload);
      setSelectedBrief(updated);
      showToast("متن ذخیره شد");
      loadData();
    } catch (err) {
      showToast(err.response?.data?.error || "خطا");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <>
      {Toast}
      <p style={{ fontSize: 12, opacity: 0.75, marginBottom: 14, lineHeight: 1.7 }}>
        پیشنهادهای موضوع ثبت‌شده از فرم «ثبت تحلیل». با «تبدیل به محور» وارد چرخه محور می‌شوند.
      </p>
      <div className={`v3-briefs-layout${selectedBrief ? " has-selection" : ""}`}>
        <div className="v3-briefs-list-pane">
          {briefs.length === 0 && !loading && (
            <p style={{ textAlign: "center", opacity: 0.5, fontSize: 13, padding: "24px 8px" }}>
              پیشنهاد موضوعی در صف نیست
            </p>
          )}
          {briefs.map((b) => (
            <BriefSubmissionCard
              key={b.id}
              item={b}
              theme={theme}
              selected={selectedBrief?.id === b.id}
              onClick={(row) => setSelectedBrief(row)}
            />
          ))}
        </div>
        <div className="v3-briefs-detail-pane" style={{ border: `1px solid ${theme.border}`, background: theme.card }}>
          <div className="v3-briefs-detail-header">
            <button
              type="button"
              className="v3-briefs-back-btn"
              style={{ color: theme.text }}
              onClick={() => setSelectedBrief(null)}
            >
              بازگشت به لیست
            </button>
          </div>
          <BriefSubmissionDetail
            item={selectedBrief}
            theme={theme}
            analysts={[]}
            publishDestinations={[]}
            loading={actionLoading}
            onEditContent={handleEditContent}
            onReject={handleReject}
            onArchive={handleArchive}
            onPromoteTopic={handlePromoteTopic}
          />
        </div>
      </div>
      {loading && <p style={{ fontSize: 12, opacity: 0.6 }}>در حال بارگذاری...</p>}
    </>
  );
}
