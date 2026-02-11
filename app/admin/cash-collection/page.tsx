// app/admin/cash-collection/page.tsx
"use client";

import { useState, useEffect } from "react";
import {
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Calendar,
  User,
  RefreshCw,
  Eye,
  FileText,
  ChevronDown,
  ChevronUp,
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
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuthStore } from "@/store/useAuthStore";
import { Badge } from "@/components/ui/badge";

interface CashCollection {
  id: string;
  collectionId: string;
  staff: any;
  staffName: string;
  shift: string;
  date: string;
  totalExpectedAmount: number;
  totalDeclaredAmount: number;
  discrepancy: number;
  discrepancyPercentage: number;
  cashFromAppointments: number;
  cashFromLab: number;
  cashFromRadiology: number;
  cashFromDischarge: number;
  totalDiscounts: number;
  totalExpenses: number;
  transactionIds: string[];
  status: "submitted" | "pending_review" | "approved" | "rejected";
  submittedAt: string;
  reviewedBy?: any;
  reviewedByName?: string;
  reviewedAt?: string;
  approvalNotes?: string;
  collectedAmount: number;
  collectedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface CollectionSummary {
  totalCollected: number;
  totalExpected: number;
  totalDiscrepancy: number;
  totalCashIn: number;
  totalExpenses: number;
  totalDiscounts: number;
  count: number;
}

export default function AdminCashCollectionPage() {
  const { user } = useAuthStore();
  const [collections, setCollections] = useState<CashCollection[]>([]);
  const [summary, setSummary] = useState<CollectionSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCollection, setSelectedCollection] =
    useState<CashCollection | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState("");
  const [approvalAction, setApprovalAction] = useState<"approve" | "reject">(
    "approve",
  );
  const [expandedCollection, setExpandedCollection] = useState<string | null>(
    null,
  );

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [shiftFilter, setShiftFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const fetchCollections = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (shiftFilter !== "all") params.append("shift", shiftFilter);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const response = await fetch(
        `/api/admin/cash-collection?${params.toString()}`,
        {
          headers: {
            "x-user-id": user?._id || "",
            "x-user-role": user?.role || "",
            "x-user-name": user?.name || "",
          },
        },
      );
      const data = await response.json();
      if (data.success) {
        setCollections(data.data);
        setSummary(data.summary || null);
      }
    } catch (error) {
      console.error("Error fetching collections:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCollections();
  }, [user, statusFilter, shiftFilter, startDate, endDate]);

  const handleApprove = async () => {
    if (!selectedCollection) return;

    try {
      const response = await fetch(
        `/api/admin/cash-collection/${selectedCollection.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": user?._id || "",
            "x-user-role": user?.role || "",
            "x-user-name": user?.name || "",
          },
          body: JSON.stringify({
            action: approvalAction,
            notes: approvalNotes,
          }),
        },
      );

      const data = await response.json();
      if (data.success) {
        setIsApproveDialogOpen(false);
        setApprovalNotes("");
        setSelectedCollection(null);
        fetchCollections();
      } else {
        alert(data.error || "Failed to process collection");
      }
    } catch (error) {
      console.error("Error processing collection:", error);
      alert("Failed to process collection");
    }
  };

  const openDetailDialog = (collection: CashCollection) => {
    setSelectedCollection(collection);
    setIsDetailDialogOpen(true);
  };

  const openApproveDialog = (
    collection: CashCollection,
    action: "approve" | "reject",
  ) => {
    setSelectedCollection(collection);
    setApprovalAction(action);
    setApprovalNotes("");
    setIsApproveDialogOpen(true);
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toFixed(2)} AFN`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<
      string,
      { color: string; icon: any; label: string }
    > = {
      submitted: {
        color: "bg-blue-100 text-blue-700",
        icon: Clock,
        label: "Submitted",
      },
      pending_review: {
        color: "bg-yellow-100 text-yellow-700",
        icon: Clock,
        label: "Pending Review",
      },
      approved: {
        color: "bg-green-100 text-green-700",
        icon: CheckCircle,
        label: "Approved",
      },
      rejected: {
        color: "bg-red-100 text-red-700",
        icon: XCircle,
        label: "Rejected",
      },
    };
    const config = statusConfig[status] || statusConfig.submitted;
    const Icon = config.icon;
    return (
      <Badge className={config.color}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const getDiscrepancyColor = (discrepancy: number) => {
    if (discrepancy === 0) return "text-green-600";
    if (Math.abs(discrepancy) <= 10) return "text-yellow-600";
    return "text-red-600";
  };

  const getDiscrepancyBg = (discrepancy: number) => {
    if (discrepancy === 0) return "bg-green-50 border-green-200";
    if (Math.abs(discrepancy) <= 10) return "bg-yellow-50 border-yellow-200";
    return "bg-red-50 border-red-200";
  };

  const pendingCount = collections.filter(
    (c) => c.status === "submitted" || c.status === "pending_review",
  ).length;
  const approvedCount = collections.filter(
    (c) => c.status === "approved",
  ).length;
  const rejectedCount = collections.filter(
    (c) => c.status === "rejected",
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Cash Collection Approval
          </h1>
          <p className="text-muted-foreground">
            Review and approve daily cash collections from receptionists
          </p>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={fetchCollections}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Review
            </CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {pendingCount}
            </div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {approvedCount}
            </div>
            <p className="text-xs text-muted-foreground">
              Collections approved
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {rejectedCount}
            </div>
            <p className="text-xs text-muted-foreground">
              Collections rejected
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Collected
            </CardTitle>
            <DollarSign className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(summary?.totalCollected || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              From approved collections
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="pending_review">Pending Review</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Shift</Label>
              <Select value={shiftFilter} onValueChange={setShiftFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Shifts</SelectItem>
                  <SelectItem value="morning">Morning</SelectItem>
                  <SelectItem value="evening">Evening</SelectItem>
                  <SelectItem value="night">Night</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>End Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Collections List */}
      <Card>
        <CardHeader>
          <CardTitle>Cash Collections</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : collections.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No cash collections found
            </div>
          ) : (
            <div className="space-y-4">
              {collections.map((collection) => (
                <div
                  key={collection.id}
                  className={`border rounded-lg overflow-hidden ${
                    collection.status === "submitted" ||
                    collection.status === "pending_review"
                      ? "border-yellow-200"
                      : ""
                  }`}
                >
                  {/* Main Row */}
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          {getStatusBadge(collection.status)}
                        </div>
                        <div>
                          <p className="font-semibold">
                            {collection.collectionId}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {collection.staffName} • {collection.shift} shift •{" "}
                            {formatDate(collection.date)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-semibold text-lg">
                            {formatCurrency(collection.totalDeclaredAmount)}
                          </p>
                          <p
                            className={`text-sm ${getDiscrepancyColor(collection.discrepancy)}`}
                          >
                            {collection.discrepancy > 0 ? "+" : ""}
                            {formatCurrency(collection.discrepancy)} discrepancy
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              setExpandedCollection(
                                expandedCollection === collection.id
                                  ? null
                                  : collection.id,
                              )
                            }
                          >
                            {expandedCollection === collection.id ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openDetailDialog(collection)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {(collection.status === "submitted" ||
                            collection.status === "pending_review") && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  openApproveDialog(collection, "approve")
                                }
                                className="text-green-600 hover:text-green-700"
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  openApproveDialog(collection, "reject")
                                }
                                className="text-red-600 hover:text-red-700"
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {expandedCollection === collection.id && (
                    <div className="border-t bg-muted/50 p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Cash Breakdown</p>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Appointments:
                              </span>
                              <span>
                                {formatCurrency(
                                  collection.cashFromAppointments,
                                )}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Lab Payments:
                              </span>
                              <span>
                                {formatCurrency(collection.cashFromLab)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Radiology:
                              </span>
                              <span>
                                {formatCurrency(collection.cashFromRadiology)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Discharge Cards:
                              </span>
                              <span>
                                {formatCurrency(collection.cashFromDischarge)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <p className="text-sm font-medium">Deductions</p>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Total Discounts:
                              </span>
                              <span className="text-orange-600">
                                -{formatCurrency(collection.totalDiscounts)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Total Expenses:
                              </span>
                              <span className="text-red-600">
                                -{formatCurrency(collection.totalExpenses)}
                              </span>
                            </div>
                            <div className="flex justify-between font-semibold pt-2 border-t">
                              <span>Net Expected:</span>
                              <span>
                                {formatCurrency(collection.totalExpectedAmount)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div
                          className={`p-3 rounded-lg border ${getDiscrepancyBg(collection.discrepancy)}`}
                        >
                          <p className="text-sm font-medium mb-2">
                            Discrepancy Analysis
                          </p>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Expected:
                              </span>
                              <span>
                                {formatCurrency(collection.totalExpectedAmount)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Declared:
                              </span>
                              <span>
                                {formatCurrency(collection.totalDeclaredAmount)}
                              </span>
                            </div>
                            <div className="flex justify-between font-semibold pt-2 border-t">
                              <span>Variance:</span>
                              <span
                                className={getDiscrepancyColor(
                                  collection.discrepancy,
                                )}
                              >
                                {collection.discrepancy > 0 ? "+" : ""}
                                {formatCurrency(collection.discrepancy)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Percentage:
                              </span>
                              <span
                                className={getDiscrepancyColor(
                                  collection.discrepancy,
                                )}
                              >
                                {collection.discrepancyPercentage.toFixed(2)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {collection.notes && (
                        <div className="mt-4 p-3 bg-muted rounded-lg">
                          <p className="text-sm font-medium">Notes:</p>
                          <p className="text-sm text-muted-foreground">
                            {collection.notes}
                          </p>
                        </div>
                      )}

                      {collection.reviewedByName && (
                        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                          <p className="text-sm font-medium">Review Details:</p>
                          <p className="text-sm text-muted-foreground">
                            Reviewed by: {collection.reviewedByName}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Reviewed at:{" "}
                            {formatDate(collection.reviewedAt || "")}
                          </p>
                          {collection.approvalNotes && (
                            <p className="text-sm text-muted-foreground mt-1">
                              Notes: {collection.approvalNotes}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Collection Details</DialogTitle>
            <DialogDescription>
              {selectedCollection?.collectionId}
            </DialogDescription>
          </DialogHeader>
          {selectedCollection && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Staff Name</Label>
                  <p className="font-medium">{selectedCollection.staffName}</p>
                </div>
                <div>
                  <Label>Shift</Label>
                  <p className="font-medium capitalize">
                    {selectedCollection.shift}
                  </p>
                </div>
                <div>
                  <Label>Date</Label>
                  <p className="font-medium">
                    {formatDate(selectedCollection.date)}
                  </p>
                </div>
                <div>
                  <Label>Status</Label>
                  <div className="mt-1">
                    {getStatusBadge(selectedCollection.status)}
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Cash Breakdown</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Appointments:</span>
                    <span>
                      {formatCurrency(selectedCollection.cashFromAppointments)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Lab Payments:</span>
                    <span>
                      {formatCurrency(selectedCollection.cashFromLab)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Radiology:</span>
                    <span>
                      {formatCurrency(selectedCollection.cashFromRadiology)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Discharge Cards:
                    </span>
                    <span>
                      {formatCurrency(selectedCollection.cashFromDischarge)}
                    </span>
                  </div>
                  <div className="flex justify-between font-semibold pt-2 border-t">
                    <span>Total Cash In:</span>
                    <span>
                      {formatCurrency(
                        selectedCollection.cashFromAppointments +
                          selectedCollection.cashFromLab +
                          selectedCollection.cashFromRadiology +
                          selectedCollection.cashFromDischarge,
                      )}
                    </span>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Deductions</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Total Discounts:
                    </span>
                    <span className="text-orange-600">
                      -{formatCurrency(selectedCollection.totalDiscounts)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Total Expenses:
                    </span>
                    <span className="text-red-600">
                      -{formatCurrency(selectedCollection.totalExpenses)}
                    </span>
                  </div>
                  <div className="flex justify-between font-semibold pt-2 border-t">
                    <span>Net Expected:</span>
                    <span>
                      {formatCurrency(selectedCollection.totalExpectedAmount)}
                    </span>
                  </div>
                </div>
              </div>

              <div
                className={`p-4 rounded-lg border ${getDiscrepancyBg(selectedCollection.discrepancy)}`}
              >
                <h3 className="font-semibold mb-3">Discrepancy Analysis</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Expected Amount:
                    </span>
                    <span>
                      {formatCurrency(selectedCollection.totalExpectedAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Declared Amount:
                    </span>
                    <span>
                      {formatCurrency(selectedCollection.totalDeclaredAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between font-semibold pt-2 border-t">
                    <span>Variance:</span>
                    <span
                      className={getDiscrepancyColor(
                        selectedCollection.discrepancy,
                      )}
                    >
                      {selectedCollection.discrepancy > 0 ? "+" : ""}
                      {formatCurrency(selectedCollection.discrepancy)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Percentage:</span>
                    <span
                      className={getDiscrepancyColor(
                        selectedCollection.discrepancy,
                      )}
                    >
                      {selectedCollection.discrepancyPercentage.toFixed(2)}%
                    </span>
                  </div>
                </div>
              </div>

              {selectedCollection.notes && (
                <div className="border-t pt-4">
                  <Label>Notes</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedCollection.notes}
                  </p>
                </div>
              )}

              {selectedCollection.reviewedByName && (
                <div className="border-t pt-4 p-3 bg-blue-50 rounded-lg">
                  <Label>Review Information</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Reviewed by: {selectedCollection.reviewedByName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Reviewed at:{" "}
                    {formatDate(selectedCollection.reviewedAt || "")}
                  </p>
                  {selectedCollection.approvalNotes && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Notes: {selectedCollection.approvalNotes}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Approve/Reject Dialog */}
      <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {approvalAction === "approve"
                ? "Approve Collection"
                : "Reject Collection"}
            </DialogTitle>
            <DialogDescription>
              {selectedCollection?.collectionId} -{" "}
              {formatCurrency(selectedCollection?.totalDeclaredAmount || 0)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Textarea
                placeholder="Add any notes about this decision..."
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                rows={3}
              />
            </div>
            {selectedCollection && (
              <div
                className={`p-3 rounded-lg border ${getDiscrepancyBg(selectedCollection.discrepancy)}`}
              >
                <p className="text-sm font-medium">Discrepancy: </p>
                <p
                  className={`text-sm ${getDiscrepancyColor(selectedCollection.discrepancy)}`}
                >
                  {selectedCollection.discrepancy > 0 ? "+" : ""}
                  {formatCurrency(selectedCollection.discrepancy)} (
                  {selectedCollection.discrepancyPercentage.toFixed(2)}%)
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsApproveDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleApprove}
              variant={approvalAction === "approve" ? "default" : "destructive"}
            >
              {approvalAction === "approve" ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
