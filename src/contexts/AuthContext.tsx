/**
 * AuthContext - Centralized authentication state management
 * 
 * ✅ Benefits:
 * - Single source of truth cho roles/permissions
 * - Performance: Parse JWT chỉ khi token thay đổi (useMemo)
 * - Reactive: Tự động update khi token thay đổi
 * - Safe: Dùng jwt-decode để handle UTF-8 characters
 */

import React, { createContext, useContext, useMemo, useEffect, useState } from 'react';
import { getAuthToken } from '../api/client';

interface AuthContextType {
  roles: string[];
  isAdmin: boolean;
  isSuperAdmin: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canCreate: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  roles: [],
  isAdmin: false,
  isSuperAdmin: false,
  canEdit: false,
  canDelete: false,
  canCreate: false,
  isLoading: true,
});

/**
 * Safe JWT decode - Handle UTF-8 characters properly
 * ✅ Fix: Không dùng atob trực tiếp (không hỗ trợ UTF-8 tốt)
 * ✅ Fallback nếu không có jwt-decode library
 */
function safeJwtDecode(token: string): any {
  try {
    // ✅ Try dùng jwt-decode nếu có (khuyên dùng thư viện này)
    // Dynamic import để tránh error nếu chưa install
    try {
      // @ts-ignore - Dynamic import
      const jwtDecode = require('jwt-decode');
      return jwtDecode(token);
    } catch {
      // jwt-decode chưa install → fallback về manual decode
    }
    
    // ✅ Fallback: Parse thủ công với UTF-8 support (thay vì atob)
    const parts = token.split('.');
    if (parts.length < 2) {
      throw new Error('Invalid token format');
    }
    
    // ✅ Decode base64 với UTF-8 support (fix atob issue)
    const base64Url = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const base64 = base64Url.padEnd(base64Url.length + (4 - base64Url.length % 4) % 4, '=');
    
    // ✅ Dùng decodeURIComponent để handle UTF-8 characters (tiếng Việt, emoji, etc.)
    // Thay vì atob trực tiếp → không hỗ trợ UTF-8 tốt
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const jsonPayload = new TextDecoder('utf-8').decode(bytes);
    
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error('Error decoding JWT token:', e);
    throw e;
  }
}

/**
 * Normalize role string
 */
function normalizeRole(r: any): string {
  if (typeof r === 'string') {
    return r.toUpperCase().trim();
  }
  if (r && typeof r === 'object') {
    const roleName = r.roleName || r.role_name || r.role || r.name;
    if (typeof roleName === 'string') {
      return roleName.toUpperCase().trim();
    }
  }
  return String(r).toUpperCase().trim();
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ✅ Listen for token changes (khi login/logout)
  useEffect(() => {
    const updateToken = () => {
      const currentToken = getAuthToken();
      setToken(currentToken);
      setIsLoading(false);
    };

    // Initial load
    updateToken();

    // ✅ Listen for storage events (khi token thay đổi ở tab khác)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'access_token' || e.key === 'token') {
        updateToken();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // ✅ Polling để detect token changes (fallback nếu storage event không fire)
    const interval = setInterval(updateToken, 1000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  // ✅ Parse JWT và tính toán auth state (chỉ khi token thay đổi)
  const authState = useMemo(() => {
    try {
      if (!token) {
        return {
          roles: [],
          isAdmin: false,
          isSuperAdmin: false,
          canEdit: false,
          canDelete: false,
          canCreate: false,
          isLoading: false,
        };
      }

      // ✅ Parse JWT token (safe với UTF-8)
      const decoded: any = safeJwtDecode(token);
      
      // ✅ Extract roles từ nhiều format khác nhau
      const rawRoles = decoded.roles || decoded.authorities || decoded.role || [];
      const roles = Array.isArray(rawRoles)
        ? rawRoles.map(normalizeRole).filter(Boolean)
        : [];

      // ✅ Check permissions
      const isSuperAdmin = roles.some((r: string) => 
        r === 'SUPERADMIN' || r === 'SUPER_ADMIN' || r === 'SUPER ADMIN'
      );
      const isAdmin = roles.some((r: string) => 
        r === 'ADMIN' || isSuperAdmin
      );

      // ✅ Sync với localStorage để cache (nhưng token là source of truth)
      if (roles.length > 0) {
        const storage = localStorage.getItem('access_token') ? localStorage : sessionStorage;
        try {
          storage.setItem('roles', JSON.stringify(roles));
        } catch {
          // Ignore storage errors
        }
      }

      return {
        roles,
        isSuperAdmin,
        isAdmin,
        canEdit: isAdmin,
        canDelete: isAdmin,
        canCreate: isAdmin,
        isLoading: false,
      };
    } catch (e) {
      console.error('Error parsing auth state:', e);
      // ✅ Fallback: Try localStorage
      try {
        const rolesStr = localStorage.getItem('roles') || sessionStorage.getItem('roles');
        if (rolesStr) {
          const roles = JSON.parse(rolesStr).map(normalizeRole);
          const isSuperAdmin = roles.some((r: string) => 
            r === 'SUPERADMIN' || r === 'SUPER_ADMIN'
          );
          const isAdmin = roles.some((r: string) => 
            r === 'ADMIN' || isSuperAdmin
          );
          
          return {
            roles,
            isSuperAdmin,
            isAdmin,
            canEdit: isAdmin,
            canDelete: isAdmin,
            canCreate: isAdmin,
            isLoading: false,
          };
        }
      } catch {
        // Ignore
      }
      
      return {
        roles: [],
        isAdmin: false,
        isSuperAdmin: false,
        canEdit: false,
        canDelete: false,
        canCreate: false,
        isLoading: false,
      };
    }
  }, [token]); // ✅ Chỉ tính toán lại khi token thay đổi

  return (
    <AuthContext.Provider value={authState}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Custom Hook để dùng auth state trong component
 * 
 * @example
 * ```tsx
 * const { canEdit, isSuperAdmin } = useAuth();
 * {canEdit && <button>Edit</button>}
 * ```
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

/**
 * Helper function để check permission (dùng khi không có access đến React context)
 * ⚠️ Lưu ý: Chỉ dùng cho non-React code (utils, API helpers)
 * ✅ Trong React components, nên dùng useAuth() hook
 */
export function getRolesFromToken(): string[] {
  try {
    const token = getAuthToken();
    if (!token) {
      // Fallback localStorage
      try {
        const rolesStr = localStorage.getItem('roles') || sessionStorage.getItem('roles');
        if (rolesStr) {
          return JSON.parse(rolesStr).map(normalizeRole);
        }
      } catch {
        // Ignore
      }
      return [];
    }

    const decoded: any = safeJwtDecode(token);
    const rawRoles = decoded.roles || decoded.authorities || decoded.role || [];
    const roles = Array.isArray(rawRoles)
      ? rawRoles.map(normalizeRole).filter(Boolean)
      : [];

    // Sync với localStorage
    if (roles.length > 0) {
      const storage = localStorage.getItem('access_token') ? localStorage : sessionStorage;
      try {
        storage.setItem('roles', JSON.stringify(roles));
      } catch {
        // Ignore
      }
    }

    return roles;
  } catch (e) {
    console.error('Error getting roles from token:', e);
    // Fallback localStorage
    try {
      const rolesStr = localStorage.getItem('roles') || sessionStorage.getItem('roles');
      if (rolesStr) {
        return JSON.parse(rolesStr).map(normalizeRole);
      }
    } catch {
      // Ignore
    }
    return [];
  }
}

/**
 * Helper functions để check permissions (dùng khi không có access đến React context)
 * ⚠️ Lưu ý: Trong React components, nên dùng useAuth() hook
 */
export function isSuperAdmin(): boolean {
  const roles = getRolesFromToken();
  return roles.some((r: string) => 
    r === 'SUPERADMIN' || r === 'SUPER_ADMIN' || r === 'SUPER ADMIN'
  );
}

export function isAdmin(): boolean {
  const roles = getRolesFromToken();
  return roles.some((r: string) => 
    r === 'ADMIN' || r === 'SUPERADMIN' || r === 'SUPER_ADMIN' || r === 'SUPER ADMIN'
  );
}

export function canEdit(): boolean {
  return isAdmin();
}

export function canDelete(): boolean {
  return isAdmin();
}

export function canCreate(): boolean {
  return isAdmin();
}
