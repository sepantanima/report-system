import { Navigate } from "react-router-dom";

export default function NewsEntrySettingsAdmin() {
  return <Navigate to="/SystemSetting?tab=news_limits" replace />;
}
