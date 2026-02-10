// components/doctor/DischargeCardDialog.tsx

"use client";

import { useState, useEffect, useCallback } from "react";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Loader2,
  Plus,
  Trash2,
  CheckCircle,
  DollarSign,
  FileText,
  Pill,
  ClipboardList,
  Search,
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { DischargeMedicineSearchDialog } from "./DischargeMedicineSearchDialog";

// Simple schema for main form
const dischargeCardSchema = z.object({
  operationName: z.string().min(1, "Operation name is required"),
  operationCost: z.string().regex(/^\d+$/, "Must be a number"),
  operationDate: z.string().min(1, "Operation date is required"),
  operationType: z.string().min(1, "Operation type is required"),
  diagnosis: z.string().min(1, "Diagnosis is required"),
  procedureNotes: z.string().min(1, "Procedure notes are required"),
  admissionDate: z.string().min(1, "Admission date is required"),
  dischargeDate: z.string().min(1, "Discharge date is required"),
  dischargeInstructions: z
    .string()
    .min(1, "Discharge instructions are required"),
  followUpDate: z.string().optional(),
  followUpInstructions: z.string().optional(),
  notes: z.string().optional(),
});

type DischargeCardFormValues = z.infer<typeof dischargeCardSchema>;

interface DischargeCardDialogProps {
  patientId: string;
  patientName: string;
  appointmentId?: string;
  cardId?: string;
  onDischargeCardCreated?: () => void;
  trigger?: React.ReactNode;
}

const OPERATION_TYPE_OPTIONS = [
  { value: "major", label: "Major Surgery" },
  { value: "minor", label: "Minor Surgery" },
  { value: "emergency", label: "Emergency" },
  { value: "elective", label: "Elective" },
];

// Medicine types that can be added
type MedicineSearchType = "preOp" | "postOp" | "discharge";

interface MedicineSelection {
  _id: string;
  name: string;
  sellingPrice: number;
  currentQuantity: number;
  expiryDate: string;
  batchNumber: string;
}

export function DischargeCardDialog({
  patientId,
  patientName,
  appointmentId,
  cardId,
  onDischargeCardCreated,
  trigger,
}: DischargeCardDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(false);
  const isEditing = !!cardId;
  const { accessToken } = useAuthStore();

  // Medicine search dialog state
  const [medicineSearchOpen, setMedicineSearchOpen] = useState(false);
  const [medicineSearchType, setMedicineSearchType] =
    useState<MedicineSearchType>("discharge");

  // Medicine states
  const [preOpMedicines, setPreOpMedicines] = useState<any[]>([]);
  const [postOpMedicines, setPostOpMedicines] = useState<any[]>([]);
  const [dischargeMedicines, setDischargeMedicines] = useState<any[]>([]);
  const [otherRequirements, setOtherRequirements] = useState<any[]>([]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<DischargeCardFormValues>({
    resolver: zodResolver(dischargeCardSchema),
    defaultValues: {
      operationName: "",
      operationCost: "0",
      operationDate: "",
      operationType: "",
      diagnosis: "",
      procedureNotes: "",
      admissionDate: "",
      dischargeDate: "",
      dischargeInstructions: "",
      followUpDate: "",
      followUpInstructions: "",
      notes: "",
    },
  });

  // Fetch existing discharge card data when editing
  useEffect(() => {
    if (open && isEditing && accessToken) {
      fetchDischargeCardData();
    }
  }, [open, isEditing, accessToken]);

  const fetchDischargeCardData = async () => {
    try {
      setFetchingData(true);
      const response = await fetch(
        `/api/doctor/patients/${patientId}/discharge-cards/${cardId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      const result = await response.json();

      if (result.success && result.data) {
        const card = result.data;

        // Set form values
        setValue("operationName", card.operationName || "");
        setValue("operationCost", String(card.operationCost || 0));
        setValue("operationDate", card.operationDate?.split("T")[0] || "");
        setValue("operationType", card.operationType || "");
        setValue("diagnosis", card.diagnosis || "");
        setValue("procedureNotes", card.procedureNotes || "");
        setValue("admissionDate", card.admissionDate?.split("T")[0] || "");
        setValue("dischargeDate", card.dischargeDate?.split("T")[0] || "");
        setValue("dischargeInstructions", card.dischargeInstructions || "");
        setValue("followUpDate", card.followUpDate?.split("T")[0] || "");
        setValue("followUpInstructions", card.followUpInstructions || "");
        setValue("notes", card.notes || "");

        // Set medicine arrays
        setPreOpMedicines(card.preOpMedicines || []);
        setPostOpMedicines(card.postOpMedicines || []);
        setDischargeMedicines(card.dischargeMedicines || []);
        setOtherRequirements(card.otherRequirements || []);
      }
    } catch (error) {
      console.error("Error fetching discharge card:", error);
      toast.error("Failed to load discharge card data");
    } finally {
      setFetchingData(false);
    }
  };

  // Open medicine search dialog
  const openMedicineSearch = (type: MedicineSearchType) => {
    setMedicineSearchType(type);
    setMedicineSearchOpen(true);
  };

  // Handle medicine selection from search dialog
  const handleMedicineSelected = (medicine: MedicineSelection) => {
    const medicineData = {
      medicine: medicine._id,
      name: medicine.name,
      quantity: 1,
      unitPrice: medicine.sellingPrice,
      totalPrice: medicine.sellingPrice,
    };

    switch (medicineSearchType) {
      case "preOp":
        setPreOpMedicines([
          ...preOpMedicines,
          {
            ...medicineData,
            administeredDate: new Date().toISOString().split("T")[0],
            notes: "",
          },
        ]);
        break;
      case "postOp":
        setPostOpMedicines([
          ...postOpMedicines,
          {
            ...medicineData,
            administeredDate: new Date().toISOString().split("T")[0],
            frequency: "Every 8 hours",
            duration: "7 days",
            notes: "",
          },
        ]);
        break;
      case "discharge":
        setDischargeMedicines([
          ...dischargeMedicines,
          {
            ...medicineData,
            instructions: "",
          },
        ]);
        break;
    }
  };

  // Add empty medicine (manual entry fallback)
  const addPreOpMedicine = () => {
    setPreOpMedicines([
      ...preOpMedicines,
      {
        name: "",
        quantity: 1,
        unitPrice: 0,
        totalPrice: 0,
        administeredDate: new Date().toISOString().split("T")[0],
        notes: "",
      },
    ]);
  };

  const addPostOpMedicine = () => {
    setPostOpMedicines([
      ...postOpMedicines,
      {
        name: "",
        quantity: 1,
        unitPrice: 0,
        totalPrice: 0,
        administeredDate: new Date().toISOString().split("T")[0],
        frequency: "Every 8 hours",
        duration: "7 days",
        notes: "",
      },
    ]);
  };

  const addDischargeMedicine = () => {
    setDischargeMedicines([
      ...dischargeMedicines,
      { name: "", quantity: 1, unitPrice: 0, totalPrice: 0, instructions: "" },
    ]);
  };

  const addOtherRequirement = () => {
    setOtherRequirements([
      ...otherRequirements,
      { description: "", quantity: 1, unitPrice: 0, totalPrice: 0, notes: "" },
    ]);
  };

  // Remove medicine functions
  const removePreOpMedicine = (index: number) => {
    setPreOpMedicines(preOpMedicines.filter((_, i) => i !== index));
  };

  const removePostOpMedicine = (index: number) => {
    setPostOpMedicines(postOpMedicines.filter((_, i) => i !== index));
  };

  const removeDischargeMedicine = (index: number) => {
    setDischargeMedicines(dischargeMedicines.filter((_, i) => i !== index));
  };

  const removeOtherRequirement = (index: number) => {
    setOtherRequirements(otherRequirements.filter((_, i) => i !== index));
  };

  // Update medicine fields
  const updateMedicine = (
    list: any[],
    setList: React.Dispatch<React.SetStateAction<any[]>>,
    index: number,
    field: string,
    value: any,
  ) => {
    const updated = [...list];
    updated[index][field] = value;

    if (field === "quantity" || field === "unitPrice") {
      updated[index].totalPrice =
        (updated[index].quantity || 1) * (updated[index].unitPrice || 0);
    }

    setList(updated);
  };

  // Calculate totals
  const calculateTotal = (list: any[]) => {
    return list.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
  };

  const preOpTotal = calculateTotal(preOpMedicines);
  const postOpTotal = calculateTotal(postOpMedicines);
  const dischargeTotal = calculateTotal(dischargeMedicines);
  const otherTotal = calculateTotal(otherRequirements);
  const operationCost = parseFloat(watch("operationCost") || "0");
  const totalAmount =
    operationCost + preOpTotal + postOpTotal + dischargeTotal + otherTotal;

  const onSubmit = async (data: DischargeCardFormValues) => {
    try {
      setLoading(true);

      const requestData = {
        appointmentId,
        operationName: data.operationName,
        operationCost: parseFloat(data.operationCost) || 0,
        operationDate: data.operationDate,
        operationType: data.operationType,
        diagnosis: data.diagnosis,
        procedureNotes: data.procedureNotes,
        admissionDate: data.admissionDate,
        dischargeDate: data.dischargeDate,
        preOpMedicines: preOpMedicines.filter((m) => m.name.trim()),
        postOpMedicines: postOpMedicines.filter((m) => m.name.trim()),
        dischargeMedicines: dischargeMedicines.filter((m) => m.name.trim()),
        otherRequirements: otherRequirements.filter((r) =>
          r.description.trim(),
        ),
        dischargeInstructions: data.dischargeInstructions,
        followUpDate: data.followUpDate || undefined,
        followUpInstructions: data.followUpInstructions,
        notes: data.notes,
      };

      let response;
      if (isEditing) {
        // PUT request for updating
        response = await fetch(
          `/api/doctor/patients/${patientId}/discharge-cards/${cardId}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify(requestData),
          },
        );
      } else {
        // POST request for creating
        response = await fetch(
          `/api/doctor/patients/${patientId}/discharge-cards`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify(requestData),
          },
        );
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            `Failed to ${isEditing ? "update" : "create"} discharge card`,
        );
      }

      if (result.success) {
        toast.success(
          isEditing ? "Discharge Card Updated" : "Discharge Card Created",
          {
            description: `Discharge card ${isEditing ? "updated" : "created"} successfully for ${patientName}`,
          },
        );

        reset();
        setPreOpMedicines([]);
        setPostOpMedicines([]);
        setDischargeMedicines([]);
        setOtherRequirements([]);
        setOpen(false);

        if (onDischargeCardCreated) {
          onDischargeCardCreated();
        }
      }
    } catch (error: any) {
      console.error(
        `Error ${isEditing ? "updating" : "creating"} discharge card:`,
        error,
      );
      toast.error(
        `Failed to ${isEditing ? "Update" : "Create"} Discharge Card`,
        {
          description: error.message || "An error occurred",
        },
      );
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      reset();
      setPreOpMedicines([]);
      setPostOpMedicines([]);
      setDischargeMedicines([]);
      setOtherRequirements([]);
    }
    setOpen(isOpen);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          {trigger || (
            <Button size="sm" variant="default">
              <FileText className="h-4 w-4 mr-2" />
              Discharge Card
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="max-w-[95vw] lg:max-w-6xl max-h-[90vh] overflow-y-auto p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <FileText className="h-5 w-5" />
              {isEditing ? "Edit Discharge Card" : "Discharge Card"}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? `Edit discharge card for `
                : `Create discharge card for `}
              <span className="font-medium">{patientName}</span>
            </DialogDescription>
          </DialogHeader>

          {fetchingData ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Total Amount Display */}
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-primary" />
                      <span className="font-medium">Total Amount:</span>
                    </div>
                    <span className="text-2xl font-bold text-primary">
                      {totalAmount.toFixed(2)} AFN
                    </span>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Operation Details */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Operation Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Operation Name *</Label>
                        <Input
                          {...register("operationName")}
                          placeholder="e.g., Appendectomy"
                        />
                        {errors.operationName && (
                          <p className="text-xs text-destructive">
                            {errors.operationName.message}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Operation Type *</Label>
                        <Select
                          onValueChange={(value) =>
                            setValue("operationType", value)
                          }
                          value={watch("operationType")}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            {OPERATION_TYPE_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Operation Cost (AFN) *</Label>
                        <Input
                          type="number"
                          {...register("operationCost")}
                          placeholder="0.00"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Operation Date *</Label>
                        <Input type="date" {...register("operationDate")} />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Diagnosis *</Label>
                      <Textarea
                        {...register("diagnosis")}
                        placeholder="Enter diagnosis..."
                        rows={2}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Procedure Notes *</Label>
                      <Textarea
                        {...register("procedureNotes")}
                        placeholder="Describe the procedure..."
                        rows={2}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Hospital Stay */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Hospital Stay</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Admission Date *</Label>
                        <Input type="date" {...register("admissionDate")} />
                      </div>
                      <div className="space-y-2">
                        <Label>Discharge Date *</Label>
                        <Input type="date" {...register("dischargeDate")} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Pre-Operation Medicines */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Pill className="h-5 w-5" /> Pre-Operation Medicines
                    </CardTitle>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => openMedicineSearch("preOp")}
                      >
                        <Search className="h-4 w-4 mr-2" /> Search Medicine
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addPreOpMedicine}
                      >
                        <Plus className="h-4 w-4 mr-2" /> Manual Entry
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {preOpMedicines.length > 0 ? (
                    <div className="space-y-4">
                      {preOpMedicines.map((med, index) => (
                        <div
                          key={index}
                          className="flex gap-4 items-start p-4 border rounded-lg"
                        >
                          <div className="flex-1 space-y-2">
                            <Input
                              value={med.name}
                              onChange={(e) =>
                                updateMedicine(
                                  preOpMedicines,
                                  setPreOpMedicines,
                                  index,
                                  "name",
                                  e.target.value,
                                )
                              }
                              placeholder="Medicine name"
                            />
                            <div className="grid grid-cols-4 gap-2">
                              <Input
                                type="date"
                                value={med.administeredDate || ""}
                                onChange={(e) =>
                                  updateMedicine(
                                    preOpMedicines,
                                    setPreOpMedicines,
                                    index,
                                    "administeredDate",
                                    e.target.value,
                                  )
                                }
                                placeholder="Date"
                              />
                              <Input
                                type="number"
                                value={med.quantity}
                                onChange={(e) =>
                                  updateMedicine(
                                    preOpMedicines,
                                    setPreOpMedicines,
                                    index,
                                    "quantity",
                                    parseInt(e.target.value) || 1,
                                  )
                                }
                                placeholder="Qty"
                              />
                              <Input
                                type="number"
                                step="0.01"
                                value={med.unitPrice}
                                onChange={(e) =>
                                  updateMedicine(
                                    preOpMedicines,
                                    setPreOpMedicines,
                                    index,
                                    "unitPrice",
                                    parseFloat(e.target.value) || 0,
                                  )
                                }
                                placeholder="Price"
                              />
                              <Input
                                value={`${(med.quantity || 1) * (med.unitPrice || 0)}`}
                                readOnly
                                placeholder="Total"
                              />
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removePreOpMedicine(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <div className="text-right font-medium">
                        Pre-Op Total: {preOpTotal.toFixed(2)} AFN
                      </div>
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-4">
                      No pre-op medicines added
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Post-Operation Medicines */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Pill className="h-5 w-5" /> Post-Operation Medicines
                      (In-Hospital)
                    </CardTitle>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => openMedicineSearch("postOp")}
                      >
                        <Search className="h-4 w-4 mr-2" /> Search Medicine
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addPostOpMedicine}
                      >
                        <Plus className="h-4 w-4 mr-2" /> Manual Entry
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {postOpMedicines.length > 0 ? (
                    <div className="space-y-4">
                      {postOpMedicines.map((med, index) => (
                        <div
                          key={index}
                          className="flex gap-4 items-start p-4 border rounded-lg"
                        >
                          <div className="flex-1 space-y-2">
                            <Input
                              value={med.name}
                              onChange={(e) =>
                                updateMedicine(
                                  postOpMedicines,
                                  setPostOpMedicines,
                                  index,
                                  "name",
                                  e.target.value,
                                )
                              }
                              placeholder="Medicine name"
                            />
                            <div className="grid grid-cols-5 gap-2">
                              <Input
                                type="date"
                                value={med.administeredDate || ""}
                                onChange={(e) =>
                                  updateMedicine(
                                    postOpMedicines,
                                    setPostOpMedicines,
                                    index,
                                    "administeredDate",
                                    e.target.value,
                                  )
                                }
                                placeholder="Date"
                              />
                              <Select
                                value={med.frequency}
                                onValueChange={(value) =>
                                  updateMedicine(
                                    postOpMedicines,
                                    setPostOpMedicines,
                                    index,
                                    "frequency",
                                    value,
                                  )
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Once daily">
                                    Once daily
                                  </SelectItem>
                                  <SelectItem value="Twice daily">
                                    Twice daily
                                  </SelectItem>
                                  <SelectItem value="Every 8 hours">
                                    Every 8 hours
                                  </SelectItem>
                                  <SelectItem value="As needed">
                                    As needed
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                              <Select
                                value={med.duration}
                                onValueChange={(value) =>
                                  updateMedicine(
                                    postOpMedicines,
                                    setPostOpMedicines,
                                    index,
                                    "duration",
                                    value,
                                  )
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="1 day">1 day</SelectItem>
                                  <SelectItem value="7 days">7 days</SelectItem>
                                  <SelectItem value="14 days">
                                    14 days
                                  </SelectItem>
                                  <SelectItem value="30 days">
                                    30 days
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                              <Input
                                type="number"
                                value={med.quantity}
                                onChange={(e) =>
                                  updateMedicine(
                                    postOpMedicines,
                                    setPostOpMedicines,
                                    index,
                                    "quantity",
                                    parseInt(e.target.value) || 1,
                                  )
                                }
                                placeholder="Qty"
                              />
                              <Input
                                value={`${(med.quantity || 1) * (med.unitPrice || 0)}`}
                                readOnly
                                placeholder="Total"
                              />
                            </div>
                            <Input
                              type="number"
                              step="0.01"
                              value={med.unitPrice}
                              onChange={(e) =>
                                updateMedicine(
                                  postOpMedicines,
                                  setPostOpMedicines,
                                  index,
                                  "unitPrice",
                                  parseFloat(e.target.value) || 0,
                                )
                              }
                              placeholder="Unit Price"
                            />
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removePostOpMedicine(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <div className="text-right font-medium">
                        Post-Op Total: {postOpTotal.toFixed(2)} AFN
                      </div>
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-4">
                      No post-op medicines added
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Discharge Medicines (Take-Home) */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Pill className="h-5 w-5" /> Discharge Medicines
                      (Take-Home)
                    </CardTitle>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => openMedicineSearch("discharge")}
                      >
                        <Search className="h-4 w-4 mr-2" /> Search Medicine
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addDischargeMedicine}
                      >
                        <Plus className="h-4 w-4 mr-2" /> Manual Entry
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {dischargeMedicines.length > 0 ? (
                    <div className="space-y-4">
                      {dischargeMedicines.map((med, index) => (
                        <div
                          key={index}
                          className="flex gap-4 items-start p-4 border rounded-lg"
                        >
                          <div className="flex-1 space-y-2">
                            <Input
                              value={med.name}
                              onChange={(e) =>
                                updateMedicine(
                                  dischargeMedicines,
                                  setDischargeMedicines,
                                  index,
                                  "name",
                                  e.target.value,
                                )
                              }
                              placeholder="Medicine name"
                            />
                            <Input
                              value={med.instructions}
                              onChange={(e) =>
                                updateMedicine(
                                  dischargeMedicines,
                                  setDischargeMedicines,
                                  index,
                                  "instructions",
                                  e.target.value,
                                )
                              }
                              placeholder="Instructions (e.g., Take 1 tablet twice daily)"
                            />
                            <div className="grid grid-cols-3 gap-2">
                              <Input
                                type="number"
                                value={med.quantity}
                                onChange={(e) =>
                                  updateMedicine(
                                    dischargeMedicines,
                                    setDischargeMedicines,
                                    index,
                                    "quantity",
                                    parseInt(e.target.value) || 1,
                                  )
                                }
                                placeholder="Qty"
                              />
                              <Input
                                type="number"
                                step="0.01"
                                value={med.unitPrice}
                                onChange={(e) =>
                                  updateMedicine(
                                    dischargeMedicines,
                                    setDischargeMedicines,
                                    index,
                                    "unitPrice",
                                    parseFloat(e.target.value) || 0,
                                  )
                                }
                                placeholder="Price"
                              />
                              <Input
                                value={`${(med.quantity || 1) * (med.unitPrice || 0)}`}
                                readOnly
                                placeholder="Total"
                              />
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeDischargeMedicine(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <div className="text-right font-medium">
                        Discharge Medicines Total: {dischargeTotal.toFixed(2)}{" "}
                        AFN
                      </div>
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-4">
                      No discharge medicines added
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Other Requirements */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <ClipboardList className="h-5 w-5" /> Other Requirements
                    </CardTitle>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addOtherRequirement}
                    >
                      <Plus className="h-4 w-4 mr-2" /> Add Item
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {otherRequirements.length > 0 ? (
                    <div className="space-y-4">
                      {otherRequirements.map((item, index) => (
                        <div
                          key={index}
                          className="flex gap-4 items-start p-4 border rounded-lg"
                        >
                          <div className="flex-1 space-y-2">
                            <Input
                              value={item.description}
                              onChange={(e) =>
                                updateMedicine(
                                  otherRequirements,
                                  setOtherRequirements,
                                  index,
                                  "description",
                                  e.target.value,
                                )
                              }
                              placeholder="Item description"
                            />
                            <div className="grid grid-cols-3 gap-2">
                              <Input
                                type="number"
                                value={item.quantity}
                                onChange={(e) =>
                                  updateMedicine(
                                    otherRequirements,
                                    setOtherRequirements,
                                    index,
                                    "quantity",
                                    parseInt(e.target.value) || 1,
                                  )
                                }
                                placeholder="Qty"
                              />
                              <Input
                                type="number"
                                step="0.01"
                                value={item.unitPrice}
                                onChange={(e) =>
                                  updateMedicine(
                                    otherRequirements,
                                    setOtherRequirements,
                                    index,
                                    "unitPrice",
                                    parseFloat(e.target.value) || 0,
                                  )
                                }
                                placeholder="Price"
                              />
                              <Input
                                value={`${(item.quantity || 1) * (item.unitPrice || 0)}`}
                                readOnly
                                placeholder="Total"
                              />
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeOtherRequirement(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <div className="text-right font-medium">
                        Other Total: {otherTotal.toFixed(2)} AFN
                      </div>
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-4">
                      No other requirements added
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Discharge Instructions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    Discharge Instructions *
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Textarea
                      {...register("dischargeInstructions")}
                      placeholder="Enter discharge instructions for the patient..."
                      rows={4}
                    />
                    {errors.dischargeInstructions && (
                      <p className="text-xs text-destructive">
                        {errors.dischargeInstructions.message}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Follow-up Date</Label>
                      <Input type="date" {...register("followUpDate")} />
                    </div>
                    <div className="space-y-2">
                      <Label>Follow-up Instructions</Label>
                      <Input
                        {...register("followUpInstructions")}
                        placeholder="Instructions for follow-up"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Additional Notes</Label>
                    <Textarea
                      {...register("notes")}
                      placeholder="Any additional notes..."
                      rows={2}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Dialog Footer */}
              <div className="flex items-center justify-between pt-6 border-t">
                <div className="text-sm text-muted-foreground">
                  Operation: {operationCost.toFixed(2)} | Pre-Op:{" "}
                  {preOpTotal.toFixed(2)} | Post-Op: {postOpTotal.toFixed(2)} |
                  Discharge: {dischargeTotal.toFixed(2)} | Other:{" "}
                  {otherTotal.toFixed(2)}
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
                  <Button type="submit" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {isEditing ? "Updating..." : "Creating..."}
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        {isEditing
                          ? "Update Discharge Card"
                          : "Create Discharge Card"}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Medicine Search Dialog */}
      <DischargeMedicineSearchDialog
        open={medicineSearchOpen}
        onOpenChange={setMedicineSearchOpen}
        onMedicineSelected={handleMedicineSelected}
        accessToken={accessToken || ""}
      />
    </>
  );
}
