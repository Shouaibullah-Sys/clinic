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
  doctor: {
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

  // Replace your current tab filtering logic with this:
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
      if (activeTab === "completed") {
        // Show tests that are completed (collected with results)
        return test.status === "completed";
      }
      if (activeTab === "reported") {
        // Show tests that are reported
        return test.status === "reported";
      }
      // "all" tab - show all except cancelled
      return test.status !== "cancelled";
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
      return <Badge className=" text-green-800">Reported</Badge>;
    }

    if (test.status === "completed") {
      return <Badge className=" text-blue-800">Completed</Badge>;
    }

    if (test.status === "processing") {
      return <Badge className=" text-purple-800">Processing</Badge>;
    }

    if (test.collectionStatus === "collected") {
      return <Badge className=" text-yellow-800">Ready for Processing</Badge>;
    }

    if (test.collectionStatus === "pending") {
      return <Badge className=" text-gray-800">Pending Collection</Badge>;
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
        {status?.toUpperCase() || "UNKNOWN"}
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
    const completed = tests.filter((t) => t.status === "completed").length;
    const reported = tests.filter((t) => t.status === "reported").length;

    return { pending, completed, reported };
  };

  const counts = getTestCounts();

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="h-8  rounded animate-pulse w-1/4" />
          <div className="h-10  rounded animate-pulse w-24" />
        </div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16  rounded animate-pulse" />
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
          <p className="text-muted-foreground mt-1">
            Manage and process laboratory test samples
          </p>
          {user && (
            <p className="text-sm text-gray-500 mt-1">
              Logged in as: <span className="font-medium">{user.name}</span> (
              {user.role})
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchTests}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {counts.pending}
              </div>
              <div className="text-sm text-gray-500">Pending Collection</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-600">
                {counts.completed}
              </div>
              <div className="text-sm text-gray-500">Completed</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">
                {counts.reported}
              </div>
              <div className="text-sm text-gray-500">Reported</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different test categories */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="grid grid-cols-4">
          <TabsTrigger value="all">All Tests</TabsTrigger>
          <TabsTrigger value="pending">Pending Collection</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="reported">Reported</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Filters and Search */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by test ID, patient, or reference..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    <SelectValue placeholder="Filter by status" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending/Ordered</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Select
                value={collectionStatusFilter}
                onValueChange={setCollectionStatusFilter}
              >
                <SelectTrigger>
                  <div className="flex items-center gap-2">
                    <FlaskConical className="h-4 w-4" />
                    <SelectValue placeholder="Filter by collection" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Collection Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="collected">Collected</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tests Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lab Tests ({filteredTests.length})</CardTitle>
          <CardDescription>
            Showing tests based on current filters
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Test ID</TableHead>
                  <TableHead>Test Details</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Collection Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Ordered</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
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
                          ? " hover:bg-red-100"
                          : test.priority === "urgent"
                            ? " hover:bg-orange-100"
                            : ""
                      }
                    >
                      <TableCell className="font-mono font-bold">
                        {test.testId}
                        {test.labReferenceId && (
                          <div className="text-xs text-gray-500">
                            {test.labReferenceId}
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
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {test.patient.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            ID: {test.patient.patientId}
                          </div>
                          {test.patient.phone && (
                            <div className="text-xs text-gray-400">
                              {test.patient.phone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getCollectionStatusBadge(test.collectionStatus)}
                        {!test.paymentVerified &&
                          test.priority === "routine" && (
                            <div className="text-xs text-amber-600 mt-1">
                              Payment verification required
                            </div>
                          )}
                      </TableCell>
                      <TableCell>
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
                      <TableCell>
                        <div className="text-sm">
                          {format(parseISO(test.orderedAt), "MMM dd")}
                        </div>
                        <div className="text-xs text-gray-500">
                          {format(parseISO(test.orderedAt), "HH:mm")}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
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
                            <Button size="sm" asChild className="h-8 px-3">
                              <Link
                                href={`/laboratory/tests/${test._id}/collect`}
                              >
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
    </div>
  );
}
