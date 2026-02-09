import api from "./client";

// ========== Phase 1 Types ==========

export interface UserDashboardSummaryDTO {
  totalHospitalsAssigned: number;
  hospitalsWithContracts: number;
  totalCareActivities: number;
  conversionRate: number;
  hospitalsAssignedChange: number;
  contractsChange: number;
  activitiesChange: number;
  conversionRateChange: number;
}

export interface MonthlyRevenue {
  month: number;
  label: string;
  totalRevenue: number;
  actualRevenue: number;
  debt: number;
}

export interface UserDashboardRevenueDTO {
  totalRevenue: number;
  actualRevenue: number;
  debt: number;
  collectionRate: number;
  year: number;
  month: number | null;
  monthlyData: MonthlyRevenue[];
}

// ========== Phase 3 Types ==========

export interface MonthComparison {
  prevCasesCompleted: number;
  prevActivities: number;
  prevCompletionRate: number;
  prevOnTimeRate: number;
  casesCompletedChange: number;
  activitiesChange: number;
  completionRateChange: number;
  onTimeRateChange: number;
}

export interface MonthlyTrend {
  month: number;
  year: number;
  label: string;
  casesCompleted: number;
  activities: number;
  completionRate: number;
}

export interface ActivityBreakdown {
  type: string;
  label: string;
  count: number;
  percentage: number;
}

export interface UserPerformanceDTO {
  casesAssigned: number;
  casesCompleted: number;
  casesInProgress: number;
  casesOverdue: number;
  completionRate: number;
  onTimeRate: number;
  totalActivities: number;
  contractsRenewed: number;
  debtCollected: number;
  totalDebtManaged: number;
  comparison: MonthComparison;
  trends: MonthlyTrend[];
  activityBreakdown: ActivityBreakdown[];
  positiveOutcomes: number;
  neutralOutcomes: number;
  negativeOutcomes: number;
}

export interface LeaderboardEntry {
  rank: number;
  userId: number;
  fullName: string;
  avatar: string | null;
  casesCompleted: number;
  completionRate: number;
  totalActivities: number;
  positiveOutcomes: number;
  score: number;
  isCurrentUser: boolean;
}

export interface TeamLeaderboardDTO {
  totalMembers: number;
  currentUserRank: number;
  currentUserId: number;
  period: string;
  entries: LeaderboardEntry[];
}

export interface AlertItem {
  caseId: number;
  hospitalName: string;
  careType: string;
  priority: string;
  priorityColor: string;
  targetDate: string;
  daysRemaining: number;
  status: string;
  reason: string;
}

export interface ContractAlertItem {
  contractId: number;
  contractCode: string;
  hospitalName: string;
  endDate: string;
  daysRemaining: number;
  status: string;
  totalPrice: number;
  debt: number;
}

export interface DebtAlertItem {
  contractId: number;
  contractCode: string;
  hospitalName: string;
  totalPrice: number;
  paidAmount: number;
  debtAmount: number;
  debtDays: number;
  urgency: string;
}

export interface UserNotificationsDTO {
  totalAlerts: number;
  urgentCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  overdueCases: AlertItem[];
  upcomingDeadlines: AlertItem[];
  expiringContracts: ContractAlertItem[];
  debtReminders: DebtAlertItem[];
  followUpReminders: AlertItem[];
}

// ========== Phase 1: API calls for current user ==========

export async function getUserDashboardSummary(): Promise<UserDashboardSummaryDTO> {
  const response = await api.get("/api/v1/user/dashboard/summary");
  return response.data;
}

export async function getUserDashboardRevenue(
  year?: number,
  month?: number
): Promise<UserDashboardRevenueDTO> {
  const params: Record<string, number> = {};
  if (year) params.year = year;
  if (month) params.month = month;
  const response = await api.get("/api/v1/user/dashboard/revenue", { params });
  return response.data;
}

// ========== Phase 3: API calls for current user ==========

export async function getUserPerformance(): Promise<UserPerformanceDTO> {
  const response = await api.get("/api/v1/user/dashboard/performance");
  return response.data;
}

export async function getUserLeaderboard(
  period: string = "this_month"
): Promise<TeamLeaderboardDTO> {
  const response = await api.get("/api/v1/user/dashboard/leaderboard", {
    params: { period },
  });
  return response.data;
}

export async function getUserNotifications(): Promise<UserNotificationsDTO> {
  const response = await api.get("/api/v1/user/dashboard/notifications");
  return response.data;
}

// ========== API calls for admin/superadmin viewing other users ==========

export async function getUserDashboardSummaryById(
  userId: number,
  role: "admin" | "superadmin" = "admin"
): Promise<UserDashboardSummaryDTO> {
  const base = role === "superadmin" ? "/api/v1/superadmin" : "/api/v1/admin";
  const response = await api.get(`${base}/user-dashboard/summary/${userId}`);
  return response.data;
}

export async function getUserDashboardRevenueById(
  userId: number,
  role: "admin" | "superadmin" = "admin",
  year?: number,
  month?: number
): Promise<UserDashboardRevenueDTO> {
  const base = role === "superadmin" ? "/api/v1/superadmin" : "/api/v1/admin";
  const params: Record<string, number> = {};
  if (year) params.year = year;
  if (month) params.month = month;
  const response = await api.get(`${base}/user-dashboard/revenue/${userId}`, {
    params,
  });
  return response.data;
}

export async function getUserPerformanceById(
  userId: number,
  role: "admin" | "superadmin" = "admin"
): Promise<UserPerformanceDTO> {
  const base = role === "superadmin" ? "/api/v1/superadmin" : "/api/v1/admin";
  const response = await api.get(`${base}/user-dashboard/performance/${userId}`);
  return response.data;
}

export async function getUserLeaderboardById(
  userId: number,
  role: "admin" | "superadmin" = "admin",
  period: string = "this_month"
): Promise<TeamLeaderboardDTO> {
  const base = role === "superadmin" ? "/api/v1/superadmin" : "/api/v1/admin";
  const response = await api.get(`${base}/user-dashboard/leaderboard/${userId}`, {
    params: { period },
  });
  return response.data;
}

export async function getUserNotificationsById(
  userId: number,
  role: "admin" | "superadmin" = "admin"
): Promise<UserNotificationsDTO> {
  const base = role === "superadmin" ? "/api/v1/superadmin" : "/api/v1/admin";
  const response = await api.get(`${base}/user-dashboard/notifications/${userId}`);
  return response.data;
}
