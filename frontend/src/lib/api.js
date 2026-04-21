import axios from "axios";

const api = axios.create({
  baseURL: `${process.env.REACT_APP_BACKEND_URL}/api/v1`,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

export function formatApiError(detail) {
  if (detail == null) return "Something went wrong.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail.map((e) => e?.msg || JSON.stringify(e)).filter(Boolean).join(" ");
  if (detail?.msg) return detail.msg;
  return String(detail);
}

let isRefreshing = false;

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401 && !err.config._retry && !isRefreshing) {
      err.config._retry = true;
      isRefreshing = true;
      try {
        await api.post("/auth/refresh");
        isRefreshing = false;
        return api(err.config);
      } catch {
        isRefreshing = false;
      }
    }
    return Promise.reject(err);
  }
);

export default api;
