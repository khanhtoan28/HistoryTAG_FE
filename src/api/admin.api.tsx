import api from "./client";

// =======================================================
// IMPLEMENTATION TASKS (Triển khai)
// =======================================================

export type ImplementationTaskResponseDTO = {
  id: number;
  name: string;
  hospitalId: number | null;
  hospitalName?: string | null;
  picDeploymentId: number | null;
  picDeploymentName?: string | null;
  picDeploymentIds?: number[] | null;
  picDeploymentNames?: string[] | null;
  quantity?: number | null;
  agencyId?: number | null;
  hisSystemId?: number | null;
  hardwareId?: number | null;
  endDate?: string | null;
  additionalRequest?: string | null;
  apiUrl?: string | null;
  deadline?: string | null;
  completionDate?: string | null;
  apiTestStatus?: string | null;
  bhytPortCheckInfo?: string | null;
  status?: string | null;
  startDate?: string | null;
  acceptanceDate?: string | null;
  team?: "DEPLOYMENT" | string;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type ImplementationTaskRequestDTO = {
  name: string;
  hospitalId: number;
  picDeploymentId: number;
  picDeploymentIds?: number[] | null;
  agencyId?: number | null;
  hisSystemId?: number | null;
  hardwareId?: number | null;
  quantity?: number | null;
  apiTestStatus?: string | null;
  bhytPortCheckInfo?: string | null;
  additionalRequest?: string | null;
  apiUrl?: string | null;
  deadline?: string | null;
  completionDate?: string | null;
  status?: string | null;
  startDate?: string | null;
  acceptanceDate?: string | null;
};

export type ImplementationTaskUpdateDTO = Partial<ImplementationTaskRequestDTO>;

// Implementation Tasks APIs
export async function getAllImplementationTasks(params: {
  search?: string;
  status?: string;
  page?: number;
  size?: number;
  sortBy?: string;
  sortDir?: string;
}) {
  const { data } = await api.get("/api/v1/admin/implementation/tasks", { params });
  return data;
}

export async function getImplementationTaskById(id: number) {
  const { data } = await api.get<ImplementationTaskResponseDTO>(`/api/v1/admin/implementation/tasks/${id}`);
  return data;
}

export async function createImplementationTask(payload: ImplementationTaskRequestDTO) {
  const { data } = await api.post<ImplementationTaskResponseDTO>("/api/v1/admin/implementation/tasks", payload);
  return data;
}

export async function updateImplementationTask(id: number, payload: ImplementationTaskUpdateDTO) {
  const { data } = await api.put<ImplementationTaskResponseDTO>(`/api/v1/admin/implementation/tasks/${id}`, payload);
  return data;
}

export async function deleteImplementationTask(id: number) {
  const { data } = await api.delete(`/api/v1/admin/implementation/tasks/${id}`);
  return data;
}

export async function searchImplementationTasks(params: { search?: string; status?: string }) {
  const { data } = await api.get<ImplementationTaskResponseDTO[]>("/api/v1/admin/implementation/tasks/search", { params });
  return data;
}

// =======================================================
// DEV TASKS
// =======================================================

export type DevTaskResponseDTO = {
  id: number;
  name: string;
  hospitalId: number | null;
  hospitalName?: string | null;
  picDeploymentId: number | null;
  picDeploymentName?: string | null;
  agencyId?: number | null;
  hisSystemId?: number | null;
  hardwareId?: number | null;
  quantity?: number | null;
  additionalRequest?: string | null;
  apiUrl?: string | null;
  deadline?: string | null;
  completionDate?: string | null;
  apiTestStatus?: string | null;
  bhytPortCheckInfo?: string | null;
  status?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  acceptanceDate?: string | null;
  team?: "DEV" | string;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type DevTaskRequestDTO = {
  name: string;
  hospitalId: number;
  picDeploymentId: number;
  agencyId?: number | null;
  hisSystemId?: number | null;
  hardwareId?: number | null;
  quantity?: number | null;
  apiTestStatus?: string | null;
  bhytPortCheckInfo?: string | null;
  additionalRequest?: string | null;
  apiUrl?: string | null;
  deadline?: string | null;
  completionDate?: string | null;
  endDate?: string | null;
  status?: string | null;
  startDate?: string | null;
  acceptanceDate?: string | null;
};

export type DevTaskUpdateDTO = Partial<DevTaskRequestDTO>;

// Dev Tasks APIs
export async function getAllDevTasks(params: {
  search?: string;
  status?: string;
  page?: number;
  size?: number;
  sortBy?: string;
  sortDir?: string;
}) {
  const { data } = await api.get("/api/v1/admin/dev/tasks", { params });
  return data;
}

export async function getDevTaskById(id: number) {
  const { data } = await api.get<DevTaskResponseDTO>(`/api/v1/admin/dev/tasks/${id}`);
  return data;
}

export async function createDevTask(payload: DevTaskRequestDTO) {
  const { data } = await api.post<DevTaskResponseDTO>("/api/v1/admin/dev/tasks", payload);
  return data;
}

export async function updateDevTask(id: number, payload: DevTaskUpdateDTO) {
  const { data } = await api.put<DevTaskResponseDTO>(`/api/v1/admin/dev/tasks/${id}`, payload);
  return data;
}

export async function deleteDevTask(id: number) {
  const { data } = await api.delete(`/api/v1/admin/dev/tasks/${id}`);
  return data;
}

export async function searchDevTasks(params: { search?: string; status?: string }) {
  const { data } = await api.get<DevTaskResponseDTO[]>("/api/v1/admin/dev/tasks/search", { params });
  return data;
}

// =======================================================
// MAINTENANCE TASKS
// =======================================================

export type MaintenanceTaskResponseDTO = {
  id: number;
  name: string;
  hospitalId: number | null;
  hospitalName?: string | null;
  picDeploymentId: number | null;
  picDeploymentName?: string | null;
  agencyId?: number | null;
  hisSystemId?: number | null;
  hardwareId?: number | null;
  quantity?: number | null;
  additionalRequest?: string | null;
  apiUrl?: string | null;
  deadline?: string | null;
  completionDate?: string | null;
  apiTestStatus?: string | null;
  bhytPortCheckInfo?: string | null;
  status?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  acceptanceDate?: string | null;
  maintenanceNotes?: string | null;
  lastMaintenanceDate?: string | null;
  team?: "MAINTENANCE" | string;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type MaintenanceTaskRequestDTO = {
  name: string;
  hospitalId: number;
  picDeploymentId: number;
  agencyId?: number | null;
  hisSystemId?: number | null;
  hardwareId?: number | null;
  quantity?: number | null;
  apiTestStatus?: string | null;
  bhytPortCheckInfo?: string | null;
  additionalRequest?: string | null;
  apiUrl?: string | null;
  deadline?: string | null;
  completionDate?: string | null;
  maintenanceNotes?: string | null;
  lastMaintenanceDate?: string | null;
  status?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  acceptanceDate?: string | null;
};

export type MaintenanceTaskUpdateDTO = Partial<MaintenanceTaskRequestDTO>;

// Maintenance Tasks APIs
export async function getAllMaintenanceTasks(params: {
  search?: string;
  status?: string;
  page?: number;
  size?: number;
  sortBy?: string;
  sortDir?: string;
}) {
  const { data } = await api.get("/api/v1/admin/maintenance/tasks", { params });
  return data;
}

export async function getMaintenanceTaskById(id: number) {
  const { data } = await api.get<MaintenanceTaskResponseDTO>(`/api/v1/admin/maintenance/tasks/${id}`);
  return data;
}

export async function createMaintenanceTask(payload: MaintenanceTaskRequestDTO) {
  const { data } = await api.post<MaintenanceTaskResponseDTO>("/api/v1/admin/maintenance/tasks", payload);
  return data;
}

export async function updateMaintenanceTask(id: number, payload: MaintenanceTaskUpdateDTO) {
  const { data } = await api.put<MaintenanceTaskResponseDTO>(`/api/v1/admin/maintenance/tasks/${id}`, payload);
  return data;
}

export async function deleteMaintenanceTask(id: number) {
  const { data } = await api.delete(`/api/v1/admin/maintenance/tasks/${id}`);
  return data;
}

export async function searchMaintenanceTasks(params: { search?: string; status?: string }) {
  const { data } = await api.get<MaintenanceTaskResponseDTO[]>("/api/v1/admin/maintenance/tasks/search", { params });
  return data;
}

