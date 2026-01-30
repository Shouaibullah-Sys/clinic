// app/laboratory/direct-tests/create/page.tsx

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Search,
  User,
  TestTube,
  DollarSign,
  Clock,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Plus,
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { toast } from "sonner";

interface Patient {
  _id: string;
  name: string;
  patientId: string;
  phone?: string;
  email?: string;
}

interface TestTemplate {
  _id: string;
  testCode: string;
  testName: string;
  category: string;
  description?: string;
  specimenType: string[];
  basePrice: number;
  turnaroundTime: number;
  active: boolean;
}

export default function CreateDirectTestPage() {
  const router = useRouter();
  const { accessToken, user } = useAuthStore();

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<TestTemplate | null>(
    null,
  );
  const [priority, setPriority] = useState<"routine" | "urgent" | "emergency">(
    "routine",
  );
  const [notes, setNotes] = useState("");

  // Search states
  const [patientSearchQuery, setPatientSearchQuery] = useState("");
  const [patientSearchResults, setPatientSearchResults] = useState<Patient[]>(
    [],
  );
  const [searchingPatients, setSearchingPatients] = useState(false);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);

  // New patient creation state
  const [showCreatePatientDialog, setShowCreatePatientDialog] = useState(false);
  const [creatingPatient, setCreatingPatient] = useState(false);
  const [newPatient, setNewPatient] = useState({
    name: "",
    phone: "",
    email: "",
    dateOfBirth: "",
    gender: "",
    address: "",
  });

  const [templates, setTemplates] = useState<TestTemplate[]>([]);
  const [templateSearchQuery, setTemplateSearchQuery] = useState("");

  // Fetch templates on mount
  useEffect(() => {
    fetchTemplates();
  }, [accessToken]);

  // Search patients with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (patientSearchQuery.length >= 2) {
        searchPatients();
      } else {
        setPatientSearchResults([]);
        setShowPatientDropdown(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [patientSearchQuery, accessToken]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      if (!accessToken) {
        setError("Authentication required");
        return;
      }

      const response = await fetch("/api/laboratory/templates", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch templates");
      }

      const data = await response.json();
      setTemplates(data.data?.filter((t: TestTemplate) => t.active) || []);
    } catch (err: any) {
      setError(err.message || "Failed to load templates");
    } finally {
      setLoading(false);
    }
  };

  const searchPatients = async () => {
    try {
      setSearchingPatients(true);
      if (!accessToken) {
        return;
      }

      const response = await fetch(
        `/api/patients/search?q=${encodeURIComponent(patientSearchQuery)}&limit=10`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error("Failed to search patients");
      }

      const data = await response.json();
      setPatientSearchResults(data.data || []);
      setShowPatientDropdown(true);
    } catch (err: any) {
      console.error("Error searching patients:", err);
    } finally {
      setSearchingPatients(false);
    }
  };

  const handleSelectPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setPatientSearchQuery(patient.name);
    setShowPatientDropdown(false);
    setPatientSearchResults([]);
  };

  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!newPatient.name || !newPatient.phone) {
      toast.error("Name and phone are required");
      return;
    }

    try {
      setCreatingPatient(true);

      const response = await fetch("/api/patients", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newPatient.name,
          phone: newPatient.phone,
          email: newPatient.email || undefined,
          dateOfBirth: newPatient.dateOfBirth || undefined,
          gender: newPatient.gender || undefined,
          address: newPatient.address || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create patient");
      }

      const data = await response.json();
      toast.success("Patient created successfully");

      // Select the newly created patient
      setSelectedPatient(data.data);
      setPatientSearchQuery(data.data.name);
      setShowCreatePatientDialog(false);

      // Reset form
      setNewPatient({
        name: "",
        phone: "",
        email: "",
        dateOfBirth: "",
        gender: "",
        address: "",
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to create patient");
    } finally {
      setCreatingPatient(false);
    }
  };

  const handleSelectTemplate = (template: TestTemplate) => {
    setSelectedTemplate(template);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedPatient) {
      toast.error("Please select a patient");
      return;
    }

    if (!selectedTemplate) {
      toast.error("Please select a test template");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const response = await fetch("/api/laboratory/direct-tests", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          patientId: selectedPatient._id,
          testTemplateId: selectedTemplate._id,
          priority,
          notes: notes || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create direct lab test");
      }

      const data = await response.json();
      toast.success("Direct lab test created successfully");

      // Redirect to test details page
      router.push(`/laboratory/direct-tests/${data.data._id}`);
    } catch (err: any) {
      setError(err.message || "Failed to create direct lab test");
      toast.error(err.message || "Failed to create direct lab test");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredTemplates = templates.filter((template) => {
    if (!templateSearchQuery) return true;
    const query = templateSearchQuery.toLowerCase();
    return (
      template.testName.toLowerCase().includes(query) ||
      template.testCode.toLowerCase().includes(query) ||
      template.category.toLowerCase().includes(query)
    );
  });

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <Skeleton className="h-8 w-64 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Create Direct Lab Test
          </h1>
          <p className="text-muted-foreground mt-1">
            Create a lab test for patients visiting without a doctor
          </p>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Patient and Template Selection */}
          <div className="space-y-6">
            {/* Patient Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Select Patient
                </CardTitle>
                <CardDescription>
                  Search and select a patient for this lab test
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, phone, or patient ID..."
                    className="pl-9"
                    value={patientSearchQuery}
                    onChange={(e) => setPatientSearchQuery(e.target.value)}
                    onFocus={() => {
                      if (patientSearchResults.length > 0) {
                        setShowPatientDropdown(true);
                      }
                    }}
                    onBlur={() => {
                      // Delay hiding dropdown to allow click events
                      setTimeout(() => setShowPatientDropdown(false), 200);
                    }}
                  />
                  {searchingPatients && (
                    <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>

                {/* Patient Dropdown */}
                {showPatientDropdown && patientSearchResults.length > 0 && (
                  <div className="border rounded-md shadow-sm bg-background max-h-60 overflow-y-auto">
                    {patientSearchResults.map((patient) => (
                      <button
                        key={patient._id}
                        type="button"
                        className="w-full text-left px-3 py-2 hover:bg-accent transition-colors border-b last:border-b-0"
                        onClick={() => handleSelectPatient(patient)}
                      >
                        <div className="font-medium">{patient.name}</div>
                        <div className="text-sm text-muted-foreground">
                          ID: {patient.patientId}
                          {patient.phone && ` • ${patient.phone}`}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* No patients found - show create button */}
                {showPatientDropdown &&
                  patientSearchQuery.length >= 2 &&
                  patientSearchResults.length === 0 &&
                  !searchingPatients && (
                    <div className="border rounded-md shadow-sm bg-background p-4">
                      <p className="text-sm text-muted-foreground mb-3">
                        No patients found matching "{patientSearchQuery}"
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={() => setShowCreatePatientDialog(true)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create New Patient
                      </Button>
                    </div>
                  )}

                {/* Selected Patient */}
                {selectedPatient && (
                  <div className="p-4 bg-muted/50 rounded-md border">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          {selectedPatient.name}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          Patient ID: {selectedPatient.patientId}
                        </div>
                        {selectedPatient.phone && (
                          <div className="text-sm text-muted-foreground">
                            Phone: {selectedPatient.phone}
                          </div>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedPatient(null);
                          setPatientSearchQuery("");
                        }}
                      >
                        Change
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Test Template Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TestTube className="h-5 w-5" />
                  Select Test Template
                </CardTitle>
                <CardDescription>
                  Choose a test template from available options
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search templates..."
                    className="pl-9"
                    value={templateSearchQuery}
                    onChange={(e) => setTemplateSearchQuery(e.target.value)}
                  />
                </div>

                <div className="border rounded-md max-h-80 overflow-y-auto">
                  {filteredTemplates.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      No templates found
                    </div>
                  ) : (
                    filteredTemplates.map((template) => (
                      <button
                        key={template._id}
                        type="button"
                        className={`w-full text-left px-4 py-3 hover:bg-accent transition-colors border-b last:border-b-0 ${
                          selectedTemplate?._id === template._id
                            ? "bg-accent"
                            : ""
                        }`}
                        onClick={() => handleSelectTemplate(template)}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="font-medium">
                              {template.testName}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {template.testCode}
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="outline" className="text-xs">
                                {template.category.replace(/_/g, " ")}
                              </Badge>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                {template.turnaroundTime}h
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 text-green-600">
                            <DollarSign className="h-4 w-4" />
                            <span className="font-medium">
                              {formatPrice(template.basePrice)}
                            </span>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Test Details and Options */}
          <div className="space-y-6">
            {/* Selected Template Details */}
            {selectedTemplate && (
              <Card>
                <CardHeader>
                  <CardTitle>Test Details</CardTitle>
                  <CardDescription>
                    Review the selected test template details
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Test Name</Label>
                    <p className="font-medium mt-1">
                      {selectedTemplate.testName}
                    </p>
                  </div>

                  <div>
                    <Label>Test Code</Label>
                    <p className="font-mono text-sm mt-1">
                      {selectedTemplate.testCode}
                    </p>
                  </div>

                  <div>
                    <Label>Category</Label>
                    <div className="mt-1">
                      <Badge variant="outline">
                        {selectedTemplate.category.replace(/_/g, " ")}
                      </Badge>
                    </div>
                  </div>

                  <div>
                    <Label>Specimen Type</Label>
                    <p className="text-sm mt-1">
                      {selectedTemplate.specimenType.join(", ")}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Price</Label>
                      <div className="flex items-center gap-1 text-green-600 mt-1">
                        <DollarSign className="h-4 w-4" />
                        <span className="font-medium">
                          {formatPrice(selectedTemplate.basePrice)}
                        </span>
                      </div>
                    </div>
                    <div>
                      <Label>Turnaround Time</Label>
                      <div className="flex items-center gap-1 text-blue-600 mt-1">
                        <Clock className="h-4 w-4" />
                        <span className="font-medium">
                          {selectedTemplate.turnaroundTime} hours
                        </span>
                      </div>
                    </div>
                  </div>

                  {selectedTemplate.description && (
                    <div>
                      <Label>Description</Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        {selectedTemplate.description}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Test Options */}
            <Card>
              <CardHeader>
                <CardTitle>Test Options</CardTitle>
                <CardDescription>
                  Configure additional test settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    value={priority}
                    onValueChange={(value: any) => setPriority(value)}
                  >
                    <SelectTrigger id="priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="routine">Routine</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                      <SelectItem value="emergency">Emergency</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Higher priority tests may be processed faster
                  </p>
                </div>

                <div>
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Add any additional notes or instructions..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Summary */}
            {selectedPatient && selectedTemplate && (
              <Card>
                <CardHeader>
                  <CardTitle>Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Patient
                    </span>
                    <span className="font-medium">{selectedPatient.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Test</span>
                    <span className="font-medium">
                      {selectedTemplate.testName}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Priority
                    </span>
                    <Badge
                      variant="outline"
                      className={
                        priority === "emergency"
                          ? "border-red-300 text-red-700 bg-red-50"
                          : priority === "urgent"
                            ? "border-orange-300 text-orange-700 bg-orange-50"
                            : ""
                      }
                    >
                      {priority}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Total Amount
                    </span>
                    <span className="font-medium text-green-600">
                      {formatPrice(selectedTemplate.basePrice)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <div className="mt-6 flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={submitting || !selectedPatient || !selectedTemplate}
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Direct Lab Test"
            )}
          </Button>
        </div>
      </form>

      {/* Create Patient Dialog */}
      <Dialog
        open={showCreatePatientDialog}
        onOpenChange={setShowCreatePatientDialog}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Patient</DialogTitle>
            <DialogDescription>
              Enter patient details to create a new patient record
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreatePatient} className="space-y-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="patientName">
                  Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="patientName"
                  value={newPatient.name}
                  onChange={(e) =>
                    setNewPatient({ ...newPatient, name: e.target.value })
                  }
                  placeholder="Enter patient name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="patientPhone">
                  Phone <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="patientPhone"
                  type="tel"
                  value={newPatient.phone}
                  onChange={(e) =>
                    setNewPatient({ ...newPatient, phone: e.target.value })
                  }
                  placeholder="Enter phone number"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="patientEmail">Email</Label>
                <Input
                  id="patientEmail"
                  type="email"
                  value={newPatient.email}
                  onChange={(e) =>
                    setNewPatient({ ...newPatient, email: e.target.value })
                  }
                  placeholder="Enter email address"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="patientGender">Gender</Label>
                <Select
                  value={newPatient.gender}
                  onValueChange={(value) =>
                    setNewPatient({ ...newPatient, gender: value })
                  }
                >
                  <SelectTrigger id="patientGender">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="patientDateOfBirth">Date of Birth</Label>
                <Input
                  id="patientDateOfBirth"
                  type="date"
                  value={newPatient.dateOfBirth}
                  onChange={(e) =>
                    setNewPatient({
                      ...newPatient,
                      dateOfBirth: e.target.value,
                    })
                  }
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="patientAddress">Address</Label>
                <Textarea
                  id="patientAddress"
                  value={newPatient.address}
                  onChange={(e) =>
                    setNewPatient({ ...newPatient, address: e.target.value })
                  }
                  placeholder="Enter patient address"
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreatePatientDialog(false)}
                disabled={creatingPatient}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={creatingPatient}>
                {creatingPatient ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Patient
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
