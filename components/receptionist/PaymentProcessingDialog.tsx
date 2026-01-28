// app/components/receptionist/PaymentProcessingDialog.tsx

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CreditCard, DollarSign, CheckCircle, AlertCircle, Clock } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { toast } from "sonner";

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
  };
  referringDoctor: {
    _id: string;
    name: string;
    specialization?: string;
  };
  status: string;
  billingStatus: string;
  priority: string;
  scheduledDate: string;
  contrastUsed?: boolean;
  contrastType?: string;
  pricing?: {
    basePrice: number;
    contrastPrice: number;
  };
}

interface PaymentProcessingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: RadiologyRequest;
  onPaymentProcessed: () => void;
}

export function PaymentProcessingDialog({
  open,
  onOpenChange,
  request,
  onPaymentProcessed,
}: PaymentProcessingDialogProps) {
  const { accessToken } = useAuthStore();
  const [billingStatus, setBillingStatus] = useState<"billed" | "paid">("billed");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [notes, setNotes] = useState("");
  const [confirmAmount, setConfirmAmount] = useState(false);
  const [confirmPatient, setConfirmPatient] = useState(false);
  const [confirmReceipt, setConfirmReceipt] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const calculateTotalPrice = () => {
    const basePrice = request.pricing?.basePrice || 0;
    const contrastPrice = request.contrastUsed ? (request.pricing?.contrastPrice || 0) : 0;
    return basePrice + contrastPrice;
  };

  const getServiceTypeLabel = (serviceType: string) => {
    const labels: Record<string, string> = {
      "x-ray": "X-Ray",
      "ct-scan": "CT Scan",
      mri: "MRI",
      ultrasound: "Ultrasound",
    };
    return labels[serviceType] || serviceType;
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (billingStatus === "paid") {
      if (!confirmAmount || !confirmPatient || !confirmReceipt) {
        toast.error("Missing Confirmations", {
          description: "Please confirm all requirements before processing payment",
        });
        return;
      }

      if (!paymentMethod) {
        toast.error("Missing Payment Method", {
          description: "Please select a payment method",
        });
        return;
      }
    }

    try {
      setSubmitting(true);

      const response = await fetch(`/api/reception/radiology/requests/${request._id}/payment`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          billingStatus,
          paymentMethod: paymentMethod || undefined,
          transactionId: transactionId || undefined,
          notes: notes || undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to process payment");
      }

      if (result.success) {
        toast.success("Payment Processed", {
          description: `Payment status updated to ${billingStatus}`,
        });
        onPaymentProcessed();
      }
    } catch (error: any) {
      console.error("Error processing payment:", error);
      toast.error("Failed to Process Payment", {
        description: error.message || "An error occurred while processing payment",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      onOpenChange(false);
      // Reset form
      setBillingStatus("billed");
      setPaymentMethod("");
      setTransactionId("");
      setNotes("");
      setConfirmAmount(false);
      setConfirmPatient(false);
      setConfirmReceipt(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Process Payment
          </DialogTitle>
          <DialogDescription>
            Update payment status for radiology service {request.serviceId}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Service Information */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Service ID</p>
                <p className="font-semibold">{request.serviceId}</p>
              </div>
              {getPriorityBadge(request.priority)}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Service Type</p>
                <p className="font-medium">{getServiceTypeLabel(request.serviceType)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Body Part</p>
                <p className="font-medium">{request.bodyPart} - {request.view}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Patient</p>
                <p className="font-medium">{request.patient.name}</p>
                <p className="text-sm text-muted-foreground">{request.patient.patientId}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Referring Doctor</p>
                <p className="font-medium">{request.referringDoctor.name}</p>
                <p className="text-sm text-muted-foreground">{request.referringDoctor.specialization}</p>
              </div>
            </div>
            {request.contrastUsed && (
              <div className="flex items-center gap-2 text-sm text-blue-600">
                <AlertCircle className="h-4 w-4" />
                <span>Contrast Used: {request.contrastType}</span>
              </div>
            )}
          </div>

          <Separator />

          {/* Payment Details */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-emerald-600" />
              <h3 className="font-semibold">Payment Details</h3>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
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
                <div className="flex justify-between text-lg font-bold">
                  <span>Total Amount:</span>
                  <span className="text-emerald-600">${calculateTotalPrice()}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="billingStatus">Payment Status *</Label>
              <Select
                value={billingStatus}
                onValueChange={(value: "billed" | "paid") => setBillingStatus(value)}
              >
                <SelectTrigger id="billingStatus">
                  <SelectValue placeholder="Select payment status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="billed">Billed</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {billingStatus === "paid" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="paymentMethod">Payment Method *</Label>
                  <Select
                    value={paymentMethod}
                    onValueChange={setPaymentMethod}
                    required
                  >
                    <SelectTrigger id="paymentMethod">
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="card">Credit/Debit Card</SelectItem>
                      <SelectItem value="upi">UPI</SelectItem>
                      <SelectItem value="netbanking">Net Banking</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                      <SelectItem value="insurance">Insurance</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="transactionId">Transaction ID (Optional)</Label>
                  <Input
                    id="transactionId"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    placeholder="Enter transaction/reference ID"
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any payment notes..."
                rows={3}
              />
            </div>
          </div>

          {billingStatus === "paid" && (
            <>
              <Separator />

              {/* Confirmations */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-blue-600" />
                  <h3 className="font-semibold">Confirmations</h3>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="confirmAmount"
                      checked={confirmAmount}
                      onCheckedChange={(checked) => setConfirmAmount(checked as boolean)}
                      required
                    />
                    <Label htmlFor="confirmAmount" className="leading-none cursor-pointer">
                      <div className="font-medium">Payment Amount</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        I confirm that the payment amount of ${calculateTotalPrice()} has been received
                      </div>
                    </Label>
                  </div>

                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="confirmPatient"
                      checked={confirmPatient}
                      onCheckedChange={(checked) => setConfirmPatient(checked as boolean)}
                      required
                    />
                    <Label htmlFor="confirmPatient" className="leading-none cursor-pointer">
                      <div className="font-medium">Patient Identity</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        I have verified the patient's identity ({request.patient.name})
                      </div>
                    </Label>
                  </div>

                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="confirmReceipt"
                      checked={confirmReceipt}
                      onCheckedChange={(checked) => setConfirmReceipt(checked as boolean)}
                      required
                    />
                    <Label htmlFor="confirmReceipt" className="leading-none cursor-pointer">
                      <div className="font-medium">Receipt</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        I have issued a proper receipt to the patient
                      </div>
                    </Label>
                  </div>
                </div>
              </div>
            </>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || (billingStatus === "paid" && (!confirmAmount || !confirmPatient || !confirmReceipt))}
            >
              {submitting ? (
                <>
                  <Clock className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  {billingStatus === "billed" ? "Mark as Billed" : "Mark as Paid"}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
