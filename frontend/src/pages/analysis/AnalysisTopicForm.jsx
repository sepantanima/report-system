import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useAppTheme } from "../../context/ThemeContext.jsx";
import AnalysisMonitorLayout from "../../components/analysis/AnalysisMonitorLayout.jsx";
import TopicCard from "../../components/analysis/TopicCard.jsx";
import TopicFormModal from "../../components/analysis/TopicFormModal.jsx";
import TopicHistoryModal from "../../components/analysis/TopicHistoryModal.jsx";
import analysisService from "../../services/analysisService";
import { getCurrentUser } from "../../utils/analysisAuth.js";
import {
  canEditTopic,
  canResubmitTopic,
  canArchiveTopic,
  EMPTY_TOPIC_FORM,
  TOPIC_STATUS_META,
  PRIORITY_META,
  getDateRangeParams,
  validateTopicForm,
  getLatestReviewComment,
} from "../../utils/analysisMonitorUtils.js";

const PROPOSER_HELP = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 14, fontSize: 13, lineHeight: 2, textAlign: "justify" }}>
    <div style={{ background: "rgba(56,189,248,0.08)", border: "1px solid rgba(56,189,248,0.2)", borderRadius: 10, padding: 12, fontSize: 12, color: "#38bdf8" }}>
      این فرم برای ثبت و پیگیری موضوعات پیشنهادی تحلیل است. پس از ثبت، موضوع در وضعیت «ثبت‌شده» قرار می‌گیرد تا بررسی‌کننده آن را ارزیابی کند.
    </div>
    <b>۱. ثبت موضوع:</b>
    <p style={{ margin: "-8px 0 0" }}>با دکمه «موضوع جدید» فرم را باز کنید. عنوان/حوزه/کلیدواژه حداکثر ۸۰ و شرح/دلیل اهمیت حداکثر ۱۵۰ کاراکتر است.</p>
    <b>۲. پیگیری وضعیت:</b>
    <p style={{ margin: "-8px 0 0" }}>موضوعات «برگشت برای اصلاح» با رنگ متمایز و علت برگشت نمایش داده می‌شوند. تاریخچه تغییرات را از کارت ببینید.</p>
    <b>۳. ویرایش و ارسال مجدد:</b>
    <p style={{ margin: "-8px 0 0" }}>اگر رد یا برگشت خورد، ویرایش کنید و «ارسال مجدد» بزنید. پس از ارسال مجدد، دکمه تا پاسخ بعدی بررسی‌کننده نمایش داده نمی‌شود.</p>
    <b>۴. فیلتر و جستجو:</b>
    <p style={{ margin: "-8px 0 0" }}>از نوار تاریخ شمسی، جستجو و فیلتر وضعیت/اولویت برای یافتن سریع موضوعات استفاده کنید.</p>
  </div>
);

export default function AnalysisTopicForm() {
  const { isDarkMode } = useAppTheme();
  const user = getCurrentUser();

  const [topics, setTopics] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [dates, setDates] = useState(null);
  const [filters, setFilters] = useState({ status: "", priority: "" });
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState(null);
  const [topicHistory, setTopicHistory] = useState([]);
  const [form, setForm] = useState(EMPTY_TOPIC_FORM);
  const [historyModal, setHistoryModal] = useState({ open: false, topic: null, history: [] });

  const theme = useMemo(() => ({
    card: isDarkMode ? "#1e293b" : "#ffffff",
    border: isDarkMode ? "rgba(255,255,255,0.1)" : "#e2e8f0",
    text: isDarkMode ? "#f1f5f9" : "#1e293b",
    accent: "#38bdf8",
  }), [isDarkMode]);

  const dateRange = useMemo(() => getDateRangeParams(dates), [dates]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        ...dateRange,
        status: filters.status || undefined,
        priority: filters.priority || undefined,
        search: searchTerm || undefined,
      };
      const [list, stats] = await Promise.all([
        analysisService.getTopics(params),
        analysisService.getTopicSummary(params),
      ]);
      setTopics(list || []);
      setSummary(stats || {});
    } catch {
      setTopics([]);
      setSummary({});
    } finally {
      setLoading(false);
    }
  }, [dateRange, filters.status, filters.priority, searchTerm]);

  useEffect(() => { loadData(); }, [loadData]);

  const statsBar = [
    { key: "total", label: "کل", value: summary.total, color: "#38bdf8" },
    { key: "submitted", label: "ثبت‌شده", value: summary.submitted, color: "#0ea5e9" },
    { key: "returned", label: "برگشت‌خورده", value: summary.under_review, color: "#f59e0b" },
    { key: "approved", label: "تایید", value: summary.approved, color: "#22c55e" },
    { key: "rejected", label: "رد شده", value: summary.rejected, color: "#ef4444" },
  ];

  const topicToForm = (topic) => ({
    title: topic.title || "",
    description: topic.description || "",
    domain: topic.domain || "",
    keywords: topic.keywords || "",
    priority: topic.priority || "medium",
    importance_reason: topic.importance_reason || "",
    suggested_deadline: topic.suggested_deadline ? String(topic.suggested_deadline).slice(0, 10) : "",
  });

  const openCreate = () => {
    setEditingTopic(null);
    setTopicHistory([]);
    setForm(EMPTY_TOPIC_FORM);
    setModalOpen(true);
  };

  const openEdit = async (topic) => {
    try {
      const full = await analysisService.getTopic(topic.id);
      setEditingTopic(full);
      setTopicHistory(full.history || []);
      setForm(topicToForm(full));
      setModalOpen(true);
    } catch {
      setEditingTopic(topic);
      setTopicHistory([]);
      setForm(topicToForm(topic));
      setModalOpen(true);
    }
  };

  const openHistory = async (topic, e) => {
    e?.stopPropagation?.();
    try {
      const full = await analysisService.getTopic(topic.id);
      setHistoryModal({ open: true, topic: full, history: full.history || [] });
    } catch {
      alert("خطا در بارگذاری تاریخچه");
    }
  };

  const handleSubmit = async () => {
    const err = validateTopicForm(form);
    if (err) return alert(err);
    try {
      if (editingTopic) {
        await analysisService.updateTopic(editingTopic.id, form);
      } else {
        await analysisService.createTopic(form);
      }
      setModalOpen(false);
      loadData();
    } catch (err) {
      alert(err.response?.data?.error || "خطا در ذخیره");
    }
  };

  const handleResubmit = async (topic) => {
    if (!window.confirm("موضوع مجدداً برای بررسی ارسال شود؟")) return;
    try {
      await analysisService.resubmitTopic(topic.id);
      loadData();
    } catch (err) {
      alert(err.response?.data?.error || "خطا");
    }
  };

  const handleArchive = async (topic) => {
    if (!window.confirm("موضوع بایگانی شود؟")) return;
    try {
      await analysisService.archiveTopic(topic.id);
      loadData();
    } catch (err) {
      alert(err.response?.data?.error || "خطا");
    }
  };

  const filterContent = (
    <>
      <label className="v3-filter-label">وضعیت</label>
      <select className="v3-select-filter" style={{ background: theme.card, color: theme.text, border: `1px solid ${theme.border}` }} value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
        <option value="">همه</option>
        {Object.entries(TOPIC_STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
      </select>
      <label className="v3-filter-label">اولویت</label>
      <select className="v3-select-filter" style={{ background: theme.card, color: theme.text, border: `1px solid ${theme.border}` }} value={filters.priority} onChange={(e) => setFilters({ ...filters, priority: e.target.value })}>
        <option value="">همه</option>
        {Object.entries(PRIORITY_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
      </select>
    </>
  );

  return (
    <>
      <AnalysisMonitorLayout
        pageTitle="موضوعات تحلیل من"
        searchPlaceholder="جستجو در عنوان، شرح، کلیدواژه..."
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        dates={dates}
        onDatesChange={setDates}
        stats={statsBar}
        showFilters={showFilters}
        onToggleFilters={setShowFilters}
        onResetFilters={() => {
          setFilters({ status: "", priority: "" });
          setSearchTerm("");
          setDates(null);
        }}
        filterContent={filterContent}
        loading={loading}
        onHelp={PROPOSER_HELP}
        helpTitle="راهنمای ثبت موضوع تحلیل"
        onAdd={openCreate}
        addLabel="موضوع جدید"
      >
        {topics.length === 0 && !loading && (
          <p style={{ textAlign: "center", opacity: 0.5, padding: "40px 0" }}>موضوعی یافت نشد</p>
        )}
        <div className="v3-report-grid">
          {topics.map((t) => (
            <TopicCard
              key={t.id}
              topic={t}
              theme={theme}
              canEdit={canEditTopic(t, user.id, false)}
              onEdit={() => openEdit(t)}
              canResubmit={canResubmitTopic(t, user.id)}
              onResubmit={() => handleResubmit(t)}
              canArchive={canArchiveTopic(t, user.id, false)}
              onArchive={() => handleArchive(t)}
              onShowHistory={(e) => openHistory(t, e)}
              onClick={() => canEditTopic(t, user.id, false) && openEdit(t)}
            />
          ))}
        </div>
      </AnalysisMonitorLayout>

      <TopicFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        form={form}
        setForm={setForm}
        isEdit={!!editingTopic}
        theme={theme}
        isDarkMode={isDarkMode}
        history={topicHistory}
        returnComment={getLatestReviewComment(editingTopic, topicHistory)}
      />

      <TopicHistoryModal
        open={historyModal.open}
        onClose={() => setHistoryModal({ open: false, topic: null, history: [] })}
        topic={historyModal.topic}
        history={historyModal.history}
        theme={theme}
        isDarkMode={isDarkMode}
      />
    </>
  );
}
