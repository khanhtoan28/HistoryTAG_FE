import api from "./client";

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

export type RoleLike =
  | string
  | { roleId?: number; roleName: string }
  | { roleName: string };

export type LoginResponse = {
  userId: number;
  username: string;
  typeToken: string;
  accessToken: string;
  roles: RoleLike[];
};

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

export type UserUpdateRequestDTO = {
  fullname?: string;
  phone?: string;
  address?: string;
  email?: string;
  avatar?: File | null;
  assignedHospitalIds?: number[];
  workStatus?: string | null;
  department?: "IT" | "ACCOUNTING" | null;
  team?: "DEV" | "DEPLOYMENT" | "MAINTENANCE" | null;
};

// ==========================
// 🔹 Lấy thông tin tài khoản
// ==========================
export async function getUserAccount(userId: number) {
  const { data } = await api.get<UserResponseDTO>(`/api/v1/auth/users/${userId}`);
  return data;
}

// =====================================
// 🔹 Cập nhật tài khoản (auto detect file)
// =====================================
export async function updateUserAccount(userId: number, payload: UserUpdateRequestDTO) {
  const url = `/api/v1/auth/users/${userId}`;
  const hasFile = payload.avatar instanceof File;

  // Nếu có file → gửi multipart/form-data
  if (hasFile) {
    const formData = new FormData();

    Object.entries(payload).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        if (Array.isArray(value)) {
          value.forEach((v) => formData.append(key, v.toString()));
        } else {
          formData.append(key, value as any);
        }
      }
    });

    const { data } = await api.put<UserResponseDTO>(url, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  }

  // Nếu không có file → gửi JSON thông thường
  const { data } = await api.put<UserResponseDTO>(url, payload, {
    headers: { "Content-Type": "application/json" },
  });
  return data;
}

// ==========================
// Cookie helpers
// ==========================
function setCookie(
  name: string,
  value: string,
  days = 7,
  sameSite: "Lax" | "None" = window.location.protocol === "https:" ? "None" : "Lax"
) {
  const d = new Date();
  d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
  const expires = `; Expires=${d.toUTCString()}`;
  const path = `; Path=/`;
  const secure = sameSite === "None" ? "; Secure" : "";
  const domain =
    window.location.hostname === "localhost"
      ? ""
      : `; Domain=${window.location.hostname}`;
  document.cookie = `${name}=${encodeURIComponent(
    value
  )}${expires}${path}${domain}; SameSite=${sameSite}${secure}`;
}

// ==========================
// Auth APIs
// ==========================
export const signIn = async (data: LoginPayload) => {
  const res = await api.post<LoginResponse>("/api/v1/public/sign-in", data);
  const payload = res.data;

  const token = payload?.accessToken;
  if (token) {
    localStorage.setItem("access_token", token);
    setCookie("access_token", token, 7);
  }

  // 👉 Lưu userId
  if (payload?.userId != null) {
    localStorage.setItem("userId", String(payload.userId));
  }

  localStorage.setItem("username", payload?.username ?? "");
  localStorage.setItem("roles", JSON.stringify(normalizeRoles(payload?.roles)));

  return payload;
};

export const signUp = (data: RegisterPayload) =>
  api.post("/api/v1/public/sign-up", data);

export type ForgotPasswordPayload = { email: string };
export type ResetPasswordPayload = {
  token: string;
  newPassword: string;
  confirmPassword: string;
};

export async function forgotPassword(data: ForgotPasswordPayload) {
  const res = await api.post("/api/v1/public/forgot-password", data);
  return res.data;
}

export async function resetPassword(data: ResetPasswordPayload) {
  const res = await api.post("/api/v1/public/reset-password", data);
  return res.data;
}

// ==========================
// Logout
// ==========================
export const logout = async () => {
  try {
    await api.get("/api/v1/auth/logout", { withCredentials: true });
  } catch (e) {
    console.warn("Logout API error:", e);
  } finally {
    const name = "access_token";
    const host = window.location.hostname;
    const base = `${name}=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0`;

    document.cookie = `${base}; Path=/; SameSite=Lax`;
    document.cookie = `${base}; Path=/; SameSite=None; Secure`;

    document.cookie = `${base}; Path=/; Domain=${host}; SameSite=Lax`;
    document.cookie = `${base}; Path=/; Domain=${host}; SameSite=None; Secure`;
    if (host !== "127.0.0.1") {
      document.cookie = `${base}; Path=/; Domain=127.0.0.1; SameSite=Lax`;
      document.cookie = `${base}; Path=/; Domain=127.0.0.1; SameSite=None; Secure`;
    }

    localStorage.removeItem("access_token");
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("roles");
    sessionStorage.removeItem("access_token");
    console.log("Cookies sau khi logout:", document.cookie);
  }
};

// ==========================
// Helpers
// ==========================
export const normalizeRoles = (roles: RoleLike[] = []) =>
  roles.map((r) => (typeof r === "string" ? r : r.roleName));

export const pickErrMsg = (err: any): string => {
  const data = err?.response?.data;
  if (!data) return "Đã xảy ra lỗi";
  if (typeof data.data === "string") return data.data;
  if (data.data && typeof data.data === "object") {
    const first = Object.values(data.data)[0];
    if (typeof first === "string") return first;
  }
  return data.message || data.error || "Yêu cầu không hợp lệ";
};

export const pickFieldErrors = (err: any): Record<string, string> => {
  const d = err?.response?.data;
  if (d?.data && typeof d.data === "object") return d.data as Record<string, string>;
  return {};
};
