/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { ImplementationTaskRequestDTO } from "../PageClients/maintenance-tasks";

const API_ROOT = import.meta.env.VITE_API_URL || "http://localhost:8080";

function authHeaders(extra?: Record<string, string>) {
    const token = localStorage.getItem("access_token");
    return {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(extra || {}),
    };
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

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
    return (
        <select
            {...props}
            className={clsx(
                "h-10 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 outline-none",
                "focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500",
                props.className || ""
            )}
        />
    );
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

// canonical map is defined elsewhere; avoid duplicate constants in this module

// Note: normalizeStatus is defined in other shared modules; avoid duplicate definition here to prevent unused symbol

export default function TaskFormModal({
    open,
    onClose,
    initial,
    onSubmit,
    readOnly,
    excludeAccepted = false,
    transferred = false,
}: {
    open: boolean;
    onClose: () => void;
    initial?: Partial<ImplementationTaskRequestDTO> & { id?: number; hospitalName?: string | null; picDeploymentName?: string | null };
    onSubmit: (payload: ImplementationTaskRequestDTO, id?: number) => Promise<void>;
    readOnly?: boolean;
    excludeAccepted?: boolean;
    transferred?: boolean;
}) {
    // Fetchers for RemoteSelect (minimal: hospitals and PICs)
    const searchHospitals = useMemo(
        () => async (term: string) => {
            const url = `${API_ROOT}/api/v1/superadmin/hospitals/search?name=${encodeURIComponent(term)}`;
            const res = await fetch(url, { headers: authHeaders(), credentials: "include" });
            if (!res.ok) return [];
            const list = await res.json();
            const mapped = Array.isArray(list)
                ? list.map((h: { id?: number; label?: string }) => ({ id: Number(h.id), name: String(h.label ?? h.id) }))
                : [];
            return mapped.filter((x: { id: number; name: string }) => Number.isFinite(x.id) && x.name) as Array<{ id: number; name: string }>;
        },
        []
    );

    const searchPICs = useMemo(
        () => async (term: string) => {
            // Backend doesn't filter by role in /users/search; filter client-side by name
            const url = `${API_ROOT}/api/v1/superadmin/users/search?name=${encodeURIComponent(term)}`;
            const res = await fetch(url, { headers: authHeaders(), credentials: "include" });
            if (!res.ok) return [];
            const list = await res.json();
            const mapped = Array.isArray(list)
                ? list.map((u: { id?: number; label?: string }) => ({ id: Number(u.id), name: String(u.label ?? u.id) }))
                : [];
            return mapped.filter((x: { id: number; name: string }) => Number.isFinite(x.id) && x.name) as Array<{ id: number; name: string }>;
        },
        []
    );

    // Removed: searchAgencies, searchHisSystems, searchHardwares as related fields are hidden

    const [model, setModel] = useState<Partial<ImplementationTaskRequestDTO>>(() => ({
        name: initial?.name || "",
        hospitalId: initial?.hospitalId || 0,
        picDeploymentId: initial?.picDeploymentId || 0,
        // removed optional fields from form (kept nulls on submit)
        apiTestStatus: initial?.apiTestStatus ?? "",
        // removed from form
        additionalRequest: initial?.additionalRequest ?? "",
        // removed from form
        deadline: initial?.deadline ?? "",
        completionDate: initial?.completionDate ?? "",
        status: initial?.status ?? "",
        startDate: initial?.startDate ?? "",
    }));

    const [hospitalOpt, setHospitalOpt] = useState<{ id: number; name: string } | null>(() => {
        const id = initial?.hospitalId || 0;
        const nm = initial?.hospitalName || "";
        return id ? { id, name: nm || String(id) } : null;
    });
    const [picOpt, setPicOpt] = useState<{ id: number; name: string } | null>(() => {
        const id = initial?.picDeploymentId || 0;
        const nm = initial?.picDeploymentName || "";
        return id ? { id, name: nm || String(id) } : null;
    });
    // Removed: agencyOpt, hisOpt, hardwareOpt states

    // Helper function to normalize status (similar to admin form)
    function normalizeStatus(status?: string | null): "RECEIVED" | "IN_PROCESS" | "COMPLETED" | "ISSUE" | "CANCELLED" | undefined {
        if (!status) return undefined;
        const s = String(status).trim().toUpperCase();
        if (s === "RECEIVED" || s === "NOT_STARTED") return "RECEIVED";
        if (s === "IN_PROCESS" || s === "IN_PROGRESS" || s === "API_TESTING" || s === "INTEGRATING") return "IN_PROCESS";
        if (s === "COMPLETED" || s === "WAITING_FOR_DEV" || s === "ACCEPTED") return "COMPLETED";
        if (s === "ISSUE" || s === "WAITING_FOR_DEV") return "ISSUE";
        if (s === "CANCELLED") return "CANCELLED";
        return undefined;
    }

    useEffect(() => {
        if (open) {
            const isNew = !(initial?.id);
            const normalizedStatus = normalizeStatus(initial?.status) ?? "RECEIVED";
            // Auto-set completionDate if status is COMPLETED
            const completionDefault =
                normalizedStatus === "COMPLETED"
                    ? (initial?.completionDate ? toLocalInputValue(initial.completionDate) : localInputFromDate(new Date()))
                    : (initial?.completionDate ? toLocalInputValue(initial.completionDate) : "");
            // Auto-set startDate for new tasks
            const defaultStart = initial?.startDate ? toLocalInputValue(initial.startDate) : (isNew ? localInputFromDate(new Date()) : "");

            setModel({
                name: initial?.name || "",
                hospitalId: initial?.hospitalId || 0,
                picDeploymentId: initial?.picDeploymentId || 0,
                // removed optional fields from form (kept nulls on submit)
                apiTestStatus: initial?.apiTestStatus ?? "",
                // removed from form
                additionalRequest: initial?.additionalRequest ?? "",
                // removed from form
                deadline: initial?.deadline ? toLocalInputValue(initial.deadline) : "",
                completionDate: completionDefault,
                status: normalizedStatus,
                startDate: defaultStart,
            });

            const hid = initial?.hospitalId || 0;
            const hnm = initial?.hospitalName || "";
            setHospitalOpt(hid ? { id: hid, name: hnm || String(hid) } : null);

            const pid = initial?.picDeploymentId || 0;
            const pnm = initial?.picDeploymentName || "";
            setPicOpt(pid ? { id: pid, name: pnm || String(pid) } : null);

            // removed: agency/his/hardware selections
        }
    }, [open, initial]);

    // When editing: resolve names for Agency/HIS/Hardware if we only have IDs
    // Removed: resolveById logic for agency/his/hardware

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, onClose]);

    const pad = (n: number) => String(n).padStart(2, "0");

    function toLocalISOString(date: Date) {
        if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
        const y = date.getFullYear();
        const m = pad(date.getMonth() + 1);
        const d = pad(date.getDate());
        const hh = pad(date.getHours());
        const mm = pad(date.getMinutes());
        const ss = pad(date.getSeconds());
        return `${y}-${m}-${d}T${hh}:${mm}:${ss}`;
    }

    function localInputFromDate(date: Date) {
        if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
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

    function toLocalInputValue(v?: string | null) {
        if (!v) return "";
        try {
            const raw = String(v).trim();
            if (!raw) return "";

            // If has timezone info (Z or +/-), parse and convert to local
            if (/[zZ]|[+-]\d{2}:?\d{2}$/.test(raw)) {
                const date = new Date(raw);
                if (Number.isNaN(date.getTime())) return raw.slice(0, 16);
                return localInputFromDate(date);
            }

            // If already in datetime-local format (YYYY-MM-DDTHH:mm), return as is
            if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(raw)) {
                return raw.slice(0, 16);
            }

            // Try to parse as ISO and convert
            const parsed = new Date(raw);
            if (!Number.isNaN(parsed.getTime())) {
                return localInputFromDate(parsed);
            }

            return raw;
        } catch {
            return "";
        }
    }

    const [submitting, setSubmitting] = useState(false);

    if (!open) return null;

    const lockHospital = !initial?.id && (Boolean(initial?.hospitalId) || Boolean(initial?.hospitalName));

    // Determine if this task has been transferred to maintenance.
    // Sources: explicit prop, initial payload flag, or status === 'TRANSFERRED'
    const isTransferred = Boolean(
        transferred ||
        (initial && ((initial as any).transferredToMaintenance || String(initial.status ?? "").toUpperCase() === "TRANSFERRED"))
    );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!model.name?.trim()) {
            alert("Tên công việc không được để trống");
            return;
        }
        if (!hospitalOpt?.id) {
            alert("Bệnh viện không được để trống");
            return;
        }
        if (!picOpt?.id) {
            alert("Người phụ trách không được để trống");
            return;
        }
        if (!model.status) {
            alert("Trạng thái không được để trống");
            return;
        }

        // Use startDate from model if provided, otherwise use current date for new tasks
        const startDateIso = toISOOrNull(model.startDate);
        const finalStartDate = startDateIso ?? (initial?.id ? null : toLocalISOString(new Date()));

        // Use completionDate from model if provided, otherwise auto-set if status is COMPLETED
        const normalizedStatus = normalizeStatus(model.status);
        const completionIso = toISOOrNull(model.completionDate);
        const derivedCompletion = completionIso ?? (normalizedStatus === "COMPLETED" ? toLocalISOString(new Date()) : null);

        const payload: ImplementationTaskRequestDTO = {
            name: model.name!.trim(),
            hospitalId: hospitalOpt.id,
            picDeploymentId: picOpt.id,
            agencyId: null,
            hisSystemId: null,
            hardwareId: null,
            quantity: null,
            apiTestStatus: model.apiTestStatus ?? null,
            bhytPortCheckInfo: null,
            additionalRequest: model.additionalRequest ?? null,
            apiUrl: null,
            deadline: toISOOrNull(model.deadline) ?? null,
            completionDate: derivedCompletion,
            status: model.status ?? null,
            startDate: finalStartDate,
        };

        try {
            setSubmitting(true);
            await onSubmit(payload, initial?.id);
            onClose();
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            toast.error(msg || "Lỗi lưu");
        } finally {
            setSubmitting(false);
        }
    };

    // Minimal RemoteSelect UI (inline simple dropdown)
    function RemoteSelect({ label, placeholder, fetchOptions, value, onChange, required, disabled }: {
        label: string;
        placeholder?: string;
        fetchOptions: (q: string) => Promise<Array<{ id: number; name: string }>>;
        value: { id: number; name: string } | null;
        onChange: (v: { id: number; name: string } | null) => void;
        required?: boolean;
        disabled?: boolean;
    }) {
        const [open, setOpen] = useState(false);
        const [q, setQ] = useState("");
        const [loading, setLoading] = useState(false);
        const [options, setOptions] = useState<Array<{ id: number; name: string }>>([]);
        const [highlight, setHighlight] = useState<number>(-1);

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
        }, [open, options.length, q, fetchOptions]);

        if (disabled) {
            return (
                <Field label={label} required={required}>
                    <div className="h-10 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 flex items-center">
                        {value?.name || "-"}
                    </div>
                </Field>
            );
        }

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
                        <div className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg" onMouseLeave={() => setHighlight(-1)}>
                            {loading && <div className="px-3 py-2 text-sm text-gray-500">Đang tải...</div>}
                            {!loading && options.length === 0 && <div className="px-3 py-2 text-sm text-gray-500">Không có kết quả</div>}
                            {!loading && options.map((opt, idx) => (
                                <div key={opt.id} className={clsx("px-3 py-2 text-sm cursor-pointer", idx === highlight ? "bg-gray-100 dark:bg-gray-800" : "")} onMouseEnter={() => setHighlight(idx)} onMouseDown={(e) => { e.preventDefault(); onChange(opt); setOpen(false); }}>
                                    {opt.name}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </Field>
        );
    }

    return (
        <>
            <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-black/40" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
                <AnimatePresence initial={false}>
                    <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} transition={{ type: "spring", stiffness: 260, damping: 22 }} className="relative w-full max-w-3xl rounded-2xl bg-white dark:bg-gray-900 shadow-2xl border border-gray-200 dark:border-gray-800" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
                        {/* Header placed outside the scrollable form so buttons don't overlap content while scrolling */}

                        

                        {/* form content starts near top; header removed - only floating close button remains */}
                        <form onSubmit={handleSubmit} className="pt-6 px-6 pb-6 grid gap-4 max-h-[72vh] overflow-y-auto">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Field label="Tên công việc" required>
                                    <TextInput disabled={readOnly} value={model.name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setModel((s) => ({ ...s, name: e.target.value }))} placeholder="Nhập tên công việc" />
                                </Field>

                                <RemoteSelect label="Bệnh viện" required placeholder="Nhập tên bệnh viện để tìm…" fetchOptions={searchHospitals} value={hospitalOpt} onChange={setHospitalOpt} disabled={readOnly || lockHospital} />

                                <RemoteSelect label="Người phụ trách (PIC)" required placeholder="Nhập tên người phụ trách để tìm…" fetchOptions={searchPICs} value={picOpt} onChange={setPicOpt} disabled={readOnly} />

                                {/* Removed fields: Số lượng, Agency, HIS, Hardware, API URL, BHYT */}

                                <Field label="Trạng thái" required>
                                <Select
                                        disabled={readOnly || isTransferred}
                                        value={model.status ?? ""}
                                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                                            const nextStatus = e.target.value || null;
                                            setModel((s) => {
                                                const prevNormalized = normalizeStatus(s.status);
                                                const nextNormalized = normalizeStatus(nextStatus) ?? "RECEIVED";
                                                const nowLocal = localInputFromDate(new Date());
                                                const becameCompleted = nextNormalized === "COMPLETED";
                                                const wasCompleted = prevNormalized === "COMPLETED";
                                                
                                                // Auto-set completionDate if status becomes COMPLETED
                                                let nextCompletion = s.completionDate ?? "";
                                                if (becameCompleted) {
                                                    // If status becomes COMPLETED, set completionDate to now if empty or missing
                                                    if (!nextCompletion || !nextCompletion.trim()) {
                                                        nextCompletion = nowLocal;
                                                    }
                                                } else if (!becameCompleted && wasCompleted) {
                                                    // If changing away from COMPLETED, clear completionDate
                                                    nextCompletion = "";
                                                }
                                                
                                                return {
                                                    ...s,
                                                    status: nextStatus,
                                                    completionDate: nextCompletion,
                                                };
                                            });
                                        }}
                                    >
                                        <option value="">— Chọn trạng thái —</option>
                                        {(excludeAccepted ? STATUS_OPTIONS.filter(o => String(o.value) !== 'ACCEPTED') : STATUS_OPTIONS).map((opt) => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </Select>
                                </Field>

                                <Field label="Deadline (ngày)">
                                    <TextInput disabled={readOnly || isTransferred} type="datetime-local" value={toLocalInputValue(model.deadline)} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setModel((s) => ({ ...s, deadline: e.target.value }))} />
                                </Field>

                                <Field label="Ngày bắt đầu">
                                    <TextInput disabled={readOnly || isTransferred} type="datetime-local" value={toLocalInputValue(model.startDate)} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setModel((s) => ({ ...s, startDate: e.target.value }))} />
                                </Field>

                                <Field label="Ngày hoàn thành">
                                    <TextInput disabled={readOnly || isTransferred} type="datetime-local" value={toLocalInputValue(model.completionDate)} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setModel((s) => ({ ...s, completionDate: e.target.value }))} />
                                </Field>
                            </div>

                            <Field label="Yêu cầu bổ sung">
                                <TextArea disabled={readOnly} value={model.additionalRequest ?? ""} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setModel((s) => ({ ...s, additionalRequest: e.target.value }))} placeholder="Mô tả chi tiết yêu cầu" />
                            </Field>

                            <div className="flex items-center justify-end gap-3 pt-2">
                                {readOnly ? (
                                    <Button type="button" variant="ghost" onClick={onClose}>Đóng</Button>
                                ) : (
                                    <>
                                        <Button type="button" variant="ghost" onClick={onClose}>Hủy</Button>
                                        <Button type="submit" disabled={submitting}>{submitting ? "Đang lưu..." : initial?.id ? "Cập nhật" : "Tạo mới"}</Button>
                                    </>
                                )}
                            </div>
                        </form>
                    </motion.div>
                </AnimatePresence>
            </div>
        </>
    );
}
