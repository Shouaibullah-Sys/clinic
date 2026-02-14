"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Search,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  CreditCard,
  ArrowLeft,
  FlaskConical,
  Pill,
  Scan,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

type PaymentStatus = "pending" | "partial" | "paid" | "cancelled";
type PaymentKind = "lab" | "pharmacy" | "radiology";
type MarkedModule = "lab" | "pharmacy" | "radiology";

interface UnifiedPaymentRecord {
  id: string;
  kind: PaymentKind;
  recordId: string;
  serviceName: string;
  patientName: string;
  patientCode: string;
  patientPhone?: string;
  priority?: string;
  status?: string;
  createdAt: string;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  paymentStatus: PaymentStatus;
}

interface DirectLabTest {
  _id: string;
  testId: string;
  testName: string;
  patient: { name: string; patientId: string; phone?: string };
  priority: string;
  status: string;
  createdAtDirect: string;
  charges?: {
    totalAmount: number;
    paid: number;
    due: number;
    paymentStatus: PaymentStatus;
  };
}

interface PharmacySale {
  _id: string;
  saleId: string;
  invoiceNumber: string;
  customerName: string;
  customerPhone: string;
  totalAmount: number;
  amountPaid: number;
  balance: number;
  paymentStatus: "pending" | "partial" | "paid";
  status: string;
  saleDate?: string;
  createdAt: string;
}

interface DirectRadiologyExam {
  _id: string;
  examId: string;
  examName: string;
  patient: { name: string; patientId: string; phone?: string };
  priority: string;
  status: string;
  createdAtDirect: string;
  charges?: {
    totalAmount: number;
    paid: number;
    due: number;
    paymentStatus: PaymentStatus;
  };
}

const PAYMENT_METHODS = ["cash", "card", "insurance"];

export default function ReceptionPaymentsPage() {
  const router = useRouter();
  const { accessToken, user } = useAuthStore();

  const [records, setRecords] = useState<UnifiedPaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState<"all" | PaymentKind>("all");
  const [selected, setSelected] = useState<UnifiedPaymentRecord | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [markedSet, setMarkedSet] = useState<Set<string>>(new Set());

  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [discount, setDiscount] = useState("");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (user && !["admin", "receptionist"].includes(user.role)) {
      router.push("/unauthorized");
    }
  }, [user, router]);

  const fetchMarked = useCallback(async () => {
    try {
      if (!accessToken) return;
      const response = await fetch("/api/reception/marked-transactions", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });
      const data = await response.json();
      if (data.success && Array.isArray(data.data)) {
        const nextSet = new Set<string>();
        data.data.forEach((item: any) => {
          if (item.module && item.transactionId) {
            nextSet.add(`${item.module}:${item.transactionId}`);
          }
        });
        setMarkedSet(nextSet);
      }
    } catch (error) {
      console.error("Failed loading marked transactions", error);
    }
  }, [accessToken]);

  const fetchAllPayments = useCallback(async () => {
    try {
      if (!accessToken) return;
      const headers = {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      };

      const [labRes, pharmacyRes, radiologyRes] = await Promise.all([
        fetch("/api/laboratory/direct-tests?paymentStatus=all&limit=200", {
          headers,
        }),
        fetch("/api/pharmacy/prescriptions/pending?paymentStatus=unpaid&limit=200", { headers }),
        fetch("/api/radiology/direct-exams?paymentStatus=all&limit=200", {
          headers,
        }),
      ]);

      const [labData, pharmacyData, radiologyData] = await Promise.all([
        labRes.json(),
        pharmacyRes.json(),
        radiologyRes.json(),
      ]);

      const unified: UnifiedPaymentRecord[] = [];

      if (labData.success && Array.isArray(labData.data)) {
        (labData.data as DirectLabTest[]).forEach((item) => {
          unified.push({
            id: item._id,
            kind: "lab",
            recordId: item.testId,
            serviceName: item.testName,
            patientName: item.patient?.name || "Unknown",
            patientCode: item.patient?.patientId || "N/A",
            patientPhone: item.patient?.phone,
            priority: item.priority,
            status: item.status,
            createdAt: item.createdAtDirect,
            totalAmount: item.charges?.totalAmount || 0,
            paidAmount: item.charges?.paid || 0,
            dueAmount: item.charges?.due || 0,
            paymentStatus: item.charges?.paymentStatus || "pending",
          });
        });
      }

      if (pharmacyData.success && Array.isArray(pharmacyData.data)) {
        (pharmacyData.data as PharmacySale[]).forEach((item) => {
          unified.push({
            id: item._id,
            kind: "pharmacy",
            recordId: item.saleId || item.invoiceNumber,
            serviceName: "Medicine Sale",
            patientName: item.customerName || "Walk-in Customer",
            patientCode: item.invoiceNumber || "N/A",
            patientPhone: item.customerPhone || "",
            status: item.status,
            createdAt: item.saleDate || item.createdAt,
            totalAmount: item.totalAmount || 0,
            paidAmount: item.amountPaid || 0,
            dueAmount: item.balance || 0,
            paymentStatus: item.paymentStatus || "pending",
          });
        });
      }

      if (radiologyData.success && Array.isArray(radiologyData.data)) {
        (radiologyData.data as DirectRadiologyExam[]).forEach((item) => {
          unified.push({
            id: item._id,
            kind: "radiology",
            recordId: item.examId,
            serviceName: item.examName,
            patientName: item.patient?.name || "Unknown",
            patientCode: item.patient?.patientId || "N/A",
            patientPhone: item.patient?.phone,
            priority: item.priority,
            status: item.status,
            createdAt: item.createdAtDirect,
            totalAmount: item.charges?.totalAmount || 0,
            paidAmount: item.charges?.paid || 0,
            dueAmount: item.charges?.due || 0,
            paymentStatus: item.charges?.paymentStatus || "pending",
          });
        });
      }

      const unpaid = unified.filter(
        (record) =>
          record.dueAmount > 0 &&
          record.paymentStatus !== "paid" &&
          record.paymentStatus !== "cancelled",
      );

      setRecords(unpaid.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)));
    } catch (error) {
      console.error("Failed loading unified payments", error);
      toast.error("Failed to load payments");
    }
  }, [accessToken]);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      await fetchAllPayments();
      await fetchMarked();
      setLoading(false);
    };
    run();
  }, [fetchAllPayments, fetchMarked]);

  const isMarked = useCallback(
    (module: MarkedModule, id: string) => markedSet.has(`${module}:${id}`),
    [markedSet],
  );

  const toggleMarked = useCallback(
    async (record: UnifiedPaymentRecord) => {
      if (!accessToken) return;
      const module: MarkedModule = record.kind;
      const key = `${module}:${record.id}`;
      const currentlyMarked = markedSet.has(key);

      try {
        if (currentlyMarked) {
          await fetch("/api/reception/marked-transactions", {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              module,
              transactionId: record.id,
            }),
          });
          setMarkedSet((prev) => {
            const next = new Set(prev);
            next.delete(key);
            return next;
          });
        } else {
          await fetch("/api/reception/marked-transactions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              module,
              transactionId: record.id,
              transactionDate: record.createdAt,
            }),
          });
          setMarkedSet((prev) => new Set(prev).add(key));
        }
      } catch (error) {
        console.error("Failed to toggle mark", error);
        toast.error("Failed to update mark");
      }
    },
    [accessToken, markedSet],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records.filter((r) => {
      const byKind = kindFilter === "all" ? true : r.kind === kindFilter;
      if (!byKind) return false;
      if (!q) return true;
      return (
        r.recordId.toLowerCase().includes(q) ||
        r.serviceName.toLowerCase().includes(q) ||
        r.patientName.toLowerCase().includes(q) ||
        r.patientCode.toLowerCase().includes(q) ||
        (r.patientPhone || "").toLowerCase().includes(q)
      );
    });
  }, [records, search, kindFilter]);

  const totals = useMemo(() => {
    return filtered.reduce(
      (acc, rec) => {
        acc.count += 1;
        acc.due += rec.dueAmount;
        if (rec.kind === "lab") acc.lab += 1;
        if (rec.kind === "pharmacy") acc.pharmacy += 1;
        if (rec.kind === "radiology") acc.radiology += 1;
        return acc;
      },
      { count: 0, due: 0, lab: 0, pharmacy: 0, radiology: 0 },
    );
  }, [filtered]);

  const openPaymentDialog = (rec: UnifiedPaymentRecord) => {
    setSelected(rec);
    setPaymentAmount(String(rec.dueAmount || ""));
    setPaymentMethod("");
    setDiscount("");
    setNotes("");
    setFormError(null);
    setDialogOpen(true);
  };

  const processPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setSubmitting(true);
    setFormError(null);
    try {
      const amount = parseFloat(paymentAmount);
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error("Enter a valid payment amount");
      }
      if (amount > selected.dueAmount) {
        throw new Error("Payment amount cannot exceed due amount");
      }
      if (!paymentMethod) {
        throw new Error("Select a payment method");
      }

      let discountValue = 0;
      if (discount !== "") {
        discountValue = parseFloat(discount);
        if (!Number.isFinite(discountValue) || discountValue < 0) {
          throw new Error("Discount must be a non-negative number");
        }
      }

      const payload: Record<string, unknown> = {
        amount,
        paymentMethod,
      };
      if (discountValue > 0) payload.discount = discountValue;
      if (notes) payload.notes = notes;

      let endpoint = "";
      if (selected.kind === "lab") endpoint = `/api/laboratory/direct-tests/${selected.id}/payment`;
      if (selected.kind === "pharmacy") endpoint = `/api/pharmacy/prescriptions/${selected.id}/payment`;
      if (selected.kind === "radiology") endpoint = `/api/radiology/direct-exams/${selected.id}/payment`;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to process payment");
      }

      toast.success("Payment processed successfully");
      await fetchAllPayments();
      setDialogOpen(false);
      setSelected(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to process payment";
      setFormError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const refresh = async () => {
    setRefreshing(true);
    await fetchAllPayments();
    setRefreshing(false);
    toast.success("Payments refreshed");
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);

  const kindBadge = (kind: PaymentKind) => {
    if (kind === "lab") return <Badge variant="outline"><FlaskConical className="h-3 w-3 mr-1" />Lab</Badge>;
    if (kind === "pharmacy") return <Badge variant="outline"><Pill className="h-3 w-3 mr-1" />Pharmacy</Badge>;
    return <Badge variant="outline"><Scan className="h-3 w-3 mr-1" />Radiology</Badge>;
  };

  const statusBadge = (status: PaymentStatus) => {
    if (status === "paid")
      return (
        <Badge className="bg-green-100 text-green-800">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Paid
        </Badge>
      );
    if (status === "partial")
      return (
        <Badge className="bg-yellow-100 text-yellow-800">
          <Clock className="h-3 w-3 mr-1" />
          Partial
        </Badge>
      );
    return (
      <Badge variant="outline">
        <AlertCircle className="h-3 w-3 mr-1" />
        Pending
      </Badge>
    );
  };

  if (!user || !["admin", "receptionist"].includes(user.role)) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Unauthorized Access</h2>
          <p className="text-gray-600">You don&apos;t have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <Button variant="ghost" onClick={() => router.back()} className="mb-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Unified Payments</h1>
          <p className="text-muted-foreground">
            Process direct lab, pharmacy, and radiology payments in one place.
          </p>
        </div>
        <Button variant="outline" onClick={refresh} disabled={refreshing || loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Pending Records</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{totals.count}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Total Due</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{formatCurrency(totals.due)}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Lab / Pharmacy / Radiology</CardTitle></CardHeader><CardContent><div className="text-sm font-medium">{totals.lab} / {totals.pharmacy} / {totals.radiology}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Current Filter</CardTitle></CardHeader><CardContent><div className="text-sm font-medium capitalize">{kindFilter}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Search and Filter</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by record ID, patient/customer, code, phone..."
              className="pl-9"
            />
          </div>
          <Select value={kindFilter} onValueChange={(v: "all" | PaymentKind) => setKindFilter(v)}>
            <SelectTrigger>
              <SelectValue placeholder="Filter service" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Services</SelectItem>
              <SelectItem value="lab">Lab</SelectItem>
              <SelectItem value="pharmacy">Pharmacy</SelectItem>
              <SelectItem value="radiology">Radiology</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pending Payment Records</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Record</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Patient / Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Marked</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">Loading records...</TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">No pending records found</TableCell>
                  </TableRow>
                ) : (
                  filtered.map((rec) => (
                    <TableRow key={`${rec.kind}-${rec.id}`}>
                      <TableCell>{kindBadge(rec.kind)}</TableCell>
                      <TableCell>
                        <div className="font-medium">{rec.recordId}</div>
                        <div className="text-xs text-muted-foreground capitalize">{rec.kind}</div>
                      </TableCell>
                      <TableCell>{rec.serviceName}</TableCell>
                      <TableCell>
                        <div className="font-medium">{rec.patientName}</div>
                        <div className="text-xs text-muted-foreground">
                          {rec.patientCode} {rec.patientPhone ? `• ${rec.patientPhone}` : ""}
                        </div>
                      </TableCell>
                      <TableCell>{statusBadge(rec.paymentStatus)}</TableCell>
                      <TableCell className="font-semibold">{formatCurrency(rec.dueAmount)}</TableCell>
                      <TableCell>{rec.createdAt ? format(new Date(rec.createdAt), "MMM dd, yyyy HH:mm") : "-"}</TableCell>
                      <TableCell>
                        <Button
                          variant={isMarked(rec.kind, rec.id) ? "default" : "outline"}
                          size="sm"
                          onClick={() => toggleMarked(rec)}
                        >
                          {isMarked(rec.kind, rec.id) ? "Marked" : "Mark"}
                        </Button>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" onClick={() => openPaymentDialog(rec)}>
                          <CreditCard className="h-4 w-4 mr-1" />
                          Pay
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Process Payment</DialogTitle>
            <DialogDescription>
              {selected
                ? `Record ${selected.recordId} • ${selected.patientName} • Due ${formatCurrency(selected.dueAmount)}`
                : "Enter payment details"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={processPayment} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="paymentAmount">Amount</Label>
              <Input
                id="paymentAmount"
                type="number"
                min="0.01"
                step="0.01"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="discount">Discount (optional)</Label>
              <Input
                id="discount"
                type="number"
                min="0"
                step="0.01"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Input id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>

            {formError && (
              <Alert variant="destructive">
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting || !paymentMethod}>
                {submitting ? "Processing..." : "Confirm Payment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
