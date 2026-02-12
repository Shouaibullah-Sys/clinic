"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import {
  FileText,
  Pill,
  TestTube,
  Activity,
  Calendar,
  Eye,
  ChevronRight,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { AppointmentRecordDialog } from "./AppointmentRecordDialog";

interface VisitSummary {
  appointment: {
    _id: string;
    appointmentId: string;
    date: string;
    startTime: string;
    endTime: string;
    status: string;
    reason: string;
    priority: string;
    notes?: string;
  };
  records: {
    medical: Array<{
      _id: string;
      recordId: string;
      date: string;
      diagnosis: string;
    }>;
    prescriptions: Array<{
      _id: string;
      prescriptionId: string;
      date: string;
      medications: Array<{ name: string }>;
    }>;
    labTests: Array<{
      _id: string;
      testId: string;
      testName: string;
      status: string;
    }>;
    imaging: Array<{
      _id: string;
      serviceId: string;
      serviceType: string;
      bodyPart: string;
      status: string;
    }>;
  };
  summary: {
    hasMedicalRecord: boolean;
    hasPrescription: boolean;
    hasLabTest: boolean;
    hasImaging: boolean;
    totalRecords: number;
  };
}

interface PatientVisitsOverviewProps {
  patientId: string;
  patientName: string;
}

export function PatientVisitsOverview({
  patientId,
  patientName,
}: PatientVisitsOverviewProps) {
  const { accessToken } = useAuthStore();
  const [visits, setVisits] = useState<VisitSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVisits = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/doctor/patients/${patientId}/visits`, {
          headers: {
            "Content-Type": "application/json",
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
        });

        if (!res.ok) {
          throw new Error("Failed to fetch visits");
        }

        const data = await res.json();
        if (data.success) {
          setVisits(data.data);
        }
      } catch (err: any) {
        console.error("Error fetching visits:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchVisits();
  }, [patientId, accessToken]);

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), "MMM d, yyyy h:mm a");
    } catch {
      return "Invalid date";
    }
  };

  const formatDateOnly = (dateString: string) => {
    try {
      return format(parseISO(dateString), "MMM d, yyyy");
    } catch {
      return "Invalid date";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge variant="default">Completed</Badge>;
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Cancelled</Badge>;
      case "in-progress":
        return <Badge variant="outline">In Progress</Badge>;
      case "checked-in":
        return <Badge variant="outline">Checked In</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">
            Error loading visits: {error}
          </p>
        </CardContent>
      </Card>
    );
  }

  // Calculate summary stats
  const totalVisits = visits.length;
  const totalMedicalRecords = visits.reduce(
    (sum, v) => sum + v.records.medical.length,
    0,
  );
  const totalPrescriptions = visits.reduce(
    (sum, v) => sum + v.records.prescriptions.length,
    0,
  );
  const totalLabTests = visits.reduce(
    (sum, v) => sum + v.records.labTests.length,
    0,
  );
  const totalImaging = visits.reduce(
    (sum, v) => sum + v.records.imaging.length,
    0,
  );

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold">{totalVisits}</p>
              <p className="text-sm text-muted-foreground">Total Visits</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">
                {totalMedicalRecords}
              </p>
              <p className="text-sm text-muted-foreground">Medical Records</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">
                {totalPrescriptions}
              </p>
              <p className="text-sm text-muted-foreground">Prescriptions</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">
                {totalLabTests}
              </p>
              <p className="text-sm text-muted-foreground">Lab Tests</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-teal-600">{totalImaging}</p>
              <p className="text-sm text-muted-foreground">Imaging</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Visits Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Visit History - All Appointments with Records
          </CardTitle>
        </CardHeader>
        <CardContent>
          {visits.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-lg font-semibold mb-2">No Visits Found</h3>
              <p className="text-gray-500">
                This patient has no appointments with records yet.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Appointment</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Medical Record</TableHead>
                  <TableHead>Medicines</TableHead>
                  <TableHead>Lab Tests</TableHead>
                  <TableHead>Imaging</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visits.map((visit) => (
                  <TableRow key={visit.appointment._id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {visit.appointment.appointmentId}
                        </p>
                        <div className="flex gap-1 mt-1">
                          {getStatusBadge(visit.appointment.status)}
                          <Badge variant="outline" className="capitalize">
                            {visit.appointment.priority}
                          </Badge>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">
                        {formatDate(visit.appointment.date)}
                      </p>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      <p className="text-sm">{visit.appointment.reason}</p>
                    </TableCell>
                    <TableCell>
                      {visit.records.medical.length > 0 ? (
                        <Badge className="bg-blue-500">
                          <FileText className="h-3 w-3 mr-1" />
                          {visit.records.medical.length}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {visit.records.prescriptions.length > 0 ? (
                        <Badge className="bg-purple-500">
                          <Pill className="h-3 w-3 mr-1" />
                          {visit.records.prescriptions.length}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {visit.records.labTests.length > 0 ? (
                        <Badge className="bg-orange-500">
                          <TestTube className="h-3 w-3 mr-1" />
                          {visit.records.labTests.length}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {visit.records.imaging.length > 0 ? (
                        <Badge className="bg-teal-500">
                          <Activity className="h-3 w-3 mr-1" />
                          {visit.records.imaging.length}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <AppointmentRecordDialog
                        visit={visit as any}
                        trigger={
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-1" />
                            View Details
                          </Button>
                        }
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
