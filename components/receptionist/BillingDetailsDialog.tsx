// app/components/receptionist/BillingDetailsDialog.tsx

"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  DollarSign,
  FileText,
  User,
  Calendar,
  CreditCard,
  CheckCircle,
  Clock,
  AlertCircle,
  Printer,
  Download,
} from "lucide-react";
import { format } from "date-fns";

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
    phone?: string;
    guardian?: string;
    dateOfBirth?: string;
    gender?: string;
  };
  referringDoctor: {
    _id: string;
    name: string;
    specialization?: string;
    department?: string;
  };
  radiologist?: {
    _id: string;
    name: string;
  };
  technician?: {
    _id: string;
    name: string;
  };
  department?: {
    _id: string;
    name: string;
  };
  status: string;
  reportStatus: string;
  billingStatus: string;
  priority: string;
  requestDate: string;
  scheduledDate: string;
  performedDate?: string;
  contrastUsed?: boolean;
  contrastType?: string;
  notes?: string;
  findings?: string;
  impression?: string;
  recommendations?: string;
  pricing?: {
    basePrice: number;
    contrastPrice: number;
  };
  paymentMethod?: string;
  transactionId?: string;
  paymentNotes?: string;
  paymentProcessedBy?: string;
  paymentProcessedAt?: string;
}

interface BillingDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: RadiologyRequest;
}

export function BillingDetailsDialog({
  open,
  onOpenChange,
  request,
}: BillingDetailsDialogProps) {
  const getServiceTypeLabel = (serviceType: string) => {
    const labels: Record<string, string> = {
      "x-ray": "X-Ray",
      "ct-scan": "CT Scan",
      mri: "MRI",
      ultrasound: "Ultrasound",
    };
    return labels[serviceType] || serviceType;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      scheduled: { label: "Scheduled", className: "bg-blue-100 text-blue-800" },
      "in-progress": { label: "In Progress", className: "bg-yellow-100 text-yellow-800" },
      completed: { label: "Completed", className: "bg-green-100 text-green-800" },
      cancelled: { label: "Cancelled", className: "bg-red-100 text-red-800" },
    };
    const config = statusConfig[status] || { label: status, className: "bg-gray-100 text-gray-800" };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const priorityConfig: Record<string, { label: string; className: string }> = {
      routine: { label: "Routine", className: "bg-gray-100 text-gray-800" },
      urgent: { label: "Urgent", className: "bg-orange-100 text-orange-800" },
      emergency: { label: "Emergency", className: "bg-red-100 text-red-800" },
    };
    const config = priorityConfig[priority] || { label: priority, className: "bg-gray-100 text-gray-800" };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const getBillingStatusBadge = (billingStatus: string) => {
    const billingConfig: Record<string, { label: string; className: string }> = {
      pending: { label: "Pending", className: "bg-yellow-100 text-yellow-800" },
      billed: { label: "Billed", className: "bg-blue-100 text-blue-800" },
      paid: { label: "Paid", className: "bg-green-100 text-green-800" },
    };
    const config = billingConfig[billingStatus] || { label: billingStatus, className: "bg-gray-100 text-gray-800" };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const calculateTotalPrice = () => {
    const basePrice = request.pricing?.basePrice || 0;
    const contrastPrice = request.contrastUsed ? (request.pricing?.contrastPrice || 0) : 0;
    return basePrice + contrastPrice;
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // In a real implementation, this would generate a PDF
    alert("Invoice download functionality would be implemented here");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Billing Details
          </DialogTitle>
          <DialogDescription>
            View billing information for radiology service {request.serviceId}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header Section */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Service ID</p>
                <p className="text-2xl font-bold">{request.serviceId}</p>
              </div>
              <div className="flex gap-2">
                {getPriorityBadge(request.priority)}
                {getBillingStatusBadge(request.billingStatus)}
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Service Type</p>
                <p className="font-medium">{getServiceTypeLabel(request.serviceType)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Body Part</p>
                <p className="font-medium">{request.bodyPart}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">View</p>
                <p className="font-medium">{request.view}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                {getStatusBadge(request.status)}
              </div>
            </div>
          </div>

          <Separator />

          {/* Patient Information */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold">Patient Information</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Name</p>
                <p className="font-medium">{request.patient.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Patient ID</p>
                <p className="font-medium">{request.patient.patientId}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Phone</p>
                <p className="font-medium">{request.patient.phone || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Guardian</p>
                <p className="font-medium">{request.patient.guardian || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Date of Birth</p>
                <p className="font-medium">
                  {request.patient.dateOfBirth 
                    ? format(new Date(request.patient.dateOfBirth), "MMM dd, yyyy")
                    : "N/A"}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Gender</p>
                <p className="font-medium">{request.patient.gender || "N/A"}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Service Details */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-purple-600" />
              <h3 className="font-semibold">Service Details</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Referring Doctor</p>
                <p className="font-medium">{request.referringDoctor.name}</p>
                <p className="text-sm text-muted-foreground">{request.referringDoctor.specialization}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Radiologist</p>
                <p className="font-medium">{request.radiologist?.name || "Not assigned"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Technician</p>
                <p className="font-medium">{request.technician?.name || "Not assigned"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Department</p>
                <p className="font-medium">{request.department?.name || "Radiology"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Request Date</p>
                <p className="font-medium">{format(new Date(request.requestDate), "MMM dd, yyyy HH:mm")}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Scheduled Date</p>
                <p className="font-medium">{format(new Date(request.scheduledDate), "MMM dd, yyyy HH:mm")}</p>
              </div>
            </div>
            {request.contrastUsed && (
              <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 border border-blue-200 rounded-lg p-3">
                <AlertCircle className="h-4 w-4" />
                <span>Contrast Used: {request.contrastType}</span>
              </div>
            )}
          </div>

          <Separator />

          {/* Billing Information */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-emerald-600" />
              <h3 className="font-semibold">Billing Information</h3>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Base Price:</span>
                  <span className="font-medium">${request.pricing?.basePrice || 0}</span>
                </div>
                {request.contrastUsed && (
                  <div className="flex justify-between">
                    <span className="text-sm">Contrast Charge:</span>
                    <span className="font-medium">${request.pricing?.contrastPrice || 0}</span>
                  </div>
                )}
                <Separator className="my-2" />
                <div className="flex justify-between text-xl font-bold">
                  <span>Total Amount:</span>
                  <span className="text-emerald-600">${calculateTotalPrice()}</span>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Billing Status</p>
                  {getBillingStatusBadge(request.billingStatus)}
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Payment Method</p>
                  <p className="font-medium">{request.paymentMethod || "N/A"}</p>
                </div>
                {request.transactionId && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Transaction ID</p>
                    <p className="font-medium">{request.transactionId}</p>
                  </div>
                )}
                {request.paymentProcessedAt && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Payment Date</p>
                    <p className="font-medium">
                      {format(new Date(request.paymentProcessedAt), "MMM dd, yyyy HH:mm")}
                    </p>
                  </div>
                )}
              </div>

              {request.paymentNotes && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Payment Notes</p>
                  <p className="text-sm">{request.paymentNotes}</p>
                </div>
              )}
            </div>
          </div>

          {request.notes && (
            <>
              <Separator />
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Additional Notes</p>
                <p className="text-sm bg-muted/50 rounded-lg p-3">{request.notes}</p>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          <Button variant="outline" onClick={handleDownload}>
            <Download className="mr-2 h-4 w-4" />
            Download Invoice
          </Button>
          <Button onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
