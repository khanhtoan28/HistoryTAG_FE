import api, { getAuthToken } from './client';

// ✅ Helper để check xem user có phải SUPERADMIN không
function isSuperAdmin(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (window.location.pathname.startsWith('/superadmin')) return true;
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

function getBase(method: string = 'GET', canManage: boolean = false) {
  // ✅ GET requests: luôn dùng admin API (admin thường có thể xem)
  if (method === 'GET') {
    return '/api/v1/admin';
  }
  // ✅ Write operations (POST, PUT, DELETE): chỉ dùng superadmin API nếu canManage = true
  if (canManage && (method === 'POST' || method === 'PUT' || method === 'DELETE')) {
    // Double check: chỉ dùng superadmin API nếu thực sự là superadmin
    if (isSuperAdmin()) {
      return '/api/v1/superadmin';
    }
  }
  // Fallback: dùng admin API
  return '/api/v1/admin';
}

// =======================================================
// TYPES
// =======================================================

export type HospitalContactResponseDTO = {
  id: number;
  name: string;
  role: string;
  roleType: "it" | "accountant" | "nurse";
  phone?: string | null;
  email?: string | null;
  hospitalId: number;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type HospitalContactRequestDTO = {
  name: string;
  role: string;
  roleType: "it" | "accountant" | "nurse";
  phone?: string | null;
  email?: string | null;
};

// =======================================================
// CRUD APIs
// =======================================================

/**
 * Lấy danh sách contacts của một hospital
 */
export async function getHospitalContacts(hospitalId: number): Promise<HospitalContactResponseDTO[]> {
  const base = getBase('GET', false);
  const res = await api.get(`${base}/hospitals/${hospitalId}/contacts`);
  return Array.isArray(res.data) ? res.data : [];
}

/**
 * Tạo contact mới cho hospital
 */
export async function createHospitalContact(
  hospitalId: number,
  payload: HospitalContactRequestDTO,
  canManage: boolean = false
): Promise<HospitalContactResponseDTO> {
  const base = getBase('POST', canManage);
  const res = await api.post(`${base}/hospitals/${hospitalId}/contacts`, payload);
  return res.data;
}

/**
 * Cập nhật contact
 */
export async function updateHospitalContact(
  hospitalId: number,
  contactId: number,
  payload: HospitalContactRequestDTO,
  canManage: boolean = false
): Promise<HospitalContactResponseDTO> {
  const base = getBase('PUT', canManage);
  const res = await api.put(`${base}/hospitals/${hospitalId}/contacts/${contactId}`, payload);
  return res.data;
}

/**
 * Xóa contact
 */
export async function deleteHospitalContact(
  hospitalId: number,
  contactId: number,
  canManage: boolean = false
): Promise<void> {
  const base = getBase('DELETE', canManage);
  await api.delete(`${base}/hospitals/${hospitalId}/contacts/${contactId}`);
}

