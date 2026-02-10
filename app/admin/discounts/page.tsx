// app/admin/discounts/page.tsx

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Eye,
  Calendar,
  DollarSign,
  User,
  Filter,
  RefreshCw,
  Search,
} from "lucide-react";

interface DiscountRequest {
  id: string;
  discountId: string;
  patientName: string;
  patientId: string;
  requestedAmount: number;
  originalAmount?: number;
  discountPercentage?: number;
  reason: string;
  requestCategory: string;
  requestedBy: string;
  requestedAt: string;
  status: "pending" | "approved" | "rejected" | "cancelled" | "expired";
  reviewNotes?: string;
  approvedAmount?: number;
  approvedPercentage?: number;
  approvedBy?: string;
  approvedAt?: string;
}

// Helper function to safely format category
const formatCategory = (category: string | undefined): string => {
  if (!category) return "Unknown";
  return category.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
};

export default function AdminDiscountsPage() {
  const router = useRouter();
  const { user, accessToken } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [discountRequests, setDiscountRequests] = useState<DiscountRequest[]>(
    [],
  );
  const [selectedRequest, setSelectedRequest] =
    useState<DiscountRequest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Dialog states
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [reviewNotes, setReviewNotes] = useState("");
  const [approvedAmount, setApprovedAmount] = useState("");

  // Check if user is admin
  useEffect(() => {
    if (user && user.role !== "admin") {
      router.push("/unauthorized");
    }
  }, [user, router]);

  // Fetch discount requests
  const fetchDiscountRequests = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/dashboard/reception/discounts?status=${statusFilter}&limit=50`,
        {
          headers: {
            "Content-Type": "application/json",
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
        },
      );

      const data = await response.json();

      if (data.success && data.data) {
        // Validate and transform the data
        const validatedRequests = data.data.map((request: any) => ({
          id: request.id || request._id || "",
          discountId:
            request.discountId ||
            `DIS-${Math.random().toString(36).substr(2, 9)}`,
          patientName: request.patientName || "Unknown Patient",
          patientId: request.patientId || request.patient?._id || "N/A",
          requestedAmount:
            typeof request.requestedAmount === "number"
              ? request.requestedAmount
              : 0,
          originalAmount: request.originalAmount,
          discountPercentage: request.discountPercentage,
          reason: request.reason || "No reason provided",
          requestCategory: request.requestCategory || "other",
          requestedBy: request.requestedBy || "Unknown",
          requestedAt: request.requestedAt || new Date().toISOString(),
          status: request.status || "pending",
          reviewNotes: request.reviewNotes,
          approvedAmount: request.approvedAmount,
          approvedPercentage: request.approvedPercentage,
          approvedBy: request.approvedBy,
          approvedAt: request.approvedAt,
        }));

        setDiscountRequests(validatedRequests);
      } else {
        setError(data.error || "Failed to fetch discount requests");
        setDiscountRequests([]);
      }
    } catch (error) {
      console.error("Error fetching discount requests:", error);
      setError(
        "Failed to fetch discount requests. Please check your connection.",
      );
      setDiscountRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === "admin" && accessToken) {
      fetchDiscountRequests();
    }
  }, [user, accessToken, statusFilter]);

  // Handle approve action
  const handleApprove = async () => {
    if (!selectedRequest) return;

    try {
      setUpdating(selectedRequest.id);
      setError(null);

      const response = await fetch(
        `/api/dashboard/admin/discounts/${selectedRequest.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          body: JSON.stringify({
            action: "approve",
            approvedAmount: approvedAmount || selectedRequest.requestedAmount,
            notes: reviewNotes,
          }),
        },
      );

      const data = await response.json();

      if (data.success) {
        setSuccess("Discount request approved successfully!");
        fetchDiscountRequests();
        setApproveDialogOpen(false);
        setSelectedRequest(null);
        setReviewNotes("");
        setApprovedAmount("");
      } else {
        setError(data.error || "Failed to approve discount request");
      }
    } catch (error) {
      console.error("Error approving discount request:", error);
      setError("Failed to approve discount request");
    } finally {
      setUpdating(null);
    }
  };

  // Handle reject action
  const handleReject = async () => {
    if (!selectedRequest) return;

    try {
      setUpdating(selectedRequest.id);
      setError(null);

      const response = await fetch(
        `/api/dashboard/admin/discounts/${selectedRequest.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          body: JSON.stringify({
            action: "reject",
            notes: reviewNotes,
          }),
        },
      );

      const data = await response.json();

      if (data.success) {
        setSuccess("Discount request rejected successfully!");
        fetchDiscountRequests();
        setRejectDialogOpen(false);
        setSelectedRequest(null);
        setReviewNotes("");
      } else {
        setError(data.error || "Failed to reject discount request");
      }
    } catch (error) {
      console.error("Error rejecting discount request:", error);
      setError("Failed to reject discount request");
    } finally {
      setUpdating(null);
    }
  };

  // Filter requests based on search
  const filteredRequests = discountRequests.filter((request) => {
    if (!searchQuery) return true;

    const searchLower = searchQuery.toLowerCase();
    return (
      request.patientName.toLowerCase().includes(searchLower) ||
      request.discountId.toLowerCase().includes(searchLower) ||
      (request.requestCategory || "").toLowerCase().includes(searchLower) ||
      request.requestedBy.toLowerCase().includes(searchLower)
    );
  });

  // Get status badge color
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge
            variant="outline"
            className="bg-yellow-50 text-yellow-700 border-yellow-200"
          >
            Pending
          </Badge>
        );
      case "approved":
        return (
          <Badge
            variant="outline"
            className="bg-green-50 text-green-700 border-green-200"
          >
            Approved
          </Badge>
        );
      case "rejected":
        return (
          <Badge
            variant="outline"
            className="bg-red-50 text-red-700 border-red-200"
          >
            Rejected
          </Badge>
        );
      case "cancelled":
        return (
          <Badge
            variant="outline"
            className="bg-gray-50 text-gray-700 border-gray-200"
          >
            Cancelled
          </Badge>
        );
      case "expired":
        return (
          <Badge
            variant="outline"
            className="bg-orange-50 text-orange-700 border-orange-200"
          >
            Expired
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      return "Invalid date";
    }
  };

  // Format currency
  const formatCurrency = (amount: number | undefined) => {
    if (typeof amount !== "number" || isNaN(amount)) {
      return "$0.00";
    }
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  // Debug: Log the current requests
  useEffect(() => {
    if (discountRequests.length > 0) {
      console.log("Current discount requests:", discountRequests);
    }
  }, [discountRequests]);

  if (!user || user.role !== "admin") {
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
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">
              Discount Requests Management
            </h1>
            <p className="text-gray-500 mt-2">
              Review and approve/reject discount requests from patients
            </p>
          </div>
          <Button
            onClick={fetchDiscountRequests}
            variant="outline"
            disabled={loading}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="mb-6 bg-green-50 text-green-800 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Search by patient, ID, or category..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status Filter</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Requests</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Total Requests</Label>
              <div className="text-2xl font-bold text-gray-900">
                {filteredRequests.length}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Discount Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle>Discount Requests</CardTitle>
          <CardDescription>
            List of all discount requests. Click on a request to view details
            and take action.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                No discount requests found
              </h3>
              <p className="text-gray-500">
                {searchQuery || statusFilter !== "all"
                  ? "Try adjusting your filters or search terms"
                  : "No discount requests have been submitted yet."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Request ID</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Requested By</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-mono text-sm">
                        {request.discountId}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{request.patientName}</div>
                        <div className="text-sm text-gray-500">
                          ID:{" "}
                          {typeof request.patientId === "string"
                            ? request.patientId.slice(0, 8)
                            : "N/A"}
                          ...
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {formatCurrency(request.requestedAmount)}
                        </div>
                        {request.originalAmount && (
                          <div className="text-sm text-gray-500">
                            Original: {formatCurrency(request.originalAmount)}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">
                          {formatCategory(request.requestCategory)}
                        </Badge>
                      </TableCell>
                      <TableCell>{request.requestedBy}</TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Calendar className="h-3 w-3 mr-2 text-gray-400" />
                          {formatDate(request.requestedAt)}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(request.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Dialog
                            open={
                              viewDialogOpen &&
                              selectedRequest?.id === request.id
                            }
                            onOpenChange={(open) => {
                              setViewDialogOpen(open);
                              if (open) setSelectedRequest(request);
                              else setSelectedRequest(null);
                            }}
                          >
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedRequest(request)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl">
                              <DialogHeader>
                                <DialogTitle>
                                  Discount Request Details
                                </DialogTitle>
                                <DialogDescription>
                                  Complete details of discount request{" "}
                                  {request.discountId}
                                </DialogDescription>
                              </DialogHeader>
                              {selectedRequest && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  {/* Patient Details */}
                                  <Card>
                                    <CardHeader>
                                      <CardTitle className="text-lg flex items-center gap-2">
                                        <User className="h-5 w-5" />
                                        Patient Information
                                      </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                      <div>
                                        <Label className="text-sm text-gray-500">
                                          Patient Name
                                        </Label>
                                        <p className="font-medium">
                                          {selectedRequest.patientName}
                                        </p>
                                      </div>
                                      <div>
                                        <Label className="text-sm text-gray-500">
                                          Patient ID
                                        </Label>
                                        <p className="font-mono text-sm">
                                          {selectedRequest.patientId}
                                        </p>
                                      </div>
                                    </CardContent>
                                  </Card>

                                  {/* Request Details */}
                                  <Card>
                                    <CardHeader>
                                      <CardTitle className="text-lg flex items-center gap-2">
                                        <DollarSign className="h-5 w-5" />
                                        Discount Details
                                      </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                      <div>
                                        <Label className="text-sm text-gray-500">
                                          Requested Amount
                                        </Label>
                                        <p className="font-medium">
                                          {formatCurrency(
                                            selectedRequest.requestedAmount,
                                          )}
                                        </p>
                                      </div>
                                      {selectedRequest.originalAmount && (
                                        <div>
                                          <Label className="text-sm text-gray-500">
                                            Original Amount
                                          </Label>
                                          <p className="font-medium">
                                            {formatCurrency(
                                              selectedRequest.originalAmount,
                                            )}
                                          </p>
                                        </div>
                                      )}
                                      {selectedRequest.discountPercentage && (
                                        <div>
                                          <Label className="text-sm text-gray-500">
                                            Discount Percentage
                                          </Label>
                                          <p className="font-medium">
                                            {selectedRequest.discountPercentage.toFixed(
                                              2,
                                            )}
                                            %
                                          </p>
                                        </div>
                                      )}
                                      <div>
                                        <Label className="text-sm text-gray-500">
                                          Category
                                        </Label>
                                        <Badge
                                          variant="secondary"
                                          className="capitalize"
                                        >
                                          {formatCategory(
                                            selectedRequest.requestCategory,
                                          )}
                                        </Badge>
                                      </div>
                                    </CardContent>
                                  </Card>

                                  {/* Reason */}
                                  <Card className="md:col-span-2">
                                    <CardHeader>
                                      <CardTitle className="text-lg">
                                        Reason for Discount
                                      </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                      <p className="whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">
                                        {selectedRequest.reason}
                                      </p>
                                    </CardContent>
                                  </Card>

                                  {/* Review Notes (if any) */}
                                  {selectedRequest.reviewNotes && (
                                    <Card className="md:col-span-2">
                                      <CardHeader>
                                        <CardTitle className="text-lg">
                                          Review Notes
                                        </CardTitle>
                                      </CardHeader>
                                      <CardContent>
                                        <p className="whitespace-pre-wrap bg-blue-50 p-4 rounded-lg">
                                          {selectedRequest.reviewNotes}
                                        </p>
                                      </CardContent>
                                    </Card>
                                  )}
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>

                          {/* Approve Button - Only show for pending requests */}
                          {request.status === "pending" && (
                            <Dialog
                              open={
                                approveDialogOpen &&
                                selectedRequest?.id === request.id
                              }
                              onOpenChange={(open) => {
                                setApproveDialogOpen(open);
                                if (open) {
                                  setSelectedRequest(request);
                                  setApprovedAmount(
                                    request.requestedAmount.toString(),
                                  );
                                } else {
                                  setSelectedRequest(null);
                                  setReviewNotes("");
                                  setApprovedAmount("");
                                }
                              }}
                            >
                              <DialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="default"
                                  className="bg-green-600 hover:bg-green-700"
                                  onClick={() => setSelectedRequest(request)}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Approve
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>
                                    Approve Discount Request
                                  </DialogTitle>
                                  <DialogDescription>
                                    Approve discount request{" "}
                                    {request.discountId} for{" "}
                                    {request.patientName}
                                  </DialogDescription>
                                </DialogHeader>

                                <div className="space-y-4">
                                  <div className="space-y-2">
                                    <Label htmlFor="approvedAmount">
                                      Approved Amount ($)
                                    </Label>
                                    <Input
                                      id="approvedAmount"
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      max={
                                        request.originalAmount ||
                                        request.requestedAmount
                                      }
                                      value={approvedAmount}
                                      onChange={(e) =>
                                        setApprovedAmount(e.target.value)
                                      }
                                      placeholder="Enter approved amount"
                                    />
                                    <p className="text-sm text-gray-500">
                                      Original amount:{" "}
                                      {formatCurrency(
                                        request.originalAmount ||
                                          request.requestedAmount,
                                      )}
                                    </p>
                                  </div>

                                  <div className="space-y-2">
                                    <Label htmlFor="approveNotes">
                                      Approval Notes (Optional)
                                    </Label>
                                    <Textarea
                                      id="approveNotes"
                                      value={reviewNotes}
                                      onChange={(e) =>
                                        setReviewNotes(e.target.value)
                                      }
                                      placeholder="Add any notes for this approval..."
                                      rows={3}
                                    />
                                  </div>
                                </div>

                                <DialogFooter>
                                  <Button
                                    variant="outline"
                                    onClick={() => setApproveDialogOpen(false)}
                                    disabled={updating === request.id}
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    onClick={handleApprove}
                                    disabled={updating === request.id}
                                    className="bg-green-600 hover:bg-green-700"
                                  >
                                    {updating === request.id ? (
                                      <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                        Approving...
                                      </>
                                    ) : (
                                      <>
                                        <CheckCircle className="h-4 w-4 mr-2" />
                                        Approve Request
                                      </>
                                    )}
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          )}

                          {/* Reject Button - Only show for pending requests */}
                          {request.status === "pending" && (
                            <Dialog
                              open={
                                rejectDialogOpen &&
                                selectedRequest?.id === request.id
                              }
                              onOpenChange={(open) => {
                                setRejectDialogOpen(open);
                                if (open) setSelectedRequest(request);
                                else {
                                  setSelectedRequest(null);
                                  setReviewNotes("");
                                }
                              }}
                            >
                              <DialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => setSelectedRequest(request)}
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Reject
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>
                                    Reject Discount Request
                                  </DialogTitle>
                                  <DialogDescription>
                                    Are you sure you want to reject discount
                                    request {request.discountId}?
                                  </DialogDescription>
                                </DialogHeader>

                                <div className="space-y-4">
                                  <Alert variant="destructive">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>
                                      This action cannot be undone. The request
                                      will be permanently rejected.
                                    </AlertDescription>
                                  </Alert>

                                  <div className="space-y-2">
                                    <Label htmlFor="rejectNotes">
                                      Rejection Reason (Optional)
                                    </Label>
                                    <Textarea
                                      id="rejectNotes"
                                      value={reviewNotes}
                                      onChange={(e) =>
                                        setReviewNotes(e.target.value)
                                      }
                                      placeholder="Please provide a reason for rejection..."
                                      rows={3}
                                    />
                                  </div>
                                </div>

                                <DialogFooter>
                                  <Button
                                    variant="outline"
                                    onClick={() => setRejectDialogOpen(false)}
                                    disabled={updating === request.id}
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    onClick={handleReject}
                                    disabled={updating === request.id}
                                    variant="destructive"
                                  >
                                    {updating === request.id ? (
                                      <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                        Rejecting...
                                      </>
                                    ) : (
                                      <>
                                        <XCircle className="h-4 w-4 mr-2" />
                                        Reject Request
                                      </>
                                    )}
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
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

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold mt-1">
                  {
                    discountRequests.filter((r) => r.status === "pending")
                      .length
                  }
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Approved</p>
                <p className="text-2xl font-bold mt-1">
                  {
                    discountRequests.filter((r) => r.status === "approved")
                      .length
                  }
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Rejected</p>
                <p className="text-2xl font-bold mt-1">
                  {
                    discountRequests.filter((r) => r.status === "rejected")
                      .length
                  }
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Amount
                </p>
                <p className="text-2xl font-bold mt-1">
                  {formatCurrency(
                    discountRequests.reduce(
                      (sum, req) => sum + (req.requestedAmount || 0),
                      0,
                    ),
                  )}
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
