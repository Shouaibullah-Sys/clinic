// app/appointments/[id]/page.tsx

"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Calendar,
  User,
  Stethoscope,
  DollarSign,
  FlaskConical,
  Pill,
  Printer,
  ArrowLeft,
  CheckCircle,
  CreditCard,
  RefreshCw,
  Loader2,
  Receipt,
  Copy,
  AlertCircle,
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
  const { user, accessToken, isAuthenticated, isLoading } = useAuthStore();
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [labTests, setLabTests] = useState<LabTest[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [imagingServices, setImagingServices] = useState<ImagingService[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [dataSource, setDataSource] = useState<{
    labTests: "appointment" | "patient" | "mixed";
    prescriptions: "appointment" | "patient" | "mixed";
    imaging: "appointment" | "patient" | "mixed";
  }>({
    labTests: "appointment",
    prescriptions: "appointment",
    imaging: "appointment",
  });

  // Role-based access control
  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push("/login");
      } else if (user?.role !== "receptionist" && user?.role !== "admin") {
        router.push("/unauthorized");
      }
    }
  }, [isAuthenticated, user, isLoading, router]);

  // Dialog states
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedLabTest, setSelectedLabTest] = useState<LabTest | null>(null);
  const [selectedImagingService, setSelectedImagingService] =
    useState<ImagingService | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    paymentMethod: "cash",
    amount: 0,
    transactionId: "",
    notes: "",
    price: 0,
  });
  const [processingPayment, setProcessingPayment] = useState(false);
  const [selectedPrescription, setSelectedPrescription] =
    useState<Prescription | null>(null);
  const [paymentType, setPaymentType] = useState<
    "lab" | "imaging" | "prescription"
  >("lab");

  useEffect(() => {
    if (params.id && accessToken) {
      fetchAppointmentWithAllData();
    }
  }, [params.id, accessToken]);

  // FETCH - Get appointment data and related lab tests and prescriptions
  const fetchAppointmentWithAllData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response = await fetch(
        `/api/appointments/${params.id}/medical-records?_t=${Date.now()}`,
        {
          headers: {
            "Content-Type": "application/json",
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
        },
      );

      const data = await response.json();

      if (data.success) {
        setAppointment(data.data.appointment);
        setLabTests(data.data.labTests || []);
        setPrescriptions(data.data.prescriptions || []);
        setImagingServices(data.data.imagingServices || []);
        setDataSource(
          data.data.source || {
            labTests: "appointment",
            prescriptions: "appointment",
            imaging: "appointment",
          },
        );

        if (isRefresh) {
          toast.success("Data refreshed successfully");
        }
      } else {
        toast.error(data.error || "Failed to fetch appointment details");
        await fetchAppointmentWithAllDataFallback();
      }
    } catch (error) {
      console.error("Error fetching medical records:", error);
      toast.error("Network error. Please try again.");
      await fetchAppointmentWithAllDataFallback();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchAppointmentWithAllDataFallback = async () => {
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
        await Promise.all([
          fetchLabTests(data.data.patient._id),
          fetchPrescriptions(data.data.patient._id),
          fetchImagingServices(),
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
      const response = await fetch(`/api/appointments/${params.id}/imaging`, {
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
      });

      const data = await response.json();

      if (data.success && Array.isArray(data.data)) {
        setImagingServices(data.data);
        setDataSource((prev) => ({ ...prev, imaging: "appointment" }));
      } else {
        setImagingServices([]);
      }
    } catch (error) {
      console.error("Error fetching imaging services:", error);
      setImagingServices([]);
    }
  };

  // Unified lab tests fetcher
  const fetchLabTests = async (patientId: string) => {
    try {
      const appointmentResponse = await fetch(
        `/api/appointments/${params.id}/lab-tests`,
        {
          headers: {
            "Content-Type": "application/json",
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
        },
      );

      const appointmentData = await appointmentResponse.json();

      let labTestsData = [];
      let source: "appointment" | "patient" | "mixed" = "appointment";

      if (appointmentData.success && Array.isArray(appointmentData.data)) {
        labTestsData = appointmentData.data;
        source = "appointment";
      }

      if (labTestsData.length === 0) {
        const patientResponse = await fetch(
          `/api/doctor/patients/${patientId}/lab-tests`,
          {
            headers: {
              "Content-Type": "application/json",
              ...(accessToken
                ? { Authorization: `Bearer ${accessToken}` }
                : {}),
            },
          },
        );

        const patientData = await patientResponse.json();

        if (patientData.success && Array.isArray(patientData.data)) {
          labTestsData = patientData.data;
          source = "patient";
        }
      }

      const filteredTests = filterLabTestsByRelevance(labTestsData);
      setLabTests(filteredTests);
      setDataSource((prev) => ({ ...prev, labTests: source }));
    } catch (error) {
      console.error("Error fetching lab tests:", error);
      setLabTests([]);
    }
  };

  // Unified prescriptions fetcher
  const fetchPrescriptions = async (patientId: string) => {
    try {
      const appointmentResponse = await fetch(
        `/api/appointments/${params.id}/prescriptions`,
        {
          headers: {
            "Content-Type": "application/json",
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
        },
      );

      const appointmentData = await appointmentResponse.json();

      let prescriptionsData = [];
      let source: "appointment" | "patient" | "mixed" = "appointment";

      if (appointmentData.success && Array.isArray(appointmentData.data)) {
        prescriptionsData = appointmentData.data;
        source = "appointment";
      }

      if (prescriptionsData.length === 0) {
        const patientResponse = await fetch(
          `/api/doctor/patients/${patientId}/prescriptions`,
          {
            headers: {
              "Content-Type": "application/json",
              ...(accessToken
                ? { Authorization: `Bearer ${accessToken}` }
                : {}),
            },
          },
        );

        const patientData = await patientResponse.json();

        if (patientData.success && Array.isArray(patientData.data)) {
          prescriptionsData = patientData.data;
          source = "patient";
        }
      }

      const filteredPrescriptions =
        filterPrescriptionsByRelevance(prescriptionsData);
      setPrescriptions(filteredPrescriptions);
      setDataSource((prev) => ({ ...prev, prescriptions: source }));
    } catch (error) {
      console.error("Error fetching prescriptions:", error);
      setPrescriptions([]);
    }
  };

  // Helper: Filter lab tests to show relevant ones
  const filterLabTestsByRelevance = (tests: LabTest[]) => {
    if (!tests || tests.length === 0) return [];

    const sortedTests = [...tests].sort(
      (a, b) =>
        new Date(b.orderedAt).getTime() - new Date(a.orderedAt).getTime(),
    );

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentTests = sortedTests.filter(
      (test) => new Date(test.orderedAt) >= thirtyDaysAgo,
    );

    return recentTests.length > 0 ? recentTests : sortedTests.slice(0, 10);
  };

  // Helper: Filter prescriptions to show relevant ones
  const filterPrescriptionsByRelevance = (prescriptions: Prescription[]) => {
    if (!prescriptions || prescriptions.length === 0) return [];

    const sortedPrescriptions = [...prescriptions].sort(
      (a, b) =>
        new Date(b.prescribedDate).getTime() -
        new Date(a.prescribedDate).getTime(),
    );

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const relevantPrescriptions = sortedPrescriptions.filter((prescription) => {
      const isActive = prescription.status === "active";
      const isRecent = new Date(prescription.prescribedDate) >= thirtyDaysAgo;
      const isNotExpired = new Date(prescription.expiryDate) > new Date();

      return isActive && isNotExpired && isRecent;
    });

    return relevantPrescriptions.length > 0
      ? relevantPrescriptions
      : sortedPrescriptions.slice(0, 10);
  };

  // Helper function to determine if payment should be disabled
  const isPaymentDisabled = (item: LabTest | ImagingService | Prescription) => {
    if ("testId" in item) {
      return item.charges?.paymentStatus === "paid";
    }

    if ("serviceId" in item) {
      return (
        item.charges?.paymentStatus === "paid" ||
        item.billingStatus === "paid" ||
        item.paymentVerified === true
      );
    }

    if ("prescriptionId" in item) {
      return (
        item.charges?.paymentStatus === "paid" || item.paymentVerified === true
      );
    }

    return false;
  };

  // Process payment for lab test, imaging, or prescription
  const handleProcessPayment = async () => {
    if (paymentType === "lab" && !selectedLabTest) return;
    if (paymentType === "imaging" && !selectedImagingService) return;
    if (paymentType === "prescription" && !selectedPrescription) return;

    if (
      paymentType === "lab" &&
      selectedLabTest &&
      isPaymentDisabled(selectedLabTest)
    ) {
      toast.error("This test has already been paid");
      setPaymentDialogOpen(false);
      return;
    }

    if (
      paymentType === "imaging" &&
      selectedImagingService &&
      isPaymentDisabled(selectedImagingService)
    ) {
      toast.error("This imaging service has already been paid");
      setPaymentDialogOpen(false);
      return;
    }

    if (
      paymentType === "prescription" &&
      selectedPrescription &&
      isPaymentDisabled(selectedPrescription)
    ) {
      toast.error("This prescription has already been paid");
      setPaymentDialogOpen(false);
      return;
    }

    try {
      setProcessingPayment(true);

      let url, body;

      if (paymentType === "lab" && selectedLabTest) {
        url = `/api/reception/lab-tests/${selectedLabTest._id}/charges`;
        body = {
          paymentMethod: paymentForm.paymentMethod,
          paidAmount: paymentForm.amount,
          transactionId: paymentForm.transactionId,
          verifyPayment: true,
          price: paymentForm.price > 0 ? paymentForm.price : undefined,
        };
      } else if (paymentType === "imaging" && selectedImagingService) {
        url = `/api/radiology/services/${selectedImagingService._id}/charges`;
        body = {
          paymentMethod: paymentForm.paymentMethod,
          paidAmount: paymentForm.amount,
          transactionId: paymentForm.transactionId,
          verifyPayment: true,
        };
      } else if (paymentType === "prescription" && selectedPrescription) {
        url = `/api/reception/prescriptions/${selectedPrescription._id}/payment`;
        body = {
          paymentMethod: paymentForm.paymentMethod,
          amount: paymentForm.amount,
          transactionId: paymentForm.transactionId,
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
        fetchAppointmentWithAllData(true);
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

    const printWindow = window.open("", "_blank");
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
      
      Imaging Service: ${
        service.serviceType === "x-ray"
          ? "X-Ray"
          : service.serviceType === "ct-scan"
            ? "CT Scan"
            : service.serviceType === "mri"
              ? "MRI"
              : "Ultrasound"
      }
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
        Due: $${(service.charges?.due || service.charges?.totalAmount || 0).toFixed(2)}
      
      Processed by: ${user?.name}
      =================
      Thank you for your payment!
    `;

    const printWindow = window.open("", "_blank");
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
    const medsText = prescription.medications
      .map(
        (med) =>
          `${med.name} - ${med.dosage} - ${med.frequency} - ${med.duration} - Qty: ${med.quantity}`,
      )
      .join("\n");

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

    navigator.clipboard
      .writeText(fullText)
      .then(() => toast.success("Copied to clipboard for dispensary"))
      .catch(() => toast.error("Failed to copy to clipboard"));
  };

  // Print prescription receipt
  const handlePrintPrescriptionReceipt = (prescription: Prescription) => {
    const medsText = prescription.medications
      .map(
        (med) =>
          `${med.name} - ${med.dosage} - ${med.frequency} - ${med.duration} - Qty: ${med.quantity} - ${((med.price || 0) * (med.quantity || 1)).toFixed(2)}`,
      )
      .join("\n");

    const total = calculatePrescriptionTotal(prescription);
    const receiptContent = `
      HOSPITAL RECEIPT
      =================
      Receipt #: ${prescription.charges?.transactionId || `TXN-${Date.now()}`}
      Date: ${format(new Date(), "yyyy-MM-dd HH:mm")}
      
      Patient: ${appointment?.patient?.name}
      Patient ID: ${appointment?.patient?.patientId}
      
      Prescription #: ${prescription.prescriptionId}
      Doctor: Dr. ${prescription.doctor.name}
      Date: ${format(parseISO(prescription.prescribedDate), "yyyy-MM-dd")}
      Diagnosis: ${prescription.diagnosis}
      
      Medications:
      ${medsText}
      
      Charges:
        Base Price: ${total.toFixed(2)}
        Tax: ${prescription.charges?.tax?.toFixed(2) || "0.00"}
        Other Charges: ${prescription.charges?.otherCharges?.toFixed(2) || "0.00"}
        Discount: -${prescription.charges?.discount?.toFixed(2) || "0.00"}
        -----------------
        Total: ${(prescription.charges?.totalAmount || total).toFixed(2)}
      
      Payment:
        Method: ${prescription.charges?.paymentMethod || "cash"}
        Amount Paid: ${prescription.charges?.paid?.toFixed(2) || "0.00"}
        Due: ${prescription.charges?.due?.toFixed(2) || (prescription.charges?.totalAmount || total).toFixed(2)}
      
      Processed by: ${user?.name}
      =================
      Thank you for your payment!
    `;

    const printWindow = window.open("", "_blank");
    printWindow?.document.write(`
      <html>
        <head>
          <title>Receipt - ${prescription.prescriptionId}</title>
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

  // Calculate test total
  const calculateTestTotal = (test: LabTest) => {
    const base = test.discountedPrice || test.price || 0;
    const tax = test.charges?.tax || 0;
    const other = test.charges?.otherCharges || 0;
    const discount = test.charges?.discount || 0;
    return base + tax + other - discount;
  };

  // Calculate prescription total
  const calculatePrescriptionTotal = (prescription: Prescription) => {
    return prescription.medications.reduce(
      (sum, med) => sum + (med.price || 0) * (med.quantity || 1),
      0,
    );
  };

  // Calculate billing totals
  const calculateTotals = () => {
    const consultationFee =
      appointment?.appointmentType === "emergency"
        ? 150
        : appointment?.appointmentType === "procedure"
          ? 200
          : 100;

    const labTestsTotal = labTests.reduce(
      (sum, test) => sum + calculateTestTotal(test),
      0,
    );
    const prescriptionsTotal = prescriptions.reduce((sum, prescription) => {
      return (
        sum +
        (prescription.medications.reduce(
          (medSum, med) => medSum + (med.price || 0) * (med.quantity || 1),
          0,
        ) || 0)
      );
    }, 0);

    const totalAmount = consultationFee + labTestsTotal + prescriptionsTotal;
    const paidAmount = labTests.reduce(
      (sum, test) => sum + (test.charges?.paid || 0),
      0,
    );
    const dueAmount = labTests.reduce(
      (sum, test) => sum + (test.charges?.due || calculateTestTotal(test)),
      0,
    );

    return {
      consultationFee,
      labTestsTotal,
      prescriptionsTotal,
      totalAmount,
      paidAmount,
      dueAmount,
      paymentStatus:
        dueAmount === 0 ? "fully_paid" : paidAmount > 0 ? "partial" : "pending",
    };
  };

  const totals = calculateTotals();

  // Badge helpers with proper dark mode support
  const getPaymentStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      pending:
        "bg-yellow-100 text-yellow-800 hover:bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-300",
      partial:
        "bg-blue-100 text-blue-800 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-300",
      paid: "bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-300",
      cancelled:
        "bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-300",
    };

    return (
      <Badge
        variant="secondary"
        className={variants[status] || "bg-gray-100 dark:bg-gray-800"}
      >
        {status?.toUpperCase() || "PENDING"}
      </Badge>
    );
  };

  const getLabStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      pending:
        "bg-yellow-100 text-yellow-800 hover:bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-300",
      ordered:
        "bg-blue-100 text-blue-800 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-300",
      collected:
        "bg-purple-100 text-purple-800 hover:bg-purple-100 dark:bg-purple-900/20 dark:text-purple-300",
      processing:
        "bg-orange-100 text-orange-800 hover:bg-orange-100 dark:bg-orange-900/20 dark:text-orange-300",
      completed:
        "bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-300",
      reported:
        "bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-300",
      cancelled:
        "bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-300",
    };

    return (
      <Badge
        variant="secondary"
        className={variants[status] || "bg-gray-100 dark:bg-gray-800"}
      >
        {status?.toUpperCase() || "UNKNOWN"}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      scheduled:
        "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800",
      confirmed:
        "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800",
      "checked-in":
        "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800",
      "in-progress":
        "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800",
      completed:
        "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700",
      cancelled:
        "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800",
    };

    return (
      <Badge variant="outline" className={variants[status] || ""}>
        {status?.toUpperCase()}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "emergency":
        return <Badge variant="destructive">Emergency</Badge>;
      case "high":
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-900/30">
            High
          </Badge>
        );
      case "medium":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-300 dark:hover:bg-yellow-900/30">
            Medium
          </Badge>
        );
      case "low":
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-300 dark:hover:bg-green-900/30">
            Low
          </Badge>
        );
      default:
        return <Badge variant="secondary">{priority}</Badge>;
    }
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="container mx-auto p-4 md:p-6">
        <div className="flex items-center gap-4 mb-6">
          <Skeleton className="h-10 w-24" />
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid gap-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  // Show loading state while checking authentication and role
  if (
    isLoading ||
    (isAuthenticated && user?.role !== "receptionist" && user?.role !== "admin")
  ) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4 dark:text-red-400" />
            <h2 className="text-xl font-semibold mb-2 dark:text-gray-100">
              Appointment Not Found
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              The appointment you're looking for doesn't exist or you don't have
              permission to view it.
            </p>
            <Button onClick={() => router.push("/reception/appointments")}>
              Back to Appointments
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.push("/reception/appointments")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold dark:text-gray-100">
              Appointment Details
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              ID: {appointment.appointmentId}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => fetchAppointmentWithAllData(true)}
            disabled={refreshing}
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            {refreshing ? "Refreshing..." : "Refresh"}
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      {/* Patient Info Bar */}
      <Card className="dark:bg-gray-900 dark:border-gray-800">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                <h3 className="font-semibold dark:text-gray-200">
                  Patient Information
                </h3>
              </div>
              <p className="text-lg font-bold dark:text-gray-100">
                {appointment.patient.name}
              </p>
              <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                <p>ID: {appointment.patient.patientId}</p>
                <p>Phone: {appointment.patient.phone}</p>
                {appointment.patient.bloodGroup && (
                  <p>Blood Group: {appointment.patient.bloodGroup}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Stethoscope className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                <h3 className="font-semibold dark:text-gray-200">
                  Doctor Information
                </h3>
              </div>
              <p className="text-lg font-bold dark:text-gray-100">
                Dr. {appointment.doctor.name}
              </p>
              <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                <p>Specialization: {appointment.doctor.specialization}</p>
                <p>Department: {appointment.doctor.department}</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                <h3 className="font-semibold dark:text-gray-200">
                  Appointment Details
                </h3>
              </div>
              <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                <p>
                  Date: {format(parseISO(appointment.date), "MMMM d, yyyy")}
                </p>
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
        <TabsList className="grid grid-cols-5 dark:bg-gray-900">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="lab-tests">
            Lab Tests {labTests.length > 0 && `(${labTests.length})`}
          </TabsTrigger>
          <TabsTrigger value="prescriptions">
            Prescriptions{" "}
            {prescriptions.length > 0 && `(${prescriptions.length})`}
          </TabsTrigger>
          <TabsTrigger value="imaging">
            Imaging{" "}
            {imagingServices.length > 0 && `(${imagingServices.length})`}
          </TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="dark:bg-gray-900 dark:border-gray-800">
              <CardHeader>
                <CardTitle className="dark:text-gray-100">
                  Appointment Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-gray-500 dark:text-gray-400">
                    Reason for Visit
                  </Label>
                  <p className="font-medium dark:text-gray-200">
                    {appointment.reason}
                  </p>
                </div>
                {appointment.notes && (
                  <div className="space-y-2">
                    <Label className="text-gray-500 dark:text-gray-400">
                      Notes
                    </Label>
                    <p className="font-medium dark:text-gray-200">
                      {appointment.notes}
                    </p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-500 dark:text-gray-400">
                      Start Time
                    </Label>
                    <p className="font-medium dark:text-gray-200">
                      {format(parseISO(appointment.startTime), "h:mm a")}
                    </p>
                  </div>
                  <div>
                    <Label className="text-gray-500 dark:text-gray-400">
                      Duration
                    </Label>
                    <p className="font-medium dark:text-gray-200">
                      {appointment.duration} minutes
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="dark:bg-gray-900 dark:border-gray-800">
              <CardHeader>
                <CardTitle className="dark:text-gray-100">
                  Quick Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="dark:text-gray-300">Lab Tests:</span>
                  <Badge variant="outline">{labTests.length}</Badge>
                </div>
                <Separator className="dark:bg-gray-800" />
                <div className="flex justify-between items-center">
                  <span className="dark:text-gray-300">Prescriptions:</span>
                  <Badge variant="outline">{prescriptions.length}</Badge>
                </div>
                <Separator className="dark:bg-gray-800" />
                <div className="flex justify-between items-center">
                  <span className="dark:text-gray-300">Total Amount:</span>
                  <span className="font-bold dark:text-gray-100">
                    ${totals.totalAmount.toFixed(2)}
                  </span>
                </div>
                <Separator className="dark:bg-gray-800" />
                <div className="flex justify-between items-center">
                  <span className="dark:text-gray-300">Amount Due:</span>
                  <span className="font-bold text-red-600 dark:text-red-400">
                    ${totals.dueAmount.toFixed(2)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Lab Tests Tab */}
        <TabsContent value="lab-tests" className="space-y-6">
          <Card className="dark:bg-gray-900 dark:border-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 dark:text-gray-100">
                <FlaskConical className="h-5 w-5" />
                Laboratory Tests
              </CardTitle>
              <CardDescription className="flex items-center gap-2 dark:text-gray-400">
                Manage and process payments for laboratory tests
                {labTests.length > 0 && (
                  <Badge
                    variant="outline"
                    className="ml-2 dark:border-gray-700 dark:text-gray-300"
                  >
                    {dataSource.labTests === "appointment"
                      ? "Appointment-specific"
                      : dataSource.labTests === "patient"
                        ? "Patient history"
                        : "Mixed sources"}
                  </Badge>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {labTests.length === 0 ? (
                <div className="text-center py-12">
                  <FlaskConical className="h-12 w-12 text-gray-300 mx-auto mb-4 dark:text-gray-600" />
                  <p className="text-gray-500 dark:text-gray-400">
                    No lab tests ordered
                  </p>
                </div>
              ) : (
                <div className="rounded-md border dark:border-gray-800">
                  <Table>
                    <TableHeader className="dark:bg-gray-800">
                      <TableRow className="dark:border-gray-800">
                        <TableHead className="dark:text-gray-300">
                          Test ID
                        </TableHead>
                        <TableHead className="dark:text-gray-300">
                          Test Name
                        </TableHead>
                        <TableHead className="dark:text-gray-300">
                          Price
                        </TableHead>
                        <TableHead className="dark:text-gray-300">
                          Total
                        </TableHead>
                        <TableHead className="dark:text-gray-300">
                          Payment Status
                        </TableHead>
                        <TableHead className="dark:text-gray-300">
                          Due
                        </TableHead>
                        <TableHead className="dark:text-gray-300">
                          Test Status
                        </TableHead>
                        <TableHead className="dark:text-gray-300">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {labTests.map((test) => (
                        <TableRow
                          key={test._id}
                          className={`dark:border-gray-800 ${
                            isPaymentDisabled(test)
                              ? "bg-green-50 dark:bg-green-900/10"
                              : ""
                          }`}
                        >
                          <TableCell className="font-medium dark:text-gray-200">
                            {test.testId}
                          </TableCell>
                          <TableCell className="dark:text-gray-300">
                            {test.testName}
                          </TableCell>
                          <TableCell className="dark:text-gray-300">
                            $
                            {(test.discountedPrice || test.price || 0).toFixed(
                              2,
                            )}
                          </TableCell>
                          <TableCell className="dark:text-gray-300">
                            ${calculateTestTotal(test).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            {getPaymentStatusBadge(
                              test.charges?.paymentStatus || "pending",
                            )}
                          </TableCell>
                          <TableCell className="font-bold text-red-600 dark:text-red-400">
                            $
                            {test.charges?.due?.toFixed(2) ||
                              calculateTestTotal(test).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            {getLabStatusBadge(test.status)}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant={
                                  isPaymentDisabled(test)
                                    ? "secondary"
                                    : "outline"
                                }
                                onClick={() => {
                                  setSelectedLabTest(test);
                                  setPaymentType("lab");
                                  setPaymentForm({
                                    paymentMethod:
                                      test.charges?.paymentMethod || "cash",
                                    amount:
                                      test.charges?.due ||
                                      calculateTestTotal(test),
                                    transactionId:
                                      test.charges?.transactionId || "",
                                    notes: "",
                                    price:
                                      test.discountedPrice || test.price || 0,
                                  });
                                  setPaymentDialogOpen(true);
                                }}
                                disabled={isPaymentDisabled(test)}
                                className={
                                  isPaymentDisabled(test)
                                    ? "opacity-50 cursor-not-allowed"
                                    : ""
                                }
                              >
                                {isPaymentDisabled(test) ? (
                                  <>
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Paid
                                  </>
                                ) : (
                                  <>
                                    <CreditCard className="h-3 w-3 mr-1" />
                                    Pay
                                  </>
                                )}
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
          <Card className="dark:bg-gray-900 dark:border-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 dark:text-gray-100">
                <Pill className="h-5 w-5" />
                Prescriptions
              </CardTitle>
              <CardDescription className="flex items-center gap-2 dark:text-gray-400">
                Manage and process payments for prescriptions
                {prescriptions.length > 0 && (
                  <Badge
                    variant="outline"
                    className="ml-2 dark:border-gray-700 dark:text-gray-300"
                  >
                    {dataSource.prescriptions === "appointment"
                      ? "Appointment-specific"
                      : dataSource.prescriptions === "patient"
                        ? "Patient history"
                        : "Mixed sources"}
                  </Badge>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {prescriptions.length === 0 ? (
                <div className="text-center py-12">
                  <Pill className="h-12 w-12 text-gray-300 mx-auto mb-4 dark:text-gray-600" />
                  <p className="text-gray-500 dark:text-gray-400">
                    No prescriptions
                  </p>
                </div>
              ) : (
                <div className="rounded-md border dark:border-gray-800">
                  <Table>
                    <TableHeader className="dark:bg-gray-800">
                      <TableRow className="dark:border-gray-800">
                        <TableHead className="dark:text-gray-300">
                          Prescription ID
                        </TableHead>
                        <TableHead className="dark:text-gray-300">
                          Doctor
                        </TableHead>
                        <TableHead className="dark:text-gray-300">
                          Date
                        </TableHead>
                        <TableHead className="dark:text-gray-300">
                          Medications
                        </TableHead>
                        <TableHead className="dark:text-gray-300">
                          Total
                        </TableHead>
                        <TableHead className="dark:text-gray-300">
                          Payment Status
                        </TableHead>
                        <TableHead className="dark:text-gray-300">
                          Due
                        </TableHead>
                        <TableHead className="dark:text-gray-300">
                          Status
                        </TableHead>
                        <TableHead className="dark:text-gray-300">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {prescriptions.map((prescription) => (
                        <TableRow
                          key={prescription._id}
                          className={`dark:border-gray-800 ${
                            isPaymentDisabled(prescription)
                              ? "bg-green-50 dark:bg-green-900/10"
                              : ""
                          }`}
                        >
                          <TableCell className="font-medium dark:text-gray-200">
                            {prescription.prescriptionId}
                          </TableCell>
                          <TableCell className="dark:text-gray-300">
                            {prescription.doctor.name}
                          </TableCell>
                          <TableCell className="dark:text-gray-300">
                            {format(
                              parseISO(prescription.prescribedDate),
                              "MMM d, yyyy",
                            )}
                          </TableCell>
                          <TableCell className="dark:text-gray-300">
                            <div className="max-w-xs truncate">
                              {prescription.medications.map((med, idx) => (
                                <div key={idx} className="text-sm">
                                  {med.name} (×{med.quantity})
                                </div>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="dark:text-gray-300">
                            $
                            {(
                              prescription.charges?.totalAmount ||
                              calculatePrescriptionTotal(prescription)
                            ).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            {getPaymentStatusBadge(
                              prescription.charges?.paymentStatus || "unpaid",
                            )}
                          </TableCell>
                          <TableCell className="font-bold text-red-600 dark:text-red-400">
                            $
                            {(
                              prescription.charges?.due ||
                              prescription.charges?.totalAmount ||
                              calculatePrescriptionTotal(prescription)
                            ).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            {getLabStatusBadge(prescription.status)}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant={
                                  isPaymentDisabled(prescription)
                                    ? "secondary"
                                    : "outline"
                                }
                                onClick={() => {
                                  setSelectedPrescription(prescription);
                                  setPaymentType("prescription");
                                  setPaymentForm({
                                    paymentMethod:
                                      prescription.charges?.paymentMethod ||
                                      "cash",
                                    amount:
                                      prescription.charges?.due ||
                                      prescription.charges?.totalAmount ||
                                      calculatePrescriptionTotal(prescription),
                                    transactionId:
                                      prescription.charges?.transactionId || "",
                                    notes: "",
                                    price: 0,
                                  });
                                  setPaymentDialogOpen(true);
                                }}
                                disabled={isPaymentDisabled(prescription)}
                                className={
                                  isPaymentDisabled(prescription)
                                    ? "opacity-50 cursor-not-allowed"
                                    : ""
                                }
                              >
                                {isPaymentDisabled(prescription) ? (
                                  <>
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Paid
                                  </>
                                ) : (
                                  <>
                                    <CreditCard className="h-3 w-3 mr-1" />
                                    Pay
                                  </>
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  handlePrintPrescriptionReceipt(prescription)
                                }
                              >
                                <Receipt className="h-3 w-3 mr-1" />
                                Receipt
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  handleCopyToDispensary(prescription)
                                }
                              >
                                <Copy className="h-3 w-3 mr-1" />
                                Copy
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

        {/* Imaging Tab */}
        <TabsContent value="imaging" className="space-y-6">
          <Card className="dark:bg-gray-900 dark:border-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 dark:text-gray-100">
                <Scan className="h-5 w-5" />
                Imaging Services
              </CardTitle>
              <CardDescription className="flex items-center gap-2 dark:text-gray-400">
                Manage and process payments for imaging services (X-Ray, CT
                Scan, MRI, Ultrasound)
                {imagingServices.length > 0 && (
                  <Badge
                    variant="outline"
                    className="ml-2 dark:border-gray-700 dark:text-gray-300"
                  >
                    {dataSource.imaging === "appointment"
                      ? "Appointment-specific"
                      : dataSource.imaging === "patient"
                        ? "Patient history"
                        : "Mixed sources"}
                  </Badge>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {imagingServices.length === 0 ? (
                <div className="text-center py-12">
                  <Scan className="h-12 w-12 text-gray-300 mx-auto mb-4 dark:text-gray-600" />
                  <p className="text-gray-500 dark:text-gray-400">
                    No imaging services ordered
                  </p>
                </div>
              ) : (
                <div className="rounded-md border dark:border-gray-800">
                  <Table>
                    <TableHeader className="dark:bg-gray-800">
                      <TableRow className="dark:border-gray-800">
                        <TableHead className="dark:text-gray-300">
                          Service ID
                        </TableHead>
                        <TableHead className="dark:text-gray-300">
                          Type
                        </TableHead>
                        <TableHead className="dark:text-gray-300">
                          Body Part
                        </TableHead>
                        <TableHead className="dark:text-gray-300">
                          View
                        </TableHead>
                        <TableHead className="dark:text-gray-300">
                          Total
                        </TableHead>
                        <TableHead className="dark:text-gray-300">
                          Payment Status
                        </TableHead>
                        <TableHead className="dark:text-gray-300">
                          Due
                        </TableHead>
                        <TableHead className="dark:text-gray-300">
                          Service Status
                        </TableHead>
                        <TableHead className="dark:text-gray-300">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {imagingServices.map((service) => (
                        <TableRow
                          key={service._id}
                          className={`dark:border-gray-800 ${
                            isPaymentDisabled(service)
                              ? "bg-green-50 dark:bg-green-900/10"
                              : ""
                          }`}
                        >
                          <TableCell className="font-medium dark:text-gray-200">
                            {service.serviceId}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className="dark:border-gray-700 dark:text-gray-300"
                            >
                              {service.serviceType === "x-ray"
                                ? "X-Ray"
                                : service.serviceType === "ct-scan"
                                  ? "CT Scan"
                                  : service.serviceType === "mri"
                                    ? "MRI"
                                    : "Ultrasound"}
                            </Badge>
                          </TableCell>
                          <TableCell className="dark:text-gray-300">
                            {service.bodyPart}
                          </TableCell>
                          <TableCell className="dark:text-gray-300">
                            {service.view}
                          </TableCell>
                          <TableCell className="dark:text-gray-300">
                            ${(service.charges?.totalAmount || 0).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            {getPaymentStatusBadge(
                              service.charges?.paymentStatus || "pending",
                            )}
                          </TableCell>
                          <TableCell className="font-bold text-red-600 dark:text-red-400">
                            $
                            {service.charges?.due?.toFixed(2) ||
                              (service.charges?.totalAmount || 0).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            {getLabStatusBadge(service.status)}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant={
                                  isPaymentDisabled(service)
                                    ? "secondary"
                                    : "outline"
                                }
                                onClick={() => {
                                  setSelectedImagingService(service);
                                  setPaymentType("imaging");
                                  setPaymentForm({
                                    paymentMethod:
                                      service.charges?.paymentMethod || "cash",
                                    amount:
                                      service.charges?.due ||
                                      service.charges?.totalAmount ||
                                      0,
                                    transactionId:
                                      service.charges?.transactionId || "",
                                    notes: "",
                                    price: 0,
                                  });
                                  setPaymentDialogOpen(true);
                                }}
                                disabled={isPaymentDisabled(service)}
                                className={
                                  isPaymentDisabled(service)
                                    ? "opacity-50 cursor-not-allowed"
                                    : ""
                                }
                              >
                                {isPaymentDisabled(service) ? (
                                  <>
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Paid
                                  </>
                                ) : (
                                  <>
                                    <CreditCard className="h-3 w-3 mr-1" />
                                    Pay
                                  </>
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  handlePrintImagingReceipt(service)
                                }
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
          <Card className="dark:bg-gray-900 dark:border-gray-800">
            <CardHeader>
              <CardTitle className="dark:text-gray-100">
                Billing Summary
              </CardTitle>
              <CardDescription className="dark:text-gray-400">
                Complete financial breakdown of this appointment
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Invoice Table */}
              <div className="rounded-lg border dark:border-gray-800">
                <Table>
                  <TableHeader className="dark:bg-gray-800">
                    <TableRow className="dark:border-gray-800">
                      <TableHead className="dark:text-gray-300">
                        Description
                      </TableHead>
                      <TableHead className="text-right dark:text-gray-300">
                        Amount
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow className="dark:border-gray-800">
                      <TableCell className="font-medium dark:text-gray-200">
                        Consultation Fee
                      </TableCell>
                      <TableCell className="text-right dark:text-gray-300">
                        ${totals.consultationFee.toFixed(2)}
                      </TableCell>
                    </TableRow>

                    {labTests.map((test) => (
                      <TableRow key={test._id} className="dark:border-gray-800">
                        <TableCell className="dark:text-gray-300">
                          <div>
                            <p className="dark:text-gray-200">
                              {test.testName}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {test.testId}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right dark:text-gray-300">
                          ${calculateTestTotal(test).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}

                    <TableRow className="font-bold border-t dark:border-gray-800">
                      <TableCell className="dark:text-gray-100">
                        Total Amount
                      </TableCell>
                      <TableCell className="text-right dark:text-gray-100">
                        ${totals.totalAmount.toFixed(2)}
                      </TableCell>
                    </TableRow>

                    <TableRow className="dark:border-gray-800">
                      <TableCell className="dark:text-gray-300">
                        Total Paid
                      </TableCell>
                      <TableCell className="text-right text-green-600 dark:text-green-400">
                        ${totals.paidAmount.toFixed(2)}
                      </TableCell>
                    </TableRow>

                    <TableRow className="dark:border-gray-800">
                      <TableCell className="font-bold dark:text-gray-100">
                        Balance Due
                      </TableCell>
                      <TableCell className="text-right font-bold text-red-600 dark:text-red-400">
                        ${totals.dueAmount.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              {/* Payment Actions */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                {totals.dueAmount > 0 ? (
                  <Button
                    size="lg"
                    onClick={() => {
                      const unpaidTest = labTests.find(
                        (t) =>
                          !isPaymentDisabled(t) &&
                          (t.charges?.due || calculateTestTotal(t)) > 0,
                      );

                      const unpaidImaging = imagingServices.find(
                        (s) =>
                          !isPaymentDisabled(s) &&
                          (s.charges?.due || s.charges?.totalAmount || 0) > 0,
                      );

                      if (unpaidTest) {
                        setSelectedLabTest(unpaidTest);
                        setPaymentType("lab");
                        setPaymentForm({
                          paymentMethod:
                            unpaidTest.charges?.paymentMethod || "cash",
                          amount:
                            unpaidTest.charges?.due ||
                            calculateTestTotal(unpaidTest),
                          transactionId:
                            unpaidTest.charges?.transactionId || "",
                          notes: "",
                          price:
                            unpaidTest.discountedPrice || unpaidTest.price || 0,
                        });
                        setPaymentDialogOpen(true);
                      } else if (unpaidImaging) {
                        setSelectedImagingService(unpaidImaging);
                        setPaymentType("imaging");
                        setPaymentForm({
                          paymentMethod:
                            unpaidImaging.charges?.paymentMethod || "cash",
                          amount:
                            unpaidImaging.charges?.due ||
                            unpaidImaging.charges?.totalAmount ||
                            0,
                          transactionId:
                            unpaidImaging.charges?.transactionId || "",
                          notes: "",
                          price: 0,
                        });
                        setPaymentDialogOpen(true);
                      } else {
                        toast.info("All payments have been processed");
                      }
                    }}
                    disabled={
                      labTests.every(isPaymentDisabled) &&
                      imagingServices.every(isPaymentDisabled)
                    }
                  >
                    <DollarSign className="h-4 w-4 mr-2" />
                    {labTests.every(isPaymentDisabled) &&
                    imagingServices.every(isPaymentDisabled)
                      ? "All Paid"
                      : "Process Payments"}
                  </Button>
                ) : (
                  <div className="flex items-center justify-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <span className="font-medium text-green-700 dark:text-green-300">
                      All payments have been processed
                    </span>
                  </div>
                )}
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => window.print()}
                >
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
        <DialogContent className="max-w-md dark:bg-gray-900 dark:border-gray-800">
          <DialogHeader>
            <DialogTitle className="dark:text-gray-100">
              Process Payment
            </DialogTitle>
            <DialogDescription className="dark:text-gray-400">
              {paymentType === "lab"
                ? `Process payment for ${selectedLabTest?.testName}`
                : paymentType === "prescription"
                  ? `Process payment for prescription ${selectedPrescription?.prescriptionId}`
                  : `Process payment for ${
                      selectedImagingService?.serviceType === "x-ray"
                        ? "X-Ray"
                        : selectedImagingService?.serviceType === "ct-scan"
                          ? "CT Scan"
                          : selectedImagingService?.serviceType === "mri"
                            ? "MRI"
                            : "Ultrasound"
                    }`}
            </DialogDescription>
          </DialogHeader>

          {paymentType === "lab" && selectedLabTest && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                <p className="font-medium dark:text-gray-200">
                  Test: {selectedLabTest.testName}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Total Due: $
                  {selectedLabTest.charges?.due?.toFixed(2) ||
                    calculateTestTotal(selectedLabTest).toFixed(2)}
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <Label className="dark:text-gray-300">Price</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={paymentForm.price}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value);
                      if (value >= 0 || e.target.value === "") {
                        setPaymentForm((prev) => ({
                          ...prev,
                          price: value || 0,
                        }));
                      }
                    }}
                    placeholder="Enter price"
                    className="dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Current price: $
                    {(
                      selectedLabTest.discountedPrice ||
                      selectedLabTest.price ||
                      0
                    ).toFixed(2)}
                  </p>
                </div>

                <div>
                  <Label className="dark:text-gray-300">Payment Method</Label>
                  <Select
                    value={paymentForm.paymentMethod}
                    onValueChange={(value) =>
                      setPaymentForm((prev) => ({
                        ...prev,
                        paymentMethod: value,
                      }))
                    }
                  >
                    <SelectTrigger className="dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                      <SelectItem
                        value="cash"
                        className="dark:text-gray-300 dark:focus:bg-gray-700"
                      >
                        Cash
                      </SelectItem>
                      <SelectItem
                        value="card"
                        className="dark:text-gray-300 dark:focus:bg-gray-700"
                      >
                        Credit/Debit Card
                      </SelectItem>
                      <SelectItem
                        value="upi"
                        className="dark:text-gray-300 dark:focus:bg-gray-700"
                      >
                        UPI
                      </SelectItem>
                      <SelectItem
                        value="insurance"
                        className="dark:text-gray-300 dark:focus:bg-gray-700"
                      >
                        Insurance
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="dark:text-gray-300">Amount</Label>
                  <Input
                    type="number"
                    value={paymentForm.amount}
                    onChange={(e) =>
                      setPaymentForm((prev) => ({
                        ...prev,
                        amount: parseFloat(e.target.value) || 0,
                      }))
                    }
                    placeholder="Enter amount"
                    className="dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                  />
                </div>

                <div>
                  <Label className="dark:text-gray-300">
                    Transaction/Reference ID
                  </Label>
                  <Input
                    value={paymentForm.transactionId}
                    onChange={(e) =>
                      setPaymentForm((prev) => ({
                        ...prev,
                        transactionId: e.target.value,
                      }))
                    }
                    placeholder="Optional"
                    className="dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                  />
                </div>
              </div>
            </div>
          )}

          {paymentType === "imaging" && selectedImagingService && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                <p className="font-medium dark:text-gray-200">
                  Service:{" "}
                  {selectedImagingService.serviceType === "x-ray"
                    ? "X-Ray"
                    : selectedImagingService.serviceType === "ct-scan"
                      ? "CT Scan"
                      : selectedImagingService.serviceType === "mri"
                        ? "MRI"
                        : "Ultrasound"}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Body Part: {selectedImagingService.bodyPart}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Total Due: $
                  {(
                    selectedImagingService.charges?.due ||
                    selectedImagingService.charges?.totalAmount ||
                    0
                  ).toFixed(2)}
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <Label className="dark:text-gray-300">Payment Method</Label>
                  <Select
                    value={paymentForm.paymentMethod}
                    onValueChange={(value) =>
                      setPaymentForm((prev) => ({
                        ...prev,
                        paymentMethod: value,
                      }))
                    }
                  >
                    <SelectTrigger className="dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                      <SelectItem
                        value="cash"
                        className="dark:text-gray-300 dark:focus:bg-gray-700"
                      >
                        Cash
                      </SelectItem>
                      <SelectItem
                        value="card"
                        className="dark:text-gray-300 dark:focus:bg-gray-700"
                      >
                        Credit/Debit Card
                      </SelectItem>
                      <SelectItem
                        value="upi"
                        className="dark:text-gray-300 dark:focus:bg-gray-700"
                      >
                        UPI
                      </SelectItem>
                      <SelectItem
                        value="insurance"
                        className="dark:text-gray-300 dark:focus:bg-gray-700"
                      >
                        Insurance
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="dark:text-gray-300">Amount</Label>
                  <Input
                    type="number"
                    value={paymentForm.amount}
                    onChange={(e) =>
                      setPaymentForm((prev) => ({
                        ...prev,
                        amount: parseFloat(e.target.value) || 0,
                      }))
                    }
                    placeholder="Enter amount"
                    className="dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                  />
                </div>

                <div>
                  <Label className="dark:text-gray-300">
                    Transaction/Reference ID
                  </Label>
                  <Input
                    value={paymentForm.transactionId}
                    onChange={(e) =>
                      setPaymentForm((prev) => ({
                        ...prev,
                        transactionId: e.target.value,
                      }))
                    }
                    placeholder="Optional"
                    className="dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                  />
                </div>
              </div>
            </div>
          )}

          {paymentType === "prescription" && selectedPrescription && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                <p className="font-medium dark:text-gray-200">
                  Prescription: {selectedPrescription.prescriptionId}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Doctor: {selectedPrescription.doctor.name}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Medications: {selectedPrescription.medications.length} item(s)
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Total Due: $
                  {(
                    selectedPrescription.charges?.due ||
                    selectedPrescription.charges?.totalAmount ||
                    calculatePrescriptionTotal(selectedPrescription)
                  ).toFixed(2)}
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <Label className="dark:text-gray-300">Payment Method</Label>
                  <Select
                    value={paymentForm.paymentMethod}
                    onValueChange={(value) =>
                      setPaymentForm((prev) => ({
                        ...prev,
                        paymentMethod: value,
                      }))
                    }
                  >
                    <SelectTrigger className="dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                      <SelectItem
                        value="cash"
                        className="dark:text-gray-300 dark:focus:bg-gray-700"
                      >
                        Cash
                      </SelectItem>
                      <SelectItem
                        value="card"
                        className="dark:text-gray-300 dark:focus:bg-gray-700"
                      >
                        Credit/Debit Card
                      </SelectItem>
                      <SelectItem
                        value="upi"
                        className="dark:text-gray-300 dark:focus:bg-gray-700"
                      >
                        UPI
                      </SelectItem>
                      <SelectItem
                        value="insurance"
                        className="dark:text-gray-300 dark:focus:bg-gray-700"
                      >
                        Insurance
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="dark:text-gray-300">Amount</Label>
                  <Input
                    type="number"
                    value={paymentForm.amount}
                    onChange={(e) =>
                      setPaymentForm((prev) => ({
                        ...prev,
                        amount: parseFloat(e.target.value) || 0,
                      }))
                    }
                    placeholder="Enter amount"
                    className="dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                  />
                </div>

                <div>
                  <Label className="dark:text-gray-300">
                    Transaction/Reference ID
                  </Label>
                  <Input
                    value={paymentForm.transactionId}
                    onChange={(e) =>
                      setPaymentForm((prev) => ({
                        ...prev,
                        transactionId: e.target.value,
                      }))
                    }
                    placeholder="Optional"
                    className="dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPaymentDialogOpen(false)}
              className="dark:border-gray-700 dark:text-gray-300"
            >
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
