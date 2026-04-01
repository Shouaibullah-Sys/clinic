// app/laboratory/tests/[id]/page.tsx

"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
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
import LabTestPDFGenerator from "@/components/laboratory/LabTestPDFGenerator";
import {
  ArrowLeft,
  TestTube,
  User,
  Stethoscope,
  DollarSign,
  CheckCircle,
  AlertTriangle,
  Clock,
  RefreshCw,
  Printer,
  Loader2,
  Calendar,
  Hash,
  CreditCard,
  FlaskConical,
  Microscope,
  Phone,
  IdCard,
  Pencil,
  Save,
  X,
  Plus,
  Trash2,
  FileText,
} from "lucide-react";

interface LabTest {
  _id: string;
  testId: string;
  testName: string;
  patient?: any;
  doctor?: any;
  status: string;
  collectionStatus: string;
  processingStatus: string;
  paymentVerified: boolean;
  priority: string;
  orderedAt: string;
  charges?: any;
  specimen?: any;
  results?: {
    parameters: Array<{
      name: string;
      value: string | number;
      unit?: string;
      normalRange?: string;
      group?: string;
      flag?: "normal" | "low" | "high" | "critical";
      remarks?: string;
    }>;
    interpretation?: string;
    reportedBy?: { _id: string; name: string } | null;
    reportedAt?: string;
    verifiedBy?: { _id: string; name: string } | null;
    verifiedAt?: string;
  };
  category?: string;
  finalized?: boolean;
}

// Safe access functions
const safeDoctor = (doctor: any) => {
  if (!doctor) return { name: "Unknown Doctor", specialization: "N/A" };
  return {
    name: doctor.name || "Unknown Doctor",
    specialization: doctor.specialization || "N/A",
  };
};

const safePatient = (patient: any) => {
  if (!patient)
    return {
      name: "Unknown Patient",
      patientId: "N/A",
      phone: "N/A",
      age: undefined,
      gender: undefined,
    };
  return {
    name: patient.name || "Unknown Patient",
    patientId: patient.patientId || "N/A",
    phone: patient.phone || "N/A",
    age: patient.age,
    gender: patient.gender,
  };
};

const safeCharges = (charges: any) => {
  if (!charges)
    return {
      totalAmount: 0,
      paid: 0,
      due: 0,
      paymentStatus: "pending",
    };
  return {
    totalAmount: charges.totalAmount || 0,
    paid: charges.paid || 0,
    due: charges.due || 0,
    paymentStatus: charges.paymentStatus || "pending",
  };
};

export default function TestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { accessToken } = useAuthStore();
  const [test, setTest] = useState<LabTest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditingResults, setIsEditingResults] = useState(false);
  const [editParameters, setEditParameters] = useState<EditableParameter[]>([]);
  const [editInterpretation, setEditInterpretation] = useState("");
  const [savingResults, setSavingResults] = useState(false);
  const [templateParameters, setTemplateParameters] = useState<
    Array<{
      parameterName?: string;
      name?: string;
      unit?: string;
      normalRange?: string;
      group?: string;
    }>
  >([]);

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

  useEffect(() => {
    fetchTestDetails();
  }, [params.id]);

  useEffect(() => {
    if (searchParams.get("edit") === "1") {
      setIsEditingResults(true);
    }
  }, [searchParams]);

  const fetchTestDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/laboratory/tests/${params.id}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to fetch test");
      }

      setTest(data.data);
    } catch (error: any) {
      console.error("Error fetching test:", error);
      setError(error.message || "Failed to load test details");
    } finally {
      setLoading(false);
    }
  };

  const makeParamId = () => Math.random().toString(36).slice(2, 10);

  const buildInitialParameters = (
    record: LabTest | null,
    templateParams?: Array<{
      parameterName?: string;
      name?: string;
      unit?: string;
      normalRange?: string;
      group?: string;
    }>,
  ): EditableParameter[] => {
    if (!record) return [];
    const resultParams = record.results?.parameters || [];
    const fallbackParams = templateParams || [];

    const normalizedResults = new Map(
      resultParams.map((param) => [param.name.trim().toLowerCase(), param]),
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
        (param) =>
          !normalizedTemplateNames.has(param.name.trim().toLowerCase()),
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

  useEffect(() => {
    if (!test) return;
    let isActive = true;

    const hydrateParameters = async () => {
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
            group: param.group || "",
          })) || [];

        if (!isActive) return;
        setTemplateParameters(templateParams);
        setEditParameters(buildInitialParameters(test, templateParams));
        setEditInterpretation(test.results?.interpretation || "");
      } catch (err) {
        console.error("Failed to load template parameters:", err);
        if (!isActive) return;
        setTemplateParameters([]);
        setEditParameters(buildInitialParameters(test));
        setEditInterpretation(test.results?.interpretation || "");
      }
    };

    hydrateParameters();

    return () => {
      isActive = false;
    };
  }, [test?._id, accessToken]);

  const updateParameterField = (
    id: string,
    field: keyof Omit<EditableParameter, "id">,
    value: string,
  ) => {
    setEditParameters((prev) =>
      prev.map((param) =>
        param.id === id ? { ...param, [field]: value } : param,
      ),
    );
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
    setEditParameters(
      buildInitialParameters(
        test,
        templateParameters.length > 0 ? templateParameters : undefined,
      ),
    );
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
      alert("Please add at least one parameter with a value.");
      return;
    }

    try {
      setSavingResults(true);
      const response = await fetch(
        `/api/laboratory/tests/${test._id}/results`,
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
      alert("Test results updated successfully.");
    } catch (err: any) {
      console.error("Error saving test results:", err);
      alert(err.message || "Failed to save test results");
    } finally {
      setSavingResults(false);
    }
  };

  // Use safe access functions
  const doctorInfo = safeDoctor(test?.doctor);
  const patientInfo = safePatient(test?.patient);
  const chargesInfo = safeCharges(test?.charges);

  const canCollectSample =
    (test?.paymentVerified || test?.priority !== "routine") &&
    test?.collectionStatus !== "collected" &&
    test?.status !== "cancelled";

  const canPrintTest = test?.collectionStatus === "collected";
  const resultsLocked = !!test?.finalized;
  const visibleResults =
    test?.results?.parameters?.filter((param) => {
      if (param.value === undefined || param.value === null) return false;
      return String(param.value).trim() !== "";
    }) || [];

  if (loading) {
    return (
      <div className="container mx-auto p-4 md:p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 mb-6">
          <Skeleton className="h-8 w-16 md:w-24" />
          <Skeleton className="h-8 w-48 md:w-64" />
        </div>
        <div className="grid grid-cols-1 gap-6">
          <Skeleton className="h-[400px] md:h-[300px] w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  if (error || !test) {
    return (
      <div className="container mx-auto p-4 md:p-6">
        <div className="text-center py-8 md:py-12">
          <AlertTriangle className="h-12 w-12 mx-auto text-yellow-500 mb-4" />
          <h3 className="text-lg md:text-xl font-medium">Test Not Found</h3>
          <p className="text-muted-foreground mt-2 text-sm md:text-base">
            {error || "The requested test could not be found."}
          </p>
          <Button
            onClick={() => router.push("/laboratory/tests")}
            className="mt-4 w-full md:w-auto"
          >
            Back to Tests
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-start gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.back()}
            className="shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl md:text-3xl font-bold tracking-tight break-words">
              {test.testName}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <Badge variant="outline" className="text-xs md:text-sm">
                <Hash className="h-3 w-3 mr-1 inline" />
                {test.testId}
              </Badge>
              <Badge
                className={
                  test.collectionStatus === "collected"
                    ? "bg-green-100 text-green-800 text-xs md:text-sm"
                    : "bg-yellow-100 text-yellow-800 text-xs md:text-sm"
                }
              >
                {test.collectionStatus === "collected"
                  ? "Collected"
                  : "Pending Collection"}
              </Badge>
              <Badge
                className={
                  test.priority === "emergency"
                    ? "bg-red-100 text-red-800 text-xs md:text-sm"
                    : test.priority === "urgent"
                      ? "bg-orange-100 text-orange-800 text-xs md:text-sm"
                      : "bg-blue-100 text-blue-800 text-xs md:text-sm"
                }
              >
                {test.priority}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 md:self-start">
          <Button
            variant="outline"
            onClick={fetchTestDetails}
            size="sm"
            className="flex-1 md:flex-none"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            <span className="hidden md:inline">Refresh</span>
            <span className="md:hidden">Sync</span>
          </Button>
        </div>
      </div>

      {/* Status Alert - Mobile Optimized */}
      {test.collectionStatus === "collected" ? (
        <Alert className="bg-green-50 border-green-200 mb-6">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800 text-sm md:text-base">
            Sample Collected
          </AlertTitle>
          <AlertDescription className="text-green-700 text-xs md:text-sm">
            The sample has been collected successfully.
          </AlertDescription>
        </Alert>
      ) : canCollectSample ? (
        <Alert className=" border-blue-200 mb-6">
          <Clock className="h-4 w-4" />
          <AlertTitle className=" text-sm md:text-base">
            Ready for Sample Collection
          </AlertTitle>
          <AlertDescription className="text-blue-700 text-xs md:text-sm">
            Ready to collect the sample.
          </AlertDescription>
        </Alert>
      ) : !test.paymentVerified && test.priority === "routine" ? (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="text-sm md:text-base">
            Payment Verification Required
          </AlertTitle>
          <AlertDescription className="text-xs md:text-sm">
            Payment must be verified before collecting the sample.
          </AlertDescription>
        </Alert>
      ) : null}

      {/* Desktop: Single Row Table Layout (LG screens) */}
      <Card className="hidden lg:block mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Complete Test Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <tbody>
                <tr className="border-b">
                  <td className="py-4 px-4 font-medium w-1/5 align-top">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-500" />
                      <span>Patient</span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="grid grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Name</p>
                        <p className="font-medium text-sm">
                          {patientInfo.name}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">ID</p>
                        <p className="font-medium text-sm">
                          {patientInfo.patientId}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Phone</p>
                        <p className="font-medium text-sm">
                          {patientInfo.phone}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Age/Gender
                        </p>
                        <p className="font-medium text-sm">
                          {patientInfo.age ? `${patientInfo.age}y` : "N/A"} /{" "}
                          {patientInfo.gender || "N/A"}
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="py-4 px-4 font-medium align-top">
                    <div className="flex items-center gap-2">
                      <Stethoscope className="h-4 w-4 text-gray-500" />
                      <span>Doctor</span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Name</p>
                        <p className="font-medium text-sm">
                          Dr. {doctorInfo.name}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Specialization
                        </p>
                        <p className="font-medium text-sm">
                          {doctorInfo.specialization}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Priority
                        </p>
                        <Badge
                          className={
                            test.priority === "emergency"
                              ? "bg-red-100 text-red-800 text-xs"
                              : test.priority === "urgent"
                                ? "bg-orange-100 text-orange-800 text-xs"
                                : "bg-blue-100 text-blue-800 text-xs"
                          }
                        >
                          {test.priority}
                        </Badge>
                      </div>
                    </div>
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="py-4 px-4  font-medium align-top">
                    <div className="flex items-center gap-2">
                      <TestTube className="h-4 w-4 text-gray-500" />
                      <span>Test</span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="grid grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Name</p>
                        <p className="font-medium text-sm">{test.testName}</p>
                      </div>
                      {test.category && (
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Category
                          </p>
                          <p className="font-medium text-sm">
                            {test.category.replace(/_/g, " ")}
                          </p>
                        </div>
                      )}
                      {test.specimen?.type && (
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Specimen
                          </p>
                          <p className="font-medium text-sm">
                            {test.specimen.type}
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-muted-foreground">Ordered</p>
                        <p className="font-medium text-sm">
                          {new Date(test.orderedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Collection
                        </p>
                        <Badge
                          className={
                            test.collectionStatus === "collected"
                              ? "bg-green-100 text-green-800 text-xs"
                              : "bg-yellow-100 text-yellow-800 text-xs"
                          }
                        >
                          {test.collectionStatus}
                        </Badge>
                      </div>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td className="py-4 px-4 font-medium align-top">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-gray-500" />
                      <span>Payment</span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="grid grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Status</p>
                        <div className="flex items-center gap-2">
                          <Badge
                            className={
                              test.paymentVerified
                                ? "bg-green-100 text-green-800 text-xs"
                                : chargesInfo.paymentStatus === "paid"
                                  ? "bg-green-100 text-green-800 text-xs"
                                  : "bg-red-100 text-red-800 text-xs"
                            }
                          >
                            {test.paymentVerified
                              ? "Verified"
                              : chargesInfo.paymentStatus}
                          </Badge>
                          {test.paymentVerified && (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Total</p>
                        <p className="font-medium text-sm">
                          ₹{chargesInfo.totalAmount}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Paid</p>
                        <p className="font-medium text-sm text-green-600">
                          ₹{chargesInfo.paid}
                        </p>
                      </div>
                      {chargesInfo.due > 0 && (
                        <div>
                          <p className="text-xs text-muted-foreground">Due</p>
                          <p className="font-medium text-sm text-red-600">
                            ₹{chargesInfo.due}
                          </p>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Mobile/Tablet: Card Grid Layout */}
      <div className="lg:hidden space-y-4 mb-6">
        {/* Patient Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4" />
              Patient Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Name</p>
                <p className="font-medium text-sm break-words">
                  {patientInfo.name}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Patient ID</p>
                <p className="font-medium text-sm">{patientInfo.patientId}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Phone</p>
                <p className="font-medium text-sm">{patientInfo.phone}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Age/Gender</p>
                <p className="font-medium text-sm">
                  {patientInfo.age ? `${patientInfo.age}y` : "N/A"} /{" "}
                  {patientInfo.gender || "N/A"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Doctor Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Stethoscope className="h-4 w-4" />
              Doctor Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 md:col-span-1">
                <p className="text-xs text-muted-foreground">Doctor</p>
                <p className="font-medium text-sm">Dr. {doctorInfo.name}</p>
              </div>
              <div className="col-span-2 md:col-span-1">
                <p className="text-xs text-muted-foreground">Specialization</p>
                <p className="font-medium text-sm">
                  {doctorInfo.specialization}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Priority</p>
                <Badge
                  className={
                    test.priority === "emergency"
                      ? "bg-red-100 text-red-800 text-xs"
                      : test.priority === "urgent"
                        ? "bg-orange-100 text-orange-800 text-xs"
                        : "bg-blue-100 text-blue-800 text-xs"
                  }
                >
                  {test.priority}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Ordered Date</p>
                <p className="font-medium text-sm">
                  {new Date(test.orderedAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Test Details Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TestTube className="h-4 w-4" />
              Test Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground">Test Name</p>
                <p className="font-medium text-sm">{test.testName}</p>
              </div>
              {test.category && (
                <div>
                  <p className="text-xs text-muted-foreground">Category</p>
                  <p className="font-medium text-sm">
                    {test.category.replace(/_/g, " ")}
                  </p>
                </div>
              )}
              {test.specimen?.type && (
                <div>
                  <p className="text-xs text-muted-foreground">Specimen</p>
                  <p className="font-medium text-sm">{test.specimen.type}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground">
                  Collection Status
                </p>
                <Badge
                  className={
                    test.collectionStatus === "collected"
                      ? "bg-green-100 text-green-800 text-xs"
                      : "bg-yellow-100 text-yellow-800 text-xs"
                  }
                >
                  {test.collectionStatus}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Payment Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground">Payment Status</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge
                    className={
                      test.paymentVerified
                        ? "bg-green-100 text-green-800 text-xs"
                        : chargesInfo.paymentStatus === "paid"
                          ? "bg-green-100 text-green-800 text-xs"
                          : "bg-red-100 text-red-800 text-xs"
                    }
                  >
                    {test.paymentVerified
                      ? "Verified"
                      : chargesInfo.paymentStatus}
                  </Badge>
                  {test.paymentVerified && (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Amount</p>
                <p className="font-medium text-sm">
                  ₹{chargesInfo.totalAmount}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Paid Amount</p>
                <p className="font-medium text-sm text-green-600">
                  ₹{chargesInfo.paid}
                </p>
              </div>
              {chargesInfo.due > 0 && (
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">Due Amount</p>
                  <p className="font-medium text-sm text-red-600">
                    ₹{chargesInfo.due}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Test Results */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-base md:text-lg">
                Test Results
              </CardTitle>
              <p className="text-xs md:text-sm text-muted-foreground mt-1">
                {visibleResults.length > 0
                  ? `${visibleResults.length} parameter(s) recorded`
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={cancelEditResults}
                  >
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
        </CardHeader>
        <CardContent>
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
                            readOnly
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
                            value={param.value}
                            onChange={(e) =>
                              updateParameterField(
                                param.id,
                                "value",
                                e.target.value,
                              )
                            }
                            placeholder="Value"
                          />
                        </td>
                        <td className="p-3">
                          <Input
                            readOnly
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
                            readOnly
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
          ) : visibleResults.length > 0 ? (
            <div className="space-y-4">
              <div className="rounded-md border overflow-x-auto">
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
                    {visibleResults.map((param, index) => (
                      <tr
                        key={`${param.name}-${index}`}
                        className="border-b last:border-b-0"
                      >
                        <td className="p-3 font-medium">{param.name}</td>
                        <td className="p-3">{param.value}</td>
                        <td className="p-3">{param.unit || "-"}</td>
                        <td className="p-3 text-sm text-muted-foreground">
                          {param.normalRange || "-"}
                        </td>
                        <td className="p-3 text-sm">{param.remarks || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {test.results?.interpretation && (
                <div>
                  <h4 className="font-medium mb-2">Interpretation</h4>
                  <p className="text-sm text-muted-foreground">
                    {test.results.interpretation}
                  </p>
                </div>
              )}
              {test.results?.reportedAt && (
                <div className="text-sm text-muted-foreground">
                  Reported on{" "}
                  {new Date(test.results.reportedAt).toLocaleString()}
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
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base md:text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row flex-wrap gap-3">
            {canCollectSample && (
              <Button asChild size="default" className="w-full sm:w-auto">
                <Link href={`/laboratory/tests/${test._id}/collect`}>
                  <FlaskConical className="h-4 w-4 mr-2" />
                  Collect Sample
                </Link>
              </Button>
            )}

            {canPrintTest && (
              <LabTestPDFGenerator
                test={test}
                mode="print"
                buttonVariant="default"
                buttonSize="default"
                buttonLabel="Print Report"
              />
            )}

            <Button variant="outline" asChild className="w-full sm:w-auto">
              <Link href="/laboratory/tests">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Tests
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
