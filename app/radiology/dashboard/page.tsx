'use client';

// app/radiology/dashboard/page.tsx
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Activity, 
  Clock, 
  CheckCircle, 
  DollarSign, 
  RefreshCw, 
  FileText, 
  TrendingUp,
  Calendar,
  Users,
  AlertCircle,
  ArrowRight,
  BarChart3,
  PieChart
} from "lucide-react";
import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface RadiologyRequest {
  _id: string;
  serviceId: string;
  serviceType: string;
  bodyPart: string;
  view: string;
  patient: {
    _id: string;
    name: string;
    patientId: string;
    phone?: string;
  };
  referringDoctor: {
    _id: string;
    name: string;
    specialization?: string;
  };
  radiologist?: {
    _id: string;
    name: string;
  };
  status: string;
  reportStatus: string;
  billingStatus: string;
  priority: string;
  requestDate: string;
  scheduledDate: string;
  performedDate?: string;
  contrastUsed?: boolean;
  contrastType?: string;
  notes?: string;
  findings?: string;
  impression?: string;
  recommendations?: string;
  pricing?: {
    basePrice: number;
    contrastPrice: number;
  };
}

interface ServiceTypeStats {
  type: string;
  count: number;
  percentage: number;
}

interface PriorityStats {
  priority: string;
  count: number;
  color: string;
}

interface BodyPartStats {
  bodyPart: string;
  count: number;
}

export default function RadiologyDashboardPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<RadiologyRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const { accessToken, user } = useAuthStore();

  const fetchRequests = async () => {
    try {
      setLoading(true);
      
      // Fetch from radiologist endpoint only (radiologists and admins)
      const response = await fetch(`/api/radiologist/requests?tab=all&limit=1000`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch requests");
      }

      if (result.success && result.data) {
        setRequests(result.data);
      } else {
        setRequests([]);
      }
    } catch (error: any) {
      console.error("Error fetching requests:", error);
      toast.error("Failed to Load Dashboard Data", {
        description: error.message || "An error occurred while fetching dashboard data",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  // Calculate Overview Stats
  const totalRequests = requests.length;
  const pendingRequests = requests.filter(r => r.status === "scheduled").length;
  const inProgressRequests = requests.filter(r => r.status === "in-progress").length;
  const completedReports = requests.filter(r => r.reportStatus === "completed").length;
  const totalRevenue = requests
    .filter(r => r.billingStatus === "paid")
    .reduce((sum, r) => sum + (r.pricing?.basePrice || 0) + (r.contrastUsed ? (r.pricing?.contrastPrice || 0) : 0), 0);

  // Calculate Average Completion Time
  const completedWithDates = requests.filter(r => r.performedDate && r.requestDate);
  const avgCompletionTime = completedWithDates.length > 0
    ? completedWithDates.reduce((sum, r) => {
        const requestDate = new Date(r.requestDate);
        const performedDate = new Date(r.performedDate!);
        return sum + (performedDate.getTime() - requestDate.getTime());
      }, 0) / completedWithDates.length / (1000 * 60 * 60) // Convert to hours
    : 0;

  // Calculate Service Type Distribution
  const serviceTypeCounts = requests.reduce((acc, req) => {
    acc[req.serviceType] = (acc[req.serviceType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const serviceTypeStats: ServiceTypeStats[] = Object.entries(serviceTypeCounts)
    .map(([type, count]) => ({
      type,
      count,
      percentage: totalRequests > 0 ? (count / totalRequests) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // Calculate Priority Distribution
  const priorityCounts = requests.reduce((acc, req) => {
    acc[req.priority] = (acc[req.priority] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const priorityStats: PriorityStats[] = [
    { priority: "routine", count: priorityCounts.routine || 0, color: "bg-blue-500" },
    { priority: "urgent", count: priorityCounts.urgent || 0, color: "bg-orange-500" },
    { priority: "emergency", count: priorityCounts.emergency || 0, color: "bg-red-500" },
  ];

  // Calculate Performance Metrics
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayRequests = requests.filter(r => new Date(r.requestDate) >= today).length;

  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekRequests = requests.filter(r => new Date(r.requestDate) >= weekAgo).length;

  const monthAgo = new Date(today);
  monthAgo.setMonth(monthAgo.getMonth() - 1);
  const monthRequests = requests.filter(r => new Date(r.requestDate) >= monthAgo).length;

  const completionRate = totalRequests > 0 ? (completedReports / totalRequests) * 100 : 0;

  // Calculate Top Body Parts
  const bodyPartCounts = requests.reduce((acc, req) => {
    acc[req.bodyPart] = (acc[req.bodyPart] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topBodyParts: BodyPartStats[] = Object.entries(bodyPartCounts)
    .map(([bodyPart, count]) => ({ bodyPart, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Recent Activity (last 10 requests)
  const recentActivity = [...requests]
    .sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime())
    .slice(0, 10);

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      scheduled: { label: "Scheduled", variant: "secondary" },
      "in-progress": { label: "In Progress", variant: "default" },
      completed: { label: "Completed", variant: "outline" },
      cancelled: { label: "Cancelled", variant: "destructive" },
    };
    const config = statusConfig[status] || { label: status, variant: "secondary" };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const priorityConfig: Record<string, { label: string; className: string }> = {
      routine: { label: "Routine", className: "bg-blue-100 text-blue-800 hover:bg-blue-200" },
      urgent: { label: "Urgent", className: "bg-orange-100 text-orange-800 hover:bg-orange-200" },
      emergency: { label: "Emergency", className: "bg-red-100 text-red-800 hover:bg-red-200" },
    };
    const config = priorityConfig[priority] || { label: priority, className: "bg-gray-100 text-gray-800" };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const handleViewRequest = (requestId: string) => {
    router.push(`/services/imaging/radiologist?request=${requestId}`);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Radiology Dashboard</h1>
            <p className="text-muted-foreground">
              Comprehensive overview of the radiology department
            </p>
          </div>
          <Button onClick={fetchRequests} disabled={loading} variant="outline">
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Overview Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalRequests}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingRequests}</div>
              <p className="text-xs text-muted-foreground">Scheduled requests</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              <Activity className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{inProgressRequests}</div>
              <p className="text-xs text-muted-foreground">Active requests</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedReports}</div>
              <p className="text-xs text-muted-foreground">Reports completed</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalRevenue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Total paid</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Time</CardTitle>
              <TrendingUp className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgCompletionTime.toFixed(1)}h</div>
              <p className="text-xs text-muted-foreground">Completion time</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Service Type Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Service Type Distribution
              </CardTitle>
              <CardDescription>Breakdown of imaging services</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {serviceTypeStats.map((stat) => (
                  <div key={stat.type} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium capitalize">{stat.type}</span>
                      <span className="text-muted-foreground">
                        {stat.count} ({stat.percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-500"
                        style={{ width: `${stat.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
                {serviceTypeStats.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No data available</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Priority Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Priority Distribution
              </CardTitle>
              <CardDescription>Request priority breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {priorityStats.map((stat) => (
                  <div key={stat.priority} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${stat.color}`} />
                      <span className="font-medium capitalize">{stat.priority}</span>
                    </div>
                    <Badge variant="secondary">{stat.count}</Badge>
                  </div>
                ))}
                {priorityStats.every(s => s.count === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-4">No data available</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Performance Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Performance Metrics
            </CardTitle>
            <CardDescription>Request statistics over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Today</p>
                <p className="text-3xl font-bold">{todayRequests}</p>
                <p className="text-xs text-muted-foreground">requests</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">This Week</p>
                <p className="text-3xl font-bold">{weekRequests}</p>
                <p className="text-xs text-muted-foreground">requests</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">This Month</p>
                <p className="text-3xl font-bold">{monthRequests}</p>
                <p className="text-xs text-muted-foreground">requests</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Completion Rate</p>
                <p className="text-3xl font-bold">{completionRate.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground">
                  {completedReports} of {totalRequests}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Body Parts & Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Body Parts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Top Body Parts
              </CardTitle>
              <CardDescription>Most frequently requested imaging areas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topBodyParts.map((item, index) => (
                  <div key={item.bodyPart} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                        {index + 1}
                      </div>
                      <span className="font-medium capitalize">{item.bodyPart}</span>
                    </div>
                    <Badge variant="outline">{item.count}</Badge>
                  </div>
                ))}
                {topBodyParts.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No data available</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Quick Actions
              </CardTitle>
              <CardDescription>Common tasks and navigation</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(user?.role === "admin" || user?.role === "radiologist") && (
                  <Button
                    variant="outline"
                    className="w-full justify-between"
                    onClick={() => router.push("/services/imaging/radiologist")}
                  >
                    <span>Radiologist Dashboard</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
                {(user?.role === "admin" || user?.role === "receptionist") && (
                  <Button
                    variant="outline"
                    className="w-full justify-between"
                    onClick={() => router.push("/services/imaging/reception")}
                  >
                    <span>Reception Dashboard</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="w-full justify-between"
                  onClick={() => router.push("/services/imaging")}
                >
                  <span>View All Requests</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-between"
                  onClick={() => router.push("/services/imaging/new")}
                >
                  <span>New Imaging Request</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>Last 10 radiology requests</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((request) => (
                <div
                  key={request._id}
                  className="flex items-start gap-4 p-4 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => handleViewRequest(request._id)}
                >
                  <div className="shrink-0">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium truncate">{request.patient.name}</p>
                      {getPriorityBadge(request.priority)}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <span className="capitalize">{request.serviceType}</span>
                      <span>•</span>
                      <span className="capitalize">{request.bodyPart}</span>
                      <span>•</span>
                      <span>{new Date(request.requestDate).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(request.status)}
                      {request.reportStatus === "completed" && (
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          Report Ready
                        </Badge>
                      )}
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 mt-2" />
                </div>
              ))}
              {recentActivity.length === 0 && (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No recent activity</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
