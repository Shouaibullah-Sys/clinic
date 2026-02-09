// app/radiology/direct-exams/page.tsx
"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { jsPDF } from "jspdf";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  Scan,
  Eye,
  Plus,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  User,
  DollarSign,
  Printer,
  Filter,
} from "lucide-react";
import Link from "next/link";
import { useAuthStore } from "@/store/useAuthStore";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";

interface DirectRadiologyExam {
  _id: string;
  examId: string;
  examName: string;
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
  examStatus: string;
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
  modality?: {
    type: string;
    bodyPart?: string;
    view?: string;
  };
}

export default function DirectExamsPage() {
  const router = useRouter();
  const { accessToken, user } = useAuthStore();
  const [exams, setExams] = useState<DirectRadiologyExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");
  const [printingId, setPrintingId] = useState<string | null>(null);

  useEffect(() => {
    fetchExams();
  }, [accessToken]);

  const fetchExams = async () => {
    try {
      setLoading(true);
      if (!accessToken) {
        console.log("No access token available");
        return;
      }

      const response = await fetch(`/api/radiology/direct-exams`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        toast.error(`Failed to fetch exams: ${response.status}`);
        return;
      }

      const data = await response.json();
      if (data.success) {
        setExams(data.data || []);
      } else {
        toast.error(data.error || "Failed to load direct radiology exams");
      }
    } catch (error) {
      console.error("Error fetching exams:", error);
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics from real data
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayExams = exams.filter((e) => new Date(e.createdAtDirect) >= today);

  const getExamCounts = () => {
    const all = exams.length;
    const pending = exams.filter(
      (e) => e.status === "pending" || e.status === "ordered",
    ).length;
    const processing = exams.filter(
      (e) => e.examStatus === "in-progress",
    ).length;
    const readyForPrint = exams.filter(
      (e) => e.readyForPrint && !e.printedAt,
    ).length;
    const completed = exams.filter((e) => e.status === "completed").length;

    return { all, pending, processing, readyForPrint, completed };
  };

  const counts = getExamCounts();

  // Filter exams based on tab selection
  const getFilteredExams = (tabValue: string) => {
    let filtered = exams;

    if (tabValue !== "all") {
      if (tabValue === "pending") {
        filtered = filtered.filter(
          (e) => e.status === "pending" || e.status === "ordered",
        );
      } else if (tabValue === "processing") {
        filtered = filtered.filter((e) => e.examStatus === "in-progress");
      } else if (tabValue === "ready-to-print") {
        filtered = filtered.filter((e) => e.readyForPrint && !e.printedAt);
      } else if (tabValue === "completed") {
        filtered = filtered.filter((e) => e.status === "completed");
      }
    }

    // Apply additional filters
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (exam) =>
          exam.examId.toLowerCase().includes(query) ||
          exam.examName.toLowerCase().includes(query) ||
          exam.patient.name.toLowerCase().includes(query) ||
          exam.patient.patientId.toLowerCase().includes(query),
      );
    }

    if (statusFilter !== "all") {
      if (statusFilter === "pending") {
        filtered = filtered.filter(
          (e) => e.status === "pending" || e.status === "ordered",
        );
      } else if (statusFilter === "in-progress") {
        filtered = filtered.filter((e) => e.examStatus === "in-progress");
      } else if (statusFilter === "completed") {
        filtered = filtered.filter((e) => e.status === "completed");
      } else if (statusFilter === "cancelled") {
        filtered = filtered.filter((e) => e.status === "cancelled");
      }
    }

    if (paymentStatusFilter !== "all") {
      filtered = filtered.filter(
        (exam) => exam.charges?.paymentStatus === paymentStatusFilter,
      );
    }

    return filtered;
  };

  const getStatusBadge = (exam: DirectRadiologyExam) => {
    if (exam.status === "cancelled") {
      return <Badge variant="destructive">Cancelled</Badge>;
    }
    if (exam.status === "reported" || exam.status === "completed") {
      return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
    }
    if (exam.examStatus === "in-progress") {
      return (
        <Badge className="bg-purple-100 text-purple-800">In Progress</Badge>
      );
    }
    if (exam.status === "pending" || exam.status === "ordered") {
      return <Badge variant="outline">Pending</Badge>;
    }
    return <Badge variant="outline">{exam.status || "Unknown"}</Badge>;
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

  const handlePrintPDF = async (exam: DirectRadiologyExam) => {
    setPrintingId(exam._id);
    try {
      await fetch(`/api/radiology/direct-exams/${exam._id}/print`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      const doc = new jsPDF();
      // ... PDF generation code remains the same ...

      doc.autoPrint();
      window.open(doc.output("bloburl"), "_blank");
      fetchExams();
    } catch (err) {
      console.error("Error printing PDF:", err);
      toast.error("Failed to generate print job");
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

  const formatCategory = (category?: string) => {
    if (!category) return "N/A";
    return category.replace(/_/g, " ");
  };

  const handleRefresh = async () => {
    try {
      await fetchExams();
      toast.success("Data Refreshed", {
        description: "Direct exams have been updated",
      });
    } catch (error) {
      toast.error("Refresh Failed", {
        description: "Failed to refresh direct exams",
      });
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="h-8 rounded animate-pulse w-1/4" />
            <div className="h-10 rounded animate-pulse w-24" />
          </div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 rounded animate-pulse" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Direct Radiology Exams
            </h1>
            <p className="text-muted-foreground">
              Manage radiology exams for patients visiting without a doctor
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleRefresh}
              disabled={loading}
              variant="outline"
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
            <Button asChild>
              <Link href="/radiology/direct-exams/create">
                <Plus className="mr-2 h-4 w-4" />
                New Direct Exam
              </Link>
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold">{counts.all}</div>
                <div className="text-sm text-muted-foreground">All Exams</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">
                  {counts.pending}
                </div>
                <div className="text-sm text-muted-foreground">Pending</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">
                  {counts.processing}
                </div>
                <div className="text-sm text-muted-foreground">Processing</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">
                  {counts.readyForPrint}
                </div>
                <div className="text-sm text-muted-foreground">
                  Ready to Print
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content with Tabs */}
        <Tabs defaultValue="all" className="space-y-4">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="processing">Processing</TabsTrigger>
              <TabsTrigger value="ready-to-print">Ready to Print</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
            </TabsList>
          </div>

          {/* Filters and Search */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by exam ID, patient name, patient ID..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value)}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={paymentStatusFilter}
                onValueChange={(value) => setPaymentStatusFilter(value)}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Payment" />
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

          {/* Tab Contents */}
          {["all", "pending", "processing", "ready-to-print", "completed"].map(
            (tabValue) => (
              <TabsContent
                key={tabValue}
                value={tabValue}
                className="space-y-4"
              >
                <Card>
                  <CardHeader>
                    <CardTitle>
                      Direct Exams ({getFilteredExams(tabValue).length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Exam ID</TableHead>
                            <TableHead>Exam Details</TableHead>
                            <TableHead>Patient</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Payment</TableHead>
                            <TableHead>Priority</TableHead>
                            <TableHead>Created</TableHead>
                            <TableHead className="text-right">
                              Actions
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {getFilteredExams(tabValue).length === 0 ? (
                            <TableRow>
                              <TableCell
                                colSpan={8}
                                className="text-center py-8"
                              >
                                <Scan className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                <h3 className="text-lg font-medium">
                                  No exams found
                                </h3>
                                <p className="text-muted-foreground mt-2">
                                  No direct radiology exams match your criteria
                                </p>
                              </TableCell>
                            </TableRow>
                          ) : (
                            getFilteredExams(tabValue).map((exam) => (
                              <TableRow
                                key={exam._id}
                                className="cursor-pointer hover:bg-muted/50"
                                onClick={() =>
                                  router.push(`/radiology/records/${exam._id}`)
                                }
                              >
                                <TableCell className="font-mono font-bold">
                                  {exam.examId}
                                </TableCell>
                                <TableCell>
                                  <div>
                                    <div className="font-medium">
                                      {exam.examName}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                      {formatCategory(exam.category)}
                                    </div>
                                    {exam.modality?.type && (
                                      <div className="text-xs text-muted-foreground">
                                        {exam.modality.type}
                                        {exam.modality.bodyPart &&
                                          ` - ${exam.modality.bodyPart}`}
                                      </div>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div>
                                    <div className="font-medium flex items-center gap-1">
                                      <User className="h-3 w-3" />
                                      {exam.patient.name}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                      ID: {exam.patient.patientId}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>{getStatusBadge(exam)}</TableCell>
                                <TableCell>
                                  {getPaymentStatusBadge(
                                    exam.charges?.paymentStatus || "pending",
                                    exam.paymentVerified,
                                  )}
                                  {exam.charges && (
                                    <div className="text-xs text-muted-foreground mt-1">
                                      {formatPrice(exam.charges.totalAmount)}
                                    </div>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant="outline"
                                    className={
                                      exam.priority === "emergency"
                                        ? "border-red-300 text-red-700"
                                        : exam.priority === "urgent"
                                          ? "border-orange-300 text-orange-700"
                                          : ""
                                    }
                                  >
                                    {exam.priority}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="text-sm">
                                    {format(
                                      parseISO(exam.createdAtDirect),
                                      "MMM dd",
                                    )}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {format(
                                      parseISO(exam.createdAtDirect),
                                      "HH:mm",
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      asChild
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <Link
                                        href={`/radiology/direct-exams/${exam._id}`}
                                      >
                                        <Eye className="h-3 w-3 mr-1" />
                                        View
                                      </Link>
                                    </Button>
                                    {exam.readyForPrint && !exam.printedAt && (
                                      <Button
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handlePrintPDF(exam);
                                        }}
                                        disabled={printingId === exam._id}
                                        className="bg-green-600 hover:bg-green-700"
                                      >
                                        <Printer className="h-3 w-3 mr-1" />
                                        {printingId === exam._id
                                          ? "Printing..."
                                          : "Print"}
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
              </TabsContent>
            ),
          )}
        </Tabs>

        {/* Additional Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-4">Today's Direct Exams</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span>Total Today</span>
                  <span className="font-semibold">{todayExams.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Pending Today</span>
                  <span className="font-semibold text-blue-600">
                    {todayExams.filter((e) => e.status === "pending").length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Completed Today</span>
                  <span className="font-semibold text-green-600">
                    {todayExams.filter((e) => e.status === "completed").length}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-4">Payment Overview</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span>Pending Payment</span>
                  <span className="font-semibold">
                    {
                      exams.filter(
                        (e) => e.charges?.paymentStatus === "pending",
                      ).length
                    }
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Partial Payments</span>
                  <span className="font-semibold text-yellow-600">
                    {
                      exams.filter(
                        (e) => e.charges?.paymentStatus === "partial",
                      ).length
                    }
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Fully Paid</span>
                  <span className="font-semibold text-green-600">
                    {
                      exams.filter((e) => e.charges?.paymentStatus === "paid")
                        .length
                    }
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
