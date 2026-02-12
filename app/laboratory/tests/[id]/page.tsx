// app/laboratory/tests/[id]/page.tsx

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
  Calendar,
  Hash,
  CreditCard,
  FlaskConical,
  Microscope,
  Phone,
  IdCard,
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

  const canPrintTest = test?.collectionStatus === "collected";

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
