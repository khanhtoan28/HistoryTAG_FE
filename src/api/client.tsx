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

// ✅ Response interceptor để handle 401 gracefully và prevent redirect loop
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Chỉ handle 401 errors
    if (error.response?.status === 401) {
      const currentPath = window.location.pathname;
      const isAuthPage = currentPath === '/signin' || 
                        currentPath === '/signup' || 
                        currentPath === '/forgot-password' || 
                        currentPath === '/reset-password';
      
      // ✅ Prevent redirect loop: không redirect nếu đang ở trang auth
      if (!isAuthPage) {
        // Clear invalid token
        localStorage.removeItem('access_token');
        sessionStorage.removeItem('access_token');
        localStorage.removeItem('token');
        
        // Clear other auth-related data
        localStorage.removeItem('username');
        localStorage.removeItem('roles');
        localStorage.removeItem('userId');
        localStorage.removeItem('user');
        sessionStorage.removeItem('username');
        sessionStorage.removeItem('roles');
        sessionStorage.removeItem('userId');
        sessionStorage.removeItem('user');
        
        // Redirect to login (chỉ khi không ở trang auth)
        window.location.href = '/signin';
      }
      
      // ✅ Suppress 401 errors cho notification API khi chưa login
      // Điều này tránh spam console với 401 errors
      const isNotificationAPI = error.config?.url?.includes('/auth/notifications');
      if (isNotificationAPI && isAuthPage) {
        // Return a silent rejection để không log error
        return Promise.reject({
          ...error,
          silent: true, // Flag để caller biết đây là error có thể ignore
        });
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;
