// app/radiology/direct-exams/page.tsx

"use client";

import { useState, useEffect } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
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
  Scan,
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
  const { accessToken, user } = useAuthStore();
  const [exams, setExams] = useState<DirectRadiologyExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("all");
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

      console.log("Fetching direct radiology exams...");
      const url = `/api/radiology/direct-exams`;
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
          `Failed to fetch exams: ${response.status} ${response.statusText}`,
        );
        return;
      }

      const data = await response.json();
      console.log("API Response:", data);

      if (data.success) {
        setExams(data.data || []);
        console.log(`Loaded ${data.data?.length || 0} direct radiology exams`);
      } else {
        toast.error(data.error || "Failed to load direct radiology exams");
        console.error("API Error:", data.error);
      }
    } catch (error) {
      console.error("Error fetching exams:", error);
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Client-side filtering based on active tab
  const getFilteredByTab = () => {
    if (activeTab === "all") return exams;
    if (activeTab === "pending") {
      return exams.filter(
        (e) => e.status === "pending" || e.status === "ordered",
      );
    }
    if (activeTab === "processing") {
      return exams.filter((e) => e.examStatus === "in-progress");
    }
    if (activeTab === "ready-to-print") {
      return exams.filter((e) => e.readyForPrint && !e.printedAt);
    }
    return exams;
  };

  const filteredExams = getFilteredByTab()
    .filter((exam) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        exam.examId.toLowerCase().includes(query) ||
        exam.examName.toLowerCase().includes(query) ||
        exam.patient.name.toLowerCase().includes(query) ||
        exam.patient.patientId.toLowerCase().includes(query)
      );
    })
    .filter((exam) => {
      if (statusFilter === "all") return true;
      if (statusFilter === "pending")
        return exam.status === "pending" || exam.status === "ordered";
      if (statusFilter === "in-progress")
        return exam.examStatus === "in-progress";
      if (statusFilter === "completed")
        return exam.status === "completed" || exam.status === "reported";
      if (statusFilter === "cancelled") return exam.status === "cancelled";
      return true;
    })
    .filter((exam) => {
      if (paymentStatusFilter === "all") return true;
      if (paymentStatusFilter === "pending")
        return exam.charges?.paymentStatus === "pending";
      if (paymentStatusFilter === "partial")
        return exam.charges?.paymentStatus === "partial";
      if (paymentStatusFilter === "paid")
        return exam.charges?.paymentStatus === "paid";
      return true;
    });

  const getStatusBadge = (exam: DirectRadiologyExam) => {
    if (exam.status === "cancelled") {
      return <Badge variant="destructive">Cancelled</Badge>;
    }

    if (exam.status === "reported") {
      return <Badge className="bg-green-100 text-green-800">Reported</Badge>;
    }

    if (exam.status === "completed") {
      return <Badge className="bg-blue-100 text-blue-800">Completed</Badge>;
    }

    if (exam.examStatus === "in-progress") {
      return (
        <Badge className="bg-purple-100 text-purple-800">In Progress</Badge>
      );
    }

    if (exam.examStatus === "scheduled") {
      return <Badge className="bg-yellow-100 text-yellow-800">Scheduled</Badge>;
    }

    if (exam.status === "pending" || exam.status === "ordered") {
      return <Badge variant="outline">Pending</Badge>;
    }

    return <Badge variant="outline">{exam.status || "Unknown"}</Badge>;
  };

  const getExamStatusBadge = (examStatus: string) => {
    switch (examStatus) {
      case "completed":
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        );
      case "in-progress":
        return (
          <Badge className="bg-purple-100 text-purple-800">
            <Clock className="h-3 w-3 mr-1" />
            In Progress
          </Badge>
        );
      case "scheduled":
        return (
          <Badge className="bg-blue-100 text-blue-800">
            <Clock className="h-3 w-3 mr-1" />
            Scheduled
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="outline">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case "cancelled":
        return (
          <Badge variant="destructive">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Cancelled
          </Badge>
        );
      default:
        return <Badge variant="outline">{examStatus}</Badge>;
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

    return { all, pending, processing, readyForPrint };
  };

  const counts = getExamCounts();

  const handlePrintPDF = async (exam: DirectRadiologyExam) => {
    setPrintingId(exam._id);

    try {
      // Mark the exam as printed
      await fetch(`/api/radiology/direct-exams/${exam._id}/print`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      // Generate PDF
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 14;
      let yPos = margin;

      const addText = (
        text: string,
        x: number,
        y: number,
        fontSize: number = 10,
        fontStyle: string = "normal",
        align: "left" | "center" | "right" = "left",
      ) => {
        doc.setFontSize(fontSize);
        doc.setFont("helvetica", fontStyle);
        doc.text(text, x, y, { align });
        return y + fontSize * 0.4;
      };

      // Header
      yPos = addText(
        "RADIOLOGY EXAM REPORT",
        pageWidth / 2,
        yPos,
        18,
        "bold",
        "center",
      );
      yPos += 2;
      yPos = addText(
        "Sajad Barekzai Hospital",
        pageWidth / 2,
        yPos,
        12,
        "bold",
        "center",
      );
      yPos = addText(
        "Comprehensive Diagnostic Services",
        pageWidth / 2,
        yPos,
        9,
        "normal",
        "center",
      );
      yPos += 4;

      doc.setDrawColor(59, 130, 246);
      doc.setLineWidth(0.5);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 6;

      // Exam Info
      yPos = addText(`Exam ID: ${exam.examId}`, margin, yPos, 10, "bold");
      yPos = addText(
        `Radiology Reference: ${exam.examId}`,
        pageWidth - margin,
        yPos,
        10,
        "normal",
        "right",
      );
      yPos += 2;
      yPos = addText(`Exam: ${exam.examName}`, margin, yPos, 12, "bold");
      yPos = addText(
        `Category: ${exam.category.replace(/_/g, " ").toUpperCase()}`,
        margin,
        yPos,
        9,
      );
      yPos += 2;

      // Patient Info
      yPos += 2;
      yPos = addText("PATIENT INFORMATION", margin, yPos, 11, "bold");
      yPos += 2;

      const patientInfo = [
        ["Name:", exam.patient.name || "N/A"],
        ["Patient ID:", exam.patient.patientId || "N/A"],
        ["Gender:", "N/A"],
        ["Phone:", exam.patient.phone || "N/A"],
      ];

      autoTable(doc, {
        startY: yPos,
        head: [],
        body: patientInfo,
        theme: "plain",
        styles: { fontSize: 9, cellPadding: 1 },
        columnStyles: {
          0: { fontStyle: "bold", cellWidth: 40 },
          1: { cellWidth: 60 },
        },
      });

      yPos = (doc as any).lastAutoTable.finalY + 4;

      // Exam Details
      yPos = addText("EXAM DETAILS", margin, yPos, 11, "bold");
      yPos += 2;

      const formatDate = (dateString?: string) => {
        if (!dateString) return "N/A";
        return new Date(dateString).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
      };

      const examDetails = [
        ["Ordered Date:", formatDate(exam.createdAtDirect)],
        ["Modality:", exam.modality?.type || "N/A"],
        ["Body Part:", exam.modality?.bodyPart || "N/A"],
        ["View:", exam.modality?.view || "N/A"],
        ["Exam Status:", exam.examStatus?.toUpperCase() || "N/A"],
        ["Status:", exam.status?.toUpperCase() || "N/A"],
      ];

      autoTable(doc, {
        startY: yPos,
        head: [],
        body: examDetails,
        theme: "plain",
        styles: { fontSize: 9, cellPadding: 1 },
        columnStyles: {
          0: { fontStyle: "bold", cellWidth: 50 },
          1: { cellWidth: 50 },
        },
      });

      yPos = (doc as any).lastAutoTable.finalY + 4;

      // Footer
      yPos = pageHeight - 30;
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.3);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 5;

      yPos = addText(
        "This is a computer-generated report.",
        pageWidth / 2,
        yPos,
        8,
        "normal",
        "center",
      );
      yPos = addText(
        `Report generated on: ${new Date().toLocaleString()}`,
        pageWidth / 2,
        yPos,
        8,
        "normal",
        "center",
      );

      // Print
      doc.autoPrint();
      window.open(doc.output("bloburl"), "_blank");

      // Refresh exams to update printed status
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
            Direct Radiology Exams
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage radiology exams for patients visiting without a doctor
          </p>
          {user && (
            <p className="text-sm text-gray-500 mt-1">
              Logged in as: <span className="font-medium">{user.name}</span> (
              {user.role})
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchExams}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button asChild>
            <Link href="/radiology/direct-exams/create">
              <Plus className="h-4 w-4 mr-2" />
              New Direct Exam
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold">{counts.all}</div>
              <div className="text-sm text-gray-500">All Exams</div>
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
              <div className="text-2xl font-bold text-green-600">
                {counts.readyForPrint}
              </div>
              <div className="text-sm text-gray-500">Ready to Print</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different exam categories */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="grid grid-cols-4">
          <TabsTrigger value="all">All Exams</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="processing">Processing</TabsTrigger>
          <TabsTrigger value="ready-to-print">Ready to Print</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Filters and Search */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by exam ID, patient..."
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
                  <SelectItem value="in-progress">In Progress</SelectItem>
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

      {/* Exams Table */}
      <Card>
        <CardHeader>
          <CardTitle>Direct Radiology Exams ({filteredExams.length})</CardTitle>
          <CardDescription>
            Showing exams based on current filters
          </CardDescription>
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
                  <TableHead>Exam Status</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExams.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      <Scan className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium">No exams found</h3>
                      <p className="text-muted-foreground mt-2">
                        {searchQuery ||
                        statusFilter !== "all" ||
                        paymentStatusFilter !== "all"
                          ? "No exams match your filters"
                          : "No direct radiology exams available"}
                      </p>
                      {exams.length === 0 && (
                        <div className="mt-4">
                          <Button asChild>
                            <Link href="/radiology/direct-exams/create">
                              <Plus className="h-4 w-4 mr-2" />
                              Create First Direct Exam
                            </Link>
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredExams.map((exam) => (
                    <TableRow
                      key={exam._id}
                      className={
                        exam.priority === "emergency"
                          ? "hover:bg-red-100"
                          : exam.priority === "urgent"
                            ? "hover:bg-orange-100"
                            : ""
                      }
                    >
                      <TableCell className="font-mono font-bold">
                        {exam.examId}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{exam.examName}</div>
                          <div className="text-sm text-gray-500">
                            {exam.category.replace(/_/g, " ")}
                          </div>
                          {exam.modality?.type && (
                            <div className="text-xs text-gray-400">
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
                          <div className="text-sm text-gray-500">
                            ID: {exam.patient.patientId}
                          </div>
                          {exam.patient.phone && (
                            <div className="text-xs text-gray-400">
                              {exam.patient.phone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(exam)}</TableCell>
                      <TableCell>
                        {getExamStatusBadge(exam.examStatus)}
                      </TableCell>
                      <TableCell>
                        {getPaymentStatusBadge(
                          exam.charges?.paymentStatus || "pending",
                          exam.paymentVerified,
                        )}
                        {exam.charges && (
                          <div className="text-xs text-gray-500 mt-1">
                            {formatPrice(exam.charges.totalAmount)}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            exam.priority === "emergency"
                              ? "border-red-300 text-red-700 bg-red-50"
                              : exam.priority === "urgent"
                                ? "border-orange-300 text-orange-700 bg-orange-50"
                                : "border-blue-300 text-blue-700"
                          }
                        >
                          {exam.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {format(parseISO(exam.createdAtDirect), "MMM dd")}
                        </div>
                        <div className="text-xs text-gray-500">
                          {format(parseISO(exam.createdAtDirect), "HH:mm")}
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
                            <Link href={`/radiology/direct-exams/${exam._id}`}>
                              <Eye className="h-3 w-3 mr-1" />
                              View
                            </Link>
                          </Button>

                          {exam.readyForPrint && !exam.printedAt && (
                            <Button
                              size="sm"
                              onClick={() => handlePrintPDF(exam)}
                              disabled={printingId === exam._id}
                              className="h-8 px-3 bg-green-600 hover:bg-green-700"
                            >
                              {printingId === exam._id ? (
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
    </div>
  );
}
