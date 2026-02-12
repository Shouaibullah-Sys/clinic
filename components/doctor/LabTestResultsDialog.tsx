"use client";

import { useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Eye, AlertCircle } from "lucide-react";
import { format, parseISO } from "date-fns";

interface LabTestResultsDialogProps {
  patientId: string;
  testId: string;
  trigger?: React.ReactNode;
}

interface LabTestDetails {
  _id: string;
  testId: string;
  testName: string;
  category: string;
  status: string;
  collectionStatus: string;
  processingStatus: string;
  verificationStatus: string;
  orderedAt: string;
  reportedAt?: string;
  completedAt?: string;
  doctor?: {
    name?: string;
  };
  orderedBy?: {
    name?: string;
  };
  results?: {
    interpretation?: string;
    reportedAt?: string;
    verifiedAt?: string;
    reportedBy?: {
      name?: string;
    };
    verifiedBy?: {
      name?: string;
    };
    parameters?: Array<{
      name: string;
      value: string | number;
      result?: string | number;
      unit?: string;
      normalRange?: string;
      referenceRange?: string;
      flag?: "normal" | "low" | "high" | "critical";
      remarks?: string;
    }>;
  };
  specimen?: {
    parameters?: Array<{
      name: string;
      value?: string | number;
      result?: string | number;
      unit?: string;
      remarks?: string;
    }>;
  };
}

export function LabTestResultsDialog({
  patientId,
  testId,
  trigger,
}: LabTestResultsDialogProps) {
  const { accessToken } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [test, setTest] = useState<LabTestDetails | null>(null);

  const fetchDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/doctor/patients/${patientId}/lab-tests/${testId}`,
        {
          headers: {
            "Content-Type": "application/json",
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
        },
      );

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to fetch lab test results");
      }

      setTest(result.data);
    } catch (err: any) {
      setError(err.message || "Failed to load results");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && !test && !loading) {
      fetchDetails();
    }
  };

  const formatDate = (value?: string) => {
    if (!value) return "-";
    try {
      return format(parseISO(value), "MMM d, yyyy h:mm a");
    } catch {
      return "-";
    }
  };

  const getFlagBadge = (flag?: string) => {
    if (!flag) return <Badge variant="outline">-</Badge>;
    if (flag === "critical") return <Badge variant="destructive">Critical</Badge>;
    if (flag === "high") return <Badge className="bg-orange-600">High</Badge>;
    if (flag === "low") return <Badge className="bg-yellow-600">Low</Badge>;
    return <Badge className="bg-green-600">Normal</Badge>;
  };

  const normalizedParameters: Array<{
    name: string;
    value?: string | number;
    result?: string | number;
    unit?: string;
    normalRange?: string;
    referenceRange?: string;
    flag?: "normal" | "low" | "high" | "critical";
    remarks?: string;
  }> = [
    ...(test?.results?.parameters || []),
    ...(test?.specimen?.parameters || []),
  ];

  const hasAnyParameters = normalizedParameters.length > 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm">
            <Eye className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] lg:max-w-[1000px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Lab Test Results</DialogTitle>
          <DialogDescription>
            {test ? `${test.testId} - ${test.testName}` : "Loading test details..."}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-10 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : test ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Status</p>
                <p className="font-medium capitalize">{test.status}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Ordered At</p>
                <p className="font-medium">{formatDate(test.orderedAt)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Reported At</p>
                <p className="font-medium">
                  {formatDate(test.results?.reportedAt || test.reportedAt)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Ordered By</p>
                <p className="font-medium">
                  {test.doctor?.name || test.orderedBy?.name || "-"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Reported By</p>
                <p className="font-medium">{test.results?.reportedBy?.name || "-"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Verified By</p>
                <p className="font-medium">{test.results?.verifiedBy?.name || "-"}</p>
              </div>
            </div>

            {!hasAnyParameters ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No lab parameters have been entered yet. Current workflow
                  status: <span className="font-medium capitalize">{test.status}</span>.
                </AlertDescription>
              </Alert>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Parameter</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Normal Range</TableHead>
                    <TableHead>Flag</TableHead>
                    <TableHead>Remarks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {normalizedParameters.map((param, index) => (
                    <TableRow key={`${param.name}-${index}`}>
                      <TableCell className="font-medium">{param.name}</TableCell>
                      <TableCell>
                        {String(param.value ?? param.result ?? "-")}
                      </TableCell>
                      <TableCell>{param.unit || "-"}</TableCell>
                      <TableCell>
                        {param.normalRange || param.referenceRange || "-"}
                      </TableCell>
                      <TableCell>{getFlagBadge(param.flag)}</TableCell>
                      <TableCell>{param.remarks || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {test.results?.interpretation && (
              <div className="rounded-md border p-3">
                <p className="text-sm text-muted-foreground mb-1">Interpretation</p>
                <p className="text-sm">{test.results.interpretation}</p>
              </div>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
