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
  CreditCard,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";

// Types
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

interface LabTestCharges {
  basePrice: number;
  tax: number;
  discount: number;
  otherCharges: number;
  totalAmount: number;
  paid: number;
  due: number;
  paymentStatus: "pending" | "partial" | "paid" | "cancelled";
  paymentMethod?: string;
  transactionId?: string;
  paymentDate?: string;
  collectedBy?: {
    _id: string;
    name: string;
  };
}

interface LabTest {
  _id: string;
  testId: string;
  testName: string;
  category: string;
  description?: string;
  price: number;
  discountedPrice?: number;
  charges: LabTestCharges; // Now required, not optional
  status: "pending" | "ordered" | "collected" | "processing" | "completed" | "reported" | "cancelled";
  priority: "routine" | "urgent" | "emergency";
  notes?: string;
  specimen?: {
    type?: string;
    collectionTime?: string;
    collectedBy?: string;
  };
  orderedBy: {
    _id: string;
    name: string;
  };
  orderedAt: string;
  collectedAt?: string;
  completedAt?: string;
  reportedAt?: string;
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

interface PaymentFormData {
  tax: number;
  discount: number;
  otherCharges: number;
  paymentMethod: string;
  paidAmount: number;
  transactionId: string;
}

// Helper function to calculate lab test total safely
const calculateLabTestTotal = (labTest: LabTest): number => {
  const base = labTest.discountedPrice || labTest.price;
  const tax = labTest.charges?.tax || 0;
  const other = labTest.charges?.otherCharges || 0;
  const discount = labTest.charges?.discount || 0;
  
  return base + tax + other - discount;
};

// Helper function to get payment status
const getPaymentStatus = (labTest: LabTest): string => {
  return labTest.charges?.paymentStatus || "pending";
};

// Helper function to get due amount
const getDueAmount = (labTest: LabTest): number => {
  return labTest.charges?.due || 0;
};

// Helper function to get paid amount
const getPaidAmount = (labTest: LabTest): number => {
  return labTest.charges?.paid || 0;
};

export default function AppointmentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user, accessToken } = useAuthStore();
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [labTests, setLabTests] = useState<LabTest[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [updatingPayment, setUpdatingPayment] = useState(false);
  
  // Dialog states
  const [addLabDialogOpen, setAddLabDialogOpen] = useState(false);
  const [addMedicineDialogOpen, setAddMedicineDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [labDetailsDialogOpen, setLabDetailsDialogOpen] = useState(false);
  const [selectedLabTest, setSelectedLabTest] = useState<LabTest | null>(null);
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null);
  
  // Form states
  const [labForm, setLabForm] = useState({
    testName: "",
    category: "blood_test",
    description: "",
    price: "",
    priority: "routine",
    notes: "",
    specimenType: "blood",
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

  const [paymentForm, setPaymentForm] = useState<PaymentFormData>({
    tax: 0,
    discount: 0,
    otherCharges: 0,
    paymentMethod: "cash",
    paidAmount: 0,
    transactionId: "",
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
      toast("Error",{
        description: "Failed to fetch appointment details",
      });
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
      // Only doctors and admin can add lab tests
      if (!["doctor", "admin"].includes(user?.role || "")) {
        toast("Access Denied", {
          description: "Only doctors can order lab tests",
        });
        return;
      }

      const response = await fetch(`/api/doctor/lab-tests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          appointmentId: params.id,
          testName: labForm.testName,
          category: labForm.category,
          description: labForm.description,
          price: parseFloat(labForm.price),
          priority: labForm.priority,
          notes: labForm.notes,
          specimenType: labForm.specimenType,
        }),
      });
      
      const data = await response.json();
      if (data.success) {
        toast("Success", {
          description: "Lab test ordered successfully",
        });
        setAddLabDialogOpen(false);
        setLabForm({
          testName: "",
          category: "blood_test",
          description: "",
          price: "",
          priority: "routine",
          notes: "",
          specimenType: "blood",
        });
        fetchLabTests();
      } else {
        toast("Error", {
          description: data.error || "Failed to order lab test",
        });
      }
    } catch (error) {
      console.error("Error adding lab test:", error);
      toast("Error", {
        description: "Failed to order lab test",
      });
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
        toast("Success", {
          description: "Medicine added successfully",
        });
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
      } else {
        toast("Error", {
          description: data.error || "Failed to add medicine",
        });
      }
    } catch (error) {
      console.error("Error adding medicine:", error);
      toast("Error", {
        description: "Failed to add medicine",
      });
    }
  };

  const handleUpdatePayment = async () => {
    if (!selectedLabTest) return;
    
    try {
      setUpdatingPayment(true);
      
      // Only receptionist and admin can update charges
      if (!["receptionist", "admin"].includes(user?.role || "")) {
        toast("Access Denied", {
          description: "Only receptionists can update charges",
        });
        return;
      }

      const response = await fetch(`/api/reception/lab-tests/${selectedLabTest._id}/charges`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify(paymentForm),
      });
      
      const data = await response.json();
      if (data.success) {
        toast("Success", {
          description: "Charges updated successfully",
        });
        setPaymentDialogOpen(false);
        fetchLabTests();
      } else {
        toast("Error", {
          description: data.error || "Failed to update charges",
        });
      }
    } catch (error) {
      console.error("Error updating payment:", error);
      toast("Error", {
        description: "Failed to update charges",
      });
    } finally {
      setUpdatingPayment(false);
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
        toast("Success", {
          description: "Lab test deleted successfully",
        });
        fetchLabTests();
      } else {
        toast("Error", {
          description: data.error || "Failed to delete lab test",
        });
      }
    } catch (error) {
      console.error("Error deleting lab test:", error);
      toast("Error", {
        description: "Failed to delete lab test",
      });
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
        toast("Success",{
          description: "Medicine deleted successfully",
        });
        fetchMedicines();
      } else {
        toast("Error",{
          description: data.error || "Failed to delete medicine",
        });
      }
    } catch (error) {
      console.error("Error deleting medicine:", error);
      toast("Error",{
        description: "Failed to delete medicine",
      });
    }
  };

  const openPaymentDialog = (labTest: LabTest) => {
    setSelectedLabTest(labTest);
    setPaymentForm({
      tax: labTest.charges?.tax || 0,
      discount: labTest.charges?.discount || 0,
      otherCharges: labTest.charges?.otherCharges || 0,
      paymentMethod: labTest.charges?.paymentMethod || "cash",
      paidAmount: getDueAmount(labTest) || 0,
      transactionId: labTest.charges?.transactionId || "",
    });
    setPaymentDialogOpen(true);
  };

  const openLabDetailsDialog = (labTest: LabTest) => {
    setSelectedLabTest(labTest);
    setLabDetailsDialogOpen(true);
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
    const variants = {
      pending: { className: "bg-yellow-50 text-yellow-700 border-yellow-200", label: "Pending" },
      ordered: { className: "bg-blue-50 text-blue-700 border-blue-200", label: "Ordered" },
      collected: { className: "bg-purple-50 text-purple-700 border-purple-200", label: "Collected" },
      processing: { className: "bg-orange-50 text-orange-700 border-orange-200", label: "Processing" },
      completed: { className: "bg-green-50 text-green-700 border-green-200", label: "Completed" },
      reported: { className: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Reported" },
      cancelled: { className: "bg-red-50 text-red-700 border-red-200", label: "Cancelled" },
    };

    const variant = variants[status as keyof typeof variants] || { className: "", label: status };
    
    return (
      <Badge variant="outline" className={variant.className}>
        {variant.label}
      </Badge>
    );
  };

  const getPaymentStatusBadge = (status: string) => {
    const variants = {
      pending: { className: "bg-yellow-50 text-yellow-700 border-yellow-200", label: "Pending" },
      partial: { className: "bg-blue-50 text-blue-700 border-blue-200", label: "Partial" },
      paid: { className: "bg-green-50 text-green-700 border-green-200", label: "Paid" },
      cancelled: { className: "bg-red-50 text-red-700 border-red-200", label: "Cancelled" },
    };

    const variant = variants[status as keyof typeof variants] || { className: "", label: status };
    
    return (
      <Badge variant="outline" className={variant.className}>
        {variant.label}
      </Badge>
    );
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

  const calculateTotal = (): number => {
    if (!appointment) return 0;
    
    const labTotal = labTests.reduce((sum, test) => sum + calculateLabTestTotal(test), 0);
    const medicineTotal = medicines.reduce((sum, medicine) => sum + medicine.total, 0);
    const consultationFee = appointment.appointmentType === "emergency" ? 150 : 
                           appointment.appointmentType === "procedure" ? 200 : 100;
    return labTotal + medicineTotal + consultationFee;
  };

  const getTotalPaid = (): number => {
    return labTests.reduce((sum, test) => sum + getPaidAmount(test), 0);
  };

  const getTotalDue = (): number => {
    return labTests.reduce((sum, test) => sum + getDueAmount(test), 0);
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
          <Button variant="outline" size="sm" onClick={() => {
            fetchAppointmentDetails();
            fetchLabTests();
            fetchMedicines();
            toast("Refreshed",{
              description: "Data refreshed successfully",
            });
          }}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
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

        {/* Overview Tab - unchanged from your original code */}

        {/* Lab Tests Tab */}
        <TabsContent value="lab-tests" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FlaskConical className="h-5 w-5" />
                    Laboratory Tests
                  </CardTitle>
                  <CardDescription>
                    Laboratory tests ordered for this appointment. Doctors can order tests, receptionists can manage charges.
                  </CardDescription>
                </div>
                {["doctor", "admin"].includes(user?.role || "") && (
                  <Dialog open={addLabDialogOpen} onOpenChange={setAddLabDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Order Lab Test
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Order Laboratory Test</DialogTitle>
                        <DialogDescription>
                          Order a new laboratory test for this appointment
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        {/* Form fields - same as before */}
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setAddLabDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleAddLabTest}>
                          Order Test
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
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
                        <TableHead>Total Amount</TableHead>
                        <TableHead>Payment Status</TableHead>
                        <TableHead>Test Status</TableHead>
                        <TableHead>Ordered At</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {labTests.map((test) => (
                        <TableRow key={test._id}>
                          <TableCell className="font-mono">{test.testId}</TableCell>
                          <TableCell className="font-medium">{test.testName}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {test.category.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell>${test.price.toFixed(2)}</TableCell>
                          <TableCell>
                            <div className="font-semibold">
                              ${calculateLabTestTotal(test).toFixed(2)}
                            </div>
                            {getDueAmount(test) > 0 && (
                              <div className="text-sm text-red-600">
                                Due: ${getDueAmount(test).toFixed(2)}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            {getPaymentStatusBadge(getPaymentStatus(test))}
                          </TableCell>
                          <TableCell>{getLabStatusBadge(test.status)}</TableCell>
                          <TableCell>
                            {format(parseISO(test.orderedAt), "MMM d, h:mm a")}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openLabDetailsDialog(test)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              
                              {["receptionist", "admin"].includes(user?.role || "") && 
                               getPaymentStatus(test) !== "paid" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openPaymentDialog(test)}
                                >
                                  <CreditCard className="h-4 w-4" />
                                </Button>
                              )}
                              
                              {["doctor", "admin"].includes(user?.role || "") && (
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
        </TabsContent>

        {/* Medicines Tab - unchanged from your original code */}

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
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">Laboratory Tests</h3>
                      <Badge variant="outline">
                        {labTests.length} test{labTests.length !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                    <div className="rounded-lg border">
                      <Table>
                        <TableBody>
                          {labTests.map((test) => (
                            <TableRow key={test._id}>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{test.testName}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    {getPaymentStatusBadge(getPaymentStatus(test))}
                                    <span className="text-sm text-gray-500 capitalize">
                                      {test.category.replace('_', ' ')}
                                    </span>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="font-medium">${calculateLabTestTotal(test).toFixed(2)}</div>
                                {getDueAmount(test) > 0 && (
                                  <div className="text-sm text-red-600">
                                    Due: ${getDueAmount(test).toFixed(2)}
                                  </div>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="">
                            <TableCell className="font-medium">Lab Tests Subtotal</TableCell>
                            <TableCell className="font-medium text-right">
                              ${labTests.reduce((sum, test) => sum + calculateLabTestTotal(test), 0).toFixed(2)}
                            </TableCell>
                          </TableRow>
                          <TableRow className="">
                            <TableCell className="font-medium">Paid</TableCell>
                            <TableCell className="font-medium text-right text-green-600">
                              ${labTests.reduce((sum, test) => sum + getPaidAmount(test), 0).toFixed(2)}
                            </TableCell>
                          </TableRow>
                          <TableRow className="">
                            <TableCell className="font-medium">Due</TableCell>
                            <TableCell className="font-medium text-right text-red-600">
                              ${labTests.reduce((sum, test) => sum + getDueAmount(test), 0).toFixed(2)}
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
                          ${calculateTotal().toFixed(2)}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Total Paid</TableCell>
                        <TableCell className="font-medium text-right text-green-600">
                          ${getTotalPaid().toFixed(2)}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Total Due</TableCell>
                        <TableCell className="font-medium text-right text-red-600">
                          ${getTotalDue().toFixed(2)}
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
                  {labTests.some(test => getPaymentStatus(test) !== "paid") && (
                    <Button className="w-full" variant="outline" onClick={() => {
                      const unpaidTest = labTests.find(test => getPaymentStatus(test) !== "paid");
                      if (unpaidTest) {
                        openPaymentDialog(unpaidTest);
                      }
                    }}>
                      <DollarSign className="h-4 w-4 mr-2" />
                      Process Payment
                    </Button>
                  )}
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
                      ${calculateTotal().toFixed(2)}
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Paid:</span>
                        <span className="font-medium text-green-600">
                          ${getTotalPaid().toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Due:</span>
                        <span className="font-medium text-red-600">
                          ${getTotalDue().toFixed(2)}
                        </span>
                      </div>
                    </div>
                    {getTotalDue() === 0 ? (
                      <Badge className="bg-green-100 text-green-800 mt-4">Fully Paid</Badge>
                    ) : (
                      <Badge className="bg-yellow-100 text-yellow-800 mt-4">Pending Payment</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Lab Test Payment Dialog */}
<Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
  <DialogContent className="max-w-md">
    <DialogHeader>
      <DialogTitle className="flex items-center gap-2">
        <CreditCard className="h-5 w-5" />
        Update Lab Test Charges
      </DialogTitle>
      <DialogDescription>
        Update payment details for {selectedLabTest?.testName}
      </DialogDescription>
    </DialogHeader>
    
    {selectedLabTest && (
      <div className="space-y-4">
        <div className="p-3 rounded-lg">
          <div className="text-sm font-medium text-blue-300 mb-1">Test Information</div>
          <div className="text-sm text-blue-300">
            <div>Test: {selectedLabTest.testName}</div>
            <div>Base Price: ${selectedLabTest.price.toFixed(2)}</div>
          </div>
        </div>
        
        {/* Other Charges Input */}
        <div className="space-y-2">
          <Label htmlFor="otherCharges">Other Charges ($)</Label>
          <Input
            id="otherCharges"
            type="number"
            step="0.01"
            min="0"
            value={paymentForm.otherCharges}
            onChange={(e) => setPaymentForm(prev => ({
              ...prev,
              otherCharges: parseFloat(e.target.value) || 0
            }))}
            placeholder="0.00"
          />
        </div>
        
        {/* Payment Method */}
        <div className="space-y-2">
          <Label htmlFor="paymentMethod">Payment Method</Label>
          <Select
            value={paymentForm.paymentMethod}
            onValueChange={(value) => setPaymentForm(prev => ({
              ...prev,
              paymentMethod: value
            }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cash">Cash</SelectItem>
              <SelectItem value="card">Credit/Debit Card</SelectItem>
              <SelectItem value="insurance">Insurance</SelectItem>
              <SelectItem value="upi">UPI</SelectItem>
              <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
              <SelectItem value="cheque">Cheque</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Amount Paid Input - This is the missing field! */}
        <div className="space-y-2">
          <Label htmlFor="paidAmount">Amount Paid ($)*</Label>
          <Input
            id="paidAmount"
            type="number"
            step="0.01"
            min="0"
            max={selectedLabTest.price + paymentForm.tax + paymentForm.otherCharges - paymentForm.discount}
            value={paymentForm.paidAmount}
            onChange={(e) => setPaymentForm(prev => ({
              ...prev,
              paidAmount: parseFloat(e.target.value) || 0
            }))}
            placeholder="0.00"
            required
          />
          <p className="text-xs text-gray-500">
            Enter the amount being paid now. Leave as 0 for no payment.
          </p>
        </div>
        
        {/* Transaction ID */}
        <div className="space-y-2">
          <Label htmlFor="transactionId">Transaction/Reference ID</Label>
          <Input
            id="transactionId"
            value={paymentForm.transactionId}
            onChange={(e) => setPaymentForm(prev => ({
              ...prev,
              transactionId: e.target.value
            }))}
            placeholder="e.g., TXN123456, Receipt #, etc."
          />
          <p className="text-xs text-gray-500">
            Optional: Enter transaction ID, receipt number, or reference
          </p>
        </div>
        
        {/* Payment Summary */}
        <div className="p-3 rounded-lg">
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-600">Base Price:</span>
              <span>${selectedLabTest.price.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Tax:</span>
              <span>${paymentForm.tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Other Charges:</span>
              <span>${paymentForm.otherCharges.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Discount:</span>
              <span className="text-red-600">-${paymentForm.discount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold border-t pt-2">
              <span>Total Amount:</span>
              <span>
                ${(selectedLabTest.price + paymentForm.tax + paymentForm.otherCharges - paymentForm.discount).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="text-gray-600">Amount Paid:</span>
              <span className="text-green-600">${paymentForm.paidAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Remaining Due:</span>
              <span className={
                (selectedLabTest.price + paymentForm.tax + paymentForm.otherCharges - paymentForm.discount - paymentForm.paidAmount) > 0 
                  ? "text-red-600 font-semibold" 
                  : "text-green-600"
              }>
                ${Math.max(0, selectedLabTest.price + paymentForm.tax + paymentForm.otherCharges - paymentForm.discount - paymentForm.paidAmount).toFixed(2)}
              </span>
            </div>
            
            {/* Payment Status Indicator */}
            <div className="mt-3 pt-2 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Payment Status:</span>
                <Badge className={
                  paymentForm.paidAmount === 0 
                    ? "bg-yellow-100 text-yellow-800" 
                    : paymentForm.paidAmount >= (selectedLabTest.price + paymentForm.tax + paymentForm.otherCharges - paymentForm.discount)
                    ? "bg-green-100 text-green-800"
                    : "bg-blue-100 text-blue-800"
                }>
                  {paymentForm.paidAmount === 0 
                    ? "Pending" 
                    : paymentForm.paidAmount >= (selectedLabTest.price + paymentForm.tax + paymentForm.otherCharges - paymentForm.discount)
                    ? "Fully Paid"
                    : "Partial Payment"
                  }
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>
    )}
    
    <DialogFooter className="flex-col sm:flex-row gap-2">
      <Button 
        variant="outline" 
        onClick={() => {
          setPaymentDialogOpen(false);
          // Reset form when cancelled
          if (selectedLabTest) {
            setPaymentForm({
              tax: selectedLabTest.charges?.tax || 0,
              discount: selectedLabTest.charges?.discount || 0,
              otherCharges: selectedLabTest.charges?.otherCharges || 0,
              paymentMethod: selectedLabTest.charges?.paymentMethod || "cash",
              paidAmount: getDueAmount(selectedLabTest) || 0,
              transactionId: selectedLabTest.charges?.transactionId || "",
            });
          }
        }} 
        disabled={updatingPayment}
        className="sm:flex-1"
      >
        Cancel
      </Button>
      <Button 
        onClick={handleUpdatePayment} 
        disabled={updatingPayment}
        className="sm:flex-1"
      >
        {updatingPayment ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Updating...
          </>
        ) : (
          "Save Payment"
        )}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
    </div>
  );
}