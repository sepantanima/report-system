import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
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
import SystemSetting from './pages/SystemSetting';
import SmartAIProcessor from './pages/SmartAIProcessor';
import AnalysisManagerRedirect from "./pages/AnalysisManager";
import AnalysisMissionDetail from "./pages/AnalysisMissionDetail";
import AnalysisManagerPanel from "./pages/analysis/AnalysisManagerPanel";
import AnalysisAnalystMissions from "./pages/analysis/AnalysisAnalystMissions";
import AnalysisTopicForm from "./pages/analysis/AnalysisTopicForm";
import AnalysisMentorReview from "./pages/analysis/AnalysisMentorReview";
import AnalysisTopicApprovalDetail from "./pages/analysis/AnalysisTopicApprovalDetail";
import AnalysisTopicAssignDetail from "./pages/analysis/AnalysisTopicAssignDetail";
import AnalysisMissionManage from "./pages/analysis/AnalysisMissionManage";
import PromptManagement from "./pages/PromptManagement.jsx";
import AiApiManagement from "./pages/AiApiManagement.jsx";
import AiFormActionsManagement from "./pages/AiFormActionsManagement.jsx";
import NewsCleanPatternManagement from "./pages/NewsCleanPatternManagement.jsx";
import FieldManagementSummary from "./pages/FieldManagementSummary.jsx";
import FieldManagementSummaryCreate from "./pages/FieldManagementSummaryCreate.jsx";


// کامپوننت محافظت از مسیرها
const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem("token");
  return token ? children : <Navigate to="/" />;
};

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
          element={<PrivateRoute><SmartAIProcessor /></PrivateRoute>} 
        />

        <Route path="/report" element={<PrivateRoute><UnitReportForm /></PrivateRoute>} />
        <Route path="/field-monitor" element={<PrivateRoute><FieldMonitor /></PrivateRoute>} />
        <Route path="/field-reports-dashboard" element={<PrivateRoute><FieldReportDashboard /></PrivateRoute>} />
        <Route path="/field-management-summary" element={<PrivateRoute><FieldManagementSummary /></PrivateRoute>} />
        <Route path="/field-management-summary/new" element={<PrivateRoute><FieldManagementSummaryCreate /></PrivateRoute>} />
        <Route path="/admin/prompts" element={<PrivateRoute><PromptManagement /></PrivateRoute>} />
        <Route path="/admin/ai-api-configs" element={<PrivateRoute><AiApiManagement /></PrivateRoute>} />
        <Route path="/admin/ai-form-actions" element={<PrivateRoute><AiFormActionsManagement /></PrivateRoute>} />
        <Route path="/admin/news-clean-patterns" element={<PrivateRoute><NewsCleanPatternManagement /></PrivateRoute>} />
        <Route path="/SystemSetting" element={<PrivateRoute><SystemSetting /></PrivateRoute>} />
        <Route path="/analysis/management" element={<PrivateRoute><AnalysisManagerPanel /></PrivateRoute>} />
        <Route path="/analysis/management/approve/:id" element={<PrivateRoute><AnalysisTopicApprovalDetail /></PrivateRoute>} />
        <Route path="/analysis/management/topic/:id" element={<PrivateRoute><AnalysisTopicAssignDetail /></PrivateRoute>} />
        <Route path="/analysis/management/mission/:id" element={<PrivateRoute><AnalysisMissionManage /></PrivateRoute>} />
        <Route path="/analysis/my-missions" element={<PrivateRoute><AnalysisAnalystMissions /></PrivateRoute>} />
        <Route path="/analysis/propose-topic" element={<PrivateRoute><AnalysisTopicForm /></PrivateRoute>} />
        <Route path="/analysis/review" element={<PrivateRoute><AnalysisMentorReview /></PrivateRoute>} />
        <Route path="/analysis/mission/:id" element={<PrivateRoute><AnalysisMissionDetail /></PrivateRoute>} />
        <Route path="/analysis-manager" element={<PrivateRoute><AnalysisManagerRedirect /></PrivateRoute>} />
        <Route path="/analysis-manager/mission/:id" element={<PrivateRoute><AnalysisMissionDetail /></PrivateRoute>} />

        {/* هدایت خودکار مسیرهای اشتباه به صفحه ورود */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
    </ThemeProvider>
  );
}


export default App;