// app/radiology/direct-exams/create/page.tsx

"use client";

import { useState, useEffect, useMemo } from "react";
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
  Scan,
  Clock,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Plus,
  Trash2,
  FileText,
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { useRadiologyTemplates } from "@/lib/hooks/use-services";
import { toast } from "sonner";

interface Patient {
  _id: string;
  name: string;
  patientId: string;
  phone?: string;
  guardian?: string;
}

interface ExamFinding {
  id: string;
  name: string;
  value: string;
  unit: string;
  remarks: string;
}

interface RadiologyTemplate {
  _id: string;
  templateCode: string;
  examName: string;
  serviceType: string;
  category: string;
  bodyPart?: string;
  views?: string[];
  description?: string;
  contrastRequired: boolean;
  contrastType?: string;
  preparationInstructions?: string;
  duration: number;
  basePrice: number;
  active: boolean;
  parameters?: Array<{
    parameterCode: string;
    parameterName: string;
    description?: string;
    normalFindings?: string;
    unit?: string;
  }>;
}

// Service type mapping for display
const serviceTypeLabels: Record<string, string> = {
  "x-ray": "X-Ray",
  "ct-scan": "CT Scan",
  mri: "MRI",
  ultrasound: "Ultrasound",
  mammography: "Mammography",
  fluoroscopy: "Fluoroscopy",
  "pet-scan": "PET Scan",
  "bone-density": "Bone Density",
  other: "Other",
};

const modalityCategoryMap: Record<string, string> = {
  "x-ray": "xray",
  xray: "xray",
  "ct-scan": "ct",
  ct: "ct",
  mri: "mri",
  ultrasound: "ultrasound",
  mammography: "mammography",
  fluoroscopy: "fluoroscopy",
  "pet-scan": "nuclear_medicine",
  nuclear_medicine: "nuclear_medicine",
  "bone-density": "other",
  other: "other",
};

export default function CreateDirectExamPage() {
  const router = useRouter();
  const { accessToken, user } = useAuthStore();

  // Fetch radiology templates
  const {
    data: templatesData,
    isLoading: loadingTemplates,
    error: templatesError,
  } = useRadiologyTemplates({});

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedTemplate, setSelectedTemplate] =
    useState<RadiologyTemplate | null>(null);
  const [selectedModalityType, setSelectedModalityType] = useState<string>("");
  const [selectedBodyPart, setSelectedBodyPart] = useState<string>("");
  const [selectedView, setSelectedView] = useState<string>("");
  const [examName, setExamName] = useState<string>("");
  const [price, setPrice] = useState<string>("");
  const [priority, setPriority] = useState<"routine" | "urgent" | "emergency">(
    "routine",
  );
  const [notes, setNotes] = useState("");

  // Template-specific fields
  const [contrastRequired, setContrastRequired] = useState<boolean>(false);
  const [contrastType, setContrastType] = useState<string>("");
  const [preparationInstructions, setPreparationInstructions] =
    useState<string>("");
  const [duration, setDuration] = useState<string>("");

  // Exam findings/results
  const [examFindings, setExamFindings] = useState<ExamFinding[]>([
    { id: "1", name: "", value: "", unit: "", remarks: "" },
  ]);

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
    guardian: "",
    dateOfBirth: "",
    gender: "",
    address: "",
  });

  // Get unique service types from templates
  const serviceTypes = useMemo(() => {
    if (!templatesData?.data) return [];
    const types = new Set(
      templatesData.data.map((t: RadiologyTemplate) => t.serviceType),
    );
    return Array.from(types).sort();
  }, [templatesData?.data]);

  // Get templates for selected service type
  const templatesForServiceType = useMemo(() => {
    if (!templatesData?.data || !selectedModalityType) return [];
    return templatesData.data.filter(
      (t: RadiologyTemplate) =>
        t.serviceType === selectedModalityType && t.active,
    );
  }, [templatesData?.data, selectedModalityType]);

  // Get unique body parts for selected service type
  const bodyPartsForServiceType = useMemo(() => {
    if (!templatesForServiceType.length) return [];
    const bodyParts = new Set(
      templatesForServiceType
        .filter((t: RadiologyTemplate) => t.bodyPart)
        .map((t: RadiologyTemplate) => t.bodyPart as string),
    );
    return Array.from(bodyParts).sort();
  }, [templatesForServiceType]);

  // Get unique views for selected service type and body part
  const viewsForServiceType = useMemo(() => {
    if (!templatesForServiceType.length) return [];
    let filtered = templatesForServiceType;
    if (selectedBodyPart) {
      filtered = filtered.filter(
        (t: RadiologyTemplate) => t.bodyPart === selectedBodyPart,
      );
    }
    const views = new Set<string>();
    filtered.forEach((t: RadiologyTemplate) => {
      if (t.views && t.views.length > 0) {
        t.views.forEach((v) => views.add(v));
      }
    });
    return Array.from(views).sort();
  }, [templatesForServiceType, selectedBodyPart]);

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

  // Handle template selection
  const handleSelectTemplate = (templateId: string) => {
    const template = templatesData?.data.find(
      (t: RadiologyTemplate) => t._id === templateId,
    );
    if (template) {
      setSelectedTemplate(template);
      setSelectedModalityType(template.serviceType);
      setSelectedBodyPart(template.bodyPart || "");
      setSelectedView(template.views?.[0] || "");
      setExamName(template.examName);
      setPrice(template.basePrice.toString());
      setContrastRequired(template.contrastRequired);
      setContrastType(template.contrastType || "");
      setPreparationInstructions(template.preparationInstructions || "");
      setDuration(template.duration.toString());

      // Auto-populate findings from template parameters
      if (template.parameters && template.parameters.length > 0) {
        setExamFindings(
          template.parameters.map((param: any, index: number) => ({
            id: (index + 1).toString(),
            name: param.parameterName,
            value: "",
            unit: param.unit || "",
            remarks: param.normalFindings || "",
          })),
        );
      } else {
        setExamFindings([
          { id: "1", name: "", value: "", unit: "", remarks: "" },
        ]);
      }
    }
  };

  // Handle clear template (custom exam)
  const handleClearTemplate = () => {
    setSelectedTemplate(null);
    setSelectedModalityType("");
    setSelectedBodyPart("");
    setSelectedView("");
    setExamName("");
    setPrice("");
    setContrastRequired(false);
    setContrastType("");
    setPreparationInstructions("");
    setDuration("");
    setExamFindings([{ id: "1", name: "", value: "", unit: "", remarks: "" }]);
  };

  // Update exam name when modality and body part are selected (custom mode)
  useEffect(() => {
    if (!selectedTemplate && selectedModalityType && selectedBodyPart) {
      const modalityName =
        serviceTypeLabels[selectedModalityType] || selectedModalityType;
      const fullExamName = `${modalityName} - ${selectedBodyPart}`;
      setExamName(fullExamName);
    }
  }, [selectedTemplate, selectedModalityType, selectedBodyPart]);

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
    if (!newPatient.name) {
      toast.error("Name is required");
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
          guardian: newPatient.guardian || undefined,
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
        guardian: "",
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

  // Exam Findings management functions
  const addExamFinding = () => {
    const newId = (examFindings.length + 1).toString();
    setExamFindings([
      ...examFindings,
      {
        id: newId,
        name: "",
        value: "",
        unit: "",
        remarks: "",
      },
    ]);
  };

  const removeExamFinding = (id: string) => {
    if (examFindings.length > 1) {
      setExamFindings(examFindings.filter((f) => f.id !== id));
    }
  };

  const updateExamFinding = (
    id: string,
    field: keyof ExamFinding,
    value: string,
  ) => {
    setExamFindings(
      examFindings.map((finding) =>
        finding.id === id ? { ...finding, [field]: value } : finding,
      ),
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedPatient) {
      toast.error("Please select a patient");
      return;
    }

    if (!selectedModalityType) {
      toast.error("Please select a modality");
      return;
    }

    if (!selectedBodyPart) {
      toast.error("Please select a body part");
      return;
    }

    if (!price || parseFloat(price) <= 0) {
      toast.error("Please enter a valid price");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      // Filter valid exam findings (name and value are required)
      const validExamFindings = examFindings.filter(
        (f) => f.name.trim() && f.value.trim(),
      );

      const payload = {
        patientId: selectedPatient._id,
        examName:
          examName ||
          `${serviceTypeLabels[selectedModalityType] || selectedModalityType} - ${selectedBodyPart}`,
        category:
          modalityCategoryMap[selectedModalityType] ||
          selectedModalityType ||
          "other",
        price: parseFloat(price),
        priority,
        notes: notes || undefined,
        templateId: selectedTemplate?._id,
        modality: {
          type:
            modalityCategoryMap[selectedModalityType] ||
            selectedModalityType ||
            "other",
          bodyPart: selectedBodyPart,
          view: selectedView,
          findings: validExamFindings.map((f) => ({
            name: f.name,
            value: f.value,
            unit: f.unit,
            remarks: f.remarks,
          })),
          contrastRequired,
          contrastType: contrastType || undefined,
          preparationInstructions: preparationInstructions || undefined,
          duration: duration ? parseInt(duration) : undefined,
        },
      };

      console.log("Creating direct exam with payload:", payload);

      const response = await fetch("/api/radiology/direct-exams", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      console.log("Response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error response:", errorText);
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          throw new Error(
            `Failed to create direct exam: ${response.statusText}`,
          );
        }
        throw new Error(errorData.error || "Failed to create direct exam");
      }

      const data = await response.json();
      console.log("Success response:", data);
      toast.success("Direct radiology exam created successfully");

      // Redirect to exam details page
      router.push(`/radiology/direct-exams/${data.data._id}`);
    } catch (err: any) {
      console.error("Error creating exam:", err);
      setError(err.message || "Failed to create direct exam");
      toast.error(err.message || "Failed to create direct exam");
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingTemplates) {
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
            Create Direct Radiology Exam
          </h1>
          <p className="text-muted-foreground mt-1">
            Create a radiology exam for patients visiting without a doctor
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

      {/* Template Loading Error */}
      {templatesError && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Template Loading Error</AlertTitle>
          <AlertDescription>
            Failed to load templates. You can still create a custom exam without
            a template.
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Patient and Exam Selection */}
          <div className="lg:col-span-2 space-y-6">
            {/* Patient Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Select Patient
                </CardTitle>
                <CardDescription>
                  Search and select a patient for this radiology exam
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

            {/* Template Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Select Template (Optional)
                </CardTitle>
                <CardDescription>
                  Choose a pre-defined template or create a custom exam
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-3">
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="template">Template</Label>
                    <Select
                      value={selectedTemplate?._id || ""}
                      onValueChange={(value) => {
                        if (value === "custom") {
                          handleClearTemplate();
                        } else {
                          handleSelectTemplate(value);
                        }
                      }}
                    >
                      <SelectTrigger id="template">
                        <SelectValue placeholder="Select a template or create custom" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="custom">
                          <div className="flex items-center gap-2">
                            <Plus className="h-4 w-4" />
                            Custom Exam (No Template)
                          </div>
                        </SelectItem>
                        {serviceTypes.map((type: string) => (
                          <SelectItem key={type} value={type} disabled>
                            <span className="font-medium">
                              {serviceTypeLabels[type] || type}
                            </span>
                          </SelectItem>
                        ))}
                        {templatesData?.data
                          ?.filter((t: RadiologyTemplate) => t.active)
                          .map((template: RadiologyTemplate) => (
                            <SelectItem key={template._id} value={template._id}>
                              <div className="flex flex-col">
                                <span>{template.examName}</span>
                                <span className="text-xs text-muted-foreground">
                                  {serviceTypeLabels[template.serviceType] ||
                                    template.serviceType}
                                  {template.bodyPart &&
                                    ` • ${template.bodyPart}`}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {selectedTemplate && (
                    <div className="pt-8">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleClearTemplate}
                      >
                        Clear
                      </Button>
                    </div>
                  )}
                </div>

                {selectedTemplate && (
                  <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-md border border-blue-200 dark:border-blue-800">
                    <div className="flex items-start gap-3">
                      <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div>
                        <div className="font-medium text-blue-700 dark:text-blue-300">
                          {selectedTemplate.examName}
                        </div>
                        <div className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                          <span className="font-medium">Code:</span>{" "}
                          {selectedTemplate.templateCode}
                        </div>
                        {selectedTemplate.description && (
                          <div className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                            {selectedTemplate.description}
                          </div>
                        )}
                        <div className="flex flex-wrap gap-2 mt-2">
                          {selectedTemplate.contrastRequired && (
                            <Badge
                              variant="outline"
                              className="border-blue-300 text-blue-700"
                            >
                              Contrast Required
                            </Badge>
                          )}
                          {selectedTemplate.duration && (
                            <Badge
                              variant="outline"
                              className="border-blue-300 text-blue-700"
                            >
                              <Clock className="h-3 w-3 mr-1" />
                              {selectedTemplate.duration} min
                            </Badge>
                          )}
                          {selectedTemplate.basePrice && (
                            <Badge
                              variant="outline"
                              className="border-blue-300 text-blue-700"
                            >
                              {new Intl.NumberFormat("en-IN", {
                                style: "currency",
                                currency: "AFN",
                              }).format(selectedTemplate.basePrice)}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Modality Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Scan className="h-5 w-5" />
                  Select Modality & Body Part
                </CardTitle>
                <CardDescription>
                  Choose the imaging modality and body part for the exam
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Modality Type */}
                  <div className="space-y-2">
                    <Label htmlFor="modalityType">Modality Type *</Label>
                    <Select
                      value={selectedModalityType}
                      onValueChange={(value) => {
                        setSelectedModalityType(value);
                        setSelectedBodyPart("");
                        setSelectedView("");
                        // Keep exam name if template is selected
                        if (!selectedTemplate) {
                          setExamName("");
                        }
                      }}
                    >
                      <SelectTrigger id="modalityType">
                        <SelectValue placeholder="Select modality" />
                      </SelectTrigger>
                      <SelectContent>
                        {serviceTypes.length > 0 ? (
                          serviceTypes.map((type: string) => (
                            <SelectItem key={type} value={type}>
                              {serviceTypeLabels[type] || type}
                            </SelectItem>
                          ))
                        ) : (
                          // Fallback if no templates available
                          <>
                            <SelectItem value="x-ray">X-Ray</SelectItem>
                            <SelectItem value="ct-scan">CT Scan</SelectItem>
                            <SelectItem value="mri">MRI</SelectItem>
                            <SelectItem value="ultrasound">
                              Ultrasound
                            </SelectItem>
                            <SelectItem value="mammography">
                              Mammography
                            </SelectItem>
                            <SelectItem value="fluoroscopy">
                              Fluoroscopy
                            </SelectItem>
                            <SelectItem value="pet-scan">PET Scan</SelectItem>
                            <SelectItem value="bone-density">
                              Bone Density
                            </SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Body Part */}
                  <div className="space-y-2">
                    <Label htmlFor="bodyPart">Body Part *</Label>
                    <Select
                      value={selectedBodyPart}
                      onValueChange={(value) => {
                        setSelectedBodyPart(value);
                        setSelectedView("");
                        // Keep exam name if template is selected
                        if (!selectedTemplate) {
                          setExamName("");
                        }
                      }}
                      disabled={!selectedModalityType}
                    >
                      <SelectTrigger id="bodyPart">
                        <SelectValue placeholder="Select body part" />
                      </SelectTrigger>
                      <SelectContent>
                        {bodyPartsForServiceType.length > 0 ? (
                          bodyPartsForServiceType.map((bodyPart: string) => (
                            <SelectItem key={bodyPart} value={bodyPart}>
                              {bodyPart}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="other">Other</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* View/Type */}
                  <div className="space-y-2">
                    <Label htmlFor="view">View/Type</Label>
                    <Select
                      value={selectedView}
                      onValueChange={setSelectedView}
                      disabled={!selectedModalityType}
                    >
                      <SelectTrigger id="view">
                        <SelectValue placeholder="Select view" />
                      </SelectTrigger>
                      <SelectContent>
                        {viewsForServiceType.length > 0 ? (
                          viewsForServiceType.map((view: string) => (
                            <SelectItem key={view} value={view}>
                              {view}
                            </SelectItem>
                          ))
                        ) : (
                          <>
                            <SelectItem value="Standard">Standard</SelectItem>
                            <SelectItem value="Specialized">
                              Specialized
                            </SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Exam Name Preview */}
                {selectedModalityType && selectedBodyPart && (
                  <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-md border border-blue-200 dark:border-blue-800">
                    <div className="text-sm text-blue-700 dark:text-blue-300 mb-1">
                      Exam Name Preview:
                    </div>
                    <div className="font-medium">
                      {examName ||
                        `${serviceTypeLabels[selectedModalityType] || selectedModalityType} - ${selectedBodyPart}`}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Exam Findings */}
            <Card className="border-green-200 dark:border-green-800">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Scan className="h-5 w-5 text-green-600 dark:text-green-400" />
                    Exam Findings (Optional)
                  </span>
                  <Button
                    type="button"
                    onClick={addExamFinding}
                    variant="outline"
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Finding
                  </Button>
                </CardTitle>
                <CardDescription>
                  Enter initial findings or observations for this exam
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {examFindings.map((finding, index) => (
                    <div
                      key={finding.id}
                      className="p-4 border rounded-lg space-y-4 bg-green-50/50 dark:bg-green-950/20"
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium">Finding #{index + 1}</h3>
                        {examFindings.length > 1 && (
                          <Button
                            type="button"
                            onClick={() => removeExamFinding(finding.id)}
                            variant="ghost"
                            size="sm"
                            className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Finding Name *</Label>
                          <Input
                            value={finding.name}
                            onChange={(e) =>
                              updateExamFinding(
                                finding.id,
                                "name",
                                e.target.value,
                              )
                            }
                            placeholder="e.g., Fracture, Mass, Nodule"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Value/Observation *</Label>
                          <Input
                            value={finding.value}
                            onChange={(e) =>
                              updateExamFinding(
                                finding.id,
                                "value",
                                e.target.value,
                              )
                            }
                            placeholder="e.g., Visible fracture line, 2cm hypoechoic mass"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Unit</Label>
                          <Input
                            value={finding.unit}
                            onChange={(e) =>
                              updateExamFinding(
                                finding.id,
                                "unit",
                                e.target.value,
                              )
                            }
                            placeholder="e.g., cm, mm, Hounsfield units"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Remarks</Label>
                          <Input
                            value={finding.remarks}
                            onChange={(e) =>
                              updateExamFinding(
                                finding.id,
                                "remarks",
                                e.target.value,
                              )
                            }
                            placeholder="Additional observations..."
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 text-sm text-muted-foreground">
                  <p>
                    Initial findings are optional and can be used to record
                    preliminary observations. The final report can be added
                    later.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Exam Details and Options */}
          <div className="space-y-6">
            {/* Exam Details */}
            <Card>
              <CardHeader>
                <CardTitle>Exam Details</CardTitle>
                <CardDescription>
                  Configure exam pricing and settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="examName">Exam Name</Label>
                  <Input
                    id="examName"
                    value={examName}
                    onChange={(e) => setExamName(e.target.value)}
                    placeholder="Auto-generated from modality selection"
                    disabled={!selectedModalityType}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    This will be auto-filled based on modality selection
                  </p>
                </div>

                <div>
                  <Label htmlFor="price">Price (AFN) *</Label>
                  <Input
                    id="price"
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="Enter exam price"
                    min="0"
                  />
                </div>

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
                    Higher priority exams may be scheduled faster
                  </p>
                </div>

                {/* Contrast Options */}
                <div className="space-y-3 pt-4 border-t">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="contrastRequired"
                      checked={contrastRequired}
                      onChange={(e) => setContrastRequired(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor="contrastRequired">Contrast Required</Label>
                  </div>

                  {contrastRequired && (
                    <div className="space-y-2">
                      <Label htmlFor="contrastType">Contrast Type</Label>
                      <Input
                        id="contrastType"
                        value={contrastType}
                        onChange={(e) => setContrastType(e.target.value)}
                        placeholder="e.g., Iodinated, Gadolinium"
                      />
                    </div>
                  )}
                </div>

                {/* Preparation Instructions */}
                <div>
                  <Label htmlFor="preparationInstructions">
                    Preparation Instructions
                  </Label>
                  <Textarea
                    id="preparationInstructions"
                    placeholder="Enter preparation instructions..."
                    value={preparationInstructions}
                    onChange={(e) => setPreparationInstructions(e.target.value)}
                    rows={3}
                  />
                </div>

                {/* Duration */}
                <div>
                  <Label htmlFor="duration">Duration (minutes)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="Enter estimated duration"
                    min="1"
                  />
                </div>

                <div>
                  <Label htmlFor="notes">
                    Clinical Notes / Reason for Exam
                  </Label>
                  <Textarea
                    id="notes"
                    placeholder="Enter clinical indication or reason for the exam..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Summary */}
            {selectedPatient && selectedModalityType && (
              <Card>
                <CardHeader>
                  <CardTitle>Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Patient
                    </span>
                    <span className="font-medium truncate ml-2">
                      {selectedPatient.name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Modality
                    </span>
                    <span className="font-medium">
                      {serviceTypeLabels[selectedModalityType] ||
                        selectedModalityType ||
                        "-"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Body Part
                    </span>
                    <span className="font-medium">
                      {selectedBodyPart || "-"}
                    </span>
                  </div>
                  {selectedView && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">
                        View
                      </span>
                      <span className="font-medium">{selectedView}</span>
                    </div>
                  )}
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
                  {price && (
                    <div className="flex justify-between pt-2 border-t">
                      <span className="text-sm font-medium">Price</span>
                      <span className="font-bold">
                        {new Intl.NumberFormat("en-IN", {
                          style: "currency",
                          currency: "AFN",
                        }).format(parseFloat(price) || 0)}
                      </span>
                    </div>
                  )}
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
            disabled={
              submitting ||
              !selectedPatient ||
              !selectedModalityType ||
              !selectedBodyPart ||
              !price
            }
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Direct Radiology Exam"
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
                <Label htmlFor="patientPhone">Phone</Label>
                <Input
                  id="patientPhone"
                  type="tel"
                  value={newPatient.phone}
                  onChange={(e) =>
                    setNewPatient({ ...newPatient, phone: e.target.value })
                  }
                  placeholder="Enter phone number"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="patientGuardian">Guardian</Label>
                <Input
                  id="patientGuardian"
                  type="text"
                  value={newPatient.guardian}
                  onChange={(e) =>
                    setNewPatient({ ...newPatient, guardian: e.target.value })
                  }
                  placeholder="Enter guardian name"
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
