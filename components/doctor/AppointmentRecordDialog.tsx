"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileText,
  Pill,
  TestTube,
  Activity,
  Calendar,
  Eye,
} from "lucide-react";
import { format, parseISO } from "date-fns";

interface MedicalRecord {
  _id: string;
  recordId: string;
  date: string;
  diagnosis: string;
  symptoms: string[];
  notes?: string;
  vitals?: {
    bloodPressure?: { systolic: number; diastolic: number };
    heartRate?: number;
    temperature?: number;
    weight?: number;
    height?: number;
    bmi?: number;
  };
  doctor?: {
    name: string;
    specialization: string;
  };
  followUpDate?: string;
  admitted?: boolean;
}

interface Prescription {
  _id: string;
  prescriptionId: string;
  date: string;
  medications: Array<{
    name: string;
    form: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions: string;
    quantity: number;
    price: number;
  }>;
  diagnosis?: string;
  notes?: string;
  status: string;
  paymentStatus: string;
  doctor?: {
    name: string;
    specialization: string;
  };
}

interface LabTest {
  _id: string;
  testId: string;
  testName: string;
  category: string;
  orderedAt: string;
  status: string;
  results?: {
    reportedAt?: string;
    parameters?: Array<{
      name: string;
      value: string;
      unit: string;
      referenceRange: string;
      flag?: string;
    }>;
  };
  orderedBy?: {
    name: string;
  };
}

interface ImagingStudy {
  _id: string;
  serviceId: string;
  serviceType: string;
  bodyPart: string;
  view: string;
  requestDate: string;
  scheduledDate: string;
  performedDate?: string;
  status: string;
  reportStatus: string;
  findings?: string;
  impression?: string;
  referringDoctor?: {
    name: string;
    specialization: string;
  };
}

interface VisitData {
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
    medical: MedicalRecord[];
    prescriptions: Prescription[];
    labTests: LabTest[];
    imaging: ImagingStudy[];
  };
  summary: {
    hasMedicalRecord: boolean;
    hasPrescription: boolean;
    hasLabTest: boolean;
    hasImaging: boolean;
    totalRecords: number;
  };
}

interface AppointmentRecordDialogProps {
  visit: VisitData;
  trigger?: React.ReactNode;
}

export function AppointmentRecordDialog({
  visit,
  trigger,
}: AppointmentRecordDialogProps) {
  const [open, setOpen] = useState(false);

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
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPaymentBadge = (status: string) => {
    switch (status) {
      case "paid":
      case "verified":
        return <Badge className="bg-green-500">Paid</Badge>;
      case "partial":
        return <Badge variant="secondary">Partial</Badge>;
      case "unpaid":
        return <Badge variant="destructive">Unpaid</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const { appointment, records, summary } = visit;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Eye className="h-4 w-4 mr-2" />
            View Details
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-[90vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Calendar className="h-5 w-5" />
            Visit Details - {appointment.appointmentId}
          </DialogTitle>
          <DialogDescription>
            {formatDate(appointment.date)} • {appointment.reason}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-3 mb-4">
          {getStatusBadge(appointment.status)}
          <Badge variant="outline" className="capitalize">
            {appointment.priority}
          </Badge>
          {summary.hasMedicalRecord && (
            <Badge className="bg-blue-500">
              <FileText className="h-3 w-3 mr-1" />
              Medical Record
            </Badge>
          )}
          {summary.hasPrescription && (
            <Badge className="bg-purple-500">
              <Pill className="h-3 w-3 mr-1" />
              Prescription
            </Badge>
          )}
          {summary.hasLabTest && (
            <Badge className="bg-orange-500">
              <TestTube className="h-3 w-3 mr-1" />
              Lab Test
            </Badge>
          )}
          {summary.hasImaging && (
            <Badge className="bg-teal-500">
              <Activity className="h-3 w-3 mr-1" />
              Imaging
            </Badge>
          )}
        </div>

        <Tabs defaultValue="medical" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="medical">
              <FileText className="h-4 w-4 mr-2" />
              Medical ({records.medical.length})
            </TabsTrigger>
            <TabsTrigger value="prescriptions">
              <Pill className="h-4 w-4 mr-2" />
              Medicines ({records.prescriptions.length})
            </TabsTrigger>
            <TabsTrigger value="lab">
              <TestTube className="h-4 w-4 mr-2" />
              Lab ({records.labTests.length})
            </TabsTrigger>
            <TabsTrigger value="imaging">
              <Activity className="h-4 w-4 mr-2" />
              Imaging ({records.imaging.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="medical" className="space-y-4 mt-4">
            {records.medical.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No medical records</p>
              </div>
            ) : (
              records.medical.map((record) => (
                <Card key={record._id}>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">
                          {record.recordId}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {formatDateOnly(record.date)} • Dr.{" "}
                          {record.doctor?.name}
                        </p>
                      </div>
                      {record.admitted && (
                        <Badge variant="destructive">Admitted</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-medium">Diagnosis</h4>
                      <p>{record.diagnosis}</p>
                    </div>
                    {record.symptoms && record.symptoms.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">Symptoms</h4>
                        <div className="flex flex-wrap gap-2">
                          {record.symptoms.map((s, i) => (
                            <Badge key={i} variant="outline">
                              {s}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {record.vitals && (
                      <div>
                        <h4 className="font-medium mb-2">Vital Signs</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          {record.vitals.bloodPressure && (
                            <div>
                              <span className="text-muted-foreground">BP</span>
                              <p className="font-medium">
                                {record.vitals.bloodPressure.systolic}/
                                {record.vitals.bloodPressure.diastolic}
                              </p>
                            </div>
                          )}
                          {record.vitals.heartRate && (
                            <div>
                              <span className="text-muted-foreground">HR</span>
                              <p className="font-medium">
                                {record.vitals.heartRate} bpm
                              </p>
                            </div>
                          )}
                          {record.vitals.temperature && (
                            <div>
                              <span className="text-muted-foreground">
                                Temp
                              </span>
                              <p className="font-medium">
                                {record.vitals.temperature}°C
                              </p>
                            </div>
                          )}
                          {record.vitals.weight && (
                            <div>
                              <span className="text-muted-foreground">
                                Weight
                              </span>
                              <p className="font-medium">
                                {record.vitals.weight} kg
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="prescriptions" className="space-y-4 mt-4">
            {records.prescriptions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Pill className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No prescriptions</p>
              </div>
            ) : (
              records.prescriptions.map((rx) => (
                <Card key={rx._id}>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">
                          {rx.prescriptionId}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {formatDateOnly(rx.date)} • Dr. {rx.doctor?.name}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {getPaymentBadge(rx.paymentStatus)}
                        <Badge variant="outline">{rx.status}</Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Medicine</TableHead>
                          <TableHead>Dosage</TableHead>
                          <TableHead>Frequency</TableHead>
                          <TableHead>Duration</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rx.medications.map((med, idx) => (
                          <TableRow key={idx}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{med.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {med.form}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>{med.dosage}</TableCell>
                            <TableCell>{med.frequency}</TableCell>
                            <TableCell>{med.duration}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="lab" className="space-y-4 mt-4">
            {records.labTests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <TestTube className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No lab tests</p>
              </div>
            ) : (
              records.labTests.map((test) => (
                <Card key={test._id}>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">
                          {test.testName}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {test.testId} • {formatDateOnly(test.orderedAt)}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {getStatusBadge(test.status)}
                        <Badge variant="outline">{test.category}</Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {test.results?.parameters &&
                      test.results.parameters.length > 0 && (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Parameter</TableHead>
                              <TableHead>Value</TableHead>
                              <TableHead>Reference</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {test.results.parameters.map((param, idx) => (
                              <TableRow key={idx}>
                                <TableCell>{param.name}</TableCell>
                                <TableCell>
                                  {param.value} {param.unit}
                                </TableCell>
                                <TableCell>{param.referenceRange}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="imaging" className="space-y-4 mt-4">
            {records.imaging.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No imaging studies</p>
              </div>
            ) : (
              records.imaging.map((img) => (
                <Card key={img._id}>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg capitalize">
                          {img.serviceType.replace("-", " ")} - {img.bodyPart}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {img.serviceId} • {formatDateOnly(img.requestDate)}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {getStatusBadge(img.status)}
                        <Badge variant="outline">{img.reportStatus}</Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">View</span>
                        <p className="font-medium">{img.view}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Scheduled</span>
                        <p className="font-medium">
                          {formatDateOnly(img.scheduledDate)}
                        </p>
                      </div>
                    </div>
                    {img.findings && (
                      <div className="mt-4">
                        <h4 className="font-medium">Findings</h4>
                        <p className="text-sm">{img.findings}</p>
                      </div>
                    )}
                    {img.impression && (
                      <div className="mt-4">
                        <h4 className="font-medium">Impression</h4>
                        <p className="text-sm">{img.impression}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
