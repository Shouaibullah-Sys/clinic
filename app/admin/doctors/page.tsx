// app/admin/doctors/page.tsx

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Search,
  Plus,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  UserPlus,
  Stethoscope,
  Building,
  GraduationCap,
  DollarSign,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  Filter,
  RefreshCw,
  Loader2,
  Mail,
  Phone,
  Shield,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Doctor {
  _id: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  specialization: string;
  licenseNumber: string;
  qualifications: string[];
  experience?: number;
  consultationFee?: number;
  availability?: {
    days: string[];
    startTime: string;
    endTime: string;
    breakStart?: string;
    breakEnd?: string;
  };
  biography?: string;
  approved: boolean;
  active: boolean;
  avatar?: string;
  joiningDate?: string;
  createdAt: string;
  updatedAt: string;
}

interface NewDoctorFormData {
  name: string;
  email: string;
  phone: string;
  department: string;
  specialization: string;
  licenseNumber: string;
  qualifications: string;
  experience: string;
  consultationFee: string;
  biography: string;
  availability: {
    days: string;
    startTime: string;
    endTime: string;
    breakStart: string;
    breakEnd: string;
  };
}

export default function DoctorsManagementPage() {
  const router = useRouter();
  const { user, accessToken } = useAuthStore();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalDoctors, setTotalDoctors] = useState(0);
  
  // New Doctor Dialog
  const [showNewDoctorDialog, setShowNewDoctorDialog] = useState(false);
  const [creatingDoctor, setCreatingDoctor] = useState(false);
  const [newDoctorForm, setNewDoctorForm] = useState<NewDoctorFormData>({
    name: "",
    email: "",
    phone: "",
    department: "",
    specialization: "",
    licenseNumber: "",
    qualifications: "",
    experience: "",
    consultationFee: "",
    biography: "",
    availability: {
      days: "monday,tuesday,wednesday,thursday,friday",
      startTime: "09:00",
      endTime: "17:00",
      breakStart: "13:00",
      breakEnd: "14:00",
    },
  });
  
  // Edit Doctor Dialog
  const [showEditDoctorDialog, setShowEditDoctorDialog] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [updatingDoctor, setUpdatingDoctor] = useState(false);
  
  // Delete Confirmation
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingDoctor, setDeletingDoctor] = useState<Doctor | null>(null);
  const [deleting, setDeleting] = useState(false);
  
  // Error & Success States
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Redirect if not admin
  useEffect(() => {
    if (user && user.role !== "admin") {
      router.push("/unauthorized");
    }
  }, [user, router]);

  useEffect(() => {
    fetchDoctors();
  }, [page, selectedDepartment, selectedStatus]);

  const fetchDoctors = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
      });
      
      if (searchQuery) {
        params.set("search", searchQuery);
      }
      
      if (selectedDepartment !== "all") {
        params.set("department", selectedDepartment);
      }
      
      if (selectedStatus === "active") {
        params.set("active", "true");
      } else if (selectedStatus === "inactive") {
        params.set("active", "false");
      } else if (selectedStatus === "pending") {
        params.set("approved", "false");
      }
      
      const response = await fetch(`/api/admin/doctors?${params.toString()}`, {
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
      });
      
      const data = await response.json();
      
      if (data.success) {
        setDoctors(data.data);
        setDepartments(data.departments || []);
        setTotalDoctors(data.pagination?.total || 0);
        setTotalPages(data.pagination?.pages || 1);
      } else {
        setError(data.error || "Failed to fetch doctors");
      }
    } catch (error) {
      console.error("Error fetching doctors:", error);
      setError("Failed to load doctors. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1); // Reset to first page when searching
    fetchDoctors();
  };

  const handleCreateDoctor = async () => {
    try {
      setCreatingDoctor(true);
      setError(null);
      
      // Validate required fields
      if (!newDoctorForm.name || !newDoctorForm.email || !newDoctorForm.phone || 
          !newDoctorForm.department || !newDoctorForm.specialization || !newDoctorForm.licenseNumber) {
        setError("Please fill in all required fields");
        return;
      }
      
      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(newDoctorForm.email)) {
        setError("Please enter a valid email address");
        return;
      }
      
      // Phone validation
      const phoneDigits = newDoctorForm.phone.replace(/\D/g, '');
      if (phoneDigits.length < 10) {
        setError("Phone number must be at least 10 digits");
        return;
      }
      
      const response = await fetch("/api/admin/doctors", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify(newDoctorForm),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSuccess(data.message || "Doctor created successfully!");
        setShowNewDoctorDialog(false);
        resetNewDoctorForm();
        fetchDoctors();
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(data.error || "Failed to create doctor");
      }
    } catch (error: any) {
      console.error("Error creating doctor:", error);
      setError(error.message || "Failed to create doctor");
    } finally {
      setCreatingDoctor(false);
    }
  };

  const handleUpdateDoctor = async () => {
    if (!editingDoctor) return;
    
    try {
      setUpdatingDoctor(true);
      setError(null);
      
      const response = await fetch(`/api/admin/doctors/${editingDoctor._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          ...editingDoctor,
          qualifications: editingDoctor.qualifications?.join(', '),
          availability: {
            ...editingDoctor.availability,
            days: editingDoctor.availability?.days?.join(', '),
          },
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSuccess("Doctor updated successfully!");
        setShowEditDoctorDialog(false);
        setEditingDoctor(null);
        fetchDoctors();
        
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(data.error || "Failed to update doctor");
      }
    } catch (error: any) {
      console.error("Error updating doctor:", error);
      setError(error.message || "Failed to update doctor");
    } finally {
      setUpdatingDoctor(false);
    }
  };

  const handleDeleteDoctor = async () => {
    if (!deletingDoctor) return;
    
    try {
      setDeleting(true);
      
      const response = await fetch(`/api/admin/doctors/${deletingDoctor._id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSuccess("Doctor deactivated successfully!");
        setShowDeleteDialog(false);
        setDeletingDoctor(null);
        fetchDoctors();
        
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(data.error || "Failed to deactivate doctor");
      }
    } catch (error: any) {
      console.error("Error deactivating doctor:", error);
      setError(error.message || "Failed to deactivate doctor");
    } finally {
      setDeleting(false);
    }
  };

  const resetNewDoctorForm = () => {
    setNewDoctorForm({
      name: "",
      email: "",
      phone: "",
      department: "",
      specialization: "",
      licenseNumber: "",
      qualifications: "",
      experience: "",
      consultationFee: "",
      biography: "",
      availability: {
        days: "monday,tuesday,wednesday,thursday,friday",
        startTime: "09:00",
        endTime: "17:00",
        breakStart: "13:00",
        breakEnd: "14:00",
      },
    });
  };

  const openEditDialog = (doctor: Doctor) => {
    setEditingDoctor({
      ...doctor,
      availability: doctor.availability || { days: [], startTime: '09:00', endTime: '17:00' }
    });
    setShowEditDoctorDialog(true);
  };

  const openDeleteDialog = (doctor: Doctor) => {
    setDeletingDoctor(doctor);
    setShowDeleteDialog(true);
  };

  const getStatusBadge = (doctor: Doctor) => {
    if (!doctor.active) {
      return <Badge variant="destructive">Inactive</Badge>;
    }
    if (!doctor.approved) {
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>;
    }
    return <Badge variant="default" className="bg-green-50 text-green-700 border-green-200">Active</Badge>;
  };

  const formatDays = (days: string[]) => {
    if (!days || days.length === 0) return "Not set";
    
    const dayMap: Record<string, string> = {
      monday: "Mon",
      tuesday: "Tue",
      wednesday: "Wed",
      thursday: "Thu",
      friday: "Fri",
      saturday: "Sat",
      sunday: "Sun",
    };
    
    return days.map(day => dayMap[day] || day).join(", ");
  };

  if (user?.role !== "admin") {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Shield className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Unauthorized Access</h2>
          <p className="text-gray-600">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Doctors Management</h1>
          <p className="text-gray-500 mt-1">Manage doctors and their profiles</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={fetchDoctors}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Dialog open={showNewDoctorDialog} onOpenChange={setShowNewDoctorDialog}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Add New Doctor
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-2xl flex items-center gap-2">
                  <UserPlus className="h-6 w-6" />
                  Add New Doctor
                </DialogTitle>
                <DialogDescription>
                  Fill in the doctor details below. All fields marked with * are required.
                </DialogDescription>
              </DialogHeader>
              
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="basic">Basic Information</TabsTrigger>
                  <TabsTrigger value="professional">Professional Details</TabsTrigger>
                </TabsList>
                
                <TabsContent value="basic" className="space-y-4 py-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="font-medium">
                        Full Name *
                      </Label>
                      <Input
                        id="name"
                        placeholder="Dr. John Doe"
                        value={newDoctorForm.name}
                        onChange={(e) => setNewDoctorForm(prev => ({
                          ...prev,
                          name: e.target.value
                        }))}
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="email" className="font-medium">
                        Email Address *
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="doctor@hospital.com"
                        value={newDoctorForm.email}
                        onChange={(e) => setNewDoctorForm(prev => ({
                          ...prev,
                          email: e.target.value
                        }))}
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="font-medium">
                        Phone Number *
                      </Label>
                      <Input
                        id="phone"
                        placeholder="+1 (555) 123-4567"
                        value={newDoctorForm.phone}
                        onChange={(e) => setNewDoctorForm(prev => ({
                          ...prev,
                          phone: e.target.value
                        }))}
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="department" className="font-medium">
                        Department *
                      </Label>
                      <Select
                        value={newDoctorForm.department}
                        onValueChange={(value) => setNewDoctorForm(prev => ({
                          ...prev,
                          department: value
                        }))}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cardiology">Cardiology</SelectItem>
                          <SelectItem value="neurology">Neurology</SelectItem>
                          <SelectItem value="orthopedics">Orthopedics</SelectItem>
                          <SelectItem value="pediatrics">Pediatrics</SelectItem>
                          <SelectItem value="surgery">Surgery</SelectItem>
                          <SelectItem value="emergency">Emergency</SelectItem>
                          <SelectItem value="radiology">Radiology</SelectItem>
                          <SelectItem value="laboratory">Laboratory</SelectItem>
                          <SelectItem value="pharmacy">Pharmacy</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="specialization" className="font-medium">
                        Specialization *
                      </Label>
                      <Input
                        id="specialization"
                        placeholder="e.g., Cardiologist, Neurologist, etc."
                        value={newDoctorForm.specialization}
                        onChange={(e) => setNewDoctorForm(prev => ({
                          ...prev,
                          specialization: e.target.value
                        }))}
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="licenseNumber" className="font-medium">
                        License Number *
                      </Label>
                      <Input
                        id="licenseNumber"
                        placeholder="MED12345678"
                        value={newDoctorForm.licenseNumber}
                        onChange={(e) => setNewDoctorForm(prev => ({
                          ...prev,
                          licenseNumber: e.target.value
                        }))}
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="qualifications">Qualifications</Label>
                    <Input
                      id="qualifications"
                      placeholder="MBBS, MD, MS, etc. (comma separated)"
                      value={newDoctorForm.qualifications}
                      onChange={(e) => setNewDoctorForm(prev => ({
                        ...prev,
                        qualifications: e.target.value
                      }))}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="experience">Experience (Years)</Label>
                      <Input
                        id="experience"
                        type="number"
                        placeholder="5"
                        value={newDoctorForm.experience}
                        onChange={(e) => setNewDoctorForm(prev => ({
                          ...prev,
                          experience: e.target.value
                        }))}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="consultationFee">Consultation Fee ($)</Label>
                      <Input
                        id="consultationFee"
                        type="number"
                        step="0.01"
                        placeholder="100.00"
                        value={newDoctorForm.consultationFee}
                        onChange={(e) => setNewDoctorForm(prev => ({
                          ...prev,
                          consultationFee: e.target.value
                        }))}
                      />
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="professional" className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="biography">Biography</Label>
                    <Textarea
                      id="biography"
                      placeholder="Doctor's background, achievements, etc."
                      value={newDoctorForm.biography}
                      onChange={(e) => setNewDoctorForm(prev => ({
                        ...prev,
                        biography: e.target.value
                      }))}
                      rows={4}
                    />
                  </div>
                  
                  <div className="space-y-3">
                    <Label className="font-medium">Working Hours</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="workingDays">Working Days</Label>
                        <Input
                          id="workingDays"
                          placeholder="monday,tuesday,wednesday,thursday,friday"
                          value={newDoctorForm.availability.days}
                          onChange={(e) => setNewDoctorForm(prev => ({
                            ...prev,
                            availability: {
                              ...prev.availability,
                              days: e.target.value
                            }
                          }))}
                        />
                        <p className="text-xs text-gray-500">
                          Enter days separated by commas (monday, tuesday, etc.)
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="startTime">Start Time</Label>
                        <Input
                          id="startTime"
                          type="time"
                          value={newDoctorForm.availability.startTime}
                          onChange={(e) => setNewDoctorForm(prev => ({
                            ...prev,
                            availability: {
                              ...prev.availability,
                              startTime: e.target.value
                            }
                          }))}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="endTime">End Time</Label>
                        <Input
                          id="endTime"
                          type="time"
                          value={newDoctorForm.availability.endTime}
                          onChange={(e) => setNewDoctorForm(prev => ({
                            ...prev,
                            availability: {
                              ...prev.availability,
                              endTime: e.target.value
                            }
                          }))}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="breakTime">Break Time (Optional)</Label>
                        <div className="flex gap-2">
                          <Input
                            id="breakStart"
                            type="time"
                            placeholder="Start"
                            value={newDoctorForm.availability.breakStart}
                            onChange={(e) => setNewDoctorForm(prev => ({
                              ...prev,
                              availability: {
                                ...prev.availability,
                                breakStart: e.target.value
                              }
                            }))}
                          />
                          <Input
                            id="breakEnd"
                            type="time"
                            placeholder="End"
                            value={newDoctorForm.availability.breakEnd}
                            onChange={(e) => setNewDoctorForm(prev => ({
                              ...prev,
                              availability: {
                                ...prev.availability,
                                breakEnd: e.target.value
                              }
                            }))}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                      <div className="text-sm text-blue-700">
                        <p className="font-medium">Default Password</p>
                        <p>The doctor will receive "Doctor@123" as their initial password. They should change it after first login.</p>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
              
              <DialogFooter className="gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowNewDoctorDialog(false);
                    resetNewDoctorForm();
                  }}
                  disabled={creatingDoctor}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleCreateDoctor}
                  disabled={creatingDoctor}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {creatingDoctor ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Doctor"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Doctors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDoctors}</div>
            <p className="text-xs text-gray-500">Registered doctors</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Doctors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {doctors.filter(d => d.active && d.approved).length}
            </div>
            <p className="text-xs text-gray-500">Available for appointments</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {doctors.filter(d => !d.approved).length}
            </div>
            <p className="text-xs text-gray-500">Awaiting verification</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Departments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{departments.length}</div>
            <p className="text-xs text-gray-500">Active departments</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Search</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by name, email, or license..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="pl-9"
                  />
                </div>
                <Button onClick={handleSearch}>
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Department</Label>
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger>
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="pending">Pending Approval</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Actions</Label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedDepartment("all");
                    setSelectedStatus("all");
                    setPage(1);
                  }}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Clear Filters
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error & Success Alerts */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {success && (
        <Alert className="bg-green-50 text-green-800 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Doctors Table */}
      <Card>
        <CardHeader>
          <CardTitle>Doctors List</CardTitle>
          <CardDescription>
            Showing {doctors.length} of {totalDoctors} doctors
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : doctors.length === 0 ? (
            <div className="text-center py-12">
              <Stethoscope className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No Doctors Found</h3>
              <p className="text-gray-500 mb-6">
                {searchQuery || selectedDepartment !== "all" || selectedStatus !== "all"
                  ? "Try changing your filters or search query"
                  : "No doctors have been added yet"}
              </p>
              <Button onClick={() => setShowNewDoctorDialog(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Add Your First Doctor
              </Button>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Doctor</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Specialization</TableHead>
                    <TableHead>Availability</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {doctors.map((doctor) => (
                    <TableRow key={doctor._id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <Stethoscope className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-semibold">{doctor.name}</p>
                            <p className="text-sm text-gray-500">
                              {doctor.experience ? `${doctor.experience} years exp` : "Fresh"}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3 text-gray-400" />
                            <span className="text-sm">{doctor.email}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3 text-gray-400" />
                            <span className="text-sm">{doctor.phone}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-blue-50">
                          {doctor.department}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{doctor.specialization}</div>
                        {doctor.consultationFee && (
                          <div className="text-sm text-gray-500 flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            ${doctor.consultationFee}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-sm">
                            {doctor.availability ? formatDays(doctor.availability.days) : "Not set"}
                          </div>
                          {doctor.availability && (
                            <div className="text-xs text-gray-500 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {doctor.availability.startTime} - {doctor.availability.endTime}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(doctor)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem
                              onClick={() => openEditDialog(doctor)}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Details
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {doctor.active ? (
                              <DropdownMenuItem
                                onClick={() => openDeleteDialog(doctor)}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Deactivate
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => openEditDialog(doctor)}
                                className="text-green-600"
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Activate
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Page {page} of {totalPages} • {totalDoctors} total doctors
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Edit Doctor Dialog */}
      {editingDoctor && (
        <Dialog open={showEditDoctorDialog} onOpenChange={setShowEditDoctorDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Doctor Details</DialogTitle>
              <DialogDescription>
                Update doctor information below
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input
                    value={editingDoctor.name}
                    onChange={(e) => setEditingDoctor(prev => 
                      prev ? { ...prev, name: e.target.value } : null
                    )}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    value={editingDoctor.email}
                    onChange={(e) => setEditingDoctor(prev => 
                      prev ? { ...prev, email: e.target.value } : null
                    )}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    value={editingDoctor.phone}
                    onChange={(e) => setEditingDoctor(prev => 
                      prev ? { ...prev, phone: e.target.value } : null
                    )}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Select
                    value={editingDoctor.department}
                    onValueChange={(value) => setEditingDoctor(prev => 
                      prev ? { ...prev, department: value } : null
                    )}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((dept) => (
                        <SelectItem key={dept} value={dept}>
                          {dept}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Specialization</Label>
                  <Input
                    value={editingDoctor.specialization}
                    onChange={(e) => setEditingDoctor(prev => 
                      prev ? { ...prev, specialization: e.target.value } : null
                    )}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Consultation Fee</Label>
                  <Input
                    type="number"
                    value={editingDoctor.consultationFee || ""}
                    onChange={(e) => setEditingDoctor(prev => 
                      prev ? { ...prev, consultationFee: parseFloat(e.target.value) || undefined } : null
                    )}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Status</Label>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="active"
                      checked={editingDoctor.active}
                      onChange={(e) => setEditingDoctor(prev =>
                        prev ? { ...prev, active: e.target.checked } : null
                      )}
                      className="rounded"
                    />
                    <Label htmlFor="active">Active</Label>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="approved"
                      checked={editingDoctor.approved}
                      onChange={(e) => setEditingDoctor(prev =>
                        prev ? { ...prev, approved: e.target.checked } : null
                      )}
                      className="rounded"
                    />
                    <Label htmlFor="approved">Approved</Label>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="font-medium">Working Hours</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="workingDays">Working Days</Label>
                    <Input
                      id="workingDays"
                      placeholder="monday,tuesday,wednesday,thursday,friday"
                      value={editingDoctor.availability?.days?.join(', ') || ''}
                      onChange={(e) => setEditingDoctor(prev =>
                        prev ? { ...prev, availability: { ...prev.availability!, days: e.target.value.split(',').map(d => d.trim()) } } : null
                      )}
                    />
                    <p className="text-xs text-gray-500">
                      Enter days separated by commas (monday, tuesday, etc.)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="startTime">Start Time</Label>
                    <Input
                      id="startTime"
                      type="time"
                      value={editingDoctor.availability?.startTime || ''}
                      onChange={(e) => setEditingDoctor(prev =>
                        prev ? { ...prev, availability: { ...prev.availability!, startTime: e.target.value } } : null
                      )}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="endTime">End Time</Label>
                    <Input
                      id="endTime"
                      type="time"
                      value={editingDoctor.availability?.endTime || ''}
                      onChange={(e) => setEditingDoctor(prev =>
                        prev ? { ...prev, availability: { ...prev.availability!, endTime: e.target.value } } : null
                      )}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="breakTime">Break Time (Optional)</Label>
                    <div className="flex gap-2">
                      <Input
                        id="breakStart"
                        type="time"
                        placeholder="Start"
                        value={editingDoctor.availability?.breakStart || ''}
                        onChange={(e) => setEditingDoctor(prev =>
                          prev ? { ...prev, availability: { ...prev.availability!, breakStart: e.target.value } } : null
                        )}
                      />
                      <Input
                        id="breakEnd"
                        type="time"
                        placeholder="End"
                        value={editingDoctor.availability?.breakEnd || ''}
                        onChange={(e) => setEditingDoctor(prev =>
                          prev ? { ...prev, availability: { ...prev.availability!, breakEnd: e.target.value } } : null
                        )}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowEditDoctorDialog(false)}
                disabled={updatingDoctor}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateDoctor}
                disabled={updatingDoctor}
              >
                {updatingDoctor ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Doctor"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Doctor</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate Dr. {deletingDoctor?.name}?
              This will make them unavailable for new appointments but won't delete their records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDoctor}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deactivating...
                </>
              ) : (
                "Deactivate Doctor"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}