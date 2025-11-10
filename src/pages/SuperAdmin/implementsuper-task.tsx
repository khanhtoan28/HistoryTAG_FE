import React, { useEffect, useState, useRef } from "react";
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
  const [sortDir, setSortDir] = useState<string>("asc");
  const [page, setPage] = useState<number>(0);
  const [size, setSize] = useState<number>(10);
  const [enableItemAnimation, setEnableItemAnimation] = useState<boolean>(true);
  const [userOptions, setUserOptions] = useState<Array<{ id: number; label: string }>>([]);
  const [acceptedCount, setAcceptedCount] = useState<number | null>(null);
  
  // New state for hospital list view
  const [showHospitalList, setShowHospitalList] = useState<boolean>(true);
  const [hospitalsWithTasks, setHospitalsWithTasks] = useState<Array<{ id: number; label: string; subLabel?: string; taskCount?: number; acceptedCount?: number; nearDueCount?: number; overdueCount?: number; transferredCount?: number; allTransferred?: boolean }>>([]);
  const [loadingHospitals, setLoadingHospitals] = useState<boolean>(false);
  const [hospitalPage, setHospitalPage] = useState<number>(0);
  const [hospitalSize, setHospitalSize] = useState<number>(20);
  const [hospitalSearch, setHospitalSearch] = useState<string>("");
  const [hospitalStatusFilter, setHospitalStatusFilter] = useState<string>("");
  const [hospitalSortBy, setHospitalSortBy] = useState<string>("label");
  const [hospitalSortDir, setHospitalSortDir] = useState<string>("asc");

  const apiBase = `${API_ROOT}/api/v1/superadmin/implementation/tasks`;

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ImplTask | null>(null);
  const [viewOnly, setViewOnly] = useState<boolean>(false);

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
      setData(items);
      // try to read total count from paged response
  if (resp && typeof resp.totalElements === 'number') setTotalCount(resp.totalElements);
  else setTotalCount(Array.isArray(resp) ? resp.length : null);
  // disable entrance animation after all staggered animations have started
      if (enableItemAnimation) {
        const itemCount = items.length;
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
      // Fetch hospitals (backend now includes task count in subLabel)
      const headers = authHeaders();
      console.debug("[fetchHospitalsWithTasks] Authorization header", headers.Authorization ? "present" : "missing");
      const res = await fetch(`${API_ROOT}/api/v1/superadmin/implementation/tasks/hospitals`, {
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
      const baseList = (Array.isArray(hospitals) ? hospitals : []).map((hospital: { id: number; label: string; subLabel?: string }) => {
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
          nearDueCount: 0,
          overdueCount: 0,
          transferredCount: 0,
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
        const today = new Date();
        const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
        for (const it of allItems as any[]) {
          const statusUp = String(it?.status || '').toUpperCase();
          const label = String(it?.hospitalName || '').trim();
          const target = list.find(x => x.label === label);
          if (!target) continue;
          const isTransferred = Boolean((it as any)?.transferredToMaintenance) || statusUp === 'TRANSFERRED';
          if (isTransferred) {
            target.transferredCount = (target.transferredCount || 0) + 1;
          }
          if (statusUp === 'TRANSFERRED') {
            target.acceptedCount = (target.acceptedCount || 0) + 1;
          }
          // Skip completed tasks when counting near due/overdue
          if (statusUp === 'COMPLETED' || isTransferred) continue;
          if (!it?.deadline) continue;
          const d = new Date(it.deadline);
          if (Number.isNaN(d.getTime())) continue;
          d.setHours(0,0,0,0);
          const dayDiff = Math.round((d.getTime() - startToday) / (24 * 60 * 60 * 1000));
          if (dayDiff === -1 || dayDiff === 0) target.nearDueCount = (target.nearDueCount || 0) + 1;
          if (dayDiff < 0) target.overdueCount = (target.overdueCount || 0) + 1;
        }
      };

      const withCompleted = baseList.map((h, idx) => ({ ...h, acceptedCount: completedCounts[idx] ?? 0, allTransferred: false }));
      augment(withCompleted);
      for (const item of withCompleted) {
        const total = item.taskCount ?? 0;
        const transferredCount = item.transferredCount ?? 0;
        item.allTransferred = total > 0 && transferredCount >= total;
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
    
    if (!confirm(`Chuyển tất cả tác vụ đã hoàn thành (${acceptedCount}/${taskCount}) của ${hospital.label} sang bảo trì?`)) return;
    
    try {
      const res = await fetch(
        `${API_ROOT}/api/v1/admin/implementation/hospital/${hospital.id}/convert-to-maintenance`,
        {
          method: 'POST',
          headers: authHeaders(),
          credentials: 'include'
        }
      );
      if (!res.ok) {
        const t = await res.text().catch(() => null);
        toast.error(`Không thể chuyển sang bảo trì: ${t || res.status}`);
        return;
      }
      let payload: {
        convertedCount?: number;
        failedTaskIds?: number[];
        failedMessages?: string[];
        alreadyTransferredCount?: number;
        skippedCount?: number;
      } | null = null;

      try {
        payload = await res.json();
      } catch {
        payload = null;
      }

      const converted = payload?.convertedCount ?? acceptedCount;
      const already = payload?.alreadyTransferredCount ?? 0;
      const failedList = Array.isArray(payload?.failedTaskIds) ? payload?.failedTaskIds ?? [] : [];
      const failed = failedList.length;

      let successMsg = `Đã yêu cầu chuyển ${converted} tác vụ của ${hospital.label} sang bảo trì`;
      if (already > 0) successMsg += ` (đã chuyển trước đó: ${already})`;
      toast.success(`${successMsg}.`);

      if (failed > 0) {
        const detail = (payload?.failedMessages || []).filter(Boolean).join('; ');
        toast.error(`Có ${failed} tác vụ chuyển thất bại${detail ? `: ${detail}` : ''}`);
      }

      // refresh
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
    
    // If creating new task or updating task for a specific hospital, refresh task list
    if (!isUpdate || (selectedHospital && !showHospitalList)) {
      await fetchList();
      if (selectedHospital && !showHospitalList) {
        await fetchAcceptedCountForHospital(selectedHospital);
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
                  <span className="font-semibold text-gray-800 dark:text-gray-200">
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
                  </span>
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
                  className="rounded-xl bg-blue-600 text-white px-5 py-2 shadow hover:bg-blue-700"
                  onClick={() => {
                    setViewOnly(false);
                    setEditing(null);
                    setModalOpen(true);
                  }}
                  type="button"
                >
                  + Thêm task mới
                </button>
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
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">Sắp hạn: {hospital.nearDueCount}</span>
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
                              { (hospital.taskCount || 0) > 0 && hospital.allTransferred ? (
                                <span 
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-sm"
                                >
                                  Đã chuyển sang bảo trì
                                </span>
                              ) : (hospital.taskCount || 0) > 0 && (hospital.acceptedCount || 0) === (hospital.taskCount || 0) ? (
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
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button 
                    className="px-3 py-1 border rounded" 
                    onClick={() => setHospitalPage((p) => Math.max(0, p - 1))} 
                    disabled={hospitalPage <= 0}
                  >
                    Prev
                  </button>
                  <span className="text-sm">
                    Trang {hospitalPage + 1} / {Math.max(1, Math.ceil(filteredHospitals.length / hospitalSize))}
                  </span>
                  <button 
                    className="px-3 py-1 border rounded" 
                    onClick={() => setHospitalPage((p) => p + 1)} 
                    disabled={(hospitalPage + 1) * hospitalSize >= filteredHospitals.length}
                  >
                    Next
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm">Số hàng:</label>
                  <select 
                    value={String(hospitalSize)} 
                    onChange={(e) => { 
                      setHospitalSize(Number(e.target.value)); 
                      setHospitalPage(0); 
                    }} 
                    className="border rounded px-2 py-1 text-sm"
                  >
                    <option value="10">10</option>
                    <option value="20">20</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                  </select>
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
                setEditing(hospitalId ? { hospitalId, hospitalName: selectedHospital } as any : null); 
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
              data.map((row, idx) => {
                  // SuperAdmin should be allowed to edit/delete even if backend marks readOnlyForDeployment
                  const displayed = { ...(row as any), readOnlyForDeployment: false } as ImplTask;
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
                      hideHospitalName={true}
                    />
                  );
              })
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
          transferred={Boolean((editing as any)?.transferredToMaintenance || String(editing?.status ?? '').toUpperCase() === 'TRANSFERRED')}
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
