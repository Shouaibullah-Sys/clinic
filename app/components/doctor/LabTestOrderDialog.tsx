// app/components/doctor/LabTestOrderDialog.tsx - REDESIGNED 3-COLUMN LAYOUT

"use client";

import { useState } from "react";
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
import { Loader2, Plus, TestTube } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";

// Define validation schema with Zod
const labTestSchema = z.object({
  testName: z.string().min(1, "Test name is required"),
  category: z.string().min(1, "Category is required"),
  description: z.string().optional(),
  price: z.string()
    .min(1, "Price is required")
    .regex(/^\d+(\.\d{1,2})?$/, "Enter a valid price (e.g., 25.00)"),
  discountedPrice: z.string()
    .optional()
    .refine(val => !val || /^\d+(\.\d{1,2})?$/.test(val), {
      message: "Enter a valid price (e.g., 22.50)",
    }),
  priority: z.enum(["routine", "urgent", "emergency"]),
  notes: z.string().optional(),
  instructions: z.string().optional(),
  specimenType: z.string().optional(),
  specimenQuantity: z.string().optional(),
  specimenContainer: z.string().optional(),
  specimenInstructions: z.string().optional(),
});

type LabTestFormValues = z.infer<typeof labTestSchema>;

interface LabTestOrderDialogProps {
  patientId: string;
  patientName: string;
  appointmentId?: string;
  onTestOrdered?: () => void;
  trigger?: React.ReactNode;
}

const COMMON_TESTS = [
  { name: "Complete Blood Count (CBC)", category: "hematology", price: "500" },
  { name: "Blood Glucose (Fasting)", category: "blood_test", price: "300" },
  { name: "Lipid Profile", category: "blood_test", price: "800" },
  { name: "Liver Function Test (LFT)", category: "blood_test", price: "1200" },
  { name: "Kidney Function Test (KFT)", category: "blood_test", price: "1000" },
  { name: "Thyroid Profile", category: "hormone_test", price: "1500" },
  { name: "Urine Routine Examination", category: "urine_test", price: "400" },
  { name: "Stool Examination", category: "stool_test", price: "350" },
  { name: "Chest X-Ray", category: "imaging", price: "800" },
  { name: "ECG", category: "other", price: "600" },
];

const TEST_CATEGORIES = [
  { value: "hematology", label: "Hematology" },
  { value: "blood_test", label: "Blood Test" },
  { value: "urine_test", label: "Urine Test" },
  { value: "stool_test", label: "Stool Test" },
  { value: "imaging", label: "Imaging" },
  { value: "biopsy", label: "Biopsy" },
  { value: "culture", label: "Culture" },
  { value: "hormone_test", label: "Hormone Test" },
  { value: "genetic_test", label: "Genetic Test" },
  { value: "other", label: "Other" },
];

const SPECIMEN_TYPES = [
  { value: "blood", label: "Blood" },
  { value: "urine", label: "Urine" },
  { value: "stool", label: "Stool" },
  { value: "tissue", label: "Tissue" },
  { value: "saliva", label: "Saliva" },
  { value: "other", label: "Other" },
];

const PRIORITY_LEVELS = [
  { value: "routine", label: "Routine" },
  { value: "urgent", label: "Urgent" },
  { value: "emergency", label: "Emergency" },
];

export function LabTestOrderDialog({
  patientId,
  patientName,
  appointmentId,
  onTestOrdered,
  trigger,
}: LabTestOrderDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { accessToken } = useAuthStore();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<LabTestFormValues>({
    resolver: zodResolver(labTestSchema),
    defaultValues: {
      testName: "",
      category: "",
      description: "",
      price: "",
      discountedPrice: "",
      priority: "routine",
      notes: "",
      instructions: "",
      specimenType: "",
      specimenQuantity: "",
      specimenContainer: "",
      specimenInstructions: "",
    },
  });

  const handleSelectCommonTest = (test: typeof COMMON_TESTS[0]) => {
    setValue("testName", test.name);
    setValue("category", test.category);
    setValue("price", test.price);
  };

  const onSubmit = async (data: LabTestFormValues) => {
    try {
      setLoading(true);

      const requestData = {
        ...data,
        appointmentId,
        price: parseFloat(data.price),
        ...(data.discountedPrice && { discountedPrice: parseFloat(data.discountedPrice) }),
      };

      const response = await fetch(`/api/doctor/patients/${patientId}/lab-tests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(requestData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to order lab test");
      }

      if (result.success) {
        toast.success("Lab Test Ordered", {
          description: `${data.testName} has been ordered successfully for ${patientName}`,
        });
        
        reset();
        setOpen(false);
        
        if (onTestOrdered) {
          onTestOrdered();
        }
      }
    } catch (error: any) {
      console.error("Error ordering lab test:", error);
      toast.error("Failed to Order Test", {
        description: error.message || "An error occurred while ordering the lab test",
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
            <TestTube className="h-4 w-4 mr-2" />
            Order Lab Test
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-[90vw] lg:max-w-[90%] max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader className="pb-4">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <TestTube className="h-5 w-5" />
            Order Lab Test
          </DialogTitle>
          <DialogDescription>
            Order lab test for <span className="font-medium">{patientName}</span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Quick Select Common Tests */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Quick Select Common Tests</Label>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {COMMON_TESTS.map((test, index) => (
                <Button
                  key={index}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleSelectCommonTest(test)}
                  className="justify-start h-auto py-2 hover:border-primary hover:bg-primary/5 transition-colors"
                >
                  <div className="text-left">
                    <p className="text-xs font-medium truncate">{test.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Rs. {test.price}
                    </p>
                  </div>
                </Button>
              ))}
            </div>
          </div>

          {/* Main 3-Column Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Column 1: Basic Test Information */}
            <div className="space-y-4">
              {/* Test Name */}
              <div className="space-y-2">
                <Label htmlFor="testName" className="text-sm font-medium">
                  Test Name *
                </Label>
                <Input
                  id="testName"
                  {...register("testName")}
                  placeholder="Enter test name"
                  className={errors.testName ? "border-red-500" : ""}
                />
                {errors.testName && (
                  <p className="text-xs text-red-500">{errors.testName.message}</p>
                )}
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label htmlFor="category" className="text-sm font-medium">
                  Category *
                </Label>
                <Select
                  onValueChange={(value) => setValue("category", value)}
                  value={watch("category")}
                >
                  <SelectTrigger className={errors.category ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {TEST_CATEGORIES.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.category && (
                  <p className="text-xs text-red-500">{errors.category.message}</p>
                )}
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium">
                  Description
                </Label>
                <Textarea
                  id="description"
                  {...register("description")}
                  placeholder="Test description..."
                  rows={4}
                  className="resize-none"
                />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes" className="text-sm font-medium">
                  Additional Notes
                </Label>
                <Textarea
                  id="notes"
                  {...register("notes")}
                  placeholder="Any additional notes..."
                  rows={3}
                  className="resize-none"
                />
              </div>
            </div>

            {/* Column 2: Pricing & Priority */}
            <div className="space-y-4">
              {/* Price */}
              <div className="space-y-2">
                <Label htmlFor="price" className="text-sm font-medium">
                  Price (Rs) *
                </Label>
                <Input
                  id="price"
                  {...register("price")}
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  className={errors.price ? "border-red-500" : ""}
                />
                {errors.price && (
                  <p className="text-xs text-red-500">{errors.price.message}</p>
                )}
              </div>

              {/* Discounted Price */}
              <div className="space-y-2">
                <Label htmlFor="discountedPrice" className="text-sm font-medium">
                  Discounted Price (Rs)
                </Label>
                <Input
                  id="discountedPrice"
                  {...register("discountedPrice")}
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  className={errors.discountedPrice ? "border-red-500" : ""}
                />
                {errors.discountedPrice && (
                  <p className="text-xs text-red-500">{errors.discountedPrice.message}</p>
                )}
              </div>

              {/* Priority */}
              <div className="space-y-2">
                <Label htmlFor="priority" className="text-sm font-medium">
                  Priority
                </Label>
                <Select
                  onValueChange={(value: "routine" | "urgent" | "emergency") => 
                    setValue("priority", value)
                  }
                  value={watch("priority")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_LEVELS.map((priority) => (
                      <SelectItem key={priority.value} value={priority.value}>
                        {priority.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Instructions for Lab */}
              <div className="space-y-2">
                <Label htmlFor="instructions" className="text-sm font-medium">
                  Instructions for Lab
                </Label>
                <Textarea
                  id="instructions"
                  {...register("instructions")}
                  placeholder="Special instructions for laboratory staff..."
                  rows={4}
                  className="resize-none"
                />
              </div>
            </div>

            {/* Column 3: Specimen Details */}
            <div className="space-y-4">
              {/* Specimen Type */}
              <div className="space-y-2">
                <Label htmlFor="specimenType" className="text-sm font-medium">
                  Specimen Type
                </Label>
                <Select
                  onValueChange={(value) => setValue("specimenType", value)}
                  value={watch("specimenType")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select specimen type" />
                  </SelectTrigger>
                  <SelectContent>
                    {SPECIMEN_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Specimen Details Grid */}
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="specimenQuantity" className="text-sm font-medium">
                    Specimen Quantity
                  </Label>
                  <Input
                    id="specimenQuantity"
                    {...register("specimenQuantity")}
                    placeholder="e.g., 5ml, 1 tube"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="specimenContainer" className="text-sm font-medium">
                    Container
                  </Label>
                  <Input
                    id="specimenContainer"
                    {...register("specimenContainer")}
                    placeholder="e.g., EDTA tube, sterile container"
                  />
                </div>
              </div>

              {/* Specimen Instructions */}
              <div className="space-y-2">
                <Label htmlFor="specimenInstructions" className="text-sm font-medium">
                  Specimen Instructions
                </Label>
                <Textarea
                  id="specimenInstructions"
                  {...register("specimenInstructions")}
                  placeholder="e.g., Fasting required, morning sample, etc."
                  rows={4}
                  className="resize-none"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
              className="px-6"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="px-8">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Ordering...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Order Test
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}