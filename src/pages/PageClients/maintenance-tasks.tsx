import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import TaskCardNew from "../SuperAdmin/TaskCardNew";
import toast from "react-hot-toast";
import { useCallback } from "react";


function PendingTasksModal({
    open,
    onClose,
    onAccept,
    list,
    loading,
}: {
    open: boolean;
    onClose: () => void;
    onAccept: (id: number) => Promise<void>;
    list: ImplementationTaskResponseDTO[];
    loading: boolean;
}) {
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
                        {list.map((t) => (
                            <div
                                key={t.id}
                                className="flex justify-between items-center border border-gray-200 dark:border-gray-700 rounded-xl p-4"
                            >
                                <div>
                                    <div className="font-semibold text-gray-900 dark:text-gray-100">
                                        {t.hospitalName || t.name}
                                    </div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">
                                        Người triển khai: {t.picDeploymentName || "-"}
                                    </div>
                                </div>
                                <button
                                    onClick={() => onAccept(t.id)}
                                    className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
                                >
                                    ✅ Tiếp nhận
                                </button>
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

function toISOOrNull(v?: string | Date | null) {
    if (!v) return null;
    try {
        return typeof v === "string" ? (v.trim() ? new Date(v).toISOString() : null) : v.toISOString();
    } catch {
        return null;
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

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
    { value: "NOT_STARTED", label: "Chưa triển khai" },
    { value: "IN_PROGRESS", label: "Đang triển khai" },
    { value: "API_TESTING", label: "Test thông api" },
    { value: "INTEGRATING", label: "Tích hợp với viện" },
    { value: "WAITING_FOR_DEV", label: "Chờ dev build update" },
    { value: "ACCEPTED", label: "Nghiệm thu" },
];


function statusLabel(status?: string | null) {
    switch (status) {
        case "NOT_STARTED":
            return "Chưa triển khai";
        case "IN_PROGRESS":
            return "Đang triển khai";
        case "API_TESTING":
            return "Test thông api";
        case "INTEGRATING":
            return "Tích hợp với viện";
        case "WAITING_FOR_DEV":
            return "Chờ dev build update";
        case "ACCEPTED":
            return "Nghiệm thu";
        default:
            return status || "";
    }
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

// formatStt, statusBadgeClasses, PencilIcon, TrashIcon removed — using shared TaskCardNew for visuals/controls

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
}: {
    open: boolean;
    onClose: () => void;
    initial?: Partial<ImplementationTaskRequestDTO> & { id?: number; hospitalName?: string | null; picDeploymentName?: string | null };
    onSubmit: (payload: ImplementationTaskRequestDTO, id?: number) => Promise<void>;
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
            const url = `${API_ROOT}/api/v1/admin/users/search?name=${encodeURIComponent(term)}`;
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
        []
    );

    // Thêm loaders giống dev-tasks cho Agency/HIS/Hardware
    const searchAgencies = useMemo(
        () => async (term: string) => {
            const url = `${API_ROOT}/api/v1/admin/agencies/search?search=${encodeURIComponent(term)}`;
            const res = await fetch(url, { headers: authHeaders(), credentials: "include" });
            if (!res.ok) return [];
            const list = await res.json();
            const mapped = Array.isArray(list)
                ? list.map((a: { id?: number; label?: string; name?: string }) => ({ id: Number(a.id), name: String(a.label ?? a.name ?? a?.id) }))
                : [];
            return mapped.filter((x: { id: number; name: string }) => Number.isFinite(x.id) && x.name);
        },
        []
    );

    const searchHisSystems = useMemo(
        () => async (term: string) => {
            const url = `${API_ROOT}/api/v1/admin/his/search?search=${encodeURIComponent(term)}`;
            const res = await fetch(url, { headers: authHeaders(), credentials: "include" });
            if (!res.ok) return [];
            const list = await res.json();
            const mapped = Array.isArray(list)
                ? list.map((h: { id?: number; label?: string; name?: string }) => ({ id: Number(h.id), name: String(h.label ?? h.name ?? h?.id) }))
                : [];
            return mapped.filter((x: { id: number; name: string }) => Number.isFinite(x.id) && x.name);
        },
        []
    );

    const searchHardwares = useMemo(
        () => async (term: string) => {
            const url = `${API_ROOT}/api/v1/admin/hardware/search?search=${encodeURIComponent(term)}`;
            const res = await fetch(url, { headers: authHeaders(), credentials: "include" });
            if (!res.ok) return [];
            const list = await res.json();
            const mapped = Array.isArray(list)
                ? list.map((h: { id?: number; label?: string; name?: string }) => ({ id: Number(h.id), name: String(h.label ?? h.name ?? h?.id) }))
                : [];
            return mapped.filter((x: { id: number; name: string }) => Number.isFinite(x.id) && x.name);
        },
        []
    );

    const [model, setModel] = useState<ImplementationTaskRequestDTO>(() => ({
        name: initial?.name || "",
        hospitalId: (initial?.hospitalId as number) || 0,
        picDeploymentId: (initial?.picDeploymentId as number) || 0,
        agencyId: initial?.agencyId ?? null,
        hisSystemId: initial?.hisSystemId ?? null,
        hardwareId: initial?.hardwareId ?? null,
        quantity: initial?.quantity ?? null,
        apiTestStatus: initial?.apiTestStatus ?? "",
        bhytPortCheckInfo: initial?.bhytPortCheckInfo ?? "",
        additionalRequest: initial?.additionalRequest ?? "",
        apiUrl: initial?.apiUrl ?? "",
        deadline: initial?.deadline ?? "",
        completionDate: initial?.completionDate ?? "",
        status: initial?.status ?? "",
        startDate: initial?.startDate ?? "",
        acceptanceDate: initial?.acceptanceDate ?? "",
    }));

    // Lưu selection theo {id, name} để hiển thị tên
    const [hospitalOpt, setHospitalOpt] = useState<{ id: number; name: string } | null>(() => {
        const id = (initial?.hospitalId as number) || 0;
        const nm = (initial?.hospitalName as string) || "";
        return id ? { id, name: nm || String(id) } : null;
    });
    const [picOpt, setPicOpt] = useState<{ id: number; name: string } | null>(() => {
        const id = (initial?.picDeploymentId as number) || 0;
        const nm = (initial?.picDeploymentName as string) || "";
        return id ? { id, name: nm || String(id) } : null;
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

    useEffect(() => {
        if (open) {
            setModel({
                name: initial?.name || "",
                hospitalId: (initial?.hospitalId as number) || 0,
                picDeploymentId: (initial?.picDeploymentId as number) || 0,
                agencyId: initial?.agencyId ?? null,
                hisSystemId: initial?.hisSystemId ?? null,
                hardwareId: initial?.hardwareId ?? null,
                quantity: initial?.quantity ?? null,
                apiTestStatus: initial?.apiTestStatus ?? "",
                bhytPortCheckInfo: initial?.bhytPortCheckInfo ?? "",
                additionalRequest: initial?.additionalRequest ?? "",
                apiUrl: initial?.apiUrl ?? "",
                deadline: initial?.deadline ?? "",
                completionDate: initial?.completionDate ?? "",
                status: initial?.status ?? "",
                startDate: initial?.startDate ?? "",
                acceptanceDate: initial?.acceptanceDate ?? "",
            });

            const hid = (initial?.hospitalId as number) || 0;
            const hnm = (initial?.hospitalName as string) || "";
            setHospitalOpt(hid ? { id: hid, name: hnm || String(hid) } : null);

            const pid = (initial?.picDeploymentId as number) || 0;
            const pnm = (initial?.picDeploymentName as string) || "";
            setPicOpt(pid ? { id: pid, name: pnm || String(pid) } : null);

            // Prefill các select phụ
            const aid = (initial?.agencyId as number) || 0;
            setAgencyOpt(aid ? { id: aid, name: String(aid) } : null);
            const hid2 = (initial?.hisSystemId as number) || 0;
            setHisOpt(hid2 ? { id: hid2, name: String(hid2) } : null);
            const hwid = (initial?.hardwareId as number) || 0;
            setHardwareOpt(hwid ? { id: hwid, name: String(hwid) } : null);
        }
    }, [open, initial]);

    // Khi sửa: resolve tên theo ID cho Agency/HIS/Hardware/Hospital/PIC nếu chỉ có ID
    useEffect(() => {
        if (!open) return;
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
            try {
                const fetcher = setOpt === setAgencyOpt ? searchAgencies : setOpt === setHisOpt ? searchHisSystems : searchHardwares;
                const opts: Array<{ id: number; name: string }> = await fetcher("");
                const found = opts.find((o: { id: number; name: string }) => o.id === id);
                if (found) setOpt(found);
            } catch {
                /* ignore */
            }
        }

        resolveById((initial?.agencyId as number) || null, setAgencyOpt, "/api/v1/admin/agencies", ["name", "agencyName", "label"]);
        resolveById((initial?.hisSystemId as number) || null, setHisOpt, "/api/v1/admin/his", ["name", "hisName", "label"]);
        resolveById((initial?.hardwareId as number) || null, setHardwareOpt, "/api/v1/admin/hardware", ["name", "hardwareName", "label"]);
        // Resolve cho Hospital & PIC
        resolveById((initial?.hospitalId as number) || null, setHospitalOpt, "/api/v1/admin/hospitals", ["name", "hospitalName", "label", "code"]);
        resolveById((initial?.picDeploymentId as number) || null, setPicOpt, "/api/v1/admin/users", ["fullName", "fullname", "name", "username", "label"]);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

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

        if ((model.status || '').toUpperCase() === 'ACCEPTED') {
            if (!model.acceptanceDate || String(model.acceptanceDate).trim() === '') {
                toast.error("Vui lòng nhập ngày nghiệm thu");
                return;
            }
            if (!model.completionDate || String(model.completionDate).trim() === '') {
                toast.error("Vui lòng nhập ngày hoàn thành");
                return;
            }
        }

        const payload: ImplementationTaskRequestDTO = {
            ...model,
            hospitalId: hospitalOpt.id,
            picDeploymentId: picOpt.id,
            deadline: toISOOrNull(model.deadline) || undefined,
            completionDate: toISOOrNull(model.completionDate) || undefined,
            startDate: toISOOrNull(model.startDate) || undefined,
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
                        <form onSubmit={handleSubmit} className="px-6 pt-0 pb-6 grid gap-4 max-h-[80vh] overflow-y-auto">
                            <div className="sticky top-0 z-[100] -mx-10 px-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
                                <div className="flex items-center justify-between py-3">
                                    <h3 className="text-lg font-semibold">{initial?.id ? (initial?.name || "") : "Tạo tác vụ"}</h3>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Field label="Tên dự án" required>
                                    <TextInput
                                        value={model.name}
                                        onChange={(e) => setModel((s) => ({ ...s, name: e.target.value }))}
                                        placeholder="Nhập tên dự án"
                                    />
                                </Field>

                                {/* Bệnh viện theo TÊN */}
                                <RemoteSelect
                                    label="Bệnh viện"
                                    required
                                    placeholder="Nhập tên bệnh viện để tìm…"
                                    fetchOptions={searchHospitals}
                                    value={hospitalOpt}
                                    onChange={setHospitalOpt}
                                />

                                {/* PIC theo TÊN */}
                                <RemoteSelect
                                    label="Người phụ trách (PIC)"
                                    required
                                    placeholder="Nhập tên người phụ trách để tìm…"
                                    fetchOptions={searchPICs}
                                    value={picOpt}
                                    onChange={setPicOpt}
                                />

                                <Field label="Số lượng">
                                    <TextInput
                                        type="number"
                                        value={model.quantity ?? ""}
                                        onChange={(e) => setModel((s) => ({ ...s, quantity: e.target.value ? Number(e.target.value) : null }))}
                                    />
                                </Field>
                                <RemoteSelect
                                    label="Agency"
                                    placeholder="Nhập tên agency để tìm…"
                                    fetchOptions={searchAgencies}
                                    value={agencyOpt}
                                    onChange={(v) => { setAgencyOpt(v); setModel((s) => ({ ...s, agencyId: v ? v.id : null })); }}
                                />
                                <RemoteSelect
                                    label="HIS System"
                                    placeholder="Nhập tên HIS để tìm…"
                                    fetchOptions={searchHisSystems}
                                    value={hisOpt}
                                    onChange={(v) => { setHisOpt(v); setModel((s) => ({ ...s, hisSystemId: v ? v.id : null })); }}
                                />
                                <RemoteSelect
                                    label="Hardware"
                                    placeholder="Nhập tên hardware để tìm…"
                                    fetchOptions={searchHardwares}
                                    value={hardwareOpt}
                                    onChange={(v) => { setHardwareOpt(v); setModel((s) => ({ ...s, hardwareId: v ? v.id : null })); }}
                                />
                                <Field label="API URL">
                                    <TextInput
                                        value={model.apiUrl ?? ""}
                                        onChange={(e) => setModel((s) => ({ ...s, apiUrl: e.target.value }))}
                                        placeholder="https://..."
                                    />
                                </Field>
                                {/* <Field label="Trạng thái API Test">
                                    <TextInput
                                        value={model.apiTestStatus ?? ""}
                                        onChange={(e) => setModel((s) => ({ ...s, apiTestStatus: e.target.value }))}
                                        placeholder="PASSED / FAILED / PENDING..."
                                    />
                                </Field> */}
                                <Field label="BHYT Port Check Info">
                                    <TextInput
                                        value={model.bhytPortCheckInfo ?? ""}
                                        onChange={(e) => setModel((s) => ({ ...s, bhytPortCheckInfo: e.target.value }))}
                                    />
                                </Field>
                                <Field label="Trạng thái" required>
                                    <select
                                        className={clsx(
                                            "h-10 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 outline-none",
                                            "focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
                                        )}
                                        value={model.status ?? ""}
                                        onChange={(e) => setModel((s) => ({ ...s, status: (e.target as HTMLSelectElement).value || "" }))}
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
                                        value={model.deadline ? new Date(model.deadline).toISOString().slice(0, 16) : ""}
                                        onChange={(e) => setModel((s) => ({ ...s, deadline: e.target.value }))}
                                    />
                                </Field>
                                <Field label="Ngày bắt đầu">
                                    <TextInput
                                        type="datetime-local"
                                        value={model.startDate ? new Date(model.startDate).toISOString().slice(0, 16) : ""}
                                        onChange={(e) => setModel((s) => ({ ...s, startDate: e.target.value }))}
                                    />
                                </Field>
                                <Field label="Ngày nghiệm thu" required={model.status === 'ACCEPTED'}>
                                    <TextInput
                                        type="datetime-local"
                                        value={model.acceptanceDate ? new Date(model.acceptanceDate).toISOString().slice(0, 16) : ""}
                                        onChange={(e) => setModel((s) => ({ ...s, acceptanceDate: e.target.value }))}
                                    />
                                </Field>
                                <Field label="Ngày hoàn thành">
                                    <TextInput
                                        type="datetime-local"
                                        value={model.completionDate ? new Date(model.completionDate).toISOString().slice(0, 16) : ""}
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
        const base =
            "px-3 py-1 text-xs font-medium rounded-full whitespace-nowrap";
        switch (s) {
            case "NOT_STARTED":
                return `${base} bg-gray-100 text-gray-800`;
            case "IN_PROGRESS":
                return `${base} bg-yellow-100 text-yellow-800`;
            case "API_TESTING":
                return `${base} bg-blue-100 text-blue-800`;
            case "INTEGRATING":
                return `${base} bg-purple-100 text-purple-800`;
            case "WAITING_FOR_DEV":
                return `${base} bg-orange-100 text-orange-800`;
            case "ACCEPTED":
                return `${base} bg-green-100 text-green-800`;
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
                className="w-full max-w-3xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 p-6"
                onMouseDown={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-gray-800">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        📋 Chi tiết tác vụ bảo trì
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition"
                    >
                        ✕
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6 text-sm text-gray-800 dark:text-gray-200">
                    {/* Grid Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-3">
                        <Info label="Tên" value={item.name} />
                        <Info label="Bệnh viện" value={item.hospitalName} />
                        <Info label="Người phụ trách" value={item.picDeploymentName} />

                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900 dark:text-gray-100">
                                Trạng thái:
                            </span>
                            <span
                                className={`inline-flex px-3 py-1 text-xs font-medium rounded-full ${statusBadge(
                                    item.status
                                )}`}
                            >
                                {statusLabel(item.status)}
                            </span>
                        </div>

                        <Info label="API URL" value={item.apiUrl || "—"} />
                        <Info label="API Test" value={item.apiTestStatus || "—"} />
                        <Info label="Số lượng" value={item.quantity ?? "—"} />
                        <Info label="Deadline" value={fmt(item.deadline)} />
                        <Info label="Ngày bắt đầu" value={fmt(item.startDate)} />
                        <Info label="Ngày nghiệm thu" value={fmt(item.acceptanceDate)} />
                        <Info label="Ngày hoàn thành" value={fmt(item.completionDate)} />
                        <Info label="Tạo lúc" value={fmt(item.createdAt)} />
                        <Info label="Cập nhật lúc" value={fmt(item.updatedAt)} />
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
                <div className="flex justify-end px-6 py-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40">
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
function Info({
    label,
    value,
}: {
    label: string;
    value?: string | number | null;
}) {
    return (
        <div className="flex justify-between items-start">
            <span className="font-semibold text-gray-900 dark:text-gray-100">
                {label}:
            </span>
            <span className="text-gray-700 dark:text-gray-300 text-right max-w-[60%] break-words">
                {value ?? "—"}
            </span>
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
    const [sortBy, setSortBy] = useState("id");
    const [sortDir, setSortDir] = useState("asc");
    const [page, setPage] = useState(0);
    const [size, setSize] = useState(10);
    const [totalCount, setTotalCount] = useState<number | null>(null);
    const [enableItemAnimation, setEnableItemAnimation] = useState<boolean>(true);
    const [hospitalQuery, setHospitalQuery] = useState<string>("");
    const [hospitalOptions, setHospitalOptions] = useState<Array<{ id: number; label: string }>>([]);
    const [detailOpen, setDetailOpen] = useState(false);
    const [detailItem, setDetailItem] = useState<ImplementationTaskResponseDTO | null>(null);
    const searchDebounce = useRef<number | null>(null);
    const [pendingTasks, setPendingTasks] = useState<ImplementationTaskResponseDTO[]>([]);
    const [pendingOpen, setPendingOpen] = useState(false);
    const [loadingPending, setLoadingPending] = useState(false);


    const currentUser = useMemo<UserInfo>(() => readStored<UserInfo>("user"), []);
    const roles = useMemo<string[]>(() => {
        const r = readStored<string[]>("roles");
        return Array.isArray(r) ? r : [];
    }, []);
    const isSuperAdmin = roles.includes("SUPERADMIN");
    const userTeam = (currentUser?.team || "").toString().toUpperCase();

    const filtered = useMemo(() => data, [data]);

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

            const url = `${apiBase}?${params.toString()}`;
            const res = await fetch(url, { method: "GET", headers: authHeaders(), credentials: "include" });
            if (!res.ok) throw new Error(`GET ${url} failed: ${res.status}`);
            const resp = await res.json();
            const items = Array.isArray(resp?.content) ? resp.content : Array.isArray(resp) ? resp : [];
            setData(items);
            if (resp && typeof resp.totalElements === "number") setTotalCount(resp.totalElements);
            else setTotalCount(Array.isArray(resp) ? resp.length : null);

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
            setPendingTasks(Array.isArray(list) ? list : []);
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setLoadingPending(false);
        }
    }, []);

    const handleAcceptTask = async (id: number) => {
        try {
            const res = await fetch(`${API_ROOT}/api/v1/admin/maintenance/accept/${id}`, {
                method: "PUT",
                headers: authHeaders(),
                credentials: "include",
            });
            if (!res.ok) throw new Error(`Tiếp nhận thất bại (${res.status})`);
            toast.success("Đã tiếp nhận công việc!");
            setPendingTasks((s) => s.filter((x) => x.id !== id));
            await fetchList();
        } catch (e: any) {
            toast.error(e.message);
        }
    };

    useEffect(() => { fetchList(); /* eslint-disable-line */ }, []);
    useEffect(() => { fetchList(); /* eslint-disable-line */ }, [page, size]);
    useEffect(() => { setPage(0); }, [searchTerm, statusFilter, sortBy, sortDir]);
    useEffect(() => {
        if (searchDebounce.current) window.clearTimeout(searchDebounce.current);
        searchDebounce.current = window.setTimeout(() => { fetchList(); }, 600);
        return () => { if (searchDebounce.current) window.clearTimeout(searchDebounce.current); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchTerm]);
    useEffect(() => { fetchList(); /* eslint-disable-line */ }, [statusFilter]);
    useEffect(() => { fetchList(); /* eslint-disable-line */ }, [sortBy, sortDir]);

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
        await fetchList();
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
                <div>
                    <h1 className="text-3xl font-extrabold">Tác vụ bảo trì</h1>
                </div>
                {/* project name shown inside card; removed duplicate header pill */}
            </div>

            {error && <div className="text-red-600 mb-4">{error}</div>}

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
                        <div className="mt-3 text-sm text-gray-600 dark:text-gray-300">Tổng: <span className="font-semibold text-gray-800 dark:text-gray-100">{loading ? '...' : (totalCount ?? data.length)}</span></div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                            <select className="rounded-lg border px-3 py-2 text-sm border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900" value={sortBy} onChange={(e) => { setSortBy(e.target.value); setPage(0); }}>
                                <option value="id">Sắp xếp theo: id</option>
                                <option value="hospitalName">Sắp xếp theo: bệnh viện</option>
                                <option value="deadline">Sắp xếp theo: deadline</option>
                            </select>
                            <select className="rounded-lg border px-3 py-2 text-sm border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900" value={sortDir} onChange={(e) => setSortDir(e.target.value)}>
                                <option value="asc">Tăng dần</option>
                                <option value="desc">Giảm dần</option>
                            </select>
                        </div>

                        {isSuperAdmin || userTeam === "MAINTENANCE" ? (
                            <Button variant="primary" className="rounded-xl flex items-center gap-2" onClick={() => { setEditing(null); setModalOpen(true); }}>
                                <PlusIcon />
                                <span>Thêm mới</span>
                            </Button>
                        ) : (
                            <Button variant="primary" disabled className="opacity-50 cursor-not-allowed flex items-center gap-2">
                                <PlusIcon />
                                <span>Thêm mới</span>
                            </Button>
                        )}
                        <Button
                            variant="ghost"
                            className="relative flex items-center gap-2 border border-blue-200 text-blue-600 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-300"
                            onClick={() => {
                                setPendingOpen(true);
                                fetchPendingTasks();
                            }}
                        >
                            📨 Công việc chờ
                            {pendingTasks.length > 0 && (
                                <span className="absolute -top-1 -right-2 bg-red-600 text-white text-xs rounded-full px-2 py-0.5">
                                    {pendingTasks.length}
                                </span>
                            )}
                        </Button>

                        <button className="rounded-full border px-4 py-2 text-sm shadow-sm border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 flex items-center gap-2" onClick={async () => {
                            setSearchTerm(''); setStatusFilter(''); setSortBy('id'); setSortDir('asc'); setPage(0);
                            setLoading(true);
                            const start = Date.now();
                            await fetchList();
                            const minMs = 800;
                            const elapsed = Date.now() - start;
                            if (elapsed < minMs) await new Promise((r) => setTimeout(r, minMs - elapsed));
                            setLoading(false);
                        }}>
                            <span>Làm mới</span>
                        </button>
                    </div>
                </div>
            </div>

            <div>
                <style>{`
          @keyframes fadeInUp { from { opacity:0; transform: translateY(6px); } to { opacity:1; transform: translateY(0); } }
        `}</style>

                <div className="space-y-3">
                    {loading && isInitialLoad ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="text-blue-600 text-4xl font-extrabold tracking-wider animate-pulse" aria-hidden="true">TAG</div>
                        </div>
                    ) : (
                        filtered.length === 0 ? (
                            <div className="px-4 py-6 text-center text-gray-500">Không có dữ liệu</div>
                        ) : (
                            filtered.map((row, idx) => (
                                <TaskCardNew
                                    key={row.id}
                                    task={row as any}
                                    idx={enableItemAnimation ? idx : undefined}
                                    animate={enableItemAnimation}
                                    onOpen={() => { setDetailItem(row); setDetailOpen(true); }}
                                    onEdit={() => { setEditing(row); setModalOpen(true); }}
                                    onDelete={(id: number) => { handleDelete(id); }}
                                    canEdit={isSuperAdmin || userTeam === "MAINTENANCE"}
                                    canDelete={isSuperAdmin || userTeam === "MAINTENANCE"}
                                />
                            ))
                        )
                    )}
                </div>
            </div>

            <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <button className="px-3 py-1 border rounded inline-flex items-center gap-2" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page <= 0}>
                        <ChevronLeftIcon />
                        <span>Prev</span>
                    </button>
                    <span>Trang {page + 1}{totalCount ? ` / ${Math.max(1, Math.ceil((totalCount || 0) / size))}` : ""}</span>
                    <button className="px-3 py-1 border rounded inline-flex items-center gap-2" onClick={() => setPage((p) => p + 1)} disabled={totalCount !== null && (page + 1) * size >= (totalCount || 0)}>
                        <span>Next</span>
                        <ChevronRightIcon />
                    </button>
                </div>
                <div className="flex items-center gap-2">
                    <label className="text-sm">Số hàng:</label>
                    <select value={String(size)} onChange={(e) => { setSize(Number(e.target.value)); setPage(0); }} className="border rounded px-2 py-1">
                        <option value="5">5</option>
                        <option value="10">10</option>
                        <option value="20">20</option>
                        <option value="50">50</option>
                    </select>
                </div>
            </div>
            <PendingTasksModal
                open={pendingOpen}
                onClose={() => setPendingOpen(false)}
                onAccept={handleAcceptTask}
                list={pendingTasks}
                loading={loadingPending}
            />

            <TaskFormModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                initial={editing as any || undefined}
                onSubmit={handleSubmit}
            />

            <DetailModal open={detailOpen} onClose={() => setDetailOpen(false)} item={detailItem} />
        </div>
    );
};

export default ImplementationTasksPage;
