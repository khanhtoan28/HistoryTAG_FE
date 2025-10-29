/**
 * Small helper to normalize roles read from storage or API.
 * - strips leading ROLE_ prefix
 * - returns uppercase role names
 */
export const normalizeRole = (r: unknown): string => {
  if (!r) return "";
  let raw = "";
  if (typeof r === "string") raw = r;
  else if (typeof r === "object" && r != null) {
    const obj = r as Record<string, unknown>;
    raw = (obj.roleName as string) ?? (obj.role as string) ?? "";
  }
  raw = String(raw).trim();
  raw = raw.replace(/^ROLE_/i, "");
  return raw.toUpperCase();
};

export const normalizeRoles = (roles: unknown[] = []): string[] => {
  try {
    return roles.map((r) => normalizeRole(r)).filter(Boolean);
  } catch {
    return [];
  }
};

export default { normalizeRole, normalizeRoles };

/**
 * Convert a UI/backend normalized role (e.g. "USER" or "ROLE_USER") to backend role format.
 * Returns "ROLE_<UPPER>" (e.g. "ROLE_USER").
 */
export const toBackendRole = (role: string): string => {
  if (!role) return role;
  const r = String(role).trim();
  if (/^ROLE_/i.test(r)) return r.toUpperCase();
  return `ROLE_${r.toUpperCase()}`;
};
