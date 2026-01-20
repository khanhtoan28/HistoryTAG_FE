import api, { getAuthToken } from './client';
import { isSuperAdmin as isSuperAdminPermission } from '../utils/permission';

// ✅ Helper để check xem user có phải SUPERADMIN không (từ JWT token - source of truth)
function isSuperAdmin(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (window.location.pathname.startsWith('/superadmin')) return true;
    return isSuperAdminPermission();
  } catch {
    return false;
  }
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

export type TicketResponseDTO = {
  id: number;
  ticketCode: string;
  issue: string;
  priority: "Cao" | "Trung bình" | "Thấp";
  status: "CHUA_XU_LY" | "DANG_XU_LY" | "HOAN_THANH";
  ticketType?: "MAINTENANCE" | "DEPLOYMENT";
  pic: string | null;
  picUserId: number | null;
  hospitalId: number;
  createdAt: string | null;
  updatedAt: string | null;
};

export type TicketRequestDTO = {
  issue: string;
  priority: "Cao" | "Trung bình" | "Thấp";
  status: "CHUA_XU_LY" | "DANG_XU_LY" | "HOAN_THANH";
  ticketType?: "MAINTENANCE" | "DEPLOYMENT";
  picUserId?: number | null;
  picName?: string | null;
};

// =======================================================
// CRUD APIs
// =======================================================

/**
 * Lấy danh sách tickets của một hospital
 */
export async function getHospitalTickets(hospitalId: number): Promise<TicketResponseDTO[]> {
  const base = getBase('GET', false);
  const res = await api.get(`${base}/hospitals/${hospitalId}/tickets`);
  return Array.isArray(res.data) ? res.data : [];
}

/**
 * Tạo ticket mới cho hospital
 */
export async function createHospitalTicket(
  hospitalId: number,
  payload: TicketRequestDTO,
  canManage: boolean = false
): Promise<TicketResponseDTO> {
  const base = getBase('POST', canManage);
  const res = await api.post(`${base}/hospitals/${hospitalId}/tickets`, payload);
  return res.data;
}

/**
 * Cập nhật ticket
 */
export async function updateHospitalTicket(
  hospitalId: number,
  ticketId: number,
  payload: TicketRequestDTO,
  canManage: boolean = false
): Promise<TicketResponseDTO> {
  const base = getBase('PUT', canManage);
  const res = await api.put(`${base}/hospitals/${hospitalId}/tickets/${ticketId}`, payload);
  return res.data;
}

/**
 * Xóa ticket
 */
export async function deleteHospitalTicket(
  hospitalId: number,
  ticketId: number,
  canManage: boolean = false
): Promise<void> {
  const base = getBase('DELETE', canManage);
  await api.delete(`${base}/hospitals/${hospitalId}/tickets/${ticketId}`);
}
