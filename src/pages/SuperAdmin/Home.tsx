import { Link } from "react-router-dom";
import PageMeta from "../../components/common/PageMeta";
import { useEffect, useState, useCallback } from "react";
import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import { getSummaryReport, type SuperAdminSummaryDTO } from "../../api/superadmin.api";
import { getBusinesses } from "../../api/business.api";
import toast from "react-hot-toast";

function StatCard({ title, value, icon, color }: { title: string; value: string | number; icon?: React.ReactNode; color?: string }) {
  // render value: if number and ends with ' ₫' ensure non-breaking space so currency doesn't wrap
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

// helper types for apex formatter opts to avoid `any`
type ApexFormatterOpts = { w?: { globals?: { series?: number[] } }; seriesIndex?: number } | undefined;

export default function SuperAdminHome() {
  const [summary, setSummary] = useState<SuperAdminSummaryDTO | null>(null);
  // business report states
  const [businessFrom, setBusinessFrom] = useState<string>('');
  const [businessTo, setBusinessTo] = useState<string>('');
  const [businessLoading, setBusinessLoading] = useState(false);
  const [totalExpected, setTotalExpected] = useState<number | null>(null);
  const [totalActual, setTotalActual] = useState<number | null>(null);
  const [totalCommission, setTotalCommission] = useState<number | null>(null);
  const [conversionRate, setConversionRate] = useState<number | null>(null);
  // aggregation/chart state
  type BusinessItem = { totalPrice: number; commission: number; status: string; date: Date | null };
  const [businessItems, setBusinessItems] = useState<BusinessItem[]>([]);
  const [groupBy, setGroupBy] = useState<'day' | 'month' | 'year'>('day');
  const [aggLabels, setAggLabels] = useState<string[]>([]);
  const [aggExpected, setAggExpected] = useState<number[]>([]);
  const [aggActual, setAggActual] = useState<number[]>([]);
  const [aggCommission, setAggCommission] = useState<number[]>([]);
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
      </div>
    </>
  );
}

