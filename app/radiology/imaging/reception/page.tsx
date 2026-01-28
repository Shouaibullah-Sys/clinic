'use client';

// app/radiology/imaging/reception/page.tsx
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, RefreshCw, FileText, Clock, CheckCircle, DollarSign } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { toast } from "sonner";
import { ReceptionistRadiologyTable } from "@/components/receptionist/ReceptionistRadiologyTable";
import { PaymentProcessingDialog } from "@/components/receptionist/PaymentProcessingDialog";
import { BillingDetailsDialog } from "@/components/receptionist/BillingDetailsDialog";

interface RadiologyRequest {
  _id: string;
  serviceId: string;
  serviceType: string;
  bodyPart: string;
  view: string;
  patient: {
    _id: string;
    name: string;
    patientId: string;
    phone?: string;
  };
  referringDoctor: {
    _id: string;
    name: string;
    specialization?: string;
  };
  radiologist?: {
    _id: string;
    name: string;
  };
  status: string;
  reportStatus: string;
  billingStatus: string;
  priority: string;
  requestDate: string;
  scheduledDate: string;
  performedDate?: string;
  contrastUsed?: boolean;
  contrastType?: string;
  notes?: string;
  findings?: string;
  impression?: string;
  recommendations?: string;
  pricing?: {
    basePrice: number;
    contrastPrice: number;
  };
}

export default function ReceptionistRadiologyPage() {
  const [activeTab, setActiveTab] = useState("pending");
  const [filters, setFilters] = useState({
    status: "",
    priority: "",
    billingStatus: "",
    search: "",
  });
  const [requests, setRequests] = useState<RadiologyRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<RadiologyRequest | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showBillingDialog, setShowBillingDialog] = useState(false);
  const { accessToken } = useAuthStore();

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        tab: activeTab,
        ...(filters.status && filters.status !== "all" && { status: filters.status }),
        ...(filters.priority && filters.priority !== "all" && { priority: filters.priority }),
        ...(filters.billingStatus && filters.billingStatus !== "all" && { billingStatus: filters.billingStatus }),
      });

      const response = await fetch(`/api/reception/radiology/requests?${queryParams}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch requests");
      }

      if (result.success) {
        setRequests(result.data);
      }
    } catch (error: any) {
      console.error("Error fetching requests:", error);
      toast.error("Failed to Load Requests", {
        description: error.message || "An error occurred while fetching requests",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [activeTab, filters.status, filters.priority, filters.billingStatus]);

  const handleProcessPayment = (request: RadiologyRequest) => {
    setSelectedRequest(request);
    setShowPaymentDialog(true);
  };

  const handleViewBilling = async (request: RadiologyRequest) => {
    try {
      const response = await fetch(`/api/reception/radiology/requests/${request._id}/payment`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch billing details");
      }

      if (result.success) {
        setSelectedRequest(result.data);
        setShowBillingDialog(true);
      }
    } catch (error: any) {
      console.error("Error fetching billing details:", error);
      toast.error("Failed to Load Billing Details", {
        description: error.message || "An error occurred while fetching billing details",
      });
    }
  };

  const handlePaymentProcessed = () => {
    setShowPaymentDialog(false);
    setSelectedRequest(null);
    fetchRequests();
    toast.success("Payment Processed", {
      description: "Payment status has been updated successfully",
    });
  };

  // Calculate stats
  const pendingCount = requests.filter(r => r.billingStatus === "pending").length;
  const billedCount = requests.filter(r => r.billingStatus === "billed").length;
  const paidCount = requests.filter(r => r.billingStatus === "paid").length;
  const totalRevenue = requests
    .filter(r => r.billingStatus === "paid")
    .reduce((sum, r) => sum + (r.pricing?.basePrice || 0) + (r.contrastUsed ? (r.pricing?.contrastPrice || 0) : 0), 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Radiology Payment Processing</h1>
            <p className="text-muted-foreground">
              Manage radiology service payments and billing
            </p>
          </div>
          <Button onClick={fetchRequests} disabled={loading} variant="outline">
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-card rounded-lg border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Payments</p>
                <p className="text-2xl font-bold">{pendingCount}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </div>

          <div className="bg-card rounded-lg border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Billed</p>
                <p className="text-2xl font-bold">{billedCount}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-card rounded-lg border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Paid</p>
                <p className="text-2xl font-bold">{paidCount}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </div>

          <div className="bg-card rounded-lg border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">${totalRevenue.toLocaleString()}</p>
              </div>
              <DollarSign className="h-8 w-8 text-emerald-500" />
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="billed">Billed</TabsTrigger>
              <TabsTrigger value="paid">Paid</TabsTrigger>
              <TabsTrigger value="all">All Requests</TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <FileText className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search patients, service types, body parts..."
                  className="pl-10"
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select
                value={filters.status}
                onValueChange={(value) => setFilters({ ...filters, status: value })}
              >
                <SelectTrigger className="w-35">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={filters.priority}
                onValueChange={(value) => setFilters({ ...filters, priority: value })}
              >
                <SelectTrigger className="w-35">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="routine">Routine</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="emergency">Emergency</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={filters.billingStatus}
                onValueChange={(value) => setFilters({ ...filters, billingStatus: value })}
              >
                <SelectTrigger className="w-35">
                  <SelectValue placeholder="Billing" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Billing</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="billed">Billed</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <TabsContent value={activeTab} className="space-y-4">
            <ReceptionistRadiologyTable
              requests={requests}
              loading={loading}
              searchQuery={filters.search}
              onProcessPayment={handleProcessPayment}
              onViewBilling={handleViewBilling}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Payment Processing Dialog */}
      {selectedRequest && (
        <PaymentProcessingDialog
          open={showPaymentDialog}
          onOpenChange={setShowPaymentDialog}
          request={selectedRequest}
          onPaymentProcessed={handlePaymentProcessed}
        />
      )}

      {/* Billing Details Dialog */}
      {selectedRequest && (
        <BillingDetailsDialog
          open={showBillingDialog}
          onOpenChange={setShowBillingDialog}
          request={selectedRequest}
        />
      )}
    </DashboardLayout>
  );
}
