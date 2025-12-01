import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";// hoặc copy 2 hàm này từ trang cũ nếu bạn chưa có
import { FiClipboard, FiMapPin, FiUser, FiClock, FiLink, FiActivity, FiCalendar, FiInfo, FiCheckCircle, FiXCircle } from "react-icons/fi";
import { AiOutlineEye } from "react-icons/ai";
import toast from "react-hot-toast";
import type { ToastOptions } from "react-hot-toast";
import TaskCard from "./TaskCardNew";
import TaskFormModal from "./TaskFormModal";
import { isBusinessContractTaskName as isBusinessContractTask } from "../../utils/businessContract";

const API_ROOT = import.meta.env.VITE_API_URL || "http://localhost:8080";
const MIN_LOADING_MS = 2000; // ensure spinner shows at least ~2s for perceived smoothness

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

type ImplTask = {
  id: number;
  name: string;
  hospitalName?: string | null;
  picDeploymentName?: string | null;
  picDeploymentId?: number | null;
  additionalRequest?: string | null;
  status?: string | null;
  createdAt?: string | null;
  quantity?: number | null;
  agency?: string | null;
  hisSystemName?: string | null;
  hardware?: string | null;
  apiUrl?: string | null;
  apiTestStatus?: string | null;
  bhytPortCheckInfo?: string | null;
  deadline?: string | null;
  startDate?: string | null;
  acceptanceDate?: string | null;
  completionDate?: string | null;
  finishDate?: string | null;
  notes?: string | null;
};

// Helper function để parse PIC IDs từ additionalRequest
function parsePicIdsFromAdditionalRequest(additionalRequest?: string | null, picDeploymentId?: number | null): number[] {
  const ids: number[] = [];
  if (picDeploymentId) {
    ids.push(picDeploymentId);
  }
  if (additionalRequest) {
    const match = additionalRequest.match(/\[PIC_IDS:\s*([^\]]+)\]/);
    if (match) {
      const parsedIds = match[1].split(',').map(id => Number(id.trim())).filter(id => !isNaN(id) && id > 0);
      ids.push(...parsedIds);
    }
  }
  return [...new Set(ids)]; // Loại bỏ duplicate
}

type PendingTask = ImplTask & {
  receivedById?: number | null;
  receivedByName?: string | null;
  readOnlyForDeployment?: boolean;
  transferredToMaintenance?: boolean;
  hospitalId?: number | null;
  hospitalName?: string | null;
};

type PendingGroup = {
  hospitalName: string;
  hospitalId: number | null;
  tasks: PendingTask[];
};

function authHeaders() {
  // Try to get token from multiple sources (same as client.tsx)
  const getCookie = (name: string) => {
    const m = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
    return m ? decodeURIComponent(m[2]) : null;
  };

  const token = getCookie("access_token")
    || localStorage.getItem("access_token")
    || sessionStorage.getItem("access_token")
    || localStorage.getItem("token");

  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  } else {
    console.error("❌ No authentication token found! Check localStorage/sessionStorage/cookies");
  }

  return headers;
}

type ToastVariant = "success" | "error";

const showStyledToast = (
  type: ToastVariant,
  message: string,
  options?: ToastOptions
) => {
  const { duration, position, id, ariaProps } = options ?? {};
  toast.custom(
    () => (
      <div className="pointer-events-auto">
        <div
          className={`flex min-w-[220px] items-center gap-3 rounded-2xl border px-4 py-3 shadow-lg bg-white ${type === "success" ? "border-green-200" : "border-red-200"
            }`}
        >
          <span
            className={`flex h-9 w-9 items-center justify-center rounded-full ${type === "success"
                ? "bg-green-100 text-green-600"
                : "bg-red-100 text-red-600"
              }`}
          >
            {type === "success" ? (
              <FiCheckCircle size={20} />
            ) : (
              <FiXCircle size={20} />
            )}
          </span>
          <span className="text-sm font-medium text-gray-900">{message}</span>
        </div>
      </div>
    ),
    {
      duration: duration ?? (type === "success" ? 3000 : 4000),
      position: position ?? "top-right",
      id,
      ariaProps,
    }
  );
};

const toastSuccess = (message: string, options?: ToastOptions) =>
  showStyledToast("success", message, options);

const toastError = (message: string, options?: ToastOptions) =>
  showStyledToast("error", message, options);
function statusBadgeClasses(status?: string | null) {
  if (!status) return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
  const s = status.toUpperCase();
  switch (s) {
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

function statusLabel(status?: string | null) {
  if (!status) return "-";
  const map: Record<string, string> = {
    RECEIVED: "Đã tiếp nhận",
    IN_PROCESS: "Đang xử lý",
    COMPLETED: "Hoàn thành",
    ISSUE: "Gặp sự cố",
    CANCELLED: "Hủy",
  };
  const normalized = status.toUpperCase();
  return map[normalized] || status;
}

const ImplementSuperTaskPage: React.FC = () => {
  const roles = JSON.parse(localStorage.getItem("roles") || "[]");
  const isSuper = roles.some((r: unknown) => {
    if (typeof r === "string") return r.toUpperCase() === "SUPERADMIN";
    if (r && typeof r === "object") {
      const roleName = (r as Record<string, unknown>).roleName;
      if (typeof roleName === "string") return roleName.toUpperCase() === "SUPERADMIN";
    }
    return false;
  });
  const [data, setData] = useState<ImplTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [hospitalQuery, setHospitalQuery] = useState<string>("");
  const [hospitalOptions, setHospitalOptions] = useState<Array<{ id: number; label: string }>>([]);
  const [selectedHospital, setSelectedHospital] = useState<string | null>(null);
  const searchDebounce = useRef<number | null>(null);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<string>("id");
  const [sortDir, setSortDir] = useState<string>("desc");
  const [page, setPage] = useState<number>(0);
  const [size, setSize] = useState<number>(10);
  const [enableItemAnimation, setEnableItemAnimation] = useState<boolean>(true);
  const [picOptions, setPicOptions] = useState<Array<{ id: string; label: string }>>([]);
  const [acceptedCount, setAcceptedCount] = useState<number | null>(null);

  // New state for hospital list view
  const [showHospitalList, setShowHospitalList] = useState<boolean>(true);
  const [hospitalsWithTasks, setHospitalsWithTasks] = useState<Array<{ id: number; label: string; subLabel?: string; taskCount?: number; visibleTaskCount?: number; hiddenTaskCount?: number; hiddenPendingCount?: number; hiddenAcceptedCount?: number; acceptedCount?: number; nearDueCount?: number; overdueCount?: number; transferredCount?: number; allTransferred?: boolean; allAccepted?: boolean; picDeploymentIds?: string[]; picDeploymentNames?: string[]; acceptedFromBusiness?: boolean; hasBusinessPlaceholder?: boolean; personInChargeName?: string | null; personInChargeId?: number | null }>>([]);
  const [loadingHospitals, setLoadingHospitals] = useState<boolean>(false);
  const [hospitalPage, setHospitalPage] = useState<number>(0);
  const [hospitalSize, setHospitalSize] = useState<number>(20);
  const [hospitalSearch, setHospitalSearch] = useState<string>("");
  const [hospitalStatusFilter, setHospitalStatusFilter] = useState<string>("");
  // Pending (Business -> Deployment) modal state (use admin endpoints)
  const [pendingOpen, setPendingOpen] = useState(false);
  const [pendingGroups, setPendingGroups] = useState<PendingGroup[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const pendingCountRef = useRef<number>(0);
  const lastPendingCountRef = useRef<number>(0);
  // Track hospitals that were just converted -> maintenance but may not be accepted yet.
  // Use id when available, otherwise use label string as key.
  const pendingTransfersRef = useRef<Set<number | string>>(new Set());
  const navigate = useNavigate();

  const [hospitalPicFilter, setHospitalPicFilter] = useState<string[]>([]);
  const [picFilterOpen, setPicFilterOpen] = useState<boolean>(false);
  const [picFilterQuery, setPicFilterQuery] = useState<string>("");
  const [picFilterPage, setPicFilterPage] = useState<number>(0);
  const picFilterItemsPerPage = 5;
  const picFilterDropdownRef = React.useRef<HTMLDivElement | null>(null);
  const [selectedHospitalMeta, setSelectedHospitalMeta] = useState<{
    hiddenPendingCount: number;
    hiddenTaskCount: number;
    totalTaskCount: number;
    visibleTaskCount: number;
  } | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        picFilterDropdownRef.current &&
        !picFilterDropdownRef.current.contains(event.target as Node)
      ) {
        setPicFilterOpen(false);
      }
    }
    if (picFilterOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [picFilterOpen]);

  useEffect(() => {
    if (!picFilterOpen) {
      setPicFilterQuery("");
      setPicFilterPage(0);
    } else {
      // Reset to page 0 when dropdown opens
      setPicFilterPage(0);
    }
  }, [picFilterOpen]);

  useEffect(() => {
    setPicFilterPage(0);
  }, [picFilterQuery]);

  const picOptionLabelMap = React.useMemo(() => {
    const map = new Map<string, string>();
    picOptions.forEach((opt) => {
      map.set(opt.id, opt.label);
    });
    return map;
  }, [picOptions]);

  const filteredPicOptions = React.useMemo(() => {
    const q = picFilterQuery.trim().toLowerCase();
    if (!q) return picOptions;
    return picOptions.filter((opt) => opt.label.toLowerCase().includes(q));
  }, [picOptions, picFilterQuery]);

  const paginatedPicOptions = React.useMemo(() => {
    const itemsToShow = (picFilterPage + 1) * picFilterItemsPerPage;
    return filteredPicOptions.slice(0, itemsToShow);
  }, [filteredPicOptions, picFilterPage]);

  const hasMorePicOptions = React.useMemo(() => {
    const itemsToShow = (picFilterPage + 1) * picFilterItemsPerPage;
    return itemsToShow < filteredPicOptions.length;
  }, [filteredPicOptions.length, picFilterPage]);

  useEffect(() => {
    (async () => {
      try {
        const params = new URLSearchParams({
          department: "IT",
          status: "true",
        });
        const res = await fetch(`${API_ROOT}/api/v1/superadmin/users/filter?${params.toString()}`, {
          method: "GET",
          headers: authHeaders(),
          credentials: "include",
        });
        if (!res.ok) {
          return;
        }
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        const options = list
          .map((u: any) => {
            const id = u?.id;
            const labelRaw = u?.fullname ?? u?.fullName ?? u?.username ?? u?.email ?? u?.id;
            const label = typeof labelRaw === "string" ? labelRaw.trim() : String(labelRaw ?? "");
            if (id == null || !label) return null;
            return { id: String(id), label };
          })
          .filter((item): item is { id: string; label: string } => Boolean(item));
        options.sort((a, b) => a.label.localeCompare(b.label, "vi", { sensitivity: "base" }));
        setPicOptions(options);
      } catch (err) {
        console.debug("fetch IT users failed", err);
      }
    })();
  }, []);

  async function fetchPendingGroups(): Promise<number> {
    setLoadingPending(true);
    try {
      const url = `${API_ROOT}/api/v1/admin/implementation/pending`;
      const res = await fetch(url, { method: 'GET', headers: authHeaders(), credentials: 'include' });
      if (res.status === 401) {
        toastError('Bạn chưa đăng nhập hoặc phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        navigate('/signin');
        return pendingCountRef.current;
      }
      if (!res.ok) throw new Error(`Failed to load pending: ${res.status}`);
      const list = await res.json();
      const filtered = (Array.isArray(list) ? list : []).filter((t: unknown) => {
        const tt = t as PendingTask;
        return !(tt.receivedById || tt.receivedByName);
      }) as PendingTask[];
      const groups = new Map<string, PendingGroup>();
      for (const t of filtered) {
        const name = (t.hospitalName || '—').toString();
        const key = `${t.hospitalId ?? 'null'}::${name}`;
        const cur = groups.get(key) || { hospitalId: typeof t.hospitalId === 'number' ? t.hospitalId : null, hospitalName: name, tasks: [] as PendingTask[] };
        cur.tasks.push(t);
        groups.set(key, cur);
      }
      const grouped = Array.from(groups.values());
      setPendingGroups(grouped);
      const count = grouped.reduce((s, g) => s + (g.tasks?.length || 0), 0);
      pendingCountRef.current = count;
      return count;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toastError(msg || 'Lỗi khi tải danh sách chờ');
    } finally {
      setLoadingPending(false);
    }
    return pendingCountRef.current;
  }

  async function handleAcceptTask(taskId: number, suppressRefresh = false) {
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
        toastError('Bạn chưa đăng nhập hoặc không có quyền. Vui lòng đăng nhập lại.');
        navigate('/signin');
        return;
      }
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(txt || `HTTP ${res.status}`);
      }
      await res.json().catch(() => null);
      // remove from pending groups
      setPendingGroups((prev) => prev.map((g: PendingGroup) => ({ ...g, tasks: g.tasks.filter((t: PendingTask) => t.id !== taskId) })).filter((g: PendingGroup) => g.tasks.length > 0));
      toastSuccess('Đã tiếp nhận công việc');
      // refresh hospital/task lists so the accepted task and its hospital appear in the main views
      if (!suppressRefresh) {
        try { await fetchHospitalsWithTasks(); } catch (err) { console.debug('fetchHospitalsWithTasks after accept failed', err); }
        try { if (!showHospitalList) await fetchList(); } catch (err) { console.debug('fetchList after accept failed', err); }
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toastError(msg || 'Lỗi khi tiếp nhận công việc');
    }
  }

  async function handleAcceptGroup(hospitalId: number | null) {
    const group = pendingGroups.find(g => (g.hospitalId ?? null) === (hospitalId ?? null));
    if (!group) return;
    for (const t of [...group.tasks]) {
      // accept sequentially to avoid race
      await handleAcceptTask(t.id as number, true);
    }
    // After accepting the whole group, refresh once so hospital and tasks appear
    try { await fetchHospitalsWithTasks(); } catch (err) { console.debug('fetchHospitalsWithTasks failed', err); }
    try { if (!showHospitalList) await fetchList(); } catch (err) { console.debug('fetchList failed', err); }
  }

  async function handleAcceptAll() {
    // Accept all tasks from all hospitals sequentially
    for (const group of [...pendingGroups]) {
      for (const t of [...group.tasks]) {
        // eslint-disable-next-line no-await-in-loop
        await handleAcceptTask(t.id as number, true);
      }
    }
    // After accepting all, refresh once so hospitals and tasks appear
    try { await fetchHospitalsWithTasks(); } catch (err) { console.debug('fetchHospitalsWithTasks failed', err); }
    try { if (!showHospitalList) await fetchList(); } catch (err) { console.debug('fetchList failed', err); }
  }

  const apiBase = `${API_ROOT}/api/v1/superadmin/implementation/tasks`;

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ImplTask | null>(null);
  const [viewOnly, setViewOnly] = useState<boolean>(false);

  async function fetchList(overrides?: { page?: number; size?: number; sortBy?: string; sortDir?: string }) {
    const start = Date.now();
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(overrides?.page ?? page),
        size: String(overrides?.size ?? size),
        sortBy: overrides?.sortBy ?? sortBy,
        sortDir: overrides?.sortDir ?? sortDir,
      });
      // Build search param. If a PIC is selected, append the PIC's label (name)
      // to the search query so backend can match tasks by PIC name even when
      // there is no dedicated 'pic' filter on the server.
      const combinedSearch = (searchTerm || "").trim();
      if (combinedSearch) params.set("search", combinedSearch);
      if (statusFilter) params.set("status", statusFilter);
      if (selectedHospital) params.set("hospitalName", selectedHospital);

      const url = `${apiBase}?${params.toString()}`;
      const headers = authHeaders();
      console.debug("[fetchList] Requesting", url, "with Authorization", headers.Authorization ? "present" : "missing");
      const res = await fetch(url, {
        method: "GET",
        headers,
        credentials: "include",
      });
      if (!res.ok) {
        if (res.status === 401) {
          throw new Error(`Unauthorized (401): Token may be expired or invalid. Please login again.`);
        }
        throw new Error(`GET ${url} failed: ${res.status}`);
      }
      const resp = await res.json();
      const items = Array.isArray(resp?.content) ? resp.content : Array.isArray(resp) ? resp : [];
      // Debug: log any items that look like pending Business-created tasks (should be hidden until accepted)
      try {
        const pendingOnServer = (Array.isArray(items) ? items : []).filter((it: unknown) => {
          const ix = it as Record<string, unknown>;
          return ix && (ix['readOnlyForDeployment'] as unknown as boolean) === true && !(ix['receivedById'] || ix['receivedByName']);
        });
        if (pendingOnServer.length > 0) {
          console.debug('[ImplementSuperTaskPage] fetchList: found pendingOnServer items that should be hidden until accepted:', pendingOnServer.map((p: unknown) => {
            const pp = p as Record<string, unknown>;
            return { id: pp['id'], name: pp['name'], hospitalName: pp['hospitalName'], readOnlyForDeployment: pp['readOnlyForDeployment'], receivedById: pp['receivedById'] };
          }));
        }
      } catch (_err) {
        // ignore debug failures
      }
      // Exclude tasks that were created from Business and are still pending acceptance by Deployment
      // These tasks have `readOnlyForDeployment === true` and no `receivedById`/`receivedByName`.
      const filteredItems = (Array.isArray(items) ? items : []).filter((it: unknown) => {
        try {
          const ii = it as PendingTask;
          const received = Boolean(ii?.receivedById || ii?.receivedByName);
          const readOnlyPlaceholder = ii?.readOnlyForDeployment === true;
          const businessPlaceholder = isBusinessContractTask(ii?.name);
          if (readOnlyPlaceholder && !received) return false;
          if (businessPlaceholder && !received) return false;
          return true;
        } catch {
          return true;
        }
      });
      const removedCount = (Array.isArray(items) ? items.length : 0) - filteredItems.length;
      if (removedCount > 0) {
        console.debug('[ImplementSuperTaskPage] fetchList: filtered out', removedCount, 'business placeholder tasks');
      }
      setData(filteredItems);
      // try to read total count from paged response (adjusted for removed placeholders)
      if (resp && typeof resp.totalElements === 'number') {
        setTotalCount(Math.max(0, resp.totalElements - removedCount));
      } else if (Array.isArray(resp)) {
        setTotalCount(Math.max(0, resp.length - removedCount));
      } else {
        setTotalCount(filteredItems.length);
      }
      // disable entrance animation after all staggered animations have started
      if (enableItemAnimation) {
        const itemCount = filteredItems.length;
        // base delay 2000ms for first visible row, +80ms per subsequent row (as in TaskCardNew)
        const maxDelay = itemCount > 1 ? 2000 + ((itemCount - 2) * 80) : 0;
        const animationDuration = 220; // matches TaskCardNew animation duration
        const buffer = 120; // small buffer before turning off
        window.setTimeout(() => setEnableItemAnimation(false), maxDelay + animationDuration + buffer);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg || "Lỗi tải dữ liệu");
    } finally {
      const elapsed = Date.now() - start;
      // enforce MIN_LOADING_MS only for the initial page load so searches/filters feel snappy
      if (isInitialLoad) {
        const remaining = Math.max(0, MIN_LOADING_MS - elapsed);
        await new Promise((res) => setTimeout(res, remaining));
      }
      setLoading(false);
      // after first full load, stop treating loads as initial
      if (isInitialLoad) setIsInitialLoad(false);
    }
  }

  // when page or size changes, refetch
  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, size]);

  async function fetchHospitalOptions(query: string) {
    try {
      const res = await fetch(`${API_ROOT}/api/v1/superadmin/hospitals/search?name=${encodeURIComponent(query || "")}`, { headers: authHeaders() });
      if (!res.ok) return;
      const list = await res.json();
      if (Array.isArray(list)) {
        setHospitalOptions(list.map((h: Record<string, unknown>) => ({ id: Number(h['id'] as unknown as number), label: String(h['label'] ?? h['name'] ?? '') })));
      }
    } catch {
      // ignore
    }
  }

  async function fetchHospitalsWithTasks() {
    setLoadingHospitals(true);
    setError(null);
    try {
      // Fetch hospitals with transfer status (new endpoint)
      const headers = authHeaders();
      console.debug("[fetchHospitalsWithTasks] Authorization header", headers.Authorization ? "present" : "missing");
      const res = await fetch(`${API_ROOT}/api/v1/superadmin/implementation/tasks/hospitals/with-status`, {
        method: "GET",
        headers,
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
      const baseList = (Array.isArray(hospitals) ? hospitals : []).map((hospital: { id: number; label: string; subLabel?: string; taskCount?: number; transferredToMaintenance?: boolean; acceptedByMaintenance?: boolean; personInChargeName?: string | null; personInChargeId?: number | null }) => {
        let taskCount = Number(hospital.taskCount ?? 0);
        let province = hospital.subLabel || "";

        if (!taskCount && hospital.subLabel) {
          const match =
            typeof hospital.subLabel === "string"
              ? hospital.subLabel.match(/(\d+)\s+tasks?/i)
              : null;
          if (match) {
            taskCount = parseInt(match[1], 10);
            province = hospital.subLabel.replace(/\s*-\s*\d+\s+tasks?/i, "").trim();
          }
        }

        return {
          ...hospital,
          subLabel: province, // Keep only province without task count
          taskCount: taskCount,
          visibleTaskCount: taskCount,
          hiddenTaskCount: 0,
          hiddenPendingCount: 0,
          hiddenAcceptedCount: 0,
          nearDueCount: 0, // Initialize to 0 - will be calculated in augment()
          overdueCount: 0, // Initialize to 0 - will be calculated in augment()
          transferredCount: 0,
          personInChargeName: (hospital as { personInChargeName?: string | null })?.personInChargeName ?? null,
          personInChargeId: (hospital as { personInChargeId?: number | null })?.personInChargeId ?? null,
          // Use transfer status from backend
          allTransferred: Boolean(hospital.transferredToMaintenance),
          allAccepted: Boolean(hospital.acceptedByMaintenance),
        };
      });

      const personInChargeLookup = new Map<string, { id: number | null; name: string | null }>();
      baseList.forEach((hospital) => {
        if (!hospital) return;
        const name = (hospital.personInChargeName ?? "").trim();
        const id = hospital.personInChargeId ?? null;
        if (hospital.id != null) {
          personInChargeLookup.set(`id-${hospital.id}`, { id, name: name || null });
        }
        if (hospital.label) {
          personInChargeLookup.set(`name-${hospital.label}`, { id, name: name || null });
        }
      });

      // Fetch all tasks (limited) to compute near due/overdue per hospital
      const allParams = new URLSearchParams({ page: "0", size: "2000", sortBy: "id", sortDir: "asc" });
      const allRes = await fetch(`${apiBase}?${allParams.toString()}`, { method: 'GET', headers: authHeaders(), credentials: 'include' });
      const allPayload = allRes.ok ? await allRes.json() : [];
      const allItems = Array.isArray(allPayload?.content) ? allPayload.content : Array.isArray(allPayload) ? allPayload : [];

      const businessTransferStatus = new Map<string, { hasGeneratedTask: boolean; hasTransfer: boolean; pending: number; accepted: boolean }>();
      const makeHospitalKey = (hospitalId: number | null | undefined, hospitalName: string) => {
        if (hospitalId != null && !Number.isNaN(Number(hospitalId))) return `id-${Number(hospitalId)}`;
        return `name-${hospitalName}`;
      };

      for (const raw of allItems as unknown as PendingTask[]) {
        const hospitalName = (raw.hospitalName || "").toString().trim();
        const hospitalId = typeof raw.hospitalId === "number" ? raw.hospitalId : raw.hospitalId != null ? Number(raw.hospitalId) : null;
        if (!hospitalName) continue;
        const key = makeHospitalKey(hospitalId, hospitalName);
        const received = Boolean(raw.receivedById || raw.receivedByName);
        const businessName = isBusinessContractTask(raw?.name);
        const placeholder = raw.readOnlyForDeployment === true || businessName;
        const pending =
          (!received && raw.readOnlyForDeployment === true) ||
          (!received && businessName);
        if (!placeholder && !pending) continue;
        const entry =
          businessTransferStatus.get(key) || {
            hasGeneratedTask: false,
            hasTransfer: false,
            pending: 0,
            accepted: false,
          };
        if (placeholder) entry.hasGeneratedTask = true;
        if (raw.readOnlyForDeployment === true) entry.hasTransfer = true;
        if (pending) entry.pending += 1;
        if (received && placeholder) entry.accepted = true;
        businessTransferStatus.set(key, entry);
      }

      // Exclude Business-created placeholder tasks from hospital summaries
      const visibleItems = (allItems as PendingTask[]).filter((it) => {
        const received = Boolean((it as PendingTask).receivedById || (it as PendingTask).receivedByName);
        if (it.readOnlyForDeployment === true && !received) return false;
        if (isBusinessContractTask(it?.name) && !received) return false;
        return true;
      });

      // Aggregate by hospitalName from visibleItems (đã filter pending)
      const today = new Date();
      const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
      const acc = new Map<string, { id: number | null; label: string; subLabel?: string; taskCount: number; acceptedCount: number; nearDueCount: number; overdueCount: number; transferredCount: number; acceptedByMaintenanceCount: number }>();
      for (const it of visibleItems as unknown as PendingTask[]) {
        const name = (it.hospitalName || "").toString().trim() || "—";
        const hospitalId = typeof it.hospitalId === "number" ? it.hospitalId : it.hospitalId != null ? Number(it.hospitalId) : null;
        const key = hospitalId != null ? `id-${hospitalId}` : `name-${name}`;
        const current = acc.get(key) || { id: hospitalId, label: name, subLabel: "", taskCount: 0, acceptedCount: 0, nearDueCount: 0, overdueCount: 0, transferredCount: 0, acceptedByMaintenanceCount: 0 };
        if (current.id == null && hospitalId != null) current.id = hospitalId;
        if (!current.label && name) current.label = name;
        current.taskCount += 1;
        const taskStatus = String((it as PendingTask)?.status || '').trim().toUpperCase();
        if (taskStatus === 'COMPLETED') current.acceptedCount += 1;
        // Count transferred tasks
        if ((it as PendingTask).transferredToMaintenance === true) {
          current.transferredCount += 1;
        }
        // Count tasks accepted by maintenance (readOnlyForDeployment = true means maintenance accepted)
        if ((it as PendingTask).readOnlyForDeployment === true && (it as PendingTask).transferredToMaintenance === true) {
          current.acceptedByMaintenanceCount += 1;
        }
        // Count near due / overdue for non-completed
        const deadline = (it as PendingTask).deadline;
        if (taskStatus !== 'COMPLETED' && deadline) {
          const d = new Date(deadline);
          if (!Number.isNaN(d.getTime())) {
            d.setHours(0, 0, 0, 0);
            const dayDiff = Math.round((d.getTime() - startToday) / (24 * 60 * 60 * 1000));
            // Quá hạn: deadline đã qua (dayDiff < 0)
            if (dayDiff < 0) current.overdueCount += 1;
            // Sắp đến hạn: hôm nay hoặc trong 3 ngày tới (0 <= dayDiff <= 3)
            if (dayDiff >= 0 && dayDiff <= 3) current.nearDueCount += 1;
          }
        }
        acc.set(key, current);
      }

      const picAggregation = new Map<string, { ids: Set<string>; names: Set<string> }>();
      const makePicKey = (id: number | null | undefined, name: string) => (id != null ? `id-${id}` : `name-${name}`);
      for (const it of visibleItems as unknown as PendingTask[]) {
        const hospitalId = typeof it.hospitalId === "number" ? it.hospitalId : it.hospitalId != null ? Number(it.hospitalId) : null;
        const hospitalName = (it.hospitalName || "").toString().trim();
        if (!hospitalName) continue;
        const key = makePicKey(hospitalId, hospitalName);
        const entry = picAggregation.get(key) || { ids: new Set<string>(), names: new Set<string>() };
        const picId = (it as { picDeploymentId?: number | null }).picDeploymentId;
        if (picId != null) entry.ids.add(String(picId));
        const picName = (it as PendingTask).picDeploymentName;
        if (picName && picName.trim()) entry.names.add(picName.trim());
        picAggregation.set(key, entry);
      }

      // Merge baseList (có transfer status từ endpoint) với task counts từ aggregation
      // Chỉ hiển thị các bệnh viện có task đã được tiếp nhận
      const previousAcceptanceMap = new Map<string, { acceptedFromBusiness: boolean; allAccepted: boolean; allTransferred: boolean }>();
      for (const item of hospitalsWithTasks) {
        const key =
          item.id != null && !Number.isNaN(Number(item.id))
            ? `id-${Number(item.id)}`
            : `name-${item.label}`;
        if (key)
          previousAcceptanceMap.set(key, {
            acceptedFromBusiness:
              Boolean(item.acceptedFromBusiness) && (item.taskCount ?? 0) === 0,
            allAccepted: Boolean(item.allAccepted),
            allTransferred: Boolean(item.allTransferred),
          });
      }

      const withCompleted = baseList
        .map((h) => {
          const hospitalId = h.id ?? null;
          const hospitalName = h.label;
          const keyById = hospitalId != null ? `id-${hospitalId}` : null;
          const keyByName = `name-${hospitalName}`;
          const aggregated = (keyById && acc.get(keyById)) || acc.get(keyByName);
          const visibleTaskCount = aggregated?.taskCount ?? 0;
          const picInfoById = keyById ? picAggregation.get(keyById) : undefined;
          const picInfoByName = picAggregation.get(keyByName);
          const mergedIds = new Set<string>([
            ...((picInfoById?.ids ?? new Set<string>()) as Set<string>),
            ...((picInfoByName?.ids ?? new Set<string>()) as Set<string>),
          ]);
          const mergedNames = new Set<string>([
            ...((picInfoById?.names ?? new Set<string>()) as Set<string>),
            ...((picInfoByName?.names ?? new Set<string>()) as Set<string>),
          ]);
          const businessInfo =
            (keyById && businessTransferStatus.get(keyById)) ||
            businessTransferStatus.get(keyByName);
          const hiddenPendingCount = businessInfo?.pending ?? 0;
          const hiddenTaskCount = hiddenPendingCount;
          const hiddenAcceptedCount = 0;
          const totalTaskCount = visibleTaskCount + hiddenTaskCount;
          const acceptedVisible = aggregated?.acceptedCount ?? 0;
          const totalAcceptedCount = acceptedVisible + hiddenAcceptedCount;
          const acceptedFromBusiness =
            visibleTaskCount === 0 && Boolean(businessInfo?.accepted);
          const mapped = {
            ...h,
            taskCount: totalTaskCount,
            visibleTaskCount,
            hiddenTaskCount,
            hiddenPendingCount,
            hiddenAcceptedCount,
            acceptedCount: totalAcceptedCount,
            nearDueCount: aggregated?.nearDueCount ?? 0,
            overdueCount: aggregated?.overdueCount ?? 0,
            picDeploymentIds: Array.from(mergedIds),
            picDeploymentNames: Array.from(mergedNames),
            acceptedFromBusiness,
            hasBusinessPlaceholder:
              Boolean(businessInfo?.hasGeneratedTask) || hiddenTaskCount > 0,
            personInChargeName:
              ((keyById && personInChargeLookup.get(keyById)?.name) ||
                personInChargeLookup.get(keyByName)?.name ||
                h.personInChargeName ||
                null),
            personInChargeId:
              ((keyById && personInChargeLookup.get(keyById)?.id) ||
                personInChargeLookup.get(keyByName)?.id ||
                h.personInChargeId ||
                null),
          };
          return mapped;
        })
        .filter((h) => h.taskCount > 0 || h.acceptedFromBusiness); // Hiển thị bệnh viện có task hoặc đã tiếp nhận từ phòng KD

      const mergedWithPersistentAcceptance = withCompleted.map((item) => {
        const key =
          item.id != null && !Number.isNaN(Number(item.id))
            ? `id-${Number(item.id)}`
            : `name-${item.label}`;
        const previous = key ? previousAcceptanceMap.get(key) : undefined;
        const acceptedFromBusiness =
          item.acceptedFromBusiness ||
          ((item.taskCount ?? 0) === 0 && Boolean(previous?.acceptedFromBusiness));
        const allAccepted =
          item.allAccepted || Boolean(previous?.allAccepted);
        const allTransferred =
          item.allTransferred || Boolean(previous?.allTransferred);
        if (
          acceptedFromBusiness !== item.acceptedFromBusiness ||
          allAccepted !== item.allAccepted ||
          allTransferred !== item.allTransferred
        ) {
          return {
            ...item,
            acceptedFromBusiness,
            allAccepted,
            allTransferred,
          };
        }
        return item;
      });

      // Transfer status is already set from backend response, but we need to handle pending transfers
      for (const item of mergedWithPersistentAcceptance) {
        try {
          const idKey = (item.id ?? null) as number | null;
          const labelKey = (item.label || '').toString().trim();
          const hasPending = (idKey != null && pendingTransfersRef.current.has(idKey)) || (labelKey && pendingTransfersRef.current.has(labelKey));
          if ((item.taskCount ?? 0) === 0 || (item.acceptedCount ?? 0) < (item.taskCount ?? 0)) {
            item.allTransferred = false;
            item.allAccepted = false;
          } else {
            if (hasPending && !item.allAccepted) {
              item.allTransferred = true;
              item.allAccepted = false;
            }
            if (item.allAccepted) {
              if (idKey != null) pendingTransfersRef.current.delete(idKey);
              if (labelKey) pendingTransfersRef.current.delete(labelKey);
            }
          }
        } catch (_err) {
          // ignore
        }
      }

      setHospitalsWithTasks(mergedWithPersistentAcceptance);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg || "Lỗi tải danh sách bệnh viện");
    } finally {
      setLoadingHospitals(false);
    }
  }

  async function fetchOutstandingTasksForHospital(hospitalName: string) {
    try {
      const params = new URLSearchParams({
        page: "0",
        size: "200",
        hospitalName,
      });
      const res = await fetch(`${apiBase}?${params.toString()}`, {
        method: "GET",
        headers: authHeaders(),
        credentials: "include",
      });
      if (!res.ok) return [];
      const data = await res.json();
      const list = Array.isArray(data?.content)
        ? data.content
        : Array.isArray(data)
          ? data
          : [];
      const outstanding = (list as PendingTask[]).filter((item) => {
        if (!item) return false;
        const status = String(item.status ?? "").trim().toUpperCase();
        return ![
          "COMPLETED",
          "ACCEPTED",
          "DONE",
          "FINISHED",
          "HOAN_THANH",
          "HOÀN_THÀNH",
        ].includes(status);
      });
      return outstanding;
    } catch {
      return [];
    }
  }

  // Convert all ACCEPTED implementation tasks for a hospital to maintenance
  async function handleConvertHospital(hospital: { id: number; label: string; taskCount?: number; acceptedCount?: number; hiddenPendingCount?: number; hiddenTaskCount?: number }) {
    if (!hospital || !hospital.label) return;

    const taskCount = hospital.taskCount ?? 0;
    const acceptedCount = hospital.acceptedCount ?? 0;
    const remainingCount = taskCount - acceptedCount;
    const hiddenPendingCount = hospital.hiddenPendingCount ?? 0;

    if (taskCount === 0) {
      toastError(`Bệnh viện ${hospital.label} chưa có công việc nào.`);
      return;
    }

    if (hiddenPendingCount > 0) {
      toastError(
        `Không thể chuyển! Vẫn còn ${hiddenPendingCount} công việc do Phòng KD chuyển sang nhưng chưa được tiếp nhận.`,
        { duration: 5000 }
      );
      return;
    }

    if (acceptedCount < taskCount) {
      const visibleRemaining = Math.max(0, remainingCount - hiddenPendingCount);
      const detail =
        hiddenPendingCount > 0
          ? `${hiddenPendingCount} công việc từ Phòng KD`
          : visibleRemaining > 0

          ? `${visibleRemaining} công việc triển khai`
          : `${remainingCount} công việc`;

      toastError(
        `Không thể chuyển! Bạn vẫn còn ${detail} chưa hoàn thành (${acceptedCount}/${taskCount} công việc đã hoàn thành).`,
        { duration: 5000 }
      );
      return;
    }

    if (!confirm(`Chuyển bệnh viện ${hospital.label} sang bảo trì?`)) return;

    try {
      // ✅ API mới: Chuyển bệnh viện (không phải task)
      const res = await fetch(
        `${API_ROOT}/api/v1/admin/hospitals/${hospital.id}/transfer-to-maintenance`,
        {
          method: 'POST',
          headers: authHeaders(),
          credentials: 'include'
        }
      );
      if (!res.ok) {
        const message = (await res.text().catch(() => "")) || "";
        const normalized = message.toLowerCase();
        if (
          normalized.includes("đã có trong danh sách bảo trì") ||
          normalized.includes("already exists")
        ) {
          setHospitalsWithTasks((prev: any[]) =>
            prev.map((h: any) => {
              if (h.id === hospital.id || h.label === hospital.label) {
                return {
                  ...h,
                  allTransferred: true,
                  allAccepted: false,
                };
              }
              return h;
            })
          );
          try {
            const key = hospital.id ?? hospital.label;
            if (key != null) pendingTransfersRef.current.add(key);
          } catch { }
          toastError(message || `Viện đã có trong danh sách bảo trì`);
          return;
        }

        if (
          normalized.includes("chưa hoàn thành") ||
          normalized.includes("incomplete")
        ) {
          try {
            const outstanding = await fetchOutstandingTasksForHospital(hospital.label);
            if (outstanding.length > 0) {
              toastError(
                `Không thể chuyển: vẫn còn ${outstanding.length} công việc chưa hoàn thành (${outstanding
                  .slice(0, 5)
                  .map((task) => `#${task.id ?? ""} ${task.name ?? ""}`.trim())
                  .join(", ")}${outstanding.length > 5 ? ", ..." : ""}).`
              );
            } else {
              toastError(message || "Không thể chuyển sang bảo trì vì vẫn còn công việc chưa hoàn thành.");
            }
          } catch {
            toastError(message || "Không thể chuyển sang bảo trì vì vẫn còn công việc chưa hoàn thành.");
          }
          await fetchHospitalsWithTasks();
          return;
        }

        toastError(message || `Chuyển sang bảo trì thất bại`);
        return;
      }

      toastSuccess(`Đã chuyển bệnh viện ${hospital.label} sang bảo trì`);

      // ✅ Update state ngay lập tức để UI cập nhật
      setHospitalsWithTasks((prev: any[]) => prev.map((h: any) => {
        if (h.id === hospital.id || h.label === hospital.label) {
          return {
            ...h,
            allTransferred: true, // Đã chuyển
            allAccepted: false,   // Chưa tiếp nhận
          };
        }
        return h;
      }));

      // mark this hospital as pending transfer so UI will keep showing "Chờ tiếp nhận"
      try {
        const key = hospital.id ?? hospital.label;
        if (key != null) pendingTransfersRef.current.add(key);
      } catch { }

      // ✅ Refresh để lấy data mới nhất từ backend (sau delay nhỏ)
      await new Promise(resolve => setTimeout(resolve, 300));
      await fetchHospitalsWithTasks();
      if (!showHospitalList && selectedHospital === hospital.label) {
        await fetchList();
      }
    } catch (e: unknown) {
      const m = e instanceof Error ? e.message : String(e);
      toastError(m || 'Lỗi khi chuyển sang bảo trì');
    }
  }

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
        Notification.requestPermission().catch(() => { });
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
          toastSuccess(`Có ${diff} công việc chờ mới cần tiếp nhận`);
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

  // If there are any pending transfers (we recorded them after user action), poll hospital status
  // until backend reports acceptance to flip UI to 'Đã chuyển sang bảo trì'. Poll interval 8s.
  useEffect(() => {
    let active = true;
    const id = window.setInterval(async () => {
      try {
        if (!active) return;
        if (!pendingTransfersRef.current || pendingTransfersRef.current.size === 0) return;
        // Refresh hospital statuses to pick up accepted flags
        await fetchHospitalsWithTasks();
      } catch (err) {
        console.debug('Polling hospital status failed', err);
      }
    }, 8000);
    return () => {
      active = false;
      window.clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredHospitals = React.useMemo(() => {
    let list = hospitalsWithTasks;
    const q = hospitalSearch.trim().toLowerCase();
    if (q) list = list.filter(h => h.label.toLowerCase().includes(q) || (h.subLabel || '').toLowerCase().includes(q));
    if (hospitalStatusFilter === 'accepted') list = list.filter(h => (h.acceptedCount || 0) > 0);
    else if (hospitalStatusFilter === 'incomplete') list = list.filter(h => (h.acceptedCount || 0) < (h.taskCount || 0));
    else if (hospitalStatusFilter === 'unaccepted') list = list.filter(h => (h.acceptedCount || 0) === 0);
    else if (hospitalStatusFilter === 'hasCompleted') list = list.filter(h => (h.acceptedCount || 0) > 0);
    else if (hospitalStatusFilter === 'notCompleted') list = list.filter(h => (h.acceptedCount || 0) < (h.taskCount || 0));
    else if (hospitalStatusFilter === 'noneCompleted') list = list.filter(h => (h.acceptedCount || 0) === 0);
    else if (hospitalStatusFilter === 'transferred') list = list.filter(h => h.allTransferred);
    if (hospitalPicFilter.length > 0) {
      const selectedIds = new Set(hospitalPicFilter.map(String));
      const selectedNames = new Set(
        hospitalPicFilter
          .map((id) => picOptionLabelMap.get(String(id))?.toLowerCase().trim())
          .filter((v): v is string => Boolean(v))
      );
      list = list.filter((h) => {
        const picId = h.personInChargeId != null ? String(h.personInChargeId) : null;
        if (picId && selectedIds.has(picId)) return true;
        const name = h.personInChargeName?.toLowerCase().trim();
        if (name && selectedNames.has(name)) return true;
        return false;
      });
    }
    list = [...list].sort((a, b) => a.label.localeCompare(b.label, 'vi', { sensitivity: 'base' }));
    return list;
  }, [hospitalsWithTasks, hospitalSearch, hospitalStatusFilter, hospitalPicFilter]);

  useEffect(() => {
    if (!selectedHospital) {
      setSelectedHospitalMeta(null);
      return;
    }
    const hospital = hospitalsWithTasks.find((h) => h.label === selectedHospital);
    if (!hospital) return;
    const hiddenPendingCount = hospital.hiddenPendingCount ?? 0;
    const hiddenTaskCount = hospital.hiddenTaskCount ?? hiddenPendingCount;
    const totalTaskCount = hospital.taskCount ?? hiddenTaskCount;
    const visibleTaskCount =
      hospital.visibleTaskCount ??
      Math.max(0, totalTaskCount - hiddenTaskCount);
    setSelectedHospitalMeta({
      hiddenPendingCount,
      hiddenTaskCount,
      totalTaskCount,
      visibleTaskCount,
    });
  }, [hospitalsWithTasks, selectedHospital]);

  const hospitalSummary = React.useMemo(() => {
    const total = hospitalsWithTasks.length;
    const filteredCount = filteredHospitals.length;
    let completed = 0;
    for (const h of hospitalsWithTasks) {
      if ((h.taskCount || 0) > 0 && (h.acceptedCount || 0) === (h.taskCount || 0)) {
        completed += 1;
      }
    }
    return { total, filteredCount, completed };
  }, [hospitalsWithTasks, filteredHospitals]);

  async function fetchAcceptedCountForHospital(hospitalName: string) {
    try {
      // Count only COMPLETED as completed for display
      const p = new URLSearchParams({ page: "0", size: "1", status: "COMPLETED", hospitalName });
      const u = `${apiBase}?${p.toString()}`;
      const r = await fetch(u, { method: 'GET', headers: authHeaders(), credentials: 'include' });
      let count = 0;
      if (r.ok) {
        try {
          const resp = await r.json();
          if (resp && typeof resp.totalElements === 'number') count = resp.totalElements as number;
          else if (Array.isArray(resp)) count = resp.length;
        } catch {
          count = 0;
        }
      }
      setAcceptedCount(count);
    } catch {
      setAcceptedCount(null);
    }
  }

  // Only fetch tasks when a hospital is selected
  useEffect(() => {
    if (!showHospitalList && selectedHospital) {
      fetchList();
      fetchAcceptedCountForHospital(selectedHospital);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedHospital, showHospitalList]);

  // reset page when filters/sort/search change
  useEffect(() => { setPage(0); }, [searchTerm, statusFilter, sortBy, sortDir]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      if (hospitalQuery && hospitalQuery.trim().length > 0) {
        fetchHospitalOptions(hospitalQuery.trim());
      } else {
        setHospitalOptions([]);
      }
    }, 300);
    return () => window.clearTimeout(id);
  }, [hospitalQuery]);

  // debounce searchTerm changes
  useEffect(() => {
    if (searchDebounce.current) window.clearTimeout(searchDebounce.current);
    // small debounce to avoid too many requests while typing
    searchDebounce.current = window.setTimeout(() => {
      fetchList();
    }, 600);
    return () => { if (searchDebounce.current) window.clearTimeout(searchDebounce.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  // refetch immediately when statusFilter changes
  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  // refetch when sort changes
  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy, sortDir]);

  const handleDelete = async (id: number) => {
    if (!confirm("Xóa bản ghi này?")) return;
    const res = await fetch(`${apiBase}/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
      credentials: "include",
    });
    if (!res.ok) {
      const msg = await res.text();
      toastError(`Xóa thất bại: ${msg || res.status}`);
      return;
    }
    // Refresh hospital list to update task counts
    await fetchHospitalsWithTasks();
    // Refresh task list if viewing tasks
    if (!showHospitalList) {
      await fetchList();
      if (selectedHospital) {
        await fetchAcceptedCountForHospital(selectedHospital);
      }
    } else {
      setData((s) => s.filter((x) => x.id !== id));
    }
    toastSuccess("Xóa thành công");
  };

  const handleSubmit = async (payload: Record<string, unknown>, id?: number) => {
    const isUpdate = Boolean(id);
    const url = isUpdate ? `${apiBase}/${id}` : apiBase;
    const method = isUpdate ? "PUT" : "POST";

    const headers = authHeaders();

    const res = await fetch(url, {
      method,
      headers,
      body: JSON.stringify(payload),
      credentials: "include",
    });

    if (!res.ok) {
      let errorMsg = `Status ${res.status}`;
      try {
        const text = await res.text();
        if (text) {
          try {
            const json = JSON.parse(text);
            errorMsg = json.message || json.error || text;
          } catch {
            errorMsg = text;
          }
        }
      } catch {
        // Ignore parse errors
      }

      if (res.status === 401) {
        toastError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
        setTimeout(() => {
          window.location.href = "/signin";
        }, 2000);
        return;
      }

      // Show user-friendly error message
      toastError(errorMsg || `${method} thất bại: ${res.status}`);
      return;
    }

    // Refresh hospital list to update task counts (especially acceptedCount)
    await fetchHospitalsWithTasks();

    // If creating new task, reset to first page and ensure sort by id desc (newest first)
    if (!isUpdate) {
      // Set sort to id desc so new task appears at top
      setPage(0);
      setSortBy("id");
      setSortDir("desc");
      // Fetch immediately with new sort params to ensure new task appears at top
      await fetchList({ page: 0, sortBy: "id", sortDir: "desc" });
      if (selectedHospital && !showHospitalList) {
        await fetchAcceptedCountForHospital(selectedHospital);
      }
    } else {
      // If updating task, just refresh the list
      if (selectedHospital && !showHospitalList) {
        await fetchList();
        await fetchAcceptedCountForHospital(selectedHospital);
      } else {
        await fetchList();
      }
    }

    toastSuccess(isUpdate ? "Cập nhật thành công" : "Tạo mới thành công");
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setViewOnly(false);
    setEditing(null);
  };

  if (!isSuper) {
    return <div className="p-6 text-red-600">Bạn không có quyền truy cập trang SuperAdmin.</div>;
  }

  const handleHospitalClick = (hospitalName: string) => {
    const hospital = hospitalsWithTasks.find((h) => h.label === hospitalName);
    if (hospital) {
      const hiddenPendingCount = hospital.hiddenPendingCount ?? 0;
      const hiddenTaskCount = hospital.hiddenTaskCount ?? hiddenPendingCount;
      const totalTaskCount = hospital.taskCount ?? hiddenTaskCount;
      const visibleTaskCount =
        hospital.visibleTaskCount ??
        Math.max(0, totalTaskCount - hiddenTaskCount);
      setSelectedHospitalMeta({
        hiddenPendingCount,
        hiddenTaskCount,
        totalTaskCount,
        visibleTaskCount,
      });
    } else {
      setSelectedHospitalMeta(null);
    }
    setSelectedHospital(hospitalName);
    setShowHospitalList(false);
    setPage(0); // Reset to first page when selecting a hospital
  };

  const handleBackToHospitals = async () => {
    setSelectedHospital(null);
    setSelectedHospitalMeta(null);
    setShowHospitalList(true);
    setSearchTerm("");
    setStatusFilter("");
    setPage(0);
    setData([]);
    setAcceptedCount(null);
    // Refresh hospital list to update task counts
    await fetchHospitalsWithTasks();
  };

  const clearPicFilter = () => {
    setHospitalPicFilter([]);
    setHospitalPage(0);
    setPicFilterOpen(false);
    setPicFilterQuery("");
  };

  const togglePicFilterValue = (value: string, checked: boolean) => {
    setHospitalPicFilter((prev) => {
      if (checked) {
        if (prev.includes(value)) return prev;
        return [...prev, value];
      }
      return prev.filter((id) => id !== value);
    });
    setHospitalPage(0);
  };

  const clearHospitalStatusFilter = () => {
    setHospitalStatusFilter("");
    setHospitalPage(0);
  };

  const clearTaskStatusFilter = () => {
    setStatusFilter("");
    setPage(0);
  };

  const visibleTaskCountSummary = data.length;
  const totalTaskCountSummary = selectedHospitalMeta
    ? selectedHospitalMeta.visibleTaskCount
    : totalCount ?? data.length;

  const hiddenPendingSummary = selectedHospitalMeta?.hiddenPendingCount ?? 0;
  const showVisibleCountHint =
    selectedHospitalMeta &&
    visibleTaskCountSummary !== totalTaskCountSummary;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">
          {showHospitalList ? "Danh sách bệnh viện có công việc" : `Danh sách công việc triển khai - ${selectedHospital}`}
        </h1>
        <div className="flex items-center gap-3">
          {showHospitalList && null}
          {!showHospitalList && (
            <button
              onClick={handleBackToHospitals}
              className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 text-sm font-medium"
            >
              ← Quay lại danh sách bệnh viện
            </button>
          )}
        </div>
      </div>

      {error && <div className="text-red-600 mb-4">{error}</div>}

      {/* Hospital List View */}
      {showHospitalList && (
        <div className="mb-6 space-y-4">
          <div className="rounded-2xl border bg-white border-gray-200 p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold mb-3">Tìm kiếm & Lọc</h3>
                <div className="flex flex-wrap items-center gap-3">
                  <input
                    type="text"
                    className="rounded-full border px-4 py-3 text-sm shadow-sm min-w-[220px] border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition"
                    placeholder="Tìm theo tên bệnh viện / tỉnh"
                    value={hospitalSearch}
                    onChange={(e) => { setHospitalSearch(e.target.value); setHospitalPage(0); }}
                  />
                  <div className="flex items-center gap-2 w-[280px]">
                    <select
                      className="w-[200px] rounded-full border px-4 py-3 text-sm shadow-sm border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition"
                      value={hospitalStatusFilter}
                      onChange={(e) => { setHospitalStatusFilter(e.target.value); setHospitalPage(0); }}
                    >
                      <option value="" disabled hidden>— Trạng thái —</option>
                      <option value="hasCompleted">Có công việc hoàn thành</option>
                      <option value="notCompleted">Chưa hoàn thành hết</option>
                      <option value="noneCompleted">Chưa có công việc hoàn thành</option>
                      <option value="transferred">Đã chuyển sang bảo trì</option>
                    </select>
                    <button
                      type="button"
                      className={`px-3 py-1.5 text-xs text-blue-600 hover:underline focus:outline-none ${hospitalStatusFilter ? "visible" : "invisible pointer-events-none"}`}
                      onClick={clearHospitalStatusFilter}
                    >
                      Bỏ lọc
                    </button>
                  </div>
                </div>
                <div ref={picFilterDropdownRef} className="flex flex-col gap-2 mt-3">
                  <div className="relative w-full max-w-[200px]">
                    <button
                      type="button"
                      className="w-full rounded-full border px-3 py-2 text-sm shadow-sm text-left flex items-center justify-between gap-2 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition"
                      onClick={() => {
                        setPicFilterPage(0);
                        setPicFilterOpen((prev) => !prev);
                      }}
                    >
                      <span className="truncate">
                        {hospitalPicFilter.length === 0
                          ? "Lọc người phụ trách"
                          : hospitalPicFilter.length === 1
                            ? picOptions.find((opt) => opt.id === hospitalPicFilter[0])?.label ?? "Đã chọn 1"
                            : `Đã chọn ${hospitalPicFilter.length} người phụ trách`}
                      </span>
                      <svg className={`w-4 h-4 transition-transform ${picFilterOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {picFilterOpen && (
                      <div className="absolute z-30 mt-2 w-60 rounded-xl border border-gray-200 bg-white shadow-xl p-3 space-y-3">
                        <input
                          type="text"
                          value={picFilterQuery}
                          onChange={(e) => setPicFilterQuery(e.target.value)}
                          placeholder="Tìm người phụ trách"
                          className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                        />
                        <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                          {filteredPicOptions.length === 0 ? (
                            <div className="text-sm text-gray-500 text-center py-6">
                              Không có dữ liệu người phụ trách
                            </div>
                          ) : (
                            <>
                              {paginatedPicOptions.map((option) => {
                                const value = String(option.id);
                                const checked = hospitalPicFilter.includes(value);
                                return (
                                  <label key={option.id} className="flex items-center gap-2 text-sm text-gray-700">
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={(e) => togglePicFilterValue(value, e.target.checked)}
                                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="truncate">{option.label}</span>
                                  </label>
                                );
                              })}
                              {hasMorePicOptions && (
                                <button
                                  type="button"
                                  onClick={() => setPicFilterPage((prev) => prev + 1)}
                                  className="w-full text-sm text-blue-600 hover:text-blue-700 hover:underline py-2 text-center focus:outline-none"
                                >
                                  Xem thêm ({filteredPicOptions.length - (picFilterPage + 1) * picFilterItemsPerPage} còn lại)
                                </button>
                              )}
                            </>
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <button
                            type="button"
                            className="px-3 py-1.5 text-sm text-blue-600 hover:underline focus:outline-none"
                            onClick={clearPicFilter}
                            disabled={hospitalPicFilter.length === 0}
                          >
                            Bỏ lọc
                          </button>
                          <button
                            type="button"
                            className="px-3 py-1.5 text-sm rounded-full border border-gray-300 text-gray-600 hover:bg-gray-50 focus:outline-none"
                            onClick={() => setPicFilterOpen(false)}
                          >
                            Đóng
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    className={`self-start px-3 py-1.5 text-xs text-blue-600 hover:underline focus:outline-none ${hospitalPicFilter.length === 0 ? "invisible pointer-events-none" : ""}`}
                    onClick={clearPicFilter}
                  >
                    Bỏ lọc người phụ trách
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-gray-600">
                  <span className="font-semibold text-gray-800">
                    Tổng bệnh viện:
                    <span className="ml-1 font-bold text-gray-900">
                      {loadingHospitals ? "..." : hospitalSummary.total}
                    </span>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  className="rounded-xl bg-blue-600 text-white px-5 py-2 shadow hover:bg-blue-700"
                  onClick={() => { setViewOnly(false); setEditing(null); setModalOpen(true); }}
                  type="button"
                >
                  + Thêm công việc mới
                </button>
                <button
                  className="relative inline-flex items-center gap-2 rounded-full border border-gray-300 text-gray-800 px-4 py-2 text-sm bg-white hover:bg-gray-50"
                  onClick={() => {
                    setPendingOpen(true);
                    fetchPendingGroups();
                  }}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                  </svg> Công việc chờ tiếp nhận
                  {pendingGroups.reduce((s, g) => s + (g.tasks?.length || 0), 0) > 0 && (
                    <span className="absolute -top-1 -right-2 bg-red-600 text-white text-xs rounded-full px-2 py-0.5">
                      {pendingGroups.reduce((s, g) => s + (g.tasks?.length || 0), 0)}
                    </span>
                  )}
                </button>
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
            <div className="space-y-4">
              <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">STT</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên bệnh viện</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tỉnh/Thành phố</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phụ trách chính</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Số lượng task</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredHospitals
                        .slice(hospitalPage * hospitalSize, (hospitalPage + 1) * hospitalSize)
                        .map((hospital, index) => {
                          const longName = (hospital.label || "").length > 32;
                          const hiddenPending = hospital.hiddenPendingCount ?? 0;
                          const hiddenTotal = hospital.hiddenTaskCount ?? 0;
                          const hiddenAccepted = hospital.hiddenAcceptedCount ?? 0;
                          const visibleTaskCount = hospital.visibleTaskCount ?? 0;
                          const totalTasks = visibleTaskCount; // Chỉ tính tasks đã tiếp nhận, không bao gồm pending
                          const acceptedTasks = hospital.acceptedCount ?? 0;
                          const visibleAccepted = Math.max(
                            0,
                            acceptedTasks - hiddenAccepted
                          );
                          const hasHidden = hiddenTotal > 0;
                          return (
                            <tr
                              key={hospital.id}
                              className="hover:bg-gray-50 transition-colors cursor-pointer"
                              onClick={() => handleHospitalClick(hospital.label)}
                            >
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {hospitalPage * hospitalSize + index + 1}
                              </td>
                              <td className="px-6 py-4">
                                <div className={`flex gap-3 ${longName ? 'items-start' : 'items-center'}`}>
                                  <div className={`w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0 ${longName ? 'mt-0.5' : ''}`}>
                                    <FiMapPin className="text-blue-600 text-lg" />
                                  </div>
                                  <div className={`text-sm font-medium text-gray-900 break-words max-w-[260px] flex flex-wrap gap-2 ${longName ? 'leading-snug' : ''}`}>
                                    <span>{hospital.label}</span>
                                    {hospital.acceptedFromBusiness && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-sky-100 text-sky-700">
                                        Tiếp nhận từ phòng KD
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {hospital.subLabel || "—"}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                {hospital.personInChargeName || "—"}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm align-top">
                                <div className="flex flex-col items-start gap-1">
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    {acceptedTasks}/{totalTasks} task
                                  </span>
                                  {/* {hasHidden && (
                                    <span className="text-xs text-gray-500">
                                      Hiển thị: {visibleAccepted}/{visibleTaskCount} task
                                    </span>
                                  )} */}
                                  {(hospital.nearDueCount ?? 0) > 0 && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">Sắp đến hạn: {hospital.nearDueCount}</span>
                                  )}
                                  {(hospital.overdueCount ?? 0) > 0 && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Quá hạn: {hospital.overdueCount}</span>
                                  )}
                                  {hiddenPending > 0 && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                                      + {hiddenPending} task từ Phòng KD chờ tiếp nhận
                                    </span>
                                  )}
                                  {hiddenTotal > 0 && hiddenPending === 0 && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-sky-100 text-sky-700">
                                      + {hiddenTotal} task từ Phòng KD đã xử lý
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                <div className="flex items-center gap-3">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleHospitalClick(hospital.label);
                                    }}
                                    className="p-2 rounded-full text-blue-600 hover:text-blue-800 hover:bg-blue-50 transition"
                                    title="Xem công việc"
                                  >
                                    <AiOutlineEye className="text-lg" />
                                  </button>
                                  {(hospital.taskCount || 0) > 0 && hospital.allTransferred && !hospital.allAccepted ? (
                                    <span
                                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-yellow-100 text-yellow-700 text-sm font-medium"
                                    >
                                      ⏳ Chờ tiếp nhận
                                    </span>
                                  ) : (hospital.taskCount || 0) > 0 && hospital.allTransferred && hospital.allAccepted ? (
                                    <span
                                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-sm"
                                    >
                                      ✓ Đã chuyển sang bảo trì
                                    </span>
                                  ) : (hospital.taskCount || 0) > 0 && (hospital.acceptedCount || 0) === (hospital.taskCount || 0) && !hospital.allTransferred ? (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleConvertHospital(hospital);
                                      }}
                                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 text-sm font-medium hover:bg-indigo-100 transition-colors"
                                      title="Chuyển tất cả tác vụ đã nghiệm thu sang bảo trì"
                                    >
                                      ➜ Chuyển sang bảo trì
                                    </button>
                                  ) : (hospital.taskCount || 0) > 0 && (hospital.acceptedCount || 0) < (hospital.taskCount || 0) && (
                                    <span
                                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-sm"
                                      title={
                                        hiddenPending > 0
                                          ? `Còn ${hiddenPending} task từ Phòng KD chưa tiếp nhận`
                                          : `Còn ${Math.max(0, (hospital.taskCount || 0) - (hospital.acceptedCount || 0))} task chưa hoàn thành`
                                      }
                                    >
                                      <span className="text-orange-500">⚠</span>
                                      {hiddenPending > 0 ? "Chưa thể chuyển " : "Chưa thể chuyển"}
                                    </span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pagination for hospitals */}
              <div className="flex items-center justify-between py-3">
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
                    <select
                      value={String(hospitalSize)}
                      onChange={(e) => { setHospitalSize(Number(e.target.value)); setHospitalPage(0); }}
                      className="border rounded px-2 py-1 text-sm"
                    >
                      <option value="10">10</option>
                      <option value="20">20</option>
                      <option value="50">50</option>
                      <option value="100">100</option>
                    </select>
                  </div>

                  <div className="inline-flex items-center gap-1">
                    <button
                      onClick={() => setHospitalPage(0)}
                      disabled={hospitalPage <= 0}
                      className="px-2 py-1 border rounded text-sm disabled:opacity-50"
                      title="Đầu"
                    >
                      «
                    </button>
                    <button
                      onClick={() => setHospitalPage((p) => Math.max(0, p - 1))}
                      disabled={hospitalPage <= 0}
                      className="px-2 py-1 border rounded text-sm disabled:opacity-50"
                      title="Trước"
                    >
                      ‹
                    </button>

                    {/* page numbers */}
                    {(() => {
                      const total = Math.max(1, Math.ceil(filteredHospitals.length / hospitalSize));
                      const pages: number[] = [];
                      // show up to 5 pages: current, +/-2, constrained
                      const start = Math.max(1, hospitalPage + 1 - 2);
                      const end = Math.min(total, start + 4);
                      for (let i = start; i <= end; i++) pages.push(i);
                      return pages.map((p) => (
                        <button
                          key={p}
                          onClick={() => setHospitalPage(p - 1)}
                          className={`px-3 py-1 border rounded text-sm ${hospitalPage + 1 === p ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700'}`}
                        >
                          {p}
                        </button>
                      ));
                    })()}

                    <button
                      onClick={() => setHospitalPage((p) => Math.min(Math.max(0, Math.ceil(filteredHospitals.length / hospitalSize) - 1), p + 1))}
                      disabled={(hospitalPage + 1) * hospitalSize >= filteredHospitals.length}
                      className="px-2 py-1 border rounded text-sm disabled:opacity-50"
                      title="Tiếp"
                    >
                      ›
                    </button>
                    <button
                      onClick={() => setHospitalPage(Math.max(0, Math.ceil(filteredHospitals.length / hospitalSize) - 1))}
                      disabled={(hospitalPage + 1) * hospitalSize >= filteredHospitals.length}
                      className="px-2 py-1 border rounded text-sm disabled:opacity-50"
                      title="Cuối"
                    >
                      »
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Task List View */}
      {!showHospitalList && (
        <>
          <div className="mb-6 rounded-xl border bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold mb-3">Tìm kiếm & Lọc</h3>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative">
                    <input
                      list="hospital-list"
                      type="text"
                      className="rounded-full border px-4 py-3 text-sm shadow-sm min-w-[220px]"
                      placeholder="Tìm theo tên (gõ để gợi ý bệnh viện)"
                      value={searchTerm}
                      onChange={(e) => { setSearchTerm(e.target.value); setHospitalQuery(e.target.value); setSelectedHospital(null); }}
                      onKeyDown={(e) => { if (e.key === 'Enter') { fetchList(); } }}
                      onBlur={(e) => {
                        const val = e.currentTarget.value?.trim() || '';
                        if (val.length > 0 && hospitalOptions.some((h) => h.label === val)) {
                          setSelectedHospital(val);
                        } else {
                          setSelectedHospital(null);
                        }
                      }}
                    />
                    <datalist id="hospital-list">
                      {hospitalOptions.map((h) => (
                        <option key={h.id} value={h.label} />
                      ))}
                    </datalist>
                  </div>

                  <div className="flex items-center gap-2 w-[260px]">
                    <select
                      className="w-[200px] rounded-full border px-4 py-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <option value="" disabled hidden>— Trạng thái —</option>
                      <option value="RECEIVED">Đã tiếp nhận</option>
                      <option value="IN_PROCESS">Đang xử lý</option>
                      <option value="COMPLETED">Hoàn thành</option>
                      <option value="ISSUE">Gặp sự cố</option>
                      <option value="CANCELLED">Hủy</option>
                    </select>
                    <button
                      type="button"
                      className={`px-3 py-1.5 text-xs text-blue-600 hover:underline focus:outline-none ${statusFilter ? "visible" : "invisible pointer-events-none"}`}
                      onClick={clearTaskStatusFilter}
                    >
                      Bỏ lọc
                    </button>
                  </div>
                </div>
                <div className="mt-3 text-sm text-gray-600 flex flex-wrap items-center gap-4">
                  <span>
                    Tổng:{" "}
                    <span className="font-semibold text-gray-800">
                      {loading ? "..." : totalTaskCountSummary}
                    </span>
                    {showVisibleCountHint && (
                      <span className="ml-2 text-xs text-gray-500">
                        (Hiển thị {visibleTaskCountSummary})
                      </span>
                    )}
                  </span>
                  {typeof acceptedCount === "number" && (
                    <span>
                      Đã hoàn thành:{" "}
                      <span className="font-semibold text-gray-800">
                        {acceptedCount}/{totalTaskCountSummary} task
                      </span>
                    </span>
                  )}
                  {hiddenPendingSummary > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-700">
                      + {hiddenPendingSummary} task từ Phòng KD chờ tiếp nhận
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  className="rounded-xl bg-blue-600 text-white px-5 py-2 shadow hover:bg-blue-700"
                  onClick={() => {
                    // Pre-fill hospital if we're viewing tasks for a specific hospital
                    const hospitalId = selectedHospital ? hospitalsWithTasks.find(h => h.label === selectedHospital)?.id : undefined;
                    setViewOnly(false);
                    setEditing(hospitalId ? ({ hospitalId, hospitalName: selectedHospital } as unknown as ImplTask) : null);
                    setModalOpen(true);
                  }}
                >
                  + Thêm mới
                </button>
                <button className="rounded-full border px-4 py-2 text-sm shadow-sm" onClick={async () => {
                  setSearchTerm(''); setStatusFilter(''); setSortBy('id'); setSortDir('asc'); setPage(0);
                  // show loading indicator for at least a short duration for UX
                  setLoading(true);
                  const start = Date.now();
                  await fetchList();
                  const minMs = 800;
                  const elapsed = Date.now() - start;
                  if (elapsed < minMs) await new Promise((r) => setTimeout(r, minMs - elapsed));
                  setLoading(false);
                }}>Làm mới</button>
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
                data.length === 0 ? (
                  hiddenPendingSummary > 0 && visibleTaskCountSummary === 0 ? (
                    <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
                      <p className="text-base font-medium text-gray-800 dark:text-gray-100">
                        Có {hiddenPendingSummary} công việc từ Phòng KD đang chờ tiếp nhận.
                      </p>
                      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        Mở danh sách “Viện chờ tiếp nhận” để tiếp nhận hoặc kiểm tra các công việc này.
                      </p>
                      <div className="mt-4 flex justify-center">
                        <button
                          type="button"
                          onClick={() => {
                            setPendingOpen(true);
                            fetchPendingGroups();
                          }}
                          className="rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700"
                        >
                          Xem danh sách chờ
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 p-8 text-center text-gray-600 dark:text-gray-400">
                      Không có dữ liệu
                    </div>
                  )
                ) : (
                  // Do not show tasks created from Business that are pending acceptance by Deployment/SuperAdmin.
                  // A task is pending when readOnlyForDeployment === true AND it has not been received (no receivedById).
                  (() => {
                    const visible = data.filter((r) => {
                      const rr = r as Record<string, unknown>;
                      const rod = (rr['readOnlyForDeployment'] as unknown as boolean) === true;
                      const received = Boolean(rr['receivedById'] || rr['receivedByName']);
                      const nameRaw =
                        typeof rr['name'] === 'string'
                          ? (rr['name'] as string)
                          : String(rr['name'] ?? '');
                      const businessPlaceholder = isBusinessContractTask(nameRaw);
                      if (rod && !received) return false;
                      if (businessPlaceholder && !received) return false;
                      return true;
                    });
                    return visible.map((row, idx) => {
                      // For SuperAdmin we still allow editing/deleting of regular tasks.
                      const displayed = row as ImplTask;
                      return (
                        <TaskCard
                          key={row.id}
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          task={displayed as any}
                          idx={idx}
                          animate={enableItemAnimation}
                          // open detail as view-only
                          onOpen={(t) => { setEditing(t); setViewOnly(true); setModalOpen(true); }}
                          onEdit={(t) => { setEditing(t); setViewOnly(false); setModalOpen(true); }}
                          onDelete={(id) => handleDelete(id)}
                          canEdit={true}
                          canDelete={true}
                          allowEditCompleted={true} // ✅ SuperAdmin có thể sửa/xóa task đã hoàn thành
                        />
                      );
                    });
                  })()
                )
              )}
            </div>
          </div>

          {/* Pagination controls */}
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button className="px-3 py-1 border rounded" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page <= 0}>Prev</button>
              <span>Trang {page + 1}{totalCount ? ` / ${Math.max(1, Math.ceil(totalCount / size))}` : ""}</span>
              <button className="px-3 py-1 border rounded" onClick={() => setPage((p) => p + 1)} disabled={totalCount !== null && (page + 1) * size >= (totalCount || 0)}>Next</button>
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
        </>
      )}

      {/* Modal - Always render regardless of view */}
      {viewOnly ? (
        <DetailModal open={modalOpen} onClose={handleModalClose} item={editing} />
      ) : (
        <TaskFormModal
          open={modalOpen}
          onClose={handleModalClose}
          initial={editing ? { ...editing, picDeploymentId: editing.picDeploymentId ?? undefined } as any : undefined}
          onSubmit={handleSubmit}
          readOnly={false}
          transferred={Boolean(((editing as unknown as PendingTask)?.transferredToMaintenance) || String(editing?.status ?? '').toUpperCase() === 'TRANSFERRED')}
        />
      )}

      {pendingOpen && (
        <div
          className="fixed inset-0 z-50 grid place-items-center p-4 bg-black/40"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setPendingOpen(false); }}
        >
          <div className="w-full max-w-4xl rounded-2xl bg-white shadow-2xl border border-gray-200 overflow-auto max-h-[80vh]">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold">📨 Công việc chờ - Tiếp nhận từ Phòng Kinh Doanh</h3>
              <div className="flex items-center gap-2">
                <button
                  className="h-10 rounded-full px-4 text-sm font-medium transition shadow-sm border border-gray-300 text-gray-700 hover:bg-gray-50"
                  onClick={() => setPendingOpen(false)}
                >
                  Đóng
                </button>
                <button
                  className="h-10 rounded-full px-4 text-sm font-medium transition shadow-sm border border-blue-200 text-blue-600 hover:bg-blue-50"
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
                <div className="text-center py-8 text-gray-500">Không có công việc chờ</div>
              ) : (
                <>
                  <div className="mb-4 flex justify-end">
                    <button
                      className="h-10 rounded-full px-5 text-sm font-medium transition shadow-sm bg-green-600 text-white hover:bg-green-700 disabled:bg-green-300 disabled:cursor-not-allowed"
                      onClick={handleAcceptAll}
                      disabled={pendingGroups.reduce((sum, g) => sum + g.tasks.length, 0) === 0}
                    >
                      Tiếp nhận tất cả ({pendingGroups.reduce((sum, g) => sum + g.tasks.length, 0)})
                    </button>
                  </div>
                  <div className="space-y-3">
                    {pendingGroups.map((g) => (
                      <div
                        key={`${g.hospitalId ?? 'null'}-${g.hospitalName}`}
                        className="border border-gray-200 rounded-xl px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition"
                      >
                        <div>
                          <div className="font-semibold text-gray-900">{g.hospitalName}</div>
                          <div className="text-sm text-gray-500">{g.tasks.length} công việc chờ</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            className="h-10 rounded-full px-4 text-sm font-medium transition shadow-sm bg-blue-600 text-white hover:bg-blue-700"
                            onClick={() => handleAcceptGroup(g.hospitalId)}
                          >
                            Tiếp nhận
                          </button>
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

function DetailModal({
  open,
  onClose,
  item,
}: {
  open: boolean;
  onClose: () => void;
  item: ImplTask | null;
}) {
  const [picNames, setPicNames] = React.useState<Array<{ id: number; name: string }>>([]);
  const [loadingPics, setLoadingPics] = React.useState(false);

  // Fetch tên các PIC khi modal mở
  React.useEffect(() => {
    if (!open || !item) {
      setPicNames([]);
      return;
    }

    const picIds = parsePicIdsFromAdditionalRequest(item.additionalRequest, item.picDeploymentId);
    if (picIds.length <= 1) {
      // Chỉ có 1 PIC, dùng tên từ item
      if (item.picDeploymentId && item.picDeploymentName) {
        setPicNames([{ id: item.picDeploymentId, name: item.picDeploymentName }]);
      } else {
        setPicNames([]);
      }
      return;
    }

    // Fetch tên các PIC từ API
    setLoadingPics(true);
    Promise.all(
      picIds.map(async (id) => {
        try {
          const url = `${API_ROOT}/api/v1/superadmin/users/${id}`;
          const res = await fetch(url, { headers: authHeaders(), credentials: "include" });
          if (!res.ok) return { id, name: String(id) };
          const user = await res.json();
          const name = user.fullName || user.fullname || user.name || user.username || user.email || String(id);
          return { id, name: String(name) };
        } catch {
          return { id, name: String(id) };
        }
      })
    )
      .then((results) => {
        setPicNames(results);
      })
      .catch(() => {
        // Nếu lỗi, dùng tên từ item cho PIC đầu tiên
        if (item.picDeploymentId && item.picDeploymentName) {
          setPicNames([{ id: item.picDeploymentId, name: item.picDeploymentName }]);
        }
      })
      .finally(() => {
        setLoadingPics(false);
      });
  }, [open, item]);

  if (!open || !item) return null;

  const fmt = (d?: string | null) => (d ? new Date(d).toLocaleString("vi-VN") : "—");

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
        className="w-full max-w-4xl rounded-2xl bg-white dark:bg-gray-900 shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden max-h-[90vh] flex flex-col"
      >
        {/* Sticky Header */}
        <div className="sticky top-0 z-20 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2"><FiClipboard className="text-xl text-gray-700" /> <span>Chi tiết tác vụ triển khai</span></h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-800">✕</button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto px-6 py-6 space-y-6 text-sm text-gray-800 dark:text-gray-200 [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
            <Info icon={<FiActivity />} label="Tên" value={item.name} />
            <Info icon={<FiMapPin />} label="Bệnh viện" value={item.hospitalName} />
            <Info 
              icon={<FiUser />} 
              label="Người phụ trách" 
              value={
                loadingPics ? (
                  <span className="text-gray-500">Đang tải...</span>
                ) : picNames.length > 0 ? (
                  <span className="font-medium">
                    {picNames.map((pic, idx) => (
                      <span key={pic.id}>
                        {idx > 0 && <span className="text-gray-400">, </span>}
                        {pic.name}
                      </span>
                    ))}
                  </span>
                ) : (
                  item.picDeploymentName || "-"
                )
              } 
            />

            <Info
              icon={<FiInfo className="text-gray-500" />}
              label="Trạng thái"
              value={(
                <span className={`px-3 py-1 text-xs font-medium rounded-full ${statusBadgeClasses(item.status)}`}>
                  {statusLabel(item.status)}
                </span>
              )}
            />

            {/* Pending tasks modal moved to top-level so it has access to state/functions */}
            <Info icon={<FiLink />} label="API URL" value={item.apiUrl} />
            <Info icon={<FiActivity />} label="API Test" value={item.apiTestStatus} />
            <Info icon={<FiInfo />} label="Số lượng" value={item.quantity ?? "—"} />
            <Info icon={<FiClock />} label="Deadline" value={fmt(item.deadline)} />
            <Info icon={<FiCalendar />} label="Ngày bắt đầu" value={fmt(item.startDate)} />
            <Info icon={<FiCalendar />} label="Ngày hoàn thành" value={fmt(item.finishDate ?? item.completionDate)} />
            <Info icon={<FiCalendar />} label="Tạo lúc" value={fmt(item.createdAt)} />
          </div>

          <div>
            <p className="text-gray-500 mb-2">Ghi chú / Yêu cầu bổ sung:</p>
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 min-h-[60px]">
              {(() => {
                const notes = item.notes || (item as any).additionalRequest || "";
                // Loại bỏ phần [PIC_IDS: ...] khỏi hiển thị
                const cleaned = notes.replace(/\[PIC_IDS:\s*[^\]]+\]\s*/g, "").trim();
                return cleaned || "—";
              })()}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex justify-end px-6 py-4 border-t bg-white dark:bg-gray-900">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Đóng
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function Info({ label, value, icon }: { label: string; value?: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4">
      <div className="min-w-[150px]">
        <span className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          {icon}
          {label}:
        </span>
      </div>
      <div className="flex-1 text-gray-700 dark:text-gray-300 break-words">{value ?? "—"}</div>
    </div>
  );
}

export default ImplementSuperTaskPage;

