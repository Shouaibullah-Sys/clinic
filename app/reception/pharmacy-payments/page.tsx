// app/reception/pharmacy-payments/page.tsx

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
  Pill,
  Package,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";

interface PharmacySale {
  _id: string;
  saleId: string;
  invoiceNumber: string;
  customerName: string;
  customerPhone: string;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  subtotal: number;
  totalAmount: number;
  amountPaid: number;
  balance: number;
  paymentMethod: "cash" | "card" | "insurance";
  paymentStatus: "pending" | "partial" | "paid";
  status: "pending" | "completed" | "cancelled";
  saleDate: string;
  soldBy?: {
    _id: string;
    name: string;
  };
  finalizedBy?: {
    _id: string;
    name: string;
  };
  finalizedAt?: string;
  notes?: string;
  createdAt: string;
}

export default function PharmacyPaymentsPage() {
  const router = useRouter();
  const { accessToken, user } = useAuthStore();
  const [sales, setSales] = useState<PharmacySale[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSale, setSelectedSale] = useState<PharmacySale | null>(null);
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
    if (user && !["admin", "receptionist", "pharmacist"].includes(user.role)) {
      router.push("/unauthorized");
    }
  }, [user, router]);

  useEffect(() => {
    fetchSales();
  }, [accessToken]);

  const fetchSales = async () => {
    try {
      setLoading(true);
      if (!accessToken) {
        console.log("No access token available");
        return;
      }

      const response = await fetch(
        "/api/pharmacy/prescriptions/pending?limit=100",
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
          `Failed to fetch sales: ${response.status} ${response.statusText}`,
        );
        return;
      }

      const data = await response.json();

      if (data.success) {
        setSales(data.data || []);
      } else {
        toast.error(data.error || "Failed to load pharmacy sales");
      }
    } catch (error) {
      console.error("Error fetching sales:", error);
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const filteredSales = sales.filter((sale) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      sale.saleId.toLowerCase().includes(query) ||
      sale.invoiceNumber.toLowerCase().includes(query) ||
      sale.customerName.toLowerCase().includes(query) ||
      sale.customerPhone.toLowerCase().includes(query)
    );
  });

  const handlePaymentClick = (sale: PharmacySale) => {
    setSelectedSale(sale);
    setPaymentAmount(sale.balance?.toString() || "");
    setPaymentMethod("");
    setDiscount("");
    setNotes("");
    setError(null);
    setSuccess(null);
    setPaymentDialogOpen(true);
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSale) return;

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
        `/api/pharmacy/prescriptions/${selectedSale._id}/payment`,
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
        await fetchSales();

        // Close dialog after a short delay
        setTimeout(() => {
          setPaymentDialogOpen(false);
          setSelectedSale(null);
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case "cancelled":
        return <Badge className="bg-red-100 text-red-800">Cancelled</Badge>;
      default:
        return <Badge className="bg-blue-100 text-blue-800">Pending</Badge>;
    }
  };

  if (!user || !["admin", "receptionist", "pharmacist"].includes(user.role)) {
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
            Pharmacy Payments
          </h1>
          <p className="text-muted-foreground mt-1">
            Process payments for pharmacy sales
          </p>
        </div>
        <Button variant="outline" onClick={fetchSales} disabled={loading}>
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
            <div className="text-2xl font-bold">{filteredSales.length}</div>
            <p className="text-xs text-gray-500">Sales awaiting payment</p>
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
                filteredSales.reduce(
                  (sum, sale) => sum + (sale.balance || 0),
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
              Average Sale Value
            </CardTitle>
            <div className="p-2 bg-green-50 rounded-lg">
              <Pill className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredSales.length > 0
                ? formatCurrency(
                    filteredSales.reduce(
                      (sum, sale) => sum + (sale.totalAmount || 0),
                      0,
                    ) / filteredSales.length,
                  )
                : formatCurrency(0)}
            </div>
            <p className="text-xs text-gray-500">Average per sale</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by sale ID, invoice, customer name, or phone..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Sales Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Pending Pharmacy Payments ({filteredSales.length})
          </CardTitle>
          <CardDescription>
            Pharmacy sales awaiting payment processing
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredSales.length === 0 ? (
            <div className="text-center py-12">
              <Pill className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">No pending payments</h3>
              <p className="text-muted-foreground mt-2">
                {searchQuery
                  ? "No sales match your search"
                  : "All pharmacy sales have been paid"}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sale ID</TableHead>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Payment Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSales.map((sale) => (
                    <TableRow key={sale._id}>
                      <TableCell className="font-mono font-bold">
                        {sale.saleId}
                      </TableCell>
                      <TableCell className="font-mono">
                        {sale.invoiceNumber}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {sale.customerName}
                          </div>
                          <div className="text-sm text-gray-500">
                            {sale.customerPhone}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Package className="h-3 w-3 text-gray-500" />
                          <span className="font-medium">
                            {sale.items?.length || 0}
                          </span>
                          <span className="text-sm text-gray-500">
                            item{sale.items?.length !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {formatCurrency(sale.totalAmount || 0)}
                        </div>
                        {sale.amountPaid > 0 && (
                          <div className="text-xs text-green-600">
                            Paid: {formatCurrency(sale.amountPaid)}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="font-bold text-red-600">
                          {formatCurrency(sale.balance || 0)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getPaymentStatusBadge(sale.paymentStatus)}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {format(parseISO(sale.createdAt), "MMM dd")}
                        </div>
                        <div className="text-xs text-gray-500">
                          {format(parseISO(sale.createdAt), "HH:mm")}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {sale.paymentStatus !== "paid" && (
                            <Button
                              size="sm"
                              onClick={() => handlePaymentClick(sale)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <DollarSign className="h-4 w-4 mr-1" />
                              Pay
                            </Button>
                          )}
                        </div>
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
              Process payment for pharmacy sale {selectedSale?.saleId}
            </DialogDescription>
          </DialogHeader>

          {selectedSale && (
            <div className="space-y-4">
              {/* Sale Summary */}
              <div className="p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Sale ID:</span>
                  <span className="font-medium">{selectedSale.saleId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Customer:</span>
                  <span className="font-medium">
                    {selectedSale.customerName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Items:</span>
                  <span className="font-medium">
                    {selectedSale.items?.length || 0} item
                    {selectedSale.items?.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Total Amount:</span>
                  <span className="font-medium">
                    {formatCurrency(selectedSale.totalAmount || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Already Paid:</span>
                  <span className="font-medium text-green-600">
                    {formatCurrency(selectedSale.amountPaid || 0)}
                  </span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-sm font-semibold">Amount Due:</span>
                  <span className="font-bold text-lg">
                    {formatCurrency(selectedSale.balance || 0)}
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
                    max={selectedSale.balance || 0}
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    required
                  />
                  <p className="text-xs text-gray-500">
                    Maximum: {formatCurrency(selectedSale.balance || 0)}
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
                      <SelectItem value="insurance">
                        <div className="flex items-center gap-2">
                          <Pill className="h-4 w-4" />
                          Insurance
                        </div>
                      </SelectItem>
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
