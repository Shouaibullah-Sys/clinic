// app/components/radiologist/AddTestsDialog.tsx

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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";

// Define validation schema with Zod
const testsSchema = z.object({
  notes: z.string().optional(),
});

type TestsFormValues = z.infer<typeof testsSchema>;

interface Test {
  name: string;
  description: string;
  performed: boolean;
  performedAt: string | null;
  notes: string;
}

interface Parameter {
  name: string;
  value: string;
  unit: string;
  normalRange: string;
  remarks: string;
}

interface RadiologyRequest {
  _id: string;
  serviceId: string;
  serviceType: string;
  bodyPart: string;
  view: string;
  patient: {
    _id: string;
    name: string;
    patientId: string;
  };
  referringDoctor: {
    _id: string;
    name: string;
  };
  status: string;
  priority: string;
  notes?: string;
}

interface AddTestsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: RadiologyRequest;
  onTestsAdded: () => void;
}

export function AddTestsDialog({
  open,
  onOpenChange,
  request,
  onTestsAdded,
}: AddTestsDialogProps) {
  const [loading, setLoading] = useState(false);
  const [tests, setTests] = useState<Test[]>([]);
  const [parameters, setParameters] = useState<Parameter[]>([]);
  const { accessToken } = useAuthStore();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TestsFormValues>({
    resolver: zodResolver(testsSchema),
    defaultValues: {
      notes: "",
    },
  });

  const addTest = () => {
    setTests([
      ...tests,
      {
        name: "",
        description: "",
        performed: false,
        performedAt: null,
        notes: "",
      },
    ]);
  };

  const removeTest = (index: number) => {
    setTests(tests.filter((_, i) => i !== index));
  };

  const updateTest = (index: number, field: keyof Test, value: any) => {
    const updatedTests = [...tests] as Test[];
    (updatedTests[index] as any)[field] = value;
    setTests(updatedTests);
  };

  const addParameter = () => {
    setParameters([
      ...parameters,
      {
        name: "",
        value: "",
        unit: "",
        normalRange: "",
        remarks: "",
      },
    ]);
  };

  const removeParameter = (index: number) => {
    setParameters(parameters.filter((_, i) => i !== index));
  };

  const updateParameter = (index: number, field: keyof Parameter, value: any) => {
    const updatedParameters = [...parameters] as Parameter[];
    (updatedParameters[index] as any)[field] = value;
    setParameters(updatedParameters);
  };

  const onSubmit = async (data: TestsFormValues) => {
    try {
      setLoading(true);

      const requestData = {
        tests,
        parameters,
        notes: data.notes,
      };

      const response = await fetch(`/api/radiologist/requests/${request._id}/tests`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(requestData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to add tests/parameters");
      }

      if (result.success) {
        onTestsAdded();
        reset();
        setTests([]);
        setParameters([]);
      }
    } catch (error: any) {
      console.error("Error adding tests/parameters:", error);
      toast.error("Failed to Add Tests/Parameters", {
        description: error.message || "An error occurred while adding tests/parameters",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      reset();
      setTests([]);
      setParameters([]);
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[90vw] lg:max-w-[800px] max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-xl">Add Tests and Parameters</DialogTitle>
          <DialogDescription>
            Add tests and parameters for <span className="font-medium">{request.serviceId}</span>
            <br />
            <span className="text-sm text-muted-foreground">
              {request.patient.name} - {request.serviceType.toUpperCase()} - {request.bodyPart}
            </span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Tests Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Tests</Label>
              <Button type="button" variant="outline" size="sm" onClick={addTest}>
                <Plus className="h-4 w-4 mr-2" />
                Add Test
              </Button>
            </div>

            {tests.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed rounded-lg">
                <p className="text-sm text-muted-foreground">No tests added yet</p>
                <Button type="button" variant="ghost" size="sm" onClick={addTest} className="mt-2">
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Test
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {tests.map((test, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Test {index + 1}</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeTest(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor={`test-name-${index}`} className="text-xs">
                          Test Name *
                        </Label>
                        <Input
                          id={`test-name-${index}`}
                          value={test.name}
                          onChange={(e) => updateTest(index, "name", e.target.value)}
                          placeholder="Enter test name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`test-performed-${index}`} className="text-xs">
                          Performed
                        </Label>
                        <Input
                          id={`test-performed-${index}`}
                          type="datetime-local"
                          value={test.performedAt || ""}
                          onChange={(e) => updateTest(index, "performedAt", e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`test-description-${index}`} className="text-xs">
                        Description
                      </Label>
                      <Textarea
                        id={`test-description-${index}`}
                        value={test.description}
                        onChange={(e) => updateTest(index, "description", e.target.value)}
                        placeholder="Enter test description"
                        rows={2}
                        className="resize-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`test-notes-${index}`} className="text-xs">
                        Notes
                      </Label>
                      <Textarea
                        id={`test-notes-${index}`}
                        value={test.notes}
                        onChange={(e) => updateTest(index, "notes", e.target.value)}
                        placeholder="Enter test notes"
                        rows={2}
                        className="resize-none"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Parameters Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Parameters</Label>
              <Button type="button" variant="outline" size="sm" onClick={addParameter}>
                <Plus className="h-4 w-4 mr-2" />
                Add Parameter
              </Button>
            </div>

            {parameters.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed rounded-lg">
                <p className="text-sm text-muted-foreground">No parameters added yet</p>
                <Button type="button" variant="ghost" size="sm" onClick={addParameter} className="mt-2">
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Parameter
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {parameters.map((param, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Parameter {index + 1}</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeParameter(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor={`param-name-${index}`} className="text-xs">
                          Parameter Name *
                        </Label>
                        <Input
                          id={`param-name-${index}`}
                          value={param.name}
                          onChange={(e) => updateParameter(index, "name", e.target.value)}
                          placeholder="Enter parameter name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`param-value-${index}`} className="text-xs">
                          Value *
                        </Label>
                        <Input
                          id={`param-value-${index}`}
                          value={param.value}
                          onChange={(e) => updateParameter(index, "value", e.target.value)}
                          placeholder="Enter value"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor={`param-unit-${index}`} className="text-xs">
                          Unit
                        </Label>
                        <Input
                          id={`param-unit-${index}`}
                          value={param.unit}
                          onChange={(e) => updateParameter(index, "unit", e.target.value)}
                          placeholder="Enter unit"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`param-normal-${index}`} className="text-xs">
                          Normal Range
                        </Label>
                        <Input
                          id={`param-normal-${index}`}
                          value={param.normalRange}
                          onChange={(e) => updateParameter(index, "normalRange", e.target.value)}
                          placeholder="Enter normal range"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`param-remarks-${index}`} className="text-xs">
                        Remarks
                      </Label>
                      <Textarea
                        id={`param-remarks-${index}`}
                        value={param.remarks}
                        onChange={(e) => updateParameter(index, "remarks", e.target.value)}
                        placeholder="Enter remarks"
                        rows={2}
                        className="resize-none"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes Section */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-medium">
              Additional Notes
            </Label>
            <Textarea
              id="notes"
              {...register("notes")}
              placeholder="Any additional notes or instructions..."
              rows={3}
              className="resize-none"
            />
          </div>

          <DialogFooter className="pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={loading}
              className="px-6"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="px-8">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Save Tests & Parameters
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
