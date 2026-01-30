// app/components/doctor/LabTestOrderDialog.tsx - INLINE LAYOUT FOR TEST FIELDS

"use client";

import { useState, useEffect, useRef } from "react";
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
import {
  Loader2,
  Plus,
  TestTube,
  Search,
  X,
  CheckCircle2,
  Clock,
  Droplet,
  AlertCircle,
} from "lucide-react";
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

interface LabTestTemplate {
  _id: string;
  testCode: string;
  testName: string;
  category: string;
  description?: string;
  specimenType?: string[];
  containerType?: string[];
  sampleVolume?: string;
  fastingRequired?: boolean;
  preparationInstructions?: string;
  turnaroundTime?: string;
  basePrice?: number;
  active?: boolean;
  parameters?: any[];
}

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
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<LabTestTemplate[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [selectedTemplate, setSelectedTemplate] =
    useState<LabTestTemplate | null>(null);
  const { accessToken } = useAuthStore();
  const searchDropdownRef = useRef<HTMLDivElement>(null);

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
      setSearchQuery("");
      setSearchResults([]);
      setShowSearchResults(false);
      setSelectedTemplate(null);
    }
    setOpen(isOpen);
  };

  // Debounced search function
  useEffect(() => {
    const debounceTimer = setTimeout(async () => {
      if (searchQuery.trim().length >= 2) {
        setSearchLoading(true);
        try {
          const response = await fetch(
            `/api/laboratory/templates?search=${encodeURIComponent(searchQuery)}`,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            },
          );

          const result = await response.json();

          if (result.success && result.data) {
            setSearchResults(result.data);
            setShowSearchResults(true);
          } else {
            setSearchResults([]);
          }
        } catch (error) {
          console.error("Error fetching templates:", error);
          setSearchResults([]);
        } finally {
          setSearchLoading(false);
        }
      } else {
        setSearchResults([]);
        setShowSearchResults(false);
      }
    }, 300); // 300ms debounce delay

    return () => clearTimeout(debounceTimer);
  }, [searchQuery, accessToken]);

  // Handle template selection
  const handleSelectTemplate = (template: LabTestTemplate) => {
    setSelectedTemplate(template);
    setValue("testName", template.testName);
    setValue("category", template.category);

    // Combine description and preparation instructions for notes
    const notesParts: string[] = [];
    if (template.description) {
      notesParts.push(`Description: ${template.description}`);
    }
    if (template.preparationInstructions) {
      notesParts.push(`Preparation: ${template.preparationInstructions}`);
    }
    setValue("notes", notesParts.join("\n\n"));

    setSearchQuery("");
    setSearchResults([]);
    setShowSearchResults(false);
  };

  // Clear selected template
  const handleClearTemplate = () => {
    setSelectedTemplate(null);
    setValue("testName", "");
    setValue("category", "");
    setValue("notes", "");
  };

  // Handle click outside search dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchDropdownRef.current &&
        !searchDropdownRef.current.contains(event.target as Node)
      ) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
          {/* Search Lab Test Templates */}
          <div className="space-y-3" ref={searchDropdownRef}>
            <Label className="text-sm font-medium">
              Search Lab Test Templates
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by test name, code, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchQuery && setShowSearchResults(true)}
                className="pl-10"
              />
              {searchLoading && (
                <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
              {searchQuery && !searchLoading && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setSearchResults([]);
                    setShowSearchResults(false);
                  }}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Search Results Dropdown */}
            {showSearchResults && searchResults.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
                {searchResults.map((template) => (
                  <button
                    key={template._id}
                    type="button"
                    onClick={() => handleSelectTemplate(template)}
                    className="w-full px-4 py-3 text-left hover:bg-muted transition-colors border-b border-border last:border-b-0"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {template.testName}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">
                            Code: {template.testCode}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            •
                          </span>
                          <span className="text-xs text-muted-foreground capitalize">
                            {template.category.replace(/_/g, " ")}
                          </span>
                        </div>
                        {template.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {template.description}
                          </p>
                        )}
                      </div>
                      <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    </div>
                  </button>
                ))}
              </div>
            )}

            {showSearchResults &&
              searchResults.length === 0 &&
              !searchLoading && (
                <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-md shadow-lg p-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    No templates found matching "{searchQuery}"
                  </p>
                </div>
              )}
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

          {/* Selected Template Details (Read-only) */}
          {selectedTemplate && (
            <div className="space-y-4 p-4 bg-muted/50 rounded-lg border border-border">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  Template Details
                </h4>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleClearTemplate}
                  className="h-8 text-xs"
                >
                  <X className="h-3 w-3 mr-1" />
                  Clear
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Specimen Type */}
                {selectedTemplate.specimenType &&
                  selectedTemplate.specimenType.length > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Droplet className="h-3 w-3" />
                        <span className="font-medium">Specimen Type</span>
                      </div>
                      <p className="text-sm">
                        {selectedTemplate.specimenType.join(", ")}
                      </p>
                    </div>
                  )}

                {/* Sample Volume */}
                {selectedTemplate.sampleVolume && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Droplet className="h-3 w-3" />
                      <span className="font-medium">Sample Volume</span>
                    </div>
                    <p className="text-sm">{selectedTemplate.sampleVolume}</p>
                  </div>
                )}

                {/* Fasting Required */}
                {selectedTemplate.fastingRequired !== undefined && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <AlertCircle className="h-3 w-3" />
                      <span className="font-medium">Fasting Required</span>
                    </div>
                    <p className="text-sm">
                      {selectedTemplate.fastingRequired ? (
                        <span className="text-amber-600 font-medium">Yes</span>
                      ) : (
                        <span className="text-green-600 font-medium">No</span>
                      )}
                    </p>
                  </div>
                )}

                {/* Turnaround Time */}
                {selectedTemplate.turnaroundTime && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span className="font-medium">Turnaround Time</span>
                    </div>
                    <p className="text-sm">{selectedTemplate.turnaroundTime}</p>
                  </div>
                )}

                {/* Base Price */}
                {selectedTemplate.basePrice !== undefined && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="font-medium">Base Price</span>
                    </div>
                    <p className="text-sm font-semibold text-primary">
                      {selectedTemplate.basePrice.toLocaleString()} AFN
                    </p>
                  </div>
                )}

                {/* Test Code */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="font-medium">Test Code</span>
                  </div>
                  <p className="text-sm font-mono bg-background px-2 py-1 rounded border border-border inline-block">
                    {selectedTemplate.testCode}
                  </p>
                </div>
              </div>

              {/* Parameters (if available) */}
              {selectedTemplate.parameters &&
                selectedTemplate.parameters.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-border">
                    <p className="text-xs font-medium text-muted-foreground">
                      Parameters ({selectedTemplate.parameters.length})
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {selectedTemplate.parameters.map(
                        (param: any, index: number) => (
                          <span
                            key={index}
                            className="text-xs bg-background px-2 py-1 rounded border border-border"
                          >
                            {param.name ||
                              param.parameterName ||
                              `Parameter ${index + 1}`}
                          </span>
                        ),
                      )}
                    </div>
                  </div>
                )}
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
