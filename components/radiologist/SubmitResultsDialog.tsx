// app/components/radiologist/SubmitResultsDialog.tsx

"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
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
import { Loader2, FileText } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";

// Define validation schema with Zod
const resultsSchema = z.object({
  findings: z.string().min(1, "Findings are required"),
  impression: z.string().min(1, "Impression is required"),
  recommendations: z.string().optional(),
});

type ResultsFormValues = z.infer<typeof resultsSchema>;

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
  findings?: string;
  impression?: string;
  recommendations?: string;
}

interface SubmitResultsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: RadiologyRequest;
  onResultsSubmitted: () => void;
}

export function SubmitResultsDialog({
  open,
  onOpenChange,
  request,
  onResultsSubmitted,
}: SubmitResultsDialogProps) {
  const [loading, setLoading] = useState(false);
  const { accessToken } = useAuthStore();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ResultsFormValues>({
    resolver: zodResolver(resultsSchema),
    defaultValues: {
      findings: request.findings || "",
      impression: request.impression || "",
      recommendations: request.recommendations || "",
    },
  });

  const onSubmit = async (data: ResultsFormValues) => {
    try {
      setLoading(true);

      const requestData = {
        findings: data.findings,
        impression: data.impression,
        recommendations: data.recommendations,
        status: "completed",
        reportStatus: "completed",
      };

      const response = await fetch(`/api/radiologist/requests/${request._id}/results`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(requestData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to submit results");
      }

      if (result.success) {
        onResultsSubmitted();
        reset();
      }
    } catch (error: any) {
      console.error("Error submitting results:", error);
      toast.error("Failed to Submit Results", {
        description: error.message || "An error occurred while submitting results",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      reset();
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[90vw] lg:max-w-[800px] max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader className="pb-4">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FileText className="h-5 w-5" />
            Submit Radiology Results
          </DialogTitle>
          <DialogDescription>
            Submit results for <span className="font-medium">{request.serviceId}</span>
            <br />
            <span className="text-sm text-muted-foreground">
              {request.patient.name} - {request.serviceType.toUpperCase()} - {request.bodyPart}
            </span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Request Details */}
          <div className="bg-muted/30 rounded-lg p-4 space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Service Type</p>
                <p className="font-medium">{request.serviceType.toUpperCase()}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Body Part</p>
                <p className="font-medium">{request.bodyPart}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">View</p>
                <p className="font-medium">{request.view}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Priority</p>
                <p className="font-medium capitalize">{request.priority}</p>
              </div>
            </div>
            {request.notes && (
              <div>
                <p className="text-xs font-medium text-muted-foreground">Request Notes</p>
                <p className="text-sm">{request.notes}</p>
              </div>
            )}
          </div>

          {/* Findings */}
          <div className="space-y-2">
            <Label htmlFor="findings" className="text-sm font-medium">
              Findings *
            </Label>
            <Textarea
              id="findings"
              {...register("findings")}
              placeholder="Enter detailed findings from the radiology examination..."
              rows={8}
              className={`resize-none ${errors.findings ? "border-red-500" : ""}`}
            />
            {errors.findings && (
              <p className="text-xs text-red-500">{errors.findings.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Describe what was observed in the images, including any abnormalities, measurements, or notable features.
            </p>
          </div>

          {/* Impression */}
          <div className="space-y-2">
            <Label htmlFor="impression" className="text-sm font-medium">
              Impression *
            </Label>
            <Textarea
              id="impression"
              {...register("impression")}
              placeholder="Enter your clinical impression and diagnosis..."
              rows={6}
              className={`resize-none ${errors.impression ? "border-red-500" : ""}`}
            />
            {errors.impression && (
              <p className="text-xs text-red-500">{errors.impression.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Provide your interpretation of the findings and any diagnosis or differential diagnosis.
            </p>
          </div>

          {/* Recommendations */}
          <div className="space-y-2">
            <Label htmlFor="recommendations" className="text-sm font-medium">
              Recommendations
            </Label>
            <Textarea
              id="recommendations"
              {...register("recommendations")}
              placeholder="Enter any recommendations for further follow-up or additional imaging..."
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Suggest any follow-up actions, additional tests, or treatment recommendations.
            </p>
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
                  Submitting...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Submit Results
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
