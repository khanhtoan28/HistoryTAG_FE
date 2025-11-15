import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import TaskCardNew from "../SuperAdmin/TaskCardNew";
import { toast } from "react-hot-toast";
import { FaHospital } from "react-icons/fa";
import { FiUser, FiMapPin, FiLink, FiClock, FiTag, FiPhone } from "react-icons/fi";
import { isBusinessContractTaskName as isBusinessContractTask } from "../../utils/businessContract";


export type ImplementationTaskResponseDTO = {
  id: number;
  name: string;
  hospitalId: number | null;
  hospitalName?: string | null;
  picDeploymentId: number | null;
  picDeploymentName?: string | null;
  receivedById?: number | null;
  receivedByName?: string | null;
  receivedDate?: string | null;
  quantity?: number | null;
  agencyId?: number | null;
  hisSystemId?: number | null;
  hisSystemName?: string | null;
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
  transferredToMaintenance?: boolean | null;
  readOnlyForDeployment?: boolean | null;
};

export type ImplementationTaskRequestDTO = {
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
  status?: string | null;
  startDate?: string | null;
  acceptanceDate?: string | null;
};

export type ImplementationTaskUpdateDTO = Partial<ImplementationTaskRequestDTO>;

const STATUS_LABELS: Record<"RECEIVED" | "IN_PROCESS" | "COMPLETED" | "ISSUE" | "CANCELLED", string> = {
  RECEIVED: "Đã tiếp nhận",
  IN_PROCESS: "Đang xử lý",
  COMPLETED: "Hoàn thành",
  ISSUE: "Gặp sự cố",
  CANCELLED: "Hủy",
};

const STATUS_OPTIONS: Array<{ value: keyof typeof STATUS_LABELS; label: string }> = (
  Object.entries(STATUS_LABELS) as Array<[keyof typeof STATUS_LABELS, string]>
).map(([value, label]) => ({ value, label }));

const STATUS_CANONICAL_MAP: Record<string, "RECEIVED" | "IN_PROCESS" | "COMPLETED" | "ISSUE" | "CANCELLED"> = {
  RECEIVED: "RECEIVED",
  IN_PROCESS: "IN_PROCESS",
  COMPLETED: "COMPLETED",
  ISSUE: "ISSUE",
  CANCELLED: "CANCELLED",
  NOT_STARTED: "RECEIVED",
  IN_PROGRESS: "IN_PROCESS",
  API_TESTING: "IN_PROCESS",
  INTEGRATING: "IN_PROCESS",
  WAITING_FOR_DEV: "IN_PROCESS",
  ACCEPTED: "COMPLETED",
  PENDING_TRANSFER: "COMPLETED",
  TRANSFERRED: "COMPLETED",
};

function normalizeStatus(status?: string | null): "RECEIVED" | "IN_PROCESS" | "COMPLETED" | "ISSUE" | "CANCELLED" | undefined {
  if (!status) return undefined;
  const upper = status.toUpperCase();
  return STATUS_CANONICAL_MAP[upper] || (upper as any);
}

function statusLabel(status?: string | null) {
  const normalized = normalizeStatus(status);
  if (!normalized) return status || "";
  return STATUS_LABELS[normalized];
}

function statusBadgeClasses(status?: string | null) {
  const normalized = normalizeStatus(status);
  switch (normalized) {
    case "RECEIVED":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    case "IN_PROCESS":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
    case "COMPLETED":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    case "ISSUE":
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    case "CANCELLED":
      return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
  }
}

const API_ROOT = import.meta.env.VITE_API_URL || "http://localhost:8080";
const MIN_LOADING_MS = 2000;

// PageClients folder is admin-facing: always use admin API root for tasks
const apiBase = `${API_ROOT}/api/v1/admin/implementation/tasks`;


function authHeaders(extra?: Record<string, string>) {
  // Support a few possible storage keys for the JWT to be resilient to different login flows
  const token =
    localStorage.getItem("access_token") ||
    sessionStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    sessionStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    sessionStorage.getItem("accessToken");
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(extra || {}),
  };
}

function toLocalISOString(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  return `${y}-${m}-${d}T${hh}:${mm}:${ss}`; // no timezone suffix
}

function toISOOrNull(v?: string | Date | null) {
  if (!v) return null;
  try {
    if (v instanceof Date) {
      return toLocalISOString(v);
    }
    const raw = String(v).trim();
    if (!raw) return null;
    // If has timezone, keep as is
    if (/[zZ]|[+-]\d{2}:?\d{2}$/.test(raw)) return raw;
    // If datetime-local 'YYYY-MM-DDTHH:mm' or with seconds
    const m1 = raw.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/);
    if (m1) {
      return raw.length === 16 ? `${raw}:00` : raw.slice(0, 19);
    }
    // Fallback: attempt parse and format local
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) return toLocalISOString(d);
    return raw;
  } catch {
    return null;
  }
}

function toDatetimeLocalInput(value?: string | null) {
  if (!value) return "";
  try {
    const raw = String(value).trim();
    if (!raw) return "";

    if (/[zZ]|[+-]\d{2}:?\d{2}$/.test(raw)) {
      const date = new Date(raw);
      if (Number.isNaN(date.getTime())) return raw.slice(0, 16);
      const pad = (n: number) => String(n).padStart(2, "0");
      const year = date.getFullYear();
      const month = pad(date.getMonth() + 1);
      const day = pad(date.getDate());
      const hours = pad(date.getHours());
      const minutes = pad(date.getMinutes());
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    }

    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(raw)) {
      return raw.slice(0, 16);
    }

    return raw;
  } catch {
    return "";
  }
}

function fmt(dt?: string | null) {
  if (!dt) return "";
  const d = new Date(dt);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString();
}

function clsx(...arr: Array<string | false | undefined>) {
  return arr.filter(Boolean).join(" ");
}

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <label className="grid gap-1">
      <span className="text-sm text-gray-700 dark:text-gray-300">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      {children}
    </label>
  );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={clsx(
        "h-10 rounded-xl border border-blue-300 dark:border-blue-700 bg-white dark:bg-blue-900 px-3 outline-none",
        "focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500",
        props.className || ""
      )}
    />
  );
}

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={clsx(
        "min-h-[90px] rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 p-3 outline-none",
        "focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500",
        props.className || ""
      )}
    />
  );
}

function Button(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" }
) {
  const { variant = "primary", className, ...rest } = props;
  const base = "h-10 rounded-xl px-4 text-sm font-medium transition shadow-sm";
  const styles =
    variant === "primary"
      ? "bg-gray-900 text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-white/90"
      : variant === "danger"
        ? "bg-red-600 text-white hover:bg-red-700"
        : "bg-transparent border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800";
  return <button className={clsx(base, styles, className)} {...rest} />;
}

// Lightweight inline icons (no external deps)
function PlusIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={className || "w-4 h-4"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={className || "w-4 h-4"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}
function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={className || "w-4 h-4"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}
// helper for STT display like 001, 002
// local icons and formatStt removed — TaskCardNew provides consistent UI
function RemoteSelect({
  label,
  placeholder,
  fetchOptions,
  value,
  onChange,
  required,
  disabled,
}: {
  label: string;
  placeholder?: string;
  required?: boolean;
  fetchOptions: (q: string) => Promise<Array<{ id: number; name: string }>>;
  value: { id: number; name: string } | null;
  onChange: (v: { id: number; name: string } | null) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<Array<{ id: number; name: string }>>([]);
  const [highlight, setHighlight] = useState<number>(-1);

  if (disabled) {
    return (
      <Field label={label} required={required}>
        <div className="h-10 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 flex items-center">
          {value?.name || "-"}
        </div>
      </Field>
    );
  }

  useEffect(() => {
    if (!q.trim()) return;
    let alive = true;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetchOptions(q.trim());
        if (alive) setOptions(res);
      } finally {
        if (alive) setLoading(false);
      }
    }, 300);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [q, fetchOptions]);

  // Preload options when opened without typing
  useEffect(() => {
    let alive = true;
    if (open && options.length === 0 && !q.trim()) {
      (async () => {
        setLoading(true);
        try {
          const res = await fetchOptions("");
          if (alive) setOptions(res);
        } finally {
          if (alive) setLoading(false);
        }
      })();
    }
    return () => {
      alive = false;
    };
  }, [open]);

  return (
    <Field label={label} required={required}>
      <div className="relative">
        <input
          className={clsx(
            "h-10 w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 outline-none",
            "focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
          )}
          placeholder={placeholder || "Nhập để tìm..."}
          value={open ? q : value?.name || ""}
          onChange={(e) => {
            setQ(e.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (!open) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setHighlight((h) => Math.min(h + 1, options.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setHighlight((h) => Math.max(h - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              if (highlight >= 0 && options[highlight]) {
                onChange(options[highlight]);
                setOpen(false);
              }
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
        />
        {value && !open && (
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            onClick={() => onChange(null)}
            aria-label="Clear"
          >
            ✕
          </button>
        )}
        {open && (
          <div
            className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg"
            onMouseLeave={() => setHighlight(-1)}
          >
            {loading && <div className="px-3 py-2 text-sm text-gray-500">Đang tải...</div>}
            {!loading && options.length === 0 && (
              <div className="px-3 py-2 text-sm text-gray-500">Không có kết quả</div>
            )}
            {!loading &&
              options.map((opt, idx) => (
                <div
                  key={opt.id}
                  className={clsx(
                    "px-3 py-2 text-sm cursor-pointer",
                    idx === highlight ? "bg-gray-100 dark:bg-gray-800" : ""
                  )}
                  onMouseEnter={() => setHighlight(idx)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onChange(opt);
                    setOpen(false);
                  }}
                >
                  {opt.name}
                </div>
              ))}
          </div>
        )}
      </div>
    </Field>
  );
}

function TaskFormModal({
  open,
  onClose,
  initial,
  onSubmit,
  userTeam,
}: {
  open: boolean;
  onClose: () => void;
  initial?: Partial<ImplementationTaskRequestDTO> & {
    id?: number;
    hospitalName?: string | null;
    picDeploymentName?: string | null;
  };
  onSubmit: (payload: ImplementationTaskRequestDTO, id?: number) => Promise<void>;
  userTeam: string;
}) {
  const searchHospitals = useMemo(
    () => async (term: string) => {
      const url = `${API_ROOT}/api/v1/admin/hospitals/search?name=${encodeURIComponent(term)}`;
      const res = await fetch(url, { headers: authHeaders(), credentials: "include" });
      if (!res.ok) return [];
      const list = await res.json();
      const mapped = Array.isArray(list)
        ? list.map((h: { id?: number; label?: string; name?: string; hospitalName?: string; code?: string }) => ({
          id: Number(h.id),
          name: String(h.label ?? h.name ?? h.hospitalName ?? h.code ?? h?.id),
        }))
        : [];
      return mapped.filter((x: { id: number; name: string }) => Number.isFinite(x.id) && x.name);
    },
    []
  );

  const searchPICs = useMemo(
    () => async (term: string) => {
      const params = new URLSearchParams({ name: term });
      // Lọc theo team DEPLOYMENT cho implementation tasks
      if (userTeam === "DEPLOYMENT") {
        params.set("team", "DEPLOYMENT");
      }
      // Nếu SUPERADMIN hoặc team khác, không lọc team để hiện tất cả
      const url = `${API_ROOT}/api/v1/admin/users/search?${params.toString()}`;
      const res = await fetch(url, { headers: authHeaders(), credentials: "include" });
      if (!res.ok) return [];
      const list = await res.json();
      const mapped = Array.isArray(list)
        ? list.map((u: { id?: number; label?: string; name?: string; fullName?: string; fullname?: string; username?: string }) => ({
          id: Number(u.id),
          name: String(u.label ?? u.name ?? u.fullName ?? u.fullname ?? u.username ?? u?.id),
        }))
        : [];
      return mapped.filter((x: { id: number; name: string }) => Number.isFinite(x.id) && x.name);
    },
    [userTeam]
  );

  const currentUser = useMemo((): { id: number | null; name: string } => {
    const parseNumber = (value: unknown): number | null => {
      const num = Number(value);
      return Number.isFinite(num) && num > 0 ? num : null;
    };

    const readStoredUser = (): Record<string, any> | null => {
      try {
        const raw = localStorage.getItem("user") || sessionStorage.getItem("user");
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === "object" ? (parsed as Record<string, any>) : null;
      } catch {
        return null;
      }
    };

    const storedUser = readStoredUser();
    let id = storedUser ? parseNumber(storedUser.id ?? storedUser.userId) : null;

    if (!id) {
      id = parseNumber(localStorage.getItem("userId") ?? sessionStorage.getItem("userId"));
    }

    const nameCandidates = [
      storedUser?.fullname,
      storedUser?.fullName,
      storedUser?.username,
      storedUser?.name,
      localStorage.getItem("username"),
      sessionStorage.getItem("username"),
    ];

    let name = "";
    for (const candidate of nameCandidates) {
      if (typeof candidate === "string" && candidate.trim()) {
        name = candidate.trim();
        break;
      }
    }

    if (!name && storedUser?.email && typeof storedUser.email === "string") {
      name = storedUser.email;
    }

    return { id: id ?? null, name };
  }, []);
  const currentUserId = currentUser.id;
  const currentUserName = currentUser.name;

  // Removed loaders for Agency/HIS/Hardware (fields hidden)

  const [model, setModel] = useState<ImplementationTaskRequestDTO>(() => {
    const normalized = normalizeStatus(initial?.status)?.toString() ?? "RECEIVED";
    const isNew = !initial?.id;
    // Use explicit presence checks — don't coerce to 0 which is falsy and hides a valid id
    const defaultPicId = initial?.picDeploymentId != null ? Number(initial.picDeploymentId) : (isNew && currentUserId ? currentUserId : undefined);
    const defaultStart = initial?.startDate || (isNew ? toLocalISOString(new Date()) : "");
    return {
      name: initial?.name || "",
      hospitalId: Number(initial?.hospitalId) || 0,
      // model requires a number; use 0 when unknown but the select (picOpt) below controls validation
      picDeploymentId: defaultPicId ?? 0,
      apiTestStatus: initial?.apiTestStatus ?? "",
      additionalRequest: initial?.additionalRequest ?? "",
      deadline: initial?.deadline ?? "",
      completionDate: initial?.completionDate ?? "",
      status: normalized,
      startDate: defaultStart,
    };
  });

  const [hospitalOpt, setHospitalOpt] = useState<{ id: number; name: string } | null>(() => {
    const id = (initial?.hospitalId as number) || 0;
    const nm = (initial?.hospitalName as string) || "";
    return id ? { id, name: nm || String(id) } : null;
  });

  const [picOpt, setPicOpt] = useState<{ id: number; name: string } | null>(() => {
    const isNew = !initial?.id;
    const id = initial?.picDeploymentId != null ? Number(initial?.picDeploymentId) : (isNew && currentUserId ? currentUserId : undefined);
    const nm = (initial?.picDeploymentName as string) || (isNew ? currentUserName : "");
    return id ? { id: Number(id), name: nm && nm.trim() ? nm : String(id) } : null;
  });

  // Removed: agencyOpt, hisOpt, hardwareOpt (fields hidden)

  useEffect(() => {
    if (!open) return;

    const normalized = normalizeStatus(initial?.status)?.toString() ?? "RECEIVED";
    const isNew = !initial?.id;
    const nowIso = toLocalISOString(new Date());
  const defaultPicId = initial?.picDeploymentId != null ? Number(initial?.picDeploymentId) : (isNew && currentUserId ? currentUserId : undefined);
  const defaultPicName = (initial?.picDeploymentName as string) || (isNew ? currentUserName : "");
    const defaultStart = initial?.startDate || (isNew ? nowIso : "");

    setModel({
      name: initial?.name || "",
      hospitalId: Number(initial?.hospitalId) || 0,
      picDeploymentId: defaultPicId ?? 0,
      apiTestStatus: initial?.apiTestStatus ?? "",
      additionalRequest: initial?.additionalRequest ?? "",
      deadline: initial?.deadline ?? "",
      completionDate: initial?.completionDate ?? "",
      status: normalized,
      startDate: defaultStart,
    });

    // Setup selects: nếu có tên truyền vào thì dùng, không thì null (và sẽ resolve theo ID phía dưới)
    const hid = (initial?.hospitalId as number) || 0;
    const hnm = (initial?.hospitalName as string) || "";
    setHospitalOpt(hid ? { id: hid, name: hnm || String(hid) } : null);

  const pid = defaultPicId;
  const pnm = defaultPicName;
  setPicOpt(pid ? { id: Number(pid), name: pnm && pnm.trim() ? pnm : String(pid) } : null);

    // removed resolve for agency/his/hardware

    // Nếu đang ở chế độ tạo mới, không cần resolve gì thêm
    if (!initial) return;

    // Nếu đã có name hiển thị -> set luôn, nếu chưa có thì fetch chi tiết
    if (initial.hospitalName && initial.hospitalId) {
      setHospitalOpt({ id: Number(initial.hospitalId), name: initial.hospitalName });
    } else if (initial.hospitalId) {
      // 🔁 Fetch lại tên bệnh viện theo ID (admin)
      fetch(`${API_ROOT}/api/v1/admin/hospitals/${initial.hospitalId}`, {
        headers: authHeaders(),
        credentials: "include",
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          const h = Array.isArray(data?.content) ? data.content[0] : data;
          if (h && h.id) {
            setHospitalOpt({
              id: Number(h.id),
              name: h.name ?? h.hospitalName ?? h.code ?? `BV-${h.id}`,
            });
          }
        })
        .catch(() => { });
    }

    if (initial.picDeploymentName && initial.picDeploymentId) {
      setPicOpt({ id: Number(initial.picDeploymentId), name: initial.picDeploymentName });
    } else if (initial.picDeploymentId) {
      // 🔁 Fetch lại tên người phụ trách theo ID (admin)
      fetch(`${API_ROOT}/api/v1/admin/users/${initial.picDeploymentId}`, {
        headers: authHeaders(),
        credentials: "include",
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          const u = Array.isArray(data?.content) ? data.content[0] : data;
          if (u && u.id) {
            setPicOpt({
              id: Number(u.id),
              name: u.fullname ?? u.fullName ?? u.username ?? `User-${u.id}`,
            });
          }
        })
        .catch(() => { });
    }
  }, [open, initial, currentUserId, currentUserName]);

  // Removed resolve effect for agency/his/hardware

  const [submitting, setSubmitting] = useState(false);
  if (!open) return null;

  const lockHospital = !initial?.id && (Boolean(initial?.hospitalId) || Boolean(initial?.hospitalName));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!model.name?.trim()) {
      toast.error("Tên dự án không được để trống");
      return;
    }
    if (!hospitalOpt?.id) {
      toast.error("Bệnh viện không được để trống");
      return;
    }
    if (!picOpt?.id) {
      toast.error("Người phụ trách không được để trống");
      return;
    }

    const normalizedStatus = normalizeStatus(model.status);
    const isNew = !(initial as any)?.id;
    const startDateRaw = model.startDate || (isNew ? toLocalISOString(new Date()) : "");
    const completionRaw = normalizedStatus === "COMPLETED"
      ? (model.completionDate || toLocalISOString(new Date()))
      : "";
    const payload: ImplementationTaskRequestDTO = {
      ...model,
      hospitalId: hospitalOpt.id,
      picDeploymentId: picOpt.id,
      agencyId: null,
      hisSystemId: null,
      hardwareId: null,
      quantity: null,
      bhytPortCheckInfo: null,
      apiUrl: null,
      deadline: toISOOrNull(model.deadline) || undefined,
      completionDate: toISOOrNull(completionRaw) || undefined,
      startDate: toISOOrNull(startDateRaw) || undefined,
      status: normalizedStatus || "RECEIVED",
    } as any;

    try {
      setSubmitting(true);
      await onSubmit(payload, (initial as any)?.id);
      toast.success(initial?.id ? "Cập nhật thành công" : "Tạo mới thành công");
      onClose();
    } catch (err: any) {
      toast.error("Lưu thất bại");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center p-4 bg-black/40"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <AnimatePresence initial={false}>
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 20, opacity: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 22 }}
          className="w-full max-w-3xl rounded-2xl bg-white dark:bg-gray-900 shadow-2xl border border-gray-200 dark:border-gray-800"
          onMouseDown={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          <form onSubmit={handleSubmit} className="px-6 pt-0 pb-6 grid gap-4 max-h-[80vh] overflow-y-auto no-scrollbar">
            <div className="sticky top-0 z-[100] -mx-3 px-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center justify-between py-3">
                <h3 className="text-lg font-semibold">
                  {initial?.id ? (initial?.name || "") : "Tạo tác vụ"}
                </h3>
              </div>
            </div>
            {/* Form fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Tên công việc" required>
                <TextInput
                  value={model.name}
                  onChange={(e) => setModel((s) => ({ ...s, name: e.target.value }))}
                  placeholder="Nhập tên công việc"
                />
              </Field>

              <RemoteSelect
                label="Bệnh viện"
                required
                placeholder="Nhập tên bệnh viện để tìm…"
                fetchOptions={searchHospitals}
                value={hospitalOpt}
                onChange={setHospitalOpt}
                disabled={lockHospital}
              />

              <RemoteSelect
                label="Người làm"
                required
                placeholder="Nhập tên người phụ trách để tìm…"
                fetchOptions={searchPICs}
                value={picOpt}
                onChange={setPicOpt}
              />

              {/* Removed fields: quantity, agency, HIS, hardware, API URL, BHYT */}

              <Field label="Trạng thái" required>
                <select
                  className={clsx(
                    "h-10 w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 outline-none",
                    "focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
                  )}
                  value={normalizeStatus(model.status)?.toString() ?? "RECEIVED"}
                  onChange={(e) => {
                    const value = (e.target as HTMLSelectElement).value;
                    setModel((s) => {
                      const normalized = normalizeStatus(value);
                      const isCompleted = normalized === "COMPLETED";
                      return {
                        ...s,
                        status: value,
                        completionDate: isCompleted ? (s.completionDate || toLocalISOString(new Date())) : "",
                      };
                    });
                  }}
                >
                  <option value="">— Chọn trạng thái —</option>
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Deadline (ngày)">
                <TextInput
                  lang="vi"
                  type="datetime-local"
                  value={toDatetimeLocalInput(model.deadline)}
                  onChange={(e) => setModel((s) => ({ ...s, deadline: e.target.value }))}
                />
              </Field>
              <Field label="Ngày bắt đầu">
                <TextInput
                  lang="vi"
                  type="datetime-local"
                  value={toDatetimeLocalInput(model.startDate)}
                  onChange={(e) => setModel((s) => ({ ...s, startDate: e.target.value }))}
                />
              </Field>
              <Field label="Ngày hoàn thành">
                <TextInput
                  lang="vi"
                  type="datetime-local"
                  value={toDatetimeLocalInput(model.completionDate)}
                  onChange={(e) => setModel((s) => ({ ...s, completionDate: e.target.value }))}
                />
              </Field>
            </div>

            <Field label="Yêu cầu bổ sung">
              <TextArea
                value={model.additionalRequest ?? ""}
                onChange={(e) => setModel((s) => ({ ...s, additionalRequest: e.target.value }))}
                placeholder="Mô tả chi tiết yêu cầu"
              />
            </Field>
            <hr className="my-4 border-gray-200 dark:border-gray-800" />

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={onClose}>
                Hủy
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Đang lưu..." : initial?.id ? "Cập nhật" : "Tạo mới"}
              </Button>
            </div>
          </form>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ✅ NEW DETAIL MODAL (đẹp)
function DetailModal({
  open,
  onClose,
  item,
}: {
  open: boolean;
  onClose: () => void;
  item: ImplementationTaskResponseDTO | null;
}) {
  if (!open || !item) return null;

  console.log("DetailModal item startDate", item.startDate);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 250, damping: 25 }}
        onMouseDown={(e) => e.stopPropagation()}
        className="w-full max-w-4xl rounded-2xl bg-white dark:bg-gray-900 shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden"
      >
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            📋 Chi tiết tác vụ triển khai
          </h2>
          {/* <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition"
          >
            ✕
          </button> */}
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 text-sm text-gray-800 dark:text-gray-200">
          {/* Grid Info */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <Info icon={<FaHospital />} label="Tên" value={item.name} />
            <Info icon={<FiMapPin />} label="Bệnh viện" value={item.hospitalName} />
            <Info icon={<FiUser />} label="Người phụ trách" value={item.picDeploymentName} />
            <Info icon={<FiUser />} label="Tiếp nhận bởi" value={item.receivedByName || "—"} />

            <Info
              icon={<FiTag />}
              label="Trạng thái"
              value={
                <span className={`inline-flex px-3 py-1 text-xs font-medium rounded-full ${statusBadgeClasses(item.status)}`}>
                  {statusLabel(item.status)}
                </span>
              }
            />

            <Info
              icon={<FiLink />}
              label="API URL"
              value={
                item.apiUrl ? (
                  <a href={item.apiUrl} target="_blank" rel="noreferrer" className="text-blue-600 underline break-words">
                    {item.apiUrl}
                  </a>
                ) : (
                  "—"
                )
              }
            />

            <Info icon={<FiTag />} label="API Test" value={item.apiTestStatus || "—"} />
            <Info icon={<FiPhone />} label="Số lượng" value={item.quantity ?? "—"} />
            <Info icon={<FiClock />} label="Deadline" value={fmt(item.deadline)} />
            <Info icon={<FiClock />} label="Ngày bắt đầu" value={fmt(item.startDate)} />
            <Info icon={<FiClock />} label="Ngày hoàn thành" value={fmt(item.completionDate)} />
            <Info icon={<FiClock />} label="Tạo lúc" value={fmt(item.createdAt)} />
            <Info icon={<FiClock />} label="Cập nhật lúc" value={fmt(item.updatedAt)} />
          </div>

          {/* Additional request */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
            <p className="text-gray-500 mb-2">Ghi chú / Yêu cầu bổ sung:</p>
            <div className="rounded-xl bg-gray-50 dark:bg-gray-800/60 p-3 text-gray-800 dark:text-gray-300 min-h-[60px]">
              {item.additionalRequest || "—"}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end px-6 py-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40 gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            Đóng
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// 🔹 Helper cho hiển thị gọn gàng
function Info({
  label,
  value,
  icon,
  stacked,
}: {
  label: string;
  value?: React.ReactNode;
  icon?: React.ReactNode;
  stacked?: boolean;
}) {
  if (stacked) {
    return (
      <div className="flex flex-col">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
          {icon && <span className="text-gray-500">{icon}</span>}
          <span>{label}</span>
        </div>
        <div className="mt-1 text-gray-700 dark:text-gray-300 text-sm break-words">{value ?? "—"}</div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3">
      {icon && <div className="min-w-[36px] flex items-center justify-center text-gray-500">{icon}</div>}
      <div className="flex-1 flex items-start">
        <div className="min-w-[140px] font-semibold text-gray-900 dark:text-gray-100">{label}</div>
        <div className="text-gray-700 dark:text-gray-300 flex-1 text-right break-words">{value ?? "—"}</div>
      </div>
    </div>
  );
}

const ImplementationTasksPage: React.FC = () => {
  const [data, setData] = useState<ImplementationTaskResponseDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ImplementationTaskResponseDTO | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortDir, setSortDir] = useState("desc");
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [enableItemAnimation, setEnableItemAnimation] = useState<boolean>(true);
  const [hospitalQuery, setHospitalQuery] = useState<string>("");
  const [hospitalOptions, setHospitalOptions] = useState<Array<{ id: number; label: string }>>([]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<ImplementationTaskResponseDTO | null>(null);
  // hospital list view state (like SuperAdmin page)
  const [showHospitalList, setShowHospitalList] = useState<boolean>(true);
  const [hospitalsWithTasks, setHospitalsWithTasks] = useState<Array<{ id: number | null; label: string; subLabel?: string; taskCount?: number; acceptedCount?: number; nearDueCount?: number; overdueCount?: number; transferredCount?: number; allTransferred?: boolean; allAccepted?: boolean }>>([]);
  const [loadingHospitals, setLoadingHospitals] = useState<boolean>(false);
  const [hospitalPage, setHospitalPage] = useState<number>(0);
  const [hospitalSize, setHospitalSize] = useState<number>(20);
  const [selectedHospital, setSelectedHospital] = useState<string | null>(null);
  const [hospitalSearch, setHospitalSearch] = useState<string>("");
  const [hospitalStatusFilter, setHospitalStatusFilter] = useState<string>("");
  const [hospitalSortBy, setHospitalSortBy] = useState<string>("label");
  const [hospitalSortDir, setHospitalSortDir] = useState<string>("asc");
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<number>>(new Set());
  const [bulkCompleting, setBulkCompleting] = useState(false);

  const searchDebounce = useRef<number | null>(null);
  const readStored = <T = unknown>(key: string): T | null => {
    try {
      const raw = localStorage.getItem(key) || sessionStorage.getItem(key);
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  };

  const currentUser = readStored<{ id?: number; username?: string; team?: string; roles?: unknown[] }>("user") || null;
  const userRoles = (readStored<string[]>("roles") || (currentUser?.roles as string[] | undefined)) || [];
  const userTeam = (currentUser?.team || "").toString().toUpperCase();
  const isSuperAdmin = userRoles.some(
    (r: any) => (typeof r === "string" ? r : r.roleName)?.toUpperCase() === "SUPERADMIN"
  );
  const canManage = isSuperAdmin || userTeam === "DEPLOYMENT";
  const filtered = useMemo(() => data, [data]);
  const [completedCount, setCompletedCount] = useState<number | null>(null);
  const navigate = useNavigate();
  // Pending (Business -> Deployment) modal state
  const [pendingOpen, setPendingOpen] = useState(false);
  const [pendingGroups, setPendingGroups] = useState<Array<{ hospitalName: string; hospitalId: number | null; tasks: ImplementationTaskResponseDTO[] }>>([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const pendingCountRef = useRef<number>(0);
  const lastPendingCountRef = useRef<number>(0);
  
  // Tính số task đã hoàn thành từ data đã được filter (trong trang hiện tại)
  const completedCountFromFiltered = useMemo(() => {
    return filtered.filter((item) => {
      const taskStatus = normalizeStatus(item.status);
      return taskStatus === 'COMPLETED';
    }).length;
  }, [filtered]);

  async function fetchList() {
    const start = Date.now();
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        size: String(size),
        sortBy: sortBy,
        sortDir: sortDir,
      });
      if (searchTerm) params.set("search", searchTerm.trim());
      if (statusFilter) params.set("status", statusFilter);
      if (selectedHospital) params.set("hospitalName", selectedHospital);

      const url = `${apiBase}?${params.toString()}`;
      const res = await fetch(url, { method: "GET", headers: authHeaders(), credentials: "include" });
      if (!res.ok) throw new Error(`GET ${url} failed: ${res.status}`);
      const resp = await res.json();
      const items = Array.isArray(resp?.content) ? resp.content : Array.isArray(resp) ? resp : [];
      const normalizedItems = items.map((item: ImplementationTaskResponseDTO) => ({
        ...item,
        status: normalizeStatus(item.status) || item.status || "RECEIVED",
      }));
      // Exclude tasks that were created from Business and are still pending acceptance by Deployment
      const finalItems = normalizedItems.filter((it) => {
        try {
          const received = Boolean(it?.receivedById || it?.receivedByName);
          const readOnlyPlaceholder = it?.readOnlyForDeployment === true;
          const businessPlaceholder = isBusinessContractTask(
            typeof it?.name === "string" ? it.name : String(it?.name ?? "")
          );
          if (readOnlyPlaceholder && !received) return false;
          if (businessPlaceholder && !received) return false;
          return true;
        } catch {
          return true;
        }
      });
      if (sortBy === "createdAt") {
        const dir = sortDir === "asc" ? 1 : -1;
        // sort the final items list
        const sorted = [...finalItems].sort((a, b) => {
          const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          if (aTime !== bTime) return (aTime - bTime) * dir;
          const aId = Number(a.id ?? 0);
          const bId = Number(b.id ?? 0);
          return (aId - bId) * dir;
        });
        setData(sorted);
      } else {
        setData(finalItems);
      }
      if (resp && typeof resp.totalElements === "number") setTotalCount(resp.totalElements);
      else setTotalCount(Array.isArray(resp) ? resp.length : null);

      // Tính số task completed với cùng filter (search, hospitalName) nhưng không có statusFilter
      // Nếu statusFilter đã là COMPLETED, thì completedCount = totalCount
      // Nếu statusFilter khác COMPLETED, thì completedCount = 0 (đang filter status khác)
      // Nếu không có statusFilter, fetch riêng để đếm completed
      if (!showHospitalList) {
        try {
          if (statusFilter && statusFilter.toUpperCase() === 'COMPLETED') {
            // Đang filter COMPLETED, nên completedCount = totalCount
            setCompletedCount(resp && typeof resp.totalElements === "number" ? resp.totalElements : (Array.isArray(resp) ? resp.length : filtered.length));
          } else if (statusFilter && statusFilter.toUpperCase() !== 'COMPLETED') {
            // Đang filter status khác, nên completedCount = 0
            setCompletedCount(0);
          } else {
            // Không có statusFilter, fetch riêng với cùng filter nhưng status=COMPLETED
            const countParams = new URLSearchParams({
              page: "0",
              size: "1", // Chỉ cần totalElements
              sortBy: sortBy,
              sortDir: sortDir,
            });
            if (searchTerm) countParams.set("search", searchTerm.trim());
            countParams.set("status", "COMPLETED"); // Chỉ lấy COMPLETED
            if (selectedHospital) countParams.set("hospitalName", selectedHospital);
            
            const countUrl = `${apiBase}?${countParams.toString()}`;
            const countRes = await fetch(countUrl, { method: "GET", headers: authHeaders(), credentials: "include" });
            if (countRes.ok) {
              const countResp = await countRes.json();
              if (countResp && typeof countResp.totalElements === "number") {
                setCompletedCount(countResp.totalElements);
              } else if (Array.isArray(countResp)) {
                setCompletedCount(countResp.length);
              } else {
                setCompletedCount(0);
              }
            } else {
              setCompletedCount(completedCountFromFiltered);
            }
          }
        } catch (e) {
          // Nếu lỗi, tính từ data hiện tại (fallback)
          setCompletedCount(completedCountFromFiltered);
        }
      }

      if (enableItemAnimation) {
        const itemCount = items.length;
        const maxDelay = itemCount > 1 ? 2000 + ((itemCount - 2) * 80) : 0;
        const animationDuration = 220;
        const buffer = 120;
        window.setTimeout(() => setEnableItemAnimation(false), maxDelay + animationDuration + buffer);
      }
    } catch (e: any) {
      setError(e.message || "Lỗi tải dữ liệu");
    } finally {
      const elapsed = Date.now() - start;
      if (isInitialLoad) {
        const remaining = Math.max(0, MIN_LOADING_MS - elapsed);
        await new Promise((r) => setTimeout(r, remaining));
      }
      setLoading(false);
      if (isInitialLoad) setIsInitialLoad(false);
    }
  }

  // Initial: load hospital list instead of tasks
  useEffect(() => {
    fetchHospitalsWithTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Poll pending groups periodically and show notifications when new pending tasks arrive
  // BUT: Skip polling when modal is open to avoid blinking/flashing
  useEffect(() => {
    let mounted = true;

    // Ask for notification permission once (non-blocking)
    try {
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
        // request in background; user may decline
        Notification.requestPermission().catch(() => {});
      }
    } catch (err) {
      console.debug('Notification permission request failed', err);
    }

    // Initial load (only if modal is not open)
    if (!pendingOpen) {
      (async () => {
        try {
          const initial = await fetchPendingGroups();
          lastPendingCountRef.current = initial;
        } catch (err) {
          console.debug('Initial fetchPendingGroups failed', err);
        }
      })();
    }

    // Only set up interval if modal is closed
    if (pendingOpen) {
      return () => {
        mounted = false;
      };
    }

    const intervalId = window.setInterval(async () => {
      try {
        // Skip if modal is open or component unmounted
        if (!mounted || pendingOpen) return;
        const newCount = await fetchPendingGroups();
        const last = lastPendingCountRef.current || 0;
        if (!mounted || pendingOpen) return;
        if (newCount > last) {
          const diff = newCount - last;
          // show in-app toast
          toast.success(`Có ${diff} công việc chờ mới cần tiếp nhận`);
          // show browser notification if permitted
          try {
            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
              new Notification('Công việc chờ mới', { body: `Có ${diff} công việc chờ cần tiếp nhận`, silent: false });
            }
          } catch (err) {
            console.debug('Browser notification failed', err);
          }
        }
        lastPendingCountRef.current = newCount;
      } catch (err) {
        console.debug('Polling fetchPendingGroups failed', err);
      }
    }, 8000);

    return () => {
      mounted = false;
      window.clearInterval(intervalId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingOpen]);

  // when page or size changes, refetch
  useEffect(() => {
    if (!showHospitalList && selectedHospital) fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, size]);

  // reset page when filters/sort/search change
  useEffect(() => { setPage(0); }, [searchTerm, statusFilter, sortBy, sortDir]);

  // debounce searchTerm changes and refetch
  useEffect(() => {
    if (showHospitalList) return;
    if (searchDebounce.current) window.clearTimeout(searchDebounce.current);
    searchDebounce.current = window.setTimeout(() => { fetchList(); }, 600);
    return () => { if (searchDebounce.current) window.clearTimeout(searchDebounce.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  // refetch when statusFilter or sort changes
  useEffect(() => { if (!showHospitalList) fetchList(); /* eslint-disable-line */ }, [statusFilter]);
  useEffect(() => { if (!showHospitalList) fetchList(); /* eslint-disable-line */ }, [sortBy, sortDir]);

  // Clear selected tasks when switching views or filters
  useEffect(() => {
    setSelectedTaskIds(new Set());
  }, [showHospitalList, page, statusFilter, searchTerm, selectedHospital]);

  const handleBulkComplete = async () => {
    if (selectedTaskIds.size === 0) return;
    
    setBulkCompleting(true);
    try {
      const taskIdsArray = Array.from(selectedTaskIds);
      const res = await fetch(`${API_ROOT}/api/v1/admin/implementation/tasks/bulk-complete`, {
        method: "POST",
        headers: {
          ...authHeaders(),
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ taskIds: taskIdsArray }),
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: "Lỗi khi hoàn thành tasks" }));
        throw new Error(errorData.message || `HTTP ${res.status}`);
      }
      
      const result = await res.json();
      const completedCount = result.completedCount || 0;
      
      toast.success(`Đã hoàn thành ${completedCount} task${completedCount > 1 ? "s" : ""}`);
      
      // Clear selection and refresh list
      setSelectedTaskIds(new Set());
      await fetchList();
      
      // Refresh hospital summary if in hospital view
      if (showHospitalList) {
        await fetchHospitalsWithTasks();
      }
    } catch (error: any) {
      toast.error(error.message || "Lỗi khi hoàn thành tasks");
    } finally {
      setBulkCompleting(false);
    }
  };

  async function fetchHospitalOptions(q: string) {
    try {
      const res = await fetch(`${API_ROOT}/api/v1/admin/hospitals/search?name=${encodeURIComponent(q || "")}`, { headers: authHeaders() });
      if (!res.ok) return;
      const list = await res.json();
      if (Array.isArray(list)) setHospitalOptions(list.map((h: any) => ({ id: Number(h.id), label: String(h.label ?? h.name ?? "") })));
    } catch { /* ignore */ }
  }

  async function resolveHospitalIdByName(name: string): Promise<number | null> {
    try {
      const res = await fetch(`${API_ROOT}/api/v1/admin/hospitals/search?name=${encodeURIComponent(name)}`, { headers: authHeaders(), credentials: 'include' });
      if (!res.ok) return null;
      const list = await res.json();
      if (!Array.isArray(list)) return null;
      const exact = list.find((h: any) => String(h?.label ?? h?.name ?? '').trim().toLowerCase() === name.trim().toLowerCase());
      const item = exact || list[0];
      const id = Number(item?.id);
      return Number.isFinite(id) ? id : null;
    } catch { return null; }
  }

  useEffect(() => {
    const id = window.setTimeout(() => {
      if (hospitalQuery && hospitalQuery.trim().length > 0) fetchHospitalOptions(hospitalQuery.trim());
      else setHospitalOptions([]);
    }, 300);
    return () => window.clearTimeout(id);
  }, [hospitalQuery]);

  async function fetchHospitalsWithTasks() {
    setLoadingHospitals(true);
    setError(null);
    try {
      // ✅ Fetch hospitals with transfer status (new endpoint - tối ưu hơn)
      const res = await fetch(`${API_ROOT}/api/v1/admin/implementation/tasks/hospitals/with-status`, {
        method: "GET",
        headers: authHeaders(),
        credentials: "include",
      });
      if (!res.ok) {
        if (res.status === 401) {
          throw new Error(`Unauthorized (401): Token may be expired or invalid. Please login again.`);
        }
        throw new Error(`Failed to fetch hospitals: ${res.status}`);
      }
      const hospitals = await res.json();
      
      // Parse task count from subLabel (format: "Province - X tasks" or "X tasks")
      const baseList = (Array.isArray(hospitals) ? hospitals : []).map((hospital: { id: number; label: string; subLabel?: string; transferredToMaintenance?: boolean; acceptedByMaintenance?: boolean }) => {
        let taskCount = 0;
        let province = hospital.subLabel || "";
        
        // Parse task count from subLabel
        if (hospital.subLabel) {
          const match = hospital.subLabel.match(/(\d+)\s+tasks?/i);
          if (match) {
            taskCount = parseInt(match[1], 10);
            // Extract province (everything before " - X tasks")
            province = hospital.subLabel.replace(/\s*-\s*\d+\s+tasks?/i, "").trim();
          }
        }
        
        return {
          ...hospital,
          subLabel: province, // Keep only province without task count
          taskCount: taskCount,
          nearDueCount: 0, // Initialize to 0 - will be calculated in augment()
          overdueCount: 0, // Initialize to 0 - will be calculated in augment()
          transferredCount: 0,
          // Use transfer status from backend
          allTransferred: Boolean(hospital.transferredToMaintenance),
          allAccepted: Boolean(hospital.acceptedByMaintenance),
        };
      });

      // Fetch completed counts + near due/overdue for each hospital in parallel
      const completedCounts = await Promise.all(
        baseList.map(async (h) => {
          try {
            // count only COMPLETED as 'completed' for hospital aggregation
            const p = new URLSearchParams({ page: "0", size: "1", status: "COMPLETED", hospitalName: h.label });
            const u = `${API_ROOT}/api/v1/admin/implementation/tasks?${p.toString()}`;
            const r = await fetch(u, { method: 'GET', headers: authHeaders(), credentials: 'include' });
            if (!r.ok) return 0;
            try {
              const resp = await r.json();
              if (resp && typeof resp.totalElements === 'number') return resp.totalElements as number;
              else if (Array.isArray(resp)) return resp.length;
            } catch {
              // ignore individual parse errors
            }
            return 0;
          } catch {
            return 0;
          }
        })
      );

      // Fetch all tasks (limited) to compute near due/overdue per hospital
      const allParams = new URLSearchParams({ page: "0", size: "2000", sortBy: "id", sortDir: "asc" });
      const allRes = await fetch(`${API_ROOT}/api/v1/admin/implementation/tasks?${allParams.toString()}`, { method: 'GET', headers: authHeaders(), credentials: 'include' });
      const allPayload = allRes.ok ? await allRes.json() : [];
      const allItems = Array.isArray(allPayload?.content) ? allPayload.content : Array.isArray(allPayload) ? allPayload : [];
      // Exclude Business-created pending tasks from hospital summaries (they are not yet in deployment list)
      const visibleItems = (allItems as ImplementationTaskResponseDTO[]).filter((it) => {
        try {
          const received = Boolean(it?.receivedById || it?.receivedByName);
          const readOnlyPlaceholder = it?.readOnlyForDeployment === true;
          const businessPlaceholder = isBusinessContractTask(
            typeof it?.name === "string" ? it.name : String(it?.name ?? "")
          );
          if (readOnlyPlaceholder && !received) return false;
          if (businessPlaceholder && !received) return false;
          return true;
        } catch {
          return true;
        }
      });

      // Aggregate by hospitalName
      const acc = new Map<string, { id: number | null; label: string; subLabel?: string; taskCount: number; acceptedCount: number; nearDueCount: number; overdueCount: number; transferredCount: number; acceptedByMaintenanceCount: number }>();
      for (const it of visibleItems) {
        const name = (it.hospitalName || "").toString().trim() || "—";
        const hospitalId = typeof it.hospitalId === "number" ? it.hospitalId : it.hospitalId != null ? Number(it.hospitalId) : null;
        const key = hospitalId != null ? `id-${hospitalId}` : `name-${name}`;
        const current = acc.get(key) || { id: hospitalId, label: name, subLabel: "", taskCount: 0, acceptedCount: 0, nearDueCount: 0, overdueCount: 0, transferredCount: 0, acceptedByMaintenanceCount: 0 };
        if (current.id == null && hospitalId != null) current.id = hospitalId;
        if (!current.label && name) current.label = name;
        current.taskCount += 1;
        const taskStatus = normalizeStatus(it.status);
        if (taskStatus === 'COMPLETED') current.acceptedCount += 1;
        // Count transferred tasks
        if (it.transferredToMaintenance === true) {
          current.transferredCount += 1;
        }
        // Count tasks accepted by maintenance (readOnlyForDeployment = true means maintenance accepted)
        if (it.readOnlyForDeployment === true && it.transferredToMaintenance === true) {
          current.acceptedByMaintenanceCount += 1;
        }
        // Count near due / overdue for non-completed
        if (taskStatus !== 'COMPLETED' && it.deadline) {
          const d = new Date(it.deadline);
          if (!Number.isNaN(d.getTime())) {
            d.setHours(0,0,0,0);
            const today = new Date();
            const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
            const dayDiff = Math.round((d.getTime() - startToday) / (24 * 60 * 60 * 1000));
            // Quá hạn: deadline đã qua (dayDiff < 0)
            if (dayDiff < 0) current.overdueCount += 1;
            // Sắp đến hạn: hôm nay hoặc trong 3 ngày tới (0 <= dayDiff <= 3)
            if (dayDiff >= 0 && dayDiff <= 3) current.nearDueCount += 1;
          }
        }
        acc.set(key, current);
      }
      // Merge baseList (có transfer status từ endpoint) với task counts từ aggregation
      // Chỉ hiển thị các bệnh viện có task đã được tiếp nhận (không phải pending)
      const withCompleted = baseList
        .map((h, idx) => {
          // Tìm matching hospital từ acc (aggregated from tasks - đã loại pending)
          const hospitalId = h.id;
          const hospitalName = h.label;
          const key = hospitalId != null ? `id-${hospitalId}` : `name-${hospitalName}`;
          const aggregated = acc.get(key);
          
          // Chỉ sử dụng taskCount từ aggregated (đã filter pending tasks)
          // Không fallback về h.taskCount vì nó có thể bao gồm pending tasks
          const finalTaskCount = aggregated?.taskCount ?? 0;
          
          return {
            ...h,
            taskCount: finalTaskCount,
            acceptedCount: completedCounts[idx] ?? (aggregated?.acceptedCount ?? 0),
            nearDueCount: aggregated?.nearDueCount ?? 0,
            overdueCount: aggregated?.overdueCount ?? 0,
            // Transfer status đã có từ backend endpoint
          };
        })
        .filter((h) => h.taskCount > 0); // Chỉ hiển thị bệnh viện có task đã được tiếp nhận
      
      // Province đã có trong subLabel từ endpoint, không cần fetch thêm
      setHospitalsWithTasks(withCompleted);
    } catch (e: any) {
      setError(e.message || "Lỗi tải danh sách bệnh viện");
    } finally {
      setLoadingHospitals(false);
    }
  }

  // Fetch pending implementation tasks that were created from Business and not yet accepted by Deployment
  async function fetchPendingGroups(): Promise<number> {
    setLoadingPending(true);
    try {
      const url = `${API_ROOT}/api/v1/admin/implementation/pending`;
      const res = await fetch(url, { method: 'GET', headers: authHeaders(), credentials: 'include' });
      if (res.status === 401) {
        toast.error('Bạn chưa đăng nhập hoặc phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        navigate('/signin');
        return pendingCountRef.current;
      }
      if (!res.ok) throw new Error(`Failed to load pending: ${res.status}`);
      const list: ImplementationTaskResponseDTO[] = await res.json();
      // Defensive: only keep tasks without receivedBy
      const filtered = (Array.isArray(list) ? list : []).filter((t) => !t.receivedById && !t.receivedByName);
      const groups = new Map<string, { hospitalId: number | null; hospitalName: string; tasks: ImplementationTaskResponseDTO[] }>();
      for (const t of filtered) {
        const name = (t.hospitalName || '—').toString();
        const key = `${t.hospitalId ?? 'null'}::${name}`;
        const cur = groups.get(key) || { hospitalId: typeof t.hospitalId === 'number' ? t.hospitalId : null, hospitalName: name, tasks: [] };
        cur.tasks.push(t);
        groups.set(key, cur);
      }
      const grouped = Array.from(groups.values()).map(g => ({ hospitalName: g.hospitalName, hospitalId: g.hospitalId, tasks: g.tasks }));
      setPendingGroups(grouped);
      const count = grouped.reduce((s, g) => s + (g.tasks?.length || 0), 0);
      pendingCountRef.current = count;
      return count;
    } catch (e: any) {
      toast.error(e?.message || 'Lỗi khi tải danh sách chờ');
    } finally {
      setLoadingPending(false);
    }
    return pendingCountRef.current;
  }

  async function handleAcceptTask(taskId: number) {
    try {
      const url = `${API_ROOT}/api/v1/admin/implementation/accept/${taskId}`;
      // Set startDate to current date/time and status to RECEIVED when accepting
      const startDate = toLocalISOString(new Date());
      const res = await fetch(url, { 
        method: 'PUT', 
        headers: authHeaders(), 
        credentials: 'include',
        body: JSON.stringify({ 
          startDate,
          status: 'RECEIVED'
        })
      });
      if (res.status === 401) {
        toast.error('Bạn chưa đăng nhập hoặc không có quyền. Vui lòng đăng nhập lại.');
        navigate('/signin');
        return;
      }
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(txt || `HTTP ${res.status}`);
      }
      const updated: ImplementationTaskResponseDTO | null = await res.json().catch(() => null);
      // Remove from pendingGroups
      setPendingGroups((prev) => prev.map(g => ({ ...g, tasks: g.tasks.filter(t => t.id !== taskId) })).filter(g => g.tasks.length > 0));

      // If server returned updated DTO, insert/update it into current view so accepter sees it immediately
      if (updated) {
        toast.success(`Đã nhận công việc: ${updated.name}`);
        // If currently viewing tasks for a specific hospital, and it matches, add to data list
        if (!showHospitalList && selectedHospital && updated.hospitalName === selectedHospital) {
          setData((prev) => {
            // avoid duplicates
            const exists = prev.some((p) => p.id === updated.id);
            if (exists) return prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p));
            return [ { ...updated, status: normalizeStatus(updated.status) || updated.status }, ...prev ];
          });
        } else {
          // Not viewing that hospital — update hospitals summary counters optimistically
          setHospitalsWithTasks((prev) => prev.map(h => {
            if ((h.id ?? null) === (updated.hospitalId ?? null) || h.label === updated.hospitalName) {
              // task moved from pending -> active: increment taskCount and acceptedCount accordingly
              return { ...h, taskCount: (h.taskCount || 0) + 1, acceptedCount: (h.acceptedCount || 0) + 1 };
            }
            return h;
          }));
        }
      } else {
        toast.success('Đã nhận công việc');
      }

      // Refresh hospital summary to keep counters in sync (best-effort)
      fetchHospitalsWithTasks().catch(() => {});
      
      // Refresh task list if viewing tasks to show updated startDate and status
      if (!showHospitalList && selectedHospital) {
        await fetchList();
      }
    } catch (e: any) {
      toast.error(e?.message || 'Lỗi khi tiếp nhận công việc');
    }
  }

  async function handleAcceptGroup(hospitalId: number | null) {
    // Accept all tasks in a given hospital group sequentially
    const group = pendingGroups.find(g => (g.hospitalId ?? null) === (hospitalId ?? null));
    if (!group) return;
    for (const t of [...group.tasks]) {
      // eslint-disable-next-line no-await-in-loop
      await handleAcceptTask(t.id as number);
    }
  }

  async function handleAcceptAll() {
    // Accept all tasks from all hospitals sequentially
    for (const group of [...pendingGroups]) {
      for (const t of [...group.tasks]) {
        // eslint-disable-next-line no-await-in-loop
        await handleAcceptTask(t.id as number);
      }
    }
  }

  const filteredHospitals = useMemo(() => {
    let list = hospitalsWithTasks;
    const q = hospitalSearch.trim().toLowerCase();
    if (q) list = list.filter(h => h.label.toLowerCase().includes(q) || (h.subLabel || '').toLowerCase().includes(q));
    if (hospitalStatusFilter === 'accepted') list = list.filter(h => (h.acceptedCount || 0) > 0);
    else if (hospitalStatusFilter === 'incomplete') list = list.filter(h => (h.acceptedCount || 0) < (h.taskCount || 0));
    else if (hospitalStatusFilter === 'unaccepted') list = list.filter(h => (h.acceptedCount || 0) === 0);

    const dir = hospitalSortDir === 'desc' ? -1 : 1;
    list = [...list].sort((a, b) => {
      if (hospitalSortBy === 'taskCount') return ((a.taskCount || 0) - (b.taskCount || 0)) * dir;
      if (hospitalSortBy === 'accepted') return ((a.acceptedCount || 0) - (b.acceptedCount || 0)) * dir;
      if (hospitalSortBy === 'ratio') {
        const ra = (a.taskCount || 0) > 0 ? (a.acceptedCount || 0) / (a.taskCount || 1) : 0;
        const rb = (b.taskCount || 0) > 0 ? (b.acceptedCount || 0) / (b.taskCount || 1) : 0;
        return (ra - rb) * dir;
      }
      // label
      return a.label.localeCompare(b.label) * dir;
    });
    return list;
  }, [hospitalsWithTasks, hospitalSearch, hospitalStatusFilter, hospitalSortBy, hospitalSortDir]);

  useEffect(() => {
    if (!showHospitalList && selectedHospital) {
      fetchList();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedHospital, showHospitalList]);

  const handleSubmit = async (payload: ImplementationTaskRequestDTO, id?: number) => {
    const isUpdate = Boolean(id);
    const url = isUpdate ? `${apiBase}/${id}` : apiBase;
    const method = isUpdate ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: authHeaders(),
      body: JSON.stringify(payload),
      credentials: "include",
    });
    if (!res.ok) {
      const msg = await res.text();
      toast.error(`${method} thất bại: ${msg || res.status}`);
      return;
    }
    // Update UI immediately without full page reload
    if (showHospitalList) {
      // We are on hospital table → refresh the aggregated list
      await fetchHospitalsWithTasks();
    } else {
      // We are viewing tasks of a hospital → refresh tasks
      await fetchList();

      // Optimistically bump hospital list counters so when user quay lại không cần reload
      if (!isUpdate && selectedHospital) {
        setHospitalsWithTasks((prev) => prev.map((h) => {
          if (h.label !== selectedHospital) return h;
          const incAccepted = normalizeStatus((payload as any)?.status) === 'COMPLETED' ? 1 : 0;
          return { ...h, taskCount: (h.taskCount || 0) + 1, acceptedCount: (h.acceptedCount || 0) + incAccepted };
        }));
      }
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Xóa bản ghi này?")) return;
    const res = await fetch(`${apiBase}/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
      credentials: "include",
    });
    if (!res.ok) {
      const msg = await res.text();
      toast.error(`Xóa thất bại: ${msg || res.status}`);
      return;
    }
    setData((s) => s.filter((x) => x.id !== id));
    toast.success("Đã xóa");
  };

  const handleConvertHospital = async (hospital: { label: string; taskCount?: number; acceptedCount?: number; id?: number | null }) => {
    if (!canManage) return;
    const total = hospital.taskCount || 0;
    const accepted = hospital.acceptedCount || 0;
    if (total === 0 || accepted < total) {
      toast.error("Bệnh viện còn tác vụ chưa hoàn thành nên chưa thể chuyển.");
      return;
    }
    const hospitalIdRaw =
      hospital.id ??
      hospitalsWithTasks.find((h) => h.label === hospital.label)?.id ??
      null;
    const hospitalId = hospitalIdRaw != null ? Number(hospitalIdRaw) : null;
    if (!hospitalId) {
      toast.error("Không xác định được bệnh viện để chuyển sang bảo trì.");
      return;
    }
    if (!confirm(`Chuyển bệnh viện ${hospital.label} sang bảo trì?`)) return;
    try {
      // ✅ API mới: Chuyển bệnh viện (không phải task)
      const res = await fetch(
        `${API_ROOT}/api/v1/admin/hospitals/${hospitalId}/transfer-to-maintenance`,
        {
          method: "POST",
          headers: authHeaders(),
          credentials: "include",
        },
      );
      if (!res.ok) {
        const text = await res.text();
        toast.error(`Chuyển sang bảo trì thất bại: ${text || res.status}`);
        return;
      }
      
      toast.success(`Đã chuyển bệnh viện ${hospital.label} sang bảo trì`);

      // ✅ Update state ngay lập tức để UI cập nhật (từ "Chuyển sang bảo trì" → "Chờ tiếp nhận")
      setHospitalsWithTasks((prev) => prev.map((h) => {
        if (h.id === hospitalId || h.label === hospital.label) {
          return {
            ...h,
            allTransferred: true, // Đã chuyển
            allAccepted: false,   // Chưa tiếp nhận
          };
        }
        return h;
      }));

      // ✅ Refresh để lấy data mới nhất từ backend (sau delay nhỏ để đảm bảo backend đã commit)
      await new Promise(resolve => setTimeout(resolve, 300));
      await fetchHospitalsWithTasks();
      if (!showHospitalList && selectedHospital === hospital.label) {
        await fetchList();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg || "Lỗi khi chuyển sang bảo trì");
    }
  };

  return (
    <div className="p-6 xl:p-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-extrabold">{showHospitalList ? "Danh sách bệnh viện có task" : `Danh sách công việc triển khai - ${selectedHospital}`}</h1>
        {!showHospitalList && (
          <button onClick={() => { setSelectedHospital(null); setShowHospitalList(true); setSearchTerm(""); setStatusFilter(""); setPage(0); setData([]); fetchHospitalsWithTasks(); }} className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 text-sm font-medium">← Quay lại danh sách bệnh viện</button>
        )}
      </div>

      {error && <div className="text-red-600 mb-4">{error}</div>}

      {!showHospitalList && (
      <div className="mb-6 rounded-2xl border bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold mb-3">Tìm kiếm & Thao tác</h3>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <input
                  list="hospital-list"
                  type="text"
                  className="rounded-full border px-4 py-3 text-sm shadow-sm min-w-[220px] border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
                  placeholder="Tìm theo tên (gõ để gợi ý bệnh viện)"
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setHospitalQuery(e.target.value); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { fetchList(); } }}
                  onBlur={() => { /* keep search as-is */ }}
                />
                <datalist id="hospital-list">
                  {hospitalOptions.map((h) => (
                    <option key={h.id ?? h.label} value={h.label} />
                  ))}
                </datalist>
              </div>

              <select
                className="rounded-full border px-4 py-3 text-sm shadow-sm min-w-[160px] border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">— Chọn trạng thái —</option>
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="mt-3 text-sm text-gray-600 dark:text-gray-300 flex items-center gap-4">
              <span>Tổng: <span className="font-semibold text-gray-800 dark:text-gray-100">{loading ? '...' : (totalCount ?? filtered.length)}</span></span>
              <span>Đã hoàn thành: <span className="font-semibold text-gray-800 dark:text-gray-100">{completedCount ?? completedCountFromFiltered}/{totalCount ?? filtered.length} task</span></span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <select className="rounded-lg border px-3 py-2 text-sm border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900" value={sortBy} onChange={(e) => { setSortBy(e.target.value); setPage(0); }}>
                <option value="id">Sắp xếp theo: id</option>
                <option value="hospitalName">Sắp xếp theo: bệnh viện</option>
                <option value="deadline">Sắp xếp theo: deadline</option>
                <option value="createdAt">Sắp xếp theo: ngày tạo</option>
              </select>
              <select className="rounded-lg border px-3 py-2 text-sm border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900" value={sortDir} onChange={(e) => setSortDir(e.target.value)}>
                <option value="asc">Tăng dần</option>
                <option value="desc">Giảm dần</option>
              </select>
            </div>
            {/* Pending tasks button for Deployment team */}
            {canManage && (
              <Button
                variant="ghost"
                className="relative flex items-center gap-2 border border-blue-200 text-blue-600 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-300"
                onClick={() => { setPendingOpen(true); fetchPendingGroups(); }}
              >
                📨 Công việc chờ
                {pendingGroups.reduce((s, g) => s + (g.tasks?.length || 0), 0) > 0 && (
                  <span className="absolute -top-1 -right-2 bg-red-600 text-white text-xs rounded-full px-2 py-0.5">
                    {pendingGroups.reduce((s, g) => s + (g.tasks?.length || 0), 0)}
                  </span>
                )}
              </Button>
            )}

            {canManage ? (
              <button
                className="rounded-xl bg-blue-600 text-white px-5 py-2 shadow hover:bg-blue-700 flex items-center gap-2"
                onClick={async () => { 
                  let hid: number | null = null;
                  if (selectedHospital) hid = await resolveHospitalIdByName(selectedHospital);
                  setEditing(hid ? ({ hospitalId: hid, hospitalName: selectedHospital } as any) : ({ hospitalName: selectedHospital } as any));
                  setModalOpen(true);
                }}
              >
                <PlusIcon />
                <span>Thêm mới</span>
              </button>
            ) : (
              <button disabled className="rounded-xl bg-gray-200 text-gray-500 px-5 py-2 shadow-sm flex items-center gap-2" title="Không có quyền">
                <PlusIcon />
                <span>Thêm mới</span>
              </button>
            )}
          
          </div>
        </div>
      </div>
      )}

      <div>
        <style>{`
          @keyframes fadeInUp { from { opacity:0; transform: translateY(6px); } to { opacity:1; transform: translateY(0); } }
        `}</style>

        <div className="space-y-3">
          {loading && isInitialLoad && !showHospitalList ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-blue-600 text-4xl font-extrabold tracking-wider animate-pulse" aria-hidden="true">TAG</div>
            </div>
          ) : showHospitalList ? (
            // hospital list table
            <div className="mb-6">
              <div className="mb-4 rounded-2xl border bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold mb-3">Tìm kiếm & Lọc</h3>
                  <div className="flex flex-wrap items-center gap-3">
                    <input
                      type="text"
                      className="rounded-full border px-4 py-3 text-sm shadow-sm min-w-[220px] border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
                      placeholder="Tìm theo tên bệnh viện / tỉnh"
                      value={hospitalSearch}
                      onChange={(e) => { setHospitalSearch(e.target.value); setHospitalPage(0); }}
                    />
                    <select
                      className="rounded-full border px-4 py-3 text-sm shadow-sm min-w-[180px] border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
                      value={hospitalStatusFilter}
                      onChange={(e) => { setHospitalStatusFilter(e.target.value); setHospitalPage(0); }}
                    >
                      <option value="">— Tất cả —</option>
                      <option value="accepted">Có nghiệm thu</option>
                      <option value="incomplete">Chưa nghiệm thu hết</option>
                      <option value="unaccepted">Chưa có nghiệm thu</option>
                    </select>
                  </div>
                  <div className="mt-3 text-sm text-gray-600 dark:text-gray-300">
                    <span>Tổng: <span className="font-semibold text-gray-800 dark:text-gray-100">{loadingHospitals ? '...' : filteredHospitals.length}</span> viện</span>
                  </div>
                </div>
                  <div className="flex items-center gap-2">
                    <select className="rounded-lg border px-3 py-2 text-sm border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900" value={hospitalSortBy} onChange={(e) => { setHospitalSortBy(e.target.value); setHospitalPage(0); }}>
                      <option value="label">Sắp xếp theo: tên</option>
                      <option value="taskCount">Sắp xếp theo: tổng task</option>
                      <option value="accepted">Sắp xếp theo: đã nghiệm thu</option>
                      <option value="ratio">Sắp xếp theo: tỉ lệ nghiệm thu</option>
                    </select>
                    <select className="rounded-lg border px-3 py-2 text-sm border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900" value={hospitalSortDir} onChange={(e) => setHospitalSortDir(e.target.value)}>
                      <option value="asc">Tăng dần</option>
                      <option value="desc">Giảm dần</option>
                    </select>
                    {/* Pending tasks button (visible in hospital list header) */}
                    {canManage && (
                      <>
                        <Button
                          variant="ghost"
                          className="relative flex items-center gap-2 border border-blue-200 text-blue-600 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-300 mr-2"
                          onClick={() => { setPendingOpen(true); fetchPendingGroups(); }}
                        >
                          📨 Công việc chờ
                          {pendingGroups.reduce((s, g) => s + (g.tasks?.length || 0), 0) > 0 && (
                            <span className="absolute -top-1 -right-2 bg-red-600 text-white text-xs rounded-full px-2 py-0.5">
                              {pendingGroups.reduce((s, g) => s + (g.tasks?.length || 0), 0)}
                            </span>
                          )}
                        </Button>
                        <button
                          className="rounded-xl bg-blue-600 text-white px-5 py-2 shadow hover:bg-blue-700"
                          onClick={() => { setEditing(null); setModalOpen(true); }}
                          type="button"
                        >
                          + Thêm task mới
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
              {loadingHospitals ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-blue-600 text-4xl font-extrabold tracking-wider animate-pulse" aria-hidden="true">TAG</div>
                </div>
              ) : filteredHospitals.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 p-8 text-center text-gray-600 dark:text-gray-400">
                  Không có bệnh viện nào có task
                </div>
              ) : (
                <>
                  <div className="rounded-2xl border bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">STT</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên bệnh viện</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tỉnh/Thành phố</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Số lượng task</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thao tác</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {filteredHospitals
                            .slice(hospitalPage * hospitalSize, (hospitalPage + 1) * hospitalSize)
                            .map((hospital, index) => (
                            <tr key={hospital.id ?? `${hospital.label}-${index}`} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => { setSelectedHospital(hospital.label); setShowHospitalList(false); setPage(0); }}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{hospitalPage * hospitalSize + index + 1}</td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                                    <FaHospital className="text-blue-600 text-lg" />
                                  </div>
                                  <div className="text-sm font-medium text-gray-900">{hospital.label}</div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{hospital.subLabel || "—"}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm align-top">
                                <div className="flex flex-col items-start gap-1">
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">{(hospital.acceptedCount ?? 0)}/{hospital.taskCount ?? 0} task</span>
                                  {(hospital.nearDueCount ?? 0) > 0 && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">Sắp đến hạn: {hospital.nearDueCount}</span>
                                  )}
                                  {(hospital.overdueCount ?? 0) > 0 && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Quá hạn: {hospital.overdueCount}</span>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                <div className="flex items-center gap-3">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedHospital(hospital.label);
                                      setShowHospitalList(false);
                                      setPage(0);
                                    }}
                                    className="text-blue-600 hover:text-blue-800 font-medium"
                                  >
                                    Xem task
                                  </button>
                                  {canManage && (hospital.taskCount || 0) > 0 && (hospital.acceptedCount || 0) === (hospital.taskCount || 0) && !hospital.allTransferred && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleConvertHospital(hospital);
                                      }}
                                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 text-sm font-medium hover:bg-indigo-100 transition-colors"
                                      title="Chuyển tất cả tác vụ đã hoàn thành sang bảo trì"
                                    >
                                      ➜ Chuyển sang bảo trì
                                    </button>
                                  )}
                                  {canManage && (hospital.taskCount || 0) > 0 && hospital.allTransferred && !hospital.allAccepted && (
                                    <span
                                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-yellow-100 text-yellow-700 text-sm font-medium"
                                      title="Đã chuyển sang bảo trì, đang chờ bảo trì tiếp nhận"
                                    >
                                      ⏳ Chờ tiếp nhận
                                    </span>
                                  )}
                                  {canManage && (hospital.taskCount || 0) > 0 && hospital.allTransferred && hospital.allAccepted && (
                                    <span
                                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-100 text-green-700 text-sm font-medium"
                                      title="Đã chuyển sang bảo trì và bảo trì đã tiếp nhận"
                                    >
                                      ✓ Đã chuyển sang bảo trì
                                    </span>
                                  )}
                                  {canManage && (hospital.taskCount || 0) > 0 && (hospital.acceptedCount || 0) < (hospital.taskCount || 0) && !hospital.allTransferred && (
                                    <span
                                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-sm"
                                      title={`Còn ${(hospital.taskCount || 0) - (hospital.acceptedCount || 0)} task chưa hoàn thành`}
                                    >
                                      <span className="text-orange-500">⚠</span>
                                      Chưa thể chuyển
                                    </span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between py-3">
                    <div className="text-sm text-gray-600">
                      {filteredHospitals.length === 0 ? (
                        <span>Hiển thị 0 trong tổng số 0 mục</span>
                      ) : (
                        (() => {
                          const total = filteredHospitals.length;
                          const from = hospitalPage * hospitalSize + 1;
                          const to = Math.min((hospitalPage + 1) * hospitalSize, total);
                          return <span>Hiển thị {from} đến {to} trong tổng số {total} mục</span>;
                        })()
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-600">Hiển thị:</label>
                        <select value={String(hospitalSize)} onChange={(e) => { setHospitalSize(Number(e.target.value)); setHospitalPage(0); }} className="border rounded px-2 py-1 text-sm">
                          <option value="10">10</option>
                          <option value="20">20</option>
                          <option value="50">50</option>
                          <option value="100">100</option>
                        </select>
                      </div>

                      <div className="inline-flex items-center gap-1">
                        <button onClick={() => setHospitalPage(0)} disabled={hospitalPage <= 0} className="px-2 py-1 border rounded text-sm disabled:opacity-50" title="Đầu">«</button>
                        <button onClick={() => setHospitalPage((p) => Math.max(0, p - 1))} disabled={hospitalPage <= 0} className="px-2 py-1 border rounded text-sm disabled:opacity-50" title="Trước">‹</button>

                        {(() => {
                          const total = Math.max(1, Math.ceil(filteredHospitals.length / hospitalSize));
                          const pages: number[] = [];
                          const start = Math.max(1, hospitalPage + 1 - 2);
                          const end = Math.min(total, start + 4);
                          for (let i = start; i <= end; i++) pages.push(i);
                          return pages.map((p) => (
                            <button key={p} onClick={() => setHospitalPage(p - 1)} className={`px-3 py-1 border rounded text-sm ${hospitalPage + 1 === p ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700'}`}>
                              {p}
                            </button>
                          ));
                        })()}

                        <button onClick={() => setHospitalPage((p) => Math.min(Math.max(0, Math.ceil(filteredHospitals.length / hospitalSize) - 1), p + 1))} disabled={(hospitalPage + 1) * hospitalSize >= filteredHospitals.length} className="px-2 py-1 border rounded text-sm disabled:opacity-50" title="Tiếp">›</button>
                        <button onClick={() => setHospitalPage(Math.max(0, Math.ceil(filteredHospitals.length / hospitalSize) - 1))} disabled={(hospitalPage + 1) * hospitalSize >= filteredHospitals.length} className="px-2 py-1 border rounded text-sm disabled:opacity-50" title="Cuối">»</button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            filtered.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 p-8 text-center text-gray-600 dark:text-gray-400">
                Không có dữ liệu
              </div>
            ) : (
              <>
                {/* Bulk actions toolbar */}
                {selectedTaskIds.size > 0 && (
                  <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 flex items-center justify-between">
                    <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                      Đã chọn {selectedTaskIds.size} task
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedTaskIds(new Set())}
                        className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                      >
                        Bỏ chọn
                      </button>
                      <button
                        onClick={handleBulkComplete}
                        disabled={bulkCompleting}
                        className="px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {bulkCompleting ? (
                          <>
                            <span className="animate-spin">⏳</span>
                            <span>Đang xử lý...</span>
                          </>
                        ) : (
                          <>
                            
                            <span>Hoàn thành đã chọn</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Task list with checkboxes */}
                {filtered.map((row, idx) => {
                  const taskId = row.id;
                  const isSelected = selectedTaskIds.has(taskId);
                  const canComplete = canManage && (() => { 
                    try { 
                      const uidRaw = localStorage.getItem("userId") || sessionStorage.getItem("userId"); 
                      const uid = uidRaw ? Number(uidRaw) : 0; 
                      return uid > 0 && Number(row.picDeploymentId) === uid && row.status !== "COMPLETED"; 
                    } catch { 
                      return false; 
                    } 
                  })();
                  
                  return (
                    <div key={row.id}>
                      <TaskCardNew
                        task={row as unknown as ImplementationTaskResponseDTO}
                        idx={enableItemAnimation ? idx : undefined}
                        displayIndex={page * size + idx}
                        animate={enableItemAnimation}
                        onOpen={() => { setDetailItem(row); setDetailOpen(true); }}
                        onEdit={() => { setEditing(row); setModalOpen(true); }}
                        onDelete={(id: number) => { handleDelete(id); }}
                        canEdit={canManage && (() => { try { const uidRaw = localStorage.getItem("userId") || sessionStorage.getItem("userId"); const uid = uidRaw ? Number(uidRaw) : 0; return uid > 0 && Number(row.picDeploymentId) === uid; } catch { return false; } })()}
                        canDelete={canManage && (() => { try { const uidRaw = localStorage.getItem("userId") || sessionStorage.getItem("userId"); const uid = uidRaw ? Number(uidRaw) : 0; return uid > 0 && Number(row.picDeploymentId) === uid; } catch { return false; } })()}
                        leadingTopLeft={canComplete ? (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              const newSet = new Set(selectedTaskIds);
                              if (e.target.checked) newSet.add(taskId); else newSet.delete(taskId);
                              setSelectedTaskIds(newSet);
                            }}
                            className="w-4.5 h-4.5 text-blue-600 border-blue-300 rounded focus:ring-blue-500 shadow-sm bg-white"
                          />
                        ) : undefined}
                      />
                    </div>
                  );
                })}
              </>
            )
          )}
        </div>
      </div>

      {!showHospitalList && (
      <div className="mt-4 flex items-center justify-between py-3">
        <div className="text-sm text-gray-600">
          {totalCount === null || totalCount === 0 ? (
            <span>Hiển thị 0 trong tổng số 0 mục</span>
          ) : (
            (() => {
              const from = page * size + 1;
              const to = Math.min((page + 1) * size, totalCount);
              return <span>Hiển thị {from} đến {to} trong tổng số {totalCount} mục</span>;
            })()
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Hiển thị:</label>
            <select value={String(size)} onChange={(e) => { setSize(Number(e.target.value)); setPage(0); }} className="border rounded px-2 py-1 text-sm">
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
            </select>
          </div>

          <div className="inline-flex items-center gap-1">
            <button onClick={() => setPage(0)} disabled={page <= 0} className="px-2 py-1 border rounded text-sm disabled:opacity-50" title="Đầu">«</button>
            <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page <= 0} className="px-2 py-1 border rounded text-sm disabled:opacity-50" title="Trước">‹</button>

            {(() => {
              const total = Math.max(1, Math.ceil((totalCount || 0) / size));
              const pages: number[] = [];
              const start = Math.max(1, page + 1 - 2);
              const end = Math.min(total, start + 4);
              for (let i = start; i <= end; i++) pages.push(i);
              return pages.map((p) => (
                <button key={p} onClick={() => setPage(p - 1)} className={`px-3 py-1 border rounded text-sm ${page + 1 === p ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700'}`}>
                  {p}
                </button>
              ));
            })()}

            <button onClick={() => setPage((p) => Math.min(Math.max(0, Math.ceil((totalCount || 0) / size) - 1), p + 1))} disabled={totalCount !== null && (page + 1) * size >= (totalCount || 0)} className="px-2 py-1 border rounded text-sm disabled:opacity-50" title="Tiếp">›</button>
            <button onClick={() => setPage(Math.max(0, Math.ceil((totalCount || 0) / size) - 1))} disabled={totalCount !== null && (page + 1) * size >= (totalCount || 0)} className="px-2 py-1 border rounded text-sm disabled:opacity-50" title="Cuối">»</button>
          </div>
        </div>
      </div>
      )}

      {(() => {
        const initialForForm = editing
          ? ({
              id: (editing as ImplementationTaskResponseDTO).id,
              name: (editing as ImplementationTaskResponseDTO).name,
              hospitalId: (editing as ImplementationTaskResponseDTO).hospitalId ?? undefined,
              hospitalName: (editing as ImplementationTaskResponseDTO).hospitalName ?? null,
              picDeploymentId: (editing as ImplementationTaskResponseDTO).picDeploymentId ?? undefined,
              picDeploymentName: (editing as ImplementationTaskResponseDTO).picDeploymentName ?? null,
              apiTestStatus: (editing as ImplementationTaskResponseDTO).apiTestStatus ?? undefined,
              additionalRequest: (editing as ImplementationTaskResponseDTO).additionalRequest ?? undefined,
              deadline: (editing as ImplementationTaskResponseDTO).deadline ?? undefined,
              completionDate: (editing as ImplementationTaskResponseDTO).completionDate ?? undefined,
              status: (editing as ImplementationTaskResponseDTO).status ?? undefined,
              startDate: (editing as ImplementationTaskResponseDTO).startDate ?? undefined,
            } as Partial<ImplementationTaskRequestDTO> & { id?: number; hospitalName?: string | null; picDeploymentName?: string | null })
          : undefined;

        return (
          <TaskFormModal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            initial={initialForForm}
            onSubmit={handleSubmit}
            userTeam={userTeam}
          />
        );
      })()}

      <DetailModal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        item={detailItem}
      />
      {/* Pending tasks modal (Deployment acceptance for tasks created from Business) */}
      {pendingOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-black/40" onMouseDown={(e) => { if (e.target === e.currentTarget) setPendingOpen(false); }}>
          <div className="w-full max-w-4xl rounded-2xl bg-white dark:bg-gray-900 shadow-2xl border border-gray-200 dark:border-gray-800 overflow-auto max-h-[80vh]">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold">📨 Công việc chờ - Tiếp nhận từ Phòng Kinh Doanh</h3>
              <div className="flex items-center gap-2">
                <button 
                  className="h-10 rounded-xl px-4 text-sm font-medium transition shadow-sm bg-transparent border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                  onClick={() => { setPendingOpen(false); }}
                >
                  Đóng
                </button>
                <button 
                  className="h-10 rounded-xl px-4 text-sm font-medium transition shadow-sm border-blue-300 text-blue-600 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-400 dark:hover:bg-blue-900/20"
                  onClick={async () => { await fetchPendingGroups(); }}
                >
                  Làm mới
                </button>
              </div>
            </div>
            <div className="p-4">
              {loadingPending ? (
                <div className="text-center py-8">Đang tải...</div>
              ) : pendingGroups.length === 0 ? (
                <div className="text-center py-8">Không có công việc chờ</div>
              ) : (
                <>
                  <div className="mb-4 flex justify-end">
                    <Button 
                      variant="primary" 
                      onClick={handleAcceptAll} 
                      disabled={pendingGroups.reduce((sum, g) => sum + g.tasks.length, 0) === 0}
                      className="!bg-green-600 !text-white !border-green-600 hover:!bg-green-700 hover:!border-green-700 disabled:!bg-green-300 disabled:!border-green-300 disabled:!text-white"
                    >
                      Tiếp nhận tất cả ({pendingGroups.reduce((sum, g) => sum + g.tasks.length, 0)})
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {pendingGroups.map((g) => (
                      <div key={`${g.hospitalId ?? 'null'}-${g.hospitalName}`} className="border rounded-lg p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <div className="font-semibold text-base">
                          {g.hospitalName} <span className="text-sm text-gray-500 font-normal">({g.tasks.length} hợp đồng)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="primary" 
                            onClick={() => handleAcceptGroup(g.hospitalId)}
                            className="!bg-blue-600 !text-white !border-blue-600 hover:!bg-blue-700 hover:!border-blue-700 disabled:!bg-blue-300 disabled:!border-blue-300 disabled:!text-white"
                          >
                            Tiếp nhận
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImplementationTasksPage;
