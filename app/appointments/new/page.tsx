// app/appointments/new/page.tsx

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  CalendarIcon,
  Clock,
  User,
  Stethoscope,
  Search,
  ArrowLeft,
  AlertCircle,
  Plus,
  UserPlus,
  X,
  Loader2,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Heart,
  Activity,
  RefreshCw,
  Hash,
} from "lucide-react";
import { format, isValid, addMinutes, startOfDay, isToday } from "date-fns";
import { cn } from "@/lib/utils";

interface Patient {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  patientId: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
}

interface Doctor {
  _id: string;
  name: string;
  specialization: string;
  department: string;
  phone?: string;
}

interface TimeSlot {
  startTime: string;
  endTime: string;
  formattedTime: string;
  autoNumber: string;
}

// Note: TimeSlot interface kept for potential future use, but not used in current implementation

interface NewPatientFormData {
  name: string;
  phone: string;
  email: string;
  dateOfBirth: string;
  gender: "male" | "female" | "other";
  address: string;
  emergencyContact: string;
  bloodGroup: string;
  allergies: string;
  medicalHistory: string;
}

export default function NewAppointmentPage() {
  const router = useRouter();
  const { user, accessToken } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Form state
  const [patientSearch, setPatientSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<string>("");
  const [appointmentDate, setAppointmentDate] = useState<string>(
    format(new Date(), "yyyy-MM-dd")
  );
  const [duration] = useState<number>(20); // Fixed 20 minutes duration
  const [appointmentType, setAppointmentType] = useState<string>("consultation");
  const [priority, setPriority] = useState<string>("medium");
  const [reason, setReason] = useState<string>("");
  const [symptoms, setSymptoms] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [autoNumber, setAutoNumber] = useState<string>("");

  // New Patient Dialog
  const [showNewPatientDialog, setShowNewPatientDialog] = useState(false);
  const [creatingPatient, setCreatingPatient] = useState(false);
  const [newPatientForm, setNewPatientForm] = useState<NewPatientFormData>({
    name: "",
    phone: "",
    email: "",
    dateOfBirth: format(new Date(new Date().getFullYear() - 30, 0, 1), "yyyy-MM-dd"),
    gender: "male",
    address: "",
    emergencyContact: "",
    bloodGroup: "",
    allergies: "",
    medicalHistory: "",
  });

  // Auto-numbering
  const [todaysAppointmentsCount, setTodaysAppointmentsCount] = useState<number>(0);
  const [showNoResults, setShowNoResults] = useState(false);

  useEffect(() => {
    fetchDoctors();
  }, []);

  useEffect(() => {
    if (selectedDoctor && appointmentDate) {
      generateAutoNumber();
    }
  }, [selectedDoctor, appointmentDate]);

  const fetchDoctors = async () => {
    try {
      setLoadingDoctors(true);
      setError(null);
      const response = await fetch("/api/doctors", {
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
      });

      const data = await response.json();

      if (data.success) {
        setDoctors(data.data);
      } else {
        setError("Failed to load doctors. Please try again.");
      }
    } catch (error) {
      console.error("Error fetching doctors:", error);
      setError("Failed to load doctors. Please try again.");
    } finally {
      setLoadingDoctors(false);
    }
  };

  const searchPatients = async () => {
    if (!patientSearch.trim()) {
      setSearchResults([]);
      setShowNoResults(false);
      return;
    }
    
    try {
      setSearching(true);
      setError(null);
      setShowNoResults(false);
      
      const response = await fetch(`/api/patients/search?q=${encodeURIComponent(patientSearch)}&limit=10`, {
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSearchResults(data.data);
        
        // Show "no results" message if search returned empty and query is at least 2 chars
        if (data.data.length === 0 && patientSearch.trim().length >= 2) {
          setShowNoResults(true);
          // Auto-fill new patient form with search query
          const searchTerms = patientSearch.trim().split(/\s+/);
          if (searchTerms.length >= 2) {
            setNewPatientForm(prev => ({
              ...prev,
              name: patientSearch.trim(),
              phone: "",
              email: "",
            }));
          }
        }
      } else {
        setError(data.error || "Failed to search patients");
      }
    } catch (error) {
      console.error("Error searching patients:", error);
      setError("Failed to search patients. Please try again.");
    } finally {
      setSearching(false);
    }
  };

  const generateAutoNumber = async () => {
    if (!selectedDoctor || !appointmentDate) return;

    try {
      // Get today's appointments count for auto-numbering
      const todayCountResponse = await fetch(`/api/appointments/count?doctorId=${selectedDoctor}&date=${appointmentDate}`, {
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
      });

      const countData = await todayCountResponse.json();
      const todaysCount = countData.success ? countData.count : 0;
      setTodaysAppointmentsCount(todaysCount);

      // Generate next auto-number
      const nextNumber = (todaysCount + 1).toString().padStart(3, '0');
      setAutoNumber(nextNumber);
    } catch (error) {
      console.error("Error generating auto number:", error);
      setError("Failed to generate appointment number");
    }
  };

  const createNewPatient = async () => {
    try {
      setCreatingPatient(true);
      setError(null);
      
      // Validate required fields
      if (!newPatientForm.name.trim()) {
        setError("Patient name is required");
        return;
      }
      
      if (!newPatientForm.phone.trim()) {
        setError("Phone number is required");
        return;
      }
      
      // Phone validation
      const phoneRegex = /^[\+]?[1-9][\d\s\-\(\)]{8,}$/;
      if (!phoneRegex.test(newPatientForm.phone.replace(/\D/g, ''))) {
        setError("Please enter a valid phone number");
        return;
      }
      
      // Date validation
      if (!newPatientForm.dateOfBirth || !isValid(new Date(newPatientForm.dateOfBirth))) {
        setError("Please enter a valid date of birth");
        return;
      }
      
      const response = await fetch("/api/patients", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify(newPatientForm),
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Set the newly created patient as selected
        const newPatient: Patient = {
          _id: data.data.id,
          name: data.data.name,
          phone: data.data.phone,
          email: data.data.email,
          patientId: data.data.patientId,
          dateOfBirth: data.data.dateOfBirth,
          gender: data.data.gender,
          address: data.data.address,
        };
        
        setSelectedPatient(newPatient);
        setShowNewPatientDialog(false);
        setPatientSearch("");
        setSearchResults([]);
        setShowNoResults(false);
        
        // Reset form
        setNewPatientForm({
          name: "",
          phone: "",
          email: "",
          dateOfBirth: format(new Date(new Date().getFullYear() - 30, 0, 1), "yyyy-MM-dd"),
          gender: "male",
          address: "",
          emergencyContact: "",
          bloodGroup: "",
          allergies: "",
          medicalHistory: "",
        });
        
        setSuccess("Patient created successfully!");
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(null), 3000);
      } else {
        // Handle duplicate patient case
        if (data.error && data.error.includes("already exists") && data.data) {
          setError(`Patient already exists: ${data.data.name} (${data.data.phone})`);
          // Auto-select existing patient
          const existingPatient: Patient = {
            _id: data.data.id,
            name: data.data.name,
            phone: data.data.phone,
            patientId: data.data.patientId || "N/A",
          };
          setSelectedPatient(existingPatient);
          setShowNewPatientDialog(false);
        } else {
          setError(data.error || "Failed to create patient");
        }
      }
    } catch (error: any) {
      console.error("Error creating patient:", error);
      setError(error.message || "Failed to create patient");
    } finally {
      setCreatingPatient(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPatient || !selectedDoctor || !appointmentDate || !reason) {
      setError("Please select a patient, doctor, date, and provide appointment reason");
      return;
    }
    
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Generate appointment time (use current time)
      const now = new Date();
      const appointmentDateTime = new Date(appointmentDate);
      
      // Set time to 9:00 AM or current time if later
      appointmentDateTime.setHours(9, 0, 0, 0);
      if (isToday(new Date(appointmentDate)) && now > appointmentDateTime) {
        appointmentDateTime.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
      }
      
      // Calculate end time (20 minutes after start)
      const endTime = new Date(appointmentDateTime);
      endTime.setMinutes(endTime.getMinutes() + duration);
      
      const appointmentData = {
        patientId: selectedPatient._id,
        doctorId: selectedDoctor,
        startTime: appointmentDateTime.toISOString(),
        endTime: endTime.toISOString(),
        duration,
        appointmentType,
        reason: reason.trim(),
        symptoms: symptoms.trim(),
        priority,
        notes: notes.trim(),
        autoNumber,
      };
      
      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify(appointmentData),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSuccess("Appointment created successfully!");
        
        // Reset form
        setSelectedPatient(null);
        setSelectedDoctor("");
        setAppointmentDate(format(new Date(), "yyyy-MM-dd"));
        setAppointmentType("consultation");
        setPriority("medium");
        setReason("");
        setSymptoms("");
        setNotes("");
        setPatientSearch("");
        setSearchResults([]);
        setShowNoResults(false);
        setAutoNumber("");
        setTodaysAppointmentsCount(0);
        
        // Redirect after 2 seconds
        setTimeout(() => {
          router.push("/appointments");
          router.refresh();
        }, 2000);
      } else {
        setError(data.error || "Failed to create appointment");
      }
    } catch (error: any) {
      console.error("Error creating appointment:", error);
      setError(error.message || "Failed to create appointment");
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = () => {
    return (
      selectedPatient &&
      selectedDoctor &&
      appointmentDate &&
      reason.trim()
    );
  };

  // Handle doctor selection
  const handleDoctorSelect = async (doctorId: string) => {
    setSelectedDoctor(doctorId);
  };

  // Handle Enter key for patient search
  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      searchPatients();
    }
  };

  // Clear search and results
  const clearSearch = () => {
    setPatientSearch("");
    setSearchResults([]);
    setShowNoResults(false);
  };

  // Handle patient selection from search results
  const handleSelectPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setPatientSearch(patient.name);
    setSearchResults([]);
    setShowNoResults(false);
  };

  // Handle date change with validation
  const handleDateChange = (date: string) => {
    const selectedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      setError("Appointment date cannot be in the past");
      return;
    }

    setAppointmentDate(date);
    setAutoNumber(""); // Clear auto number when date changes
    setError(null);
  };

  // Format date for display
  const formatDisplayDate = (date: string) => {
    try {
      return format(new Date(date), "EEEE, MMMM d, yyyy");
    } catch {
      return "Invalid date";
    }
  };

  // Get selected doctor info
  const selectedDoctorInfo = doctors.find(d => d._id === selectedDoctor);

  // Format time for display
  const formatTimeDisplay = (time: string) => {
    try {
      const [hours, minutes] = time.split(':');
      const date = new Date();
      date.setHours(parseInt(hours), parseInt(minutes));
      return format(date, "h:mm a");
    } catch {
      return time;
    }
  };

  // Format time from Date object
  const formatDateToTime = (date: Date): string => {
    return format(date, "HH:mm");
  };

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            onClick={() => router.push("/appointments")}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Appointments
          </Button>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-medium text-blue-600">
              {format(new Date(), "MMM d, yyyy")}
            </span>
          </div>
        </div>
        
        <div>
          <h1 className="text-3xl font-bold tracking-tight">New Appointment</h1>
          <p className="text-gray-500 mt-2">
            Schedule a new appointment for a patient
          </p>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {success && (
        <Alert className="mb-6 bg-green-50 text-green-800 border-green-200">
          <AlertCircle className="h-4 w-4 text-green-600" />
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Patient & Details */}
          <div className="lg:col-span-2 space-y-8">
            {/* Patient Selection Card */}
            <Card className="border-blue-100">
              <CardHeader className="bg-blue-50 border-b border-blue-100">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl flex items-center gap-2">
                      <User className="h-5 w-5 text-blue-600" />
                      Patient Information
                    </CardTitle>
                    <CardDescription>
                      Search for an existing patient or create a new one
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                      Step 1 of 3
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                {selectedPatient ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-linear-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <div className="p-3 bg-white rounded-lg border shadow-sm">
                            <User className="h-8 w-8 text-blue-600" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="text-lg font-semibold text-gray-900">
                                {selectedPatient.name}
                              </h3>
                              <span className="text-xs font-medium px-2 py-1 bg-green-100 text-green-700 rounded-full">
                                Selected
                              </span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4 text-gray-400" />
                                <span className="text-sm text-gray-600">{selectedPatient.phone}</span>
                              </div>
                              {selectedPatient.email && (
                                <div className="flex items-center gap-2">
                                  <Mail className="h-4 w-4 text-gray-400" />
                                  <span className="text-sm text-gray-600">{selectedPatient.email}</span>
                                </div>
                              )}
                              {selectedPatient.patientId && (
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4 text-gray-400" />
                                  <span className="text-sm font-medium text-gray-700">
                                    ID: {selectedPatient.patientId}
                                  </span>
                                </div>
                              )}
                              {selectedPatient.dateOfBirth && (
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4 text-gray-400" />
                                  <span className="text-sm text-gray-600">
                                    {format(new Date(selectedPatient.dateOfBirth), "MMM d, yyyy")}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedPatient(null);
                              setPatientSearch(selectedPatient.name);
                            }}
                          >
                            Change
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedPatient(null);
                              clearSearch();
                            }}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    <div className="text-sm text-green-600 font-medium">
                      ✓ Patient selected. You can now proceed to schedule the appointment.
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="patientSearch" className="text-base font-medium">
                          Search Patient *
                        </Label>
                        <span className="text-sm text-gray-500">
                          Search by name, phone, or patient ID
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input
                            id="patientSearch"
                            placeholder="Enter patient name, phone number, or patient ID..."
                            value={patientSearch}
                            onChange={(e) => {
                              setPatientSearch(e.target.value);
                              if (e.target.value === "") {
                                setSearchResults([]);
                                setShowNoResults(false);
                              }
                            }}
                            onKeyDown={handleSearchKeyDown}
                            className="pl-9 h-11 text-base"
                          />
                          {patientSearch && (
                            <button
                              type="button"
                              onClick={clearSearch}
                              className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={searchPatients}
                          disabled={searching || !patientSearch.trim()}
                          className="h-11 px-6"
                        >
                          {searching ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Search className="h-4 w-4" />
                          )}
                          <span className="ml-2">Search</span>
                        </Button>
                        <Dialog open={showNewPatientDialog} onOpenChange={setShowNewPatientDialog}>
                          <DialogTrigger asChild>
                            <Button
                              type="button"
                              className="h-11 bg-linear-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                            >
                              <UserPlus className="h-4 w-4 mr-2" />
                              New Patient
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle className="text-2xl flex items-center gap-2">
                                <UserPlus className="h-6 w-6" />
                                Create New Patient
                              </DialogTitle>
                              <DialogDescription>
                                Fill in the patient details below. All fields marked with * are required.
                              </DialogDescription>
                            </DialogHeader>
                            
                            <Tabs defaultValue="basic" className="w-full">
                              <TabsList className="grid w-full grid-cols-2 mb-6">
                                <TabsTrigger value="basic" className="flex items-center gap-2">
                                  <User className="h-4 w-4" />
                                  Basic Information
                                </TabsTrigger>
                                <TabsTrigger value="medical" className="flex items-center gap-2">
                                  <Activity className="h-4 w-4" />
                                  Medical Information
                                </TabsTrigger>
                              </TabsList>
                              
                              <TabsContent value="basic" className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  <div className="space-y-3">
                                    <Label htmlFor="name" className="font-medium">
                                      Full Name *
                                    </Label>
                                    <Input
                                      id="name"
                                      placeholder="John Doe"
                                      value={newPatientForm.name}
                                      onChange={(e) => setNewPatientForm(prev => ({
                                        ...prev,
                                        name: e.target.value
                                      }))}
                                      required
                                      className="h-11"
                                    />
                                  </div>
                                  
                                  <div className="space-y-3">
                                    <Label htmlFor="phone" className="font-medium">
                                      Phone Number *
                                    </Label>
                                    <Input
                                      id="phone"
                                      placeholder="+1 (555) 123-4567"
                                      value={newPatientForm.phone}
                                      onChange={(e) => setNewPatientForm(prev => ({
                                        ...prev,
                                        phone: e.target.value
                                      }))}
                                      required
                                      className="h-11"
                                    />
                                  </div>
                                  
                                  <div className="space-y-3">
                                    <Label htmlFor="email">Email Address</Label>
                                    <Input
                                      id="email"
                                      type="email"
                                      placeholder="john@example.com"
                                      value={newPatientForm.email}
                                      onChange={(e) => setNewPatientForm(prev => ({
                                        ...prev,
                                        email: e.target.value
                                      }))}
                                      className="h-11"
                                    />
                                  </div>
                                  
                                  <div className="space-y-3">
                                    <Label htmlFor="dateOfBirth" className="font-medium">
                                      Date of Birth *
                                    </Label>
                                    <Input
                                      id="dateOfBirth"
                                      type="date"
                                      value={newPatientForm.dateOfBirth}
                                      onChange={(e) => setNewPatientForm(prev => ({
                                        ...prev,
                                        dateOfBirth: e.target.value
                                      }))}
                                      required
                                      className="h-11"
                                    />
                                  </div>
                                  
                                  <div className="space-y-3">
                                    <Label htmlFor="gender" className="font-medium">
                                      Gender *
                                    </Label>
                                    <Select
                                      value={newPatientForm.gender}
                                      onValueChange={(value: "male" | "female" | "other") => 
                                        setNewPatientForm(prev => ({ ...prev, gender: value }))
                                      }
                                    >
                                      <SelectTrigger className="h-11">
                                        <SelectValue placeholder="Select gender" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="male">Male</SelectItem>
                                        <SelectItem value="female">Female</SelectItem>
                                        <SelectItem value="other">Other</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  
                                  <div className="space-y-3">
                                    <Label htmlFor="bloodGroup">Blood Group</Label>
                                    <Select
                                      value={newPatientForm.bloodGroup}
                                      onValueChange={(value) => 
                                        setNewPatientForm(prev => ({ ...prev, bloodGroup: value }))
                                      }
                                    >
                                      <SelectTrigger className="h-11">
                                        <SelectValue placeholder="Select blood group" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="A+">A+</SelectItem>
                                        <SelectItem value="A-">A-</SelectItem>
                                        <SelectItem value="B+">B+</SelectItem>
                                        <SelectItem value="B-">B-</SelectItem>
                                        <SelectItem value="AB+">AB+</SelectItem>
                                        <SelectItem value="AB-">AB-</SelectItem>
                                        <SelectItem value="O+">O+</SelectItem>
                                        <SelectItem value="O-">O-</SelectItem>
                                        <SelectItem value="unknown">Unknown</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                                
                                <div className="space-y-3">
                                  <Label htmlFor="address" className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4" />
                                    Address
                                  </Label>
                                  <Textarea
                                    id="address"
                                    placeholder="123 Main Street, City, State, ZIP Code"
                                    value={newPatientForm.address}
                                    onChange={(e) => setNewPatientForm(prev => ({
                                      ...prev,
                                      address: e.target.value
                                    }))}
                                    rows={2}
                                  />
                                </div>
                                
                                <div className="space-y-3">
                                  <Label htmlFor="emergencyContact" className="flex items-center gap-2">
                                    <Phone className="h-4 w-4" />
                                    Emergency Contact
                                  </Label>
                                  <Input
                                    id="emergencyContact"
                                    placeholder="Emergency contact name and phone number"
                                    value={newPatientForm.emergencyContact}
                                    onChange={(e) => setNewPatientForm(prev => ({
                                      ...prev,
                                      emergencyContact: e.target.value
                                    }))}
                                    className="h-11"
                                  />
                                </div>
                              </TabsContent>
                              
                              <TabsContent value="medical" className="space-y-6">
                                <div className="space-y-3">
                                  <Label htmlFor="allergies" className="flex items-center gap-2">
                                    <AlertCircle className="h-4 w-4" />
                                    Allergies
                                  </Label>
                                  <Textarea
                                    id="allergies"
                                    placeholder="List any allergies (e.g., Penicillin, Peanuts, Latex, Dust, Pollen, etc.)"
                                    value={newPatientForm.allergies}
                                    onChange={(e) => setNewPatientForm(prev => ({
                                      ...prev,
                                      allergies: e.target.value
                                    }))}
                                    rows={3}
                                  />
                                  <p className="text-sm text-gray-500">
                                    Separate multiple allergies with commas
                                  </p>
                                </div>
                                
                                <div className="space-y-3">
                                  <Label htmlFor="medicalHistory" className="flex items-center gap-2">
                                    <Activity className="h-4 w-4" />
                                    Medical History
                                  </Label>
                                  <Textarea
                                    id="medicalHistory"
                                    placeholder="Previous medical conditions, surgeries, chronic illnesses, medications, etc."
                                    value={newPatientForm.medicalHistory}
                                    onChange={(e) => setNewPatientForm(prev => ({
                                      ...prev,
                                      medicalHistory: e.target.value
                                    }))}
                                    rows={4}
                                  />
                                  <p className="text-sm text-gray-500">
                                    Include any relevant medical history for better care
                                  </p>
                                </div>
                              </TabsContent>
                            </Tabs>
                            
                            <DialogFooter className="gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => setShowNewPatientDialog(false)}
                                disabled={creatingPatient}
                                className="flex-1"
                              >
                                Cancel
                              </Button>
                              <Button
                                type="button"
                                onClick={createNewPatient}
                                disabled={creatingPatient || !newPatientForm.name.trim() || !newPatientForm.phone.trim()}
                                className="flex-1 bg-linear-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
                              >
                                {creatingPatient ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Creating Patient...
                                  </>
                                ) : (
                                  <>
                                    <UserPlus className="h-4 w-4 mr-2" />
                                    Create Patient
                                  </>
                                )}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>

                    {/* Search Results */}
                    {searching ? (
                      <div className="py-8 text-center border-2 border-dashed border-gray-200 rounded-lg">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
                        <p className="text-gray-600 mt-3 font-medium">Searching patients...</p>
                        <p className="text-sm text-gray-500 mt-1">Please wait while we search our database</p>
                      </div>
                    ) : searchResults.length > 0 ? (
                      <div className="border rounded-lg overflow-hidden">
                        <div className="bg-gray-50 px-4 py-3 border-b">
                          <h3 className="font-semibold text-gray-700">
                            Found {searchResults.length} patient{searchResults.length !== 1 ? 's' : ''}
                          </h3>
                          <p className="text-sm text-gray-500">Select a patient from the list below</p>
                        </div>
                        <div className="max-h-80 overflow-y-auto">
                          {searchResults.map((patient) => (
                            <div
                              key={patient._id}
                              className="p-4 border-b hover:bg-blue-50 transition-colors cursor-pointer group"
                              onClick={() => handleSelectPatient(patient)}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="p-2 bg-white border rounded-lg group-hover:bg-blue-100 transition-colors">
                                    <User className="h-5 w-5 text-gray-600" />
                                  </div>
                                  <div>
                                    <h4 className="font-semibold text-gray-900 group-hover:text-blue-700">
                                      {patient.name}
                                    </h4>
                                    <div className="flex flex-wrap gap-3 mt-1">
                                      <span className="text-sm text-gray-600 flex items-center gap-1">
                                        <Phone className="h-3 w-3" />
                                        {patient.phone}
                                      </span>
                                      {patient.email && (
                                        <span className="text-sm text-gray-600 flex items-center gap-1">
                                          <Mail className="h-3 w-3" />
                                          {patient.email}
                                        </span>
                                      )}
                                      {patient.patientId && (
                                        <span className="text-sm font-medium text-blue-600">
                                          ID: {patient.patientId}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                >
                                  Select
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : showNoResults ? (
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <User className="h-8 w-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">
                          No Patients Found
                        </h3>
                        <p className="text-gray-500 mb-6 max-w-md mx-auto">
                          No patients found matching "<span className="font-medium">{patientSearch}</span>"
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setNewPatientForm(prev => ({
                                ...prev,
                                name: patientSearch.trim(),
                                phone: "",
                                email: "",
                              }));
                              setShowNewPatientDialog(true);
                            }}
                            className="gap-2"
                          >
                            <Plus className="h-4 w-4" />
                            Create New Patient
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={clearSearch}
                          >
                            Clear Search
                          </Button>
                        </div>
                      </div>
                    ) : patientSearch.trim().length > 0 && !showNoResults ? (
                      <div className="text-center py-8 text-gray-500">
                        <p>Press Enter or click Search to find patients</p>
                      </div>
                    ) : null}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Doctor & Time Selection Card */}
            <Card className={cn(
              "border-gray-200",
              !selectedPatient && "opacity-60 pointer-events-none"
            )}>
              <CardHeader className="bg-gray-50 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl flex items-center gap-2">
                      <Stethoscope className="h-5 w-5 text-gray-600" />
                      Doctor & Appointment Date
                    </CardTitle>
                    <CardDescription>
                      Select doctor and appointment date
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium px-2 py-1 bg-gray-100 text-gray-700 rounded-full">
                      Step 2 of 3
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                {/* Doctor Selection */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="doctor" className="text-base font-medium">
                      Select Doctor *
                    </Label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">
                        {doctors.length} doctor{doctors.length !== 1 ? 's' : ''} available
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={fetchDoctors}
                        disabled={loadingDoctors}
                        className="h-8 px-2"
                      >
                        {loadingDoctors ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <Select
                    value={selectedDoctor}
                    onValueChange={handleDoctorSelect}
                    required
                    disabled={loadingDoctors || !selectedPatient}
                  >
                    <SelectTrigger className="h-11 text-base">
                      <SelectValue placeholder="Choose a doctor..." />
                    </SelectTrigger>
                    <SelectContent>
                      {doctors.map((doctor) => (
                        <SelectItem key={doctor._id} value={doctor._id}>
                          <div className="flex flex-col py-1">
                            <span className="font-medium">Dr. {doctor.name}</span>
                            <span className="text-sm text-gray-500">
                              {doctor.specialization} • {doctor.department}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!selectedPatient && (
                    <p className="text-sm text-amber-600 font-medium">
                      ⚠ Please select a patient first to choose a doctor
                    </p>
                  )}
                </div>

                {/* Date & Auto-Number Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label htmlFor="date" className="flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4" />
                      Appointment Date *
                    </Label>
                    <div className="relative">
                      <Input
                        id="date"
                        type="date"
                        value={appointmentDate}
                        onChange={(e) => handleDateChange(e.target.value)}
                        required
                        className="h-11 pl-10"
                        min={format(new Date(), "yyyy-MM-dd")}
                        disabled={!selectedPatient}
                      />
                      <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-500">
                      {formatDisplayDate(appointmentDate)}
                    </p>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="font-medium flex items-center gap-2">
                        <Hash className="h-4 w-4" />
                        Auto Number
                      </Label>
                      <div className="text-sm text-gray-500">
                        {todaysAppointmentsCount > 0 ? `Today's appointments: ${todaysAppointmentsCount}` : ''}
                      </div>
                    </div>
                    <div className="relative">
                      <Input
                        value={autoNumber}
                        readOnly
                        className="h-11 pl-10 bg-gray-50 font-mono text-lg font-bold"
                        placeholder="Auto-generated number"
                      />
                      <Hash className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    </div>
                    <p className="text-sm text-blue-600 font-medium">
                      ✓ Auto-number generated based on today's sequence
                    </p>
                  </div>
                </div>

                {/* Appointment Information */}
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <Clock className="h-5 w-5 text-blue-600" />
                    <h4 className="font-medium text-blue-700">Appointment Information</h4>
                  </div>
                  <div className="space-y-2 text-sm text-gray-600">
                    <p>• Each appointment is automatically set to <span className="font-semibold">20 minutes</span></p>
                    <p>• Auto-number starts from 001 for each doctor daily</p>
                    <p>• Time will be automatically assigned based on sequence</p>
                    <p>• Focus is on the auto-number rather than specific times</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Appointment Details Card */}
            <Card className={cn(
              "border-gray-200",
              (!selectedPatient || !selectedDoctor) && "opacity-60 pointer-events-none"
            )}>
              <CardHeader className="bg-gray-50 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-gray-600" />
                      Appointment Details
                    </CardTitle>
                    <CardDescription>
                      Provide appointment reason and additional information
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium px-2 py-1 bg-gray-100 text-gray-700 rounded-full">
                      Step 3 of 3
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label htmlFor="appointmentType" className="font-medium">
                      Appointment Type *
                    </Label>
                    <Select
                      value={appointmentType}
                      onValueChange={setAppointmentType}
                      required
                      disabled={!selectedPatient || !selectedDoctor}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="consultation">General Consultation</SelectItem>
                        <SelectItem value="followup">Follow-up Visit</SelectItem>
                        <SelectItem value="emergency">Emergency Visit</SelectItem>
                        <SelectItem value="checkup">Routine Check-up</SelectItem>
                        <SelectItem value="procedure">Medical Procedure</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-3">
                    <Label htmlFor="priority" className="font-medium">
                      Priority Level *
                    </Label>
                    <Select
                      value={priority}
                      onValueChange={setPriority}
                      required
                      disabled={!selectedPatient || !selectedDoctor}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span>Low Priority</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="medium">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                            <span>Medium Priority</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="high">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                            <span>High Priority</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="emergency">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                            <span>Emergency</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <Label htmlFor="reason" className="font-medium">
                    Reason for Appointment *
                  </Label>
                  <Textarea
                    id="reason"
                    placeholder="Please describe the reason for the appointment in detail..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    required
                    rows={4}
                    className="resize-none"
                    disabled={!selectedPatient || !selectedDoctor}
                  />
                  <p className="text-sm text-gray-500">
                    Be specific about symptoms, concerns, or follow-up needs
                  </p>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label htmlFor="symptoms" className="flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      Symptoms (Optional)
                    </Label>
                    <Textarea
                      id="symptoms"
                      placeholder="List any symptoms the patient is experiencing..."
                      value={symptoms}
                      onChange={(e) => setSymptoms(e.target.value)}
                      rows={3}
                      className="resize-none"
                      disabled={!selectedPatient || !selectedDoctor}
                    />
                  </div>
                  
                  <div className="space-y-3">
                    <Label htmlFor="notes" className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      Additional Notes (Optional)
                    </Label>
                    <Textarea
                      id="notes"
                      placeholder="Any special instructions, preferences, or notes..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      className="resize-none"
                      disabled={!selectedPatient || !selectedDoctor}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Summary & Actions */}
          <div className="space-y-8">
            {/* Summary Card */}
            <Card className="sticky top-6 border-blue-100 shadow-lg">
              <CardHeader className="bg-linear-to-r from-blue-50 to-indigo-50 border-b border-blue-200">
                <CardTitle className="text-xl text-gray-900">
                  Appointment Summary
                </CardTitle>
                <CardDescription>
                  Review all details before scheduling
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-700 flex items-center gap-2">
                      <User className="h-4 w-4 text-blue-600" />
                      Patient Details
                    </h4>
                    <div className={cn(
                      "p-3 rounded-lg border",
                      selectedPatient ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"
                    )}>
                      <p className={cn(
                        "font-medium",
                        selectedPatient ? "text-green-700" : "text-gray-400 italic"
                      )}>
                        {selectedPatient ? selectedPatient.name : "No patient selected"}
                      </p>
                      {selectedPatient && (
                        <div className="mt-2 space-y-1 text-sm">
                          <p className="text-gray-600">{selectedPatient.phone}</p>
                          {selectedPatient.patientId && (
                            <p className="text-gray-500">ID: {selectedPatient.patientId}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-700 flex items-center gap-2">
                      <Stethoscope className="h-4 w-4 text-blue-600" />
                      Doctor Details
                    </h4>
                    <div className={cn(
                      "p-3 rounded-lg border",
                      selectedDoctor ? "bg-blue-50 border-blue-200" : "bg-gray-50 border-gray-200"
                    )}>
                      <p className={cn(
                        "font-medium",
                        selectedDoctor ? "text-blue-700" : "text-gray-400 italic"
                      )}>
                        {selectedDoctorInfo ? `Dr. ${selectedDoctorInfo.name}` : "No doctor selected"}
                      </p>
                      {selectedDoctorInfo && (
                        <div className="mt-2 space-y-1 text-sm">
                          <p className="text-gray-600">{selectedDoctorInfo.specialization}</p>
                          <p className="text-gray-500">{selectedDoctorInfo.department}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-700 flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-blue-600" />
                      Appointment Date & Number
                    </h4>
                    <div className={cn(
                      "p-3 rounded-lg border",
                      appointmentDate ? "bg-purple-50 border-purple-200" : "bg-gray-50 border-gray-200"
                    )}>
                      <p className={cn(
                        "font-medium",
                        appointmentDate ? "text-purple-700" : "text-gray-400 italic"
                      )}>
                        {appointmentDate
                          ? `${formatDisplayDate(appointmentDate)}`
                          : "No date selected"}
                      </p>
                      {appointmentDate && (
                        <div className="mt-2 space-y-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-gray-600">Appointment scheduled for this date</p>
                            </div>
                            <div className="text-right">
                              <div className="flex items-center gap-2">
                                <Hash className="h-4 w-4 text-blue-600" />
                                <span className="text-lg font-bold text-blue-700">
                                  #{autoNumber}
                                </span>
                              </div>
                              <p className="text-xs text-gray-500">Auto Number</p>
                            </div>
                          </div>
                          <div className="flex justify-between items-center mt-2">
                            <span className={cn(
                              "px-2 py-1 rounded-full text-xs font-medium",
                              priority === "emergency" ? "bg-red-100 text-red-700" :
                              priority === "high" ? "bg-orange-100 text-orange-700" :
                              priority === "medium" ? "bg-yellow-100 text-yellow-700" :
                              "bg-green-100 text-green-700"
                            )}>
                              {priority.toUpperCase()}
                            </span>
                            <span className="text-sm font-medium text-blue-600">
                              {isToday(new Date(appointmentDate)) ? "Today" : format(new Date(appointmentDate), "MMM d")}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-700">Appointment Type</h4>
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                      <p className="font-medium text-gray-900 capitalize">
                        {appointmentType.replace("-", " ")}
                      </p>
                      {reason && (
                        <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                          {reason}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Card */}
            <Card className="border-green-100 shadow-lg">
              <CardContent className="p-6">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Ready to Schedule
                    </h3>
                    <p className="text-gray-600 text-sm">
                      Review all information and schedule the appointment
                    </p>
                  </div>
                  
                  <div className="space-y-3">
                    <Button
                      type="submit"
                      disabled={loading || !isFormValid()}
                      className="w-full h-12 text-base font-medium bg-linear-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
                      size="lg"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                          Creating Appointment...
                        </>
                      ) : (
                        <>
                          <Calendar className="h-5 w-5 mr-2" />
                          Schedule Appointment
                        </>
                      )}
                    </Button>
                    
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => router.push("/appointments")}
                      className="w-full h-11"
                      disabled={loading}
                    >
                      Cancel
                    </Button>
                  </div>
                  
                  {!isFormValid() && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-amber-600" />
                        <span className="text-sm font-medium text-amber-700">
                          Incomplete Information
                        </span>
                      </div>
                      <ul className="mt-2 space-y-1 text-sm text-amber-600">
                        {!selectedPatient && <li>• Select or create a patient</li>}
                        {!selectedDoctor && <li>• Choose a doctor</li>}
                        {!appointmentDate && <li>• Select appointment date</li>}
                        {!reason && <li>• Provide appointment reason</li>}
                      </ul>
                    </div>
                  )}
                  
                  <div className="pt-4 border-t border-gray-200">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Need Help?</h4>
                    <div className="space-y-2 text-sm text-gray-600">
                      <p>• Appointments are scheduled by date only</p>
                      <p>• Auto-number starts from 001 daily for each doctor</p>
                      <p>• Sequential numbering based on daily appointment count</p>
                      <p>• Emergency appointments take priority</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}