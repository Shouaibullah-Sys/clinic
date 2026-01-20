// app/dashboard/page.tsx - Fixed version
"use client";

import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { useEffect, useState, useMemo } from "react";
import AdminDashboard from "./components/admin/AdminCeoDashboard";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DollarSign,
  Users,
  FileText,
  TrendingUp,
  Package,
  Clock,
  AlertCircle,
  CheckCircle2,
  BarChart3,
  Calendar,
  RefreshCw,
  Receipt,
  Scissors,
  Shirt,
  TrendingDown,
  Calculator,
  Wallet,
  CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import useSWR from "swr";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { Badge } from "@/components/ui/badge";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface CombinedStats {
  daily: {
    tailor: {
      totalCharged: number;
      totalPaid: number;
      totalDiscount: number;
      totalBalance: number;
      totalRecords: number;
      pendingOrders: number;
      completedOrders: number;
      deliveredOrders: number;
    };
    expenses: {
      totalExpenses: number;
      totalAmount: number;
      pendingCount: number;
      approvedCount: number;
      paidCount: number;
      rejectedCount: number;
      byCategory: Record<string, number>;
      byPaymentMethod: Record<string, number>;
    };
    netProfit: number;
  };
  monthly: {
    tailor: {
      totalCharged: number;
      totalPaid: number;
      totalDiscount: number;
      totalBalance: number;
      totalRecords: number;
    };
    expenses: {
      totalExpenses: number;
      totalAmount: number;
    };
    netProfit: number;
  };
  quickStats: {
    totalOrders: number;
    totalExpenses: number;
    pendingOrders: number;
    pendingExpenses: number;
    upcomingDeliveries: number;
    revenueGrowth: number;
    expenseGrowth: number;
  };
  charts: {
    weeklyRevenue: Array<{ date: string; revenue: number; expenses: number }>;
    expenseByCategory: Array<{ name: string; value: number; color: string }>;
    orderVsExpense: Array<{ month: string; orders: number; expenses: number }>;
  };
  recentActivities: Array<{
    id: string;
    type: "order" | "expense";
    description: string;
    amount: number;
    status: string;
    date: string;
    icon: string;
  }>;
}

export default function Dashboard() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuthStore();
  const [initialized, setInitialized] = useState(false);
  const [timeRange, setTimeRange] = useState<"today" | "week" | "month">("today");

  // Fetch combined dashboard data
  const { data: stats, isLoading: statsLoading, mutate } = useSWR<CombinedStats>(
    "/api/dashboard/combined-stats",
    fetcher,
    { refreshInterval: 300000 } // Refresh every 5 minutes
  );

  // Calculate derived stats - MUST be before any conditional returns
  const netProfitMargin = useMemo(() => {
    if (!stats?.daily.tailor.totalPaid) return "0";
    return ((stats.daily.netProfit / stats.daily.tailor.totalPaid) * 100).toFixed(1);
  }, [stats]);

  const expenseToRevenueRatio = useMemo(() => {
    if (!stats?.daily.tailor.totalPaid) return "0";
    return ((stats.daily.expenses.totalAmount / stats.daily.tailor.totalPaid) * 100).toFixed(1);
  }, [stats]);

  const isLoading = authLoading || statsLoading;

  useEffect(() => {
    if (!authLoading && !initialized) {
      if (!isAuthenticated) {
        router.push("/login");
      }
      setInitialized(true);
    }
  }, [isAuthenticated, authLoading, router, initialized]);

  // Format date - Regular function, not a Hook
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, "MMM d, h:mm a");
    } catch {
      return "Invalid date";
    }
  };

  // Get icon for activity type - Regular function, not a Hook
  const getIconForType = (type: string) => {
    switch (type) {
      case "order":
        return <Package className="h-4 w-4" />;
      case "expense":
        return <Receipt className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  // Get status color - Regular function, not a Hook
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
      case "approved":
      case "paid":
        return "bg-green-100 text-green-800";
      case "pending":
      case "in_progress":
        return "bg-yellow-100 text-yellow-800";
      case "delivered":
        return "bg-purple-100 text-purple-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Loading state
  if (isLoading || !initialized) {
    return (
      <div className="container mx-auto p-4 sm:p-6 md:p-8">
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-64 mt-8" />
        </div>
      </div>
    );
  }

  // Authentication check
  if (!isAuthenticated) return null;

  // Custom colors for charts
  const COLORS = [
    "#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", 
    "#82CA9D", "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4"
  ];

  return (
    <div className="container mx-auto p-4 sm:p-6 md:p-8">
      {/* Welcome Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Business Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2">
              Welcome back,{" "}
              <span className="font-semibold text-blue-600 dark:text-blue-400">
                {user?.name}
              </span>
              <span className="ml-2 px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full">
                {user?.role === "admin" ? "Administrator" : "Staff"}
              </span>
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {format(new Date(), "EEEE, MMMM d, yyyy")}
            </p>
          </div>
          <div className="flex gap-2">
            <div className="flex border rounded-lg">
              <Button
                variant={timeRange === "today" ? "default" : "ghost"}
                size="sm"
                onClick={() => setTimeRange("today")}
                className="rounded-r-none"
              >
                Today
              </Button>
              <Button
                variant={timeRange === "week" ? "default" : "ghost"}
                size="sm"
                onClick={() => setTimeRange("week")}
                className="rounded-none"
              >
                Week
              </Button>
              <Button
                variant={timeRange === "month" ? "default" : "ghost"}
                size="sm"
                onClick={() => setTimeRange("month")}
                className="rounded-l-none"
              >
                Month
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => mutate()}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Role-based Dashboard */}
      {user?.role === "admin" && <AdminDashboard />}

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Today's Revenue */}
        <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-green-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Today's Revenue
                </p>
                <p className="text-2xl font-bold mt-2">
                  AFN {stats?.daily.tailor.totalPaid?.toLocaleString() || "0"}
                </p>
                <div className="flex items-center text-xs text-green-600 mt-1">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  <span>+{stats?.quickStats.revenueGrowth || "0"}% growth</span>
                </div>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Today's Expenses */}
        <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-red-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Today's Expenses
                </p>
                <p className="text-2xl font-bold mt-2">
                  AFN {stats?.daily.expenses.totalAmount?.toLocaleString() || "0"}
                </p>
                <div className="flex items-center text-xs text-red-600 mt-1">
                  <TrendingDown className="h-3 w-3 mr-1" />
                  <span>+{stats?.quickStats.expenseGrowth || "0"}% increase</span>
                </div>
              </div>
              <div className="p-3 bg-red-100 rounded-lg">
                <Receipt className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Net Profit */}
        <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-blue-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Net Profit
                </p>
                <p className="text-2xl font-bold mt-2">
                  AFN {stats?.daily.netProfit?.toLocaleString() || "0"}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {netProfitMargin}% profit margin
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Calculator className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pending Items */}
        <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-orange-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Pending Items
                </p>
                <p className="text-2xl font-bold mt-2">
                  {stats?.quickStats.pendingOrders || 0} orders
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {stats?.quickStats.pendingExpenses || 0} expenses pending
                </p>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <Clock className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Revenue vs Expenses Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Revenue vs Expenses Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              {stats?.charts.weeklyRevenue && stats.charts.weeklyRevenue.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={stats.charts.weeklyRevenue}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value) => [`AFN ${value}`, ""]}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="#10b981"
                      strokeWidth={2}
                      activeDot={{ r: 8 }}
                      name="Revenue"
                    />
                    <Line
                      type="monotone"
                      dataKey="expenses"
                      stroke="#ef4444"
                      strokeWidth={2}
                      name="Expenses"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  No data available for this period
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Expenses by Category */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Expenses by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              {stats?.charts.expenseByCategory && stats.charts.expenseByCategory.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.charts.expenseByCategory}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => 
                        `${name}: ${(percent * 100).toFixed(0)}%`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {stats.charts.expenseByCategory.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`AFN ${value}`, ""]} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  No expense data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Orders & Expenses Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Orders Summary */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Shirt className="h-5 w-5" />
                Tailor Orders Overview
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/admin/records")}
              >
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <p className="text-sm text-gray-500">Total Charged</p>
                  <p className="text-2xl font-bold">
                    AFN {stats?.daily.tailor.totalCharged?.toFixed(2) || "0"}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-500">Total Received</p>
                  <p className="text-2xl font-bold text-green-600">
                    AFN {stats?.daily.tailor.totalPaid?.toFixed(2) || "0"}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-500">Balance Due</p>
                  <p className="text-2xl font-bold text-red-600">
                    AFN {stats?.daily.tailor.totalBalance?.toFixed(2) || "0"}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-500">Discount</p>
                  <p className="text-2xl font-bold text-purple-600">
                    AFN {stats?.daily.tailor.totalDiscount?.toFixed(2) || "0"}
                  </p>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Status Distribution</span>
                  <span>{stats?.daily.tailor.totalRecords || 0} total orders</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center p-3 bg-yellow-50 rounded-lg">
                    <p className="text-xl font-bold">{stats?.daily.tailor.pendingOrders || 0}</p>
                    <p className="text-xs text-yellow-600">Pending</p>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <p className="text-xl font-bold">{stats?.daily.tailor.completedOrders || 0}</p>
                    <p className="text-xs text-green-600">Completed</p>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <p className="text-xl font-bold">{stats?.daily.tailor.deliveredOrders || 0}</p>
                    <p className="text-xs text-purple-600">Delivered</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Expenses Summary */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Expenses Overview
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/finance/expenses")}
              >
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <p className="text-sm text-gray-500">Total Expenses</p>
                  <p className="text-2xl font-bold text-red-600">
                    AFN {stats?.daily.expenses.totalAmount?.toFixed(2) || "0"}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-500">Expense Ratio</p>
                  <p className="text-2xl font-bold">
                    {expenseToRevenueRatio}%
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-500">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {stats?.daily.expenses.pendingCount || 0}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-500">Paid</p>
                  <p className="text-2xl font-bold text-green-600">
                    {stats?.daily.expenses.paidCount || 0}
                  </p>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Payment Methods</span>
                  <span>Distribution</span>
                </div>
                {Object.entries(stats?.daily.expenses.byPaymentMethod || {}).map(([method, amount], index) => (
                  <div key={method} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="capitalize">{method.replace('_', ' ')}</span>
                      <span>AFN {amount.toFixed(2)}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="h-2 rounded-full"
                        style={{
                          width: `${(amount / (stats?.daily.expenses.totalAmount || 1)) * 100}%`,
                          backgroundColor: COLORS[index % COLORS.length]
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activities & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Activities */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Activities</CardTitle>
              <Button variant="ghost" size="sm">
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats?.recentActivities && stats.recentActivities.length > 0 ? (
                stats.recentActivities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center space-x-4 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    <div className={`shrink-0 p-2 rounded-lg ${
                      activity.type === "order" ? "bg-blue-100 dark:bg-blue-900" : "bg-red-100 dark:bg-red-900"
                    }`}>
                      {getIconForType(activity.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {activity.description}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDate(activity.date)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-semibold ${
                        activity.type === "order" ? "text-green-600" : "text-red-600"
                      }`}>
                        {activity.type === "order" ? "+" : "-"}AFN {activity.amount?.toFixed(2)}
                      </p>
                      <Badge className={`mt-1 ${getStatusColor(activity.status)} text-xs`}>
                        {activity.status}
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No recent activities
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <Button
                variant="outline"
                className="h-auto py-6 flex flex-col items-center justify-center gap-2"
                onClick={() => router.push("/admin/records")}
              >
                <PlusIcon className="h-8 w-8 text-blue-600" />
                <span>New Order</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto py-6 flex flex-col items-center justify-center gap-2"
                onClick={() => router.push("/admin/expenses")}
              >
                <Receipt className="h-8 w-8 text-red-600" />
                <span>Add Expense</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto py-6 flex flex-col items-center justify-center gap-2"
                onClick={() => router.push("/admin/expenses")}
              >
                <Clock className="h-8 w-8 text-yellow-600" />
                <span>Pending Orders</span>
                {stats?.quickStats.pendingOrders && (
                  <Badge className="ml-2">{stats.quickStats.pendingOrders}</Badge>
                )}
              </Button>
              <Button
                variant="outline"
                className="h-auto py-6 flex flex-col items-center justify-center gap-2"
                onClick={() => router.push("/admin/expenses")}
              >
                <AlertCircle className="h-8 w-8 text-orange-600" />
                <span>Pending Expenses</span>
                {stats?.quickStats.pendingExpenses && (
                  <Badge className="ml-2">{stats.quickStats.pendingExpenses}</Badge>
                )}
              </Button>
            </div>
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-900">Business Health</p>
                  <p className="text-2xl font-bold text-blue-700">{netProfitMargin}%</p>
                  <p className="text-xs text-blue-600">Net Profit Margin</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-blue-900">Expense Ratio</p>
                  <p className="text-2xl font-bold text-blue-700">{expenseToRevenueRatio}%</p>
                  <p className="text-xs text-blue-600">of Revenue</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Add missing icon import
const PlusIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M5 12h14" />
    <path d="M12 5v14" />
  </svg>
);