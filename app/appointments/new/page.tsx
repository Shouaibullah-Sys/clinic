"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
  Activity,
  RefreshCw,
  Hash,
  CheckCircle,
  ChevronRight,
  Sparkles,
  FileText,
  Shield,
  TrendingUp,
  Brain,
  Heart,
  Eye,
  Thermometer,
} from "lucide-react";
import { format, isValid, isToday, addMinutes } from "date-fns";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { z } from "zod";

// Validation schemas
const patientSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  dateOfBirth: z.string().refine(date => isValid(new Date(date)), "Invalid date of birth"),
  gender: z.enum(["male", "female", "other"]),
});

const appointmentSchema = z.object({
  patientId: z.string().min(1, "Patient is required"),
  doctorId: z.string().min(1, "Doctor is required"),
  appointmentDate: z.string().refine(date => isValid(new Date(date)), "Invalid date"),
  reason: z.string().min(10, "Reason must be at least 10 characters"),
  appointmentType: z.enum(["consultation", "followup", "emergency", "checkup", "procedure", "other"]),
  priority: z.enum(["low", "medium", "high", "emergency"]),
});

// Types
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
  email?: string;
  availability?: {
    days: string[];
    startTime: string;
    endTime: string;
  };
}

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

// Priority colors
const priorityColors = {
  low: "bg-green-100 text-green-800 border-green-200",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
  high: "bg-orange-100 text-orange-800 border-orange-200",
  emergency: "bg-red-100 text-red-800 border-red-200",
};

// Appointment type icons
const appointmentTypeIcons = {
  consultation: "🩺",
  followup: "🔄",
  emergency: "🚨",
  checkup: "📋",
  procedure: "🔬",
  other: "📝",
};

export default function NewAppointmentPage() {
  const router = useRouter();
  const { user, accessToken } = useAuthStore();
  
  // Main states
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [patientSearch, setPatientSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<string>("");
  const [appointmentDate, setAppointmentDate] = useState<string>(
    format(new Date(), "yyyy-MM-dd")
  );
  const [duration] = useState<number>(20);
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

  // UX improvements
  const [searchDebounce, setSearchDebounce] = useState<NodeJS.Timeout | null>(null);
  const [completionProgress, setCompletionProgress] = useState(0);
  const [isEmergency, setIsEmergency] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(true);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  
  // Refs
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Initialize
  useEffect(() => {
    fetchDoctors();
    
    // Focus search input on mount
    if (searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, []);

  // Update auto-number when doctor or date changes
  useEffect(() => {
    if (selectedDoctor && appointmentDate) {
      generateAutoNumber();
    } else {
      setAutoNumber("");
      setTodaysAppointmentsCount(0);
    }
  }, [selectedDoctor, appointmentDate]);

  // Calculate completion progress
  useEffect(() => {
    let progress = 0;
    if (selectedPatient) progress += 30;
    if (selectedDoctor) progress += 30;
    if (appointmentDate) progress += 20;
    if (reason.trim().length >= 10) progress += 20;
    setCompletionProgress(progress);
  }, [selectedPatient, selectedDoctor, appointmentDate, reason]);

  // Handle search with debounce
  const handleSearchChange = useCallback((value: string) => {
    setPatientSearch(value);
    
    if (searchDebounce) {
      clearTimeout(searchDebounce);
    }
    
    if (value.trim().length >= 2) {
      const timeout = setTimeout(() => {
        searchPatients(value);
      }, 500);
      setSearchDebounce(timeout);
    } else {
      setSearchResults([]);
      setShowNoResults(false);
    }
  }, [searchDebounce]);

  // Fetch doctors
  const fetchDoctors = async () => {
    try {
      setLoadingDoctors(true);
      const response = await fetch("/api/doctors?active=true", {
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
      });

      const data = await response.json();
      
      if (data.success) {
        setDoctors(data.data);
      } else {
        toast.error("Failed to load doctors");
      }
    } catch (error) {
      console.error("Error fetching doctors:", error);
      toast.error("Network error loading doctors");
    } finally {
      setLoadingDoctors(false);
    }
  };

  // Search patients
  const searchPatients = async (query?: string) => {
    const searchQuery = query || patientSearch;
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([]);
      setShowNoResults(false);
      return;
    }
    
    try {
      setSearching(true);
      setError(null);
      setShowNoResults(false);
      
      const response = await fetch(`/api/patients/search?q=${encodeURIComponent(searchQuery)}&limit=10`, {
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSearchResults(data.data);
        
        if (data.data.length === 0 && searchQuery.trim().length >= 2) {
          setShowNoResults(true);
        }
      } else {
        toast.error("Search failed. Please try again.");
      }
    } catch (error) {
      console.error("Error searching patients:", error);
      toast.error("Search failed. Please try again.");
    } finally {
      setSearching(false);
    }
  };

  // Generate auto number
  const generateAutoNumber = async () => {
    if (!selectedDoctor || !appointmentDate) {
      setAutoNumber("");
      return;
    }

    try {
      const response = await fetch(
        `/api/appointments/count?doctorId=${selectedDoctor}&date=${appointmentDate}`,
        {
          headers: {
            "Content-Type": "application/json",
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
        }
      );

      const data = await response.json();
      
      if (data.success) {
        const todaysCount = data.count || 0;
        setTodaysAppointmentsCount(todaysCount);
        
        // Generate next auto-number
        const nextNumber = (todaysCount + 1).toString().padStart(3, "0");
        setAutoNumber(nextNumber);
      } else {
        // Default to 001 if API fails
        setAutoNumber("001");
        setTodaysAppointmentsCount(0);
        toast.error("Failed to generate appointment number");
      }
    } catch (error) {
      console.error("Error generating auto number:", error);
      // Default to 001 on error
      setAutoNumber("001");
      setTodaysAppointmentsCount(0);
    }
  };

  // Create new patient
  const createNewPatient = async () => {
    try {
      setCreatingPatient(true);
      setFormErrors({});

      // Validate form
      const validationResult = patientSchema.safeParse(newPatientForm);
      if (!validationResult.success) {
        const errors: Record<string, string> = {};
        validationResult.error.issues.forEach(err => {
          if (err.path[0]) {
            errors[err.path[0] as string] = err.message;
          }
        });
        setFormErrors(errors);

        // Show first error as toast
        const firstError = validationResult.error.issues[0];
        toast.error(firstError.message);
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
        const newPatient: Patient = {
          _id: data.data.id || data.data._id,
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
        
        toast.success("Patient created successfully!");
      } else {
        if (data.error && data.error.includes("already exists") && data.data) {
          // Auto-select existing patient
          const existingPatient: Patient = {
            _id: data.data.id,
            name: data.data.name,
            phone: data.data.phone,
            patientId: data.data.patientId || "N/A",
            email: data.data.email,
            dateOfBirth: data.data.dateOfBirth,
            gender: data.data.gender,
          };
          setSelectedPatient(existingPatient);
          setShowNewPatientDialog(false);
          toast.info("Patient already exists. Selected existing record.");
        } else {
          toast.error(data.error || "Failed to create patient");
        }
      }
    } catch (error: any) {
      console.error("Error creating patient:", error);
      toast.error("Network error. Please try again.");
    } finally {
      setCreatingPatient(false);
    }
  };

  // Handle appointment submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFormErrors({});

    try {
      // Validate form
      const validationData = {
        patientId: selectedPatient?._id || "",
        doctorId: selectedDoctor,
        appointmentDate,
        reason,
        appointmentType,
        priority: isEmergency ? "emergency" : priority,
      };

      const validationResult = appointmentSchema.safeParse(validationData);
      if (!validationResult.success) {
        const errors: Record<string, string> = {};
        validationResult.error.issues.forEach(err => {
          if (err.path[0]) {
            errors[err.path[0] as string] = err.message;
          }
        });
        setFormErrors(errors);

        const firstError = validationResult.error.issues[0];
        toast.error(firstError.message);
        setLoading(false);
        return;
      }

      // Calculate appointment time
      const now = new Date();
      const appointmentDateTime = new Date(appointmentDate);
      
      // Set appointment time - start at 9:00 AM or current time if later
      appointmentDateTime.setHours(9, 0, 0, 0);
      if (isToday(new Date(appointmentDate))) {
        const currentHour = now.getHours();
        if (currentHour >= 9) {
          // Use current time rounded to next 20-minute interval
          const minutes = now.getMinutes();
          const remainder = minutes % 20;
          const roundedMinutes = remainder > 0 ? minutes + (20 - remainder) : minutes;
          appointmentDateTime.setHours(now.getHours(), roundedMinutes, 0, 0);
        }
      }
      
      const endTime = addMinutes(appointmentDateTime, duration);
      
      const appointmentData = {
        patientId: selectedPatient!._id,
        doctorId: selectedDoctor,
        startTime: appointmentDateTime.toISOString(),
        endTime: endTime.toISOString(),
        duration,
        appointmentType,
        reason: reason.trim(),
        symptoms: symptoms.trim(),
        priority: isEmergency ? "emergency" : priority,
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
        toast.success("Appointment created successfully!", {
          description: `Appointment #${data.data.autoNumber} scheduled`,
          action: {
            label: "View",
            onClick: () => router.push("/appointments"),
          },
        });
        
        // Reset form after delay
        setTimeout(() => {
          router.push("/appointments");
          router.refresh();
        }, 1500);
      } else {
        // Handle specific error cases
        if (data.error?.includes("not available")) {
          toast.error("Doctor is not available. Please select another time.");
        } else if (data.error?.includes("in the past")) {
          toast.error("Appointment time cannot be in the past.");
        } else {
          toast.error(data.error || "Failed to create appointment");
        }
      }
    } catch (error: any) {
      console.error("Error creating appointment:", error);
      toast.error("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  // Helper functions
  const isFormValid = () => {
    return selectedPatient && selectedDoctor && appointmentDate && reason.trim().length >= 10;
  };

  const handleDoctorSelect = (doctorId: string) => {
    setSelectedDoctor(doctorId);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      searchPatients();
    }
  };

  const clearSearch = () => {
    setPatientSearch("");
    setSearchResults([]);
    setShowNoResults(false);
  };

  const handleSelectPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setPatientSearch(patient.name);
    setSearchResults([]);
    setShowNoResults(false);
    toast.success("Patient selected");
  };

  const handleDateChange = (date: string) => {
    const selectedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      toast.error("Appointment date cannot be in the past");
      return;
    }

    setAppointmentDate(date);
    setAutoNumber("");
  };

  const formatDisplayDate = (date: string) => {
    try {
      return format(new Date(date), "EEEE, MMMM d, yyyy");
    } catch {
      return "Invalid date";
    }
  };

  const selectedDoctorInfo = doctors.find(d => d._id === selectedDoctor);

  // Quick action handlers
  const handleQuickAction = (action: string) => {
    switch (action) {
      case "emergency":
        setIsEmergency(true);
        setPriority("emergency");
        setAppointmentType("emergency");
        toast.warning("Emergency mode activated", {
          description: "High priority scheduling enabled",
        });
        break;
      case "followup":
        setAppointmentType("followup");
        setReason("Routine follow-up appointment");
        break;
      case "checkup":
        setAppointmentType("checkup");
        setReason("Annual health check-up");
        break;
      case "consultation":
        setAppointmentType("consultation");
        setReason("General medical consultation");
        break;
    }
  };

  // Common symptoms quick selection
  const commonSymptoms = [
    "Fever", "Headache", "Cough", "Fatigue", "Shortness of breath",
    "Chest pain", "Abdominal pain", "Nausea", "Dizziness", "Joint pain"
  ];

  const handleSymptomClick = (symptom: string) => {
    setSymptoms(prev => {
      const symptomsList = prev ? prev.split(',').map(s => s.trim()) : [];
      if (symptomsList.includes(symptom)) {
        return symptomsList.filter(s => s !== symptom).join(', ');
      } else {
        return [...symptomsList, symptom].join(', ');
      }
    });
  };

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-7xl">
      {/* Header with Progress */}
      <div className="mb-8 space-y-6">
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            onClick={() => router.push("/appointments")}
            className="gap-2 hover:bg-accent"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Appointments
          </Button>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                {format(new Date(), "EEEE, MMMM d, yyyy")}
              </span>
            </div>
            <Badge variant="outline" className="gap-2">
              <Sparkles className="h-3 w-3" />
              New Appointment
            </Badge>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                Schedule New Appointment
              </h1>
              <p className="text-muted-foreground mt-2">
                Book appointments efficiently with our step-by-step process
              </p>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2">
                    <Progress value={completionProgress} className="w-32 h-2" />
                    <span className="text-sm font-medium">{completionProgress}%</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Form completion progress</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          
          {/* Quick Actions Bar */}
          {showQuickActions && (
            <div className="flex flex-wrap gap-2 pt-4">
              <Badge 
                variant={isEmergency ? "destructive" : "outline"}
                className="cursor-pointer gap-2 hover:scale-105 transition-transform"
                onClick={() => handleQuickAction("emergency")}
              >
                <AlertCircle className="h-3 w-3" />
                Emergency Booking
              </Badge>
              <Badge 
                variant="secondary"
                className="cursor-pointer gap-2 hover:bg-secondary/80"
                onClick={() => handleQuickAction("followup")}
              >
                <RefreshCw className="h-3 w-3" />
                Follow-up Visit
              </Badge>
              <Badge 
                variant="secondary"
                className="cursor-pointer gap-2 hover:bg-secondary/80"
                onClick={() => handleQuickAction("checkup")}
              >
                <Activity className="h-3 w-3" />
                Routine Check-up
              </Badge>
              <Badge 
                variant="secondary"
                className="cursor-pointer gap-2 hover:bg-secondary/80"
                onClick={() => handleQuickAction("consultation")}
              >
                <Stethoscope className="h-3 w-3" />
                General Consultation
              </Badge>
              <div className="flex-1" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowQuickActions(false)}
                className="h-6 px-2"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Main Form */}
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Patient & Details */}
          <div className="lg:col-span-2 space-y-8">
            {/* Patient Selection Card */}
            <Card className="border-border shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-xl flex items-center gap-2">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      Patient Information
                    </CardTitle>
                    <CardDescription>
                      Search for an existing patient or create a new one
                    </CardDescription>
                  </div>
                  <Badge variant="secondary" className="gap-2">
                    1
                    <ChevronRight className="h-3 w-3" />
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {selectedPatient ? (
                  <div className="space-y-4">
                    <div className="relative overflow-hidden rounded-xl border bg-gradient-to-r from-primary/5 to-secondary/5 p-6">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -translate-y-8 translate-x-8" />
                      <div className="relative flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <div className="p-3 bg-background rounded-xl border shadow-sm">
                            <User className="h-8 w-8 text-primary" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <h3 className="text-lg font-semibold">
                                {selectedPatient.name}
                              </h3>
                              <Badge variant="default" className="gap-1">
                                <CheckCircle className="h-3 w-3" />
                                Selected
                              </Badge>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 text-sm">
                                  <Phone className="h-4 w-4 text-muted-foreground" />
                                  <span>{selectedPatient.phone}</span>
                                </div>
                                {selectedPatient.email && (
                                  <div className="flex items-center gap-2 text-sm">
                                    <Mail className="h-4 w-4 text-muted-foreground" />
                                    <span>{selectedPatient.email}</span>
                                  </div>
                                )}
                              </div>
                              <div className="space-y-1">
                                {selectedPatient.patientId && (
                                  <div className="flex items-center gap-2 text-sm">
                                    <Hash className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium">ID: {selectedPatient.patientId}</span>
                                  </div>
                                )}
                                {selectedPatient.dateOfBirth && (
                                  <div className="flex items-center gap-2 text-sm">
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                    <span>{format(new Date(selectedPatient.dateOfBirth), "MMM d, yyyy")}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
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
                            className="text-destructive hover:text-destructive"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      Patient selected. You can now proceed to schedule the appointment.
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="patientSearch" className="text-base font-medium">
                          Search Patient *
                        </Label>
                        <span className="text-sm text-muted-foreground">
                          Search by name, phone, or patient ID
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            ref={searchInputRef}
                            id="patientSearch"
                            placeholder="Enter patient name, phone number, or patient ID..."
                            value={patientSearch}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            onKeyDown={handleSearchKeyDown}
                            className="pl-9 h-11 text-base"
                          />
                          {patientSearch && (
                            <button
                              type="button"
                              onClick={clearSearch}
                              className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => searchPatients()}
                          disabled={searching || !patientSearch.trim()}
                          className="h-11 px-6 gap-2"
                        >
                          {searching ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Search className="h-4 w-4" />
                          )}
                          Search
                        </Button>
                        <Dialog open={showNewPatientDialog} onOpenChange={setShowNewPatientDialog}>
                          <DialogTrigger asChild>
                            <Button
                              type="button"
                              className="h-11 bg-gradient-to-r from-primary to-primary/90 hover:from-primary hover:to-primary gap-2"
                            >
                              <UserPlus className="h-4 w-4" />
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
                                <TabsTrigger value="basic" className="gap-2">
                                  <User className="h-4 w-4" />
                                  Basic Information
                                </TabsTrigger>
                                <TabsTrigger value="medical" className="gap-2">
                                  <Activity className="h-4 w-4" />
                                  Medical Information
                                </TabsTrigger>
                              </TabsList>
                              
                              <TabsContent value="basic" className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  <div className="space-y-2">
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
                                      className={formErrors.name ? "border-red-500" : ""}
                                    />
                                    {formErrors.name && (
                                      <p className="text-sm text-red-500">{formErrors.name}</p>
                                    )}
                                  </div>
                                  
                                  <div className="space-y-2">
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
                                      className={formErrors.phone ? "border-red-500" : ""}
                                    />
                                    {formErrors.phone && (
                                      <p className="text-sm text-red-500">{formErrors.phone}</p>
                                    )}
                                  </div>
                                  
                                  <div className="space-y-2">
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
                                      className={formErrors.email ? "border-red-500" : ""}
                                    />
                                    {formErrors.email && (
                                      <p className="text-sm text-red-500">{formErrors.email}</p>
                                    )}
                                  </div>
                                  
                                  <div className="space-y-2">
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
                                      className={formErrors.dateOfBirth ? "border-red-500" : ""}
                                    />
                                    {formErrors.dateOfBirth && (
                                      <p className="text-sm text-red-500">{formErrors.dateOfBirth}</p>
                                    )}
                                  </div>
                                  
                                  <div className="space-y-2">
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
                                    {formErrors.gender && (
                                      <p className="text-sm text-red-500">{formErrors.gender}</p>
                                    )}
                                  </div>
                                  
                                  <div className="space-y-2">
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
                                        {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "unknown"].map((group) => (
                                          <SelectItem key={group} value={group}>{group}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                                
                                <div className="space-y-2">
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
                                
                                <div className="space-y-2">
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
                                <div className="space-y-2">
                                  <Label htmlFor="allergies" className="flex items-center gap-2">
                                    <AlertCircle className="h-4 w-4" />
                                    Allergies
                                  </Label>
                                  <Textarea
                                    id="allergies"
                                    placeholder="List any allergies (e.g., Penicillin, Peanuts, Latex, etc.)"
                                    value={newPatientForm.allergies}
                                    onChange={(e) => setNewPatientForm(prev => ({
                                      ...prev,
                                      allergies: e.target.value
                                    }))}
                                    rows={3}
                                  />
                                  <p className="text-sm text-muted-foreground">
                                    Separate multiple allergies with commas
                                  </p>
                                </div>
                                
                                <div className="space-y-2">
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
                                  <p className="text-sm text-muted-foreground">
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
                                className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 gap-2"
                              >
                                {creatingPatient ? (
                                  <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Creating...
                                  </>
                                ) : (
                                  <>
                                    <UserPlus className="h-4 w-4" />
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
                      <div className="py-12 text-center border-2 border-dashed rounded-xl">
                        <div className="inline-block p-4 bg-primary/10 rounded-full mb-4">
                          <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                        <p className="font-medium">Searching patients...</p>
                        <p className="text-sm text-muted-foreground mt-1">Please wait while we search our database</p>
                      </div>
                    ) : searchResults.length > 0 ? (
                      <div className="border rounded-xl overflow-hidden">
                        <div className="bg-muted px-4 py-3 border-b">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-semibold">
                                Found {searchResults.length} patient{searchResults.length !== 1 ? 's' : ''}
                              </h3>
                              <p className="text-sm text-muted-foreground">Select a patient from the list below</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={clearSearch}
                            >
                              Clear
                            </Button>
                          </div>
                        </div>
                        <div className="max-h-96 overflow-y-auto divide-y">
                          {searchResults.map((patient) => (
                            <div
                              key={patient._id}
                              className="p-4 hover:bg-accent/50 transition-colors cursor-pointer group"
                              onClick={() => handleSelectPatient(patient)}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="p-2 bg-background border rounded-lg group-hover:bg-primary/10 transition-colors">
                                    <User className="h-5 w-5" />
                                  </div>
                                  <div>
                                    <h4 className="font-semibold group-hover:text-primary">
                                      {patient.name}
                                    </h4>
                                    <div className="flex flex-wrap gap-3 mt-1">
                                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                                        <Phone className="h-3 w-3" />
                                        {patient.phone}
                                      </span>
                                      {patient.email && (
                                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                                          <Mail className="h-3 w-3" />
                                          {patient.email}
                                        </span>
                                      )}
                                      {patient.patientId && (
                                        <span className="text-sm font-medium text-primary">
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
                                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  Select
                                  <ChevronRight className="h-4 w-4 ml-1" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : showNoResults ? (
                      <div className="border-2 border-dashed rounded-xl p-8 text-center">
                        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                          <User className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">
                          No Patients Found
                        </h3>
                        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                          No patients found matching "<span className="font-medium">{patientSearch}</span>"
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                          <Button
                            type="button"
                            variant="default"
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
                            variant="outline"
                            onClick={clearSearch}
                          >
                            Clear Search
                          </Button>
                        </div>
                      </div>
                    ) : patientSearch.trim().length > 0 && !showNoResults ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <p>Continue typing or press Enter to search</p>
                      </div>
                    ) : null}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Doctor & Time Selection Card */}
            <Card className={cn(
              "border-border shadow-sm hover:shadow-md transition-all",
              !selectedPatient && "opacity-50 pointer-events-none"
            )}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-xl flex items-center gap-2">
                      <div className="p-2 bg-blue-500/10 rounded-lg">
                        <Stethoscope className="h-5 w-5 text-blue-500" />
                      </div>
                      Doctor & Appointment Date
                    </CardTitle>
                    <CardDescription>
                      Select doctor and appointment date
                    </CardDescription>
                  </div>
                  <Badge variant="secondary" className="gap-2">
                    2
                    <ChevronRight className="h-3 w-3" />
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Emergency Toggle */}
                <div className="flex items-center justify-between p-4 bg-destructive/5 border border-destructive/20 rounded-lg">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-destructive" />
                    <div>
                      <h4 className="font-medium">Emergency Appointment</h4>
                      <p className="text-sm text-muted-foreground">High priority scheduling</p>
                    </div>
                  </div>
                  <Switch
                    checked={isEmergency}
                    onCheckedChange={(checked) => {
                      setIsEmergency(checked);
                      if (checked) {
                        setPriority("emergency");
                        setAppointmentType("emergency");
                      } else {
                        setPriority("medium");
                      }
                    }}
                    className="data-[state=checked]:bg-destructive"
                  />
                </div>

                {/* Doctor Selection */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="doctor" className="text-base font-medium">
                      Select Doctor *
                    </Label>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {doctors.length} available
                      </Badge>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={fetchDoctors}
                        disabled={loadingDoctors}
                        className="h-8 w-8 p-0"
                      >
                        {loadingDoctors ? 
                          <Loader2 className="h-4 w-4 animate-spin" /> : 
                          <RefreshCw className="h-4 w-4" />
                        }
                      </Button>
                    </div>
                  </div>
                  <Select
                    value={selectedDoctor}
                    onValueChange={handleDoctorSelect}
                    required
                    disabled={loadingDoctors || !selectedPatient}
                  >
                    <SelectTrigger className="h-12 text-base">
                      <SelectValue placeholder="Choose a doctor..." />
                    </SelectTrigger>
                    <SelectContent>
                      {loadingDoctors ? (
                        <div className="p-4 text-center">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                          <p className="text-sm text-muted-foreground mt-2">Loading doctors...</p>
                        </div>
                      ) : (
                        doctors.map((doctor) => (
                          <SelectItem key={doctor._id} value={doctor._id} className="py-3">
                            <div className="flex flex-col">
                              <span className="font-medium">Dr. {doctor.name}</span>
                              <span className="text-sm text-muted-foreground">
                                {doctor.specialization} • {doctor.department}
                              </span>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {formErrors.doctorId && (
                    <p className="text-sm text-red-500">{formErrors.doctorId}</p>
                  )}
                  {!selectedPatient && (
                    <div className="flex items-center gap-2 text-sm text-amber-600">
                      <AlertCircle className="h-4 w-4" />
                      Select a patient first to choose a doctor
                    </div>
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
                        className="h-12 pl-10"
                        min={format(new Date(), "yyyy-MM-dd")}
                        disabled={!selectedPatient}
                      />
                      <Calendar className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {formatDisplayDate(appointmentDate)}
                    </div>
                    {formErrors.appointmentDate && (
                      <p className="text-sm text-red-500">{formErrors.appointmentDate}</p>
                    )}
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="font-medium flex items-center gap-2">
                        <Hash className="h-4 w-4" />
                        Appointment Number
                      </Label>
                      {todaysAppointmentsCount > 0 && (
                        <Badge variant="secondary">
                          {todaysAppointmentsCount} today
                        </Badge>
                      )}
                    </div>
                    <div className="relative">
                      <div className="absolute left-3 top-3.5">
                        <Hash className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <Input
                        value={autoNumber ? `#${autoNumber}` : ""}
                        readOnly
                        className="h-12 pl-10 bg-muted font-mono text-lg font-bold"
                        placeholder="Auto-generated"
                      />
                    </div>
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      Auto-number generated based on daily sequence
                    </div>
                  </div>
                </div>

                {/* Appointment Information */}
                <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <Clock className="h-5 w-5 text-blue-500" />
                    <h4 className="font-medium">Appointment Information</h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span>20 minutes per appointment</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span>Auto-number starts from 001 daily</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span>Time assigned based on sequence</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span>Focus on daily numbering system</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Appointment Details Card */}
            <Card className={cn(
              "border-border shadow-sm hover:shadow-md transition-all",
              (!selectedPatient || !selectedDoctor) && "opacity-50 pointer-events-none"
            )}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-xl flex items-center gap-2">
                      <div className="p-2 bg-purple-500/10 rounded-lg">
                        <FileText className="h-5 w-5 text-purple-500" />
                      </div>
                      Appointment Details
                    </CardTitle>
                    <CardDescription>
                      Provide appointment reason and additional information
                    </CardDescription>
                  </div>
                  <Badge variant="secondary" className="gap-2">
                    3
                    <ChevronRight className="h-3 w-3" />
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label htmlFor="appointmentType" className="font-medium">
                      Appointment Type *
                    </Label>
                    <Select
                      value={appointmentType}
                      onValueChange={setAppointmentType}
                      required
                      disabled={!selectedPatient || !selectedDoctor || isEmergency}
                    >
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(appointmentTypeIcons).map(([value, icon]) => (
                          <SelectItem key={value} value={value}>
                            <div className="flex items-center gap-2">
                              <span>{icon}</span>
                              <span className="capitalize">{value.replace("-", " ")}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-3">
                    <Label htmlFor="priority" className="font-medium">
                      Priority Level *
                    </Label>
                    <Select
                      value={isEmergency ? "emergency" : priority}
                      onValueChange={(value) => {
                        if (value === "emergency") {
                          setIsEmergency(true);
                        } else {
                          setIsEmergency(false);
                        }
                        setPriority(value);
                      }}
                      required
                      disabled={!selectedPatient || !selectedDoctor || isEmergency}
                    >
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(priorityColors).map(([value, className]) => (
                          <SelectItem key={value} value={value}>
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${className.split(' ')[0]}`}></div>
                              <span className="capitalize">{value}</span>
                            </div>
                          </SelectItem>
                        ))}
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
                    className="min-h-[120px] resize-y"
                    disabled={!selectedPatient || !selectedDoctor}
                  />
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Be specific about symptoms, concerns, or follow-up needs</span>
                    <span className={reason.length < 10 ? "text-red-500" : ""}>
                      {reason.length}/500
                    </span>
                  </div>
                  {formErrors.reason && (
                    <p className="text-sm text-red-500">{formErrors.reason}</p>
                  )}
                </div>
                
                {/* Common Symptoms */}
                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <Brain className="h-4 w-4" />
                    Common Symptoms (Optional)
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {commonSymptoms.map((symptom) => {
                      const isSelected = symptoms.split(',').map(s => s.trim()).includes(symptom);
                      return (
                        <Badge
                          key={symptom}
                          variant={isSelected ? "default" : "outline"}
                          className="cursor-pointer hover:scale-105 transition-transform"
                          onClick={() => handleSymptomClick(symptom)}
                        >
                          {symptom}
                        </Badge>
                      );
                    })}
                  </div>
                  <Textarea
                    placeholder="List any symptoms the patient is experiencing..."
                    value={symptoms}
                    onChange={(e) => setSymptoms(e.target.value)}
                    rows={3}
                    className="min-h-[100px] resize-y"
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
                    className="min-h-[100px] resize-y"
                    disabled={!selectedPatient || !selectedDoctor}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Summary & Actions */}
          <div className="space-y-8">
            {/* Summary Card */}
            <Card className="sticky top-6 border-primary/20 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                  Appointment Summary
                </CardTitle>
                <CardDescription>
                  Review all details before scheduling
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  {/* Patient Section */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-primary" />
                      <h4 className="font-semibold">Patient Details</h4>
                    </div>
                    <div className={cn(
                      "p-4 rounded-lg border transition-all",
                      selectedPatient 
                        ? "bg-primary/5 border-primary/20 shadow-sm" 
                        : "bg-muted border-muted-foreground/20"
                    )}>
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "p-2 rounded-lg",
                          selectedPatient ? "bg-primary/10" : "bg-muted-foreground/10"
                        )}>
                          <User className={cn(
                            "h-5 w-5",
                            selectedPatient ? "text-primary" : "text-muted-foreground"
                          )} />
                        </div>
                        <div className="flex-1">
                          <p className={cn(
                            "font-medium",
                            selectedPatient ? "" : "text-muted-foreground italic"
                          )}>
                            {selectedPatient ? selectedPatient.name : "No patient selected"}
                          </p>
                          {selectedPatient && (
                            <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                              <p>{selectedPatient.phone}</p>
                              {selectedPatient.patientId && (
                                <p>ID: {selectedPatient.patientId}</p>
                              )}
                            </div>
                          )}
                        </div>
                        {selectedPatient && (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Doctor Section */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Stethoscope className="h-4 w-4 text-blue-500" />
                      <h4 className="font-semibold">Doctor Details</h4>
                    </div>
                    <div className={cn(
                      "p-4 rounded-lg border transition-all",
                      selectedDoctor
                        ? "bg-blue-500/5 border-blue-500/20 shadow-sm"
                        : "bg-muted border-muted-foreground/20"
                    )}>
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "p-2 rounded-lg",
                          selectedDoctor ? "bg-blue-500/10" : "bg-muted-foreground/10"
                        )}>
                          <Stethoscope className={cn(
                            "h-5 w-5",
                            selectedDoctor ? "text-blue-500" : "text-muted-foreground"
                          )} />
                        </div>
                        <div className="flex-1">
                          <p className={cn(
                            "font-medium",
                            selectedDoctor ? "" : "text-muted-foreground italic"
                          )}>
                            {selectedDoctorInfo ? `Dr. ${selectedDoctorInfo.name}` : "No doctor selected"}
                          </p>
                          {selectedDoctorInfo && (
                            <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                              <p>{selectedDoctorInfo.specialization}</p>
                              <p>{selectedDoctorInfo.department}</p>
                            </div>
                          )}
                        </div>
                        {selectedDoctor && (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Appointment Section */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-purple-500" />
                      <h4 className="font-semibold">Appointment Details</h4>
                    </div>
                    <div className={cn(
                      "p-4 rounded-lg border transition-all",
                      appointmentDate
                        ? "bg-purple-500/5 border-purple-500/20 shadow-sm"
                        : "bg-muted border-muted-foreground/20"
                    )}>
                      <div className="space-y-4">
                        <div>
                          <p className="font-medium text-lg">
                            {appointmentDate ? formatDisplayDate(appointmentDate) : "No date selected"}
                          </p>
                          {appointmentDate && (
                            <div className="flex items-center justify-between mt-2">
                              <div className="flex items-center gap-2">
                                <Hash className="h-4 w-4" />
                                <span className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                                  #{autoNumber || "000"}
                                </span>
                              </div>
                              <Badge 
                                variant={isEmergency ? "destructive" : "secondary"}
                                className={priorityColors[priority as keyof typeof priorityColors]}
                              >
                                {(isEmergency ? "emergency" : priority).toUpperCase()}
                              </Badge>
                            </div>
                          )}
                        </div>
                        
                        {appointmentDate && (
                          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                            <div className="space-y-1">
                              <p className="text-sm text-muted-foreground">Type</p>
                              <p className="font-medium capitalize flex items-center gap-2">
                                <span>{appointmentTypeIcons[appointmentType as keyof typeof appointmentTypeIcons]}</span>
                                {appointmentType.replace("-", " ")}
                              </p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-sm text-muted-foreground">Duration</p>
                              <p className="font-medium">20 minutes</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Today's Count</p>
                    <p className="text-2xl font-bold">{todaysAppointmentsCount}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Next Number</p>
                    <p className="text-2xl font-bold text-primary">#{autoNumber || "001"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Card */}
            <Card className="border-green-500/20 shadow-lg">
              <CardContent className="p-6">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">
                      Ready to Schedule
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      Review all information and schedule the appointment
                    </p>
                  </div>
                  
                  <div className="space-y-3">
                    <Button
                      type="submit"
                      disabled={loading || !isFormValid()}
                      className="w-full h-14 text-base font-medium bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-lg hover:shadow-xl transition-all"
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
                    <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="h-4 w-4 text-amber-600" />
                        <span className="font-medium text-amber-700">
                          Incomplete Information
                        </span>
                      </div>
                      <ul className="space-y-1 text-sm text-amber-600">
                        {!selectedPatient && <li className="flex items-center gap-2">• Select or create a patient</li>}
                        {!selectedDoctor && <li className="flex items-center gap-2">• Choose a doctor</li>}
                        {!appointmentDate && <li className="flex items-center gap-2">• Select appointment date</li>}
                        {reason.length < 10 && <li className="flex items-center gap-2">• Provide detailed reason ({reason.length}/10)</li>}
                      </ul>
                    </div>
                  )}
                  
                  <div className="pt-4 border-t">
                    <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Information & Help
                    </h4>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full mt-1.5"></div>
                        <p>Appointments are scheduled by date only</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full mt=1.5"></div>
                        <p>Auto-number starts from 001 daily for each doctor</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full mt-1.5"></div>
                        <p>Sequential numbering based on daily appointment count</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full mt-1.5"></div>
                        <p>Emergency appointments take priority</p>
                      </div>
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