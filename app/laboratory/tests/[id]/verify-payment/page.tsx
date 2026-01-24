// app/laboratory/tests/[id]/verify-payment/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ArrowLeft, 
  CreditCard, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Save,
  Receipt,
  DollarSign,
  User,
  Calendar
} from "lucide-react";
import { format } from "date-fns";
import { useAuthStore } from "@/store/useAuthStore";

interface TestInfo {
  _id: string;
  testId: string;
  testName: string;
  patient: {
    name: string;
    patientId: string;
    phone: string;
  };
  doctor: {
    name: string;
    specialization: string;
  };
  priority: string;
  charges: {
    paymentStatus: string;
    totalAmount: number;
    paid: number;
    due: number;
    paymentMethod?: string;
    transactionId?: string;
    paymentDate?: string;
    collectedBy?: {
      name: string;
    };
  };
  paymentVerified: boolean;
  paymentVerifiedBy?: {
    name: string;
  };
  paymentVerifiedAt?: string;
  status: string;
  collectionStatus: string;
  orderedAt: string;
}

export default function VerifyPaymentPage() {
  const params = useParams();
  const router = useRouter();
  const { accessToken } = useAuthStore();
  const [test, setTest] = useState<TestInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [verify, setVerify] = useState(true);
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [confirmAmount, setConfirmAmount] = useState(false);
  const [confirmPatient, setConfirmPatient] = useState(false);
  const [confirmReceipt, setConfirmReceipt] = useState(false);

  useEffect(() => {
    fetchTestInfo();
  }, [params.id]);

  const fetchTestInfo = async () => {
    try {
      setLoading(true);
      if (!accessToken) {
        router.push('/login');
        return;
      }

      const response = await fetch(`/api/laboratory/tests/${params.id}/verify-payment?info=true`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.status === 401) {
        router.push('/login');
        return;
      }
      
      const data = await response.json();
      setTest(data.data);
      
      // Pre-fill form with existing payment details
      if (data.data?.charges?.paymentMethod) {
        setPaymentMethod(data.data.charges.paymentMethod);
      }
      if (data.data?.charges?.transactionId) {
        setTransactionId(data.data.charges.transactionId);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!test) return;
    
    if (verify) {
      if (!confirmAmount || !confirmPatient || !confirmReceipt) {
        alert("Please confirm all requirements before verifying payment");
        return;
      }
      
      if (!paymentMethod) {
        alert("Please select a payment method");
        return;
      }
    }
    
    try {
      setSubmitting(true);
      if (!accessToken) {
        router.push('/login');
        return;
      }
      
      const response = await fetch(`/api/laboratory/tests/${params.id}/verify-payment`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          verify,
          notes,
          paymentMethod: paymentMethod || undefined,
          transactionId: transactionId || undefined,
        }),
      });
      
      if (response.status === 401) {
        router.push('/login');
        return;
      }
      
      const data = await response.json();
      
      alert(data.message || "Payment verification updated successfully!");
      router.push(`/laboratory/tests/${params.id}`);
    } catch (err: any) {
      alert(err.message || "Failed to verify payment");
    } finally {
      setSubmitting(false);
    }
  };

  const getPaymentStatusColor = (status: string, verified: boolean) => {
    if (verified) return "bg-green-100 text-green-800";
    switch (status) {
      case "paid": return "bg-green-100 text-green-800";
      case "partial": return "bg-yellow-100 text-yellow-800";
      case "pending": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const canVerifyPayment = test && 
                          !test.paymentVerified && 
                          (test.charges.paymentStatus === "paid" || 
                           test.charges.paid >= test.charges.totalAmount);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <Skeleton className="h-8 w-64 mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-96 lg:col-span-2" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (error || !test) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Payment Verification</h1>
        </div>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error || "Failed to load test information. Please try again."}
          </AlertDescription>
        </Alert>
        <Button onClick={() => router.push('/laboratory/tests')} className="mt-4">
          Back to Tests
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            {test.paymentVerified ? "Payment Verification" : "Verify Payment"}
          </h1>
          <p className="text-muted-foreground">
            {test.paymentVerified 
              ? "View payment verification details"
              : "Verify payment for test collection"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {test.paymentVerified ? (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Payment Verified</AlertTitle>
              <AlertDescription className="text-green-700">
                This payment has already been verified. Sample collection can proceed.
              </AlertDescription>
            </Alert>
          ) : !canVerifyPayment ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Cannot Verify Payment</AlertTitle>
              <AlertDescription>
                {test.charges.due > 0 
                  ? `Payment is not complete. Amount due: ₹${test.charges.due}`
                  : "Payment verification is not available for this test."}
              </AlertDescription>
              {test.charges.due > 0 && (
                <Button 
                  variant="outline" 
                  className="mt-2"
                  onClick={() => router.push(`/reception/lab-tests/${params.id}/charges`)}
                >
                  Update Payment
                </Button>
              )}
            </Alert>
          ) : null}

          {!test.paymentVerified && canVerifyPayment && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Verify Payment
                </CardTitle>
                <CardDescription>
                  Verify payment to enable sample collection
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-4">
                    <Label>Payment Verification</Label>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="verify-payment"
                        checked={verify}
                        onCheckedChange={(checked) => setVerify(checked as boolean)}
                      />
                      <Label htmlFor="verify-payment" className="font-normal">
                        I verify that payment has been received
                      </Label>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <Label>Payment Details</Label>
                    
                    <div className="space-y-2">
                      <Label htmlFor="paymentMethod">Payment Method *</Label>
                      <Select 
                        value={paymentMethod} 
                        onValueChange={setPaymentMethod}
                        required
                      >
                        <SelectTrigger>
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

                    <div className="space-y-2">
                      <Label htmlFor="notes">Verification Notes (Optional)</Label>
                      <Textarea
                        id="notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Add any verification notes..."
                        rows={3}
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <Label>Confirmations</Label>
                    
                    <div className="flex items-start space-x-2">
                      <Checkbox
                        id="confirmAmount"
                        checked={confirmAmount}
                        onCheckedChange={(checked) => setConfirmAmount(checked as boolean)}
                        required
                      />
                      <Label htmlFor="confirmAmount" className="leading-none">
                        <div className="font-medium">Payment Amount</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          I confirm that the payment amount of ₹{test.charges.paid} has been received
                        </div>
                      </Label>
                    </div>

                    <div className="flex items-start space-x-2">
                      <Checkbox
                        id="confirmPatient"
                        checked={confirmPatient}
                        onCheckedChange={(checked) => setConfirmPatient(checked as boolean)}
                        required
                      />
                      <Label htmlFor="confirmPatient" className="leading-none">
                        <div className="font-medium">Patient Identity</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          I have verified the patient's identity
                        </div>
                      </Label>
                    </div>

                    <div className="flex items-start space-x-2">
                      <Checkbox
                        id="confirmReceipt"
                        checked={confirmReceipt}
                        onCheckedChange={(checked) => setConfirmReceipt(checked as boolean)}
                        required
                      />
                      <Label htmlFor="confirmReceipt" className="leading-none">
                        <div className="font-medium">Receipt</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          I have issued a proper receipt to the patient
                        </div>
                      </Label>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      type="submit" 
                      disabled={submitting || !confirmAmount || !confirmPatient || !confirmReceipt}
                      className="flex-1"
                    >
                      {submitting ? (
                        <>
                          <Clock className="h-4 w-4 mr-2 animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Verify Payment
                        </>
                      )}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={() => router.back()}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {test.paymentVerified && (
            <Card>
              <CardHeader>
                <CardTitle>Payment Verification Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Verified By</p>
                    <p className="font-medium">{test.paymentVerifiedBy?.name || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Verified At</p>
                    <p className="font-medium">
                      {test.paymentVerifiedAt 
                        ? format(new Date(test.paymentVerifiedAt), "MMM dd, yyyy HH:mm")
                        : "N/A"}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge className="bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Verified
                  </Badge>
                </div>
                <Button 
                  onClick={() => router.push(`/laboratory/tests/${params.id}/collect`)}
                  className="w-full"
                  disabled={test.collectionStatus !== "pending"}
                >
                  {test.collectionStatus === "pending" 
                    ? "Proceed to Sample Collection"
                    : `Collection Status: ${test.collectionStatus}`}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar - Test Information */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Test Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Test ID</p>
                <p className="font-medium">{test.testId}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Test Name</p>
                <p className="font-medium">{test.testName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Priority</p>
                <Badge className={
                  test.priority === "emergency" ? "bg-red-100 text-red-800 border-red-300" :
                  test.priority === "urgent" ? "bg-orange-100 text-orange-800 border-orange-300" :
                  "bg-blue-100 text-blue-800 border-blue-300"
                }>
                  {test.priority}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Collection Status</p>
                <Badge className={
                  test.collectionStatus === "pending" ? "bg-yellow-100 text-yellow-800" :
                  test.collectionStatus === "scheduled" ? "bg-blue-100 text-blue-800" :
                  "bg-gray-100 text-gray-800"
                }>
                  {test.collectionStatus}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ordered</p>
                <p className="font-medium">
                  {format(new Date(test.orderedAt), "MMM dd, yyyy HH:mm")}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Patient Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium">{test.patient.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Patient ID</p>
                <p className="font-medium">{test.patient.patientId}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="font-medium">{test.patient.phone}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Payment Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Payment Status</p>
                <div className="flex items-center gap-2">
                  <Badge className={getPaymentStatusColor(test.charges.paymentStatus, test.paymentVerified)}>
                    {test.paymentVerified ? "Verified" : test.charges.paymentStatus}
                  </Badge>
                  {test.paymentVerified && (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Total Amount:</span>
                  <span className="font-medium">₹{test.charges.totalAmount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Paid Amount:</span>
                  <span className="font-medium text-green-600">₹{test.charges.paid}</span>
                </div>
                {test.charges.due > 0 && (
                  <div className="flex justify-between">
                    <span className="text-sm">Due Amount:</span>
                    <span className="font-medium text-red-600">₹{test.charges.due}</span>
                  </div>
                )}
              </div>
              
              if (test.charges.paymentMethod) {
                <div>
                  <p className="text-sm text-muted-foreground">Payment Method</p>
                  <p className="font-medium">{test.charges.paymentMethod}</p>
                </div>
              }
              
              if (test.charges.transactionId) {
                <div>
                  <p className="text-sm text-muted-foreground">Transaction ID</p>
                  <p className="font-medium">{test.charges.transactionId}</p>
                </div>
              }
              
              if (test.charges.paymentDate) {
                <div>
                  <p className="text-sm text-muted-foreground">Payment Date</p>
                  <p className="font-medium">
                    {format(new Date(test.charges.paymentDate!), "MMM dd, yyyy HH:mm")}
                  </p>
                </div>
              }
              
              if (test.charges.collectedBy) {
                <div>
                  <p className="text-sm text-muted-foreground">Collected By</p>
                  <p className="font-medium">{test.charges.collectedBy?.name}</p>
                </div>
              }
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {!test.paymentVerified && test.charges.due > 0 && (
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => router.push(`/reception/lab-tests/${params.id}/charges`)}
                >
                  <DollarSign className="h-4 w-4 mr-2" />
                  Update Payment
                </Button>
              )}
              
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => router.push(`/laboratory/tests/${params.id}`)}
              >
                <Receipt className="h-4 w-4 mr-2" />
                View Test Details
              </Button>
              
              {test.paymentVerified && test.collectionStatus === "pending" && (
                <Button 
                  className="w-full"
                  onClick={() => router.push(`/laboratory/tests/${params.id}/collect`)}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Collect Sample
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}