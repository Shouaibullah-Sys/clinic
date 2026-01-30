"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
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
  results?: any;
  category?: string;
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
  const { accessToken } = useAuthStore();
  const [test, setTest] = useState<LabTest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTestDetails();
  }, [params.id]);

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

      console.log("DEBUG - Test data received:", data.data);
      console.log("DEBUG - Doctor field:", data.data?.doctor);

      setTest(data.data);
    } catch (error: any) {
      console.error("Error fetching test:", error);
      setError(error.message || "Failed to load test details");
    } finally {
      setLoading(false);
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

  const canPrintTest =
    (test?.status === "completed" || test?.status === "reported") &&
    test?.processingStatus === "completed" &&
    test?.results?.parameters &&
    test.results.parameters.length > 0;

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
            onClick={() => router.push("/laboratory/tests")}
            className="mt-4"
          >
            Back to Tests
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
                    : "bg-yellow-100 text-yellow-800"
                }
              >
                {test.collectionStatus === "collected"
                  ? "Collected"
                  : "Pending"}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchTestDetails}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Status Alert */}
      {test.collectionStatus === "collected" ? (
        <Alert className="bg-green-50 border-green-200 mb-6">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">Sample Collected</AlertTitle>
          <AlertDescription className="text-green-700">
            The sample has been collected successfully.
          </AlertDescription>
        </Alert>
      ) : canCollectSample ? (
        <Alert className="bg-blue-50 border-blue-200 mb-6">
          <Clock className="h-4 w-4 text-blue-600" />
          <AlertTitle>Ready for Sample Collection</AlertTitle>
          <AlertDescription>Ready to collect the sample.</AlertDescription>
        </Alert>
      ) : !test.paymentVerified && test.priority === "routine" ? (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Payment Verification Required</AlertTitle>
          <AlertDescription>
            Payment must be verified before collecting the sample.
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
              <p className="font-medium">{patientInfo.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Patient ID</p>
              <p className="font-medium">{patientInfo.patientId}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="font-medium">{patientInfo.phone}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Age / Gender</p>
                <p className="font-medium">
                  {patientInfo.age ? `${patientInfo.age}y` : "N/A"} /{" "}
                  {patientInfo.gender || "N/A"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Doctor Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Stethoscope className="h-5 w-5" />
              Doctor Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Doctor</p>
              <p className="font-medium">Dr. {doctorInfo.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Specialization</p>
              <p className="font-medium">{doctorInfo.specialization}</p>
            </div>
            <Separator />
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
            {test.category && (
              <div>
                <p className="text-sm text-muted-foreground">Category</p>
                <p className="font-medium">
                  {test.category.replace(/_/g, " ")}
                </p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">
                  Collection Status
                </p>
                <Badge
                  className={
                    test.collectionStatus === "collected"
                      ? "bg-green-100 text-green-800"
                      : "bg-yellow-100 text-yellow-800"
                  }
                >
                  {test.collectionStatus === "collected"
                    ? "Collected"
                    : "Pending"}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Processing Status
                </p>
                <Badge
                  className={
                    test.processingStatus === "completed"
                      ? "bg-green-100 text-green-800"
                      : test.processingStatus === "processing"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-yellow-100 text-yellow-800"
                  }
                >
                  {test.processingStatus === "completed"
                    ? "Completed"
                    : test.processingStatus === "processing"
                      ? "Processing"
                      : "Pending"}
                </Badge>
              </div>
            </div>
            {test.specimen?.type && (
              <div>
                <p className="text-sm text-muted-foreground">Specimen</p>
                <p className="font-medium">{test.specimen.type}</p>
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
                <Badge
                  className={
                    test.paymentVerified
                      ? "bg-green-100 text-green-800"
                      : chargesInfo.paymentStatus === "paid"
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
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
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Total Amount:</span>
                <span className="font-medium">₹{chargesInfo.totalAmount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Paid Amount:</span>
                <span className="font-medium text-green-600">
                  ₹{chargesInfo.paid}
                </span>
              </div>
              {chargesInfo.due > 0 && (
                <div className="flex justify-between">
                  <span className="text-sm">Due Amount:</span>
                  <span className="font-medium text-red-600">
                    ₹{chargesInfo.due}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {canCollectSample && (
              <Button asChild size="lg">
                <Link href={`/laboratory/tests/${test._id}/collect`}>
                  <TestTube className="h-4 w-4 mr-2" />
                  Collect Sample
                </Link>
              </Button>
            )}

            {canPrintTest && (
              <LabTestPDFGenerator
                test={test}
                mode="print"
                buttonVariant="default"
                buttonSize="lg"
                buttonLabel="Print Report"
              />
            )}

            <Button variant="outline" asChild>
              <Link href="/laboratory/tests">Back to All Tests</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
