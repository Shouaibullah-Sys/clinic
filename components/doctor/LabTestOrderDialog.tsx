// app/components/doctor/LabTestOrderDialog.tsx - INLINE LAYOUT FOR TEST FIELDS

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
  priority: z.enum(["routine", "urgent", "emergency"]),
  notes: z.string().optional(),
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
];

const TEST_CATEGORIES = [
  { value: "hematology", label: "Hematology" },
  { value: "blood_test", label: "Blood Test" },
  { value: "urine_test", label: "Urine Test" },
  { value: "stool_test", label: "Stool Test" },
  { value: "biopsy", label: "Biopsy" },
  { value: "culture", label: "Culture" },
  { value: "hormone_test", label: "Hormone Test" },
  { value: "genetic_test", label: "Genetic Test" },
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
      priority: "routine",
      notes: "",
    },
  });

  const handleSelectCommonTest = (test: (typeof COMMON_TESTS)[0]) => {
    setValue("testName", test.name);
    setValue("category", test.category);
  };

  const onSubmit = async (data: LabTestFormValues) => {
    try {
      setLoading(true);

      const requestData = {
        ...data,
        appointmentId,
      };

      const response = await fetch(
        `/api/doctor/patients/${patientId}/lab-tests`,
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
        description:
          error.message || "An error occurred while ordering the lab test",
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
            Order lab test for{" "}
            <span className="font-medium">{patientName}</span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Quick Select Common Tests */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">
              Quick Select Common Tests
            </Label>
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
                  </div>
                </Button>
              ))}
            </div>
          </div>

          {/* Inline Row: Test Name, Priority, and Category */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                <p className="text-xs text-red-500">
                  {errors.testName.message}
                </p>
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

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="category" className="text-sm font-medium">
                Category *
              </Label>
              <Select
                onValueChange={(value) => setValue("category", value)}
                value={watch("category")}
              >
                <SelectTrigger
                  className={errors.category ? "border-red-500" : ""}
                >
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
                <p className="text-xs text-red-500">
                  {errors.category.message}
                </p>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-medium">
              Notes & Instructions
            </Label>
            <Textarea
              id="notes"
              {...register("notes")}
              placeholder="Test description, special instructions for laboratory staff, and any additional notes..."
              rows={7}
              className="resize-none"
            />
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
