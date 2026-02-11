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
  Minus,
  Pill,
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
    totalDischargePaymentsToday: 0,
    totalPharmacyPaymentsToday: 0,
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
  });

  const [declaredAmount, setDeclaredAmount] = useState("");
  const [shift, setShift] = useState("morning");
  const [deduction, setDeduction] = useState("");

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

  // Calculate expected totals
  const expectedFromAppointments = dailyStats.totalAppointmentsToday;
  const expectedFromLab = dailyStats.totalLabPaymentsToday;
  const expectedFromRadiology = dailyStats.totalRadiologyPaymentsToday;
  const expectedFromDischarge = dailyStats.totalDischargePaymentsToday;
  const expectedFromPharmacy = dailyStats.totalPharmacyPaymentsToday;
  const approvedDiscounts = dailyStats.totalApprovedDiscountsToday;
  const todaysExpenses = dailyStats.totalExpensesToday;

  // Total Expected Amount = (Appointments + Lab + Radiology + Discharge + Pharmacy) - Discounts
  const totalExpectedAmount =
    expectedFromAppointments +
    expectedFromLab +
    expectedFromRadiology +
    expectedFromDischarge +
    expectedFromPharmacy -
    approvedDiscounts;

  // Net Cash After Expenses = Total Expected - Today's Expenses
  const netCashAfterExpenses = totalExpectedAmount - todaysExpenses;

  // Final Calculated Amount = Net Cash After Expenses - Deduction
  const finalCalculatedAmount =
    netCashAfterExpenses - (parseFloat(deduction) || 0);

  // Calculated Total (from denominations)
  const calculatedTotal = calculateTotal();

  // Variance = Calculated Total - Final Calculated Amount
  const variance = calculatedTotal - finalCalculatedAmount;

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
    });
    setDeclaredAmount("");
    setDeduction("");
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
          totalDischargePaymentsToday:
            data.data.totalDischargePaymentsToday || 0,
          totalPharmacyPaymentsToday: data.data.totalPharmacyPaymentsToday || 0,
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
          declaredAmount: finalCalculatedAmount,
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

  // Format currency to AFN
  const formatCurrency = (amount: number) => {
    return `${amount.toFixed(2)} AFN`;
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
            <DialogContent className="max-w-[90vw] lg:max-w-[90%] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Daily Collection Calculator</DialogTitle>
                <DialogDescription>
                  Count your cash denominations and calculate the total for{" "}
                  {shift} shift
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column: Denominations */}
                <div className="space-y-6">
                  {/* Notes Section */}
                  <div className="space-y-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Banknote className="h-4 w-4" /> Afghan Afghani (AFN)
                    </h3>
                    <div className="space-y-3">
                      {[
                        { key: "thousand", label: "1000" },
                        { key: "fiveHundred", label: "500" },
                        { key: "twoHundred", label: "200" },
                        { key: "oneHundred", label: "100" },
                        { key: "fifty", label: "50" },
                        { key: "twenty", label: "20" },
                        { key: "ten", label: "10" },
                        { key: "five", label: "5" },
                        { key: "two", label: "2" },
                        { key: "one", label: "1" },
                      ].map(({ key, label }) => (
                        <div
                          key={key}
                          className="flex items-center justify-between"
                        >
                          <Label className="w-16">{label} AFN x</Label>
                          <Input
                            type="number"
                            min="0"
                            className="w-20"
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
                            ).toFixed(2)}{" "}
                            AFN
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Column: Summary & Calculations */}
                <div className="space-y-6">
                  {/* Expected Collection Summary */}
                  <div className="rounded-lg border p-4 space-y-3">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Calculator className="h-4 w-4" /> Expected Collection
                      Summary
                    </h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Appointments:</span>
                        <span className="font-medium">
                          {formatCurrency(expectedFromAppointments)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Lab Payments:</span>
                        <span className="font-medium">
                          {formatCurrency(expectedFromLab)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Radiology Payments:</span>
                        <span className="font-medium">
                          {formatCurrency(expectedFromRadiology)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Discharge Card Payments:</span>
                        <span className="font-medium">
                          {formatCurrency(expectedFromDischarge)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Pharmacy Payments:</span>
                        <span className="font-medium">
                          {formatCurrency(expectedFromPharmacy)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm text-orange-600">
                        <span className="flex items-center gap-1">
                          <TrendingDown className="h-3 w-3" /> Approved
                          Discounts:
                        </span>
                        <span className="font-medium">
                          -{formatCurrency(approvedDiscounts)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm font-semibold border-t pt-2">
                        <span>Total Expected Amount:</span>
                        <span className="text-lg">
                          {formatCurrency(totalExpectedAmount)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm text-red-600">
                        <span className="flex items-center gap-1">
                          <Receipt className="h-3 w-3" /> Less: Today's
                          Expenses:
                        </span>
                        <span className="font-medium">
                          -{formatCurrency(todaysExpenses)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm font-semibold border-t pt-2">
                        <span>Net Cash After Expenses:</span>
                        <span className="text-lg">
                          {formatCurrency(netCashAfterExpenses)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Denomination Summary & Controls */}
                  <div className="rounded-lg bg-muted p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-semibold">
                        Calculated Total (from denominations):
                      </span>
                      <span className="text-2xl font-bold">
                        {formatCurrency(calculatedTotal)}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        <Label>Deduction (for expenses/other)</Label>
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={deduction}
                          onChange={(e) => setDeduction(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Final Amount & Variance */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <span className="font-semibold text-green-700">
                          Final Deposit Amount:
                        </span>
                        <span className="text-2xl font-bold text-green-700">
                          {formatCurrency(finalCalculatedAmount)}
                        </span>
                      </div>

                      {/* Variance Display */}
                      <div
                        className={`flex items-center justify-between p-3 rounded-lg ${
                          variance === 0
                            ? "bg-green-100 text-green-700"
                            : variance > 0
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-red-100 text-red-700"
                        }`}
                      >
                        <span className="font-medium">
                          Variance (Counted - Expected):
                        </span>
                        <span className="font-bold text-lg">
                          {variance > 0 ? "+" : ""}
                          {formatCurrency(variance)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter className="flex gap-2 pt-4 border-t">
                <Button variant="outline" onClick={resetCollection}>
                  Reset
                </Button>
                <Button onClick={handleAddCollection}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Collection ({formatCurrency(finalCalculatedAmount)})
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
                  <Label>Declared Amount (AFN)</Label>
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
                      <strong>Current Amount:</strong>{" "}
                      {formatCurrency(editingTransaction.declaredAmount)}
                    </p>
                    <p>
                      <strong>Calculated Total:</strong>{" "}
                      {formatCurrency(editingTransaction.calculatedTotal)}
                    </p>
                    <p>
                      <strong>Variance:</strong>{" "}
                      {formatCurrency(editingTransaction.variance)}
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
              {formatCurrency(summary.cashOnHand)}
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
              {formatCurrency(summary.todayCollection)}
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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Today's Expenses
            </CardTitle>
            <Receipt className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(dailyStats.totalExpensesToday)}
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
              {formatCurrency(dailyStats.totalAppointmentsToday)}
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
              {formatCurrency(dailyStats.totalApprovedDiscountsToday)}
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
              {formatCurrency(dailyStats.totalLabPaymentsToday)}
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
              {formatCurrency(dailyStats.totalRadiologyPaymentsToday)}
            </div>
            <p className="text-xs text-muted-foreground">Paid exams today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Discharge Cards
            </CardTitle>
            <FileText className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-600">
              {formatCurrency(dailyStats.totalDischargePaymentsToday)}
            </div>
            <p className="text-xs text-muted-foreground">
              Paid discharges today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pharmacy Payments
            </CardTitle>
            <Pill className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {formatCurrency(dailyStats.totalPharmacyPaymentsToday)}
            </div>
            <p className="text-xs text-muted-foreground">
              Paid medicines today
            </p>
          </CardContent>
        </Card>
      </div>
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
                        {formatCurrency(tx.amount || 0)}
                      </p>
                      {tx.variance !== 0 && (
                        <p className="text-xs text-yellow-600">
                          Variance: {tx.variance > 0 ? "+" : ""}
                          {formatCurrency(tx.variance)}
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
