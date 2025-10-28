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
  baseURL: "http://localhost:8080",
  withCredentials: true, // cho phép gửi cookie (nếu bạn dùng cookie để BE đọc)
});

api.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});


export default api;
