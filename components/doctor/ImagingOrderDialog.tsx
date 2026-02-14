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
import { Loader2, Plus, Scan, FileText, Search, X } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { useRadiologyTemplates } from "@/lib/hooks/use-services";
import levenshtein from "fast-levenshtein";

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

const DEFAULT_SERVICE_TYPES = [
  "x-ray",
  "ct-scan",
  "mri",
  "ultrasound",
  "mammography",
  "fluoroscopy",
  "pet-scan",
  "bone-density",
  "other",
];

const DEFAULT_BODY_PARTS = [
  "Head",
  "Neck",
  "Chest",
  "Abdomen",
  "Pelvis",
  "Spine",
  "Extremities",
  "Brain",
  "Knee",
  "Shoulder",
  "Hip",
  "Thyroid",
  "Obstetric",
  "Other",
];

const DEFAULT_VIEWS = [
  "PA View",
  "AP View",
  "Lateral View",
  "Oblique View",
  "AP & Lateral",
  "Plain",
  "Contrast",
  "Complete",
  "Other",
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
  const [templateQuery, setTemplateQuery] = useState("");
  const [showTemplateResults, setShowTemplateResults] = useState(false);
  const [serviceTypeQuery, setServiceTypeQuery] = useState("ct-scan");
  const [showServiceTypeResults, setShowServiceTypeResults] = useState(false);
  const [bodyPartQuery, setBodyPartQuery] = useState("");
  const [showBodyPartResults, setShowBodyPartResults] = useState(false);
  const [viewQuery, setViewQuery] = useState("");
  const [showViewResults, setShowViewResults] = useState(false);
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
  const serviceTypeOptions = useMemo(
    () =>
      (serviceTypesFromTemplates.length > 0
        ? serviceTypesFromTemplates
        : DEFAULT_SERVICE_TYPES) as string[],
    [serviceTypesFromTemplates],
  );

  const bodyPartOptions = useMemo(
    () =>
      (bodyPartsFromTemplates.length > 0
        ? bodyPartsFromTemplates.filter(Boolean)
        : DEFAULT_BODY_PARTS) as string[],
    [bodyPartsFromTemplates],
  );

  const viewOptions = useMemo(
    () =>
      (viewsFromTemplates.length > 0
        ? viewsFromTemplates
        : DEFAULT_VIEWS) as string[],
    [viewsFromTemplates],
  );

  const scoreMatch = (query: string, candidate: string) => {
    const q = query.trim().toLowerCase();
    const c = candidate.trim().toLowerCase();
    if (!q) return 1;
    if (c === q) return 1;
    if (c.startsWith(q)) return 0.95;
    if (c.includes(q)) return 0.85;
    const distance = levenshtein.get(q, c);
    const similarity = 1 - distance / Math.max(q.length, c.length);
    return similarity * 0.75;
  };

  const rankedTemplateResults = useMemo(() => {
    const q = templateQuery.trim();
    const source = templates.map((template) => {
      const searchable = [
        template.examName,
        template.templateCode,
        template.serviceType,
        template.bodyPart || "",
        ...(template.views || []),
      ].join(" ");
      return { template, score: scoreMatch(q, searchable) };
    });
    return source
      .filter((entry) => (!q ? true : entry.score >= 0.35))
      .sort((a, b) => b.score - a.score)
      .slice(0, 12)
      .map((entry) => entry.template);
  }, [templates, templateQuery]);

  const rankedServiceTypeResults = useMemo(() => {
    return serviceTypeOptions
      .map((option) => ({ option, score: scoreMatch(serviceTypeQuery, option) }))
      .filter((entry) =>
        serviceTypeQuery.trim() ? entry.score >= 0.35 : true,
      )
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map((entry) => entry.option);
  }, [serviceTypeOptions, serviceTypeQuery]);

  const rankedBodyPartResults = useMemo(() => {
    return bodyPartOptions
      .map((option) => ({ option, score: scoreMatch(bodyPartQuery, option) }))
      .filter((entry) => (bodyPartQuery.trim() ? entry.score >= 0.35 : true))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map((entry) => entry.option);
  }, [bodyPartOptions, bodyPartQuery]);

  const rankedViewResults = useMemo(() => {
    return viewOptions
      .map((option) => ({ option, score: scoreMatch(viewQuery, option) }))
      .filter((entry) => (viewQuery.trim() ? entry.score >= 0.35 : true))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map((entry) => entry.option);
  }, [viewOptions, viewQuery]);

  const selectedTemplate = useMemo(
    () => templates.find((t) => t._id === selectedTemplateId),
    [templates, selectedTemplateId],
  );

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
      setTemplateQuery(`${template.examName} (${template.templateCode})`);
      setServiceTypeQuery(template.serviceType);
      setBodyPartQuery(template.bodyPart || "");
      setViewQuery(template.views?.[0] || "");
      setShowTemplateResults(false);

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
    setTemplateQuery("");
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
      setTemplateQuery("");
      setServiceTypeQuery("ct-scan");
      setBodyPartQuery("");
      setViewQuery("");
      setShowTemplateResults(false);
      setShowServiceTypeResults(false);
      setShowBodyPartResults(false);
      setShowViewResults(false);
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
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={templateQuery}
                  onChange={(e) => {
                    setTemplateQuery(e.target.value);
                    setShowTemplateResults(true);
                  }}
                  onFocus={() => setShowTemplateResults(true)}
                  onBlur={() => {
                    setTimeout(() => setShowTemplateResults(false), 150);
                  }}
                  placeholder={
                    templatesLoading
                      ? "Loading templates..."
                      : "Search template by exam/code/type..."
                  }
                  className="pl-10 pr-10"
                  disabled={templatesLoading}
                />
                {templateQuery && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setTemplateQuery("");
                      if (selectedTemplateId) handleClearTemplate();
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {showTemplateResults && !templatesLoading && (
                <div className="border rounded-md max-h-52 overflow-y-auto bg-background">
                  {rankedTemplateResults.length > 0 ? (
                    rankedTemplateResults.map((template) => (
                      <button
                        key={template._id}
                        type="button"
                        className="w-full text-left px-3 py-2 border-b last:border-b-0 hover:bg-muted/60"
                        onClick={() => handleSelectTemplate(template._id)}
                      >
                        <div className="font-medium">{template.examName}</div>
                        <div className="text-xs text-muted-foreground">
                          {template.templateCode} • {template.serviceType.toUpperCase()}
                          {template.bodyPart ? ` • ${template.bodyPart}` : ""}
                        </div>
                      </button>
                    ))
                  ) : (
                    <p className="px-3 py-4 text-sm text-muted-foreground">
                      No templates found
                    </p>
                  )}
                </div>
              )}

              {selectedTemplateId && selectedTemplate && (
                <div className="flex items-center justify-between rounded-md border px-3 py-2 bg-background">
                  <p className="text-sm">
                    Selected:{" "}
                    <span className="font-medium">
                      {selectedTemplate.examName}
                    </span>
                  </p>
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
            <p className="text-xs text-muted-foreground">
              Search and pick a template to auto-populate fields, or create a custom
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
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={serviceTypeQuery}
                    onChange={(e) => {
                      const value = e.target.value;
                      setServiceTypeQuery(value);
                      setShowServiceTypeResults(true);
                      const exact = serviceTypeOptions.find(
                        (option) => option.toLowerCase() === value.toLowerCase(),
                      );
                      if (exact) {
                        setValue(
                          "serviceType",
                          exact as ImagingFormValues["serviceType"],
                          { shouldValidate: true },
                        );
                      }
                    }}
                    onFocus={() => setShowServiceTypeResults(true)}
                    onBlur={() => {
                      setTimeout(() => setShowServiceTypeResults(false), 150);
                    }}
                    placeholder="Search service type..."
                    className={`pl-10 ${errors.serviceType ? "border-red-500" : ""}`}
                  />
                </div>
                {showServiceTypeResults && (
                  <div className="border rounded-md max-h-44 overflow-y-auto bg-background">
                    {rankedServiceTypeResults.map((type) => (
                      <button
                        key={type}
                        type="button"
                        className="w-full text-left px-3 py-2 border-b last:border-b-0 hover:bg-muted/60"
                        onClick={() => {
                          setValue(
                            "serviceType",
                            type as ImagingFormValues["serviceType"],
                            { shouldValidate: true },
                          );
                          setServiceTypeQuery(type);
                          setShowServiceTypeResults(false);
                        }}
                      >
                        {type.replace("-", " ").toUpperCase()}
                      </button>
                    ))}
                  </div>
                )}
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
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={bodyPartQuery}
                    onChange={(e) => {
                      const value = e.target.value;
                      setBodyPartQuery(value);
                      setValue("bodyPart", value, { shouldValidate: true });
                      setShowBodyPartResults(true);
                    }}
                    onFocus={() => setShowBodyPartResults(true)}
                    onBlur={() => {
                      setTimeout(() => setShowBodyPartResults(false), 150);
                    }}
                    placeholder="Search body part..."
                    className={`pl-10 ${errors.bodyPart ? "border-red-500" : ""}`}
                  />
                </div>
                {showBodyPartResults && (
                  <div className="border rounded-md max-h-44 overflow-y-auto bg-background">
                    {rankedBodyPartResults.map((part) => (
                      <button
                        key={part}
                        type="button"
                        className="w-full text-left px-3 py-2 border-b last:border-b-0 hover:bg-muted/60"
                        onClick={() => {
                          setValue("bodyPart", part, { shouldValidate: true });
                          setBodyPartQuery(part);
                          setShowBodyPartResults(false);
                        }}
                      >
                        {part}
                      </button>
                    ))}
                  </div>
                )}
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
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={viewQuery}
                    onChange={(e) => {
                      const value = e.target.value;
                      setViewQuery(value);
                      setValue("view", value, { shouldValidate: true });
                      setShowViewResults(true);
                    }}
                    onFocus={() => setShowViewResults(true)}
                    onBlur={() => {
                      setTimeout(() => setShowViewResults(false), 150);
                    }}
                    placeholder="Search view..."
                    className={`pl-10 ${errors.view ? "border-red-500" : ""}`}
                  />
                </div>
                {showViewResults && (
                  <div className="border rounded-md max-h-44 overflow-y-auto bg-background">
                    {rankedViewResults.map((view) => (
                      <button
                        key={view}
                        type="button"
                        className="w-full text-left px-3 py-2 border-b last:border-b-0 hover:bg-muted/60"
                        onClick={() => {
                          setValue("view", view, { shouldValidate: true });
                          setViewQuery(view);
                          setShowViewResults(false);
                        }}
                      >
                        {view}
                      </button>
                    ))}
                  </div>
                )}
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
