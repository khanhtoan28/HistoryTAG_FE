import api from "./client";

/** ====== TYPES khớp BE hiện tại ====== */
export type LoginPayload = { username: string; password: string };

export type RegisterPayload = {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
  address: string;
  phoneNumber?: string;
};

// BE trả roles có thể là Set<Role> hoặc list string
export type RoleLike =
  | string
  | { roleId?: number; roleName: string }
  | { roleName: string };

export type LoginResponse = {
  userId: number;
  username: string;
  typeToken: string;   // ví dụ "Bearer Token"
  accessToken: string; // JWT
  roles: RoleLike[];
};

/** ====== CALLS ====== */
export const signIn = (data: LoginPayload) =>
  api.post<LoginResponse>("/api/v1/public/sign-in", data);

export const signUp = (data: RegisterPayload) =>
  api.post("/api/v1/public/sign-up", data);

/** Normalize roles -> mảng string */
export const normalizeRoles = (roles: RoleLike[] = []) =>
  roles.map((r) => (typeof r === "string" ? r : r.roleName));

/** Helper bóc lỗi từ DataError(code, data) của BE */
export const pickErrMsg = (err: any): string => {
  const data = err?.response?.data;
  if (!data) return "Đã xảy ra lỗi";
  // Nếu data = { code: 400, data: "string message" }
  if (typeof data.data === "string") return data.data;
  // Nếu data = { code: 400, data: { field: message } }
  if (data.data && typeof data.data === "object") {
    const first = Object.values(data.data)[0];
    if (typeof first === "string") return first;
  }
  // Nếu BE trả message/error
  return data.message || data.error || "Yêu cầu không hợp lệ";
};

export const pickFieldErrors = (err: any): Record<string, string> => {
  const d = err?.response?.data;
  if (d?.data && typeof d.data === "object") return d.data as Record<string,string>;
  return {};
};
