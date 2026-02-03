// app/laboratory/direct-tests/[id]/page.tsx

"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
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
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

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

export default function DirectTestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { accessToken } = useAuthStore();
  const [test, setTest] = useState<DirectLabTest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [finalizing, setFinalizing] = useState(false);
  const [printing, setPrinting] = useState(false);

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
    } catch (error: unknown) {
      console.error("Error fetching test:", error);
      setError(
        error instanceof Error ? error.message : "Failed to load test details",
      );
    } finally {
      setLoading(false);
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

  const handlePrintPDF = async () => {
    if (!test) return;

    setPrinting(true);

    try {
      // Mark the test as printed
      await fetch(`/api/laboratory/direct-tests/${test._id}/print`, {
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

      const isAbnormal = (param: {
        name: string;
        value: string | number;
        unit?: string;
        normalRange: string;
        flag?: "normal" | "low" | "high" | "critical";
        remarks?: string;
      }): boolean => {
        if (!param.normalRange || !param.remarks) return false;
        const remarks = param.remarks.toLowerCase();
        return (
          remarks.includes("abnormal") ||
          remarks.includes("high") ||
          remarks.includes("low") ||
          remarks.includes("critical")
        );
      };

      // Header
      yPos = addText(
        "LABORATORY TEST REPORT",
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

      // Test Info
      yPos = addText(`Test ID: ${test.testId}`, margin, yPos, 10, "bold");
      yPos = addText(
        `Lab Reference: ${test.testId}`,
        pageWidth - margin,
        yPos,
        10,
        "normal",
        "right",
      );
      yPos += 2;
      yPos = addText(`Test: ${test.testName}`, margin, yPos, 12, "bold");
      yPos = addText(
        `Category: ${test.category.replace(/_/g, " ")}`,
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
        ["Name:", test.patient.name || "N/A"],
        ["Patient ID:", test.patient.patientId || "N/A"],
        ["Gender:", test.patient.gender || "N/A"],
        ["Phone:", test.patient.phone || "N/A"],
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

      // Test Details
      yPos = addText("TEST DETAILS", margin, yPos, 11, "bold");
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

      const testDetails = [
        ["Ordered Date:", formatDate(test.createdAtDirect)],
        ["Completed Date:", formatDate(test.finalizedAt)],
        ["Specimen Type:", test.specimen?.type || "N/A"],
        ["Collection Status:", test.collectionStatus?.toUpperCase() || "N/A"],
        ["Processing Status:", test.processingStatus?.toUpperCase() || "N/A"],
      ];

      autoTable(doc, {
        startY: yPos,
        head: [],
        body: testDetails,
        theme: "plain",
        styles: { fontSize: 9, cellPadding: 1 },
        columnStyles: {
          0: { fontStyle: "bold", cellWidth: 50 },
          1: { cellWidth: 50 },
        },
      });

      yPos = (doc as any).lastAutoTable.finalY + 4;

      // Test Results
      if (test.results?.parameters && test.results.parameters.length > 0) {
        yPos = addText("TEST RESULTS", margin, yPos, 11, "bold");
        yPos += 2;

        const resultsTableData = test.results.parameters.map((param) => {
          const abnormal = isAbnormal(param);
          return [
            param.name,
            `${param.value} ${param.unit || ""}`,
            param.normalRange || "-",
            param.remarks || "-",
          ];
        });

        autoTable(doc, {
          startY: yPos,
          head: [["Parameter", "Result", "Reference Range", "Remarks"]],
          body: resultsTableData,
          styles: { fontSize: 9 },
          headStyles: {
            fillColor: [59, 130, 246],
            fontStyle: "bold",
            halign: "center",
          },
          columnStyles: {
            0: { cellWidth: 50, fontStyle: "bold" },
            1: { cellWidth: 35, halign: "center" },
            2: { cellWidth: 45 },
            3: { cellWidth: 40 },
          },
          didParseCell: (data) => {
            const rowIndex = data.row.index;
            const param = test.results?.parameters?.[rowIndex];
            if (param && isAbnormal(param)) {
              data.cell.styles.textColor = [220, 38, 38];
              data.cell.styles.fontStyle = "bold";
            }
          },
        });

        yPos = (doc as any).lastAutoTable.finalY + 4;

        if (test.results.reportedBy) {
          yPos = addText(
            `Reported By: ${test.results.reportedBy.name}`,
            margin,
            yPos,
            9,
          );
        }
        if (test.results.reportedAt) {
          yPos = addText(
            `Reported At: ${formatDate(test.results.reportedAt)}`,
            margin,
            yPos,
            9,
          );
        }
        yPos += 4;
      } else {
        yPos = addText(
          "No results available for this test.",
          margin,
          yPos,
          10,
          "italic",
        );
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

      // Refresh test details to update printed status
      fetchTestDetails();
    } catch (err) {
      console.error("Error printing PDF:", err);
      toast.error("Failed to generate print job");
    } finally {
      setPrinting(false);
    }
  };

  const canFinalize = test?.paymentVerified && !test?.finalized;
  const canPrint = test?.finalized && test?.readyForPrint;

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
            Payment must be verified by receptionist before finalizing the test.
          </AlertDescription>
        </Alert>
      ) : (
        <Alert className="bg-blue-50 border-blue-200 mb-6">
          <CheckCircle className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-800">Ready to Finalize</AlertTitle>
          <AlertDescription className="text-blue-700">
            Payment verified. You can finalize this test now.
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
                  {formatPrice(test.charges?.totalAmount || 0)}
                </td>
              </tr>
              <tr className="border-b">
                <td className="p-3 text-sm text-muted-foreground">Paid</td>
                <td className="p-3 font-medium text-green-600">
                  {formatPrice(test.charges?.paid || 0)}
                </td>
              </tr>
              <tr className="border-b">
                <td className="p-3 text-sm text-muted-foreground">Due</td>
                <td className="p-3 font-medium text-red-600">
                  {formatPrice(test.charges?.due || 0)}
                </td>
              </tr>
              <tr className="border-b">
                <td className="p-3 text-sm text-muted-foreground">
                  Payment Status
                </td>
                <td className="p-3">
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
                </td>
              </tr>
              <tr className="border-b">
                <td className="p-3 text-sm text-muted-foreground">
                  Payment Verified
                </td>
                <td className="p-3">
                  <Badge
                    className={
                      test.paymentVerified
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }
                  >
                    {test.paymentVerified ? "Yes" : "No"}
                  </Badge>
                </td>
              </tr>
              {test.paymentVerifiedBy && (
                <tr>
                  <td className="p-3 text-sm text-muted-foreground">
                    Verified By
                  </td>
                  <td className="p-3 font-medium">
                    {test.paymentVerifiedBy.name}
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
        <div className="bg-muted/50 px-4 py-3 border-b">
          <div>
            <h3 className="font-semibold">Test Results</h3>
            <p className="text-sm text-muted-foreground">
              {test.results?.parameters && test.results.parameters.length > 0
                ? `${test.results.parameters.length} parameter(s) recorded`
                : "No results recorded yet"}
            </p>
          </div>
        </div>
        <div className="p-4">
          {test.results &&
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
                    {test.results.parameters.map((param, index) => (
                      <tr key={index} className="border-b last:border-b-0">
                        <td className="p-3 font-medium">{param.name}</td>
                        <td className="p-3">{param.value}</td>
                        <td className="p-3">{param.unit || "-"}</td>
                        <td className="p-3 text-sm text-muted-foreground">
                          {param.normalRange}
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
