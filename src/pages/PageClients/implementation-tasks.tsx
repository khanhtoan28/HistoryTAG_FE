import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import TaskCardNew from "../SuperAdmin/TaskCardNew";
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

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "NOT_STARTED", label: "Chưa triển khai" },
  { value: "IN_PROGRESS", label: "Đang triển khai" },
  { value: "API_TESTING", label: "Test thông api" },
  { value: "INTEGRATING", label: "Tích hợp với viện" },
  { value: "WAITING_FOR_DEV", label: "Chờ dev build update" },
  { value: "ACCEPTED", label: "Nghiệm thu" },
];

// Using shared TaskCardNew for visuals — local statusBadgeClasses removed

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

const API_ROOT = import.meta.env.VITE_API_URL || "http://localhost:8080";
const MIN_LOADING_MS = 2000;

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
    if (!open) return;

    // Khởi tạo model khi mở modal: nếu có initial thì đổ dữ liệu, nếu không thì reset trắng
    setModel({
      name: initial?.name || "",
      hospitalId: Number(initial?.hospitalId) || 0,
      picDeploymentId: Number(initial?.picDeploymentId) || 0,
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

    // Setup selects: nếu có tên truyền vào thì dùng, không thì null (và sẽ resolve theo ID phía dưới)
    const hid = (initial?.hospitalId as number) || 0;
    const hnm = (initial?.hospitalName as string) || "";
    setHospitalOpt(hid ? { id: hid, name: hnm || String(hid) } : null);

    const pid = (initial?.picDeploymentId as number) || 0;
    const pnm = (initial?.picDeploymentName as string) || "";
    setPicOpt(pid ? { id: pid, name: pnm || String(pid) } : null);

    const aid = (initial?.agencyId as number) || 0;
    setAgencyOpt(aid ? { id: aid, name: String(aid) } : null);
    const hisId = (initial?.hisSystemId as number) || 0;
    setHisOpt(hisId ? { id: hisId, name: String(hisId) } : null);
    const hwid = (initial?.hardwareId as number) || 0;
    setHardwareOpt(hwid ? { id: hwid, name: String(hwid) } : null);

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
  }, [open, initial]);

  // Resolve tên cho Agency/HIS/Hardware nếu chỉ có ID
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
      } catch { /* ignore */ }

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
      } catch { /* ignore */ }

      // 3) Last resort: dùng search loaders đã có
      try {
        const fetcher = setOpt === setAgencyOpt ? searchAgencies : setOpt === setHisOpt ? searchHisSystems : searchHardwares;
        const opts: Array<{ id: number; name: string }> = await fetcher("");
        const found = opts.find((o: { id: number; name: string }) => o.id === id);
        if (found) setOpt(found);
      } catch { /* ignore */ }
    }

    resolveById((initial?.agencyId as number) || null, setAgencyOpt, "/api/v1/admin/agencies", ["name", "agencyName", "label"]);
    resolveById((initial?.hisSystemId as number) || null, setHisOpt, "/api/v1/admin/his", ["name", "hisName", "label"]);
    resolveById((initial?.hardwareId as number) || null, setHardwareOpt, "/api/v1/admin/hardware", ["name", "hardwareName", "label"]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

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

    // Extra validation: When status is ACCEPTED, require acceptanceDate and completionDate
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
          <form onSubmit={handleSubmit} className="px-6 pt-0 pb-6 grid gap-4 max-h-[80vh] overflow-y-auto">
              <div className="sticky top-0 z-[100] -mx-10 px-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center justify-between py-3">
                <h3 className="text-lg font-semibold">
                  {initial?.id ? (initial?.name || "") : "Tạo tác vụ"}
                </h3>
              </div>
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

              <Field label="Số lượng Kiosk">
                <TextInput
                  type="number"
                  value={model.quantity ?? ""}
                  onChange={(e) =>
                    setModel((s) => ({ ...s, quantity: e.target.value ? Number(e.target.value) : null }))
                  }
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
                    "h-10 w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 outline-none",
                    "focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
                  )}
                  value={model.status ?? ""}
                  onChange={(e) => setModel((s) => ({ ...s, status: (e.target as HTMLSelectElement).value || "" }))}
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
        <h2 className="text-lg font-semibold mb-5">Chi tiết tác vụ triển khai</h2>
        <hr></hr>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm mt-5">
          <p><b>Tên:</b> {item.name}</p>
          <p><b>Bệnh viện:</b> {item.hospitalName}</p>
          <p><b>Người phụ trách:</b> {item.picDeploymentName}</p>
          <p><b>Trạng thái:</b> {statusLabel(item.status)}</p>
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

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // when page or size changes, refetch
  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, size]);

  // reset page when filters/sort/search change
  useEffect(() => { setPage(0); }, [searchTerm, statusFilter, sortBy, sortDir]);

  // debounce searchTerm changes and refetch
  useEffect(() => {
    if (searchDebounce.current) window.clearTimeout(searchDebounce.current);
    searchDebounce.current = window.setTimeout(() => { fetchList(); }, 600);
    return () => { if (searchDebounce.current) window.clearTimeout(searchDebounce.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  // refetch when statusFilter or sort changes
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
        <h1 className="text-3xl font-extrabold">Tác vụ triển khai</h1>
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
                  onBlur={() => { /* keep search as-is */ }}
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

            {isSuperAdmin || userTeam === "DEPLOYMENT" ? (
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
                    canEdit={isSuperAdmin || userTeam === "DEPLOYMENT"}
                    canDelete={isSuperAdmin || userTeam === "DEPLOYMENT"}
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
