// app/laboratory/direct-tests/page.tsx

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
  Plus,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  User,
  DollarSign,
  FileText,
  Printer,
  Filter,
} from "lucide-react";
import Link from "next/link";
import { useAuthStore } from "@/store/useAuthStore";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  };
  createdBy?: {
    _id: string;
    name: string;
  };
  status: string;
  collectionStatus: string;
  processingStatus: string;
  paymentVerified: boolean;
  priority: string;
  createdAtDirect: string;
  finalized: boolean;
  readyForPrint: boolean;
  printedAt?: string;
  charges?: {
    paymentStatus: string;
    totalAmount: number;
    paid: number;
    due: number;
  };
  specimen?: {
    type: string;
  };
}

export default function DirectTestsPage() {
  const { accessToken, user } = useAuthStore();
  const [tests, setTests] = useState<DirectLabTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("all");

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

      console.log("Fetching direct lab tests...");
      const url = `/api/laboratory/direct-tests?tab=${activeTab}`;
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
        console.log(`Loaded ${data.data?.length || 0} direct lab tests`);
      } else {
        toast.error(data.error || "Failed to load direct lab tests");
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
        test.patient.patientId.toLowerCase().includes(query)
      );
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
      if (paymentStatusFilter === "all") return true;
      if (paymentStatusFilter === "pending")
        return test.charges?.paymentStatus === "pending";
      if (paymentStatusFilter === "partial")
        return test.charges?.paymentStatus === "partial";
      if (paymentStatusFilter === "paid")
        return test.charges?.paymentStatus === "paid";
      return true;
    });

  const getStatusBadge = (test: DirectLabTest) => {
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

  const getCollectionStatusBadge = (collectionStatus: string) => {
    switch (collectionStatus) {
      case "collected":
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Collected
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="outline">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case "scheduled":
        return (
          <Badge className="bg-blue-100 text-blue-800">
            <Clock className="h-3 w-3 mr-1" />
            Scheduled
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        );
      case "insufficient":
        return (
          <Badge className="bg-orange-100 text-orange-800">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Insufficient
          </Badge>
        );
      default:
        return <Badge variant="outline">{collectionStatus}</Badge>;
    }
  };

  const getPaymentStatusBadge = (
    paymentStatus: string,
    paymentVerified: boolean,
  ) => {
    if (paymentVerified) {
      return (
        <Badge className="bg-green-100 text-green-800">
          <CheckCircle className="h-3 w-3 mr-1" />
          Verified
        </Badge>
      );
    }

    switch (paymentStatus) {
      case "paid":
        return <Badge className="bg-green-100 text-green-800">Paid</Badge>;
      case "partial":
        return <Badge className="bg-yellow-100 text-yellow-800">Partial</Badge>;
      case "pending":
        return <Badge variant="outline">Pending</Badge>;
      default:
        return <Badge variant="outline">{paymentStatus}</Badge>;
    }
  };

  const getTestCounts = () => {
    const all = tests.length;
    const pending = tests.filter(
      (t) => t.status === "pending" || t.status === "ordered",
    ).length;
    const processing = tests.filter((t) => t.status === "processing").length;
    const completed = tests.filter(
      (t) => t.status === "completed" || t.status === "reported",
    ).length;
    const finalized = tests.filter((t) => t.finalized).length;
    const readyForPrint = tests.filter(
      (t) => t.readyForPrint && !t.printedAt,
    ).length;

    return { all, pending, processing, completed, finalized, readyForPrint };
  };

  const counts = getTestCounts();

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
        <div className="flex items-center justify-between mb-6">
          <div className="h-8 rounded animate-pulse w-1/4" />
          <div className="h-10 rounded animate-pulse w-24" />
        </div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 rounded animate-pulse" />
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
            Direct Lab Tests
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage lab tests for patients visiting without a doctor
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
          <Button asChild>
            <Link href="/laboratory/direct-tests/create">
              <Plus className="h-4 w-4 mr-2" />
              New Direct Test
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold">{counts.all}</div>
              <div className="text-sm text-gray-500">All Tests</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {counts.pending}
              </div>
              <div className="text-sm text-gray-500">Pending</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {counts.processing}
              </div>
              <div className="text-sm text-gray-500">Processing</div>
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
              <div className="text-2xl font-bold text-green-600">
                {counts.finalized}
              </div>
              <div className="text-sm text-gray-500">Finalized</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {counts.readyForPrint}
              </div>
              <div className="text-sm text-gray-500">Ready to Print</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different test categories */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="grid grid-cols-4">
          <TabsTrigger value="all">All Tests</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="processing">Processing</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Filters and Search */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by test ID, patient..."
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
                value={paymentStatusFilter}
                onValueChange={setPaymentStatusFilter}
              >
                <SelectTrigger>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    <SelectValue placeholder="Filter by payment" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Payment Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tests Table */}
      <Card>
        <CardHeader>
          <CardTitle>Direct Lab Tests ({filteredTests.length})</CardTitle>
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
                  <TableHead>Status</TableHead>
                  <TableHead>Collection</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      <TestTube className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium">No tests found</h3>
                      <p className="text-muted-foreground mt-2">
                        {searchQuery ||
                        statusFilter !== "all" ||
                        paymentStatusFilter !== "all"
                          ? "No tests match your filters"
                          : "No direct lab tests available"}
                      </p>
                      {tests.length === 0 && (
                        <div className="mt-4">
                          <Button asChild>
                            <Link href="/laboratory/direct-tests/create">
                              <Plus className="h-4 w-4 mr-2" />
                              Create First Direct Test
                            </Link>
                          </Button>
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
                      <TableCell className="font-mono font-bold">
                        {test.testId}
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
                      <TableCell>{getStatusBadge(test)}</TableCell>
                      <TableCell>
                        {getCollectionStatusBadge(test.collectionStatus)}
                      </TableCell>
                      <TableCell>
                        {getPaymentStatusBadge(
                          test.charges?.paymentStatus || "pending",
                          test.paymentVerified,
                        )}
                        {test.charges && (
                          <div className="text-xs text-gray-500 mt-1">
                            {formatPrice(test.charges.totalAmount)}
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
                          {format(parseISO(test.createdAtDirect), "MMM dd")}
                        </div>
                        <div className="text-xs text-gray-500">
                          {format(parseISO(test.createdAtDirect), "HH:mm")}
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
                            <Link href={`/laboratory/direct-tests/${test._id}`}>
                              <Eye className="h-3 w-3 mr-1" />
                              View
                            </Link>
                          </Button>

                          {test.paymentVerified &&
                            test.collectionStatus !== "collected" && (
                              <Button
                                size="sm"
                                asChild
                                className="h-8 px-3 bg-blue-600 hover:bg-blue-700"
                              >
                                <Link
                                  href={`/laboratory/direct-tests/${test._id}`}
                                >
                                  <TestTube className="h-3 w-3 mr-1" />
                                  Collect
                                </Link>
                              </Button>
                            )}

                          {test.readyForPrint && !test.printedAt && (
                            <Button
                              size="sm"
                              asChild
                              className="h-8 px-3 bg-green-600 hover:bg-green-700"
                            >
                              <Link
                                href={`/laboratory/direct-tests/${test._id}/print`}
                              >
                                <Printer className="h-3 w-3 mr-1" />
                                Print
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
