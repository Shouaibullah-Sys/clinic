// app/laboratory/tests/page.tsx

"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  TestTube,
  Eye,
  FileText,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  User,
  Stethoscope,
  Filter,
  FlaskConical,
  AlertCircle,
  Printer,
  Hash,
  Layers,
  Calendar,
  CreditCard,
} from "lucide-react";
import Link from "next/link";
import { useAuthStore } from "@/store/useAuthStore";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LabTestPDFGenerator from "@/components/laboratory/LabTestPDFGenerator";

interface LabTest {
  _id: string;
  testId: string;
  testName: string;
  category: string;
  patient: {
    _id: string;
    name: string;
    patientId: string;
    phone?: string;
  };
  doctor?: {
    _id: string;
    name: string;
    specialization?: string;
  };
  status: string;
  collectionStatus: string;
  processingStatus: string;
  verificationStatus: string;
  orderedAt: string;
  paymentVerified: boolean;
  priority: string;
  charges?: {
    paymentStatus: string;
    due: number;
  };
  labReferenceId?: string;
  specimen?: {
    type: string;
    quantity?: string;
  };
}

export default function LaboratoryTestsPage() {
  const { accessToken, user } = useAuthStore();
  const [tests, setTests] = useState<LabTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [collectionStatusFilter, setCollectionStatusFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("pending");

  useEffect(() => {
    fetchTests();
  }, [accessToken, activeTab]);

  const fetchTests = async () => {
    try {
      setLoading(true);
      if (!accessToken) {
        console.log("No access token available");
        return;
      }

      console.log("Fetching lab tests for laboratory...");
      const url = `/api/laboratory/tests?tab=${activeTab}`;
      console.log("API URL:", url);

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("API Error:", errorText);
        toast.error(
          `Failed to fetch tests: ${response.status} ${response.statusText}`,
        );
        return;
      }

      const data = await response.json();
      console.log("API Response:", data);

      if (data.success) {
        setTests(data.data || []);
        console.log(`Loaded ${data.data?.length || 0} lab tests`);

        if (data.data?.length === 0) {
          console.log("No tests found. Possible reasons:");
          console.log("- No lab tests in database");
          console.log("- User role not authorized");
          console.log("- Filter criteria too strict");
          console.log("- Payment verification required but not done");
        }
      } else {
        toast.error(data.error || "Failed to load lab tests");
        console.error("API Error:", data.error);
      }
    } catch (error) {
      console.error("Error fetching tests:", error);
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const filteredTests = tests
    .filter((test) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        test.testId.toLowerCase().includes(query) ||
        test.testName.toLowerCase().includes(query) ||
        test.patient.name.toLowerCase().includes(query) ||
        test.patient.patientId.toLowerCase().includes(query) ||
        (test.labReferenceId &&
          test.labReferenceId.toLowerCase().includes(query))
      );
    })
    .filter((test) => {
      // Apply tab filtering
      if (activeTab === "pending") {
        // Show tests that are pending collection
        return (
          test.collectionStatus === "pending" ||
          test.collectionStatus === "scheduled"
        );
      }
      if (activeTab === "collected") {
        // Show tests that are collected
        return test.collectionStatus === "collected";
      }
      // "all" tab - show all tests
      return true;
    })
    .filter((test) => {
      if (statusFilter === "all") return true;
      if (statusFilter === "pending")
        return test.status === "pending" || test.status === "ordered";
      if (statusFilter === "processing") return test.status === "processing";
      if (statusFilter === "completed")
        return test.status === "completed" || test.status === "reported";
      if (statusFilter === "cancelled") return test.status === "cancelled";
      return true;
    })
    .filter((test) => {
      if (collectionStatusFilter === "all") return true;
      return test.collectionStatus === collectionStatusFilter;
    });

  const getStatusBadge = (test: LabTest) => {
    if (test.status === "cancelled") {
      return <Badge variant="destructive">Cancelled</Badge>;
    }

    if (test.status === "reported") {
      return <Badge className="bg-green-100 text-green-800">Reported</Badge>;
    }

    if (test.status === "completed") {
      return <Badge className="bg-blue-100 text-blue-800">Completed</Badge>;
    }

    if (test.status === "processing") {
      return (
        <Badge className="bg-purple-100 text-purple-800">Processing</Badge>
      );
    }

    if (test.collectionStatus === "collected") {
      return (
        <Badge className="bg-yellow-100 text-yellow-800">
          Ready for Processing
        </Badge>
      );
    }

    if (test.collectionStatus === "pending") {
      return (
        <Badge className="bg-gray-100 text-gray-800">Pending Collection</Badge>
      );
    }

    return <Badge variant="outline">{test.status || "Unknown"}</Badge>;
  };

  const getCollectionStatusBadge = (status: string) => {
    const variants: Record<string, { bg: string; text: string }> = {
      pending: { bg: "bg-gray-100", text: "text-gray-800" },
      scheduled: { bg: "bg-blue-100", text: "text-blue-800" },
      collected: { bg: "bg-green-100", text: "text-green-800" },
      rejected: { bg: "bg-red-100", text: "text-red-800" },
      insufficient: { bg: "bg-orange-100", text: "text-orange-800" },
    };

    const variant = variants[status] || {
      bg: "bg-gray-100",
      text: "text-gray-800",
    };

    return (
      <Badge className={`${variant.bg} ${variant.text}`}>
        {status?.charAt(0).toUpperCase() + status?.slice(1) || "Unknown"}
      </Badge>
    );
  };

  const canProcessTest = (test: LabTest) => {
    // Can process if sample is collected and not already completed
    return (
      test.collectionStatus === "collected" &&
      test.processingStatus !== "completed" &&
      test.status !== "cancelled" &&
      test.status !== "reported"
    );
  };

  const canCollectSample = (test: LabTest) => {
    // Can collect if pending/scheduled and payment is verified (or priority is urgent/emergency)
    return (
      (test.collectionStatus === "pending" ||
        test.collectionStatus === "scheduled") &&
      (test.paymentVerified ||
        test.priority === "urgent" ||
        test.priority === "emergency") &&
      test.status !== "cancelled"
    );
  };

  const canPrintTest = (test: LabTest) => {
    // Can print if test is completed or reported (has results)
    return (
      (test.status === "completed" || test.status === "reported") &&
      test.processingStatus === "completed"
    );
  };

  const getTestCounts = () => {
    const pending = tests.filter(
      (t) =>
        t.collectionStatus === "pending" || t.collectionStatus === "scheduled",
    ).length;
    const collected = tests.filter(
      (t) => t.collectionStatus === "collected",
    ).length;

    return { pending, collected };
  };

  const counts = getTestCounts();

  if (loading) {
    return (
      <div className="container mx-auto p-4 md:p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <div className="h-8 rounded animate-pulse w-3/4 md:w-1/4 " />
          <div className="h-10 rounded animate-pulse w-full md:w-24" />
        </div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 md:h-16 rounded animate-pulse " />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Laboratory Tests
          </h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">
            Manage and process laboratory test samples
          </p>
          {user && (
            <p className="text-xs md:text-sm text-gray-500 mt-1">
              Logged in as: <span className="font-medium">{user.name}</span> (
              {user.role})
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Button
            variant="outline"
            onClick={fetchTests}
            className="flex-1 md:flex-none"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            <span className="hidden md:inline">Refresh</span>
            <span className="md:hidden">Sync</span>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 md:gap-4 mb-6">
        <Card>
          <CardContent className="pt-4 md:pt-6 px-3 md:px-6">
            <div className="text-center">
              <div className="text-xl md:text-2xl font-bold text-blue-600">
                {counts.pending}
              </div>
              <div className="text-xs md:text-sm text-gray-500 truncate">
                Pending Collection
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 md:pt-6 px-3 md:px-6">
            <div className="text-center">
              <div className="text-xl md:text-2xl font-bold text-emerald-600">
                {counts.collected}
              </div>
              <div className="text-xs md:text-sm text-gray-500 truncate">
                Collected
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different test categories */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="all" className="text-xs md:text-sm px-1 md:px-3">
            <span className="hidden md:inline">All Tests</span>
            <span className="md:hidden">All</span>
          </TabsTrigger>
          <TabsTrigger
            value="pending"
            className="text-xs md:text-sm px-1 md:px-3"
          >
            <span className="hidden md:inline">Pending Collection</span>
            <span className="md:hidden">Pending</span>
          </TabsTrigger>
          <TabsTrigger
            value="collected"
            className="text-xs md:text-sm px-1 md:px-3"
          >
            <span className="hidden md:inline">Collected</span>
            <span className="md:hidden">Collected</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Filters and Search */}
      <Card className="mb-6">
        <CardContent className="pt-4 md:pt-6">
          <div className="flex flex-col md:grid md:grid-cols-3 gap-3 md:gap-4">
            <div className="relative w-full">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search ID, patient, ref..."
                className="pl-9 w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="w-full">
              <Select
                value={collectionStatusFilter}
                onValueChange={setCollectionStatusFilter}
              >
                <SelectTrigger className="w-full">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 flex-shrink-0" />
                    <SelectValue placeholder="Collection Status" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="collected">Collected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tests Table - Desktop */}
      <Card className="hidden md:block">
        <CardHeader className="px-6">
          <CardTitle>Lab Tests ({filteredTests.length})</CardTitle>
          <CardDescription>
            Showing tests based on current filters
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Test ID</TableHead>
                  <TableHead className="whitespace-nowrap">
                    Test Details
                  </TableHead>
                  <TableHead className="whitespace-nowrap">Patient</TableHead>
                  <TableHead className="whitespace-nowrap">
                    Collection Status
                  </TableHead>
                  <TableHead className="whitespace-nowrap">Priority</TableHead>
                  <TableHead className="whitespace-nowrap">Ordered</TableHead>
                  <TableHead className="whitespace-nowrap text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <TestTube className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium">No tests found</h3>
                      <p className="text-muted-foreground mt-2">
                        {searchQuery || statusFilter !== "all"
                          ? "No tests match your filters"
                          : "No lab tests available"}
                      </p>
                      {tests.length === 0 && (
                        <div className="mt-4">
                          <AlertCircle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                          <p className="text-sm text-amber-600">
                            No lab tests found in database. Tests may need to be
                            ordered by doctors first.
                          </p>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTests.map((test) => (
                    <TableRow
                      key={test._id}
                      className={
                        test.priority === "emergency"
                          ? "hover:bg-red-100"
                          : test.priority === "urgent"
                            ? "hover:bg-orange-100"
                            : ""
                      }
                    >
                      <TableCell className="font-mono font-bold whitespace-nowrap">
                        {test.testId}
                        {test.labReferenceId && (
                          <div className="text-xs text-gray-500">
                            Ref: {test.labReferenceId}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{test.testName}</div>
                          <div className="text-sm text-gray-500">
                            {test.category}
                          </div>
                          {test.specimen?.type && (
                            <div className="text-xs text-gray-400">
                              Specimen: {test.specimen.type}
                              {test.specimen.quantity &&
                                ` (${test.specimen.quantity})`}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium flex items-center gap-1 whitespace-nowrap">
                            <User className="h-3 w-3" />
                            {test.patient.name}
                          </div>
                          <div className="text-sm text-gray-500 whitespace-nowrap">
                            ID: {test.patient.patientId}
                          </div>
                          {test.patient.phone && (
                            <div className="text-xs text-gray-400 whitespace-nowrap">
                              {test.patient.phone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {getCollectionStatusBadge(test.collectionStatus)}
                        {!test.paymentVerified &&
                          test.priority === "routine" && (
                            <div className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                              <CreditCard className="h-3 w-3" />
                              Payment required
                            </div>
                          )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Badge
                          variant="outline"
                          className={
                            test.priority === "emergency"
                              ? "border-red-300 text-red-700 bg-red-50"
                              : test.priority === "urgent"
                                ? "border-orange-300 text-orange-700 bg-orange-50"
                                : "border-blue-300 text-blue-700"
                          }
                        >
                          {test.priority}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <div className="text-sm">
                          {format(parseISO(test.orderedAt), "MMM dd")}
                        </div>
                        <div className="text-xs text-gray-500">
                          {format(parseISO(test.orderedAt), "HH:mm")}
                        </div>
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                            className="h-8 px-3"
                          >
                            <Link href={`/laboratory/tests/${test._id}`}>
                              <Eye className="h-3 w-3 mr-1" />
                              View
                            </Link>
                          </Button>

                          {canPrintTest(test) && (
                            <LabTestPDFGenerator
                              test={test}
                              mode="print"
                              buttonVariant="outline"
                              buttonSize="sm"
                              buttonLabel="Print"
                            />
                          )}

                          {canCollectSample(test) && (
                            <Button
                              size="sm"
                              asChild
                              className="h-8 px-3 bg-blue-600 hover:bg-blue-700"
                            >
                              <Link href={`/laboratory/tests`}>
                                <FlaskConical className="h-3 w-3 mr-1" />
                                Collect
                              </Link>
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Tests Cards - Mobile */}
      <div className="md:hidden space-y-4">
        {filteredTests.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <TestTube className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No tests found</h3>
              <p className="text-muted-foreground mt-2 text-sm">
                {searchQuery || statusFilter !== "all"
                  ? "No tests match your filters"
                  : "No lab tests available"}
              </p>
              {tests.length === 0 && (
                <div className="mt-4">
                  <AlertCircle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                  <p className="text-sm text-amber-600">
                    No lab tests found. Tests need to be ordered by doctors
                    first.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredTests.map((test) => (
            <Card
              key={test._id}
              className={`
                overflow-hidden
                ${test.priority === "emergency" ? "border-red-200 bg-red-50/30" : ""}
                ${test.priority === "urgent" ? "border-orange-200 bg-orange-50/30" : ""}
              `}
            >
              <CardContent className="p-4">
                {/* Header with ID and Priority */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Hash className="h-4 w-4 text-gray-400" />
                      <span className="font-mono font-bold text-sm">
                        {test.testId}
                      </span>
                    </div>
                    {test.labReferenceId && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        Ref: {test.labReferenceId}
                      </p>
                    )}
                    <h3 className="font-semibold text-base mt-1">
                      {test.testName}
                    </h3>
                    <p className="text-xs text-gray-500">{test.category}</p>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      test.priority === "emergency"
                        ? "border-red-300 text-red-700 bg-red-50 text-xs"
                        : test.priority === "urgent"
                          ? "border-orange-300 text-orange-700 bg-orange-50 text-xs"
                          : "border-blue-300 text-blue-700 text-xs"
                    }
                  >
                    {test.priority}
                  </Badge>
                </div>

                {/* Patient & Doctor Info - FIXED: Added optional chaining and fallback */}
                <div className="bg-gray-50 rounded-lg p-3 mb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-1 text-sm font-medium">
                        <User className="h-3.5 w-3.5 text-gray-500" />
                        {test.patient.name}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        ID: {test.patient.patientId}
                      </p>
                      {test.patient.phone && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          {test.patient.phone}
                        </p>
                      )}
                      {/* FIXED: Added optional chaining and fallback for doctor */}
                      {test.doctor ? (
                        <div className="flex items-center gap-1 mt-2 text-xs text-gray-600">
                          <Stethoscope className="h-3 w-3" />
                          Dr. {test.doctor.name}
                          {test.doctor.specialization && (
                            <span className="text-gray-400">
                              ({test.doctor.specialization})
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                          <Stethoscope className="h-3 w-3" />
                          <span className="italic">No doctor assigned</span>
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Calendar className="h-3 w-3" />
                        {format(parseISO(test.orderedAt), "MMM dd")}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {format(parseISO(test.orderedAt), "hh:mm a")}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Status Grid */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">
                      Collection Status
                    </p>
                    {getCollectionStatusBadge(test.collectionStatus)}
                    {!test.paymentVerified && test.priority === "routine" && (
                      <div className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                        <CreditCard className="h-3 w-3" />
                        Payment required
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Processing</p>
                    {getStatusBadge(test)}
                  </div>
                </div>

                {/* Specimen Info */}
                {test.specimen?.type && (
                  <div className="text-xs text-gray-500 mb-3 flex items-center gap-1">
                    <Layers className="h-3 w-3" />
                    Specimen: {test.specimen.type}
                    {test.specimen.quantity && ` (${test.specimen.quantity})`}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="flex-1"
                  >
                    <Link href={`/laboratory/tests/${test._id}`}>
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Link>
                  </Button>

                  {canPrintTest(test) && (
                    <LabTestPDFGenerator
                      test={test}
                      mode="print"
                      buttonVariant="outline"
                      buttonSize="sm"
                      buttonLabel="Print"
                    />
                  )}

                  {canCollectSample(test) && (
                    <Button
                      size="sm"
                      asChild
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                    >
                      <Link href={`/laboratory/tests`}>
                        <FlaskConical className="h-4 w-4 mr-1" />
                        Collect
                      </Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
