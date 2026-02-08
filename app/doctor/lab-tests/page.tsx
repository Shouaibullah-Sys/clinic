// app/doctor/lab-tests/page.tsx

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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Search,
  Filter,
  Eye,
  Plus,
  RefreshCw,
  TestTube,
  Calendar,
  User,
  Stethoscope,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  Download,
  Printer,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface LabTest {
  _id: string;
  testId: string;
  testName: string;
  category: string;
  price: number;
  priority: string;
  status: string;
  collectionStatus: string;
  paymentVerified: boolean;
  orderedAt: string;
  patient: {
    _id: string;
    name: string;
    patientId: string;
    phone?: string;
  };
  appointment?: {
    _id: string;
    appointmentId: string;
    date: string;
  };
  doctor: {
    _id: string;
    name: string;
    specialization?: string;
  };
  orderedBy: {
    _id: string;
    name: string;
  };
  results?: any;
}

interface Patient {
  _id: string;
  name: string;
  patientId: string;
}

interface Appointment {
  _id: string;
  appointmentId: string;
  date: string;
  patient: Patient;
}

const COMMON_TESTS = [
  { name: "Complete Blood Count (CBC)", category: "hematology", price: 25 },
  { name: "Basic Metabolic Panel", category: "blood_test", price: 35 },
  { name: "Lipid Profile", category: "blood_test", price: 40 },
  { name: "Liver Function Test", category: "blood_test", price: 38 },
  { name: "Thyroid Function Test", category: "hormone_test", price: 45 },
  { name: "Urinalysis", category: "urine_test", price: 20 },
  { name: "HbA1c", category: "blood_test", price: 28 },
  { name: "Culture and Sensitivity", category: "culture", price: 30 },
  { name: "X-ray Chest", category: "imaging", price: 50 },
  { name: "ECG", category: "imaging", price: 35 },
];

const TEST_CATEGORIES = [
  { value: "hematology", label: "Hematology" },
  { value: "blood_test", label: "Blood Test" },
  { value: "urine_test", label: "Urine Test" },
  { value: "stool_test", label: "Stool Test" },
  { value: "imaging", label: "Imaging" },
  { value: "biopsy", label: "Biopsy" },
  { value: "culture", label: "Culture" },
  { value: "hormone_test", label: "Hormone Test" },
  { value: "genetic_test", label: "Genetic Test" },
  { value: "other", label: "Other" },
];

const SPECIMEN_TYPES = ["blood", "urine", "stool", "tissue", "saliva", "other"];

export default function DoctorLabTestsPage() {
  const router = useRouter();
  const { user, accessToken } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [labTests, setLabTests] = useState<LabTest[]>([]);
  const [filteredTests, setFilteredTests] = useState<LabTest[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<string | null>(
    null,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [dateRange, setDateRange] = useState("month");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10;

  // New test form state
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false);
  const [newTest, setNewTest] = useState({
    appointmentId: "",
    testName: "",
    category: "blood_test",
    description: "",
    price: "",
    priority: "routine",
    notes: "",
    specimenType: "blood",
  });

  // Redirect if not doctor
  useEffect(() => {
    if (user && user.role !== "doctor") {
      router.push("/unauthorized");
    }
  }, [user, router]);

  // Fetch data on component mount
  useEffect(() => {
    if (user?.role === "doctor" && accessToken) {
      fetchLabTests();
      fetchAppointments();
    }
  }, [user, accessToken, currentPage, dateRange]);

  // Filter tests when filters change
  useEffect(() => {
    let filtered = labTests;

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (test) =>
          test.testName.toLowerCase().includes(query) ||
          test.testId.toLowerCase().includes(query) ||
          test.patient.name.toLowerCase().includes(query) ||
          test.patient.patientId.toLowerCase().includes(query),
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

    // Apply patient filter
    if (selectedPatient) {
      filtered = filtered.filter(
        (test) => test.patient._id === selectedPatient,
      );
    }

    // Apply appointment filter
    if (selectedAppointment) {
      filtered = filtered.filter(
        (test) => test.appointment?._id === selectedAppointment,
      );
    }

    setFilteredTests(filtered);
  }, [
    labTests,
    searchQuery,
    statusFilter,
    priorityFilter,
    selectedPatient,
    selectedAppointment,
  ]);

  const fetchLabTests = async () => {
    try {
      setLoading(true);
      setError(null);

      let url = `/api/doctor/lab-tests?page=${currentPage}&limit=${itemsPerPage}`;

      // Add date range filter
      const today = new Date();
      let startDate = new Date();

      switch (dateRange) {
        case "today":
          startDate.setHours(0, 0, 0, 0);
          break;
        case "week":
          startDate.setDate(today.getDate() - 7);
          break;
        case "month":
          startDate.setMonth(today.getMonth() - 1);
          break;
        case "quarter":
          startDate.setMonth(today.getMonth() - 3);
          break;
      }

      if (dateRange !== "all") {
        url += `&dateFrom=${startDate.toISOString()}`;
      }

      const response = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
      });

      const data = await response.json();

      if (data.success) {
        setLabTests(data.data);
        setTotalPages(data.pagination?.pages || 1);
      } else {
        throw new Error(data.error || "Failed to fetch lab tests");
      }
    } catch (error: any) {
      console.error("Error fetching lab tests:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAppointments = async () => {
    try {
      // Fetch recent appointments for ordering tests
      const response = await fetch("/api/doctor/appointments/today", {
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
      });

      const data = await response.json();

      if (data.success) {
        setAppointments(data.data);
      }
    } catch (error) {
      console.error("Error fetching appointments:", error);
    }
  };

  const handleOrderTest = async () => {
    try {
      setSubmitting(true);
      setError(null);

      if (!newTest.appointmentId || !newTest.testName || !newTest.price) {
        setError("Please fill in all required fields");
        return;
      }

      const response = await fetch("/api/doctor/lab-tests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify(newTest),
      });

      const data = await response.json();

      if (data.success) {
        // Reset form and close dialog
        setNewTest({
          appointmentId: "",
          testName: "",
          category: "blood_test",
          description: "",
          price: "",
          priority: "routine",
          notes: "",
          specimenType: "blood",
        });
        setIsOrderDialogOpen(false);

        // Refresh data
        fetchLabTests();

        // Show success message
        alert("Lab test ordered successfully!");
      } else {
        throw new Error(data.error || "Failed to order lab test");
      }
    } catch (error: any) {
      console.error("Error ordering lab test:", error);
      setError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ordered":
        return (
          <Badge
            variant="outline"
            className="bg-blue-50 text-blue-700 border-blue-200"
          >
            Ordered
          </Badge>
        );
      case "collected":
        return (
          <Badge
            variant="outline"
            className="bg-purple-50 text-purple-700 border-purple-200"
          >
            Collected
          </Badge>
        );
      case "processing":
        return (
          <Badge
            variant="outline"
            className="bg-yellow-50 text-yellow-700 border-yellow-200"
          >
            Processing
          </Badge>
        );
      case "completed":
        return (
          <Badge
            variant="outline"
            className="bg-green-50 text-green-700 border-green-200"
          >
            Completed
          </Badge>
        );
      case "reported":
        return (
          <Badge
            variant="outline"
            className="bg-green-50 text-green-700 border-green-200"
          >
            Reported
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
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "emergency":
        return <Badge variant="destructive">Emergency</Badge>;
      case "urgent":
        return (
          <Badge className="bg-orange-500 hover:bg-orange-600">Urgent</Badge>
        );
      case "routine":
        return <Badge variant="secondary">Routine</Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  };

  const getCollectionStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge
            variant="outline"
            className="bg-yellow-50 text-yellow-700 border-yellow-200"
          >
            Pending
          </Badge>
        );
      case "scheduled":
        return (
          <Badge
            variant="outline"
            className="bg-blue-50 text-blue-700 border-blue-200"
          >
            Scheduled
          </Badge>
        );
      case "collected":
        return (
          <Badge
            variant="outline"
            className="bg-green-50 text-green-700 border-green-200"
          >
            Collected
          </Badge>
        );
      case "rejected":
        return (
          <Badge
            variant="outline"
            className="bg-red-50 text-red-700 border-red-200"
          >
            Rejected
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMM d, yyyy HH:mm");
    } catch {
      return "Invalid date";
    }
  };

  const selectCommonTest = (test: (typeof COMMON_TESTS)[0]) => {
    setNewTest((prev) => ({
      ...prev,
      testName: test.name,
      category: test.category,
      price: test.price.toString(),
    }));
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  if (!user || user.role !== "doctor") {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
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
          <h1 className="text-2xl md:text-3xl font-bold">
            Lab Tests Management
          </h1>
          <p className="text-gray-500 mt-1">
            Order and manage laboratory tests for your patients
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={fetchLabTests}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Dialog open={isOrderDialogOpen} onOpenChange={setIsOrderDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Order New Test
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <TestTube className="h-5 w-5" />
                  Order Lab Test
                </DialogTitle>
                <DialogDescription>
                  Order a new laboratory test for your patient
                </DialogDescription>
              </DialogHeader>

              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-4">
                {/* Appointment Selection */}
                <div className="space-y-2">
                  <Label htmlFor="appointment">Select Appointment *</Label>
                  <Select
                    value={newTest.appointmentId}
                    onValueChange={(value) =>
                      setNewTest((prev) => ({ ...prev, appointmentId: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select an appointment" />
                    </SelectTrigger>
                    <SelectContent>
                      {appointments.map((appointment) => (
                        <SelectItem
                          key={appointment._id}
                          value={appointment._id}
                        >
                          <div className="flex items-center justify-between">
                            <span>
                              {appointment.patient.name} (
                              {appointment.patient.patientId})
                            </span>
                            <span className="text-sm text-gray-500 ml-2">
                              {format(new Date(appointment.date), "MMM d")}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-gray-500">
                    Select the appointment for which you want to order the test
                  </p>
                </div>

                {/* Common Tests Quick Select */}
                <div>
                  <Label className="mb-2 block">Common Tests</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {COMMON_TESTS.map((test) => (
                      <Button
                        key={test.name}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => selectCommonTest(test)}
                        className="justify-start"
                      >
                        {test.name} - ${test.price}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Test Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="testName">Test Name *</Label>
                    <Input
                      id="testName"
                      value={newTest.testName}
                      onChange={(e) =>
                        setNewTest((prev) => ({
                          ...prev,
                          testName: e.target.value,
                        }))
                      }
                      placeholder="Enter test name"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">Category *</Label>
                    <Select
                      value={newTest.category}
                      onValueChange={(value) =>
                        setNewTest((prev) => ({ ...prev, category: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TEST_CATEGORIES.map((category) => (
                          <SelectItem
                            key={category.value}
                            value={category.value}
                          >
                            {category.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="specimenType">Specimen Type</Label>
                    <Select
                      value={newTest.specimenType}
                      onValueChange={(value) =>
                        setNewTest((prev) => ({ ...prev, specimenType: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SPECIMEN_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="price">Price ($) *</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      value={newTest.price}
                      onChange={(e) =>
                        setNewTest((prev) => ({
                          ...prev,
                          price: e.target.value,
                        }))
                      }
                      placeholder="0.00"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority</Label>
                    <Select
                      value={newTest.priority}
                      onValueChange={(value) =>
                        setNewTest((prev) => ({ ...prev, priority: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="routine">Routine</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                        <SelectItem value="emergency">Emergency</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Description and Notes */}
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newTest.description}
                    onChange={(e) =>
                      setNewTest((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    placeholder="Test description..."
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={newTest.notes}
                    onChange={(e) =>
                      setNewTest((prev) => ({ ...prev, notes: e.target.value }))
                    }
                    placeholder="Additional notes for the lab..."
                    rows={2}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsOrderDialogOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button onClick={handleOrderTest} disabled={submitting}>
                  {submitting ? (
                    <>
                      <Clock className="h-4 w-4 mr-2 animate-spin" />
                      Ordering...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Order Test
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Error Alert */}
      {error && !isOrderDialogOpen && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Tests</p>
                <p className="text-2xl font-bold mt-1">{labTests.length}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <TestTube className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Pending Results
                </p>
                <p className="text-2xl font-bold mt-1">
                  {
                    labTests.filter(
                      (t) =>
                        t.status === "ordered" || t.status === "processing",
                    ).length
                  }
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
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold mt-1">
                  {
                    labTests.filter(
                      (t) =>
                        t.status === "completed" || t.status === "reported",
                    ).length
                  }
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Urgent Tests
                </p>
                <p className="text-2xl font-bold mt-1">
                  {
                    labTests.filter(
                      (t) =>
                        t.priority === "urgent" || t.priority === "emergency",
                    ).length
                  }
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by test name, patient name, or test ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="ordered">Ordered</SelectItem>
                  <SelectItem value="collected">Collected</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="reported">Reported</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>

              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="routine">Routine</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="emergency">Emergency</SelectItem>
                </SelectContent>
              </Select>

              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Date Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">Last 7 Days</SelectItem>
                  <SelectItem value="month">Last 30 Days</SelectItem>
                  <SelectItem value="quarter">Last 90 Days</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={selectedPatient || "all"}
                onValueChange={(value) =>
                  setSelectedPatient(value === "all" ? null : value)
                }
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Patient" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Patients</SelectItem>
                  {Array.from(
                    new Set(labTests.map((test) => test.patient._id)),
                  ).map((patientId) => {
                    const patient = labTests.find(
                      (t) => t.patient._id === patientId,
                    )?.patient;
                    return patient ? (
                      <SelectItem key={patientId} value={patientId}>
                        {patient.name} ({patient.patientId})
                      </SelectItem>
                    ) : null;
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lab Tests Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lab Tests</CardTitle>
          <CardDescription>
            Showing {filteredTests.length} of {labTests.length} tests
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredTests.length === 0 ? (
            <div className="text-center py-12">
              <TestTube className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Lab Tests Found</h3>
              <p className="text-gray-500 mb-4">
                {searchQuery
                  ? "No tests match your search criteria"
                  : "You haven't ordered any lab tests yet"}
              </p>
              <Button onClick={() => setIsOrderDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Order Your First Test
              </Button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Test ID</TableHead>
                      <TableHead>Test Name</TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead>Ordered</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Collection</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTests.map((test) => (
                      <TableRow
                        key={test._id}
                        className={cn(
                          test.priority === "emergency" &&
                            "bg-red-50 hover:bg-red-100",
                          test.priority === "urgent" &&
                            "bg-orange-50 hover:bg-orange-100",
                        )}
                      >
                        <TableCell className="font-medium">
                          {test.testId}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{test.testName}</p>
                            <p className="text-sm text-gray-500 capitalize">
                              {test.category.replace("_", " ")}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{test.patient.name}</p>
                            <p className="text-sm text-gray-500">
                              {test.patient.patientId}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p>{formatDate(test.orderedAt)}</p>
                            {test.appointment && (
                              <p className="text-gray-500">
                                Appt: {test.appointment.appointmentId}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{getPriorityBadge(test.priority)}</TableCell>
                        <TableCell>{getStatusBadge(test.status)}</TableCell>
                        <TableCell>
                          {getCollectionStatusBadge(test.collectionStatus)}
                        </TableCell>
                        <TableCell>
                          {test.paymentVerified ? (
                            <Badge
                              variant="outline"
                              className="bg-green-50 text-green-700 border-green-200"
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Verified
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="bg-yellow-50 text-yellow-700 border-yellow-200"
                            >
                              Pending
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                router.push(`/laboratory/tests/${test._id}`)
                              }
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {test.results && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    router.push(
                                      `/laboratory/tests/${test._id}/report`,
                                    )
                                  }
                                >
                                  <FileText className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    /* Print report */
                                  }}
                                >
                                  <Printer className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <div className="text-sm text-gray-500">
                    Page {currentPage} of {totalPages}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }

                      return (
                        <Button
                          key={pageNum}
                          variant={
                            currentPage === pageNum ? "default" : "outline"
                          }
                          size="sm"
                          onClick={() => handlePageChange(pageNum)}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
