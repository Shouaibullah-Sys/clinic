// app/reception/cash/page.tsx
"use client";

import { useState, useEffect } from "react";
import {
  DollarSign,
  CreditCard,
  Banknote,
  ArrowUpRight,
  ArrowDownLeft,
  Plus,
  Calculator,
  RefreshCw,
  Pencil,
  Trash2,
  FileText,
  FlaskConical,
  ScanLine,
  TrendingDown,
  Calendar,
  Receipt,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuthStore } from "@/store/useAuthStore";

interface Denominations {
  thousand: number;
  fiveHundred: number;
  twoHundred: number;
  oneHundred: number;
  fifty: number;
  twenty: number;
  ten: number;
  five: number;
  two: number;
  one: number;
  half: number;
  quarter: number;
  tenCents: number;
  fiveCents: number;
}

interface CashTransaction {
  id: string;
  transactionId: string;
  transactionType: string;
  amount: number;
  calculatedTotal: number;
  declaredAmount: number;
  variance: number;
  shift: string;
  cashierName: string;
  source?: string;
  destination?: string;
  verificationStatus: string;
  createdAt: string;
}

const DENOMINATION_VALUES = {
  thousand: 1000,
  fiveHundred: 500,
  twoHundred: 200,
  oneHundred: 100,
  fifty: 50,
  twenty: 20,
  ten: 10,
  five: 5,
  two: 2,
  one: 1,
  half: 0.5,
  quarter: 0.25,
  tenCents: 0.1,
  fiveCents: 0.05,
};

export default function CashPage() {
  const { user } = useAuthStore();
  const [amount, setAmount] = useState("");
  const [transactionType, setTransactionType] = useState("payment");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [isCollectionOpen, setIsCollectionOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] =
    useState<CashTransaction | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [transactions, setTransactions] = useState<CashTransaction[]>([]);
  const [summary, setSummary] = useState({
    cashOnHand: 0,
    todayCollection: 0,
    pendingReconciliations: 0,
  });

  const [dailyStats, setDailyStats] = useState({
    totalExpensesToday: 0,
    totalAppointmentsToday: 0,
    totalApprovedDiscountsToday: 0,
    totalLabPaymentsToday: 0,
    totalRadiologyPaymentsToday: 0,
  });

  const [denominations, setDenominations] = useState<Denominations>({
    thousand: 0,
    fiveHundred: 0,
    twoHundred: 0,
    oneHundred: 0,
    fifty: 0,
    twenty: 0,
    ten: 0,
    five: 0,
    two: 0,
    one: 0,
    half: 0,
    quarter: 0,
    tenCents: 0,
    fiveCents: 0,
  });

  const [declaredAmount, setDeclaredAmount] = useState("");
  const [shift, setShift] = useState("morning");

  // Edit state
  const [editDeclaredAmount, setEditDeclaredAmount] = useState("");
  const [editShift, setEditShift] = useState("morning");
  const [editDenominations, setEditDenominations] = useState<Denominations>({
    thousand: 0,
    fiveHundred: 0,
    twoHundred: 0,
    oneHundred: 0,
    fifty: 0,
    twenty: 0,
    ten: 0,
    five: 0,
    two: 0,
    one: 0,
    half: 0,
    quarter: 0,
    tenCents: 0,
    fiveCents: 0,
  });

  const calculateTotal = () => {
    let total = 0;
    Object.entries(denominations).forEach(([key, count]) => {
      total +=
        count * DENOMINATION_VALUES[key as keyof typeof DENOMINATION_VALUES];
    });
    return total;
  };

  const handleDenominationChange = (
    key: keyof Denominations,
    value: string,
  ) => {
    setDenominations((prev) => ({
      ...prev,
      [key]: parseInt(value) || 0,
    }));
  };

  const calculatedTotal = calculateTotal();
  const variance = calculatedTotal - (parseFloat(declaredAmount) || 0);

  const resetCollection = () => {
    setDenominations({
      thousand: 0,
      fiveHundred: 0,
      twoHundred: 0,
      oneHundred: 0,
      fifty: 0,
      twenty: 0,
      ten: 0,
      five: 0,
      two: 0,
      one: 0,
      half: 0,
      quarter: 0,
      tenCents: 0,
      fiveCents: 0,
    });
    setDeclaredAmount("");
    setShift("morning");
  };

  const fetchTransactions = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/dashboard/reception/cash", {
        headers: {
          "x-user-id": user?._id || "",
          "x-user-role": user?.role || "",
          "x-user-name": user?.name || "",
        },
      });
      const data = await response.json();
      if (data.success) {
        setTransactions(data.data);

        // Calculate summary
        const todayCollection = data.data
          .filter((tx: CashTransaction) => tx.transactionType === "deposit")
          .reduce(
            (sum: number, tx: CashTransaction) => sum + (tx.amount || 0),
            0,
          );

        const pending = data.data.filter(
          (tx: CashTransaction) =>
            tx.verificationStatus === "pending" ||
            tx.verificationStatus === "discrepancy",
        ).length;

        const closingTx = data.data.find(
          (tx: CashTransaction) => tx.transactionType === "closing",
        );

        setSummary({
          cashOnHand: closingTx?.declaredAmount || 0,
          todayCollection,
          pendingReconciliations: pending,
        });
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDailyStats = async () => {
    try {
      const response = await fetch("/api/dashboard/reception/stats", {
        headers: {
          "x-user-id": user?._id || "",
          "x-user-role": user?.role || "",
          "x-user-name": user?.name || "",
        },
      });
      const data = await response.json();
      if (data.success) {
        setDailyStats({
          totalExpensesToday: data.data.totalExpensesToday || 0,
          totalAppointmentsToday: data.data.totalAppointmentsToday || 0,
          totalApprovedDiscountsToday:
            data.data.totalApprovedDiscountsToday || 0,
          totalLabPaymentsToday: data.data.totalLabPaymentsToday || 0,
          totalRadiologyPaymentsToday:
            data.data.totalRadiologyPaymentsToday || 0,
        });
      }
    } catch (error) {
      console.error("Error fetching daily stats:", error);
    }
  };

  const handleAddCollection = async () => {
    try {
      const response = await fetch("/api/dashboard/reception/cash", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user?._id || "",
          "x-user-role": user?.role || "",
          "x-user-name": user?.name || "",
        },
        body: JSON.stringify({
          transactionType: "deposit",
          denominations,
          declaredAmount: parseFloat(declaredAmount) || calculatedTotal,
          shift,
          source: "patient_payment",
        }),
      });

      const data = await response.json();
      if (data.success) {
        setIsCollectionOpen(false);
        resetCollection();
        fetchTransactions();
      }
    } catch (error) {
      console.error("Error creating collection:", error);
    }
  };

  // Open edit dialog
  const openEditDialog = (tx: CashTransaction) => {
    setEditingTransaction(tx);
    setEditDeclaredAmount(tx.declaredAmount.toString());
    setEditShift(tx.shift);
    setIsEditOpen(true);
  };

  // Handle edit transaction
  const handleEditTransaction = async () => {
    if (!editingTransaction) return;

    try {
      const response = await fetch("/api/dashboard/reception/cash", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user?._id || "",
          "x-user-role": user?.role || "",
          "x-user-name": user?.name || "",
        },
        body: JSON.stringify({
          id: editingTransaction.id,
          declaredAmount:
            parseFloat(editDeclaredAmount) || editingTransaction.declaredAmount,
          shift: editShift,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setIsEditOpen(false);
        setEditingTransaction(null);
        fetchTransactions();
      } else {
        alert(data.error || "Failed to update transaction");
      }
    } catch (error) {
      console.error("Error updating transaction:", error);
      alert("Failed to update transaction");
    }
  };

  // Handle delete transaction
  const handleDeleteTransaction = async (id: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this transaction? This action cannot be undone.",
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/dashboard/reception/cash?id=${id}`, {
        method: "DELETE",
        headers: {
          "x-user-id": user?._id || "",
          "x-user-role": user?.role || "",
          "x-user-name": user?.name || "",
        },
      });

      const data = await response.json();
      if (data.success) {
        fetchTransactions();
      } else {
        alert(data.error || "Failed to delete transaction");
      }
    } catch (error) {
      console.error("Error deleting transaction:", error);
      alert("Failed to delete transaction");
    }
  };

  useEffect(() => {
    fetchTransactions();
    fetchDailyStats();
  }, [user]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "opening":
        return <ArrowUpRight className="h-4 w-4 text-green-600" />;
      case "closing":
        return <ArrowDownLeft className="h-4 w-4 text-red-600" />;
      case "deposit":
        return <ArrowUpRight className="h-4 w-4 text-green-600" />;
      case "withdrawal":
        return <ArrowDownLeft className="h-4 w-4 text-red-600" />;
      default:
        return <DollarSign className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "opening":
      case "deposit":
        return "text-green-600";
      case "closing":
      case "withdrawal":
        return "text-red-600";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Cash Management</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              fetchTransactions();
              fetchDailyStats();
            }}
            disabled={isLoading}
          >
            <RefreshCw
              className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
          </Button>
          <Dialog open={isCollectionOpen} onOpenChange={setIsCollectionOpen}>
            <DialogTrigger asChild>
              <Button>
                <Calculator className="mr-2 h-4 w-4" />
                Collection
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Daily Collection Calculator</DialogTitle>
                <DialogDescription>
                  Count your cash denominations and calculate the total for{" "}
                  {shift} shift
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-6 md:grid-cols-2">
                {/* Notes Section */}
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Banknote className="h-4 w-4" /> Notes
                  </h3>
                  {[
                    { key: "thousand", label: "1000" },
                    { key: "fiveHundred", label: "500" },
                    { key: "twoHundred", label: "200" },
                    { key: "oneHundred", label: "100" },
                    { key: "fifty", label: "50" },
                    { key: "twenty", label: "20" },
                    { key: "ten", label: "10" },
                    { key: "five", label: "5" },
                  ].map(({ key, label }) => (
                    <div
                      key={key}
                      className="flex items-center justify-between"
                    >
                      <Label className="w-20">{label} x</Label>
                      <Input
                        type="number"
                        min="0"
                        className="w-24"
                        value={denominations[key as keyof Denominations]}
                        onChange={(e) =>
                          handleDenominationChange(
                            key as keyof Denominations,
                            e.target.value,
                          )
                        }
                      />
                      <span className="w-24 text-right text-muted-foreground">
                        ={" "}
                        {(
                          denominations[key as keyof Denominations] *
                          parseFloat(label)
                        ).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Coins Section */}
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <DollarSign className="h-4 w-4" /> Coins
                  </h3>
                  {[
                    { key: "two", label: "2" },
                    { key: "one", label: "1" },
                    { key: "half", label: "0.50" },
                    { key: "quarter", label: "0.25" },
                    { key: "tenCents", label: "0.10" },
                    { key: "fiveCents", label: "0.05" },
                  ].map(({ key, label }) => (
                    <div
                      key={key}
                      className="flex items-center justify-between"
                    >
                      <Label className="w-20">{label} x</Label>
                      <Input
                        type="number"
                        min="0"
                        className="w-24"
                        value={denominations[key as keyof Denominations]}
                        onChange={(e) =>
                          handleDenominationChange(
                            key as keyof Denominations,
                            e.target.value,
                          )
                        }
                      />
                      <span className="w-24 text-right text-muted-foreground">
                        ={" "}
                        {(
                          denominations[key as keyof Denominations] *
                          parseFloat(label)
                        ).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Summary */}
              <div className="rounded-lg bg-muted p-4 space-y-4">
                <div className="flex items-center justify-between text-lg font-semibold">
                  <span>Calculated Total:</span>
                  <span className="text-2xl">
                    ${calculatedTotal.toFixed(2)}
                  </span>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Shift</Label>
                    <Select value={shift} onValueChange={setShift}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="morning">Morning</SelectItem>
                        <SelectItem value="evening">Evening</SelectItem>
                        <SelectItem value="night">Night</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Declared Amount (Optional)</Label>
                    <Input
                      type="number"
                      placeholder="Enter declared amount"
                      value={declaredAmount}
                      onChange={(e) => setDeclaredAmount(e.target.value)}
                    />
                  </div>
                </div>

                {declaredAmount && (
                  <div
                    className={`flex items-center justify-between p-3 rounded-lg ${variance === 0 ? "bg-green-100 text-green-700" : variance > 0 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}
                  >
                    <span className="font-medium">Variance:</span>
                    <span className="font-bold">
                      {variance > 0 ? "+" : ""}
                      {variance.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>

              <DialogFooter className="flex gap-2">
                <Button variant="outline" onClick={resetCollection}>
                  Reset
                </Button>
                <Button onClick={handleAddCollection}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Collection
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Edit Transaction Dialog */}
          <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Edit Transaction</DialogTitle>
                <DialogDescription>
                  Update transaction details for{" "}
                  {editingTransaction?.transactionId}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Declared Amount</Label>
                  <Input
                    type="number"
                    placeholder="Enter declared amount"
                    value={editDeclaredAmount}
                    onChange={(e) => setEditDeclaredAmount(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Shift</Label>
                  <Select value={editShift} onValueChange={setEditShift}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="morning">Morning</SelectItem>
                      <SelectItem value="evening">Evening</SelectItem>
                      <SelectItem value="night">Night</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {editingTransaction && (
                  <div className="rounded-lg bg-muted p-3 text-sm">
                    <p>
                      <strong>Current Amount:</strong> $
                      {editingTransaction.declaredAmount.toFixed(2)}
                    </p>
                    <p>
                      <strong>Calculated Total:</strong> $
                      {editingTransaction.calculatedTotal.toFixed(2)}
                    </p>
                    <p>
                      <strong>Variance:</strong> $
                      {editingTransaction.variance.toFixed(2)}
                    </p>
                  </div>
                )}
              </div>

              <DialogFooter className="flex gap-2">
                <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleEditTransaction}>Save Changes</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Cash Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cash on Hand</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${summary.cashOnHand.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">Closing balance</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Today's Collection
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${summary.todayCollection.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {
                transactions.filter((tx) => tx.transactionType === "deposit")
                  .length
              }{" "}
              deposits
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Reconciliations
            </CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary.pendingReconciliations}
            </div>
            <p className="text-xs text-muted-foreground">Requires attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Daily Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Today's Expenses
            </CardTitle>
            <Receipt className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              ${dailyStats.totalExpensesToday.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">All expenses today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Appointments</CardTitle>
            <Calendar className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              ${dailyStats.totalAppointmentsToday.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">Total fees today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Approved Discounts
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              ${dailyStats.totalApprovedDiscountsToday.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">Discounts today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lab Payments</CardTitle>
            <FlaskConical className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              ${dailyStats.totalLabPaymentsToday.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">Paid tests today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Radiology Tests
            </CardTitle>
            <ScanLine className="h-4 w-4 text-cyan-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-cyan-600">
              ${dailyStats.totalRadiologyPaymentsToday.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">Paid exams today</p>
          </CardContent>
        </Card>
      </div>

      {/* Transaction Form */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Transaction</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="type">Transaction Type</Label>
              <Select
                value={transactionType}
                onValueChange={setTransactionType}
              >
                <SelectTrigger id="type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="payment">Payment</SelectItem>
                  <SelectItem value="refund">Refund</SelectItem>
                  <SelectItem value="advance">Advance</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="method">Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger id="method">
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="insurance">Insurance</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>&nbsp;</Label>
              <Button className="w-full">
                {transactionType === "payment" ? (
                  <ArrowUpRight className="mr-2 h-4 w-4" />
                ) : (
                  <ArrowDownLeft className="mr-2 h-4 w-4" />
                )}
                {transactionType === "payment" ? "Collect" : "Refund"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No transactions found for today
            </div>
          ) : (
            <div className="space-y-4">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-full bg-muted">
                      {getTypeIcon(tx.transactionType)}
                    </div>
                    <div>
                      <p className="font-medium capitalize">
                        {tx.transactionType}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {tx.shift} shift •{" "}
                        {new Date(tx.createdAt).toLocaleTimeString()}
                      </p>
                      {tx.source && (
                        <p className="text-xs text-muted-foreground">
                          Source: {tx.source}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p
                        className={`font-semibold ${getTypeColor(tx.transactionType)}`}
                      >
                        {tx.transactionType === "deposit" ||
                        tx.transactionType === "opening"
                          ? "+"
                          : tx.transactionType === "withdrawal" ||
                              tx.transactionType === "closing"
                            ? "-"
                            : ""}
                        ${(tx.amount || 0).toFixed(2)}
                      </p>
                      {tx.variance !== 0 && (
                        <p className="text-xs text-yellow-600">
                          Variance: {tx.variance > 0 ? "+" : ""}
                          {tx.variance.toFixed(2)}
                        </p>
                      )}
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          tx.verificationStatus === "verified"
                            ? "bg-green-100 text-green-700"
                            : tx.verificationStatus === "discrepancy"
                              ? "bg-red-100 text-red-700"
                              : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {tx.verificationStatus}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 border-l pl-4">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(tx)}
                        title="Edit transaction"
                      >
                        <Pencil className="h-4 w-4 text-blue-600" />
                      </Button>
                      {user?.role === "admin" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteTransaction(tx.id)}
                          title="Delete transaction (Admin only)"
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
