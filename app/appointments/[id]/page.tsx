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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  Clock,
  User,
  Stethoscope,
  DollarSign,
  FlaskConical,
  FileText,
  Pill,
  Printer,
  Download,
  ArrowLeft,
  Plus,
  Trash2,
  Eye,
  Edit,
  CheckCircle,
  XCircle,
  CreditCard,
  RefreshCw,
  Loader2,
  Receipt,
  Calculator,
  Send,
  Copy,
  AlertCircle,
  CalendarDays,
  Activity,
  Thermometer,
  Heart,
  Weight,
  MapPin,
  Phone,
  Mail,
  Hash,
  Clock4,
  TrendingUp,
  BarChart3,
  Scan,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";

// Types - Simplified
interface Appointment {
  _id: string;
  appointmentId: string;
  patient: {
    _id: string;
    name: string;
    phone: string;
    email?: string;
    patientId: string;
    dateOfBirth?: string;
    gender?: string;
    address?: string;
    bloodGroup?: string;
    allergies?: string[];
  };
  doctor: {
    _id: string;
    name: string;
    specialization: string;
    department: string;
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
  description?: string;
  price: number;
  discountedPrice?: number;
  status: string;
  priority: string;
  charges?: {
    tax?: number;
    otherCharges?: number;
    discount?: number;
    paid?: number;
    due?: number;
    paymentStatus: string;
    paymentMethod?: string;
    transactionId?: string;
  };
  orderedAt: string;
}

interface Prescription {
  _id: string;
  prescriptionId: string;
  patient: {
    _id: string;
    name: string;
    patientId: string;
  };
  doctor: {
    _id: string;
    name: string;
    specialization?: string;
  };
  prescribedDate: string;
  medications: {
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    quantity: number;
    instructions?: string;
    route?: string;
    price?: number;
  }[];
  diagnosis: string;
  instructions: string;
  notes?: string;
  status: string;
  expiryDate: string;
}

interface ImagingService {
  _id: string;
  serviceId: string;
  serviceType: "x-ray" | "ct-scan" | "mri" | "ultrasound";
  bodyPart: string;
  view: string;
  status: string;
  priority: string;
  reportStatus?: string;
  billingStatus?: string;
  charges?: {
    basePrice?: number;
    tax?: number;
    discount?: number;
    otherCharges?: number;
    totalAmount?: number;
    paid?: number;
    due?: number;
    paymentStatus: string;
    paymentMethod?: string;
    transactionId?: string;
  };
  paymentVerified?: boolean;
  requestDate: string;
  scheduledDate?: string;
  performedDate?: string;
  referringDoctor?: {
    name: string;
  };
  radiologist?: {
    name: string;
  };
  technician?: {
    name: string;
  };
}

export default function AppointmentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user, accessToken } = useAuthStore();
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [labTests, setLabTests] = useState<LabTest[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [imagingServices, setImagingServices] = useState<ImagingService[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [dataSource, setDataSource] = useState<{
    labTests: 'appointment' | 'patient' | 'mixed';
    prescriptions: 'appointment' | 'patient' | 'mixed';
    imaging: 'appointment' | 'patient' | 'mixed';
  }>({ labTests: 'appointment', prescriptions: 'appointment', imaging: 'appointment' });
  
  // Dialog states
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedLabTest, setSelectedLabTest] = useState<LabTest | null>(null);
  const [selectedImagingService, setSelectedImagingService] = useState<ImagingService | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    paymentMethod: "cash",
    amount: 0,
    transactionId: "",
    notes: ""
  });
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentType, setPaymentType] = useState<'lab' | 'imaging'>('lab');

  useEffect(() => {
    if (params.id && accessToken) {
      fetchAppointmentWithAllData();
    }
  }, [params.id, accessToken]);

  // FETCH - Get appointment data and related lab tests and prescriptions
  const fetchAppointmentWithAllData = async () => {
    try {
      setLoading(true);
      
      // Use the combined medical records endpoint
      const response = await fetch(`/api/appointments/${params.id}/medical-records`, {
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
      });
      
      const data = await response.json();
      
      if (data.success) {
        console.log("📊 Medical records source:", data.data.source);
        setAppointment(data.data.appointment);
        setLabTests(data.data.labTests || []);
        setPrescriptions(data.data.prescriptions || []);
        setImagingServices(data.data.imagingServices || []);
        setDataSource(data.data.source || { labTests: 'appointment', prescriptions: 'appointment', imaging: 'appointment' });
        
        // Log counts for debugging
        console.log(`✅ Loaded: ${data.data.labTests?.length || 0} lab tests, ${data.data.prescriptions?.length || 0} prescriptions, ${data.data.imagingServices?.length || 0} imaging services`);
      } else {
        console.warn("⚠️ Medical records endpoint failed, falling back to separate endpoints");
        toast.error(data.error || "Failed to fetch appointment details");
        // Fallback to old method if new endpoint fails
        await fetchAppointmentWithAllDataFallback();
      }
    } catch (error) {
      console.error("Error fetching medical records:", error);
      console.warn("⚠️ Medical records endpoint failed, falling back to separate endpoints");
      await fetchAppointmentWithAllDataFallback();
    } finally {
      setLoading(false);
    }
  };

  const fetchAppointmentWithAllDataFallback = async () => {
    try {
      // Fetch appointment with all related data
      const response = await fetch(`/api/appointments/${params.id}`, {
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
      });
      
      const data = await response.json();
      
      if (data.success) {
        setAppointment(data.data);
        
        // Fetch ALL data in parallel for better performance
        await Promise.all([
          fetchLabTests(data.data.patient._id),
          fetchPrescriptions(data.data.patient._id),
          fetchImagingServices()
        ]);
      } else {
        toast.error(data.error || "Failed to fetch appointment details");
      }
    } catch (error) {
      console.error("Error fetching appointment fallback:", error);
      toast.error("Network error. Please try again.");
    }
  };

  // Unified imaging services fetcher
  const fetchImagingServices = async () => {
    try {
      console.log(`🔍 FETCHING IMAGING SERVICES for appointment ${params.id}`);
      
      const response = await fetch(`/api/appointments/${params.id}/imaging`, {
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
      });
      
      const data = await response.json();
      
      if (data.success && Array.isArray(data.data)) {
        console.log(`✅ Found ${data.data.length} imaging services`);
        setImagingServices(data.data);
        setDataSource(prev => ({ ...prev, imaging: 'appointment' }));
      } else {
        console.warn("⚠️ No imaging services found");
        setImagingServices([]);
      }
    } catch (error) {
      console.error("💥 Error fetching imaging services:", error);
      setImagingServices([]);
    }
  };

  // Unified lab tests fetcher
  const fetchLabTests = async (patientId: string) => {
    try {
      console.log(`🔍 FETCHING LAB TESTS for appointment ${params.id} and patient ${patientId}`);
      
      // Try appointment-specific lab tests first
      const appointmentResponse = await fetch(`/api/appointments/${params.id}/lab-tests`, {
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
      });
      
      const appointmentData = await appointmentResponse.json();
      
      let labTestsData = [];
      let source: 'appointment' | 'patient' | 'mixed' = 'appointment';
      
      if (appointmentData.success && Array.isArray(appointmentData.data)) {
        console.log(`✅ Found ${appointmentData.data.length} appointment-specific lab tests`);
        labTestsData = appointmentData.data;
        source = 'appointment';
      }
      
      // If no appointment-specific lab tests, fetch patient-specific ones
      if (labTestsData.length === 0) {
        console.log(`⚠️ No appointment-specific lab tests, fetching patient-specific lab tests`);
        const patientResponse = await fetch(`/api/doctor/patients/${patientId}/lab-tests`, {
          headers: {
            "Content-Type": "application/json",
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
        });
        
        const patientData = await patientResponse.json();
        
        if (patientData.success && Array.isArray(patientData.data)) {
          console.log(`✅ Found ${patientData.data.length} patient-specific lab tests`);
          labTestsData = patientData.data;
          source = 'patient';
        }
      }
      
      // Filter to show only relevant tests (recent or appointment-specific)
      const filteredTests = filterLabTestsByRelevance(labTestsData);
      console.log(`📊 Setting ${filteredTests.length} lab tests to display (source: ${source})`);
      setLabTests(filteredTests);
      setDataSource(prev => ({ ...prev, labTests: source }));
      
    } catch (error) {
      console.error("💥 Error fetching lab tests:", error);
      setLabTests([]);
    }
  };

  // Unified prescriptions fetcher
  const fetchPrescriptions = async (patientId: string) => {
    try {
      console.log(`🔍 FETCHING PRESCRIPTIONS for appointment ${params.id} and patient ${patientId}`);
      
      // Try appointment-specific prescriptions first
      const appointmentResponse = await fetch(`/api/appointments/${params.id}/prescriptions`, {
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
      });
      
      const appointmentData = await appointmentResponse.json();
      
      let prescriptionsData = [];
      let source: 'appointment' | 'patient' | 'mixed' = 'appointment';
      
      if (appointmentData.success && Array.isArray(appointmentData.data)) {
        console.log(`✅ Found ${appointmentData.data.length} appointment-specific prescriptions`);
        prescriptionsData = appointmentData.data;
        source = 'appointment';
      }
      
      // If no appointment-specific prescriptions, fetch patient-specific ones
      if (prescriptionsData.length === 0) {
        console.log(`⚠️ No appointment-specific prescriptions, fetching patient-specific prescriptions`);
        const patientResponse = await fetch(`/api/doctor/patients/${patientId}/prescriptions`, {
          headers: {
            "Content-Type": "application/json",
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
        });
        
        const patientData = await patientResponse.json();
        
        if (patientData.success && Array.isArray(patientData.data)) {
          console.log(`✅ Found ${patientData.data.length} patient-specific prescriptions`);
          prescriptionsData = patientData.data;
          source = 'patient';
        }
      }
      
      // Filter to show only relevant prescriptions
      const filteredPrescriptions = filterPrescriptionsByRelevance(prescriptionsData);
      console.log(`📊 Setting ${filteredPrescriptions.length} prescriptions to display (source: ${source})`);
      setPrescriptions(filteredPrescriptions);
      setDataSource(prev => ({ ...prev, prescriptions: source }));
      
    } catch (error) {
      console.error("💥 Error fetching prescriptions:", error);
      setPrescriptions([]);
    }
  };

  // Helper: Filter lab tests to show relevant ones
  const filterLabTestsByRelevance = (tests: LabTest[]) => {
    if (!tests || tests.length === 0) return [];
    
    // Sort by most recent first
    const sortedTests = [...tests].sort((a, b) => 
      new Date(b.orderedAt).getTime() - new Date(a.orderedAt).getTime()
    );
    
    // Return only tests from the last 30 days or all if less than 10
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentTests = sortedTests.filter(test => 
      new Date(test.orderedAt) >= thirtyDaysAgo
    );
    
    return recentTests.length > 0 ? recentTests : sortedTests.slice(0, 10);
  };

  // Helper: Filter prescriptions to show relevant ones
  const filterPrescriptionsByRelevance = (prescriptions: Prescription[]) => {
    if (!prescriptions || prescriptions.length === 0) return [];
    
    // Sort by most recent first
    const sortedPrescriptions = [...prescriptions].sort((a, b) => 
      new Date(b.prescribedDate).getTime() - new Date(a.prescribedDate).getTime()
    );
    
    // Return only active or recent prescriptions
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const relevantPrescriptions = sortedPrescriptions.filter(prescription => {
      const isActive = prescription.status === 'active';
      const isRecent = new Date(prescription.prescribedDate) >= thirtyDaysAgo;
      const isNotExpired = new Date(prescription.expiryDate) > new Date();
      
      return isActive && isNotExpired && isRecent;
    });
    
    return relevantPrescriptions.length > 0 ? relevantPrescriptions : sortedPrescriptions.slice(0, 10);
  };

  // Process payment for lab test
  const handleProcessPayment = async () => {
    if (paymentType === 'lab' && !selectedLabTest) return;
    if (paymentType === 'imaging' && !selectedImagingService) return;
    
    try {
      setProcessingPayment(true);
      
      let url, body;
      
      if (paymentType === 'lab' && selectedLabTest) {
        url = `/api/reception/lab-tests/${selectedLabTest._id}/charges`;
        body = {
          paymentMethod: paymentForm.paymentMethod,
          paidAmount: paymentForm.amount,
          transactionId: paymentForm.transactionId,
          verifyPayment: true
        };
      } else if (paymentType === 'imaging' && selectedImagingService) {
        url = `/api/radiology/services/${selectedImagingService._id}/charges`;
        body = {
          paymentMethod: paymentForm.paymentMethod,
          paidAmount: paymentForm.amount,
          transactionId: paymentForm.transactionId,
          verifyPayment: true
        };
      } else {
        return;
      }
      
      const response = await fetch(url, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify(body),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success("Payment processed successfully");
        setPaymentDialogOpen(false);
        fetchAppointmentWithAllData(); // Refresh all data
      } else {
        toast.error(data.error || "Failed to process payment");
      }
    } catch (error) {
      console.error("Error processing payment:", error);
      toast.error("Network error. Please try again.");
    } finally {
      setProcessingPayment(false);
    }   
  };

  // Print receipt
  const handlePrintReceipt = (labTest: LabTest) => {
    const receiptContent = `
      HOSPITAL RECEIPT
      =================
      Receipt #: ${labTest.charges?.transactionId || `TXN-${Date.now()}`}
      Date: ${format(new Date(), "yyyy-MM-dd HH:mm")}
      
      Patient: ${appointment?.patient?.name}
      Patient ID: ${appointment?.patient?.patientId}
      
      Test: ${labTest.testName}
      Test ID: ${labTest.testId}
      
      Charges:
        Base Price: $${(labTest.discountedPrice || labTest.price || 0).toFixed(2)}
        Tax: $${labTest.charges?.tax?.toFixed(2) || "0.00"}
        Other Charges: $${labTest.charges?.otherCharges?.toFixed(2) || "0.00"}
        Discount: -$${labTest.charges?.discount?.toFixed(2) || "0.00"}
        -----------------
        Total: ${calculateTestTotal(labTest).toFixed(2)}
      
      Payment:
        Method: ${labTest.charges?.paymentMethod || "cash"}
        Amount Paid: $${labTest.charges?.paid?.toFixed(2) || "0.00"}
        Due: $${labTest.charges?.due?.toFixed(2) || calculateTestTotal(labTest).toFixed(2)}
      
      Processed by: ${user?.name}
      =================
      Thank you for your payment!
    `;
    
    const printWindow = window.open('', '_blank');
    printWindow?.document.write(`
      <html>
        <head>
          <title>Receipt - ${labTest.testName}</title>
          <style>
            body { font-family: monospace; padding: 20px; }
            h1 { text-align: center; }
            .receipt { max-width: 400px; margin: 0 auto; }
            .total { font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="receipt">
            <pre>${receiptContent}</pre>
          </div>
          <script>
            window.onload = function() {
              window.print();
              window.close();
            }
          </script>
        </body>
      </html>
    `);
  };

  // Print imaging receipt
  const handlePrintImagingReceipt = (service: ImagingService) => {
    const receiptContent = `
      HOSPITAL RECEIPT
      =================
      Receipt #: ${service.charges?.transactionId || `TXN-${Date.now()}`}
      Date: ${format(new Date(), "yyyy-MM-dd HH:mm")}
      
      Patient: ${appointment?.patient?.name}
      Patient ID: ${appointment?.patient?.patientId}
      
      Imaging Service: ${service.serviceType === 'x-ray' ? 'X-Ray' :
                       service.serviceType === 'ct-scan' ? 'CT Scan' :
                       service.serviceType === 'mri' ? 'MRI' : 'Ultrasound'}
      Service ID: ${service.serviceId}
      Body Part: ${service.bodyPart}
      View: ${service.view}
      
      Charges:
        Base Price: $${(service.charges?.basePrice || 0).toFixed(2)}
        Tax: $${service.charges?.tax?.toFixed(2) || "0.00"}
        Other Charges: $${service.charges?.otherCharges?.toFixed(2) || "0.00"}
        Discount: -$${service.charges?.discount?.toFixed(2) || "0.00"}
        -----------------
        Total: ${(service.charges?.totalAmount || 0).toFixed(2)}
      
      Payment:
        Method: ${service.charges?.paymentMethod || "cash"}
        Amount Paid: $${(service.charges?.paid || 0).toFixed(2)}
        Due: $${(service.charges?.due || (service.charges?.totalAmount || 0)).toFixed(2)}
      
      Processed by: ${user?.name}
      =================
      Thank you for your payment!
    `;
    
    const printWindow = window.open('', '_blank');
    printWindow?.document.write(`
      <html>
        <head>
          <title>Receipt - ${service.serviceType}</title>
          <style>
            body { font-family: monospace; padding: 20px; }
            h1 { text-align: center; }
            .receipt { max-width: 400px; margin: 0 auto; }
            .total { font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="receipt">
            <pre>${receiptContent}</pre>
          </div>
          <script>
            window.onload = function() {
              window.print();
              window.close();
            }
          </script>
        </body>
      </html>
    `);
  };

  // Copy prescription to clipboard
  const handleCopyToDispensary = (prescription: Prescription) => {
    const medsText = prescription.medications.map(med => 
      `${med.name} - ${med.dosage} - ${med.frequency} - ${med.duration} - Qty: ${med.quantity}`
    ).join('\n');
    
    const fullText = `
      Prescription #: ${prescription.prescriptionId}
      Patient: ${prescription.patient.name} (${prescription.patient.patientId})
      Doctor: Dr. ${prescription.doctor.name}
      Date: ${format(parseISO(prescription.prescribedDate), "yyyy-MM-dd")}
      Diagnosis: ${prescription.diagnosis}
      
      Medications:
      ${medsText}
      
      Instructions: ${prescription.instructions}
    `;
    
    navigator.clipboard.writeText(fullText)
      .then(() => toast.success("Copied to clipboard for dispensary"))
      .catch(() => toast.error("Failed to copy to clipboard"));
  };

  // Calculate test total
  const calculateTestTotal = (test: LabTest) => {
    const base = test.discountedPrice || test.price || 0;
    const tax = test.charges?.tax || 0;
    const other = test.charges?.otherCharges || 0;
    const discount = test.charges?.discount || 0;
    return base + tax + other - discount;
  };

  // Calculate billing totals
  const calculateTotals = () => {
    const consultationFee = appointment?.appointmentType === "emergency" ? 150 :
                          appointment?.appointmentType === "procedure" ? 200 : 100;
    
    const labTestsTotal = labTests.reduce((sum, test) => sum + calculateTestTotal(test), 0);
    const prescriptionsTotal = prescriptions.reduce((sum, prescription) => {
      return sum + (prescription.medications.reduce((medSum, med) => 
        medSum + ((med.price || 0) * (med.quantity || 1)), 0) || 0);
    }, 0);
    
    const totalAmount = consultationFee + labTestsTotal + prescriptionsTotal;
    const paidAmount = labTests.reduce((sum, test) => sum + (test.charges?.paid || 0), 0);
    const dueAmount = labTests.reduce((sum, test) => sum + (test.charges?.due || calculateTestTotal(test)), 0);
    
    return {
      consultationFee,
      labTestsTotal,
      prescriptionsTotal,
      totalAmount,
      paidAmount,
      dueAmount,
      paymentStatus: dueAmount === 0 ? "fully_paid" : paidAmount > 0 ? "partial" : "pending"
    };
  };

  const totals = calculateTotals();

  // Badge helpers
  const getPaymentStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
      partial: "bg-blue-100 text-blue-800 hover:bg-blue-100",
      paid: "bg-green-100 text-green-800 hover:bg-green-100",
      cancelled: "bg-red-100 text-red-800 hover:bg-red-100"
    };
    
    return (
      <Badge className={variants[status] || "bg-gray-100"}>
        {status?.toUpperCase() || "PENDING"}
      </Badge>
    );
  };

  const getLabStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
      ordered: "bg-blue-100 text-blue-800 hover:bg-blue-100",
      collected: "bg-purple-100 text-purple-800 hover:bg-purple-100",
      processing: "bg-orange-100 text-orange-800 hover:bg-orange-100",
      completed: "bg-green-100 text-green-800 hover:bg-green-100",
      reported: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100",
      cancelled: "bg-red-100 text-red-800 hover:bg-red-100"
    };
    
    return (
      <Badge className={variants[status] || "bg-gray-100"}>
        {status?.toUpperCase() || "UNKNOWN"}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      scheduled: "bg-blue-50 text-blue-700 border-blue-200",
      confirmed: "bg-green-50 text-green-700 border-green-200",
      "checked-in": "bg-purple-50 text-purple-700 border-purple-200",
      "in-progress": "bg-yellow-50 text-yellow-700 border-yellow-200",
      completed: "bg-gray-50 text-gray-700 border-gray-200",
      cancelled: "bg-red-50 text-red-700 border-red-200"
    };
    
    return (
      <Badge variant="outline" className={variants[status] || ""}>
        {status?.toUpperCase()}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "emergency": return <Badge variant="destructive">Emergency</Badge>;
      case "high": return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">High</Badge>;
      case "medium": return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Medium</Badge>;
      case "low": return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Low</Badge>;
      default: return <Badge variant="secondary">{priority}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading appointment details...</p>
        </div>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Appointment Not Found</h2>
            <Button onClick={() => router.push("/appointments")}>
              Back to Appointments
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push("/appointments")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Appointment Details</h1>
            <p className="text-gray-500">ID: {appointment.appointmentId}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={fetchAppointmentWithAllData}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      {/* Patient Info Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <h3 className="font-semibold">Patient Information</h3>
              </div>
              <p className="text-lg font-bold">{appointment.patient.name}</p>
              <div className="space-y-1 text-sm">
                <p>ID: {appointment.patient.patientId}</p>
                <p>Phone: {appointment.patient.phone}</p>
                {appointment.patient.bloodGroup && (
                  <p>Blood Group: {appointment.patient.bloodGroup}</p>
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Stethoscope className="h-4 w-4" />
                <h3 className="font-semibold">Doctor Information</h3>
              </div>
              <p className="text-lg font-bold">Dr. {appointment.doctor.name}</p>
              <div className="space-y-1 text-sm">
                <p>Specialization: {appointment.doctor.specialization}</p>
                <p>Department: {appointment.doctor.department}</p>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <h3 className="font-semibold">Appointment Details</h3>
              </div>
              <div className="space-y-1 text-sm">
                <p>Date: {format(parseISO(appointment.date), "MMMM d, yyyy")}</p>
                <p>Type: {appointment.appointmentType}</p>
                <p>Status: {getStatusBadge(appointment.status)}</p>
                <p>Priority: {getPriorityBadge(appointment.priority)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="lab-tests">
            Lab Tests {labTests.length > 0 && `(${labTests.length})`}
          </TabsTrigger>
          <TabsTrigger value="prescriptions">
            Prescriptions {prescriptions.length > 0 && `(${prescriptions.length})`}
          </TabsTrigger>
          <TabsTrigger value="imaging">
            Imaging {imagingServices.length > 0 && `(${imagingServices.length})`}
          </TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Appointment Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-gray-500">Reason for Visit</Label>
                  <p className="font-medium">{appointment.reason}</p>
                </div>
                {appointment.notes && (
                  <div className="space-y-2">
                    <Label className="text-gray-500">Notes</Label>
                    <p className="font-medium">{appointment.notes}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-500">Start Time</Label>
                    <p className="font-medium">{format(parseISO(appointment.startTime), "h:mm a")}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Duration</Label>
                    <p className="font-medium">{appointment.duration} minutes</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Lab Tests:</span>
                  <Badge variant="outline">{labTests.length}</Badge>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span>Prescriptions:</span>
                  <Badge variant="outline">{prescriptions.length}</Badge>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span>Total Amount:</span>
                  <span className="font-bold">${totals.totalAmount.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span>Amount Due:</span>
                  <span className="font-bold text-red-600">${totals.dueAmount.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Lab Tests Tab */}
        <TabsContent value="lab-tests" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FlaskConical className="h-5 w-5" />
                Laboratory Tests
              </CardTitle>
              <CardDescription className="flex items-center gap-2">
                Manage and process payments for laboratory tests
                {labTests.length > 0 && (
                  <Badge variant="outline" className="ml-2">
                    {dataSource.labTests === 'appointment' ? 'Appointment-specific' : 
                     dataSource.labTests === 'patient' ? 'Patient history' : 'Mixed sources'}
                  </Badge>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {labTests.length === 0 ? (
                <div className="text-center py-12">
                  <FlaskConical className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p>No lab tests ordered</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Test ID</TableHead>
                        <TableHead>Test Name</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Payment Status</TableHead>
                        <TableHead>Due</TableHead>
                        <TableHead>Test Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {labTests.map((test) => (
                        <TableRow key={test._id}>
                          <TableCell className="font-medium">{test.testId}</TableCell>
                          <TableCell>{test.testName}</TableCell>
                          <TableCell>${(test.discountedPrice || test.price || 0).toFixed(2)}</TableCell>
                          <TableCell>${calculateTestTotal(test).toFixed(2)}</TableCell>
                          <TableCell>
                            {getPaymentStatusBadge(test.charges?.paymentStatus || "pending")}
                          </TableCell>
                          <TableCell className="font-bold text-red-600">
                            ${test.charges?.due?.toFixed(2) || calculateTestTotal(test).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            {getLabStatusBadge(test.status)}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedLabTest(test);
                                  setPaymentForm({
                                    paymentMethod: test.charges?.paymentMethod || "cash",
                                    amount: test.charges?.due || calculateTestTotal(test),
                                    transactionId: test.charges?.transactionId || "",
                                    notes: ""
                                  });
                                  setPaymentDialogOpen(true);
                                }}
                                disabled={test.charges?.paymentStatus === "paid"}
                              >
                                <CreditCard className="h-3 w-3 mr-1" />
                                Pay
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handlePrintReceipt(test)}
                              >
                                <Receipt className="h-3 w-3 mr-1" />
                                Receipt
                              </Button>
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

        {/* Prescriptions Tab */}
        <TabsContent value="prescriptions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Pill className="h-5 w-5" />
                Prescriptions
              </CardTitle>
              <CardDescription className="flex items-center gap-2">
                All prescriptions issued for this patient
                {prescriptions.length > 0 && (
                  <Badge variant="outline" className="ml-2">
                    {dataSource.prescriptions === 'appointment' ? 'Appointment-specific' : 
                     dataSource.prescriptions === 'patient' ? 'Patient history' : 'Mixed sources'}
                  </Badge>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {prescriptions.length === 0 ? (
                <div className="text-center py-12">
                  <Pill className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p>No prescriptions</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {prescriptions.map((prescription) => (
                    <Card key={prescription._id}>
                      <CardContent className="pt-6">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="font-semibold">{prescription.prescriptionId}</h3>
                            <p className="text-sm text-gray-500">
                              {format(parseISO(prescription.prescribedDate), "MMM d, yyyy")}
                            </p>
                            <p className="mt-1">Diagnosis: {prescription.diagnosis}</p>
                          </div>
                          <Badge>{prescription.status}</Badge>
                        </div>
                        
                        <div className="space-y-3">
                          <h4 className="font-medium">Medications:</h4>
                          {prescription.medications.map((med, index) => (
                            <div key={index} className="pl-4 border-l-2">
                              <div className="flex justify-between">
                                <span className="font-medium">{med.name}</span>
                                <span>${(med.price || 0).toFixed(2)} × {med.quantity}</span>
                              </div>
                              <p className="text-sm text-gray-500">
                                {med.dosage} • {med.frequency} • {med.duration}
                              </p>
                            </div>
                          ))}
                        </div>
                        
                        <div className="mt-4 pt-4 border-t flex justify-between items-center">
                          <div>
                            <p className="text-sm text-gray-500">Total Medications Cost:</p>
                            <p className="font-bold">
                              ${prescription.medications.reduce((sum, med) => 
                                sum + (med.quantity || 1) * (med.price || 0), 0).toFixed(2)}
                            </p>
                          </div>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleCopyToDispensary(prescription)}
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            Copy to Dispensary
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Imaging Tab */}
        <TabsContent value="imaging" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scan className="h-5 w-5" />
                Imaging Services
              </CardTitle>
              <CardDescription className="flex items-center gap-2">
                Manage and process payments for imaging services (X-Ray, CT Scan, MRI, Ultrasound)
                {imagingServices.length > 0 && (
                  <Badge variant="outline" className="ml-2">
                    {dataSource.imaging === 'appointment' ? 'Appointment-specific' : 
                     dataSource.imaging === 'patient' ? 'Patient history' : 'Mixed sources'}
                  </Badge>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {imagingServices.length === 0 ? (
                <div className="text-center py-12">
                  <Scan className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p>No imaging services ordered</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Service ID</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Body Part</TableHead>
                        <TableHead>View</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Payment Status</TableHead>
                        <TableHead>Due</TableHead>
                        <TableHead>Service Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {imagingServices.map((service) => (
                        <TableRow key={service._id}>
                          <TableCell className="font-medium">{service.serviceId}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {service.serviceType === 'x-ray' ? 'X-Ray' :
                               service.serviceType === 'ct-scan' ? 'CT Scan' :
                               service.serviceType === 'mri' ? 'MRI' : 'Ultrasound'}
                            </Badge>
                          </TableCell>
                          <TableCell>{service.bodyPart}</TableCell>
                          <TableCell>{service.view}</TableCell>
                          <TableCell>${(service.charges?.totalAmount || 0).toFixed(2)}</TableCell>
                          <TableCell>
                            {getPaymentStatusBadge(service.charges?.paymentStatus || "pending")}
                          </TableCell>
                          <TableCell className="font-bold text-red-600">
                            ${service.charges?.due?.toFixed(2) || (service.charges?.totalAmount || 0).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            {getLabStatusBadge(service.status)}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedImagingService(service);
                                  setPaymentType('imaging');
                                  setPaymentForm({
                                    paymentMethod: service.charges?.paymentMethod || "cash",
                                    amount: service.charges?.due || (service.charges?.totalAmount || 0),
                                    transactionId: service.charges?.transactionId || "",
                                    notes: ""
                                  });
                                  setPaymentDialogOpen(true);
                                }}
                                disabled={service.charges?.paymentStatus === "paid"}
                              >
                                <CreditCard className="h-3 w-3 mr-1" />
                                Pay
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handlePrintImagingReceipt(service)}
                              >
                                <Receipt className="h-3 w-3 mr-1" />
                                Receipt
                              </Button>
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
          <Card>
            <CardHeader>
              <CardTitle>Billing Summary</CardTitle>
              <CardDescription>
                Complete financial breakdown of this appointment
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Invoice Table */}
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">Consultation Fee</TableCell>
                      <TableCell className="text-right">${totals.consultationFee.toFixed(2)}</TableCell>
                    </TableRow>
                    
                    {labTests.map((test) => (
                      <TableRow key={test._id}>
                        <TableCell>
                          <div>
                            <p>{test.testName}</p>
                            <p className="text-sm text-gray-500">{test.testId}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          ${calculateTestTotal(test).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                    
                    <TableRow className="font-bold border-t">
                      <TableCell>Total Amount</TableCell>
                      <TableCell className="text-right">
                        ${totals.totalAmount.toFixed(2)}
                      </TableCell>
                    </TableRow>
                    
                    <TableRow>
                      <TableCell>Total Paid</TableCell>
                      <TableCell className="text-right text-green-600">
                        ${totals.paidAmount.toFixed(2)}
                      </TableCell>
                    </TableRow>
                    
                    <TableRow>
                      <TableCell className="font-bold">Balance Due</TableCell>
                      <TableCell className="text-right font-bold text-red-600">
                        ${totals.dueAmount.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              {/* Payment Actions */}
              <div className="flex gap-3 justify-center">
                {totals.dueAmount > 0 && (
                  <Button size="lg" onClick={() => {
                    const unpaidTest = labTests.find(t => 
                      !t.charges?.paymentStatus || 
                      t.charges?.paymentStatus !== "paid"
                    );
                    if (unpaidTest) {
                      setSelectedLabTest(unpaidTest);
                      setPaymentForm({
                        paymentMethod: unpaidTest.charges?.paymentMethod || "cash",
                        amount: unpaidTest.charges?.due || calculateTestTotal(unpaidTest),
                        transactionId: unpaidTest.charges?.transactionId || "",
                        notes: ""
                      });
                      setPaymentDialogOpen(true);
                    }
                  }}>
                    <DollarSign className="h-4 w-4 mr-2" />
                    Process All Payments
                  </Button>
                )}
                <Button size="lg" variant="outline" onClick={() => window.print()}>
                  <Printer className="h-4 w-4 mr-2" />
                  Print Full Invoice
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Process Payment</DialogTitle>
            <DialogDescription>
              {paymentType === 'lab' 
                ? `Process payment for ${selectedLabTest?.testName}`
                : `Process payment for ${selectedImagingService?.serviceType === 'x-ray' ? 'X-Ray' :
                    selectedImagingService?.serviceType === 'ct-scan' ? 'CT Scan' :
                    selectedImagingService?.serviceType === 'mri' ? 'MRI' : 'Ultrasound'}`
              }
            </DialogDescription>
          </DialogHeader>
          
          {(paymentType === 'lab' && selectedLabTest) && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg">
                <p className="font-medium">Test: {selectedLabTest.testName}</p>
                <p className="text-sm">Total Due: ${selectedLabTest.charges?.due?.toFixed(2) || calculateTestTotal(selectedLabTest).toFixed(2)}</p>
              </div>
              
              <div className="space-y-3">
                <div>
                  <Label>Payment Method</Label>
                  <Select
                    value={paymentForm.paymentMethod}
                    onValueChange={(value) => setPaymentForm(prev => ({ ...prev, paymentMethod: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="card">Credit/Debit Card</SelectItem>
                      <SelectItem value="upi">UPI</SelectItem>
                      <SelectItem value="insurance">Insurance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Amount</Label>
                  <Input
                    type="number"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm(prev => ({ 
                      ...prev, 
                      amount: parseFloat(e.target.value) || 0 
                    }))}
                    placeholder="Enter amount"
                  />
                </div>
                
                <div>
                  <Label>Transaction/Reference ID</Label>
                  <Input
                    value={paymentForm.transactionId}
                    onChange={(e) => setPaymentForm(prev => ({ ...prev, transactionId: e.target.value }))}
                    placeholder="Optional"
                  />
                </div>
              </div>
            </div>
          )}
          
          {(paymentType === 'imaging' && selectedImagingService) && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg">
                <p className="font-medium">
                  Service: {selectedImagingService.serviceType === 'x-ray' ? 'X-Ray' :
                           selectedImagingService.serviceType === 'ct-scan' ? 'CT Scan' :
                           selectedImagingService.serviceType === 'mri' ? 'MRI' : 'Ultrasound'}
                </p>
                <p className="text-sm">Body Part: {selectedImagingService.bodyPart}</p>
                <p className="text-sm">Total Due: ${(selectedImagingService.charges?.due || (selectedImagingService.charges?.totalAmount || 0)).toFixed(2)}</p>
              </div>
              
              <div className="space-y-3">
                <div>
                  <Label>Payment Method</Label>
                  <Select
                    value={paymentForm.paymentMethod}
                    onValueChange={(value) => setPaymentForm(prev => ({ ...prev, paymentMethod: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="card">Credit/Debit Card</SelectItem>
                      <SelectItem value="upi">UPI</SelectItem>
                      <SelectItem value="insurance">Insurance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Amount</Label>
                  <Input
                    type="number"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm(prev => ({ 
                      ...prev, 
                      amount: parseFloat(e.target.value) || 0 
                    }))}
                    placeholder="Enter amount"
                  />
                </div>
                
                <div>
                  <Label>Transaction/Reference ID</Label>
                  <Input
                    value={paymentForm.transactionId}
                    onChange={(e) => setPaymentForm(prev => ({ ...prev, transactionId: e.target.value }))}
                    placeholder="Optional"
                  />
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleProcessPayment} disabled={processingPayment}>
              {processingPayment ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                "Process Payment"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}