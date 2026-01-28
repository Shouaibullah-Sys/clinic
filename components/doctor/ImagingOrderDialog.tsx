// app/components/doctor/ImagingOrderDialog.tsx

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
import { Loader2, Plus, Scan } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";

// Define validation schema with Zod
const imagingSchema = z.object({
  serviceType: z.enum(["x-ray", "ct-scan", "mri", "ultrasound"], {
    message: "Service type is required",
  }),
  bodyPart: z.string().min(1, "Body part is required"),
  view: z.string().min(1, "View is required"),
  contrastUsed: z.boolean(),
  contrastType: z.string().optional(),
  priority: z.enum(["routine", "urgent", "emergency"], {
    message: "Priority is required",
  }),
  notes: z.string().optional(),
  scheduledDate: z.string().optional(),
});

type ImagingFormValues = z.infer<typeof imagingSchema>;

interface ImagingOrderDialogProps {
  patientId: string;
  patientName: string;
  appointmentId?: string;
  onImagingOrdered?: () => void;
  trigger?: React.ReactNode;
}

const COMMON_IMAGING_STUDIES = [
  { serviceType: "x-ray", bodyPart: "Chest", view: "PA View" },
  { serviceType: "x-ray", bodyPart: "Chest", view: "Lateral View" },
  { serviceType: "x-ray", bodyPart: "Abdomen", view: "AP View" },
  { serviceType: "x-ray", bodyPart: "Spine", view: "AP & Lateral" },
  { serviceType: "x-ray", bodyPart: "Extremities", view: "AP & Lateral" },
  { serviceType: "ct-scan", bodyPart: "Head", view: "Plain" },
  { serviceType: "ct-scan", bodyPart: "Chest", view: "Plain" },
  { serviceType: "ct-scan", bodyPart: "Abdomen & Pelvis", view: "Contrast" },
  { serviceType: "mri", bodyPart: "Brain", view: "Plain" },
  { serviceType: "mri", bodyPart: "Spine", view: "Plain" },
  { serviceType: "mri", bodyPart: "Knee", view: "Plain" },
  { serviceType: "ultrasound", bodyPart: "Abdomen", view: "Complete" },
  { serviceType: "ultrasound", bodyPart: "Pelvis", view: "Complete" },
  { serviceType: "ultrasound", bodyPart: "Thyroid", view: "Complete" },
  { serviceType: "ultrasound", bodyPart: "Obstetric", view: "Complete" },
];

const SERVICE_TYPES = [
  { value: "x-ray", label: "X-Ray" },
  { value: "ct-scan", label: "CT Scan" },
  { value: "mri", label: "MRI" },
  { value: "ultrasound", label: "Ultrasound" },
];

const BODY_PARTS = [
  { value: "Head", label: "Head" },
  { value: "Neck", label: "Neck" },
  { value: "Chest", label: "Chest" },
  { value: "Abdomen", label: "Abdomen" },
  { value: "Pelvis", label: "Pelvis" },
  { value: "Spine", label: "Spine" },
  { value: "Extremities", label: "Extremities" },
  { value: "Brain", label: "Brain" },
  { value: "Knee", label: "Knee" },
  { value: "Shoulder", label: "Shoulder" },
  { value: "Hip", label: "Hip" },
  { value: "Thyroid", label: "Thyroid" },
  { value: "Obstetric", label: "Obstetric" },
  { value: "Other", label: "Other" },
];

const VIEWS = [
  { value: "PA View", label: "PA View" },
  { value: "AP View", label: "AP View" },
  { value: "Lateral View", label: "Lateral View" },
  { value: "Oblique View", label: "Oblique View" },
  { value: "AP & Lateral", label: "AP & Lateral" },
  { value: "Plain", label: "Plain" },
  { value: "Contrast", label: "Contrast" },
  { value: "Complete", label: "Complete" },
  { value: "Other", label: "Other" },
];

const PRIORITY_LEVELS = [
  { value: "routine", label: "Routine" },
  { value: "urgent", label: "Urgent" },
  { value: "emergency", label: "Emergency" },
];

const CONTRAST_TYPES = [
  { value: "iodinated", label: "Iodinated" },
  { value: "gadolinium", label: "Gadolinium" },
  { value: "barium", label: "Barium" },
  { value: "other", label: "Other" },
];

export function ImagingOrderDialog({
  patientId,
  patientName,
  appointmentId,
  onImagingOrdered,
  trigger,
}: ImagingOrderDialogProps) {
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
  } = useForm<ImagingFormValues>({
    resolver: zodResolver(imagingSchema),
    defaultValues: {
      serviceType: "ct-scan",
      bodyPart: "",
      view: "",
      contrastUsed: false,
      contrastType: "",
      priority: "routine",
      notes: "",
      scheduledDate: "",
    },
  });

  const handleSelectCommonStudy = (study: typeof COMMON_IMAGING_STUDIES[0]) => {
    setValue("serviceType", study.serviceType as "x-ray" | "ct-scan" | "mri" | "ultrasound");
    setValue("bodyPart", study.bodyPart);
    setValue("view", study.view);
  };

  const onSubmit = async (data: ImagingFormValues) => {
    try {
      setLoading(true);

      const requestData = {
        ...data,
        appointmentId,
        ...(data.scheduledDate && { scheduledDate: new Date(data.scheduledDate) }),
      };

      const response = await fetch(`/api/doctor/patients/${patientId}/imaging`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(requestData),
      });

      const result = await response.json();

      if (!response.ok) {
        const errorMessage = result.error || result.message || "Failed to order imaging study";
        throw new Error(errorMessage);
      }

      if (result.success) {
        toast.success("Imaging Study Ordered", {
          description: `${data.serviceType.toUpperCase()} - ${data.bodyPart} has been ordered successfully for ${patientName}`,
        });
        
        reset();
        setOpen(false);
        
        if (onImagingOrdered) {
          onImagingOrdered();
        }
      }
    } catch (error: unknown) {
      console.error("Error ordering imaging study:", error);
      
      let errorMessage = "An error occurred while ordering the imaging study";
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === "string") {
        errorMessage = error;
      }
      
      toast.error("Failed to Order Imaging Study", {
        description: errorMessage,
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
            <Scan className="h-4 w-4 mr-2" />
            Order Imaging
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-[90vw] lg:max-w-[800px] max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader className="pb-4">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Scan className="h-5 w-5" />
            Order Imaging Study
          </DialogTitle>
          <DialogDescription>
            Order imaging study for <span className="font-medium">{patientName}</span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Quick Select Common Studies */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Quick Select Common Studies</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {COMMON_IMAGING_STUDIES.map((study, index) => (
                <Button
                  key={index}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleSelectCommonStudy(study)}
                  className="justify-start h-auto py-2 hover:border-primary hover:bg-primary/5 transition-colors"
                >
                  <div className="text-left">
                    <p className="text-xs font-medium truncate">{study.serviceType.toUpperCase()}</p>
                    <p className="text-xs text-muted-foreground">
                      {study.bodyPart} - {study.view}
                    </p>
                  </div>
                </Button>
              ))}
            </div>
          </div>

          {/* Main Form Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Column 1: Study Information */}
            <div className="space-y-4">
              {/* Service Type */}
              <div className="space-y-2">
                <Label htmlFor="serviceType" className="text-sm font-medium">
                  Service Type *
                </Label>
                <Select
                  onValueChange={(value: "x-ray" | "ct-scan" | "mri" | "ultrasound") => setValue("serviceType", value)}
                  value={watch("serviceType")}
                >
                  <SelectTrigger className={errors.serviceType ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select service type" />
                  </SelectTrigger>
                  <SelectContent>
                    {SERVICE_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.serviceType && (
                  <p className="text-xs text-red-500">{errors.serviceType.message}</p>
                )}
              </div>

              {/* Body Part */}
              <div className="space-y-2">
                <Label htmlFor="bodyPart" className="text-sm font-medium">
                  Body Part *
                </Label>
                <Select
                  onValueChange={(value) => setValue("bodyPart", value)}
                  value={watch("bodyPart")}
                >
                  <SelectTrigger className={errors.bodyPart ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select body part" />
                  </SelectTrigger>
                  <SelectContent>
                    {BODY_PARTS.map((part) => (
                      <SelectItem key={part.value} value={part.value}>
                        {part.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.bodyPart && (
                  <p className="text-xs text-red-500">{errors.bodyPart.message}</p>
                )}
              </div>

              {/* View */}
              <div className="space-y-2">
                <Label htmlFor="view" className="text-sm font-medium">
                  View *
                </Label>
                <Select
                  onValueChange={(value) => setValue("view", value)}
                  value={watch("view")}
                >
                  <SelectTrigger className={errors.view ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select view" />
                  </SelectTrigger>
                  <SelectContent>
                    {VIEWS.map((view) => (
                      <SelectItem key={view.value} value={view.value}>
                        {view.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.view && (
                  <p className="text-xs text-red-500">{errors.view.message}</p>
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
            </div>

            {/* Column 2: Additional Details */}
            <div className="space-y-4">
              {/* Contrast Used */}
              <div className="space-y-2">
                <Label htmlFor="contrastUsed" className="text-sm font-medium">
                  Contrast Used
                </Label>
                <Select
                  onValueChange={(value) => setValue("contrastUsed", value === "true")}
                  value={watch("contrastUsed") ? "true" : "false"}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select contrast usage" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="false">No</SelectItem>
                    <SelectItem value="true">Yes</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Contrast Type */}
              {watch("contrastUsed") && (
                <div className="space-y-2">
                  <Label htmlFor="contrastType" className="text-sm font-medium">
                    Contrast Type
                  </Label>
                  <Select
                    onValueChange={(value) => setValue("contrastType", value)}
                    value={watch("contrastType")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select contrast type" />
                    </SelectTrigger>
                    <SelectContent>
                      {CONTRAST_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Scheduled Date */}
              <div className="space-y-2">
                <Label htmlFor="scheduledDate" className="text-sm font-medium">
                  Scheduled Date
                </Label>
                <Input
                  id="scheduledDate"
                  {...register("scheduledDate")}
                  type="datetime-local"
                  placeholder="Select scheduled date"
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty for default (tomorrow)
                </p>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes" className="text-sm font-medium">
                  Additional Notes
                </Label>
                <Textarea
                  id="notes"
                  {...register("notes")}
                  placeholder="Any additional notes or instructions..."
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
                  Order Imaging
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
