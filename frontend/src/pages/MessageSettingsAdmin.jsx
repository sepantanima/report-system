import { Navigate } from "react-router-dom";

export default function MessageSettingsAdmin() {
  return <Navigate to="/SystemSetting?tab=messaging" replace />;
}
