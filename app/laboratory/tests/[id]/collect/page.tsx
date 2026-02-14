//app/laboratory/tests/[id]/collect/page.tsx

"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  ArrowLeft,
  TestTube,
  Search,
  AlertTriangle,
  CheckCircle,
  User,
  Stethoscope,
  CreditCard,
  Clock,
  Plus,
  Trash2,
  RefreshCw,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { useAuthStore } from "@/store/useAuthStore";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface TestInfo {
  _id: string;
  testId: string;
  testName: string;
  patient: {
    name: string;
    patientId: string;
    dateOfBirth?: string;
    age?: number;
    gender?: string;
    phone?: string;
  };
  doctor?: {
    name: string;
  };
  orderedBy?: {
    name: string;
    role?: string;
  };
  priority: string;
  status: string;
  collectionStatus: string;
  paymentVerified: boolean;
  charges: {
    paymentStatus: string;
    paid: number;
    due: number;
  };
  specimen?: {
    type?: string;
    quantity?: string;
    container?: string;
    remarks?: string;
  };
  [key: string]: any; // Allow additional properties
}

interface SampleParameter {
  id: string;
  name: string;
  unit: string;
  normalRange: string;
  result: string;
  remarks?: string;
}

interface LabTest {
  id: string;
  name: string;
  price: number;
  parameters: SampleParameter[];
}

interface LabTestCategory {
  name: string;
  tests: LabTest[];
}

interface LabTestTemplate {
  _id: string;
  testName: string;
  category: string;
  basePrice: number;
  specimenType?: string[];
  parameters?: Array<{
    parameterName?: string;
    name?: string;
    unit?: string;
    normalRange?: string;
  }>;
}

const SPECIMEN_TYPES = [
  "blood",
  "urine",
  "stool",
  "tissue",
  "saliva",
  "other",
] as const;

// Comprehensive lab tests data structure with all categories
// Lab test options are now loaded from lab test templates API.

const emptyParameter = (): SampleParameter => ({
  id: "1",
  name: "",
  unit: "",
  normalRange: "",
  result: "",
});

// Helper function to calculate age
const calculateAge = (dateOfBirth: string | Date): number => {
  if (!dateOfBirth) return 0;
  const dob = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }

  return age;
};

// Helper function to get doctor name
const getDoctorName = (test: TestInfo | null): string => {
  if (!test) return "Doctor not available";

  // Try doctor field first
  if (test.doctor?.name) {
    return test.doctor.name.startsWith("Dr. ")
      ? test.doctor.name
      : `Dr. ${test.doctor.name}`;
  }

  // Try orderedBy if they are a doctor
  if (test.orderedBy?.name && test.orderedBy?.role === "doctor") {
    const name = test.orderedBy.name;
    return name.startsWith("Dr. ") ? name : `Dr. ${name}`;
  }

  // Check if orderedBy has a name (might be a receptionist who ordered it)
  if (test.orderedBy?.name) {
    return test.orderedBy.name;
  }

  return "Doctor not assigned";
};

// Format date for display
const formatDate = (dateString?: string): string => {
  if (!dateString) return "N/A";
  try {
    return format(new Date(dateString), "dd/MM/yyyy");
  } catch {
    return "Invalid date";
  }
};

// Check if user can see prices (receptionist role)
const canSeePrices = (userRole?: string): boolean => {
  return userRole === "receptionist";
};

export default function CollectSamplePage() {
  const params = useParams();
  const router = useRouter();
  const { accessToken, user } = useAuthStore();
  const [test, setTest] = useState<TestInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [labTests, setLabTests] = useState<LabTestCategory[]>([]);
  const [initialSpecimenType, setInitialSpecimenType] = useState("");
  const [initialOrderedTestName, setInitialOrderedTestName] = useState("");

  // Form state
  const [sampleId, setSampleId] = useState("");
  const [sampleCondition, setSampleCondition] = useState("satisfactory");
  const [sampleConditionNotes, setSampleConditionNotes] = useState("");

  // Dynamic parameters
  const [selectedTestId, setSelectedTestId] = useState<string>("");
  const [testSearchQuery, setTestSearchQuery] = useState("");
  const [testSearchResults, setTestSearchResults] = useState<LabTest[]>([]);
  const [showTestDropdown, setShowTestDropdown] = useState(false);
  const [activeTestIndex, setActiveTestIndex] = useState(-1);
  const testSearchRef = useRef<HTMLDivElement | null>(null);
  const [specimenQuantity, setSpecimenQuantity] = useState("");
  const [specimenContainer, setSpecimenContainer] = useState("");
  const [specimenRemarks, setSpecimenRemarks] = useState("");
  const [parameters, setParameters] = useState<SampleParameter[]>([
    emptyParameter(),
  ]);

  // Generate sample ID
  useEffect(() => {
    if (!sampleId) {
      const date = new Date();
      const year = date.getFullYear().toString().slice(-2);
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      const day = date.getDate().toString().padStart(2, "0");
      const random = Math.floor(1000 + Math.random() * 9000);
      setSampleId(`SMP${year}${month}${day}${random}`);
    }
  }, [sampleId]);

  useEffect(() => {
    fetchTemplates();
  }, [accessToken]);

  useEffect(() => {
    fetchTestInfo();
  }, [params.id]);

  const fetchTemplates = async () => {
    try {
      setLoadingTemplates(true);
      if (!accessToken) return;

      const response = await fetch("/api/laboratory/templates?active=true", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to load test templates");
      }

      const data = await response.json();
      const templates: LabTestTemplate[] = data.data || [];

      const grouped = new Map<string, LabTest[]>();
      templates.forEach((template) => {
        const categoryLabel = (template.category || "other")
          .replace(/_/g, " ")
          .replace(/\b\w/g, (l) => l.toUpperCase());

        const current = grouped.get(categoryLabel) || [];
        current.push({
          id: template._id,
          name: template.testName,
          price: Number(template.basePrice) || 0,
          parameters: (template.parameters || []).map((param, index) => ({
            id: String(index + 1),
            name: param.parameterName || param.name || "",
            unit: param.unit || "",
            normalRange: param.normalRange || "",
            result: "",
          })),
        });
        grouped.set(categoryLabel, current);
      });

      const mapped = Array.from(grouped.entries()).map(([name, tests]) => ({
        name,
        tests,
      }));
      setLabTests(mapped);
    } catch (err: any) {
      console.error("Error fetching templates:", err);
      setError(err.message || "Failed to load test templates");
    } finally {
      setLoadingTemplates(false);
    }
  };

  const fetchTestInfo = async () => {
    try {
      setLoading(true);
      if (!accessToken) {
        router.push("/login");
        return;
      }

      console.log(`Fetching test info for ID: ${params.id}`);

      const response = await fetch(
        `/api/laboratory/tests/${params.id}/collect/info`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error("API Error Response:", errorText);
        throw new Error(`Failed to fetch test information: ${response.status}`);
      }

      const data = await response.json();
      console.log("API Response data:", data);

      if (!data.success) {
        throw new Error(data.error || "API returned unsuccessful response");
      }

      // Process the data
      const processedData: TestInfo = {
        ...data.data,
        doctor: data.data.doctor || { name: "Not Assigned" },
        patient: {
          name: data.data.patient?.name || "Unknown Patient",
          patientId: data.data.patient?.patientId || "N/A",
          phone: data.data.patient?.phone || null,
          dateOfBirth: data.data.patient?.dateOfBirth || null,
          age:
            data.data.patient?.age ||
            (data.data.patient?.dateOfBirth
              ? calculateAge(data.data.patient.dateOfBirth)
              : undefined),
          gender: data.data.patient?.gender || null,
        },
        orderedBy: data.data.orderedBy || null,
        collectionStatus: data.data.collectionStatus || "pending",
        priority: data.data.priority || "routine",
        status: data.data.status || "pending",
        paymentVerified: data.data.paymentVerified || false,
        charges: data.data.charges || {
          paymentStatus: "pending",
          paid: 0,
          due: 0,
        },
      };

      console.log("Processed test data:", processedData);
      setTest(processedData);

      // Keep hints; selection is resolved once templates are loaded.
      setInitialSpecimenType(data.data.specimen?.type || "");
      setInitialOrderedTestName(data.data.testName || "");

      // Pre-fill other specimen details
      if (data.data.specimen?.quantity) {
        setSpecimenQuantity(data.data.specimen.quantity);
      }
      if (data.data.specimen?.container) {
        setSpecimenContainer(data.data.specimen.container);
      }
      if (data.data.specimen?.remarks) {
        setSpecimenRemarks(data.data.specimen.remarks);
      }
    } catch (err: any) {
      console.error("Error fetching test info:", err);
      setError(err.message || "Failed to load test information");
    } finally {
      setLoading(false);
    }
  };

  // Handle test selection change
  useEffect(() => {
    if (!labTests.length) return;
    if (selectedTestId) return;

    const allTests = labTests.flatMap((category) => category.tests);

    if (initialSpecimenType) {
      const byId = allTests.find((t) => t.id === initialSpecimenType);
      if (byId) {
        setSelectedTestId(byId.id);
        return;
      }
    }

    if (initialOrderedTestName) {
      const normalizedName = String(initialOrderedTestName).trim().toLowerCase();
      const byName = allTests.find(
        (t) => t.name.trim().toLowerCase() === normalizedName,
      );
      if (byName) {
        setSelectedTestId(byName.id);
      }
    }
  }, [labTests, initialSpecimenType, initialOrderedTestName, selectedTestId]);

  useEffect(() => {
    if (testSearchQuery.trim() === "") {
      setTestSearchResults([]);
      setShowTestDropdown(false);
      setActiveTestIndex(-1);
      return;
    }

    const query = testSearchQuery.toLowerCase().trim();
    const results: LabTest[] = [];

    labTests.forEach((category) => {
      category.tests.forEach((test) => {
        const testName = test.name.toLowerCase();
        const categoryName = category.name.toLowerCase();
        const words = testName.split(/\s+/);
        const acronym = words.map((w) => w[0]).join("");

        if (
          testName.includes(query) ||
          categoryName.includes(query) ||
          acronym.includes(query) ||
          words.some((word) => word.startsWith(query)) ||
          testName
            .replace(/[^a-z0-9]/g, "")
            .includes(query.replace(/[^a-z0-9]/g, ""))
        ) {
          results.push(test);
        }
      });
    });

    setTestSearchResults(results.slice(0, 10));
    setShowTestDropdown(true);
    setActiveTestIndex(results.length > 0 ? 0 : -1);
  }, [testSearchQuery, labTests]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        testSearchRef.current &&
        !testSearchRef.current.contains(event.target as Node)
      ) {
        setShowTestDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle test selection change
  useEffect(() => {
    if (selectedTestId) {
      // Find the test in labTests and populate its parameters
      const test = labTests
        .flatMap((category) => category.tests)
        .find((t) => t.id === selectedTestId);
      if (test) {
        setParameters(
          test.parameters.length ? test.parameters : [emptyParameter()],
        );
      } else {
        setParameters([emptyParameter()]);
      }
    } else {
      setParameters([emptyParameter()]);
    }
  }, [selectedTestId, labTests]);

  const handleSelectTest = (testId: string) => {
    setSelectedTestId(testId);
    setTestSearchQuery("");
    setTestSearchResults([]);
    setShowTestDropdown(false);
    setActiveTestIndex(-1);
  };

  const handleTestSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showTestDropdown && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setShowTestDropdown(true);
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (testSearchResults.length === 0) return;
      setActiveTestIndex((prev) =>
        prev < testSearchResults.length - 1 ? prev + 1 : 0,
      );
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (testSearchResults.length === 0) return;
      setActiveTestIndex((prev) =>
        prev > 0 ? prev - 1 : testSearchResults.length - 1,
      );
      return;
    }

    if (e.key === "Enter" && showTestDropdown) {
      e.preventDefault();
      if (activeTestIndex >= 0 && testSearchResults[activeTestIndex]) {
        handleSelectTest(testSearchResults[activeTestIndex].id);
      }
      return;
    }

    if (e.key === "Escape") {
      setShowTestDropdown(false);
      setActiveTestIndex(-1);
    }
  };

  const addParameter = () => {
    const newId = (parameters.length + 1).toString();
    setParameters([
      ...parameters,
      {
        id: newId,
        name: "",
        unit: "",
        normalRange: "",
        result: "",
      },
    ]);
  };

  const removeParameter = (id: string) => {
    if (parameters.length > 1) {
      setParameters(parameters.filter((p) => p.id !== id));
    }
  };

  const updateParameter = (
    id: string,
    field: keyof SampleParameter,
    value: string,
  ) => {
    setParameters(
      parameters.map((param) =>
        param.id === id ? { ...param, [field]: value } : param,
      ),
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSubmitting(true);
      if (!accessToken) {
        router.push("/login");
        return;
      }

      // Filter valid parameters (name and value are required)
      const validParameters = parameters.filter(
        (p) => p.name.trim() && p.result.trim(),
      );

      const payload = {
        sampleId,
        sampleCondition,
        sampleConditionNotes,
        specimen: {
          type: selectedTestId,
          quantity: specimenQuantity,
          container: specimenContainer,
          remarks: specimenRemarks,
          parameters: validParameters,
        },
        // Keep backward compatibility with API expecting testParameters
        testParameters: validParameters.map((p) => ({
          name: p.name,
          value: p.result,
          unit: p.unit,
          normalRange: p.normalRange,
          remarks: p.remarks || "",
        })),
        results: {
          parameters: validParameters.map((p) => ({
            name: p.name,
            value: p.result,
            unit: p.unit,
            normalRange: p.normalRange,
            remarks: p.remarks || "",
          })),
        },
      };

      console.log("Submitting sample data:", payload);

      const response = await fetch(
        `/api/laboratory/tests/${params.id}/collect`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      const data = await response.json();

      if (response.ok) {
        alert(data.message || "Sample collected successfully!");
        router.push(`/laboratory/tests/${params.id}`);
      } else {
        throw new Error(data.error || "Failed to collect sample");
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Check conditions - Collect Sample is now the LAST step
  const condition1 = test?.status !== "cancelled";
  const condition2 = test?.paymentVerified || test?.priority !== "routine";
  const condition3 = test?.collectionStatus !== "collected";

  const canCollectSample = condition1 && condition2 && condition3;
  const requiresPaymentVerification =
    test?.priority === "routine" && !test?.paymentVerified;

  if (loading || loadingTemplates) {
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
          <h1 className="text-2xl font-bold">Sample Collection</h1>
        </div>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error || "Failed to load test information. Please try again."}
          </AlertDescription>
        </Alert>
        <Button
          onClick={() => router.push("/laboratory/tests")}
          className="mt-4"
        >
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
            Collect Sample
          </h1>
          <p className="text-muted-foreground">
            Collect specimen for test: {test.testName}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-3 space-y-6">
          {/* Show warnings but don't hide form */}
          {requiresPaymentVerification && (
            <Alert className="border border-yellow-200 dark:border-yellow-800 bg-card">
              <CreditCard className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              <AlertTitle className="text-yellow-800 dark:text-yellow-300">
                Payment Verification Required
              </AlertTitle>
              <AlertDescription className="text-yellow-700 dark:text-yellow-400">
                This routine test requires payment verification before sample
                collection.
                {canSeePrices(user?.role) && test.charges.due > 0 && (
                  <span className="block mt-1 font-medium">
                    Payment due: ₹{test.charges.due}
                  </span>
                )}
              </AlertDescription>
              <Button
                variant="outline"
                className="mt-2 border-yellow-300 dark:border-yellow-700 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/30"
                onClick={() =>
                  router.push(`/laboratory/tests/${params.id}/verify-payment`)
                }
              >
                Verify Payment Now
              </Button>
            </Alert>
          )}

          {!canCollectSample && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Cannot Collect Sample Yet</AlertTitle>
              <AlertDescription>
                Please ensure:
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li>Payment is verified (for routine tests)</li>
                  <li>Sample has not been collected yet</li>
                  <li>Test is not cancelled</li>
                </ul>
                <div className="mt-2 text-sm">
                  <p>Current status:</p>
                  <ul className="list-disc pl-5">
                    <li>
                      Payment Verified: {test.paymentVerified ? "Yes" : "No"}
                    </li>
                    <li>Collection Status: {test.collectionStatus}</li>
                    <li>Test Status: {test.status}</li>
                    <li>Priority: {test.priority}</li>
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          )}
          {/* FORM */}
          <form onSubmit={handleSubmit} className="space-y-6 relative">
            {/* Disabled overlay when can't collect */}
            {!canCollectSample && (
              <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 rounded-lg flex items-center justify-center">
                <div className="text-center p-6 bg-card border rounded-lg shadow-lg">
                  <AlertTriangle className="h-12 w-12 mx-auto text-yellow-500 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Form Disabled</h3>
                  <p className="text-muted-foreground mb-4">
                    Complete the requirements above to enable sample collection
                  </p>
                  {requiresPaymentVerification && (
                    <Button
                      variant="default"
                      onClick={() =>
                        router.push(
                          `/laboratory/tests/${params.id}/verify-payment`,
                        )
                      }
                    >
                      Verify Payment
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TestTube className="h-5 w-5" />
                  Sample Information
                </CardTitle>
                <CardDescription>
                  Basic sample collection details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Sample ID */}
                <div className="space-y-2">
                  <Label htmlFor="sampleId">Sample ID</Label>
                  <div className="flex gap-2">
                    <Input
                      id="sampleId"
                      value={sampleId}
                      onChange={(e) => setSampleId(e.target.value)}
                      placeholder="Enter sample ID"
                      required
                      disabled={!canCollectSample}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        const date = new Date();
                        const year = date.getFullYear().toString().slice(-2);
                        const month = (date.getMonth() + 1)
                          .toString()
                          .padStart(2, "0");
                        const day = date.getDate().toString().padStart(2, "0");
                        const random = Math.floor(1000 + Math.random() * 9000);
                        setSampleId(`SMP${year}${month}${day}${random}`);
                      }}
                      disabled={!canCollectSample}
                    >
                      Generate
                    </Button>
                  </div>
                </div>

                {/* Sample Condition */}
                <div className="space-y-2">
                  <Label htmlFor="sampleCondition">Sample Condition</Label>
                  <Select
                    value={sampleCondition}
                    onValueChange={setSampleCondition}
                    disabled={!canCollectSample}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select sample condition" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="satisfactory">Satisfactory</SelectItem>
                      <SelectItem value="hemolyzed">Hemolyzed</SelectItem>
                      <SelectItem value="clotted">Clotted</SelectItem>
                      <SelectItem value="insufficient">
                        Insufficient Volume
                      </SelectItem>
                      <SelectItem value="contaminated">Contaminated</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Sample Condition Notes */}
                {sampleCondition !== "satisfactory" && (
                  <div className="space-y-2">
                    <Label htmlFor="sampleConditionNotes">
                      Condition Notes
                    </Label>
                    <Textarea
                      id="sampleConditionNotes"
                      value={sampleConditionNotes}
                      onChange={(e) => setSampleConditionNotes(e.target.value)}
                      placeholder="Describe the sample condition issue..."
                      rows={3}
                      disabled={!canCollectSample}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
            {/* Specimen Details */}
            <Card>
              <CardHeader>
                <CardTitle>Specimen Details</CardTitle>
                <CardDescription>
                  Select test type and provide details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="specimenType">Test Type *</Label>
                    <div className="relative" ref={testSearchRef}>
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="specimenType"
                        placeholder={
                          labTests.length
                            ? "Search test type (e.g. cbc, liver, urine)..."
                            : "No templates available"
                        }
                        className="pl-9 pr-9"
                        value={testSearchQuery}
                        onChange={(e) => setTestSearchQuery(e.target.value)}
                        onFocus={() =>
                          testSearchQuery && setShowTestDropdown(true)
                        }
                        onKeyDown={handleTestSearchKeyDown}
                        disabled={
                          !canCollectSample || loadingTemplates || !labTests.length
                        }
                      />
                      {testSearchQuery && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-2 top-2 h-6 w-6"
                          onClick={() => {
                            setTestSearchQuery("");
                            setShowTestDropdown(false);
                            setTestSearchResults([]);
                            setActiveTestIndex(-1);
                          }}
                          disabled={!canCollectSample}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}

                      {showTestDropdown && (
                        <div className="absolute z-50 w-full mt-1 border rounded-md shadow-lg bg-popover max-h-80 overflow-y-auto">
                          {testSearchResults.length > 0 ? (
                            testSearchResults.map((foundTest, index) => {
                              const category = labTests.find((cat) =>
                                cat.tests.some((t) => t.id === foundTest.id),
                              )?.name;
                              return (
                                <button
                                  key={foundTest.id}
                                  type="button"
                                  className={`w-full text-left px-4 py-3 transition-colors border-b last:border-b-0 ${
                                    activeTestIndex === index
                                      ? "bg-accent"
                                      : "hover:bg-accent"
                                  }`}
                                  onMouseEnter={() => setActiveTestIndex(index)}
                                  onClick={() => handleSelectTest(foundTest.id)}
                                >
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                      <div className="font-medium truncate">
                                        {foundTest.name}
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        {category} • {foundTest.parameters.length}{" "}
                                        parameters
                                      </div>
                                    </div>
                                    <Badge variant="secondary" className="text-xs">
                                      ₹{foundTest.price}
                                    </Badge>
                                  </div>
                                </button>
                              );
                            })
                          ) : (
                            <div className="p-4 text-sm text-muted-foreground text-center">
                              No matching test found
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="specimenQuantity">Quantity</Label>
                    <Input
                      id="specimenQuantity"
                      value={specimenQuantity}
                      onChange={(e) => setSpecimenQuantity(e.target.value)}
                      placeholder="e.g., 5ml, 10g"
                      disabled={!canCollectSample}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="specimenContainer">Container</Label>
                    <Input
                      id="specimenContainer"
                      value={specimenContainer}
                      onChange={(e) => setSpecimenContainer(e.target.value)}
                      placeholder="e.g., EDTA tube, sterile container"
                      disabled={!canCollectSample}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="specimenRemarks">Specimen Remarks</Label>
                  <Textarea
                    id="specimenRemarks"
                    value={specimenRemarks}
                    onChange={(e) => setSpecimenRemarks(e.target.value)}
                    placeholder="Any special instructions or observations..."
                    rows={2}
                    disabled={!canCollectSample}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Dynamic Parameters */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Sample Parameters</span>
                  <Button
                    type="button"
                    onClick={addParameter}
                    variant="outline"
                    size="sm"
                    disabled={!canCollectSample}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Parameter
                  </Button>
                </CardTitle>
                <CardDescription>
                  Record parameter result values in a single-row table layout
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Parameter Name</TableHead>
                        <TableHead>Result</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead>Normal Range</TableHead>
                        <TableHead>Remarks</TableHead>
                        <TableHead className="w-[70px]">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parameters.map((param) => (
                        <TableRow key={param.id}>
                          <TableCell>
                            <Input
                              value={param.name}
                              onChange={(e) =>
                                updateParameter(param.id, "name", e.target.value)
                              }
                              placeholder="e.g., Hemoglobin"
                              disabled={!canCollectSample}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={param.result}
                              onChange={(e) =>
                                updateParameter(param.id, "result", e.target.value)
                              }
                              placeholder="Enter result"
                              disabled={!canCollectSample}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={param.unit}
                              onChange={(e) =>
                                updateParameter(param.id, "unit", e.target.value)
                              }
                              placeholder="Unit"
                              disabled={!canCollectSample}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={param.normalRange}
                              onChange={(e) =>
                                updateParameter(
                                  param.id,
                                  "normalRange",
                                  e.target.value,
                                )
                              }
                              placeholder="Normal range"
                              disabled={!canCollectSample}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={param.remarks || ""}
                              onChange={(e) =>
                                updateParameter(param.id, "remarks", e.target.value)
                              }
                              placeholder="Remarks"
                              disabled={!canCollectSample}
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              onClick={() => removeParameter(param.id)}
                              variant="ghost"
                              size="sm"
                              className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                              disabled={!canCollectSample || parameters.length === 1}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Submit Button */}
            <div className="flex gap-2">
              <Button
                type="submit"
                disabled={submitting || !canCollectSample}
                className="flex-1"
                size="lg"
              >
                {submitting ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Collecting Sample...
                  </>
                ) : (
                  <>
                    <TestTube className="h-4 w-4 mr-2" />
                    {canCollectSample
                      ? "Collect Sample"
                      : "Complete Requirements First"}
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                size="lg"
              >
                Cancel
              </Button>
            </div>
          </form>
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
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge
                  variant={
                    test.collectionStatus === "pending"
                      ? "secondary"
                      : test.collectionStatus === "scheduled"
                        ? "default"
                        : "outline"
                  }
                >
                  {test.collectionStatus}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Priority</p>
                <Badge
                  variant={
                    test.priority === "emergency"
                      ? "destructive"
                      : test.priority === "urgent"
                        ? "default"
                        : "secondary"
                  }
                >
                  {test.priority}
                </Badge>
              </div>
              {test.specimen?.type && (
                <div>
                  <p className="text-sm text-muted-foreground">Test Type</p>
                  <p className="font-medium">
                    {(() => {
                      const testType = labTests
                        .flatMap((category) => category.tests)
                        .find((t) => t.id === test.specimen?.type);
                      return testType ? testType.name : test.specimen.type;
                    })()}
                  </p>
                </div>
              )}
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
                <p className="text-sm text-muted-foreground">Age</p>
                <p className="font-medium">
                  {test.patient.age ? `${test.patient.age} years` : "N/A"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Gender</p>
                <p className="font-medium capitalize">
                  {test.patient.gender || "N/A"}
                </p>
              </div>
              {test.patient.phone && (
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{test.patient.phone}</p>
                </div>
              )}
              {test.patient.dateOfBirth && (
                <div>
                  <p className="text-sm text-muted-foreground">Date of Birth</p>
                  <p className="font-medium">
                    {formatDate(test.patient.dateOfBirth)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Stethoscope className="h-5 w-5" />
                Doctor Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Doctor</p>
                <p className="font-medium">{getDoctorName(test)}</p>
              </div>
              {test.orderedBy && (
                <div>
                  <p className="text-sm text-muted-foreground">Ordered By</p>
                  <p className="font-medium">
                    {test.orderedBy.name}
                    {test.orderedBy.role && ` (${test.orderedBy.role})`}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Payment Status</p>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      test.paymentVerified
                        ? "default"
                        : test.charges.paymentStatus === "paid"
                          ? "default"
                          : test.charges.paymentStatus === "partial"
                            ? "secondary"
                            : "destructive"
                    }
                  >
                    {test.paymentVerified
                      ? "Verified"
                      : test.charges.paymentStatus}
                  </Badge>
                  {test.paymentVerified && (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  )}
                </div>
              </div>
              {canSeePrices(user?.role) && (
                <>
                  <div>
                    <p className="text-sm text-muted-foreground">Paid Amount</p>
                    <p className="font-medium text-green-600 dark:text-green-400">
                      ₹{test.charges.paid}
                    </p>
                  </div>
                  {test.charges.due > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Due Amount
                      </p>
                      <p className="font-medium text-red-600 dark:text-red-400">
                        ₹{test.charges.due}
                      </p>
                    </div>
                  )}
                </>
              )}
              {test.priority === "routine" && !test.paymentVerified && (
                <Alert variant="destructive" className="mt-2">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Payment verification required for routine tests
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
