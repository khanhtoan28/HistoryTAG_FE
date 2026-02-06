import api from './client';

// ========== Types ==========

export interface CSKHSummaryDTO {
  totalHospitals: number;
  casesInProgress: number;
  casesOverdue: number;
  contractsExpiringSoon: number;
  unpaidContracts: number;
  totalDebt: number;
  openTickets: number;
  trend?: {
    casesLastPeriod: number;
    casesThisPeriod: number;
    casesTrendPercent: number;
    contractsRenewedLastPeriod: number;
    contractsRenewedThisPeriod: number;
    renewalTrendPercent: number;
  };
}

export interface ContractStatusReportDTO {
  totalContracts: number;
  totalValue: number;
  active: StatusBreakdown;
  expiringSoon: StatusBreakdown;
  expired: StatusBreakdown;
  renewed: StatusBreakdown;
  chartData: ChartItem[];
}

export interface StatusBreakdown {
  status: string;
  label: string;
  count: number;
  value: number;
  percentage: number;
}

export interface ChartItem {
  name: string;
  value: number;
  color: string;
  amount?: number;
}

export interface PaymentStatusReportDTO {
  totalContracts: number;
  totalValue: number;
  paid: PaymentBreakdown;
  unpaid: PaymentBreakdown;
  totalPaidAmount: number;
  totalDebtAmount: number;
  chartData: ChartItem[];
}

export interface PaymentBreakdown {
  status: string;
  label: string;
  count: number;
  value: number;
  percentage: number;
}

export interface CareTypeReportDTO {
  totalCases: number;
  items: CareTypeItem[];
}

export interface CareTypeItem {
  careType: string;
  label: string;
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  successRate: number;
}

export interface EmployeePerformanceReportDTO {
  totalEmployees: number;
  employees: EmployeeItem[];
}

export interface EmployeeItem {
  userId: number;
  fullName: string;
  email: string;
  casesAssigned: number;
  casesCompleted: number;
  casesInProgress: number;
  casesOverdue: number;
  completionRate: number;
  totalActivities: number;
  callCount: number;
  emailCount: number;
  visitCount: number;
  meetingCount: number;
  otherCount: number;
  positiveOutcomes: number;
  neutralOutcomes: number;
  negativeOutcomes: number;
}

export interface DebtReportDTO {
  totalDebt: number;
  unpaidContracts: number;
  overdueDebt: number;
  overdueContracts: number;
  byAge: DebtAgeItem[];
  topDebtors: TopDebtorItem[];
}

export interface DebtAgeItem {
  range: string;
  label: string;
  count: number;
  value: number;
  percentage: number;
}

export interface TopDebtorItem {
  hospitalId: number;
  hospitalName: string;
  contractCount: number;
  debtAmount: number;
  oldestDebtDays: number;
}

// ========== API Functions ==========

const getBase = () => {
  // Check if user is superadmin
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/superadmin')) {
    return '/api/v1/superadmin/reports/cskh';
  }
  return '/api/v1/admin/reports/cskh';
};

export async function getCSKHSummary(): Promise<CSKHSummaryDTO> {
  const res = await api.get(`${getBase()}/summary`);
  return res.data;
}

export async function getContractsByStatus(): Promise<ContractStatusReportDTO> {
  const res = await api.get(`${getBase()}/contracts-by-status`);
  return res.data;
}

export async function getContractsByPayment(): Promise<PaymentStatusReportDTO> {
  const res = await api.get(`${getBase()}/contracts-by-payment`);
  return res.data;
}

export async function getCasesByType(): Promise<CareTypeReportDTO> {
  const res = await api.get(`${getBase()}/cases-by-type`);
  return res.data;
}

export async function getEmployeePerformance(
  startDate?: string,
  endDate?: string
): Promise<EmployeePerformanceReportDTO> {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  const qs = params.toString();
  const url = qs ? `${getBase()}/employee-performance?${qs}` : `${getBase()}/employee-performance`;
  const res = await api.get(url);
  return res.data;
}

export async function getDebtReport(): Promise<DebtReportDTO> {
  const res = await api.get(`${getBase()}/debt`);
  return res.data;
}

