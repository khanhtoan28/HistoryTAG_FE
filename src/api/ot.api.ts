import api from "./client";

export type OTPeriodDTO = {
  year: number;
  month: number;
  label: string;
};

export type OTSummaryResponseDTO = {
  pendingCount: number;
  approvedCount: number;
  totalMinutes: number;
  totalHours: number;
  weekdayMinutes?: number;
  weekdayHours?: number;
  offdayMinutes?: number;
  offdayHours?: number;
};

export type OTEntryResponseDTO = {
  id?: number;
  date: string;
  start: string;
  end: string;
  durationMinutes?: number;
  hours: number;
  otType?: "weekday" | "offday";
  desc: string;
};

export type OTSuperAdminListItemDTO = {
  id: number;
  name: string;
  empId: string;
  dept: string;
  role?: string;
  hours: number;
  totalMinutes?: number;
  weekdayMinutes?: number;
  weekdayHours?: number;
  offdayMinutes?: number;
  offdayHours?: number;
  submitDate: string;
  status: string;
  avatar: string;
  otId?: string;
  period?: OTPeriodDTO;
};

export type OTPaginationDTO = {
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
};

export type OTSuperAdminListResponseDTO = {
  data: OTSuperAdminListItemDTO[];
  pagination: OTPaginationDTO;
};

export type OTSuperAdminRequestDetailResponseDTO = {
  id: number;
  name: string;
  empId: string;
  dept: string;
  role?: string;
  hours: number;
  totalMinutes?: number;
  submitDate: string;
  status: string;
  avatar: string;
  otId?: string;
  period?: OTPeriodDTO;
  dailyEntries?: OTEntryResponseDTO[];
  monthlyNotes?: string;
};

export type OTReviewActionResponseDTO = {
  requestId: number;
  status: string;
  reviewedAt?: string;
};

export type OTBulkApproveRequestDTO = {
  requestIds: number[];
  note?: string;
};

export type OTBulkApproveFailedItemDTO = {
  id: number;
  reason: string;
};

export type OTBulkApproveResponseDTO = {
  approved: number[];
  failed: OTBulkApproveFailedItemDTO[];
  summary: {
    totalRequested: number;
    approvedCount: number;
    failedCount: number;
  };
};

export type OTExportJobCreateResponseDTO = {
  jobId: number;
  status: string;
  format: string;
  createdAt: string;
};

export type OTExportJobStatusResponseDTO = {
  jobId: number;
  requestId?: number;
  status: "pending" | "processing" | "completed" | "failed";
  format: string;
  errorMessage?: string;
  downloadUrl?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type OTAdminRequestDetailResponseDTO = {
  id: number;
  otId?: string;
  period?: OTPeriodDTO;
  status: string;
  totalMinutes?: number;
  hours: number;
  monthlyNotes?: string;
  rejectReason?: string;
  entries: OTEntryResponseDTO[];
};

export type OTEntryUpsertRequestDTO = {
  date: string;
  start: string;
  end: string;
  otType: "weekday" | "offday";
  desc: string;
};

export type OTSubmitResponseDTO = {
  requestId: number;
  status: string;
  submittedAt?: string;
};

export async function getSuperAdminOTSummary(year: number, month: number) {
  const { data } = await api.get<OTSummaryResponseDTO>("/api/v1/superadmin/ot/summary", {
    params: { year, month },
  });
  return data;
}

export async function getSuperAdminOTRequests(params: {
  year: number;
  month: number;
  department?: string;
  search?: string;
  status?: string;
  page?: number;
  size?: number;
}) {
  const { data } = await api.get<OTSuperAdminListResponseDTO>("/api/v1/superadmin/ot/requests", { params });
  return data;
}

export async function getSuperAdminOTRequestDetail(requestId: number) {
  const { data } = await api.get<OTSuperAdminRequestDetailResponseDTO>(`/api/v1/superadmin/ot/requests/${requestId}`);
  return data;
}

export async function approveSuperAdminOTRequest(requestId: number, note?: string) {
  const payload = note?.trim() ? { note: note.trim() } : {};
  const { data } = await api.post<OTReviewActionResponseDTO>(`/api/v1/superadmin/ot/requests/${requestId}/approve`, payload);
  return data;
}

export async function rejectSuperAdminOTRequest(requestId: number, reason: string) {
  const { data } = await api.post<OTReviewActionResponseDTO>(`/api/v1/superadmin/ot/requests/${requestId}/reject`, {
    reason: reason.trim(),
  });
  return data;
}

export async function bulkApproveSuperAdminOTRequests(requestIds: number[], note?: string) {
  const { data } = await api.post<OTBulkApproveResponseDTO>("/api/v1/superadmin/ot/requests/bulk-approve", {
    requestIds,
    note: note?.trim() || undefined,
  });
  return data;
}

export async function createOTExportJob(requestId: number, format: "csv" = "csv") {
  const { data } = await api.post<OTExportJobCreateResponseDTO>(`/api/v1/superadmin/ot/requests/${requestId}/exports`, {
    format,
  });
  return data;
}

export async function getOTExportJobStatus(jobId: number) {
  const { data } = await api.get<OTExportJobStatusResponseDTO>(`/api/v1/superadmin/ot/exports/${jobId}`);
  return data;
}

export async function downloadOTExportFile(jobId: number) {
  return api.get<Blob>(`/api/v1/superadmin/ot/exports/${jobId}/download`, {
    responseType: "blob",
  });
}

export async function exportPeriodToExcel(year: number, month: number) {
  return api.get<Blob>("/api/v1/superadmin/ot/exports/period", {
    params: { year, month },
    responseType: "blob",
  });
}

export async function getAdminOTRequestByPeriod(year: number, month: number) {
  const { data } = await api.get<OTAdminRequestDetailResponseDTO>("/api/v1/admin/ot/requests/by-period", {
    params: { year, month },
  });
  return data;
}

export async function updateAdminOTMonthlyNotes(requestId: number, monthlyNotes: string) {
  const { data } = await api.patch<OTAdminRequestDetailResponseDTO>(`/api/v1/admin/ot/requests/${requestId}/notes`, {
    monthlyNotes,
  });
  return data;
}

export async function createAdminOTEntry(requestId: number, payload: OTEntryUpsertRequestDTO) {
  const { data } = await api.post<OTEntryResponseDTO>(`/api/v1/admin/ot/requests/${requestId}/entries`, payload);
  return data;
}

export async function updateAdminOTEntry(entryId: number, payload: OTEntryUpsertRequestDTO) {
  const { data } = await api.put<OTEntryResponseDTO>(`/api/v1/admin/ot/entries/${entryId}`, payload);
  return data;
}

export async function deleteAdminOTEntry(entryId: number) {
  const { data } = await api.delete(`/api/v1/admin/ot/entries/${entryId}`);
  return data;
}

export async function submitAdminOTRequest(requestId: number) {
  const { data } = await api.post<OTSubmitResponseDTO>(`/api/v1/admin/ot/requests/${requestId}/submit`);
  return data;
}
