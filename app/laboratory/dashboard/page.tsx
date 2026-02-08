// app/laboratory/dashboard/page.tsx - UPDATED VERSION (No Financial Elements)
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import {
  Search,
  MoreVertical,
  Eye,
  TestTube,
  AlertTriangle,
  CheckCircle,
  Clock,
  Download,
  Printer,
  Mail,
  Plus,
  RefreshCw,
  Activity,
  FileCheck,
  Users,
  Calendar,
  TrendingUp,
} from "lucide-react";
import { format } from "date-fns";
import {
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
  LineChart,
  Line,
} from "recharts";
import { useAuthStore } from "@/store/useAuthStore";

interface LabTest {
  _id: string;
  testId: string;
  testName: string;
  category: string;
  patient: {
    name: string;
    patientId: string;
    phone: string;
  };
  doctor: {
    name: string;
    specialization: string;
  };
  status: string;
  priority: string;
  collectionStatus: string;
  processingStatus: string;
  verificationStatus: string;
  orderedAt: string;
  results?: {
    reportedAt?: string;
  };
}

interface DashboardStats {
  totalTestsToday: number;
  pendingCollection: number;
  pendingProcessing: number;
  pendingVerification: number;
  urgentTests: number;
  completedToday: number;
  monthlyTests: number;
  averageProcessingTime: number;
}

interface TestVolumeData {
  date: string;
  tests: number;
  completed: number;
}

export default function LaboratoryDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [tests, setTests] = useState<LabTest[]>([]);
  const [filteredTests, setFilteredTests] = useState<LabTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [testVolumeData, setTestVolumeData] = useState<TestVolumeData[]>([]);
  const [testCategoryData, setTestCategoryData] = useState<any[]>([]);
  const [timeRange, setTimeRange] = useState("month");

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

  useEffect(() => {
    fetchDashboardData();
  }, [timeRange]);

  useEffect(() => {
    filterTests();
  }, [searchQuery, statusFilter, priorityFilter, tests]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const { accessToken } = useAuthStore.getState();

      // Check if we have a token
      if (!accessToken) {
        console.error("No access token found");
        return;
      }

      const headers = {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      };

      // Fetch dashboard stats
      const statsResponse = await fetch(
        `/api/laboratory/dashboard?timeRange=${timeRange}`,
        {
          headers,
        },
      );

      if (!statsResponse.ok) {
        console.error("Failed to fetch dashboard data");
        return;
      }

      const statsData = await statsResponse.json();

      if (statsData.success) {
        setStats(statsData.data?.statistics || {});
      }

      // Fetch recent tests
      const testsResponse = await fetch(
        "/api/laboratory/tests?limit=10&sort=orderedAt",
        {
          headers,
        },
      );

      if (testsResponse.ok) {
        const testsData = await testsResponse.json();
        setTests(testsData.data || []);
        setFilteredTests(testsData.data || []);
      }

      // Fetch test volume data
      const volumeResponse = await fetch(
        `/api/laboratory/tests/volume?timeRange=${timeRange}`,
        {
          headers,
        },
      );

      if (volumeResponse.ok) {
        const volumeData = await volumeResponse.json();
        setTestVolumeData(volumeData.data || []);
      }

      // Fetch test category data
      const categoryResponse = await fetch("/api/laboratory/tests/categories", {
        headers,
      });

      if (categoryResponse.ok) {
        const categoryData = await categoryResponse.json();
        setTestCategoryData(categoryData.data?.categoryData || []);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterTests = () => {
    let filtered = [...tests];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (test) =>
          test.testId.toLowerCase().includes(query) ||
          test.testName.toLowerCase().includes(query) ||
          test.patient.name.toLowerCase().includes(query) ||
          test.patient.patientId.toLowerCase().includes(query) ||
          (test.doctor?.name || "").toLowerCase().includes(query),
      );
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((test) => test.status === statusFilter);
    }

    // Apply priority filter
    if (priorityFilter !== "all") {
      filtered = filtered.filter((test) => test.priority === priorityFilter);
    }

    setFilteredTests(filtered);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ordered":
        return "bg-blue-100 text-blue-800";
      case "collected":
        return "bg-yellow-100 text-yellow-800";
      case "processing":
        return "bg-purple-100 text-purple-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "reported":
        return "bg-emerald-100 text-emerald-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "emergency":
        return "bg-red-100 text-red-800 border-red-300";
      case "urgent":
        return "bg-orange-100 text-orange-800 border-orange-300";
      default:
        return "bg-blue-100 text-blue-800 border-blue-300";
    }
  };

  const getProcessingStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "in_progress":
        return "bg-blue-100 text-blue-800";
      case "completed":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="h-32" />
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="h-80" />
            </Card>
          ))}
        </div>
        <Card className="animate-pulse">
          <CardContent className="h-96" />
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Laboratory Dashboard
          </h1>
          <p className="text-muted-foreground">
            Overview of laboratory operations and test management
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-45">
              <SelectValue placeholder="Time Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={fetchDashboardData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tests</CardTitle>
            <TestTube className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.totalTestsToday || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {timeRange === "today"
                ? "Today"
                : timeRange === "week"
                  ? "This Week"
                  : timeRange === "month"
                    ? "This Month"
                    : timeRange === "quarter"
                      ? "This Quarter"
                      : "This Year"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Completed Today
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.completedToday || 0}
            </div>
            <p className="text-xs text-muted-foreground">Tests completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Tests</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.monthlyTests || 0}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg. Processing
            </CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.averageProcessingTime || 0}h
            </div>
            <p className="text-xs text-muted-foreground">Average time</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Test Volume Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Test Volume Trend</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={testVolumeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="tests"
                  stroke="#8884d8"
                  name="Total Tests"
                  activeDot={{ r: 8 }}
                />
                <Line
                  type="monotone"
                  dataKey="completed"
                  stroke="#82ca9d"
                  name="Completed"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Test Categories Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Tests by Category</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={testCategoryData}
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
                  {testCategoryData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Operational Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Collection
            </CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.pendingCollection || 0}
            </div>
            <p className="text-xs text-muted-foreground">Waiting for samples</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Processing</CardTitle>
            <Activity className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.pendingProcessing || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Currently being processed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Verification
            </CardTitle>
            <FileCheck className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.pendingVerification || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Awaiting verification
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Urgent Tests</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats?.urgentTests || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Require immediate attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Tests Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <CardTitle>Recent Tests</CardTitle>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:flex-none">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tests..."
                  className="pl-9 w-full md:w-62.5"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32.5">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="ordered">Ordered</SelectItem>
                  <SelectItem value="collected">Collected</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
              <Button asChild variant="outline" size="sm">
                <Link href="/laboratory/tests">View All</Link>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Test ID</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Test Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Processing</TableHead>
                  <TableHead>Ordered</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTests.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No tests found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTests.map((test) => (
                    <TableRow key={test._id}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/laboratory/tests/${test._id}`}
                          className="hover:text-primary hover:underline"
                        >
                          {test.testId}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{test.patient.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {test.patient.patientId}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{test.testName}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(test.status)}>
                          {test.status.charAt(0).toUpperCase() +
                            test.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={getPriorityColor(test.priority)}
                        >
                          {test.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={getProcessingStatusColor(
                            test.processingStatus,
                          )}
                        >
                          {test.processingStatus.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(test.orderedAt), "MMM dd, HH:mm")}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              ⋮
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/laboratory/tests/${test._id}`}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </Link>
                            </DropdownMenuItem>
                            {test.collectionStatus === "pending" && (
                              <DropdownMenuItem asChild>
                                <Link
                                  href={`/laboratory/tests/${test._id}/collect`}
                                >
                                  Collect Sample
                                </Link>
                              </DropdownMenuItem>
                            )}
                            {test.collectionStatus === "collected" &&
                              test.processingStatus === "pending" && (
                                <DropdownMenuItem asChild>
                                  <Link
                                    href={`/laboratory/tests/${test._id}/process`}
                                  >
                                    Process Test
                                  </Link>
                                </DropdownMenuItem>
                              )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              Showing {filteredTests.length} of {tests.length} recent tests
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/laboratory/tests">View All Tests</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Today's Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                Tests Ordered
              </span>
              <span className="font-medium">{stats?.totalTestsToday || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                Tests Completed
              </span>
              <span className="font-medium">{stats?.completedToday || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                Avg. Processing Time
              </span>
              <span className="font-medium">
                {stats?.averageProcessingTime || 0} hours
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Test Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Collected</span>
              <span className="font-medium text-green-600">
                {tests.filter((t) => t.collectionStatus === "collected").length}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                In Processing
              </span>
              <span className="font-medium text-blue-600">
                {
                  tests.filter((t) => t.processingStatus === "in_progress")
                    .length
                }
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                Pending Verification
              </span>
              <span className="font-medium text-yellow-600">
                {tests.filter((t) => t.verificationStatus === "pending").length}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/laboratory/tests?collectionStatus=pending">
                <Clock className="h-4 w-4 mr-2" />
                Pending Collection ({stats?.pendingCollection || 0})
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/laboratory/tests?processingStatus=pending&collectionStatus=collected">
                <Activity className="h-4 w-4 mr-2" />
                Processing Queue ({stats?.pendingProcessing || 0})
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/laboratory/tests?priority=urgent,emergency">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Urgent Tests ({stats?.urgentTests || 0})
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
