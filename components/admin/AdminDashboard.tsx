// components/admin/AdminDashboard.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Activity,
  Ambulance,
  Bed,
  Calendar,
  Clock,
  Download,
  Eye,
  FileText,
  Filter,
  HeartPulse,
  Hospital,
  LayoutDashboard,
  Pill,
  Scan,
  Shield,
  Stethoscope,
  TrendingDown,
  TrendingUp,
  Users,
  DollarSign,
  AlertTriangle,
  PieChart as PieChartIcon,
  CheckCircle2,
  UserCheck,
  Syringe,
  Thermometer,
} from "lucide-react";

interface HospitalStats {
  totalPatients: number;
  activeAdmissions: number;
  dailyOPD: number;
  emergencyCases: number;
  monthlyRevenue: number;
  monthlyExpenses: number;
  occupancyRate: number;
  staffCount: number;
  pendingAppointments: number;
  labTestsPending: number;
  imagingPending: number;
  prescriptionsPending: number;
}

interface ServiceStats {
  service: string;
  count: number;
  revenue: number;
  growth: number;
}

interface DepartmentStats {
  department: string;
  patients: number;
  occupancy: number;
  doctors: number;
}

interface RevenueTrend {
  date: string;
  revenue: number;
  expenses: number;
  patients: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<HospitalStats | null>(null);
  const [serviceStats, setServiceStats] = useState<ServiceStats[]>([]);
  const [departmentStats, setDepartmentStats] = useState<DepartmentStats[]>([]);
  const [revenueTrend, setRevenueTrend] = useState<RevenueTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("month");

  useEffect(() => {
    fetchHospitalData();
    fetchServiceStats();
    fetchDepartmentStats();
    fetchRevenueTrend();
  }, [timeRange]);

  const fetchHospitalData = async () => {
    try {
      const response = await fetch("/api/dashboard/admin/hospital-stats");
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Error fetching hospital data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchServiceStats = async () => {
    try {
      const response = await fetch("/api/dashboard/admin/service-stats");
      if (response.ok) {
        const data = await response.json();
        setServiceStats(data);
      }
    } catch (error) {
      console.error("Error fetching service stats:", error);
    }
  };

  const fetchDepartmentStats = async () => {
    try {
      const response = await fetch("/api/dashboard/admin/department-stats");
      if (response.ok) {
        const data = await response.json();
        setDepartmentStats(data);
      }
    } catch (error) {
      console.error("Error fetching department stats:", error);
    }
  };

  const fetchRevenueTrend = async () => {
    try {
      const response = await fetch("/api/dashboard/admin/revenue-trend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timeRange }),
      });
      if (response.ok) {
        const data = await response.json();
        setRevenueTrend(data);
      }
    } catch (error) {
      console.error("Error fetching revenue trend:", error);
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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  // Service distribution data for pie chart
  const serviceDistribution = serviceStats.map((service) => ({
    name: service.service,
    value: service.count,
    color: getServiceColor(service.service),
  }));

  // Top performing services for bar chart
  const topServices = [...serviceStats]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  const getServiceColor = (service: string): string => {
    const colors: Record<string, string> = {
      emergency: "#EF4444",
      opd: "#3B82F6",
      laboratory: "#10B981",
      imaging: "#8B5CF6",
      pharmacy: "#F59E0B",
      dental: "#EC4899",
      ecg: "#06B6D4",
      ambulance: "#F97316",
      ot: "#6366F1",
      indo: "#14B8A6",
      endoscopy: "#84CC16",
      lithotripsy: "#8B5CF6",
    };
    return colors[service] || "#6B7280";
  };

  const getServiceIcon = (service: string) => {
    const icons: Record<string, JSX.Element> = {
      emergency: <Ambulance className="h-5 w-5" />,
      opd: <Stethoscope className="h-5 w-5" />,
      laboratory: <Thermometer className="h-5 w-5" />,
      imaging: <Scan className="h-5 w-5" />,
      pharmacy: <Pill className="h-5 w-5" />,
      dental: <HeartPulse className="h-5 w-5" />,
      ecg: <Activity className="h-5 w-5" />,
      ambulance: <Ambulance className="h-5 w-5" />,
      ot: <Hospital className="h-5 w-5" />,
      indo: <Bed className="h-5 w-5" />,
      endoscopy: <Syringe className="h-5 w-5" />,
    };
    return icons[service] || <Activity className="h-5 w-5" />;
  };

  const getServiceDisplayName = (service: string): string => {
    const names: Record<string, string> = {
      emergency: "Emergency",
      opd: "OPD",
      laboratory: "Laboratory",
      imaging: "Imaging",
      pharmacy: "Pharmacy",
      dental: "Dental",
      ecg: "ECG",
      ambulance: "Ambulance",
      ot: "Operation Theatre",
      indo: "Indoor Patient",
      endoscopy: "Endoscopy",
      lithotripsy: "Lithotripsy",
    };
    return names[service] || service;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Hospital Management Dashboard</h2>
          <p className="text-gray-500">
            Comprehensive overview of hospital operations and services
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={timeRange} onValueChange={setTimeRange} className="w-auto">
            <TabsList>
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="month">Month</TabsTrigger>
              <TabsTrigger value="quarter">Quarter</TabsTrigger>
              <TabsTrigger value="year">Year</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Patients */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Total Patients
                </p>
                <p className="text-3xl font-bold mt-2">
                  {stats?.totalPatients?.toLocaleString() || "0"}
                </p>
                <div className="flex items-center mt-1 text-sm">
                  <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                  <span className="text-green-600">12.5%</span>
                  <span className="text-gray-500 ml-2">from last month</span>
                </div>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Admissions */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Active Admissions
                </p>
                <p className="text-3xl font-bold mt-2">
                  {stats?.activeAdmissions || "0"}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Occupancy: {stats?.occupancyRate || "0"}%
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <Bed className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Revenue */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Monthly Revenue
                </p>
                <p className="text-3xl font-bold mt-2">
                  {formatCurrency(stats?.monthlyRevenue || 0)}
                </p>
                <div className="flex items-center mt-1 text-sm">
                  <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                  <span className="text-green-600">8.2%</span>
                  <span className="text-gray-500 ml-2">growth</span>
                </div>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Emergency Cases */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Emergency Cases
                </p>
                <p className="text-3xl font-bold mt-2">
                  {stats?.emergencyCases || "0"}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Today: {Math.floor((stats?.emergencyCases || 0) / 30)} cases
                </p>
              </div>
              <div className="p-3 bg-red-100 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Service Performance Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Service Revenue */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Service Performance</CardTitle>
            <CardDescription>Top 5 services by revenue</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topServices}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="service" 
                    stroke="#6b7280"
                    tickFormatter={getServiceDisplayName}
                  />
                  <YAxis stroke="#6b7280" />
                  <Tooltip
                    formatter={(value) => [formatCurrency(Number(value)), "Revenue"]}
                    labelFormatter={getServiceDisplayName}
                  />
                  <Bar dataKey="revenue" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Service Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Service Distribution</CardTitle>
            <CardDescription>Cases by service type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={serviceDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => 
                      `${getServiceDisplayName(name)}: ${(percent * 100).toFixed(0)}%`
                    }
                    outerRadius={70}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {serviceDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name) => [
                    value, 
                    getServiceDisplayName(String(name))
                  ]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Trend & Department Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Trend */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
            <CardDescription>Revenue vs Expenses over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#6b7280"
                    tickFormatter={(value) => {
                      if (timeRange === "week") return value.split('-')[2];
                      if (timeRange === "month") return value;
                      return value.substring(0, 7);
                    }}
                  />
                  <YAxis stroke="#6b7280" />
                  <Tooltip
                    formatter={(value) => [formatCurrency(Number(value)), "Amount"]}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    name="Revenue"
                    stroke="#10B981"
                    fill="#10B981"
                    fillOpacity={0.2}
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="expenses"
                    name="Expenses"
                    stroke="#EF4444"
                    fill="#EF4444"
                    fillOpacity={0.2}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Department Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Department Overview</CardTitle>
            <CardDescription>Current status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {departmentStats.slice(0, 5).map((dept) => (
                <div key={dept.department} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${
                      dept.occupancy > 80 ? 'bg-red-100 text-red-600' :
                      dept.occupancy > 60 ? 'bg-yellow-100 text-yellow-600' :
                      'bg-green-100 text-green-600'
                    }`}>
                      <Hospital className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium">{dept.department}</p>
                      <p className="text-sm text-gray-500">
                        {dept.patients} patients • {dept.doctors} doctors
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${
                      dept.occupancy > 80 ? 'text-red-600' :
                      dept.occupancy > 60 ? 'text-yellow-600' :
                      'text-green-600'
                    }`}>
                      {dept.occupancy}%
                    </p>
                    <p className="text-xs text-gray-500">Occupancy</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Service Quick Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Service Quick Stats</CardTitle>
          <CardDescription>Pending tasks and activities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-2">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
              <p className="text-sm font-medium text-gray-600">Appointments</p>
              <p className="text-2xl font-bold mt-1">{stats?.pendingAppointments || 0}</p>
              <p className="text-xs text-gray-500">Pending</p>
            </div>

            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-2">
                <Thermometer className="h-6 w-6 text-green-600" />
              </div>
              <p className="text-sm font-medium text-gray-600">Lab Tests</p>
              <p className="text-2xl font-bold mt-1">{stats?.labTestsPending || 0}</p>
              <p className="text-xs text-gray-500">Awaiting Results</p>
            </div>

            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-100 rounded-full mb-2">
                <Scan className="h-6 w-6 text-purple-600" />
              </div>
              <p className="text-sm font-medium text-gray-600">Imaging</p>
              <p className="text-2xl font-bold mt-1">{stats?.imagingPending || 0}</p>
              <p className="text-xs text-gray-500">Pending Review</p>
            </div>

            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-orange-100 rounded-full mb-2">
                <Pill className="h-6 w-6 text-orange-600" />
              </div>
              <p className="text-sm font-medium text-gray-600">Pharmacy</p>
              <p className="text-2xl font-bold mt-1">{stats?.prescriptionsPending || 0}</p>
              <p className="text-xs text-gray-500">To Dispense</p>
            </div>

            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mb-2">
                <Ambulance className="h-6 w-6 text-red-600" />
              </div>
              <p className="text-sm font-medium text-gray-600">Emergency</p>
              <p className="text-2xl font-bold mt-1">{stats?.emergencyCases || 0}</p>
              <p className="text-xs text-gray-500">Active Cases</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alerts and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Critical Alerts */}
        <Card className="border-l-4 border-l-red-500">
          <CardHeader>
            <CardTitle className="flex items-center text-red-700">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Critical Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <div>
                    <p className="font-medium">ICU Bed Shortage</p>
                    <p className="text-sm text-gray-600">
                      Only 2 ICU beds available
                    </p>
                  </div>
                </div>
                <Badge variant="destructive">Urgent</Badge>
              </div>

              <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Clock className="h-5 w-5 text-yellow-600" />
                  <div>
                    <p className="font-medium">MRI Maintenance</p>
                    <p className="text-sm text-gray-600">
                      Scheduled for tomorrow
                    </p>
                  </div>
                </div>
                <Badge variant="outline">Scheduled</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Button
                className="w-full justify-start"
                onClick={() => router.push("/admin/reports")}
              >
                <FileText className="h-4 w-4 mr-2" />
                Generate Reports
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => router.push("/admin/staff")}
              >
                <UserCheck className="h-4 w-4 mr-2" />
                Manage Staff
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => router.push("/admin/inventory")}
              >
                <LayoutDashboard className="h-4 w-4 mr-2" />
                View Inventory
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => router.push("/admin/billing")}
              >
                <DollarSign className="h-4 w-4 mr-2" />
                Billing Overview
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* System Status */}
        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="font-medium">EMR System</span>
                </div>
                <Badge variant="outline">Operational</Badge>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="font-medium">Lab System</span>
                </div>
                <Badge variant="outline">Operational</Badge>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="font-medium">Imaging System</span>
                </div>
                <Badge variant="outline">Operational</Badge>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></div>
                  <span className="font-medium">Pharmacy System</span>
                </div>
                <Badge variant="outline">Maintenance</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Service Performance Details */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Service Performance Details</CardTitle>
              <CardDescription>Revenue and growth by service</CardDescription>
            </div>
            <Button variant="outline" size="sm">
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium">Service</th>
                  <th className="text-left py-3 px-4 font-medium">Cases</th>
                  <th className="text-left py-3 px-4 font-medium">Revenue</th>
                  <th className="text-left py-3 px-4 font-medium">Growth</th>
                  <th className="text-left py-3 px-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {serviceStats.map((service) => (
                  <tr key={service.service} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 rounded-lg" style={{ backgroundColor: getServiceColor(service.service) + '20' }}>
                          {getServiceIcon(service.service)}
                        </div>
                        <span className="font-medium">{getServiceDisplayName(service.service)}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">{service.count.toLocaleString()}</td>
                    <td className="py-3 px-4 font-medium">{formatCurrency(service.revenue)}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center">
                        {service.growth >= 0 ? (
                          <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                        )}
                        <span className={service.growth >= 0 ? "text-green-600" : "text-red-600"}>
                          {Math.abs(service.growth).toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={service.growth >= 10 ? "default" : "outline"}>
                        {service.growth >= 10 ? "High Growth" : "Stable"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}