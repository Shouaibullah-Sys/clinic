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
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Users,
  Calendar,
  Clock,
  DollarSign,
  AlertCircle,
  Wallet,
  RefreshCw,
  ArrowRight,
  FileText,
  UserCheck,
  Activity,
  TrendingUp,
  UserPlus,
  CreditCard,
  CheckCircle,
  Settings,
  Bell,
  Timer,
  Stethoscope,
} from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { format, parseISO, isToday, formatDistanceToNow } from "date-fns";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";

interface ReceptionStats {
  // Core metrics
  dailyVisitors: number;
  appointments: number;
  waitingPatients: number;
  checkIns: number;
  pendingAppointments: number;
  todayRevenue: number;
  pendingDiscounts: number;
  dailyCashBalance: number;

  // Performance metrics
  avgWaitTime: number;
  patientSatisfaction?: number;
  completedAppointments: number;
  cancelledAppointments: number;

  // Financial metrics
  totalCollections: number;
  totalDiscounts: number;
  netRevenue: number;
  pendingPayments: number;
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

interface PatientQueueItem {
  id: string;
  patientName: string;
  patientId: string;
  checkInTime: string;
  estimatedWaitTime: number;
  priority: "normal" | "urgent" | "emergency";
  status: "waiting" | "with_doctor" | "completed";
  appointmentType: string;
  doctorName?: string;
}

interface TodaysAppointment {
  id: string;
  patientName: string;
  patientId: string;
  time: string;
  doctorName: string;
  type: string;
  status: "scheduled" | "confirmed" | "in_progress" | "completed" | "cancelled";
  phone?: string;
}

interface NotificationItem {
  id: string;
  type: "info" | "warning" | "error" | "success";
  title: string;
  message: string;
  timestamp: string;
  actionUrl?: string;
  actionText?: string;
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

  // Main stats
  const [stats, setStats] = useState<ReceptionStats>({
    dailyVisitors: 0,
    appointments: 0,
    waitingPatients: 0,
    checkIns: 0,
    pendingAppointments: 0,
    todayRevenue: 0,
    pendingDiscounts: 0,
    dailyCashBalance: 0,
    avgWaitTime: 0,
    completedAppointments: 0,
    cancelledAppointments: 0,
    totalCollections: 0,
    totalDiscounts: 0,
    netRevenue: 0,
    pendingPayments: 0,
  });

  // Data for various sections
  const [discountRequests, setDiscountRequests] = useState<DiscountRequest[]>(
    [],
  );
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>(
    [],
  );
  const [patientQueue, setPatientQueue] = useState<PatientQueueItem[]>([]);
  const [todaysAppointments, setTodaysAppointments] = useState<
    TodaysAppointment[]
  >([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
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
      const [
        statsResponse,
        discountsResponse,
        activitiesResponse,
        queueResponse,
        appointmentsResponse,
        notificationsResponse,
      ] = await Promise.all([
        fetch("/api/dashboard/reception/stats", { headers }),
        fetch("/api/dashboard/reception/discounts?status=pending&limit=5", {
          headers,
        }),
        fetch("/api/dashboard/reception/activities?limit=5", { headers }),
        fetch("/api/dashboard/reception/queue", { headers }),
        fetch("/api/dashboard/reception/appointments/today", { headers }),
        fetch("/api/dashboard/reception/notifications", { headers }),
      ]);

      const [
        statsData,
        discountsData,
        activitiesData,
        queueData,
        appointmentsData,
        notificationsData,
      ] = await Promise.all([
        statsResponse.json(),
        discountsResponse.json(),
        activitiesResponse.json(),
        queueResponse.json(),
        appointmentsResponse.json(),
        notificationsResponse.json(),
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
      }

      if (queueData.success) {
        setPatientQueue(queueData.data);
      }

      if (appointmentsData.success) {
        setTodaysAppointments(appointmentsData.data);
      }

      if (notificationsData.success) {
        setNotifications(notificationsData.data);
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
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              Reception Dashboard
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Welcome back,{" "}
              <span className="font-semibold text-gray-700 dark:text-gray-300">
                {user?.name}
              </span>
              ! Here's what's happening today.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-xs">
              {user?.role === "admin" ? "Admin Mode" : "Receptionist"}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
              />
              {refreshing ? "Refreshing..." : "Refresh"}
            </Button>
          </div>
        </div>

        {/* Critical Alerts */}
        {stats.waitingPatients > 5 && (
          <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-900/20">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800 dark:text-amber-200">
              <strong>High patient volume:</strong> {stats.waitingPatients}{" "}
              patients waiting. Average wait time: {stats.avgWaitTime} minutes.
            </AlertDescription>
          </Alert>
        )}

        {/* Key Metrics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Today's Performance */}
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Today's Performance
              </CardTitle>
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {stats.completedAppointments}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                of {stats.appointments} appointments completed
              </p>
              <div className="flex items-center mt-2">
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{
                      width: `${stats.appointments > 0 ? (stats.completedAppointments / stats.appointments) * 100 : 0}%`,
                    }}
                  ></div>
                </div>
                <span className="text-xs ml-2 text-gray-500">
                  {stats.appointments > 0
                    ? Math.round(
                        (stats.completedAppointments / stats.appointments) *
                          100,
                      )
                    : 0}
                  %
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Patient Flow */}
          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Patient Flow
              </CardTitle>
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Users className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats.checkIns}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                patients checked in
              </p>
              <div className="flex items-center justify-between mt-2 text-xs">
                <div className="flex items-center">
                  <Clock className="h-3 w-3 mr-1 text-amber-500" />
                  <span className="text-amber-600">
                    {stats.waitingPatients} waiting
                  </span>
                </div>
                <div className="flex items-center">
                  <Timer className="h-3 w-3 mr-1 text-blue-500" />
                  <span className="text-blue-600">
                    {stats.avgWaitTime}m avg
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Revenue Summary */}
          <Card className="border-l-4 border-l-emerald-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Revenue Today
              </CardTitle>
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">
                {formatCurrency(stats.todayRevenue)}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {formatCurrency(stats.netRevenue)} net revenue
              </p>
              <div className="flex items-center mt-2 text-xs">
                <span className="text-red-600 dark:text-red-400">
                  -{formatCurrency(stats.totalDiscounts)} discounts
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Pending Tasks */}
          <Card className="border-l-4 border-l-amber-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Pending Tasks
              </CardTitle>
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">
                {stats.pendingDiscounts + stats.pendingPayments}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {stats.pendingDiscounts} discounts, {stats.pendingPayments}{" "}
                payments
              </p>
              <div className="flex items-center mt-2 text-xs">
                <Wallet className="h-3 w-3 mr-1 text-indigo-500" />
                <span className="text-indigo-600">
                  {formatCurrency(stats.dailyCashBalance)} cash
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Quick Actions
            </CardTitle>
            <CardDescription>Most common reception tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {/* Patient Management */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    className="justify-start h-auto py-3 px-4 w-full"
                    onClick={() => router.push("/reception/patients/new")}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                        <UserPlus className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-sm">New Patient</p>
                        <p className="text-xs">Register</p>
                      </div>
                    </div>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Register a new patient</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    className="justify-start h-auto py-3 px-4 w-full"
                    onClick={() => router.push("/reception/appointments/new")}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                        <Calendar className="h-4 w-4 text-green-600 dark:text-green-400" />
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

              {/* Check-in/out */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    className="justify-start h-auto py-3 px-4 w-full"
                    onClick={() => router.push("/reception/checkin")}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                        <UserCheck className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-sm">Patient Check-in</p>
                        <p className="text-xs">Arrival</p>
                      </div>
                    </div>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Check in arriving patients</p>
                </TooltipContent>
              </Tooltip>

              {/* Payments */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    className="justify-start h-auto py-3 px-4 w-full"
                    onClick={() => router.push("/reception/payments")}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                        <CreditCard className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-sm">Process Payment</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Billing
                        </p>
                      </div>
                    </div>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Process payments and billing</p>
                </TooltipContent>
              </Tooltip>

              {/* Lab & Radiology */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    className="justify-start h-auto py-3 px-4 w-full"
                    onClick={() => router.push("/reception/lab-orders")}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                        <Stethoscope className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-sm">Lab Orders</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Tests
                        </p>
                      </div>
                    </div>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Order laboratory tests</p>
                </TooltipContent>
              </Tooltip>

              {/* Administrative */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    className="justify-start h-auto py-3 px-4 w-full"
                    onClick={() => router.push("/reception/discounts/new")}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                        <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-sm">Discount Request</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Approval
                        </p>
                      </div>
                    </div>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Submit discount request</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </CardContent>
        </Card>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Patient Queue & Appointments */}
          <div className="lg:col-span-2 space-y-6">
            {/* Patient Queue */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-amber-500" />
                    Patient Queue
                  </CardTitle>
                  <CardDescription>
                    {patientQueue.length} patients currently waiting
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-xs">
                  {stats.avgWaitTime}min avg wait
                </Badge>
              </CardHeader>
              <CardContent>
                {patientQueue.length > 0 ? (
                  <div className="space-y-3">
                    {patientQueue.slice(0, 5).map((patient) => (
                      <div
                        key={patient.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <div
                            className={`p-2 rounded-lg ${
                              patient.priority === "emergency"
                                ? "bg-red-100 dark:bg-red-900/30 text-red-600"
                                : patient.priority === "urgent"
                                  ? "bg-orange-100 dark:bg-orange-900/30 text-orange-600"
                                  : "bg-blue-100 dark:bg-blue-900/30 text-blue-600"
                            }`}
                          >
                            <Users className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-medium">{patient.patientName}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {patient.appointmentType} • Dr.{" "}
                              {patient.doctorName}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">
                            {formatTime(patient.checkInTime)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {patient.estimatedWaitTime}min wait
                          </p>
                        </div>
                      </div>
                    ))}
                    {patientQueue.length > 5 && (
                      <Button variant="outline" className="w-full" size="sm">
                        View All {patientQueue.length} Patients
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                    <p className="text-gray-500 dark:text-gray-400">
                      No patients in queue
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Today's Appointments */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-500" />
                  Today's Appointments
                </CardTitle>
                <CardDescription>
                  {
                    todaysAppointments.filter((a) => a.status === "scheduled")
                      .length
                  }{" "}
                  upcoming appointments
                </CardDescription>
              </CardHeader>
              <CardContent>
                {todaysAppointments.length > 0 ? (
                  <div className="space-y-2">
                    {todaysAppointments.slice(0, 6).map((appointment) => (
                      <div
                        key={appointment.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <div
                            className={`p-2 rounded-lg ${
                              appointment.status === "confirmed"
                                ? "bg-green-100 dark:bg-green-900/30 text-green-600"
                                : appointment.status === "in_progress"
                                  ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600"
                                  : "bg-gray-100 dark:bg-gray-800 text-gray-600"
                            }`}
                          >
                            <Calendar className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-medium">
                              {appointment.patientName}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {appointment.time} • Dr. {appointment.doctorName}
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            appointment.status === "confirmed"
                              ? "border-green-200 text-green-700"
                              : appointment.status === "in_progress"
                                ? "border-blue-200 text-blue-700"
                                : "border-gray-200 text-gray-700"
                          }`}
                        >
                          {appointment.status.replace("_", " ")}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                    <p className="text-gray-500 dark:text-gray-400">
                      No appointments scheduled for today
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Notifications & Pending Tasks */}
          <div className="space-y-6">
            {/* Notifications */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-indigo-500" />
                  Notifications
                </CardTitle>
              </CardHeader>
              <CardContent>
                {notifications.length > 0 ? (
                  <div className="space-y-3">
                    {notifications.slice(0, 4).map((notification) => (
                      <Alert
                        key={notification.id}
                        className={`${
                          notification.type === "error"
                            ? "border-red-200 bg-red-50 dark:bg-red-900/20"
                            : notification.type === "warning"
                              ? "border-amber-200 bg-amber-50 dark:bg-amber-900/20"
                              : notification.type === "success"
                                ? "border-green-200 bg-green-50 dark:bg-green-900/20"
                                : "border-blue-200 bg-blue-50 dark:bg-blue-900/20"
                        }`}
                      >
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="text-sm">
                          <p className="font-medium">{notification.title}</p>
                          <p className="text-xs mt-1">{notification.message}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatDistanceToNow(
                              parseISO(notification.timestamp),
                              { addSuffix: true },
                            )}
                          </p>
                        </AlertDescription>
                      </Alert>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Bell className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                      No new notifications
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Pending Tasks Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-500" />
                  Pending Tasks
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-amber-500" />
                    <span className="text-sm">Discount Requests</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {stats.pendingDiscounts}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleViewAllDiscounts}
                      className="text-xs"
                    >
                      View
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-blue-500" />
                    <span className="text-sm">Pending Payments</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {stats.pendingPayments}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-purple-500" />
                    <span className="text-sm">Unconfirmed Appointments</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {stats.pendingAppointments}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Bottom Section - Action Items & Activities */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Action Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Action Items
              </CardTitle>
              <CardDescription>Tasks requiring your attention</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Pending Discounts */}
              {stats.pendingDiscounts > 0 && (
                <div className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    <div>
                      <p className="font-medium text-amber-800 dark:text-amber-200">
                        {stats.pendingDiscounts} Pending Discount
                        {stats.pendingDiscounts > 1 ? "s" : ""}
                      </p>
                      <p className="text-sm text-amber-600 dark:text-amber-400">
                        Awaiting admin approval
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleViewAllDiscounts}
                    className="border-amber-300 text-amber-700 hover:bg-amber-100"
                  >
                    Review
                  </Button>
                </div>
              )}

              {/* Pending Payments */}
              {stats.pendingPayments > 0 && (
                <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <div>
                      <p className="font-medium text-blue-800 dark:text-blue-200">
                        {stats.pendingPayments} Pending Payment
                        {stats.pendingPayments > 1 ? "s" : ""}
                      </p>
                      <p className="text-sm text-blue-600 dark:text-blue-400">
                        Outstanding balances
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push("/reception/payments")}
                    className="border-blue-300 text-blue-700 hover:bg-blue-100"
                  >
                    Process
                  </Button>
                </div>
              )}

              {/* High Patient Queue */}
              {stats.waitingPatients > 3 && (
                <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-red-600 dark:text-red-400" />
                    <div>
                      <p className="font-medium text-red-800 dark:text-red-200">
                        Patient Queue Alert
                      </p>
                      <p className="text-sm text-red-600 dark:text-red-400">
                        {stats.waitingPatients} patients waiting (
                        {stats.avgWaitTime}min avg)
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push("/reception/checkin")}
                    className="border-red-300 text-red-700 hover:bg-red-100"
                  >
                    Manage
                  </Button>
                </div>
              )}

              {/* No action items */}
              {stats.pendingDiscounts === 0 &&
                stats.pendingPayments === 0 &&
                stats.waitingPatients <= 3 && (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-2" />
                    <p className="text-gray-500 dark:text-gray-400">
                      All caught up! No pending tasks.
                    </p>
                  </div>
                )}
            </CardContent>
          </Card>

          {/* Recent Activities */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-purple-500" />
                Recent Activities
              </CardTitle>
              <CardDescription>Latest system activities</CardDescription>
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
                        className={`p-2 rounded-lg flex-shrink-0 ${
                          activity.type === "checkin"
                            ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                            : activity.type === "payment"
                              ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                              : activity.type === "discount"
                                ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
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
                            <span className="text-xs font-medium text-green-600 dark:text-green-400">
                              {formatCurrency(activity.amount)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Activity className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
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
