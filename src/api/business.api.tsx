import api, { getAuthToken } from './client';

export async function searchHardware(q = '') {
  // ✅ GET request: luôn dùng admin API
  const base = getBase('GET', false);
  try {
    const res = await api.get(`${base}/hardware/search?search=${encodeURIComponent(q)}`);
    const data = res.data;
    // Normalize possible shapes: either an array of EntitySelectDTO or a Page object with content
    if (Array.isArray(data)) return data;
    if (data && Array.isArray((data as { content?: unknown[] }).content)) {
      const content = (data as { content?: unknown[] }).content as Record<string, unknown>[];
      return content.map((h) => {
        const hh = h as Record<string, unknown>;
        const id = hh['id'] as number | string | undefined;
        const name = hh['name'] ?? hh['label'] ?? id;
        const type = hh['type'] ?? hh['subLabel'] ?? '';
        return { id: Number(String(id ?? '0')), label: String(name ?? ''), subLabel: String(type ?? '') };
      });
    }
    return [];
  } catch (err) {
    // admin API failed — do not call superadmin endpoints from admin UI
    console.error('searchHardware admin API failed', err);
    return [];
  }
}

export async function searchHospitals(q = '') {
  // ✅ GET request: luôn dùng admin API
  const base = getBase('GET', false);
  try {
    const res = await api.get(`${base}/hospitals/search?name=${encodeURIComponent(q)}`);
    return res.data; // expects array of { id, label }
  } catch (err) {
    console.error('searchHospitals admin API failed', err);
    return [];
  }
}

// ✅ Helper để check xem user có phải SUPERADMIN không
function isSuperAdmin(): boolean {
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

export async function createBusiness(payload: Record<string, unknown>, canManage: boolean = false) {
  const base = getBase('POST', canManage);
  const res = await api.post(`${base}/business`, payload);
  return res.data;
}

export async function updateBusiness(id: number, payload: Record<string, unknown>, canManage: boolean = false) {
  const base = getBase('PUT', canManage);
  const res = await api.put(`${base}/business/${id}`, payload);
  return res.data;
}

export async function getBusinesses(params = {}) {
  // ✅ GET request: luôn dùng admin API
  const base = getBase('GET', false);
  const query = new URLSearchParams();
  Object.entries(params as Record<string, unknown>).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (typeof value === 'string' && value.trim() === '') return;
    query.append(key, String(value));
  });
  const qs = query.toString();
  const url = qs ? `${base}/business?${qs}` : `${base}/business`;
  console.debug('[Business API] GET', url);
  const res = await api.get(url);
  return res.data;
}

export async function getBusinessById(id: number) {
  // ✅ GET request: luôn dùng admin API
  const base = getBase('GET', false);
  const res = await api.get(`${base}/business/${id}`);
  return res.data;
}

export async function getHardwareById(id: number) {
  // ✅ GET request: luôn dùng admin API
  const base = getBase('GET', false);
  try {
    const res = await api.get(`${base}/hardware/${id}`);
    return res.data;
  } catch (err) {
    console.error('getHardwareById admin API failed', err);
    // do not fallback to superadmin from admin UI
    throw err;
  }
}

export async function deleteBusiness(id: number, canManage: boolean = false) {
  const base = getBase('DELETE', canManage);
  const res = await api.delete(`${base}/business/${id}`);
  return res.data;
}

export async function getBusinessPicOptions() {
  // ✅ GET request: luôn dùng admin API
  const base = getBase('GET', false);
  const res = await api.get(`${base}/business/pic-options`);
  return res.data;
}

export async function getMonthlySalesStats(year?: number) {
  // ✅ GET request: luôn dùng admin API
  const base = getBase('GET', false);
  const query = year ? `?year=${year}` : '';
  const res = await api.get(`${base}/business/monthly-stats${query}`);
  return res.data;
}
