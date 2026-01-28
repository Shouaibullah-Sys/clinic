// app/components/doctor/MedicalRecordDialog.tsx

"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
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
import { Loader2, Plus, Stethoscope, Thermometer, Weight, Ruler, Heart, Activity } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { Badge } from "@/components/ui/badge";

// Define validation schema with Zod
const medicalRecordSchema = z.object({
  diagnosis: z.string().min(1, "Diagnosis is required"),
  symptoms: z.string().min(1, "Please enter at least one symptom"),
  notes: z.string().optional(),
  
  // Vitals
  bloodPressureSystolic: z.string()
    .regex(/^\d+$/, "Must be a number")
    .optional(),
  bloodPressureDiastolic: z.string()
    .regex(/^\d+$/, "Must be a number")
    .optional(),
  heartRate: z.string()
    .regex(/^\d+$/, "Must be a number")
    .optional(),
  temperature: z.string()
    .regex(/^\d+(\.\d{1,1})?$/, "Enter a valid temperature")
    .optional(),
  weight: z.string()
    .regex(/^\d+(\.\d{1,1})?$/, "Enter a valid weight")
    .optional(),
  height: z.string()
    .regex(/^\d+(\.\d{1,1})?$/, "Enter a valid height")
    .optional(),
  
  // Examination
  examinationNotes: z.string().optional(),
  treatmentPlan: z.string().optional(),
  followUpDate: z.string().optional(),
  
  // Patient Instructions
  patientInstructions: z.string().optional(),
});

type MedicalRecordFormValues = z.infer<typeof medicalRecordSchema>;

interface MedicalRecordDialogProps {
  patientId: string;
  patientName: string;
  appointmentId?: string;
  onRecordCreated?: () => void;
  trigger?: React.ReactNode;
  editData?: {
    _id: string;
    diagnosis: string;
    symptoms: string[];
    notes?: string;
    vitals?: {
      bloodPressure: string;
      heartRate: number;
      temperature: number;
      weight: number;
      height: number;
      bmi: number;
    };
  };
}

const COMMON_DIAGNOSES = [
  { name: "Upper Respiratory Infection", icd10: "J06.9" },
  { name: "Hypertension", icd10: "I10" },
  { name: "Type 2 Diabetes", icd10: "E11.9" },
  { name: "Acute Gastroenteritis", icd10: "A09" },
  { name: "Migraine", icd10: "G43.909" },
  { name: "Anxiety Disorder", icd10: "F41.9" },
  { name: "Osteoarthritis", icd10: "M19.90" },
  { name: "Asthma", icd10: "J45.909" },
  { name: "Urinary Tract Infection", icd10: "N39.0" },
  { name: "Acute Bronchitis", icd10: "J20.9" },
];

const COMMON_SYMPTOMS = [
  "Fever", "Cough", "Headache", "Fatigue", "Nausea",
  "Shortness of breath", "Chest pain", "Dizziness",
  "Joint pain", "Abdominal pain", "Back pain", "Sore throat",
  "Runny nose", "Diarrhea", "Vomiting", "Rash",
];

export function MedicalRecordDialog({
  patientId,
  patientName,
  appointmentId,
  onRecordCreated,
  trigger,
  editData,
}: MedicalRecordDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user, accessToken } = useAuthStore();
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [customSymptom, setCustomSymptom] = useState("");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<MedicalRecordFormValues>({
    resolver: zodResolver(medicalRecordSchema),
    defaultValues: {
      diagnosis: "",
      symptoms: "",
      notes: "",
      bloodPressureSystolic: "",
      bloodPressureDiastolic: "",
      heartRate: "",
      temperature: "",
      weight: "",
      height: "",
      examinationNotes: "",
      treatmentPlan: "",
      followUpDate: "",
      patientInstructions: "",
    },
  });

  // Initialize with edit data if provided
  useEffect(() => {
    if (editData && open) {
      setValue("diagnosis", editData.diagnosis);
      setValue("notes", editData.notes || "");
      
      if (editData.symptoms) {
        setSelectedSymptoms(editData.symptoms);
        setValue("symptoms", editData.symptoms.join(", "));
      }
      
      if (editData.vitals) {
        const [systolic, diastolic] = editData.vitals.bloodPressure.split("/");
        setValue("bloodPressureSystolic", systolic);
        setValue("bloodPressureDiastolic", diastolic);
        setValue("heartRate", editData.vitals.heartRate.toString());
        setValue("temperature", editData.vitals.temperature.toString());
        setValue("weight", editData.vitals.weight.toString());
        setValue("height", editData.vitals.height.toString());
      }
    }
  }, [editData, open, setValue]);

  const handleSelectSymptom = (symptom: string) => {
    if (!selectedSymptoms.includes(symptom)) {
      const newSymptoms = [...selectedSymptoms, symptom];
      setSelectedSymptoms(newSymptoms);
      setValue("symptoms", newSymptoms.join(", "));
    }
  };

  const handleRemoveSymptom = (symptom: string) => {
    const newSymptoms = selectedSymptoms.filter(s => s !== symptom);
    setSelectedSymptoms(newSymptoms);
    setValue("symptoms", newSymptoms.join(", "));
  };

  const handleAddCustomSymptom = () => {
    if (customSymptom.trim() && !selectedSymptoms.includes(customSymptom.trim())) {
      const newSymptoms = [...selectedSymptoms, customSymptom.trim()];
      setSelectedSymptoms(newSymptoms);
      setValue("symptoms", newSymptoms.join(", "));
      setCustomSymptom("");
    }
  };

  const handleSelectDiagnosis = (diagnosis: typeof COMMON_DIAGNOSES[0]) => {
    setValue("diagnosis", diagnosis.name);
  };

  const calculateBMI = () => {
    const weight = parseFloat(watch("weight") || "0");
    const height = parseFloat(watch("height") || "0");
    
    if (weight > 0 && height > 0) {
      const heightInMeters = height / 100;
      const bmi = weight / (heightInMeters * heightInMeters);
      return bmi.toFixed(1);
    }
    return "0.0";
  };

  const getBMICategory = (bmi: number) => {
    if (bmi < 18.5) return { label: "Underweight", color: "bg-yellow-100 text-yellow-800" };
    if (bmi < 25) return { label: "Normal", color: "bg-green-100 text-green-800" };
    if (bmi < 30) return { label: "Overweight", color: "bg-orange-100 text-orange-800" };
    return { label: "Obese", color: "bg-red-100 text-red-800" };
  };

  const onSubmit = async (data: MedicalRecordFormValues) => {
    try {
      setLoading(true);

      const vitals = data.bloodPressureSystolic && data.bloodPressureDiastolic ? {
        bloodPressure: `${data.bloodPressureSystolic}/${data.bloodPressureDiastolic}`,
        heartRate: parseInt(data.heartRate || "0"),
        temperature: parseFloat(data.temperature || "0"),
        weight: parseFloat(data.weight || "0"),
        height: parseFloat(data.height || "0"),
        bmi: parseFloat(calculateBMI()),
      } : undefined;

      const requestData = {
        diagnosis: data.diagnosis,
        symptoms: data.symptoms.split(",").map(s => s.trim()),
        notes: data.notes,
        vitals,
        examinationNotes: data.examinationNotes,
        treatmentPlan: data.treatmentPlan,
        followUpDate: data.followUpDate || undefined,
        patientInstructions: data.patientInstructions,
        appointmentId,
      };

      const url = editData 
        ? `/api/doctor/medical-records/${editData._id}`
        : `/api/doctor/patients/${patientId}/medical-records`;

      const method = editData ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(requestData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to save medical record");
      }

      if (result.success) {
        toast.success(
          editData ? "Medical Record Updated" : "Medical Record Created",
          {
            description: `${data.diagnosis} record has been ${editData ? "updated" : "created"} successfully for ${patientName}`,
          }
        );
        
        reset();
        setSelectedSymptoms([]);
        setOpen(false);
        
        if (onRecordCreated) {
          onRecordCreated();
        }
      }
    } catch (error: any) {
      console.error("Error saving medical record:", error);
      toast.error("Failed to Save Record", {
        description: error.message || "An error occurred while saving the medical record",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      reset();
      setSelectedSymptoms([]);
      setCustomSymptom("");
    }
    setOpen(isOpen);
  };

  const bmi = parseFloat(calculateBMI());
  const bmiCategory = bmi > 0 ? getBMICategory(bmi) : null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" variant="outline">
            <Stethoscope className="h-4 w-4 mr-2" />
            {editData ? "Edit Record" : "New Record"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-[90vw] lg:max-w-[90%] max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader className="pb-4">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Stethoscope className="h-5 w-5" />
            {editData ? "Edit Medical Record" : "New Medical Record"}
          </DialogTitle>
          <DialogDescription>
            {editData ? "Update medical record for" : "Create medical record for"} 
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
            
            {/* Column 1: Diagnosis & Symptoms */}
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

              {/* Symptoms Selection */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Symptoms *
                </Label>
                <div className="space-y-3">
                  <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                    {COMMON_SYMPTOMS.map((symptom, index) => (
                      <Button
                        key={index}
                        type="button"
                        variant={selectedSymptoms.includes(symptom) ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleSelectSymptom(symptom)}
                        className="text-xs"
                      >
                        {symptom}
                      </Button>
                    ))}
                  </div>
                  
                  {/* Custom Symptom */}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add custom symptom"
                      value={customSymptom}
                      onChange={(e) => setCustomSymptom(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddCustomSymptom())}
                    />
                    <Button type="button" onClick={handleAddCustomSymptom} size="sm">
                      Add
                    </Button>
                  </div>
                  
                  {/* Selected Symptoms */}
                  {selectedSymptoms.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Selected Symptoms:</Label>
                      <div className="flex flex-wrap gap-2">
                        {selectedSymptoms.map((symptom, index) => (
                          <Badge key={index} variant="secondary" className="flex items-center gap-1">
                            {symptom}
                            <button
                              type="button"
                              onClick={() => handleRemoveSymptom(symptom)}
                              className="ml-1 hover:text-destructive"
                            >
                              ×
                            </button>
                          </Badge>
                        ))}
                      </div>
                      <Input
                        type="hidden"
                        {...register("symptoms")}
                        className={errors.symptoms ? "border-red-500" : ""}
                      />
                    </div>
                  )}
                </div>
                {errors.symptoms && (
                  <p className="text-xs text-red-500">{errors.symptoms.message}</p>
                )}
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes" className="text-sm font-medium">
                  Clinical Notes
                </Label>
                <Textarea
                  id="notes"
                  {...register("notes")}
                  placeholder="Additional clinical notes..."
                  rows={5}
                  className="resize-none"
                />
              </div>
            </div>

            {/* Column 2: Vitals */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="h-4 w-4" />
                <Label className="text-sm font-medium">Vital Signs</Label>
              </div>

              {/* Blood Pressure */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="bloodPressureSystolic" className="text-sm">
                    BP Systolic
                  </Label>
                  <div className="relative">
                    <Input
                      id="bloodPressureSystolic"
                      {...register("bloodPressureSystolic")}
                      placeholder="120"
                      className="pr-10"
                    />
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground text-sm">
                      mmHg
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bloodPressureDiastolic" className="text-sm">
                    BP Diastolic
                  </Label>
                  <div className="relative">
                    <Input
                      id="bloodPressureDiastolic"
                      {...register("bloodPressureDiastolic")}
                      placeholder="80"
                      className="pr-10"
                    />
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground text-sm">
                      mmHg
                    </span>
                  </div>
                </div>
              </div>

              {/* Heart Rate & Temperature */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="heartRate" className="text-sm">
                    Heart Rate
                  </Label>
                  <div className="relative">
                    <Input
                      id="heartRate"
                      {...register("heartRate")}
                      placeholder="72"
                      className="pr-10"
                    />
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground text-sm">
                      bpm
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="temperature" className="text-sm">
                    Temperature
                  </Label>
                  <div className="relative">
                    <Input
                      id="temperature"
                      {...register("temperature")}
                      placeholder="36.6"
                      className="pr-10"
                    />
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground text-sm">
                      °C
                    </span>
                  </div>
                </div>
              </div>

              {/* Weight & Height */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="weight" className="text-sm">
                    Weight
                  </Label>
                  <div className="relative">
                    <Input
                      id="weight"
                      {...register("weight")}
                      placeholder="70"
                      className="pr-10"
                    />
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground text-sm">
                      kg
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="height" className="text-sm">
                    Height
                  </Label>
                  <div className="relative">
                    <Input
                      id="height"
                      {...register("height")}
                      placeholder="175"
                      className="pr-10"
                    />
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground text-sm">
                      cm
                    </span>
                  </div>
                </div>
              </div>

              {/* BMI Calculation */}
              {(watch("weight") || watch("height")) && bmi > 0 && (
                <div className="p-3 border rounded-lg bg-muted/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">BMI Calculation</p>
                      <p className="text-2xl font-bold">{calculateBMI()}</p>
                    </div>
                    {bmiCategory && (
                      <Badge className={bmiCategory.color}>
                        {bmiCategory.label}
                      </Badge>
                    )}
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    <p>Weight: {watch("weight") || "0"} kg</p>
                    <p>Height: {watch("height") || "0"} cm</p>
                  </div>
                </div>
              )}

              {/* Examination Notes */}
              <div className="space-y-2">
                <Label htmlFor="examinationNotes" className="text-sm font-medium">
                  Examination Findings
                </Label>
                <Textarea
                  id="examinationNotes"
                  {...register("examinationNotes")}
                  placeholder="Physical examination findings..."
                  rows={4}
                  className="resize-none"
                />
              </div>
            </div>

            {/* Column 3: Treatment & Follow-up */}
            <div className="space-y-4">
              {/* Treatment Plan */}
              <div className="space-y-2">
                <Label htmlFor="treatmentPlan" className="text-sm font-medium">
                  Treatment Plan
                </Label>
                <Textarea
                  id="treatmentPlan"
                  {...register("treatmentPlan")}
                  placeholder="Prescribed treatment, procedures, recommendations..."
                  rows={5}
                  className="resize-none"
                />
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

              {/* Patient Instructions */}
              <div className="space-y-2">
                <Label htmlFor="patientInstructions" className="text-sm font-medium">
                  Patient Instructions
                </Label>
                <Textarea
                  id="patientInstructions"
                  {...register("patientInstructions")}
                  placeholder="Instructions for the patient..."
                  rows={5}
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
                      {editData ? "Update Record" : "Create Record"}
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