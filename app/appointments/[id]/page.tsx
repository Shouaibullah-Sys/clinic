// app/appointments/[id]/page.tsx

"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Calendar,
  Clock,
  User,
  Stethoscope,
  DollarSign,
  FlaskConical,
  FileText,
  Printer,
  Download,
  ArrowLeft,
  Plus,
  Trash2,
  Eye,
  Edit,
  CheckCircle,
  XCircle,
  Pilcrow,
} from "lucide-react";
import { format, parseISO } from "date-fns";

interface Appointment {
  _id: string;
  appointmentId: string;
  patient: {
    _id: string;
    name: string;
    phone: string;
    email: string;
    patientId: string;
    dateOfBirth: string;
    gender: string;
    address?: string;
  };
  doctor: {
    _id: string;
    name: string;
    specialization: string;
    department: string;
    licenseNumber?: string;
  };
  appointmentType: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  status: string;
  reason: string;
  priority: string;
  notes?: string;
  checkInTime?: string;
  checkOutTime?: string;
  waitingTime?: number;
  consultationTime?: number;
  createdAt: string;
  updatedAt: string;
}

interface LabTest {
  _id: string;
  testId: string;
  testName: string;
  category: string;
  price: number;
  status: "pending" | "processing" | "completed" | "cancelled";
  orderedBy: string;
  orderedAt: string;
  result?: string;
  completedAt?: string;
  notes?: string;
}

interface Medicine {
  _id: string;
  medicineId: string;
  name: string;
  genericName: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: number;
  price: number;
  total: number;
  status: "prescribed" | "dispensed" | "cancelled";
  prescribedBy: string;
  prescribedAt: string;
  dispensedAt?: string;
  notes?: string;
}

export default function AppointmentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user, accessToken } = useAuthStore();
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [labTests, setLabTests] = useState<LabTest[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  
  // Dialog states
  const [addLabDialogOpen, setAddLabDialogOpen] = useState(false);
  const [addMedicineDialogOpen, setAddMedicineDialogOpen] = useState(false);
  const [editLabDialogOpen, setEditLabDialogOpen] = useState(false);
  const [editMedicineDialogOpen, setEditMedicineDialogOpen] = useState(false);
  const [selectedLabTest, setSelectedLabTest] = useState<LabTest | null>(null);
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null);
  
  // Form states
  const [labForm, setLabForm] = useState({
    testName: "",
    category: "",
    price: "",
    notes: "",
  });
  
  const [medicineForm, setMedicineForm] = useState({
    name: "",
    genericName: "",
    dosage: "",
    frequency: "",
    duration: "",
    quantity: "1",
    price: "",
    notes: "",
  });

  useEffect(() => {
    if (params.id && accessToken) {
      fetchAppointmentDetails();
      fetchLabTests();
      fetchMedicines();
    }
  }, [params.id, accessToken]);

  const fetchAppointmentDetails = async () => {
    try {
      const response = await fetch(`/api/appointments/${params.id}`, {
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
      });
      
      const data = await response.json();
      if (data.success) {
        setAppointment(data.data);
      }
    } catch (error) {
      console.error("Error fetching appointment:", error);
    }
  };

  const fetchLabTests = async () => {
    try {
      const response = await fetch(`/api/appointments/${params.id}/lab-tests`, {
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
      });
      
      const data = await response.json();
      if (data.success) {
        setLabTests(data.data);
      }
    } catch (error) {
      console.error("Error fetching lab tests:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMedicines = async () => {
    try {
      const response = await fetch(`/api/appointments/${params.id}/medicines`, {
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
      });
      
      const data = await response.json();
      if (data.success) {
        setMedicines(data.data);
      }
    } catch (error) {
      console.error("Error fetching medicines:", error);
    }
  };

  const handleAddLabTest = async () => {
    try {
      const response = await fetch(`/api/appointments/${params.id}/lab-tests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          testName: labForm.testName,
          category: labForm.category,
          price: parseFloat(labForm.price),
          notes: labForm.notes,
        }),
      });
      
      const data = await response.json();
      if (data.success) {
        setAddLabDialogOpen(false);
        setLabForm({
          testName: "",
          category: "",
          price: "",
          notes: "",
        });
        fetchLabTests();
      }
    } catch (error) {
      console.error("Error adding lab test:", error);
    }
  };

  const handleAddMedicine = async () => {
    try {
      const total = parseFloat(medicineForm.price) * parseInt(medicineForm.quantity);
      
      const response = await fetch(`/api/appointments/${params.id}/medicines`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          name: medicineForm.name,
          genericName: medicineForm.genericName,
          dosage: medicineForm.dosage,
          frequency: medicineForm.frequency,
          duration: medicineForm.duration,
          quantity: parseInt(medicineForm.quantity),
          price: parseFloat(medicineForm.price),
          total: total,
          notes: medicineForm.notes,
        }),
      });
      
      const data = await response.json();
      if (data.success) {
        setAddMedicineDialogOpen(false);
        setMedicineForm({
          name: "",
          genericName: "",
          dosage: "",
          frequency: "",
          duration: "",
          quantity: "1",
          price: "",
          notes: "",
        });
        fetchMedicines();
      }
    } catch (error) {
      console.error("Error adding medicine:", error);
    }
  };

  const handleDeleteLabTest = async (labTestId: string) => {
    try {
      const response = await fetch(`/api/appointments/${params.id}/lab-tests/${labTestId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
      });
      
      const data = await response.json();
      if (data.success) {
        fetchLabTests();
      }
    } catch (error) {
      console.error("Error deleting lab test:", error);
    }
  };

  const handleDeleteMedicine = async (medicineId: string) => {
    try {
      const response = await fetch(`/api/appointments/${params.id}/medicines/${medicineId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
      });
      
      const data = await response.json();
      if (data.success) {
        fetchMedicines();
      }
    } catch (error) {
      console.error("Error deleting medicine:", error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "scheduled":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Scheduled</Badge>;
      case "confirmed":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Confirmed</Badge>;
      case "checked-in":
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Checked In</Badge>;
      case "in-progress":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">In Progress</Badge>;
      case "completed":
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Completed</Badge>;
      case "cancelled":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getLabStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>;
      case "processing":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Processing</Badge>;
      case "completed":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Completed</Badge>;
      case "cancelled":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getMedicineStatusBadge = (status: string) => {
    switch (status) {
      case "prescribed":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Prescribed</Badge>;
      case "dispensed":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Dispensed</Badge>;
      case "cancelled":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const calculateTotal = () => {
    const labTotal = labTests.reduce((sum, test) => sum + test.price, 0);
    const medicineTotal = medicines.reduce((sum, medicine) => sum + medicine.total, 0);
    return labTotal + medicineTotal;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading appointment details...</p>
        </div>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Appointment Not Found</h2>
          <p className="text-gray-600">The appointment you're looking for doesn't exist.</p>
          <Button className="mt-4" onClick={() => router.push("/appointments")}>
            Back to Appointments
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push("/appointments")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Appointment Details</h1>
            <p className="text-gray-500 mt-1">ID: {appointment.appointmentId}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm">
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          {["admin", "receptionist"].includes(user?.role || "") && (
            <Button onClick={() => router.push(`/appointments/${params.id}/edit`)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Appointment
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-4 w-full md:w-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="lab-tests">Lab Tests</TabsTrigger>
          <TabsTrigger value="medicines">Medicines</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Appointment Details */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Appointment Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-gray-500">Appointment ID</Label>
                    <p className="font-medium">{appointment.appointmentId}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">Status</Label>
                    <div className="mt-1">{getStatusBadge(appointment.status)}</div>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">Date & Time</Label>
                    <p className="font-medium">
                      {format(parseISO(appointment.date), "MMMM d, yyyy")} at{" "}
                      {format(parseISO(appointment.startTime), "h:mm a")} -{" "}
                      {format(parseISO(appointment.endTime), "h:mm a")}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">Type</Label>
                    <p className="font-medium">{appointment.appointmentType}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">Priority</Label>
                    <Badge className={
                      appointment.priority === "emergency" ? "bg-red-100 text-red-800" :
                      appointment.priority === "high" ? "bg-orange-100 text-orange-800" :
                      appointment.priority === "medium" ? "bg-yellow-100 text-yellow-800" :
                      "bg-green-100 text-green-800"
                    }>
                      {appointment.priority}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">Duration</Label>
                    <p className="font-medium">{appointment.duration} minutes</p>
                  </div>
                </div>
                
                <div>
                  <Label className="text-sm text-gray-500">Reason for Visit</Label>
                  <p className="font-medium mt-1">{appointment.reason}</p>
                </div>
                
                {appointment.notes && (
                  <div>
                    <Label className="text-sm text-gray-500">Notes</Label>
                    <p className="mt-1 whitespace-pre-wrap bg-gray-50 p-3 rounded">{appointment.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Patient & Doctor Info */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Patient Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-sm text-gray-500">Name</Label>
                    <p className="font-medium">{appointment.patient.name}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">Patient ID</Label>
                    <p className="font-medium">{appointment.patient.patientId}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">Phone</Label>
                    <p className="font-medium">{appointment.patient.phone}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">Date of Birth</Label>
                    <p className="font-medium">
                      {format(parseISO(appointment.patient.dateOfBirth), "MMMM d, yyyy")}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">Gender</Label>
                    <p className="font-medium capitalize">{appointment.patient.gender}</p>
                  </div>
                  {appointment.patient.address && (
                    <div>
                      <Label className="text-sm text-gray-500">Address</Label>
                      <p className="font-medium">{appointment.patient.address}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Stethoscope className="h-5 w-5" />
                    Doctor Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-sm text-gray-500">Name</Label>
                    <p className="font-medium">Dr. {appointment.doctor.name}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">Specialization</Label>
                    <p className="font-medium">{appointment.doctor.specialization}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">Department</Label>
                    <p className="font-medium">{appointment.doctor.department}</p>
                  </div>
                  {appointment.doctor.licenseNumber && (
                    <div>
                      <Label className="text-sm text-gray-500">License Number</Label>
                      <p className="font-medium">{appointment.doctor.licenseNumber}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Lab Tests Tab */}
        <TabsContent value="lab-tests" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle>Laboratory Tests</CardTitle>
                  <CardDescription>
                    Laboratory tests ordered for this appointment
                  </CardDescription>
                </div>
                <Dialog open={addLabDialogOpen} onOpenChange={setAddLabDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Lab Test
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Laboratory Test</DialogTitle>
                      <DialogDescription>
                        Add a new laboratory test for this appointment
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="testName">Test Name *</Label>
                        <Input
                          id="testName"
                          value={labForm.testName}
                          onChange={(e) => setLabForm({...labForm, testName: e.target.value})}
                          placeholder="e.g., Complete Blood Count"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="category">Category *</Label>
                        <Select 
                          value={labForm.category} 
                          onValueChange={(value) => setLabForm({...labForm, category: value})}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="hematology">Hematology</SelectItem>
                            <SelectItem value="biochemistry">Biochemistry</SelectItem>
                            <SelectItem value="microbiology">Microbiology</SelectItem>
                            <SelectItem value="immunology">Immunology</SelectItem>
                            <SelectItem value="urinalysis">Urinalysis</SelectItem>
                            <SelectItem value="radiology">Radiology</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="price">Price ($) *</Label>
                        <Input
                          id="price"
                          type="number"
                          step="0.01"
                          min="0"
                          value={labForm.price}
                          onChange={(e) => setLabForm({...labForm, price: e.target.value})}
                          placeholder="0.00"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="notes">Notes</Label>
                        <Textarea
                          id="notes"
                          value={labForm.notes}
                          onChange={(e) => setLabForm({...labForm, notes: e.target.value})}
                          placeholder="Any special instructions..."
                          rows={3}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setAddLabDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleAddLabTest}>
                        Add Test
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {labTests.length === 0 ? (
                <div className="text-center py-12">
                  <FlaskConical className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Lab Tests</h3>
                  <p className="text-gray-500">No laboratory tests have been ordered yet.</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Test ID</TableHead>
                        <TableHead>Test Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Ordered At</TableHead>
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
                              {test.category}
                            </Badge>
                          </TableCell>
                          <TableCell>${test.price.toFixed(2)}</TableCell>
                          <TableCell>{getLabStatusBadge(test.status)}</TableCell>
                          <TableCell>
                            {format(parseISO(test.orderedAt), "MMM d, h:mm a")}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedLabTest(test);
                                  setEditLabDialogOpen(true);
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="sm" variant="destructive">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Lab Test</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete this lab test? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteLabTest(test._id)}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
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
        </TabsContent>

        {/* Medicines Tab */}
        <TabsContent value="medicines" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle>Medicines</CardTitle>
                  <CardDescription>
                    Medicines prescribed for this appointment
                  </CardDescription>
                </div>
                <Dialog open={addMedicineDialogOpen} onOpenChange={setAddMedicineDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Medicine
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Add Medicine</DialogTitle>
                      <DialogDescription>
                        Add a new medicine prescription for this appointment
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">Medicine Name *</Label>
                          <Input
                            id="name"
                            value={medicineForm.name}
                            onChange={(e) => setMedicineForm({...medicineForm, name: e.target.value})}
                            placeholder="e.g., Amoxicillin"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="genericName">Generic Name</Label>
                          <Input
                            id="genericName"
                            value={medicineForm.genericName}
                            onChange={(e) => setMedicineForm({...medicineForm, genericName: e.target.value})}
                            placeholder="e.g., Amoxicillin trihydrate"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="dosage">Dosage *</Label>
                          <Input
                            id="dosage"
                            value={medicineForm.dosage}
                            onChange={(e) => setMedicineForm({...medicineForm, dosage: e.target.value})}
                            placeholder="e.g., 500mg"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="frequency">Frequency *</Label>
                          <Select 
                            value={medicineForm.frequency} 
                            onValueChange={(value) => setMedicineForm({...medicineForm, frequency: value})}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="once daily">Once Daily</SelectItem>
                              <SelectItem value="twice daily">Twice Daily</SelectItem>
                              <SelectItem value="thrice daily">Thrice Daily</SelectItem>
                              <SelectItem value="four times daily">Four Times Daily</SelectItem>
                              <SelectItem value="as needed">As Needed</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="duration">Duration *</Label>
                          <Input
                            id="duration"
                            value={medicineForm.duration}
                            onChange={(e) => setMedicineForm({...medicineForm, duration: e.target.value})}
                            placeholder="e.g., 7 days"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="quantity">Quantity *</Label>
                          <Input
                            id="quantity"
                            type="number"
                            min="1"
                            value={medicineForm.quantity}
                            onChange={(e) => setMedicineForm({...medicineForm, quantity: e.target.value})}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="price">Price per unit ($) *</Label>
                          <Input
                            id="price"
                            type="number"
                            step="0.01"
                            min="0"
                            value={medicineForm.price}
                            onChange={(e) => setMedicineForm({...medicineForm, price: e.target.value})}
                            placeholder="0.00"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Total</Label>
                          <div className="h-10 flex items-center px-3 rounded-md border bg-gray-50">
                            ${medicineForm.price && medicineForm.quantity 
                              ? (parseFloat(medicineForm.price) * parseInt(medicineForm.quantity)).toFixed(2)
                              : "0.00"}
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="notes">Instructions / Notes</Label>
                        <Textarea
                          id="notes"
                          value={medicineForm.notes}
                          onChange={(e) => setMedicineForm({...medicineForm, notes: e.target.value})}
                          placeholder="Special instructions for the patient..."
                          rows={3}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setAddMedicineDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleAddMedicine}>
                        Add Medicine
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {medicines.length === 0 ? (
                <div className="text-center py-12">
                  <Pilcrow className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Medicines</h3>
                  <p className="text-gray-500">No medicines have been prescribed yet.</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Medicine</TableHead>
                        <TableHead>Dosage</TableHead>
                        <TableHead>Frequency</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {medicines.map((medicine) => (
                        <TableRow key={medicine._id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{medicine.name}</p>
                              <p className="text-sm text-gray-500">{medicine.genericName}</p>
                            </div>
                          </TableCell>
                          <TableCell>{medicine.dosage}</TableCell>
                          <TableCell>{medicine.frequency}</TableCell>
                          <TableCell>{medicine.duration}</TableCell>
                          <TableCell>{medicine.quantity}</TableCell>
                          <TableCell>${medicine.price.toFixed(2)}</TableCell>
                          <TableCell className="font-medium">${medicine.total.toFixed(2)}</TableCell>
                          <TableCell>{getMedicineStatusBadge(medicine.status)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedMedicine(medicine);
                                  setEditMedicineDialogOpen(true);
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="sm" variant="destructive">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Medicine</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete this medicine? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteMedicine(medicine._id)}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
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
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Billing Summary</CardTitle>
                <CardDescription>
                  Complete breakdown of all charges for this appointment
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Consultation Fee */}
                <div className="space-y-4">
                  <h3 className="font-semibold">Consultation Fee</h3>
                  <div className="rounded-lg border">
                    <Table>
                      <TableBody>
                        <TableRow>
                          <TableCell className="font-medium">Consultation</TableCell>
                          <TableCell className="text-right">
                            ${appointment.appointmentType === "emergency" ? "150.00" : 
                              appointment.appointmentType === "procedure" ? "200.00" : "100.00"}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Lab Tests */}
                {labTests.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="font-semibold">Laboratory Tests</h3>
                    <div className="rounded-lg border">
                      <Table>
                        <TableBody>
                          {labTests.map((test) => (
                            <TableRow key={test._id}>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{test.testName}</p>
                                  <p className="text-sm text-gray-500">{test.category}</p>
                                </div>
                              </TableCell>
                              <TableCell className="text-right">${test.price.toFixed(2)}</TableCell>
                            </TableRow>
                          ))}
                          <TableRow>
                            <TableCell className="font-medium">Subtotal</TableCell>
                            <TableCell className="font-medium text-right">
                              ${labTests.reduce((sum, test) => sum + test.price, 0).toFixed(2)}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                {/* Medicines */}
                {medicines.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="font-semibold">Medicines</h3>
                    <div className="rounded-lg border">
                      <Table>
                        <TableBody>
                          {medicines.map((medicine) => (
                            <TableRow key={medicine._id}>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{medicine.name}</p>
                                  <p className="text-sm text-gray-500">
                                    {medicine.quantity} × ${medicine.price.toFixed(2)}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell className="text-right">${medicine.total.toFixed(2)}</TableCell>
                            </TableRow>
                          ))}
                          <TableRow>
                            <TableCell className="font-medium">Subtotal</TableCell>
                            <TableCell className="font-medium text-right">
                              ${medicines.reduce((sum, medicine) => sum + medicine.total, 0).toFixed(2)}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                {/* Total */}
                <div className="rounded-lg border bg-gray-50">
                  <Table>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-semibold text-lg">Total Amount</TableCell>
                        <TableCell className="font-semibold text-lg text-right">
                          ${(calculateTotal() + 
                            (appointment.appointmentType === "emergency" ? 150 : 
                             appointment.appointmentType === "procedure" ? 200 : 100)).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Actions Sidebar */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full" variant="outline">
                    <FileText className="h-4 w-4 mr-2" />
                    Generate Invoice
                  </Button>
                  <Button className="w-full" variant="outline">
                    <DollarSign className="h-4 w-4 mr-2" />
                    Process Payment
                  </Button>
                  <Button className="w-full" variant="outline">
                    <Printer className="h-4 w-4 mr-2" />
                    Print Receipt
                  </Button>
                  <Separator />
                  <Button className="w-full" variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Export All Data
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Payment Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600 mb-2">
                      ${(calculateTotal() + 
                        (appointment.appointmentType === "emergency" ? 150 : 
                         appointment.appointmentType === "procedure" ? 200 : 100)).toFixed(2)}
                    </div>
                    <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
                    <p className="text-sm text-gray-500 mt-2">
                      Payment has not been processed yet
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}