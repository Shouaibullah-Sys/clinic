// app/laboratory/direct-tests/[id]/print/page.tsx

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer, Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import LabTestPDFGenerator from "@/components/laboratory/LabTestPDFGenerator";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

interface DirectLabTest {
  _id: string;
  testId: string;
  testName: string;
  category: string;
  patient: {
    _id: string;
    name: string;
    patientId: string;
    phone?: string;
    email?: string;
    dateOfBirth?: string;
    gender?: string;
    age?: number;
  };
  doctor?: {
    _id: string;
    name: string;
    specialization?: string;
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
    remarks?: string;
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

export default function DirectTestPrintPage() {
  const params = useParams();
  const router = useRouter();
  const { accessToken } = useAuthStore();
  const [test, setTest] = useState<DirectLabTest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [markingPrinted, setMarkingPrinted] = useState(false);

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
    } catch (error: any) {
      console.error("Error fetching test:", error);
      setError(error.message || "Failed to load test details");
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsPrinted = async () => {
    if (!test) return;

    try {
      setMarkingPrinted(true);

      const response = await fetch(
        `/api/laboratory/direct-tests/${test._id}/print`,
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
        throw new Error(errorData.error || "Failed to mark as printed");
      }

      const data = await response.json();
      setTest(data.data);
    } catch (err: any) {
      console.error("Error marking as printed:", err);
      alert(err.message || "Failed to mark as printed");
    } finally {
      setMarkingPrinted(false);
    }
  };

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
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Print Direct Lab Test</h1>
        </div>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error || "The requested test could not be found."}
          </AlertDescription>
        </Alert>
        <Button
          onClick={() => router.push("/laboratory/direct-tests")}
          className="mt-4"
        >
          Back to Direct Tests
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              Print Direct Lab Test
            </h1>
            <p className="text-muted-foreground mt-1">
              {test.testName} - {test.testId}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!test.printedAt && (
            <Button
              onClick={handleMarkAsPrinted}
              disabled={markingPrinted}
              variant="outline"
            >
              {markingPrinted ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Marking...
                </>
              ) : (
                <>
                  <Printer className="h-4 w-4 mr-2" />
                  Mark as Printed
                </>
              )}
            </Button>
          )}
          <Button
            onClick={() => router.push(`/laboratory/direct-tests/${test._id}`)}
          >
            Back to Test Details
          </Button>
        </div>
      </div>

      {/* Print Warning */}
      {!test.finalized && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Test Not Finalized</AlertTitle>
          <AlertDescription>
            This test has not been finalized yet. Please finalize the test
            before printing.
          </AlertDescription>
        </Alert>
      )}

      {/* PDF Generator */}
      {test.finalized && (
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <LabTestPDFGenerator
            test={{
              _id: test._id,
              testId: test.testId,
              testName: test.testName,
              category: test.category,
              patient: test.patient,
              doctor: test.doctor,
              status: test.status,
              collectionStatus: test.collectionStatus,
              processingStatus: test.processingStatus,
              orderedAt: test.createdAtDirect,
              completedAt: test.finalizedAt,
              specimen: test.specimen,
              results: test.results,
              priority: test.priority,
              labReferenceId: test.testId,
            }}
            mode="print"
            buttonVariant="default"
            buttonSize="lg"
            buttonLabel="Print Report"
          />
        </div>
      )}

      {/* Already Printed Notice */}
      {test.printedAt && (
        <Alert className="bg-green-50 border-green-200 mt-6">
          <p className="text-green-800">
            This test was printed on {new Date(test.printedAt).toLocaleString()}
          </p>
        </Alert>
      )}
    </div>
  );
}
