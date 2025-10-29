import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

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

const API_ROOT = import.meta.env.VITE_API_URL || "http://localhost:8080";

// PageClients: admin area — always use admin endpoints
const apiBase = `${API_ROOT}/api/v1/admin/dev/tasks`;

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
            // ĐỔI URL nếu API khác
            const url = `/api/v1/admin/hospitals?keyword=${encodeURIComponent(term)}&page=0&size=10`;
            const res = await fetch(url, { headers: authHeaders(), credentials: "include" });
            if (!res.ok) return [];
            const json = await res.json();
            const list = Array.isArray(json?.content) ? json.content : Array.isArray(json) ? json : [];
            return list
                .map((h: any) => ({ id: Number(h.id), name: String(h.name ?? h.hospitalName ?? h.code ?? h.id) }))
                .filter((x: any) => Number.isFinite(x.id) && x.name);
        },
        []
    );

    const searchPICs = useMemo(
        () => async (term: string) => {
            // ĐỔI URL nếu API khác
            const url = `/api/v1/admin/users?role=DEPLOYMENT&keyword=${encodeURIComponent(term)}&page=0&size=10`;
            const res = await fetch(url, { headers: authHeaders(), credentials: "include" });
            if (!res.ok) return [];
            const json = await res.json();
            const list = Array.isArray(json?.content) ? json.content : Array.isArray(json) ? json : [];
            return list
                .map((u: any) => ({ id: Number(u.id), name: String(u.fullName ?? u.name ?? u.username ?? u.id) }))
                .filter((x: any) => Number.isFinite(x.id) && x.name);
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
        }
    }, [open, initial]);

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
            ...model,
            hospitalId: hospitalOpt.id,
            picDeploymentId: picOpt.id,
            deadline: toISOOrNull(model.deadline) || undefined,
            completionDate: toISOOrNull(model.completionDate) || undefined,
            startDate: toISOOrNull(model.startDate) || undefined,
            acceptanceDate: toISOOrNull(model.acceptanceDate) || undefined,
        } as any;

        try {
            setSubmitting(true);
            await onSubmit(payload, (initial as any)?.id);
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
                        <form onSubmit={handleSubmit} className="p-6 grid gap-4 max-h-[80vh] overflow-y-auto">
                            <div className="flex items-center justify-between sticky top-0 bg-white dark:bg-gray-900 pb-2">
                                <h3 className="text-lg font-semibold">{initial?.id ? "Cập nhật tác vụ triển khai" : "Tạo tác vụ triển khai"}</h3>
                                <Button type="button" variant="ghost" onClick={onClose}>Đóng</Button>
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
                                <Field label="Agency ID">
                                    <TextInput
                                        type="number"
                                        value={model.agencyId ?? ""}
                                        onChange={(e) => setModel((s) => ({ ...s, agencyId: e.target.value ? Number(e.target.value) : null }))}
                                    />
                                </Field>
                                <Field label="HIS System ID">
                                    <TextInput
                                        type="number"
                                        value={model.hisSystemId ?? ""}
                                        onChange={(e) => setModel((s) => ({ ...s, hisSystemId: e.target.value ? Number(e.target.value) : null }))}
                                    />
                                </Field>
                                <Field label="Hardware ID">
                                    <TextInput
                                        type="number"
                                        value={model.hardwareId ?? ""}
                                        onChange={(e) => setModel((s) => ({ ...s, hardwareId: e.target.value ? Number(e.target.value) : null }))}
                                    />
                                </Field>
                                <Field label="API URL">
                                    <TextInput
                                        value={model.apiUrl ?? ""}
                                        onChange={(e) => setModel((s) => ({ ...s, apiUrl: e.target.value }))}
                                        placeholder="https://..."
                                    />
                                </Field>
                                <Field label="Trạng thái API Test">
                                    <TextInput
                                        value={model.apiTestStatus ?? ""}
                                        onChange={(e) => setModel((s) => ({ ...s, apiTestStatus: e.target.value }))}
                                        placeholder="PASSED / FAILED / PENDING..."
                                    />
                                </Field>
                                <Field label="BHYT Port Check Info">
                                    <TextInput
                                        value={model.bhytPortCheckInfo ?? ""}
                                        onChange={(e) => setModel((s) => ({ ...s, bhytPortCheckInfo: e.target.value }))}
                                    />
                                </Field>
                                <Field label="Trạng thái">
                                    <TextInput
                                        value={model.status ?? ""}
                                        onChange={(e) => setModel((s) => ({ ...s, status: e.target.value }))}
                                        placeholder="NEW / IN_PROGRESS / DONE..."
                                    />
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
                                <Field label="Ngày nghiệm thu">
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

const ImplementationTasksPage: React.FC = () => {
    const [data, setData] = useState<ImplementationTaskResponseDTO[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // current user info (used to enforce per-team permissions in UI)
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const userRoles = user?.roles || [];
    const userTeam = (user?.team || "").toString().toUpperCase();
    const isSuperAdmin = userRoles.some((r: unknown) => {
        if (typeof r === "string") return r.toUpperCase() === "SUPERADMIN";
        if (r && typeof r === "object") {
            const rn = (r as Record<string, unknown>).roleName;
            return typeof rn === "string" && rn.toUpperCase() === "SUPERADMIN";
        }
        return false;
    });

    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<ImplementationTaskResponseDTO | null>(null);

    const [query, setQuery] = useState("");

    const filtered = useMemo(() => {
        if (!query.trim()) return data;
        const q = query.toLowerCase();
        return data.filter((x) =>
            [x.name, x.hospitalName, x.picDeploymentName, x.status, x.apiTestStatus]
                .filter(Boolean)
                .some((v) => String(v).toLowerCase().includes(q))
        );
    }, [data, query]);

    async function fetchList() {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${apiBase}?page=0&size=50&sortBy=id&sortDir=asc`, {
                method: "GET",
                headers: authHeaders(),
                credentials: "include",
            });
            if (!res.ok) throw new Error(`GET ${apiBase} failed: ${res.status}`);
            const page = await res.json(); 
            setData(Array.isArray(page?.content) ? page.content : []);
        } catch (e: any) {
            setError(e.message || "Lỗi tải dữ liệu");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchList();
    }, []);

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
        toast.success(isUpdate ? "Cập nhật thành công" : "Tạo mới thành công");
    };

    // DELETE
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
        toast.success("Đã xóa thành công");
    };

    return (
        <div className="p-6 xl:p-10">
            {/* Header */}
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">Tác vụ triển khai</h1>
                </div>
                <div className="flex items-center gap-2">
                    <input
                        placeholder="Tìm kiếm theo tên, bệnh viện, trạng thái..."
                        className="h-10 w-64 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 outline-none"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                    {isSuperAdmin || userTeam === "DEV" ? (
                        <Button onClick={() => { setEditing(null); setModalOpen(true); }}>+ Thêm mới</Button>
                    ) : (
                        <Button disabled className="opacity-50 cursor-not-allowed">+ Thêm mới</Button>
                    )}
                </div>
            </div>

            {/* Table */}
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-300">
                            <tr>
                                <th className="px-4 py-3 text-left">ID</th>
                                <th className="px-4 py-3 text-left">Tên</th>
                                <th className="px-4 py-3 text-left">Bệnh viện</th>
                                <th className="px-4 py-3 text-left">PIC</th>
                                <th className="px-4 py-3 text-left">Trạng thái</th>
                                <th className="px-4 py-3 text-left">API Test</th>
                                <th className="px-4 py-3 text-left">API URL</th>
                                <th className="px-4 py-3 text-left">Deadline</th>
                                <th className="px-4 py-3 text-left">Tạo lúc</th>
                                <th className="px-4 py-3 text-right">Hành động</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && (
                                <tr>
                                    <td colSpan={10} className="px-4 py-6 text-center text-gray-500">Đang tải...</td>
                                </tr>
                            )}
                            {error && !loading && (
                                <tr>
                                    <td colSpan={10} className="px-4 py-6 text-center text-red-600">{error}</td>
                                </tr>
                            )}
                            {!loading && !error && filtered.length === 0 && (
                                <tr>
                                    <td colSpan={10} className="px-4 py-6 text-center text-gray-500">Không có dữ liệu</td>
                                </tr>
                            )}
                            {!loading && !error && filtered.map((row) => (
                                <tr key={row.id} className="border-t border-gray-100 dark:border-gray-800">
                                    <td className="px-4 py-3">{row.id}</td>
                                    <td className="px-4 py-3 font-medium">{row.name}</td>
                                    <td className="px-4 py-3">{row.hospitalName || row.hospitalId}</td>
                                    <td className="px-4 py-3">{row.picDeploymentName || row.picDeploymentId}</td>
                                    <td className="px-4 py-3">{row.status}</td>
                                    <td className="px-4 py-3">{row.apiTestStatus}</td>
                                    <td className="px-4 py-3">
                                        {row.apiUrl ? (
                                            <a
                                                href={row.apiUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline decoration-2 underline-offset-2 font-medium hover:decoration-blue-800 dark:hover:decoration-blue-300 transition-colors"
                                                title={row.apiUrl}
                                            >
                                                {row.apiUrl.length > 30 ? `${row.apiUrl.substring(0, 30)}...` : row.apiUrl}
                                            </a>
                                        ) : (
                                            <span className="text-gray-400 italic">Chưa có URL</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">{fmt(row.deadline)}</td>
                                    <td className="px-4 py-3">{fmt(row.createdAt)}</td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex justify-end gap-2">
                                            {(() => {
                                                const rowTeam = String((row as Record<string, unknown>).team || "").toUpperCase();
                                                const canEdit = isSuperAdmin || (userTeam && rowTeam && userTeam === rowTeam) || (!rowTeam && userTeam === "DEV");
                                                if (canEdit) {
                                                    return (
                                                        <>
                                                            <Button
                                                                variant="ghost"
                                                                onClick={() => { setEditing(row); setModalOpen(true); }}
                                                            >Sửa</Button>
                                                            <Button variant="danger" onClick={() => handleDelete(row.id)}>Xóa</Button>
                                                        </>
                                                    );
                                                }
                                                return (
                                                    <>
                                                        <Button variant="ghost" disabled className="opacity-50 cursor-not-allowed">Sửa</Button>
                                                        <Button variant="danger" disabled className="opacity-50 cursor-not-allowed">Xóa</Button>
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            <TaskFormModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                initial={
                    editing
                        ? {
                            id: editing.id,
                            name: editing.name,
                            hospitalId: editing.hospitalId ?? 0,
                            hospitalName: editing.hospitalName ?? null,          // <-- truyền tên để prefill
                            picDeploymentId: editing.picDeploymentId ?? 0,
                            picDeploymentName: editing.picDeploymentName ?? null, // <-- truyền tên để prefill
                            agencyId: editing.agencyId ?? undefined,
                            hisSystemId: editing.hisSystemId ?? undefined,
                            hardwareId: editing.hardwareId ?? undefined,
                            quantity: editing.quantity ?? undefined,
                            apiTestStatus: editing.apiTestStatus ?? undefined,
                            bhytPortCheckInfo: editing.bhytPortCheckInfo ?? undefined,
                            additionalRequest: editing.additionalRequest ?? undefined,
                            apiUrl: editing.apiUrl ?? undefined,
                            deadline: editing.deadline ?? undefined,
                            completionDate: editing.completionDate ?? undefined,
                            status: editing.status ?? undefined,
                            startDate: editing.startDate ?? undefined,
                            acceptanceDate: editing.acceptanceDate ?? undefined,
                        }
                        : undefined
                }
                onSubmit={(payload, id) => handleSubmit(payload, id)}
            />

        </div>
    );
};

export default ImplementationTasksPage;
