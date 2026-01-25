// app/components/doctor/LabTestOrderDialog.tsx - UPDATED VERSION

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
import { Loader2, Plus, TestTube, X } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { ScrollArea } from "@/components/ui/scroll-area";

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
      <DialogContent className="max-w-[90vw] w-full h-[85vh] p-4 overflow-hidden">
        <div className="flex flex-col h-full">
          <DialogHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <TestTube className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold">Order Lab Test</DialogTitle>
                  <DialogDescription>
                    For patient: <span className="font-semibold text-foreground">{patientName}</span>
                  </DialogDescription>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          <ScrollArea className="flex-1 pr-4">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Quick Select Common Tests */}
              <div className="space-y-3 bg-muted/30 p-4 rounded-lg">
                <Label className="text-sm font-semibold">Quick Select Common Tests</Label>
                <p className="text-sm text-muted-foreground mb-3">
                  Click on a test to auto-fill the form
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                  {COMMON_TESTS.map((test, index) => (
                    <Button
                      key={index}
                      type="button"
                      variant="outline"
                      onClick={() => handleSelectCommonTest(test)}
                      className="h-auto p-2 justify-start hover:border-primary transition-colors text-left"
                    >
                      <div className="w-full">
                        <p className="text-xs font-medium line-clamp-2 leading-tight mb-1">
                          {test.name}
                        </p>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-muted-foreground capitalize truncate max-w-[60px]">
                            {test.category.replace('_', ' ')}
                          </span>
                          <span className="text-xs font-semibold text-primary whitespace-nowrap">
                            Rs. {test.price}
                          </span>
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-6">
                {/* Main Form Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Column 1: Basic Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold pb-2 border-b">Basic Information</h3>
                    
                    <div className="space-y-4">
                      {/* Test Name */}
                      <div className="space-y-2">
                        <Label htmlFor="testName" className="font-medium text-sm">
                          Test Name <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="testName"
                          {...register("testName")}
                          placeholder="Enter test name"
                          className={errors.testName ? "border-red-500" : "h-9"}
                        />
                        {errors.testName && (
                          <p className="text-xs text-red-500">{errors.testName.message}</p>
                        )}
                      </div>

                      {/* Category */}
                      <div className="space-y-2">
                        <Label htmlFor="category" className="font-medium text-sm">
                          Category <span className="text-destructive">*</span>
                        </Label>
                        <Select
                          onValueChange={(value) => setValue("category", value)}
                          value={watch("category")}
                        >
                          <SelectTrigger className={errors.category ? "border-red-500 h-9" : "h-9"}>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent className="max-h-[200px]">
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

                      {/* Price */}
                      <div className="space-y-2">
                        <Label htmlFor="price" className="font-medium text-sm">
                          Price (Rs) <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="price"
                          {...register("price")}
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          className={errors.price ? "border-red-500 h-9" : "h-9"}
                        />
                        {errors.price && (
                          <p className="text-xs text-red-500">{errors.price.message}</p>
                        )}
                      </div>

                      {/* Discounted Price */}
                      <div className="space-y-2">
                        <Label htmlFor="discountedPrice" className="font-medium text-sm">
                          Discounted Price (Rs)
                        </Label>
                        <Input
                          id="discountedPrice"
                          {...register("discountedPrice")}
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          className={errors.discountedPrice ? "border-red-500 h-9" : "h-9"}
                        />
                        {errors.discountedPrice && (
                          <p className="text-xs text-red-500">{errors.discountedPrice.message}</p>
                        )}
                      </div>

                      {/* Priority */}
                      <div className="space-y-2">
                        <Label htmlFor="priority" className="font-medium text-sm">
                          Priority
                        </Label>
                        <Select
                          onValueChange={(value: "routine" | "urgent" | "emergency") => 
                            setValue("priority", value)
                          }
                          value={watch("priority")}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
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
                    </div>
                  </div>

                  {/* Column 2: Specimen Details */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold pb-2 border-b">Specimen Details</h3>
                    
                    <div className="space-y-4">
                      {/* Specimen Type */}
                      <div className="space-y-2">
                        <Label htmlFor="specimenType" className="font-medium text-sm">
                          Specimen Type
                        </Label>
                        <Select
                          onValueChange={(value) => setValue("specimenType", value)}
                          value={watch("specimenType")}
                        >
                          <SelectTrigger className="h-9">
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

                      {/* Specimen Quantity */}
                      <div className="space-y-2">
                        <Label htmlFor="specimenQuantity" className="font-medium text-sm">
                          Specimen Quantity
                        </Label>
                        <Input
                          id="specimenQuantity"
                          {...register("specimenQuantity")}
                          placeholder="e.g., 5ml, 1 tube"
                          className="h-9"
                        />
                      </div>

                      {/* Specimen Container */}
                      <div className="space-y-2">
                        <Label htmlFor="specimenContainer" className="font-medium text-sm">
                          Container
                        </Label>
                        <Input
                          id="specimenContainer"
                          {...register("specimenContainer")}
                          placeholder="e.g., EDTA tube, sterile container"
                          className="h-9"
                        />
                      </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                      <Label htmlFor="description" className="font-medium text-sm">
                        Description
                      </Label>
                      <Textarea
                        id="description"
                        {...register("description")}
                        placeholder="Test description..."
                        rows={4}
                        className="min-h-[100px] resize-none"
                      />
                    </div>
                  </div>

                  {/* Column 3: Instructions & Notes */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold pb-2 border-b">Instructions & Notes</h3>
                    
                    <div className="space-y-4">
                      {/* Instructions for Lab */}
                      <div className="space-y-2">
                        <Label htmlFor="instructions" className="font-medium text-sm">
                          Instructions for Lab
                        </Label>
                        <Textarea
                          id="instructions"
                          {...register("instructions")}
                          placeholder="Special instructions for laboratory staff..."
                          rows={3}
                          className="min-h-[80px] resize-none"
                        />
                      </div>

                      {/* Specimen Instructions */}
                      <div className="space-y-2">
                        <Label htmlFor="specimenInstructions" className="font-medium text-sm">
                          Specimen Instructions
                        </Label>
                        <Textarea
                          id="specimenInstructions"
                          {...register("specimenInstructions")}
                          placeholder="e.g., Fasting required, morning sample, etc."
                          rows={3}
                          className="min-h-[80px] resize-none"
                        />
                      </div>

                      {/* Notes */}
                      <div className="space-y-2">
                        <Label htmlFor="notes" className="font-medium text-sm">
                          Additional Notes
                        </Label>
                        <Textarea
                          id="notes"
                          {...register("notes")}
                          placeholder="Any additional notes..."
                          rows={3}
                          className="min-h-[80px] resize-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </form>
          </ScrollArea>

          <DialogFooter className="pt-4 border-t mt-4">
            <div className="flex justify-end gap-3 w-full">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={loading}
                className="h-9"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={loading}
                className="h-9"
                onClick={handleSubmit(onSubmit)}
              >
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
            </div>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}