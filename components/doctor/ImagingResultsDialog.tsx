// app/components/doctor/ImagingResultsDialog.tsx

"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Eye, Download, Printer, FileText, Activity, Calendar, User, Stethoscope, AlertCircle } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { format, parseISO } from "date-fns";

interface ImagingResultsDialogProps {
  patientId: string;
  studyId: string;
  trigger?: React.ReactNode;
}

interface ImagingStudy {
  _id: string;
  serviceId: string;
  serviceType: "x-ray" | "ct-scan" | "mri" | "ultrasound";
  bodyPart: string;
  view: string;
  contrastUsed?: boolean;
  contrastType?: string;
  requestDate: string;
  scheduledDate: string;
  performedDate?: string;
  status: string;
  reportStatus: string;
  priority: string;
  findings?: string;
  impression?: string;
  recommendations?: string;
  images?: Array<{
    imageId: string;
    imageUrl: string;
    view: string;
    description?: string;
    takenAt: string;
  }>;
  patient: {
    name: string;
    patientId: string;
    phone?: string;
    guardian?: string;
    dateOfBirth?: string;
    gender?: string;
  };
  referringDoctor: {
    name: string;
    specialization?: string;
    department?: string;
    licenseNumber?: string;
  };
  radiologist?: {
    name: string;
  };
  technician?: {
    name: string;
  };
  reportGeneratedBy?: {
    name: string;
  };
  reportGeneratedAt?: string;
  reviewedBy?: {
    name: string;
  };
  reviewedAt?: string;
  approvedBy?: {
    name: string;
  };
  approvedAt?: string;
  notes?: string;
}

export function ImagingResultsDialog({
  patientId,
  studyId,
  trigger,
}: ImagingResultsDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [study, setStudy] = useState<ImagingStudy | null>(null);
  const { accessToken } = useAuthStore();

  const fetchStudyDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/doctor/patients/${patientId}/imaging/${studyId}`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch imaging study details");
      }

      if (result.success) {
        setStudy(result.data);
      }
    } catch (error: any) {
      console.error("Error fetching imaging study:", error);
      toast.error("Failed to Load Study", {
        description: error.message || "An error occurred while loading imaging study details",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && !study) {
      fetchStudyDetails();
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), "MMM d, yyyy");
    } catch {
      return "Invalid date";
    }
  };

  const formatDateTime = (dateString: string) => {
    try {
      return format(parseISO(dateString), "MMM d, yyyy h:mm a");
    } catch {
      return "Invalid date";
    }
  };

  const getServiceTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      "x-ray": "X-Ray",
      "ct-scan": "CT Scan",
      "mri": "MRI",
      "ultrasound": "Ultrasound",
    };
    return labels[type] || type;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge variant="default">Completed</Badge>;
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      case "in-progress":
        return <Badge variant="outline">In Progress</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getReportStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge variant="default">Completed</Badge>;
      case "reviewed":
        return <Badge variant="default" className="bg-blue-600">Reviewed</Badge>;
      case "approved":
        return <Badge variant="default" className="bg-green-600">Approved</Badge>;
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "emergency":
        return <Badge variant="destructive">Emergency</Badge>;
      case "urgent":
        return <Badge variant="default">Urgent</Badge>;
      case "routine":
        return <Badge variant="outline">Routine</Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  };

  const handleDownloadReport = () => {
    toast.info("Download Report", {
      description: "Report download functionality will be implemented soon",
    });
  };

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm">
            <Eye className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] lg:max-w-[1200px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Activity className="h-5 w-5" />
            Imaging Study Results
          </DialogTitle>
          <DialogDescription>
            {study ? `Viewing results for ${study.serviceId}` : "Loading study details..."}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : study ? (
          <div className="space-y-6">
            {/* Header Actions */}
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadReport}
              >
                <Download className="h-4 w-4 mr-2" />
                Download Report
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrintReport}
              >
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
            </div>

            {/* Study Information Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Study Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Service ID</p>
                    <p className="font-semibold">{study.serviceId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Service Type</p>
                    <p className="font-semibold capitalize">
                      {getServiceTypeLabel(study.serviceType)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Body Part</p>
                    <p className="font-semibold">{study.bodyPart}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">View</p>
                    <p className="font-semibold">{study.view}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Priority</p>
                    {getPriorityBadge(study.priority)}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    {getStatusBadge(study.status)}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Report Status</p>
                    {getReportStatusBadge(study.reportStatus)}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Contrast Used</p>
                    <p className="font-semibold">
                      {study.contrastUsed ? `Yes (${study.contrastType || "N/A"})` : "No"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Request Date</p>
                    <p className="font-semibold">{formatDate(study.requestDate)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Scheduled Date</p>
                    <p className="font-semibold">{formatDate(study.scheduledDate)}</p>
                  </div>
                  {study.performedDate && (
                    <div>
                      <p className="text-sm text-muted-foreground">Performed Date</p>
                      <p className="font-semibold">{formatDate(study.performedDate)}</p>
                    </div>
                  )}
                  {study.reportGeneratedAt && (
                    <div>
                      <p className="text-sm text-muted-foreground">Report Generated</p>
                      <p className="font-semibold">{formatDateTime(study.reportGeneratedAt)}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Patient Information Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Patient Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Patient Name</p>
                    <p className="font-semibold">{study.patient.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Patient ID</p>
                    <p className="font-semibold">{study.patient.patientId}</p>
                  </div>
                  {study.patient.phone && (
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p className="font-semibold">{study.patient.phone}</p>
                    </div>
                  )}
                  {study.patient.guardian && (
                    <div>
                      <p className="text-sm text-muted-foreground">Guardian</p>
                      <p className="font-semibold">{study.patient.guardian}</p>
                    </div>
                  )}
                  {study.patient.gender && (
                    <div>
                      <p className="text-sm text-muted-foreground">Gender</p>
                      <p className="font-semibold capitalize">{study.patient.gender}</p>
                    </div>
                  )}
                  {study.patient.dateOfBirth && (
                    <div>
                      <p className="text-sm text-muted-foreground">Date of Birth</p>
                      <p className="font-semibold">{formatDate(study.patient.dateOfBirth)}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Medical Staff Information Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Stethoscope className="h-5 w-5" />
                  Medical Staff
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Referring Doctor</p>
                    <p className="font-semibold">{study.referringDoctor.name}</p>
                    {study.referringDoctor.specialization && (
                      <p className="text-sm text-muted-foreground">{study.referringDoctor.specialization}</p>
                    )}
                  </div>
                  {study.radiologist && (
                    <div>
                      <p className="text-sm text-muted-foreground">Radiologist</p>
                      <p className="font-semibold">{study.radiologist.name}</p>
                    </div>
                  )}
                  {study.technician && (
                    <div>
                      <p className="text-sm text-muted-foreground">Technician</p>
                      <p className="font-semibold">{study.technician.name}</p>
                    </div>
                  )}
                  {study.reportGeneratedBy && (
                    <div>
                      <p className="text-sm text-muted-foreground">Report Generated By</p>
                      <p className="font-semibold">{study.reportGeneratedBy.name}</p>
                    </div>
                  )}
                </div>
                {study.reviewedBy && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Reviewed By</p>
                        <p className="font-semibold">{study.reviewedBy.name}</p>
                        {study.reviewedAt && (
                          <p className="text-sm text-muted-foreground">{formatDateTime(study.reviewedAt)}</p>
                        )}
                      </div>
                      {study.approvedBy && (
                        <div>
                          <p className="text-sm text-muted-foreground">Approved By</p>
                          <p className="font-semibold">{study.approvedBy.name}</p>
                          {study.approvedAt && (
                            <p className="text-sm text-muted-foreground">{formatDateTime(study.approvedAt)}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Images Section */}
            {study.images && study.images.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Images ({study.images.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {study.images.map((image, index) => (
                      <div key={image.imageId} className="border rounded-lg overflow-hidden">
                        <div className="aspect-video bg-muted flex items-center justify-center">
                          {image.imageUrl ? (
                            <img
                              src={image.imageUrl}
                              alt={image.description || `Image ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="text-center p-4">
                              <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                              <p className="text-sm text-muted-foreground">No image available</p>
                            </div>
                          )}
                        </div>
                        <div className="p-3 space-y-1">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">{image.view}</p>
                            <Badge variant="outline" className="text-xs">
                              #{index + 1}
                            </Badge>
                          </div>
                          {image.description && (
                            <p className="text-xs text-muted-foreground">{image.description}</p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {formatDateTime(image.takenAt)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Findings Section */}
            {study.findings && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Findings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm max-w-none">
                    <p className="whitespace-pre-wrap">{study.findings}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Impression Section */}
            {study.impression && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Impression</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm max-w-none">
                    <p className="whitespace-pre-wrap">{study.impression}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recommendations Section */}
            {study.recommendations && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recommendations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm max-w-none">
                    <p className="whitespace-pre-wrap">{study.recommendations}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Notes Section */}
            {study.notes && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Additional Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm max-w-none">
                    <p className="whitespace-pre-wrap">{study.notes}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Warning for incomplete reports */}
            {study.reportStatus === "pending" && (
              <div className="flex items-start gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-800 dark:text-yellow-200">
                    Report Pending
                  </p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                    This imaging study report is still pending completion. Please check back later for the full results.
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Failed to load imaging study details</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
