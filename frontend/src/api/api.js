import axios from "axios";

/**
 * Axios instance configured for the Report System API.
 *
 * - Base URL: http://report.sepanta.org/api
 * - Use this instance for all HTTP requests to the report backend (e.g. api.get('/reports')).
 * - Interceptors, default headers, and other configuration may be added elsewhere.
 *
 * @type {import('axios').AxiosInstance}
 */
const api = axios.create({
  baseURL: "http://report.sepanta.org/api"
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default api;
