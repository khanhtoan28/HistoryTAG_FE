import { useEffect, useState, useMemo } from "react";
import {
  getUserDashboardSummary,
  getUserDashboardRevenue,
  getUserPerformance,
  getUserLeaderboard,
  getUserNotifications,
  type UserDashboardSummaryDTO,
  type UserDashboardRevenueDTO,
  type UserPerformanceDTO,
  type TeamLeaderboardDTO,
  type UserNotificationsDTO,
} from "../../api/user-dashboard.api";
import {
  FiUsers,
  FiFileText,
  FiPhone,
  FiTrendingUp,
  FiTrendingDown,
  FiDollarSign,
  FiPercent,
  FiAlertCircle,
  FiCheckCircle,
  FiClock,
  FiActivity,
  FiAward,
  FiBell,
  FiAlertTriangle,
  FiChevronRight,
  FiStar,
  FiTarget,
  FiBarChart2,
} from "react-icons/fi";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";

// ========== Helpers ==========

function formatCurrency(amount?: number | null): string {
  if (!amount && amount !== 0) return "0đ";
  if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1)}tỷ`;
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(0)}tr`;
  return new Intl.NumberFormat("vi-VN").format(amount) + "đ";
}

function formatFullCurrency(amount?: number | null): string {
  if (!amount && amount !== 0) return "0 VNĐ";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    minimumFractionDigits: 0,
  }).format(amount);
}

function getCareTypeLabel(type: string): string {
  const map: Record<string, string> = {
    CONTRACT_RENEWAL: "Gia hạn HĐ",
    CONTRACT_EXPIRY: "HĐ sắp hết hạn",
    UPSELL: "Bán thêm",
    CROSS_SELL: "Bán chéo",
    COMPLAINT_HANDLING: "Xử lý khiếu nại",
    TECHNICAL_SUPPORT: "Hỗ trợ KT",
    RELATIONSHIP_CARE: "CS định kỳ",
    PAYMENT_ISSUE: "Thanh toán",
    RISK_MANAGEMENT: "Quản lý rủi ro",
  };
  return map[type] || type;
}

const PIE_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16", "#f97316"];

// ========== Sub-components ==========

function MetricCard({
  icon: Icon,
  title,
  value,
  change,
  changeLabel,
  color,
  bgColor,
}: {
  icon: React.ElementType;
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  color: string;
  bgColor: string;
}) {
  return (
    <div className={`rounded-xl p-5 ${bgColor} transition-all hover:shadow-md border border-gray-100`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
        </div>
        <div className={`p-3 rounded-xl ${color}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
      {change !== undefined && change !== null && (
        <div className="mt-3 flex items-center gap-1.5">
          {change > 0 ? (
            <FiTrendingUp className="h-4 w-4 text-emerald-600" />
          ) : change < 0 ? (
            <FiTrendingDown className="h-4 w-4 text-red-500" />
          ) : null}
          <span
            className={`text-sm font-semibold ${
              change > 0 ? "text-emerald-600" : change < 0 ? "text-red-500" : "text-gray-400"
            }`}
          >
            {change > 0 ? "+" : ""}
            {change}
          </span>
          {changeLabel && <span className="text-xs text-gray-400">{changeLabel}</span>}
        </div>
      )}
    </div>
  );
}

function RevenueCard({ title, value, color }: { title: string; value: string; color: string }) {
  return (
    <div className="rounded-xl bg-white p-4 border border-gray-100 shadow-sm">
      <p className="text-xs font-medium text-gray-500 mb-1">{title}</p>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function ProgressBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-gray-600">{label}</span>
        <span className="font-semibold text-gray-900">{pct.toFixed(1)}%</span>
      </div>
      <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// Custom Tooltip for Revenue Chart
const CustomRevenueTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white px-4 py-3 rounded-xl shadow-lg border border-gray-200">
        <p className="text-sm font-semibold text-gray-900 mb-2">{label}</p>
        {payload.map((p: any, idx: number) => (
          <p key={idx} className="text-sm" style={{ color: p.color }}>
            {p.name}: <span className="font-semibold">{formatFullCurrency(p.value)}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// ========== Main Component ==========

export default function UserDashboard() {
  const [summary, setSummary] = useState<UserDashboardSummaryDTO | null>(null);
  const [revenue, setRevenue] = useState<UserDashboardRevenueDTO | null>(null);
  const [performance, setPerformance] = useState<UserPerformanceDTO | null>(null);
  const [leaderboard, setLeaderboard] = useState<TeamLeaderboardDTO | null>(null);
  const [notifications, setNotifications] = useState<UserNotificationsDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [lbPeriod, setLbPeriod] = useState("this_month");

  // Fetch all data
  useEffect(() => {
    async function fetchAll() {
      try {
        const [summaryData, perfData, notiData] = await Promise.all([
          getUserDashboardSummary(),
          getUserPerformance(),
          getUserNotifications(),
        ]);
        setSummary(summaryData);
        setPerformance(perfData);
        setNotifications(notiData);
      } catch (e: any) {
        console.error("Error fetching user dashboard:", e);
        setError(e?.message || "Không thể tải dữ liệu");
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, []);

  // Fetch revenue (depends on selectedYear)
  useEffect(() => {
    async function fetchRevenue() {
      try {
        const data = await getUserDashboardRevenue(selectedYear);
        setRevenue(data);
      } catch (e: any) {
        console.error("Error fetching revenue:", e);
      }
    }
    fetchRevenue();
  }, [selectedYear]);

  // Fetch leaderboard (depends on period)
  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        const data = await getUserLeaderboard(lbPeriod);
        setLeaderboard(data);
      } catch (e: any) {
        console.error("Error fetching leaderboard:", e);
      }
    }
    fetchLeaderboard();
  }, [lbPeriod]);

  // Chart data
  const chartData = useMemo(() => {
    if (!revenue?.monthlyData) return [];
    return revenue.monthlyData.map((m) => ({
      name: m.label,
      "Tổng thu": m.totalRevenue || 0,
      "Thực thu": m.actualRevenue || 0,
    }));
  }, [revenue]);

  const trendData = useMemo(() => {
    if (!performance?.trends) return [];
    return performance.trends.map((t) => ({
      name: t.label,
      "Cases hoàn thành": t.casesCompleted,
      "Hoạt động CS": t.activities,
    }));
  }, [performance]);

  const activityPieData = useMemo(() => {
    if (!performance?.activityBreakdown) return [];
    return performance.activityBreakdown.map((a) => ({
      name: a.label,
      value: a.count,
    }));
  }, [performance]);

  const yearOptions = useMemo(() => {
    const current = new Date().getFullYear();
    return [current - 2, current - 1, current, current + 1];
  }, []);

  const userName = useMemo(() => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || sessionStorage.getItem("user") || "{}");
      return user?.fullname || user?.username || "bạn";
    } catch {
      return "bạn";
    }
  }, []);

  if (loading && !summary) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
          <span className="text-gray-600">Đang tải dashboard...</span>
        </div>
      </div>
    );
  }

  if (error && !summary) {
    return (
      <div className="rounded-xl bg-red-50 p-6 text-red-700 border border-red-200">
        <div className="flex items-center gap-2 mb-2">
          <FiAlertCircle className="h-5 w-5" />
          <p className="font-semibold">Lỗi tải Dashboard</p>
        </div>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  const urgentBadge = notifications ? notifications.urgentCount + notifications.highCount : 0;

  return (
    <div className="space-y-6">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Xin chào, {userName}! 👋</h1>
          <p className="text-sm text-gray-500 mt-1">Dashboard chăm sóc khách hàng cá nhân</p>
        </div>
        {urgentBadge > 0 && (
          <div className="flex items-center gap-2 rounded-full bg-red-50 px-4 py-2 border border-red-200">
            <FiBell className="h-4 w-4 text-red-600" />
            <span className="text-sm font-semibold text-red-700">{urgentBadge} cảnh báo khẩn</span>
          </div>
        )}
      </div>

      {/* ─── Section 1: 4 Metric Cards ─── */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <MetricCard
            icon={FiUsers}
            title="Viện phụ trách"
            value={summary.totalHospitalsAssigned}
            change={summary.hospitalsAssignedChange}
            changeLabel="tháng này"
            color="bg-blue-500"
            bgColor="bg-gradient-to-br from-blue-50 to-white"
          />
          <MetricCard
            icon={FiFileText}
            title="Viện đã ký HĐ"
            value={summary.hospitalsWithContracts}
            change={summary.contractsChange}
            changeLabel="tháng này"
            color="bg-emerald-500"
            bgColor="bg-gradient-to-br from-emerald-50 to-white"
          />
          {/* <MetricCard
            icon={FiPhone}
            title="Lượt chăm sóc"
            value={summary.totalCareActivities}
            change={summary.activitiesChange}
            changeLabel="tháng này"
            color="bg-purple-500"
            bgColor="bg-gradient-to-br from-purple-50 to-white"
          /> */}
          <MetricCard
            icon={FiPercent}
            title="Tỷ lệ chuyển đổi"
            value={`${summary.conversionRate}%`}
            change={summary.conversionRateChange}
            changeLabel="vs tháng trước"
            color="bg-amber-500"
            bgColor="bg-gradient-to-br from-amber-50 to-white"
          />
        </div>
      )}

      {/* ─── Section 2: Alerts & Notifications ─── */}
      {notifications && notifications.totalAlerts > 0 && (
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <FiBell className="h-5 w-5 text-amber-600" />
            <h2 className="text-lg font-semibold text-gray-900">Thông báo & Nhắc nhở</h2>
            <span className="ml-2 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-700">
              {notifications.totalAlerts}
            </span>
          </div>

          {/* Priority summary badges */}
          <div className="flex flex-wrap gap-2 mb-4">
            {notifications.urgentCount > 0 && (
              <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                🔴 Khẩn cấp: {notifications.urgentCount}
              </span>
            )}
            {notifications.highCount > 0 && (
              <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
                🟠 Cao: {notifications.highCount}
              </span>
            )}
            {notifications.mediumCount > 0 && (
              <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-700">
                🟡 Trung bình: {notifications.mediumCount}
              </span>
            )}
            {notifications.lowCount > 0 && (
              <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                🟢 Thấp: {notifications.lowCount}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Overdue Cases */}
            {notifications.overdueCases.length > 0 && (
              <div className="rounded-xl bg-red-50 p-4 border border-red-100">
                <h3 className="text-sm font-semibold text-red-800 mb-3 flex items-center gap-1.5">
                  <FiAlertTriangle className="h-4 w-4" /> Cases quá hạn ({notifications.overdueCases.length})
                </h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {notifications.overdueCases.slice(0, 5).map((c) => (
                    <div key={c.caseId} className="flex items-center justify-between text-sm bg-white rounded-lg px-3 py-2">
                      <div>
                        <p className="font-medium text-gray-900">{c.hospitalName}</p>
                        <p className="text-xs text-gray-500">{getCareTypeLabel(c.careType)}</p>
                      </div>
                      <span className="text-xs font-bold text-red-600">Quá {Math.abs(c.daysRemaining)} ngày</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming Deadlines */}
            {notifications.upcomingDeadlines.length > 0 && (
              <div className="rounded-xl bg-amber-50 p-4 border border-amber-100">
                <h3 className="text-sm font-semibold text-amber-800 mb-3 flex items-center gap-1.5">
                  <FiClock className="h-4 w-4" /> Deadline sắp tới ({notifications.upcomingDeadlines.length})
                </h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {notifications.upcomingDeadlines.slice(0, 5).map((c) => (
                    <div key={c.caseId} className="flex items-center justify-between text-sm bg-white rounded-lg px-3 py-2">
                      <div>
                        <p className="font-medium text-gray-900">{c.hospitalName}</p>
                        <p className="text-xs text-gray-500">{getCareTypeLabel(c.careType)}</p>
                      </div>
                      <span
                        className="text-xs font-bold"
                        style={{ color: c.priorityColor }}
                      >
                        Còn {c.daysRemaining} ngày
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Expiring Contracts */}
            {notifications.expiringContracts.length > 0 && (
              <div className="rounded-xl bg-blue-50 p-4 border border-blue-100">
                <h3 className="text-sm font-semibold text-blue-800 mb-3 flex items-center gap-1.5">
                  <FiFileText className="h-4 w-4" /> HĐ sắp hết hạn ({notifications.expiringContracts.length})
                </h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {notifications.expiringContracts.slice(0, 5).map((c) => (
                    <div key={c.contractId} className="flex items-center justify-between text-sm bg-white rounded-lg px-3 py-2">
                      <div>
                        <p className="font-medium text-gray-900">{c.hospitalName}</p>
                        <p className="text-xs text-gray-500">{c.contractCode}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-blue-600">Còn {c.daysRemaining} ngày</span>
                        {c.debt > 0 && (
                          <p className="text-xs text-red-500">Nợ: {formatCurrency(c.debt)}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Debt Reminders */}
            {notifications.debtReminders.length > 0 && (
              <div className="rounded-xl bg-orange-50 p-4 border border-orange-100">
                <h3 className="text-sm font-semibold text-orange-800 mb-3 flex items-center gap-1.5">
                  <FiDollarSign className="h-4 w-4" /> Nhắc thu nợ ({notifications.debtReminders.length})
                </h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {notifications.debtReminders.slice(0, 5).map((c) => (
                    <div key={c.contractId} className="flex items-center justify-between text-sm bg-white rounded-lg px-3 py-2">
                      <div>
                        <p className="font-medium text-gray-900">{c.hospitalName}</p>
                        <p className="text-xs text-gray-500">{c.contractCode}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-red-600">{formatCurrency(c.debtAmount)}</span>
                        {c.debtDays > 0 && (
                          <p className="text-xs text-gray-500">{c.debtDays} ngày</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Section 3: Performance KPIs ─── */}
      

      {/* ─── Section 4: Revenue ─── */}
      <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">💰 Thống kê Doanh thu</h2>
            <p className="text-sm text-gray-500 mt-0.5">Tổng quan doanh thu hợp đồng bảo trì</p>
          </div>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>Năm {y}</option>
            ))}
          </select>
        </div>

        {revenue && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
              <RevenueCard title="Tổng thu (Giá trị HĐ)" value={formatCurrency(revenue.totalRevenue)} color="text-gray-900" />
              <RevenueCard title="Thực thu (Đã thanh toán)" value={formatCurrency(revenue.actualRevenue)} color="text-emerald-600" />
              <RevenueCard title="Công nợ" value={formatCurrency(revenue.debt)} color="text-red-600" />
              <RevenueCard title="Tỷ lệ thu hồi" value={`${revenue.collectionRate}%`} color="text-blue-600" />
            </div>

            {chartData.length > 0 && (
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#6b7280" }} axisLine={{ stroke: "#e5e7eb" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={{ stroke: "#e5e7eb" }} tickFormatter={(v) => formatCurrency(v)} />
                    <Tooltip content={<CustomRevenueTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                    <Bar dataKey="Tổng thu" fill="#93c5fd" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    <Bar dataKey="Thực thu" fill="#34d399" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {chartData.length === 0 && (
              <div className="flex items-center justify-center py-12 text-gray-400">
                <p>Chưa có dữ liệu doanh thu cho năm {selectedYear}</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* ─── Section 5: Leaderboard ─── */}
      
    </div>
  );
}
