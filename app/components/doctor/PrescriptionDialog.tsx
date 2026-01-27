// app/components/doctor/PrescriptionDialog.tsx - UPDATED

"use client";

import { useState } from "react";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Plus, Pill, Trash2, Copy, RefreshCw } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { SmartMedicineSearch } from "./SmartMedicineSearch";

// Define validation schema with Zod
const prescriptionSchema = z.object({
  diagnosis: z.string().min(1, "Diagnosis is required"),
  notes: z.string().optional(),
  
  medications: z.array(z.object({
    name: z.string().min(1, "Medication name is required"),
    dosage: z.string().min(1, "Dosage is required"),
    frequency: z.string().min(1, "Frequency is required"),
    duration: z.string().min(1, "Duration is required"),
    instructions: z.string().optional(),
    quantity: z.string().optional(),
    route: z.string().optional(),
    medicine: z.string().optional(), // Add medicine ID field for API validation
  })).min(1, "At least one medication is required"),
  
  // Patient Instructions
  patientInstructions: z.string().optional(),
  followUpDate: z.string().optional(),
  validityDays: z.string().regex(/^\d+$/, "Must be a number").optional(),
});

type PrescriptionFormValues = z.infer<typeof prescriptionSchema>;

interface PrescriptionDialogProps {
  patientId: string;
  patientName: string;
  appointmentId?: string;
  onPrescriptionCreated?: () => void;
  trigger?: React.ReactNode;
  editData?: {
    _id: string;
    diagnosis: string;
    medications: any[];
    notes?: string;
  };
}

const COMMON_DIAGNOSES = [
  { name: "Upper Respiratory Infection", icd10: "J06.9" },
  { name: "Hypertension", icd10: "I10" },
  { name: "Type 2 Diabetes", icd10: "E11.9" },
  { name: "Acute Gastroenteritis", icd10: "A09" },
  { name: "Migraine", icd10: "G43.909" },
];

const COMMON_MEDICATIONS = [
  { name: "Amoxicillin 500mg", category: "Antibiotic", form: "Tablet" },
  { name: "Paracetamol 500mg", category: "Analgesic", form: "Tablet" },
  { name: "Ibuprofen 400mg", category: "NSAID", form: "Tablet" },
  { name: "Cetirizine 10mg", category: "Antihistamine", form: "Tablet" },
  { name: "Omeprazole 20mg", category: "PPI", form: "Capsule" },
  { name: "Atorvastatin 20mg", category: "Statin", form: "Tablet" },
  { name: "Metformin 500mg", category: "Antidiabetic", form: "Tablet" },
  { name: "Losartan 50mg", category: "ARB", form: "Tablet" },
  { name: "Salbutamol Inhaler", category: "Bronchodilator", form: "Inhaler" },
  { name: "Fluoxetine 20mg", category: "Antidepressant", form: "Capsule" },
];

const DOSAGE_OPTIONS = [
  "500mg", "250mg", "100mg", "50mg", "20mg", "10mg", "5mg", "1mg",
  "5ml", "10ml", "15ml", "20ml",
  "1 tablet", "2 tablets", "1 capsule", "2 capsules",
  "1 puff", "2 puffs", "5mg/ml", "10mg/ml"
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
  "At bedtime"
];

const DURATION_OPTIONS = [
  "1 day", "3 days", "5 days", "7 days", "10 days", "14 days",
  "21 days", "30 days", "60 days", "90 days",
  "Until finished", "As directed"
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
      medications: [
        {
          name: "",
          dosage: "",
          frequency: "",
          duration: "",
          instructions: "",
          quantity: "",
          route: "oral", // FIXED: Change from "Oral" to "oral" (lowercase)
        }
      ],
      patientInstructions: "",
      followUpDate: "",
      validityDays: "7",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "medications",
  });

  const handleSelectDiagnosis = (diagnosis: typeof COMMON_DIAGNOSES[0]) => {
    setValue("diagnosis", diagnosis.name);
  };

  const handleSelectMedication = (medication: typeof COMMON_MEDICATIONS[0], index: number) => {
    setValue(`medications.${index}.name`, medication.name);
  };

  const addNewMedication = () => {
    append({
      name: "",
      dosage: "",
      frequency: "",
      duration: "",
      instructions: "",
      quantity: "",
      route: "oral", // FIXED: Change from "Oral" to "oral" (lowercase)
    });
  };

  const duplicateMedication = (index: number) => {
    const medication = watch(`medications.${index}`);
    append({
      ...medication,
      name: `${medication.name} (Copy)`,
    });
  };

  const onSubmit = async (data: PrescriptionFormValues) => {
    try {
      setLoading(true);

      // Convert route to lowercase for mongoose enum validation
      const medications = data.medications.map(med => ({
        name: med.name,
        dosage: med.dosage,
        frequency: med.frequency,
        duration: med.duration,
        instructions: med.instructions || "",
        quantity: med.quantity ? parseInt(med.quantity) : 1,
        route: (med.route || "oral").toLowerCase(), // Convert to lowercase
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

      console.log("Sending prescription data:", requestData);

      const response = await fetch(`/api/doctor/patients/${patientId}/prescriptions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(requestData),
      });

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
        
        if (onPrescriptionCreated) {
          onPrescriptionCreated();
        }
      }
    } catch (error: any) {
      console.error("Error saving prescription:", error);
      toast.error("Failed to Save Prescription", {
        description: error.message || "An error occurred while saving the prescription",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      reset();
    }
    setOpen(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" variant="outline">
            <Pill className="h-4 w-4 mr-2" />
            {editData ? "Edit Prescription" : "New Prescription"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-[90vw] lg:max-w-[90%] max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader className="pb-4">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Pill className="h-5 w-5" />
            {editData ? "Edit Prescription" : "New Prescription"}
          </DialogTitle>
          <DialogDescription>
            {editData ? "Update prescription for" : "Create prescription for"} 
            <span className="font-medium ml-1">{patientName}</span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Quick Select Common Diagnoses */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Quick Select Common Diagnoses</Label>
              <span className="text-xs text-muted-foreground">ICD-10 codes included</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {COMMON_DIAGNOSES.map((diagnosis, index) => (
                <Button
                  key={index}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleSelectDiagnosis(diagnosis)}
                  className="justify-start h-auto py-2 hover:border-primary hover:bg-primary/5 transition-colors"
                >
                  <div className="text-left">
                    <p className="text-xs font-medium truncate">{diagnosis.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {diagnosis.icd10}
                    </p>
                  </div>
                </Button>
              ))}
            </div>
          </div>

          {/* Main 3-Column Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Column 1: Diagnosis & Notes */}
            <div className="space-y-4">
              {/* Diagnosis */}
              <div className="space-y-2">
                <Label htmlFor="diagnosis" className="text-sm font-medium">
                  Diagnosis *
                </Label>
                <Input
                  id="diagnosis"
                  {...register("diagnosis")}
                  placeholder="Enter diagnosis"
                  className={errors.diagnosis ? "border-red-500" : ""}
                />
                {errors.diagnosis && (
                  <p className="text-xs text-red-500">{errors.diagnosis.message}</p>
                )}
              </div>

              {/* Clinical Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes" className="text-sm font-medium">
                  Clinical Notes
                </Label>
                <Textarea
                  id="notes"
                  {...register("notes")}
                  placeholder="Additional clinical notes..."
                  rows={6}
                  className="resize-none"
                />
              </div>

              {/* Prescription Validity */}
              <div className="space-y-2">
                <Label htmlFor="validityDays" className="text-sm font-medium">
                  Prescription Validity
                </Label>
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
              </div>

              {/* Follow-up Date */}
              <div className="space-y-2">
                <Label htmlFor="followUpDate" className="text-sm font-medium">
                  Follow-up Date
                </Label>
                <Input
                  id="followUpDate"
                  {...register("followUpDate")}
                  type="date"
                  className="w-full"
                />
              </div>
            </div>

            {/* Column 2: Medications List */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Medications</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addNewMedication}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Medication
                </Button>
              </div>

              {/* Quick Medications */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">
                  Quick Select Medications
                </Label>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  {COMMON_MEDICATIONS.map((medication, index) => (
                    <Button
                      key={index}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleSelectMedication(medication, 0)}
                      className="justify-start h-auto py-1.5 hover:border-primary hover:bg-primary/5 transition-colors"
                    >
                      <div className="text-left">
                        <p className="text-xs font-medium truncate">{medication.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {medication.category}
                        </p>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Smart Medicine Search */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Smart Medicine Search</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Refresh the search results
                      console.log("Refreshing medicine search");
                    }}
                    title="Refresh"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Refresh
                  </Button>
                </div>
                
                <SmartMedicineSearch
                  onSelectMedicine={(medicine) => {
                    // Add the selected medicine to the form with proper medicine ID
                    append({
                      name: medicine.name,
                      dosage: medicine.sellingPrice.toString(), // Use selling price as default dosage
                      frequency: "Twice daily", // Default frequency
                      duration: "7 days", // Default duration
                      instructions: `Take as prescribed. Price: $${medicine.sellingPrice.toFixed(2)}`,
                      quantity: "1", // Default quantity
                      route: "oral",
                      medicine: medicine._id, // Add the medicine ID for API validation
                    });
                  }}
                  selectedMedicines={[]}
                  placeholder="Search medicines from pharmacy inventory..."
                />
              </div>

              {/* Medications Forms */}
              <div className="space-y-4">
                {fields.map((field, index) => (
                  <Card key={field.id} className="relative">
                    <CardContent className="pt-6">
                      <div className="absolute top-2 right-2 flex gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => duplicateMedication(index)}
                          title="Duplicate"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        {fields.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => remove(index)}
                            title="Remove"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Medication Name */}
                        <div className="space-y-2">
                          <Label htmlFor={`medications.${index}.name`} className="text-sm">
                            Medication Name *
                          </Label>
                          <Input
                            id={`medications.${index}.name`}
                            {...register(`medications.${index}.name` as const)}
                            placeholder="e.g., Amoxicillin 500mg"
                            className={errors.medications?.[index]?.name ? "border-red-500" : ""}
                          />
                        </div>

                        {/* Dosage */}
                        <div className="space-y-2">
                          <Label htmlFor={`medications.${index}.dosage`} className="text-sm">
                            Dosage *
                          </Label>
                          <Select
                            onValueChange={(value) => setValue(`medications.${index}.dosage`, value)}
                            value={watch(`medications.${index}.dosage`)}
                          >
                            <SelectTrigger className={errors.medications?.[index]?.dosage ? "border-red-500" : ""}>
                              <SelectValue placeholder="Select dosage" />
                            </SelectTrigger>
                            <SelectContent>
                              {DOSAGE_OPTIONS.map((dosage, idx) => (
                                <SelectItem key={idx} value={dosage}>
                                  {dosage}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Frequency */}
                        <div className="space-y-2">
                          <Label htmlFor={`medications.${index}.frequency`} className="text-sm">
                            Frequency *
                          </Label>
                          <Select
                            onValueChange={(value) => setValue(`medications.${index}.frequency`, value)}
                            value={watch(`medications.${index}.frequency`)}
                          >
                            <SelectTrigger className={errors.medications?.[index]?.frequency ? "border-red-500" : ""}>
                              <SelectValue placeholder="Select frequency" />
                            </SelectTrigger>
                            <SelectContent>
                              {FREQUENCY_OPTIONS.map((frequency, idx) => (
                                <SelectItem key={idx} value={frequency}>
                                {frequency}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Duration */}
                        <div className="space-y-2">
                          <Label htmlFor={`medications.${index}.duration`} className="text-sm">
                            Duration *
                          </Label>
                          <Select
                            onValueChange={(value) => setValue(`medications.${index}.duration`, value)}
                            value={watch(`medications.${index}.duration`)}
                          >
                            <SelectTrigger className={errors.medications?.[index]?.duration ? "border-red-500" : ""}>
                              <SelectValue placeholder="Select duration" />
                            </SelectTrigger>
                            <SelectContent>
                              {DURATION_OPTIONS.map((duration, idx) => (
                                <SelectItem key={idx} value={duration}>
                                  {duration}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Route */}
                        <div className="space-y-2">
                          <Label htmlFor={`medications.${index}.route`} className="text-sm">
                            Route
                          </Label>
                          <Select
                            onValueChange={(value) => setValue(`medications.${index}.route`, value)}
                            value={watch(`medications.${index}.route`) || "oral"} // FIXED: Change from "Oral" to "oral"
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select route" />
                            </SelectTrigger>
                            <SelectContent>
                              {ROUTE_OPTIONS.map((route, idx) => (
                                <SelectItem key={idx} value={route.value}>
                                  {route.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Quantity */}
                        <div className="space-y-2">
                          <Label htmlFor={`medications.${index}.quantity`} className="text-sm">
                            Quantity
                          </Label>
                          <Input
                            id={`medications.${index}.quantity`}
                            {...register(`medications.${index}.quantity` as const)}
                            placeholder="e.g., 30 tablets, 1 bottle"
                          />
                        </div>
                      </div>

                      {/* Instructions */}
                      <div className="mt-4 space-y-2">
                        <Label htmlFor={`medications.${index}.instructions`} className="text-sm">
                          Special Instructions
                        </Label>
                        <Textarea
                          id={`medications.${index}.instructions`}
                          {...register(`medications.${index}.instructions` as const)}
                          placeholder="e.g., Take with food, Avoid alcohol, etc."
                          rows={2}
                          className="resize-none"
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Patient Instructions */}
              <div className="space-y-2">
                <Label htmlFor="patientInstructions" className="text-sm font-medium">
                  Patient Instructions
                </Label>
                <Textarea
                  id="patientInstructions"
                  {...register("patientInstructions")}
                  placeholder="General instructions for the patient..."
                  rows={4}
                  className="resize-none"
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <DialogFooter className="pt-4 border-t">
            <div className="flex items-center justify-between w-full">
              <div className="text-sm text-muted-foreground">
                Required fields are marked with *
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
                  disabled={loading}
                  className="min-w-30"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {editData ? "Updating..." : "Creating..."}
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      {editData ? "Update Prescription" : "Create Prescription"}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}