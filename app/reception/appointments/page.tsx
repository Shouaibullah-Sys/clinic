// app/reception/appointments/page.tsx

"use client";

import { useState, useEffect, useCallback } from "react";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  Stethoscope,
  Search,
  Filter,
  MoreVertical,
  Plus,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  RefreshCw,
  Download,
  CalendarDays,
  CalendarRange,
  ChevronDown,
} from "lucide-react";
import {
  format,
  parseISO,
  isToday,
  isPast,
  isFuture,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addDays,
  subDays,
} from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface Appointment {
  _id: string;
  appointmentId: string;
  patient: {
    _id: string;
    name: string;
    phone: string;
    email: string;
    patientId: string;
  };
  doctor: {
    _id: string;
    name: string;
    specialization: string;
    department: string;
  };
  appointmentType: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  status: string;
  reason: string;
  priority: string;
  notes?: string;
  checkInTime?: string;
  checkOutTime?: string;
  createdAt: string;
  updatedAt: string;
}

interface Doctor {
  _id: string;
  name: string;
  specialization: string;
  department: string;
}

interface TimeRange {
  label: string;
  value: string;
  startDate: Date;
  endDate: Date;
}

export default function AppointmentsPage() {
  const router = useRouter();
  const { user, accessToken, isAuthenticated, isLoading } = useAuthStore();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date(),
  );
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedDoctor, setSelectedDoctor] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [markedSet, setMarkedSet] = useState<Set<string>>(new Set());

  // Add time range filter state
  const [timeRange, setTimeRange] = useState<TimeRange>({
    label: "Today",
    value: "today",
    startDate: new Date(),
    endDate: new Date(),
  });

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

  // Initialize time range on component mount
  useEffect(() => {
    updateTimeRange("today");
  }, []);

  useEffect(() => {
    fetchAppointments();
    fetchDoctors();
  }, [page, timeRange, selectedStatus, selectedDoctor, activeSearch]);

  const fetchMarked = useCallback(async () => {
    try {
      if (!accessToken) return;
      const response = await fetch("/api/reception/marked-transactions?module=appointment", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });
      const data = await response.json();
      if (data.success && Array.isArray(data.data)) {
        const nextSet = new Set<string>();
        data.data.forEach((item: any) => {
          if (item.transactionId) {
            nextSet.add(item.transactionId);
          }
        });
        setMarkedSet(nextSet);
      }
    } catch (error) {
      console.error("Failed loading marked appointments", error);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchMarked();
  }, [fetchMarked]);

  const toggleMarked = useCallback(
    async (appointment: Appointment) => {
      if (!accessToken) return;
      const currentlyMarked = markedSet.has(appointment._id);

      try {
        if (currentlyMarked) {
          await fetch("/api/reception/marked-transactions", {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              module: "appointment",
              transactionId: appointment._id,
            }),
          });
          setMarkedSet((prev) => {
            const next = new Set(prev);
            next.delete(appointment._id);
            return next;
          });
        } else {
          await fetch("/api/reception/marked-transactions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              module: "appointment",
              transactionId: appointment._id,
              transactionDate: appointment.startTime || appointment.date || new Date().toISOString(),
            }),
          });
          setMarkedSet((prev) => new Set(prev).add(appointment._id));
        }
      } catch (error) {
        console.error("Failed to toggle mark", error);
        toast.error("Failed to update mark");
      }
    },
    [accessToken, markedSet],
  );

  // Reset page to 1 when filters change (except page itself)
  useEffect(() => {
    setPage(1);
  }, [timeRange, selectedStatus, selectedDoctor, activeSearch]);

  const updateTimeRange = (range: string) => {
    const today = new Date();
    let startDate = new Date();
    let endDate = new Date();

    switch (range) {
      case "today":
        startDate = today;
        endDate = today;
        setTimeRange({
          label: "Today",
          value: "today",
          startDate,
          endDate,
        });
        setSelectedDate(today);
        break;
      case "tomorrow":
        startDate = addDays(today, 1);
        endDate = addDays(today, 1);
        setTimeRange({
          label: "Tomorrow",
          value: "tomorrow",
          startDate,
          endDate,
        });
        setSelectedDate(startDate);
        break;
      case "this-week":
        startDate = startOfWeek(today, { weekStartsOn: 1 }); // Monday
        endDate = endOfWeek(today, { weekStartsOn: 1 }); // Sunday
        setTimeRange({
          label: "This Week",
          value: "this-week",
          startDate,
          endDate,
        });
        setSelectedDate(today);
        break;
      case "next-week":
        startDate = startOfWeek(addDays(today, 7), { weekStartsOn: 1 });
        endDate = endOfWeek(addDays(today, 7), { weekStartsOn: 1 });
        setTimeRange({
          label: "Next Week",
          value: "next-week",
          startDate,
          endDate,
        });
        setSelectedDate(startDate);
        break;
      case "this-month":
        startDate = startOfMonth(today);
        endDate = endOfMonth(today);
        setTimeRange({
          label: "This Month",
          value: "this-month",
          startDate,
          endDate,
        });
        setSelectedDate(today);
        break;
      case "next-month":
        startDate = startOfMonth(addDays(today, 31));
        endDate = endOfMonth(addDays(today, 31));
        setTimeRange({
          label: "Next Month",
          value: "next-month",
          startDate,
          endDate,
        });
        setSelectedDate(startDate);
        break;
      case "all":
        setTimeRange({
          label: "All Time",
          value: "all",
          startDate: new Date(0), // Beginning of time
          endDate: new Date(8640000000000000), // Far future
        });
        setSelectedDate(undefined);
        break;
      default:
        break;
    }
  };

  const fetchAppointments = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
      });

      // Only add date range if not "all" time
      if (timeRange.value !== "all") {
        params.set(
          "startDate",
          timeRange.startDate.toISOString().split("T")[0],
        );
        params.set("endDate", timeRange.endDate.toISOString().split("T")[0]);
      }

      if (selectedStatus !== "all") {
        params.set("status", selectedStatus);
      }

      if (selectedDoctor !== "all") {
        params.set("doctorId", selectedDoctor);
      }

      // Add active search query if provided
      if (activeSearch.trim()) {
        params.set("search", activeSearch.trim());
      }

      const response = await fetch(`/api/appointments?${params.toString()}`, {
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
      });

      const data = await response.json();

      if (data.success) {
        setAppointments(data.data);
        setTotalPages(data.pagination?.pages || 1);
      }
    } catch (error) {
      console.error("Error fetching appointments:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDoctors = async () => {
    try {
      const response = await fetch("/api/users?role=doctor&active=true", {
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
      });

      const data = await response.json();

      if (data.success) {
        setDoctors(data.data);
      }
    } catch (error) {
      console.error("Error fetching doctors:", error);
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
        fetchAppointments();
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
        fetchAppointments();
      }
    } catch (error) {
      console.error("Error checking out:", error);
    }
  };

  const handleCancelAppointment = async () => {
    if (!selectedAppointment) return;

    try {
      const response = await fetch(
        `/api/appointments/${selectedAppointment._id}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          body: JSON.stringify({ reason: cancelReason }),
        },
      );

      const data = await response.json();

      if (data.success) {
        setCancelDialogOpen(false);
        setCancelReason("");
        setSelectedAppointment(null);
        fetchAppointments();
      }
    } catch (error) {
      console.error("Error cancelling appointment:", error);
    }
  };

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
      case "cancelled":
        return (
          <Badge
            variant="outline"
            className="bg-red-50 text-red-700 border-red-200"
          >
            Cancelled
          </Badge>
        );
      case "no-show":
        return (
          <Badge
            variant="outline"
            className="bg-orange-50 text-orange-700 border-orange-200"
          >
            No Show
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "emergency":
        return <Badge variant="destructive">Emergency</Badge>;
      case "high":
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-gray-900">
            High
          </Badge>
        );
      case "medium":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-gray-900">
            Medium
          </Badge>
        );
      case "low":
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            Low
          </Badge>
        );
      default:
        return <Badge variant="secondary">{priority}</Badge>;
    }
  };

  // Calculate stats based on current time range
  const calculateStats = () => {
    const todayAppointments = appointments.filter((a) =>
      isToday(parseISO(a.date)),
    );
    const waitingPatients = appointments.filter(
      (a) => a.status === "checked-in",
    );
    const completedToday = appointments.filter(
      (a) => a.status === "completed" && isToday(parseISO(a.date)),
    );
    const noShows = appointments.filter((a) => a.status === "no-show");

    // Calculate range-specific stats
    const rangeAppointments = appointments.filter((a) => {
      const appointmentDate = parseISO(a.date);
      return (
        appointmentDate >= timeRange.startDate &&
        appointmentDate <= timeRange.endDate
      );
    });

    const upcomingAppointments = rangeAppointments.filter(
      (a) =>
        isFuture(parseISO(a.date)) ||
        (isToday(parseISO(a.date)) &&
          a.status !== "completed" &&
          a.status !== "cancelled"),
    );

    return {
      totalToday: todayAppointments.length,
      waiting: waitingPatients.length,
      completed: completedToday.length,
      noShows: noShows.length,
      rangeTotal: rangeAppointments.length,
      upcoming: upcomingAppointments.length,
    };
  };

  const stats = calculateStats();

  // Since we're now doing server-side filtering, filteredAppointments is just appointments
  const filteredAppointments = appointments;

  if (loading && appointments.length === 0) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-64" />
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
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Appointments</h1>
          <p className="text-gray-500 mt-1">
            Manage and track patient appointments
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={fetchAppointments}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => router.push("/reception/appointments/new")}>
            <Plus className="h-4 w-4 mr-2" />
            New Appointment
          </Button>
        </div>
      </div>

      {/* Time Range Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <CalendarDays className="h-5 w-5 text-gray-500" />
              <div>
                <h3 className="font-medium">Time Range</h3>
                <p className="text-sm text-gray-500">
                  Showing appointments for {timeRange.label}
                  {timeRange.value !== "all" && (
                    <span className="ml-1">
                      ({format(timeRange.startDate, "MMM d, yyyy")} -{" "}
                      {format(timeRange.endDate, "MMM d, yyyy")})
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <CalendarRange className="h-4 w-4" />
                    {timeRange.label}
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>Select Time Range</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => updateTimeRange("today")}>
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    Today
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => updateTimeRange("tomorrow")}>
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    Tomorrow
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => updateTimeRange("this-week")}
                  >
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    This Week
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => updateTimeRange("next-week")}
                  >
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    Next Week
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => updateTimeRange("this-month")}
                  >
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    This Month
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => updateTimeRange("next-month")}
                  >
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    Next Month
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => updateTimeRange("all")}>
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    All Time
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span>Total in Range</span>
              <Badge variant="outline" className="text-xs">
                {timeRange.label}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.rangeTotal}</div>
            <p className="text-xs text-gray-500">
              Appointments in selected range
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.upcoming}</div>
            <p className="text-xs text-gray-500">Upcoming appointments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Waiting</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.waiting}</div>
            <p className="text-xs text-gray-500">Patients waiting</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Completed Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completed}</div>
            <p className="text-xs text-gray-500">Today's completed</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative flex gap-2">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search patients, doctors..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setActiveSearch(searchQuery);
                      setPage(1);
                    }
                  }}
                  className="pl-9"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setActiveSearch(searchQuery);
                    setPage(1);
                  }}
                >
                  Search
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Specific Date</Label>
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  type="date"
                  value={selectedDate?.toISOString().split("T")[0]}
                  onChange={(e) =>
                    setSelectedDate(
                      e.target.value ? new Date(e.target.value) : undefined,
                    )
                  }
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="checked-in">Checked In</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Doctor</Label>
              <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
                <SelectTrigger>
                  <SelectValue placeholder="All Doctors" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Doctors</SelectItem>
                  {doctors.map((doctor) => (
                    <SelectItem key={doctor._id} value={doctor._id}>
                      Dr. {doctor.name} - {doctor.specialization}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Appointments Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>Appointments List</CardTitle>
              <CardDescription>
                Showing {filteredAppointments.length} of {appointments.length}{" "}
                appointments for {timeRange.label}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Export functionality can be added here
                  console.log("Export clicked");
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Doctor</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Marked</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAppointments.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      className="text-center py-12 text-gray-500"
                    >
                      <div className="flex flex-col items-center justify-center">
                        <CalendarDays className="h-12 w-12 text-gray-300 mb-4" />
                        <p className="text-lg font-medium mb-2">
                          No appointments found
                        </p>
                        <p className="text-sm text-gray-500 mb-4">
                          Try adjusting your filters or select a different time
                          range
                        </p>
                        <Button
                          variant="outline"
                          onClick={() => {
                            updateTimeRange("all");
                            setSearchQuery("");
                            setActiveSearch("");
                            setSelectedStatus("all");
                            setSelectedDoctor("all");
                            setPage(1);
                          }}
                        >
                          Clear All Filters
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAppointments.map((appointment) => (
                    <TableRow
                      key={appointment._id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                      onClick={() =>
                        router.push(
                          `/reception/appointments/${appointment._id}`,
                        )
                      }
                    >
                      <TableCell className="font-medium">
                        {appointment.appointmentId}
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
                        <div>
                          <p className="font-medium">
                            {appointment.doctor?.name
                              ? `Dr. ${appointment.doctor.name}`
                              : "Not assigned"}
                          </p>
                          <p className="text-sm text-gray-500">
                            {appointment.doctor?.specialization || "N/A"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {format(parseISO(appointment.date), "MMM d, yyyy")}
                          </p>
                          <p className="text-sm text-gray-500">
                            {appointment.startTime} - {appointment.endTime}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {appointment.appointmentType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(appointment.status)}
                      </TableCell>
                      <TableCell>
                        {getPriorityBadge(appointment.priority)}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant={markedSet.has(appointment._id) ? "default" : "outline"}
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleMarked(appointment);
                          }}
                        >
                          {markedSet.has(appointment._id) ? "Marked" : "Mark"}
                        </Button>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(
                                  `/reception/appointments/${appointment._id}`,
                                );
                              }}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            {appointment.status === "scheduled" && (
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCheckIn(appointment._id);
                                }}
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Check In
                              </DropdownMenuItem>
                            )}
                            {appointment.status === "checked-in" && (
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCheckOut(appointment._id);
                                }}
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Check Out
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedAppointment(appointment);
                                setCancelDialogOpen(true);
                              }}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Cancel Appointment
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Page {page} of {totalPages} • Showing {filteredAppointments.length}{" "}
            appointments
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Cancel Appointment Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Appointment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this appointment? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="cancelReason">Reason for Cancellation</Label>
              <Input
                id="cancelReason"
                placeholder="Enter reason for cancellation..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              />
            </div>
            {selectedAppointment && (
              <div className="border rounded-lg p-4">
                <h4 className="font-semibold mb-2">Appointment Details</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-gray-500">Patient</p>
                    <p className="font-medium">
                      {selectedAppointment.patient.name}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Doctor</p>
                    <p className="font-medium">
                      {selectedAppointment.doctor?.name
                        ? `Dr. ${selectedAppointment.doctor.name}`
                        : "Not assigned"}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Date</p>
                    <p className="font-medium">
                      {format(
                        parseISO(selectedAppointment.date),
                        "MMM d, yyyy",
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Time</p>
                    <p className="font-medium">
                      {selectedAppointment.startTime} -{" "}
                      {selectedAppointment.endTime}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-gray-500">Reason</p>
                    <p className="font-medium">{selectedAppointment.reason}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelAppointment}
              className="bg-red-600 hover:bg-red-700"
            >
              Yes, Cancel Appointment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
