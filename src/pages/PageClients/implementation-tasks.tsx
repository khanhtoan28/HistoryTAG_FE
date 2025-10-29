import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";

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
  hisSystemName?: string | null;
  hardwareId?: number | null;
  endDate?: string | null;
  additionalRequest?: string | null;
  apiUrl?: string | null;
  deadline?: string | null;
  completionDate?: string | null;
  apiTestStatus?: string | null;
  bhytPortCheckInfo?: string | null;
  status?: DeploymentStatusFE | null;
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
  hisSystemName?: string | null;
  hardwareId?: number | null;
  quantity?: number | null;
  apiTestStatus?: string | null;
  bhytPortCheckInfo?: string | null;
  additionalRequest?: string | null;
  apiUrl?: string | null;
  deadline?: string | null;
  completionDate?: string | null;
  status?: DeploymentStatusFE | null;
  startDate?: string | null;
  acceptanceDate?: string | null;
};

export type ImplementationTaskUpdateDTO = Partial<ImplementationTaskRequestDTO>;

export const DEPLOYMENT_STATUS_OPTIONS = [
  { value: "NOT_STARTED", label: "Chưa triển khai" },
  { value: "IN_PROGRESS", label: "Đang triển khai" },
  { value: "API_TESTING", label: "Test thông api" },
  { value: "INTEGRATING", label: "Tích hợp với viện" },
  { value: "WAITING_FOR_DEV", label: "Chờ dev build update" },
  { value: "ACCEPTED", label: "Nghiệm thu" },
] as const;

export type DeploymentStatusFE = typeof DEPLOYMENT_STATUS_OPTIONS[number]["value"];

function statusBadgeClasses(status?: string | null) {
  switch (status) {
    case "NOT_STARTED":
      // Chưa bắt đầu → xám
      return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";

    case "IN_PROGRESS":
      // Đang thực hiện → vàng
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";

    case "WAITING_FOR_DEV":
      // Đang chờ dev → cam
      return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";

    case "API_TESTING":
      // Đang test API → xanh dương
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";

    case "INTEGRATING":
      // Đang tích hợp → tím
      return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";

    case "ACCEPTED":
      // Đã nghiệm thu → xanh lá
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";

    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
  }
}

function statusLabel(status?: string | null) {
  switch (status) {
    case "NOT_STARTED":
      return "Chưa bắt đầu";
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

const API_ROOT = import.meta.env.VITE_API_URL || "http://localhost:8080";

// PageClients folder is admin-facing: always use admin API root for tasks
const apiBase = `${API_ROOT}/api/v1/admin/implementation/tasks`;


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
        {open && q.trim().length > 0 && (
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
}: {
  open: boolean;
  onClose: () => void;
  initial?: Partial<ImplementationTaskRequestDTO> & {
    id?: number;
    hospitalName?: string | null;
    picDeploymentName?: string | null;
  };
  onSubmit: (payload: ImplementationTaskRequestDTO, id?: number) => Promise<void>;
}) {
  const searchHospitals = useMemo(
    () => async (term: string) => {
      const qs = new URLSearchParams({
        search: term || "",
        keyword: term || "",
        page: "0",
        size: "10",
        sortBy: "name",
        sortDir: "asc",
      });
      const url = `${API_ROOT}/api/v1/auth/hospitals?${qs.toString()}`;
      const res = await fetch(url, { headers: authHeaders(), credentials: "include" });
      if (!res.ok) return [];
      const json = await res.json();
      const list = Array.isArray(json?.content)
        ? json.content
        : Array.isArray(json)
          ? json
          : [];

      // ✅ Lọc theo từ khóa nhập (term)
      const lower = term.trim().toLowerCase();
      return list
        .map((h: any) => ({
          id: Number(h.id),
          name: String((h.name ?? h.hospitalName ?? h.code ?? h.id)),
        }))
        .filter((x: any) =>
          Number.isFinite(x.id) &&
          x.name &&
          (!lower || x.name.toLowerCase().includes(lower))
        );


    },
    []
  );

  const searchPICs = useMemo(
    () => async (term: string) => {
      const qs = new URLSearchParams({
        page: "0",
        size: "20",
        sortBy: "fullname",
        sortDir: "asc",
      });

      const url = `${API_ROOT}/api/v1/admin/users/search-deployment?name=${term}`;
      const res = await fetch(url, { headers: authHeaders(), credentials: "include" });
      if (!res.ok) return [];

      const json = await res.json();
      const users = Array.isArray(json?.content) ? json.content : Array.isArray(json) ? json : [];

      // ✅ Lọc ra user có role SUPERADMIN hoặc team DEPLOYMENT
      const filtered = users.filter((u: any) => {
        const team = String(u.team || "").toUpperCase();
        const roles = Array.isArray(u.roles)
          ? u.roles.map((r: any) =>
            typeof r === "string"
              ? r.toUpperCase()
              : (r.roleName || r.role || "").toUpperCase()
          )
          : [];

        return team === "DEPLOYMENT" || roles.includes("SUPERADMIN");
      });

      // ✅ Lọc thêm theo từ khóa tìm kiếm
      return filtered
        .filter((u: any) => {
          const name = (u.fullname ?? u.fullName ?? u.name ?? u.username ?? "").toLowerCase();
          return !term || name.includes(term.toLowerCase());
        })
        .map((u: any) => ({
          id: u.id,
          name: u.fullname ?? u.fullName ?? u.username ?? `User ${u.id}`,
        }));
    },
    []
  );
  
  const searchHIS = useMemo(
    () => async (term: string) => {
      const qs = new URLSearchParams({
        search: term || "",
        page: "0",
        size: "20",
        sortBy: "name",
        sortDir: "asc",
      });

      const url = `${API_ROOT}/api/v1/admin/his?search=${encodeURIComponent(term)}&page=0&size=20&sortBy=id&sortDir=asc`;
      const res = await fetch(url, { headers: authHeaders(), credentials: "include" });
      if (!res.ok) return [];

      const json = await res.json();
      const list = Array.isArray(json?.content) ? json.content : Array.isArray(json) ? json : [];

      const lower = term.trim().toLowerCase();
      return list
        .map((h: any) => ({
          id: Number(h.id),
          name: String(h.name ?? h.hisName ?? h.code ?? `HIS-${h.id}`),
        }))
        .filter((x: any) =>
          Number.isFinite(x.id) &&
          x.name &&
          (!lower || x.name.toLowerCase().includes(lower))
        );
    },
    []
  );


  const [model, setModel] = useState<ImplementationTaskRequestDTO>(() => ({
    name: initial?.name || "",
    hospitalId: (initial?.hospitalId as number) || 0,
    picDeploymentId: (initial?.picDeploymentId as number) || 0,
    agencyId: initial?.agencyId ?? null,
    hisSystemId: initial?.hisSystemId ?? null,
    hisSystemName: initial?.hisSystemName ?? null,
    hardwareId: initial?.hardwareId ?? null,
    quantity: initial?.quantity ?? null,
    apiTestStatus: initial?.apiTestStatus ?? "",
    bhytPortCheckInfo: initial?.bhytPortCheckInfo ?? "",
    additionalRequest: initial?.additionalRequest ?? "",
    apiUrl: initial?.apiUrl ?? "",
    deadline: initial?.deadline ?? "",
    completionDate: initial?.completionDate ?? "",
    status: (initial?.status as DeploymentStatusFE) ?? "NOT_STARTED",
    startDate: initial?.startDate ?? "",
    acceptanceDate: initial?.acceptanceDate ?? "",
  }));

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
        ...model,
        name: initial?.name || "",
      });
    }
  }, [open, initial]);

  // ✅ RESET FORM khi mở modal tạo mới
  useEffect(() => {
    if (open && (!initial || !initial.id)) {
      setModel({
        name: "",
        hospitalId: 0,
        picDeploymentId: 0,
        agencyId: null,
        hisSystemId: null,
        hisSystemName: null,
        hardwareId: null,
        quantity: null,
        apiTestStatus: "",
        bhytPortCheckInfo: "",
        additionalRequest: "",
        apiUrl: "",
        deadline: "",
        completionDate: "",
        status: "NOT_STARTED",
        startDate: "",
        acceptanceDate: "",
      });
      setHospitalOpt(null);
      setPicOpt(null);
    }
  }, [open, initial?.id]);

  useEffect(() => {
    if (!open || !initial) return;

    // Cập nhật model khi mở modal
    setModel((prev) => ({
      ...prev,
      name: initial?.name || "",
      hospitalId: Number(initial?.hospitalId) || 0,
      picDeploymentId: Number(initial?.picDeploymentId) || 0,
      hisSystemName: initial?.hisSystemName ?? null,
      quantity: initial?.quantity ?? null,
      apiTestStatus: initial?.apiTestStatus ?? "",
      bhytPortCheckInfo: initial?.bhytPortCheckInfo ?? "",
      additionalRequest: initial?.additionalRequest ?? "",
      apiUrl: initial?.apiUrl ?? "",
      deadline: initial?.deadline ?? "",
      completionDate: initial?.completionDate ?? "",
      status: (initial?.status as DeploymentStatusFE) ?? "NOT_STARTED",
      startDate: initial?.startDate ?? "",
      acceptanceDate: initial?.acceptanceDate ?? "",
    }));

    // Nếu đã có name hiển thị -> set luôn
    if (initial.hospitalName && initial.hospitalId) {
      setHospitalOpt({ id: Number(initial.hospitalId), name: initial.hospitalName });
    } else if (initial.hospitalId) {
      // 🔁 Fetch lại tên bệnh viện theo ID
      fetch(`${API_ROOT}/api/v1/auth/hospitals/${initial.hospitalId}`, {
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
      // 🔁 Fetch lại tên người phụ trách theo ID
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
    if (initial.hisSystemId) {
      fetch(`${API_ROOT}/api/v1/admin/his/${initial.hisSystemId}`, {
        headers: authHeaders(),
        credentials: "include",
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          const h = Array.isArray(data?.content) ? data.content[0] : data;
          if (h && h.id) {
            setModel((s) => ({
              ...s,
              hisSystemId: Number(h.id),
              hisSystemName: h.name ?? h.hisName ?? h.code ?? `HIS-${h.id}`,
            }));
          }
        })
        .catch(() => { });
    }

  }, [open, initial]);

  const [submitting, setSubmitting] = useState(false);
  if (!open) return null;

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
          <form onSubmit={handleSubmit} className="p-6 grid gap-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between sticky top-0 bg-white dark:bg-gray-900 pb-2">
              <h3 className="text-lg font-semibold">
                {initial?.id ? "Cập nhật tác vụ triển khai" : "Tạo tác vụ triển khai"}
              </h3>
              <Button type="button" variant="ghost" onClick={onClose}>
                Đóng
              </Button>
            </div>
            {/* Form fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Tên dự án" required>
                <TextInput
                  value={model.name}
                  onChange={(e) => setModel((s) => ({ ...s, name: e.target.value }))}
                  placeholder="Nhập tên dự án"
                />
              </Field>

              <RemoteSelect
                label="Bệnh viện"
                required
                placeholder="Nhập tên bệnh viện để tìm…"
                fetchOptions={searchHospitals}
                value={hospitalOpt}
                onChange={setHospitalOpt}
              />

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
                  onChange={(e) =>
                    setModel((s) => ({ ...s, quantity: e.target.value ? Number(e.target.value) : null }))
                  }
                />
              </Field>
              <Field label="Agency ID">
                <TextInput
                  type="number"
                  value={model.agencyId ?? ""}
                  onChange={(e) => setModel((s) => ({ ...s, agencyId: e.target.value ? Number(e.target.value) : null }))}
                />
              </Field>
              <RemoteSelect
                label="Hệ thống HIS"
                required={false}
                placeholder="Nhập tên HIS để tìm…"
                fetchOptions={searchHIS}
                value={
                  model.hisSystemId
                    ? { id: model.hisSystemId, name: model.hisSystemName ?? `HIS-${model.hisSystemId}` }
                    : null
                }
                onChange={(opt) =>
                  setModel((s) => ({
                    ...s,
                    hisSystemId: opt ? opt.id : null,
                    hisSystemName: opt ? opt.name : undefined,
                  }))
                }
              />


              <Field label="Hardware ID">
                <TextInput
                  type="number"
                  value={model.hardwareId ?? ""}
                  onChange={(e) =>
                    setModel((s) => ({ ...s, hardwareId: e.target.value ? Number(e.target.value) : null }))
                  }
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

              <Field label="Trạng thái" required>
                <select
                  className={clsx(
                    "h-10 w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 outline-none",
                    "focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
                  )}
                  value={model.status ?? "NOT_STARTED"}
                  onChange={(e) => setModel((s) => ({ ...s, status: e.target.value as DeploymentStatusFE }))}
                >
                  {DEPLOYMENT_STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
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
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 p-6"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold mb-4">Chi tiết tác vụ triển khai</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <p><b>Tên:</b> {item.name}</p>
          <p><b>Bệnh viện:</b> {item.hospitalName}</p>
          <p><b>Hệ thống HIS:</b> {item.hisSystemName || `#${item.hisSystemId ?? "—"}`}</p>
          <p><b>Người phụ trách:</b> {item.picDeploymentName}</p>
          <p className="flex items-center gap-2">
            <b>Trạng thái:</b>
            <span
              className={clsx(
                "px-2 py-1 rounded-full text-xs font-medium",
                statusBadgeClasses(item.status)
              )}
            >
              {statusLabel(item.status)}
            </span>
          </p>

          <p><b>API URL:</b> {item.apiUrl || "—"}</p>
          <p><b>API Test:</b> {item.apiTestStatus || "—"}</p>
          <p><b>Số lượng:</b> {item.quantity ?? "—"}</p>
          <p><b>Deadline:</b> {fmt(item.deadline)}</p>
          <p><b>Ngày bắt đầu:</b> {fmt(item.startDate)}</p>
          <p><b>Ngày nghiệm thu:</b> {fmt(item.acceptanceDate)}</p>
          <p><b>Ngày hoàn thành:</b> {fmt(item.completionDate)}</p>
          <p><b>Tạo lúc:</b> {fmt(item.createdAt)}</p>
          <p><b>Cập nhật lúc:</b> {fmt(item.updatedAt)}</p>
          <p className="col-span-2"><b>Yêu cầu bổ sung:</b> {item.additionalRequest || "—"}</p>
        </div>
        <div className="flex justify-end mt-6">
          <Button variant="ghost" onClick={onClose}>Đóng</Button>
        </div>
      </motion.div>
    </div>
  );
}
function ConfirmDialog({
  open,
  title,
  message,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title?: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onCancel()}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 p-6"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold mb-2">{title || "Xác nhận"}</h3>
        <p className="text-sm text-gray-700 dark:text-gray-300 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onCancel}>
            Hủy
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            Xóa
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

const ImplementationTasksPage: React.FC = () => {
  const [data, setData] = useState<ImplementationTaskResponseDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ImplementationTaskResponseDTO | null>(null);
  const [query, setQuery] = useState("");
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<ImplementationTaskResponseDTO | null>(null);
  const user = JSON.parse(localStorage.getItem("user") || "{}");
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
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const isSuperAdmin = userRoles.some(
    (r: any) => (typeof r === "string" ? r : r.roleName)?.toUpperCase() === "SUPERADMIN"
  );
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
      setData(Array.isArray(page?.content) ? page.content : Array.isArray(page) ? page : []);
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
  };

  const handleDelete = async (id: number) => {
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
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">Tác vụ triển khai</h1>
        <div className="flex items-center gap-2">
          <input
            placeholder="Tìm kiếm theo tên, bệnh viện, trạng thái..."
            className="h-10 w-64 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 outline-none"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {isSuperAdmin || userTeam === "DEPLOYMENT" ? (
            <Button
              onClick={() => {
                setEditing(null); // ép new object, tránh reference cũ
                setModalOpen(true);
              }}
            >
              + Thêm mới
            </Button>


          ) : (
            <Button disabled className="opacity-50 cursor-not-allowed">
              + Thêm mới
            </Button>
          )}

        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-300 align-middle">
              <tr>
                <th className="px-4 py-3 text-left">ID</th>
                <th className="px-4 py-3 text-left">Tên</th>
                <th className="px-4 py-3 text-left">Bệnh viện</th>
                <th className="px-4 py-3 text-left">PIC</th>
                <th className="px-4 py-3 text-left">Trạng thái</th>
                <th className="px-4 py-3 text-left">Deadline</th>
                <th className="px-4 py-3 text-left">Hành động</th>

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
              {!loading && !error &&
                filtered.map((row) => (
                  <tr key={row.id} className="border-t border-gray-100 dark:border-gray-800">
                    <td className="px-4 py-3">{row.id}</td>
                    <td className="px-4 py-3 font-medium">{row.name}</td>
                    <td className="px-4 py-3">{row.hospitalName}</td>
                    <td className="px-4 py-3">{row.picDeploymentName}</td>
                    <td className="px-4 py-3">
                      <span className={clsx("px-2 py-1 rounded-full text-xs font-medium", statusBadgeClasses(row.status))}>
                        {statusLabel(row.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3">{fmt(row.deadline)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          className="h-8 px-3 text-xs rounded-lg"
                          onClick={() => {
                            setDetailItem(row);
                            setDetailOpen(true);
                          }}
                        >
                          Xem
                        </Button>

                        {isSuperAdmin || userTeam === "DEPLOYMENT" ? (
                          <>
                            <Button
                              variant="ghost"
                              className="h-8 px-3 text-xs rounded-lg"
                              onClick={() => {
                                setEditing({ ...row }); // ✅ clone object, đảm bảo reference mới
                                setModalOpen(true);
                              }}
                            >
                              Sửa
                            </Button>

                            <Button
                              variant="danger"
                              className="h-8 px-3 text-xs rounded-lg"
                              onClick={() => {
                                setDeleteId(row.id);
                                setConfirmOpen(true);
                              }}

                            >
                              Xóa
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button variant="ghost" disabled className="px-3 py-2 text-sm opacity-50 cursor-not-allowed">
                              Sửa
                            </Button>
                            <Button
                              variant="danger"
                              className="h-8 px-3 text-xs rounded-lg"
                              onClick={() => {
                                setDeleteId(row.id);
                                setConfirmOpen(true);
                              }}
                            >
                              Xóa
                            </Button>

                          </>
                        )}

                      </div>

                    </td>

                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
      <TaskFormModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        initial={editing ?? undefined as any}

        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={confirmOpen}
        title="Xóa tác vụ"
        message="Bạn có chắc chắn muốn xóa tác vụ này không? Hành động này không thể hoàn tác."
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          if (deleteId) handleDelete(deleteId);
          setConfirmOpen(false);
          setDeleteId(null);
        }}
      />

      <DetailModal open={detailOpen} onClose={() => setDetailOpen(false)} item={detailItem} />
    </div>
  );
};

export default ImplementationTasksPage;
