// src/api/client.ts
import axios from "axios";

/** Helpers cho cookie */
function getCookie(name: string) {
  const m = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return m ? decodeURIComponent(m[2]) : null;
}

/** Ưu tiên đọc token từ cookie rồi tới localStorage */
export function getAuthToken(): string | null {
  return getCookie("access_token") || localStorage.getItem("access_token") || localStorage.getItem("token");
}

const api = axios.create({
  baseURL: "http://localhost:8080",
  withCredentials: true, // cho phép gửi cookie (nếu bạn dùng cookie để BE đọc)
  headers: {
    "Content-Type": "application/json",
  },
});

// 🧩 Gắn token cho tất cả request
api.interceptors.request.use((config) => {
  // Đọc token từ localStorage hoặc cookie
  const token =
    localStorage.getItem("access_token") ||
    document.cookie
      .split("; ")
      .find((row) => row.startsWith("access_token="))
      ?.split("=")[1];

  if (token) {
    config.headers.Authorization = `Bearer ${token}`; // 🔥 thêm dòng này
  }

  return config;
});


export default api;
