import { Link } from "react-router-dom";
import PageMeta from "../../components/common/PageMeta";
import { useEffect, useState, useCallback } from "react";
import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import { getSummaryReport, type SuperAdminSummaryDTO, HardwareAPI, getAllImplementationTasks, getAllDevTasks, getAllMaintenanceTasks, getAllUsers, UserResponseDTO, ImplementationTaskResponseDTO, DevTaskResponseDTO, MaintenanceTaskResponseDTO } from "../../api/superadmin.api";
import { searchHospitals } from "../../api/business.api";
import api from "../../api/client";
import { getBusinesses } from "../../api/business.api";
import toast from "react-hot-toast";

function StatCard({ title, value, icon, color }: { title: string; value: string | number; icon?: React.ReactNode; color?: string }) {
  let display: React.ReactNode = value;
  if (typeof value === 'string' && value.endsWith(' ₫')) {
    const num = value.slice(0, -2);
    display = <span className="whitespace-nowrap"><span>{num}</span><span className="ml-1">&nbsp;₫</span></span>;
  }

  return (
    <div className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-md border border-gray-100 h-28">
      <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg text-white ${color ?? 'bg-slate-400'}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1 flex flex-col justify-center">
        <div className="text-xs text-gray-500">{title}</div>
        <div className="mt-1 flex items-baseline gap-2">
          <div className="text-2xl font-extrabold text-gray-900 whitespace-nowrap" title={typeof value === 'number' ? value.toLocaleString() : String(value)}>
            {display}
          </div>
        </div>
      </div>
    </div>
  );
}

type ApexFormatterOpts = { w?: { globals?: { series?: number[] } }; seriesIndex?: number } | undefined;
export default function SuperAdminHome() {
  const [summary, setSummary] = useState<SuperAdminSummaryDTO | null>(null);
  const [businessFrom, setBusinessFrom] = useState<string>('');
  const [businessTo, setBusinessTo] = useState<string>('');
  const [businessLoading, setBusinessLoading] = useState(false);
  const [totalExpected, setTotalExpected] = useState<number | null>(null);
  const [totalActual, setTotalActual] = useState<number | null>(null);
  const [totalCommission, setTotalCommission] = useState<number | null>(null);
  const [conversionRate, setConversionRate] = useState<number | null>(null);
  type BusinessItem = { totalPrice: number; commission: number; status: string; date: Date | null };
  const [businessItems, setBusinessItems] = useState<BusinessItem[]>([]);
  const [groupBy, setGroupBy] = useState<'day' | 'month' | 'year'>('day');
  const [aggLabels, setAggLabels] = useState<string[]>([]);
  const [aggExpected, setAggExpected] = useState<number[]>([]);
  const [aggActual, setAggActual] = useState<number[]>([]);
  const [aggCommission, setAggCommission] = useState<number[]>([]);
  const [hwGroupBy, setHwGroupBy] = useState<'hardware' | 'type' | 'supplier'>('hardware');
  const [hwTopN, setHwTopN] = useState<number>(8);
  const [hwRows, setHwRows] = useState<Array<{ key: string; label: string; revenue: number; quantity: number; taskCount: number; impl: number; dev: number; maint: number; image?: string }>>([]);
  const [hwLoading, setHwLoading] = useState(false);
  // Hospital profile states
  const [profileHospitalId, setProfileHospitalId] = useState<string>('');
  const [profileQuery, setProfileQuery] = useState<string>('');
  const [profileSuggestions, setProfileSuggestions] = useState<Array<{ id: number; name: string }>>([]);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileHospital, setProfileHospital] = useState<Record<string, unknown> | null>(null);
  const [profileUsers, setProfileUsers] = useState<UserResponseDTO[]>([]);
  const [profileImplTasks, setProfileImplTasks] = useState<ImplementationTaskResponseDTO[]>([]);
  const [profileDevTasks, setProfileDevTasks] = useState<DevTaskResponseDTO[]>([]);
  const [profileMaintTasks, setProfileMaintTasks] = useState<MaintenanceTaskResponseDTO[]>([]);
  const [profileBusinesses, setProfileBusinesses] = useState<Array<Record<string, unknown>>>([]);
  const [hardwareMap, setHardwareMap] = useState<Record<string, string>>({});
  const [profileQuarter, setProfileQuarter] = useState<'all' | 'Q1' | 'Q2' | 'Q3' | 'Q4'>('all');
  const [profileYear, setProfileYear] = useState<string>('');
  const [exportChoice, setExportChoice] = useState<'users' | 'impl' | 'dev' | 'maint' | 'businesses' | 'all' | 'all_single'>('users');
  // per-table status filters
  const [implStatusFilter, setImplStatusFilter] = useState<string>('all');
  const [devStatusFilter, setDevStatusFilter] = useState<string>('all');
  const [maintStatusFilter, setMaintStatusFilter] = useState<string>('all');
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await getSummaryReport();
        if (mounted) setSummary(res);
      } catch (err: unknown) {
        console.error("Failed to load summary:", err);
        const msg = err instanceof Error ? err.message : String(err);
        toast.error(msg || "Không thể tải báo cáo");
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, []);

  // load business report
  const loadBusinessReport = useCallback(async (from?: string, to?: string) => {
    setBusinessLoading(true);
    try {
      const toParam = (v?: string | null) => v ? (v.length === 16 ? `${v}:00` : v) : undefined;
      const params: Record<string, unknown> = {};
      if (from) params.startDateFrom = toParam(from);
      if (to) params.startDateTo = toParam(to);
      // fetch all matching projects (backend paginates; request a large size to try to get all)
      const res = await getBusinesses({ page: 0, size: 10000, ...params });
      const content = Array.isArray(res?.content) ? res.content : (Array.isArray(res) ? res : []);
      const itemsRaw = (content as Array<Record<string, unknown>>).map((c) => {
        const rawDate = c['startDate'] ?? c['completionDate'] ?? null;
        const parsedDate = rawDate ? new Date(String(rawDate)) : null;
        return {
          totalPrice: c['totalPrice'] != null ? Number(String(c['totalPrice'])) : 0,
          commission: c['commission'] != null ? Number(String(c['commission'])) : 0,
          status: (c['status'] as string) ?? '',
          date: parsedDate,
        } as BusinessItem;
      });

      const totalExp = itemsRaw.reduce((acc, it) => acc + (it.totalPrice ?? 0), 0);
      const contracted = itemsRaw.filter((it) => (it.status ?? '').toString().toUpperCase() === 'CONTRACTED');
      const totalAct = contracted.reduce((acc, it) => acc + (it.totalPrice ?? 0), 0);
      const totalComm = contracted.reduce((acc, it) => acc + (it.commission ?? 0), 0);
      const totalCount = itemsRaw.length;
      const contractedCount = contracted.length;
      const conv = totalCount > 0 ? (contractedCount / totalCount) * 100 : null;

      setTotalExpected(totalExp);
      setTotalActual(totalAct);
      setTotalCommission(totalComm);
      setConversionRate(conv != null ? Math.round(conv * 100) / 100 : null);
      // keep raw items for aggregation/charting
      setBusinessItems(itemsRaw);
    } catch (err: unknown) {
      console.error('Failed to load business report', err);
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg || 'Không thể tải báo cáo kinh doanh');
      setTotalExpected(null);
      setTotalActual(null);
      setTotalCommission(null);
      setConversionRate(null);
    } finally {
      setBusinessLoading(false);
    }
  }, []);

  // load on mount
  useEffect(() => {
    void loadBusinessReport();
  }, [loadBusinessReport]);

  // aggregate when items or grouping change
  useEffect(() => {
    if (!businessItems || businessItems.length === 0) {
      setAggLabels([]);
      setAggExpected([]);
      setAggActual([]);
      setAggCommission([]);
      return;
    }

    const map = new Map<string, { expected: number; actual: number; commission: number }>();
    businessItems.forEach((it) => {
      if (!it.date) return;
      const d = it.date;
      const key = groupBy === 'year'
        ? String(d.getFullYear())
        : groupBy === 'month'
        ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!map.has(key)) map.set(key, { expected: 0, actual: 0, commission: 0 });
      const entry = map.get(key)!;
      entry.expected += it.totalPrice ?? 0;
      if ((it.status ?? '').toString().toUpperCase() === 'CONTRACTED') {
        entry.actual += it.totalPrice ?? 0;
        entry.commission += it.commission ?? 0;
      }
    });

    const keys = Array.from(map.keys()).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    if (groupBy === 'year') {
      const years = keys.map((k) => Number(k));
      const minY = Math.min(...years);
      const maxY = Math.max(...years);
      const labels: string[] = [];
      const expected: number[] = [];
      const actual: number[] = [];
      const commission: number[] = [];
      for (let y = minY; y <= maxY; y++) {
        const k = String(y);
        const e = map.get(k);
        labels.push(k);
        expected.push(e ? e.expected : 0);
        actual.push(e ? e.actual : 0);
        commission.push(e ? e.commission : 0);
      }
      setAggLabels(labels);
      setAggExpected(expected);
      setAggActual(actual);
      setAggCommission(commission);
      return;
    }
    if (groupBy === 'day') {
      // keys are in YYYY-MM-DD format; build contiguous date range
      const minKey = keys[0];
      const maxKey = keys[keys.length - 1];
      const minDate = new Date(minKey);
      const maxDate = new Date(maxKey);
      const labels: string[] = [];
      const expected: number[] = [];
      const actual: number[] = [];
      const commission: number[] = [];
      for (let d = new Date(minDate); d <= maxDate; d.setDate(d.getDate() + 1)) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const k = `${y}-${m}-${dd}`;
        const e = map.get(k);
        // display label as DD-MM-YYYY to match screenshot
        labels.push(`${dd}-${m}-${y}`);
        expected.push(e ? e.expected : 0);
        actual.push(e ? e.actual : 0);
        commission.push(e ? e.commission : 0);
      }
      setAggLabels(labels);
      setAggExpected(expected);
      setAggActual(actual);
      setAggCommission(commission);
      return;
    }

    // month grouping: keep YYYY-MM keys but display as MM-YYYY for readability
    const labels: string[] = [];
    const expected: number[] = [];
    const actual: number[] = [];
    const commission: number[] = [];
    keys.forEach((k) => {
      const e = map.get(k)!;
      // k is YYYY-MM; convert to MM-YYYY label
      const parts = k.split('-');
      const label = parts.length >= 2 ? `${parts[1]}-${parts[0]}` : k;
      labels.push(label);
      expected.push(e.expected);
      actual.push(e.actual);
      commission.push(e.commission);
    });
    setAggLabels(labels);
    setAggExpected(expected);
    setAggActual(actual);
    setAggCommission(commission);
  }, [businessItems, groupBy]);

  // load hardware report for dashboard widget
  const loadHardwareReport = useCallback(async () => {
    setHwLoading(true);
    try {
      const hwResp = await HardwareAPI.getAllHardware({ size: 10000 });
      const hardwareList = Array.isArray(hwResp) ? (hwResp as unknown[]) : ((hwResp as unknown) as { content?: unknown[] })?.content || [];

      const busResp = await getBusinesses({ size: 10000 });
      const businessList = Array.isArray(busResp) ? (busResp as unknown[]) : ((busResp as unknown) as { content?: unknown[] })?.content || [];

      const implResp = await getAllImplementationTasks({ size: 10000 });
      const implList = Array.isArray(implResp) ? (implResp as unknown[]) : ((implResp as unknown) as { content?: unknown[] })?.content || [];
      const devResp = await getAllDevTasks({ size: 10000 });
      const devList = Array.isArray(devResp) ? (devResp as unknown[]) : ((devResp as unknown) as { content?: unknown[] })?.content || [];
      const maintResp = await getAllMaintenanceTasks({ size: 10000 });
      const maintList = Array.isArray(maintResp) ? (maintResp as unknown[]) : ((maintResp as unknown) as { content?: unknown[] })?.content || [];

      const hwById: Record<string, Record<string, unknown>> = {};
      hardwareList.forEach((hRaw) => {
        const h = hRaw as Record<string, unknown> | undefined;
        if (!h) return;
        const id = h['id'];
        const name = h['name'];
        if (id != null) hwById[String(id)] = h;
        if (name != null) hwById[`name:${String(name)}`] = h;
      });

  const map = new Map<string, { label: string; revenue: number; quantity: number; taskCount: number; impl: number; dev: number; maint: number }>();

      function ensure(key: string, label: string) {
        let v = map.get(key);
        if (!v) {
          v = { label, revenue: 0, quantity: 0, taskCount: 0, impl: 0, dev: 0, maint: 0 };
          map.set(key, v);
        }
        return v;
      }

      // businesses -> revenue & quantity (only CONTRACTED considered for revenue)
      (businessList as unknown[]).forEach((bRaw) => {
        const b = bRaw as Record<string, unknown> | undefined;
        try {
          if (!b) return;
          const status = String(b['status'] ?? '').toUpperCase();
          const hwId = (b['hardware'] && (b['hardware'] as any)['id']) ?? b['hardwareId'] ?? null;
          const hwName = (b['hardware'] && ((b['hardware'] as any)['label'] ?? (b['hardware'] as any)['name'])) ?? b['hardwareName'] ?? null;
          const hwMeta = hwId != null ? hwById[String(hwId)] : (hwName ? hwById[`name:${String(hwName)}`] : undefined);
          let key = 'unknown';
          let label = '-';
            if (hwGroupBy === 'hardware') {
            if (hwId) { key = `hw:${String(hwId)}`; label = String((hwMeta && hwMeta['name']) ?? hwName ?? String(hwId)); }
            else if (hwName) { key = `hwname:${String(hwName)}`; label = String(hwName); }
          } else if (hwGroupBy === 'type') {
            const t = String((hwMeta && hwMeta['type']) ?? '—'); key = `type:${t}`; label = t;
          } else {
            const s = String((hwMeta && hwMeta['supplier']) ?? '—'); key = `sup:${s}`; label = s;
          }
          const row = ensure(key, label);
          if (status === 'CONTRACTED') {
            const total = b['totalPrice'] != null ? Number(b['totalPrice']) : (b['unitPrice'] != null && b['quantity'] != null ? Number(b['unitPrice']) * Number(b['quantity']) : 0);
            row.revenue += Number(total || 0);
            row.quantity += Number(b['quantity'] ?? 0);
          }
        } catch {
          // ignore
        }
      });

      const addTasks = (list: unknown[], kind: 'impl' | 'dev' | 'maint') => {
        list.forEach((tRaw) => {
          const t = tRaw as Record<string, unknown> | undefined;
          try {
            if (!t) return;
            const tHwObj = (t['hardware'] as Record<string, unknown> | undefined) ?? undefined;
            const hwId = t['hardwareId'] ?? (tHwObj && tHwObj['id'] != null ? tHwObj['id'] : null);
            const hwName = t['hardwareName'] ?? (tHwObj ? (tHwObj['name'] ?? tHwObj['label']) : (t['hardware'] ?? null));
            const hwMeta = hwId != null ? hwById[String(hwId)] : (hwName ? hwById[`name:${String(hwName)}`] : undefined);
            let key = 'unknown';
            let label = '-';
            if (hwGroupBy === 'hardware') {
              if (hwId) { key = `hw:${String(hwId)}`; label = String((hwMeta && hwMeta['name']) ?? hwName ?? String(hwId)); }
              else if (hwName) { key = `hwname:${String(hwName)}`; label = String(hwName); }
            } else if (hwGroupBy === 'type') {
              const tval = String((hwMeta && hwMeta['type']) ?? '—'); key = `type:${tval}`; label = tval;
            } else {
              const sval = String((hwMeta && hwMeta['supplier']) ?? '—'); key = `sup:${sval}`; label = sval;
            }
            const row = ensure(key, label);
            row.taskCount += 1;
            if (kind === 'impl') row.impl += 1;
            if (kind === 'dev') row.dev += 1;
            if (kind === 'maint') row.maint += 1;
            row.quantity += Number(t['quantity'] ?? 0);
          } catch {
            // ignore
          }
        });
      };

      addTasks(implList, 'impl');
      addTasks(devList, 'dev');
      addTasks(maintList, 'maint');

      const out = Array.from(map.entries()).map(([k, v]) => {
        let image = '';
        try {
          if (k.startsWith('hw:')) {
            const id = k.slice(3);
            const meta = hwById[String(id)];
            if (meta) image = String(meta['image'] ?? meta['imageUrl'] ?? meta['thumbnail'] ?? '');
          } else if (k.startsWith('hwname:')) {
            const name = k.slice(7);
            const meta = hwById[`name:${name}`];
            if (meta) image = String(meta['image'] ?? meta['imageUrl'] ?? meta['thumbnail'] ?? '');
          }
        } catch {
          // ignore
        }
        return { key: k, label: v.label, revenue: v.revenue, quantity: v.quantity, taskCount: v.taskCount, impl: v.impl, dev: v.dev, maint: v.maint, image };
      });
      out.sort((a, b) => b.revenue - a.revenue);
      setHwRows(out.slice(0, hwTopN));
    } catch (e: unknown) {
      console.error('Failed to load hardware report', e);
    } finally {
      setHwLoading(false);
    }
  }, [hwGroupBy, hwTopN]);

  useEffect(() => { void loadHardwareReport(); }, [loadHardwareReport]);

  // debounce search for hospitals (autocomplete)
  useEffect(() => {
    if (!profileQuery || profileQuery.length < 2) {
      setProfileSuggestions([]);
      return;
    }
    let mounted = true;
    const t = setTimeout(async () => {
      try {
        const list = await searchHospitals(profileQuery);
        if (!mounted) return;
        // backend returns array of { id, label }
        const items = Array.isArray(list) ? (list as any[]).map((h) => ({ id: Number(h.id), name: String(h.label ?? h.name ?? h.id) })) : [];
        setProfileSuggestions(items.filter((x) => Number.isFinite(x.id) && x.name));
      } catch (err) {
        console.warn('searchHospitals failed', err);
        if (mounted) setProfileSuggestions([]);
      }
    }, 300);
    return () => { mounted = false; clearTimeout(t); };
  }, [profileQuery]);

  // Load hospital profile (by id string or number)
  const loadHospitalProfile = async (hidInput?: string | number) => {
    const raw = hidInput != null ? hidInput : profileHospitalId;
    const hid = Number(raw);
    if (!hid || Number.isNaN(hid) || hid <= 0) {
      toast.error('Vui lòng nhập một ID bệnh viện hợp lệ');
      return;
    }
    setProfileLoading(true);
    try {
      // fetch hospital detail via api client (adds auth headers)
      try {
        const { data } = await api.get(`/api/v1/superadmin/hospitals/${hid}`);
        setProfileHospital(data ?? null);
      } catch (err) {
        console.warn('fetch hospital detail failed', err);
        setProfileHospital(null);
      }

      // users
      try {
        const uResp = await getAllUsers({ page: 0, size: 10000 });
        const uList = Array.isArray(uResp) ? (uResp as UserResponseDTO[]) : (uResp as any)?.content ?? [];
        const filtered = (uList as UserResponseDTO[]).filter((u) => {
          const ah = (u as any).assignedHospitalIds ?? (u as any).assignedHospitals ?? null;
          if (Array.isArray(ah)) return ah.includes(hid);
          if ((u as any).hospitalId === hid) return true;
          if ((u as any).assignedHospitalId === hid) return true;
          return false;
        });
        setProfileUsers(filtered);
      } catch (err) {
        console.warn('load users for profile failed', err);
        setProfileUsers([]);
      }

      // tasks
      try {
        const impl = await getAllImplementationTasks({ page: 0, size: 10000 });
        const implList = Array.isArray(impl) ? (impl as ImplementationTaskResponseDTO[]) : (impl as any)?.content ?? [];
        setProfileImplTasks((implList as ImplementationTaskResponseDTO[]).filter((t) => Number(t.hospitalId) === hid));
      } catch (err) { console.warn('impl load', err); setProfileImplTasks([]); }
      try {
        const dev = await getAllDevTasks({ page: 0, size: 10000 });
        const devList = Array.isArray(dev) ? (dev as DevTaskResponseDTO[]) : (dev as any)?.content ?? [];
        setProfileDevTasks((devList as DevTaskResponseDTO[]).filter((t) => Number(t.hospitalId) === hid));
      } catch (err) { console.warn('dev load', err); setProfileDevTasks([]); }
      try {
        const m = await getAllMaintenanceTasks({ page: 0, size: 10000 });
        const mList = Array.isArray(m) ? (m as MaintenanceTaskResponseDTO[]) : (m as any)?.content ?? [];
        setProfileMaintTasks((mList as MaintenanceTaskResponseDTO[]).filter((t) => Number(t.hospitalId) === hid));
      } catch (err) { console.warn('maint load', err); setProfileMaintTasks([]); }

      // businesses
      try {
        const b = await getBusinesses({ page: 0, size: 10000, hospitalId: hid } as any);
        const bList = Array.isArray(b) ? (b as Array<Record<string, unknown>>) : (b as any)?.content ?? [];
        setProfileBusinesses(bList);
      } catch (err) { console.warn('business load', err); setProfileBusinesses([]); }

      // preload hardware map so we can display names instead of ids
      try {
        const hwResp = await HardwareAPI.getAllHardware({ size: 10000 } as any);
        const hwList = Array.isArray(hwResp) ? (hwResp as any[]) : (hwResp as any)?.content ?? [];
        const map: Record<string, string> = {};
        hwList.forEach((h: any) => { map[String(h.id)] = (h.name ?? h.hardwareName ?? h.label ?? String(h.id)); });
        setHardwareMap(map);
      } catch (err) {
        console.warn('hardware map load failed', err);
        setHardwareMap({});
      }

    } catch (err) {
      console.error('loadHospitalProfile failed', err);
    } finally {
      setProfileLoading(false);
    }
  };

    const translateStatus = (s?: string | null): string => {
      if (!s) return '—';
      const m: Record<string, string> = {
        'TRANSFERRED': 'Đã chuyển giao',
        'PENDING_TRANSFER': 'Chờ chuyển giao',
        'WAITING_FOR_DEV': 'Chờ phát triển',
        'NOT_STARTED': 'Chưa bắt đầu',
        'IN_PROCESS': 'Đang xử lý',
        'IN_PROGRESS': 'Đang xử lý',
        'COMPLETED': 'Hoàn thành',
        'DONE': 'Hoàn thành',
        'CANCELLED': 'Đã huỷ',
        'APPROVED': 'Đã duyệt',
        'REJECTED': 'Từ chối',
        'TRANSFERRED_TO_CUSTOMER': 'Đã chuyển giao',
        'WAITING_FOR_DEPLOY': 'Chờ triển khai',
        'ACCEPTED': 'Đã chấp nhận',
        'CONTRACTED': 'Đã chốt hợp đồng',
        'CARING': 'Đang chăm sóc',
        'PENDING': 'Đang chờ',
        'IN_REVIEW': 'Đang xét duyệt',
        'READY': 'Sẵn sàng',
        'APPROVING': 'Đang duyệt',
        'ON_HOLD': 'Tạm dừng',
        'ARCHIVED': 'Đã lưu trữ',
      };
      const key = String(s).toUpperCase();
      return m[key] ?? String(s).replace(/_/g, ' ');
    };

  const donutOptions: ApexOptions = {
    labels: ["Người dùng", "Bệnh viện", "HIS", "Phần cứng", "Đại lý"],
    legend: { position: 'bottom' },
    chart: { toolbar: { show: false } },
    plotOptions: { pie: { donut: { size: '64%' } } },
    dataLabels: {
      enabled: true,
      formatter: (val: number, opts?: ApexFormatterOpts) => {
        const w = opts?.w;
        const series = w?.globals?.series ?? [];
        const idx = opts?.seriesIndex ?? 0;
        const value = series?.[idx] ?? val ?? 0;
        const total = (series.reduce((a: number, b: number) => a + b, 0) as number) || 1;
        const pct = Math.round((value / total) * 100);
        return `${pct}%`;
      },
      style: { fontSize: '12px', colors: ['#fff'] },
    },
    tooltip: {
      y: {
        formatter: (val: number, opts?: ApexFormatterOpts) => {
          const w = opts?.w;
          const series = w?.globals?.series ?? [];
          const idx = opts?.seriesIndex ?? 0;
          const value = series?.[idx] ?? val ?? 0;
          const total = (series.reduce((a: number, b: number) => a + b, 0) as number) || 1;
          const pct = Math.round((value / total) * 100);
          return `${value} (${pct}%)`;
        }
      }
    },
    colors: ["#465fff", "#10b981", "#f59e0b", "#ef4444", "#6366f1"],
  };

  // Helper: check if a date string falls into selected quarter/year
  const inSelectedQuarter = (dateStr?: string | null) => {
    if (profileQuarter === 'all' && !profileYear) return true;
    if (!dateStr) return false;
    const d = new Date(String(dateStr));
    if (Number.isNaN(d.getTime())) return false;
    if (profileYear && String(d.getFullYear()) !== profileYear) return false;
    if (profileQuarter === 'all') return true;
    const month = d.getMonth(); // 0..11
    const q = Math.floor(month / 3) + 1;
    return `Q${q}` === profileQuarter;
  };

  const getSupplementRequest = (obj: Record<string, unknown> | null | undefined) => {
    if (!obj) return '—';
    const parts: string[] = [];
    const candidates = ['additionalRequest','additionalRequests','maintenanceNotes','extraRequests','supplementaryRequest','supplementaryRequests','notes','requestDetails','request'];
    candidates.forEach(k => {
      const v = obj[k as keyof typeof obj];
      if (v != null && String(v).trim() !== '') parts.push(String(v).trim());
    });
    if (parts.length === 0) return '—';
    return parts.join(' | ');
  };

  // Derived (filtered) arrays according to quarter/year selection
  const displayedImplTasks = profileImplTasks.filter((t) => inSelectedQuarter((t as any).startDate ?? (t as any).completionDate ?? (t as any).createdDate ?? null));
  const displayedDevTasks = profileDevTasks.filter((t) => inSelectedQuarter((t as any).startDate ?? (t as any).endDate ?? (t as any).createdDate ?? null));
  const displayedMaintTasks = profileMaintTasks.filter((t) => inSelectedQuarter((t as any).startDate ?? (t as any).endDate ?? (t as any).createdDate ?? null));
  const displayedBusinesses = profileBusinesses.filter((b) => inSelectedQuarter((b as Record<string, unknown>)['startDate'] ?? (b as Record<string, unknown>)['completionDate'] ?? null));

  // compute available status options (from data) and apply per-table status filters
  const implStatusOptions = Array.from(new Set(displayedImplTasks.map(t => String((t as any).status ?? '').toUpperCase()).filter(s => s && s !== ''))).sort();
  const devStatusOptions = Array.from(new Set(displayedDevTasks.map(t => String((t as any).status ?? '').toUpperCase()).filter(s => s && s !== ''))).sort();
  const maintStatusOptions = Array.from(new Set(displayedMaintTasks.map(t => String((t as any).status ?? '').toUpperCase()).filter(s => s && s !== ''))).sort();

  const filteredImplTasks = implStatusFilter === 'all' ? displayedImplTasks : displayedImplTasks.filter(t => String((t as any).status ?? '').toUpperCase() === implStatusFilter);
  const filteredDevTasks = devStatusFilter === 'all' ? displayedDevTasks : displayedDevTasks.filter(t => String((t as any).status ?? '').toUpperCase() === devStatusFilter);
  const filteredMaintTasks = maintStatusFilter === 'all' ? displayedMaintTasks : displayedMaintTasks.filter(t => String((t as any).status ?? '').toUpperCase() === maintStatusFilter);

  // Aggregations for implementation and maintenance
  const completedStatuses = new Set(['COMPLETED', 'DONE', 'TRANSFERRED_TO_CUSTOMER', 'ACCEPTED']);
  const transferredStatuses = new Set(['TRANSFERRED', 'PENDING_TRANSFER', 'TRANSFERRED_TO_CUSTOMER']);

  // implementation aggregates removed per user request (cards for received/completed removed)

  const maintTotalReceived = displayedMaintTasks.length;
  const maintTotalCompleted = displayedMaintTasks.reduce((acc, t) => {
    const s = String((t as any).status ?? '').toUpperCase();
    return acc + (completedStatuses.has(s) ? 1 : 0);
  }, 0);
  const maintTotalTransferred = displayedMaintTasks.reduce((acc, t) => {
    const s = String((t as any).status ?? '').toUpperCase();
    return acc + (transferredStatuses.has(s) ? 1 : 0);
  }, 0);

  // CSV export helpers
  const escapeCsvCell = (v: unknown) => {
    const s = v == null ? '' : String(v);
    return '"' + s.replace(/"/g, '""') + '"';
  };

  const downloadCsv = (filename: string, headers: string[], rows: Array<string[]>) => {
    try {
      const lines: string[] = [];
      lines.push(headers.map((h) => escapeCsvCell(h)).join(','));
      rows.forEach((r) => lines.push(r.map((c) => escapeCsvCell(c)).join(',')));
      const csv = '\uFEFF' + lines.join('\r\n'); // BOM for Excel
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('downloadCsv failed', err);
      toast.error('Xuất CSV thất bại');
    }
  };

  const makeFilename = (base: string) => {
    const hid = profileHospitalId || (profileHospital ? String((profileHospital as any).id ?? '') : '');
    const name = profileHospital ? String((profileHospital as any).name ?? (profileHospital as any).label ?? '') : '';
    const safeName = name ? name.replace(/[^a-z0-9\-_]/gi, '_') : 'hospital';
    const q = profileQuarter ?? 'all';
    const y = profileYear ?? '';
    const parts = [base, hid ? `hid${hid}` : null, safeName || null, q !== 'all' ? q : null, y || null].filter(Boolean);
    return parts.join('_') + '.csv';
  };

  const exportUsersCsv = () => {
    const headers = ['ID','Họ và tên','Username','Email','SĐT','Phòng/Team'];
    const rows = profileUsers.map(u => [String(u.id ?? ''), String(u.fullname ?? ''), String(u.username ?? ''), String(u.email ?? ''), String(u.phone ?? ''), String((u as any).department ?? (u as any).team ?? '')]);
    downloadCsv(makeFilename('users'), headers, rows);
  };

  const exportImplCsv = () => {
    const headers = ['ID','Tên','PIC','Trạng thái','Ngày bắt đầu','Ngày hoàn thành','Phần cứng','Số lượng'];
  const rows = filteredImplTasks.map(t => [String(t.id ?? ''), String(t.name ?? ''), String((t as any).picDeploymentName ?? ''), translateStatus(String(t.status ?? '')), String((t as any).startDate ?? ''), String((t as any).completionDate ?? ''), hardwareMap[String((((t as unknown) as Record<string, unknown>)['hardwareId']) ?? '')] ?? String((((t as unknown) as Record<string, unknown>)['hardwareId']) ?? ''), String(t.quantity ?? '')]);
    downloadCsv(makeFilename('impl_tasks'), headers, rows);
  };

  const exportDevCsv = () => {
    const headers = ['ID','Tên','PIC','Trạng thái','Ngày bắt đầu','Ngày kết thúc','Phần cứng','Số lượng'];
    const rows = filteredDevTasks.map(t => [String(t.id ?? ''), String(t.name ?? ''), String((t as any).picDeploymentName ?? ''), translateStatus(String(t.status ?? '')), String((t as any).startDate ?? ''), String((t as any).endDate ?? ''), hardwareMap[String((((t as unknown) as Record<string, unknown>)['hardwareId']) ?? '')] ?? String((((t as unknown) as Record<string, unknown>)['hardwareId']) ?? ''), String(t.quantity ?? '')]);
    downloadCsv(makeFilename('dev_tasks'), headers, rows);
  };

  const exportMaintCsv = () => {
    const headers = ['ID','Tên','PIC','Trạng thái','Ngày bắt đầu','Ngày kết thúc','Phần cứng','Số lượng','Yêu cầu bổ sung'];
    const rows = filteredMaintTasks.map(t => [String(t.id ?? ''), String(t.name ?? ''), String((t as any).picDeploymentName ?? ''), translateStatus(String(t.status ?? '')), String((t as any).startDate ?? ''), String((t as any).endDate ?? ''), hardwareMap[String((((t as unknown) as Record<string, unknown>)['hardwareId']) ?? '')] ?? String((((t as unknown) as Record<string, unknown>)['hardwareId']) ?? ''), String(t.quantity ?? ''), getSupplementRequest(t as unknown as Record<string, unknown>)]);
    downloadCsv(makeFilename('maint_tasks'), headers, rows);
  };

  const exportBusinessesCsv = () => {
    const headers = ['ID','Tên dự án','Doanh thu','Hoa hồng','Trạng thái','Ngày'];
    const rows = displayedBusinesses.map(b => [String(b['id'] ?? ''), String(b['name'] ?? b['projectName'] ?? ''), String(Number(b['totalPrice'] ?? b['unitPrice'] ?? 0)), String(Number(b['commission'] ?? 0)), translateStatus(String(b['status'] ?? '')), String(b['startDate'] ?? b['completionDate'] ?? '')]);
    downloadCsv(makeFilename('businesses'), headers, rows);
  };

  const exportAllCsv = () => {
    exportUsersCsv();
    exportImplCsv();
    exportDevCsv();
    exportMaintCsv();
    exportBusinessesCsv();
  };

  const exportAllSingleCsv = () => {
    try {
      const sections: Array<{ title: string; headers: string[]; rows: Array<string[]> }> = [];
      sections.push({ title: 'Người dùng', headers: ['ID','Họ và tên','Username','Email','SĐT','Phòng/Team'], rows: profileUsers.map(u => [String(u.id ?? ''), String(u.fullname ?? ''), String(u.username ?? ''), String(u.email ?? ''), String(u.phone ?? ''), String((u as any).department ?? (u as any).team ?? '')]) });
  sections.push({ title: 'Triển khai', headers: ['ID','Tên','PIC','Trạng thái','Ngày bắt đầu','Ngày hoàn thành','Phần cứng','Số lượng'], rows: filteredImplTasks.map(t => [String(t.id ?? ''), String(t.name ?? ''), String((t as any).picDeploymentName ?? ''), translateStatus(String(t.status ?? '')), String((t as any).startDate ?? ''), String((t as any).completionDate ?? ''), hardwareMap[String((((t as unknown) as Record<string, unknown>)['hardwareId']) ?? '')] ?? String((((t as unknown) as Record<string, unknown>)['hardwareId']) ?? ''), String(t.quantity ?? '')]) });
  sections.push({ title: 'Phát triển', headers: ['ID','Tên','PIC','Trạng thái','Ngày bắt đầu','Ngày kết thúc','Phần cứng','Số lượng'], rows: filteredDevTasks.map(t => [String(t.id ?? ''), String(t.name ?? ''), String((t as any).picDeploymentName ?? ''), translateStatus(String(t.status ?? '')), String((t as any).startDate ?? ''), String((t as any).endDate ?? ''), hardwareMap[String((((t as unknown) as Record<string, unknown>)['hardwareId']) ?? '')] ?? String((((t as unknown) as Record<string, unknown>)['hardwareId']) ?? ''), String(t.quantity ?? '')]) });
  sections.push({ title: 'Bảo trì', headers: ['ID','Tên','PIC','Trạng thái','Ngày bắt đầu','Ngày kết thúc','Phần cứng','Số lượng','Yêu cầu bổ sung'], rows: filteredMaintTasks.map(t => [String(t.id ?? ''), String(t.name ?? ''), String((t as any).picDeploymentName ?? ''), translateStatus(String(t.status ?? '')), String((t as any).startDate ?? ''), String((t as any).endDate ?? ''), hardwareMap[String((((t as unknown) as Record<string, unknown>)['hardwareId']) ?? '')] ?? String((((t as unknown) as Record<string, unknown>)['hardwareId']) ?? ''), String(t.quantity ?? ''), getSupplementRequest(t as unknown as Record<string, unknown>)]) });
      sections.push({ title: 'Hợp đồng', headers: ['ID','Tên dự án','Doanh thu','Hoa hồng','Trạng thái','Ngày'], rows: displayedBusinesses.map(b => [String(b['id'] ?? ''), String(b['name'] ?? b['projectName'] ?? ''), String(Number(b['totalPrice'] ?? b['unitPrice'] ?? 0)), String(Number(b['commission'] ?? 0)), translateStatus(String(b['status'] ?? '')), String(b['startDate'] ?? b['completionDate'] ?? '')]) });

      const lines: string[] = [];
      sections.forEach((s, idx) => {
        // section title
        lines.push(escapeCsvCell(`== ${s.title} ==`));
        // headers
        lines.push(s.headers.map(h => escapeCsvCell(h)).join(','));
        // rows
        s.rows.forEach(r => lines.push(r.map(c => escapeCsvCell(c)).join(',')));
        if (idx < sections.length - 1) lines.push('');
      });
      const csv = '\uFEFF' + lines.join('\r\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = makeFilename('all_tables');
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('exportAllSingleCsv failed', err);
      toast.error('Xuất file thất bại');
    }
  };

  return (
    <>
      <PageMeta title="Super Admin Dashboard | TAGTECH" description="" />

      <div className="space-y-6">
        <header className="relative overflow-hidden rounded-2xl p-6 text-white shadow-md">
          {/* animated gradient background */}
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(270deg,#7c3aed,#06b6d4,#f97316,#8b5cf6)',
              backgroundSize: '600% 600%',
              filter: 'saturate(1.1) contrast(1.02)',
              animation: 'bgShift 12s ease infinite',
              opacity: 0.95,
            }}
          />
          <style>{`@keyframes bgShift { 0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%} }`}</style>

          <div className="relative z-10 flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">Super Admin Dashboard</h1>
              <p className="mt-1 text-sm opacity-90">Tổng quan hệ thống & truy cập nhanh các phần quản trị</p>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-12 gap-6">
          <main className="col-span-12 xl:col-span-8 space-y-6">
            
            <section className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Quản lý nhanh</h2>
              <p className="text-sm text-gray-500 mt-1">Các hành động thường dùng được gom lại để bạn thao tác nhanh.</p>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Link to="/superadmin/users" className="flex items-center gap-4 rounded-lg border p-4 hover:shadow-md">
                  <div className="h-12 w-12 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-lg">👥</div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">Người dùng</div>
                    <div className="text-xs text-gray-500">Quản lý người dùng</div>
                  </div>
                </Link>

                <Link to="/superadmin/hospitals" className="flex items-center gap-4 rounded-lg border p-4 hover:shadow-md">
                  <div className="h-12 w-12 rounded-lg bg-green-50 text-green-600 flex items-center justify-center text-lg">🏥</div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">Bệnh viện</div>
                    <div className="text-xs text-gray-500">Quản lý bệnh viện</div>
                  </div>
                </Link>

                <Link to="/superadmin/his-systems" className="flex items-center gap-4 rounded-lg border p-4 hover:shadow-md">
                  <div className="h-12 w-12 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center text-lg">💼</div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">HIS Systems</div>
                    <div className="text-xs text-gray-500">Quản lý hệ thống HIS</div>
                  </div>
                </Link>

                <Link to="/superadmin/agencies" className="flex items-center gap-4 rounded-lg border p-4 hover:shadow-md">
                  <div className="h-12 w-12 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center text-lg">🏢</div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">Đại lý</div>
                    <div className="text-xs text-gray-500">Quản lý đại lý</div>
                  </div>
                </Link>

                <Link to="/superadmin/hardware" className="flex items-center gap-4 rounded-lg border p-4 hover:shadow-md">
                  <div className="h-12 w-12 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center text-lg">💻</div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">Phần cứng</div>
                    <div className="text-xs text-gray-500">Quản lý phần cứng</div>
                  </div>
                </Link>
              </div>
            </section>

            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100">
                <h3 className="text-sm font-medium text-gray-700">Thống kê tổng quan</h3>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <StatCard title="Người dùng" value={summary ? summary.totalUsers : '--'} icon={<span>👥</span>} color="bg-indigo-500" />
                  <StatCard title="Bệnh viện" value={summary ? summary.totalHospitals : '--'} icon={<span>🏥</span>} color="bg-emerald-500" />
                  <StatCard title="Hệ thống HIS" value={summary ? summary.totalHisSystems : '--'} icon={<span>💼</span>} color="bg-purple-500" />
                  <StatCard title="Phần cứng" value={summary ? summary.totalHardware : '--'} icon={<span>💻</span>} color="bg-teal-500" />
                  <StatCard title="Đại lý" value={summary ? summary.totalAgencies : '--'} icon={<span>🏢</span>} color="bg-orange-500" />
                </div>
              </div>

              <div className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100">
                <h3 className="text-sm font-medium text-gray-700">Sơ đồ phân bố</h3>
                <div className="mt-3 flex justify-center">
                  <Chart
                    options={donutOptions}
                    series={summary ? [summary.totalUsers, summary.totalHospitals, summary.totalHisSystems, summary.totalHardware, summary.totalAgencies] : [0,0,0,0,0]}
                    type="donut"
                    width={260}
                  />
                </div>
              </div>
            </section>
            {/* Báo cáo Kinh doanh removed from here and inserted below full-width */}
          </main>

          <aside className="col-span-12 xl:col-span-4 space-y-6">
            <div className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100">
              <h3 className="text-sm font-medium text-gray-700">Quick stats</h3>
              <div className="mt-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-500">Tổng đại lý</div>
                  <div className="text-sm font-semibold text-gray-900">{summary ? summary.totalAgencies : '--'}</div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-500">Hệ thống HIS</div>
                  <div className="text-sm font-semibold text-gray-900">{summary ? summary.totalHisSystems : '--'}</div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100">
              <h3 className="text-sm font-medium text-gray-700">Hành động nhanh</h3>
              <div className="mt-3 flex flex-col gap-2">
                <Link to="/superadmin/users" className="rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-medium text-white hover:bg-indigo-700">Tạo người dùng mới</Link>
                <Link to="/superadmin/hospitals" className="rounded-md bg-emerald-600 px-3 py-2 text-center text-sm font-medium text-white hover:bg-emerald-700">Thêm bệnh viện</Link>
              </div>
            </div>
          </aside>
        </div>

        {/* Full-width Business Report placed below the grid */}
        <section className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100 w-full">
          <div className="max-w-full">
            <h2 className="text-lg font-semibold text-gray-900">Báo cáo Kinh doanh</h2>
            <p className="text-sm text-gray-500 mt-1">Doanh thu & hoa hồng theo dự án. Lọc theo khoảng thời gian.</p>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col sm:flex-row gap-4 items-center">
                <div className="flex flex-col">
                  <label className="block text-xs text-gray-500">Từ ngày</label>
                  <input value={businessFrom} onChange={(e) => setBusinessFrom(e.target.value)} type="datetime-local" className="mt-1 w-64 rounded-md border px-3 py-2 text-sm bg-white" />
                </div>
                <div className="flex flex-col">
                  <label className="block text-xs text-gray-500">Đến ngày</label>
                  <input value={businessTo} onChange={(e) => setBusinessTo(e.target.value)} type="datetime-local" className="mt-1 w-64 rounded-md border px-3 py-2 text-sm bg-white" />
                </div>
                <div className="flex flex-col">
                  <label className="block text-xs text-gray-500">Gộp theo</label>
                  <select value={groupBy} onChange={(e) => setGroupBy(e.target.value as 'day' | 'month' | 'year')} className="mt-1 rounded-md border px-3 py-2 text-sm bg-white w-40">
                    <option value="day">Theo ngày</option>
                    <option value="month">Theo tháng</option>
                    <option value="year">Theo năm</option>
                  </select>
                </div>
              </div>

              <div className="mt-2 sm:mt-0 flex items-center gap-2">
                <button onClick={() => void loadBusinessReport(businessFrom, businessTo)} disabled={businessLoading} className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-700">Áp dụng</button>
                <button onClick={() => { setBusinessFrom(''); setBusinessTo(''); void loadBusinessReport(); }} disabled={businessLoading} className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200">Xóa</button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 items-stretch">
              <StatCard title="Tổng doanh thu dự kiến" value={totalExpected != null ? (totalExpected).toLocaleString() + ' ₫' : '--'} color="bg-indigo-500" />
              <StatCard title="Tổng doanh thu thực tế" value={totalActual != null ? (totalActual).toLocaleString() + ' ₫' : '--'} color="bg-emerald-500" />
              <StatCard title="Tổng hoa hồng đã chốt" value={totalCommission != null ? (totalCommission).toLocaleString() + ' ₫' : '--'} color="bg-orange-500" />
              <StatCard title="Tỷ lệ chuyển đổi" value={conversionRate != null ? `${conversionRate}%` : '--'} color="bg-teal-500" />
            </div>

            <div className="mt-6 rounded-2xl bg-white p-4 shadow-sm border border-gray-100">
              <h3 className="text-sm font-medium text-gray-700">So sánh</h3>
              <div className="mt-3">
                {aggLabels.length === 0 ? (
                  <Chart
                    options={{
                      chart: { toolbar: { show: false } },
                      plotOptions: { bar: { borderRadius: 8, columnWidth: '30%' } },
                      xaxis: { categories: ['Dự kiến', 'Thực tế', 'Hoa hồng'] },
                      dataLabels: { enabled: false },
                      colors: ['#465fff', '#10b981', '#ef4444'],
                    }}
                    series={[{ name: 'VND', data: [totalExpected ?? 0, totalActual ?? 0, totalCommission ?? 0] }]}
                    type="bar"
                    height={260}
                    width="100%"
                  />
                ) : (
                  <Chart
                    options={{
                      chart: { toolbar: { show: false }, type: 'bar' },
                      plotOptions: { bar: { horizontal: false, columnWidth: '40%', borderRadius: 6 } },
                      xaxis: { categories: aggLabels },
                      dataLabels: { enabled: false },
                      tooltip: { y: { formatter: (v: number) => `${v.toLocaleString()} ₫` } },
                      legend: { position: 'top' },
                      colors: ['#7c3aed', '#10b981', '#ef4444'],
                    }}
                    series={[
                      { name: 'Tổng doanh thu dự kiến', type: 'bar', data: aggExpected },
                      { name: 'Tổng doanh thu thực tế', type: 'bar', data: aggActual },
                      { name: 'Tổng hoa hồng đã chốt', type: 'bar', data: aggCommission },
                    ]}
                    type="bar"
                    height={420}
                    width="100%"
                  />
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Hospital Profile (inline on Home) */}
        <section className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100 w-full">
          <div className="max-w-full">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Báo cáo chi tiết bệnh viện</h2>
              </div>
              <div className="flex items-center gap-2">
                <select value={exportChoice} onChange={(e) => setExportChoice(e.target.value as any)} className="rounded-md border px-3 py-1 text-sm bg-white">
                  <option value="users">Người dùng</option>
                  <option value="impl">Triển khai</option>
                  <option value="dev">Phát triển</option>
                  <option value="maint">Bảo trì</option>
                  <option value="businesses">Hợp đồng</option>
                  <option value="all">Xuất tất cả (nhiều file)</option>
                  <option value="all_single">Xuất tất cả vào 1 file</option>
                </select>
                <button onClick={() => { if (exportChoice === 'users') exportUsersCsv(); else if (exportChoice === 'impl') exportImplCsv(); else if (exportChoice === 'dev') exportDevCsv(); else if (exportChoice === 'maint') exportMaintCsv(); else if (exportChoice === 'businesses') exportBusinessesCsv(); else if (exportChoice === 'all') exportAllCsv(); else if (exportChoice === 'all_single') exportAllSingleCsv(); }} className="rounded-md bg-indigo-600 px-3 py-1 text-sm text-white hover:bg-indigo-700">Xuất</button>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-3 items-center">
              <div className="w-full sm:w-auto">
                <label className="text-sm text-gray-500">Tên bệnh viện</label>
                <div className="relative mt-1 flex items-center gap-3">
                  <input autoComplete="off" value={profileQuery} onChange={(e) => setProfileQuery(e.target.value)} placeholder="Nhập tên bệnh viện (tối thiểu 2 ký tự)" className="rounded-md border px-3 text-sm w-72 h-10" />
                  <button onClick={() => void loadHospitalProfile()} disabled={profileLoading} className="h-10 inline-flex items-center rounded-md bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700">Tải hồ sơ</button>
                  <div className="flex items-center gap-2 ml-2">
                    <label className="text-sm text-gray-500">Quý</label>
                    <select value={profileQuarter} onChange={(e) => setProfileQuarter(e.target.value as any)} className="rounded-md border px-2 py-1 text-sm bg-white">
                      <option value="all">Tất cả</option>
                      <option value="Q1">Q1</option>
                      <option value="Q2">Q2</option>
                      <option value="Q3">Q3</option>
                      <option value="Q4">Q4</option>
                    </select>
                    <label className="text-sm text-gray-500">Năm</label>
                    <select value={profileYear} onChange={(e) => setProfileYear(e.target.value)} className="rounded-md border px-2 py-1 text-sm bg-white w-28">
                      <option value="">Tất cả</option>
                      {Array.from({ length: new Date().getFullYear() - 2019 }).map((_, i) => {
                        const y = String(2020 + i);
                        return <option key={y} value={y}>{y}</option>;
                      })}
                    </select>
                  </div>
                  {profileSuggestions.length > 0 && (
                    <ul role="listbox" className="absolute z-50 left-0 top-full mt-1 w-72 rounded-md border bg-white shadow-md max-h-48 overflow-auto">
                      {profileSuggestions.map(s => (
                        <li key={s.id} role="option" aria-selected={false} tabIndex={0} className="px-3 py-2 hover:bg-gray-50 cursor-pointer" onMouseDown={(e) => { e.preventDefault(); }} onClick={() => { setProfileQuery(s.name); setProfileSuggestions([]); setProfileHospitalId(String(s.id)); void loadHospitalProfile(s.id); }}>
                          <div className="flex items-center justify-between">
                            <span>{s.name}</span>
                            <span className="text-xs text-gray-400">#{s.id}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4">
              {profileUsers.length > 0 && (
                <div className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100">
                  <h3 className="text-sm font-medium text-gray-700">Nhân sự phụ trách ({profileUsers.length})</h3>
                  <div className="mt-3">
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm table-auto">
                        <thead>
                          <tr className="text-xs text-gray-600 bg-gray-50">
                            <th className="px-3 py-2 text-center">ID</th>
                            <th className="px-3 py-2 text-center">Họ và tên</th>
                            <th className="px-3 py-2 text-center">Username</th>
                            <th className="px-3 py-2 text-center">Email</th>
                            <th className="px-3 py-2 text-center">SĐT</th>
                            <th className="px-3 py-2 text-center">Phòng/Team</th>
                          </tr>
                        </thead>
                        <tbody>
                            {profileUsers.map((u, idx) => (
                            <tr key={u.id} className={`border-t ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-gray-100`}>
                              <td className="px-3 py-2 align-middle text-center">{u.id}</td>
                              <td className="px-3 py-2 align-middle text-center">{u.fullname ?? '—'}</td>
                              <td className="px-3 py-2 align-middle text-center">{u.username ?? '—'}</td>
                              <td className="px-3 py-2 align-middle text-center">{u.email ?? '—'}</td>
                              <td className="px-3 py-2 align-middle text-center">{u.phone ?? '—'}</td>
                              <td className="px-3 py-2 align-middle text-center">{u.department ?? u.team ?? '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4">
              {/* Triển khai - own card */}
              <div className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-medium text-gray-700">Triển khai ({profileImplTasks.length})</h3>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-500">Lọc trạng thái</label>
                    <select value={implStatusFilter} onChange={(e) => setImplStatusFilter(e.target.value)} className="rounded-md border px-2 py-1 text-sm bg-white">
                      <option value="all">Tất cả</option>
                      {implStatusOptions.map(s => <option key={s} value={s}>{translateStatus(s)}</option>)}
                    </select>
                  </div>
                </div>
                <div className="mt-3">
                  {profileImplTasks.length === 0 ? (
                    <div className="text-sm text-gray-500">Không có</div>
                  ) : (
                    <div className="overflow-x-auto mt-2">
                      <table className="min-w-full text-sm table-auto">
                        <thead>
                          <tr className="text-xs text-gray-600 bg-gray-50">
                            <th className="px-2 py-1 text-center">ID</th>
                            <th className="px-2 py-1 text-center">Tên</th>
                            <th className="px-2 py-1 text-center">PIC</th>
                            <th className="px-2 py-1 text-center">Trạng thái</th>
                            <th className="px-2 py-1 text-center">Ngày bắt đầu</th>
                            <th className="px-2 py-1 text-center">Ngày hoàn thành</th>
                            <th className="px-2 py-1 text-center">Phần cứng</th>
                            <th className="px-2 py-1 text-center">Số lượng</th>
                            <th className="px-2 py-1 text-center">Yêu cầu bổ sung</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredImplTasks.map((t) => (
                            <tr key={t.id} className="border-t odd:bg-white even:bg-gray-50 hover:bg-gray-100">
                              <td className="px-2 py-2 align-middle text-center">{t.id}</td>
                              <td className="px-2 py-2 align-middle text-center">{t.name ?? '—'}</td>
                              <td className="px-2 py-2 align-middle text-center">{t.picDeploymentName ?? '—'}</td>
                              <td className="px-2 py-2 align-middle text-center">{translateStatus(String(t.status ?? ''))}</td>
                              <td className="px-2 py-2 align-middle text-center">{t.startDate ?? '—'}</td>
                              <td className="px-2 py-2 align-middle text-center">{t.completionDate ?? '—'}</td>
                              <td className="px-2 py-2 align-middle text-center">{hardwareMap[String((((t as unknown) as Record<string, unknown>)['hardwareId']) ?? '')] ?? String((((t as unknown) as Record<string, unknown>)['hardwareId']) ?? '—')}</td>
                              <td className="px-2 py-2 align-middle text-center">{t.quantity ?? 0}</td>
                              <td className="px-2 py-2 align-middle text-center">{getSupplementRequest(t as unknown as Record<string, unknown>) ?? '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* Phát triển - own card */}
              <div className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-medium text-gray-700">Phát triển ({profileDevTasks.length})</h3>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-500">Lọc trạng thái</label>
                    <select value={devStatusFilter} onChange={(e) => setDevStatusFilter(e.target.value)} className="rounded-md border px-2 py-1 text-sm bg-white">
                      <option value="all">Tất cả</option>
                      {devStatusOptions.map(s => <option key={s} value={s}>{translateStatus(s)}</option>)}
                    </select>
                  </div>
                </div>
                <div className="mt-3">
                  {profileDevTasks.length === 0 ? (
                    <div className="text-sm text-gray-500">Không có</div>
                  ) : (
                    <div className="overflow-x-auto mt-2">
                      <table className="min-w-full text-sm table-auto">
                        <thead>
                          <tr className="text-xs text-gray-600 bg-gray-50">
                            <th className="px-2 py-1 text-center">ID</th>
                            <th className="px-2 py-1 text-center">Tên</th>
                            <th className="px-2 py-1 text-center">PIC</th>
                            <th className="px-2 py-1 text-center">Trạng thái</th>
                            <th className="px-2 py-1 text-center">Ngày bắt đầu</th>
                            <th className="px-2 py-1 text-center">Ngày kết thúc</th>
                            <th className="px-2 py-1 text-center">Phần cứng</th>
                            <th className="px-2 py-1 text-center">Số lượng</th>
                            <th className="px-2 py-1 text-center">Yêu cầu bổ sung</th>
                          </tr>
                        </thead>
                        <tbody>
                            {filteredDevTasks.map((t) => (
                            <tr key={t.id} className="border-t odd:bg-white even:bg-gray-50 hover:bg-gray-100">
                              <td className="px-2 py-2 align-middle text-center">{t.id}</td>
                              <td className="px-2 py-2 align-middle text-center">{t.name ?? '—'}</td>
                              <td className="px-2 py-2 align-middle text-center">{t.picDeploymentName ?? '—'}</td>
                              <td className="px-2 py-2 align-middle text-center">{translateStatus(String(t.status ?? ''))}</td>
                              <td className="px-2 py-2 align-middle text-center">{t.startDate ?? '—'}</td>
                              <td className="px-2 py-2 align-middle text-center">{t.endDate ?? '—'}</td>
                              <td className="px-2 py-2 align-middle text-center">{hardwareMap[String((((t as unknown) as Record<string, unknown>)['hardwareId']) ?? '')] ?? String((((t as unknown) as Record<string, unknown>)['hardwareId']) ?? '—')}</td>
                              <td className="px-2 py-2 align-middle text-center">{t.quantity ?? 0}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* Bảo trì - own card */}
              <div className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-medium text-gray-700">Bảo trì ({profileMaintTasks.length})</h3>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-500">Lọc trạng thái</label>
                    <select value={maintStatusFilter} onChange={(e) => setMaintStatusFilter(e.target.value)} className="rounded-md border px-2 py-1 text-sm bg-white">
                      <option value="all">Tất cả</option>
                      {maintStatusOptions.map(s => <option key={s} value={s}>{translateStatus(s)}</option>)}
                    </select>
                  </div>
                </div>
                <div className="mt-3">
                  {profileMaintTasks.length === 0 ? (
                    <div className="text-sm text-gray-500">Không có</div>
                  ) : (
                    <div className="overflow-x-auto mt-2">
                      <table className="min-w-full text-sm table-auto">
                        <thead>
                          <tr className="text-xs text-gray-600 bg-gray-50">
                            <th className="px-2 py-1 text-center">ID</th>
                            <th className="px-2 py-1 text-center">Tên</th>
                            <th className="px-2 py-1 text-center">PIC</th>
                            <th className="px-2 py-1 text-center">Trạng thái</th>
                            <th className="px-2 py-1 text-center">Ngày bắt đầu</th>
                            <th className="px-2 py-1 text-center">Ngày kết thúc</th>
                            <th className="px-2 py-1 text-center">Phần cứng</th>
                            <th className="px-2 py-1 text-center">Số lượng</th>
                            <th className="px-2 py-1 text-center">Yêu cầu bổ sung</th>
                          </tr>
                        </thead>
                        <tbody>
                            {filteredMaintTasks.map((t) => (
                            <tr key={t.id} className="border-t odd:bg-white even:bg-gray-50 hover:bg-gray-100">
                              <td className="px-2 py-2 align-middle text-center">{t.id}</td>
                              <td className="px-2 py-2 align-middle text-center">{t.name ?? '—'}</td>
                              <td className="px-2 py-2 align-middle text-center">{t.picDeploymentName ?? '—'}</td>
                              <td className="px-2 py-2 align-middle text-center">{translateStatus(String(t.status ?? ''))}</td>
                              <td className="px-2 py-2 align-middle text-center">{t.startDate ?? '—'}</td>
                              <td className="px-2 py-2 align-middle text-center">{t.endDate ?? '—'}</td>
                              <td className="px-2 py-2 align-middle text-center">{hardwareMap[String((((t as unknown) as Record<string, unknown>)['hardwareId']) ?? '')] ?? String((((t as unknown) as Record<string, unknown>)['hardwareId']) ?? '—')}</td>
                              <td className="px-2 py-2 align-middle text-center">{t.quantity ?? 0}</td>
                              <td className="px-2 py-2 align-middle text-center">{getSupplementRequest(t as unknown as Record<string, unknown>) ?? '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100">
                <h3 className="text-sm font-medium text-gray-700">Lịch sử hợp đồng</h3>
                {profileBusinesses.length === 0 ? (
                  <div className="text-sm text-gray-500 mt-2">Không có hợp đồng</div>
                ) : (
                  <div className="overflow-x-auto mt-2">
                    <table className="min-w-full text-sm table-auto">
                        <thead>
                          <tr className="text-xs text-gray-600 bg-gray-50">
                            <th className="px-2 py-1 text-center">ID</th>
                            <th className="px-2 py-1 text-center">Tên dự án</th>
                            <th className="px-2 py-1 text-center">Doanh thu</th>
                            <th className="px-2 py-1 text-center">Hoa hồng</th>
                              <th className="px-2 py-1 text-center">Trạng thái</th>
                            <th className="px-2 py-1 text-center">Ngày</th>
                          </tr>
                      </thead>
                      <tbody>
            {displayedBusinesses.map((b) => (
                            <tr key={String(b['id'] ?? Math.random())} className="border-t odd:bg-white even:bg-gray-50 hover:bg-gray-100">
                            <td className="px-2 py-2 align-middle text-center">{String(b['id'] ?? '—')}</td>
                            <td className="px-2 py-2 align-middle text-left">{String(b['name'] ?? b['projectName'] ?? '—')}</td>
                            <td className="px-2 py-2 align-middle text-center">{new Intl.NumberFormat('vi-VN').format(Number(b['totalPrice'] ?? b['unitPrice'] ?? 0))} ₫</td>
                            <td className="px-2 py-2 align-middle text-center">{new Intl.NumberFormat('vi-VN').format(Number(b['commission'] ?? 0))} ₫</td>
                            <td className="px-2 py-2 align-middle text-center">{translateStatus(String(b['status'] ?? ''))}</td>
                            <td className="px-2 py-2 align-middle text-center">{String(b['startDate'] ?? b['completionDate'] ?? '—')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* HIS & hardware summary intentionally removed from UI */}
            </div>
          </div>
        </section>

        {/* Hardware report widget on dashboard */}
        <section className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100 w-full">
          <div className="max-w-full">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Báo cáo Phần cứng</h2>
                <p className="text-sm text-gray-500 mt-1">Sản phẩm bán chạy & mức độ sử dụng (top theo doanh thu)</p>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-500">Nhóm theo</label>
                <select value={hwGroupBy} onChange={(e) => setHwGroupBy(e.target.value as 'hardware' | 'type' | 'supplier')} className="rounded-md border px-3 py-2 text-sm bg-white">
                  <option value="hardware">Phần cứng</option>
                  <option value="type">Loại</option>
                  <option value="supplier">Nhà cung cấp</option>
                </select>
                <label className="text-sm text-gray-500">Top</label>
                <select value={String(hwTopN)} onChange={(e) => setHwTopN(Number(e.target.value))} className="rounded-md border px-3 py-2 text-sm bg-white">
                  {[5,8,10,20].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
                <button onClick={() => void loadHardwareReport()} disabled={hwLoading} className="rounded-md bg-indigo-600 text-white px-3 py-2 text-sm">Tải lại</button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100">
                <h3 className="text-sm font-medium text-gray-700">Top theo doanh thu</h3>
                <div className="mt-3">
                  <Chart
                    options={{
                      chart: { toolbar: { show: false } },
                      plotOptions: { bar: { borderRadius: 6, columnWidth: '60%' } },
                      xaxis: { categories: hwRows.map(r => r.label) },
                      dataLabels: { enabled: false },
                      tooltip: { y: { formatter: (v: number) => `${v.toLocaleString()} ₫` } },
                      colors: ['#465fff'],
                    }}
                    series={[{ name: 'Doanh thu', data: hwRows.map(r => Math.round(r.revenue)) }]}
                    type="bar"
                    height={320}
                    width="100%"
                  />
                </div>
              </div>

              <div className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-700">Chi tiết top</h3>
                </div>

                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-sm table-auto">
                    <thead>
                      <tr className="text-left text-xs text-gray-500">
                        <th className="px-3 py-2">Sản phẩm</th>
                        <th className="px-3 py-2">Danh mục</th>
                        <th className="px-3 py-2 text-right">Giá</th>
                        <th className="px-3 py-2 text-right">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const displayed = hwRows.filter(r => r.label !== '-');
                        return displayed.map(r => (
                          <tr key={r.key} className="border-t">
                          <td className="px-3 py-3 align-top">
                            <div className="flex items-center gap-3">
                              {r.image ? (
                                // if image url available show thumbnail
                                <img src={r.image} alt={r.label} className="h-10 w-10 rounded-md object-cover" />
                              ) : (
                                <div className="h-10 w-10 rounded-md bg-gray-100 flex items-center justify-center text-sm font-medium text-gray-600">{(r.label || '?').charAt(0)}</div>
                              )}
                              <div>
                                <div className="font-medium text-gray-900">{r.label}</div>
                                <div className="text-xs text-gray-500">{r.quantity} Biến thể</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-gray-600 align-top">
                            {r.impl ? 'Triển khai' : r.dev ? 'Phát triển' : r.maint ? 'Bảo trì' : '—'}
                          </td>
                          <td className="px-3 py-3 text-right font-medium align-top">{new Intl.NumberFormat('vi-VN').format(Math.round(r.revenue))} ₫</td>
                          <td className="px-3 py-3 text-right align-top">
                            {/* revenue-based status badge */}
                            <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${r.revenue > 1000000 ? 'bg-emerald-100 text-emerald-700' : r.revenue > 500000 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                              {r.revenue > 1000000 ? 'Best' : r.revenue > 500000 ? 'Good' : 'Low'}
                            </span>
                          </td>
                        </tr>
                        ));
                      })()}
                      {hwRows.filter(r => r.label !== '-').length === 0 && <tr><td colSpan={4} className="px-3 py-6 text-center text-gray-500">Không có dữ liệu</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </section>

      </div>
    </>
  );
}

