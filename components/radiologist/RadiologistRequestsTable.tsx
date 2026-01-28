// app/components/radiologist/RadiologistRequestsTable.tsx

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Play, CheckCircle, FileText, Plus, Eye } from "lucide-react";
import { format } from "date-fns";

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

interface RadiologistRequestsTableProps {
  requests: RadiologyRequest[];
  loading: boolean;
  searchQuery: string;
  onStartRequest: (requestId: string) => void;
  onCompleteRequest: (requestId: string) => void;
  onAddTests: (request: RadiologyRequest) => void;
  onSubmitResults: (request: RadiologyRequest) => void;
}

export function RadiologistRequestsTable({
  requests,
  loading,
  searchQuery,
  onStartRequest,
  onCompleteRequest,
  onAddTests,
  onSubmitResults,
}: RadiologistRequestsTableProps) {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // Filter requests based on search query
  const filteredRequests = requests.filter((request) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      request.patient.name.toLowerCase().includes(query) ||
      request.patient.patientId.toLowerCase().includes(query) ||
      request.serviceType.toLowerCase().includes(query) ||
      request.bodyPart.toLowerCase().includes(query) ||
      request.serviceId.toLowerCase().includes(query)
    );
  });

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      scheduled: { label: "Scheduled", variant: "secondary" },
      "in-progress": { label: "In Progress", variant: "default" },
      completed: { label: "Completed", variant: "outline" },
      cancelled: { label: "Cancelled", variant: "destructive" },
    };
    const config = statusConfig[status] || { label: status, variant: "secondary" as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const priorityConfig: Record<string, { label: string; className: string }> = {
      routine: { label: "Routine", className: "bg-gray-100 text-gray-800" },
      urgent: { label: "Urgent", className: "bg-orange-100 text-orange-800" },
      emergency: { label: "Emergency", className: "bg-red-100 text-red-800" },
    };
    const config = priorityConfig[priority] || { label: priority, className: "bg-gray-100 text-gray-800" };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const getBillingStatusBadge = (billingStatus: string) => {
    const billingConfig: Record<string, { label: string; className: string }> = {
      pending: { label: "Pending", className: "bg-yellow-100 text-yellow-800" },
      billed: { label: "Billed", className: "bg-blue-100 text-blue-800" },
      paid: { label: "Paid", className: "bg-green-100 text-green-800" },
    };
    const config = billingConfig[billingStatus] || { label: billingStatus, className: "bg-gray-100 text-gray-800" };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const getServiceTypeLabel = (serviceType: string) => {
    const labels: Record<string, string> = {
      "x-ray": "X-Ray",
      "ct-scan": "CT Scan",
      mri: "MRI",
      ultrasound: "Ultrasound",
    };
    return labels[serviceType] || serviceType;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading requests...</p>
        </div>
      </div>
    );
  }

  if (filteredRequests.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No radiology requests found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Service ID</TableHead>
            <TableHead>Patient</TableHead>
            <TableHead>Service Type</TableHead>
            <TableHead>Body Part</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Billing</TableHead>
            <TableHead>Scheduled Date</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredRequests.map((request) => (
            <>
              <TableRow key={request._id} className="cursor-pointer hover:bg-muted/50">
                <TableCell className="font-medium">{request.serviceId}</TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">{request.patient.name}</div>
                    <div className="text-sm text-muted-foreground">{request.patient.patientId}</div>
                  </div>
                </TableCell>
                <TableCell>{getServiceTypeLabel(request.serviceType)}</TableCell>
                <TableCell>
                  <div>
                    <div>{request.bodyPart}</div>
                    <div className="text-sm text-muted-foreground">{request.view}</div>
                  </div>
                </TableCell>
                <TableCell>{getPriorityBadge(request.priority)}</TableCell>
                <TableCell>{getStatusBadge(request.status)}</TableCell>
                <TableCell>{getBillingStatusBadge(request.billingStatus)}</TableCell>
                <TableCell>
                  {format(new Date(request.scheduledDate), "MMM dd, yyyy HH:mm")}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setExpandedRow(expandedRow === request._id ? null : request._id)}>
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </DropdownMenuItem>
                      {request.status === "scheduled" && (
                        <DropdownMenuItem onClick={() => onStartRequest(request._id)}>
                          <Play className="mr-2 h-4 w-4" />
                          Start Request
                        </DropdownMenuItem>
                      )}
                      {(request.status === "scheduled" || request.status === "in-progress") && (
                        <DropdownMenuItem onClick={() => onAddTests(request)}>
                          <Plus className="mr-2 h-4 w-4" />
                          Add Tests/Parameters
                        </DropdownMenuItem>
                      )}
                      {(request.status === "scheduled" || request.status === "in-progress") && (
                        <DropdownMenuItem onClick={() => onSubmitResults(request)}>
                          <FileText className="mr-2 h-4 w-4" />
                          Submit Results
                        </DropdownMenuItem>
                      )}
                      {request.status === "in-progress" && (
                        <DropdownMenuItem onClick={() => onCompleteRequest(request._id)}>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Complete Request
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
              {expandedRow === request._id && (
                <TableRow>
                  <TableCell colSpan={9} className="bg-muted/30">
                    <div className="py-4 px-4 space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Referring Doctor</p>
                          <p className="font-medium">{request.referringDoctor.name}</p>
                          <p className="text-sm text-muted-foreground">{request.referringDoctor.specialization}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Radiologist</p>
                          <p className="font-medium">{request.radiologist?.name || "Not assigned"}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Request Date</p>
                          <p className="font-medium">{format(new Date(request.requestDate), "MMM dd, yyyy HH:mm")}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Contrast Used</p>
                          <p className="font-medium">{request.contrastUsed ? `Yes (${request.contrastType})` : "No"}</p>
                        </div>
                      </div>
                      {request.notes && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Notes</p>
                          <p className="text-sm">{request.notes}</p>
                        </div>
                      )}
                      {request.findings && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Findings</p>
                          <p className="text-sm">{request.findings}</p>
                        </div>
                      )}
                      {request.impression && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Impression</p>
                          <p className="text-sm">{request.impression}</p>
                        </div>
                      )}
                      {request.recommendations && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Recommendations</p>
                          <p className="text-sm">{request.recommendations}</p>
                        </div>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
