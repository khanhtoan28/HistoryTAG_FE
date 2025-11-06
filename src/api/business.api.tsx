import api, { getAuthToken } from './client';

export async function searchHardware(q = '') {
  const res = await api.get(`/api/v1/superadmin/hardware/search?search=${encodeURIComponent(q)}`);
  return res.data; // expects array of { id, label, subLabel }
}

export async function searchHospitals(q = '') {
  const base = getBase();
  try {
    const res = await api.get(`${base}/hospitals/search?name=${encodeURIComponent(q)}`);
    return res.data; // expects array of { id, label }
  } catch {
    // fallback to superadmin path if base failed
    try {
      const res = await api.get(`/api/v1/superadmin/hospitals/search?name=${encodeURIComponent(q)}`);
      return res.data;
    } catch (e) {
      return [];
    }
  }
}

function getBase() {
  if (typeof window === 'undefined') return '/api/v1/admin';
  try {
    // prefer pathname detection
    if (window.location.pathname.startsWith('/superadmin')) return '/api/v1/superadmin';
    // fallback: if roles contain SUPERADMIN
    const roles = JSON.parse(localStorage.getItem('roles') || '[]');
    if (Array.isArray(roles) && roles.some((r: unknown) => {
      if (typeof r === 'string') return r.toUpperCase() === 'SUPERADMIN';
      if (r && typeof r === 'object') {
        const rr = r as Record<string, unknown>;
        const rn = rr.roleName ?? rr.role_name ?? rr.role;
        return typeof rn === 'string' && rn.toUpperCase() === 'SUPERADMIN';
      }
      return false;
    })) {
      return '/api/v1/superadmin';
    }
    // fallback 2: try to decode JWT token and inspect claims for roles/authorities
    const token = getAuthToken();
    if (token) {
      try {
        const parts = token.split('.');
        if (parts.length >= 2) {
          const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
          const maybeRoles = payload.roles || payload.authorities || payload.role || payload.realm_access && payload.realm_access.roles;
          if (Array.isArray(maybeRoles) && maybeRoles.some((r: unknown) => typeof r === 'string' && (r as string).toUpperCase() === 'SUPERADMIN')) {
            return '/api/v1/superadmin';
          }
        }
      } catch {
        // ignore decode errors
      }
    }
  } catch {
    // ignore
  }
  return '/api/v1/admin';
}

export async function createBusiness(payload: Record<string, unknown>) {
  const base = getBase();
  const res = await api.post(`${base}/business`, payload);
  return res.data;
}

export async function updateBusiness(id: number, payload: Record<string, unknown>) {
  const base = getBase();
  const res = await api.put(`${base}/business/${id}`, payload);
  return res.data;
}

export async function getBusinesses(params = {}) {
  const base = getBase();
  const res = await api.get(`${base}/business`, { params });
  return res.data;
}

export async function getBusinessById(id: number) {
  const base = getBase();
  const res = await api.get(`${base}/business/${id}`);
  return res.data;
}

export async function deleteBusiness(id: number) {
  const base = getBase();
  const res = await api.delete(`${base}/business/${id}`);
  return res.data;
}
