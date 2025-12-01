import api, { getAuthToken } from './client';
import { getAllUsers } from './superadmin.api';

function getBase() {
  if (typeof window === 'undefined') return '/api/v1/admin';
  try {
    if (window.location.pathname.startsWith('/superadmin')) return '/api/v1/superadmin';
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
        // ignore
      }
    }
  } catch {
    // ignore
  }
  return '/api/v1/admin';
}

export type WarrantyContractResponseDTO = {
  id: number;
  contractCode: string;
  picUser?: { id: number; label: string; subLabel?: string; phone?: string | null } | null;
  hospital?: { id: number; label: string } | null;
  durationYears: number;
  yearlyPrice: number;
  totalPrice: number;
  startDate: string;
  endDate: string;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type WarrantyContractRequestDTO = {
  contractCode: string;
  picUserId: number;
  hospitalId: number;
  durationYears: number; // 1, 2, hoặc 3
  yearlyPrice: number;
  startDate?: string | null;
};

export async function createWarrantyContract(payload: WarrantyContractRequestDTO) {
  const base = getBase();
  const res = await api.post(`${base}/warranty-contracts`, payload);
  return res.data;
}

export async function updateWarrantyContract(id: number, payload: WarrantyContractRequestDTO) {
  const base = getBase();
  const res = await api.put(`${base}/warranty-contracts/${id}`, payload);
  return res.data;
}

export async function deleteWarrantyContract(id: number) {
  const base = getBase();
  const res = await api.delete(`${base}/warranty-contracts/${id}`);
  return res.data;
}

export async function getWarrantyContractById(id: number): Promise<WarrantyContractResponseDTO> {
  const base = getBase();
  const res = await api.get(`${base}/warranty-contracts/${id}`);
  return res.data;
}

export async function getWarrantyContracts(params: {
  search?: string;
  hospitalId?: number;
  picUserId?: number;
  sortBy?: string;
  sortDir?: string;
  page?: number;
  size?: number;
} = {}) {
  const base = getBase();
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (typeof value === 'string' && value.trim() === '') return;
    query.append(key, String(value));
  });
  const qs = query.toString();
  const url = qs ? `${base}/warranty-contracts?${qs}` : `${base}/warranty-contracts`;
  const res = await api.get(url);
  return res.data;
}

// Helper để lấy danh sách người phụ trách (SUPERADMIN và phòng kinh doanh)
export async function getWarrantyPicOptions() {
  try {
    const base = getBase();
    
    // Lấy business users từ API business pic options
    let businessOptions: Array<{ id: number; label: string; subLabel?: string; phone?: string | null }> = [];
    try {
      const businessRes = await api.get(`${base}/business/pic-options`);
      const businessList = Array.isArray(businessRes.data) ? businessRes.data : [];
      businessOptions = businessList.map((item: any) => ({
        id: Number(item?.id ?? 0),
        label: String(item?.label ?? ''),
        subLabel: item?.subLabel ? String(item.subLabel) : undefined,
        phone: item?.phone ? String(item.phone).trim() : null,
      }));
    } catch (err) {
      console.warn('Failed to fetch business PIC options', err);
    }

    // Lấy tất cả users và filter SUPERADMIN
    let superAdminOptions: Array<{ id: number; label: string; subLabel?: string; phone?: string | null }> = [];
    try {
      const res = await getAllUsers({ page: 0, size: 200 });
      const content = Array.isArray(res?.content)
        ? res.content
        : Array.isArray(res)
        ? res
        : [];
      superAdminOptions = content
        .filter((user: any) => {
          const roles = user?.roles;
          if (!roles) return false;
          const roleArr = Array.isArray(roles) ? roles : [];
          return roleArr.some((r: any) => {
            if (!r) return false;
            if (typeof r === 'string') return r.toUpperCase() === 'SUPERADMIN';
            const roleName = r.roleName ?? r.role_name ?? r.role;
            return typeof roleName === 'string' && roleName.toUpperCase() === 'SUPERADMIN';
          });
        })
        .map((user: any) => ({
          id: Number(user?.id ?? 0),
          label: String(user?.fullname ?? user?.fullName ?? user?.username ?? user?.email ?? `User #${user?.id ?? ''}`),
          subLabel: user?.email ? String(user.email) : undefined,
          phone: user?.phone ? String(user.phone).trim() : null,
        }));
    } catch (err) {
      console.warn('Failed to fetch superadmin users for PIC options', err);
    }

    // Merge và loại bỏ trùng lặp
    const mergedMap = new Map<number, { id: number; label: string; subLabel?: string; phone?: string | null }>();
    [...businessOptions, ...superAdminOptions].forEach((opt) => {
      if (!opt || !opt.id) return;
      if (!opt.label || !opt.label.trim()) return;
      if (!mergedMap.has(opt.id)) {
        mergedMap.set(opt.id, { ...opt, label: opt.label.trim() });
      }
    });

    const merged = Array.from(mergedMap.values()).sort((a, b) =>
      a.label.localeCompare(b.label, 'vi', { sensitivity: 'base' })
    );

    return merged;
  } catch (err) {
    console.error('getWarrantyPicOptions failed', err);
    return [];
  }
}

