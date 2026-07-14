import React from "react";
import { useNavigate } from "react-router-dom";
import { User, LogOut } from "lucide-react";
import useLogout from "../../hooks/useLogout.js";

export default function PageUserMenu({
  showProfile = true,
  showLogout = true,
  btnClass = "v3-icon-btn",
  profilePath = "/SystemSetting?tab=appearance",
}) {
  const navigate = useNavigate();
  const logout = useLogout();

  const handleLogout = () => {
    if (window.confirm("خروج از حساب کاربری؟")) {
      logout();
    }
  };

  return (
    <>
      {showProfile ? (
        <button
          type="button"
          onClick={() => navigate(profilePath)}
          className={btnClass}
          title="پروفایل"
          aria-label="پروفایل"
        >
          <User size={18} />
        </button>
      ) : null}
      {showLogout ? (
        <button
          type="button"
          onClick={handleLogout}
          className={`${btnClass} page-user-logout-btn`}
          title="خروج"
          aria-label="خروج"
        >
          <LogOut size={18} />
        </button>
      ) : null}
    </>
  );
}
