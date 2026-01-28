'use client';

// app/radiology/imaging/radiologist/page.tsx
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, RefreshCw, FileText, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { toast } from "sonner";
import { RadiologistRequestsTable } from "@/components/radiologist/RadiologistRequestsTable";
import { AddTestsDialog } from "@/components/radiologist/AddTestsDialog";
import { SubmitResultsDialog } from "@/components/radiologist/SubmitResultsDialog";

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
}

export default function RadiologistDashboardPage() {
  const [activeTab, setActiveTab] = useState("pending");
  const [filters, setFilters] = useState({
    status: "",
    priority: "",
    search: "",
  });
  const [requests, setRequests] = useState<RadiologyRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<RadiologyRequest | null>(null);
  const [showAddTestsDialog, setShowAddTestsDialog] = useState(false);
  const [showSubmitResultsDialog, setShowSubmitResultsDialog] = useState(false);
  const { accessToken } = useAuthStore();

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        tab: activeTab,
        ...(filters.status && filters.status !== "all" && { status: filters.status }),
        ...(filters.priority && filters.priority !== "all" && { priority: filters.priority }),
      });

      const response = await fetch(`/api/radiologist/requests?${queryParams}`, {
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
  }, [activeTab, filters.status, filters.priority]);

  const handleStartRequest = async (requestId: string) => {
    try {
      const response = await fetch(`/api/radiologist/requests/${requestId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ status: "in-progress" }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to start request");
      }

      if (result.success) {
        toast.success("Request Started", {
          description: "The radiology request has been marked as in-progress",
        });
        fetchRequests();
      }
    } catch (error: any) {
      console.error("Error starting request:", error);
      toast.error("Failed to Start Request", {
        description: error.message || "An error occurred while starting the request",
      });
    }
  };

  const handleCompleteRequest = async (requestId: string) => {
    try {
      const response = await fetch(`/api/radiologist/requests/${requestId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ status: "completed" }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to complete request");
      }

      if (result.success) {
        toast.success("Request Completed", {
          description: "The radiology request has been completed",
        });
        fetchRequests();
      }
    } catch (error: any) {
      console.error("Error completing request:", error);
      toast.error("Failed to Complete Request", {
        description: error.message || "An error occurred while completing the request",
      });
    }
  };

  const handleAddTests = (request: RadiologyRequest) => {
    setSelectedRequest(request);
    setShowAddTestsDialog(true);
  };

  const handleSubmitResults = (request: RadiologyRequest) => {
    setSelectedRequest(request);
    setShowSubmitResultsDialog(true);
  };

  const handleTestsAdded = () => {
    setShowAddTestsDialog(false);
    setSelectedRequest(null);
    fetchRequests();
    toast.success("Tests Added", {
      description: "Tests and parameters have been added successfully",
    });
  };

  const handleResultsSubmitted = () => {
    setShowSubmitResultsDialog(false);
    setSelectedRequest(null);
    fetchRequests();
    toast.success("Results Submitted", {
      description: "Radiology results have been submitted successfully",
    });
  };

  // Calculate stats
  const pendingCount = requests.filter(r => r.status === "scheduled").length;
  const inProgressCount = requests.filter(r => r.status === "in-progress").length;
  const completedCount = requests.filter(r => r.reportStatus === "completed").length;
  const unpaidCount = requests.filter(r => r.billingStatus === "pending").length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Radiologist Dashboard</h1>
            <p className="text-muted-foreground">
              Manage radiology requests, add tests, and submit results
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
                <p className="text-sm font-medium text-muted-foreground">Pending Requests</p>
                <p className="text-2xl font-bold">{pendingCount}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </div>

          <div className="bg-card rounded-lg border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold">{inProgressCount}</p>
              </div>
              <RefreshCw className="h-8 w-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-card rounded-lg border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completed Reports</p>
                <p className="text-2xl font-bold">{completedCount}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </div>

          <div className="bg-card rounded-lg border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Unpaid Requests</p>
                <p className="text-2xl font-bold">{unpaidCount}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="in-progress">In Progress</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
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
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <TabsContent value={activeTab} className="space-y-4">
            <RadiologistRequestsTable
              requests={requests}
              loading={loading}
              searchQuery={filters.search}
              onStartRequest={handleStartRequest}
              onCompleteRequest={handleCompleteRequest}
              onAddTests={handleAddTests}
              onSubmitResults={handleSubmitResults}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Tests Dialog */}
      {selectedRequest && (
        <AddTestsDialog
          open={showAddTestsDialog}
          onOpenChange={setShowAddTestsDialog}
          request={selectedRequest}
          onTestsAdded={handleTestsAdded}
        />
      )}

      {/* Submit Results Dialog */}
      {selectedRequest && (
        <SubmitResultsDialog
          open={showSubmitResultsDialog}
          onOpenChange={setShowSubmitResultsDialog}
          request={selectedRequest}
          onResultsSubmitted={handleResultsSubmitted}
        />
      )}
    </DashboardLayout>
  );
}
