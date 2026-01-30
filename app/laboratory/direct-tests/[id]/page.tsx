// app/laboratory/direct-tests/[id]/page.tsx

"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import { useAuthStore } from "@/store/useAuthStore";
import {
  ArrowLeft,
  FileText,
  TestTube,
  User,
  DollarSign,
  CheckCircle,
  AlertTriangle,
  Clock,
  RefreshCw,
  Printer,
  Loader2,
  Plus,
  Save,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";

interface DirectLabTest {
  _id: string;
  testId: string;
  testName: string;
  category: string;
  description?: string;
  patient: {
    _id: string;
    name: string;
    patientId: string;
    phone?: string;
    email?: string;
    dateOfBirth?: string;
    gender?: string;
  };
  createdBy?: {
    _id: string;
    name: string;
  };
  finalizedBy?: {
    _id: string;
    name: string;
  };
  status: string;
  collectionStatus: string;
  processingStatus: string;
  verificationStatus: string;
  paymentVerified: boolean;
  paymentVerifiedBy?: {
    _id: string;
    name: string;
  };
  priority: string;
  createdAtDirect: string;
  finalized: boolean;
  finalizedAt?: string;
  readyForPrint: boolean;
  printedAt?: string;
  charges?: {
    basePrice: number;
    totalAmount: number;
    paid: number;
    due: number;
    paymentStatus: string;
    paymentMethod?: string;
    paymentDate?: string;
    collectedBy?: {
      _id: string;
      name: string;
    };
  };
  specimen?: {
    type: string;
    quantity?: string;
    container?: string;
  };
  results?: {
    parameters: Array<{
      name: string;
      value: string | number;
      unit?: string;
      normalRange: string;
      flag?: "normal" | "low" | "high" | "critical";
      remarks?: string;
    }>;
    interpretation?: string;
    reportedBy?: {
      _id: string;
      name: string;
    };
    reportedAt?: string;
  };
  notes?: string;
}

interface TestTemplate {
  _id: string;
  testCode: string;
  testName: string;
  category: string;
  description?: string;
  specimenType: string[];
  basePrice: number;
  turnaroundTime: number;
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
  }>;
}

export default function DirectTestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { accessToken, user } = useAuthStore();
  const [test, setTest] = useState<DirectLabTest | null>(null);
  const [template, setTemplate] = useState<TestTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Payment dialog state
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [processingPayment, setProcessingPayment] = useState(false);

  // Results dialog state
  const [showResultsDialog, setShowResultsDialog] = useState(false);
  const [resultsParameters, setResultsParameters] = useState<
    Array<{
      name: string;
      value: string;
      unit?: string;
      normalRange: string;
      flag?: "normal" | "low" | "high" | "critical";
      remarks?: string;
    }>
  >([]);
  const [interpretation, setInterpretation] = useState("");
  const [savingResults, setSavingResults] = useState(false);

  // Finalize state
  const [finalizing, setFinalizing] = useState(false);

  // Collect sample state
  const [showCollectDialog, setShowCollectDialog] = useState(false);
  const [collecting, setCollecting] = useState(false);
  const [sampleId, setSampleId] = useState("");
  const [sampleCondition, setSampleCondition] = useState("satisfactory");
  const [collectionNotes, setCollectionNotes] = useState("");
  const [sampleConditionNotes, setSampleConditionNotes] = useState("");

  useEffect(() => {
    fetchTestDetails();
  }, [params.id]);

  const fetchTestDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/laboratory/direct-tests/${params.id}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to fetch test");
      }

      setTest(data.data);

      // Initialize results parameters from template if available
      if (data.data.results?.parameters) {
        setResultsParameters(
          data.data.results.parameters.map((p: any) => ({
            name: p.name,
            value: String(p.value),
            unit: p.unit,
            normalRange: p.normalRange,
            flag: p.flag,
            remarks: p.remarks,
          })),
        );
        setInterpretation(data.data.results.interpretation || "");
      }
    } catch (error: any) {
      console.error("Error fetching test:", error);
      setError(error.message || "Failed to load test details");
    } finally {
      setLoading(false);
    }
  };

  const handleProcessPayment = async () => {
    if (!test) return;

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid payment amount");
      return;
    }

    if (!paymentMethod) {
      toast.error("Please select a payment method");
      return;
    }

    try {
      setProcessingPayment(true);

      const response = await fetch(
        `/api/laboratory/direct-tests/${test._id}/payment`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount,
            paymentMethod,
            notes: paymentNotes || undefined,
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to process payment");
      }

      const data = await response.json();
      toast.success("Payment processed successfully");
      setShowPaymentDialog(false);
      setPaymentAmount("");
      setPaymentMethod("");
      setPaymentNotes("");
      fetchTestDetails();
    } catch (err: any) {
      toast.error(err.message || "Failed to process payment");
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleSaveResults = async () => {
    if (!test) return;

    // Validate all parameters have values
    const invalidParams = resultsParameters.filter(
      (p) => !p.value || p.value.trim() === "",
    );
    if (invalidParams.length > 0) {
      toast.error("Please fill in all parameter values");
      return;
    }

    try {
      setSavingResults(true);

      const response = await fetch(
        `/api/laboratory/tests/${test._id}/results`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            parameters: resultsParameters.map((p) => ({
              name: p.name,
              value: p.value,
              unit: p.unit,
              normalRange: p.normalRange,
              flag: p.flag,
              remarks: p.remarks,
            })),
            interpretation: interpretation || undefined,
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save results");
      }

      const data = await response.json();
      toast.success("Test results saved successfully");
      setShowResultsDialog(false);
      fetchTestDetails();
    } catch (err: any) {
      toast.error(err.message || "Failed to save results");
    } finally {
      setSavingResults(false);
    }
  };

  const handleFinalizeTest = async () => {
    if (!test) return;

    try {
      setFinalizing(true);

      const response = await fetch(
        `/api/laboratory/direct-tests/${test._id}/finalize`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to finalize test");
      }

      const data = await response.json();
      toast.success("Test finalized successfully");
      fetchTestDetails();
    } catch (err: any) {
      toast.error(err.message || "Failed to finalize test");
    } finally {
      setFinalizing(false);
    }
  };

  const handleCollectSample = async () => {
    if (!test) return;

    try {
      setCollecting(true);

      const response = await fetch(
        `/api/laboratory/direct-tests/${test._id}/collect`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sampleId: sampleId || undefined,
            sampleCondition,
            collectionNotes: collectionNotes || undefined,
            sampleConditionNotes: sampleConditionNotes || undefined,
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to collect sample");
      }

      const data = await response.json();
      toast.success("Sample collected successfully");
      setShowCollectDialog(false);
      setSampleId("");
      setSampleCondition("satisfactory");
      setCollectionNotes("");
      setSampleConditionNotes("");
      fetchTestDetails();
    } catch (err: any) {
      toast.error(err.message || "Failed to collect sample");
    } finally {
      setCollecting(false);
    }
  };

  const canAddResults = test?.paymentVerified && !test?.results?.parameters;
  const canFinalize =
    test?.paymentVerified && test?.results?.parameters && !test?.finalized;
  const canPrint = test?.finalized && test?.readyForPrint;
  const canProcessPayment = test?.charges?.paymentStatus !== "paid";
  const canCollectSample =
    test?.paymentVerified && test?.collectionStatus !== "collected";

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <Skeleton className="h-8 w-64 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (error || !test) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <AlertTriangle className="h-12 w-12 mx-auto text-yellow-500 mb-4" />
          <h3 className="text-lg font-medium">Test Not Found</h3>
          <p className="text-muted-foreground mt-2">
            {error || "The requested test could not be found."}
          </p>
          <Button
            onClick={() => router.push("/laboratory/direct-tests")}
            className="mt-4"
          >
            Back to Direct Tests
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              {test.testName}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline">{test.testId}</Badge>
              <Badge
                className={
                  test.finalized
                    ? "bg-green-100 text-green-800"
                    : test.status === "completed" || test.status === "reported"
                      ? "bg-blue-100 text-blue-800"
                      : "bg-yellow-100 text-yellow-800"
                }
              >
                {test.finalized
                  ? "Finalized"
                  : test.status === "completed" || test.status === "reported"
                    ? "Completed"
                    : test.status}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchTestDetails}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          {canPrint && (
            <Button asChild>
              <Link href={`/laboratory/direct-tests/${test._id}/print`}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Status Alert */}
      {test.finalized ? (
        <Alert className="bg-green-50 border-green-200 mb-6">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">Test Finalized</AlertTitle>
          <AlertDescription className="text-green-700">
            This test has been finalized and is ready for printing.
          </AlertDescription>
        </Alert>
      ) : !test.paymentVerified ? (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Payment Verification Required</AlertTitle>
          <AlertDescription>
            Payment must be verified before collecting sample or adding test
            results.
          </AlertDescription>
        </Alert>
      ) : test.collectionStatus === "collected" ? (
        <Alert className="bg-blue-50 border-blue-200 mb-6">
          <CheckCircle className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-800">Sample Collected</AlertTitle>
          <AlertDescription className="text-blue-700">
            Sample has been collected. Ready to add test results.
          </AlertDescription>
        </Alert>
      ) : test.results?.parameters ? (
        <Alert className="bg-blue-50 border-blue-200 mb-6">
          <CheckCircle className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-800">Results Added</AlertTitle>
          <AlertDescription className="text-blue-700">
            Test results have been added. Ready to finalize.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Patient Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Patient Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Name</p>
              <p className="font-medium">{test.patient.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Patient ID</p>
              <p className="font-medium">{test.patient.patientId}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="font-medium">{test.patient.phone || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{test.patient.email || "N/A"}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Gender</p>
                <p className="font-medium">{test.patient.gender || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Date of Birth</p>
                <p className="font-medium">
                  {test.patient.dateOfBirth
                    ? format(parseISO(test.patient.dateOfBirth), "MMM dd, yyyy")
                    : "N/A"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Test Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TestTube className="h-5 w-5" />
              Test Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Test Name</p>
              <p className="font-medium">{test.testName}</p>
            </div>
            {test.description && (
              <div>
                <p className="text-sm text-muted-foreground">Description</p>
                <p className="text-sm">{test.description}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">Category</p>
              <Badge variant="outline">
                {test.category.replace(/_/g, " ")}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Priority</p>
                <Badge
                  className={
                    test.priority === "emergency"
                      ? "bg-red-100 text-red-800"
                      : test.priority === "urgent"
                        ? "bg-orange-100 text-orange-800"
                        : "bg-blue-100 text-blue-800"
                  }
                >
                  {test.priority}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Specimen</p>
                <p className="font-medium">{test.specimen?.type || "N/A"}</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Created</p>
              <p className="font-medium">
                {format(
                  parseISO(test.createdAtDirect),
                  "MMM dd, yyyy 'at' HH:mm",
                )}
              </p>
            </div>
            {test.createdBy && (
              <div>
                <p className="text-sm text-muted-foreground">Created By</p>
                <p className="font-medium">{test.createdBy.name}</p>
              </div>
            )}
            {test.finalized && test.finalizedAt && (
              <div>
                <p className="text-sm text-muted-foreground">Finalized</p>
                <p className="font-medium">
                  {format(
                    parseISO(test.finalizedAt),
                    "MMM dd, yyyy 'at' HH:mm",
                  )}
                </p>
                {test.finalizedBy && (
                  <p className="text-sm text-muted-foreground">
                    by {test.finalizedBy.name}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Payment Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Payment Status</p>
              <div className="flex items-center gap-2">
                {test.paymentVerified ? (
                  <Badge className="bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Verified
                  </Badge>
                ) : (
                  <Badge variant="outline">
                    {test.charges?.paymentStatus || "pending"}
                  </Badge>
                )}
              </div>
            </div>
            {test.charges && (
              <>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Total Amount:</span>
                    <span className="font-medium">
                      {formatPrice(test.charges.totalAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Paid Amount:</span>
                    <span className="font-medium text-green-600">
                      {formatPrice(test.charges.paid)}
                    </span>
                  </div>
                  {test.charges.due > 0 && (
                    <div className="flex justify-between">
                      <span className="text-sm">Due Amount:</span>
                      <span className="font-medium text-red-600">
                        {formatPrice(test.charges.due)}
                      </span>
                    </div>
                  )}
                </div>
                {test.charges.paymentDate && (
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Payment Date
                    </p>
                    <p className="font-medium">
                      {format(
                        parseISO(test.charges.paymentDate),
                        "MMM dd, yyyy",
                      )}
                    </p>
                  </div>
                )}
                {test.charges.paymentMethod && (
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Payment Method
                    </p>
                    <p className="font-medium capitalize">
                      {test.charges.paymentMethod}
                    </p>
                  </div>
                )}
              </>
            )}
            {canProcessPayment && (
              <Dialog
                open={showPaymentDialog}
                onOpenChange={setShowPaymentDialog}
              >
                <DialogTrigger asChild>
                  <Button className="w-full">
                    <DollarSign className="h-4 w-4 mr-2" />
                    Process Payment
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Process Payment</DialogTitle>
                    <DialogDescription>
                      Enter payment details for this test
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label htmlFor="amount">Amount</Label>
                      <Input
                        id="amount"
                        type="number"
                        placeholder="Enter amount"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                      />
                      {test.charges && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Due: {formatPrice(test.charges.due)}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="paymentMethod">Payment Method</Label>
                      <Select
                        value={paymentMethod}
                        onValueChange={setPaymentMethod}
                      >
                        <SelectTrigger id="paymentMethod">
                          <SelectValue placeholder="Select method" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="card">Card</SelectItem>
                          <SelectItem value="online">Online</SelectItem>
                          <SelectItem value="check">Check</SelectItem>
                          <SelectItem value="bank_transfer">
                            Bank Transfer
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="paymentNotes">Notes (Optional)</Label>
                      <Textarea
                        id="paymentNotes"
                        placeholder="Add payment notes..."
                        value={paymentNotes}
                        onChange={(e) => setPaymentNotes(e.target.value)}
                        rows={2}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setShowPaymentDialog(false)}
                      disabled={processingPayment}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleProcessPayment}
                      disabled={processingPayment}
                    >
                      {processingPayment ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        "Process Payment"
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </CardContent>
        </Card>

        {/* Test Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Test Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge
                  className={
                    test.status === "completed" || test.status === "reported"
                      ? "bg-green-100 text-green-800"
                      : test.status === "processing"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-yellow-100 text-yellow-800"
                  }
                >
                  {test.status}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Collection</p>
                <Badge
                  className={
                    test.collectionStatus === "collected"
                      ? "bg-green-100 text-green-800"
                      : "bg-yellow-100 text-yellow-800"
                  }
                >
                  {test.collectionStatus}
                </Badge>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Processing</p>
                <Badge
                  className={
                    test.processingStatus === "completed"
                      ? "bg-green-100 text-green-800"
                      : test.processingStatus === "processing"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-yellow-100 text-yellow-800"
                  }
                >
                  {test.processingStatus}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Verification</p>
                <Badge
                  className={
                    test.verificationStatus === "verified"
                      ? "bg-green-100 text-green-800"
                      : "bg-yellow-100 text-yellow-800"
                  }
                >
                  {test.verificationStatus}
                </Badge>
              </div>
            </div>
            <Separator />
            <div>
              <p className="text-sm text-muted-foreground">Finalized</p>
              <Badge
                className={
                  test.finalized
                    ? "bg-green-100 text-green-800"
                    : "bg-gray-100 text-gray-800"
                }
              >
                {test.finalized ? "Yes" : "No"}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Ready for Print</p>
              <Badge
                className={
                  test.readyForPrint
                    ? "bg-green-100 text-green-800"
                    : "bg-gray-100 text-gray-800"
                }
              >
                {test.readyForPrint ? "Yes" : "No"}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Test Results */}
      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Test Results</CardTitle>
              <CardDescription>
                {test.results?.parameters
                  ? "Results have been added"
                  : "Results not yet added"}
              </CardDescription>
            </div>
            {canAddResults && (
              <Dialog
                open={showResultsDialog}
                onOpenChange={setShowResultsDialog}
              >
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Results
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Add Test Results</DialogTitle>
                    <DialogDescription>
                      Enter the test results for each parameter
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    {resultsParameters.map((param, index) => (
                      <div
                        key={index}
                        className="border rounded-md p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">{param.name}</h4>
                          <Badge variant="outline">{param.unit || "N/A"}</Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor={`value-${index}`}>Value</Label>
                            <Input
                              id={`value-${index}`}
                              value={param.value}
                              onChange={(e) => {
                                const newParams = [...resultsParameters];
                                newParams[index].value = e.target.value;
                                setResultsParameters(newParams);
                              }}
                              placeholder="Enter value"
                            />
                          </div>
                          <div>
                            <Label htmlFor={`flag-${index}`}>Flag</Label>
                            <Select
                              value={param.flag}
                              onValueChange={(value: any) => {
                                const newParams = [...resultsParameters];
                                newParams[index].flag = value;
                                setResultsParameters(newParams);
                              }}
                            >
                              <SelectTrigger id={`flag-${index}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="normal">Normal</SelectItem>
                                <SelectItem value="low">Low</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                                <SelectItem value="critical">
                                  Critical
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div>
                          <Label htmlFor={`remarks-${index}`}>
                            Remarks (Optional)
                          </Label>
                          <Input
                            id={`remarks-${index}`}
                            value={param.remarks || ""}
                            onChange={(e) => {
                              const newParams = [...resultsParameters];
                              newParams[index].remarks = e.target.value;
                              setResultsParameters(newParams);
                            }}
                            placeholder="Add remarks..."
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Normal Range: {param.normalRange}
                        </p>
                      </div>
                    ))}
                    <div>
                      <Label htmlFor="interpretation">
                        Interpretation (Optional)
                      </Label>
                      <Textarea
                        id="interpretation"
                        placeholder="Add overall interpretation..."
                        value={interpretation}
                        onChange={(e) => setInterpretation(e.target.value)}
                        rows={3}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setShowResultsDialog(false)}
                      disabled={savingResults}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSaveResults}
                      disabled={savingResults}
                    >
                      {savingResults ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save Results
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {test.results?.parameters ? (
            <div className="space-y-4">
              <div className="rounded-md border">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-medium">Parameter</th>
                      <th className="text-left p-3 font-medium">Value</th>
                      <th className="text-left p-3 font-medium">Unit</th>
                      <th className="text-left p-3 font-medium">
                        Normal Range
                      </th>
                      <th className="text-left p-3 font-medium">Flag</th>
                      <th className="text-left p-3 font-medium">Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {test.results.parameters.map((param, index) => (
                      <tr key={index} className="border-b last:border-b-0">
                        <td className="p-3 font-medium">{param.name}</td>
                        <td className="p-3">{param.value}</td>
                        <td className="p-3">{param.unit || "-"}</td>
                        <td className="p-3 text-sm text-muted-foreground">
                          {param.normalRange}
                        </td>
                        <td className="p-3">
                          <Badge
                            className={
                              param.flag === "critical"
                                ? "bg-red-100 text-red-800"
                                : param.flag === "high"
                                  ? "bg-orange-100 text-orange-800"
                                  : param.flag === "low"
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-green-100 text-green-800"
                            }
                          >
                            {param.flag || "normal"}
                          </Badge>
                        </td>
                        <td className="p-3 text-sm">{param.remarks || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {test.results.interpretation && (
                <div>
                  <h4 className="font-medium mb-2">Interpretation</h4>
                  <p className="text-sm text-muted-foreground">
                    {test.results.interpretation}
                  </p>
                </div>
              )}
              {test.results.reportedAt && (
                <div className="text-sm text-muted-foreground">
                  Reported on{" "}
                  {format(
                    parseISO(test.results.reportedAt),
                    "MMM dd, yyyy 'at' HH:mm",
                  )}
                  {test.results.reportedBy && (
                    <> by {test.results.reportedBy.name}</>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No results added yet</p>
              {canAddResults && (
                <p className="text-sm mt-2">
                  Click "Add Results" to enter test results
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      {test.notes && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{test.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {canCollectSample && (
              <Dialog
                open={showCollectDialog}
                onOpenChange={setShowCollectDialog}
              >
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <TestTube className="h-4 w-4 mr-2" />
                    Collect Sample
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Collect Sample</DialogTitle>
                    <DialogDescription>
                      Record sample collection details for this test
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label htmlFor="sampleId">Sample ID (Optional)</Label>
                      <Input
                        id="sampleId"
                        placeholder="Enter sample ID"
                        value={sampleId}
                        onChange={(e) => setSampleId(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="sampleCondition">Sample Condition</Label>
                      <Select
                        value={sampleCondition}
                        onValueChange={setSampleCondition}
                      >
                        <SelectTrigger id="sampleCondition">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="satisfactory">
                            Satisfactory
                          </SelectItem>
                          <SelectItem value="hemolyzed">Hemolyzed</SelectItem>
                          <SelectItem value="clotted">Clotted</SelectItem>
                          <SelectItem value="insufficient">
                            Insufficient
                          </SelectItem>
                          <SelectItem value="contaminated">
                            Contaminated
                          </SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {sampleCondition !== "satisfactory" && (
                      <div>
                        <Label htmlFor="sampleConditionNotes">
                          Condition Notes
                        </Label>
                        <Textarea
                          id="sampleConditionNotes"
                          placeholder="Describe the sample condition..."
                          value={sampleConditionNotes}
                          onChange={(e) =>
                            setSampleConditionNotes(e.target.value)
                          }
                          rows={2}
                        />
                      </div>
                    )}
                    <div>
                      <Label htmlFor="collectionNotes">
                        Collection Notes (Optional)
                      </Label>
                      <Textarea
                        id="collectionNotes"
                        placeholder="Add any notes about the collection..."
                        value={collectionNotes}
                        onChange={(e) => setCollectionNotes(e.target.value)}
                        rows={2}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setShowCollectDialog(false)}
                      disabled={collecting}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCollectSample}
                      disabled={collecting}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {collecting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Collecting...
                        </>
                      ) : (
                        <>
                          <TestTube className="h-4 w-4 mr-2" />
                          Collect Sample
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
            {canAddResults && (
              <Button onClick={() => setShowResultsDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Results
              </Button>
            )}
            {canFinalize && (
              <Button
                onClick={handleFinalizeTest}
                disabled={finalizing}
                className="bg-green-600 hover:bg-green-700"
              >
                {finalizing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Finalizing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Finalize Test
                  </>
                )}
              </Button>
            )}
            {canPrint && (
              <Button asChild>
                <Link href={`/laboratory/direct-tests/${test._id}/print`}>
                  <Printer className="h-4 w-4 mr-2" />
                  Print Report
                </Link>
              </Button>
            )}
            <Button variant="outline" asChild>
              <Link href="/laboratory/direct-tests">Back to All Tests</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
