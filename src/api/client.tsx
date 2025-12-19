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

// ✅ Helper để check xem user có phải SUPERADMIN không
function isSuperAdminUser(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    // Check pathname
    if (window.location.pathname.startsWith('/superadmin')) return true;
    // Check roles from localStorage/sessionStorage
    const roles = JSON.parse(localStorage.getItem('roles') || sessionStorage.getItem('roles') || '[]');
    if (Array.isArray(roles) && roles.some((r: unknown) => {
      if (typeof r === 'string') return r.toUpperCase() === 'SUPERADMIN';
      if (r && typeof r === 'object') {
        const rr = r as Record<string, unknown>;
        const rn = rr.roleName ?? rr.role_name ?? rr.role;
        return typeof rn === 'string' && rn.toUpperCase() === 'SUPERADMIN';
      }
      return false;
    })) {
      return true;
    }
    // Check JWT token
    const token = getAuthToken();
    if (token) {
      try {
        const parts = token.split('.');
        if (parts.length >= 2) {
          const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
          const maybeRoles = payload.roles || payload.authorities || payload.role || payload.realm_access && payload.realm_access.roles;
          if (Array.isArray(maybeRoles) && maybeRoles.some((r: unknown) => typeof r === 'string' && (r as string).toUpperCase() === 'SUPERADMIN')) {
            return true;
          }
        }
      } catch {
        // ignore decode errors
      }
    }
  } catch {
    // ignore
  }
  return false;
}

api.interceptors.request.use((config) => {
  // ✅ Chặn superadmin API calls từ ADMIN users (chặn từ gốc)
  const isSuperAdminAPI = config.url?.includes('/api/v1/superadmin/');
  if (isSuperAdminAPI && !isSuperAdminUser()) {
    // Reject ngay từ client, không gửi request đến server
    return Promise.reject({
      message: 'FORBIDDEN_CLIENT: ADMIN users cannot access SUPERADMIN endpoints',
      config,
      silent: true, // Flag để không log error spam
    }) as any;
  }

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
