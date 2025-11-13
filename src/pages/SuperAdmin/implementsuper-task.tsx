import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";// hoặc copy 2 hàm này từ trang cũ nếu bạn chưa có
import { FiClipboard, FiMapPin, FiUser, FiClock, FiLink, FiActivity, FiCalendar, FiInfo } from "react-icons/fi";
import toast from "react-hot-toast";
import TaskCard from "./TaskCardNew";
import TaskFormModal from "./TaskFormModal";

const API_ROOT = import.meta.env.VITE_API_URL || "http://localhost:8080";
const MIN_LOADING_MS = 2000; // ensure spinner shows at least ~2s for perceived smoothness

type ImplTask = {
  id: number;
  name: string;
  hospitalName?: string | null;
  picDeploymentName?: string | null;
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
  const [picFilter] = useState<string>("");
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
  const [userOptions, setUserOptions] = useState<Array<{ id: number; label: string }>>([]);
  const [acceptedCount, setAcceptedCount] = useState<number | null>(null);
  
  // New state for hospital list view
  const [showHospitalList, setShowHospitalList] = useState<boolean>(true);
  const [hospitalsWithTasks, setHospitalsWithTasks] = useState<Array<{ id: number; label: string; subLabel?: string; taskCount?: number; acceptedCount?: number; nearDueCount?: number; overdueCount?: number; transferredCount?: number; allTransferred?: boolean; allAccepted?: boolean }>>([]);
  const [loadingHospitals, setLoadingHospitals] = useState<boolean>(false);
  const [hospitalPage, setHospitalPage] = useState<number>(0);
  const [hospitalSize, setHospitalSize] = useState<number>(20);
  const [hospitalSearch, setHospitalSearch] = useState<string>("");
  const [hospitalStatusFilter, setHospitalStatusFilter] = useState<string>("");
  const [hospitalSortBy, setHospitalSortBy] = useState<string>("label");
  const [hospitalSortDir, setHospitalSortDir] = useState<string>("asc");
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
      toast.error(msg || 'Lỗi khi tải danh sách chờ');
    } finally {
      setLoadingPending(false);
    }
    return pendingCountRef.current;
  }

  async function handleAcceptTask(taskId: number, suppressRefresh = false) {
    try {
      const url = `${API_ROOT}/api/v1/admin/implementation/accept/${taskId}`;
      const res = await fetch(url, { method: 'PUT', headers: authHeaders(), credentials: 'include' });
      if (res.status === 401) {
        toast.error('Bạn chưa đăng nhập hoặc không có quyền. Vui lòng đăng nhập lại.');
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
      toast.success('Đã tiếp nhận công việc');
      // refresh hospital/task lists so the accepted task and its hospital appear in the main views
      if (!suppressRefresh) {
        try { await fetchHospitalsWithTasks(); } catch (err) { console.debug('fetchHospitalsWithTasks after accept failed', err); }
        try { if (!showHospitalList) await fetchList(); } catch (err) { console.debug('fetchList after accept failed', err); }
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(msg || 'Lỗi khi tiếp nhận công việc');
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
      let combinedSearch = (searchTerm || "").trim();
      if (picFilter) {
        const found = userOptions.find((u) => String(u.id) === String(picFilter));
        if (found && found.label) {
          combinedSearch = [combinedSearch, found.label].filter(Boolean).join(" ");
        }
      }
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
          const isPending = (ii?.readOnlyForDeployment === true) && !((ii?.receivedById) || (ii?.receivedByName));
          return !isPending;
        } catch {
          return true;
        }
      });
      if (filteredItems.length !== (items || []).length) {
        console.debug('[ImplementSuperTaskPage] fetchList: filtered out', (items || []).length - filteredItems.length, 'pending business-created tasks until accepted');
      }
      setData(filteredItems);
      // try to read total count from paged response
  if (resp && typeof resp.totalElements === 'number') setTotalCount(resp.totalElements);
  else setTotalCount(Array.isArray(resp) ? resp.length : null);
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

  async function fetchUserOptions() {
    try {
      if (selectedHospital) {
        await fetchUsersByHospital(selectedHospital);
        return;
      }
      const res = await fetch(`${API_ROOT}/api/v1/superadmin/users/search?name=`, { headers: authHeaders() });
      if (!res.ok) return;
      const list = await res.json();
      // expecting EntitySelectDTO { id, label }
      if (Array.isArray(list)) {
        setUserOptions(list.map((u: Record<string, unknown>) => ({ id: Number(u['id'] as unknown as number), label: String((u['label'] ?? u['fullname'] ?? u['id']) as unknown) })));
      }
    } catch {
      // ignore
    }
  }

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

  async function fetchUsersByHospital(hospitalName: string) {
    try {
      const res = await fetch(`${API_ROOT}/api/v1/superadmin/users/by-hospital?hospitalName=${encodeURIComponent(hospitalName)}`, { headers: authHeaders() });
      if (!res.ok) return;
      const list = await res.json();
      if (Array.isArray(list)) {
        setUserOptions(list.map((u: Record<string, unknown>) => ({ id: Number(u['id'] as unknown as number), label: String(u['fullname'] ?? u['label'] ?? '') })));
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
            const u = `${apiBase}?${p.toString()}`;
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
      const allRes = await fetch(`${apiBase}?${allParams.toString()}`, { method: 'GET', headers: authHeaders(), credentials: 'include' });
      const allPayload = allRes.ok ? await allRes.json() : [];
      const allItems = Array.isArray(allPayload?.content) ? allPayload.content : Array.isArray(allPayload) ? allPayload : [];
      const augment = (list: Array<typeof baseList[number] & { acceptedCount?: number }>) => {
        // Reset all nearDueCount and overdueCount to 0 before counting
        for (const item of list) {
          item.nearDueCount = 0;
          item.overdueCount = 0;
          item.transferredCount = 0;
        }
        
        const today = new Date();
        const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
        
        for (const it of allItems as unknown as PendingTask[]) {
          // Skip tasks that were created by Business and are still pending acceptance by Deployment
          // These should not affect hospital aggregations (nearDue/overdue/transferred counts)
          try {
            const maybe = it as PendingTask;
            if (maybe?.readOnlyForDeployment === true && !(maybe?.receivedById || maybe?.receivedByName)) {
              continue;
            }
          } catch {
            // ignore cast errors
          }
          const statusUp = String((it as PendingTask)?.status || '').trim().toUpperCase();
          const label = String((it as PendingTask)?.hospitalName || '').trim();
          const target = list.find(x => x.label === label);
          if (!target) continue;
          
          // Check if task is transferred to maintenance
          const isTransferred = Boolean((it as PendingTask)?.transferredToMaintenance) || statusUp === 'TRANSFERRED';
          
          // Update transferred count
          if (isTransferred) {
            target.transferredCount = (target.transferredCount || 0) + 1;
          }
          if (statusUp === 'TRANSFERRED') {
            target.acceptedCount = (target.acceptedCount || 0) + 1;
          }
          
          // CRITICAL: Skip ALL completed/transferred tasks when counting near due/overdue
          // This must be checked BEFORE calculating deadline status
          // Tasks that are completed or transferred should NOT be counted in nearDueCount/overdueCount
          if (statusUp === 'COMPLETED' || isTransferred) {
            continue; // Skip this task - do not count towards near due/overdue
          }
          
          // Only process tasks that are NOT completed and NOT transferred
          if (!it?.deadline) continue;
          const d = new Date(it.deadline);
          if (Number.isNaN(d.getTime())) continue;
          d.setHours(0,0,0,0);
          const dayDiff = Math.round((d.getTime() - startToday) / (24 * 60 * 60 * 1000));
          
          // Quá hạn: deadline đã qua (dayDiff < 0)
          if (dayDiff < 0) {
            target.overdueCount = (target.overdueCount || 0) + 1;
          }
          // Sắp đến hạn: hôm nay hoặc trong 3 ngày tới (0 <= dayDiff <= 3)
          else if (dayDiff >= 0 && dayDiff <= 3) {
            target.nearDueCount = (target.nearDueCount || 0) + 1;
          }
        }
      };

      const withCompleted = baseList.map((h, idx) => ({ ...h, acceptedCount: completedCounts[idx] ?? 0 }));
      augment(withCompleted);

      // Transfer status is already set from backend response, but we need to handle pending transfers
      for (const item of withCompleted) {
        // If user just converted this hospital and it's recorded in pendingTransfersRef,
        // keep showing the pending state (allTransferred=true, allAccepted=false)
        try {
          const idKey = (item.id ?? null) as number | null;
          const labelKey = (item.label || '').toString().trim();
          const hasPending = (idKey != null && pendingTransfersRef.current.has(idKey)) || (labelKey && pendingTransfersRef.current.has(labelKey));
          if (hasPending && !item.allAccepted) {
            item.allTransferred = true;
            item.allAccepted = false;
          }
          // If backend reports accepted, remove from pending set
          if (item.allAccepted) {
            if (idKey != null) pendingTransfersRef.current.delete(idKey);
            if (labelKey) pendingTransfersRef.current.delete(labelKey);
          }
        } catch (_err) {
          // ignore
        }
      }

      setHospitalsWithTasks(withCompleted);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg || "Lỗi tải danh sách bệnh viện");
    } finally {
      setLoadingHospitals(false);
    }
  }

  // Convert all ACCEPTED implementation tasks for a hospital to maintenance
  async function handleConvertHospital(hospital: { id: number; label: string; taskCount?: number; acceptedCount?: number }) {
    if (!hospital || !hospital.label) return;
    
    const taskCount = hospital.taskCount ?? 0;
    const acceptedCount = hospital.acceptedCount ?? 0;
    const remainingCount = taskCount - acceptedCount;
    
    // Validate: chỉ cho phép chuyển khi tất cả task đã hoàn thành
    if (taskCount === 0) {
      toast.error(`Bệnh viện ${hospital.label} chưa có task nào.`);
      return;
    }
    
    if (acceptedCount < taskCount) {
      toast.error(
        `Không thể chuyển! Bạn vẫn còn ${remainingCount} công việc chưa hoàn thành (${acceptedCount}/${taskCount} task đã hoàn thành).`,
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
        await res.text().catch(() => null); // Consume response body
        toast.error(`Viện đã có trong danh sách bảo trì`);
        return;
      }
      
      toast.success(`Đã chuyển bệnh viện ${hospital.label} sang bảo trì`);

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
      } catch {}

      // ✅ Refresh để lấy data mới nhất từ backend (sau delay nhỏ)
      await new Promise(resolve => setTimeout(resolve, 300));
      await fetchHospitalsWithTasks();
      if (!showHospitalList && selectedHospital === hospital.label) {
        await fetchList();
      }
    } catch (e: unknown) {
      const m = e instanceof Error ? e.message : String(e);
      toast.error(m || 'Lỗi khi chuyển sang bảo trì');
    }
  }

  useEffect(() => {
    fetchHospitalsWithTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Poll pending groups periodically and show notifications when new pending tasks arrive
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

    // Initial load
    (async () => {
      try {
        const initial = await fetchPendingGroups();
        lastPendingCountRef.current = initial;
      } catch (err) {
        console.debug('Initial fetchPendingGroups failed', err);
      }
    })();

    const intervalId = window.setInterval(async () => {
      try {
        const newCount = await fetchPendingGroups();
        const last = lastPendingCountRef.current || 0;
        if (!mounted) return;
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
  }, []);

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
    if (hospitalStatusFilter === 'accepted') list = list.filter(h => (h.taskCount || 0) > 0 && (h.taskCount || 0) === (h.taskCount || 0) && (h.acceptedCount || 0) > 0);
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
      return a.label.localeCompare(b.label) * dir;
    });
    return list;
  }, [hospitalsWithTasks, hospitalSearch, hospitalStatusFilter, hospitalSortBy, hospitalSortDir]);

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
      fetchUserOptions();
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
  }, [searchTerm, picFilter]);

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
      toast.error(`Xóa thất bại: ${msg || res.status}`);
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
    toast.success("Xóa thành công");
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
        toast.error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
        setTimeout(() => {
          window.location.href = "/signin";
        }, 2000);
        return;
      }
      
      // Show user-friendly error message
      toast.error(errorMsg || `${method} thất bại: ${res.status}`);
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
    
    toast.success(isUpdate ? "Cập nhật thành công" : "Tạo mới thành công");
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
    setSelectedHospital(hospitalName);
    setShowHospitalList(false);
    setPage(0); // Reset to first page when selecting a hospital
  };

  const handleBackToHospitals = async () => {
    setSelectedHospital(null);
    setShowHospitalList(true);
    setSearchTerm("");
    setStatusFilter("");
    setPage(0);
    setData([]);
    setAcceptedCount(null);
    // Refresh hospital list to update task counts
    await fetchHospitalsWithTasks();
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">
          {showHospitalList ? "Danh sách bệnh viện có task" : `Danh sách công việc triển khai - ${selectedHospital}`}
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
          <div className="rounded-2xl border bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold mb-3">Tìm kiếm & Lọc</h3>
                <div className="flex flex-wrap items-center gap-3">
                  <input
                    type="text"
                    className="rounded-full border px-4 py-3 text-sm shadow-sm min-w-[220px]"
                    placeholder="Tìm theo tên bệnh viện / tỉnh"
                    value={hospitalSearch}
                    onChange={(e) => { setHospitalSearch(e.target.value); setHospitalPage(0); }}
                  />
                  <select
                    className="rounded-full border px-4 py-3 text-sm shadow-sm min-w-[180px]"
                    value={hospitalStatusFilter}
                    onChange={(e) => { setHospitalStatusFilter(e.target.value); setHospitalPage(0); }}
                  >
                    <option value="">— Tất cả —</option>
                    <option value="accepted">Có hoàn thành</option>
                    <option value="incomplete">Chưa hoàn thành hết</option>
                    <option value="unaccepted">Chưa có hoàn thành</option>
                  </select>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
                  <span className="font-semibold text-gray-800 dark:text-gray-200">
                    Tổng bệnh viện:
                    <span className="ml-1 font-bold text-gray-900 dark:text-gray-100">
                      {loadingHospitals ? "..." : hospitalSummary.total}
                    </span>
                  </span>
                  {/* <span className="font-semibold text-gray-800 dark:text-gray-200">
                    Đang hiển thị:
                    <span className="ml-1 font-bold text-gray-900 dark:text-gray-100">
                      {loadingHospitals ? "..." : hospitalSummary.filteredCount}
                    </span>
                  </span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">
                    Đã hoàn thành 100%:
                    <span className="ml-1 font-bold text-gray-900 dark:text-gray-100">
                      {loadingHospitals ? "..." : hospitalSummary.completed}
                    </span>
                  </span> */}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <select className="rounded-lg border px-3 py-2 text-sm" value={hospitalSortBy} onChange={(e) => { setHospitalSortBy(e.target.value); setHospitalPage(0); }}>
                  <option value="label">Sắp xếp theo: tên</option>
                  <option value="taskCount">Sắp xếp theo: tổng task</option>
                  <option value="accepted">Sắp xếp theo: đã hoàn thành</option>
                  <option value="ratio">Sắp xếp theo: tỉ lệ hoàn thành</option>
                </select>
                <select className="rounded-lg border px-3 py-2 text-sm" value={hospitalSortDir} onChange={(e) => setHospitalSortDir(e.target.value)}>
                  <option value="asc">Tăng dần</option>
                  <option value="desc">Giảm dần</option>
                </select>
                <button 
                  className="rounded-lg bg-blue-600 text-white px-3 py-1.5 shadow hover:bg-blue-700 text-sm"
                  onClick={() => {
                    setViewOnly(false);
                    setEditing(null);
                    setModalOpen(true);
                  }}
                  type="button"
                >
                  + Thêm task mới
                </button>
                {/* Pending tasks button (fetch from admin endpoint) */}
                <button
                  className="relative ml-2 inline-flex items-center gap-2 rounded-lg border border-blue-200 text-blue-600 px-2 py-1 text-sm hover:bg-blue-50"
                  onClick={() => { setPendingOpen(true); fetchPendingGroups(); }}
                >
                  <span className="inline-flex items-center" style={{fontSize: '0.95rem'}}>📨</span>
                  <span className="ml-1">Công việc chờ</span>
                  {pendingGroups.reduce((s, g) => s + (g.tasks?.length || 0), 0) > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[11px] rounded-full px-1.5 py-0.5">
                      {pendingGroups.reduce((s, g) => s + (g.tasks?.length || 0), 0)}
                    </span>
                  )}
                </button>
                {/* Pending modal - placed here so it can access component state/functions */}
                {pendingOpen && (
                  <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-black/40" onMouseDown={(e) => { if (e.target === e.currentTarget) setPendingOpen(false); }}>
                    <div className="w-full max-w-4xl rounded-2xl bg-white shadow-2xl border border-gray-200 overflow-auto max-h-[80vh]">
                      <div className="p-4 border-b flex items-center justify-between">
                        <h3 className="text-lg font-semibold">📨 Công việc chờ - Tiếp nhận từ Phòng Kinh Doanh</h3>
                        <div className="flex items-center gap-2">
                          <button className="px-3 py-1 rounded" onClick={() => { setPendingOpen(false); }}>Đóng</button>
                          <button className="px-3 py-1 rounded border" onClick={async () => { await fetchPendingGroups(); }}>Làm mới</button>
                        </div>
                      </div>
                      <div className="p-4 space-y-4">
                        {loadingPending ? (
                          <div className="text-center py-8">Đang tải...</div>
                        ) : pendingGroups.length === 0 ? (
                          <div className="text-center py-8">Không có công việc chờ</div>
                        ) : (
                          pendingGroups.map((g) => (
                            <div key={`${g.hospitalId ?? 'null'}-${g.hospitalName}`} className="border rounded-lg p-3">
                              <div className="flex items-center justify-between mb-2">
                                <div className="font-semibold">{g.hospitalName} <span className="text-sm text-gray-500">({g.tasks.length})</span></div>
                                <div className="flex items-center gap-2">
                                  <button className="px-3 py-1 rounded" onClick={() => handleAcceptGroup(g.hospitalId)}>Tiếp nhận tất cả</button>
                                </div>
                              </div>
                              <div className="space-y-2">
                                {g.tasks.map((t: PendingTask) => (
                                  <div key={t.id} className="p-2 rounded-md border bg-gray-50 flex items-center justify-between">
                                    <div>
                                      <div className="font-medium">{t.name}</div>
                                      <div className="text-sm text-gray-600">Số lượng: {t.quantity ?? '—'}</div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <button className="px-3 py-1 rounded bg-green-50 text-green-700" onClick={() => handleAcceptTask(t.id)}>Tiếp nhận</button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {loadingHospitals ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-blue-600 text-4xl font-extrabold tracking-wider animate-pulse" aria-hidden="true">TAG</div>
            </div>
          ) : filteredHospitals.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 p-8 text-center text-gray-500">
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
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Số lượng task</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredHospitals
                        .slice(hospitalPage * hospitalSize, (hospitalPage + 1) * hospitalSize)
                        .map((hospital, index) => (
                        <tr 
                          key={hospital.id}
                          className="hover:bg-gray-50 transition-colors cursor-pointer"
                          onClick={() => handleHospitalClick(hospital.label)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {hospitalPage * hospitalSize + index + 1}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                                <FiMapPin className="text-blue-600 text-lg" />
                              </div>
                              <div className="text-sm font-medium text-gray-900">{hospital.label}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {hospital.subLabel || "—"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm align-top">
                            <div className="flex flex-col items-start gap-1">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {(hospital.acceptedCount ?? 0)}/{hospital.taskCount ?? 0} task
                              </span>
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
                                  handleHospitalClick(hospital.label);
                                }}
                                className="text-blue-600 hover:text-blue-800 font-medium"
                              >
                                Xem task 
                              </button>
                              { (hospital.taskCount || 0) > 0 && hospital.allTransferred && !hospital.allAccepted ? (
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
                                  title={`Còn ${(hospital.taskCount || 0) - (hospital.acceptedCount || 0)} task chưa hoàn thành`}
                                >
                                  <span className="text-orange-500">⚠</span>
                                  Chưa thể chuyển
                                </span>
                              ) }
                            </div>
                          </td>
                        </tr>
                      ))}
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
            <h3 className="text-lg font-semibold mb-3">Tìm kiếm & Thao tác</h3>
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
                      fetchUsersByHospital(val);
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

              <select
                className="rounded-full border px-4 py-3 text-sm shadow-sm min-w-[160px]"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">— Chọn trạng thái —</option>
                <option value="RECEIVED">Đã tiếp nhận</option>
                <option value="IN_PROCESS">Đang xử lý</option>
                <option value="COMPLETED">Hoàn thành</option>
                <option value="ISSUE">Gặp sự cố</option>
                <option value="CANCELLED">Hủy</option>
              </select>
            </div>
            <div className="mt-3 text-sm text-gray-600 flex items-center gap-4">
              <span> Tổng: <span className="font-semibold text-gray-800">{loading ? '...' : (totalCount ?? data.length)}</span></span>
              {typeof acceptedCount === 'number' && (totalCount ?? data.length) !== null && (
                <span>
                  Đã hoàn thành: <span className="font-semibold text-gray-800">{acceptedCount}/{totalCount ?? data.length} task</span>
                </span>
              )}
            </div>
          </div>
 
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <select className="rounded-lg border px-3 py-2 text-sm" value={sortBy} onChange={(e) => { setSortBy(e.target.value); setPage(0); }}>
                <option value="id">Sắp xếp theo: id</option>
                <option value="hospitalName">Sắp xếp theo: bệnh viện</option>
                <option value="deadline">Sắp xếp theo: deadline</option>
              </select>
              <select className="rounded-lg border px-3 py-2 text-sm" value={sortDir} onChange={(e) => setSortDir(e.target.value)}>
                <option value="asc">Tăng dần</option>
                <option value="desc">Giảm dần</option>
              </select>
            </div>

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
              <div className="px-4 py-6 text-center text-gray-500">Không có dữ liệu</div>
            ) : (
              // Do not show tasks created from Business that are pending acceptance by Deployment/SuperAdmin.
              // A task is pending when readOnlyForDeployment === true AND it has not been received (no receivedById).
              (() => {
                const visible = data.filter((r) => {
                  const rr = r as Record<string, unknown>;
                  const rod = rr['readOnlyForDeployment'] as unknown as boolean;
                  const receivedId = rr['receivedById'];
                  const receivedName = rr['receivedByName'];
                  const name = String(rr['name'] ?? '').toLowerCase();
                  const looksLikeBusiness = name.includes('business contract') || name.includes('business:') || name.includes('contract:');
                  // Hide if explicitly marked readOnlyForDeployment and not yet received,
                  // or defensively hide if it looks like a Business-created task and not yet received.
                  const notReceived = !(receivedId || receivedName);
                  if ((rod === true && notReceived) || (notReceived && looksLikeBusiness)) return false;
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
          initial={editing ?? undefined}
          onSubmit={handleSubmit}
          readOnly={false}
          transferred={Boolean(((editing as unknown as PendingTask)?.transferredToMaintenance) || String(editing?.status ?? '').toUpperCase() === 'TRANSFERRED')}
        />
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
            <Info icon={<FiUser />} label="Người phụ trách" value={item.picDeploymentName} />

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
              {item.notes?.trim() || "—"}
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

