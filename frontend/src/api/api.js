import axios from "axios";

// استفاده از آدرس دامنه در صورت عدم تعریف متغیر محیطی برای جلوگیری از خطای 404
const baseURL = import.meta.env.VITE_API_BASE_URL || "/api";

let authRedirectPending = false;

function clearSessionAndRedirectToLogin(reason = "expired") {
  if (authRedirectPending) return;
  if (typeof window === "undefined") return;
  const onLogin = window.location.pathname === "/" || window.location.pathname === "/login";
  if (onLogin) return;
  authRedirectPending = true;
  localStorage.removeItem("token");
  localStorage.removeItem("role");
  window.location.href = `/?session=${reason}`;
}

const api = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// برای تست در پروداکشن: لاگ دقیق خطا
api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error.response?.status;
    const msg = error.response?.data?.error;
    const code = error.response?.data?.code;
    console.error("API Error Details:", status, error.config?.url, msg || "");
    if (status === 401 && error.config?.url !== "/auth/login") {
      const reason = code === "TOKEN_EXPIRED" ? "expired" : "invalid";
      clearSessionAndRedirectToLogin(reason);
    }
    return Promise.reject(error);
  }
);

export default api;