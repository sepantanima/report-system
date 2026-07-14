import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import Login from "./pages/login";
import MainForm from "./pages/MainForm";
import UserManagement from "./pages/UserManagement";
import NewsMonitor from "./pages/NewsMonitor";
import NewsMonitorEntryForm from "./pages/NewsMonitorEntryForm.jsx";
import NewsDuplicatesManager from "./pages/NewsDuplicatesManager.jsx";
import NewsAnalyticsDashboard from "./pages/NewsAnalyticsDashboard.jsx";
import UnitReportForm from "./pages/UnitReportForm";
import FieldMonitor from "./pages/FieldMonitor";
import FieldReportDashboard from './pages/FieldReportDashboard';
import UnmappedSendersAdmin from "./pages/UnmappedSendersAdmin.jsx";
import SystemSetting from "./pages/SystemSetting.jsx";
import NewsSmartAnalysisWorkspace from "./pages/newsSmartAnalysis/NewsSmartAnalysisWorkspace.jsx";
import AnalysisManagerPanel from "./pages/analysis/AnalysisManagerPanel";
import AnalysisMissionPanel from "./pages/analysis/AnalysisMissionPanel";
import AnalysisTopicManagement from "./pages/analysis/AnalysisTopicManagement";
import AnalysisDashboard from "./pages/analysis/AnalysisDashboard";
import AnalysisMyMissionsPanel from "./pages/analysis/AnalysisMyMissionsPanel";
import AnalysisMissionDetail from "./pages/AnalysisMissionDetail";
import AnalysisTopicApprovalDetail from "./pages/analysis/AnalysisTopicApprovalDetail";
import AnalysisTopicAssignDetail from "./pages/analysis/AnalysisTopicAssignDetail";
import AnalysisMissionManage from "./pages/analysis/AnalysisMissionManage";
import AnalysisBriefSubmit from "./pages/analysis/AnalysisBriefSubmit";
import AnalysisPermissionRoute from "./components/analysis/AnalysisPermissionRoute.jsx";
import PromptManagement from "./pages/PromptManagement.jsx";
import AiApiManagement from "./pages/AiApiManagement.jsx";
import AiFormActionsManagement from "./pages/AiFormActionsManagement.jsx";
import AiRunLogsManagement from "./pages/AiRunLogsManagement.jsx";
import NewsCleanPatternManagement from "./pages/NewsCleanPatternManagement.jsx";
import MessengerChannelManagement from "./pages/MessengerChannelManagement.jsx";
import NewsReportGenerator from "./pages/NewsReportGenerator.jsx";
import NewsReportSettingsAdmin from "./pages/NewsReportSettingsAdmin.jsx";
import FieldManagementSummary from "./pages/FieldManagementSummary.jsx";
import FieldManagementSummaryCreate from "./pages/FieldManagementSummaryCreate.jsx";
import FieldReportSettingsAdmin from "./pages/FieldReportSettingsAdmin.jsx";
import NewsEntrySettingsAdmin from "./pages/NewsEntrySettingsAdmin.jsx";
import MessageInboxPage from "./pages/MessageInboxPage.jsx";
import ComposeAnnouncementPage from "./pages/ComposeAnnouncementPage.jsx";
import MessageSettingsAdmin from "./pages/MessageSettingsAdmin.jsx";


// کامپوننت محافظت از مسیرها
const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem("token");
  return token ? children : <Navigate to="/" />;
};

function LegacyApproveDetailRedirect() {
  const { id } = useParams();
  return <Navigate to={`/analysis/topics/${id}?tab=queue`} replace />;
}

function LegacyApproveTopicsRedirect() {
  return <Navigate to="/analysis/topics?tab=queue" replace />;
}

function LegacyManagementTopicRedirect() {
  const { id } = useParams();
  return <Navigate to={`/analysis/missions/topic/${id}`} replace />;
}

function LegacyManagementMissionRedirect() {
  const { id } = useParams();
  return <Navigate to={`/analysis/missions/mission/${id}`} replace />;
}

function LegacyProposeTopicRedirect() {
  return <Navigate to="/analysis/topics?tab=mine" replace />;
}

function LegacyApproveTopicsDetailRedirect() {
  const { id } = useParams();
  return <Navigate to={`/analysis/topics/${id}?tab=queue`} replace />;
}

function App() {
  return (
    <ThemeProvider>
    <BrowserRouter>
      <Routes>
        {/* مسیر عمومی ورود */}
        <Route path="/" element={<Login />} />

        {/* مسیرهای محافظت شده (فقط با لاگین) */}
        <Route path="/main" element={<PrivateRoute><MainForm /></PrivateRoute>} />
        <Route path="/users" element={<PrivateRoute><UserManagement /></PrivateRoute>} />
        <Route path="/news-manager" element={<PrivateRoute><NewsMonitor /></PrivateRoute>} />
        <Route path="/news-entry" element={<PrivateRoute><NewsMonitorEntryForm /></PrivateRoute>} />
        <Route path="/news-duplicates" element={<PrivateRoute><NewsDuplicatesManager /></PrivateRoute>} />
        <Route path="/news-analytics" element={<PrivateRoute><NewsAnalyticsDashboard /></PrivateRoute>} />
        
        {/* مسیر جدید برای پردازش هوشمند هوش مصنوعی */}
        <Route 
          path="/ai-processor" 
          element={<PrivateRoute><NewsSmartAnalysisWorkspace /></PrivateRoute>} 
        />

        <Route path="/report" element={<PrivateRoute><UnitReportForm /></PrivateRoute>} />
        <Route path="/field-monitor" element={<PrivateRoute><FieldMonitor /></PrivateRoute>} />
        <Route path="/field-reports-dashboard" element={<PrivateRoute><FieldReportDashboard /></PrivateRoute>} />
        <Route path="/field-management-summary" element={<PrivateRoute><FieldManagementSummaryCreate /></PrivateRoute>} />
        <Route path="/field-management-summary/list" element={<PrivateRoute><FieldManagementSummary /></PrivateRoute>} />
        <Route path="/field-management-summary/new" element={<Navigate to="/field-management-summary" replace />} />
        <Route path="/admin/prompts" element={<PrivateRoute><PromptManagement /></PrivateRoute>} />
        <Route path="/admin/ai-api-configs" element={<PrivateRoute><AiApiManagement /></PrivateRoute>} />
        <Route path="/admin/ai-form-actions" element={<PrivateRoute><AiFormActionsManagement /></PrivateRoute>} />
        <Route path="/admin/ai-run-logs" element={<PrivateRoute><AiRunLogsManagement /></PrivateRoute>} />
        <Route path="/admin/news-clean-patterns" element={<PrivateRoute><NewsCleanPatternManagement /></PrivateRoute>} />
        <Route path="/admin/messenger-channels" element={<PrivateRoute><MessengerChannelManagement /></PrivateRoute>} />
        <Route path="/news-reports" element={<PrivateRoute><NewsReportGenerator /></PrivateRoute>} />
        <Route path="/admin/news-report-settings" element={<PrivateRoute><NewsReportSettingsAdmin /></PrivateRoute>} />
        <Route path="/admin/field-report-settings" element={<PrivateRoute><FieldReportSettingsAdmin /></PrivateRoute>} />
        <Route path="/admin/news-entry-settings" element={<PrivateRoute><NewsEntrySettingsAdmin /></PrivateRoute>} />
        <Route path="/messages" element={<PrivateRoute><MessageInboxPage /></PrivateRoute>} />
        <Route path="/messages/compose" element={<PrivateRoute><ComposeAnnouncementPage /></PrivateRoute>} />
        <Route path="/admin/message-settings" element={<PrivateRoute><MessageSettingsAdmin /></PrivateRoute>} />
        <Route path="/admin/unmapped-senders" element={<PrivateRoute><UnmappedSendersAdmin /></PrivateRoute>} />
        <Route path="/SystemSetting" element={<PrivateRoute><SystemSetting /></PrivateRoute>} />
        <Route path="/analysis/topics" element={<AnalysisPermissionRoute permission={["analysis_propose", "analysis_topic_approve", "analysis_manage"]}><AnalysisTopicManagement /></AnalysisPermissionRoute>} />
        <Route path="/analysis/topics/:id" element={<AnalysisPermissionRoute permission={["analysis_manage", "analysis_topic_approve"]}><AnalysisTopicApprovalDetail /></AnalysisPermissionRoute>} />
        <Route path="/analysis/missions" element={<AnalysisPermissionRoute permission="analysis_manage"><AnalysisMissionPanel /></AnalysisPermissionRoute>} />
        <Route path="/analysis/missions/topic/:id" element={<AnalysisPermissionRoute permission="analysis_manage"><AnalysisTopicAssignDetail /></AnalysisPermissionRoute>} />
        <Route path="/analysis/missions/mission/:id" element={<AnalysisPermissionRoute permission="analysis_manage"><AnalysisMissionManage /></AnalysisPermissionRoute>} />
        <Route path="/analysis/management" element={<AnalysisPermissionRoute permission="analysis_manage"><AnalysisManagerPanel /></AnalysisPermissionRoute>} />
        <Route path="/analysis/approve-topics" element={<LegacyApproveTopicsRedirect />} />
        <Route path="/analysis/approve-topics/:id" element={<LegacyApproveTopicsDetailRedirect />} />
        <Route path="/analysis/management/approve/:id" element={<LegacyApproveDetailRedirect />} />
        <Route path="/analysis/management/topic/:id" element={<LegacyManagementTopicRedirect />} />
        <Route path="/analysis/management/mission/:id" element={<LegacyManagementMissionRedirect />} />
        <Route path="/analysis/dashboard" element={<AnalysisPermissionRoute permission="analysis_manage"><AnalysisDashboard /></AnalysisPermissionRoute>} />
        <Route path="/analysis/my-missions" element={<AnalysisPermissionRoute permission={["analysis_missions", "analysis_review"]}><AnalysisMyMissionsPanel /></AnalysisPermissionRoute>} />
        <Route path="/analysis/propose-topic" element={<LegacyProposeTopicRedirect />} />
        <Route path="/analysis/review" element={<Navigate to="/analysis/my-missions?tab=review" replace />} />
        <Route path="/analysis/mission/:id" element={<AnalysisPermissionRoute permission={["analysis_missions", "analysis_review", "analysis_manage"]}><AnalysisMissionDetail /></AnalysisPermissionRoute>} />
        <Route path="/analysis/brief-submit" element={<AnalysisPermissionRoute permission="analysis_brief_submit"><AnalysisBriefSubmit /></AnalysisPermissionRoute>} />
        <Route path="/analysis-manager" element={<Navigate to="/analysis/missions" replace />} />
        <Route path="/analysis-manager/mission/:id" element={<Navigate to="/analysis/mission/:id" replace />} />

        {/* هدایت خودکار مسیرهای اشتباه به صفحه ورود */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
    </ThemeProvider>
  );
}


export default App;