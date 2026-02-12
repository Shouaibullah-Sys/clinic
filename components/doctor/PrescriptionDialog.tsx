// app/components/doctor/PrescriptionDialog.tsx

"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Loader2,
  Plus,
  Pill,
  Trash2,
  Search,
  X,
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

// Define validation schema with Zod
const prescriptionSchema = z.object({
  diagnosis: z.string().optional(),
  notes: z.string().optional(),
  medications: z
    .array(
      z.object({
        name: z.string().min(1, "Medication name is required"),
        form: z.string().min(1, "Form is required"),
        dosage: z.string().min(1, "Dosage is required"),
        frequency: z.string().min(1, "Frequency is required"),
        duration: z.string().min(1, "Duration is required"),
        instructions: z.string().optional(),
        quantity: z.string().optional(),
        route: z.string().optional(),
        medicineId: z.string().optional(),
      }),
    )
    .min(1, "At least one medication is required"),
  patientInstructions: z.string().optional(),
  followUpDate: z.string().optional(),
  validityDays: z.string().regex(/^\d+$/, "Must be a number").optional(),
});

type PrescriptionFormValues = z.infer<typeof prescriptionSchema>;

interface Medicine {
  _id: string;
  name: string;
  form: string;
  dosage: string;
  frequency: string;
  route: string;
  currentQuantity: number;
  originalQuantity: number;
  unitPrice: number;
  sellingPrice: number;
  expiryDate: string;
  supplier: string;
  description?: string;
  remainingPercentage?: number;
  isLowStock?: boolean;
  isExpiringSoon?: boolean;
  status?: string;
  daysToExpiry?: number;
}

interface PrescriptionDialogProps {
  patientId: string;
  patientName: string;
  appointmentId?: string;
  onPrescriptionCreated?: () => void;
  trigger?: React.ReactNode;
  editData?: {
    _id: string;
    medications: any[];
    notes?: string;
  };
}

const DOSAGE_OPTIONS = [
  "500mg",
  "250mg",
  "100mg",
  "50mg",
  "20mg",
  "10mg",
  "5mg",
  "1mg",
  "5ml",
  "10ml",
  "15ml",
  "20ml",
  "1 tablet",
  "2 tablets",
  "1 capsule",
  "2 capsules",
  "1 puff",
  "2 puffs",
  "5mg/ml",
  "10mg/ml",
];

const FREQUENCY_OPTIONS = [
  "Once daily",
  "Twice daily",
  "Three times daily",
  "Four times daily",
  "Every 6 hours",
  "Every 8 hours",
  "Every 12 hours",
  "Once weekly",
  "As needed",
  "Before meals",
  "After meals",
  "At bedtime",
];

const DURATION_OPTIONS = [
  "1 day",
  "3 days",
  "5 days",
  "7 days",
  "10 days",
  "14 days",
  "21 days",
  "30 days",
  "60 days",
  "90 days",
  "Until finished",
  "As directed",
];

const ROUTE_OPTIONS = [
  { value: "oral", label: "Oral" },
  { value: "topical", label: "Topical" },
  { value: "inhalation", label: "Inhalation" },
  { value: "injection", label: "Injection" },
  { value: "rectal", label: "Rectal" },
  { value: "vaginal", label: "Vaginal" },
  { value: "ophthalmic", label: "Ophthalmic" },
  { value: "otic", label: "Otic" },
  { value: "nasal", label: "Nasal" },
  { value: "transdermal", label: "Transdermal" },
];

const FORM_OPTIONS = [
  { value: "tablet", label: "Tablet" },
  { value: "capsule", label: "Capsule" },
  { value: "syrup", label: "Syrup" },
  { value: "suspension", label: "Suspension" },
  { value: "injection", label: "Injection" },
  { value: "cream", label: "Cream" },
  { value: "ointment", label: "Ointment" },
  { value: "gel", label: "Gel" },
  { value: "drops", label: "Drops" },
  { value: "inhaler", label: "Inhaler" },
  { value: "patch", label: "Patch" },
  { value: "suppository", label: "Suppository" },
];

export function PrescriptionDialog({
  patientId,
  patientName,
  appointmentId,
  onPrescriptionCreated,
  trigger,
  editData,
}: PrescriptionDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchingMedicines, setSearchingMedicines] = useState(false);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showMedicineTable, setShowMedicineTable] = useState(false);
  const { accessToken } = useAuthStore();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    control,
    formState: { errors },
  } = useForm<PrescriptionFormValues>({
    resolver: zodResolver(prescriptionSchema),
    defaultValues: {
      diagnosis: "",
      notes: "",
      medications: [],
      patientInstructions: "",
      followUpDate: "",
      validityDays: "7",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "medications",
  });

  const selectedMedications = watch("medications") || [];

  // Search medicines
  const searchMedicines = useCallback(
    async (query: string) => {
      if (query.length < 2) {
        setMedicines([]);
        setShowMedicineTable(false);
        return;
      }

      setSearchingMedicines(true);
      try {
        const response = await fetch(
          `/api/pharmacy/medicines/search?q=${encodeURIComponent(query)}&limit=10`,
          {
            headers: {
              "Content-Type": "application/json",
              ...(accessToken
                ? { Authorization: `Bearer ${accessToken}` }
                : {}),
            },
          },
        );

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            setMedicines(result.data);
            setShowMedicineTable(true);
          }
        }
      } catch (error) {
        console.error("Error searching medicines:", error);
        toast.error("Failed to search medicines");
      } finally {
        setSearchingMedicines(false);
      }
    },
    [accessToken],
  );

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery) {
        searchMedicines(searchQuery);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, searchMedicines]);

  const addNewMedication = () => {
    append({
      name: "",
      form: "",
      dosage: "",
      frequency: "",
      duration: "",
      instructions: "",
      quantity: "",
      route: "oral",
      medicineId: "",
    });
  };

  // Helper function to extract dosage from medicine name
  const extractDosageFromName = (name: string): string => {
    // Try to match common dosage patterns in the medicine name
    const dosagePatterns = [
      /(\d+(?:\.\d+)?)\s*(mg|ml|g|mcg|µg|IU|units?)/i,
      /(\d+(?:\.\d+)?)\s*(tablet|capsule|puff|drop|scoop|teaspoon|tablespoon)s?/i,
    ];

    for (const pattern of dosagePatterns) {
      const match = name.match(pattern);
      if (match) {
        return match[0];
      }
    }

    // Return empty string if no dosage found
    return "";
  };

  const handleSelectMedicine = (medicine: Medicine) => {
    // Check if medicine is already selected
    const isAlreadySelected = selectedMedications.some(
      (med) => med.medicineId === medicine._id,
    );

    if (isAlreadySelected) {
      toast.warning("This medicine is already in the prescription");
      return;
    }

    // Normalize form to lowercase for matching FORM_OPTIONS
    const normalizedForm = (medicine.form || "").toLowerCase().trim();

    // Normalize dosage to lowercase for matching DOSAGE_OPTIONS
    const normalizedDosage = (medicine.dosage || "").toLowerCase().trim();

    // Normalize frequency to lowercase for matching FREQUENCY_OPTIONS
    const normalizedFrequency = (medicine.frequency || "").toLowerCase().trim();

    // Add new medication row with auto-filled values from medicine
    const newMedication = {
      name: medicine.name,
      form: normalizedForm,
      dosage: normalizedDosage,
      frequency: normalizedFrequency || "twice daily",
      duration: "7 days",
      instructions: `Take as prescribed`,
      quantity: "1",
      route: (medicine.route || "oral").toLowerCase().trim(),
      medicineId: medicine._id,
    };

    // Append the new medication
    append(newMedication);

    // Clear search and hide table
    setSearchQuery("");
    setMedicines([]);
    setShowMedicineTable(false);
    toast.success(`${medicine.name} added to prescription`);
  };

  const removeEmptyMedications = () => {
    const currentMedications = watch("medications");
    const nonEmptyMedications = currentMedications.filter(
      (med) => med.name.trim() !== "" && med.dosage.trim() !== "",
    );

    // Reset the field array with non-empty medications
    if (nonEmptyMedications.length !== currentMedications.length) {
      // Clear all and re-add non-empty ones
      while (fields.length > 0) {
        remove(0);
      }
      nonEmptyMedications.forEach((med) => append(med));
      toast.info("Removed empty medication rows");
    }
  };

  const onSubmit = async (data: PrescriptionFormValues) => {
    try {
      setLoading(true);

      // First remove empty medications
      removeEmptyMedications();

      // Ensure we have medications
      if (data.medications.length === 0) {
        toast.error("Please add at least one medication");
        setLoading(false);
        return;
      }

      const medications = data.medications.map((med) => ({
        name: med.name,
        form: med.form,
        dosage: med.dosage,
        frequency: med.frequency,
        duration: med.duration,
        instructions: med.instructions || "",
        quantity: med.quantity ? parseInt(med.quantity) : 1,
        route: (med.route || "oral").toLowerCase(),
        medicineId: med.medicineId,
        refills: 0,
        refillsRemaining: 0,
      }));

      const requestData = {
        diagnosis: data.diagnosis,
        medications: medications,
        notes: data.notes || "",
        patientInstructions: data.patientInstructions || "",
        followUpDate: data.followUpDate || undefined,
        validityDays: data.validityDays || "7",
        appointmentId,
      };

      const response = await fetch(
        `/api/doctor/patients/${patientId}/prescriptions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(requestData),
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to save prescription");
      }

      if (result.success) {
        toast.success("Prescription Created", {
          description: `Prescription has been created successfully for ${patientName}`,
        });

        reset();
        setOpen(false);
        setMedicines([]);
        setSearchQuery("");
        setShowMedicineTable(false);

        if (onPrescriptionCreated) {
          onPrescriptionCreated();
        }
      }
    } catch (error: any) {
      console.error("Error saving prescription:", error);
      toast.error("Failed to Save Prescription", {
        description:
          error.message || "An error occurred while saving the prescription",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      reset();
      setMedicines([]);
      setSearchQuery("");
      setShowMedicineTable(false);
    }
    setOpen(isOpen);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString();
  };

  const getStockStatus = (stock: number) => {
    if (stock === 0)
      return { text: "Out of Stock", variant: "destructive" as const };
    if (stock <= 10)
      return { text: "Low Stock", variant: "destructive" as const };
    if (stock <= 50) return { text: "Limited", variant: "warning" as const };
    return { text: "In Stock", variant: "default" as const };
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" variant="default">
            <Pill className="h-4 w-4 mr-2" />
            {editData ? "Edit Prescription" : "New Prescription"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-[90vw] lg:max-w-400 max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <Pill className="h-5 w-5" />
                {editData ? "Edit Prescription" : "New Prescription"}
              </DialogTitle>
              <DialogDescription className="mt-1">
                {editData
                  ? "Update prescription for"
                  : "Create prescription for"}
                <span className="font-medium ml-1">{patientName}</span>
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1">
                <Clock className="h-3 w-3" />
                Validity: {watch("validityDays") || 7} days
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Prescription Info */}
            <div className="space-y-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    {/* Diagnosis */}
                    <div className="space-y-2">
                      <Label htmlFor="diagnosis" className="font-medium">
                        Diagnosis
                      </Label>
                      <Textarea
                        id="diagnosis"
                        {...register("diagnosis")}
                        placeholder="Enter the diagnosis for this prescription..."
                        rows={2}
                        className="resize-none"
                      />
                      {errors.diagnosis && (
                        <p className="text-xs text-destructive">
                          {errors.diagnosis.message}
                        </p>
                      )}
                    </div>

                    {/* Clinical Notes */}
                    <div className="space-y-2">
                      <Label htmlFor="notes" className="font-medium">
                        Clinical Notes
                      </Label>
                      <Textarea
                        id="notes"
                        {...register("notes")}
                        placeholder="Observations, treatment plan..."
                        rows={4}
                        className="resize-none"
                      />
                    </div>

                    {/* Patient Instructions */}
                    <div className="space-y-2">
                      <Label
                        htmlFor="patientInstructions"
                        className="font-medium"
                      >
                        Patient Instructions
                      </Label>
                      <Textarea
                        id="patientInstructions"
                        {...register("patientInstructions")}
                        placeholder="General instructions for the patient..."
                        rows={3}
                        className="resize-none"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Prescription Settings */}
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="validityDays" className="font-medium">
                        Prescription Validity
                      </Label>
                      <Badge variant="secondary">
                        {watch("validityDays") || 7} days
                      </Badge>
                    </div>
                    <div className="relative">
                      <Input
                        id="validityDays"
                        {...register("validityDays")}
                        type="number"
                        min="1"
                        max="90"
                        placeholder="7"
                        className="pr-16"
                      />
                      <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground text-sm">
                        days
                      </span>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <Label htmlFor="followUpDate" className="font-medium">
                        Follow-up Date
                      </Label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="followUpDate"
                          {...register("followUpDate")}
                          type="date"
                          className="pl-10"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Medications & Search */}
            <div className="lg:col-span-2 space-y-6">
              {/* Medicine Search Section */}
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">Search Medicines</h3>
                        <p className="text-sm text-muted-foreground">
                          Search pharmacy inventory to add medicines
                        </p>
                      </div>
                    </div>

                    {/* Search Input */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by medicine name, brand, or generic name..."
                        className="pl-10"
                      />
                      {searchingMedicines && (
                        <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-primary" />
                      )}
                      {searchQuery && !searchingMedicines && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSearchQuery("");
                            setShowMedicineTable(false);
                          }}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    {/* Medicines Table - Only shows when searching */}
                    {showMedicineTable && (
                      <div className="border rounded-lg overflow-hidden">
                        <div className="max-h-64 overflow-y-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Medicine Name</TableHead>
                                <TableHead>Form</TableHead>
                                <TableHead>Dosage</TableHead>
                                <TableHead>Frequency</TableHead>
                                <TableHead>Route</TableHead>
                                <TableHead>Stock</TableHead>
                                <TableHead className="w-25">Action</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {medicines.length > 0 ? (
                                medicines.map((medicine) => {
                                  const stockStatus = getStockStatus(
                                    medicine.currentQuantity,
                                  );
                                  return (
                                    <TableRow key={medicine._id}>
                                      <TableCell>
                                        <div className="font-medium">
                                          {medicine.name}
                                        </div>
                                        <div className="text-sm text-muted-foreground">
                                          {medicine.supplier}
                                        </div>
                                      </TableCell>
                                      <TableCell>{medicine.form}</TableCell>
                                      <TableCell>{medicine.dosage}</TableCell>
                                      <TableCell>
                                        {medicine.frequency}
                                      </TableCell>
                                      <TableCell>{medicine.route}</TableCell>
                                      <TableCell>
                                        <Badge
                                          variant={stockStatus.variant}
                                          className={cn(
                                            "gap-1",
                                            stockStatus.variant ===
                                              "destructive" &&
                                              "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400",
                                            stockStatus.variant === "warning" &&
                                              "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400",
                                          )}
                                        >
                                          {medicine.currentQuantity}
                                          <span className="text-xs">
                                            {stockStatus.text}
                                          </span>
                                        </Badge>
                                      </TableCell>
                                      <TableCell>
                                        <Button
                                          type="button"
                                          size="sm"
                                          onClick={() =>
                                            handleSelectMedicine(medicine)
                                          }
                                          disabled={
                                            medicine.currentQuantity === 0
                                          }
                                        >
                                          <Plus className="h-4 w-4 mr-1" />
                                          Add
                                        </Button>
                                      </TableCell>
                                    </TableRow>
                                  );
                                })
                              ) : (
                                <TableRow>
                                  <TableCell
                                    colSpan={4}
                                    className="text-center py-8"
                                  >
                                    <Search className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                                    <p className="font-medium mb-2">
                                      No medicines found
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                      Try a different search term
                                    </p>
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Prescription Medications Section */}
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">
                          Prescription Medications
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {selectedMedications.length} medications added
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            removeEmptyMedications();
                            addNewMedication();
                          }}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Empty Row
                        </Button>
                      </div>
                    </div>

                    {selectedMedications.length === 0 ? (
                      <div className="border-2 border-dashed rounded-lg p-8 text-center">
                        <Pill className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h4 className="font-medium mb-2">
                          No Medications Added
                        </h4>
                        <p className="text-sm text-muted-foreground mb-4">
                          Search for medicines above or add an empty row to
                          start
                        </p>
                        <Button
                          type="button"
                          onClick={() => {
                            removeEmptyMedications();
                            addNewMedication();
                          }}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Empty Row
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Medications Table */}
                        <div className="border rounded-lg overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-40">
                                  Medication
                                </TableHead>
                                <TableHead>Form</TableHead>
                                <TableHead>Dosage</TableHead>
                                <TableHead>Frequency</TableHead>
                                <TableHead>Duration</TableHead>
                                <TableHead>Instructions</TableHead>
                                <TableHead className="w-20"></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {fields.map((field, index) => (
                                <TableRow key={field.id}>
                                  <TableCell>
                                    <Input
                                      {...register(
                                        `medications.${index}.name` as const,
                                      )}
                                      placeholder="Medication name"
                                      className="border-none focus:ring-0 p-0 h-8"
                                    />
                                    {errors.medications?.[index]?.name && (
                                      <p className="text-xs text-destructive mt-1">
                                        {
                                          errors.medications[index]?.name
                                            ?.message
                                        }
                                      </p>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <Select
                                      onValueChange={(value) =>
                                        setValue(
                                          `medications.${index}.form`,
                                          value,
                                        )
                                      }
                                      value={watch(`medications.${index}.form`)}
                                    >
                                      <SelectTrigger className="border-none focus:ring-0 p-0 h-8">
                                        <SelectValue placeholder="Select" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {FORM_OPTIONS.map((form, idx) => (
                                          <SelectItem
                                            key={idx}
                                            value={form.value}
                                          >
                                            {form.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    {errors.medications?.[index]?.form && (
                                      <p className="text-xs text-destructive mt-1">
                                        {
                                          errors.medications[index]?.form
                                            ?.message
                                        }
                                      </p>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <Select
                                      onValueChange={(value) =>
                                        setValue(
                                          `medications.${index}.dosage`,
                                          value,
                                        )
                                      }
                                      value={watch(
                                        `medications.${index}.dosage`,
                                      )}
                                    >
                                      <SelectTrigger className="border-none focus:ring-0 p-0 h-8">
                                        <SelectValue placeholder="Select" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {DOSAGE_OPTIONS.map((dosage, idx) => (
                                          <SelectItem key={idx} value={dosage}>
                                            {dosage}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    {errors.medications?.[index]?.dosage && (
                                      <p className="text-xs text-destructive mt-1">
                                        {
                                          errors.medications[index]?.dosage
                                            ?.message
                                        }
                                      </p>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <Select
                                      onValueChange={(value) =>
                                        setValue(
                                          `medications.${index}.frequency`,
                                          value,
                                        )
                                      }
                                      value={watch(
                                        `medications.${index}.frequency`,
                                      )}
                                    >
                                      <SelectTrigger className="border-none focus:ring-0 p-0 h-8">
                                        <SelectValue placeholder="Select" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {FREQUENCY_OPTIONS.map(
                                          (frequency, idx) => (
                                            <SelectItem
                                              key={idx}
                                              value={frequency}
                                            >
                                              {frequency}
                                            </SelectItem>
                                          ),
                                        )}
                                      </SelectContent>
                                    </Select>
                                    {errors.medications?.[index]?.frequency && (
                                      <p className="text-xs text-destructive mt-1">
                                        {
                                          errors.medications[index]?.frequency
                                            ?.message
                                        }
                                      </p>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <Select
                                      onValueChange={(value) =>
                                        setValue(
                                          `medications.${index}.duration`,
                                          value,
                                        )
                                      }
                                      value={watch(
                                        `medications.${index}.duration`,
                                      )}
                                    >
                                      <SelectTrigger className="border-none focus:ring-0 p-0 h-8">
                                        <SelectValue placeholder="Select" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {DURATION_OPTIONS.map(
                                          (duration, idx) => (
                                            <SelectItem
                                              key={idx}
                                              value={duration}
                                            >
                                              {duration}
                                            </SelectItem>
                                          ),
                                        )}
                                      </SelectContent>
                                    </Select>
                                    {errors.medications?.[index]?.duration && (
                                      <p className="text-xs text-destructive mt-1">
                                        {
                                          errors.medications[index]?.duration
                                            ?.message
                                        }
                                      </p>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <Input
                                      {...register(
                                        `medications.${index}.instructions` as const,
                                      )}
                                      placeholder="Special instructions"
                                      className="border-none focus:ring-0 p-0 h-8"
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => remove(index)}
                                      className="h-8 w-8 p-0"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>

                        {/* Quick Actions */}
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-muted-foreground">
                            Empty rows are automatically removed on save
                          </div>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={removeEmptyMedications}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Clean Empty Rows
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                removeEmptyMedications();
                                addNewMedication();
                              }}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Add Another
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Dialog Footer */}
          <div className="flex items-center justify-between pt-6 border-t">
            <div className="text-sm text-muted-foreground">
              {selectedMedications.length > 0 ? (
                <>
                  {selectedMedications.length} medication
                  {selectedMedications.length !== 1 ? "s" : ""} added •
                  Validity: {watch("validityDays") || 7} days
                </>
              ) : (
                "Add at least one medication to continue"
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading || selectedMedications.length === 0}
                className="min-w-32"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Create Prescription
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
