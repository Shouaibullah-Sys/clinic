// app/laboratory/direct-tests/[id]/page.tsx

"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
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
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { generateDirectTestPDF } from "@/lib/pdf-generator";

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
    } | null;
    reportedAt?: string;
    verifiedBy?: {
      _id: string;
      name: string;
    } | null;
    verifiedAt?: string;
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

      // Generate PDF
      await generateDirectTestPDF(data.data, "print");

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

  const canPrint = test?.collectionStatus === "collected";

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
      {!test.paymentVerified ? (
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
                  {test.patient.name}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium text-muted-foreground">
                  Patient ID
                </TableCell>
                <TableCell className="font-mono">
                  <Badge variant="outline">{test.patient.patientId}</Badge>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium text-muted-foreground">
                  Phone
                </TableCell>
                <TableCell>{test.patient.phone || "N/A"}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium text-muted-foreground">
                  Email
                </TableCell>
                <TableCell>{test.patient.email || "N/A"}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium text-muted-foreground">
                  Gender
                </TableCell>
                <TableCell>{test.patient.gender || "N/A"}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium text-muted-foreground">
                  Date of Birth
                </TableCell>
                <TableCell>
                  {test.patient.dateOfBirth
                    ? format(parseISO(test.patient.dateOfBirth), "MMM dd, yyyy")
                    : "N/A"}
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
