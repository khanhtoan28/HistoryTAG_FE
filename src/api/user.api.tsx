import api from "./client";

// Kiểu dữ liệu khớp UserResponseDTO BE
export type RoleDTO = { id: number; roleName: string } | { roleId: number; roleName: string };
export type HospitalDTO = { id: number; name: string; userIds?: number[] };

export type UserResponse = {
  id: number;
  username: string;
  email: string;
  fullname: string;
  status: boolean;
  phone?: string | null;
  avatar?: string | null;
  address: string;
  createdAt: string;
  updatedAt?: string | null;
  roles: RoleDTO[];
  assignedHospitals?: HospitalDTO[];
  workStatus?: string | null;
  department?: string | null;
  team?: string | null;
};

// ⚠️ Đổi path này nếu BE khác (tớ đoán theo service getUserAccount/updateUserAccount)
const ACCOUNT_BASE = "/api/v1/auth/account";

export const getMyAccount = (userId: number) =>
  api.get<UserResponse>(`${ACCOUNT_BASE}/${userId}`);

export type UpdateAccountPayload = {
  fullname?: string;
  phone?: string;
  address?: string;
  // avatar là file upload, để FormData
  avatarFile?: File | null;
  // gán hospital/enum nếu muốn sau này
  assignedHospitalIds?: number[];
  workStatus?: string;
};

// Dùng FormData vì có thể upload avatar
export const updateMyAccount = (userId: number, payload: UpdateAccountPayload) => {
  const fd = new FormData();
  if (payload.fullname) fd.append("fullname", payload.fullname);
  if (payload.phone) fd.append("phone", payload.phone);
  if (payload.address) fd.append("address", payload.address);
  if (payload.avatarFile) fd.append("avatar", payload.avatarFile);
  if (payload.assignedHospitalIds && payload.assignedHospitalIds.length) {
    payload.assignedHospitalIds.forEach((id) => fd.append("assignedHospitalIds", String(id)));
  }
  if (payload.workStatus) fd.append("workStatus", payload.workStatus);
  return api.put<UserResponse>(`${ACCOUNT_BASE}/${userId}`, fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};
