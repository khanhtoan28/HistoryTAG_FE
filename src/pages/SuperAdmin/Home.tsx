/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { Link } from "react-router-dom";
import PageMeta from "../../components/common/PageMeta";
import { useEffect, useState, useCallback, useMemo } from "react";
import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import { getSummaryReport, type SuperAdminSummaryDTO, HardwareAPI, getAllImplementationTasks, getAllDevTasks, getAllMaintenanceTasks, getAllUsers, UserResponseDTO, ImplementationTaskResponseDTO, DevTaskResponseDTO, MaintenanceTaskResponseDTO } from "../../api/superadmin.api";
import { getBusinesses } from "../../api/business.api";
import { getAuthToken } from "../../api/client";
import toast from "react-hot-toast";
import Pagination from "../../components/common/Pagination";
import ExcelJS from 'exceljs';

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
  const [businessStatus, setBusinessStatus] = useState<string>(''); // Filter by status
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
  // Employee Performance report states
  const API_ROOT = import.meta.env.VITE_API_URL || "http://localhost:8080";
  type EmployeePerf = {
    userId?: number | null;
    fullName?: string | null;
    team?: string | null;
    department?: string | null;
    totalAssigned?: number;
    totalInProgress?: number;
    totalCompleted?: number;
    totalLate?: number;
    totalReceived?: number;
    avgProcessingHours?: number;
  };
  const [reportYear, setReportYear] = useState<number>(new Date().getFullYear());
  const [reportMonth, setReportMonth] = useState<number | ''>('');
  const [reportTeam, setReportTeam] = useState<string>('ALL');
  const [reportDepartment, setReportDepartment] = useState<string>('');
  const [reportLoading, setReportLoading] = useState(false);
  const [reportData, setReportData] = useState<EmployeePerf[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);

  // load departments list (unique departments from users)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const uResp = await getAllUsers({ page: 0, size: 10000 });
        const uList = Array.isArray(uResp) ? (uResp as any[]) : (uResp as any)?.content ?? [];
        const deps = Array.from(new Set(uList.map((u: any) => (u?.department ?? null)).filter(Boolean))).sort();
        if (mounted) setDepartments(deps as string[]);
      } catch (err) {
        console.warn('Failed to load departments', err);
      }
    })();
    return () => { mounted = false; };
  }, []);
  // Team profile states (changed from hospital to team)
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [availableTeams, setAvailableTeams] = useState<string[]>([]);
  const [profileLoading, setProfileLoading] = useState(false);
  const [hasLoadedProfile, setHasLoadedProfile] = useState(false);
  const [profileUsers, setProfileUsers] = useState<UserResponseDTO[]>([]);
  const [profileImplTasks, setProfileImplTasks] = useState<ImplementationTaskResponseDTO[]>([]);
  const [profileDevTasks, setProfileDevTasks] = useState<DevTaskResponseDTO[]>([]);
  const [profileMaintTasks, setProfileMaintTasks] = useState<MaintenanceTaskResponseDTO[]>([]);
  const [profileBusinesses, setProfileBusinesses] = useState<Array<Record<string, unknown>>>([]);
  const [hardwareMap, setHardwareMap] = useState<Record<string, string>>({});
  const [profileQuarter, setProfileQuarter] = useState<'all' | 'Q1' | 'Q2' | 'Q3' | 'Q4'>('all');
  const [profileYear, setProfileYear] = useState<string>('');
  const [profileDateFrom, setProfileDateFrom] = useState<string>(''); // Date range filter from
  const [profileDateTo, setProfileDateTo] = useState<string>(''); // Date range filter to
  const [exportChoice, setExportChoice] = useState<'users' | 'impl' | 'dev' | 'maint' | 'businesses' | 'all' | 'all_single'>('users');
  const [viewMode, setViewMode] = useState<'detail' | 'comparison'>('detail');
  const [compareYear, setCompareYear] = useState<string>('');
  const [timeRange, setTimeRange] = useState<'monthly' | 'quarterly' | 'yearly'>('monthly');
  // per-table status filters
  const [implStatusFilter, setImplStatusFilter] = useState<string>('all');
  const [devStatusFilter, setDevStatusFilter] = useState<string>('all');
  const [maintStatusFilter, setMaintStatusFilter] = useState<string>('all');
  // Profile status filter (for "Báo cáo chi tiết theo từng viện")
  const [profileStatusFilter, setProfileStatusFilter] = useState<string>('all');
  const [profilePicFilter, setProfilePicFilter] = useState<string>('all');
  useEffect(() => {
    // Reset PIC filter whenever team selection changes
    setProfilePicFilter('all');
  }, [selectedTeam]);

  useEffect(() => {
    if (profilePicFilter === 'all') return;
    const exists = profileUsers.some((u) => u.id != null && String(u.id) === profilePicFilter);
    if (!exists) {
      setProfilePicFilter('all');
    }
  }, [profileUsers, profilePicFilter]);
  // Pagination for detail view
  const [detailCurrentPage, setDetailCurrentPage] = useState<number>(0);
  const [detailItemsPerPage, setDetailItemsPerPage] = useState<number>(50);
  const [detailTotalItems, setDetailTotalItems] = useState<number>(0);
  const [detailTotalPages, setDetailTotalPages] = useState<number>(1);
  // Collapsible groups (hospital names)
  const [collapsedHospitals, setCollapsedHospitals] = useState<Set<string>>(new Set());
  
  const toggleHospitalCollapse = (hospitalName: string) => {
    setCollapsedHospitals(prev => {
      const next = new Set(prev);
      if (next.has(hospitalName)) {
        next.delete(hospitalName);
      } else {
        next.add(hospitalName);
      }
      return next;
    });
  };
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

  const fetchEmployeePerformance = async () => {
    setReportLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('year', String(reportYear));
      if (reportMonth !== '') params.append('month', String(reportMonth));
      if (reportTeam && reportTeam !== 'ALL') params.append('team', reportTeam);
      if (reportDepartment) params.append('department', reportDepartment);

      const url = `${API_ROOT}/api/v1/superadmin/reports/employee-performance?${params.toString()}`;
      const token = getAuthToken();
      const res = await fetch(url, { method: 'GET', headers: token ? { Authorization: `Bearer ${token}` } : undefined, credentials: 'include' });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();
      setReportData(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      console.error('fetchEmployeePerformance failed', err);
      toast.error((err as Error)?.message ?? 'Lấy báo cáo thất bại');
      setReportData([]);
    } finally {
      setReportLoading(false);
    }
  };


  const exportEmployeePerformanceExcel = async () => {
    try {
      const params = new URLSearchParams();
      params.append('year', String(reportYear));
      if (reportMonth !== '') params.append('month', String(reportMonth));
      if (reportTeam && reportTeam !== 'ALL') params.append('team', reportTeam);
      if (reportDepartment) params.append('department', reportDepartment);
      const url = `${API_ROOT}/api/v1/superadmin/reports/employee-performance/export?${params.toString()}`;
      const token = getAuthToken();
      const res = await fetch(url, { method: 'GET', headers: token ? { Authorization: `Bearer ${token}` } : undefined, credentials: 'include' });
      if (!res.ok) throw new Error(`Export failed ${res.status}`);
      const blob = await res.blob();
      const aUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = aUrl;
      const monthPart = reportMonth !== '' ? `-${String(reportMonth).padStart(2, '0')}` : '';
      a.download = `employee_performance_${reportYear}${monthPart}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(aUrl);
    } catch (err: unknown) {
      console.error('exportEmployeePerformanceExcel failed', err);
      toast.error((err as Error)?.message ?? 'Xuất file thất bại');
    }
  };

  // load business report
  const loadBusinessReport = useCallback(async (from?: string, to?: string, status?: string) => {
    setBusinessLoading(true);
    try {
      const toParam = (v?: string | null) => v ? (v.length === 16 ? `${v}:00` : v) : undefined;
      const params: Record<string, unknown> = {};
      if (from) params.startDateFrom = toParam(from);
      if (to) params.startDateTo = toParam(to);
      if (status && status.trim() !== '') params.status = status.trim();
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

  // Load available teams
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const uResp = await getAllUsers({ page: 0, size: 10000 });
        const uList = Array.isArray(uResp) ? (uResp as UserResponseDTO[]) : (uResp as any)?.content ?? [];
        const teams = Array.from(new Set(uList.map((u) => u.team).filter(Boolean))).sort() as string[];
        if (mounted) setAvailableTeams(teams);
      } catch (err) {
        console.warn('Failed to load teams', err);
        if (mounted) setAvailableTeams([]);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Load team profile (load all tasks for selected team, grouped by hospital)
  const loadTeamProfile = async (teamName?: string) => {
    const team = teamName || selectedTeam;
    if (!team || team.trim() === '') {
      toast.error('Vui lòng chọn team');
      return;
    }
    setProfileLoading(true);
    try {
      // users in this team
      try {
        const uResp = await getAllUsers({ page: 0, size: 10000 });
        const uList = Array.isArray(uResp) ? (uResp as UserResponseDTO[]) : (uResp as any)?.content ?? [];
        const filtered = (uList as UserResponseDTO[]).filter((u) => {
          const userTeam = (u.team ?? '').toString().toUpperCase();
          return userTeam === team.toUpperCase();
        });
        setProfileUsers(filtered);
      } catch (err) {
        console.warn('load users for team failed', err);
        setProfileUsers([]);
      }

      // Get user IDs in this team to filter tasks
      const uResp = await getAllUsers({ page: 0, size: 10000 });
      const uList = Array.isArray(uResp) ? (uResp as UserResponseDTO[]) : (uResp as any)?.content ?? [];
      const teamUserIds = (uList as UserResponseDTO[])
        .filter((u) => ((u.team ?? '').toString().toUpperCase() === team.toUpperCase()))
        .map((u) => u.id);

      // tasks - use server-side filtering
      const filterParams: any = {
        page: 0,
        size: 10000, // Load all filtered results
        sortBy: 'startDate',
        sortDir: 'desc'
      };
      // Add date range filter if set (convert to ISO format for backend)
      if (profileDateFrom) {
        // Convert date input (YYYY-MM-DD) to ISO datetime (YYYY-MM-DDTHH:mm:ss)
        filterParams.startDateFrom = `${profileDateFrom}T00:00:00`;
      }
      if (profileDateTo) {
        filterParams.startDateTo = `${profileDateTo}T23:59:59`;
      }
      // Add quarter/year filter if date range not set
      if (!profileDateFrom && !profileDateTo) {
        if (profileQuarter && profileQuarter !== 'all') filterParams.quarter = profileQuarter;
        if (profileYear) filterParams.year = profileYear;
      }
      // Add status filter if set
      if (profileStatusFilter && profileStatusFilter !== 'all') {
        filterParams.status = profileStatusFilter;
      }
      
      try {
        const impl = await getAllImplementationTasks(filterParams);
        const implList = Array.isArray(impl) ? (impl as ImplementationTaskResponseDTO[]) : (impl as any)?.content ?? [];
        const filteredImpl = (implList as ImplementationTaskResponseDTO[]).filter((t) => {
          const picId = t.picDeploymentId ?? (t as any).picId;
          return picId && teamUserIds.includes(Number(picId));
        });
        setProfileImplTasks(filteredImpl);
      } catch (err) { console.warn('impl load', err); setProfileImplTasks([]); }
      try {
        const dev = await getAllDevTasks({ page: 0, size: 10000 });
        const devList = Array.isArray(dev) ? (dev as DevTaskResponseDTO[]) : (dev as any)?.content ?? [];
        const filtered = (devList as DevTaskResponseDTO[]).filter((t) => {
          const picId = (t as any).picDeploymentId ?? (t as any).picId;
          return picId && teamUserIds.includes(Number(picId));
        });
        setProfileDevTasks(filtered);
      } catch (err) { console.warn('dev load', err); setProfileDevTasks([]); }
      try {
        const m = await getAllMaintenanceTasks({ page: 0, size: 10000 });
        const mList = Array.isArray(m) ? (m as MaintenanceTaskResponseDTO[]) : (m as any)?.content ?? [];
        const filtered = (mList as MaintenanceTaskResponseDTO[]).filter((t) => {
          const picId = (t as any).picDeploymentId ?? (t as any).picId;
          return picId && teamUserIds.includes(Number(picId));
        });
        setProfileMaintTasks(filtered);
      } catch (err) { console.warn('maint load', err); setProfileMaintTasks([]); }

      // businesses - filter by team users
      try {
        const b = await getBusinesses({ page: 0, size: 10000 } as any);
        const bList = Array.isArray(b) ? (b as Array<Record<string, unknown>>) : (b as any)?.content ?? [];
        const filteredBusinesses = bList.filter((item) => {
          const ownerId =
            (item as any)?.picUserId ??
            (item as any)?.picUser?.id ??
            (item as any)?.picId ??
            (item as any)?.ownerId ??
            null;
          return ownerId && teamUserIds.includes(Number(ownerId));
        });
        setProfileBusinesses(filteredBusinesses);
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
      console.error('loadTeamProfile failed', err);
      setHasLoadedProfile(false);
    } finally {
      setProfileLoading(false);
      setHasLoadedProfile(true);
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
        'RECEIVED': 'Đã tiếp nhận',
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

  const matchesProfilePicFilter = (task: Record<string, unknown>) => {
    if (!profilePicFilter || profilePicFilter === 'all') return true;
    const targetId = profilePicFilter;
    const candidateIds = [
      task['picDeploymentId'],
      task['picId'],
      task['picUserId'],
      (task as any)?.picUser?.id,
      (task as any)?.picDeployment?.id,
    ].filter((id) => id != null);
    if (candidateIds.some((id) => String(id) === targetId)) return true;
    const candidateName = String(
      task['picDeploymentName'] ??
        task['picName'] ??
        task['picUserName'] ??
        (task as any)?.picUser?.label ??
        ''
    )
      .trim()
      .toLowerCase();
    if (!candidateName) return false;
    const selectedUser = profileUsers.find((u) => u.id != null && String(u.id) === targetId);
    const selectedName = String(selectedUser?.fullname ?? selectedUser?.username ?? '')
      .trim()
      .toLowerCase();
    if (!selectedName) return false;
    return candidateName === selectedName;
  };

  // Derived (filtered) arrays according to quarter/year selection
  const displayedImplTasks = profileImplTasks.filter((t) =>
    inSelectedQuarter((t as any).startDate ?? (t as any).completionDate ?? (t as any).createdDate ?? null)
  );
  const displayedDevTasks = profileDevTasks.filter((t) =>
    inSelectedQuarter((t as any).startDate ?? (t as any).endDate ?? (t as any).createdDate ?? null)
  );
  const displayedMaintTasks = profileMaintTasks.filter((t) =>
    inSelectedQuarter((t as any).startDate ?? (t as any).endDate ?? (t as any).createdDate ?? null)
  );
  const displayedBusinesses = profileBusinesses.filter((b) => inSelectedQuarter((b as any).startDate ?? (b as any).completionDate ?? null));

  // compute available status options (from data) and apply per-table status filters
  const implStatusOptions = Array.from(new Set(displayedImplTasks.map(t => String((t as any).status ?? '').toUpperCase()).filter(s => s && s !== ''))).sort();
  const devStatusOptions = Array.from(new Set(displayedDevTasks.map(t => String((t as any).status ?? '').toUpperCase()).filter(s => s && s !== ''))).sort();
  const maintStatusOptions = Array.from(new Set(displayedMaintTasks.map(t => String((t as any).status ?? '').toUpperCase()).filter(s => s && s !== ''))).sort();

  const filteredImplTasks = (implStatusFilter === 'all'
    ? displayedImplTasks
    : displayedImplTasks.filter(t => String((t as any).status ?? '').toUpperCase() === implStatusFilter)
  ).filter((t) => matchesProfilePicFilter(t as unknown as Record<string, unknown>));

  const filteredDevTasks = (devStatusFilter === 'all'
    ? displayedDevTasks
    : displayedDevTasks.filter(t => String((t as any).status ?? '').toUpperCase() === devStatusFilter)
  ).filter((t) => matchesProfilePicFilter(t as unknown as Record<string, unknown>));

  const filteredMaintTasks = (maintStatusFilter === 'all'
    ? displayedMaintTasks
    : displayedMaintTasks.filter(t => String((t as any).status ?? '').toUpperCase() === maintStatusFilter)
  ).filter((t) => matchesProfilePicFilter(t as unknown as Record<string, unknown>));

  // Prepare data for comparison charts
  const prepareComparisonData = useCallback(() => {
    const allTasks = [
      ...profileImplTasks.map(t => ({ ...t, type: 'impl' as const, hospitalName: t.hospitalName, receivedDate: (t as any).receivedDate ?? (t as any).startDate ?? (t as any).createdDate, completionDate: t.completionDate ?? (t as any).finishDate, status: t.status, name: t.name })),
      ...profileDevTasks.map(t => ({ ...t, type: 'dev' as const, hospitalName: (t as any).hospitalName, receivedDate: (t as any).receivedDate ?? (t as any).startDate ?? (t as any).createdDate, completionDate: (t as any).endDate, status: (t as any).status, name: t.name })),
      ...profileMaintTasks.map(t => ({ ...t, type: 'maint' as const, hospitalName: (t as any).hospitalName, receivedDate: (t as any).receivedDate ?? (t as any).startDate ?? (t as any).createdDate, completionDate: (t as any).endDate, status: (t as any).status, name: t.name })),
    ];

    const currentYear = profileYear || String(new Date().getFullYear());
    const compareYearValue = compareYear || String(Number(currentYear) - 1);

    const getTimeKey = (dateStr: string | null | undefined, range: 'monthly' | 'quarterly' | 'yearly') => {
      if (!dateStr) return null;
      const d = new Date(dateStr);
      if (Number.isNaN(d.getTime())) return null;
      const year = d.getFullYear();
      if (range === 'yearly') return String(year);
      if (range === 'quarterly') {
        const quarter = Math.floor(d.getMonth() / 3) + 1;
        return `${year}-Q${quarter}`;
      }
      const month = d.getMonth() + 1;
      return `${year}-${String(month).padStart(2, '0')}`;
    };

    const currentData: Record<string, { total: number; completed: number }> = {};
    const compareData: Record<string, { total: number; completed: number }> = {};

    allTasks.forEach(task => {
      const key = getTimeKey(task.receivedDate, timeRange);
      if (!key) return;
      
      const isCurrentYear = key.startsWith(currentYear);
      const isCompareYear = key.startsWith(compareYearValue);
      
      if (isCurrentYear) {
        if (!currentData[key]) currentData[key] = { total: 0, completed: 0 };
        currentData[key].total++;
        if (String(task.status).toUpperCase() === 'COMPLETED') currentData[key].completed++;
      }
      
      if (isCompareYear) {
        if (!compareData[key]) compareData[key] = { total: 0, completed: 0 };
        compareData[key].total++;
        if (String(task.status).toUpperCase() === 'COMPLETED') compareData[key].completed++;
      }
    });

    // Generate labels based on timeRange
    let labels: string[] = [];
    if (timeRange === 'yearly') {
      labels = [currentYear, compareYearValue];
    } else if (timeRange === 'quarterly') {
      labels = ['Q1', 'Q2', 'Q3', 'Q4'].map(q => `${currentYear}-${q}`);
      if (compareYear) {
        labels = labels.concat(['Q1', 'Q2', 'Q3', 'Q4'].map(q => `${compareYearValue}-${q}`));
      }
    } else {
      labels = Array.from({ length: 12 }, (_, i) => `${currentYear}-${String(i + 1).padStart(2, '0')}`);
      if (compareYear) {
        labels = labels.concat(Array.from({ length: 12 }, (_, i) => `${compareYearValue}-${String(i + 1).padStart(2, '0')}`));
      }
    }

    const currentSeries = labels.map(l => currentData[l]?.total || 0);
    const compareSeries = labels.map(l => compareData[l]?.total || 0);
    const currentCompletedSeries = labels.map(l => currentData[l]?.completed || 0);
    const compareCompletedSeries = labels.map(l => compareData[l]?.completed || 0);

    return { labels, currentSeries, compareSeries, currentCompletedSeries, compareCompletedSeries };
  }, [profileImplTasks, profileDevTasks, profileMaintTasks, profileYear, compareYear, timeRange]);

  const comparisonData = prepareComparisonData();

  // Group tasks by hospital for visual table view
  // Use startDate for filtering and display
  const tasksByHospital = useMemo(() => {
    // Helper to check if startDate matches date range filter
    const matchesDateRangeFilter = (startDate?: string | null) => {
      // Priority: Date range > Quarter/Year
      // If date range is set, use it
      if (profileDateFrom || profileDateTo) {
        if (!startDate) return false;
        const d = new Date(startDate);
        if (Number.isNaN(d.getTime())) return false;
        const taskDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        
        if (profileDateFrom) {
          const fromDate = new Date(profileDateFrom);
          fromDate.setHours(0, 0, 0, 0);
          if (taskDate < fromDate) return false;
        }
        if (profileDateTo) {
          const toDate = new Date(profileDateTo);
          toDate.setHours(23, 59, 59, 999);
          if (taskDate > toDate) return false;
        }
        return true;
      }
      
      // Fallback to quarter/year filter if date range not set
      // If both quarter and year are "all" or empty, show all tasks
      if (profileQuarter === 'all' && (!profileYear || profileYear === '')) return true;
      
      // If no date available, only show if filter is "all"
      if (!startDate) {
        return profileQuarter === 'all' && (!profileYear || profileYear === '');
      }
      
      const d = new Date(startDate);
      if (Number.isNaN(d.getTime())) {
        // Invalid date, only show if filter is "all"
        return profileQuarter === 'all' && (!profileYear || profileYear === '');
      }
      
      // Check year filter
      if (profileYear && profileYear !== '' && String(d.getFullYear()) !== profileYear) return false;
      
      // Check quarter filter
      if (profileQuarter === 'all') return true;
      const month = d.getMonth(); // 0..11
      const q = Math.floor(month / 3) + 1;
      return `Q${q}` === profileQuarter;
    };

    // Get all tasks (before status filter) and filter by startDate
    const allImplTasks = profileImplTasks.filter(t => {
      const startDate = (t as any).startDate ?? (t as any).receivedDate ?? (t as any).createdDate;
      return matchesDateRangeFilter(startDate);
    });
    const allDevTasks = profileDevTasks.filter(t => {
      const startDate = (t as any).startDate ?? (t as any).receivedDate ?? (t as any).createdDate;
      return matchesDateRangeFilter(startDate);
    });
    const allMaintTasks = profileMaintTasks.filter(t => {
      const startDate = (t as any).startDate ?? (t as any).receivedDate ?? (t as any).createdDate;
      return matchesDateRangeFilter(startDate);
    });

    // Helper to normalize status to canonical statuses
    const normalizeStatusToCanonical = (status?: string | null): string | null => {
      if (!status) return null;
      const s = String(status).trim().toUpperCase();
      // Map variants to canonical statuses
      if (s === 'RECEIVED' || s === 'NOT_STARTED' || s === 'PENDING') return 'RECEIVED';
      if (s === 'IN_PROCESS' || s === 'IN_PROGRESS' || s === 'API_TESTING' || s === 'INTEGRATING' || s === 'WAITING_FOR_DEV' || s === 'WAITING_FOR_DEPLOY') return 'IN_PROCESS';
      if (s === 'COMPLETED' || s === 'DONE' || s === 'FINISHED' || s === 'ACCEPTED' || s === 'TRANSFERRED' || s === 'PENDING_TRANSFER' || s === 'TRANSFERRED_TO_CUSTOMER') return 'COMPLETED';
      if (s === 'ISSUE' || s === 'FAILED' || s === 'ERROR') return 'ISSUE';
      // Return as-is if already canonical
      if (s === 'RECEIVED' || s === 'IN_PROCESS' || s === 'COMPLETED' || s === 'ISSUE') return s;
      return s; // Return original for unmatched statuses
    };
    
    // Apply status filter (use profileStatusFilter if set, otherwise use individual filters)
    const statusFilter = profileStatusFilter !== 'all' ? profileStatusFilter : null;
    const implTasksFiltered = statusFilter 
      ? allImplTasks.filter(t => normalizeStatusToCanonical((t as any).status) === statusFilter)
      : (implStatusFilter === 'all' ? allImplTasks : allImplTasks.filter(t => String((t as any).status ?? '').toUpperCase() === implStatusFilter));
    const devTasksFiltered = statusFilter
      ? allDevTasks.filter(t => normalizeStatusToCanonical((t as any).status) === statusFilter)
      : (devStatusFilter === 'all' ? allDevTasks : allDevTasks.filter(t => String((t as any).status ?? '').toUpperCase() === devStatusFilter));
    const maintTasksFiltered = statusFilter
      ? allMaintTasks.filter(t => normalizeStatusToCanonical((t as any).status) === statusFilter)
      : (maintStatusFilter === 'all' ? allMaintTasks : allMaintTasks.filter(t => String((t as any).status ?? '').toUpperCase() === maintStatusFilter));

    const implTasksPicFiltered = implTasksFiltered.filter((t) => matchesProfilePicFilter(t as unknown as Record<string, unknown>));
    const devTasksPicFiltered = devTasksFiltered.filter((t) => matchesProfilePicFilter(t as unknown as Record<string, unknown>));
    const maintTasksPicFiltered = maintTasksFiltered.filter((t) => matchesProfilePicFilter(t as unknown as Record<string, unknown>));

    const allTasks = [
      ...implTasksPicFiltered.map(t => ({ ...t, type: 'Triển khai' as const, hospitalName: t.hospitalName, startDate: (t as any).startDate ?? (t as any).receivedDate ?? (t as any).createdDate, completionDate: t.completionDate ?? (t as any).finishDate, status: t.status, name: t.name, picName: (t as any).picDeploymentName ?? (t as any).picName ?? '—' })),
      ...devTasksPicFiltered.map(t => ({ ...t, type: 'Phát triển' as const, hospitalName: (t as any).hospitalName, startDate: (t as any).startDate ?? (t as any).receivedDate ?? (t as any).createdDate, completionDate: (t as any).endDate, status: (t as any).status, name: t.name, picName: (t as any).picDeploymentName ?? (t as any).picName ?? '—' })),
      ...maintTasksPicFiltered.map(t => ({ ...t, type: 'Bảo trì' as const, hospitalName: (t as any).hospitalName, startDate: (t as any).startDate ?? (t as any).receivedDate ?? (t as any).createdDate, completionDate: (t as any).endDate, status: (t as any).status, name: t.name, picName: (t as any).picDeploymentName ?? (t as any).picName ?? '—' })),
    ];

    const grouped = new Map<string, Array<typeof allTasks[0]>>();
    allTasks.forEach(task => {
      const hospitalName = task.hospitalName || 'Không xác định';
      if (!grouped.has(hospitalName)) {
        grouped.set(hospitalName, []);
      }
      grouped.get(hospitalName)!.push(task);
    });

    const sortedGroups = Array.from(grouped.entries()).map(([hospitalName, tasks]) => ({
      hospitalName,
      tasks: tasks.sort((a, b) => {
        const dateA = a.startDate ? new Date(a.startDate).getTime() : 0;
        const dateB = b.startDate ? new Date(b.startDate).getTime() : 0;
        return dateB - dateA;
      })
    }));
    
    // Calculate total items for pagination
    const totalItems = sortedGroups.reduce((sum, group) => sum + group.tasks.length, 0);
    setDetailTotalItems(totalItems);
    setDetailTotalPages(Math.ceil(totalItems / detailItemsPerPage));
    
    // Apply pagination - show only current page items
    let currentItemIndex = 0;
    const startIndex = detailCurrentPage * detailItemsPerPage;
    const endIndex = startIndex + detailItemsPerPage;
    
    const paginatedGroups: typeof sortedGroups = [];
    for (const group of sortedGroups) {
      if (currentItemIndex >= endIndex) break;
      
      const groupStartIndex = currentItemIndex;
      const groupEndIndex = currentItemIndex + group.tasks.length;
      
      // If group is partially visible
      if (groupStartIndex < endIndex && groupEndIndex > startIndex) {
        const visibleStart = Math.max(0, startIndex - groupStartIndex);
        const visibleEnd = Math.min(group.tasks.length, endIndex - groupStartIndex);
        paginatedGroups.push({
          hospitalName: group.hospitalName,
          tasks: group.tasks.slice(visibleStart, visibleEnd)
        });
      }
      
      currentItemIndex = groupEndIndex;
    }
    
    return paginatedGroups;
  }, [profileImplTasks, profileDevTasks, profileMaintTasks, profileQuarter, profileYear, profileDateFrom, profileDateTo, implStatusFilter, devStatusFilter, maintStatusFilter, profileStatusFilter, detailCurrentPage, detailItemsPerPage, profilePicFilter, profileUsers]);

  // Aggregations for implementation and maintenance (kept minimal per current UI needs)

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
    const team = selectedTeam || '';
    const safeTeam = team ? team.replace(/[^a-z0-9\-_]/gi, '_') : 'all_teams';
    const q = profileQuarter ?? 'all';
    const y = profileYear ?? '';
    const parts = [base, safeTeam || null, q !== 'all' ? q : null, y || null].filter(Boolean);
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

  // Export detail report to Excel with grouping by hospital (similar to web UI)
  const exportDetailExcel = async () => {
    try {
      if (!hasLoadedProfile || tasksByHospital.length === 0) {
        toast.error('Vui lòng tải hồ sơ trước');
        return;
      }

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Báo cáo chi tiết');

      // Set column headers
      const headers = ['Tên bệnh viện', 'Nội dung công việc', 'Ngày bắt đầu', 'Người phụ trách', 'Trạng thái', 'Ngày hoàn thành', 'Số ngày thực hiện'];
      const headerRow = worksheet.addRow(headers);
      
      // Style header row
      headerRow.font = { bold: true, size: 11 };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
      headerRow.height = 25;
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE5E7EB' } // Light gray background
      };
      headerRow.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };

      // Set column widths
      worksheet.getColumn(1).width = 25; // Tên bệnh viện
      worksheet.getColumn(2).width = 40; // Nội dung công việc
      worksheet.getColumn(3).width = 15; // Ngày bắt đầu
      worksheet.getColumn(4).width = 20; // Người phụ trách
      worksheet.getColumn(5).width = 18; // Trạng thái
      worksheet.getColumn(6).width = 18; // Ngày hoàn thành
      worksheet.getColumn(7).width = 18; // Số ngày thực hiện

      // Add data rows with grouping
      let currentRow = 2; // Start after header row
      
      // Get all groups (not paginated) - reuse logic from tasksByHospital
      const allGroups = (() => {
        // Same logic as tasksByHospital but without pagination
        const matchesDateRangeFilter = (startDate?: string | null) => {
          if (profileDateFrom || profileDateTo) {
            if (!startDate) return false;
            const d = new Date(startDate);
            if (Number.isNaN(d.getTime())) return false;
            const taskDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
            
            if (profileDateFrom) {
              const fromDate = new Date(profileDateFrom);
              fromDate.setHours(0, 0, 0, 0);
              if (taskDate < fromDate) return false;
            }
            if (profileDateTo) {
              const toDate = new Date(profileDateTo);
              toDate.setHours(23, 59, 59, 999);
              if (taskDate > toDate) return false;
            }
            return true;
          }
          if (profileQuarter === 'all' && (!profileYear || profileYear === '')) return true;
          if (!startDate) {
            return profileQuarter === 'all' && (!profileYear || profileYear === '');
          }
          const d = new Date(startDate);
          if (Number.isNaN(d.getTime())) {
            return profileQuarter === 'all' && (!profileYear || profileYear === '');
          }
          if (profileYear && profileYear !== '' && String(d.getFullYear()) !== profileYear) return false;
          if (profileQuarter === 'all') return true;
          const month = d.getMonth();
          const q = Math.floor(month / 3) + 1;
          return `Q${q}` === profileQuarter;
        };

        const allImplTasks = profileImplTasks.filter(t => {
          const startDate = (t as any).startDate ?? (t as any).receivedDate ?? (t as any).createdDate;
          return matchesDateRangeFilter(startDate);
        });
        const allDevTasks = profileDevTasks.filter(t => {
          const startDate = (t as any).startDate ?? (t as any).receivedDate ?? (t as any).createdDate;
          return matchesDateRangeFilter(startDate);
        });
        const allMaintTasks = profileMaintTasks.filter(t => {
          const startDate = (t as any).startDate ?? (t as any).receivedDate ?? (t as any).createdDate;
          return matchesDateRangeFilter(startDate);
        });

        const normalizeStatusToCanonical = (status?: string | null): string | null => {
          if (!status) return null;
          const s = String(status).trim().toUpperCase();
          if (s === 'RECEIVED' || s === 'NOT_STARTED' || s === 'PENDING') return 'RECEIVED';
          if (s === 'IN_PROCESS' || s === 'IN_PROGRESS' || s === 'API_TESTING' || s === 'INTEGRATING' || s === 'WAITING_FOR_DEV' || s === 'WAITING_FOR_DEPLOY') return 'IN_PROCESS';
          if (s === 'COMPLETED' || s === 'DONE' || s === 'FINISHED' || s === 'ACCEPTED' || s === 'TRANSFERRED' || s === 'PENDING_TRANSFER' || s === 'TRANSFERRED_TO_CUSTOMER') return 'COMPLETED';
          if (s === 'ISSUE' || s === 'FAILED' || s === 'ERROR') return 'ISSUE';
          if (s === 'RECEIVED' || s === 'IN_PROCESS' || s === 'COMPLETED' || s === 'ISSUE') return s;
          return s;
        };

        const statusFilter = profileStatusFilter !== 'all' ? profileStatusFilter : null;
        const implTasksFiltered = statusFilter 
          ? allImplTasks.filter(t => normalizeStatusToCanonical((t as any).status) === statusFilter)
          : allImplTasks;
        const devTasksFiltered = statusFilter
          ? allDevTasks.filter(t => normalizeStatusToCanonical((t as any).status) === statusFilter)
          : allDevTasks;
        const maintTasksFiltered = statusFilter
          ? allMaintTasks.filter(t => normalizeStatusToCanonical((t as any).status) === statusFilter)
          : allMaintTasks;

        const allTasks = [
          ...implTasksFiltered.map(t => ({ ...t, type: 'Triển khai' as const, hospitalName: t.hospitalName, startDate: (t as any).startDate ?? (t as any).receivedDate ?? (t as any).createdDate, completionDate: t.completionDate ?? (t as any).finishDate, status: t.status, name: t.name, picName: (t as any).picDeploymentName ?? (t as any).picName ?? '—' })),
          ...devTasksFiltered.map(t => ({ ...t, type: 'Phát triển' as const, hospitalName: (t as any).hospitalName, startDate: (t as any).startDate ?? (t as any).receivedDate ?? (t as any).createdDate, completionDate: (t as any).endDate, status: (t as any).status, name: t.name, picName: (t as any).picDeploymentName ?? (t as any).picName ?? '—' })),
          ...maintTasksFiltered.map(t => ({ ...t, type: 'Bảo trì' as const, hospitalName: (t as any).hospitalName, startDate: (t as any).startDate ?? (t as any).receivedDate ?? (t as any).createdDate, completionDate: (t as any).endDate, status: (t as any).status, name: t.name, picName: (t as any).picDeploymentName ?? (t as any).picName ?? '—' })),
        ];

        const grouped = new Map<string, Array<typeof allTasks[0]>>();
        allTasks.forEach(task => {
          const hospitalName = task.hospitalName || 'Không xác định';
          if (!grouped.has(hospitalName)) {
            grouped.set(hospitalName, []);
          }
          grouped.get(hospitalName)!.push(task);
        });

        return Array.from(grouped.entries()).map(([hospitalName, tasks]) => ({
          hospitalName,
          tasks: tasks.sort((a, b) => {
            const dateA = a.startDate ? new Date(a.startDate).getTime() : 0;
            const dateB = b.startDate ? new Date(b.startDate).getTime() : 0;
            return dateB - dateA;
          })
        }));
      })();

      // Add hospital groups - hospital name on its own row, then tasks below
      for (const group of allGroups) {
        // Add hospital name row (bold header)
        const hospitalRow = worksheet.addRow([
          group.hospitalName, // Hospital name in first column
          '', // Empty for other columns
          '',
          '',
          '',
          '',
          ''
        ]);
        
        hospitalRow.font = { bold: true, size: 11 };
        hospitalRow.alignment = { vertical: 'middle', horizontal: 'left' };
        hospitalRow.height = 22;
        hospitalRow.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
        currentRow++;

        // Add task rows below hospital name
        for (const task of group.tasks) {
          const taskRow = worksheet.addRow([
            '', // Empty for hospital name column (hospital name is on row above)
            `${task.name || '—'}\n${task.type}`, // Task name with type
            task.startDate ? new Date(task.startDate).toLocaleDateString('vi-VN') : '—',
            task.picName ?? '—',
            translateStatus(String(task.status)),
            task.completionDate ? new Date(task.completionDate).toLocaleDateString('vi-VN') : '—',
            (() => {
              const startDate = task.startDate;
              if (!startDate) return '—';
              const start = new Date(startDate);
              const endDate = task.completionDate ? new Date(task.completionDate) : new Date();
              if (Number.isNaN(start.getTime()) || Number.isNaN(endDate.getTime())) return '—';
              const startDateOnly = new Date(start.getFullYear(), start.getMonth(), start.getDate());
              const endDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
              const diffTime = endDateOnly.getTime() - startDateOnly.getTime();
              const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
              return diffDays >= 0 ? `${diffDays} ngày` : '—';
            })()
          ]);

          taskRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
          taskRow.height = 30;
          taskRow.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
          
          // Left align task name
          taskRow.getCell(2).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
          
          currentRow++;
        }
      }

      // Freeze header row
      worksheet.views = [{ state: 'frozen', ySplit: 1 }];

      // Generate buffer and download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = makeFilename('bao_cao_chi_tiet').replace('.csv', '.xlsx');
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      
      toast.success('Xuất file Excel thành công');
    } catch (err) {
      console.error('exportDetailExcel failed', err);
      toast.error('Xuất file Excel thất bại');
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
            {/* Filtered users by Team / Department */}
         
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
                  <label className="block text-xs text-gray-500">Trạng thái</label>
                  <select value={businessStatus} onChange={(e) => setBusinessStatus(e.target.value)} className="mt-1 rounded-md border px-3 py-2 text-sm bg-white w-40">
                    <option value="">Tất cả</option>
                    <option value="CARING">Đang chăm sóc</option>
                    <option value="CONTRACTED">Đã ký hợp đồng</option>
                    <option value="CANCELLED">Đã hủy</option>
                  </select>
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
                <button onClick={() => void loadBusinessReport(businessFrom, businessTo, businessStatus)} disabled={businessLoading} className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-700">Áp dụng</button>
                <button onClick={() => { setBusinessFrom(''); setBusinessTo(''); setBusinessStatus(''); void loadBusinessReport(); }} disabled={businessLoading} className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200">Xóa</button>
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

        {/* Employee Performance Report */}
        <section className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100 w-full">
          <div className="max-w-full">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Báo cáo Hiệu suất Nhân viên</h2>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col sm:flex-row gap-4 items-center">
                <div className="flex flex-col">
                  <label className="block text-xs text-gray-500">Năm</label>
                  <select value={reportYear} onChange={(e) => setReportYear(Number(e.target.value))} className="mt-1 rounded-md border px-1 py-2 text-sm bg-white w-25">
                    {Array.from({ length: new Date().getFullYear() - 2019 }).map((_, i) => {
                      const y = 2020 + i;
                      return <option key={y} value={y}>{y}</option>;
                    })}
                  </select>
                </div>

                <div className="flex flex-col">
                  <label className="block text-xs text-gray-500">Tháng (tùy chọn)</label>
                  <select value={reportMonth} onChange={(e) => setReportMonth(e.target.value === '' ? '' : Number(e.target.value))} className="mt-1 rounded-md border px-3 py-1 text-sm bg-white w-36">
                    <option value="">Tất cả</option>
                    {Array.from({ length: 12 }).map((_, i) => {
                      const m = i + 1;
                      return <option key={m} value={m}>{m}</option>;
                    })}
                  </select>
                </div>

                <div className="flex flex-col">
                  <label className="block text-xs text-gray-500">Team</label>
                  <select value={reportTeam} onChange={(e) => setReportTeam(e.target.value)} className="mt-1 rounded-md border px-3 py-2 text-sm bg-white w-44">
                    <option value="ALL">Tất cả</option>
                    <option value="DEPLOYMENT">DEPLOYMENT</option>
                    <option value="DEV">DEV</option>
                    <option value="MAINTENANCE">MAINTENANCE</option>
                    <option value="SALES">SALES</option>
                  </select>
                </div>

                <div className="flex flex-col">
                  <label className="block text-xs text-gray-500">Phòng ban (tùy chọn)</label>
                  <select value={reportDepartment} onChange={(e) => setReportDepartment(e.target.value)} className="mt-1 rounded-md border px-3 py-2 text-sm bg-white w-56">
                    <option value="">Tất cả</option>
                    {departments.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

                <div className="mt-2 sm:mt-0 flex items-center gap-2">
                <button onClick={async () => { await fetchEmployeePerformance(); }} disabled={reportLoading} className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-700">Áp dụng</button>
                <button onClick={() => void exportEmployeePerformanceExcel()} disabled={reportLoading} className="rounded-md bg-indigo-100 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-200">Xuất Excel</button>
              </div>
            </div>

            <div className="mt-4">
              {reportLoading ? (
                <div className="text-sm text-gray-500">Đang tải báo cáo…</div>
              ) : reportData.length === 0 ? (
                <div className="text-sm text-gray-500">Chưa có dữ liệu. Nhấn Áp dụng để lấy báo cáo.</div>
              ) : (
                <div className="overflow-x-auto mt-2">
                  <table className="min-w-full text-sm table-auto">
                    <thead>
                      <tr className="text-xs text-gray-600 bg-gray-50">
                        <th className="px-2 py-1 text-center">ID</th>
                        <th className="px-2 py-1 text-center">Họ và tên</th>
                        <th className="px-2 py-1 text-center">Team</th>
                        <th className="px-2 py-1 text-center">Phòng ban</th>
                        <th className="px-2 py-1 text-center">Đã giao</th>
                        <th className="px-2 py-1 text-center">Đang xử lý</th>
                        <th className="px-2 py-1 text-center">Hoàn thành</th>
                        <th className="px-2 py-1 text-center">Quá hạn</th>
                        <th className="px-2 py-1 text-center">Đã tiếp nhận</th>
                        <th className="px-2 py-1 text-center">TB xử lý (h)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.map((r, idx) => (
                        <tr key={`${r.userId ?? idx}`} className={`border-t odd:bg-white even:bg-gray-50 hover:bg-gray-100`}>
                          <td className="px-2 py-2 align-middle text-center">{r.userId ?? '—'}</td>
                          <td className="px-2 py-2 align-middle text-center">{r.fullName ?? '—'}</td>
                          <td className="px-2 py-2 align-middle text-center">{r.team ?? '—'}</td>
                          <td className="px-2 py-2 align-middle text-center">{r.department ?? '—'}</td>
                          <td className="px-2 py-2 align-middle text-center">{r.totalAssigned ?? 0}</td>
                          <td className="px-2 py-2 align-middle text-center">{r.totalInProgress ?? 0}</td>
                          <td className="px-2 py-2 align-middle text-center">{r.totalCompleted ?? 0}</td>
                          <td className="px-2 py-2 align-middle text-center">{r.totalLate ?? 0}</td>
                          <td className="px-2 py-2 align-middle text-center">{r.totalReceived ?? 0}</td>
                          <td className="px-2 py-2 align-middle text-center">{r.avgProcessingHours != null ? (Math.round(r.avgProcessingHours * 100) / 100) : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Hospital Profile (inline on Home) */}
        <section className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100 w-full">
          <div className="max-w-full">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Báo cáo chi tiết theo Team</h2>
              </div>
              <div className="flex items-center gap-2">
                
                {viewMode === 'detail' && hasLoadedProfile && (
                  <button onClick={() => void exportDetailExcel()} disabled={profileLoading} className="rounded-md bg-green-600 px-3 py-1 text-sm text-white hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed ml-2">Xuất Excel</button>
                )}
              </div>
            </div>

            {/* View Mode Tabs */}
            <div className="flex items-center gap-2 mb-4 border-b border-gray-200">
              <button
                onClick={() => setViewMode('detail')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  viewMode === 'detail'
                    ? 'text-indigo-600 border-b-2 border-indigo-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Chi tiết
              </button>
              <button
                onClick={() => setViewMode('comparison')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  viewMode === 'comparison'
                    ? 'text-indigo-600 border-b-2 border-indigo-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                So sánh
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-3 items-center">
              <div className="w-full sm:w-auto">
                <label className="text-sm text-gray-500">Chọn team</label>
                <div className="relative mt-1 flex items-center gap-3">
                  <select 
                    value={selectedTeam} 
                    onChange={(e) => setSelectedTeam(e.target.value)} 
                    className="rounded-md border px-3 text-sm w-40 h-10 bg-white"
                  >
                    <option value="">— Chọn team —</option>
                    {availableTeams.map(team => (
                      <option key={team} value={team}>{team}</option>
                    ))}
                  </select>
                  <button 
                    onClick={() => void loadTeamProfile()} 
                    disabled={profileLoading || !selectedTeam} 
                    className="h-10 inline-flex items-center rounded-md bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    Tải hồ sơ
                  </button>
                  <div className="flex items-center gap-2 ml-2 flex-wrap">
                    <label className="text-sm text-gray-500">Quý</label>
                    <select value={profileQuarter} onChange={(e) => { setProfileQuarter(e.target.value as any); setDetailCurrentPage(0); }} className="rounded-md border px-2 py-1 text-sm bg-white">
                      <option value="all">Tất cả</option>
                      <option value="Q1">Q1</option>
                      <option value="Q2">Q2</option>
                      <option value="Q3">Q3</option>
                      <option value="Q4">Q4</option>
                    </select>
                    <label className="text-sm text-gray-500">Năm</label>
                    <select value={profileYear} onChange={(e) => { setProfileYear(e.target.value); setDetailCurrentPage(0); }} className="rounded-md border px-2 py-1 text-sm bg-white w-20">
                      <option value="">Tất cả</option>
                      {Array.from({ length: new Date().getFullYear() - 2019 }).map((_, i) => {
                        const y = String(2020 + i);
                        return <option key={y} value={y}>{y}</option>;
                      })}
                    </select>
                    <label className="text-sm text-gray-500 ml-2">Từ ngày</label>
                    <input 
                      type="date" 
                      value={profileDateFrom} 
                      onChange={(e) => { setProfileDateFrom(e.target.value); setDetailCurrentPage(0); }} 
                      className="rounded-md border px-2 py-1 text-sm bg-white"
                    />
                    <label className="text-sm text-gray-500">Đến ngày</label>
                    <input 
                      type="date" 
                      value={profileDateTo} 
                      onChange={(e) => { setProfileDateTo(e.target.value); setDetailCurrentPage(0); }} 
                      className="rounded-md border px-2 py-1 text-sm bg-white"
                    />
                    {(profileDateFrom || profileDateTo) && (
                      <button 
                        onClick={() => { setProfileDateFrom(''); setProfileDateTo(''); setDetailCurrentPage(0); }} 
                        className="text-xs text-gray-500 hover:text-gray-700 underline"
                      >
                        Xóa lọc ngày
                      </button>
                    )}
                    <label className="text-sm text-gray-500 ml-2">Trạng thái</label>
                    <select 
                      value={profileStatusFilter} 
                      onChange={(e) => { setProfileStatusFilter(e.target.value); setDetailCurrentPage(0); }} 
                      className="rounded-md border px-2 py-1 text-sm bg-white"
                    >
                      <option value="all">Tất cả</option>
                      <option value="RECEIVED">Đã tiếp nhận</option>
                      <option value="IN_PROCESS">Đang xử lý</option>
                      <option value="COMPLETED">Hoàn thành</option>
                      <option value="ISSUE">Gặp sự cố</option>
                    </select>
                    <label className="text-sm text-gray-500">Người phụ trách</label>
                    <select
                      value={profilePicFilter}
                      onChange={(e) => { setProfilePicFilter(e.target.value); setDetailCurrentPage(0); }}
                      className="rounded-md border px-2 py-1 text-sm bg-white"
                    >
                      <option value="all">Tất cả</option>
                      {profileUsers
                        .filter((u) => u.id != null)
                        .map((u) => (
                          <option key={u.id} value={String(u.id)}>
                            {u.fullname ?? u.username ?? `User #${u.id}`}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Comparison View */}
            {viewMode === 'comparison' && (
              <div className="space-y-6">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-500">Khoảng thời gian:</label>
                    <select value={timeRange} onChange={(e) => setTimeRange(e.target.value as any)} className="rounded-md border px-3 py-1 text-sm bg-white">
                      <option value="monthly">Theo tháng</option>
                      <option value="quarterly">Theo quý</option>
                      <option value="yearly">Theo năm</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-500">So sánh với năm:</label>
                    <select value={compareYear} onChange={(e) => setCompareYear(e.target.value)} className="rounded-md border px-3 py-1 text-sm bg-white w-32">
                      <option value="">Không so sánh</option>
                      {Array.from({ length: new Date().getFullYear() - 2019 }).map((_, i) => {
                        const y = String(2020 + i);
                        return <option key={y} value={y}>{y}</option>;
                      })}
                    </select>
                  </div>
                </div>

                {/* Comparison Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100">
                    <h3 className="text-sm font-medium text-gray-700 mb-4">Tổng số công việc</h3>
                    <Chart
                      options={{
                        chart: { type: 'line', toolbar: { show: false }, zoom: { enabled: false } },
                        xaxis: { categories: comparisonData.labels },
                        yaxis: { title: { text: 'Số lượng' } },
                        legend: { position: 'top' },
                        colors: ['#465fff', '#10b981'],
                        stroke: { width: 2, curve: 'smooth' },
                        markers: { size: 4 },
                        tooltip: { shared: true, intersect: false }
                      }}
                      series={[
                        { name: profileYear || String(new Date().getFullYear()), data: comparisonData.currentSeries },
                        ...(compareYear ? [{ name: compareYear, data: comparisonData.compareSeries }] : [])
                      ]}
                      type="line"
                      height={300}
                    />
                  </div>

                  <div className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100">
                    <h3 className="text-sm font-medium text-gray-700 mb-4">Công việc đã hoàn thành</h3>
                    <Chart
                      options={{
                        chart: { type: 'line', toolbar: { show: false }, zoom: { enabled: false } },
                        xaxis: { categories: comparisonData.labels },
                        yaxis: { title: { text: 'Số lượng' } },
                        legend: { position: 'top' },
                        colors: ['#465fff', '#10b981'],
                        stroke: { width: 2, curve: 'smooth' },
                        markers: { size: 4 },
                        tooltip: { shared: true, intersect: false }
                      }}
                      series={[
                        { name: profileYear || String(new Date().getFullYear()), data: comparisonData.currentCompletedSeries },
                        ...(compareYear ? [{ name: compareYear, data: comparisonData.compareCompletedSeries }] : [])
                      ]}
                      type="line"
                      height={300}
                    />
                  </div>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100">
                    <div className="text-sm text-gray-500">Tổng công việc ({profileYear || String(new Date().getFullYear())})</div>
                    <div className="text-2xl font-bold text-gray-900 mt-1">
                      {comparisonData.currentSeries.reduce((a, b) => a + b, 0)}
                    </div>
                    {compareYear && (
                      <div className="text-xs text-gray-500 mt-1">
                        Năm {compareYear}: {comparisonData.compareSeries.reduce((a, b) => a + b, 0)}
                      </div>
                    )}
                  </div>
                  <div className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100">
                    <div className="text-sm text-gray-500">Đã hoàn thành ({profileYear || String(new Date().getFullYear())})</div>
                    <div className="text-2xl font-bold text-gray-900 mt-1">
                      {comparisonData.currentCompletedSeries.reduce((a, b) => a + b, 0)}
                    </div>
                    {compareYear && (
                      <div className="text-xs text-gray-500 mt-1">
                        Năm {compareYear}: {comparisonData.compareCompletedSeries.reduce((a, b) => a + b, 0)}
                      </div>
                    )}
                  </div>
                  <div className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100">
                    <div className="text-sm text-gray-500">Tỷ lệ hoàn thành ({profileYear || String(new Date().getFullYear())})</div>
                    <div className="text-2xl font-bold text-gray-900 mt-1">
                      {comparisonData.currentSeries.reduce((a, b) => a + b, 0) > 0
                        ? Math.round((comparisonData.currentCompletedSeries.reduce((a, b) => a + b, 0) / comparisonData.currentSeries.reduce((a, b) => a + b, 0)) * 100)
                        : 0}%
                    </div>
                    {compareYear && (
                      <div className="text-xs text-gray-500 mt-1">
                        Năm {compareYear}: {comparisonData.compareSeries.reduce((a, b) => a + b, 0) > 0
                          ? Math.round((comparisonData.compareCompletedSeries.reduce((a, b) => a + b, 0) / comparisonData.compareSeries.reduce((a, b) => a + b, 0)) * 100)
                          : 0}%
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Detail View */}
            {viewMode === 'detail' && (
              <>
                {/* Visual Table View - Grouped by Hospital */}
                {profileLoading ? (
                  <div className="mb-6 mt-4 rounded-2xl bg-white p-8 shadow-sm border border-gray-100 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                      <div className="text-sm text-gray-500">Đang tải dữ liệu...</div>
                    </div>
                  </div>
                ) : tasksByHospital.length > 0 ? (
                  <div className="mb-6 mt-4 rounded-2xl bg-white p-4 shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-medium text-gray-700">Tổng quan công việc theo bệnh viện</h3>
                      <div className="text-xs text-gray-500">
                        Tổng: {detailTotalItems} công việc
                      </div>
                    </div>
                    <div className="overflow-x-auto relative" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                      <table className="min-w-full text-sm">
                        <thead className="bg-gray-50 border-b sticky top-0 z-10">
                          <tr className="text-xs text-gray-600">
                            <th className="px-4 py-3 text-left bg-gray-50">Tên bệnh viện</th>
                            <th className="px-4 py-3 text-left bg-gray-50">Nội dung công việc</th>
                            <th className="px-4 py-3 text-center bg-gray-50">Ngày bắt đầu</th>
                            <th className="px-4 py-3 text-center bg-gray-50">Người phụ trách</th>
                            <th className="px-4 py-3 text-center bg-gray-50">Trạng thái</th>
                            <th className="px-4 py-3 text-center bg-gray-50">Ngày hoàn thành</th>
                            <th className="px-4 py-3 text-center bg-gray-50">Số ngày thực hiện</th>
                          </tr>
                        </thead>
                        <tbody>
                          {tasksByHospital.map((group) => {
                            const isCollapsed = collapsedHospitals.has(group.hospitalName);
                            // For paginated view, use current group's tasks length (which is already filtered)
                            const totalTasksForHospital = group.tasks.length;
                            
                            return (
                              <React.Fragment key={group.hospitalName}>
                                <tr className={`border-b ${'bg-blue-50'} hover:bg-gray-50 cursor-pointer`} onClick={() => toggleHospitalCollapse(group.hospitalName)}>
                                  <td colSpan={7} className="px-4 py-3 font-semibold text-gray-900">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm">{isCollapsed ? '▶' : '▼'}</span>
                                        <span>{group.hospitalName}</span>
                                      </div>
                                      <span className="text-xs font-normal text-gray-500">
                                        Tổng: {totalTasksForHospital} task{isCollapsed ? ` (đã thu gọn)` : ''}
                                      </span>
                                    </div>
                                  </td>
                                </tr>
                                {!isCollapsed && group.tasks.map((task, taskIdx) => (
                                  <tr key={`${group.hospitalName}-${taskIdx}`} className="border-b hover:bg-gray-50">
                                    <td className="px-4 py-2"></td>
                                    <td className="px-4 py-2">
                                      <div className="font-medium">{task.name || '—'}</div>
                                      <div className="text-xs text-gray-500 mt-1">{task.type}</div>
                                    </td>
                                    <td className="px-4 py-2 text-center">
                                      {(task as any).startDate ? new Date((task as any).startDate).toLocaleDateString('vi-VN') : '—'}
                                    </td>
                                    <td className="px-4 py-2 text-center">
                                      {(task as any).picName ?? '—'}
                                    </td>
                                    <td className="px-4 py-2 text-center">
                                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                                        String(task.status).toUpperCase() === 'COMPLETED'
                                          ? 'bg-green-100 text-green-800'
                                          : String(task.status).toUpperCase() === 'IN_PROCESS'
                                          ? 'bg-yellow-100 text-yellow-800'
                                          : 'bg-gray-100 text-gray-800'
                                      }`}>
                                        {translateStatus(String(task.status))}
                                      </span>
                                    </td>
                                    <td className="px-4 py-2 text-center">
                                      {task.completionDate ? new Date(task.completionDate).toLocaleDateString('vi-VN') : '—'}
                                    </td>
                                    <td className="px-4 py-2 text-center">
                                      {(() => {
                                        const startDate = (task as any).startDate;
                                        if (!startDate) return '—';
                                        const start = new Date(startDate);
                                        const endDate = task.completionDate ? new Date(task.completionDate) : new Date();
                                        if (Number.isNaN(start.getTime()) || Number.isNaN(endDate.getTime())) return '—';
                                        
                                        // Reset time to 00:00:00 to calculate days based on date only, not time
                                        const startDateOnly = new Date(start.getFullYear(), start.getMonth(), start.getDate());
                                        const endDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
                                        
                                        const diffTime = endDateOnly.getTime() - startDateOnly.getTime();
                                        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                                        return diffDays >= 0 ? `${diffDays} ngày` : '—';
                                      })()}
                                    </td>
                                  </tr>
                                ))}
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    {detailTotalItems > 0 && (
                      <Pagination
                        currentPage={detailCurrentPage}
                        totalPages={detailTotalPages}
                        totalItems={detailTotalItems}
                        itemsPerPage={detailItemsPerPage}
                        onPageChange={(page) => {
                          setDetailCurrentPage(page);
                          // Scroll to top of table when page changes
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        onItemsPerPageChange={(size) => {
                          setDetailItemsPerPage(size);
                          setDetailCurrentPage(0);
                        }}
                        itemsPerPageOptions={[20, 50, 100, 200]}
                        showItemsPerPage={true}
                      />
                    )}
                  </div>
                ) : (
                  !profileLoading && (
                    <div className="mb-6 mt-4 rounded-2xl bg-white p-8 shadow-sm border border-gray-100 text-center">
                      <div className="text-sm text-gray-500">Không có dữ liệu để hiển thị</div>
                    </div>
                  )
                )}

            {hasLoadedProfile && (
            <div className="mt-4 grid grid-cols-1 gap-4">
              {/* Triển khai - own card - chỉ hiển thị nếu team chứa "Triển khai" */}
              {(selectedTeam.toLowerCase().includes('triển khai') || selectedTeam.toLowerCase().includes('trienkhai')) && (
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
              )}

              {/* Phát triển - own card - chỉ hiển thị nếu team chứa "Phát triển" hoặc "Dev" */}
              {(selectedTeam.toLowerCase().includes('phát triển') || selectedTeam.toLowerCase().includes('phattrien') || selectedTeam.toLowerCase().includes('dev')) && (
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
              )}

              {/* Bảo trì - own card - chỉ hiển thị nếu team chứa "Bảo trì" */}
              {(selectedTeam.toLowerCase().includes('bảo trì') || selectedTeam.toLowerCase().includes('baotri')) && (
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
              )}

              {/* Lịch sử hợp đồng - chỉ hiển thị nếu team chứa "Kinh doanh" hoặc "Business" */}
              {(selectedTeam.toLowerCase().includes('kinh doanh') || selectedTeam.toLowerCase().includes('kinhdoanh') || selectedTeam.toLowerCase().includes('business')) && (
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
              )}

              {/* HIS & hardware summary intentionally removed from UI */}
            </div>
            )}
            </>
            )}
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
                      tooltip: { y: { formatter: (v: number) => `${v.toLocaleString()} VND` } },
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
                        <th className="px-3 py-2 text-right">Doanh thu</th>
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
                                <div className="text-xs text-gray-500">{r.quantity} Cái</div>
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

