// app/admissions/[id]/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { format } from "date-fns";
import {
  ArrowLeft,
  Calendar,
  User,
  Stethoscope,
  Bed,
  Activity,
  Heart,
  Thermometer,
  Wind,
  Droplet,
  Pill,
  FileText,
  Edit,
  Printer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface AdmissionDetails {
  _id: string;
  admissionId: string;
  patient: {
    _id: string;
    patientId: string;
    name: string;
    age: number;
    gender: string;
    phone: string;
    address?: string;
    emergencyContact?: {
      name: string;
      phone: string;
      relationship: string;
    };
  };
  doctor: {
    _id: string;
    name: string;
    email: string;
    phone: string;
    specialization?: string;
  };
  admissionDate: string;
  dischargeDate?: string;
  expectedStay: number;
  reason: string;
  diagnosis: string;
  ward: string;
  bedNumber: string;
  roomType: string;
  status: string;
  vitalSigns: Array<{
    _id: string;
    date: string;
    bloodPressure?: { systolic: number; diastolic: number };
    heartRate?: number;
    temperature?: number;
    respiratoryRate?: number;
    oxygenSaturation?: number;
    recordedBy?: string;
  }>;
  treatments: Array<{
    _id: string;
    date: string;
    treatment: string;
    administeredBy: {
      _id: string;
      name: string;
      role: string;
    };
    notes?: string;
  }>;
  notes?: string;
  dischargeSummary?: string;
  followUpDate?: string;
  createdAt: string;
  updatedAt: string;
}

export default function AdmissionDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, accessToken } = useAuthStore();
  const [admission, setAdmission] = useState<AdmissionDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id && accessToken) {
      loadAdmission();
    }
  }, [id, accessToken]);

  const loadAdmission = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admissions/${id}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAdmission(data.data);
      } else {
        toast.error("Failed to load admission details");
        router.push("/admissions");
      }
    } catch (error) {
      console.error("Error loading admission:", error);
      toast.error("Failed to load admission details");
      router.push("/admissions");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "admitted":
        return "bg-green-100 text-green-800";
      case "discharged":
        return "bg-blue-100 text-blue-800";
      case "transferred":
        return "bg-yellow-100 text-yellow-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getRoomTypeLabel = (roomType: string) => {
    switch (roomType) {
      case "general":
        return "General";
      case "private":
        return "Private";
      case "semi-private":
        return "Semi-Private";
      case "icu":
        return "ICU";
      case "emergency":
        return "Emergency";
      default:
        return roomType;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p>Loading admission details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!admission) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h3 className="text-lg font-semibold">Admission not found</h3>
          <p className="text-gray-500">The requested admission could not be found</p>
          <Button onClick={() => router.push("/admissions")} className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Admissions
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.push("/admissions")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Admission: {admission.admissionId}
            </h1>
            <p className="text-gray-500">
              {admission.patient.name} • {admission.ward} • Bed {admission.bedNumber}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={`${getStatusColor(admission.status)} text-sm px-3 py-1`}>
            {admission.status.charAt(0).toUpperCase() + admission.status.slice(1)}
          </Badge>
          <Button variant="outline" size="sm">
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          {(user?.role === "admin" || user?.role === "doctor") && (
            <Button
              size="sm"
              onClick={() => router.push(`/admissions/${id}/edit`)}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="vitals">Vital Signs</TabsTrigger>
          <TabsTrigger value="treatments">Treatments</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Patient Info Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Patient Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-semibold">{admission.patient.name}</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-500">Patient ID:</span>
                      <div className="font-medium">{admission.patient.patientId}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">Age/Gender:</span>
                      <div className="font-medium">
                        {admission.patient.age}y • {admission.patient.gender}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500">Phone:</span>
                      <div className="font-medium">{admission.patient.phone}</div>
                    </div>
                    {admission.patient.emergencyContact && (
                      <div className="col-span-2">
                        <span className="text-gray-500">Emergency Contact:</span>
                        <div className="font-medium">
                          {admission.patient.emergencyContact.name}
                        </div>
                        <div className="text-sm">
                          {admission.patient.emergencyContact.phone} •{" "}
                          {admission.patient.emergencyContact.relationship}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Admission Details Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <Bed className="h-5 w-5" />
                  Admission Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-500">Ward:</span>
                      <div className="font-medium">{admission.ward}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">Bed:</span>
                      <div className="font-medium">{admission.bedNumber}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">Room Type:</span>
                      <div className="font-medium">
                        {getRoomTypeLabel(admission.roomType)}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500">Expected Stay:</span>
                      <div className="font-medium">{admission.expectedStay} days</div>
                    </div>
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-500">Admission Date:</span>
                    <div className="font-medium">
                      {format(new Date(admission.admissionDate), "dd/MM/yyyy hh:mm a")}
                    </div>
                  </div>
                  {admission.dischargeDate && (
                    <div className="text-sm">
                      <span className="text-gray-500">Discharge Date:</span>
                      <div className="font-medium">
                        {format(new Date(admission.dischargeDate), "dd/MM/yyyy hh:mm a")}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Doctor Information Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <Stethoscope className="h-5 w-5" />
                  Attending Doctor
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-semibold">
                    {admission.doctor?.name 
                      ? admission.doctor.name 
                      : admission.doctor 
                        ? admission.doctor.toString() 
                        : 'Doctor not assigned'
                    }
                  </h4>
                  <div className="space-y-1 text-sm">
                    {admission.doctor.specialization && (
                      <div>
                        <span className="text-gray-500">Specialization:</span>
                        <div className="font-medium">
                          {admission.doctor.specialization}
                        </div>
                      </div>
                    )}
                    <div>
                      <span className="text-gray-500">Contact:</span>
                      <div className="font-medium">{admission.doctor.phone}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">Email:</span>
                      <div className="font-medium">{admission.doctor.email}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Medical Information */}
          <Card>
            <CardHeader>
              <CardTitle>Medical Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-semibold mb-2">Reason for Admission</h4>
                <p className="text-gray-700 whitespace-pre-wrap">{admission.reason}</p>
              </div>
              <Separator />
              <div>
                <h4 className="font-semibold mb-2">Diagnosis</h4>
                <p className="text-gray-700 whitespace-pre-wrap">{admission.diagnosis}</p>
              </div>
              {admission.notes && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-semibold mb-2">Notes</h4>
                    <p className="text-gray-700 whitespace-pre-wrap">{admission.notes}</p>
                  </div>
                </>
              )}
              {admission.dischargeSummary && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-semibold mb-2">Discharge Summary</h4>
                    <p className="text-gray-700 whitespace-pre-wrap">
                      {admission.dischargeSummary}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Vital Signs Tab */}
        <TabsContent value="vitals">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Vital Signs History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {admission.vitalSigns.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No vital signs recorded yet
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Blood Pressure</TableHead>
                      <TableHead>Heart Rate</TableHead>
                      <TableHead>Temperature</TableHead>
                      <TableHead>Respiratory Rate</TableHead>
                      <TableHead>O₂ Saturation</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {admission.vitalSigns.map((vital, index) => (
                      <TableRow key={vital._id || index}>
                        <TableCell>
                          {format(new Date(vital.date), "dd/MM/yyyy hh:mm a")}
                        </TableCell>
                        <TableCell>
                          {vital.bloodPressure
                            ? `${vital.bloodPressure.systolic}/${vital.bloodPressure.diastolic}`
                            : "N/A"}
                        </TableCell>
                        <TableCell>
                          {vital.heartRate ? `${vital.heartRate} bpm` : "N/A"}
                        </TableCell>
                        <TableCell>
                          {vital.temperature ? `${vital.temperature}°F` : "N/A"}
                        </TableCell>
                        <TableCell>
                          {vital.respiratoryRate
                            ? `${vital.respiratoryRate} breaths/min`
                            : "N/A"}
                        </TableCell>
                        <TableCell>
                          {vital.oxygenSaturation
                            ? `${vital.oxygenSaturation}%`
                            : "N/A"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Treatments Tab */}
        <TabsContent value="treatments">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Pill className="h-5 w-5" />
                Treatment History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {admission.treatments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No treatments recorded yet
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Treatment</TableHead>
                      <TableHead>Administered By</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {admission.treatments.map((treatment, index) => (
                      <TableRow key={treatment._id || index}>
                        <TableCell>
                          {format(new Date(treatment.date), "dd/MM/yyyy hh:mm a")}
                        </TableCell>
                        <TableCell className="font-medium">
                          {treatment.treatment}
                        </TableCell>
                        <TableCell>{treatment.administeredBy.name}</TableCell>
                        <TableCell className="text-gray-500">
                          {treatment.notes || "No notes"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}