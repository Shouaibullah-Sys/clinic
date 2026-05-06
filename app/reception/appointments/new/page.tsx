// app/appointments/new/page.tsx

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  MapPin,
  Activity,
  RefreshCw,
  Hash,
  CheckCircle,
  ChevronRight,
  FileText,
  Shield,
  Brain,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2,
  Save,
  Clock4,
  Printer,
  Copy,
  CalendarDays,
  Users,
  BarChart3,
} from "lucide-react";
import { format, isValid, isToday, addMinutes, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { z } from "zod";

// Validation schemas
const patientSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine(
      (value) => !value || value.replace(/\D/g, "").length >= 10,
      "Phone number must be at least 10 digits",
    ),
  guardian: z.string().optional().or(z.literal("")),
  dateOfBirth: z
    .string()
    .refine((date) => isValid(new Date(date)), "Invalid date of birth"),
  gender: z.enum(["male", "female", "other"]),
});

const appointmentSchema = z.object({
  patientId: z.string().min(1, "Patient is required"),
  doctorId: z.string().min(1, "Doctor is required"),
  appointmentDate: z
    .string()
    .refine((date) => isValid(new Date(date)), "Invalid date"),
  appointmentType: z.enum([
    "consultation",
    "followup",
    "emergency",
    "checkup",
    "procedure",
    "other",
  ]),
  priority: z.enum(["low", "medium", "high", "emergency"]),
});

// Types
interface Patient {
  id: string;
  name: string;
  phone?: string;
  guardian?: string;
  patientId: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
}

interface Doctor {
  id: string;
  name: string;
  specialization: string;
  department: string;
  phone?: string;
  email?: string;
  consultationFee?: number;
  availability?: {
    days: string[];
    startTime: string;
    endTime: string;
  };
}

interface NewPatientFormData {
  name: string;
  phone: string;
  guardian: string;
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
  low: "bg-green-500/10 text-green-700",
  medium: "bg-yellow-500/10 text-yellow-700",
  high: "bg-orange-500/10 text-orange-700",
  emergency: "bg-red-500/10 text-red-700",
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
    format(new Date(), "yyyy-MM-dd"),
  );
  const [duration] = useState<number>(20);
  const [appointmentType, setAppointmentType] =
    useState<string>("consultation");
  const [priority, setPriority] = useState<string>("medium");
  const [symptoms, setSymptoms] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [autoNumber, setAutoNumber] = useState<string>("");
  const [consultationFee, setConsultationFee] = useState<string>("");

  // New Patient Dialog
  const [showNewPatientDialog, setShowNewPatientDialog] = useState(false);
  const [creatingPatient, setCreatingPatient] = useState(false);
  const [newPatientForm, setNewPatientForm] = useState<NewPatientFormData>({
    name: "",
    phone: "",
    guardian: "",
    dateOfBirth: format(
      new Date(new Date().getFullYear() - 30, 0, 1),
      "yyyy-MM-dd",
    ),
    gender: "male",
    address: "",
    emergencyContact: "",
    bloodGroup: "",
    allergies: "",
    medicalHistory: "",
  });

  // Auto-numbering
  const [todaysAppointmentsCount, setTodaysAppointmentsCount] =
    useState<number>(0);
  const [showNoResults, setShowNoResults] = useState(false);

  // UX improvements
  const [searchDebounce, setSearchDebounce] = useState<NodeJS.Timeout | null>(
    null,
  );
  const [completionProgress, setCompletionProgress] = useState(0);
  const [isEmergency, setIsEmergency] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(true);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [activeSection, setActiveSection] = useState<
    "patient" | "doctor" | "details"
  >("patient");
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
      if (e.ctrlKey && e.key === "f") {
        e.preventDefault();
        setIsFullScreen(!isFullScreen);
      }
      if (e.key === "Escape" && isFullScreen) {
        setIsFullScreen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
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
    setCompletionProgress(Math.min(progress, 100));
  }, [selectedPatient, selectedDoctor, appointmentDate]);

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
  const handleSearchChange = useCallback(
    (value: string) => {
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
    },
    [searchDebounce],
  );

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
        console.log("Doctors loaded:", data.data);
        setDoctors(data.data);
        console.log("Number of doctors:", data.data.length);
      } else {
        console.error("Failed to load doctors:", data.error);
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

      const response = await fetch(
        `/api/patients/search?q=${encodeURIComponent(searchQuery)}&limit=10`,
        {
          headers: {
            "Content-Type": "application/json",
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
        },
      );

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
        },
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
        validationResult.error.issues.forEach((err) => {
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
          id: data.data.id || data.data._id,
          name: data.data.name,
          phone: data.data.phone,
          guardian: data.data.guardian,
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
          guardian: "",
          dateOfBirth: format(
            new Date(new Date().getFullYear() - 30, 0, 1),
            "yyyy-MM-dd",
          ),
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
            id: data.data.id,
            name: data.data.name,
            phone: data.data.phone,
            patientId: data.data.patientId || "N/A",
            guardian: data.data.guardian,
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
        patientId: selectedPatient?.id || "",
        doctorId: selectedDoctor || "",
        appointmentDate,
        appointmentType,
        priority: isEmergency ? "emergency" : priority,
      };

      const validationResult = appointmentSchema.safeParse(validationData);
      if (!validationResult.success) {
        const errors: Record<string, string> = {};
        validationResult.error.issues.forEach((err) => {
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

      if (consultationFee !== "") {
        const parsedFee = parseFloat(consultationFee);
        if (isNaN(parsedFee) || parsedFee < 0) {
          toast.error("Doctor fee must be a valid non-negative number");
          setLoading(false);
          return;
        }
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
          const roundedMinutes =
            remainder > 0 ? minutes + (20 - remainder) : minutes;
          appointmentDateTime.setHours(now.getHours(), roundedMinutes, 0, 0);
        }
      }

      const endTime = addMinutes(appointmentDateTime, duration);

      const appointmentData = {
        patientId: selectedPatient!.id,
        doctorId: selectedDoctor || "",
        startTime: appointmentDateTime.toISOString(),
        endTime: endTime.toISOString(),
        duration,
        appointmentType,
        symptoms: symptoms.trim(),
        reason: symptoms.trim() || "Appointment scheduled",
        priority: isEmergency ? "emergency" : priority,
        notes: notes.trim(),
        autoNumber,
        ...(consultationFee !== ""
          ? { consultationFee: parseFloat(consultationFee) }
          : {}),
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
        const scheduledTime = data.data?.startTime
          ? format(parseISO(data.data.startTime), "MMM dd, yyyy 'at' h:mm a")
          : undefined;
        const adjustedNotice = data.data?.autoAdjusted && scheduledTime
          ? `Adjusted to ${scheduledTime}`
          : scheduledTime
            ? `Scheduled for ${scheduledTime}`
            : undefined;

        toast.success("Appointment created successfully!", {
          description:
            adjustedNotice
              ? `Appointment #${data.data.autoNumber}. ${adjustedNotice}`
              : `Appointment #${data.data.autoNumber} scheduled`,
          action: {
            label: "View",
            onClick: () => router.push("/reception/appointments"),
          },
        });

        // Reset form after delay
        setTimeout(() => {
          router.push("/reception/appointments");
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
    return (
      selectedPatient &&
      selectedDoctor &&
      appointmentDate
    );
  };

  const handleDoctorSelect = useCallback((doctorId: string) => {
    console.log("Doctor selected:", doctorId);
    console.log("Doctors available:", doctors.map(d => ({ id: d.id, name: d.name })));
    setSelectedDoctor(doctorId);
    const doctor = doctors.find((d) => d.id === doctorId);
    console.log("Found doctor:", doctor);
    if (doctor?.consultationFee !== undefined) {
      setConsultationFee(String(doctor.consultationFee));
    }
  }, [doctors]);

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      searchPatients();
    }
    if (e.key === "Escape") {
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

  const selectedDoctorInfo = doctors.find((d) => d.id === selectedDoctor);
  useEffect(() => {
    if (selectedDoctorInfo?.consultationFee !== undefined) {
      setConsultationFee(String(selectedDoctorInfo.consultationFee));
    }
  }, [selectedDoctorInfo?.consultationFee]);
  console.log(
    "Current state - selectedDoctor:",
    selectedDoctor,
    "doctors:",
    doctors.length,
    "selectedDoctorInfo:",
    selectedDoctorInfo,
  );

  // Debug validation
  console.log("Validation checks - selectedPatient:", !!selectedPatient, "selectedDoctor:", !!selectedDoctor, "appointmentDate:", !!appointmentDate, "isFormValid:", isFormValid());
  console.log("loadingDoctors:", loadingDoctors);

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
        break;
      case "checkup":
        setAppointmentType("checkup");
        break;
      case "consultation":
        setAppointmentType("consultation");
        break;
    }
  };

  // Common symptoms quick selection
  const commonSymptoms = [
    "Fever",
    "Headache",
    "Cough",
    "Fatigue",
    "Shortness of breath",
    "Chest pain",
    "Abdominal pain",
    "Nausea",
    "Dizziness",
    "Joint pain",
  ];

  const handleSymptomClick = (symptom: string) => {
    setSymptoms((prev) => {
      const symptomsList = prev ? prev.split(",").map((s) => s.trim()) : [];
      if (symptomsList.includes(symptom)) {
        return symptomsList.filter((s) => s !== symptom).join(", ");
      } else {
        return [...symptomsList, symptom].join(", ");
      }
    });
  };

  // Template handlers
  const handleTemplateSelect = (template: string) => {
    switch (template) {
      case "general":
        setSymptoms("");
        break;
      case "followup":
        setAppointmentType("followup");
        break;
      case "emergency":
        setIsEmergency(true);
        setPriority("emergency");
        setAppointmentType("emergency");
        break;
    }
  };

  return (
    <div
      ref={mainContainerRef}
      className={cn(
        "min-h-screen bg-background",
        isFullScreen && "fixed inset-0 z-50 bg-background overflow-auto",
      )}
    >
      {/* Top Navigation Bar */}
      <div className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
                  <Button
                    type="submit"
                    disabled={!isFormValid() || loading}
                    className="w-full"
                    size="lg"
                  >
                <ArrowLeft className="h-5 w-5" />
                <span className="hidden sm:inline">Back</span>
              </Button>

              <div className="hidden md:flex items-center gap-4">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-full">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {format(new Date(), "EEEE, MMMM d")}
                  </span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-full">
                  <Clock4 className="h-4 w-4 text-muted-foreground" />
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
      <div
        className={cn(
          "mx-auto p-4 md:p-6 lg:p-8",
          isFullScreen ? "max-w-none px-4 lg:px-8" : "max-w-7xl",
        )}
      >
        {/* Progress Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between gap-6 mb-8">
            <div className="space-y-3 flex-1">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary rounded-lg">
                  <Calendar className="h-8 w-8 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">
                    Schedule New Appointment
                  </h1>
                  <p className="text-muted-foreground mt-2">
                    Complete the form below to schedule an appointment
                  </p>
                </div>
              </div>

              {/* Progress Indicators */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-6">
                <div
                  className={cn(
                    "p-4 rounded-lg border transition-all duration-300",
                    activeSection === "patient"
                      ? "border-primary bg-primary/5"
                      : "border-border",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "flex items-center justify-center w-8 h-8 rounded-full",
                        selectedPatient
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted",
                      )}
                    >
                      {selectedPatient ? (
                        <CheckCircle className="h-5 w-5" />
                      ) : (
                        "1"
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold">Patient</h3>
                      <p className="text-sm text-muted-foreground">
                        {selectedPatient
                          ? selectedPatient.name
                          : "Select patient"}
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  className={cn(
                    "p-4 rounded-lg border transition-all duration-300",
                    activeSection === "doctor"
                      ? "border-primary bg-primary/5"
                      : "border-border",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "flex items-center justify-center w-8 h-8 rounded-full",
                        selectedDoctor
                          ? "bg-primary text-primary-foreground"
                          : selectedPatient
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted",
                      )}
                    >
                      {selectedDoctor ? (
                        <CheckCircle className="h-5 w-5" />
                      ) : (
                        "2"
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold">Doctor</h3>
                      <p className="text-sm text-muted-foreground">
                        {selectedDoctorInfo
                          ? `Dr. ${selectedDoctorInfo.name}`
                          : "Select doctor"}
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  className={cn(
                    "p-4 rounded-lg border transition-all duration-300",
                    activeSection === "details"
                      ? "border-primary bg-primary/5"
                      : "border-border",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "flex items-center justify-center w-8 h-8 rounded-full",
                        isFormValid()
                          ? "bg-primary text-primary-foreground"
                          : selectedDoctor
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted",
                      )}
                    >
                      {isFormValid() ? (
                        <CheckCircle className="h-5 w-5" />
                      ) : (
                        "3"
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold">Details</h3>
                      <p className="text-sm text-muted-foreground">
                        Add appointment details
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-lg border border-border">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Completion</span>
                      <span className="text-sm font-bold text-primary">
                        {completionProgress}%
                      </span>
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
            <div
              className={cn(
                "transition-all duration-300",
                activeSection !== "patient" && "opacity-75",
              )}
            >
              <Card>
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary rounded-lg">
                          <User className="h-5 w-5 text-primary-foreground" />
                        </div>
                        <div>
                          <CardTitle className="text-xl">
                            Step 1: Select Patient
                          </CardTitle>
                          <CardDescription>
                            Search existing patient or create new patient record
                          </CardDescription>
                        </div>
                      </div>
                    </div>
                    <Badge variant="secondary" className="px-3 py-1 text-sm">
                      Required
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {selectedPatient ? (
                    <div className="space-y-4">
                      <div className="relative overflow-hidden rounded-lg bg-muted p-6 border">
                        <div className="relative flex items-start justify-between">
                          <div className="flex items-start gap-4">
                            <div className="p-3 bg-background rounded-lg border">
                              <User className="h-8 w-8 text-primary" />
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center gap-3">
                                <h3 className="text-lg font-semibold">
                                  {selectedPatient.name}
                                </h3>
                                <Badge variant="secondary" className="gap-2">
                                  <CheckCircle className="h-3 w-3" />
                                  Selected
                                </Badge>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div className="flex items-center gap-2">
                                  <Phone className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm">
                                    {selectedPatient.phone}
                                  </span>
                                </div>
                                {selectedPatient.guardian && (
                                  <div className="flex items-center gap-2">
                                    <Users className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm">
                                      {selectedPatient.guardian}
                                    </span>
                                  </div>
                                )}
                                {selectedPatient.patientId && (
                                  <div className="flex items-center gap-2">
                                    <Hash className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm">
                                      ID: {selectedPatient.patientId}
                                    </span>
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
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label
                            htmlFor="patientSearch"
                            className="font-semibold"
                          >
                            Search Patient Database
                          </Label>
                          <span className="text-sm text-muted-foreground">
                            Type at least 2 characters to search
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                            <Input
                              ref={searchInputRef}
                              id="patientSearch"
                              placeholder="Search by name, phone number, or patient ID..."
                              value={patientSearch}
                              onChange={(e) =>
                                handleSearchChange(e.target.value)
                              }
                              onKeyDown={handleSearchKeyDown}
                              className="pl-10"
                            />
                            {patientSearch && (
                              <button
                                type="button"
                                onClick={clearSearch}
                                className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
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
                            className="gap-2"
                          >
                            {searching ? (
                              <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                              <Search className="h-5 w-5" />
                            )}
                            Search
                          </Button>
                          <Dialog
                            open={showNewPatientDialog}
                            onOpenChange={setShowNewPatientDialog}
                          >
                            <DialogTrigger asChild>
                              <Button type="button" className="gap-2">
                                <UserPlus className="h-5 w-5" />
                                New Patient
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                  <UserPlus className="h-5 w-5" />
                                  Create New Patient
                                </DialogTitle>
                                <DialogDescription>
                                  Fill in the patient details below. All fields
                                  marked with * are required.
                                </DialogDescription>
                              </DialogHeader>

                              <Tabs defaultValue="basic" className="w-full">
                                <TabsList className="grid w-full grid-cols-2 mb-4">
                                  <TabsTrigger value="basic" className="gap-2">
                                    <User className="h-4 w-4" />
                                    Basic Information
                                  </TabsTrigger>
                                  <TabsTrigger
                                    value="medical"
                                    className="gap-2"
                                  >
                                    <Activity className="h-4 w-4" />
                                    Medical Information
                                  </TabsTrigger>
                                </TabsList>

                                <TabsContent
                                  value="basic"
                                  className="space-y-4"
                                >
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                      <Label htmlFor="name">Full Name *</Label>
                                      <Input
                                        id="name"
                                        placeholder="John Doe"
                                        value={newPatientForm.name}
                                        onChange={(e) =>
                                          setNewPatientForm((prev) => ({
                                            ...prev,
                                            name: e.target.value,
                                          }))
                                        }
                                        required
                                        className={
                                          formErrors.name
                                            ? "border-destructive"
                                            : ""
                                        }
                                      />
                                      {formErrors.name && (
                                        <p className="text-sm text-destructive">
                                          {formErrors.name}
                                        </p>
                                      )}
                                    </div>

                                    <div className="space-y-2">
                                      <Label htmlFor="phone">
                                        Phone Number
                                      </Label>
                                      <Input
                                        id="phone"
                                        placeholder="+1 (555) 123-4567"
                                        value={newPatientForm.phone}
                                        onChange={(e) =>
                                          setNewPatientForm((prev) => ({
                                            ...prev,
                                            phone: e.target.value,
                                          }))
                                        }
                                        className={
                                          formErrors.phone
                                            ? "border-destructive"
                                            : ""
                                        }
                                      />
                                      {formErrors.phone && (
                                        <p className="text-sm text-destructive">
                                          {formErrors.phone}
                                        </p>
                                      )}
                                    </div>

                                    <div className="space-y-2">
                                      <Label htmlFor="guardian">
                                        Guardian
                                      </Label>
                                      <Input
                                        id="guardian"
                                        type="text"
                                        placeholder="Enter guardian name"
                                        value={newPatientForm.guardian}
                                        onChange={(e) =>
                                          setNewPatientForm((prev) => ({
                                            ...prev,
                                            guardian: e.target.value,
                                          }))
                                        }
                                        className={
                                          formErrors.guardian
                                            ? "border-destructive"
                                            : ""
                                        }
                                      />
                                      {formErrors.guardian && (
                                        <p className="text-sm text-destructive">
                                          {formErrors.guardian}
                                        </p>
                                      )}
                                    </div>

                                    <div className="space-y-2">
                                      <Label htmlFor="dateOfBirth">
                                        Date of Birth *
                                      </Label>
                                      <Input
                                        id="dateOfBirth"
                                        type="date"
                                        value={newPatientForm.dateOfBirth}
                                        onChange={(e) =>
                                          setNewPatientForm((prev) => ({
                                            ...prev,
                                            dateOfBirth: e.target.value,
                                          }))
                                        }
                                        required
                                        className={
                                          formErrors.dateOfBirth
                                            ? "border-destructive"
                                            : ""
                                        }
                                      />
                                      {formErrors.dateOfBirth && (
                                        <p className="text-sm text-destructive">
                                          {formErrors.dateOfBirth}
                                        </p>
                                      )}
                                    </div>

                                    <div className="space-y-2">
                                      <Label htmlFor="gender">Gender *</Label>
                                      <Select
                                        value={newPatientForm.gender}
                                        onValueChange={(
                                          value: "male" | "female" | "other",
                                        ) =>
                                          setNewPatientForm((prev) => ({
                                            ...prev,
                                            gender: value,
                                          }))
                                        }
                                      >
                                        <SelectTrigger>
                                          <SelectValue placeholder="Select gender" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="male">
                                            Male
                                          </SelectItem>
                                          <SelectItem value="female">
                                            Female
                                          </SelectItem>
                                          <SelectItem value="other">
                                            Other
                                          </SelectItem>
                                        </SelectContent>
                                      </Select>
                                      {formErrors.gender && (
                                        <p className="text-sm text-destructive">
                                          {formErrors.gender}
                                        </p>
                                      )}
                                    </div>

                                    <div className="space-y-2">
                                      <Label htmlFor="bloodGroup">
                                        Blood Group
                                      </Label>
                                      <Select
                                        value={newPatientForm.bloodGroup}
                                        onValueChange={(value) =>
                                          setNewPatientForm((prev) => ({
                                            ...prev,
                                            bloodGroup: value,
                                          }))
                                        }
                                      >
                                        <SelectTrigger>
                                          <SelectValue placeholder="Select blood group" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {[
                                            "A+",
                                            "A-",
                                            "B+",
                                            "B-",
                                            "AB+",
                                            "AB-",
                                            "O+",
                                            "O-",
                                            "unknown",
                                          ].map((group) => (
                                            <SelectItem
                                              key={group}
                                              value={group}
                                            >
                                              {group}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>

                                  <div className="space-y-2">
                                    <Label
                                      htmlFor="address"
                                      className="flex items-center gap-2"
                                    >
                                      <MapPin className="h-4 w-4" />
                                      Address
                                    </Label>
                                    <Textarea
                                      id="address"
                                      placeholder="123 Main Street, City, State, ZIP Code"
                                      value={newPatientForm.address}
                                      onChange={(e) =>
                                        setNewPatientForm((prev) => ({
                                          ...prev,
                                          address: e.target.value,
                                        }))
                                      }
                                      rows={2}
                                    />
                                  </div>

                                  <div className="space-y-2">
                                    <Label
                                      htmlFor="emergencyContact"
                                      className="flex items-center gap-2"
                                    >
                                      <Phone className="h-4 w-4" />
                                      Emergency Contact
                                    </Label>
                                    <Input
                                      id="emergencyContact"
                                      placeholder="Emergency contact name and phone number"
                                      value={newPatientForm.emergencyContact}
                                      onChange={(e) =>
                                        setNewPatientForm((prev) => ({
                                          ...prev,
                                          emergencyContact: e.target.value,
                                        }))
                                      }
                                    />
                                  </div>
                                </TabsContent>

                                <TabsContent
                                  value="medical"
                                  className="space-y-4"
                                >
                                  <div className="space-y-2">
                                    <Label
                                      htmlFor="allergies"
                                      className="flex items-center gap-2"
                                    >
                                      <AlertCircle className="h-4 w-4" />
                                      Allergies
                                    </Label>
                                    <Textarea
                                      id="allergies"
                                      placeholder="List any allergies (e.g., Penicillin, Peanuts, Latex, etc.)"
                                      value={newPatientForm.allergies}
                                      onChange={(e) =>
                                        setNewPatientForm((prev) => ({
                                          ...prev,
                                          allergies: e.target.value,
                                        }))
                                      }
                                      rows={3}
                                    />
                                    <p className="text-sm text-muted-foreground">
                                      Separate multiple allergies with commas
                                    </p>
                                  </div>

                                  <div className="space-y-2">
                                    <Label
                                      htmlFor="medicalHistory"
                                      className="flex items-center gap-2"
                                    >
                                      <Activity className="h-4 w-4" />
                                      Medical History
                                    </Label>
                                    <Textarea
                                      id="medicalHistory"
                                      placeholder="Previous medical conditions, surgeries, chronic illnesses, medications, etc."
                                      value={newPatientForm.medicalHistory}
                                      onChange={(e) =>
                                        setNewPatientForm((prev) => ({
                                          ...prev,
                                          medicalHistory: e.target.value,
                                        }))
                                      }
                                      rows={4}
                                    />
                                    <p className="text-sm text-muted-foreground">
                                      Include any relevant medical history for
                                      better care
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
                                >
                                  Cancel
                                </Button>
                                <Button
                                  type="button"
                                  onClick={createNewPatient}
                                  disabled={
                                    creatingPatient ||
                                    !newPatientForm.name.trim()
                                  }
                                  className="gap-2"
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
                        <div className="py-8 text-center border-2 border-dashed rounded-lg">
                          <div className="inline-block p-3 bg-muted rounded-full mb-3">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                          </div>
                          <p className="font-medium">Searching patients...</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Please wait while we search our database
                          </p>
                        </div>
                      ) : searchResults.length > 0 ? (
                        <div className="border rounded-lg overflow-hidden">
                          <div className="bg-muted px-4 py-3 border-b">
                            <div className="flex items-center justify-between">
                              <div>
                                <h3 className="font-semibold">
                                  Found {searchResults.length} patient
                                  {searchResults.length !== 1 ? "s" : ""}
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                  Select a patient from the list below
                                </p>
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
                          <div className="max-h-80 overflow-y-auto divide-y">
                            {searchResults.map((patient) => (
                              <div
                                key={patient.id}
                                className="p-4 hover:bg-accent transition-colors cursor-pointer"
                                onClick={() => handleSelectPatient(patient)}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="p-2 bg-background border rounded-md">
                                      <User className="h-4 w-4" />
                                    </div>
                                    <div>
                                      <h4 className="font-semibold">
                                        {patient.name}
                                      </h4>
                                      <div className="flex flex-wrap gap-2 mt-1">
                                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                                          <Phone className="h-3 w-3" />
                                          {patient.phone}
                                        </span>
                                        {patient.guardian && (
                                          <span className="text-sm text-muted-foreground flex items-center gap-1">
                                            <Users className="h-3 w-3" />
                                            {patient.guardian}
                                          </span>
                                        )}
                                        {patient.patientId && (
                                          <span className="text-sm font-medium">
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
                        <div className="border-2 border-dashed rounded-lg p-6 text-center">
                          <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                            <User className="h-6 w-6 text-muted-foreground" />
                          </div>
                          <h3 className="font-semibold mb-2">
                            No Patients Found
                          </h3>
                          <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                            No patients found matching "
                            <span className="font-medium">{patientSearch}</span>
                            "
                          </p>
                          <div className="flex flex-col sm:flex-row gap-2 justify-center">
                            <Button
                              type="button"
                              onClick={() => {
                                setNewPatientForm((prev) => ({
                                  ...prev,
                                  name: patientSearch.trim(),
                                  phone: "",
                                  guardian: "",
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
              <div
                className={cn(
                  "transition-all duration-300",
                  activeSection !== "doctor" && "opacity-75",
                )}
              >
                <Card>
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-primary rounded-lg">
                            <Stethoscope className="h-5 w-5 text-primary-foreground" />
                          </div>
                          <div>
                            <CardTitle className="text-xl">
                              Step 2: Select Doctor & Date
                            </CardTitle>
                            <CardDescription>
                              Choose doctor and appointment date
                            </CardDescription>
                          </div>
                        </div>
                      </div>
                      <Badge variant="secondary" className="px-3 py-1 text-sm">
                        Required
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Emergency Toggle */}
                    <div
                      className={cn(
                        "p-4 rounded-lg border transition-all duration-300",
                        isEmergency
                          ? "bg-destructive/10 border-destructive/20"
                          : "bg-muted",
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <AlertCircle
                            className={cn(
                              "h-5 w-5",
                              isEmergency
                                ? "text-destructive"
                                : "text-muted-foreground",
                            )}
                          />
                          <div>
                            <h4 className="font-semibold">
                              Emergency Appointment
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              High priority scheduling
                            </p>
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
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Doctor Selection */}
                      <div className="space-y-3">
                        <Label htmlFor="doctor" className="font-semibold">
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
                            {loadingDoctors ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <RefreshCw className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        <Select
                          value={selectedDoctor}
                          onValueChange={handleDoctorSelect}
                          required
                          disabled={loadingDoctors}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Choose a doctor..." />
                          </SelectTrigger>
                          <SelectContent className="max-h-60 z-[100]">
                            {loadingDoctors ? (
                              <div className="p-6 text-center">
                                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                                <p className="text-sm text-muted-foreground">
                                  Loading doctors...
                                </p>
                              </div>
                            ) : (
                              doctors.map((doctor) => (
                                <SelectItem
                                  key={doctor.id}
                                  value={doctor.id}
                                  className="py-2"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="p-2 bg-muted rounded-md">
                                      <Stethoscope className="h-4 w-4" />
                                    </div>
                                    <div className="flex-1">
                                      <span className="font-semibold">
                                        Dr. {doctor.name}
                                      </span>
                                      <p className="text-sm text-muted-foreground">
                                        {doctor.specialization} •{" "}
                                        {doctor.department}
                                      </p>
                                    </div>
                                  </div>
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        {selectedDoctorInfo && (
                          <div className="mt-3 p-3 bg-muted rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-background rounded-md">
                                <Stethoscope className="h-4 w-4" />
                              </div>
                              <div>
                                <h5 className="font-semibold">
                                  Dr. {selectedDoctorInfo.name}
                                </h5>
                                <p className="text-sm text-muted-foreground">
                                  {selectedDoctorInfo.specialization} •{" "}
                                  {selectedDoctorInfo.department}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="mt-4">
                          <Label htmlFor="consultationFee" className="font-semibold">
                            Doctor Fee
                          </Label>
                          <Input
                            id="consultationFee"
                            type="number"
                            min="0"
                            step="0.01"
                            value={consultationFee}
                            onChange={(e) => setConsultationFee(e.target.value)}
                            placeholder="Enter consultation fee"
                          />
                        </div>
                      </div>

                      {/* Date Selection */}
                      <div className="space-y-3">
                        <Label htmlFor="date" className="font-semibold">
                          Appointment Date *
                        </Label>
                        <div className="space-y-3">
                          <div className="relative">
                            <Calendar className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                            <Input
                              id="date"
                              type="date"
                              value={appointmentDate}
                              onChange={(e) => handleDateChange(e.target.value)}
                              required
                              className="pl-10"
                              min={format(new Date(), "yyyy-MM-dd")}
                            />
                          </div>
                          <div className="p-3 bg-muted rounded-lg">
                            <div className="flex items-center gap-2">
                              <CalendarDays className="h-4 w-4 text-muted-foreground" />
                              <span className="font-semibold">
                                {formatDisplayDate(appointmentDate)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Appointment Number */}
                    <div className="space-y-3">
                      <Label className="font-semibold">
                        Appointment Number
                      </Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-muted rounded-lg border">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold">
                              Today's Appointments
                            </h4>
                            <Badge variant="secondary">
                              {todaysAppointmentsCount}
                            </Badge>
                          </div>
                          <div className="text-2xl font-bold text-primary">
                            #{autoNumber || "001"}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            Next available number
                          </p>
                        </div>
                        <div className="p-4 bg-muted rounded-lg border">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold">Estimated Time</h4>
                            <Clock className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div className="text-2xl font-bold">
                            {estimatedTime || "TBD"}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
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
              <div
                className={cn(
                  "transition-all duration-300",
                  activeSection !== "details" && "opacity-75",
                )}
              >
                <Card>
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-primary rounded-lg">
                            <FileText className="h-5 w-5 text-primary-foreground" />
                          </div>
                          <div>
                            <CardTitle className="text-xl">
                              Step 3: Appointment Details
                            </CardTitle>
                            <CardDescription>
                              Provide appointment details and additional
                              information
                            </CardDescription>
                          </div>
                        </div>
                      </div>
                      <Badge variant="secondary" className="px-3 py-1 text-sm">
                        Required
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Quick Templates */}
                    <div className="space-y-3">
                      <Label className="font-semibold">Quick Templates</Label>
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Appointment Type */}
                      <div className="space-y-3">
                        <Label
                          htmlFor="appointmentType"
                          className="font-semibold"
                        >
                          Appointment Type *
                        </Label>
                        <Select
                          value={appointmentType}
                          onValueChange={setAppointmentType}
                          required
                          disabled={isEmergency}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(appointmentTypeIcons).map(
                              ([value, icon]) => (
                                <SelectItem
                                  key={value}
                                  value={value}
                                  className="py-2"
                                >
                                  <div className="flex items-center gap-3">
                                    <span className="text-lg">{icon}</span>
                                    <span className="capitalize">
                                      {value.replace("-", " ")}
                                    </span>
                                  </div>
                                </SelectItem>
                              ),
                            )}
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
                          <SelectTrigger>
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(priorityColors).map(
                              ([value, className]) => (
                                <SelectItem
                                  key={value}
                                  value={value}
                                  className="py-2"
                                >
                                  <div className="flex items-center gap-3">
                                    <div
                                      className={`w-2 h-2 rounded-full ${className.split(" ")[0]}`}
                                    ></div>
                                    <span className="capitalize">{value}</span>
                                  </div>
                                </SelectItem>
                              ),
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>



                    {/* Symptoms */}
                    <div className="space-y-3">
                      <Label className="font-semibold flex items-center gap-2">
                        <Brain className="h-5 w-5" />
                        Symptoms
                      </Label>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {commonSymptoms.map((symptom) => {
                          const isSelected = symptoms
                            .split(",")
                            .map((s) => s.trim())
                            .includes(symptom);
                          return (
                            <Badge
                              key={symptom}
                              variant={isSelected ? "default" : "outline"}
                              className={cn(
                                "cursor-pointer",
                                isSelected && "bg-primary hover:bg-primary/90",
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
                        rows={2}
                        className="min-h-20 resize-y"
                      />
                    </div>

                    {/* Notes */}
                    <div className="space-y-3">
                      <Label
                        htmlFor="notes"
                        className="font-semibold flex items-center gap-2"
                      >
                        <FileText className="h-5 w-5" />
                        Additional Notes
                      </Label>
                      <Textarea
                        id="notes"
                        placeholder="Any special instructions, preferences, or notes..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={2}
                        className="min-h-20 resize-y"
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          {/* Right Column - Summary & Actions */}
          <div className="space-y-6">
            {/* Action Card */}
            <Card className="sticky top-24">
              <CardContent className="p-6">
                <div className="space-y-6">
                  <div className="text-center">
                    <h3 className="text-lg font-semibold mb-2">
                      Schedule Appointment
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      Review all information before scheduling
                    </p>
                  </div>

                  <div className="space-y-3">
                    <Button
                      type="submit"
                      onClick={handleSubmit}
                      disabled={loading || !isFormValid()}
                      className="w-full h-12 font-semibold"
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
                        onClick={() => router.push("/reception/appointments")}
                        className="h-10"
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
                          setSymptoms("");
                          setNotes("");
                          setAutoNumber("");
                        }}
                        className="h-10 gap-2"
                        disabled={loading}
                      >
                        <RefreshCw className="h-4 w-4" />
                        Reset
                      </Button>
                    </div>
                  </div>

                  {!isFormValid() && (
                    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="h-4 w-4 text-destructive" />
                        <span className="font-semibold text-destructive text-sm">
                          Incomplete Information
                        </span>
                      </div>
                      <ul className="space-y-1 text-sm text-destructive">
                        {!selectedPatient && (
                          <li className="flex items-center gap-1">
                            • Select or create a patient
                          </li>
                        )}
                        {!selectedDoctor && (
                          <li className="flex items-center gap-1">
                            • Choose a doctor
                          </li>
                        )}
                      </ul>
                    </div>
                  )}

                  <div className="pt-4 border-t">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      <h4 className="font-semibold text-sm">Information</h4>
                    </div>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <div className="flex items-start gap-1">
                        <div className="w-1 h-1 bg-muted-foreground rounded-full mt-1.5"></div>
                        <p>Appointments scheduled by date only</p>
                      </div>
                      <div className="flex items-start gap-1">
                        <div className="w-1 h-1 bg-muted-foreground rounded-full mt-1.5"></div>
                        <p>Auto-number starts from 001 daily</p>
                      </div>
                      <div className="flex items-start gap-1">
                        <div className="w-1 h-1 bg-muted-foreground rounded-full mt-1.5"></div>
                        <p>Emergency appointments take priority</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
