import api from "./client";

export type HospitalMapPointDTO = {
  hospitalId: number;
  hospitalCode?: string | null;
  hospitalName: string;
  address?: string | null;
  province?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  projectStatus?: string | null;
  projectStatusDisplayName?: string | null;
};

export async function getHospitalMapPoints(): Promise<HospitalMapPointDTO[]> {
  const { data } = await api.get<HospitalMapPointDTO[]>("/api/v1/auth/hospitals/map-points");
  return data;
}

export async function getHospitalMapPointsByProvince(
  province?: string,
): Promise<HospitalMapPointDTO[]> {
  // When province is provided, backend only geocodes that province -> much faster.
  const { data } = await api.get<HospitalMapPointDTO[]>("/api/v1/auth/hospitals/map-points", {
    params: province ? { province } : {},
  });
  return data;
}

