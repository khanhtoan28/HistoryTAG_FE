import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL, // có thể thêm '/api' nếu BE có prefix
  withCredentials: false,                 // bật nếu dùng cookie/session
  headers: { "Content-Type": "application/json" },
});

// (tuỳ chọn) gắn JWT từ localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;