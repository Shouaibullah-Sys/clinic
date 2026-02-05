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
  CheckCircle2,
  Plus,
  DollarSign,
  AlertCircle,
  Wallet,
  RefreshCw,
  ArrowRight,
  TrendingUp,
  FileText,
  UserCheck,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, parseISO, isToday } from "date-fns";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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

export default function ReceptionDashboardPage() {
  const { user, isAuthenticated, isLoading } = useAuthStore();
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

  // Add this helper function near the top of your component
  const getAuthHeaders = () => {
    const { accessToken } = useAuthStore.getState();
    return {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    };
  };

  // Then update your fetchDashboardData function:
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const { accessToken } = useAuthStore.getState();

      const headers = {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      };

      // Fetch stats
      const statsResponse = await fetch("/api/dashboard/reception/stats", {
        headers,
      });
      const statsData = await statsResponse.json();

      if (statsData.success) {
        setStats(statsData.data);
      } else {
        console.error("Error fetching stats:", statsData.error);
      }

      // Fetch discount requests
      const discountsResponse = await fetch(
        "/api/dashboard/reception/discounts?status=pending&limit=5",
        { headers },
      );
      const discountsData = await discountsResponse.json();

      if (discountsData.success) {
        setDiscountRequests(discountsData.data);
      } else {
        console.error("Error fetching discounts:", discountsData.error);
      }
    } catch (error) {
      console.error("Error fetching reception data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
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
    }).format(amount);
  };

  const formatTime = (timestamp: string) => {
    const date = parseISO(timestamp);
    return format(date, "MMM d, yyyy");
  };

  if (loading) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        {/* Header Skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>

        {/* Stats Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
          {Array.from({ length: 7 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-4 rounded-full" />
                </div>
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions Skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-36" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show loading state while checking authentication and role
  if (
    isLoading ||
    (isAuthenticated && user?.role !== "receptionist" && user?.role !== "admin")
  ) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Loading...</p>
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
            <p className="text-gray-500 mt-1">
              Welcome back,{" "}
              <span className="font-semibold text-gray-700">{user?.name}</span>!
              {stats.waitingPatients > 0 && (
                <span className="ml-2 text-amber-600 font-medium">
                  {stats.waitingPatients} patient
                  {stats.waitingPatients > 1 ? "s" : ""} waiting
                </span>
              )}
            </p>
          </div>
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

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
          {/* Daily Visitors */}
          <Card className="hover:shadow-md transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Daily Visitors
              </CardTitle>
              <div className="p-2 bg-blue-50 rounded-lg">
                <Users className="h-4 w-4 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.dailyVisitors}</div>
              <div className="flex items-center text-xs text-gray-500 mt-1">
                <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                Patients seen today
              </div>
            </CardContent>
          </Card>

          {/* Appointments */}
          <Card className="hover:shadow-md transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Appointments
              </CardTitle>
              <div className="p-2 bg-purple-50 rounded-lg">
                <Calendar className="h-4 w-4 text-purple-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.appointments}</div>
              <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
                <span className="flex items-center">
                  <Clock className="h-3 w-3 mr-1 text-amber-500" />
                  {stats.pendingAppointments} pending
                </span>
                <Badge variant="secondary" className="text-xs">
                  Today
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Waiting Patients */}
          <Card
            className={`hover:shadow-md transition-shadow duration-200 ${stats.waitingPatients > 0 ? "border-amber-200" : ""}`}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Waiting Patients
              </CardTitle>
              <div
                className={`p-2 rounded-lg ${stats.waitingPatients > 0 ? "bg-amber-50" : "bg-gray-50"}`}
              >
                <Clock
                  className={`h-4 w-4 ${stats.waitingPatients > 0 ? "text-amber-600" : "text-gray-600"}`}
                />
              </div>
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${stats.waitingPatients > 0 ? "text-amber-600" : ""}`}
              >
                {stats.waitingPatients}
              </div>
              <p className="text-xs text-gray-500">Currently in waiting area</p>
            </CardContent>
          </Card>

          {/* Check-ins */}
          <Card className="hover:shadow-md transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Check-ins</CardTitle>
              <div className="p-2 bg-green-50 rounded-lg">
                <UserCheck className="h-4 w-4 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.checkIns}</div>
              <p className="text-xs text-gray-500">Completed today</p>
            </CardContent>
          </Card>

          {/* Today's Revenue */}
          <Card className="hover:shadow-md transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Today's Revenue
              </CardTitle>
              <div className="p-2 bg-emerald-50 rounded-lg">
                <DollarSign className="h-4 w-4 text-emerald-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(stats.todayRevenue)}
              </div>
              <p className="text-xs text-gray-500">From all departments</p>
            </CardContent>
          </Card>

          {/* Pending Discounts */}
          <Card className="hover:shadow-md transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Pending Discounts
              </CardTitle>
              <div className="p-2 bg-yellow-50 rounded-lg">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingDiscounts}</div>
              <p className="text-xs text-gray-500">Awaiting admin approval</p>
            </CardContent>
          </Card>

          {/* Cash Balance */}
          <Card className="hover:shadow-md transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Cash Balance
              </CardTitle>
              <div className="p-2 bg-indigo-50 rounded-lg">
                <Wallet className="h-4 w-4 text-indigo-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(stats.dailyCashBalance)}
              </div>
              <div className="space-y-1 text-xs">
                <p className="text-gray-500">
                  System: {formatCurrency(stats.systemCashTotal)}
                </p>
                {stats.cashDifference !== undefined &&
                  stats.cashDifference !== 0 && (
                    <p
                      className={`font-medium ${stats.cashDifference > 0 ? "text-green-600" : "text-red-600"}`}
                    >
                      {stats.cashDifference > 0 ? "+" : ""}
                      {formatCurrency(stats.cashDifference)}
                    </p>
                  )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions & Recent Activities */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Actions */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common reception tasks</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        className="justify-start h-auto py-3 px-4"
                        onClick={() =>
                          router.push("/reception/appointments/new")
                        }
                      >
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <Plus className="h-4 w-4 text-blue-600" />
                          </div>
                          <div className="text-left">
                            <p className="font-medium">New Appointment</p>
                            <p className="text-xs text-gray-500">
                              Schedule patient
                            </p>
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
                        className="justify-start h-auto py-3 px-4"
                        onClick={() =>
                          router.push("/reception/lab-test-payments")
                        }
                      >
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <DollarSign className="h-4 w-4 text-blue-600" />
                          </div>
                          <div className="text-left">
                            <p className="font-medium">Lab Test Payment</p>
                            <p className="text-xs text-gray-500">
                              Process lab test payments
                            </p>
                          </div>
                        </div>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Process payments for direct lab tests</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        className="justify-start h-auto py-3 px-4"
                        onClick={() =>
                          router.push("/reception/radiology-exam-payments")
                        }
                      >
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-purple-100 rounded-lg">
                            <DollarSign className="h-4 w-4 text-purple-600" />
                          </div>
                          <div className="text-left">
                            <p className="font-medium">
                              Radiology Exam Payment
                            </p>
                            <p className="text-xs text-gray-500">
                              Process radiology exam payments
                            </p>
                          </div>
                        </div>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Process payments for direct radiology exams</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        className="justify-start h-auto py-3 px-4"
                        onClick={() => router.push("/reception/discounts/new")}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-yellow-100 rounded-lg">
                            <AlertCircle className="h-4 w-4 text-yellow-600" />
                          </div>
                          <div className="text-left">
                            <p className="font-medium">Request Discount</p>
                            <p className="text-xs text-gray-500">
                              Submit discount
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
                        className="justify-start h-auto py-3 px-4"
                        onClick={() => router.push("/reception/cash")}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-indigo-100 rounded-lg">
                            <Wallet className="h-4 w-4 text-indigo-600" />
                          </div>
                          <div className="text-left">
                            <p className="font-medium">Cash Reconciliation</p>
                            <p className="text-xs text-gray-500">
                              Update cash count
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
                        className="justify-start h-auto py-3 px-4"
                        onClick={() => router.push("/reception/appointments")}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-purple-100 rounded-lg">
                            <Calendar className="h-4 w-4 text-purple-600" />
                          </div>
                          <div className="text-left">
                            <p className="font-medium">View Schedule</p>
                            <p className="text-xs text-gray-500">
                              Today's appointments
                            </p>
                          </div>
                        </div>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>View today's appointment schedule</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        className="justify-start h-auto py-3 px-4"
                        onClick={() => router.push("/patients")}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-gray-100 rounded-lg">
                            <Users className="h-4 w-4 text-gray-600" />
                          </div>
                          <div className="text-left">
                            <p className="font-medium">Manage Patients</p>
                            <p className="text-xs text-gray-500">
                              Patient directory
                            </p>
                          </div>
                        </div>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Access patient directory</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activities */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Recent Activities</CardTitle>
                <CardDescription>Latest updates</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentActivities.length > 0 ? (
                    recentActivities.map((activity) => (
                      <div
                        key={activity.id}
                        className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() =>
                          activity.patientName &&
                          handleViewPatient(activity.patientId)
                        }
                      >
                        <div
                          className={`p-2 rounded-lg ${
                            activity.type === "checkin"
                              ? "bg-blue-100 text-blue-600"
                              : activity.type === "payment"
                                ? "bg-green-100 text-green-600"
                                : activity.type === "discount"
                                  ? "bg-yellow-100 text-yellow-600"
                                  : "bg-purple-100 text-purple-600"
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
                          <p className="text-xs text-gray-500 truncate">
                            {activity.description}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {formatTime(activity.timestamp)}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center py-4 text-gray-500">
                      No recent activities
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Pending Discount Requests */}
        <Card>
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
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => handleViewAllDiscounts()}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium truncate">
                          {request.patientName}
                        </p>
                        <Badge
                          variant="outline"
                          className={getStatusColor(request.status)}
                        >
                          {request.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 truncate">
                        {request.reason}
                      </p>
                      <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
                        <span>Requested by: {request.requestedBy}</span>
                        <span>{formatTime(request.requestedAt)}</span>
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <p className="font-bold text-lg">
                        {formatCurrency(request.requestedAmount)}
                      </p>
                      <Button variant="ghost" size="sm" className="mt-1">
                        Review
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 space-y-2">
                <FileText className="h-12 w-12 text-gray-300 mx-auto" />
                <p className="text-gray-500">No pending discount requests</p>
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

        {/* Additional Info Tabs */}
        <Card>
          <CardHeader>
            <CardTitle>Reception Information</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="tips" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="tips">Quick Tips</TabsTrigger>
                <TabsTrigger value="contacts">Key Contacts</TabsTrigger>
                <TabsTrigger value="resources">Resources</TabsTrigger>
              </TabsList>
              <TabsContent value="tips" className="space-y-2 pt-4">
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mr-2 mt-0.5 shrink-0" />
                    Always verify patient identity during check-in
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mr-2 mt-0.5 shrink-0" />
                    Update waiting times every 15 minutes
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mr-2 mt-0.5 shrink-0" />
                    Reconcile cash at shift changes
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mr-2 mt-0.5 shrink-0" />
                    Notify waiting patients of delays over 30 minutes
                  </li>
                </ul>
              </TabsContent>
              <TabsContent value="contacts" className="space-y-2 pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div className="p-3 border rounded-lg">
                    <p className="font-semibold">Emergency Contact</p>
                    <p className="text-gray-600">Hospital Administrator</p>
                    <p className="text-blue-600">(555) 123-4567</p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <p className="font-semibold">IT Support</p>
                    <p className="text-gray-600">Technical Issues</p>
                    <p className="text-blue-600">support@hospital.com</p>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="resources" className="space-y-2 pt-4">
                <div className="space-y-3">
                  <Button variant="outline" className="w-full justify-start">
                    <FileText className="h-4 w-4 mr-2" />
                    Reception Manual
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <FileText className="h-4 w-4 mr-2" />
                    Emergency Procedures
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <FileText className="h-4 w-4 mr-2" />
                    Patient Privacy Guidelines
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
