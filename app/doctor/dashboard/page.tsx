// app/doctor/dashboard/page.tsx

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Search,
  User,
  Calendar,
  Clock,
  Stethoscope,
  Users,
  FileText,
  Eye,
  Plus,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle,
  TrendingUp,
  DollarSign,
  Pilcrow,
} from "lucide-react";
import { format, parseISO } from "date-fns";

interface Appointment {
  _id: string;
  appointmentId: string;
  patient: {
    _id: string;
    name: string;
    phone: string;
    email: string;
    patientId: string;
    dateOfBirth: string;
    gender: string;
  };
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  status: string;
  reason: string;
  priority: string;
  checkInTime?: string;
  checkOutTime?: string;
}

interface Patient {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  patientId: string;
  dateOfBirth: string;
  gender: string;
  lastVisit?: string;
  totalVisits: number;
}

export default function DoctorDashboardPage() {
  const router = useRouter();
  const { user, accessToken } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [stats, setStats] = useState({
    todayAppointments: 0,
    pendingAppointments: 0,
    totalPatients: 0,
    completedToday: 0,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTab, setSelectedTab] = useState("overview");
  const [error, setError] = useState<string | null>(null);

  // Redirect if not doctor
  useEffect(() => {
    if (user && user.role !== "doctor") {
      router.push("/unauthorized");
    }
  }, [user, router]);

  // Fetch doctor's data
  useEffect(() => {
    if (user?.role === "doctor" && accessToken) {
      fetchDoctorData();
    }
  }, [user, accessToken]);

  const fetchDoctorData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch today's appointments
      const appointmentsRes = await fetch("/api/doctor/appointments/today", {
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
      });

      const appointmentsData = await appointmentsRes.json();

      if (appointmentsData.success) {
        setAppointments(appointmentsData.data);

        // Calculate stats from appointments
        const today = new Date().toISOString().split("T")[0];
        const todayApps = appointmentsData.data.filter(
          (a: Appointment) => a.date.split("T")[0] === today,
        );

        setStats({
          todayAppointments: todayApps.length,
          pendingAppointments: appointmentsData.data.filter((a: Appointment) =>
            ["scheduled", "confirmed", "checked-in"].includes(a.status),
          ).length,
          totalPatients: new Set(
            appointmentsData.data.map((a: Appointment) => a.patient._id),
          ).size,
          completedToday: appointmentsData.data.filter(
            (a: Appointment) =>
              a.status === "completed" && a.date.split("T")[0] === today,
          ).length,
        });
      }

      // Fetch doctor's patients
      const patientsRes = await fetch("/api/doctor/patients", {
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
      });

      const patientsData = await patientsRes.json();

      if (patientsData.success) {
        setPatients(patientsData.data);
      }
    } catch (error) {
      console.error("Error fetching doctor data:", error);
      setError("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const filteredAppointments = appointments.filter((appointment) => {
    if (!searchQuery) return true;

    const query = searchQuery.toLowerCase();
    return (
      appointment.patient.name.toLowerCase().includes(query) ||
      appointment.patient.phone.toLowerCase().includes(query) ||
      appointment.reason.toLowerCase().includes(query)
    );
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "scheduled":
        return (
          <Badge
            variant="outline"
            className="bg-blue-50 text-blue-700 border-blue-200"
          >
            Scheduled
          </Badge>
        );
      case "confirmed":
        return (
          <Badge
            variant="outline"
            className="bg-green-50 text-green-700 border-green-200"
          >
            Confirmed
          </Badge>
        );
      case "checked-in":
        return (
          <Badge
            variant="outline"
            className="bg-purple-50 text-purple-700 border-purple-200"
          >
            Checked In
          </Badge>
        );
      case "in-progress":
        return (
          <Badge
            variant="outline"
            className="bg-yellow-50 text-yellow-700 border-yellow-200"
          >
            In Progress
          </Badge>
        );
      case "completed":
        return (
          <Badge
            variant="outline"
            className="bg-gray-50 text-gray-700 border-gray-200"
          >
            Completed
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatTime = (dateString: string) => {
    try {
      return format(parseISO(dateString), "h:mm a");
    } catch {
      return "Invalid time";
    }
  };

  const handleCheckIn = async (appointmentId: string) => {
    try {
      const response = await fetch(
        `/api/appointments/${appointmentId}/checkin`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
        },
      );

      const data = await response.json();
      if (data.success) {
        fetchDoctorData();
      }
    } catch (error) {
      console.error("Error checking in:", error);
    }
  };

  const handleCheckOut = async (appointmentId: string) => {
    try {
      const response = await fetch(
        `/api/appointments/${appointmentId}/checkout`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
        },
      );

      const data = await response.json();
      if (data.success) {
        fetchDoctorData();
      }
    } catch (error) {
      console.error("Error checking out:", error);
    }
  };

  if (!user || user.role !== "doctor") {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Unauthorized Access</h2>
          <p className="text-gray-600">
            You don't have permission to access this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Doctor Dashboard</h1>
          <p className="text-gray-500 mt-1">Welcome back, Dr. {user.name}!</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={fetchDoctorData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => router.push("/doctor/appointments")}>
            <Calendar className="h-4 w-4 mr-2" />
            View All Appointments
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Today's Appointments
                </p>
                <p className="text-2xl font-bold mt-1">
                  {stats.todayAppointments}
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold mt-1">
                  {stats.pendingAppointments}
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Patients
                </p>
                <p className="text-2xl font-bold mt-1">{stats.totalPatients}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                <Users className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Completed Today
                </p>
                <p className="text-2xl font-bold mt-1">
                  {stats.completedToday}
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs
        value={selectedTab}
        onValueChange={setSelectedTab}
        className="space-y-6"
      >
        <TabsList>
          <TabsTrigger value="overview">Today's Schedule</TabsTrigger>
          <TabsTrigger value="patients">My Patients</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        {/* Today's Schedule Tab */}
        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle>Today's Appointments</CardTitle>
                  <CardDescription>
                    Your schedule for {format(new Date(), "MMMM d, yyyy")}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search patients..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 w-48"
                    />
                  </div>
                  <Select defaultValue="all">
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : filteredAppointments.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    No Appointments Today
                  </h3>
                  <p className="text-gray-500">
                    {searchQuery
                      ? "No appointments match your search"
                      : "You have no appointments scheduled for today"}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>Patient</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAppointments.map((appointment) => (
                        <TableRow key={appointment._id}>
                          <TableCell>
                            <div className="font-medium">
                              {formatTime(appointment.startTime)}
                            </div>
                            <div className="text-sm text-gray-500">
                              {appointment.duration} min
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">
                                {appointment.patient.name}
                              </p>
                              <p className="text-sm text-gray-500">
                                {appointment.patient.phone}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <p className="truncate max-w-xs">
                              {appointment.reason}
                            </p>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                appointment.priority === "emergency"
                                  ? "destructive"
                                  : appointment.priority === "high"
                                    ? "default"
                                    : "outline"
                              }
                            >
                              {appointment.priority}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(appointment.status)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  router.push(
                                    `/doctor/patients/${appointment.patient._id}`,
                                  )
                                }
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {["scheduled", "confirmed"].includes(
                                appointment.status,
                              ) && (
                                <Button
                                  size="sm"
                                  onClick={() => handleCheckIn(appointment._id)}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  Check In
                                </Button>
                              )}
                              {appointment.status === "checked-in" && (
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    handleCheckOut(appointment._id)
                                  }
                                  className="bg-blue-600 hover:bg-blue-700"
                                >
                                  Check Out
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Appointment Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-blue-500"></div>
                      <span>Scheduled</span>
                    </div>
                    <span className="font-medium">
                      {
                        filteredAppointments.filter(
                          (a) => a.status === "scheduled",
                        ).length
                      }
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-green-500"></div>
                      <span>Confirmed</span>
                    </div>
                    <span className="font-medium">
                      {
                        filteredAppointments.filter(
                          (a) => a.status === "confirmed",
                        ).length
                      }
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-purple-500"></div>
                      <span>Checked In</span>
                    </div>
                    <span className="font-medium">
                      {
                        filteredAppointments.filter(
                          (a) => a.status === "checked-in",
                        ).length
                      }
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-gray-500"></div>
                      <span>Completed</span>
                    </div>
                    <span className="font-medium">
                      {
                        filteredAppointments.filter(
                          (a) => a.status === "completed",
                        ).length
                      }
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Priority Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Emergency</span>
                      <span>
                        {
                          filteredAppointments.filter(
                            (a) => a.priority === "emergency",
                          ).length
                        }
                      </span>
                    </div>
                    <Progress
                      value={
                        (filteredAppointments.filter(
                          (a) => a.priority === "emergency",
                        ).length /
                          filteredAppointments.length) *
                        100
                      }
                      className="h-2 bg-red-100"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>High</span>
                      <span>
                        {
                          filteredAppointments.filter(
                            (a) => a.priority === "high",
                          ).length
                        }
                      </span>
                    </div>
                    <Progress
                      value={
                        (filteredAppointments.filter(
                          (a) => a.priority === "high",
                        ).length /
                          filteredAppointments.length) *
                        100
                      }
                      className="h-2 bg-orange-100"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Medium</span>
                      <span>
                        {
                          filteredAppointments.filter(
                            (a) => a.priority === "medium",
                          ).length
                        }
                      </span>
                    </div>
                    <Progress
                      value={
                        (filteredAppointments.filter(
                          (a) => a.priority === "medium",
                        ).length /
                          filteredAppointments.length) *
                        100
                      }
                      className="h-2 bg-yellow-100"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Low</span>
                      <span>
                        {
                          filteredAppointments.filter(
                            (a) => a.priority === "low",
                          ).length
                        }
                      </span>
                    </div>
                    <Progress
                      value={
                        (filteredAppointments.filter(
                          (a) => a.priority === "low",
                        ).length /
                          filteredAppointments.length) *
                        100
                      }
                      className="h-2 bg-green-100"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* My Patients Tab */}
        <TabsContent value="patients" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle>My Patients</CardTitle>
                  <CardDescription>
                    Patients you have treated or are currently treating
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search patients..."
                      className="pl-9 w-48"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : patients.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    No Patients Yet
                  </h3>
                  <p className="text-gray-500">
                    You haven't treated any patients yet. Patients will appear
                    here after appointments.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Patient ID</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Gender</TableHead>
                        <TableHead>Date of Birth</TableHead>
                        <TableHead>Last Visit</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {patients.map((patient) => (
                        <TableRow
                          key={patient._id}
                          className="cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() =>
                            router.push(`/doctor/patients/${patient._id}`)
                          }
                        >
                          <TableCell className="font-medium">
                            {patient.patientId}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{patient.name}</p>
                              {patient.email && (
                                <p className="text-sm text-gray-500">
                                  {patient.email}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <p className="font-medium">{patient.phone}</p>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {patient.gender}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {format(
                              parseISO(patient.dateOfBirth),
                              "MMM d, yyyy",
                            )}
                          </TableCell>
                          <TableCell>
                            {patient.lastVisit ? (
                              <div className="flex items-center gap-2">
                                <Calendar className="h-3 w-3 text-gray-400" />
                                {format(
                                  parseISO(patient.lastVisit),
                                  "MMM d, yyyy",
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-400">Never</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/doctor/patients/${patient._id}`);
                              }}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Report</CardTitle>
              <CardDescription>
                Your performance and statistics for this month
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">
                          Total Consultations
                        </p>
                        <p className="text-2xl font-bold mt-1">42</p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-blue-600" />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      +12% from last month
                    </p>
                  </div>

                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">
                          Revenue
                        </p>
                        <p className="text-2xl font-bold mt-1">$4,200</p>
                      </div>
                      <DollarSign className="h-8 w-8 text-green-600" />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      +8% from last month
                    </p>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <h3 className="font-semibold mb-4">Patient Demographics</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Male</span>
                        <span>58%</span>
                      </div>
                      <Progress value={58} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Female</span>
                        <span>42%</span>
                      </div>
                      <Progress value={42} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Children (0-12)</span>
                        <span>35%</span>
                      </div>
                      <Progress value={35} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Adults (13-59)</span>
                        <span>50%</span>
                      </div>
                      <Progress value={50} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Seniors (60+)</span>
                        <span>15%</span>
                      </div>
                      <Progress value={15} className="h-2" />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card
          className="cursor-pointertransition-colors"
          onClick={() => router.push("/doctor/appointments")}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  All Appointments
                </p>
                <p className="text-lg font-bold mt-1">View Full Schedule</p>
              </div>
              <Calendar className="h-5 w-5 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:bg:dark:background transition-colors"
          onClick={() => router.push("/doctor/prescriptions")}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Prescriptions
                </p>
                <p className="text-lg font-bold mt-1">Write Prescription</p>
              </div>
              <Pilcrow className="h-5 w-5 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer transition-colors"
          onClick={() => router.push("/doctor/medical-records")}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Medical Records
                </p>
                <p className="text-lg font-bold mt-1">View Records</p>
              </div>
              <FileText className="h-5 w-5 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
