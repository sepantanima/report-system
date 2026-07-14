import React, { useMemo, useState } from "react";
import { useAppTheme } from "../../context/ThemeContext.jsx";
import AnalysisMonitorLayout from "../../components/analysis/AnalysisMonitorLayout.jsx";
import AnalysisReportsDashboard from "./AnalysisReportsDashboard.jsx";
import { DASHBOARD_HELP } from "../../content/analysisFormHelp.jsx";
import { getDateRangeParams } from "../../utils/analysisMonitorUtils.js";

export default function AnalysisDashboard() {
  const { isDarkMode } = useAppTheme();
  const [dates, setDates] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const theme = useMemo(() => ({
    card: isDarkMode ? "#1e293b" : "#ffffff",
    border: isDarkMode ? "rgba(255,255,255,0.1)" : "#e2e8f0",
    text: isDarkMode ? "#f1f5f9" : "#1e293b",
    accent: "#38bdf8",
  }), [isDarkMode]);

  const dateRange = useMemo(() => getDateRangeParams(dates), [dates]);

  return (
    <AnalysisMonitorLayout
      pageTitle="داشبورد تحلیل‌ها"
      searchPlaceholder="جستجو در گزارش‌ها..."
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      dates={dates}
      onDatesChange={setDates}
      stats={[{ label: "گزارش تحلیلی", value: "—", color: "#38bdf8" }]}
      showFilters={false}
      onToggleFilters={() => {}}
      onResetFilters={() => { setSearchTerm(""); setDates(null); }}
      filterContent={null}
      loading={false}
      onHelp={DASHBOARD_HELP}
      helpTitle="راهنمای داشبورد تحلیل‌ها"
      backTo="/main"
    >
      <AnalysisReportsDashboard
        theme={theme}
        isDarkMode={isDarkMode}
        dateRange={dateRange}
        loading={false}
      />
    </AnalysisMonitorLayout>
  );
}
