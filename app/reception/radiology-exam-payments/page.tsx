// app/reception/radiology-exam-payments/page.tsx

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  RefreshCw,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Clock,
  User,
  ArrowLeft,
  CreditCard,
  Banknote,
  FileText,
  Scan,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";

interface DirectRadiologyExam {
  _id: string;
  examId: string;
  examName: string;
  category: string;
  description?: string;
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
  priority: string;
  createdAtDirect: string;
  charges?: {
    basePrice: number;
    tax: number;
    discount: number;
    otherCharges: number;
    totalAmount: number;
    paid: number;
    due: number;
    paymentStatus: "pending" | "partial" | "paid" | "cancelled";
  };
}

export default function RadiologyExamPaymentsPage() {
  const router = useRouter();
  const { accessToken, user } = useAuthStore();
  const [exams, setExams] = useState<DirectRadiologyExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedExam, setSelectedExam] = useState<DirectRadiologyExam | null>(
    null,
  );
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Payment form state
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [discount, setDiscount] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (user && !["admin", "receptionist"].includes(user.role)) {
      router.push("/unauthorized");
    }
  }, [user, router]);

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

      const response = await fetch(
        "/api/radiology/direct-exams?paymentStatus=pending&limit=100",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("API Error:", errorText);
        toast.error(
          `Failed to fetch exams: ${response.status} ${response.statusText}`,
        );
        return;
      }

      const data = await response.json();

      if (data.success) {
        setExams(data.data || []);
      } else {
        toast.error(data.error || "Failed to load radiology exams");
      }
    } catch (error) {
      console.error("Error fetching exams:", error);
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const filteredExams = exams.filter((exam) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      exam.examId.toLowerCase().includes(query) ||
      exam.examName.toLowerCase().includes(query) ||
      exam.patient.name.toLowerCase().includes(query) ||
      exam.patient.patientId.toLowerCase().includes(query)
    );
  });

  const handlePaymentClick = (exam: DirectRadiologyExam) => {
    setSelectedExam(exam);
    setPaymentAmount(exam.charges?.due?.toString() || "");
    setPaymentMethod("");
    setDiscount("");
    setNotes("");
    setError(null);
    setSuccess(null);
    setPaymentDialogOpen(true);
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExam) return;

    setProcessingPayment(true);
    setError(null);
    setSuccess(null);

    try {
      const payload: any = {
        amount: parseFloat(paymentAmount),
        paymentMethod,
      };

      if (discount && parseFloat(discount) > 0) {
        payload.discount = parseFloat(discount);
      }

      if (notes) {
        payload.notes = notes;
      }

      const response = await fetch(
        `/api/radiology/direct-exams/${selectedExam._id}/payment`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      const result = await response.json();

      if (result.success) {
        setSuccess("Payment processed successfully!");
        toast.success("Payment processed successfully!");

        // Refresh the list
        await fetchExams();

        // Close dialog after a short delay
        setTimeout(() => {
          setPaymentDialogOpen(false);
          setSelectedExam(null);
        }, 1500);
      } else {
        setError(result.error || "Failed to process payment");
        toast.error(result.error || "Failed to process payment");
      }
    } catch (error) {
      console.error("Error processing payment:", error);
      setError("Failed to process payment. Please try again.");
      toast.error("Failed to process payment. Please try again.");
    } finally {
      setProcessingPayment(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Paid
          </Badge>
        );
      case "partial":
        return (
          <Badge className="bg-yellow-100 text-yellow-800">
            <Clock className="h-3 w-3 mr-1" />
            Partial
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="outline">
            <AlertCircle className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "emergency":
        return (
          <Badge className="bg-red-100 text-red-800 border-red-300">
            Emergency
          </Badge>
        );
      case "urgent":
        return (
          <Badge className="bg-orange-100 text-orange-800 border-orange-300">
            Urgent
          </Badge>
        );
      default:
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-300">
            Routine
          </Badge>
        );
    }
  };

  if (!user || !["admin", "receptionist"].includes(user.role)) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Unauthorized Access</h2>
          <p className="text-gray-600">
            You don't have permission to access this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Radiology Exam Payments
          </h1>
          <p className="text-muted-foreground mt-1">
            Process payments for direct radiology exams
          </p>
        </div>
        <Button variant="outline" onClick={fetchExams} disabled={loading}>
          <RefreshCw
            className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Payments
            </CardTitle>
            <div className="p-2 bg-yellow-50 rounded-lg">
              <Clock className="h-4 w-4 text-yellow-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredExams.length}</div>
            <p className="text-xs text-gray-500">Exams awaiting payment</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Due Amount
            </CardTitle>
            <div className="p-2 bg-blue-50 rounded-lg">
              <DollarSign className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(
                filteredExams.reduce(
                  (sum, exam) => sum + (exam.charges?.due || 0),
                  0,
                ),
              )}
            </div>
            <p className="text-xs text-gray-500">Total amount to collect</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Average Exam Price
            </CardTitle>
            <div className="p-2 bg-green-50 rounded-lg">
              <FileText className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredExams.length > 0
                ? formatCurrency(
                    filteredExams.reduce(
                      (sum, exam) => sum + (exam.charges?.totalAmount || 0),
                      0,
                    ) / filteredExams.length,
                  )
                : formatCurrency(0)}
            </div>
            <p className="text-xs text-gray-500">Average per exam</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by exam ID, patient name, or patient ID..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Exams Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Pending Radiology Exam Payments ({filteredExams.length})
          </CardTitle>
          <CardDescription>
            Direct radiology exams awaiting payment processing
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredExams.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">No pending payments</h3>
              <p className="text-muted-foreground mt-2">
                {searchQuery
                  ? "No exams match your search"
                  : "All radiology exams have been paid"}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Exam ID</TableHead>
                    <TableHead>Exam Details</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExams.map((exam) => (
                    <TableRow
                      key={exam._id}
                      className={
                        exam.priority === "emergency"
                          ? "hover:bg-red-50"
                          : exam.priority === "urgent"
                            ? "hover:bg-orange-50"
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
                          {exam.description && (
                            <div className="text-xs text-gray-400 truncate max-w-xs">
                              {exam.description}
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
                      <TableCell>
                        <div className="font-medium">
                          {formatCurrency(exam.charges?.totalAmount || 0)}
                        </div>
                        <div className="text-sm text-gray-500">
                          Due: {formatCurrency(exam.charges?.due || 0)}
                        </div>
                        {exam.charges?.paid && exam.charges.paid > 0 && (
                          <div className="text-xs text-green-600">
                            Paid: {formatCurrency(exam.charges.paid)}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {getPaymentStatusBadge(
                          exam.charges?.paymentStatus || "pending",
                        )}
                      </TableCell>
                      <TableCell>{getPriorityBadge(exam.priority)}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {format(parseISO(exam.createdAtDirect), "MMM dd")}
                        </div>
                        <div className="text-xs text-gray-500">
                          {format(parseISO(exam.createdAtDirect), "HH:mm")}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          onClick={() => handlePaymentClick(exam)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <DollarSign className="h-4 w-4 mr-1" />
                          Process Payment
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="sm:max-w-125">
          <DialogHeader>
            <DialogTitle>Process Payment</DialogTitle>
            <DialogDescription>
              Process payment for radiology exam {selectedExam?.examId}
            </DialogDescription>
          </DialogHeader>

          {selectedExam && (
            <div className="space-y-4">
              {/* Exam Summary */}
              <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Exam:</span>
                  <span className="font-medium">{selectedExam.examName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Patient:</span>
                  <span className="font-medium">
                    {selectedExam.patient.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Total Amount:</span>
                  <span className="font-medium">
                    {formatCurrency(selectedExam.charges?.totalAmount || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Already Paid:</span>
                  <span className="font-medium text-green-600">
                    {formatCurrency(selectedExam.charges?.paid || 0)}
                  </span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-sm font-semibold">Amount Due:</span>
                  <span className="font-bold text-lg">
                    {formatCurrency(selectedExam.charges?.due || 0)}
                  </span>
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert className="bg-green-50 text-green-800 border-green-200">
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>{success}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handlePaymentSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="paymentAmount">Payment Amount *</Label>
                  <Input
                    id="paymentAmount"
                    type="number"
                    step="0.01"
                    min="0"
                    max={selectedExam.charges?.due || 0}
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    required
                  />
                  <p className="text-xs text-gray-500">
                    Maximum: {formatCurrency(selectedExam.charges?.due || 0)}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="paymentMethod">Payment Method *</Label>
                  <Select
                    value={paymentMethod}
                    onValueChange={setPaymentMethod}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">
                        <div className="flex items-center gap-2">
                          <Banknote className="h-4 w-4" />
                          Cash
                        </div>
                      </SelectItem>
                      <SelectItem value="card">
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4" />
                          Card
                        </div>
                      </SelectItem>
                      <SelectItem value="online">Online Payment</SelectItem>
                      <SelectItem value="check">Check</SelectItem>
                      <SelectItem value="bank_transfer">
                        Bank Transfer
                      </SelectItem>
                      <SelectItem value="insurance">Insurance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="discount">Discount (Optional)</Label>
                  <Input
                    id="discount"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                  />
                  <p className="text-xs text-gray-500">
                    Additional discount amount (if applicable)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Input
                    id="notes"
                    placeholder="Payment notes..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setPaymentDialogOpen(false)}
                    disabled={processingPayment}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={processingPayment || !paymentMethod}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {processingPayment ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        <DollarSign className="h-4 w-4 mr-2" />
                        Process Payment
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
