// app/pharmacy/issue/page.tsx

"use client";
import { useState, useEffect, useMemo } from "react";
import useSWR from "swr";
import {
  PlusCircle,
  MinusCircle,
  Trash2,
  CheckCircle,
  Search,
  DownloadIcon,
  ChevronLeft,
  ChevronRight,
  MoreVerticalIcon,
  CreditCard,
  Printer,
  Clock,
  DollarSign,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useAuthStore } from "@/store/useAuthStore";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import MedicineSearch, { MedicineStock } from "@/components/MedicineSearch";
import PharmacyPatientSearch, {
  Patient,
} from "@/components/PharmacyPatientSearch";
import { generatePharmacyReceipt } from "@/utils/generatePharmacyReceipt";

interface Medicine {
  _id: string;
  name: string;
  form: string;
  dosage: string;
  frequency: string;
  route: string;
  currentQuantity: number;
  sellingPrice: number;
}

interface MedicineItem {
  medicine: string;
  name: string;
  form: string;
  dosage: string;
  frequency: string;
  route: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
}

interface PrescriptionItem {
  _id: string;
  medicine?: {
    _id: string;
    name: string;
  };
  name?: string;
  quantity?: number;
  unitPrice?: number;
  discount?: number;
  totalPrice?: number;
}

interface Prescription {
  _id: string;
  saleId?: string;
  invoiceNumber: string;
  customerName: string;
  customerPhone: string;
  items: PrescriptionItem[];
  subtotal?: number;
  totalAmount?: number;
  amountPaid?: number;
  balance?: number;
  paymentMethod: string;
  paymentStatus?: string;
  status: string;
  saleDate?: string;
  createdAt: string;
  soldBy?: {
    _id: string;
    name: string;
  };
}

interface User {
  id: string;
  name: string;
  role?: string;
}

interface AuthStore {
  user: User | null;
}

interface JSPDFWithAutoTable extends jsPDF {
  lastAutoTable?: {
    finalY: number;
  };
}

interface ApiResponse<T> {
  data: T;
  error?: string;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface StockApiResponse {
  data: Medicine[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface PrescriptionApiResponse {
  success: boolean;
  data: Prescription[];
}

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to fetch data");
  }
  return response.json();
};

// Helper function to get payment status badge with appropriate color
const getPaymentStatusBadge = (paymentStatus?: string) => {
  const status = paymentStatus?.toLowerCase() || "pending";
  switch (status) {
    case "paid":
      return (
        <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200">
          <CheckCircle className="h-3 w-3 mr-1" />
          Paid
        </Badge>
      );
    case "partial":
      return (
        <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-yellow-200">
          <Clock className="h-3 w-3 mr-1" />
          Partial
        </Badge>
      );
    case "pending":
    default:
      return (
        <Badge className="bg-red-100 text-red-800 hover:bg-red-100 border-red-200">
          <AlertCircle className="h-3 w-3 mr-1" />
          Pending
        </Badge>
      );
  }
};

// Helper function to check if PDF download is allowed
const canDownloadPDF = (paymentStatus?: string, status?: string) => {
  const isPaid = paymentStatus === "paid";
  const isCompleted = status === "completed";
  return isPaid || isCompleted;
};

// Mobile Prescription Card Component
const MobilePrescriptionCard = ({
  prescription,
  onDownload,
  user,
  accessToken,
}: {
  prescription: Prescription;
  onDownload: (prescription: Prescription) => void;
  user: User | null;
  accessToken: string | null;
}) => {
  const canDownload = canDownloadPDF(
    prescription.paymentStatus,
    prescription.status,
  );

  return (
    <Card className="mb-3">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div className="flex-1">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium text-sm">
                {prescription.invoiceNumber}
              </span>
              <span className="font-bold text-sm">
                AFN {prescription.totalAmount?.toFixed(2) || "0.00"}
              </span>
            </div>
            <div className="space-y-1 text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>Customer:</span>
                <span>{prescription.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span>Phone:</span>
                <span>{prescription.customerPhone}</span>
              </div>
              <div className="flex justify-between">
                <span>Date:</span>
                <span>
                  {new Date(prescription.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>Payment:</span>
                <Badge variant="outline" className="capitalize text-xs">
                  {prescription.paymentMethod}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span>Status:</span>
                {getPaymentStatusBadge(prescription.paymentStatus)}
              </div>
            </div>
          </div>
        </div>
        <div className="flex justify-end space-x-2 mt-3 pt-3 border-t">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDownload(prescription)}
                  className="h-7 text-xs"
                  disabled={!canDownload}
                >
                  <DownloadIcon className="h-3 w-3 mr-1" />
                  PDF
                </Button>
              </TooltipTrigger>
              {!canDownload && (
                <TooltipContent>
                  <p>PDF download only available for paid/finalized sales</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardContent>
    </Card>
  );
};

export default function PharmacyPage() {
  const { user, accessToken } = useAuthStore() as AuthStore & {
    accessToken: string | null;
  };
  const [activeTab, setActiveTab] = useState<"issue" | "history">("issue");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  const [items, setItems] = useState<MedicineItem[]>([]);
  const [selectedMedicine, setSelectedMedicine] =
    useState<MedicineStock | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState<string>(
    `INV-${Date.now()}`,
  );
  const [prescriptionSearchTerm, setPrescriptionSearchTerm] =
    useState<string>("");

  // Payment workflow state
  const [paymentStatus, setPaymentStatus] = useState<
    "pending" | "processing" | "paid" | "completed"
  >("pending");
  const [currentPrescriptionId, setCurrentPrescriptionId] = useState<
    string | null
  >(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const {
    data: medicinesResponse,
    isLoading: isLoadingStock,
    mutate: mutateStock,
  } = useSWR("/api/pharmacy/stock?limit=1000", fetcher);
  const {
    data: prescriptionsResponse,
    isLoading: isLoadingPrescriptions,
    mutate: mutatePrescriptions,
  } = useSWR("/api/pharmacy/prescriptions?page=1&limit=50", fetcher);

  const medicinesData = useMemo(() => {
    if (!medicinesResponse) return [];

    try {
      if (medicinesResponse.data && Array.isArray(medicinesResponse.data)) {
        return medicinesResponse.data;
      }
      if (Array.isArray(medicinesResponse)) {
        return medicinesResponse;
      }
      return [];
    } catch (error) {
      console.error("Error processing medicines data:", error);
      return [];
    }
  }, [medicinesResponse]);

  const prescriptions = useMemo(() => {
    if (!prescriptionsResponse) return [];

    try {
      if (
        prescriptionsResponse.success &&
        prescriptionsResponse.data &&
        Array.isArray(prescriptionsResponse.data)
      ) {
        return prescriptionsResponse.data;
      }
      if (
        prescriptionsResponse.data &&
        Array.isArray(prescriptionsResponse.data)
      ) {
        return prescriptionsResponse.data;
      }
      if (Array.isArray(prescriptionsResponse)) {
        return prescriptionsResponse;
      }
      return [];
    } catch (error) {
      console.error("Error processing prescriptions data:", error);
      return [];
    }
  }, [prescriptionsResponse]);

  // Filter prescriptions based on search term
  const filteredPrescriptions = useMemo(() => {
    if (!Array.isArray(prescriptions)) return [];

    return prescriptions.filter((prescription) => {
      if (!prescriptionSearchTerm.trim()) return true;

      const searchLower = prescriptionSearchTerm.toLowerCase();
      return (
        prescription.invoiceNumber.toLowerCase().includes(searchLower) ||
        prescription.customerName.toLowerCase().includes(searchLower) ||
        prescription.customerPhone.toLowerCase().includes(searchLower) ||
        prescription.paymentMethod.toLowerCase().includes(searchLower) ||
        (prescription.saleId &&
          prescription.saleId.toLowerCase().includes(searchLower))
      );
    });
  }, [prescriptions, prescriptionSearchTerm]);

  // Calculate pagination
  const totalPages = useMemo(() => {
    return Math.ceil(filteredPrescriptions.length / rowsPerPage);
  }, [filteredPrescriptions, rowsPerPage]);

  // Get current page prescriptions
  const currentPrescriptions = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return filteredPrescriptions.slice(startIndex, endIndex);
  }, [filteredPrescriptions, currentPage, rowsPerPage]);

  useEffect(() => {
    setInvoiceNumber(`INV-${Date.now()}`);
  }, [items]);

  // Reset pagination when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [prescriptionSearchTerm]);

  const addItem = (medicine: MedicineStock) => {
    try {
      if (!medicine) {
        toast.error("Please select a medicine");
        return;
      }

      if (
        !medicine.name ||
        !medicine.form ||
        !medicine.dosage ||
        !medicine.frequency ||
        !medicine.route ||
        typeof medicine.sellingPrice !== "number"
      ) {
        toast.error("Invalid medicine selected");
        return;
      }

      const currentItems = Array.isArray(items) ? items : [];
      const existingItem = currentItems.find(
        (item) => item && item.medicine === medicine._id,
      );

      if (existingItem) {
        setItems(
          currentItems.map((item) =>
            item && item.medicine === medicine._id
              ? {
                  ...item,
                  quantity: item.quantity + 1,
                  total: (item.quantity + 1) * item.unitPrice,
                }
              : item,
          ),
        );
      } else {
        setItems([
          ...currentItems,
          {
            medicine: medicine._id,
            name: medicine.name,
            form: medicine.form,
            dosage: medicine.dosage,
            frequency: medicine.frequency,
            route: medicine.route,
            quantity: 1,
            unitPrice: medicine.sellingPrice,
            discount: 0,
            total: medicine.sellingPrice,
          },
        ]);
      }
    } catch (error) {
      console.error("Error adding item:", error);
      toast.error("Failed to add medicine");
    }
  };

  const handleMedicineSelect = (medicine: MedicineStock | null) => {
    if (medicine) {
      addItem(medicine);
    }
    setSelectedMedicine(null);
  };

  const updateItem = (
    medicineId: string,
    field: keyof MedicineItem,
    value: number,
  ) => {
    try {
      if (
        !Array.isArray(items) ||
        !medicineId ||
        typeof value !== "number" ||
        isNaN(value)
      ) {
        return;
      }

      setItems(
        items.map((item) => {
          if (!item || item.medicine !== medicineId) {
            return item;
          }

          const updatedItem = { ...item, [field]: Math.max(0, value) };

          if (field === "quantity" || field === "unitPrice") {
            const quantity = updatedItem.quantity || 0;
            const unitPrice = updatedItem.unitPrice || 0;
            updatedItem.total = quantity * unitPrice;
          }

          return updatedItem;
        }),
      );
    } catch (error) {
      console.error("Error updating item:", error);
      toast.error("Failed to update item");
    }
  };

  const removeItem = (medicineId: string) => {
    try {
      if (!Array.isArray(items) || !medicineId) {
        return;
      }
      setItems(items.filter((item) => item && item.medicine !== medicineId));
    } catch (error) {
      console.error("Error removing item:", error);
      toast.error("Failed to remove item");
    }
  };

  const calculateTotal = useMemo((): number => {
    try {
      if (!Array.isArray(items) || items.length === 0) {
        return 0;
      }

      return items.reduce((sum, item) => {
        if (
          !item ||
          typeof item.total !== "number" ||
          isNaN(item.total) ||
          item.total < 0
        ) {
          return sum;
        }
        return sum + item.total;
      }, 0);
    } catch (error) {
      console.error("Error calculating total:", error);
      return 0;
    }
  }, [items]);

  const generatePrescriptionPDF = (prescription: Prescription) => {
    const doc = new jsPDF() as JSPDFWithAutoTable;
    const date = new Date(prescription.createdAt).toLocaleDateString();

    doc.setFontSize(18);
    doc.text("MEDICAL PRESCRIPTION", 105, 20, { align: "center" });

    doc.setFontSize(12);
    doc.text(`Invoice #: ${prescription.invoiceNumber}`, 14, 30);
    doc.text(`Date: ${date}`, 14, 38);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text("Your Clinic Name", 105, 30, { align: "center" });
    doc.text("123 Medical Street, City", 105, 35, { align: "center" });
    doc.text("Phone: (123) 456-7890", 105, 40, { align: "center" });

    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text("Customer Information:", 14, 50);
    doc.text(`Name: ${prescription.customerName}`, 20, 58);
    doc.text(`Phone: ${prescription.customerPhone}`, 20, 66);

    doc.setFontSize(12);
    doc.text("Sold Items:", 14, 80);

    const itemData =
      prescription.items && Array.isArray(prescription.items)
        ? prescription.items.map((item) => [
            item.name || item.medicine?.name || "Unknown",
            item.quantity?.toString() || "0",
            `AFN ${(item.unitPrice || 0).toFixed(2)}`,
            `AFN ${(item.totalPrice || 0).toFixed(2)}`,
          ])
        : [];

    autoTable(doc, {
      head: [["Medicine", "Qty", "Unit Price", "Total"]],
      body: itemData,
      startY: 85,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [59, 130, 246] },
      columnStyles: {
        0: { cellWidth: 70 },
        1: { cellWidth: 20 },
        2: { cellWidth: 30 },
        3: { cellWidth: 30 },
      },
    });

    const finalY = doc.lastAutoTable?.finalY
      ? doc.lastAutoTable.finalY + 15
      : 100;
    doc.setFontSize(12);
    doc.text("Payment Summary:", 14, finalY);

    autoTable(doc, {
      body: [
        ["Subtotal:", `AFN ${(prescription.totalAmount || 0).toFixed(2)}`],
        ["Amount Paid:", `AFN ${(prescription.amountPaid || 0).toFixed(2)}`],
        ["Payment Method:", prescription.paymentMethod],
        ["Status:", prescription.status],
      ],
      startY: finalY + 5,
      styles: { fontSize: 10 },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 50 },
        1: { cellWidth: 40 },
      },
    });

    const lastY = doc.lastAutoTable?.finalY
      ? doc.lastAutoTable.finalY + 15
      : 120;
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text("Sold by:", 14, lastY);
    doc.text(prescription.soldBy?.name || "System", 14, lastY + 5);
    doc.text("Thank you for your visit!", 105, lastY + 10, { align: "center" });

    doc.save(`prescription-${prescription.invoiceNumber}.pdf`);
  };

  const handleSubmit = async () => {
    if (
      !selectedPatient ||
      !selectedPatient.name?.trim() ||
      !selectedPatient.phone?.trim() ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      toast.error("Please select a patient and add medicines");
      return;
    }

    if (!accessToken) {
      toast.error("Authentication required");
      return;
    }

    try {
      const response = await fetch("/api/pharmacy/prescriptions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          customerName: selectedPatient.name,
          customerPhone: selectedPatient.phone,
          invoiceNumber,
          items: items.map((item) => ({
            medicine: item.medicine,
            name: item.name,
            quantity: item.quantity,
            discount: item.discount,
            unitPrice: item.unitPrice,
          })),
          totalAmount: calculateTotal,
          amountPaid: calculateTotal,
          paymentMethod,
          status: "completed",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to issue prescription");
      }

      toast.success("Prescription issued successfully");
      setSelectedPatient(null);
      setItems([]);
      setPaymentMethod("cash");
      mutateStock();
      mutatePrescriptions();
      setActiveTab("history");
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "Failed to issue prescription",
      );
    }
  };

  // Process Payment - Step 1: Create prescription with pending payment
  const handleProcessPayment = async () => {
    if (
      !selectedPatient ||
      !selectedPatient.name?.trim() ||
      !selectedPatient.phone?.trim() ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      toast.error("Please select a patient and add medicines");
      return;
    }

    if (!accessToken) {
      toast.error("Authentication required");
      return;
    }

    try {
      const response = await fetch("/api/pharmacy/prescriptions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          customerName: selectedPatient.name,
          customerPhone: selectedPatient.phone,
          invoiceNumber,
          items: items.map((item) => ({
            medicine: item.medicine,
            name: item.name,
            quantity: item.quantity,
            discount: item.discount,
            unitPrice: item.unitPrice,
          })),
          totalAmount: calculateTotal,
          amountPaid: 0,
          paymentMethod,
          status: "pending",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to process payment");
      }

      const data = await response.json();
      setCurrentPrescriptionId(data._id);
      setPaymentStatus("processing");
      toast.success("Payment sent to receptionist for processing");
      mutateStock();
      mutatePrescriptions();
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "Failed to process payment",
      );
    }
  };

  // Finalize & Print Receipt - Step 2: Update prescription to completed and print
  const handleFinalizeAndPrint = async () => {
    if (!currentPrescriptionId) {
      toast.error("No prescription to finalize");
      return;
    }

    if (!accessToken) {
      toast.error("Authentication required");
      return;
    }

    try {
      // Update prescription status to completed
      const response = await fetch(
        `/api/pharmacy/prescriptions/${currentPrescriptionId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            status: "completed",
            paymentStatus: "paid",
            amountPaid: calculateTotal,
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to finalize prescription");
      }

      const data = await response.json();

      // Generate and print receipt
      const receiptData = {
        patientName: selectedPatient?.name || "",
        patientPhone: selectedPatient?.phone || "",
        invoiceNumber,
        items: items.map((item) => ({
          medicine: {
            name: item.name,
            form: item.form,
            dosage: item.dosage,
            frequency: item.frequency,
            route: item.route,
          },
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount,
        })),
        totalAmount: calculateTotal,
        amountPaid: calculateTotal,
        paymentMethod,
        createdAt: new Date().toISOString(),
        issuedBy: user ? { name: user.name } : undefined,
      };

      generatePharmacyReceipt(receiptData);

      toast.success("Prescription finalized and receipt printed");
      setPaymentStatus("completed");

      // Reset form for next order
      setTimeout(() => {
        setSelectedPatient(null);
        setItems([]);
        setPaymentMethod("cash");
        setInvoiceNumber(`INV-${Date.now()}`);
        setCurrentPrescriptionId(null);
        setPaymentStatus("pending");
        mutatePrescriptions();
        setActiveTab("history");
      }, 1000);
    } catch (error: unknown) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to finalize prescription",
      );
    }
  };

  // Reset the form
  const handleReset = () => {
    setSelectedPatient(null);
    setItems([]);
    setPaymentMethod("cash");
    setInvoiceNumber(`INV-${Date.now()}`);
    setCurrentPrescriptionId(null);
    setPaymentStatus("pending");
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          setActiveTab(value as "issue" | "history");
          setCurrentPage(1);
        }}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="issue">Issue Medicine</TabsTrigger>
          <TabsTrigger value="history">Prescription History</TabsTrigger>
        </TabsList>

        <TabsContent value="issue">
          <Card>
            <CardHeader>
              <CardTitle className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                <div className="flex items-center gap-3">
                  <span>Issue Medicine</span>
                  {paymentStatus !== "pending" && (
                    <Badge
                      variant={
                        paymentStatus === "processing"
                          ? "secondary"
                          : paymentStatus === "paid"
                            ? "default"
                            : "outline"
                      }
                      className="flex items-center gap-1"
                    >
                      {paymentStatus === "processing" && (
                        <Clock className="h-3 w-3" />
                      )}
                      {paymentStatus === "paid" && (
                        <DollarSign className="h-3 w-3" />
                      )}
                      {paymentStatus === "completed" && (
                        <CheckCircle className="h-3 w-3" />
                      )}
                      {paymentStatus.charAt(0).toUpperCase() +
                        paymentStatus.slice(1)}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Label className="whitespace-nowrap">Invoice #:</Label>
                  <Input
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="w-40"
                    disabled={paymentStatus !== "pending"}
                  />
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <Label>Patient *</Label>
                <PharmacyPatientSearch
                  onPatientSelect={setSelectedPatient}
                  selectedPatient={selectedPatient}
                  placeholder="Search patient by name, phone, or ID..."
                />
              </div>

              <div className="mb-6">
                <Label>Add Medicine</Label>
                <MedicineSearch
                  onMedicineSelect={handleMedicineSelect}
                  selectedMedicine={null}
                  placeholder="Search medicine by name or supplier..."
                  autoClear={true}
                />
              </div>

              {items.length > 0 && (
                <div className="border rounded-lg mb-6 overflow-hidden">
                  <div className="grid grid-cols-12 gap-2 p-2 font-medium">
                    <div className="col-span-6">Medicine</div>
                    <div className="col-span-2">Price</div>
                    <div className="col-span-2">Qty</div>
                    <div className="col-span-2">Total</div>
                  </div>

                  {items.map((item) => (
                    <div
                      key={item.medicine}
                      className="grid grid-cols-12 gap-2 p-2 border-t"
                    >
                      <div className="col-span-6">
                        <div className="font-medium">{item.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {item.form} | {item.dosage} | {item.frequency} |{" "}
                          {item.route}
                        </div>
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) =>
                            updateItem(
                              item.medicine,
                              "unitPrice",
                              parseFloat(e.target.value),
                            )
                          }
                          min="0"
                          step="0.01"
                          readOnly
                          disabled={paymentStatus !== "pending"}
                        />
                      </div>
                      <div className="col-span-2 flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() =>
                            updateItem(
                              item.medicine,
                              "quantity",
                              Math.max(1, item.quantity - 1),
                            )
                          }
                          disabled={paymentStatus !== "pending"}
                        >
                          <MinusCircle className="h-4 w-4" />
                        </Button>
                        <Input
                          className="w-12 text-center"
                          value={item.quantity}
                          onChange={(e) =>
                            updateItem(
                              item.medicine,
                              "quantity",
                              parseInt(e.target.value) || 1,
                            )
                          }
                          min="1"
                          disabled={paymentStatus !== "pending"}
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() =>
                            updateItem(
                              item.medicine,
                              "quantity",
                              item.quantity + 1,
                            )
                          }
                          disabled={paymentStatus !== "pending"}
                        >
                          <PlusCircle className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="col-span-2 flex items-center justify-between">
                        <span>AFN {item.total.toFixed(2)}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(item.medicine)}
                          disabled={paymentStatus !== "pending"}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div>
                  <Label>Payment Method</Label>
                  <Select
                    value={paymentMethod}
                    onValueChange={setPaymentMethod}
                    disabled={paymentStatus !== "pending"}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="insurance">Insurance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <div className="flex justify-between items-center p-4 rounded-lg border-2">
                    <span className="font-medium">Total Amount:</span>
                    <span className="text-xl font-bold">
                      AFN {calculateTotal.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment Status Message */}
              {paymentStatus === "processing" && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 text-blue-800">
                    <Clock className="h-5 w-5" />
                    <span className="font-medium">
                      Payment is being processed by receptionist
                    </span>
                  </div>
                  <p className="text-sm text-blue-600 mt-1">
                    Please wait for the receptionist to confirm payment before
                    finalizing the order.
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-3">
                {paymentStatus === "pending" && (
                  <Button
                    onClick={handleProcessPayment}
                    disabled={items.length === 0}
                  >
                    <CreditCard className="mr-2 h-4 w-4" /> Process Payment
                  </Button>
                )}

                {paymentStatus === "processing" && (
                  <Button
                    onClick={() => setPaymentStatus("paid")}
                    variant="default"
                  >
                    <DollarSign className="mr-2 h-4 w-4" /> Confirm Payment
                    Received
                  </Button>
                )}

                {paymentStatus === "paid" && (
                  <Button onClick={handleFinalizeAndPrint} variant="default">
                    <Printer className="mr-2 h-4 w-4" /> Finalize & Print
                    Receipt
                  </Button>
                )}

                {paymentStatus !== "pending" && (
                  <Button
                    onClick={handleReset}
                    variant="outline"
                    disabled={paymentStatus === "completed"}
                  >
                    Reset
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                <span>Prescription History</span>
                <div className="flex items-center gap-2">
                  <Label className="whitespace-nowrap">Rows per page:</Label>
                  <Select
                    value={rowsPerPage.toString()}
                    onValueChange={(value) => {
                      setRowsPerPage(Number(value));
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="w-20">
                      <SelectValue placeholder="10" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="15">15</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search prescriptions..."
                  value={prescriptionSearchTerm}
                  onChange={(e) => setPrescriptionSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Mobile Card View */}
              <div className="block sm:hidden space-y-3">
                {isLoadingPrescriptions ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <Card key={index} className="p-4">
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
                            <div className="h-4 w-16 bg-gray-200 rounded animate-pulse"></div>
                          </div>
                          <div className="space-y-2">
                            <div className="h-3 w-full bg-gray-200 rounded animate-pulse"></div>
                            <div className="h-3 w-3/4 bg-gray-200 rounded animate-pulse"></div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : currentPrescriptions.length > 0 ? (
                  currentPrescriptions.map((prescription: Prescription) => (
                    <MobilePrescriptionCard
                      key={prescription._id}
                      prescription={prescription}
                      onDownload={generatePrescriptionPDF}
                      user={user}
                      accessToken={accessToken}
                    />
                  ))
                ) : (
                  <div className="text-center py-8 border rounded-lg">
                    <p className="text-muted-foreground">
                      No prescriptions found
                    </p>
                  </div>
                )}
              </div>

              {/* Desktop Table View */}
              <div className="hidden sm:block rounded-md border mb-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingPrescriptions ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center">
                          Loading prescriptions...
                        </TableCell>
                      </TableRow>
                    ) : currentPrescriptions.length > 0 ? (
                      currentPrescriptions.map((prescription: Prescription) => {
                        const canDownload = canDownloadPDF(
                          prescription.paymentStatus,
                          prescription.status,
                        );

                        return (
                          <TableRow key={prescription._id}>
                            <TableCell className="font-medium">
                              {prescription.invoiceNumber}
                            </TableCell>
                            <TableCell>
                              <div>{prescription.customerName}</div>
                              <div className="text-xs text-muted-foreground">
                                {prescription.customerPhone}
                              </div>
                            </TableCell>
                            <TableCell>
                              {new Date(
                                prescription.createdAt,
                              ).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              AFN{" "}
                              {prescription.totalAmount?.toFixed(2) || "0.00"}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">
                                {prescription.paymentMethod}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {getPaymentStatusBadge(
                                prescription.paymentStatus,
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() =>
                                          generatePrescriptionPDF(prescription)
                                        }
                                        title="Download PDF"
                                        disabled={!canDownload}
                                        className="h-8 w-8"
                                      >
                                        <DownloadIcon className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    {!canDownload && (
                                      <TooltipContent>
                                        <p>
                                          PDF download only available for
                                          paid/finalized sales
                                        </p>
                                      </TooltipContent>
                                    )}
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center">
                          No prescriptions found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination Controls */}
              {filteredPrescriptions.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {(currentPage - 1) * rowsPerPage + 1} to{" "}
                    {Math.min(
                      currentPage * rowsPerPage,
                      filteredPrescriptions.length,
                    )}{" "}
                    of {filteredPrescriptions.length} entries
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="h-8 w-8 p-0 sm:w-auto sm:px-3"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span className="hidden sm:inline ml-1">Previous</span>
                    </Button>

                    <div className="flex items-center space-x-1">
                      {Array.from(
                        { length: Math.min(3, totalPages) },
                        (_, i) => {
                          let pageNum = i + 1;
                          if (currentPage > 1 && totalPages > 3) {
                            pageNum = currentPage - 1 + i;
                          }
                          if (pageNum > totalPages)
                            pageNum = totalPages - (2 - i);

                          return (
                            <Button
                              key={pageNum}
                              variant={
                                currentPage === pageNum ? "default" : "outline"
                              }
                              size="sm"
                              onClick={() => setCurrentPage(pageNum)}
                              className="h-8 w-8 p-0"
                            >
                              {pageNum}
                            </Button>
                          );
                        },
                      )}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="h-8 w-8 p-0 sm:w-auto sm:px-3"
                    >
                      <span className="hidden sm:inline mr-1">Next</span>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
