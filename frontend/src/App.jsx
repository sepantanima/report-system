import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import Login from "./pages/login";
import MainForm from "./pages/MainForm";
import UserManagement from "./pages/UserManagement";
import NewsCardManager from "./pages/NewsCardManager";
import UnitReportForm from "./pages/UnitReportForm";
import FieldMonitor from "./pages/FieldMonitor";
import FieldReportDashboard from './pages/FieldReportDashboard';
import SystemSetting from './pages/SystemSetting';
import SmartAIProcessor from './pages/SmartAIProcessor';
import AnalysisManager from "./pages/AnalysisManager";
import AnalysisMissionDetail from "./pages/AnalysisMissionDetail";


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
        <Route path="/news-manager" element={<PrivateRoute><NewsCardManager /></PrivateRoute>} />
        
        {/* مسیر جدید برای پردازش هوشمند هوش مصنوعی */}
        <Route 
          path="/ai-processor" 
          element={<PrivateRoute><SmartAIProcessor /></PrivateRoute>} 
        />

        <Route path="/report" element={<PrivateRoute><UnitReportForm /></PrivateRoute>} />
        <Route path="/field-monitor" element={<PrivateRoute><FieldMonitor /></PrivateRoute>} />
        <Route path="/field-reports-dashboard" element={<PrivateRoute><FieldReportDashboard /></PrivateRoute>} />
        <Route path="/SystemSetting" element={<PrivateRoute><SystemSetting /></PrivateRoute>} />
<Route path="/analysis-manager" element={<PrivateRoute><AnalysisManager /></PrivateRoute>} />
        <Route path="/analysis-manager/mission/:id" element={<PrivateRoute><AnalysisMissionDetail /></PrivateRoute>} />

        {/* هدایت خودکار مسیرهای اشتباه به صفحه ورود */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
    </ThemeProvider>
  );
}


export default App;