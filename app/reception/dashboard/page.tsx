// app/reception/dashboard/page.tsx

"use client";

import { useAuthStore } from "@/store/useAuthStore";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users,
  Calendar,
  Clock,
  Plus,
  DollarSign,
  AlertCircle,
  Wallet,
  RefreshCw,
  ArrowRight,
  FileText,
  UserCheck,
  Activity,
} from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { format, parseISO, isToday } from "date-fns";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";

interface ReceptionStats {
  dailyVisitors: number;
  appointments: number;
  waitingPatients: number;
  checkIns: number;
  pendingAppointments: number;
  todayRevenue: number;
  pendingDiscounts: number;
  dailyCashBalance: number;
  systemCashTotal: number;
  cashDifference?: number;
}

interface DiscountRequest {
  id: string;
  patientName: string;
  requestedAmount: number;
  reason: string;
  requestedBy: string;
  requestedAt: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
  patientId?: string;
}

interface RecentActivity {
  id: string;
  type: "checkin" | "payment" | "discount" | "appointment";
  title: string;
  description: string;
  timestamp: string;
  patientName?: string;
  patientId?: string;
  amount?: number;
}

interface TodaysCollection {
  appointments: {
    totalAmount: number;
    netAmount: number;
    discount: number;
    count: number;
  };
  lab: {
    totalPaid: number;
    totalAmount: number;
    discount: number;
    count: number;
  };
  radiology: {
    totalPaid: number;
    totalAmount: number;
    discount: number;
    count: number;
  };
  discounts: {
    totalDiscountAmount: number;
    count: number;
  };
  expenses: {
    totalExpenses: number;
    count: number;
    byCategory: Record<string, number>;
  };
  summary: {
    totalCollection: number;
    totalDiscounts: number;
    netCollection: number;
    totalExpenses: number;
    netAfterExpenses: number;
  };
  date: string;
}

export default function ReceptionDashboardPage() {
  const { user, isAuthenticated, isLoading, accessToken } = useAuthStore();
  const router = useRouter();
  const [stats, setStats] = useState<ReceptionStats>({
    dailyVisitors: 0,
    appointments: 0,
    waitingPatients: 0,
    checkIns: 0,
    pendingAppointments: 0,
    todayRevenue: 0,
    pendingDiscounts: 0,
    dailyCashBalance: 0,
    systemCashTotal: 0,
    cashDifference: 0,
  });
  const [discountRequests, setDiscountRequests] = useState<DiscountRequest[]>(
    [],
  );
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>(
    [],
  );
  const [todaysCollection, setTodaysCollection] =
    useState<TodaysCollection | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Role-based access control
  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push("/login");
      } else if (user?.role !== "receptionist" && user?.role !== "admin") {
        router.push("/unauthorized");
      }
    }
  }, [isAuthenticated, user, isLoading, router]);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }

      // Fetch all data in parallel for better performance
      const [statsResponse, discountsResponse, activitiesResponse] =
        await Promise.all([
          fetch("/api/dashboard/reception/stats", { headers }),
          fetch("/api/dashboard/reception/discounts?status=pending&limit=5", {
            headers,
          }),
          fetch("/api/dashboard/reception/activities?limit=5", { headers }),
        ]);

      const [statsData, discountsData, activitiesData] = await Promise.all([
        statsResponse.json(),
        discountsResponse.json(),
        activitiesResponse.json(),
      ]);

      if (statsData.success) {
        setStats(statsData.data);
      } else {
        console.error("Error fetching stats:", statsData.error);
        toast.error("Failed to load dashboard statistics");
      }

      if (discountsData.success) {
        setDiscountRequests(discountsData.data);
      } else {
        console.error("Error fetching discounts:", discountsData.error);
        toast.error("Failed to load discount requests");
      }

      if (activitiesData.success) {
        setRecentActivities(activitiesData.data);
      } else {
        console.error("Error fetching activities:", activitiesData.error);
        // Don't show toast for activities as it's secondary data
      }
    } catch (error) {
      console.error("Error fetching reception data:", error);
      toast.error("Failed to load dashboard data. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (
      isAuthenticated &&
      (user?.role === "receptionist" || user?.role === "admin")
    ) {
      fetchDashboardData();
    }
  }, [isAuthenticated, user?.role, fetchDashboardData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    toast.success("Dashboard refreshed");
  };

  const handleViewAllDiscounts = () => {
    router.push("/reception/discounts");
  };

  const handleViewPatient = (patientId?: string) => {
    if (patientId) {
      router.push(`/patients/${patientId}`);
    }
  };

  const handleProcessPayment = () => {
    router.push("/reception/payments");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100";
      case "approved":
        return "bg-green-100 text-green-800 hover:bg-green-100";
      case "rejected":
        return "bg-red-100 text-red-800 hover:bg-red-100";
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-100";
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatTime = (timestamp: string) => {
    try {
      const date = parseISO(timestamp);
      if (isToday(date)) {
        return format(date, "h:mm a");
      }
      return format(date, "MMM d, yyyy");
    } catch {
      return "Invalid date";
    }
  };

  // Show loading state while checking authentication and role
  if (isLoading) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        {/* Header Skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>

        {/* Compact Stats Grid Skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="p-3 pb-1">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-3 rounded-full" />
                </div>
              </CardHeader>
              <CardContent className="p-3 pt-1">
                <Skeleton className="h-6 w-12 mb-1" />
                <Skeleton className="h-2 w-14" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Full-width Quick Actions Skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-3 w-48" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {Array.from({ length: 7 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show unauthorized state
  if (
    isAuthenticated &&
    user?.role !== "receptionist" &&
    user?.role !== "admin"
  ) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
          <h1 className="text-2xl font-bold">Unauthorized Access</h1>
          <p className="text-gray-500">
            You don't have permission to access this page.
          </p>
          <Button onClick={() => router.push("/")}>Go to Home</Button>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6 p-4 md:p-6">
        {/* Header with Refresh */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              Reception Dashboard
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Welcome back,{" "}
              <span className="font-semibold text-gray-700 dark:text-gray-300">
                {user?.name}
              </span>
              !
              {stats.waitingPatients > 0 && (
                <span className="ml-2 text-amber-600 dark:text-amber-500 font-medium">
                  {stats.waitingPatients} patient
                  {stats.waitingPatients > 1 ? "s" : ""} waiting
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {user?.role === "admin" ? "Admin Mode" : "Receptionist"}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="w-full sm:w-auto"
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
              />
              {refreshing ? "Refreshing..." : "Refresh"}
            </Button>
          </div>
        </div>

        {/* Compact Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          {/* Daily Visitors */}
          <Card className="hover:shadow-md transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1">
              <CardTitle className="text-xs font-medium">
                Daily Visitors
              </CardTitle>
              <div className="p-1.5 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                <Users className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              </div>
            </CardHeader>
            <CardContent className="p-3 pt-1">
              <div className="text-xl font-bold">{stats.dailyVisitors}</div>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">
                Today
              </p>
            </CardContent>
          </Card>

          {/* Appointments */}
          <Card className="hover:shadow-md transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1">
              <CardTitle className="text-xs font-medium">
                Appointments
              </CardTitle>
              <div className="p-1.5 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
                <Calendar className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
              </div>
            </CardHeader>
            <CardContent className="p-3 pt-1">
              <div className="text-xl font-bold">{stats.appointments}</div>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">
                <span className="text-amber-500">
                  {stats.pendingAppointments} pending
                </span>
              </p>
            </CardContent>
          </Card>

          {/* Waiting Patients */}
          <Card className="hover:shadow-md transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1">
              <CardTitle className="text-xs font-medium">Waiting</CardTitle>
              <div className="p-1.5 bg-amber-50 dark:bg-amber-900/30 rounded-lg">
                <Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              </div>
            </CardHeader>
            <CardContent className="p-3 pt-1">
              <div className="text-xl font-bold text-amber-600 dark:text-amber-500">
                {stats.waitingPatients}
              </div>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">
                In waiting area
              </p>
            </CardContent>
          </Card>

          {/* Check-ins */}
          <Card className="hover:shadow-md transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1">
              <CardTitle className="text-xs font-medium">Check-ins</CardTitle>
              <div className="p-1.5 bg-green-50 dark:bg-green-900/30 rounded-lg">
                <UserCheck className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
              </div>
            </CardHeader>
            <CardContent className="p-3 pt-1">
              <div className="text-xl font-bold">{stats.checkIns}</div>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">
                Completed
              </p>
            </CardContent>
          </Card>

          {/* Today's Revenue */}
          <Card className="hover:shadow-md transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1">
              <CardTitle className="text-xs font-medium">Revenue</CardTitle>
              <div className="p-1.5 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg">
                <DollarSign className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </CardHeader>
            <CardContent className="p-3 pt-1">
              <div className="text-xl font-bold">
                {formatCurrency(stats.todayRevenue)}
              </div>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">
                Today
              </p>
            </CardContent>
          </Card>

          {/* Pending Discounts */}
          <Card className="hover:shadow-md transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1">
              <CardTitle className="text-xs font-medium">
                Pending Discounts
              </CardTitle>
              <div className="p-1.5 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg">
                <AlertCircle className="h-3.5 w-3.5 text-yellow-600 dark:text-yellow-400" />
              </div>
            </CardHeader>
            <CardContent className="p-3 pt-1">
              <div className="text-xl font-bold">{stats.pendingDiscounts}</div>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">
                Awaiting approval
              </p>
            </CardContent>
          </Card>

          {/* Daily Cash Balance */}
          <Card className="hover:shadow-md transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1">
              <CardTitle className="text-xs font-medium">
                Cash Balance
              </CardTitle>
              <div className="p-1.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
                <Wallet className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
              </div>
            </CardHeader>
            <CardContent className="p-3 pt-1">
              <div className="text-xl font-bold">
                {formatCurrency(stats.dailyCashBalance)}
              </div>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">
                Daily
              </p>
            </CardContent>
          </Card>

          {/* System Cash Total */}
          <Card className="hover:shadow-md transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1">
              <CardTitle className="text-xs font-medium">System Cash</CardTitle>
              <div className="p-1.5 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <DollarSign className="h-3.5 w-3.5 text-gray-600 dark:text-gray-400" />
              </div>
            </CardHeader>
            <CardContent className="p-3 pt-1">
              <div className="text-xl font-bold">
                {formatCurrency(stats.systemCashTotal)}
              </div>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">
                Total
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Full-width Quick Actions */}
        <Card className="hover:shadow-md transition-shadow duration-200">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common reception tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    className="justify-start h-auto py-3 px-4 w-full"
                    onClick={() => router.push("/reception/appointments/new")}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                        <Plus className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-sm">New Appointment</p>
                        <p className="text-xs">Schedule</p>
                      </div>
                    </div>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Schedule a new appointment</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    className="justify-start h-auto py-3 px-4 w-full"
                    onClick={handleProcessPayment}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                        <DollarSign className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-sm">Lab Payments</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Process
                        </p>
                      </div>
                    </div>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Process payments for lab tests</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    className="justify-start h-auto py-3 px-4 w-full"
                    onClick={handleProcessPayment}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                        <DollarSign className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-sm">Radiology</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Payments
                        </p>
                      </div>
                    </div>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Process radiology payments</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    className="justify-start h-auto py-3 px-4 w-full"
                    onClick={() => router.push("/reception/discounts/new")}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                        <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-sm">Discount</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Request
                        </p>
                      </div>
                    </div>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Submit a discount request</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    className="justify-start h-auto py-3 px-4 w-full"
                    onClick={() => router.push("/reception/cash")}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                        <Wallet className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-sm">Cash</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Reconcile
                        </p>
                      </div>
                    </div>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Reconcile daily cash balance</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    className="justify-start h-auto py-3 px-4 w-full"
                    onClick={() => router.push("/reception/appointments")}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                        <Calendar className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-sm">Schedule</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          View
                        </p>
                      </div>
                    </div>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>View today's appointment schedule</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </CardContent>
        </Card>

        {/* Today's Collection Summary */}
        <Card className="hover:shadow-md transition-shadow duration-200">
          <CardHeader>
            <CardTitle>Today's Collection</CardTitle>
            <CardDescription>
              Complete breakdown of today's payments and expenses
            </CardDescription>
          </CardHeader>
          <CardContent>
            {todaysCollection ? (
              <div className="space-y-6">
                {/* Collection Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Appointments */}
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                        Appointments
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {todaysCollection.appointments.count}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">
                          Total:
                        </span>
                        <span className="font-semibold">
                          {formatCurrency(
                            todaysCollection.appointments.totalAmount,
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">
                          Discount:
                        </span>
                        <span className="text-red-600 dark:text-red-400">
                          -
                          {formatCurrency(
                            todaysCollection.appointments.discount,
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm font-semibold">
                        <span className="text-gray-700 dark:text-gray-300">
                          Net:
                        </span>
                        <span className="text-blue-600 dark:text-blue-400">
                          {formatCurrency(
                            todaysCollection.appointments.netAmount,
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Lab Payments */}
                  <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
                        Lab Payments
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {todaysCollection.lab.count}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">
                          Total Paid:
                        </span>
                        <span className="font-semibold">
                          {formatCurrency(todaysCollection.lab.totalPaid)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">
                          Discount:
                        </span>
                        <span className="text-red-600 dark:text-red-400">
                          -{formatCurrency(todaysCollection.lab.discount)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Radiology Payments */}
                  <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
                        Radiology Payments
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {todaysCollection.radiology.count}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">
                          Total Paid:
                        </span>
                        <span className="font-semibold">
                          {formatCurrency(todaysCollection.radiology.totalPaid)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">
                          Discount:
                        </span>
                        <span className="text-red-600 dark:text-red-400">
                          -{formatCurrency(todaysCollection.radiology.discount)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Discounts and Expenses */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Approved Discounts */}
                  <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-yellow-700 dark:text-yellow-300">
                        Approved Discounts
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {todaysCollection.discounts.count}
                      </Badge>
                    </div>
                    <div className="flex justify-between text-sm font-semibold">
                      <span className="text-gray-700 dark:text-gray-300">
                        Total:
                      </span>
                      <span className="text-yellow-600 dark:text-yellow-400">
                        -
                        {formatCurrency(
                          todaysCollection.discounts.totalDiscountAmount,
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Expenses */}
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-red-700 dark:text-red-300">
                        Expenses
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {todaysCollection.expenses.count}
                      </Badge>
                    </div>
                    <div className="flex justify-between text-sm font-semibold">
                      <span className="text-gray-700 dark:text-gray-300">
                        Total:
                      </span>
                      <span className="text-red-600 dark:text-red-400">
                        -
                        {formatCurrency(
                          todaysCollection.expenses.totalExpenses,
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Summary */}
                <div className="p-4 bg-linear-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-lg border-2 border-emerald-200 dark:border-emerald-800">
                  <h3 className="text-lg font-bold text-emerald-800 dark:text-emerald-200 mb-4">
                    Collection Summary
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">
                        Total Collection:
                      </span>
                      <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                        {formatCurrency(
                          todaysCollection.summary.totalCollection,
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">
                        Total Discounts:
                      </span>
                      <span className="font-semibold text-yellow-600 dark:text-yellow-400">
                        -
                        {formatCurrency(
                          todaysCollection.summary.totalDiscounts,
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between text-base font-bold border-t border-emerald-200 dark:border-emerald-800 pt-2">
                      <span className="text-gray-700 dark:text-gray-300">
                        Net Collection:
                      </span>
                      <span className="text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(todaysCollection.summary.netCollection)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">
                        Total Expenses:
                      </span>
                      <span className="font-semibold text-red-600 dark:text-red-400">
                        -
                        {formatCurrency(todaysCollection.summary.totalExpenses)}
                      </span>
                    </div>
                    <div className="flex justify-between text-lg font-bold border-t border-emerald-200 dark:border-emerald-800 pt-2">
                      <span className="text-gray-800 dark:text-gray-200">
                        Net After Expenses:
                      </span>
                      <span className="text-2xl text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(
                          todaysCollection.summary.netAfterExpenses,
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <RefreshCw className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto animate-spin" />
                <p className="text-gray-500 dark:text-gray-400 mt-2">
                  Loading collection data...
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Combined Section: Pending Discounts & Recent Activities */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pending Discount Requests */}
          <Card className="hover:shadow-md transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Pending Discount Requests</CardTitle>
                <CardDescription>
                  Requests awaiting admin approval
                </CardDescription>
              </div>
              {discountRequests.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleViewAllDiscounts}
                  className="gap-1"
                >
                  View All
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {discountRequests.length > 0 ? (
                <div className="space-y-3">
                  {discountRequests.slice(0, 3).map((request) => (
                    <div
                      key={request.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                      onClick={() => handleViewAllDiscounts()}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium truncate">
                            {request.patientName}
                          </p>
                          <Badge
                            variant="outline"
                            className={`text-xs ${getStatusColor(request.status)}`}
                          >
                            {request.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                          {request.reason}
                        </p>
                        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mt-2">
                          <span>By: {request.requestedBy}</span>
                          <span>{formatTime(request.requestedAt)}</span>
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <p className="font-bold text-lg">
                          {formatCurrency(request.requestedAmount)}
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-1 text-xs"
                        >
                          Review
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 space-y-2">
                  <FileText className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto" />
                  <p className="text-gray-500 dark:text-gray-400">
                    No pending discount requests
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push("/reception/discounts/new")}
                  >
                    Create New Request
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Activities */}
          <Card className="hover:shadow-md transition-shadow duration-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Activities</CardTitle>
                <Activity className="h-5 w-5 text-gray-400" />
              </div>
              <CardDescription>Latest updates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentActivities.length > 0 ? (
                  recentActivities.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                      onClick={() =>
                        activity.patientId &&
                        handleViewPatient(activity.patientId)
                      }
                    >
                      <div
                        className={`p-2 rounded-lg ${
                          activity.type === "checkin"
                            ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                            : activity.type === "payment"
                              ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                              : activity.type === "discount"
                                ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400"
                                : "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400"
                        }`}
                      >
                        {activity.type === "checkin" && (
                          <UserCheck className="h-4 w-4" />
                        )}
                        {activity.type === "payment" && (
                          <DollarSign className="h-4 w-4" />
                        )}
                        {activity.type === "discount" && (
                          <AlertCircle className="h-4 w-4" />
                        )}
                        {activity.type === "appointment" && (
                          <Calendar className="h-4 w-4" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {activity.title}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {activity.description}
                        </p>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-xs text-gray-400">
                            {formatTime(activity.timestamp)}
                          </p>
                          {activity.amount && (
                            <span className="text-xs font-medium">
                              {formatCurrency(activity.amount)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 space-y-2">
                    <Activity className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto" />
                    <p className="text-gray-500 dark:text-gray-400">
                      No recent activities
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </TooltipProvider>
  );
}
