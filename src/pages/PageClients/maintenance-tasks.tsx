import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import TaskCardNew from "../SuperAdmin/TaskCardNew";
import toast from "react-hot-toast";
import { FaHospital } from "react-icons/fa";
import { FiUser, FiLink, FiClock, FiTag, FiCheckCircle } from "react-icons/fi";



function PendingTasksModal({
    open,
    onClose,
    onAccept,
    list,
    loading,
}: {
    open: boolean;
    onClose: () => void;
    onAccept: (group: PendingTransferGroup) => Promise<void>;
    list: PendingTransferGroup[];
    loading: boolean;
}) {
    const [acceptingKey, setAcceptingKey] = useState<string | null>(null);

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="w-full max-w-3xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 p-6"
                onMouseDown={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        📨 Công việc chờ tiếp nhận
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                        ✕
                    </button>
                </div>

                {loading ? (
                    <div className="text-center text-gray-500 py-6">Đang tải...</div>
                ) : list.length === 0 ? (
                    <div className="text-center text-gray-500 py-6">
                        Không có công việc nào chờ tiếp nhận.
                    </div>
                ) : (
                    <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                        {list.map((group) => (
                            <div
                                key={group.key}
                                className="border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800 overflow-hidden"
                            >
                                <div className="flex items-center justify-between px-5 py-4">
                                    <div>
                                        <div className="font-semibold text-gray-900 dark:text-gray-100">
                                            {group.hospitalName || "Bệnh viện không xác định"}
                                        </div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400">
                                            {group.tasks.length} công việc chờ tiếp nhận
                                        </div>
                                    </div>
                                    <button
                                        onClick={async () => {
                                            setAcceptingKey(group.key);
                                            try {
                                                await onAccept(group);
                                            } finally {
                                                setAcceptingKey(null);
                                            }
                                        }}
                                        disabled={acceptingKey === group.key}
                                        className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-xl text-white
                             bg-gradient-to-r from-emerald-600 to-green-600
                             hover:from-emerald-500 hover:to-green-500
                             shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40
                             disabled:opacity-60 disabled:cursor-not-allowed"
                                    >
                                        {acceptingKey === group.key ? (
                                            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                                <circle className="opacity-25" cx="12" cy="12" r="10"
                                                    stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor"
                                                    d="M4 12a8 8 0 018-8v4A4 4 0 008 12H4z"></path>
                                            </svg>
                                        ) : (
                                            <FiCheckCircle className="w-4 h-4" />
                                        )}
                                        <span>Tiếp nhận tất cả</span>
                                    </button>
                                </div>
                                <div className="px-5 py-3 bg-gray-50 dark:bg-gray-800/60">
                                    <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                                        Danh sách công việc
                                    </div>
                                    <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                                        {group.tasks.map((task) => (
                                            <li key={task.id} className="flex items-center justify-between">
                                                <span className="truncate">{task.name || `Task #${task.id}`}</span>
                                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                                    {task.picDeploymentName ? `PIC: ${task.picDeploymentName}` : ""}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </motion.div>
        </div>
    );
}

// =====================
// Types khớp với BE DTOs
// =====================
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
    hardwareId?: number | null;
    endDate?: string | null; // ISO string từ LocalDateTime
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

type PendingTransferGroup = {
    key: string;
    hospitalId: number | null;
    hospitalName: string;
    tasks: ImplementationTaskResponseDTO[];
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
    deadline?: string | null; // ISO
    completionDate?: string | null; // ISO
    status?: string | null;
    startDate?: string | null;
    acceptanceDate?: string | null;
};

export type ImplementationTaskUpdateDTO = Partial<ImplementationTaskRequestDTO>;

type UserInfo = { id?: number; username?: string; team?: string; roles?: string[] } | null;

const API_ROOT = import.meta.env.VITE_API_URL || "http://localhost:8080";

// PageClients: admin area — always use admin endpoints
const apiBase = `${API_ROOT}/api/v1/admin/maintenance/tasks`;
const MIN_LOADING_MS = 2000;

function authHeaders(extra?: Record<string, string>) {
    const token = localStorage.getItem("access_token");
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

// Read from localStorage then sessionStorage (some flows store in session)
function readStored<T = unknown>(key: string): T | null {
    const raw = localStorage.getItem(key) ?? sessionStorage.getItem(key);
    if (!raw) return null;
    try {
        return JSON.parse(raw) as T;
    } catch {
        return null;
    }
}


function fmt(dt?: string | null) {
    if (!dt) return "";
    const d = new Date(dt);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString();
}
// mark fmt as referenced to avoid TS6133 in builds when this file does not use fmt directly
void fmt;

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
                "h-10 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 outline-none",
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

function isCompletedStatus(status?: string | null) {
    return normalizeStatus(status) === "COMPLETED";
}

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

// formatStt, PencilIcon, TrashIcon removed — using shared TaskCardNew for visuals/controls

/** ===========================
 *  RemoteSelect (autocomplete)
 *  =========================== */
function RemoteSelect({
    label,
    placeholder,
    fetchOptions,
    value,
    onChange,
    required,
}: {
    label: string;
    placeholder?: string;
    required?: boolean;
    fetchOptions: (q: string) => Promise<Array<{ id: number; name: string }>>;
    value: { id: number; name: string } | null;
    onChange: (v: { id: number; name: string } | null) => void;
}) {
    const [open, setOpen] = useState(false);
    const [q, setQ] = useState("");
    const [loading, setLoading] = useState(false);
    const [options, setOptions] = useState<Array<{ id: number; name: string }>>([]);
    const [highlight, setHighlight] = useState<number>(-1);

    // debounce search
    useEffect(() => {
        let alive = true;
        const t = setTimeout(async () => {
            setLoading(true);
            try {
                const res = await fetchOptions(q.trim());
                if (alive) setOptions(res);
            } finally {
                if (alive) setLoading(false);
            }
        }, 250);
        return () => {
            alive = false;
            clearTimeout(t);
        };
    }, [q, fetchOptions]);

    useEffect(() => {
        if (open) {
            // preload lần đầu
            if (!options.length && !q.trim()) {
                (async () => {
                    setLoading(true);
                    try {
                        const res = await fetchOptions("");
                        setOptions(res);
                    } finally {
                        setLoading(false);
                    }
                })();
            }
        }
    }, [open]); // eslint-disable-line

    return (
        <Field label={label} required={required}>
            <div className="relative">
                <input
                    className={clsx(
                        "h-10 w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 outline-none",
                        "focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
                    )}
                    placeholder={placeholder || "Gõ để tìm..."}
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
                {/* Nút xóa chọn */}
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
                        {loading && (
                            <div className="px-3 py-2 text-sm text-gray-500">Đang tải...</div>
                        )}
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
                                        // dùng mousedown để chọn trước khi input blur
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
    initial?: Partial<ImplementationTaskRequestDTO> & { id?: number; hospitalName?: string | null; picDeploymentName?: string | null };
    onSubmit: (payload: ImplementationTaskRequestDTO, id?: number) => Promise<void>;
    userTeam: string;
}) {
    // ===== Fetchers cho RemoteSelect =====
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
            // Lọc theo team dựa trên user đăng nhập
            if (userTeam === "MAINTENANCE") {
                params.set("team", "MAINTENANCE");
            } else if (userTeam === "DEPLOYMENT") {
                params.set("team", "DEPLOYMENT");
            }
            // Nếu SUPERADMIN, không lọc team để hiện tất cả
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

    // Thêm loaders giống dev-tasks cho Agency/HIS/Hardware
    // const searchAgencies = useMemo(
    //     () => async (term: string) => {
    //         const url = `${API_ROOT}/api/v1/admin/agencies/search?search=${encodeURIComponent(term)}`;
    //         const res = await fetch(url, { headers: authHeaders(), credentials: "include" });
    //         if (!res.ok) return [];
    //         const list = await res.json();
    //         const mapped = Array.isArray(list)
    //             ? list.map((a: { id?: number; label?: string; name?: string }) => ({ id: Number(a.id), name: String(a.label ?? a.name ?? a?.id) }))
    //             : [];
    //         return mapped.filter((x: { id: number; name: string }) => Number.isFinite(x.id) && x.name);
    //     },
    //     []
    // );

    // const searchHisSystems = useMemo(
    //     () => async (term: string) => {
    //         const url = `${API_ROOT}/api/v1/admin/his/search?search=${encodeURIComponent(term)}`;
    //         const res = await fetch(url, { headers: authHeaders(), credentials: "include" });
    //         if (!res.ok) return [];
    //         const list = await res.json();
    //         const mapped = Array.isArray(list)
    //             ? list.map((h: { id?: number; label?: string; name?: string }) => ({ id: Number(h.id), name: String(h.label ?? h.name ?? h?.id) }))
    //             : [];
    //         return mapped.filter((x: { id: number; name: string }) => Number.isFinite(x.id) && x.name);
    //     },
    //     []
    // );

    // const searchHardwares = useMemo(
    //     () => async (term: string) => {
    //         const url = `${API_ROOT}/api/v1/admin/hardware/search?search=${encodeURIComponent(term)}`;
    //         const res = await fetch(url, { headers: authHeaders(), credentials: "include" });
    //         if (!res.ok) return [];
    //         const list = await res.json();
    //         const mapped = Array.isArray(list)
    //             ? list.map((h: { id?: number; label?: string; name?: string }) => ({ id: Number(h.id), name: String(h.label ?? h.name ?? h?.id) }))
    //             : [];
    //         return mapped.filter((x: { id: number; name: string }) => Number.isFinite(x.id) && x.name);
    //     },
    //     []
    // );

    // Lấy thông tin user đang đăng nhập để tự động điền vào picDeployment khi tạo mới
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

    const [model, setModel] = useState<ImplementationTaskRequestDTO>(() => {
        const isNew = !(initial?.id);
        const nowIso = toLocalISOString(new Date());
        const normalizedStatus = normalizeStatus(initial?.status) ?? "RECEIVED";
        const completionDefault =
            normalizedStatus === "COMPLETED"
                ? (initial?.completionDate ?? nowIso)
                : (initial?.completionDate ?? "");
        const defaultPicId = Number(initial?.picDeploymentId) || (isNew ? currentUserId ?? 0 : 0);
        return {
            name: initial?.name || "",
            hospitalId: (initial?.hospitalId as number) || 0,
            picDeploymentId: defaultPicId,
            agencyId: initial?.agencyId ?? null,
            hisSystemId: initial?.hisSystemId ?? null,
            hardwareId: initial?.hardwareId ?? null,
            quantity: initial?.quantity ?? null,
            apiTestStatus: initial?.apiTestStatus ?? "",
            bhytPortCheckInfo: initial?.bhytPortCheckInfo ?? "",
            additionalRequest: initial?.additionalRequest ?? "",
            apiUrl: initial?.apiUrl ?? "",
            deadline: initial?.deadline ?? "",
            completionDate: completionDefault,
            status: normalizedStatus,
            startDate: initial?.startDate ?? (isNew ? nowIso : ""),
            acceptanceDate: initial?.acceptanceDate ?? "",
        };
    });

    // Lưu selection theo {id, name} để hiển thị tên
    const [hospitalOpt, setHospitalOpt] = useState<{ id: number; name: string } | null>(() => {
        const id = (initial?.hospitalId as number) || 0;
        const nm = (initial?.hospitalName as string) || "";
        return id ? { id, name: nm || String(id) } : null;
    });
    const [picOpt, setPicOpt] = useState<{ id: number; name: string } | null>(() => {
        const isNew = !initial?.id;
        const id = (initial?.picDeploymentId as number) || (isNew ? currentUserId ?? 0 : 0);
        const nm = (initial?.picDeploymentName as string) || (isNew ? currentUserName : "");
        return id ? { id, name: nm && nm.trim() ? nm : String(id) } : null;
    });

    const [agencyOpt, setAgencyOpt] = useState<{ id: number; name: string } | null>(() => {
        const id = (initial?.agencyId as number) || 0;
        return id ? { id, name: String(id) } : null;
    });
    const [hisOpt, setHisOpt] = useState<{ id: number; name: string } | null>(() => {
        const id = (initial?.hisSystemId as number) || 0;
        return id ? { id, name: String(id) } : null;
    });
    const [hardwareOpt, setHardwareOpt] = useState<{ id: number; name: string } | null>(() => {
        const id = (initial?.hardwareId as number) || 0;
        return id ? { id, name: String(id) } : null;
    });

    // These selection states are intentionally kept for future fields but may be unused
    // in some builds; reference them to avoid TS6133 (declared but never read).
    void agencyOpt;
    void setAgencyOpt;
    void hisOpt;
    void setHisOpt;
    void hardwareOpt;
    void setHardwareOpt;


    useEffect(() => {
        if (open) {
            const isNew = !(initial?.id);
            const nowIso = toLocalISOString(new Date());
            const normalizedStatus = normalizeStatus(initial?.status) ?? "RECEIVED";
            const completionDefault =
                normalizedStatus === "COMPLETED"
                    ? (initial?.completionDate ?? nowIso)
                    : (initial?.completionDate ?? "");
            const defaultPicId = Number(initial?.picDeploymentId) || (isNew ? currentUserId ?? 0 : 0);
            const defaultStart = initial?.startDate || (isNew ? nowIso : "");

            setModel({
                name: initial?.name || "",
                hospitalId: (initial?.hospitalId as number) || 0,
                picDeploymentId: defaultPicId,
                agencyId: initial?.agencyId ?? null,
                hisSystemId: initial?.hisSystemId ?? null,
                hardwareId: initial?.hardwareId ?? null,
                quantity: initial?.quantity ?? null,
                apiTestStatus: initial?.apiTestStatus ?? "",
                bhytPortCheckInfo: initial?.bhytPortCheckInfo ?? "",
                additionalRequest: initial?.additionalRequest ?? "",
                apiUrl: initial?.apiUrl ?? "",
                deadline: initial?.deadline ?? "",
                completionDate: completionDefault,
                status: normalizedStatus,
                startDate: defaultStart,
                acceptanceDate: initial?.acceptanceDate ?? "",
            });

            const hid = (initial?.hospitalId as number) || 0;
            const hnm = (initial?.hospitalName as string) || "";
            setHospitalOpt(hid ? { id: hid, name: hnm || String(hid) } : null);

            // Set picOpt: nếu là task mới và có currentUserId, dùng currentUser; ngược lại dùng từ initial
            if (isNew && currentUserId) {
                // Set với currentUserId, name sẽ được fetch bởi resolveById nếu chưa có
                setPicOpt({ id: currentUserId, name: currentUserName || String(currentUserId) });
            } else {
                const pid = (initial?.picDeploymentId as number) || 0;
                const pnm = (initial?.picDeploymentName as string) || "";
                if (pid) {
                    setPicOpt({ id: pid, name: pnm || String(pid) });
                } else {
                    setPicOpt(null);
                }
            }

            // Prefill các select phụ
            // const aid = (initial?.agencyId as number) || 0;
            // setAgencyOpt(aid ? { id: aid, name: String(aid) } : null);
            // const hid2 = (initial?.hisSystemId as number) || 0;
            // setHisOpt(hid2 ? { id: hid2, name: String(hid2) } : null);
            // const hwid = (initial?.hardwareId as number) || 0;
            // setHardwareOpt(hwid ? { id: hwid, name: String(hwid) } : null);
        }
    }, [open, initial]);

    // Khi sửa: resolve tên theo ID cho Agency/HIS/Hardware/Hospital/PIC nếu chỉ có ID
    useEffect(() => {
        if (!open) return;
        const isNewTask = !(initial?.id);
        
        async function resolveById(
            id: number | null | undefined,
            setOpt: (v: { id: number; name: string } | null) => void,
            detailPath: string,
            nameKeys: string[]
        ) {
            if (!id || id <= 0) return;

            const extractName = (payload: unknown): string | null => {
                const candidates: any[] = [];
                if (payload && typeof payload === "object") {
                    candidates.push(payload);
                    // @ts-ignore
                    if ((payload as any).data) candidates.push((payload as any).data);
                    // @ts-ignore
                    if ((payload as any).result) candidates.push((payload as any).result);
                }
                for (const obj of candidates) {
                    for (const k of nameKeys) {
                        const v = (obj as any)?.[k];
                        if (typeof v === "string" && v.trim()) return String(v);
                    }
                }
                return null;
            };

            // 1) Try detail endpoint
            try {
                const res = await fetch(`${API_ROOT}${detailPath}/${id}`, { headers: authHeaders(), credentials: "include" });
                if (res.ok) {
                    const obj = await res.json();
                    const name = extractName(obj);
                    if (name) {
                        setOpt({ id, name });
                        return;
                    }
                }
            } catch {
                /* ignore */
            }

            // 2) Try listing/search endpoint
            try {
                const res = await fetch(`${API_ROOT}${detailPath}?search=${encodeURIComponent(String(id))}&page=0&size=50`, { headers: authHeaders(), credentials: "include" });
                if (res.ok) {
                    const obj = await res.json();
                    const list = Array.isArray(obj?.content) ? obj.content : Array.isArray(obj) ? obj : [];
                    const found = list.find((it: any) => Number(it?.id) === Number(id));
                    if (found) {
                        const name = extractName(found) || String((found as any).name ?? (found as any).label ?? found[id]);
                        if (name) {
                            setOpt({ id, name });
                            return;
                        }
                    }
                }
            } catch {
                /* ignore */
            }

            // 3) Fallback: use existing search loaders
            // const fetcher = setOpt === setAgencyOpt ? searchAgencies : setOpt === setHisOpt ? searchHisSystems : searchHardwares;
            // const opts: Array<{ id: number; name: string }> = await fetcher("");
            // const found = opts.find((o: { id: number; name: string }) => o.id === id);
            // if (found) setOpt(found);
        }

        // Resolve cho Hospital & PIC
        resolveById((initial?.hospitalId as number) || null, setHospitalOpt, "/api/v1/admin/hospitals", ["name", "hospitalName", "label", "code"]);
        
        // Resolve PIC: 
        // - Nếu là task mới và có currentUserId: luôn fetch để đảm bảo có tên đầy đủ
        // - Nếu là task cũ: chỉ fetch khi có picDeploymentId
        if (isNewTask && currentUserId) {
            resolveById(currentUserId, setPicOpt, "/api/v1/admin/users", ["fullName", "fullname", "name", "username", "label"]);
        } else if (initial?.picDeploymentId) {
            resolveById((initial?.picDeploymentId as number) || null, setPicOpt, "/api/v1/admin/users", ["fullName", "fullname", "name", "username", "label"]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, initial, currentUserId]);

    // Đóng bằng phím ESC
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, onClose]);

    const [submitting, setSubmitting] = useState(false);

    if (!open) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!model.name?.trim()) { toast.error("Tên dự án không được để trống"); return; }
        if (!hospitalOpt?.id) { toast.error("Bệnh viện không được để trống"); return; }
        if (!picOpt?.id) { toast.error("Người phụ trách không được để trống"); return; }

        const normalizedStatus = normalizeStatus(model.status) ?? "RECEIVED";

        const isNew = !(initial?.id);
        const startDateRaw = model.startDate || (isNew ? toLocalISOString(new Date()) : "");
        const completionRaw = isCompletedStatus(normalizedStatus)
            ? (model.completionDate && String(model.completionDate).trim() ? model.completionDate : toLocalISOString(new Date()))
            : "";

        const payload: ImplementationTaskRequestDTO = {
            ...model,
            hospitalId: hospitalOpt.id,
            picDeploymentId: picOpt.id,
            status: normalizedStatus,
            deadline: toISOOrNull(model.deadline) || undefined,
            completionDate: completionRaw ? toISOOrNull(completionRaw) || undefined : undefined,
            startDate: toISOOrNull(startDateRaw) || undefined,
            acceptanceDate: toISOOrNull(model.acceptanceDate) || undefined,
        };

        try {
            setSubmitting(true);
            await onSubmit(payload, initial?.id);
            toast.success(initial?.id ? "Cập nhật thành công" : "Tạo mới thành công");
            onClose();
        } finally {
            setSubmitting(false);
        }
    };

    const lockHospital = !initial?.id && (Boolean(initial?.hospitalId) || Boolean(initial?.hospitalName));

    return (
        <>
            {/* Wrapper làm overlay + bắt click nền để đóng */}
            <div
                className="fixed inset-0 z-50 grid place-items-center p-4 bg-black/40"
                onMouseDown={(e) => {
                    // chỉ đóng khi click đúng nền (không phải click vào con bên trong)
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
                        onMouseDown={(e) => e.stopPropagation()} // chặn đóng khi click trong modal
                        role="dialog"
                        aria-modal="true"
                    >
                        {/* Thêm max-h & overflow để có thanh cuộn */}
                        <form onSubmit={handleSubmit} className="px-6 pt-0 pb-6 grid gap-4 max-h-[80vh] overflow-y-auto no-scrollbar">
                            <div className="sticky top-0 z-[100] -mx-3 px-3  bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
                                <div className="flex items-center justify-between py-3">
                                    <h3 className="text-lg font-semibold">{initial?.id ? (initial?.name || "") : "Tạo tác vụ"}</h3>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {(() => { return null; })()}
                                <Field label="Tên công việc" required>
                                    <TextInput
                                        value={model.name}
                                        onChange={(e) => setModel((s) => ({ ...s, name: e.target.value }))}
                                        placeholder="Nhập tên công việc"
                                    />
                                </Field>

                                {/* Bệnh viện theo TÊN */}
                                {lockHospital ? (
                                    <Field label="Bệnh viện" required>
                                        <div className="h-10 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 flex items-center">
                                            {hospitalOpt?.name || "-"}
                                        </div>
                                    </Field>
                                ) : (
                                    <RemoteSelect
                                        label="Bệnh viện"
                                        required
                                        placeholder="Nhập tên bệnh viện để tìm…"
                                        fetchOptions={searchHospitals}
                                        value={hospitalOpt}
                                        onChange={setHospitalOpt}
                                    />
                                )}

                                {/* PIC theo TÊN */}
                                <RemoteSelect
                                    label="Người làm"
                                    required
                                    placeholder="Nhập tên người phụ trách để tìm…"
                                    fetchOptions={searchPICs}
                                    value={picOpt}
                                    onChange={setPicOpt}
                                />

                                {/* Ẩn các trường nâng cao để đồng bộ với form triển khai */}
                                <Field label="Trạng thái" required>
                                    <select
                                        className={clsx(
                                            "h-10 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 outline-none",
                                            "focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
                                        )}
                                        value={model.status ?? ""}
                                        onChange={(e) => {
                                            const rawValue = (e.target as HTMLSelectElement).value || "";
                                            setModel((s) => {
                                                const prevNormalized = normalizeStatus(s.status);
                                                const nextNormalized = normalizeStatus(rawValue) ?? "RECEIVED";
                                                const nowIso = toLocalISOString(new Date());
                                                const becameCompleted = nextNormalized === "COMPLETED";
                                                const wasCompleted = prevNormalized === "COMPLETED";
                                                const nextCompletion = becameCompleted
                                                    ? (s.completionDate && s.completionDate.toString().trim() ? s.completionDate : nowIso)
                                                    : (!becameCompleted && wasCompleted ? "" : s.completionDate ?? "");
                                                return {
                                                    ...s,
                                                    status: nextNormalized,
                                                    completionDate: nextCompletion,
                                                };
                                            });
                                        }}
                                    >
                                        <option value="">— Chọn trạng thái —</option>
                                        {STATUS_OPTIONS.map((opt) => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </Field>
                                <Field label="Deadline (ngày)">
                                    <TextInput
                                        type="datetime-local"
                                        value={toDatetimeLocalInput(model.deadline)}
                                        onChange={(e) => setModel((s) => ({ ...s, deadline: e.target.value }))}
                                    />
                                </Field>
                                <Field label="Ngày bắt đầu">
                                    <TextInput
                                        type="datetime-local"
                                        value={toDatetimeLocalInput(model.startDate)}
                                        onChange={(e) => setModel((s) => ({ ...s, startDate: e.target.value }))}
                                    />
                                </Field>
                                <Field label="Ngày hoàn thành">
                                    <TextInput
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

                            <div className="flex items-center justify-end gap-3 pt-2">
                                <Button type="button" variant="ghost" onClick={onClose}>Hủy</Button>
                                <Button type="submit" disabled={submitting}>{submitting ? "Đang lưu..." : initial?.id ? "Cập nhật" : "Tạo mới"}</Button>
                            </div>
                        </form>
                    </motion.div>
                </AnimatePresence>
            </div>
        </>
    );
}

// Detail modal
// =====================
// DetailModal (phiên bản đẹp, đồng bộ UI)
// =====================
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

    const fmt = (d?: string | null) =>
        d ? new Date(d).toLocaleString("vi-VN") : "—";

    // Badge màu trạng thái
    const statusBadge = (status?: string | null) => {
        const s = (status || "").toUpperCase();
        const base = "px-3 py-1 text-xs font-medium rounded-full whitespace-nowrap";
        switch (s) {
            case "NOT_STARTED":
                return `${base} bg-gray-100 text-gray-800`;
            case "IN_PROGRESS":
                return `${base} bg-yellow-100 text-yellow-800`;
            case "API_TESTING":
                return `${base} bg-blue-100 text-blue-800`;
            case "INTEGRATING":
                return `${base} bg-red-100 text-red-700`;
            case "WAITING_FOR_DEV":
            case "ACCEPTED":
                return `${base} bg-green-100 text-green-700`;
            default:
                return `${base} bg-gray-100 text-gray-800`;
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="w-full max-w-4xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 p-6"
                onMouseDown={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-gray-800">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        📋 Chi tiết tác vụ bảo trì
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-3">
                        <Info icon={<FiTag />} label="Tên" value={item.name} />
                        <Info icon={<FaHospital />} label="Bệnh viện" value={item.hospitalName} />
                        <Info icon={<FiUser />} label="Người làm" value={item.picDeploymentName} />
                        <Info icon={<FiUser />} label="Tiếp nhận bởi" value={item.receivedByName || "—"} />

                        <Info
                            icon={<FiTag />}
                            label="Trạng thái"
                            value={(
                                <span className={`inline-flex px-3 py-1 text-xs font-medium rounded-full ${statusBadge(item.status)}`}>
                                    {statusLabel(item.status)}
                                </span>
                            )}
                        />

                        <Info
                            icon={<FiLink />}
                            label="API URL"
                            stacked
                            value={
                                item.apiUrl ? (
                                    <a href={item.apiUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline break-words">
                                        {item.apiUrl}
                                    </a>
                                ) : (
                                    "—"
                                )
                            }
                        />
                        <Info icon={<FiTag />} label="API Test" value={item.apiTestStatus || "—"} />
                        <Info icon={<FiTag />} label="Số lượng" value={item.quantity ?? "—"} />
                        <Info icon={<FiClock />} label="Deadline" value={fmt(item.deadline)} />
                        <Info icon={<FiClock />} label="Ngày bắt đầu" value={fmt(item.startDate)} />
                        <Info icon={<FiClock />} label="Ngày nghiệm thu" value={fmt(item.acceptanceDate)} />
                        <Info icon={<FiClock />} label="Ngày hoàn thành" value={fmt(item.completionDate)} />
                        <Info icon={<FiClock />} label="Tạo lúc" value={fmt(item.createdAt)} />
                        <Info icon={<FiClock />} label="Cập nhật lúc" value={fmt(item.updatedAt)} />
                    </div>

                    {/* Additional request */}
                    <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
                        <p className="text-gray-500 mb-2">Yêu cầu bổ sung:</p>
                        <div className="rounded-xl bg-gray-50 dark:bg-gray-800/60 p-3 text-gray-800 dark:text-gray-300 min-h-[60px]">
                            {item.additionalRequest || "—"}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end px-6 py-4 border-t border-gray-200 dark:border-gray-800 bg-gray-10 dark:bg-gray-800/40">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg text-sm font-medium text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                    >
                        Đóng
                    </button>
                </div>
            </motion.div>
        </div>
    );
}


// Sub component cho label + value
// 🔹 Helper cho hiển thị gọn gàng (icon, label, value, stacked for long text)
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
        // keep the same left columns (icon + fixed label width) so rows align vertically
        return (
            <div className="flex items-start gap-3">
                {icon && <div className="min-w-[36px] flex items-center justify-center text-gray-500">{icon}</div>}
                <div className="flex-1">
                    <div className="min-w-[140px] font-semibold text-gray-900 dark:text-gray-100">{label}</div>
                    <div className="mt-1 text-gray-700 dark:text-gray-300 text-sm break-words">{value ?? "—"}</div>
                </div>
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
    const searchDebounce = useRef<number | null>(null);
    const [pendingTasks, setPendingTasks] = useState<PendingTransferGroup[]>([]);
    const [pendingOpen, setPendingOpen] = useState(false);
    const [loadingPending, setLoadingPending] = useState(false);
    // hospital list view state (like implementation-tasks page)
    const [showHospitalList, setShowHospitalList] = useState<boolean>(true);
    const [hospitalsWithTasks, setHospitalsWithTasks] = useState<Array<{
        id: number;
        label: string;
        subLabel?: string;
        taskCount: number;
        acceptedCount: number;
        nearDueCount?: number;
        overdueCount?: number;
        fromDeployment?: boolean;
        acceptedByMaintenance?: boolean;
    }>>([]);
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

    const currentUser = useMemo<UserInfo>(() => readStored<UserInfo>("user"), []);
    const roles = useMemo<string[]>(() => {
        const r = readStored<string[]>("roles");
        return Array.isArray(r) ? r : [];
    }, []);
    const isSuperAdmin = roles.includes("SUPERADMIN");
    const userTeam = (currentUser?.team || "").toString().toUpperCase();

    const filtered = useMemo(() => data, [data]);
    const [completedCount, setCompletedCount] = useState<number | null>(null);
    
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
            setData(items);
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
    const fetchPendingTasks = useCallback(async () => {
        setLoadingPending(true);
        try {
            const res = await fetch(`${API_ROOT}/api/v1/admin/maintenance/pending`, {
                headers: authHeaders(),
                credentials: "include",
            });
            if (!res.ok) throw new Error("Không thể tải danh sách chờ tiếp nhận");
            const list = await res.json();
            const arrayList: ImplementationTaskResponseDTO[] = Array.isArray(list) ? list : [];

            const grouped = new Map<string, PendingTransferGroup>();
            for (const task of arrayList) {
                const hospitalId = task?.hospitalId ?? null;
                const hospitalName = (task?.hospitalName || task?.name || "Bệnh viện không xác định").toString();
                const key = hospitalId !== null ? `id-${hospitalId}` : `name-${hospitalName}`;

                if (!grouped.has(key)) {
                    grouped.set(key, {
                        key,
                        hospitalId,
                        hospitalName,
                        tasks: [],
                    });
                }
                grouped.get(key)!.tasks.push(task);
            }

            const groupedList = Array.from(grouped.values()).sort((a, b) =>
                a.hospitalName.localeCompare(b.hospitalName, "vi", { sensitivity: "base" }),
            );
            setPendingTasks(groupedList);
        } catch (e: any) {
            toast.error(e.message);
            setPendingTasks([]);
        } finally {
            setLoadingPending(false);
        }
    }, []);

    const handleAcceptPendingGroup = async (group: PendingTransferGroup) => {
        if (!group || !group.tasks?.length) {
            toast.error("Không có công việc nào để tiếp nhận.");
            return;
        }

        const failures: string[] = [];
        let success = 0;

        for (const task of group.tasks) {
            if (!task?.id) continue;
            try {
                const res = await fetch(`${API_ROOT}/api/v1/admin/maintenance/accept/${task.id}`, {
                    method: "PUT",
                    headers: authHeaders(),
                    credentials: "include",
                });
                if (!res.ok) {
                    const text = await res.text().catch(() => null);
                    failures.push(text || `Task ${task.id} (${res.status})`);
                } else {
                    success += 1;
                }
            } catch (err: any) {
                failures.push(err?.message || String(err));
            }
        }

        if (failures.length === 0) {
            toast.success(`Đã tiếp nhận ${success} công việc của ${group.hospitalName}.`);
            setPendingTasks((prev) => prev.filter((item) => item.key !== group.key));
            await fetchList();
            await fetchHospitalsWithTasks();
        } else {
            toast.error(`Tiếp nhận thất bại. Bạn không có quyền tiếp nhận công việc này.`);
            await fetchPendingTasks();
        }
    };

    // Initial: load hospital list instead of tasks
    useEffect(() => {
        fetchHospitalsWithTasks();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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
            const res = await fetch(`${API_ROOT}/api/v1/admin/maintenance/tasks/bulk-complete`, {
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

    // Fetch pending tasks on mount so the badge shows without requiring a click.
    // Also refresh periodically (every 60s) to keep the count up-to-date.
    useEffect(() => {
        fetchPendingTasks();
        const timer = window.setInterval(() => {
            fetchPendingTasks();
        }, 40000);
        return () => window.clearInterval(timer);
    }, [fetchPendingTasks]);

    async function fetchHospitalOptions(q: string) {
        try {
            const res = await fetch(`${API_ROOT}/api/v1/admin/hospitals/search?name=${encodeURIComponent(q || "")}`, { headers: authHeaders() });
            if (!res.ok) return;
            const list = await res.json();
            if (Array.isArray(list)) setHospitalOptions(list.map((h: any) => ({ id: Number(h.id), label: String(h.label ?? h.name ?? "") })));
        } catch { /* ignore */ }
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
            // Fetch summary để lấy thông tin từ deployment và các bệnh viện đã accept
            const summaryEndpoint = `${API_ROOT}/api/v1/admin/maintenance/hospitals/summary`;
            const summaryRes = await fetch(summaryEndpoint, {
                method: "GET",
                headers: authHeaders(),
                credentials: "include",
            });
            if (!summaryRes.ok) throw new Error(`Failed to fetch hospitals summary: ${summaryRes.status}`);
            const summaryPayload = await summaryRes.json();
            const summaries = Array.isArray(summaryPayload) ? summaryPayload : [];
            
            // Fetch tất cả maintenance tasks để đếm COMPLETED tasks
            const tasksParams = new URLSearchParams({ page: "0", size: "2000", sortBy: "id", sortDir: "asc" });
            const tasksEndpoint = `${API_ROOT}/api/v1/admin/maintenance/tasks?${tasksParams.toString()}`;
            const tasksRes = await fetch(tasksEndpoint, {
                method: "GET",
                headers: authHeaders(),
                credentials: "include",
            });
            if (!tasksRes.ok) throw new Error(`Failed to fetch maintenance tasks: ${tasksRes.status}`);
            const tasksPayload = await tasksRes.json();
            const tasks: ImplementationTaskResponseDTO[] = Array.isArray(tasksPayload?.content) ? tasksPayload.content : Array.isArray(tasksPayload) ? tasksPayload : [];

            // Aggregate tasks by hospital để đếm taskCount và acceptedCount (COMPLETED)
            const tasksByHospital = new Map<number, { taskCount: number; acceptedCount: number; nearDueCount: number; overdueCount: number }>();
            for (const task of tasks) {
                const hospitalId = typeof task.hospitalId === "number" ? task.hospitalId : task.hospitalId != null ? Number(task.hospitalId) : null;
                if (!hospitalId) continue;
                
                const current = tasksByHospital.get(hospitalId) || { taskCount: 0, acceptedCount: 0, nearDueCount: 0, overdueCount: 0 };
                current.taskCount += 1;
                const taskStatus = normalizeStatus(task.status);
                if (taskStatus === 'COMPLETED') {
                    current.acceptedCount += 1;
                }
                // Count near due / overdue for non-completed
                if (taskStatus !== 'COMPLETED' && task.deadline) {
                    const d = new Date(task.deadline);
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
                tasksByHospital.set(hospitalId, current);
            }

            // Merge summary với task counts
            const normalized = summaries.map((item: any, idx: number) => {
                const hospitalId = Number(item?.hospitalId ?? -(idx + 1));
                const taskStats = tasksByHospital.get(hospitalId) || { taskCount: 0, acceptedCount: 0, nearDueCount: 0, overdueCount: 0 };
                return {
                    id: hospitalId,
                    label: String(item?.hospitalName ?? "—"),
                    subLabel: item?.province ? String(item.province) : "",
                    taskCount: taskStats.taskCount > 0 ? taskStats.taskCount : Number(item?.maintenanceTaskCount ?? 0),
                    acceptedCount: taskStats.acceptedCount, // Số task COMPLETED
                    nearDueCount: taskStats.nearDueCount,
                    overdueCount: taskStats.overdueCount,
                    fromDeployment: Boolean(item?.transferredFromDeployment),
                    acceptedByMaintenance: Boolean(item?.acceptedByMaintenance),
                };
            });

            // Thêm các bệnh viện có tasks nhưng không có trong summary (nếu có)
            for (const [hospitalId, taskStats] of tasksByHospital.entries()) {
                if (!normalized.find(h => h.id === hospitalId)) {
                    // Cần fetch thông tin hospital từ tasks
                    const hospitalTask = tasks.find(t => {
                        const tid = typeof t.hospitalId === "number" ? t.hospitalId : t.hospitalId != null ? Number(t.hospitalId) : null;
                        return tid === hospitalId;
                    });
                    if (hospitalTask) {
                        normalized.push({
                            id: hospitalId,
                            label: String(hospitalTask.hospitalName ?? "—"),
                            subLabel: "",
                            taskCount: taskStats.taskCount,
                            acceptedCount: taskStats.acceptedCount,
                            nearDueCount: taskStats.nearDueCount,
                            overdueCount: taskStats.overdueCount,
                            fromDeployment: false,
                            acceptedByMaintenance: false,
                        });
                    }
                }
            }

            setHospitalsWithTasks((prev) => {
                const prevMap = new Map(prev.map((entry) => [entry.id, entry]));
                const merged = normalized.map((entry) => {
                    const prevEntry = prevMap.get(entry.id);
                    return {
                        ...entry,
                        // Giữ lại fromDeployment nếu đã có từ trước, hoặc từ API response
                        fromDeployment: entry.fromDeployment || prevEntry?.fromDeployment || false,
                        acceptedByMaintenance: entry.acceptedByMaintenance || prevEntry?.acceptedByMaintenance || false,
                    };
                });
                // Hiển thị tất cả bệnh viện có task, hoặc đã được accept từ triển khai, hoặc đang chờ tiếp nhận từ triển khai
                return merged.filter((h) => h.acceptedByMaintenance || h.taskCount > 0 || h.fromDeployment);
            });
        } catch (e: any) {
            setError(e.message || "Lỗi tải danh sách bệnh viện");
            setHospitalsWithTasks([]);
        } finally {
            setLoadingHospitals(false);
        }
    }

    const filteredHospitals = useMemo(() => {
        let list = hospitalsWithTasks;
        const q = hospitalSearch.trim().toLowerCase();
        if (q) list = list.filter(h => h.label.toLowerCase().includes(q) || (h.subLabel || '').toLowerCase().includes(q));
        if (hospitalStatusFilter === 'accepted') list = list.filter(h => h.acceptedByMaintenance);
        else if (hospitalStatusFilter === 'incomplete') list = list.filter(h => (h.acceptedCount || 0) < (h.taskCount || 0));
        else if (hospitalStatusFilter === 'unaccepted') list = list.filter(h => !h.acceptedByMaintenance);

        const dir = hospitalSortDir === 'desc' ? -1 : 1;
        list = [...list].sort((a, b) => {
            if (hospitalSortBy === 'taskCount') return ((a.taskCount || 0) - (b.taskCount || 0)) * dir;
            if (hospitalSortBy === 'accepted') return ((Number(Boolean(a.acceptedByMaintenance)) - Number(Boolean(b.acceptedByMaintenance)))) * dir;
            if (hospitalSortBy === 'ratio') {
                const ra = (a.taskCount || 0) > 0 ? (a.acceptedCount || 0) / (a.taskCount || 1) : Number(Boolean(a.acceptedByMaintenance));
                const rb = (b.taskCount || 0) > 0 ? (b.acceptedCount || 0) / (b.taskCount || 1) : Number(Boolean(b.acceptedByMaintenance));
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
                    const incAccepted = isCompletedStatus((payload as any)?.status) ? 1 : 0;
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

    return (
        <div className="p-6 xl:p-10">
            <div className="mb-6 flex items-center justify-between">
                <h1 className="text-3xl font-extrabold">{showHospitalList ? "Danh sách bệnh viện có task bảo trì" : `Danh sách công việc bảo trì - ${selectedHospital}`}</h1>
                {!showHospitalList && (
                    <button onClick={() => { setSelectedHospital(null); setShowHospitalList(true); setSearchTerm(""); setStatusFilter(""); setPage(0); setData([]); fetchHospitalsWithTasks(); }} className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 text-sm font-medium">← Quay lại danh sách bệnh viện</button>
                )}
            </div>

            {error && <div className="text-red-600 mb-4">{error}</div>}

            {!showHospitalList && (
            <div className="mb-6 rounded-2xl border bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 p-5 shadow-sm">
                <div className="flex items-start gap-4">
                   <div className="flex-1 min-w-[320px]">
                        <h3 className="text-lg font-semibold mb-3 ">Tìm kiếm & Thao tác</h3>
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
                                    onBlur={() => { /* keep search */ }}
                                />
                                <datalist id="hospital-list">
                                    {hospitalOptions.map((h) => (
                                        <option key={h.id} value={h.label} />
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

                    <div className="flex flex-wrap items-center gap-3 ml-auto justify-end">
                        {/* Sort */}
                        <div className="flex items-center gap-2">
                            <select
                                className="rounded-lg border px-3 py-2 text-sm border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
                                value={sortBy}
                                onChange={(e) => { setSortBy(e.target.value); setPage(0); }}
                            >
                                <option value="createdAt">Sắp xếp theo: ngày tạo</option>
                                <option value="id">Sắp xếp theo: id</option>
                                <option value="hospitalName">Sắp xếp theo: bệnh viện</option>
                                <option value="deadline">Sắp xếp theo: deadline</option>
                            </select>
                            <select
                                className="rounded-lg border px-3 py-2 text-sm border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
                                value={sortDir}
                                onChange={(e) => setSortDir(e.target.value)}
                            >
                                <option value="asc">Tăng dần</option>
                                <option value="desc">Giảm dần</option>
                            </select>
                        </div>

                        {/* Thêm mới */}
                        {isSuperAdmin || userTeam === "MAINTENANCE" ? (
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
                            <button
                                disabled
                                className="rounded-xl bg-gray-200 text-gray-500 px-5 py-2 shadow-sm flex items-center gap-2"
                                title="Không có quyền"
                            >
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
                                        <Button
                                            variant="ghost"
                                            className="relative flex items-center gap-2 border border-blue-200 text-blue-600 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-300"
                                            onClick={() => { setPendingOpen(true); fetchPendingTasks(); }}
                                        >
                                            📨 Công việc chờ
                                            {pendingTasks.length > 0 && (
                                                <span className="absolute -top-1 -right-2 bg-red-600 text-white text-xs rounded-full px-2 py-0.5">
                                                    {pendingTasks.length}
                                                </span>
                                            )}
                                        </Button>
                                        {(isSuperAdmin || userTeam === "MAINTENANCE") && (
                                            <button
                                                className="rounded-xl bg-blue-600 text-white px-5 py-2 shadow hover:bg-blue-700"
                                                onClick={() => { setEditing(null); setModalOpen(true); }}
                                                type="button"
                                            >
                                                + Thêm task mới
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                            {loadingHospitals ? (
                                <div className="flex items-center justify-center py-12">
                                    <div className="text-blue-600 text-4xl font-extrabold tracking-wider animate-pulse" aria-hidden="true">TAG</div>
                                </div>
                            ) : filteredHospitals.length === 0 ? (
                                <div className="px-4 py-6 text-center text-gray-500">Không có bệnh viện nào có task</div>
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
                                                        <tr key={hospital.id || `${hospital.label}-${index}`} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => { setSelectedHospital(hospital.label); setShowHospitalList(false); setPage(0); }}>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{hospitalPage * hospitalSize + index + 1}</td>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                                                                        <FaHospital className="text-blue-600 text-lg" />
                                                                    </div>
                                                                    <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                                                                        <span>{hospital.label}</span>
                                                                        {hospital.fromDeployment && !hospital.acceptedByMaintenance && (
                                                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">
                                                                                Từ triển khai
                                                                            </span>
                                                                        )}
                                                                        {hospital.fromDeployment && hospital.acceptedByMaintenance && (
                                                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                                                                                Nhận từ triển khai
                                                                            </span>
                                                                        )}
                                                                    </div>
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
                                                                <button onClick={(e) => { e.stopPropagation(); setSelectedHospital(hospital.label); setShowHospitalList(false); setPage(0); }} className="text-blue-600 hover:text-blue-800 font-medium">Xem task</button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                    <div className="mt-4 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <button className="px-3 py-1 border rounded" onClick={() => setHospitalPage((p) => Math.max(0, p - 1))} disabled={hospitalPage <= 0}>Prev</button>
                                            <span className="text-sm">Trang {hospitalPage + 1} / {Math.max(1, Math.ceil(filteredHospitals.length / hospitalSize))}</span>
                                            <button className="px-3 py-1 border rounded" onClick={() => setHospitalPage((p) => p + 1)} disabled={(hospitalPage + 1) * hospitalSize >= filteredHospitals.length}>Next</button>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <label className="text-sm">Số hàng:</label>
                                            <select value={String(hospitalSize)} onChange={(e) => { setHospitalSize(Number(e.target.value)); setHospitalPage(0); }} className="border rounded px-2 py-1 text-sm">
                                                <option value="10">10</option>
                                                <option value="20">20</option>
                                                <option value="50">50</option>
                                                <option value="100">100</option>
                                            </select>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    ) : (
                        filtered.length === 0 ? (
                            <div className="px-4 py-6 text-center text-gray-500">Không có dữ liệu</div>
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
                                                        <span>✓</span>
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
                                    const canComplete = (isSuperAdmin || userTeam === "MAINTENANCE") && (() => { 
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
                                                task={row as any}
                                                idx={enableItemAnimation ? idx : undefined}
                                                displayIndex={page * size + idx}
                                                animate={enableItemAnimation}
                                                statusLabelOverride={statusLabel}
                                                statusClassOverride={statusBadgeClasses}
                                                onOpen={() => { setDetailItem(row); setDetailOpen(true); }}
                                                onEdit={() => { setEditing(row); setModalOpen(true); }}
                                                onDelete={(id: number) => { handleDelete(id); }}
                                                canEdit={(isSuperAdmin || userTeam === "MAINTENANCE") && (() => { try { const uidRaw = localStorage.getItem("userId") || sessionStorage.getItem("userId"); const uid = uidRaw ? Number(uidRaw) : 0; return uid > 0 && Number(row.picDeploymentId) === uid; } catch { return false; } })()}
                                                canDelete={(isSuperAdmin || userTeam === "MAINTENANCE") && (() => { try { const uidRaw = localStorage.getItem("userId") || sessionStorage.getItem("userId"); const uid = uidRaw ? Number(uidRaw) : 0; return uid > 0 && Number(row.picDeploymentId) === uid; } catch { return false; } })()}
                                                leadingTopLeft={canComplete ? (
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={(e) => {
                                                            const newSet = new Set(selectedTaskIds);
                                                            if (e.target.checked) newSet.add(taskId); else newSet.delete(taskId);
                                                            setSelectedTaskIds(newSet);
                                                        }}
                                                        className="w-4.5 h-4.5 text-blue-600 border-blue-600 rounded focus:ring-blue-500 shadow-sm bg-white"
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
            <div className="mt-4 flex items-center justify-between">
                {/* Trái: phân trang */}
                <div className="flex items-center gap-2">
                    <button className="px-3 py-1 border rounded inline-flex items-center gap-2"
                        onClick={() => setPage((p) => Math.max(0, p - 1))}
                        disabled={page <= 0}>
                        <ChevronLeftIcon />
                        <span>Prev</span>
                    </button>
                    <span>Trang {page + 1}{totalCount ? ` / ${Math.max(1, Math.ceil((totalCount || 0) / size))}` : ""}</span>
                    <button className="px-3 py-1 border rounded inline-flex items-center gap-2"
                        onClick={() => setPage((p) => p + 1)}
                        disabled={totalCount !== null && (page + 1) * size >= (totalCount || 0)}>
                        <span>Next</span>
                        <ChevronRightIcon />
                    </button>
                </div>

                {/* Phải: nút Công việc chờ + chọn size */}
                <div className="flex items-center gap-3">

                    <div className="flex items-center gap-2">
                        <label className="text-sm">Số hàng:</label>
                        <select
                            value={String(size)}
                            onChange={(e) => { setSize(Number(e.target.value)); setPage(0); }}
                            className="border rounded px-2 py-1"
                        >
                            <option value="5">5</option>
                            <option value="10">10</option>
                            <option value="20">20</option>
                            <option value="50">50</option>
                        </select>
                    </div>
                </div>
            </div>
            )}

            <PendingTasksModal
                open={pendingOpen}
                onClose={() => setPendingOpen(false)}
                onAccept={handleAcceptPendingGroup}
                list={pendingTasks}
                loading={loadingPending}
            />

            <TaskFormModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                initial={editing as any || undefined}
                onSubmit={handleSubmit}
                userTeam={userTeam}
            />

            <DetailModal open={detailOpen} onClose={() => setDetailOpen(false)} item={detailItem} />
        </div>
    );
};

export default ImplementationTasksPage;
