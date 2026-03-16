// app/laboratory/tests/page.tsx

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
  Pencil,
} from "lucide-react";
import Link from "next/link";
import { useAuthStore } from "@/store/useAuthStore";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LabTestPDFGenerator from "@/components/laboratory/LabTestPDFGenerator";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

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
  results?: {
    parameters?: Array<{
      name: string;
      value: string | number;
      unit?: string;
      normalRange?: string;
      remarks?: string;
    }>;
  };
}

export default function LaboratoryTestsPage() {
  const { accessToken, user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [collectionStatusFilter, setCollectionStatusFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("pending");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const {
    data: tests = [],
    isLoading: loading,
    refetch,
  } = useQuery<LabTest[]>({
    queryKey: ["laboratory-tests", accessToken],
    enabled: !!accessToken,
    queryFn: async () => {
      const response = await fetch(`/api/laboratory/tests?tab=all`, {
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
        throw new Error(data.error || "Failed to load lab tests");
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
  }, [activeTab, searchQuery, statusFilter, collectionStatusFilter]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const getStatusBadge = (test: LabTest) => {
    if (test.status === "cancelled") {
      return <Badge variant="destructive">Cancelled</Badge>;
    }

    if (test.status === "reported") {
      return <Badge className="bg-primary/15 text-primary">Reported</Badge>;
    }

    if (test.status === "completed") {
      return <Badge className="bg-primary/15 text-primary">Completed</Badge>;
    }

    if (test.collectionStatus === "collected") {
      return <Badge className="bg-primary/15 text-primary">Collected</Badge>;
    }

    if (test.collectionStatus === "pending") {
      return <Badge variant="secondary">Pending Collection</Badge>;
    }

    return <Badge variant="outline">{test.status || "Unknown"}</Badge>;
  };

  const getCollectionStatusBadge = (status: string) => {
    const variants: Record<string, { bg: string; text: string }> = {
      pending: { bg: "bg-muted", text: "text-foreground" },
      scheduled: { bg: "bg-primary/15", text: "text-primary" },
      collected: { bg: "bg-primary/15", text: "text-primary" },
      rejected: { bg: "bg-destructive/15", text: "text-destructive" },
      insufficient: { bg: "bg-muted", text: "text-foreground" },
    };

    const variant = variants[status] || {
      bg: "bg-muted",
      text: "text-foreground",
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
    // Collection is the final step, so print should be available after collection
    return test.collectionStatus === "collected";
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
                  paginatedTests.map((test) => (
                    <TableRow key={test._id} className="hover:bg-muted/50">
                      <TableCell className="font-mono font-bold whitespace-nowrap">
                        {test.testId}
                        {test.labReferenceId && (
                          <div className="text-xs text-muted-foreground">
                            Ref: {test.labReferenceId}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{test.testName}</div>
                          <div className="text-sm text-muted-foreground">
                            {test.category}
                          </div>
                          {test.specimen?.type && (
                            <div className="text-xs text-muted-foreground">
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
                          <div className="text-sm text-muted-foreground whitespace-nowrap">
                            ID: {test.patient.patientId}
                          </div>
                          {test.patient.phone && (
                            <div className="text-xs text-muted-foreground whitespace-nowrap">
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
                              ? "border-destructive/40 text-destructive bg-destructive/10"
                              : test.priority === "urgent"
                                ? "border-primary/40 text-primary bg-primary/10"
                                : "border-primary/40 text-primary"
                          }
                        >
                          {test.priority}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <div className="text-sm">
                          {format(parseISO(test.orderedAt), "MMM dd")}
                        </div>
                        <div className="text-xs text-muted-foreground">
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
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                            className="h-8 px-3"
                          >
                            <Link href={`/laboratory/tests/${test._id}?edit=1`}>
                              <Pencil className="h-3 w-3 mr-1" />
                              Edit
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
          paginatedTests.map((test) => (
            <Card
              key={test._id}
              className={`
                overflow-hidden
                hover:bg-muted/50
              `}
            >
              <CardContent className="p-4">
                {/* Header with ID and Priority */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Hash className="h-4 w-4 text-muted-foreground" />
                      <span className="font-mono font-bold text-sm">
                        {test.testId}
                      </span>
                    </div>
                    {test.labReferenceId && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Ref: {test.labReferenceId}
                      </p>
                    )}
                    <h3 className="font-semibold text-base mt-1">
                      {test.testName}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {test.category}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      test.priority === "emergency"
                        ? "border-destructive/40 text-destructive bg-destructive/10 text-xs"
                        : test.priority === "urgent"
                          ? "border-primary/40 text-primary bg-primary/10 text-xs"
                          : "border-primary/40 text-primary text-xs"
                    }
                  >
                    {test.priority}
                  </Badge>
                </div>

                {/* Patient & Doctor Info - FIXED: Added optional chaining and fallback */}
                <div className="bg-muted/30 rounded-lg p-3 mb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-1 text-sm font-medium">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                        {test.patient.name}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        ID: {test.patient.patientId}
                      </p>
                      {test.patient.phone && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {test.patient.phone}
                        </p>
                      )}
                      {/* FIXED: Added optional chaining and fallback for doctor */}
                      {test.doctor ? (
                        <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                          <Stethoscope className="h-3 w-3" />
                          Dr. {test.doctor.name}
                          {test.doctor.specialization && (
                            <span className="text-muted-foreground">
                              ({test.doctor.specialization})
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                          <Stethoscope className="h-3 w-3" />
                          <span className="italic">No doctor assigned</span>
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {format(parseISO(test.orderedAt), "MMM dd")}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {format(parseISO(test.orderedAt), "hh:mm a")}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Status Grid */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
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
                    <p className="text-xs text-muted-foreground mb-1">Status</p>
                    {getStatusBadge(test)}
                  </div>
                </div>

                {/* Specimen Info */}
                {test.specimen?.type && (
                  <div className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
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
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="flex-1"
                  >
                    <Link href={`/laboratory/tests/${test._id}?edit=1`}>
                      <Pencil className="h-4 w-4 mr-1" />
                      Edit
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
                    <Button size="sm" asChild className="flex-1">
                      <Link href={`/laboratory/tests/${test._id}/collect`}>
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
                className={
                  currentPage === 1 ? "pointer-events-none opacity-50" : ""
                }
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
                className={
                  currentPage === totalPages
                    ? "pointer-events-none opacity-50"
                    : ""
                }
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
