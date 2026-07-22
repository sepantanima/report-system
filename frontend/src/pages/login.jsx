import { useState, useEffect } from "react";
import api from "../api/api";
import { useNavigate } from "react-router-dom";
import { normalizeRoles, persistSessionRoles } from "../utils/userRoles.js";
import { normalizeGender } from "../utils/userGreeting.js";
import "./Login.css";

function Login() {

  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [sessionNotice, setSessionNotice] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const session = params.get("session");
    if (session === "expired") {
      setSessionNotice("نشست شما منقضی شده است. لطفاً دوباره وارد شوید.");
    } else if (session === "invalid") {
      setSessionNotice("ورود شما نامعتبر است. لطفاً دوباره وارد شوید.");
    }
  }, []);

  const handleLogin = async () => {
  if (!username || !password) return alert("لطفاً فیلدها را پر کنید");
  
  try {
    const res = await api.post("/auth/login", { username, password });
    const roles = normalizeRoles(res.data.role);

    localStorage.setItem("token", res.data.token);
    persistSessionRoles(roles);
    if (res.data.permissions) {
      localStorage.setItem("permissions", JSON.stringify(res.data.permissions));
    }
    if (res.data.permission_version != null) {
      localStorage.setItem("permission_version", String(res.data.permission_version));
    }
    if (res.data.instance_mode) localStorage.setItem("instance_mode", res.data.instance_mode);
    if (res.data.org_code) localStorage.setItem("org_code", res.data.org_code);
    if (res.data.org_role) localStorage.setItem("org_role", res.data.org_role);
    localStorage.setItem("unitcd", res.data.unitcd || "");
    localStorage.setItem("username", res.data.userName || res.data.username || username);
    localStorage.setItem("name", res.data.name || res.data.userName || username);
    localStorage.setItem("gender", normalizeGender(res.data.gender));

    navigate("/main"); 
  } catch (err) {
    const fromBody = err.response?.data?.error;
    const status = err.response?.status;
    const detail =
      fromBody ||
      (status ? `پاسخ سرور: ${status} (احتمالاً nginx مسیر /api را به بک‌اند پروکسی نمی‌کند)` : null) ||
      err.message ||
      "ارتباط با سرور برقرار نشد";
    alert("خطا: " + detail);
  }
};

  return (
    <div className="loginPage">

      <div className="blob blob1"></div>
      <div className="blob blob2"></div>

      <div className="loginCardWrap">

        <div className="loginHeader">
          <div className="logoBox">
            <img src="/logo.png" className="logoImg" />
          </div>

          <h2 className="title">ورود</h2>
          <div className="subtitle">سیستم گزارشات</div>
        </div>

        <div className="loginCard">

          {sessionNotice ? (
            <div style={{
              marginBottom: 12,
              padding: "10px 12px",
              borderRadius: 8,
              background: "rgba(245,158,11,0.12)",
              border: "1px solid rgba(245,158,11,0.35)",
              color: "#b45309",
              fontSize: 13,
              textAlign: "center",
            }}
            >
              {sessionNotice}
            </div>
          ) : null}

          <div className="loginForm">

            <div className="field">
              <label className="label">نام کاربری</label>

              <div className="inputWrap">
                <span className="icon">👤</span>

                <input
                  className="input"
                  placeholder="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />

              </div>
            </div>

            <div className="field">
              <label className="label">رمز عبور</label>

              <div className="inputWrap">
                <span className="icon">🔒</span>

                <input
                  className="input"
                  type="password"
                  placeholder="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />

              </div>
            </div>

            <button className="submitBtn" onClick={handleLogin}>
              Login
            </button>

          </div>

        </div>

        <div className="footer">
          Sepanta Report System
        </div>

      </div>

    </div>
  );
}

export default Login;

