  // app/doctor/patients/[id]/page.tsx

  "use client";

  import { useState, useEffect } from "react";
  import { useParams, useRouter } from "next/navigation";
  import { useAuthStore } from "@/store/useAuthStore";
  import { Button } from "@/components/ui/button";
  import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
  import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
  import { Badge } from "@/components/ui/badge";
  import { Separator } from "@/components/ui/separator";
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
  import { Alert, AlertDescription } from "@/components/ui/alert";
  import { Textarea } from "@/components/ui/textarea";
  import { Label } from "@/components/ui/label";
  import { Input } from "@/components/ui/input";
  import {
    User,
    Calendar,
    FileText,
    TestTube,
    Pill,
    Clock,
    Phone,
    Mail,
    CalendarDays,
    Heart,
    Plus,
    Edit,
    Eye,
    Download,
    Printer,
    AlertCircle,
    ChevronLeft,
    Stethoscope,
    Thermometer,
    Weight,
    Ruler,
    PersonStandingIcon,
    } from "lucide-react";
    import { format, parseISO, differenceInYears } from "date-fns";
    import { cn } from "@/lib/utils";
    import { LabTestOrderDialog } from "@/app/components/doctor/LabTestOrderDialog";

  interface Patient {
    _id: string;
    name: string;
    phone: string;
    email?: string;
    patientId: string;
    dateOfBirth: string;
    gender: string;
    bloodGroup?: string;
    allergies?: string[];
    address?: string;
    emergencyContact?: {
      name: string;
      phone: string;
      relationship: string;
    };
    createdAt: string;
    updatedAt: string;
  }

  interface MedicalRecord {
    _id: string;
    recordId: string;
    date: string;
    diagnosis: string;
    symptoms: string[];
    notes: string;
    doctor: {
      name: string;
      specialization: string;
    };
    vitals?: {
      bloodPressure: string;
      heartRate: number;
      temperature: number;
      weight: number;
      height: number;
      bmi: number;
    };
  }

  interface Prescription {
    _id: string;
    prescriptionId: string;
    date: string;
    medications: {
      name: string;
      dosage: string;
      frequency: string;
      duration: string;
      instructions?: string;
    }[];
    diagnosis: string;
    notes?: string;
    status: string;
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
      parameters?: any[];
    };
    doctor: {
      name: string;
    };
  }

  interface Appointment {
    _id: string;
    appointmentId: string;
    date: string;
    startTime: string;
    status: string;
    reason: string;
    priority: string;
    doctorNotes?: string;
  }

export default function DoctorPatientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, accessToken } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [labTests, setLabTests] = useState<LabTest[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  // Get patient ID safely
  const patientId = params.id as string;

  // Redirect if not doctor
  useEffect(() => {
    if (user && user.role !== "doctor") {
      router.push("/unauthorized");
    }
  }, [user, router]);

  // Fetch patient data
  useEffect(() => {
    if (user?.role === "doctor" && accessToken && patientId) {
      fetchPatientData();
    }
  }, [user, accessToken, patientId]);

  const fetchPatientData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch patient details
      const patientRes = await fetch(`/api/patients/${patientId}`, {
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
      });

      if (!patientRes.ok) {
        throw new Error("Failed to fetch patient data");
      }

      const patientData = await patientRes.json();
      if (patientData.success) {
        setPatient(patientData.data);
      }

      // Fetch medical records
      const recordsRes = await fetch(`/api/doctor/patients/${patientId}/medical-records`, {
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
      });

      if (recordsRes.ok) {
        const recordsData = await recordsRes.json();
        if (recordsData.success) {
          setMedicalRecords(recordsData.data);
        }
      }

      // Fetch prescriptions
      const prescriptionsRes = await fetch(`/api/doctor/patients/${patientId}/prescriptions`, {
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
      });

      if (prescriptionsRes.ok) {
        const prescriptionsData = await prescriptionsRes.json();
        if (prescriptionsData.success) {
          setPrescriptions(prescriptionsData.data);
        }
      }

      // Fetch lab tests
      const labTestsRes = await fetch(`/api/doctor/patients/${patientId}/lab-tests`, {
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
      });

      if (labTestsRes.ok) {
        const labTestsData = await labTestsRes.json();
        if (labTestsData.success) {
          setLabTests(labTestsData.data);
        }
      }

      // Fetch appointments
      const appointmentsRes = await fetch(`/api/doctor/patients/${patientId}/appointments`, {
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
      });

      if (appointmentsRes.ok) {
        const appointmentsData = await appointmentsRes.json();
        if (appointmentsData.success) {
          setAppointments(appointmentsData.data);
        }
      }

    } catch (error) {
      console.error("Error fetching patient data:", error);
      setError("Failed to load patient information");
    } finally {
      setLoading(false);
    }
  };

  const handleTestOrdered = async () => {
    try {
      const labTestsRes = await fetch(`/api/doctor/patients/${patientId}/lab-tests`, {
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
      });

      if (labTestsRes.ok) {
        const labTestsData = await labTestsRes.json();
        if (labTestsData.success) {
          setLabTests(labTestsData.data);
        }
      }
    } catch (error) {
      console.error("Error refetching lab tests:", error);
    }
  };

  const calculateAge = (dateOfBirth: string) => {
    try {
      return differenceInYears(new Date(), parseISO(dateOfBirth));
    } catch {
      return "N/A";
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

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), "MMM d, yyyy");
    } catch {
      return "Invalid date";
    }
  };

  const formatDateTime = (dateString: string) => {
    try {
      return format(parseISO(dateString), "MMM d, yyyy h:mm a");
    } catch {
      return "Invalid date";
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" size="icon" onClick={() => router.push("/doctor/patients")}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Patient Details</h1>
            <p className="text-gray-500">Error loading patient information</p>
          </div>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error || "Patient not found"}</AlertDescription>
        </Alert>
        <Button onClick={() => router.push("/doctor/patients")} className="mt-4">
          Back to Patients
        </Button>
      </div>
    );
  }

  const age = calculateAge(patient.dateOfBirth);

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.push("/doctor/patients")}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Patient Details</h1>
            <p className="text-muted-foreground">
              {patient?.name} - {patient?.patientId}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button onClick={() => router.push(`/doctor/patients/${patientId}/medical-record/new`)}>
            <Plus className="h-4 w-4 mr-2" />
            New Medical Record
          </Button>
        </div>
      </div>

      {/* Patient Info Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Personal Information</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-400" />
                    <span className="font-medium">{patient?.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-gray-400" />
                    <span>Age: {calculateAge(patient.dateOfBirth)} years</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <PersonStandingIcon className="h-4 w-4 text-gray-400" />
                    <span className="capitalize">{patient?.gender}</span>
                  </div>
                  {patient?.bloodGroup && (
                    <div className="flex items-center gap-2">
                      <Heart className="h-4 w-4 text-gray-400" />
                      <span>Blood Group: {patient.bloodGroup}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Contact Information</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span>{patient?.phone}</span>
                  </div>
                  {patient?.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <span>{patient.email}</span>
                    </div>
                  )}
                  {patient?.address && (
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5">📍</span>
                      <span className="text-sm">{patient.address}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Emergency Contact</h3>
                {patient?.emergencyContact ? (
                  <div className="space-y-2">
                    <div>
                      <p className="font-medium">{patient.emergencyContact.name}</p>
                      <p className="text-sm text-muted-foreground">{patient.emergencyContact.relationship}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <span>{patient.emergencyContact.phone}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">No emergency contact provided</p>
                )}
              </div>
            </div>
          </div>

          {patient?.allergies && patient.allergies.length > 0 && (
            <div className="mt-6 pt-6 border-t">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Allergies</h3>
              <div className="flex flex-wrap gap-2">
                {patient.allergies.map((allergy, index) => (
                  <Badge key={index} variant="destructive">
                    {allergy}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-5 lg:grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="medical">Medical Records</TabsTrigger>
          <TabsTrigger value="prescriptions">Prescriptions</TabsTrigger>
          <TabsTrigger value="lab">Lab Tests</TabsTrigger>
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Medical Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Visits</span>
                  <span className="font-semibold">{medicalRecords.length}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Active Prescriptions</span>
                  <span className="font-semibold">
                    {prescriptions.filter(p => p.status === "active").length}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Pending Tests</span>
                  <span className="font-semibold">
                    {labTests.filter(t => t.status === "pending").length}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Upcoming Appointments</span>
                  <span className="font-semibold">
                    {appointments.filter(a =>
                      new Date(a.date) >= new Date() &&
                      ["scheduled", "confirmed"].includes(a.status)
                    ).length}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Recent Medical Records */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  <span>Recent Medical Records</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveTab("medical")}
                  >
                    View All
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {medicalRecords.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No medical records found</p>
                    <Button
                      variant="outline"
                      className="mt-3"
                      onClick={() => router.push(`/doctor/patients/${patientId}/medical-record/new`)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Medical Record
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {medicalRecords.slice(0, 3).map((record) => (
                      <div key={record._id} className="p-4 border rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-medium">{record.diagnosis}</h4>
                            <p className="text-sm text-muted-foreground">
                              {formatDate(record.date)} • Dr. {record.doctor.name}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/doctor/medical-records/${record._id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                        {record.vitals && (
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-3 text-sm">
                            <div className="flex items-center gap-1">
                              <span>🩸</span>
                              <span>BP: {record.vitals.bloodPressure}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span>❤️</span>
                              <span>HR: {record.vitals.heartRate} bpm</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span>🌡️</span>
                              <span>Temp: {record.vitals.temperature}°C</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span>⚖️</span>
                              <span>Wt: {record.vitals.weight} kg</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span>📐</span>
                              <span>BMI: {record.vitals.bmi.toFixed(1)}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-center gap-2"
                  onClick={() => router.push(`/doctor/patients/${patientId}/medical-record/new`)}
                >
                  <Stethoscope className="h-5 w-5" />
                  <span>New Medical Record</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-center gap-2"
                  onClick={() => router.push(`/doctor/patients/${patientId}/prescription/new`)}
                >
                  <Pill className="h-5 w-5" />
                  <span>New Prescription</span>
                </Button>
                <LabTestOrderDialog
                  patientId={patientId}
                  patientName={patient?.name || "Patient"}
                  onTestOrdered={handleTestOrdered}
                  trigger={
                    <Button
                      variant="outline"
                      className="h-auto py-4 flex flex-col items-center gap-2"
                    >
                      <TestTube className="h-5 w-5" />
                      <span>Order Lab Test</span>
                    </Button>
                  }
                />
                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-center gap-2"
                  onClick={() => router.push(`/doctor/patients/${patientId}/appointment/new`)}
                >
                  <Calendar className="h-5 w-5" />
                  <span>Schedule Appointment</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Medical Records Tab */}
        <TabsContent value="medical" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Medical Records</CardTitle>
                  <CardDescription>
                    Complete medical history of the patient
                  </CardDescription>
                </div>
                <Button onClick={() => router.push(`/doctor/patients/${patientId}/medical-record/new`)}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Record
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {medicalRecords.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold mb-2">No Medical Records</h3>
                  <p className="text-gray-500 mb-4">
                    Start by creating a new medical record for this patient
                  </p>
                  <Button onClick={() => router.push(`/doctor/patients/${patientId}/medical-record/new`)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Record
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {medicalRecords.map((record) => (
                    <Card key={record._id} className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900">
                      <CardContent className="pt-6">
                        <div className="flex justify-between items-start">
                          <div className="space-y-2">
                            <div>
                              <h3 className="font-semibold">{record.diagnosis}</h3>
                              <p className="text-sm text-muted-foreground">
                                {formatDate(record.date)} • Dr. {record.doctor.name}
                              </p>
                            </div>
                            {record.symptoms.length > 0 && (
                              <div>
                                <p className="text-sm font-medium mb-1">Symptoms:</p>
                                <div className="flex flex-wrap gap-1">
                                  {record.symptoms.map((symptom, index) => (
                                    <Badge key={index} variant="outline">
                                      {symptom}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                            {record.notes && (
                              <p className="text-sm">{record.notes}</p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => router.push(`/doctor/medical-records/${record._id}`)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => router.push(`/doctor/medical-records/${record._id}/edit`)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        {record.vitals && (
                          <div className="mt-4 pt-4 border-t">
                            <h4 className="text-sm font-medium mb-2">Vital Signs</h4>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                              <div className="text-center">
                                <p className="text-xs text-muted-foreground">Blood Pressure</p>
                                <p className="font-medium">{record.vitals.bloodPressure}</p>
                              </div>
                              <div className="text-center">
                                <p className="text-xs text-muted-foreground">Heart Rate</p>
                                <p className="font-medium">{record.vitals.heartRate} bpm</p>
                              </div>
                              <div className="text-center">
                                <p className="text-xs text-muted-foreground">Temperature</p>
                                <p className="font-medium">{record.vitals.temperature}°C</p>
                              </div>
                              <div className="text-center">
                                <p className="text-xs text-muted-foreground">Weight</p>
                                <p className="font-medium">{record.vitals.weight} kg</p>
                              </div>
                              <div className="text-center">
                                <p className="text-xs text-muted-foreground">BMI</p>
                                <p className="font-medium">{record.vitals.bmi.toFixed(1)}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Prescriptions Tab */}
        <TabsContent value="prescriptions" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Prescriptions</CardTitle>
                  <CardDescription>
                    All prescriptions issued to this patient
                  </CardDescription>
                </div>
                <Button onClick={() => router.push(`/doctor/patients/${patientId}/prescription/new`)}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Prescription
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {prescriptions.length === 0 ? (
                <div className="text-center py-12">
                  <Pill className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold mb-2">No Prescriptions</h3>
                  <p className="text-gray-500 mb-4">
                    Create a new prescription for this patient
                  </p>
                  <Button onClick={() => router.push(`/doctor/patients/${patientId}/prescription/new`)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Prescription
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {prescriptions.map((prescription) => (
                    <Card key={prescription._id}>
                      <CardContent className="pt-6">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="font-semibold">{prescription.prescriptionId}</h3>
                            <p className="text-sm text-muted-foreground">
                              {formatDate(prescription.date)} • {getStatusBadge(prescription.status)}
                            </p>
                            {prescription.diagnosis && (
                              <p className="text-sm mt-1">Diagnosis: {prescription.diagnosis}</p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm">
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm">
                              <Printer className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <h4 className="font-medium">Medications:</h4>
                          {prescription.medications.map((med, index) => (
                            <div key={index} className="pl-4 border-l-2 border-blue-200">
                              <div className="flex justify-between">
                                <span className="font-medium">{med.name}</span>
                                <Badge variant="outline">{med.dosage}</Badge>
                              </div>
                              <div className="text-sm text-muted-foreground mt-1">
                                <p>Frequency: {med.frequency}</p>
                                <p>Duration: {med.duration}</p>
                                {med.instructions && <p>Instructions: {med.instructions}</p>}
                              </div>
                            </div>
                          ))}
                        </div>

                        {prescription.notes && (
                          <div className="mt-4 pt-4 border-t">
                            <p className="text-sm">{prescription.notes}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Lab Tests Tab */}
      <TabsContent value="lab" className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Laboratory Tests</CardTitle>
                <CardDescription>
                  Lab tests ordered for this patient
                </CardDescription>
              </div>
              <LabTestOrderDialog
                patientId={patientId}
                patientName={patient?.name || "Patient"}
                onTestOrdered={handleTestOrdered}
              />
            </div>
          </CardHeader>
          <CardContent>
            {labTests.length === 0 ? (
              <div className="text-center py-12">
                <TestTube className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-lg font-semibold mb-2">No Lab Tests</h3>
                <p className="text-gray-500 mb-4">
                  Order a lab test for this patient
                </p>
                <LabTestOrderDialog
                  patientId={patientId}
                  patientName={patient?.name || "Patient"}
                  onTestOrdered={handleTestOrdered}
                  trigger={
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Order First Test
                    </Button>
                  }
                />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Test ID</TableHead>
                    <TableHead>Test Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Ordered Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Results</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {labTests.map((test) => (
                    <TableRow key={test._id}>
                      <TableCell className="font-medium">{test.testId}</TableCell>
                      <TableCell>{test.testName}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {test.category.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(test.orderedAt)}</TableCell>
                      <TableCell>
                        {getStatusBadge(test.status)}
                      </TableCell>
                      <TableCell>
                        {test.results?.reportedAt ? (
                          <Badge variant="default">Reported</Badge>
                        ) : (
                          <span className="text-muted-foreground">Pending</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/laboratory/tests/${test._id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Appointments Tab */}
      <TabsContent value="appointments" className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Appointments</CardTitle>
                <CardDescription>
                  Appointment history with this patient
                </CardDescription>
              </div>
              <Button onClick={() => router.push(`/doctor/patients/${patientId}/appointment/new`)}>
                <Plus className="h-4 w-4 mr-2" />
                Schedule
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {appointments.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-lg font-semibold mb-2">No Appointments</h3>
                <p className="text-gray-500 mb-4">
                  Schedule an appointment with this patient
                </p>
                <Button onClick={() => router.push(`/doctor/patients/${patientId}/appointment/new`)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Schedule Appointment
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Appointment ID</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {appointments.map((appointment) => (
                    <TableRow key={appointment._id}>
                      <TableCell className="font-medium">{appointment.appointmentId}</TableCell>
                      <TableCell>
                        {formatDateTime(appointment.startTime)}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{appointment.reason}</TableCell>
                      <TableCell>
                        <Badge variant={
                          appointment.priority === "emergency" ? "destructive" :
                          appointment.priority === "high" ? "default" :
                          "outline"
                        }>
                          {appointment.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(appointment.status)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/doctor/appointments/${appointment._id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
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