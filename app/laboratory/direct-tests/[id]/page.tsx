// app/laboratory/direct-tests/[id]/page.tsx

"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Printer,
  Loader2,
  CreditCard,
  BarChart3,
  Pencil,
  Save,
  X,
  Plus,
  Trash2,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { generateDirectTestPDF } from "@/lib/pdf-generator";
import type {
  DirectLabTest as PdfDirectLabTest,
  Patient as PdfPatient,
} from "@/lib/pdf-generator";

interface DirectLabTest {
  _id: string;
  testId: string;
  testName: string;
  category: string;
  description?: string;
  directBatchId?: string;
  patient: {
    _id: string;
    name: string;
    patientId: string;
    phone?: string;
    guardian?: string;
    address?: string;
    refPerson?: string;
    passTskNo?: string;
    registrationNo?: string;
    dateOfBirth?: string;
    gender?: string;
  };
  patientSnapshot?: {
    name?: string;
    patientId?: string;
    phone?: string;
    guardian?: string;
    address?: string;
    refPerson?: string;
    passTskNo?: string;
    registrationNo?: string;
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
      group?: string;
      flag?: "normal" | "low" | "high" | "critical";
      remarks?: string;
    }>;
    interpretation?: string;
    reportedBy?: {
      _id: string;
      name: string;
    } | null;
    reportedAt?: string;
    verifiedBy?: {
      _id: string;
      name: string;
    } | null;
    verifiedAt?: string;
  };
  testParameters?: Array<{
    parameterName?: string;
    name?: string;
    unit?: string;
    normalRange?: string;
    description?: string;
    group?: string;
  }>;
  notes?: string;
}

export default function DirectTestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { accessToken } = useAuthStore();
  const [test, setTest] = useState<DirectLabTest | null>(null);
  const [isEditingResults, setIsEditingResults] = useState(false);
  const [editParameters, setEditParameters] = useState<EditableParameter[]>([]);
  const [editInterpretation, setEditInterpretation] = useState("");
  const [savingResults, setSavingResults] = useState(false);

  type PatientSnapshot = NonNullable<DirectLabTest["patientSnapshot"]>;
  type PatientField = keyof DirectLabTest["patient"] | keyof PatientSnapshot;
  type EditableParameter = {
    id: string;
    name: string;
    value: string;
    unit: string;
    normalRange: string;
    remarks: string;
    group?: string;
    flag?: "normal" | "low" | "high" | "critical";
  };

  const readPatientField = (
    record: DirectLabTest | null,
    field: PatientField,
    fallback = "N/A",
  ) => {
    if (!record) return fallback;
    const patientValue =
      record.patient?.[field as keyof DirectLabTest["patient"]];
    const snapshotValue =
      record.patientSnapshot && field in record.patientSnapshot
        ? record.patientSnapshot[field as keyof PatientSnapshot]
        : undefined;
    const value = patientValue ?? snapshotValue;
    if (value === undefined || value === null) return fallback;
    if (typeof value === "string" && value.trim() === "") return fallback;
    return value as string;
  };

  const makeParamId = () => Math.random().toString(36).slice(2, 10);

  const buildInitialParameters = (
    record: DirectLabTest | null,
    templateOverrides?: DirectLabTest["testParameters"],
  ): EditableParameter[] => {
    if (!record) return [];
    const resultParams = record.results?.parameters || [];
    const fallbackParams = templateOverrides || record.testParameters || [];
    const normalizedResults = new Map(
      resultParams.map((param) => [
        param.name.trim().toLowerCase(),
        param,
      ]),
    );
    const normalizedTemplateNames = new Set(
      fallbackParams.map((param) =>
        (param.parameterName || param.name || "").trim().toLowerCase(),
      ),
    );

    if (fallbackParams.length > 0) {
      const merged = fallbackParams.map((param) => {
        const name = param.parameterName || param.name || "";
        const match = normalizedResults.get(name.trim().toLowerCase());
        return {
          id: makeParamId(),
          name,
          value:
            match?.value !== undefined && match?.value !== null
              ? String(match.value)
              : "",
          unit: match?.unit || param.unit || "",
          normalRange: match?.normalRange || param.normalRange || "",
          remarks: match?.remarks || "",
          group: match?.group || param.group || "",
          flag: match?.flag || "normal",
        };
      });

      const extraResults = resultParams.filter(
        (param) => !normalizedTemplateNames.has(param.name.trim().toLowerCase()),
      );

      return [
        ...merged,
        ...extraResults.map((param) => ({
          id: makeParamId(),
          name: param.name || "",
          value: param.value !== undefined ? String(param.value) : "",
          unit: param.unit || "",
          normalRange: param.normalRange || "",
          remarks: param.remarks || "",
          group: param.group || "",
          flag: param.flag || "normal",
        })),
      ];
    }

    if (resultParams.length > 0) {
      return resultParams.map((param) => ({
        id: makeParamId(),
        name: param.name || "",
        value: param.value !== undefined ? String(param.value) : "",
        unit: param.unit || "",
        normalRange: param.normalRange || "",
        remarks: param.remarks || "",
        group: param.group || "",
        flag: param.flag || "normal",
      }));
    }

    return [
      {
        id: makeParamId(),
        name: "",
        value: "",
        unit: "",
        normalRange: "",
        remarks: "",
        group: "",
        flag: "normal",
      },
    ];
  };

  const normalizeForPdf = (record: DirectLabTest): PdfDirectLabTest => {
    const snapshot = record.patientSnapshot;
    const patientFallback = record.patient;
    const normalizedSnapshot: PdfPatient | undefined = snapshot
      ? {
          ...snapshot,
          name: snapshot.name ?? patientFallback?.name ?? "N/A",
          patientId: snapshot.patientId ?? patientFallback?.patientId ?? "N/A",
        }
      : undefined;

    return {
      ...(record as PdfDirectLabTest),
      patientSnapshot: normalizedSnapshot,
    };
  };
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [printing, setPrinting] = useState(false);
  const [paymentRequired, setPaymentRequired] = useState(true);

  useEffect(() => {
    fetchTestDetails();
  }, [params.id]);

  useEffect(() => {
    fetchPaymentSetting();
  }, []);

  useEffect(() => {
    if (searchParams.get("edit") === "1") {
      setIsEditingResults(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!test) return;
    let isActive = true;

    const hydrateParameters = async () => {
      const existingTemplateParams = test.testParameters || [];
      if (existingTemplateParams.length > 0) {
        if (!isActive) return;
        setEditParameters(buildInitialParameters(test, existingTemplateParams));
        setEditInterpretation(test.results?.interpretation || "");
        return;
      }

      try {
        const search = encodeURIComponent(test.testName);
        const category = test.category
          ? `&category=${encodeURIComponent(test.category)}`
          : "";
        const response = await fetch(
          `/api/laboratory/templates?search=${search}${category}&active=true`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          },
        );
        if (!response.ok) {
          throw new Error("Failed to fetch template parameters");
        }
        const data = await response.json();
        const templates = Array.isArray(data?.data) ? data.data : [];
        const matchedTemplate = templates.find(
          (template: any) =>
            template.testName?.trim().toLowerCase() ===
            test.testName.trim().toLowerCase(),
        );
        const templateParams =
          matchedTemplate?.parameters?.map((param: any) => ({
            parameterName: param.parameterName || param.parameterCode || "",
            unit: param.unit || "",
            normalRange: param.normalRange || "",
            description: param.methodology || "",
            group: param.group || "",
          })) || [];

        if (!isActive) return;
        setEditParameters(buildInitialParameters(test, templateParams));
        setEditInterpretation(test.results?.interpretation || "");
      } catch (err) {
        console.error("Failed to load template parameters:", err);
        if (!isActive) return;
        setEditParameters(buildInitialParameters(test));
        setEditInterpretation(test.results?.interpretation || "");
      }
    };

    hydrateParameters();

    return () => {
      isActive = false;
    };
  }, [test?._id, accessToken]);

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
    } catch (error: unknown) {
      console.error("Error fetching test:", error);
      setError(
        error instanceof Error ? error.message : "Failed to load test details",
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentSetting = async () => {
    try {
      const response = await fetch("/api/settings/direct-lab-payment", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (!response.ok) return;
      const data = await response.json();
      if (data?.success && typeof data.data?.paymentRequired === "boolean") {
        setPaymentRequired(data.data.paymentRequired);
      }
    } catch (err) {
      console.error("Failed to fetch payment setting:", err);
    }
  };

  const updateParameterField = (
    id: string,
    field: keyof Omit<EditableParameter, "id">,
    value: string,
  ) => {
    setEditParameters((prev) =>
      prev.map((param) => (param.id === id ? { ...param, [field]: value } : param)),
    );
  };

  const handleValueInputKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    paramId: string,
  ) => {
    if (e.key !== "Enter") return;
    e.preventDefault();

    const currentIndex = editParameters.findIndex((param) => param.id === paramId);
    if (currentIndex < 0) return;

    const nextParam = editParameters[currentIndex + 1];
    if (!nextParam) return;

    requestAnimationFrame(() => {
      const nextValueInput = document.querySelector<HTMLInputElement>(
        `input[data-edit-param-id="${nextParam.id}"][data-edit-param-field="value"]`,
      );
      nextValueInput?.focus();
      nextValueInput?.select();
    });
  };

  const addParameter = () => {
    setEditParameters((prev) => [
      ...prev,
      {
        id: makeParamId(),
        name: "",
        value: "",
        unit: "",
        normalRange: "",
        remarks: "",
        group: "",
        flag: "normal",
      },
    ]);
  };

  const removeParameter = (id: string) => {
    setEditParameters((prev) => prev.filter((param) => param.id !== id));
  };

  const cancelEditResults = () => {
    if (!test) return;
    setEditParameters(buildInitialParameters(test));
    setEditInterpretation(test.results?.interpretation || "");
    setIsEditingResults(false);
  };

  const handleSaveResults = async () => {
    if (!test) return;

    const cleanedParameters = editParameters
      .filter((param) => param.name.trim() && param.value.trim())
      .map((param) => ({
        name: param.name.trim(),
        value: param.value.trim(),
        unit: param.unit.trim(),
        normalRange: param.normalRange.trim(),
        remarks: param.remarks.trim(),
        group: param.group?.trim() || undefined,
        flag: param.flag || "normal",
      }));

    if (cleanedParameters.length === 0) {
      toast.error("Please add at least one parameter with a value.");
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
            parameters: cleanedParameters,
            interpretation: editInterpretation.trim(),
          }),
        },
      );

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to save test results");
      }

      setTest(data.data);
      setIsEditingResults(false);
      toast.success("Test results updated successfully.");
    } catch (err: any) {
      console.error("Error saving test results:", err);
      toast.error(err.message || "Failed to save test results");
    } finally {
      setSavingResults(false);
    }
  };

  const handlePrintPDF = async () => {
    if (!test) return;

    setPrinting(true);

    try {
      const response = await fetch(
        `/api/laboratory/direct-tests/${test._id}/print`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch test for printing");
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to fetch test for printing");
      }

      let reportData = data.data as DirectLabTest | DirectLabTest[];
      if (data.data?.directBatchId) {
        const batchResponse = await fetch(
          `/api/laboratory/direct-tests?batchId=${encodeURIComponent(
            data.data.directBatchId,
          )}&limit=200`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
          },
        );

        if (batchResponse.ok) {
          const batchData = await batchResponse.json();
          const batchTests: DirectLabTest[] = batchData?.data || [];
          if (batchTests.length > 0) {
            reportData = batchTests;
          }
        }
      }

      // Generate PDF
      const pdfData = Array.isArray(reportData)
        ? reportData.map(normalizeForPdf)
        : normalizeForPdf(reportData);
      await generateDirectTestPDF(pdfData, "print");

      // Mark as printed only once after successful PDF generation
      if (!test.printedAt) {
        await fetch(`/api/laboratory/direct-tests/${test._id}/print`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        });
      }

      // Refresh test details to update printed status
      fetchTestDetails();
    } catch (err) {
      console.error("Error printing PDF:", err);
      toast.error(err instanceof Error ? err.message : "Failed to print report");
    } finally {
      setPrinting(false);
    }
  };

  const canPrint =
    test?.collectionStatus === "collected" ||
    test?.readyForPrint ||
    test?.status === "completed" ||
    test?.status === "reported" ||
    (test?.results?.parameters?.length || 0) > 0;
  const resultsLocked = !!test?.finalized;

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
                  test.collectionStatus === "collected"
                    ? "bg-green-100 text-green-800"
                    : test.status === "completed" || test.status === "reported"
                      ? "bg-blue-100 text-blue-800"
                      : "bg-yellow-100 text-yellow-800"
                }
              >
                {test.collectionStatus === "collected"
                  ? "Collected"
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
            <Button onClick={handlePrintPDF} disabled={printing}>
              {printing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Printing...
                </>
              ) : (
                <>
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Status Alert */}
      {paymentRequired && !test.paymentVerified ? (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Payment Verification Required</AlertTitle>
          <AlertDescription>
            Payment must be verified by receptionist before collecting sample.
          </AlertDescription>
        </Alert>
      ) : test.collectionStatus === "collected" ? (
        <Alert className="bg-green-50 border-green-200 mb-6">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">Sample Collected</AlertTitle>
          <AlertDescription className="text-green-700">
            Collection is completed for this direct test.
          </AlertDescription>
        </Alert>
      ) : !paymentRequired ? (
        <Alert className="bg-blue-50 border-blue-200 mb-6">
          <CheckCircle className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-800">
            Payment Not Required
          </AlertTitle>
          <AlertDescription className="text-blue-700">
            Admin has disabled payment requirement for direct lab tests.
          </AlertDescription>
        </Alert>
      ) : (
        <Alert className="bg-blue-50 border-blue-200 mb-6">
          <CheckCircle className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-800">Ready for Collection</AlertTitle>
          <AlertDescription className="text-blue-700">
            Payment verified. You can proceed with sample collection.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Patient Information Table */}
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-muted/50 px-6 py-4 border-b">
            <h3 className="font-semibold flex items-center gap-2">
              <User className="h-5 w-5" />
              Patient Information
            </h3>
          </div>
          <Table>
            <TableBody>
              <TableRow>
                <TableCell className="w-1/3 font-medium text-muted-foreground">
                  Name
                </TableCell>
                <TableCell className="font-medium">
                  {readPatientField(test, "name")}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium text-muted-foreground">
                  Patient ID
                </TableCell>
                <TableCell className="font-mono">
                  <Badge variant="outline">
                    {readPatientField(test, "patientId")}
                  </Badge>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium text-muted-foreground">
                  Phone
                </TableCell>
                <TableCell>{readPatientField(test, "phone")}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium text-muted-foreground">
                  Guardian
                </TableCell>
                <TableCell>{readPatientField(test, "guardian")}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium text-muted-foreground">
                  Gender
                </TableCell>
                <TableCell>{readPatientField(test, "gender")}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium text-muted-foreground">
                  Date of Birth
                </TableCell>
                <TableCell>
                  {(() => {
                    const dob = readPatientField(test, "dateOfBirth", "");
                    if (!dob) return "N/A";
                    try {
                      return format(parseISO(dob), "MMM dd, yyyy");
                    } catch {
                      return "N/A";
                    }
                  })()}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        {/* Test Details Table */}
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-muted/50 px-6 py-4 border-b">
            <h3 className="font-semibold flex items-center gap-2">
              <TestTube className="h-5 w-5" />
              Test Details
            </h3>
          </div>
          <Table>
            <TableBody>
              <TableRow>
                <TableCell className="w-1/3 font-medium text-muted-foreground">
                  Test Name
                </TableCell>
                <TableCell className="font-medium">{test.testName}</TableCell>
              </TableRow>
              {test.description && (
                <TableRow>
                  <TableCell className="font-medium text-muted-foreground">
                    Description
                  </TableCell>
                  <TableCell className="text-sm">{test.description}</TableCell>
                </TableRow>
              )}
              <TableRow>
                <TableCell className="font-medium text-muted-foreground">
                  Category
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {test.category.replace(/_/g, " ")}
                  </Badge>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium text-muted-foreground">
                  Priority
                </TableCell>
                <TableCell>
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
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium text-muted-foreground">
                  Specimen
                </TableCell>
                <TableCell>{test.specimen?.type || "N/A"}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium text-muted-foreground">
                  Created
                </TableCell>
                <TableCell>
                  {format(
                    parseISO(test.createdAtDirect),
                    "MMM dd, yyyy 'at' HH:mm",
                  )}
                  {test.createdBy && (
                    <span className="block text-sm text-muted-foreground">
                      by {test.createdBy.name}
                    </span>
                  )}
                </TableCell>
              </TableRow>
              {test.finalized && test.finalizedAt && (
                <TableRow>
                  <TableCell className="font-medium text-muted-foreground">
                    Completed
                  </TableCell>
                  <TableCell>
                    {format(
                      parseISO(test.finalizedAt),
                      "MMM dd, yyyy 'at' HH:mm",
                    )}
                    {test.finalizedBy && (
                      <span className="block text-sm text-muted-foreground">
                        by {test.finalizedBy.name}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Payment Details Table */}
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-muted/50 px-6 py-4 border-b">
            <h3 className="font-semibold flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Details
            </h3>
          </div>
          <Table>
            <TableBody>
              <TableRow>
                <TableCell className="w-1/3 font-medium text-muted-foreground">
                  Total Amount
                </TableCell>
                <TableCell className="font-semibold">
                  {formatPrice(test.charges?.totalAmount || 0)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium text-muted-foreground">
                  Paid
                </TableCell>
                <TableCell className="font-semibold text-green-600">
                  {formatPrice(test.charges?.paid || 0)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium text-muted-foreground">
                  Due
                </TableCell>
                <TableCell className="font-semibold text-red-600">
                  {formatPrice(test.charges?.due || 0)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium text-muted-foreground">
                  Payment Status
                </TableCell>
                <TableCell>
                  <Badge
                    className={
                      test.charges?.paymentStatus === "paid"
                        ? "bg-green-100 text-green-800"
                        : test.charges?.paymentStatus === "partial"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-red-100 text-red-800"
                    }
                  >
                    {test.charges?.paymentStatus || "N/A"}
                  </Badge>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium text-muted-foreground">
                  Payment Verified
                </TableCell>
                <TableCell>
                  <Badge
                    className={
                      test.paymentVerified
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }
                  >
                    {test.paymentVerified ? "Verified" : "Not Verified"}
                  </Badge>
                </TableCell>
              </TableRow>
              {test.paymentVerifiedBy && (
                <TableRow>
                  <TableCell className="font-medium text-muted-foreground">
                    Verified By
                  </TableCell>
                  <TableCell>{test.paymentVerifiedBy.name}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Test Status Table */}
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-muted/50 px-6 py-4 border-b">
            <h3 className="font-semibold flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Test Status
            </h3>
          </div>
          <Table>
            <TableBody>
              <TableRow>
                <TableCell className="w-1/3 font-medium text-muted-foreground">
                  Status
                </TableCell>
                <TableCell>
                  <Badge
                    className={
                      test.collectionStatus === "collected" ||
                      test.status === "completed" ||
                      test.status === "reported"
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                    }
                  >
                    {test.collectionStatus === "collected"
                      ? "Collected"
                      : test.status}
                  </Badge>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium text-muted-foreground">
                  Collection
                </TableCell>
                <TableCell>
                  <Badge
                    className={
                      test.collectionStatus === "collected"
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                    }
                  >
                    {test.collectionStatus}
                  </Badge>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium text-muted-foreground">
                  Verification
                </TableCell>
                <TableCell>
                  <Badge className="bg-green-100 text-green-800">Completed</Badge>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Test Results */}
      <div className="border rounded-lg overflow-hidden mt-6">
        <div className="bg-muted/50 px-4 py-3 border-b flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="font-semibold">Test Results</h3>
            <p className="text-sm text-muted-foreground">
              {test.results?.parameters && test.results.parameters.length > 0
                ? `${test.results.parameters.length} parameter(s) recorded`
                : "No results recorded yet"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isEditingResults ? (
              <>
                <Button
                  size="sm"
                  onClick={handleSaveResults}
                  disabled={savingResults || resultsLocked}
                >
                  {savingResults ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </>
                  )}
                </Button>
                <Button variant="outline" size="sm" onClick={cancelEditResults}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditingResults(true)}
                disabled={resultsLocked}
              >
                <Pencil className="h-4 w-4 mr-2" />
                Edit Results
              </Button>
            )}
          </div>
        </div>
        <div className="p-4">
          {isEditingResults ? (
            <div className="space-y-4">
              <div className="rounded-md border overflow-x-auto">
                <table className="w-full min-w-[980px]">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-medium">Parameter</th>
                      <th className="text-left p-3 font-medium">Value</th>
                      <th className="text-left p-3 font-medium">Unit</th>
                      <th className="text-left p-3 font-medium">
                        Normal Range
                      </th>
                      <th className="text-left p-3 font-medium">Group</th>
                      <th className="text-left p-3 font-medium">Flag</th>
                      <th className="text-left p-3 font-medium">Remarks</th>
                      <th className="text-left p-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {editParameters.map((param) => (
                      <tr key={param.id} className="border-b last:border-b-0">
                        <td className="p-3">
                          <Input
                            value={param.name}
                            onChange={(e) =>
                              updateParameterField(
                                param.id,
                                "name",
                                e.target.value,
                              )
                            }
                            placeholder="Parameter name"
                          />
                        </td>
                        <td className="p-3">
                          <Input
                            data-edit-param-id={param.id}
                            data-edit-param-field="value"
                            value={param.value}
                            onChange={(e) =>
                              updateParameterField(
                                param.id,
                                "value",
                                e.target.value,
                              )
                            }
                            onKeyDown={(e) =>
                              handleValueInputKeyDown(e, param.id)
                            }
                            placeholder="Value"
                          />
                        </td>
                        <td className="p-3">
                          <Input
                            value={param.unit}
                            onChange={(e) =>
                              updateParameterField(
                                param.id,
                                "unit",
                                e.target.value,
                              )
                            }
                            placeholder="Unit"
                          />
                        </td>
                        <td className="p-3">
                          <Input
                            value={param.normalRange}
                            onChange={(e) =>
                              updateParameterField(
                                param.id,
                                "normalRange",
                                e.target.value,
                              )
                            }
                            placeholder="Normal range"
                          />
                        </td>
                        <td className="p-3">
                          <Input
                            value={param.group || ""}
                            onChange={(e) =>
                              updateParameterField(
                                param.id,
                                "group",
                                e.target.value,
                              )
                            }
                            placeholder="Group"
                          />
                        </td>
                        <td className="p-3">
                          <Select
                            value={param.flag || "normal"}
                            onValueChange={(value) =>
                              updateParameterField(param.id, "flag", value)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Flag" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="normal">Normal</SelectItem>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                              <SelectItem value="critical">Critical</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-3">
                          <Input
                            value={param.remarks}
                            onChange={(e) =>
                              updateParameterField(
                                param.id,
                                "remarks",
                                e.target.value,
                              )
                            }
                            placeholder="Remarks"
                          />
                        </td>
                        <td className="p-3">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeParameter(param.id)}
                            disabled={editParameters.length <= 1}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button variant="outline" onClick={addParameter}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Parameter
                </Button>
                {resultsLocked && (
                  <p className="text-sm text-muted-foreground">
                    Results are finalized and cannot be edited.
                  </p>
                )}
              </div>

              <div>
                <h4 className="font-medium mb-2">Interpretation</h4>
                <Textarea
                  value={editInterpretation}
                  onChange={(e) => setEditInterpretation(e.target.value)}
                  placeholder="Add interpretation notes"
                  className="min-h-[120px]"
                />
              </div>
            </div>
          ) : test.results &&
            "parameters" in test.results &&
            Array.isArray(test.results.parameters) &&
            test.results.parameters.length > 0 ? (
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
                      <th className="text-left p-3 font-medium">Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {test.results.parameters
                      .flatMap((param, index, all) => {
                        const group = param.group?.trim();
                        const prevGroup = all[index - 1]?.group?.trim();
                        const needsHeader = group && group !== prevGroup;
                        return needsHeader
                          ? [
                              { type: "group" as const, label: group },
                              { type: "param" as const, param },
                            ]
                          : [{ type: "param" as const, param }];
                      })
                      .map((row, index) =>
                        row.type === "group" ? (
                          <tr
                            key={`group-${row.label}-${index}`}
                            className="border-b bg-muted/40"
                          >
                            <td
                              className="p-3 font-semibold text-sm"
                              colSpan={5}
                            >
                              {row.label}
                            </td>
                          </tr>
                        ) : (
                          <tr
                            key={`${row.param.name}-${index}`}
                            className="border-b last:border-b-0"
                          >
                            <td className="p-3 font-medium">
                              {row.param.name}
                            </td>
                            <td className="p-3">{row.param.value}</td>
                            <td className="p-3">{row.param.unit || "-"}</td>
                            <td className="p-3 text-sm text-muted-foreground">
                              {row.param.normalRange}
                            </td>
                            <td className="p-3 text-sm">
                              {row.param.remarks || "-"}
                            </td>
                          </tr>
                        ),
                      )}
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
              <p>No results recorded yet</p>
            </div>
          )}
        </div>
      </div>

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
            {canPrint && (
              <Button onClick={handlePrintPDF} disabled={printing}>
                {printing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Printing...
                  </>
                ) : (
                  <>
                    <Printer className="h-4 w-4 mr-2" />
                    Print Report
                  </>
                )}
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
