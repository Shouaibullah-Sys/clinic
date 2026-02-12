// app/admin/dashboard/page.tsx
"use client";

import { useAuthStore } from "@/store/useAuthStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Stethoscope,
  Bed,
  Activity,
  DollarSign,
  Calendar,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Receipt,
  CreditCard,
  PiggyBank,
  AlertCircle,
  CheckCircle,
  Clock,
  FileText,
  BarChart3,
  PieChart,
  LineChart,
  UserCheck,
  Scissors,
} from "lucide-react";
import { useEffect, useState } from "react";

interface FinancialSummary {
  summary: {
    totalRevenue: number;
    totalExpenses: number;
    totalDiscounts: number;
    netRevenue: number;
    netProfit: number;
    profitMargin: number;
    totalTransactions: number;
  };
  revenue: {
    consultation: number;
    laboratory: number;
    radiology: number;
    pharmacy: number;
    admissions: number;
    discharge: number;
  };
  expenses: {
    total: number;
    byCategory: Array<{ _id: string; totalAmount: number; count: number }>;
  };
  discounts: {
    totalApproved: number;
    approvedCount: number;
    pendingCount: number;
  };
  payments: {
    pending: { totalAmount: number; count: number };
    overdue: { totalAmount: number; count: number };
  };
  comparison: {
    revenueGrowth: number;
    profitGrowth: number;
  };
}

interface RevenueBreakdown {
  summary: {
    totalRevenue: number;
    totalDiscounts: number;
    netRevenue: number;
    totalTransactions: number;
  };
  byDepartment: Array<{
    department: string;
    totalRevenue: number;
    netRevenue: number;
    discount: number;
    count: number;
    percentage: number;
  }>;
  byPaymentMethod: Array<{ _id: string; totalRevenue: number; count: number }>;
}

interface ExpenseBreakdown {
  summary: {
    totalExpenses: number;
    totalCount: number;
    expenseGrowth: number;
  };
  byCategory: Array<{
    category: string;
    totalAmount: number;
    count: number;
    percentage: number;
  }>;
  pendingExpenses: Array<{
    id: string;
    expenseId: string;
    staffName: string;
    date: Date;
    category: string;
    description: string;
    amount: number;
    status: string;
  }>;
}

interface ProfitLoss {
  summary: {
    totalRevenue: number;
    totalDiscounts: number;
    netRevenue: number;
    totalExpenses: number;
    netProfit: number;
    profitMargin: number;
    profitGrowth: number;
  };
  profitByDepartment: Array<{
    department: string;
    revenue: number;
    expenses: number;
    discounts: number;
    profit: number;
    profitMargin: number;
  }>;
}

interface CashFlow {
  summary: {
    openingBalance: number;
    totalCashInflows: number;
    totalCashOutflows: number;
    netCashFlow: number;
    closingBalance: number;
  };
}

interface DiscountsSummary {
  summary: {
    totalApprovedDiscounts: number;
    totalPendingDiscounts: number;
    totalAllDiscounts: number;
    discountPercentage: number;
  };
  pendingDiscounts: Array<{
    id: string;
    discountId: string;
    patientName: string;
    requestedAmount: number;
    reason: string;
    status: string;
  }>;
}

interface PendingPayments {
  summary: {
    totalPendingAmount: number;
    totalOverdueAmount: number;
    agingBuckets: {
      current: number;
      days31to60: number;
      days61to90: number;
      over90: number;
    };
  };
  invoices: Array<{
    id: string;
    invoiceId: string;
    patientName: string;
    totalAmount: number;
    balance: number;
    dueDate: Date;
  }>;
}

interface DoctorCollection {
  doctorId: string;
  doctorName: string;
  department: string;
  specialization: string;
  appointmentCount: number;
  appointmentRevenue: number;
  operationCount: number;
  operationRevenue: number;
  totalCollection: number;
}

interface DetailedAppointment {
  appointmentId: string;
  date: Date;
  patientName: string;
  patientPhone: string;
  appointmentType: string;
  fee: number;
  status: string;
}

interface DetailedOperation {
  dischargeCardId: string;
  dischargeId: string;
  date: Date;
  patientName: string;
  patientPhone: string;
  totalAmount: number;
  paidAmount: number;
  discount: number;
  status: string;
}

interface DoctorCollectionsData {
  summary: {
    totalAppointments: number;
    totalAppointmentRevenue: number;
    totalOperations: number;
    totalOperationRevenue: number;
    grandTotal: number;
  };
  byDoctor: DoctorCollection[];
  period: {
    type: string;
    startDate: Date;
    endDate: Date;
  };
  doctorDetails?: DoctorCollection | null;
  detailedAppointments?: DetailedAppointment[];
  detailedOperations?: DetailedOperation[];
}

interface Doctor {
  _id: string;
  name: string;
  department: string;
  specialization: string;
}

export default function AdminDashboardPage() {
  const { user, accessToken } = useAuthStore();
  const [period, setPeriod] = useState("today");
  const [loading, setLoading] = useState(true);
  const [financialSummary, setFinancialSummary] =
    useState<FinancialSummary | null>(null);
  const [revenueBreakdown, setRevenueBreakdown] =
    useState<RevenueBreakdown | null>(null);
  const [expenseBreakdown, setExpenseBreakdown] =
    useState<ExpenseBreakdown | null>(null);
  const [profitLoss, setProfitLoss] = useState<ProfitLoss | null>(null);
  const [cashFlow, setCashFlow] = useState<CashFlow | null>(null);
  const [discountsSummary, setDiscountsSummary] =
    useState<DiscountsSummary | null>(null);
  const [pendingPayments, setPendingPayments] =
    useState<PendingPayments | null>(null);
  const [doctorCollections, setDoctorCollections] =
    useState<DoctorCollectionsData | null>(null);
  const [collectionPeriod, setCollectionPeriod] = useState("today");
  const [collectionLoading, setCollectionLoading] = useState(false);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [doctorsLoading, setDoctorsLoading] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("");

  useEffect(() => {
    fetchDashboardData();
  }, [period]);

  useEffect(() => {
    fetchDoctors();
  }, []);

  useEffect(() => {
    fetchDoctorCollections();
  }, [collectionPeriod, selectedDoctorId]);

  const fetchDoctors = async () => {
    setDoctorsLoading(true);
    try {
      console.log(
        "Fetching doctors with token:",
        accessToken ? "token present" : "no token",
      );
      const response = await fetch(`/api/admin/doctors?active=true&limit=100`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      console.log("Doctors API response status:", response.status);
      const data = await response.json();
      console.log("Doctors API response data:", data);
      if (data.success) {
        setDoctors(data.data);
        console.log("Set doctors:", data.data.length, "doctors");
      } else {
        console.error("Doctors API error:", data.error);
      }
    } catch (error) {
      console.error("Error fetching doctors:", error);
    } finally {
      setDoctorsLoading(false);
    }
  };

  const fetchDoctorCollections = async () => {
    setCollectionLoading(true);
    try {
      let url = `/api/dashboard/admin/doctor-collections?period=${collectionPeriod}`;
      if (selectedDoctorId) {
        url += `&doctorId=${selectedDoctorId}`;
      }
      console.log("Fetching doctor collections:", url);
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      console.log("Doctor collections API response status:", response.status);
      const data = await response.json();
      console.log("Doctor collections API response:", data);
      if (data.success) {
        setDoctorCollections(data.data);
        console.log(
          "Set doctor collections - byDoctor count:",
          data.data.byDoctor?.length,
        );
      } else {
        console.error("Doctor collections API error:", data.error);
      }
    } catch (error) {
      console.error("Error fetching doctor collections:", error);
    } finally {
      setCollectionLoading(false);
    }
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [
        summaryRes,
        revenueRes,
        expenseRes,
        profitRes,
        cashRes,
        discountsRes,
        paymentsRes,
      ] = await Promise.all([
        fetch(`/api/dashboard/admin/financial-summary?period=${period}`),
        fetch(`/api/dashboard/admin/revenue-breakdown?period=${period}`),
        fetch(`/api/dashboard/admin/expense-breakdown?period=${period}`),
        fetch(`/api/dashboard/admin/profit-loss?period=${period}`),
        fetch(`/api/dashboard/admin/cash-flow?period=${period}`),
        fetch(`/api/dashboard/admin/discounts-summary?period=${period}`),
        fetch(`/api/dashboard/admin/pending-payments`),
      ]);

      const [
        summaryData,
        revenueData,
        expenseData,
        profitData,
        cashData,
        discountsData,
        paymentsData,
      ] = await Promise.all([
        summaryRes.json(),
        revenueRes.json(),
        expenseRes.json(),
        profitRes.json(),
        cashRes.json(),
        discountsRes.json(),
        paymentsRes.json(),
      ]);

      if (summaryData.success) setFinancialSummary(summaryData.data);
      if (revenueData.success) setRevenueBreakdown(revenueData.data);
      if (expenseData.success) setExpenseBreakdown(expenseData.data);
      if (profitData.success) setProfitLoss(profitData.data);
      if (cashData.success) setCashFlow(cashData.data);
      if (discountsData.success) setDiscountsSummary(discountsData.data);
      if (paymentsData.success) setPendingPayments(paymentsData.data);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Financial Dashboard</h1>
          <p className="text-gray-500">Welcome back, {user?.name}!</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
          </select>
          <Button onClick={fetchDashboardData} disabled={loading}>
            Refresh
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </div>
      ) : (
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 lg:w-auto">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="revenue">Revenue</TabsTrigger>
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
            <TabsTrigger value="profit">Profit & Loss</TabsTrigger>
            <TabsTrigger value="cash">Cash Flow</TabsTrigger>
            <TabsTrigger value="admin-collection">Admin Collection</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Revenue
                  </CardTitle>
                  <DollarSign className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(
                      financialSummary?.summary.totalRevenue || 0,
                    )}
                  </div>
                  {financialSummary?.comparison.revenueGrowth !== undefined && (
                    <div
                      className={`flex items-center text-xs mt-1 ${financialSummary.comparison.revenueGrowth >= 0 ? "text-green-600" : "text-red-600"}`}
                    >
                      {financialSummary.comparison.revenueGrowth >= 0 ? (
                        <ArrowUpRight className="h-3 w-3 mr-1" />
                      ) : (
                        <ArrowDownRight className="h-3 w-3 mr-1" />
                      )}
                      {formatPercentage(
                        financialSummary.comparison.revenueGrowth,
                      )}{" "}
                      from previous period
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Expenses
                  </CardTitle>
                  <Receipt className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(financialSummary?.expenses.total || 0)}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {financialSummary?.expenses.byCategory.length || 0}{" "}
                    categories
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Net Profit
                  </CardTitle>
                  <PiggyBank className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div
                    className={`text-2xl font-bold ${(financialSummary?.summary.netProfit || 0) >= 0 ? "text-green-600" : "text-red-600"}`}
                  >
                    {formatCurrency(financialSummary?.summary.netProfit || 0)}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Margin: {financialSummary?.summary.profitMargin.toFixed(1)}%
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Pending Payments
                  </CardTitle>
                  <Clock className="h-4 w-4 text-orange-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(
                      pendingPayments?.summary.totalPendingAmount || 0,
                    )}
                  </div>
                  <div className="text-xs text-red-600 mt-1">
                    {formatCurrency(
                      pendingPayments?.summary.totalOverdueAmount || 0,
                    )}{" "}
                    overdue
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Revenue by Department */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Revenue by Department
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {revenueBreakdown?.byDepartment.map((dept) => (
                    <div key={dept.department} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          {dept.department}
                        </span>
                        <span className="text-sm font-bold">
                          {formatCurrency(dept.totalRevenue)}
                        </span>
                      </div>
                      <div className="w-full rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${dept.percentage}%` }}
                        ></div>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{dept.count} transactions</span>
                        <span>{dept.percentage.toFixed(1)}% of total</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Discounts
                  </CardTitle>
                  <Receipt className="h-4 w-4 text-orange-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(
                      financialSummary?.discounts.totalApproved || 0,
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {financialSummary?.discounts.pendingCount || 0} pending
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Cash at Hand
                  </CardTitle>
                  <Wallet className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(cashFlow?.summary.closingBalance || 0)}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Net flow:{" "}
                    {formatCurrency(cashFlow?.summary.netCashFlow || 0)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Transactions
                  </CardTitle>
                  <Activity className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {financialSummary?.summary.totalTransactions || 0}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Total processed
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Pending Discounts */}
            {discountsSummary?.pendingDiscounts &&
              discountsSummary.pendingDiscounts.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-orange-600" />
                      Pending Discount Requests
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {discountsSummary.pendingDiscounts
                        .slice(0, 5)
                        .map((discount) => (
                          <div
                            key={discount.id}
                            className="flex items-center justify-between p-3 rounded-lg"
                          >
                            <div>
                              <div className="font-medium">
                                {discount.patientName}
                              </div>
                              <div className="text-sm text-gray-500">
                                {discount.reason}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold">
                                {formatCurrency(discount.requestedAmount)}
                              </div>
                              <Badge variant="outline">{discount.status}</Badge>
                            </div>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              )}
          </TabsContent>

          {/* Revenue Tab */}
          <TabsContent value="revenue" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Revenue by Payment Method</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {revenueBreakdown?.byPaymentMethod.map((method) => (
                      <div
                        key={method._id}
                        className="flex items-center justify-between p-3  rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          {method._id === "cash" && (
                            <Wallet className="h-5 w-5 text-green-600" />
                          )}
                          {method._id === "card" && (
                            <CreditCard className="h-5 w-5 text-blue-600" />
                          )}
                          {method._id === "insurance" && (
                            <FileText className="h-5 w-5 text-purple-600" />
                          )}
                          <span className="capitalize font-medium">
                            {method._id}
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">
                            {formatCurrency(method.totalRevenue)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {method.count} transactions
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Revenue Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Gross Revenue</span>
                      <span className="font-bold">
                        {formatCurrency(
                          revenueBreakdown?.summary.totalRevenue || 0,
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Total Discounts</span>
                      <span className="font-bold text-red-600">
                        -
                        {formatCurrency(
                          revenueBreakdown?.summary.totalDiscounts || 0,
                        )}
                      </span>
                    </div>
                    <div className="border-t pt-4">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Net Revenue</span>
                        <span className="font-bold text-green-600">
                          {formatCurrency(
                            revenueBreakdown?.summary.netRevenue || 0,
                          )}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-sm text-gray-500">
                      <span>Total Transactions</span>
                      <span>
                        {revenueBreakdown?.summary.totalTransactions || 0}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Expenses Tab */}
          <TabsContent value="expenses" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Expenses by Category</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {expenseBreakdown?.byCategory.map((category) => (
                      <div key={category.category} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="capitalize font-medium">
                            {category.category}
                          </span>
                          <span className="font-bold">
                            {formatCurrency(category.totalAmount)}
                          </span>
                        </div>
                        <div className="w-full  rounded-full h-2">
                          <div
                            className="bg-red-600 h-2 rounded-full"
                            style={{ width: `${category.percentage}%` }}
                          ></div>
                        </div>
                        <div className="text-xs text-gray-500">
                          {category.count} expenses
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Pending Expenses</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {expenseBreakdown?.pendingExpenses
                      .slice(0, 5)
                      .map((expense) => (
                        <div
                          key={expense.id}
                          className="flex items-center justify-between p-3 rounded-lg"
                        >
                          <div>
                            <div className="font-medium capitalize">
                              {expense.category}
                            </div>
                            <div className="text-sm text-gray-500">
                              {expense.description}
                            </div>
                            <div className="text-xs text-gray-400">
                              {expense.staffName}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold">
                              {formatCurrency(expense.amount)}
                            </div>
                            <Badge variant="outline">{expense.status}</Badge>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Profit & Loss Tab */}
          <TabsContent value="profit" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Profit & Loss Statement
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <h3 className="font-semibold text-lg">Revenue</h3>
                    {profitLoss?.profitByDepartment.map((dept) => (
                      <div
                        key={dept.department}
                        className="flex justify-between items-center pl-4"
                      >
                        <span className="text-gray-600">{dept.department}</span>
                        <span className="font-medium">
                          {formatCurrency(dept.revenue)}
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center pt-2 border-t">
                      <span className="font-semibold">Total Revenue</span>
                      <span className="font-bold">
                        {formatCurrency(profitLoss?.summary.totalRevenue || 0)}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-semibold text-lg">Expenses</h3>
                    {expenseBreakdown?.byCategory.map((cat) => (
                      <div
                        key={cat.category}
                        className="flex justify-between items-center pl-4"
                      >
                        <span className="text-gray-600 capitalize">
                          {cat.category}
                        </span>
                        <span className="font-medium">
                          {formatCurrency(cat.totalAmount)}
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center pt-2 border-t">
                      <span className="font-semibold">Total Expenses</span>
                      <span className="font-bold text-red-600">
                        -
                        {formatCurrency(profitLoss?.summary.totalExpenses || 0)}
                      </span>
                    </div>
                  </div>

                  <div className="border-t pt-4 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">Net Profit</span>
                      <span
                        className={`font-bold text-xl ${(profitLoss?.summary.netProfit || 0) >= 0 ? "text-green-600" : "text-red-600"}`}
                      >
                        {formatCurrency(profitLoss?.summary.netProfit || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm text-gray-500">
                      <span>Profit Margin</span>
                      <span>
                        {profitLoss?.summary.profitMargin.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Cash Flow Tab */}
          <TabsContent value="cash" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Cash Flow Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Opening Balance</span>
                      <span className="font-bold">
                        {formatCurrency(cashFlow?.summary.openingBalance || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Cash Inflows</span>
                      <span className="font-bold text-green-600">
                        +
                        {formatCurrency(
                          cashFlow?.summary.totalCashInflows || 0,
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Cash Outflows</span>
                      <span className="font-bold text-red-600">
                        -
                        {formatCurrency(
                          cashFlow?.summary.totalCashOutflows || 0,
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Net Cash Flow</span>
                      <span
                        className={`font-bold ${(cashFlow?.summary.netCashFlow || 0) >= 0 ? "text-green-600" : "text-red-600"}`}
                      >
                        {formatCurrency(cashFlow?.summary.netCashFlow || 0)}
                      </span>
                    </div>
                    <div className="border-t pt-4">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold">Closing Balance</span>
                        <span className="font-bold text-xl">
                          {formatCurrency(
                            cashFlow?.summary.closingBalance || 0,
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Payment Aging</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3  rounded-lg">
                      <div>
                        <div className="font-medium">Current (0-30 days)</div>
                        <div className="text-sm text-gray-500">
                          Not overdue yet
                        </div>
                      </div>
                      <div className="font-bold text-green-600">
                        {formatCurrency(
                          pendingPayments?.summary.agingBuckets.current || 0,
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3  rounded-lg">
                      <div>
                        <div className="font-medium">31-60 days</div>
                        <div className="text-sm text-gray-500">
                          Slightly overdue
                        </div>
                      </div>
                      <div className="font-bold text-yellow-600">
                        {formatCurrency(
                          pendingPayments?.summary.agingBuckets.days31to60 || 0,
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3  rounded-lg">
                      <div>
                        <div className="font-medium">61-90 days</div>
                        <div className="text-sm text-gray-500">Overdue</div>
                      </div>
                      <div className="font-bold text-orange-600">
                        {formatCurrency(
                          pendingPayments?.summary.agingBuckets.days61to90 || 0,
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3  rounded-lg">
                      <div>
                        <div className="font-medium">Over 90 days</div>
                        <div className="text-sm text-gray-500">Critical</div>
                      </div>
                      <div className="font-bold text-red-600">
                        {formatCurrency(
                          pendingPayments?.summary.agingBuckets.over90 || 0,
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Admin Collection Tab */}
          <TabsContent value="admin-collection" className="space-y-6">
            {/* Doctor Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Stethoscope className="h-5 w-5" />
                  Select Doctor
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <label className="text-sm font-medium mb-2 block">
                      Choose a doctor to view their individual collections
                    </label>
                    <select
                      value={selectedDoctorId}
                      onChange={(e) => setSelectedDoctorId(e.target.value)}
                      className="w-full px-4 py-2 border rounded-lg"
                      disabled={doctorsLoading}
                    >
                      <option value="">All Doctors (Summary View)</option>
                      {doctors.map((doctor) => (
                        <option key={doctor._id} value={doctor._id}>
                          {doctor.name} - {doctor.department} (
                          {doctor.specialization})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-end">
                    <select
                      value={collectionPeriod}
                      onChange={(e) => setCollectionPeriod(e.target.value)}
                      className="px-4 py-2 border rounded-lg"
                    >
                      <option value="today">Today</option>
                      <option value="week">This Week</option>
                      <option value="month">This Month</option>
                      <option value="year">This Year</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Selected Doctor Info */}
            {selectedDoctorId && doctorCollections?.doctorDetails && (
              <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                <CardContent className="pt-6">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <p className="text-blue-100 text-sm">Selected Doctor</p>
                      <h2 className="text-2xl font-bold">
                        {doctorCollections.doctorDetails.doctorName}
                      </h2>
                      <p className="text-blue-100">
                        {doctorCollections.doctorDetails.department} •{" "}
                        {doctorCollections.doctorDetails.specialization}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-blue-100 text-sm">Total Collection</p>
                      <p className="text-3xl font-bold">
                        {formatCurrency(
                          doctorCollections.doctorDetails.totalCollection,
                        )}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {selectedDoctorId ? "Appointments" : "Total Appointments"}
                  </CardTitle>
                  <UserCheck className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {selectedDoctorId
                      ? doctorCollections?.doctorDetails?.appointmentCount || 0
                      : doctorCollections?.summary.totalAppointments || 0}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Completed consultations
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {selectedDoctorId ? "Appt. Revenue" : "Appointment Revenue"}
                  </CardTitle>
                  <DollarSign className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(
                      selectedDoctorId
                        ? doctorCollections?.doctorDetails
                            ?.appointmentRevenue || 0
                        : doctorCollections?.summary.totalAppointmentRevenue ||
                            0,
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    From consultations
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {selectedDoctorId ? "Operations" : "Total Operations"}
                  </CardTitle>
                  <Scissors className="h-4 w-4 text-purple-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {selectedDoctorId
                      ? doctorCollections?.doctorDetails?.operationCount || 0
                      : doctorCollections?.summary.totalOperations || 0}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Discharge operations
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {selectedDoctorId ? "Op. Revenue" : "Operation Revenue"}
                  </CardTitle>
                  <Wallet className="h-4 w-4 text-orange-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">
                    {formatCurrency(
                      selectedDoctorId
                        ? doctorCollections?.doctorDetails?.operationRevenue ||
                            0
                        : doctorCollections?.summary.totalOperationRevenue || 0,
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    From operations
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Breakdown for Selected Doctor */}
            {selectedDoctorId && (
              <>
                {/* Appointments Detail */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Appointment Collections
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {collectionLoading ? (
                      <div className="flex items-center justify-center h-32">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                      </div>
                    ) : !doctorCollections?.detailedAppointments ||
                      doctorCollections.detailedAppointments.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        No appointments found for this period
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-3 px-4 font-medium">
                                Date
                              </th>
                              <th className="text-left py-3 px-4 font-medium">
                                Patient
                              </th>
                              <th className="text-left py-3 px-4 font-medium">
                                Phone
                              </th>
                              <th className="text-left py-3 px-4 font-medium">
                                Type
                              </th>
                              <th className="text-right py-3 px-4 font-medium">
                                Fee
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {doctorCollections?.detailedAppointments?.map(
                              (apt) => (
                                <tr
                                  key={apt.appointmentId}
                                  className="border-b"
                                >
                                  <td className="py-3 px-4">
                                    {formatDate(apt.date)}
                                  </td>
                                  <td className="py-3 px-4 font-medium">
                                    {apt.patientName}
                                  </td>
                                  <td className="py-3 px-4 text-gray-500">
                                    {apt.patientPhone}
                                  </td>
                                  <td className="py-3 px-4">
                                    <Badge
                                      variant={
                                        apt.appointmentType === "emergency"
                                          ? "destructive"
                                          : "outline"
                                      }
                                    >
                                      {apt.appointmentType}
                                    </Badge>
                                  </td>
                                  <td className="py-3 px-4 text-right text-green-600 font-medium">
                                    {formatCurrency(apt.fee)}
                                  </td>
                                </tr>
                              ),
                            )}
                          </tbody>
                          <tfoot>
                            <tr className="bg-gray-50 font-semibold">
                              <td className="py-3 px-4" colSpan={4}>
                                Total Appointments Revenue
                              </td>
                              <td className="py-3 px-4 text-right text-green-600">
                                {formatCurrency(
                                  doctorCollections?.doctorDetails
                                    ?.appointmentRevenue || 0,
                                )}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Operations Detail */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Scissors className="h-5 w-5" />
                      Operation/Discharge Collections
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {collectionLoading ? (
                      <div className="flex items-center justify-center h-32">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                      </div>
                    ) : !doctorCollections?.detailedOperations ||
                      doctorCollections.detailedOperations.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        No operations found for this period
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-3 px-4 font-medium">
                                Date
                              </th>
                              <th className="text-left py-3 px-4 font-medium">
                                Discharge ID
                              </th>
                              <th className="text-left py-3 px-4 font-medium">
                                Patient
                              </th>
                              <th className="text-left py-3 px-4 font-medium">
                                Phone
                              </th>
                              <th className="text-right py-3 px-4 font-medium">
                                Total
                              </th>
                              <th className="text-right py-3 px-4 font-medium">
                                Discount
                              </th>
                              <th className="text-right py-3 px-4 font-medium">
                                Paid
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {doctorCollections?.detailedOperations?.map(
                              (op) => (
                                <tr
                                  key={op.dischargeCardId}
                                  className="border-b"
                                >
                                  <td className="py-3 px-4">
                                    {formatDate(op.date)}
                                  </td>
                                  <td className="py-3 px-4">
                                    <Badge variant="outline">
                                      {op.dischargeId}
                                    </Badge>
                                  </td>
                                  <td className="py-3 px-4 font-medium">
                                    {op.patientName}
                                  </td>
                                  <td className="py-3 px-4 text-gray-500">
                                    {op.patientPhone}
                                  </td>
                                  <td className="py-3 px-4 text-right">
                                    {formatCurrency(op.totalAmount)}
                                  </td>
                                  <td className="py-3 px-4 text-right text-red-600">
                                    {op.discount > 0
                                      ? `-${formatCurrency(op.discount)}`
                                      : "-"}
                                  </td>
                                  <td className="py-3 px-4 text-right text-orange-600 font-medium">
                                    {formatCurrency(op.paidAmount)}
                                  </td>
                                </tr>
                              ),
                            )}
                          </tbody>
                          <tfoot>
                            <tr className="bg-gray-50 font-semibold">
                              <td className="py-3 px-4" colSpan={6}>
                                Total Operations Revenue
                              </td>
                              <td className="py-3 px-4 text-right text-orange-600">
                                {formatCurrency(
                                  doctorCollections?.doctorDetails
                                    ?.operationRevenue || 0,
                                )}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}

            {/* All Doctors Table (when no specific doctor is selected) */}
            {!selectedDoctorId && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Stethoscope className="h-5 w-5" />
                      Doctor Collections Summary
                    </CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={fetchDoctorCollections}
                      disabled={collectionLoading}
                    >
                      Refresh
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {collectionLoading ? (
                    <div className="flex items-center justify-center h-32">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                    </div>
                  ) : doctorCollections?.byDoctor.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No doctor collections found for this period
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-3 px-4 font-medium">
                              Doctor
                            </th>
                            <th className="text-left py-3 px-4 font-medium">
                              Department
                            </th>
                            <th className="text-center py-3 px-4 font-medium">
                              Appointments
                            </th>
                            <th className="text-right py-3 px-4 font-medium">
                              Appt. Revenue
                            </th>
                            <th className="text-center py-3 px-4 font-medium">
                              Operations
                            </th>
                            <th className="text-right py-3 px-4 font-medium">
                              Op. Revenue
                            </th>
                            <th className="text-right py-3 px-4 font-medium">
                              Total Collection
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {doctorCollections?.byDoctor.map((doctor) => (
                            <tr
                              key={doctor.doctorId}
                              className="border-b"
                              onClick={() =>
                                setSelectedDoctorId(doctor.doctorId)
                              }
                            >
                              <td className="py-3 px-4">
                                <div className="font-medium">
                                  {doctor.doctorName}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {doctor.specialization}
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <Badge variant="outline">
                                  {doctor.department}
                                </Badge>
                              </td>
                              <td className="py-3 px-4 text-center">
                                {doctor.appointmentCount}
                              </td>
                              <td className="py-3 px-4 text-right text-green-600 font-medium">
                                {formatCurrency(doctor.appointmentRevenue)}
                              </td>
                              <td className="py-3 px-4 text-center">
                                {doctor.operationCount}
                              </td>
                              <td className="py-3 px-4 text-right text-orange-600 font-medium">
                                {formatCurrency(doctor.operationRevenue)}
                              </td>
                              <td className="py-3 px-4 text-right font-bold text-blue-600">
                                {formatCurrency(doctor.totalCollection)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="dark:bg-gray-950 font-semibold">
                            <td className="py-3 px-4" colSpan={2}>
                              Total
                            </td>
                            <td className="py-3 px-4 text-center">
                              {doctorCollections?.summary.totalAppointments ||
                                0}
                            </td>
                            <td className="py-3 px-4 text-right text-green-600">
                              {formatCurrency(
                                doctorCollections?.summary
                                  .totalAppointmentRevenue || 0,
                              )}
                            </td>
                            <td className="py-3 px-4 text-center">
                              {doctorCollections?.summary.totalOperations || 0}
                            </td>
                            <td className="py-3 px-4 text-right text-orange-600">
                              {formatCurrency(
                                doctorCollections?.summary
                                  .totalOperationRevenue || 0,
                              )}
                            </td>
                            <td className="py-3 px-4 text-right text-blue-600">
                              {formatCurrency(
                                doctorCollections?.summary.grandTotal || 0,
                              )}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Grand Total Card */}
            {!selectedDoctorId && (
              <Card className="">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-sm">
                        Grand Total Collection
                      </p>
                      <p className="text-3xl font-bold mt-1">
                        {formatCurrency(
                          doctorCollections?.summary.grandTotal || 0,
                        )}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-blue-100 text-sm">Period</p>
                      <p className="text-lg font-medium capitalize">
                        {doctorCollections?.period.type || collectionPeriod}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
