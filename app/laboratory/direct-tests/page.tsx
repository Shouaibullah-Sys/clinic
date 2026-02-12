// app/laboratory/direct-tests/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
  Calendar,
  Hash,
  Layers,
} from "lucide-react";
import Link from "next/link";
import { useAuthStore } from "@/store/useAuthStore";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { generateDirectTestPDF } from "@/lib/pdf-generator";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

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
  results?: {
    parameters: Array<{
      name: string;
      value: string | number;
      unit?: string;
      normalRange?: string;
      remarks?: string;
      flag?: "normal" | "low" | "high" | "critical";
    }>;
    interpretation?: string;
  };
}

export default function DirectTestsPage() {
  const { accessToken, user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("all");
  const [printingId, setPrintingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const {
    data: tests = [],
    isLoading: loading,
    refetch,
  } = useQuery<DirectLabTest[]>({
    queryKey: ["laboratory-direct-tests", accessToken],
    enabled: !!accessToken,
    queryFn: async () => {
      const response = await fetch(`/api/laboratory/direct-tests`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) {
        throw new Error(
          `Failed to fetch tests: ${response.status} ${response.statusText}`,
        );
      }
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to load direct lab tests");
      }
      return data.data || [];
    },
  });

  const fetchTests = async () => {
    try {
      await refetch();
    } catch (error) {
      console.error("Error fetching tests:", error);
      toast.error("Network error. Please try again.");
    }
  };

  // Client-side filtering based on active tab
  const getFilteredByTab = () => {
    if (activeTab === "all") return tests;
    if (activeTab === "pending") {
      return tests.filter(
        (t) => t.status === "pending" || t.status === "ordered",
      );
    }
    if (activeTab === "collected") {
      return tests.filter((t) => t.collectionStatus === "collected");
    }
    return tests;
  };

  const filteredTests = getFilteredByTab()
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
      if (statusFilter === "collected")
        return test.collectionStatus === "collected";
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

  const totalPages = Math.max(1, Math.ceil(filteredTests.length / pageSize));
  const paginatedTests = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTests.slice(start, start + pageSize);
  }, [filteredTests, currentPage]);

  const visiblePages = useMemo(() => {
    const delta = 1;
    const start = Math.max(1, currentPage - delta);
    const end = Math.min(totalPages, currentPage + delta);
    const pages: number[] = [];
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }, [currentPage, totalPages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery, statusFilter, paymentStatusFilter]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

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

    if (test.collectionStatus === "collected") {
      return <Badge className="bg-green-100 text-green-800">Collected</Badge>;
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
    const collected = tests.filter(
      (t) => t.collectionStatus === "collected",
    ).length;
    const completed = tests.filter(
      (t) => t.status === "completed" || t.status === "reported",
    ).length;
    const finalized = tests.filter((t) => t.finalized).length;
    const readyForPrint = tests.filter(
      (t) => t.collectionStatus === "collected",
    ).length;

    return { all, pending, collected, completed, finalized, readyForPrint };
  };

  const counts = getTestCounts();

  const canPrintTest = (test: DirectLabTest) => {
    return test.collectionStatus === "collected";
  };

  const handlePrintPDF = async (test: DirectLabTest) => {
    setPrintingId(test._id);

    try {
      // Fetch the complete test data from the API for PDF generation
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
        throw new Error(
          errorData.error || "Failed to fetch test data for printing",
        );
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to fetch test data for printing");
      }

      // Mark only the first successful print
      if (!test.printedAt) {
        await fetch(`/api/laboratory/direct-tests/${test._id}/print`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        });
      }

      // Generate and print PDF using the fetched test data
      await generateDirectTestPDF(data.data);

      // Refresh tests to update printed status
      fetchTests();
    } catch (err: any) {
      console.error("Error printing PDF:", err);
      toast.error(err.message || "Failed to generate print job");
    } finally {
      setPrintingId(null);
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
      <div className="container mx-auto p-4 md:p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <div className="h-8 rounded animate-pulse w-3/4 md:w-1/4 bg-gray-200" />
          <div className="h-10 rounded animate-pulse w-full md:w-24 bg-gray-200" />
        </div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-20 md:h-16 rounded animate-pulse bg-gray-200"
            />
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
          <p className="text-muted-foreground mt-1 text-sm md:text-base">
            Manage lab tests for patients visiting without a doctor
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
          <Button asChild className="flex-1 md:flex-none">
            <Link href="/laboratory/direct-tests/create">
              <Plus className="h-4 w-4 mr-2" />
              <span className="hidden md:inline">New Direct Test</span>
              <span className="md:hidden">New</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
        <Card>
          <CardContent className="pt-4 md:pt-6 px-3 md:px-6">
            <div className="text-center">
              <div className="text-xl md:text-2xl font-bold">{counts.all}</div>
              <div className="text-xs md:text-sm text-gray-500 truncate">
                All Tests
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 md:pt-6 px-3 md:px-6">
            <div className="text-center">
              <div className="text-xl md:text-2xl font-bold text-blue-600">
                {counts.pending}
              </div>
              <div className="text-xs md:text-sm text-gray-500 truncate">
                Pending
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 md:pt-6 px-3 md:px-6">
            <div className="text-center">
              <div className="text-xl md:text-2xl font-bold text-purple-600">
                {counts.collected}
              </div>
              <div className="text-xs md:text-sm text-gray-500 truncate">
                Collected
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 md:pt-6 px-3 md:px-6">
            <div className="text-center">
              <div className="text-xl md:text-2xl font-bold text-green-600">
                {counts.readyForPrint}
              </div>
              <div className="text-xs md:text-sm text-gray-500 truncate">
                Ready to Print
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
            <span className="hidden md:inline">Pending</span>
            <span className="md:hidden">Pend</span>
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
          <div className="flex flex-col md:grid md:grid-cols-4 gap-3 md:gap-4">
            <div className="relative w-full">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search ID, patient..."
                className="pl-9 w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="w-full">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 shrink-0" />
                    <SelectValue placeholder="Status" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending/Ordered</SelectItem>
                  <SelectItem value="collected">Collected</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-full">
              <Select
                value={paymentStatusFilter}
                onValueChange={setPaymentStatusFilter}
              >
                <SelectTrigger className="w-full">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 shrink-0" />
                    <SelectValue placeholder="Payment" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Payments</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tests Table - Desktop */}
      <Card className="hidden md:block">
        <CardHeader className="px-6">
          <CardTitle>Direct Lab Tests ({filteredTests.length})</CardTitle>
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
                  <TableHead className="whitespace-nowrap">Status</TableHead>
                  <TableHead className="whitespace-nowrap">
                    Collection
                  </TableHead>
                  <TableHead className="whitespace-nowrap">Payment</TableHead>
                  <TableHead className="whitespace-nowrap">Priority</TableHead>
                  <TableHead className="whitespace-nowrap">Created</TableHead>
                  <TableHead className="whitespace-nowrap text-right">
                    Actions
                  </TableHead>
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
                  paginatedTests.map((test) => (
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
                        {getStatusBadge(test)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {getCollectionStatusBadge(test.collectionStatus)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {getPaymentStatusBadge(
                          test.charges?.paymentStatus || "pending",
                          test.paymentVerified,
                        )}
                        {test.charges && (
                          <div className="text-xs text-gray-500 mt-1 whitespace-nowrap">
                            {formatPrice(test.charges.totalAmount)}
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
                          {format(parseISO(test.createdAtDirect), "MMM dd")}
                        </div>
                        <div className="text-xs text-gray-500">
                          {format(parseISO(test.createdAtDirect), "HH:mm")}
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
                            <Link href={`/laboratory/direct-tests/${test._id}`}>
                              <Eye className="h-3 w-3 mr-1" />
                              View
                            </Link>
                          </Button>
                          {canPrintTest(test) && (
                            <Button
                              size="sm"
                              onClick={() => handlePrintPDF(test)}
                              disabled={printingId === test._id}
                              className="h-8 px-3 bg-green-600 hover:bg-green-700"
                            >
                              {printingId === test._id ? (
                                <>Printing...</>
                              ) : (
                                <>
                                  <Printer className="h-3 w-3 mr-1" />
                                  Print
                                </>
                              )}
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
                {searchQuery ||
                statusFilter !== "all" ||
                paymentStatusFilter !== "all"
                  ? "No tests match your filters"
                  : "No direct lab tests available"}
              </p>
              {tests.length === 0 && (
                <div className="mt-4">
                  <Button asChild size="sm">
                    <Link href="/laboratory/direct-tests/create">
                      <Plus className="h-4 w-4 mr-2" />
                      Create First Test
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          paginatedTests.map((test) => (
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

                {/* Patient Info */}
                <div className="bg-gray-50 rounded-lg p-3 mb-3">
                  <div className="flex items-start justify-between">
                    <div>
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
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500">
                        {format(parseISO(test.createdAtDirect), "MMM dd, yyyy")}
                      </div>
                      <div className="text-xs text-gray-400">
                        {format(parseISO(test.createdAtDirect), "hh:mm a")}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Status Grid */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Status</p>
                    {getStatusBadge(test)}
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Collection</p>
                    {getCollectionStatusBadge(test.collectionStatus)}
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Payment</p>
                    {getPaymentStatusBadge(
                      test.charges?.paymentStatus || "pending",
                      test.paymentVerified,
                    )}
                  </div>
                  {test.charges && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Amount</p>
                      <p className="text-sm font-semibold">
                        {formatPrice(test.charges.totalAmount)}
                      </p>
                    </div>
                  )}
                </div>

                {/* Specimen Info */}
                {test.specimen?.type && (
                  <div className="text-xs text-gray-500 mb-3 flex items-center gap-1">
                    <Layers className="h-3 w-3" />
                    Specimen: {test.specimen.type}
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
                    <Link href={`/laboratory/direct-tests/${test._id}`}>
                      <Eye className="h-4 w-4 mr-1" />
                      View Details
                    </Link>
                  </Button>
                  {canPrintTest(test) && (
                    <Button
                      size="sm"
                      onClick={() => handlePrintPDF(test)}
                      disabled={printingId === test._id}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      {printingId === test._id ? (
                        <>Printing...</>
                      ) : (
                        <>
                          <Printer className="h-4 w-4 mr-1" />
                          Print
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {filteredTests.length > 0 && (
        <Pagination className="mt-6">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setCurrentPage((p) => Math.max(1, p - 1));
                }}
                className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
            {currentPage > 2 && (
              <>
                <PaginationItem>
                  <PaginationLink href="#" onClick={(e) => e.preventDefault()}>
                    1
                  </PaginationLink>
                </PaginationItem>
                <PaginationItem>
                  <PaginationEllipsis />
                </PaginationItem>
              </>
            )}
            {visiblePages.map((page) => (
              <PaginationItem key={page}>
                <PaginationLink
                  href="#"
                  isActive={page === currentPage}
                  onClick={(e) => {
                    e.preventDefault();
                    setCurrentPage(page);
                  }}
                >
                  {page}
                </PaginationLink>
              </PaginationItem>
            ))}
            {currentPage < totalPages - 1 && (
              <>
                <PaginationItem>
                  <PaginationEllipsis />
                </PaginationItem>
                <PaginationItem>
                  <PaginationLink
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setCurrentPage(totalPages);
                    }}
                  >
                    {totalPages}
                  </PaginationLink>
                </PaginationItem>
              </>
            )}
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setCurrentPage((p) => Math.min(totalPages, p + 1));
                }}
                className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
