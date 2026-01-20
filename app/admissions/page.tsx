// app/admissions/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { format } from "date-fns";
import {
  Search,
  Plus,
  Filter,
  Download,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  User,
  Calendar,
  Stethoscope,
  Bed,
  Activity,
  Pill,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Printer,
  Clock,
  CheckCircle,
  XCircle,
  ArrowUpDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

// Types
interface Patient {
  _id: string;
  patientId: string;
  name: string;
  age: number;
  gender: string;
  phone: string;
}

interface Doctor {
  _id: string;
  name: string;
  specialization?: string;
  email?: string;
}

interface Admission {
  _id: string;
  admissionId: string;
  patient: Patient;
  doctor: Doctor;
  admissionDate: string;
  dischargeDate?: string;
  expectedStay: number;
  reason: string;
  diagnosis: string;
  ward: string;
  bedNumber: string;
  roomType: "general" | "private" | "semi-private" | "icu" | "emergency";
  status: "admitted" | "discharged" | "transferred" | "cancelled";
  vitalSigns: Array<{
    date: string;
    bloodPressure?: { systolic: number; diastolic: number };
    heartRate?: number;
    temperature?: number;
    respiratoryRate?: number;
    oxygenSaturation?: number;
  }>;
  treatments: Array<{
    date: string;
    treatment: string;
    administeredBy: string;
    notes?: string;
  }>;
  notes?: string;
  dischargeSummary?: string;
  followUpDate?: string;
  createdAt: string;
  updatedAt: string;
}

interface AdmissionStats {
  total: number;
  admitted: number;
  discharged: number;
  transferred: number;
  cancelled: number;
  averageStay: number;
  occupancyRate: number;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  pages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

// Admission Form Component
function AdmissionForm({ onSuccess, onCancel }: { onSuccess?: () => void; onCancel?: () => void }) {
  const { user, accessToken } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [formData, setFormData] = useState({
    patient: "",
    doctor: user?.role === "doctor" ? user._id : "",
    reason: "",
    diagnosis: "",
    ward: "",
    bedNumber: "",
    roomType: "general" as const,
    expectedStay: 1,
    admissionDate: new Date().toISOString().split("T")[0],
    notes: "",
  });

  useEffect(() => {
    loadPatients();
    loadDoctors();
  }, []);

  const loadPatients = async () => {
    try {
      const response = await fetch("/api/patients?limit=100", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (response.ok) {
        const data = await response.json();
        setPatients(data.data || []);
      }
    } catch (error) {
      console.error("Error loading patients:", error);
    }
  };

  const loadDoctors = async () => {
    try {
      const response = await fetch("/api/users?role=doctor&limit=100", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (response.ok) {
        const data = await response.json();
        setDoctors(data.data || []);
      }
    } catch (error) {
      console.error("Error loading doctors:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.patient || !formData.reason || !formData.diagnosis || !formData.ward || !formData.bedNumber) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setLoading(true);
      
      const response = await fetch("/api/admissions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success("Patient admitted successfully!");
        setFormData({
          patient: "",
          doctor: user?.role === "doctor" ? user._id : "",
          reason: "",
          diagnosis: "",
          ward: "",
          bedNumber: "",
          roomType: "general",
          expectedStay: 1,
          admissionDate: new Date().toISOString().split("T")[0],
          notes: "",
        });
        onSuccess?.();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to admit patient");
      }
    } catch (error) {
      console.error("Error creating admission:", error);
      toast.error("An error occurred while admitting patient");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Patient */}
        <div className="space-y-2">
          <Label htmlFor="patient">Patient *</Label>
          <Select value={formData.patient} onValueChange={(value) => handleChange("patient", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select patient" />
            </SelectTrigger>
            <SelectContent>
              {patients.map(patient => (
                <SelectItem key={patient._id} value={patient._id}>
                  {patient.name} ({patient.patientId}) - {patient.age}y, {patient.gender}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Doctor */}
        <div className="space-y-2">
          <Label htmlFor="doctor">Doctor</Label>
          <Select value={formData.doctor} onValueChange={(value) => handleChange("doctor", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select doctor" />
            </SelectTrigger>
            <SelectContent>
              {doctors.map(doctor => (
                <SelectItem key={doctor._id} value={doctor._id}>
                  Dr. {doctor.name} {doctor.specialization && `(${doctor.specialization})`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Ward */}
        <div className="space-y-2">
          <Label htmlFor="ward">Ward *</Label>
          <Select value={formData.ward} onValueChange={(value) => handleChange("ward", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select ward" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="General Ward">General Ward</SelectItem>
              <SelectItem value="ICU">ICU</SelectItem>
              <SelectItem value="Emergency">Emergency</SelectItem>
              <SelectItem value="Private Ward">Private Ward</SelectItem>
              <SelectItem value="Semi-Private Ward">Semi-Private Ward</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Bed Number */}
        <div className="space-y-2">
          <Label htmlFor="bedNumber">Bed Number *</Label>
          <Input
            id="bedNumber"
            value={formData.bedNumber}
            onChange={(e) => handleChange("bedNumber", e.target.value)}
            placeholder="e.g., A-101, ICU-01"
          />
        </div>

        {/* Room Type */}
        <div className="space-y-2">
          <Label htmlFor="roomType">Room Type</Label>
          <Select value={formData.roomType} onValueChange={(value) => handleChange("roomType", value as any)}>
            <SelectTrigger>
              <SelectValue placeholder="Select room type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="general">General</SelectItem>
              <SelectItem value="private">Private</SelectItem>
              <SelectItem value="semi-private">Semi-Private</SelectItem>
              <SelectItem value="icu">ICU</SelectItem>
              <SelectItem value="emergency">Emergency</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Expected Stay */}
        <div className="space-y-2">
          <Label htmlFor="expectedStay">Expected Stay (days) *</Label>
          <Input
            id="expectedStay"
            type="number"
            min="1"
            value={formData.expectedStay}
            onChange={(e) => handleChange("expectedStay", parseInt(e.target.value) || 1)}
          />
        </div>

        {/* Admission Date */}
        <div className="space-y-2">
          <Label htmlFor="admissionDate">Admission Date</Label>
          <Input
            id="admissionDate"
            type="date"
            value={formData.admissionDate}
            onChange={(e) => handleChange("admissionDate", e.target.value)}
          />
        </div>
      </div>

      {/* Reason */}
      <div className="space-y-2">
        <Label htmlFor="reason">Reason for Admission *</Label>
        <Textarea
          id="reason"
          value={formData.reason}
          onChange={(e) => handleChange("reason", e.target.value)}
          placeholder="Describe symptoms, complaints, reason for admission..."
          rows={3}
        />
      </div>

      {/* Diagnosis */}
      <div className="space-y-2">
        <Label htmlFor="diagnosis">Diagnosis *</Label>
        <Textarea
          id="diagnosis"
          value={formData.diagnosis}
          onChange={(e) => handleChange("diagnosis", e.target.value)}
          placeholder="Enter diagnosis (ICD-10 codes if applicable)..."
          rows={3}
        />
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Additional Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => handleChange("notes", e.target.value)}
          placeholder="Any additional notes or instructions..."
          rows={3}
        />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Admitting...
            </>
          ) : (
            "Admit Patient"
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}

export default function AdmissionsPage() {
  const router = useRouter();
  const { user, accessToken, isAuthenticated, isLoading: authLoading, logout } = useAuthStore();
  const [admissions, setAdmissions] = useState<Admission[]>([]);
  const [stats, setStats] = useState<AdmissionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showNewAdmission, setShowNewAdmission] = useState(false);
  const [showDischargeDialog, setShowDischargeDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedAdmission, setSelectedAdmission] = useState<Admission | null>(null);
  const [dischargeData, setDischargeData] = useState({
    dischargeSummary: "",
    followUpDate: "",
  });
  const [authError, setAuthError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [showFilters, setShowFilters] = useState(true);

  // Filters
  const [filters, setFilters] = useState({
    search: "",
    status: "",
    ward: "",
    roomType: "",
    sortBy: "admissionDate",
    sortOrder: "desc",
    page: 1,
    limit: 20,
  });

  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    total: 0,
    pages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  });

  // Check authentication on mount
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setAuthError("Please login to view admissions");
      setLoading(false);
    }
  }, [authLoading, isAuthenticated]);

  // Load admissions when authenticated and filters change
  useEffect(() => {
    if (isAuthenticated && user) {
      loadAdmissions();
      loadStats();
    }
  }, [filters.page, filters.status, filters.ward, filters.roomType, filters.sortBy, filters.sortOrder]);

  // Debounced search
  useEffect(() => {
    if (!isAuthenticated) return;
    
    const timeoutId = setTimeout(() => {
      if (filters.page === 1) {
        loadAdmissions();
      } else {
        setFilters(prev => ({ ...prev, page: 1 }));
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [filters.search]);

  const loadAdmissions = async () => {
    try {
      setLoading(true);
      setAuthError(null);
      
      const queryParams = new URLSearchParams({
        page: filters.page.toString(),
        limit: filters.limit.toString(),
        ...(filters.search && { search: filters.search }),
        ...(filters.status && { status: filters.status }),
        ...(filters.ward && { ward: filters.ward }),
        ...(filters.roomType && { roomType: filters.roomType }),
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
      });

      const response = await fetch(`/api/admissions?${queryParams}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        credentials: "include",
      });

      if (response.status === 401) {
        setAuthError("Session expired. Please login again.");
        logout();
        router.push("/login");
        return;
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || "Failed to load admissions");
      }

      const data = await response.json();
      setAdmissions(data.data || []);
      setPagination(data.pagination || {
        page: filters.page,
        limit: filters.limit,
        total: 0,
        pages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      });
    } catch (error) {
      console.error("Error loading admissions:", error);
      toast.error(error instanceof Error ? error.message : "Failed to load admissions");
      setAdmissions([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch("/api/admissions?includeStats=true", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  const refreshData = () => {
    setRefreshing(true);
    loadAdmissions();
    loadStats();
  };

  const handleFilterChange = (key: string, value: string | number) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const handleDischarge = async () => {
    if (!selectedAdmission) return;

    try {
      const response = await fetch("/api/admissions", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          admissionId: selectedAdmission._id,
          action: "discharge",
          data: {
            dischargeSummary: dischargeData.dischargeSummary,
            ...(dischargeData.followUpDate && {
              followUpDate: dischargeData.followUpDate,
            }),
          },
        }),
      });

      if (response.ok) {
        toast.success("Patient discharged successfully!");
        setShowDischargeDialog(false);
        setSelectedAdmission(null);
        setDischargeData({ dischargeSummary: "", followUpDate: "" });
        refreshData();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to discharge patient");
      }
    } catch (error) {
      console.error("Error discharging patient:", error);
      toast.error("Failed to discharge patient");
    }
  };

  const handleDelete = async () => {
    if (!selectedAdmission) return;

    try {
      const response = await fetch(`/api/admissions/${selectedAdmission._id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        toast.success("Admission deleted successfully!");
        setShowDeleteDialog(false);
        setSelectedAdmission(null);
        refreshData();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to delete admission");
      }
    } catch (error) {
      console.error("Error deleting admission:", error);
      toast.error("Failed to delete admission");
    }
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      const response = await fetch(`/api/admissions/export?${new URLSearchParams({
        ...(filters.status && { status: filters.status }),
        ...(filters.ward && { ward: filters.ward }),
        ...(filters.roomType && { roomType: filters.roomType }),
      })}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `admissions_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success("Export completed successfully!");
      } else {
        toast.error("Failed to export data");
      }
    } catch (error) {
      console.error("Error exporting data:", error);
      toast.error("Failed to export data");
    } finally {
      setExporting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "admitted":
        return "bg-green-100 text-green-800 border-green-200";
      case "discharged":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "transferred":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "cancelled":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "admitted":
        return <Clock className="h-4 w-4 mr-1" />;
      case "discharged":
        return <CheckCircle className="h-4 w-4 mr-1" />;
      case "cancelled":
        return <XCircle className="h-4 w-4 mr-1" />;
      default:
        return null;
    }
  };

  const getRoomTypeLabel = (roomType: string) => {
    switch (roomType) {
      case "general":
        return "General";
      case "private":
        return "Private";
      case "semi-private":
        return "Semi-Private";
      case "icu":
        return "ICU";
      case "emergency":
        return "Emergency";
      default:
        return roomType;
    }
  };

  const canCreateAdmission = user?.role && ["admin", "doctor", "receptionist"].includes(user.role);
  const canDischarge = user?.role && ["admin", "doctor"].includes(user.role);
  const canEdit = user?.role && ["admin", "doctor", "nurse"].includes(user.role);
  const canDelete = user?.role === "admin";

  const handleSort = (field: string) => {
    if (filters.sortBy === field) {
      handleFilterChange("sortOrder", filters.sortOrder === "desc" ? "asc" : "desc");
    } else {
      handleFilterChange("sortBy", field);
      handleFilterChange("sortOrder", "desc");
    }
  };

  const SortableHeader = ({ field, children }: { field: string; children: React.ReactNode }) => (
    <TableHead 
      className="cursor-pointer hover:bg-gray-50"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center">
        {children}
        {filters.sortBy === field && (
          <ArrowUpDown className={`ml-2 h-4 w-4 ${filters.sortOrder === "asc" ? "rotate-180" : ""}`} />
        )}
      </div>
    </TableHead>
  );

  if (authLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-96">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            <p className="text-gray-500">Loading authentication...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || authError) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {authError || "Please login to access admissions"}
          </AlertDescription>
        </Alert>
        <div className="text-center">
          <Button onClick={() => router.push("/login")}>
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Patient Admissions</h1>
          <p className="text-gray-500">
            Manage patient admissions, discharges, and transfers
          </p>
        </div>
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={refreshData} disabled={refreshing}>
                  <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Button variant="outline" onClick={handleExport} disabled={exporting}>
            <Download className="h-4 w-4 mr-2" />
            {exporting ? "Exporting..." : "Export"}
          </Button>

          {canCreateAdmission && (
            <Button onClick={() => setShowNewAdmission(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Admission
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Admissions</CardTitle>
            <User className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
            <p className="text-xs text-gray-500">All time</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Currently Admitted</CardTitle>
            <Bed className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats?.admitted || 0}
            </div>
            <p className="text-xs text-gray-500">Active patients</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Stay</CardTitle>
            <Calendar className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {stats?.averageStay ? stats.averageStay.toFixed(1) : 0} days
            </div>
            <p className="text-xs text-gray-500">For discharged patients</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Occupancy Rate</CardTitle>
            <Activity className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {stats?.occupancyRate ? stats.occupancyRate.toFixed(1) : 0}%
            </div>
            <p className="text-xs text-gray-500">Current ward occupancy</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <h3 className="font-semibold">Filters</h3>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="show-filters" className="text-sm">Show Filters</Label>
              <Switch
                id="show-filters"
                checked={showFilters}
                onCheckedChange={setShowFilters}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFilters({
                    search: "",
                    status: "",
                    ward: "",
                    roomType: "",
                    sortBy: "admissionDate",
                    sortOrder: "desc",
                    page: 1,
                    limit: 20,
                  });
                }}
              >
                Clear All
              </Button>
            </div>
          </div>

          {showFilters && (
            <div className="space-y-4">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by admission ID, patient name, diagnosis..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange("search", e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Filter Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm">Status</Label>
                  <Select
                    value={filters.status}
                    onValueChange={(value) => handleFilterChange("status", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all-status">All Status</SelectItem>
                      <SelectItem value="admitted">Admitted</SelectItem>
                      <SelectItem value="discharged">Discharged</SelectItem>
                      <SelectItem value="transferred">Transcharged</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Ward</Label>
                  <Select
                    value={filters.ward}
                    onValueChange={(value) => handleFilterChange("ward", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Wards" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all-wards">All Wards</SelectItem>
                      <SelectItem value="General Ward">General Ward</SelectItem>
                      <SelectItem value="ICU">ICU</SelectItem>
                      <SelectItem value="Emergency">Emergency</SelectItem>
                      <SelectItem value="Private Ward">Private Ward</SelectItem>
                      <SelectItem value="Semi-Private Ward">Semi-Private Ward</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Room Type</Label>
                  <Select
                    value={filters.roomType}
                    onValueChange={(value) => handleFilterChange("roomType", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Room Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all-room-types">All Room Types</SelectItem>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="private">Private</SelectItem>
                      <SelectItem value="semi-private">Semi-Private</SelectItem>
                      <SelectItem value="icu">ICU</SelectItem>
                      <SelectItem value="emergency">Emergency</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Results per page</Label>
                  <Select
                    value={filters.limit.toString()}
                    onValueChange={(value) => handleFilterChange("limit", parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="20 per page" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10 per page</SelectItem>
                      <SelectItem value="20">20 per page</SelectItem>
                      <SelectItem value="50">50 per page</SelectItem>
                      <SelectItem value="100">100 per page</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Admissions Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHeader field="admissionId">
                    Admission ID
                  </SortableHeader>
                  <TableHead>Patient</TableHead>
                  <TableHead>Doctor</TableHead>
                  <SortableHeader field="admissionDate">
                    Admission Date
                  </SortableHeader>
                  <TableHead>Ward/Bed</TableHead>
                  <TableHead>Room Type</TableHead>
                  <SortableHeader field="status">
                    Status
                  </SortableHeader>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    </TableRow>
                  ))
                ) : admissions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <div className="text-center space-y-2">
                        <User className="h-12 w-12 text-gray-300 mx-auto" />
                        <h3 className="text-lg font-semibold">No admissions found</h3>
                        <p className="text-gray-500">
                          {filters.search || filters.status || filters.ward
                            ? "Try changing your filters"
                            : canCreateAdmission
                              ? "Get started by creating your first admission"
                              : "No admissions available"}
                        </p>
                        {canCreateAdmission && !filters.search && !filters.status && !filters.ward && (
                          <Button onClick={() => setShowNewAdmission(true)} className="mt-2">
                            <Plus className="h-4 w-4 mr-2" />
                            New Admission
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  admissions.map((admission) => (
                    <TableRow key={admission._id} className="hover:bg-gray-50/50">
                      <TableCell>
                        <div className="font-mono font-semibold text-sm">
                          {admission.admissionId}
                        </div>
                        <div className="text-xs text-gray-500">
                          ID: {admission._id.slice(-6)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{admission.patient.name}</div>
                        <div className="text-sm text-gray-500">
                          ID: {admission.patient.patientId} • {admission.patient.age}y • {admission.patient.gender}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">Dr. {admission.doctor.name}</div>
                        {admission.doctor.specialization && (
                          <div className="text-sm text-gray-500">
                            {admission.doctor.specialization}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {format(new Date(admission.admissionDate), "dd/MM/yyyy")}
                        </div>
                        <div className="text-xs text-gray-500">
                          {format(new Date(admission.admissionDate), "hh:mm a")}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{admission.ward}</div>
                        <div className="text-sm text-gray-500">
                          Bed: {admission.bedNumber}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {getRoomTypeLabel(admission.roomType)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn("text-xs flex items-center w-fit", getStatusColor(admission.status))}>
                          {getStatusIcon(admission.status)}
                          {admission.status.charAt(0).toUpperCase() + admission.status.slice(1)}
                        </Badge>
                        {admission.dischargeDate && (
                          <div className="text-xs text-gray-500 mt-1">
                            Discharged: {format(new Date(admission.dischargeDate), "dd/MM/yyyy")}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem
                              onClick={() => router.push(`/admissions/${admission._id}`)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            
                            {canEdit && admission.status === "admitted" && (
                              <DropdownMenuItem
                                onClick={() => router.push(`/admissions/${admission._id}/edit`)}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                            )}

                            {canDischarge && admission.status === "admitted" && (
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedAdmission(admission);
                                  setShowDischargeDialog(true);
                                }}
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Discharge
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuItem
                              onClick={() => window.print()}
                            >
                              <Printer className="h-4 w-4 mr-2" />
                              Print Summary
                            </DropdownMenuItem>

                            {canDelete && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-red-600 focus:text-red-600"
                                  onClick={() => {
                                    setSelectedAdmission(admission);
                                    setShowDeleteDialog(true);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </>
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

          {/* Pagination */}
          {pagination.total > 0 && (
            <div className="flex items-center justify-between px-6 py-4 border-t">
              <div className="text-sm text-gray-500">
                Showing <span className="font-medium">{((pagination.page - 1) * pagination.limit) + 1}</span> to{" "}
                <span className="font-medium">
                  {Math.min(pagination.page * pagination.limit, pagination.total)}
                </span> of{" "}
                <span className="font-medium">{pagination.total}</span> admissions
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleFilterChange("page", pagination.page - 1)}
                  disabled={!pagination.hasPrevPage}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, pagination.pages) }).map((_, i) => {
                    const pageNum = i + 1;
                    return (
                      <Button
                        key={pageNum}
                        variant={pagination.page === pageNum ? "default" : "outline"}
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => handleFilterChange("page", pageNum)}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                  {pagination.pages > 5 && (
                    <>
                      <span className="mx-1">...</span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => handleFilterChange("page", pagination.pages)}
                      >
                        {pagination.pages}
                      </Button>
                    </>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleFilterChange("page", pagination.page + 1)}
                  disabled={!pagination.hasNextPage}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* New Admission Dialog */}
      <Dialog open={showNewAdmission} onOpenChange={setShowNewAdmission}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Patient Admission</DialogTitle>
            <DialogDescription>
              Fill in the patient details to create a new admission record
            </DialogDescription>
          </DialogHeader>
          <AdmissionForm
            onSuccess={() => {
              setShowNewAdmission(false);
              refreshData();
            }}
            onCancel={() => setShowNewAdmission(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Discharge Dialog */}
      <Dialog open={showDischargeDialog} onOpenChange={setShowDischargeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Discharge Patient</DialogTitle>
            <DialogDescription>
              Provide discharge summary for {selectedAdmission?.patient.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="rounded-lg border p-4 bg-gray-50">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-500">Patient:</span>
                  <div className="font-medium">{selectedAdmission?.patient.name}</div>
                </div>
                <div>
                  <span className="text-gray-500">Admission ID:</span>
                  <div className="font-medium">{selectedAdmission?.admissionId}</div>
                </div>
                <div>
                  <span className="text-gray-500">Ward/Bed:</span>
                  <div className="font-medium">
                    {selectedAdmission?.ward} / {selectedAdmission?.bedNumber}
                  </div>
                </div>
                <div>
                  <span className="text-gray-500">Doctor:</span>
                  <div className="font-medium">Dr. {selectedAdmission?.doctor.name}</div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dischargeSummary">
                Discharge Summary *
                <span className="text-gray-500 text-sm ml-2">(Required)</span>
              </Label>
              <Textarea
                id="dischargeSummary"
                placeholder="Enter discharge summary including final diagnosis, treatment given, condition at discharge, and follow-up instructions..."
                value={dischargeData.dischargeSummary}
                onChange={(e) =>
                  setDischargeData((prev) => ({
                    ...prev,
                    dischargeSummary: e.target.value,
                  }))
                }
                rows={6}
                className="resize-none"
              />
              <p className="text-xs text-gray-500">
                Include medication instructions, follow-up appointments, and any restrictions
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="followUpDate">Follow-up Date</Label>
              <Input
                id="followUpDate"
                type="date"
                value={dischargeData.followUpDate}
                onChange={(e) =>
                  setDischargeData((prev) => ({
                    ...prev,
                    followUpDate: e.target.value,
                  }))
                }
                min={new Date().toISOString().split("T")[0]}
              />
              <p className="text-xs text-gray-500">
                Schedule a follow-up appointment if needed
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDischargeDialog(false);
                setSelectedAdmission(null);
                setDischargeData({ dischargeSummary: "", followUpDate: "" });
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDischarge}
              disabled={!dischargeData.dischargeSummary.trim()}
            >
              Confirm Discharge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this admission record? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {selectedAdmission && (
            <div className="rounded-lg border p-4 bg-red-50 border-red-200">
              <div className="space-y-2 text-sm">
                <div className="font-medium">Admission ID: {selectedAdmission.admissionId}</div>
                <div>Patient: {selectedAdmission.patient.name}</div>
                <div>Ward: {selectedAdmission.ward} (Bed: {selectedAdmission.bedNumber})</div>
                <div>Status: {selectedAdmission.status}</div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteDialog(false);
                setSelectedAdmission(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
            >
              Delete Admission
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
