import api from "./client";

// =======================================================
// USER MANAGEMENT
// =======================================================

export type UserResponseDTO = {
  id: number;
  username: string;
  email?: string | null;
  fullname?: string | null;
  status?: boolean;
  phone?: string | null;
  avatar?: string | null;
  address?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  department?: string | null;
  team?: string | null;
  roles?: { roleId: number; roleName: string }[];
};

export type SuperAdminUserCreateDTO = {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
  address: string;
  phoneNumber?: string;
  department: string;
  team?: string;
  roles: string[];
};

export type UserUpdateRequestDTO = {
  fullname?: string;
  phone?: string;
  address?: string;
  email?: string;
  avatar?: File | null;
  assignedHospitalIds?: number[];
  workStatus?: string;
  department?: "IT" | "ACCOUNTING" | null;
  team?: "DEV" | "DEPLOYMENT" | "MAINTENANCE" | null;
  roles?: string[];
};

// User Management APIs
export async function getAllUsers(params: {
  page?: number;
  size?: number;
  sortBy?: string;
  sortDir?: string;
}) {
  const { data } = await api.get("/api/v1/superadmin/users", { params });
  return data;
}

export async function getUserById(id: number) {
  const { data } = await api.get<UserResponseDTO>(`/api/v1/superadmin/users/${id}`);
  return data;
}

export async function createUser(payload: SuperAdminUserCreateDTO) {
  const url = `/api/v1/superadmin/users`;
  
  // Backend expects JSON for create (no file upload support in create endpoint)
  const { data } = await api.post<UserResponseDTO>(url, payload, {
    headers: { "Content-Type": "application/json" },
  });
  return data;
}

export async function updateUser(id: number, payload: UserUpdateRequestDTO) {
  const url = `/api/v1/superadmin/users/${id}`;
  // Backend update endpoint requires multipart/form-data always
  const formData = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (value === null || value === undefined) return;

    if (Array.isArray(value)) {
      value.forEach((v) => formData.append(key, String(v)));
      return;
    }

    if (value instanceof File) {
      formData.append(key, value as File);
      return;
    }

    formData.append(key, String(value));
  });

  const { data } = await api.put<UserResponseDTO>(url, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function deleteUser(id: number) {
  const { data } = await api.delete(`/api/v1/superadmin/users/${id}`);
  return data;
}

export async function filterUsers(params: {
  fullName?: string;
  status?: boolean;
  fromDate?: string;
  toDate?: string;
}) {
  const { data } = await api.get<UserResponseDTO[]>("/api/v1/superadmin/users/filter", { params });
  return data;
}

export async function lockUser(id: number) {
  const { data } = await api.put(`/api/v1/superadmin/users/${id}/lock`);
  return data;
}

export async function unlockUser(id: number) {
  const { data } = await api.put(`/api/v1/superadmin/users/${id}/unlock`);
  return data;
}

export type SuperAdminSummaryDTO = {
  totalUsers: number;
  totalHospitals: number;
  totalHisSystems: number;
  totalHardware: number;
  totalAgencies: number;
};

export async function getSummaryReport() {
  const { data } = await api.get<SuperAdminSummaryDTO>(`/api/v1/superadmin/reports/summary`);
  return data;
}

// Export all as default
export default {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  filterUsers,
  lockUser,
  unlockUser,
};

// =======================================================
// HARDWARE MANAGEMENT (SUPER ADMIN)
// =======================================================

export type HardwareResponseDTO = {
  id: number;
  name: string;
  type?: string | null;
  imageUrl?: string | null;
  notes?: string | null;
  supplier?: string | null;
  warrantyPeriod?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type HardwareRequestDTO = {
  name: string;
  type?: string | null;
  imageFile?: File | null;
  notes?: string | null;
  supplier?: string | null;
  warrantyPeriod?: string | null;
};

export type HardwareUpdateRequestDTO = Partial<HardwareRequestDTO>;

export async function getAllHardware(params: {
  search?: string;
  type?: string;
  page?: number;
  size?: number;
  sortBy?: string;
  sortDir?: "asc" | "desc";
}) {
  const { data } = await api.get("/api/v1/superadmin/hardware", { params });
  return data as { content: HardwareResponseDTO[]; totalElements: number } | HardwareResponseDTO[];
}

export async function getHardwareById(id: number) {
  const { data } = await api.get<HardwareResponseDTO>(`/api/v1/superadmin/hardware/${id}`);
  return data;
}

export async function createHardware(payload: HardwareRequestDTO) {
  const form = new FormData();
  Object.entries(payload).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    if (v instanceof File) {
      form.append(k, v);
    } else {
      form.append(k, String(v));
    }
  });
  const { data } = await api.post<HardwareResponseDTO>("/api/v1/superadmin/hardware", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function updateHardware(id: number, payload: HardwareUpdateRequestDTO) {
  const form = new FormData();
  Object.entries(payload).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    if (v instanceof File) {
      form.append(k, v);
    } else {
      form.append(k, String(v));
    }
  });
  const { data } = await api.put<HardwareResponseDTO>(`/api/v1/superadmin/hardware/${id}`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function deleteHardware(id: number) {
  const { data } = await api.delete(`/api/v1/superadmin/hardware/${id}`);
  return data;
}

export const HardwareAPI = {
  getAllHardware,
  getHardwareById,
  createHardware,
  updateHardware,
  deleteHardware,
};

