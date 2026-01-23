// app/appointments/new/page.tsx

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
  Brain,
  HeartPulse,
  Eye,
  Thermometer,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2,
  Save,
  Clock4,
  Zap,
  Star,
  Bell,
  Download,
  Printer,
  Share2,
  Copy,
  CalendarDays,
  Users,
  Target,
  BarChart3,
} from "lucide-react";
import { format, isValid, isToday, addMinutes, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
  const [isFullScreen, setIsFullScreen] = useState(false);
  
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
  const [activeSection, setActiveSection] = useState<"patient" | "doctor" | "details">("patient");
  const [estimatedTime, setEstimatedTime] = useState<string>("");
  
  // Refs
  const searchInputRef = useRef<HTMLInputElement>(null);
  const mainContainerRef = useRef<HTMLDivElement>(null);

  // Initialize
  useEffect(() => {
    fetchDoctors();
    updateEstimatedTime();
    
    // Focus search input on mount
    if (searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 300);
    }

    // Keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'f') {
        e.preventDefault();
        setIsFullScreen(!isFullScreen);
      }
      if (e.key === 'Escape' && isFullScreen) {
        setIsFullScreen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullScreen]);

  // Update auto-number when doctor or date changes
  useEffect(() => {
    if (selectedDoctor && appointmentDate) {
      generateAutoNumber();
    } else {
      setAutoNumber("");
      setTodaysAppointmentsCount(0);
    }
    updateEstimatedTime();
  }, [selectedDoctor, appointmentDate]);

  // Calculate completion progress
  useEffect(() => {
    let progress = 0;
    if (selectedPatient) progress += 30;
    if (selectedDoctor) progress += 30;
    if (appointmentDate) progress += 20;
    if (reason.trim().length >= 10) progress += 20;
    setCompletionProgress(Math.min(progress, 100));
  }, [selectedPatient, selectedDoctor, appointmentDate, reason]);

  // Update active section based on progress
  useEffect(() => {
    if (!selectedPatient) {
      setActiveSection("patient");
    } else if (!selectedDoctor) {
      setActiveSection("doctor");
    } else {
      setActiveSection("details");
    }
  }, [selectedPatient, selectedDoctor]);

  // Update estimated time based on selected doctor and patient
  const updateEstimatedTime = () => {
    if (selectedDoctor && selectedPatient) {
      const now = new Date();
      const nextHour = new Date(now.getTime() + 60 * 60 * 1000);
      setEstimatedTime(format(nextHour, "h:mm a"));
    } else {
      setEstimatedTime("");
    }
  };

  // Handle search with debounce
  const handleSearchChange = useCallback((value: string) => {
    setPatientSearch(value);
    
    if (searchDebounce) {
      clearTimeout(searchDebounce);
    }
    
    if (value.trim().length >= 2) {
      const timeout = setTimeout(() => {
        searchPatients(value);
      }, 300);
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
    if (e.key === 'Escape') {
      clearSearch();
    }
  };

  const clearSearch = () => {
    setPatientSearch("");
    setSearchResults([]);
    setShowNoResults(false);
    searchInputRef.current?.focus();
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

  // Template handlers
  const handleTemplateSelect = (template: string) => {
    switch (template) {
      case "general":
        setReason("General medical consultation for ongoing health concerns");
        setSymptoms("");
        break;
      case "followup":
        setAppointmentType("followup");
        setReason("Follow-up appointment to monitor progress and adjust treatment plan");
        break;
      case "emergency":
        setIsEmergency(true);
        setPriority("emergency");
        setAppointmentType("emergency");
        setReason("Emergency medical attention required");
        break;
    }
  };

  return (
    <div 
      ref={mainContainerRef}
      className={cn(
        "min-h-screen bg-linear-to-br from-background to-muted/30",
        isFullScreen && "fixed inset-0 z-50 bg-background overflow-auto"
      )}
    >
      {/* Top Navigation Bar */}
      <div className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => router.push("/appointments")}
                className="gap-2 hover:bg-accent"
                size="lg"
              >
                <ArrowLeft className="h-5 w-5" />
                <span className="hidden sm:inline">Back</span>
              </Button>
              
              <div className="hidden md:flex items-center gap-4">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">
                    {format(new Date(), "EEEE, MMMM d")}
                  </span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 rounded-full">
                  <Clock4 className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium">
                    {format(new Date(), "h:mm a")}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsFullScreen(!isFullScreen)}
                      className="gap-2"
                    >
                      {isFullScreen ? (
                        <Minimize2 className="h-4 w-4" />
                      ) : (
                        <Maximize2 className="h-4 w-4" />
                      )}
                      <span className="hidden sm:inline">
                        {isFullScreen ? "Exit Fullscreen" : "Fullscreen"}
                      </span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Press Ctrl+F to toggle fullscreen</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => window.print()}
                >
                  <Printer className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => toast.info("Copied appointment details")}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={cn(
        "mx-auto p-4 md:p-6 lg:p-8",
        isFullScreen ? "max-w-none px-4 lg:px-8" : "max-w-7xl"
      )}>
        {/* Progress Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between gap-6 mb-8">
            <div className="space-y-3 flex-1">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-linear-to-br from-primary to-primary/80 rounded-2xl shadow-lg">
                  <Calendar className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl lg:text-4xl font-bold tracking-tight bg-linear-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                    Schedule New Appointment
                  </h1>
                  <p className="text-lg text-muted-foreground mt-2">
                    Complete the form below to schedule an appointment
                  </p>
                </div>
              </div>

              {/* Progress Indicators */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-6">
                <div className={cn(
                  "p-4 rounded-xl border-2 transition-all duration-300",
                  activeSection === "patient" 
                    ? "border-primary bg-primary/5 shadow-md" 
                    : "border-border"
                )}>
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "flex items-center justify-center w-8 h-8 rounded-full",
                      selectedPatient ? "bg-green-500 text-white" : "bg-muted"
                    )}>
                      {selectedPatient ? <CheckCircle className="h-5 w-5" /> : "1"}
                    </div>
                    <div>
                      <h3 className="font-semibold">Patient</h3>
                      <p className="text-sm text-muted-foreground">
                        {selectedPatient ? selectedPatient.name : "Select patient"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className={cn(
                  "p-4 rounded-xl border-2 transition-all duration-300",
                  activeSection === "doctor" 
                    ? "border-blue-500 bg-blue-500/5 shadow-md" 
                    : "border-border"
                )}>
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "flex items-center justify-center w-8 h-8 rounded-full",
                      selectedDoctor ? "bg-green-500 text-white" : 
                      selectedPatient ? "bg-blue-500 text-white" : "bg-muted"
                    )}>
                      {selectedDoctor ? <CheckCircle className="h-5 w-5" /> : "2"}
                    </div>
                    <div>
                      <h3 className="font-semibold">Doctor</h3>
                      <p className="text-sm text-muted-foreground">
                        {selectedDoctorInfo ? `Dr. ${selectedDoctorInfo.name}` : "Select doctor"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className={cn(
                  "p-4 rounded-xl border-2 transition-all duration-300",
                  activeSection === "details" 
                    ? "border-purple-500 bg-purple-500/5 shadow-md" 
                    : "border-border"
                )}>
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "flex items-center justify-center w-8 h-8 rounded-full",
                      isFormValid() ? "bg-green-500 text-white" : 
                      selectedDoctor ? "bg-purple-500 text-white" : "bg-muted"
                    )}>
                      {isFormValid() ? <CheckCircle className="h-5 w-5" /> : "3"}
                    </div>
                    <div>
                      <h3 className="font-semibold">Details</h3>
                      <p className="text-sm text-muted-foreground">
                        {reason ? "Complete details" : "Add appointment details"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl border-2 border-border">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Completion</span>
                      <span className="text-sm font-bold text-primary">{completionProgress}%</span>
                    </div>
                    <Progress value={completionProgress} className="h-2" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Form Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Form Steps */}
          <div className="lg:col-span-2 space-y-8">
            {/* Step 1: Patient Selection */}
            <div className={cn(
              "transition-all duration-300",
              activeSection !== "patient" && "opacity-75"
            )}>
              <Card className="border-2 border-primary/20 shadow-xl hover:shadow-2xl transition-all duration-300">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-linear-to-br from-primary to-primary/90 rounded-xl">
                          <User className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-2xl">Step 1: Select Patient</CardTitle>
                          <CardDescription>
                            Search existing patient or create new patient record
                          </CardDescription>
                        </div>
                      </div>
                    </div>
                    <Badge variant="default" className="px-3 py-1 text-sm">
                      Required
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {selectedPatient ? (
                    <div className="space-y-4">
                      <div className="relative overflow-hidden rounded-2xl bg-linear-to-r from-primary/5 to-primary/10 p-6 border border-primary/20">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-12 translate-x-12" />
                        <div className="relative flex items-start justify-between">
                          <div className="flex items-start gap-4">
                            <div className="p-4 bg-background rounded-xl border shadow-lg">
                              <User className="h-10 w-10 text-primary" />
                            </div>
                            <div className="space-y-3">
                              <div className="flex items-center gap-3">
                                <h3 className="text-xl font-bold">{selectedPatient.name}</h3>
                                <Badge variant="default" className="gap-2">
                                  <CheckCircle className="h-3 w-3" />
                                  Selected
                                </Badge>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="flex items-center gap-2">
                                  <Phone className="h-4 w-4 text-muted-foreground" />
                                  <span>{selectedPatient.phone}</span>
                                </div>
                                {selectedPatient.email && (
                                  <div className="flex items-center gap-2">
                                    <Mail className="h-4 w-4 text-muted-foreground" />
                                    <span>{selectedPatient.email}</span>
                                  </div>
                                )}
                                {selectedPatient.patientId && (
                                  <div className="flex items-center gap-2">
                                    <Hash className="h-4 w-4 text-muted-foreground" />
                                    <span>ID: {selectedPatient.patientId}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setSelectedPatient(null)}
                              className="gap-2"
                            >
                              <X className="h-4 w-4" />
                              Change
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="patientSearch" className="text-lg font-semibold">
                            Search Patient Database
                          </Label>
                          <span className="text-sm text-muted-foreground">
                            Type at least 2 characters to search
                          </span>
                        </div>
                        <div className="flex gap-3">
                          <div className="relative flex-1">
                            <Search className="absolute left-4 top-3.5 h-5 w-5 text-muted-foreground" />
                            <Input
                              ref={searchInputRef}
                              id="patientSearch"
                              placeholder="Search by name, phone number, or patient ID..."
                              value={patientSearch}
                              onChange={(e) => handleSearchChange(e.target.value)}
                              onKeyDown={handleSearchKeyDown}
                              className="pl-12 h-12 text-lg rounded-xl"
                            />
                            {patientSearch && (
                              <button
                                type="button"
                                onClick={clearSearch}
                                className="absolute right-4 top-3.5 text-muted-foreground hover:text-foreground"
                              >
                                <X className="h-5 w-5" />
                              </button>
                            )}
                          </div>
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => searchPatients()}
                            disabled={searching || !patientSearch.trim()}
                            className="h-12 px-6 gap-2 rounded-xl"
                          >
                            {searching ? (
                              <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                              <Search className="h-5 w-5" />
                            )}
                            Search
                          </Button>
                          <Dialog open={showNewPatientDialog} onOpenChange={setShowNewPatientDialog}>
                            <DialogTrigger asChild>
                              <Button
                                type="button"
                                className="h-12 bg-linear-to-r from-primary to-primary/90 hover:from-primary hover:to-primary gap-3 rounded-xl"
                              >
                                <UserPlus className="h-5 w-5" />
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
                                  className="flex-1 bg-linear-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 gap-2"
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
                        <div className="border rounded-xl overflow-hidden shadow-sm">
                          <div className="bg-linear-to-r from-primary/5 to-primary/10 px-6 py-4 border-b">
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
                      ) : null}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Step 2: Doctor & Date Selection */}
            {selectedPatient && (
              <div className={cn(
                "transition-all duration-300",
                activeSection !== "doctor" && "opacity-75"
              )}>
                <Card className="border-2 border-blue-500/20 shadow-xl hover:shadow-2xl transition-all duration-300">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <div className="p-3 bg-linear-to-br from-blue-500 to-blue-600 rounded-xl">
                            <Stethoscope className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <CardTitle className="text-2xl">Step 2: Select Doctor & Date</CardTitle>
                            <CardDescription>
                              Choose doctor and appointment date
                            </CardDescription>
                          </div>
                        </div>
                      </div>
                      <Badge variant="default" className="px-3 py-1 text-sm">
                        Required
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Emergency Toggle */}
                    <div className={cn(
                      "p-4 rounded-xl border transition-all duration-300",
                      isEmergency 
                        ? "bg-red-500/10 border-red-500/30" 
                        : "bg-linear-to-r from-blue-500/5 to-blue-500/10 border-blue-500/20"
                    )}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <AlertCircle className={cn(
                            "h-6 w-6",
                            isEmergency ? "text-red-500" : "text-blue-500"
                          )} />
                          <div>
                            <h4 className="font-bold text-lg">Emergency Appointment</h4>
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
                          className="data-[state=checked]:bg-red-500 h-6 w-11"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Doctor Selection */}
                      <div className="space-y-3">
                        <Label htmlFor="doctor" className="text-lg font-semibold">
                          Select Doctor *
                        </Label>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-muted-foreground">
                            {doctors.length} doctors available
                          </span>
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
                        <Select
                          value={selectedDoctor}
                          onValueChange={handleDoctorSelect}
                          required
                          disabled={loadingDoctors}
                        >
                          <SelectTrigger className="h-14 text-lg rounded-xl">
                            <SelectValue placeholder="Choose a doctor..." />
                          </SelectTrigger>
                          <SelectContent className="max-h-80">
                            {loadingDoctors ? (
                              <div className="p-8 text-center">
                                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                                <p className="text-sm text-muted-foreground">Loading doctors...</p>
                              </div>
                            ) : (
                              doctors.map((doctor) => (
                                <SelectItem key={doctor._id} value={doctor._id} className="py-3">
                                  <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-500/10 rounded-lg">
                                      <Stethoscope className="h-4 w-4 text-blue-500" />
                                    </div>
                                    <div className="flex-1">
                                      <span className="font-semibold">Dr. {doctor.name}</span>
                                      <p className="text-sm text-muted-foreground">
                                        {doctor.specialization} • {doctor.department}
                                      </p>
                                    </div>
                                  </div>
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        {selectedDoctorInfo && (
                          <div className="mt-4 p-4 bg-linear-to-r from-blue-500/5 to-blue-500/10 rounded-xl">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-white rounded-lg shadow-sm">
                                <Stethoscope className="h-5 w-5 text-blue-500" />
                              </div>
                              <div>
                                <h5 className="font-semibold">Dr. {selectedDoctorInfo.name}</h5>
                                <p className="text-sm text-muted-foreground">
                                  {selectedDoctorInfo.specialization} • {selectedDoctorInfo.department}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Date Selection */}
                      <div className="space-y-3">
                        <Label htmlFor="date" className="text-lg font-semibold">
                          Appointment Date *
                        </Label>
                        <div className="space-y-4">
                          <div className="relative">
                            <Calendar className="absolute left-4 top-4 h-5 w-5 text-muted-foreground" />
                            <Input
                              id="date"
                              type="date"
                              value={appointmentDate}
                              onChange={(e) => handleDateChange(e.target.value)}
                              required
                              className="h-14 pl-12 text-lg rounded-xl"
                              min={format(new Date(), "yyyy-MM-dd")}
                            />
                          </div>
                          <div className="p-4 bg-linear-to-r from-primary/5 to-primary/10 rounded-xl">
                            <div className="flex items-center gap-2">
                              <CalendarDays className="h-5 w-5 text-primary" />
                              <span className="font-semibold">{formatDisplayDate(appointmentDate)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Appointment Number */}
                    <div className="space-y-3">
                      <Label className="text-lg font-semibold">
                        Appointment Number
                      </Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="p-6 bg-linear-to-br from-primary/5 to-primary/10 rounded-2xl border border-primary/20">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="font-semibold">Today's Appointments</h4>
                            <Badge variant="secondary">{todaysAppointmentsCount}</Badge>
                          </div>
                          <div className="text-3xl font-bold text-primary">
                            #{autoNumber || "001"}
                          </div>
                          <p className="text-sm text-muted-foreground mt-2">
                            Next available number
                          </p>
                        </div>
                        <div className="p-6 bg-linear-to-br from-blue-500/5 to-blue-500/10 rounded-2xl border border-blue-500/20">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="font-semibold">Estimated Time</h4>
                            <Clock className="h-5 w-5 text-blue-500" />
                          </div>
                          <div className="text-3xl font-bold text-blue-500">
                            {estimatedTime || "TBD"}
                          </div>
                          <p className="text-sm text-muted-foreground mt-2">
                            Based on daily sequence
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Step 3: Appointment Details */}
            {selectedPatient && selectedDoctor && (
              <div className={cn(
                "transition-all duration-300",
                activeSection !== "details" && "opacity-75"
              )}>
                <Card className="border-2 border-purple-500/20 shadow-xl hover:shadow-2xl transition-all duration-300">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <div className="p-3 bg-linear-to-br from-purple-500 to-purple-600 rounded-xl">
                            <FileText className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <CardTitle className="text-2xl">Step 3: Appointment Details</CardTitle>
                            <CardDescription>
                              Provide appointment details and additional information
                            </CardDescription>
                          </div>
                        </div>
                      </div>
                      <Badge variant="default" className="px-3 py-1 text-sm">
                        Required
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Quick Templates */}
                    <div className="space-y-3">
                      <Label className="text-lg font-semibold">Quick Templates</Label>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleTemplateSelect("general")}
                          className="gap-2"
                        >
                          <User className="h-4 w-4" />
                          General Consultation
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleTemplateSelect("followup")}
                          className="gap-2"
                        >
                          <RefreshCw className="h-4 w-4" />
                          Follow-up Visit
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleTemplateSelect("emergency")}
                          className="gap-2"
                        >
                          <AlertCircle className="h-4 w-4" />
                          Emergency
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Appointment Type */}
                      <div className="space-y-3">
                        <Label htmlFor="appointmentType" className="font-semibold">
                          Appointment Type *
                        </Label>
                        <Select
                          value={appointmentType}
                          onValueChange={setAppointmentType}
                          required
                          disabled={isEmergency}
                        >
                          <SelectTrigger className="h-12 rounded-xl">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(appointmentTypeIcons).map(([value, icon]) => (
                              <SelectItem key={value} value={value} className="py-3">
                                <div className="flex items-center gap-3">
                                  <span className="text-xl">{icon}</span>
                                  <div>
                                    <span className="capitalize">{value.replace("-", " ")}</span>
                                    <p className="text-xs text-muted-foreground">
                                      {value === "emergency" ? "High priority" : 
                                       value === "consultation" ? "General visit" : 
                                       value === "followup" ? "Follow-up" : "Other"}
                                    </p>
                                  </div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {/* Priority */}
                      <div className="space-y-3">
                        <Label htmlFor="priority" className="font-semibold">
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
                          disabled={isEmergency}
                        >
                          <SelectTrigger className="h-12 rounded-xl">
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(priorityColors).map(([value, className]) => (
                              <SelectItem key={value} value={value} className="py-3">
                                <div className="flex items-center gap-3">
                                  <div className={`w-3 h-3 rounded-full ${className.split(' ')[0]}`}></div>
                                  <div>
                                    <span className="capitalize">{value}</span>
                                    <p className="text-xs text-muted-foreground">
                                      {value === "emergency" ? "Immediate attention" : 
                                       value === "high" ? "Urgent" : 
                                       value === "medium" ? "Standard" : "Low priority"}
                                    </p>
                                  </div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    {/* Reason */}
                    <div className="space-y-3">
                      <Label htmlFor="reason" className="font-semibold">
                        Reason for Appointment *
                      </Label>
                      <Textarea
                        id="reason"
                        placeholder="Please describe the reason for the appointment in detail..."
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        required
                        rows={4}
                        className="min-h-32 resize-y text-lg rounded-xl"
                      />
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>Detailed description helps doctor prepare</span>
                        <span className={reason.length < 10 ? "text-red-500 font-medium" : ""}>
                          {reason.length}/500 characters
                        </span>
                      </div>
                    </div>
                    
                    {/* Symptoms */}
                    <div className="space-y-3">
                      <Label className="font-semibold flex items-center gap-2">
                        <Brain className="h-5 w-5" />
                        Symptoms
                      </Label>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {commonSymptoms.map((symptom) => {
                          const isSelected = symptoms.split(',').map(s => s.trim()).includes(symptom);
                          return (
                            <Badge
                              key={symptom}
                              variant={isSelected ? "default" : "outline"}
                              className={cn(
                                "cursor-pointer hover:scale-105 transition-all",
                                isSelected && "bg-primary hover:bg-primary/90"
                              )}
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
                        className="min-h-24 resize-y rounded-xl"
                      />
                    </div>
                    
                    {/* Notes */}
                    <div className="space-y-3">
                      <Label htmlFor="notes" className="font-semibold flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Additional Notes
                      </Label>
                      <Textarea
                        id="notes"
                        placeholder="Any special instructions, preferences, or notes..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={3}
                        className="min-h-24 resize-y rounded-xl"
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          {/* Right Column - Summary & Actions */}
          <div className="space-y-8">
            {/* Action Card */}
            <Card className=" sticky top-24  border-2 border-green-500/20 shadow-2xl">
              <CardContent className="p-6">
                <div className="space-y-6">
                  <div className="text-center">
                    <h3 className="text-xl font-bold mb-2">
                      Schedule Appointment
                    </h3>
                    <p className="text-muted-foreground">
                      Review all information before scheduling
                    </p>
                  </div>
                  
                  <div className="space-y-3">
                    <Button
                      type="submit"
                      onClick={handleSubmit}
                      disabled={loading || !isFormValid()}
                      className="w-full h-14 text-lg font-bold bg-linear-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-lg hover:shadow-xl transition-all rounded-xl"
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
                    
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => router.push("/appointments")}
                        className="h-11"
                        disabled={loading}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => {
                          setSelectedPatient(null);
                          setSelectedDoctor("");
                          setAppointmentDate(format(new Date(), "yyyy-MM-dd"));
                          setReason("");
                          setSymptoms("");
                          setNotes("");
                          setAutoNumber("");
                        }}
                        className="h-11 gap-2"
                        disabled={loading}
                      >
                        <RefreshCw className="h-4 w-4" />
                        Reset
                      </Button>
                    </div>
                  </div>
                  
                  {!isFormValid() && (
                    <div className="p-4 bg-linear-to-r from-amber-500/5 to-amber-500/10 border border-amber-500/20 rounded-xl">
                      <div className="flex items-center gap-2 mb-3">
                        <AlertCircle className="h-5 w-5 text-amber-600" />
                        <span className="font-semibold text-amber-700">
                          Incomplete Information
                        </span>
                      </div>
                      <ul className="space-y-1.5 text-sm text-amber-600">
                        {!selectedPatient && <li className="flex items-center gap-2">• Select or create a patient</li>}
                        {!selectedDoctor && <li className="flex items-center gap-2">• Choose a doctor</li>}
                        {reason.length < 10 && <li className="flex items-center gap-2">• Provide detailed reason ({reason.length}/10)</li>}
                      </ul>
                    </div>
                  )}
                  
                  <div className="pt-4 border-t">
                    <div className="flex items-center gap-2 mb-3">
                      <Shield className="h-5 w-5 text-primary" />
                      <h4 className="font-semibold">Information</h4>
                    </div>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full mt-1.5"></div>
                        <p>Appointments scheduled by date only</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full mt-1.5"></div>
                        <p>Auto-number starts from 001 daily</p>
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

        {/* Bottom Navigation */}
        
      </div>
    </div>
  );
}

// Helper component for left chevron
const ChevronLeft = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="24" 
    height="24" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="m15 18-6-6 6-6"/>
  </svg>
);