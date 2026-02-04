// app/radiology/direct-exams/[id]/page.tsx

"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { useAuthStore } from "@/store/useAuthStore";
import {
  ArrowLeft,
  FileText,
  Scan,
  User,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Printer,
  Loader2,
  Edit,
  Plus,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

interface DirectRadiologyExam {
  _id: string;
  examId: string;
  examName: string;
  category: string;
  description?: string;
  price: number;
  discountedPrice?: number;
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
  examStatus: string;
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
  modality?: {
    type: string;
    bodyPart?: string;
    view?: string;
    contrastUsed?: boolean;
    contrastType?: string;
    remarks?: string;
    findings?: Array<{
      name: string;
      value: string;
      unit?: string;
      remarks?: string;
    }>;
  };
  results?: {
    findings: Array<{
      name: string;
      value: string | number;
      unit?: string;
      normalRange: string;
      flag?: "normal" | "abnormal" | "critical";
      remarks?: string;
    }>;
    impression?: string;
    reportedBy?: {
      _id: string;
      name: string;
    };
    reportedAt?: string;
  };
  notes?: string;
}

interface ExamFinding {
  id: string;
  name: string;
  value: string;
  unit: string;
  remarks: string;
}

export default function DirectExamDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { accessToken, user } = useAuthStore();
  const [exam, setExam] = useState<DirectRadiologyExam | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [finalizing, setFinalizing] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [savingFindings, setSavingFindings] = useState(false);

  // Editable findings state
  const [isEditingFindings, setIsEditingFindings] = useState(false);
  const [examFindings, setExamFindings] = useState<ExamFinding[]>([
    { id: "1", name: "", value: "", unit: "", remarks: "" },
  ]);
  const [impression, setImpression] = useState("");

  useEffect(() => {
    fetchExamDetails();
  }, [params.id]);

  const fetchExamDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/radiology/direct-exams/${params.id}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to fetch exam");
      }

      setExam(data.data);

      // Initialize findings from exam data
      if (
        data.data.modality?.findings &&
        data.data.modality.findings.length > 0
      ) {
        setExamFindings(
          data.data.modality.findings.map((f: any, i: number) => ({
            id: (i + 1).toString(),
            name: f.name || "",
            value: f.value || "",
            unit: f.unit || "",
            remarks: f.remarks || "",
          })),
        );
      }
      if (data.data.results?.impression) {
        setImpression(data.data.results.impression);
      }
    } catch (error: unknown) {
      console.error("Error fetching exam:", error);
      setError(
        error instanceof Error ? error.message : "Failed to load exam details",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleFinalizeExam = async () => {
    if (!exam) return;

    try {
      setFinalizing(true);

      const response = await fetch(
        `/api/radiology/direct-exams/${exam._id}/finalize`,
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
        throw new Error(errorData.error || "Failed to finalize exam");
      }

      const data = await response.json();
      toast.success("Exam finalized successfully");
      fetchExamDetails();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to finalize exam",
      );
    } finally {
      setFinalizing(false);
    }
  };

  const handleSaveFindings = async () => {
    if (!exam) return;

    try {
      setSavingFindings(true);

      const validFindings = examFindings.filter(
        (f) => f.name.trim() && f.value.trim(),
      );

      const response = await fetch(
        `/api/radiology/direct-exams/${exam._id}/results`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            findings: validFindings.map((f) => ({
              name: f.name,
              value: f.value,
              unit: f.unit,
              remarks: f.remarks,
            })),
            impression,
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save findings");
      }

      const data = await response.json();
      toast.success("Findings saved successfully");
      setIsEditingFindings(false);
      fetchExamDetails();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save findings",
      );
    } finally {
      setSavingFindings(false);
    }
  };

  const handlePrintPDF = async () => {
    if (!exam) return;

    setPrinting(true);

    try {
      // Mark the exam as printed
      await fetch(`/api/radiology/direct-exams/${exam._id}/print`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      // Generate PDF
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 14;
      let yPos = margin;

      const addText = (
        text: string,
        x: number,
        y: number,
        fontSize: number = 10,
        fontStyle: string = "normal",
        align: "left" | "center" | "right" = "left",
      ) => {
        doc.setFontSize(fontSize);
        doc.setFont("helvetica", fontStyle);
        doc.text(text, x, y, { align });
        return y + fontSize * 0.4;
      };

      // Header
      yPos = addText(
        "RADIOLOGY EXAM REPORT",
        pageWidth / 2,
        yPos,
        18,
        "bold",
        "center",
      );
      yPos += 2;
      yPos = addText(
        "Sajad Barekzai Hospital",
        pageWidth / 2,
        yPos,
        12,
        "bold",
        "center",
      );
      yPos = addText(
        "Comprehensive Diagnostic Services",
        pageWidth / 2,
        yPos,
        9,
        "normal",
        "center",
      );
      yPos += 4;

      doc.setDrawColor(59, 130, 246);
      doc.setLineWidth(0.5);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 6;

      // Exam Info
      yPos = addText(`Exam ID: ${exam.examId}`, margin, yPos, 10, "bold");
      yPos = addText(
        `Radiology Reference: ${exam.examId}`,
        pageWidth - margin,
        yPos,
        10,
        "normal",
        "right",
      );
      yPos += 2;
      yPos = addText(`Exam: ${exam.examName}`, margin, yPos, 12, "bold");
      yPos = addText(
        `Category: ${exam.category.replace(/_/g, " ")}`,
        margin,
        yPos,
        9,
      );
      yPos += 2;

      // Patient Info
      yPos += 2;
      yPos = addText("PATIENT INFORMATION", margin, yPos, 11, "bold");
      yPos += 2;

      const patientInfo = [
        ["Name:", exam.patient.name || "N/A"],
        ["Patient ID:", exam.patient.patientId || "N/A"],
        ["Gender:", exam.patient.gender || "N/A"],
        ["Phone:", exam.patient.phone || "N/A"],
      ];

      autoTable(doc, {
        startY: yPos,
        head: [],
        body: patientInfo,
        theme: "plain",
        styles: { fontSize: 9, cellPadding: 1 },
        columnStyles: {
          0: { fontStyle: "bold", cellWidth: 40 },
          1: { cellWidth: 60 },
        },
      });

      yPos = (doc as any).lastAutoTable.finalY + 4;

      // Exam Details
      yPos = addText("EXAM DETAILS", margin, yPos, 11, "bold");
      yPos += 2;

      const formatDate = (dateString?: string) => {
        if (!dateString) return "N/A";
        return new Date(dateString).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
      };

      const examDetails = [
        ["Ordered Date:", formatDate(exam.createdAtDirect)],
        ["Modality:", exam.modality?.type || "N/A"],
        ["Body Part:", exam.modality?.bodyPart || "N/A"],
        ["View:", exam.modality?.view || "N/A"],
        ["Exam Status:", exam.examStatus?.toUpperCase() || "N/A"],
        ["Priority:", exam.priority?.toUpperCase() || "N/A"],
      ];

      autoTable(doc, {
        startY: yPos,
        head: [],
        body: examDetails,
        theme: "plain",
        styles: { fontSize: 9, cellPadding: 1 },
        columnStyles: {
          0: { fontStyle: "bold", cellWidth: 50 },
          1: { cellWidth: 50 },
        },
      });

      yPos = (doc as any).lastAutoTable.finalY + 4;

      // Findings
      if (exam.modality?.findings && exam.modality.findings.length > 0) {
        yPos = addText("FINDINGS", margin, yPos, 11, "bold");
        yPos += 2;

        const findingsTableData = exam.modality.findings.map((f) => [
          f.name || "-",
          f.value || "-",
          f.unit || "-",
          f.remarks || "-",
        ]);

        autoTable(doc, {
          startY: yPos,
          head: [["Finding", "Value", "Unit", "Remarks"]],
          body: findingsTableData,
          styles: { fontSize: 9 },
          headStyles: {
            fillColor: [59, 130, 246],
            fontStyle: "bold",
            halign: "center",
          },
          columnStyles: {
            0: { cellWidth: 45 },
            1: { cellWidth: 40 },
            2: { cellWidth: 30 },
            3: { cellWidth: 45 },
          },
        });

        yPos = (doc as any).lastAutoTable.finalY + 4;
      }

      // Impression
      if (exam.results?.impression) {
        yPos = addText("IMPRESSION", margin, yPos, 11, "bold");
        yPos += 2;
        yPos = addText(exam.results.impression, margin, yPos, 10);
        yPos += 4;
      }

      // Footer
      if (yPos > pageHeight - 40) {
        doc.addPage();
        yPos = margin;
      }

      yPos = pageHeight - 30;
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.3);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 5;

      yPos = addText(
        "This is a computer-generated report.",
        pageWidth / 2,
        yPos,
        8,
        "normal",
        "center",
      );
      yPos = addText(
        `Report generated on: ${new Date().toLocaleString()}`,
        pageWidth / 2,
        yPos,
        8,
        "normal",
        "center",
      );

      // Print
      doc.autoPrint();
      window.open(doc.output("bloburl"), "_blank");

      // Refresh exam details to update printed status
      fetchExamDetails();
    } catch (err) {
      console.error("Error printing PDF:", err);
      toast.error("Failed to generate print job");
    } finally {
      setPrinting(false);
    }
  };

  const canFinalize = exam?.paymentVerified && !exam?.finalized;
  const canPrint = exam?.finalized && exam?.readyForPrint;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  // Findings management functions
  const addFinding = () => {
    const newId = (examFindings.length + 1).toString();
    setExamFindings([
      ...examFindings,
      { id: newId, name: "", value: "", unit: "", remarks: "" },
    ]);
  };

  const removeFinding = (id: string) => {
    if (examFindings.length > 1) {
      setExamFindings(examFindings.filter((f) => f.id !== id));
    }
  };

  const updateFinding = (
    id: string,
    field: keyof ExamFinding,
    value: string,
  ) => {
    setExamFindings(
      examFindings.map((f) => (f.id === id ? { ...f, [field]: value } : f)),
    );
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

  if (error || !exam) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <AlertTriangle className="h-12 w-12 mx-auto text-yellow-500 mb-4" />
          <h3 className="text-lg font-medium">Exam Not Found</h3>
          <p className="text-muted-foreground mt-2">
            {error || "The requested exam could not be found."}
          </p>
          <Button
            onClick={() => router.push("/radiology/direct-exams")}
            className="mt-4"
          >
            Back to Direct Exams
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
              {exam.examName}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline">{exam.examId}</Badge>
              <Badge
                className={
                  exam.finalized
                    ? "bg-green-100 text-green-800"
                    : exam.status === "completed" || exam.status === "reported"
                      ? "bg-blue-100 text-blue-800"
                      : exam.status === "cancelled"
                        ? "bg-red-100 text-red-800"
                        : "bg-yellow-100 text-yellow-800"
                }
              >
                {exam.finalized
                  ? "Finalized"
                  : exam.status === "completed" || exam.status === "reported"
                    ? "Completed"
                    : exam.status}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchExamDetails}>
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
      {exam.finalized ? (
        <Alert className="bg-green-50 border-green-200 mb-6">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">Exam Finalized</AlertTitle>
          <AlertDescription className="text-green-700">
            This exam has been finalized and is ready for printing.
          </AlertDescription>
        </Alert>
      ) : !exam.paymentVerified ? (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Payment Verification Required</AlertTitle>
          <AlertDescription>
            Payment must be verified by receptionist before finalizing the exam.
          </AlertDescription>
        </Alert>
      ) : (
        <Alert className="bg-blue-50 border-blue-200 mb-6">
          <CheckCircle className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-800">Ready to Finalize</AlertTitle>
          <AlertDescription className="text-blue-700">
            Payment verified. You can finalize this exam now.
          </AlertDescription>
        </Alert>
      )}

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
                <td className="p-3 font-medium">{exam.patient.name}</td>
              </tr>
              <tr className="border-b">
                <td className="p-3 text-sm text-muted-foreground">
                  Patient ID
                </td>
                <td className="p-3 font-medium">{exam.patient.patientId}</td>
              </tr>
              <tr className="border-b">
                <td className="p-3 text-sm text-muted-foreground">Phone</td>
                <td className="p-3 font-medium">
                  {exam.patient.phone || "N/A"}
                </td>
              </tr>
              <tr className="border-b">
                <td className="p-3 text-sm text-muted-foreground">Email</td>
                <td className="p-3 font-medium">
                  {exam.patient.email || "N/A"}
                </td>
              </tr>
              <tr className="border-b">
                <td className="p-3 text-sm text-muted-foreground">Gender</td>
                <td className="p-3 font-medium">
                  {exam.patient.gender || "N/A"}
                </td>
              </tr>
              <tr>
                <td className="p-3 text-sm text-muted-foreground">
                  Date of Birth
                </td>
                <td className="p-3 font-medium">
                  {exam.patient.dateOfBirth
                    ? format(parseISO(exam.patient.dateOfBirth), "MMM dd, yyyy")
                    : "N/A"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Exam Details */}
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-muted/50 px-4 py-3 border-b">
            <h3 className="font-semibold flex items-center gap-2">
              <Scan className="h-5 w-5" />
              Exam Details
            </h3>
          </div>
          <table className="w-full">
            <tbody>
              <tr className="border-b">
                <td className="p-3 text-sm text-muted-foreground w-1/3">
                  Exam Name
                </td>
                <td className="p-3 font-medium">{exam.examName}</td>
              </tr>
              <tr className="border-b">
                <td className="p-3 text-sm text-muted-foreground">Category</td>
                <td className="p-3">
                  <Badge variant="outline">
                    {exam.category.replace(/_/g, " ")}
                  </Badge>
                </td>
              </tr>
              <tr className="border-b">
                <td className="p-3 text-sm text-muted-foreground">Modality</td>
                <td className="p-3 font-medium">
                  {exam.modality?.type || "N/A"}
                </td>
              </tr>
              <tr className="border-b">
                <td className="p-3 text-sm text-muted-foreground">Body Part</td>
                <td className="p-3 font-medium">
                  {exam.modality?.bodyPart || "N/A"}
                </td>
              </tr>
              <tr className="border-b">
                <td className="p-3 text-sm text-muted-foreground">View</td>
                <td className="p-3 font-medium">
                  {exam.modality?.view || "N/A"}
                </td>
              </tr>
              <tr className="border-b">
                <td className="p-3 text-sm text-muted-foreground">Priority</td>
                <td className="p-3">
                  <Badge
                    className={
                      exam.priority === "emergency"
                        ? "bg-red-100 text-red-800"
                        : exam.priority === "urgent"
                          ? "bg-orange-100 text-orange-800"
                          : "bg-blue-100 text-blue-800"
                    }
                  >
                    {exam.priority}
                  </Badge>
                </td>
              </tr>
              <tr className="border-b">
                <td className="p-3 text-sm text-muted-foreground">Created</td>
                <td className="p-3 font-medium">
                  {format(
                    parseISO(exam.createdAtDirect),
                    "MMM dd, yyyy 'at' HH:mm",
                  )}
                </td>
              </tr>
              {exam.createdBy && (
                <tr className="border-b">
                  <td className="p-3 text-sm text-muted-foreground">
                    Created By
                  </td>
                  <td className="p-3 font-medium">{exam.createdBy.name}</td>
                </tr>
              )}
              {exam.finalized && exam.finalizedAt && (
                <tr>
                  <td className="p-3 text-sm text-muted-foreground">
                    Finalized
                  </td>
                  <td className="p-3">
                    <p className="font-medium">
                      {format(
                        parseISO(exam.finalizedAt),
                        "MMM dd, yyyy 'at' HH:mm",
                      )}
                    </p>
                    {exam.finalizedBy && (
                      <p className="text-sm text-muted-foreground">
                        by {exam.finalizedBy.name}
                      </p>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Payment Details */}
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-muted/50 px-4 py-3 border-b">
            <h3 className="font-semibold flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Payment Details
            </h3>
          </div>
          <table className="w-full">
            <tbody>
              <tr className="border-b">
                <td className="p-3 text-sm text-muted-foreground w-1/3">
                  Total Amount
                </td>
                <td className="p-3 font-medium">
                  {formatPrice(exam.charges?.totalAmount || 0)}
                </td>
              </tr>
              <tr className="border-b">
                <td className="p-3 text-sm text-muted-foreground">Paid</td>
                <td className="p-3 font-medium text-green-600">
                  {formatPrice(exam.charges?.paid || 0)}
                </td>
              </tr>
              <tr className="border-b">
                <td className="p-3 text-sm text-muted-foreground">Due</td>
                <td className="p-3 font-medium text-red-600">
                  {formatPrice(exam.charges?.due || 0)}
                </td>
              </tr>
              <tr className="border-b">
                <td className="p-3 text-sm text-muted-foreground">
                  Payment Status
                </td>
                <td className="p-3">
                  <Badge
                    className={
                      exam.charges?.paymentStatus === "paid"
                        ? "bg-green-100 text-green-800"
                        : exam.charges?.paymentStatus === "partial"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-red-100 text-red-800"
                    }
                  >
                    {exam.charges?.paymentStatus || "N/A"}
                  </Badge>
                </td>
              </tr>
              <tr className="border-b">
                <td className="p-3 text-sm text-muted-foreground">
                  Payment Verified
                </td>
                <td className="p-3">
                  <Badge
                    className={
                      exam.paymentVerified
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }
                  >
                    {exam.paymentVerified ? "Yes" : "No"}
                  </Badge>
                </td>
              </tr>
              {exam.paymentVerifiedBy && (
                <tr>
                  <td className="p-3 text-sm text-muted-foreground">
                    Verified By
                  </td>
                  <td className="p-3 font-medium">
                    {exam.paymentVerifiedBy.name}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Exam Status */}
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-muted/50 px-4 py-3 border-b">
            <h3 className="font-semibold flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Exam Status
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
                      exam.status === "completed" || exam.status === "reported"
                        ? "bg-green-100 text-green-800"
                        : exam.examStatus === "in-progress"
                          ? "bg-blue-100 text-blue-800"
                          : exam.status === "cancelled"
                            ? "bg-red-100 text-red-800"
                            : "bg-yellow-100 text-yellow-800"
                    }
                  >
                    {exam.status}
                  </Badge>
                </td>
              </tr>
              <tr className="border-b">
                <td className="p-3 text-sm text-muted-foreground">
                  Exam Status
                </td>
                <td className="p-3">
                  <Badge
                    className={
                      exam.examStatus === "completed"
                        ? "bg-green-100 text-green-800"
                        : exam.examStatus === "in-progress"
                          ? "bg-blue-100 text-blue-800"
                          : exam.examStatus === "scheduled"
                            ? "bg-purple-100 text-purple-800"
                            : "bg-gray-100 text-gray-800"
                    }
                  >
                    {exam.examStatus}
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
                      exam.processingStatus === "completed"
                        ? "bg-green-100 text-green-800"
                        : exam.processingStatus === "processing"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-yellow-100 text-yellow-800"
                    }
                  >
                    {exam.processingStatus}
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
                      exam.verificationStatus === "verified"
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                    }
                  >
                    {exam.verificationStatus}
                  </Badge>
                </td>
              </tr>
              <tr className="border-b">
                <td className="p-3 text-sm text-muted-foreground">Finalized</td>
                <td className="p-3">
                  <Badge
                    className={
                      exam.finalized
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }
                  >
                    {exam.finalized ? "Yes" : "No"}
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
                      exam.readyForPrint
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }
                  >
                    {exam.readyForPrint ? "Yes" : "No"}
                  </Badge>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Findings / Observations */}
      <div className="border rounded-lg overflow-hidden mt-6">
        <div className="bg-muted/50 px-4 py-3 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Findings / Observations</h3>
              <p className="text-sm text-muted-foreground">
                {exam.modality?.findings && exam.modality.findings.length > 0
                  ? `${exam.modality.findings.length} finding(s) recorded`
                  : "No findings recorded yet"}
              </p>
            </div>
            {!isEditingFindings && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditingFindings(true)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Findings
              </Button>
            )}
          </div>
        </div>
        <div className="p-4">
          {isEditingFindings ? (
            <div className="space-y-4">
              {examFindings.map((finding, index) => (
                <div
                  key={finding.id}
                  className="p-4 border rounded-lg space-y-4 bg-gray-50 dark:bg-gray-900"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Finding #{index + 1}</h4>
                    {examFindings.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFinding(finding.id)}
                        className="text-red-600"
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Finding Name</Label>
                      <Input
                        value={finding.name}
                        onChange={(e) =>
                          updateFinding(finding.id, "name", e.target.value)
                        }
                        placeholder="e.g., Fracture, Mass, Nodule"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Value/Observation</Label>
                      <Input
                        value={finding.value}
                        onChange={(e) =>
                          updateFinding(finding.id, "value", e.target.value)
                        }
                        placeholder="e.g., Visible fracture line"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Unit</Label>
                      <Input
                        value={finding.unit}
                        onChange={(e) =>
                          updateFinding(finding.id, "unit", e.target.value)
                        }
                        placeholder="e.g., cm, mm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Remarks</Label>
                      <Input
                        value={finding.remarks}
                        onChange={(e) =>
                          updateFinding(finding.id, "remarks", e.target.value)
                        }
                        placeholder="Additional observations"
                      />
                    </div>
                  </div>
                </div>
              ))}
              <Button type="button" variant="outline" onClick={addFinding}>
                <Plus className="h-4 w-4 mr-2" />
                Add Finding
              </Button>
              <div className="space-y-2 pt-4">
                <Label>Impression</Label>
                <Textarea
                  value={impression}
                  onChange={(e) => setImpression(e.target.value)}
                  placeholder="Enter overall impression or conclusion..."
                  rows={3}
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditingFindings(false);
                    // Reset to original values
                    if (exam.modality?.findings) {
                      setExamFindings(
                        exam.modality.findings.map((f, i) => ({
                          id: (i + 1).toString(),
                          name: f.name || "",
                          value: f.value || "",
                          unit: f.unit || "",
                          remarks: f.remarks || "",
                        })),
                      );
                    }
                    setImpression(exam.results?.impression || "");
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleSaveFindings} disabled={savingFindings}>
                  {savingFindings ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Findings"
                  )}
                </Button>
              </div>
            </div>
          ) : exam.modality?.findings && exam.modality.findings.length > 0 ? (
            <div className="space-y-4">
              <div className="rounded-md border">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-medium">Finding</th>
                      <th className="text-left p-3 font-medium">Value</th>
                      <th className="text-left p-3 font-medium">Unit</th>
                      <th className="text-left p-3 font-medium">Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exam.modality.findings.map((finding, index) => (
                      <tr key={index} className="border-b last:border-b-0">
                        <td className="p-3 font-medium">{finding.name}</td>
                        <td className="p-3">{finding.value}</td>
                        <td className="p-3">{finding.unit || "-"}</td>
                        <td className="p-3">{finding.remarks || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {exam.results?.impression && (
                <div>
                  <h4 className="font-medium mb-2">Impression</h4>
                  <p className="text-sm text-muted-foreground">
                    {exam.results.impression}
                  </p>
                </div>
              )}
              {exam.results?.reportedAt && (
                <div className="text-sm text-muted-foreground">
                  Reported on{" "}
                  {format(
                    parseISO(exam.results.reportedAt),
                    "MMM dd, yyyy 'at' HH:mm",
                  )}
                  {exam.results.reportedBy && (
                    <> by {exam.results.reportedBy.name}</>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Scan className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No findings recorded yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Notes */}
      {exam.notes && (
        <div className="border rounded-lg overflow-hidden mt-6">
          <div className="bg-muted/50 px-4 py-3 border-b">
            <h3 className="font-semibold">Notes</h3>
          </div>
          <div className="p-4">
            <p className="text-sm">{exam.notes}</p>
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
            {canFinalize && (
              <Button
                onClick={handleFinalizeExam}
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
                    Finalize Exam
                  </>
                )}
              </Button>
            )}
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
              <Link href="/radiology/direct-exams">Back to All Exams</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
