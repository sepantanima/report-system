import { useState } from "react";
import api from "../api/api";
import { useNavigate } from "react-router-dom";
import "./login.css";

function Login() {

  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {

    try {

      const res = await api.post("/auth/login", {
        username,
        password
      });

      localStorage.setItem("token", res.data.token);

      navigate("/dashboard");

    } catch (err) {

      alert("login failed    error text: " + err);

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
