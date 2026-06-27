import axios from "axios";

// استفاده از آدرس دامنه در صورت عدم تعریف متغیر محیطی برای جلوگیری از خطای 404
const baseURL = import.meta.env.VITE_API_BASE_URL || "/api";

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
    const msg = error.response?.data?.error;
    console.error("API Error Details:", error.response?.status, error.config?.url, msg || "");
    return Promise.reject(error);
  }
);

export default api;