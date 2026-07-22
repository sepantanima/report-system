import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link2, Loader2, Newspaper, RefreshCw, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import FormPageLayout from "../components/common/FormPageLayout.jsx";
import MultiSelect from "../components/MultiSelect.jsx";
import { useAppTheme } from "../context/ThemeContext.jsx";
import { getFormPageTheme } from "../theme/formPageTheme.js";
import { getSessionRoles, hasPermission } from "../utils/userRoles.js";
import { UNMAPPED_SENDERS_HELP } from "../content/unmappedSendersHelp.jsx";
import {
  fetchMessengerLinkUserOptions,
  fetchUnmappedSenders,
  getPlatformLabel,
  linkSenderToUser,
  markSenderAsNewsSource,
} from "../services/messengerAccountService.js";
import { toPersianDigits } from "../utils/analysisMonitorUtils.js";

function UserSingleSelect({ options, value, onChange, disabled, theme }) {
  return (
    <MultiSelect
      options={options}
      values={value ? [String(value)] : []}
      onChange={(vals) => onChange(vals.length ? vals[vals.length - 1] : "")}
      placeholder="انتخاب کاربر..."
      disabled={disabled}
      theme={theme}
      searchPlaceholder="جستجو نام یا نام کاربری..."
    />
  );
}

function StatCard({ label, value, color, theme, sub }) {
  return (
    <div
      style={{
        padding: "10px 12px",
        borderRadius: 10,
        border: `1px solid ${theme.border}`,
        background: theme.card,
        minWidth: 0,
      }}
    >
      <div style={{ fontSize: "0.86em", opacity: 0.75, marginBottom: 4, color: theme.muted }}>{label}</div>
      <div style={{ fontSize: "1.45em", fontWeight: 800, color: color || theme.text, lineHeight: 1.2 }}>
        {toPersianDigits(value)}
      </div>
      {sub ? (
        <div style={{ fontSize: "0.79em", opacity: 0.65, marginTop: 4, color: theme.muted }}>{sub}</div>
      ) : null}
    </div>
  );
}

export default function UnmappedSendersAdmin() {
  const navigate = useNavigate();
  const { isDarkMode } = useAppTheme();
  const theme = getFormPageTheme(isDarkMode);
  const allowed = hasPermission(getSessionRoles(), "manage_messenger_accounts");

  const [loading, setLoading] = useState(true);
  const [linkingKey, setLinkingKey] = useState(null);
  const [markingSourceKey, setMarkingSourceKey] = useState(null);
  const [data, setData] = useState({ news: [], field: [] });
  const [users, setUsers] = useState([]);
  const [selectedUserByKey, setSelectedUserByKey] = useState({});
  const [filterQuery, setFilterQuery] = useState("");
  const [filterKind, setFilterKind] = useState("");
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const load = useCallback(async () => {
    if (!allowed) return;
    setLoading(true);
    setError("");
    try {
      const [unmapped, userOpts] = await Promise.all([
        fetchUnmappedSenders(300),
        fetchMessengerLinkUserOptions(),
      ]);
      setData(unmapped);
      setUsers(userOpts);
    } catch (e) {
      setError(e.response?.data?.error || e.message || "خطا در بارگذاری");
    } finally {
      setLoading(false);
    }
  }, [allowed]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!successMsg) return undefined;
    const t = setTimeout(() => setSuccessMsg(""), 3500);
    return () => clearTimeout(t);
  }, [successMsg]);

  const userOptions = useMemo(
    () => (users || []).map((u) => ({
      value: String(u.id),
      label: `${u.name || u.username} (${u.username})`,
    })),
    [users],
  );

  const rows = useMemo(() => {
    const newsRows = (data.news || []).map((r) => ({
      key: `news:${r.platform}:${r.sender}`,
      kind: "خبر",
      kindKey: "news",
      sender: r.sender,
      platform: r.platform,
      count: r.news_count,
    }));
    const fieldRows = (data.field || []).map((r) => ({
      key: `field:${r.platform}:${r.sender}`,
      kind: "میدانی",
      kindKey: "field",
      sender: r.sender,
      platform: r.platform,
      count: r.report_count,
    }));
    return [...newsRows, ...fieldRows].sort((a, b) => b.count - a.count);
  }, [data]);

  const filteredRows = useMemo(() => {
    const q = filterQuery.trim().toLowerCase();
    return rows.filter((row) => {
      if (filterKind && row.kindKey !== filterKind) return false;
      if (!q) return true;
      const platformLabel = getPlatformLabel(row.platform).toLowerCase();
      const haystack = [
        row.sender,
        row.platform,
        platformLabel,
        row.kind,
        row.kindKey,
        row.kindKey === "news" ? "خبر" : "گزارش میدانی",
      ].join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }, [rows, filterQuery, filterKind]);

  const stats = useMemo(() => {
    const newsRows = rows.filter((r) => r.kindKey === "news");
    const fieldRows = rows.filter((r) => r.kindKey === "field");
    const totalRecords = rows.reduce((sum, r) => sum + (r.count || 0), 0);
    const filteredRecords = filteredRows.reduce((sum, r) => sum + (r.count || 0), 0);
    const platforms = new Set(rows.map((r) => r.platform));
    return {
      totalSenders: rows.length,
      newsSenders: newsRows.length,
      fieldSenders: fieldRows.length,
      totalRecords,
      platformCount: platforms.size,
      filteredSenders: filteredRows.length,
      filteredRecords,
    };
  }, [rows, filteredRows]);

  const removeRowFromData = useCallback((row) => {
    setData((prev) => {
      if (row.kindKey === "news") {
        return {
          ...prev,
          news: (prev.news || []).filter(
            (r) => !(r.sender === row.sender && r.platform === row.platform),
          ),
        };
      }
      return {
        ...prev,
        field: (prev.field || []).filter(
          (r) => !(r.sender === row.sender && r.platform === row.platform),
        ),
      };
    });
    setSelectedUserByKey((prev) => {
      const next = { ...prev };
      delete next[row.key];
      return next;
    });
  }, []);

  const handleLink = async (row) => {
    const userId = parseInt(selectedUserByKey[row.key], 10);
    if (!Number.isFinite(userId)) {
      alert("لطفاً کاربر سامانه را انتخاب کنید.");
      return;
    }
    setLinkingKey(row.key);
    setError("");
    try {
      await linkSenderToUser({
        sender: row.sender,
        platform: row.platform,
        user_id: userId,
      });
      removeRowFromData(row);
      setSuccessMsg(`«${row.sender}» با موفقیت به کاربر متصل شد.`);
    } catch (e) {
      setError(e.response?.data?.error || e.message || "خطا در نگاشت");
    } finally {
      setLinkingKey(null);
    }
  };

  const handleMarkAsSource = async (row) => {
    const sourceLabel = window.prompt(
      "این نام منبع/کانال خبری است (نه کاربر). نام منبع را تأیید یا اصلاح کنید:",
      row.sender,
    );
    if (sourceLabel == null) return;
    const label = sourceLabel.trim() || row.sender;

    setMarkingSourceKey(row.key);
    setError("");
    try {
      await markSenderAsNewsSource({
        sender: row.sender,
        platform: row.platform,
        source_label: label,
      });
      removeRowFromData(row);
      setSuccessMsg(`«${row.sender}» به‌عنوان منبع خبری ثبت شد و از لیست حذف شد.`);
    } catch (e) {
      setError(e.response?.data?.error || e.message || "خطا در ثبت منبع");
    } finally {
      setMarkingSourceKey(null);
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "8px 10px",
    borderRadius: 8,
    border: `1px solid ${theme.border}`,
    background: theme.inputBg,
    color: theme.text,
    fontFamily: "inherit",
    fontSize: "0.93em",
    boxSizing: "border-box",
  };

  if (!allowed) {
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        <p>دسترسی مجاز نیست.</p>
        <button type="button" onClick={() => navigate("/main")}>بازگشت</button>
      </div>
    );
  }

  return (
    <FormPageLayout
      title="فرستنده‌های ناشناس"
      documentTitle="فرستنده‌های ناشناس"
      subtitle="نگاشت sender به کاربر یا ثبت به‌عنوان منبع خبری"
      backTo="/main"
      onHelp={() => <UNMAPPED_SENDERS_HELP />}
      helpTitle="راهنمای فرستنده‌های ناشناس"
      toolbarExtra={(
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="form-page-btn form-page-btn-secondary"
          style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          <RefreshCw size={16} className={loading ? "spin" : undefined} />
          بروزرسانی
        </button>
      )}
    >
      <div className="unmapped-senders-page">
      {!loading ? (
        <div className="unmapped-sender-stats">
          <StatCard label="فرستندهٔ ناشناس" value={stats.totalSenders} color="#38bdf8" theme={theme} />
          <StatCard label="خبر" value={stats.newsSenders} color="#a855f7" theme={theme} sub="sender یکتا" />
          <StatCard label="گزارش میدانی" value={stats.fieldSenders} color="#06b6d4" theme={theme} sub="sender یکتا" />
          <StatCard label="رکورد تحت تأثیر" value={stats.totalRecords} color="#f59e0b" theme={theme} sub="خبر + میدان" />
          <StatCard label="پلتفرم" value={stats.platformCount} theme={theme} sub="بله / تلگرام / ایتا" />
          {(filterQuery || filterKind) ? (
            <StatCard
              label="نمایش فیلترشده"
              value={stats.filteredSenders}
              color="#22c55e"
              theme={theme}
              sub={`${toPersianDigits(stats.filteredRecords)} رکورد`}
            />
          ) : null}
        </div>
      ) : null}

      {successMsg ? (
        <div style={{ marginBottom: 12, padding: 10, borderRadius: 8, background: "rgba(34,197,94,0.12)", color: "#22c55e", fontSize: "0.93em" }}>
          {successMsg}
        </div>
      ) : null}

      {error ? (
        <div style={{ marginBottom: 12, padding: 10, borderRadius: 8, background: "rgba(239,68,68,0.1)", color: "#f87171", fontSize: "0.93em" }}>
          {error}
        </div>
      ) : null}

      {!loading && rows.length > 0 ? (
        <div
          className="unmapped-sender-filter-bar"
          style={{ border: `1px solid ${theme.border}`, background: theme.card }}
        >
          <div className="unmapped-sender-filter-search">
            <label style={{ display: "block", fontSize: "0.86em", opacity: 0.8, marginBottom: 4, color: theme.muted }}>
              جستجو
            </label>
            <div style={{ position: "relative" }}>
              <Search
                size={14}
                style={{
                  position: "absolute",
                  right: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  opacity: 0.5,
                  pointerEvents: "none",
                }}
              />
              <input
                type="text"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                placeholder="نام فرستنده، پلتفرم، خبر یا میدانی..."
                style={{ ...inputStyle, paddingRight: 32, marginBottom: 0 }}
              />
            </div>
          </div>
          <div className="unmapped-sender-filter-kind">
            <label style={{ display: "block", fontSize: "0.86em", opacity: 0.8, marginBottom: 4, color: theme.muted }}>
              نوع
            </label>
            <select
              value={filterKind}
              onChange={(e) => setFilterKind(e.target.value)}
              style={{ ...inputStyle, marginBottom: 0 }}
            >
              <option value="">همه</option>
              <option value="news">خبر</option>
              <option value="field">گزارش میدانی</option>
            </select>
          </div>
          <div className="unmapped-sender-filter-count" style={{ color: theme.muted }}>
            {toPersianDigits(filteredRows.length)} از {toPersianDigits(rows.length)} مورد
          </div>
        </div>
      ) : null}

      {loading ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.93em", color: theme.text }}>
          <Loader2 size={18} className="spin" /> در حال بارگذاری...
        </div>
      ) : rows.length === 0 ? (
        <div style={{ padding: 16, borderRadius: 10, border: `1px dashed ${theme.border}`, fontSize: "0.93em", opacity: 0.8, color: theme.muted }}>
          فرستنده ناشناسی یافت نشد.
        </div>
      ) : filteredRows.length === 0 ? (
        <div style={{ padding: 16, borderRadius: 10, border: `1px dashed ${theme.border}`, fontSize: "0.93em", opacity: 0.8, color: theme.muted }}>
          موردی با این فیلتر یافت نشد.
        </div>
      ) : (
        <div className="unmapped-senders-list">
          {filteredRows.map((row) => {
            const isLinking = linkingKey === row.key;
            const isMarkingSource = markingSourceKey === row.key;
            const isBusy = isLinking || isMarkingSource;
            return (
              <div
                key={row.key}
                className="unmapped-sender-row"
                style={{ border: `1px solid ${theme.border}`, background: theme.card }}
              >
                <div>
                  <div style={{ fontSize: "0.86em", opacity: 0.7, color: theme.muted }}>
                    {row.kind} · {getPlatformLabel(row.platform)}
                  </div>
                  <div className="unmapped-sender-row__sender-name" style={{ color: theme.text }}>{row.sender}</div>
                </div>
                <div className="unmapped-sender-row__meta">
                  <div className="unmapped-sender-row__meta-line" style={{ color: theme.text }}>
                    {toPersianDigits(row.count)} مورد
                  </div>
                  <div className="unmapped-sender-row__status" style={{ color: theme.muted }}>بدون نگاشت</div>
                </div>
                <div className="unmapped-sender-row__select">
                  <UserSingleSelect
                    options={userOptions}
                    value={selectedUserByKey[row.key] || ""}
                    onChange={(v) => setSelectedUserByKey((prev) => ({ ...prev, [row.key]: v }))}
                    disabled={isBusy}
                    theme={theme}
                  />
                </div>
                <div className="unmapped-sender-row__actions">
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => handleLink(row)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      padding: "8px 10px",
                      borderRadius: 8,
                      border: "none",
                      background: "#0ea5e9",
                      color: "#fff",
                      cursor: isBusy ? "wait" : "pointer",
                      fontFamily: "inherit",
                      whiteSpace: "nowrap",
                      opacity: isBusy && !isLinking ? 0.6 : 1,
                      fontSize: "0.86em",
                    }}
                  >
                    {isLinking ? <Loader2 size={14} className="spin" /> : <Link2 size={14} />}
                    {isLinking ? "در حال اتصال..." : "وصل به کاربر"}
                  </button>
                  {row.kindKey === "news" ? (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleMarkAsSource(row)}
                      title="این نام کانال/منبع خبری است، نه کاربر سامانه"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                        padding: "8px 10px",
                        borderRadius: 8,
                        border: `1px solid ${theme.border}`,
                        background: isDarkMode ? "rgba(245,158,11,0.12)" : "#fffbeb",
                        color: isDarkMode ? "#fbbf24" : "#b45309",
                        cursor: isBusy ? "wait" : "pointer",
                        fontFamily: "inherit",
                        whiteSpace: "nowrap",
                        opacity: isBusy && !isMarkingSource ? 0.6 : 1,
                        fontSize: "0.86em",
                      }}
                    >
                      {isMarkingSource ? <Loader2 size={14} className="spin" /> : <Newspaper size={14} />}
                      {isMarkingSource ? "در حال ثبت..." : "منبع خبری است"}
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
      </div>
    </FormPageLayout>
  );
}
