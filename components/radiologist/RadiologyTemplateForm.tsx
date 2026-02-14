// components/radiologist/RadiologyTemplateForm.tsx
"use client";

import { useForm } from "react-hook-form";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  useCreateRadiologyTemplate,
  useUpdateRadiologyTemplate,
} from "@/lib/hooks/use-services";
import { X, Plus } from "lucide-react";

// Service types
const SERVICE_TYPES = [
  { value: "x-ray", label: "X-Ray" },
  { value: "ct-scan", label: "CT Scan" },
  { value: "mri", label: "MRI" },
  { value: "ultrasound", label: "Ultrasound" },
  { value: "mammography", label: "Mammography" },
  { value: "fluoroscopy", label: "Fluoroscopy" },
  { value: "pet-scan", label: "PET Scan" },
  { value: "bone-density", label: "Bone Density" },
  { value: "other", label: "Other" },
];

const CATEGORIES = [
  { value: "diagnostic", label: "Diagnostic" },
  { value: "screening", label: "Screening" },
  { value: "interventional", label: "Interventional" },
  { value: "therapeutic", label: "Therapeutic" },
  { value: "follow-up", label: "Follow-up" },
  { value: "emergency", label: "Emergency" },
  { value: "other", label: "Other" },
];

const CONTRAST_TYPES = [
  { value: "iodinated", label: "Iodinated" },
  { value: "gadolinium", label: "Gadolinium" },
  { value: "barium", label: "Barium" },
  { value: "other", label: "Other" },
];

const COMMON_BODY_PARTS = [
  { value: "head", label: "Head" },
  { value: "neck", label: "Neck" },
  { value: "chest", label: "Chest" },
  { value: "abdomen", label: "Abdomen" },
  { value: "pelvis", label: "Pelvis" },
  { value: "spine", label: "Spine" },
  { value: "upper-extremity", label: "Upper Extremity" },
  { value: "lower-extremity", label: "Lower Extremity" },
  { value: "other", label: "Other" },
];

interface ParameterField {
  parameterCode: string;
  parameterName: string;
  description?: string;
  normalFindings?: string;
  unit?: string;
}

interface FormValues {
  templateCode: string;
  examName: string;
  serviceType: string;
  category: string;
  bodyPart?: string;
  views: string[];
  description?: string;
  contrastRequired: boolean;
  contrastType?: string;
  preparationInstructions?: string;
  duration: number;
  basePrice: number;
  active: boolean;
  parameters: ParameterField[];
  clinicalIndicationTemplate?: string;
  techniqueTemplate?: string;
  comparisonTemplate?: string;
  findingsTemplate?: string;
  impressionTemplate?: string;
  recommendationTemplate?: string;
  criticalFindingsChecklist?: string[];
}

interface RadiologyTemplateFormProps {
  template?: Partial<FormValues> & { _id?: string };
  onClose: () => void;
  onSuccess?: () => void;
}

export function RadiologyTemplateForm({
  template,
  onClose,
  onSuccess,
}: RadiologyTemplateFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [views, setViews] = useState<string[]>(template?.views || []);
  const [parameters, setParameters] = useState<ParameterField[]>(
    template?.parameters || [],
  );

  const createMutation = useCreateRadiologyTemplate();
  const updateMutation = useUpdateRadiologyTemplate();

  const isEditing = !!template?._id;

  const form = useForm<FormValues>({
    defaultValues: {
      templateCode: template?.templateCode || "",
      examName: template?.examName || "",
      serviceType: template?.serviceType || "x-ray",
      category: template?.category || "",
      bodyPart: template?.bodyPart || "",
      views: views,
      description: template?.description || "",
      contrastRequired: template?.contrastRequired || false,
      contrastType: template?.contrastType || "",
      preparationInstructions: template?.preparationInstructions || "",
      duration: template?.duration || 15,
      basePrice: template?.basePrice || 0,
      active: template?.active ?? true,
      parameters: parameters,
      clinicalIndicationTemplate: template?.clinicalIndicationTemplate || "",
      techniqueTemplate: template?.techniqueTemplate || "",
      comparisonTemplate: template?.comparisonTemplate || "",
      findingsTemplate: template?.findingsTemplate || "",
      impressionTemplate: template?.impressionTemplate || "",
      recommendationTemplate: template?.recommendationTemplate || "",
      criticalFindingsChecklist: template?.criticalFindingsChecklist || [],
    },
  });

  const contrastRequired = form.watch("contrastRequired");

  const addView = () => {
    setViews([...views, ""]);
  };

  const removeView = (index: number) => {
    const newViews = [...views];
    newViews.splice(index, 1);
    setViews(newViews);
  };

  const addParameter = () => {
    setParameters([
      ...parameters,
      { parameterCode: "", parameterName: "", unit: "", normalFindings: "" },
    ]);
  };

  const removeParameter = (index: number) => {
    const newParams = [...parameters];
    newParams.splice(index, 1);
    setParameters(newParams);
  };

  async function onSubmit(data: FormValues) {
    setIsSubmitting(true);
    try {
      // Clean up the data
      const cleanedData = {
        ...data,
        templateCode: data.templateCode.toUpperCase(),
        views: views.filter((v) => v.trim() !== ""),
        parameters: parameters.filter(
          (p) => p.parameterCode.trim() !== "" && p.parameterName.trim() !== "",
        ),
        clinicalIndicationTemplate: data.clinicalIndicationTemplate?.trim() || "",
        techniqueTemplate: data.techniqueTemplate?.trim() || "",
        comparisonTemplate: data.comparisonTemplate?.trim() || "",
        findingsTemplate: data.findingsTemplate?.trim() || "",
        impressionTemplate: data.impressionTemplate?.trim() || "",
        recommendationTemplate: data.recommendationTemplate?.trim() || "",
        criticalFindingsChecklist: (data.criticalFindingsChecklist || [])
          .map((item) => item.trim())
          .filter(Boolean),
      };

      if (isEditing) {
        await updateMutation.mutateAsync({
          id: template._id!,
          data: cleanedData,
        });
        toast.success("Template updated successfully");
      } else {
        await createMutation.mutateAsync(cleanedData);
        toast.success("Template created successfully");
      }
      onSuccess?.();
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Failed to save template");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="templateCode"
            render={({ field }: { field: any }) => (
              <FormItem>
                <FormLabel>Template Code *</FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g., XR-CHEST-AP"
                    {...field}
                    disabled={isEditing}
                    onChange={(e) =>
                      field.onChange(e.target.value.toUpperCase())
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="examName"
            render={({ field }: { field: any }) => (
              <FormItem>
                <FormLabel>Exam Name *</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Chest X-Ray (AP View)" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="serviceType"
            render={({ field }: { field: any }) => (
              <FormItem>
                <FormLabel>Service Type *</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select service type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {SERVICE_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="category"
            render={({ field }: { field: any }) => (
              <FormItem>
                <FormLabel>Category *</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="bodyPart"
            render={({ field }: { field: any }) => (
              <FormItem>
                <FormLabel>Body Part</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select body part" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {COMMON_BODY_PARTS.map((part) => (
                      <SelectItem key={part.value} value={part.value}>
                        {part.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="duration"
            render={({ field }: { field: any }) => (
              <FormItem>
                <FormLabel>Duration (minutes) *</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    max={480}
                    {...field}
                    onChange={(e) =>
                      field.onChange(parseInt(e.target.value) || 0)
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Views Array */}
        <div className="space-y-3">
          <FormLabel>Views</FormLabel>
          <div className="flex flex-wrap gap-2">
            {views.map((view, index) => (
              <div
                key={index}
                className="flex items-center gap-2 bg-secondary rounded-md px-3 py-1"
              >
                <Input
                  value={view}
                  placeholder="View name"
                  className="h-8 w-32"
                  onChange={(e) => {
                    const newViews = [...views];
                    newViews[index] = e.target.value;
                    setViews(newViews);
                  }}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => removeView(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addView}>
              <Plus className="h-4 w-4 mr-1" />
              Add View
            </Button>
          </div>
        </div>

        {/* Description */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }: { field: any }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter exam description..."
                  className="resize-none"
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Comprehensive Report Templates */}
        <div className="space-y-4 rounded-md border p-4">
          <h3 className="font-medium">Comprehensive Report Templates</h3>
          <p className="text-sm text-muted-foreground">
            These fields prefill report drafting for radiologists.
          </p>

          <FormField
            control={form.control}
            name="clinicalIndicationTemplate"
            render={({ field }: { field: any }) => (
              <FormItem>
                <FormLabel>Clinical Indication Template</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Default clinical indication text..."
                    rows={2}
                    className="resize-none"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="techniqueTemplate"
            render={({ field }: { field: any }) => (
              <FormItem>
                <FormLabel>Technique Template</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Default technique/protocol text..."
                    rows={2}
                    className="resize-none"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="comparisonTemplate"
            render={({ field }: { field: any }) => (
              <FormItem>
                <FormLabel>Comparison Template</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Comparison with previous study..."
                    rows={2}
                    className="resize-none"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="findingsTemplate"
            render={({ field }: { field: any }) => (
              <FormItem>
                <FormLabel>Findings Template</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Structured findings template..."
                    rows={4}
                    className="resize-none"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="impressionTemplate"
            render={({ field }: { field: any }) => (
              <FormItem>
                <FormLabel>Impression Template</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Standard impression template..."
                    rows={3}
                    className="resize-none"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="recommendationTemplate"
            render={({ field }: { field: any }) => (
              <FormItem>
                <FormLabel>Recommendation Template</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Follow-up recommendations..."
                    rows={3}
                    className="resize-none"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="criticalFindingsChecklist"
            render={({ field }: { field: any }) => (
              <FormItem>
                <FormLabel>Critical Findings Checklist</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Comma-separated e.g. pneumothorax, acute bleed"
                    value={(field.value || []).join(", ")}
                    onChange={(e) =>
                      field.onChange(
                        e.target.value
                          .split(",")
                          .map((item) => item.trim())
                          .filter(Boolean),
                      )
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Contrast Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="contrastRequired"
            render={({ field }: { field: any }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Contrast Required</FormLabel>
                </div>
              </FormItem>
            )}
          />

          {contrastRequired && (
            <FormField
              control={form.control}
              name="contrastType"
              render={({ field }: { field: any }) => (
                <FormItem>
                  <FormLabel>Contrast Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select contrast type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CONTRAST_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        {/* Preparation Instructions */}
        <FormField
          control={form.control}
          name="preparationInstructions"
          render={({ field }: { field: any }) => (
            <FormItem>
              <FormLabel>Preparation Instructions</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter preparation instructions for the patient..."
                  className="resize-none"
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Pricing */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="basePrice"
            render={({ field }: { field: any }) => (
              <FormItem>
                <FormLabel>Base Price *</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    placeholder="0.00"
                    {...field}
                    onChange={(e) =>
                      field.onChange(parseFloat(e.target.value) || 0)
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="active"
            render={({ field }: { field: any }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Active</FormLabel>
                </div>
              </FormItem>
            )}
          />
        </div>

        {/* Parameters Array */}
        <div className="space-y-3">
          <FormLabel>Parameters (Optional)</FormLabel>
          {parameters.map((param, index) => (
            <div
              key={index}
              className="grid grid-cols-1 md:grid-cols-5 gap-2 p-4 border rounded-md"
            >
              <Input
                value={param.parameterCode}
                placeholder="Code"
                className="h-8"
                onChange={(e) => {
                  const newParams = [...parameters];
                  newParams[index].parameterCode = e.target.value;
                  setParameters(newParams);
                }}
              />
              <Input
                value={param.parameterName}
                placeholder="Name"
                className="h-8"
                onChange={(e) => {
                  const newParams = [...parameters];
                  newParams[index].parameterName = e.target.value;
                  setParameters(newParams);
                }}
              />
              <Input
                value={param.unit || ""}
                placeholder="Unit"
                className="h-8"
                onChange={(e) => {
                  const newParams = [...parameters];
                  newParams[index].unit = e.target.value;
                  setParameters(newParams);
                }}
              />
              <Input
                value={param.normalFindings || ""}
                placeholder="Normal findings"
                className="h-8"
                onChange={(e) => {
                  const newParams = [...parameters];
                  newParams[index].normalFindings = e.target.value;
                  setParameters(newParams);
                }}
              />
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => removeParameter(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addParameter}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Parameter
          </Button>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : isEditing ? "Update" : "Create"}{" "}
            Template
          </Button>
        </div>
      </form>
    </Form>
  );
}
