// app/reception/prescription-payments/page.tsx

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
  Pill,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";

interface Prescription {
  _id: string;
  prescriptionId: string;
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
  appointment?: {
    _id: string;
    appointmentId: string;
    date: string;
  };
  medications: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  diagnosis?: string;
  notes?: string;
  prescribedDate: string;
  status: string;
  dispensingStatus: string;
  paymentStatus: "unpaid" | "partial" | "paid" | "verified";
  paymentVerified: boolean;
  charges?: {
    basePrice: number;
    tax: number;
    discount: number;
    otherCharges: number;
    totalAmount: number;
    paid: number;
    due: number;
    paymentStatus: "unpaid" | "partial" | "paid" | "cancelled";
    paymentMethod?: string;
    paymentDate?: string;
    collectedBy?: {
      _id: string;
      name: string;
    };
  };
}

export default function PrescriptionPaymentsPage() {
  const router = useRouter();
  const { accessToken, user } = useAuthStore();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPrescription, setSelectedPrescription] =
    useState<Prescription | null>(null);
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
    fetchPrescriptions();
  }, [accessToken]);

  const fetchPrescriptions = async () => {
    try {
      setLoading(true);
      if (!accessToken) {
        console.log("No access token available");
        return;
      }

      const response = await fetch(
        "/api/reception/prescriptions?paymentStatus=unpaid&limit=100",
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
          `Failed to fetch prescriptions: ${response.status} ${response.statusText}`,
        );
        return;
      }

      const data = await response.json();

      if (data.success) {
        setPrescriptions(data.data || []);
      } else {
        toast.error(data.error || "Failed to load prescriptions");
      }
    } catch (error) {
      console.error("Error fetching prescriptions:", error);
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const filteredPrescriptions = prescriptions.filter((prescription) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      prescription.prescriptionId.toLowerCase().includes(query) ||
      prescription.patient.name.toLowerCase().includes(query) ||
      prescription.patient.patientId.toLowerCase().includes(query) ||
      (prescription.doctor?.name &&
        prescription.doctor.name.toLowerCase().includes(query))
    );
  });

  const handlePaymentClick = (prescription: Prescription) => {
    setSelectedPrescription(prescription);
    setPaymentAmount(prescription.charges?.due?.toString() || "");
    setPaymentMethod("");
    setDiscount("");
    setNotes("");
    setError(null);
    setSuccess(null);
    setPaymentDialogOpen(true);
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPrescription) return;

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
        `/api/reception/prescriptions/${selectedPrescription._id}/payment`,
        {
          method: "PUT",
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
        await fetchPrescriptions();

        // Close dialog after a short delay
        setTimeout(() => {
          setPaymentDialogOpen(false);
          setSelectedPrescription(null);
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
      case "verified":
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
      case "unpaid":
        return (
          <Badge variant="outline">
            <AlertCircle className="h-3 w-3 mr-1" />
            Unpaid
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-blue-100 text-blue-800">Active</Badge>;
      case "completed":
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case "cancelled":
        return <Badge className="bg-red-100 text-red-800">Cancelled</Badge>;
      case "expired":
        return <Badge className="bg-gray-100 text-gray-800">Expired</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
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
            Prescription Payments
          </h1>
          <p className="text-muted-foreground mt-1">
            Process payments for prescriptions
          </p>
        </div>
        <Button
          variant="outline"
          onClick={fetchPrescriptions}
          disabled={loading}
        >
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
            <div className="text-2xl font-bold">
              {filteredPrescriptions.length}
            </div>
            <p className="text-xs text-gray-500">
              Prescriptions awaiting payment
            </p>
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
                filteredPrescriptions.reduce(
                  (sum, prescription) => sum + (prescription.charges?.due || 0),
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
              Average Prescription Price
            </CardTitle>
            <div className="p-2 bg-green-50 rounded-lg">
              <Pill className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredPrescriptions.length > 0
                ? formatCurrency(
                    filteredPrescriptions.reduce(
                      (sum, prescription) =>
                        sum + (prescription.charges?.totalAmount || 0),
                      0,
                    ) / filteredPrescriptions.length,
                  )
                : formatCurrency(0)}
            </div>
            <p className="text-xs text-gray-500">Average per prescription</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by prescription ID, patient name, or patient ID..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Prescriptions Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Pending Prescription Payments ({filteredPrescriptions.length})
          </CardTitle>
          <CardDescription>
            Prescriptions awaiting payment processing
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredPrescriptions.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">No pending payments</h3>
              <p className="text-muted-foreground mt-2">
                {searchQuery
                  ? "No prescriptions match your search"
                  : "All prescriptions have been paid"}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Prescription ID</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Doctor</TableHead>
                    <TableHead>Medications</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPrescriptions.map((prescription) => (
                    <TableRow key={prescription._id}>
                      <TableCell className="font-mono font-bold">
                        {prescription.prescriptionId}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {prescription.patient.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            ID: {prescription.patient.patientId}
                          </div>
                          {prescription.patient.phone && (
                            <div className="text-xs text-gray-400">
                              {prescription.patient.phone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {prescription.doctor?.name || "N/A"}
                          </div>
                          {prescription.doctor?.specialization && (
                            <div className="text-sm text-gray-500">
                              {prescription.doctor.specialization}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {prescription.medications.length} medication(s)
                        </div>
                        <div className="text-xs text-gray-500 truncate max-w-xs">
                          {prescription.medications
                            .map((m) => m.name)
                            .join(", ")}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {formatCurrency(
                            prescription.charges?.totalAmount || 0,
                          )}
                        </div>
                        <div className="text-sm text-gray-500">
                          Due: {formatCurrency(prescription.charges?.due || 0)}
                        </div>
                        {prescription.charges?.paid &&
                          prescription.charges.paid > 0 && (
                            <div className="text-xs text-green-600">
                              Paid: {formatCurrency(prescription.charges.paid)}
                            </div>
                          )}
                      </TableCell>
                      <TableCell>
                        {getPaymentStatusBadge(
                          prescription.charges?.paymentStatus || "unpaid",
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {format(
                            parseISO(prescription.prescribedDate),
                            "MMM dd",
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          {format(
                            parseISO(prescription.prescribedDate),
                            "HH:mm",
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          onClick={() => handlePaymentClick(prescription)}
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
              Process payment for prescription{" "}
              {selectedPrescription?.prescriptionId}
            </DialogDescription>
          </DialogHeader>

          {selectedPrescription && (
            <div className="space-y-4">
              {/* Prescription Summary */}
              <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Patient:</span>
                  <span className="font-medium">
                    {selectedPrescription.patient.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Doctor:</span>
                  <span className="font-medium">
                    {selectedPrescription.doctor?.name || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Medications:</span>
                  <span className="font-medium">
                    {selectedPrescription.medications.length} item(s)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Total Amount:</span>
                  <span className="font-medium">
                    {formatCurrency(
                      selectedPrescription.charges?.totalAmount || 0,
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Already Paid:</span>
                  <span className="font-medium text-green-600">
                    {formatCurrency(selectedPrescription.charges?.paid || 0)}
                  </span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-sm font-semibold">Amount Due:</span>
                  <span className="font-bold text-lg">
                    {formatCurrency(selectedPrescription.charges?.due || 0)}
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
                    max={selectedPrescription.charges?.due || 0}
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    required
                  />
                  <p className="text-xs text-gray-500">
                    Maximum:{" "}
                    {formatCurrency(selectedPrescription.charges?.due || 0)}
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
