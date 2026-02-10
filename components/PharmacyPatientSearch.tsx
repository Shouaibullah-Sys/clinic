"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Search,
  X,
  Loader2,
  AlertCircle,
  UserPlus,
  User,
  Phone,
  Calendar,
  FileText,
  CheckCircle,
  Droplet,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/components/ui/cn";

export interface Patient {
  _id: string;
  id?: string;
  patientId: string;
  name: string;
  phone: string;
  email?: string;
  dateOfBirth?: string;
  age?: number;
  gender?: "male" | "female" | "other";
  bloodGroup?: string;
  address?: string;
  allergies?: string[];
  medicalHistory?: string;
}

interface PharmacyPatientSearchProps {
  onPatientSelect: (patient: Patient) => void;
  selectedPatient?: Patient | null;
  placeholder?: string;
}

interface SearchResponse {
  success: boolean;
  data: Patient[];
  count?: number;
  error?: string;
}

interface CreatePatientResponse {
  success: boolean;
  data: Patient;
  message?: string;
  error?: string;
}

// Blood group options
const BLOOD_GROUPS = [
  "A+",
  "A-",
  "B+",
  "B-",
  "AB+",
  "AB-",
  "O+",
  "O-",
  "unknown",
  "",
];

// Gender options
const GENDERS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Calculate age from date of birth
function calculateAge(dateOfBirth: string): number {
  const birthDate = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }

  return age;
}

// Validate phone number (10-15 digits)
function validatePhoneNumber(phone: string): boolean {
  const cleanPhone = phone.replace(/\D/g, "");
  return cleanPhone.length >= 10 && cleanPhone.length <= 15;
}

export default function PharmacyPatientSearch({
  onPatientSelect,
  selectedPatient,
  placeholder = "Search patient by name, phone, or ID...",
}: PharmacyPatientSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  // Create patient dialog state
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreatingPatient, setIsCreatingPatient] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [newPatient, setNewPatient] = useState({
    name: "",
    phone: "",
    dateOfBirth: "",
    gender: "" as "male" | "female" | "other" | "",
    bloodGroup: "",
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const debouncedQuery = useDebounce(searchQuery, 300);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Search patients
  const searchPatients = useCallback(async (query: string) => {
    if (!query.trim()) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/patients/search?q=${encodeURIComponent(query)}&limit=20`,
      );

      if (!response.ok) {
        throw new Error("Failed to search patients");
      }

      const data: SearchResponse = await response.json();

      if (data.success && data.data) {
        // Calculate age for each patient if dateOfBirth is available
        const patientsWithAge = data.data.map((patient) => ({
          ...patient,
          age: patient.dateOfBirth
            ? calculateAge(patient.dateOfBirth)
            : undefined,
        }));
        setResults(patientsWithAge);
        setIsOpen(patientsWithAge.length > 0);
      } else {
        setResults([]);
        setError(data.error || "No patients found");
      }
    } catch (err) {
      console.error("Error searching patients:", err);
      setError("Failed to search patients. Please try again.");
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Trigger search when debounced query changes
  useEffect(() => {
    searchPatients(debouncedQuery);
  }, [debouncedQuery, searchPatients]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen || results.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < results.length - 1 ? prev + 1 : prev,
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
      } else if (e.key === "Enter" && selectedIndex >= 0) {
        e.preventDefault();
        handleSelectPatient(results[selectedIndex]);
      } else if (e.key === "Escape") {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, results, selectedIndex]);

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && resultsRef.current) {
      const selectedElement = resultsRef.current.children[
        selectedIndex
      ] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedIndex]);

  const handleSelectPatient = (patient: Patient) => {
    onPatientSelect(patient);
    setSearchQuery("");
    setResults([]);
    setIsOpen(false);
    setSelectedIndex(-1);
  };

  const handleClear = () => {
    setSearchQuery("");
    setResults([]);
    setIsOpen(false);
    setSelectedIndex(-1);
    setError(null);
    inputRef.current?.focus();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setIsOpen(true);
    setSelectedIndex(-1);
  };

  // Create new patient
  const handleCreatePatient = async () => {
    // Validate required fields
    if (!newPatient.name.trim()) {
      setCreateError("Name is required");
      return;
    }

    if (!newPatient.phone.trim()) {
      setCreateError("Phone number is required");
      return;
    }

    if (!validatePhoneNumber(newPatient.phone)) {
      setCreateError("Phone number must be 10-15 digits");
      return;
    }

    if (!newPatient.dateOfBirth) {
      setCreateError("Date of birth is required");
      return;
    }

    if (!newPatient.gender) {
      setCreateError("Gender is required");
      return;
    }

    setIsCreatingPatient(true);
    setCreateError(null);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Authentication required");
      }

      const response = await fetch("/api/patients", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newPatient.name.trim(),
          phone: newPatient.phone.trim(),
          dateOfBirth: newPatient.dateOfBirth,
          gender: newPatient.gender,
          bloodGroup: newPatient.bloodGroup || undefined,
        }),
      });

      const data: CreatePatientResponse = await response.json();

      if (data.success && data.data) {
        // Calculate age for the new patient
        const patientWithAge = {
          ...data.data,
          age: data.data.dateOfBirth
            ? calculateAge(data.data.dateOfBirth)
            : undefined,
        };

        onPatientSelect(patientWithAge);
        setIsCreateDialogOpen(false);
        resetNewPatientForm();
      } else {
        setCreateError(data.error || "Failed to create patient");
      }
    } catch (err) {
      console.error("Error creating patient:", err);
      setCreateError("Failed to create patient. Please try again.");
    } finally {
      setIsCreatingPatient(false);
    }
  };

  const resetNewPatientForm = () => {
    setNewPatient({
      name: "",
      phone: "",
      dateOfBirth: "",
      gender: "",
      bloodGroup: "",
    });
    setCreateError(null);
  };

  const handleOpenCreateDialog = () => {
    resetNewPatientForm();
    setIsCreateDialogOpen(true);
    setIsOpen(false);
  };

  const handleCloseCreateDialog = () => {
    setIsCreateDialogOpen(false);
    resetNewPatientForm();
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={handleInputChange}
          placeholder={placeholder}
          className="pl-9 pr-10"
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
        />
        {searchQuery && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
            onClick={handleClear}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
        {isLoading && (
          <Loader2 className="absolute right-10 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Selected patient display */}
      {selectedPatient && !searchQuery && (
        <div className="mt-2 p-3 border rounded-lg bg-muted/50">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium truncate">
                  {selectedPatient.name}
                </span>
                <Badge
                  variant="default"
                  className="text-xs bg-green-500 hover:bg-green-600"
                >
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Selected
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground space-y-0.5">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    {selectedPatient.patientId}
                  </div>
                  <div className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {selectedPatient.phone}
                  </div>
                  {selectedPatient.age && selectedPatient.gender && (
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {selectedPatient.age}y, {selectedPatient.gender}
                    </div>
                  )}
                </div>
                {selectedPatient.bloodGroup && (
                  <div className="flex items-center gap-1">
                    <Droplet className="h-3 w-3" />
                    Blood Group: {selectedPatient.bloodGroup}
                  </div>
                )}
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0"
              onClick={() => onPatientSelect(null as any)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Autocomplete dropdown */}
      {isOpen && (results.length > 0 || error || isLoading) && (
        <div
          ref={resultsRef}
          className="absolute z-50 w-full mt-1 bg-background border rounded-lg shadow-lg max-h-80 overflow-auto"
        >
          {error ? (
            <div className="p-4 text-sm text-destructive flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          ) : isLoading ? (
            <div className="p-4 text-sm text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching...
            </div>
          ) : results.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground text-center">
              No patients found
            </div>
          ) : (
            <>
              {results.map((patient, index) => (
                <button
                  key={patient._id}
                  type="button"
                  onClick={() => handleSelectPatient(patient)}
                  className={cn(
                    "w-full text-left p-3 border-b last:border-b-0 transition-colors",
                    "hover:bg-muted/50 focus:bg-muted/50 focus:outline-none",
                    selectedIndex === index && "bg-muted/50",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium truncate">
                          {patient.name}
                        </span>
                        {selectedPatient?._id === patient._id && (
                          <CheckCircle className="h-3 w-3 text-green-500" />
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            {patient.patientId}
                          </div>
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {patient.phone}
                          </div>
                          {patient.age && patient.gender && (
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {patient.age}y, {patient.gender}
                            </div>
                          )}
                        </div>
                        {patient.bloodGroup && (
                          <div className="flex items-center gap-1">
                            <Droplet className="h-3 w-3" />
                            Blood Group: {patient.bloodGroup}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
              {/* Create new patient button */}
              <button
                type="button"
                onClick={handleOpenCreateDialog}
                className="w-full text-left p-3 border-t transition-colors hover:bg-muted/50 focus:bg-muted/50 focus:outline-none"
              >
                <div className="flex items-center gap-2 text-sm text-primary">
                  <UserPlus className="h-4 w-4" />
                  Create New Patient
                </div>
              </button>
            </>
          )}
        </div>
      )}

      {/* Create New Patient Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Patient</DialogTitle>
            <DialogDescription>
              Enter the patient's details to create a new record.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {createError && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {createError}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="patient-name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="patient-name"
                placeholder="Enter patient name"
                value={newPatient.name}
                onChange={(e) =>
                  setNewPatient({ ...newPatient, name: e.target.value })
                }
                disabled={isCreatingPatient}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="patient-phone">
                Phone Number <span className="text-destructive">*</span>
              </Label>
              <Input
                id="patient-phone"
                type="tel"
                placeholder="Enter phone number (10-15 digits)"
                value={newPatient.phone}
                onChange={(e) =>
                  setNewPatient({ ...newPatient, phone: e.target.value })
                }
                disabled={isCreatingPatient}
              />
              <p className="text-xs text-muted-foreground">
                Must be 10-15 digits
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="patient-dob">
                Date of Birth <span className="text-destructive">*</span>
              </Label>
              <Input
                id="patient-dob"
                type="date"
                value={newPatient.dateOfBirth}
                onChange={(e) =>
                  setNewPatient({ ...newPatient, dateOfBirth: e.target.value })
                }
                disabled={isCreatingPatient}
                max={new Date().toISOString().split("T")[0]}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="patient-gender">
                Gender <span className="text-destructive">*</span>
              </Label>
              <Select
                value={newPatient.gender}
                onValueChange={(value: "male" | "female" | "other") =>
                  setNewPatient({ ...newPatient, gender: value })
                }
                disabled={isCreatingPatient}
              >
                <SelectTrigger id="patient-gender">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  {GENDERS.map((gender) => (
                    <SelectItem key={gender.value} value={gender.value}>
                      {gender.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="patient-blood-group">
                Blood Group (Optional)
              </Label>
              <Select
                value={newPatient.bloodGroup}
                onValueChange={(value) =>
                  setNewPatient({ ...newPatient, bloodGroup: value })
                }
                disabled={isCreatingPatient}
              >
                <SelectTrigger id="patient-blood-group">
                  <SelectValue placeholder="Select blood group" />
                </SelectTrigger>
                <SelectContent>
                  {BLOOD_GROUPS.map((bg) => (
                    <SelectItem key={bg} value={bg}>
                      {bg || "Unknown"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCloseCreateDialog}
              disabled={isCreatingPatient}
            >
              Cancel
            </Button>
            <Button onClick={handleCreatePatient} disabled={isCreatingPatient}>
              {isCreatingPatient ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
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
  );
}
