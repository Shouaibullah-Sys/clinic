// app/components/doctor/ImagingOrderDialog.tsx

"use client";

import { useState, useMemo, useEffect } from "react";
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
import { Loader2, Plus, Scan, FileText } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { useRadiologyTemplates } from "@/lib/hooks/use-services";

// Define validation schema with Zod
const imagingSchema = z.object({
  templateId: z.string().optional(),
  serviceType: z.enum(
    [
      "x-ray",
      "ct-scan",
      "mri",
      "ultrasound",
      "mammography",
      "fluoroscopy",
      "pet-scan",
      "bone-density",
      "other",
    ],
    { message: "Service type is required" },
  ),
  bodyPart: z.string().min(1, "Body part is required"),
  view: z.string().min(1, "View is required"),
  contrastUsed: z.boolean(),
  contrastType: z.string().optional(),
  priority: z.enum(["routine", "urgent", "emergency"], {
    message: "Priority is required",
  }),
  notes: z.string().optional(),
  scheduledDate: z.string().optional(),
  examName: z.string().optional(),
  preparationInstructions: z.string().optional(),
  duration: z.number().optional(),
  basePrice: z.number().optional(),
});

type ImagingFormValues = z.infer<typeof imagingSchema>;

interface ImagingOrderDialogProps {
  patientId: string;
  patientName: string;
  appointmentId?: string;
  onImagingOrdered?: () => void;
  trigger?: React.ReactNode;
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
  parameters: Array<{
    parameterCode: string;
    parameterName: string;
    description?: string;
    normalFindings?: string;
    unit?: string;
  }>;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// Priority levels and contrast types remain as they are not template-specific
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
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const { accessToken } = useAuthStore();

  // Fetch radiology templates
  const {
    data: templatesData,
    isLoading: templatesLoading,
    error: templatesError,
  } = useRadiologyTemplates({ active: true });

  // Process templates - filter active ones and group by serviceType
  const templates = useMemo(() => {
    if (!templatesData?.data) return [];
    return templatesData.data.filter((t: RadiologyTemplate) => t.active);
  }, [templatesData]);

  const templatesByServiceType = useMemo(() => {
    const grouped: Record<string, RadiologyTemplate[]> = {};
    templates.forEach((template: RadiologyTemplate) => {
      if (!grouped[template.serviceType]) {
        grouped[template.serviceType] = [];
      }
      grouped[template.serviceType].push(template);
    });
    return grouped;
  }, [templates]);

  // Get unique service types from templates
  const serviceTypesFromTemplates = useMemo(() => {
    const types = new Set(
      templates.map((t: RadiologyTemplate) => t.serviceType),
    );
    return Array.from(types);
  }, [templates]);

  // Get unique body parts from templates
  const bodyPartsFromTemplates = useMemo(() => {
    const parts = new Set(
      templates.map((t: RadiologyTemplate) => t.bodyPart).filter(Boolean),
    );
    return Array.from(parts) as string[];
  }, [templates]);

  // Get unique views from templates
  const viewsFromTemplates = useMemo(() => {
    const views = new Set<string>();
    templates.forEach((t: RadiologyTemplate) => {
      if (t.views) {
        t.views.forEach((v) => views.add(v));
      }
    });
    return Array.from(views);
  }, [templates]);

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
      templateId: "",
      examName: "",
      preparationInstructions: "",
      duration: 30,
      basePrice: 0,
    },
  });

  // Handle template selection
  const handleSelectTemplate = (templateId: string) => {
    const template = templates.find(
      (t: RadiologyTemplate) => t._id === templateId,
    );
    if (template) {
      setSelectedTemplateId(templateId);
      setValue("templateId", template._id);
      setValue(
        "serviceType",
        template.serviceType as ImagingFormValues["serviceType"],
      );
      setValue("bodyPart", template.bodyPart || "");
      setValue("view", template.views?.[0] || "");
      setValue("contrastUsed", template.contrastRequired);
      setValue("contrastType", template.contrastType || "");
      setValue("examName", template.examName);
      setValue(
        "preparationInstructions",
        template.preparationInstructions || "",
      );
      setValue("duration", template.duration);
      setValue("basePrice", template.basePrice);

      toast.info("Template Selected", {
        description: `${template.examName} has been loaded. You can modify values as needed.`,
      });
    }
  };

  // Clear template selection
  const handleClearTemplate = () => {
    setSelectedTemplateId("");
    setValue("templateId", "");
    setValue("examName", "");
    setValue("preparationInstructions", "");
    setValue("duration", 30);
    setValue("basePrice", 0);
    toast.info("Custom Mode", {
      description: "Template cleared. You can create a custom imaging order.",
    });
  };

  const onSubmit = async (data: ImagingFormValues) => {
    try {
      setLoading(true);

      const requestData = {
        ...data,
        appointmentId,
        templateId: data.templateId || undefined,
        ...(data.scheduledDate && {
          scheduledDate: new Date(data.scheduledDate),
        }),
      };

      const response = await fetch(
        `/api/doctor/patients/${patientId}/imaging`,
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
        const errorMessage =
          result.error || result.message || "Failed to order imaging study";
        throw new Error(errorMessage);
      }

      if (result.success) {
        toast.success("Imaging Study Ordered", {
          description: `${data.serviceType.toUpperCase()} - ${data.bodyPart} has been ordered successfully for ${patientName}`,
        });

        reset();
        setSelectedTemplateId("");
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
      setSelectedTemplateId("");
    }
    setOpen(isOpen);
  };

  // Show error if templates fail to load
  useEffect(() => {
    if (templatesError) {
      toast.error("Failed to load templates", {
        description: "You can still create custom imaging orders.",
      });
    }
  }, [templatesError]);

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
      <DialogContent className="max-w-[90vw] lg:max-w-[900px] max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader className="pb-4">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Scan className="h-5 w-5" />
            Order Imaging Study
          </DialogTitle>
          <DialogDescription>
            Order imaging study for{" "}
            <span className="font-medium">{patientName}</span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Template Selection */}
          <div className="space-y-3 bg-muted/30 p-4 rounded-lg border">
            <Label className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Select Template (Optional)
            </Label>
            <div className="flex gap-2">
              <Select
                value={selectedTemplateId}
                onValueChange={handleSelectTemplate}
                disabled={templatesLoading}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue
                    placeholder={
                      templatesLoading
                        ? "Loading templates..."
                        : "Choose a template"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {templatesLoading ? (
                    <SelectItem value="loading" disabled>
                      Loading templates...
                    </SelectItem>
                  ) : templates.length === 0 ? (
                    <SelectItem value="none" disabled>
                      No templates available
                    </SelectItem>
                  ) : (
                    serviceTypesFromTemplates.map((serviceType) => (
                      <div key={serviceType}>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase">
                          {serviceType.replace("-", " ")}
                        </div>
                        {templatesByServiceType[serviceType]?.map(
                          (template: RadiologyTemplate) => (
                            <SelectItem key={template._id} value={template._id}>
                              <div className="flex flex-col">
                                <span>{template.examName}</span>
                                {template.bodyPart && (
                                  <span className="text-xs text-muted-foreground">
                                    {template.bodyPart} - {template.views?.[0]}
                                  </span>
                                )}
                              </div>
                            </SelectItem>
                          ),
                        )}
                      </div>
                    ))
                  )}
                </SelectContent>
              </Select>
              {selectedTemplateId && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClearTemplate}
                >
                  Clear
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Select a template to auto-populate fields, or create a custom
              order
            </p>
          </div>

          {/* Main Form Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Column 1: Study Information */}
            <div className="space-y-4">
              {/* Exam Name */}
              <div className="space-y-2">
                <Label htmlFor="examName" className="text-sm font-medium">
                  Exam Name
                </Label>
                <Input
                  id="examName"
                  {...register("examName")}
                  placeholder="Enter exam name"
                />
              </div>

              {/* Service Type */}
              <div className="space-y-2">
                <Label htmlFor="serviceType" className="text-sm font-medium">
                  Service Type *
                </Label>
                <Select
                  onValueChange={(value: ImagingFormValues["serviceType"]) =>
                    setValue("serviceType", value)
                  }
                  value={watch("serviceType")}
                >
                  <SelectTrigger
                    className={errors.serviceType ? "border-red-500" : ""}
                  >
                    <SelectValue placeholder="Select service type" />
                  </SelectTrigger>
                  <SelectContent>
                    {serviceTypesFromTemplates.length > 0 ? (
                      serviceTypesFromTemplates.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type.replace("-", " ").toUpperCase()}
                        </SelectItem>
                      ))
                    ) : (
                      <>
                        <SelectItem value="x-ray">X-Ray</SelectItem>
                        <SelectItem value="ct-scan">CT Scan</SelectItem>
                        <SelectItem value="mri">MRI</SelectItem>
                        <SelectItem value="ultrasound">Ultrasound</SelectItem>
                        <SelectItem value="mammography">Mammography</SelectItem>
                        <SelectItem value="fluoroscopy">Fluoroscopy</SelectItem>
                        <SelectItem value="pet-scan">PET Scan</SelectItem>
                        <SelectItem value="bone-density">
                          Bone Density
                        </SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
                {errors.serviceType && (
                  <p className="text-xs text-red-500">
                    {errors.serviceType.message}
                  </p>
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
                  <SelectTrigger
                    className={errors.bodyPart ? "border-red-500" : ""}
                  >
                    <SelectValue placeholder="Select body part" />
                  </SelectTrigger>
                  <SelectContent>
                    {bodyPartsFromTemplates.length > 0 ? (
                      bodyPartsFromTemplates.filter(Boolean).map((part) => (
                        <SelectItem key={part} value={part}>
                          {part}
                        </SelectItem>
                      ))
                    ) : (
                      <>
                        <SelectItem value="Head">Head</SelectItem>
                        <SelectItem value="Neck">Neck</SelectItem>
                        <SelectItem value="Chest">Chest</SelectItem>
                        <SelectItem value="Abdomen">Abdomen</SelectItem>
                        <SelectItem value="Pelvis">Pelvis</SelectItem>
                        <SelectItem value="Spine">Spine</SelectItem>
                        <SelectItem value="Extremities">Extremities</SelectItem>
                        <SelectItem value="Brain">Brain</SelectItem>
                        <SelectItem value="Knee">Knee</SelectItem>
                        <SelectItem value="Shoulder">Shoulder</SelectItem>
                        <SelectItem value="Hip">Hip</SelectItem>
                        <SelectItem value="Thyroid">Thyroid</SelectItem>
                        <SelectItem value="Obstetric">Obstetric</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
                {errors.bodyPart && (
                  <p className="text-xs text-red-500">
                    {errors.bodyPart.message}
                  </p>
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
                  <SelectTrigger
                    className={errors.view ? "border-red-500" : ""}
                  >
                    <SelectValue placeholder="Select view" />
                  </SelectTrigger>
                  <SelectContent>
                    {viewsFromTemplates.length > 0 ? (
                      viewsFromTemplates.map((view) => (
                        <SelectItem key={view} value={view}>
                          {view}
                        </SelectItem>
                      ))
                    ) : (
                      <>
                        <SelectItem value="PA View">PA View</SelectItem>
                        <SelectItem value="AP View">AP View</SelectItem>
                        <SelectItem value="Lateral View">
                          Lateral View
                        </SelectItem>
                        <SelectItem value="Oblique View">
                          Oblique View
                        </SelectItem>
                        <SelectItem value="AP & Lateral">
                          AP & Lateral
                        </SelectItem>
                        <SelectItem value="Plain">Plain</SelectItem>
                        <SelectItem value="Contrast">Contrast</SelectItem>
                        <SelectItem value="Complete">Complete</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </>
                    )}
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
                  onValueChange={(value: ImagingFormValues["priority"]) =>
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
                  onValueChange={(value) =>
                    setValue("contrastUsed", value === "true")
                  }
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
                    value={watch("contrastType") || ""}
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

              {/* Preparation Instructions */}
              <div className="space-y-2">
                <Label
                  htmlFor="preparationInstructions"
                  className="text-sm font-medium"
                >
                  Preparation Instructions
                </Label>
                <Textarea
                  id="preparationInstructions"
                  {...register("preparationInstructions")}
                  placeholder="Patient preparation instructions..."
                  rows={2}
                  className="resize-none"
                />
              </div>

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
                  rows={2}
                  className="resize-none"
                />
              </div>
            </div>
          </div>

          {/* Duration and Price (from template, editable) */}
          {selectedTemplateId && (
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg border">
              <div className="space-y-2">
                <Label htmlFor="duration" className="text-sm font-medium">
                  Duration (minutes)
                </Label>
                <Input
                  id="duration"
                  type="number"
                  {...register("duration", { valueAsNumber: true })}
                  min={1}
                  max={480}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="basePrice" className="text-sm font-medium">
                  Base Price
                </Label>
                <Input
                  id="basePrice"
                  type="number"
                  {...register("basePrice", { valueAsNumber: true })}
                  min={0}
                  step={0.01}
                />
                <p className="text-xs text-muted-foreground">
                  Modify if needed (discounts, special cases)
                </p>
              </div>
            </div>
          )}

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
