// app/laboratory/direct-tests/[id]/page.tsx

"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
// Card components removed - using table-based layouts instead
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
  RefreshCw,
  Printer,
  Loader2,
  Plus,
  Save,
  Trash2,
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

interface SampleParameter {
  id: string;
  name: string;
  unit: string;
  normalRange: string;
  result: string;
}

interface TestParameter {
  id: string;
  name: string;
  value: string;
  unit: string;
  normalRange: string;
  remarks: string;
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
  const [loadingTemplate, setLoadingTemplate] = useState(false);

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

  // Edit parameters state (for main page editing)
  const [editingParameters, setEditingParameters] = useState(false);
  const [editableParameters, setEditableParameters] = useState<
    Array<{
      name: string;
      value: string;
      unit?: string;
      normalRange: string;
      remarks?: string;
    }>
  >([]);
  const [savingParameters, setSavingParameters] = useState(false);

  // Collect sample state
  const [showCollectDialog, setShowCollectDialog] = useState(false);
  const [collecting, setCollecting] = useState(false);
  const [sampleId, setSampleId] = useState("");
  const [sampleCondition, setSampleCondition] = useState("satisfactory");
  const [collectionNotes, setCollectionNotes] = useState("");
  const [sampleConditionNotes, setSampleConditionNotes] = useState("");

  // Specimen details state
  const [selectedTestId, setSelectedTestId] = useState<string>("");
  const [specimenQuantity, setSpecimenQuantity] = useState("");
  const [specimenContainer, setSpecimenContainer] = useState("");
  const [specimenRemarks, setSpecimenRemarks] = useState("");

  // Sample parameters (specimen characteristics)
  const [sampleParameters, setSampleParameters] = useState<SampleParameter[]>([
    { id: "1", name: "", unit: "", normalRange: "", result: "" },
  ]);

  // Test parameters (actual results)
  const [testParameters, setTestParameters] = useState<TestParameter[]>([
    { id: "1", name: "", value: "", unit: "", normalRange: "", remarks: "" },
  ]);

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
          data.data.results.parameters.map(
            (
              p: NonNullable<DirectLabTest["results"]>["parameters"][number],
            ) => ({
              name: p.name,
              value: String(p.value),
              unit: p.unit,
              normalRange: p.normalRange,
              flag: p.flag,
              remarks: p.remarks,
            }),
          ),
        );
        setInterpretation(data.data.results.interpretation || "");
        // Also initialize editable parameters
        setEditableParameters(
          data.data.results.parameters.map(
            (
              p: NonNullable<DirectLabTest["results"]>["parameters"][number],
            ) => ({
              name: p.name,
              value: String(p.value),
              unit: p.unit,
              normalRange: p.normalRange,
              remarks: p.remarks,
            }),
          ),
        );
      } else {
        // If no results yet, try to fetch template to initialize parameters
        await fetchTestTemplate(data.data);
      }
    } catch (error: unknown) {
      console.error("Error fetching test:", error);
      setError(
        error instanceof Error ? error.message : "Failed to load test details",
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchTestTemplate = async (testData: DirectLabTest) => {
    try {
      setLoadingTemplate(true);

      // Try to find the template by matching test name
      const response = await fetch("/api/laboratory/templates", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        console.error("Failed to fetch templates");
        return;
      }

      const data = await response.json();

      if (data.success && data.data) {
        // Find matching template by test name
        const matchingTemplate = data.data.find(
          (t: TestTemplate) => t.testName === testData.testName,
        );

        if (matchingTemplate && matchingTemplate.parameters) {
          setTemplate(matchingTemplate);

          // Initialize results parameters from template
          const paramsFromTemplate = matchingTemplate.parameters.map(
            (p: TestTemplate["parameters"][number]) => ({
              name: p.parameterName,
              value: "",
              unit: p.unit || "",
              normalRange: p.normalRange || "",
              flag: "normal" as const,
              remarks: "",
            }),
          );
          setResultsParameters(paramsFromTemplate);
          // Also initialize editable parameters
          setEditableParameters(
            paramsFromTemplate.map(
              (p: {
                name: string;
                value: string;
                unit: string;
                normalRange: string;
                flag: "normal";
                remarks: string;
              }) => ({
                name: p.name,
                value: p.value,
                unit: p.unit,
                normalRange: p.normalRange,
                remarks: p.remarks,
              }),
            ),
          );
        }
      }
    } catch (error: unknown) {
      console.error("Error fetching test template:", error);
    } finally {
      setLoadingTemplate(false);
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
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to process payment",
      );
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
        `/api/laboratory/direct-tests/${test._id}/results`,
        {
          method: "PUT",
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
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save results",
      );
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
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to finalize test",
      );
    } finally {
      setFinalizing(false);
    }
  };

  const handleSaveEditableParameters = async () => {
    if (!test) return;

    // Validate all parameters have values
    const invalidParams = editableParameters.filter(
      (p) => !p.value || p.value.trim() === "",
    );
    if (invalidParams.length > 0) {
      toast.error("Please fill in all parameter values");
      return;
    }

    try {
      setSavingParameters(true);

      const response = await fetch(
        `/api/laboratory/direct-tests/${test._id}/results`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            parameters: editableParameters.map((p) => ({
              name: p.name,
              value: p.value,
              unit: p.unit,
              normalRange: p.normalRange,
              flag: "normal" as const,
              remarks: p.remarks,
            })),
            interpretation: interpretation || undefined,
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save parameters");
      }

      const data = await response.json();
      toast.success("Parameters saved successfully");
      setEditingParameters(false);
      fetchTestDetails();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save parameters",
      );
    } finally {
      setSavingParameters(false);
    }
  };

  const handleCollectSample = async () => {
    if (!test) return;

    try {
      setCollecting(true);

      // Filter valid parameters
      const validSampleParameters = sampleParameters.filter(
        (p) => p.name.trim() && p.result.trim(),
      );

      const validTestParameters = testParameters.filter(
        (p) => p.name.trim() && p.value.trim(),
      );

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
            specimen: {
              type: selectedTestId,
              quantity: specimenQuantity,
              container: specimenContainer,
              remarks: specimenRemarks,
              parameters: validSampleParameters.map((p) => ({
                name: p.name,
                result: p.result,
                unit: p.unit,
                normalRange: p.normalRange,
              })),
            },
            testParameters: validTestParameters.map((p) => ({
              name: p.name,
              value: p.value,
              unit: p.unit,
              normalRange: p.normalRange,
              remarks: p.remarks,
            })),
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
      // Reset form
      setSampleId("");
      setSampleCondition("satisfactory");
      setCollectionNotes("");
      setSampleConditionNotes("");
      setSelectedTestId("");
      setSpecimenQuantity("");
      setSpecimenContainer("");
      setSpecimenRemarks("");
      setSampleParameters([
        { id: "1", name: "", unit: "", normalRange: "", result: "" },
      ]);
      setTestParameters([
        {
          id: "1",
          name: "",
          value: "",
          unit: "",
          normalRange: "",
          remarks: "",
        },
      ]);
      fetchTestDetails();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to collect sample",
      );
    } finally {
      setCollecting(false);
    }
  };

  // Sample parameter management functions
  const addSampleParameter = () => {
    const newId = (sampleParameters.length + 1).toString();
    setSampleParameters([
      ...sampleParameters,
      {
        id: newId,
        name: "",
        unit: "",
        normalRange: "",
        result: "",
      },
    ]);
  };

  const removeSampleParameter = (id: string) => {
    if (sampleParameters.length > 1) {
      setSampleParameters(sampleParameters.filter((p) => p.id !== id));
    }
  };

  const updateSampleParameter = (
    id: string,
    field: keyof SampleParameter,
    value: string,
  ) => {
    setSampleParameters(
      sampleParameters.map((param) =>
        param.id === id ? { ...param, [field]: value } : param,
      ),
    );
  };

  // Test parameter management functions
  const addTestParameter = () => {
    const newId = (testParameters.length + 1).toString();
    setTestParameters([
      ...testParameters,
      {
        id: newId,
        name: "",
        value: "",
        unit: "",
        normalRange: "",
        remarks: "",
      },
    ]);
  };

  const removeTestParameter = (id: string) => {
    if (testParameters.length > 1) {
      setTestParameters(testParameters.filter((p) => p.id !== id));
    }
  };

  const updateTestParameter = (
    id: string,
    field: keyof TestParameter,
    value: string,
  ) => {
    setTestParameters(
      testParameters.map((param) =>
        param.id === id ? { ...param, [field]: value } : param,
      ),
    );
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
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-muted/50 px-4 py-3 border-b">
            <h3 className="font-semibold flex items-center gap-2">
              <User className="h-5 w-5" />
              Patient Information
            </h3>
          </div>
          <table className="w-full">
            <tbody>
              <tr className="border-b">
                <td className="p-3 text-sm text-muted-foreground w-1/3">
                  Name
                </td>
                <td className="p-3 font-medium">{test.patient.name}</td>
              </tr>
              <tr className="border-b">
                <td className="p-3 text-sm text-muted-foreground">
                  Patient ID
                </td>
                <td className="p-3 font-medium">{test.patient.patientId}</td>
              </tr>
              <tr className="border-b">
                <td className="p-3 text-sm text-muted-foreground">Phone</td>
                <td className="p-3 font-medium">
                  {test.patient.phone || "N/A"}
                </td>
              </tr>
              <tr className="border-b">
                <td className="p-3 text-sm text-muted-foreground">Email</td>
                <td className="p-3 font-medium">
                  {test.patient.email || "N/A"}
                </td>
              </tr>
              <tr className="border-b">
                <td className="p-3 text-sm text-muted-foreground">Gender</td>
                <td className="p-3 font-medium">
                  {test.patient.gender || "N/A"}
                </td>
              </tr>
              <tr>
                <td className="p-3 text-sm text-muted-foreground">
                  Date of Birth
                </td>
                <td className="p-3 font-medium">
                  {test.patient.dateOfBirth
                    ? format(parseISO(test.patient.dateOfBirth), "MMM dd, yyyy")
                    : "N/A"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Test Details */}
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-muted/50 px-4 py-3 border-b">
            <h3 className="font-semibold flex items-center gap-2">
              <TestTube className="h-5 w-5" />
              Test Details
            </h3>
          </div>
          <table className="w-full">
            <tbody>
              <tr className="border-b">
                <td className="p-3 text-sm text-muted-foreground w-1/3">
                  Test Name
                </td>
                <td className="p-3 font-medium">{test.testName}</td>
              </tr>
              {test.description && (
                <tr className="border-b">
                  <td className="p-3 text-sm text-muted-foreground">
                    Description
                  </td>
                  <td className="p-3 text-sm">{test.description}</td>
                </tr>
              )}
              <tr className="border-b">
                <td className="p-3 text-sm text-muted-foreground">Category</td>
                <td className="p-3">
                  <Badge variant="outline">
                    {test.category.replace(/_/g, " ")}
                  </Badge>
                </td>
              </tr>
              <tr className="border-b">
                <td className="p-3 text-sm text-muted-foreground">Priority</td>
                <td className="p-3">
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
                </td>
              </tr>
              <tr className="border-b">
                <td className="p-3 text-sm text-muted-foreground">Specimen</td>
                <td className="p-3 font-medium">
                  {test.specimen?.type || "N/A"}
                </td>
              </tr>
              <tr className="border-b">
                <td className="p-3 text-sm text-muted-foreground">Created</td>
                <td className="p-3 font-medium">
                  {format(
                    parseISO(test.createdAtDirect),
                    "MMM dd, yyyy 'at' HH:mm",
                  )}
                </td>
              </tr>
              {test.createdBy && (
                <tr className="border-b">
                  <td className="p-3 text-sm text-muted-foreground">
                    Created By
                  </td>
                  <td className="p-3 font-medium">{test.createdBy.name}</td>
                </tr>
              )}
              {test.finalized && test.finalizedAt && (
                <tr>
                  <td className="p-3 text-sm text-muted-foreground">
                    Finalized
                  </td>
                  <td className="p-3">
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
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {/* Test Status */}
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-muted/50 px-4 py-3 border-b">
            <h3 className="font-semibold flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Test Status
            </h3>
          </div>
          <table className="w-full">
            <tbody>
              <tr className="border-b">
                <td className="p-3 text-sm text-muted-foreground w-1/3">
                  Status
                </td>
                <td className="p-3">
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
                </td>
              </tr>
              <tr className="border-b">
                <td className="p-3 text-sm text-muted-foreground">
                  Collection
                </td>
                <td className="p-3">
                  <Badge
                    className={
                      test.collectionStatus === "collected"
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                    }
                  >
                    {test.collectionStatus}
                  </Badge>
                </td>
              </tr>
              <tr className="border-b">
                <td className="p-3 text-sm text-muted-foreground">
                  Processing
                </td>
                <td className="p-3">
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
                </td>
              </tr>
              <tr className="border-b">
                <td className="p-3 text-sm text-muted-foreground">
                  Verification
                </td>
                <td className="p-3">
                  <Badge
                    className={
                      test.verificationStatus === "verified"
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                    }
                  >
                    {test.verificationStatus}
                  </Badge>
                </td>
              </tr>
              <tr className="border-b">
                <td className="p-3 text-sm text-muted-foreground">Finalized</td>
                <td className="p-3">
                  <Badge
                    className={
                      test.finalized
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }
                  >
                    {test.finalized ? "Yes" : "No"}
                  </Badge>
                </td>
              </tr>
              <tr>
                <td className="p-3 text-sm text-muted-foreground">
                  Ready for Print
                </td>
                <td className="p-3">
                  <Badge
                    className={
                      test.readyForPrint
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }
                  >
                    {test.readyForPrint ? "Yes" : "No"}
                  </Badge>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Test Results */}
      <div className="border rounded-lg overflow-hidden mt-6">
        <div className="bg-muted/50 px-4 py-3 border-b flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Test Results</h3>
            <p className="text-sm text-muted-foreground">
              {test.results?.parameters
                ? "Results have been added"
                : "Results not yet added"}
            </p>
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
                {loadingTemplate ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    <span className="ml-3 text-muted-foreground">
                      Loading test parameters...
                    </span>
                  </div>
                ) : (
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
                              onValueChange={(
                                value: "normal" | "low" | "high" | "critical",
                              ) => {
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
                )}
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
                    disabled={savingResults || loadingTemplate}
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
        <div className="p-4">
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
        </div>
      </div>

      {/* Editable Parameters Section - Displayed after payment */}
      {test.paymentVerified && !test.finalized && (
        <div className="border rounded-lg overflow-hidden mt-6 border-blue-200 dark:border-blue-800">
          <div className="bg-muted/50 px-4 py-3 border-b flex items-center justify-between">
            <div>
              <h3 className="font-semibold flex items-center gap-2">
                <TestTube className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                Test Parameters
              </h3>
              <p className="text-sm text-muted-foreground">
                {editingParameters
                  ? "Edit parameter values below"
                  : "Click Edit to modify parameter values"}
              </p>
            </div>
            <div className="flex gap-2">
              {editingParameters ? (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setEditingParameters(false)}
                    disabled={savingParameters}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveEditableParameters}
                    disabled={savingParameters}
                  >
                    {savingParameters ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Parameters
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <Button
                  onClick={() => setEditingParameters(true)}
                  variant="outline"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Edit Parameters
                </Button>
              )}
            </div>
          </div>
          <div className="p-4">
            {editableParameters.length > 0 ? (
              <div className="space-y-4">
                {editableParameters.map((param, index) => (
                  <div
                    key={index}
                    className="border rounded-md p-4 space-y-3 bg-blue-50/50 dark:bg-blue-950/20"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{param.name}</h4>
                      <Badge variant="outline">{param.unit || "N/A"}</Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor={`param-value-${index}`}>Value</Label>
                        <Input
                          id={`param-value-${index}`}
                          value={param.value}
                          onChange={(e) => {
                            const newParams = [...editableParameters];
                            newParams[index].value = e.target.value;
                            setEditableParameters(newParams);
                          }}
                          placeholder="Enter value"
                          disabled={!editingParameters}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`param-remarks-${index}`}>
                          Remarks (Optional)
                        </Label>
                        <Input
                          id={`param-remarks-${index}`}
                          value={param.remarks || ""}
                          onChange={(e) => {
                            const newParams = [...editableParameters];
                            newParams[index].remarks = e.target.value;
                            setEditableParameters(newParams);
                          }}
                          placeholder="Add remarks..."
                          disabled={!editingParameters}
                        />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Normal Range: {param.normalRange}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <TestTube className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No parameters available</p>
                <p className="text-sm mt-2">
                  Parameters will be loaded from the test template
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Notes */}
      {test.notes && (
        <div className="border rounded-lg overflow-hidden mt-6">
          <div className="bg-muted/50 px-4 py-3 border-b">
            <h3 className="font-semibold">Notes</h3>
          </div>
          <div className="p-4">
            <p className="text-sm">{test.notes}</p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="border rounded-lg overflow-hidden mt-6">
        <div className="bg-muted/50 px-4 py-3 border-b">
          <h3 className="font-semibold">Actions</h3>
        </div>
        <div className="p-4">
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
                <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Collect Sample</DialogTitle>
                    <DialogDescription>
                      Record sample collection details and test results for this
                      test
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-6 py-4">
                    {/* Basic Sample Information */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold mb-3">
                        Basic Sample Information
                      </h3>
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
                        <Label htmlFor="sampleCondition">
                          Sample Condition
                        </Label>
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

                    <Separator />

                    {/* Specimen Details */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold mb-3">
                        Specimen Details
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="specimenType">Test Type</Label>
                          <Select
                            value={selectedTestId}
                            onValueChange={setSelectedTestId}
                          >
                            <SelectTrigger id="specimenType">
                              <SelectValue placeholder="Select test type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="blood">Blood Test</SelectItem>
                              <SelectItem value="urine">Urine Test</SelectItem>
                              <SelectItem value="stool">Stool Test</SelectItem>
                              <SelectItem value="tissue">
                                Tissue Test
                              </SelectItem>
                              <SelectItem value="saliva">
                                Saliva Test
                              </SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="specimenQuantity">Quantity</Label>
                          <Input
                            id="specimenQuantity"
                            placeholder="e.g., 5ml, 10g"
                            value={specimenQuantity}
                            onChange={(e) =>
                              setSpecimenQuantity(e.target.value)
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="specimenContainer">Container</Label>
                          <Input
                            id="specimenContainer"
                            placeholder="e.g., EDTA tube, sterile container"
                            value={specimenContainer}
                            onChange={(e) =>
                              setSpecimenContainer(e.target.value)
                            }
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="specimenRemarks">
                          Specimen Remarks (Optional)
                        </Label>
                        <Textarea
                          id="specimenRemarks"
                          placeholder="Any special instructions or observations..."
                          value={specimenRemarks}
                          onChange={(e) => setSpecimenRemarks(e.target.value)}
                          rows={2}
                        />
                      </div>
                    </div>

                    <Separator />

                    {/* Sample Parameters (Specimen Characteristics) */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-semibold">
                          Sample Parameters
                        </h3>
                        <Button
                          type="button"
                          onClick={addSampleParameter}
                          variant="outline"
                          size="sm"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Parameter
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Record specimen characteristics (volume, color, pH,
                        etc.)
                      </p>
                      <div className="space-y-4">
                        {sampleParameters.map((param) => (
                          <div
                            key={param.id}
                            className="border rounded-lg p-4 space-y-3"
                          >
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium">Parameter</h4>
                              {sampleParameters.length > 1 && (
                                <Button
                                  type="button"
                                  onClick={() =>
                                    removeSampleParameter(param.id)
                                  }
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                              <div className="space-y-2">
                                <Label>Parameter Name</Label>
                                <Input
                                  value={param.name}
                                  onChange={(e) =>
                                    updateSampleParameter(
                                      param.id,
                                      "name",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="e.g., Volume, Color, pH"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Result</Label>
                                <Input
                                  value={param.result}
                                  onChange={(e) =>
                                    updateSampleParameter(
                                      param.id,
                                      "result",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="Enter result"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Unit</Label>
                                <Input
                                  value={param.unit}
                                  onChange={(e) =>
                                    updateSampleParameter(
                                      param.id,
                                      "unit",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="e.g., ml, g, pH"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Normal Range</Label>
                                <Input
                                  value={param.normalRange}
                                  onChange={(e) =>
                                    updateSampleParameter(
                                      param.id,
                                      "normalRange",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="e.g., 4.5-11.0"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Separator />

                    {/* Test Parameters (Actual Results) */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-semibold">
                          Test Parameters (Results)
                        </h3>
                        <Button
                          type="button"
                          onClick={addTestParameter}
                          variant="outline"
                          size="sm"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Parameter
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Enter actual test result values. Parameter Name and
                        Value are required.
                      </p>
                      <div className="space-y-4">
                        {testParameters.map((param, index) => (
                          <div
                            key={param.id}
                            className="border rounded-lg p-4 space-y-4 bg-blue-50/50 dark:bg-blue-950/20"
                          >
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium">
                                Parameter #{index + 1}
                              </h4>
                              {testParameters.length > 1 && (
                                <Button
                                  type="button"
                                  onClick={() => removeTestParameter(param.id)}
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>Parameter Name *</Label>
                                <Input
                                  value={param.name}
                                  onChange={(e) =>
                                    updateTestParameter(
                                      param.id,
                                      "name",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="e.g., Hemoglobin, WBC Count"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Value *</Label>
                                <Input
                                  value={param.value}
                                  onChange={(e) =>
                                    updateTestParameter(
                                      param.id,
                                      "value",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="Enter test result value"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Unit</Label>
                                <Input
                                  value={param.unit}
                                  onChange={(e) =>
                                    updateTestParameter(
                                      param.id,
                                      "unit",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="e.g., g/dL, cells/μL"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Normal Range</Label>
                                <Input
                                  value={param.normalRange}
                                  onChange={(e) =>
                                    updateTestParameter(
                                      param.id,
                                      "normalRange",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="e.g., 13.5-17.5 g/dL"
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label>Remarks (Optional)</Label>
                              <Textarea
                                value={param.remarks || ""}
                                onChange={(e) =>
                                  updateTestParameter(
                                    param.id,
                                    "remarks",
                                    e.target.value,
                                  )
                                }
                                placeholder="Any additional remarks or notes..."
                                rows={2}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
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
        </div>
      </div>
    </div>
  );
}
