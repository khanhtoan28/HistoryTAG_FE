// src/api/client.ts
import axios from "axios";

/** Helpers cho cookie */
function getCookie(name: string) {
  const m = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return m ? decodeURIComponent(m[2]) : null;
}

/** Ưu tiên đọc token từ cookie rồi tới localStorage, cuối cùng là sessionStorage */
export function getAuthToken(): string | null {
  return getCookie("access_token") 
    || localStorage.getItem("access_token") 
    || sessionStorage.getItem("access_token")
    || localStorage.getItem("token");
}
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  // ✅ Không gửi token cho các API public (đăng nhập, đăng ký, quên mật khẩu, etc.)
  // Điều này tránh lỗi 401 khi token hết hạn hoặc invalid trên Server
  // Pattern matching: bắt tất cả các path bắt đầu bằng /api/v1/public/
  const isPublicPath = config.url?.startsWith('/api/v1/public/') || false;
  
  if (isPublicPath) {
    // ✅ Tắt withCredentials cho API public để browser KHÔNG gửi cookie
    // Điều này ngăn chặn việc gửi cookie access_token cũ (hết hạn) đến server
    config.withCredentials = false;
  } else {
    // Chỉ thêm token nếu KHÔNG phải là API public
    const token = getAuthToken();
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  
  return config;
});


export default api;
