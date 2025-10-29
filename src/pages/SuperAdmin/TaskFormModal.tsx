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

export default function TaskFormModal({
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
    // Fetchers for RemoteSelect (minimal: hospitals and PICs)
    const searchHospitals = useMemo(
        () => async (term: string) => {
            const url = `${API_ROOT}/api/v1/admin/hospitals?keyword=${encodeURIComponent(term)}&page=0&size=10`;
            const res = await fetch(url, { headers: authHeaders(), credentials: "include" });
            if (!res.ok) return [];
            const json = await res.json();
            const list = Array.isArray(json?.content) ? json.content : Array.isArray(json) ? json : [];
            const mapped = list.map((h: { id?: number; name?: string; hospitalName?: string; code?: string }) => ({ id: Number(h.id), name: String(h.name ?? h.hospitalName ?? h.code ?? h.id) }));
            return mapped.filter((x: { id: number; name: string }) => Number.isFinite(x.id) && x.name) as Array<{ id: number; name: string }>;
        },
        []
    );

    const searchPICs = useMemo(
        () => async (term: string) => {
            const url = `${API_ROOT}/api/v1/admin/users?role=DEPLOYMENT&keyword=${encodeURIComponent(term)}&page=0&size=10`;
            const res = await fetch(url, { headers: authHeaders(), credentials: "include" });
            if (!res.ok) return [];
            const json = await res.json();
            const list = Array.isArray(json?.content) ? json.content : Array.isArray(json) ? json : [];
            const mapped = list.map((u: { id?: number; fullName?: string; name?: string; username?: string }) => ({ id: Number(u.id), name: String(u.fullName ?? u.name ?? u.username ?? u.id) }));
            return mapped.filter((x: { id: number; name: string }) => Number.isFinite(x.id) && x.name) as Array<{ id: number; name: string }>;
        },
        []
    );

    const [model, setModel] = useState<Partial<ImplementationTaskRequestDTO>>(() => ({
        name: initial?.name || "",
        hospitalId: initial?.hospitalId || 0,
        picDeploymentId: initial?.picDeploymentId || 0,
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

    useEffect(() => {
        if (open) {
            setModel({
                name: initial?.name || "",
                hospitalId: initial?.hospitalId || 0,
                picDeploymentId: initial?.picDeploymentId || 0,
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

            const hid = initial?.hospitalId || 0;
            const hnm = initial?.hospitalName || "";
            setHospitalOpt(hid ? { id: hid, name: hnm || String(hid) } : null);

            const pid = initial?.picDeploymentId || 0;
            const pnm = initial?.picDeploymentName || "";
            setPicOpt(pid ? { id: pid, name: pnm || String(pid) } : null);
        }
    }, [open, initial]);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, onClose]);

    function toISOOrNull(v?: string | Date | null) {
        if (!v) return null;
        try {
            return typeof v === "string" ? (v.trim() ? new Date(v).toISOString() : null) : v.toISOString();
        } catch {
            return null;
        }
    }

    const [submitting, setSubmitting] = useState(false);

    if (!open) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!model.name?.trim()) {
            alert("Tên dự án không được để trống");
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

        const payload: ImplementationTaskRequestDTO = {
            name: model.name!.trim(),
            hospitalId: hospitalOpt.id,
            picDeploymentId: picOpt.id,
            agencyId: model.agencyId ?? null,
            hisSystemId: model.hisSystemId ?? null,
            hardwareId: model.hardwareId ?? null,
            quantity: model.quantity ?? null,
            apiTestStatus: model.apiTestStatus ?? null,
            bhytPortCheckInfo: model.bhytPortCheckInfo ?? null,
            additionalRequest: model.additionalRequest ?? null,
            apiUrl: model.apiUrl ?? null,
            deadline: toISOOrNull(model.deadline) ?? null,
            completionDate: toISOOrNull(model.completionDate) ?? null,
            status: model.status ?? null,
            startDate: toISOOrNull(model.startDate) ?? null,
            acceptanceDate: toISOOrNull(model.acceptanceDate) ?? null,
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
    function RemoteSelect({ label, placeholder, fetchOptions, value, onChange, required }: {
        label: string;
        placeholder?: string;
        fetchOptions: (q: string) => Promise<Array<{ id: number; name: string }>>;
        value: { id: number; name: string } | null;
        onChange: (v: { id: number; name: string } | null) => void;
        required?: boolean;
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
                    <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} transition={{ type: "spring", stiffness: 260, damping: 22 }} className="w-full max-w-3xl rounded-2xl bg-white dark:bg-gray-900 shadow-2xl border border-gray-200 dark:border-gray-800" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
                        <form onSubmit={handleSubmit} className="p-6 grid gap-4 max-h-[80vh] overflow-y-auto">
                            <div className="flex items-center justify-between sticky top-0 bg-white dark:bg-gray-900 pb-2">
                                <h3 className="text-lg font-semibold">{initial?.id ? "Cập nhật tác vụ" : "Tạo tác vụ"}</h3>
                                <Button type="button" variant="ghost" onClick={onClose}>Đóng</Button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Field label="Tên dự án" required>
                                    <TextInput value={model.name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setModel((s) => ({ ...s, name: e.target.value }))} placeholder="Nhập tên dự án" />
                                </Field>

                                <RemoteSelect label="Bệnh viện" required placeholder="Nhập tên bệnh viện để tìm…" fetchOptions={searchHospitals} value={hospitalOpt} onChange={setHospitalOpt} />

                                <RemoteSelect label="Người phụ trách (PIC)" required placeholder="Nhập tên người phụ trách để tìm…" fetchOptions={searchPICs} value={picOpt} onChange={setPicOpt} />

                                <Field label="Số lượng">
                                    <TextInput type="number" value={model.quantity ?? ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setModel((s) => ({ ...s, quantity: e.target.value ? Number(e.target.value) : null }))} />
                                </Field>

                                <Field label="Agency ID">
                                    <TextInput type="number" value={model.agencyId ?? ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setModel((s) => ({ ...s, agencyId: e.target.value ? Number(e.target.value) : null }))} />
                                </Field>

                                <Field label="HIS System ID">
                                    <TextInput type="number" value={model.hisSystemId ?? ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setModel((s) => ({ ...s, hisSystemId: e.target.value ? Number(e.target.value) : null }))} />
                                </Field>

                                <Field label="Hardware ID">
                                    <TextInput type="number" value={model.hardwareId ?? ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setModel((s) => ({ ...s, hardwareId: e.target.value ? Number(e.target.value) : null }))} />
                                </Field>

                                <Field label="API URL">
                                    <TextInput value={model.apiUrl ?? ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setModel((s) => ({ ...s, apiUrl: e.target.value }))} placeholder="https://..." />
                                </Field>

                                <Field label="Trạng thái API Test">
                                    <TextInput value={model.apiTestStatus ?? ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setModel((s) => ({ ...s, apiTestStatus: e.target.value }))} placeholder="PASSED / FAILED / PENDING..." />
                                </Field>

                                <Field label="BHYT Port Check Info">
                                    <TextInput value={model.bhytPortCheckInfo ?? ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setModel((s) => ({ ...s, bhytPortCheckInfo: e.target.value }))} />
                                </Field>

                                <Field label="Trạng thái">
                                    <TextInput value={model.status ?? ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setModel((s) => ({ ...s, status: e.target.value }))} placeholder="NEW / IN_PROGRESS / DONE..." />
                                </Field>

                                <Field label="Deadline (ngày)">
                                    <TextInput type="datetime-local" value={model.deadline ? new Date(model.deadline).toISOString().slice(0, 16) : ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setModel((s) => ({ ...s, deadline: e.target.value }))} />
                                </Field>

                                <Field label="Ngày bắt đầu">
                                    <TextInput type="datetime-local" value={model.startDate ? new Date(model.startDate).toISOString().slice(0, 16) : ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setModel((s) => ({ ...s, startDate: e.target.value }))} />
                                </Field>

                                <Field label="Ngày nghiệm thu">
                                    <TextInput type="datetime-local" value={model.acceptanceDate ? new Date(model.acceptanceDate).toISOString().slice(0, 16) : ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setModel((s) => ({ ...s, acceptanceDate: e.target.value }))} />
                                </Field>

                                <Field label="Ngày hoàn thành">
                                    <TextInput type="datetime-local" value={model.completionDate ? new Date(model.completionDate).toISOString().slice(0, 16) : ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setModel((s) => ({ ...s, completionDate: e.target.value }))} />
                                </Field>
                            </div>

                            <Field label="Yêu cầu bổ sung">
                                <TextArea value={model.additionalRequest ?? ""} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setModel((s) => ({ ...s, additionalRequest: e.target.value }))} placeholder="Mô tả chi tiết yêu cầu" />
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
