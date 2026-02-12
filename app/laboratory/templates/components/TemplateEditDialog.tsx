// app/laboratory/templates/components/TemplateEditDialog.tsx

"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Loader2, AlertCircle } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";

interface LabTestTemplate {
  _id: string;
  testCode: string;
  testName: string;
  category: string;
  description?: string;
  specimenType: string[];
  containerType?: string[];
  sampleVolume?: string;
  fastingRequired: boolean;
  preparationInstructions?: string;
  turnaroundTime: number;
  basePrice: number;
  active: boolean;
  parameters: Array<{
    parameterCode: string;
    parameterName: string;
    unit?: string;
    normalRange: string;
    criticalLow?: number;
    criticalHigh?: number;
    maleRange?: string;
    femaleRange?: string;
    childRange?: string;
    methodology?: string;
  }>;
  createdBy: {
    _id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface TemplateEditDialogProps {
  template: LabTestTemplate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

// Category options
const CATEGORIES = [
  "hematology",
  "biochemistry",
  "microbiology",
  "serology",
  "immunology",
  "hormonal",
  "urinalysis",
  "stool_test",
  "molecular",
  "imaging",
  "other",
];

// Specimen type options
const SPECIMEN_TYPES = [
  "blood",
  "urine",
  "stool",
  "csf",
  "sputum",
  "tissue",
  "swab",
  "other",
];

// Container type options
const CONTAINER_TYPES = [
  "EDTA Tube",
  "Plain Tube",
  "Fluoride Tube",
  "Sodium Citrate Tube",
  "Heparin Tube",
  "Sterile Container",
  "Urine Container",
  "Stool Container",
  "Swab Container",
  "Other",
];

interface FormData {
  testName: string;
  category: string;
  description: string;
  specimenType: string[];
  containerType: string[];
  sampleVolume: string;
  fastingRequired: boolean;
  preparationInstructions: string;
  turnaroundTime: number;
  basePrice: number;
  parameters: Array<{
    parameterCode: string;
    parameterName: string;
    unit: string;
    normalRange: string;
    criticalLow: string;
    criticalHigh: string;
    maleRange: string;
    femaleRange: string;
    childRange: string;
    methodology: string;
  }>;
}

export function TemplateEditDialog({
  template,
  open,
  onOpenChange,
  onSuccess,
}: TemplateEditDialogProps) {
  const { accessToken } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    testName: "",
    category: "",
    description: "",
    specimenType: [],
    containerType: [],
    sampleVolume: "",
    fastingRequired: false,
    preparationInstructions: "",
    turnaroundTime: 24,
    basePrice: 0,
    parameters: [],
  });

  // Initialize form with template data
  useEffect(() => {
    if (template && open) {
      setFormData({
        testName: template.testName,
        category: template.category,
        description: template.description || "",
        specimenType: template.specimenType,
        containerType: template.containerType || [],
        sampleVolume: template.sampleVolume || "",
        fastingRequired: template.fastingRequired,
        preparationInstructions: template.preparationInstructions || "",
        turnaroundTime: template.turnaroundTime,
        basePrice: template.basePrice,
        parameters: (template.parameters || []).map((p) => ({
          parameterCode: p.parameterCode || "",
          parameterName: p.parameterName || "",
          unit: p.unit || "",
          normalRange: p.normalRange || "",
          criticalLow: p.criticalLow !== undefined ? String(p.criticalLow) : "",
          criticalHigh:
            p.criticalHigh !== undefined ? String(p.criticalHigh) : "",
          maleRange: p.maleRange || "",
          femaleRange: p.femaleRange || "",
          childRange: p.childRange || "",
          methodology: p.methodology || "",
        })),
      });
      setError(null);
      setSuccess(null);
    }
  }, [template, open]);

  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSpecimenToggle = (specimen: string) => {
    const current = formData.specimenType;
    if (current.includes(specimen)) {
      handleInputChange(
        "specimenType",
        current.filter((s) => s !== specimen),
      );
    } else {
      handleInputChange("specimenType", [...current, specimen]);
    }
  };

  const handleContainerToggle = (container: string) => {
    const current = formData.containerType;
    if (current.includes(container)) {
      handleInputChange(
        "containerType",
        current.filter((c) => c !== container),
      );
    } else {
      handleInputChange("containerType", [...current, container]);
    }
  };

  const addParameter = () => {
    handleInputChange("parameters", [
      ...formData.parameters,
      {
        parameterCode: "",
        parameterName: "",
        unit: "",
        normalRange: "",
        criticalLow: "",
        criticalHigh: "",
        maleRange: "",
        femaleRange: "",
        childRange: "",
        methodology: "",
      },
    ]);
  };

  const removeParameter = (index: number) => {
    handleInputChange(
      "parameters",
      formData.parameters.filter((_, i) => i !== index),
    );
  };

  const updateParameter = (index: number, field: string, value: string) => {
    const updated = formData.parameters.map((p, i) =>
      i === index ? { ...p, [field]: value } : p,
    );
    handleInputChange("parameters", updated);
  };

  const handleSubmit = async () => {
    if (!template || !accessToken) return;

    // Basic validation
    if (!formData.testName.trim()) {
      setError("Test name is required");
      return;
    }
    if (!formData.category) {
      setError("Category is required");
      return;
    }
    if (formData.specimenType.length === 0) {
      setError("At least one specimen type is required");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Prepare data for API
      const submitData = {
        ...formData,
        turnaroundTime: Number(formData.turnaroundTime),
        basePrice: Number(formData.basePrice),
        parameters: formData.parameters
          .filter((p) => p.parameterName.trim() || p.normalRange.trim())
          .map((p) => ({
            parameterCode: p.parameterCode || undefined,
            parameterName: p.parameterName || undefined,
            unit: p.unit || undefined,
            normalRange: p.normalRange || undefined,
            criticalLow: p.criticalLow ? Number(p.criticalLow) : undefined,
            criticalHigh: p.criticalHigh ? Number(p.criticalHigh) : undefined,
            maleRange: p.maleRange || undefined,
            femaleRange: p.femaleRange || undefined,
            childRange: p.childRange || undefined,
            methodology: p.methodology || undefined,
          })),
      };

      const response = await fetch(
        `/api/laboratory/templates/${template._id}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(submitData),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update template");
      }

      setSuccess("Template updated successfully");

      // Close dialog after brief delay to show success message
      setTimeout(() => {
        onSuccess();
        onOpenChange(false);
      }, 1000);
    } catch (err: any) {
      setError(err.message || "Failed to update template");
      console.error("Error updating template:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!template) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] lg:max-w-6xl max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader>
          <DialogTitle>Edit Template</DialogTitle>
          <DialogDescription>
            Modify template information. Test code{" "}
            <span className="font-mono font-semibold">{template.testCode}</span>{" "}
            cannot be changed.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
            {success}
          </div>
        )}

        <div className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="testName">Test Name *</Label>
                  <Input
                    id="testName"
                    value={formData.testName}
                    onChange={(e) =>
                      handleInputChange("testName", e.target.value)
                    }
                    placeholder="Complete Blood Count"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) =>
                      handleInputChange("category", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((category) => (
                        <SelectItem key={category} value={category}>
                          <span className="capitalize">
                            {category.replace(/_/g, " ")}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    handleInputChange("description", e.target.value)
                  }
                  placeholder="Brief description of the test..."
                  className="resize-none"
                />
              </div>
            </CardContent>
          </Card>

          {/* Specimen Details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Specimen Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Specimen Type *</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {SPECIMEN_TYPES.map((specimen) => {
                      const isSelected =
                        formData.specimenType.includes(specimen);
                      return (
                        <Badge
                          key={specimen}
                          variant={isSelected ? "default" : "outline"}
                          className={`cursor-pointer px-3 py-1 ${
                            isSelected ? "bg-primary" : ""
                          }`}
                          onClick={() => handleSpecimenToggle(specimen)}
                        >
                          {specimen.charAt(0).toUpperCase() + specimen.slice(1)}
                        </Badge>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Container Type</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {CONTAINER_TYPES.map((container) => {
                      const isSelected =
                        formData.containerType.includes(container);
                      return (
                        <Badge
                          key={container}
                          variant={isSelected ? "default" : "outline"}
                          className={`cursor-pointer px-3 py-1 ${
                            isSelected ? "bg-primary" : ""
                          }`}
                          onClick={() => handleContainerToggle(container)}
                        >
                          {container}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sampleVolume">Sample Volume</Label>
                  <Input
                    id="sampleVolume"
                    value={formData.sampleVolume}
                    onChange={(e) =>
                      handleInputChange("sampleVolume", e.target.value)
                    }
                    placeholder="e.g., 5ml"
                  />
                </div>

                <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <Label className="text-base">Fasting Required</Label>
                    <div className="text-sm text-muted-foreground">
                      Patient should fast before sample collection
                    </div>
                  </div>
                  <Switch
                    checked={formData.fastingRequired}
                    onCheckedChange={(checked) =>
                      handleInputChange("fastingRequired", checked)
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Instructions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Instructions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="preparationInstructions">
                  Preparation Instructions
                </Label>
                <Textarea
                  id="preparationInstructions"
                  value={formData.preparationInstructions}
                  onChange={(e) =>
                    handleInputChange("preparationInstructions", e.target.value)
                  }
                  placeholder="Special instructions for sample collection and patient preparation..."
                  className="resize-none"
                />
              </div>
            </CardContent>
          </Card>

          {/* Pricing & TAT */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Pricing & Turnaround Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="basePrice">Base Price (₹) *</Label>
                  <Input
                    id="basePrice"
                    type="number"
                    value={formData.basePrice}
                    onChange={(e) =>
                      handleInputChange("basePrice", e.target.value)
                    }
                    placeholder="0"
                    min="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="turnaroundTime">
                    Turnaround Time (hours) *
                  </Label>
                  <Input
                    id="turnaroundTime"
                    type="number"
                    value={formData.turnaroundTime}
                    onChange={(e) =>
                      handleInputChange("turnaroundTime", e.target.value)
                    }
                    placeholder="24"
                    min="1"
                    max="720"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Parameters */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Test Parameters</CardTitle>
                  <CardDescription>
                    Add or remove parameters for this test template
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addParameter}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Parameter
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {formData.parameters.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No parameters added yet. Click "Add Parameter" to add one.
                </div>
              ) : (
                <div className="space-y-4">
                  {formData.parameters.map((param, index) => (
                    <div
                      key={index}
                      className="p-4 border rounded-lg space-y-4 relative"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-sm">
                          Parameter #{index + 1}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => removeParameter(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="space-y-2">
                          <Label>Code</Label>
                          <Input
                            value={param.parameterCode}
                            onChange={(e) =>
                              updateParameter(
                                index,
                                "parameterCode",
                                e.target.value,
                              )
                            }
                            placeholder="e.g., WBC"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Name</Label>
                          <Input
                            value={param.parameterName}
                            onChange={(e) =>
                              updateParameter(
                                index,
                                "parameterName",
                                e.target.value,
                              )
                            }
                            placeholder="e.g., White Blood Cell Count"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Unit</Label>
                          <Input
                            value={param.unit}
                            onChange={(e) =>
                              updateParameter(index, "unit", e.target.value)
                            }
                            placeholder="e.g., cells/µL"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label>Normal Range</Label>
                          <Input
                            value={param.normalRange}
                            onChange={(e) =>
                              updateParameter(
                                index,
                                "normalRange",
                                e.target.value,
                              )
                            }
                            placeholder="e.g., 4,500-11,000"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Methodology</Label>
                          <Input
                            value={param.methodology}
                            onChange={(e) =>
                              updateParameter(
                                index,
                                "methodology",
                                e.target.value,
                              )
                            }
                            placeholder="e.g., Automated Cell Counter"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label>Critical Low</Label>
                          <Input
                            type="number"
                            value={param.criticalLow}
                            onChange={(e) =>
                              updateParameter(
                                index,
                                "criticalLow",
                                e.target.value,
                              )
                            }
                            placeholder="e.g., 1000"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Critical High</Label>
                          <Input
                            type="number"
                            value={param.criticalHigh}
                            onChange={(e) =>
                              updateParameter(
                                index,
                                "criticalHigh",
                                e.target.value,
                              )
                            }
                            placeholder="e.g., 30000"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="space-y-2">
                          <Label>Male Range</Label>
                          <Input
                            value={param.maleRange}
                            onChange={(e) =>
                              updateParameter(
                                index,
                                "maleRange",
                                e.target.value,
                              )
                            }
                            placeholder="Male normal range"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Female Range</Label>
                          <Input
                            value={param.femaleRange}
                            onChange={(e) =>
                              updateParameter(
                                index,
                                "femaleRange",
                                e.target.value,
                              )
                            }
                            placeholder="Female normal range"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Child Range</Label>
                          <Input
                            value={param.childRange}
                            onChange={(e) =>
                              updateParameter(
                                index,
                                "childRange",
                                e.target.value,
                              )
                            }
                            placeholder="Child/Pediatric range"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Separator />

          <DialogFooter className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
