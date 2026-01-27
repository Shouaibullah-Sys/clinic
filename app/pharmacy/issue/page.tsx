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

interface Medicine {
  _id: string;
  name: string;
  batchNumber: string;
  currentQuantity: number;
  sellingPrice: number;
}

interface MedicineItem {
  medicine: string;
  name: string;
  batchNumber: string;
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
  quantity?: number;
  unitPrice?: number;
  discount?: number;
  total?: number;
}

interface Prescription {
  _id: string;
  invoiceNumber: string;
  patientName: string;
  patientPhone: string;
  medications: PrescriptionItem[];
  totalAmount?: number;
  amountPaid?: number;
  paymentMethod: string;
  status: string;
  createdAt: string;
  issuedBy?: {
    _id: string;
    name: string;
  };
}

interface User {
  id: string;
  name: string;
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

// Mobile Prescription Card Component
const MobilePrescriptionCard = ({
  prescription,
  onDownload,
}: {
  prescription: Prescription;
  onDownload: (prescription: Prescription) => void;
}) => {
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
                <span>Patient:</span>
                <span>{prescription.patientName}</span>
              </div>
              <div className="flex justify-between">
                <span>Phone:</span>
                <span>{prescription.patientPhone}</span>
              </div>
              <div className="flex justify-between">
                <span>Date:</span>
                <span>
                  {new Date(prescription.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Payment:</span>
                <Badge variant="outline" className="capitalize text-xs">
                  {prescription.paymentMethod}
                </Badge>
              </div>
            </div>
          </div>
        </div>
        <div className="flex justify-end space-x-2 mt-3 pt-3 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDownload(prescription)}
            className="h-7 text-xs"
          >
            <DownloadIcon className="h-3 w-3 mr-1" />
            PDF
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default function PharmacyPage() {
  const { user } = useAuthStore() as AuthStore;
  const [activeTab, setActiveTab] = useState<"issue" | "history">("issue");
  const [patientName, setPatientName] = useState<string>("");
  const [patientPhone, setPatientPhone] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  const [items, setItems] = useState<MedicineItem[]>([]);
  const [selectedMedicine, setSelectedMedicine] = useState<string>("");
  const [invoiceNumber, setInvoiceNumber] = useState<string>(
    `INV-${Date.now()}`
  );
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [prescriptionSearchTerm, setPrescriptionSearchTerm] =
    useState<string>("");

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
        prescription.patientName.toLowerCase().includes(searchLower) ||
        prescription.patientPhone.toLowerCase().includes(searchLower) ||
        prescription.paymentMethod.toLowerCase().includes(searchLower)
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

  const filteredMedicines = useMemo(() => {
    if (!Array.isArray(medicinesData) || medicinesData.length === 0) {
      return [];
    }

    return medicinesData
      .filter((medicine) => {
        if (
          !medicine ||
          typeof medicine.currentQuantity !== "number" ||
          !medicine._id ||
          !medicine.name ||
          !medicine.batchNumber ||
          typeof medicine.sellingPrice !== "number"
        ) {
          return false;
        }
        return medicine.currentQuantity > 0;
      })
      .filter((medicine) => {
        if (!searchTerm || !searchTerm.trim()) {
          return true;
        }

        const searchLower = searchTerm.toLowerCase();
        const name = medicine.name?.toLowerCase() || "";
        const batchNumber = medicine.batchNumber?.toLowerCase() || "";

        return name.includes(searchLower) || batchNumber.includes(searchLower);
      });
  }, [medicinesData, searchTerm]);

  useEffect(() => {
    setInvoiceNumber(`INV-${Date.now()}`);
  }, [items]);

  // Reset pagination when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [prescriptionSearchTerm]);

  const addItem = () => {
    try {
      if (
        !selectedMedicine ||
        !Array.isArray(medicinesData) ||
        medicinesData.length === 0
      ) {
        return;
      }

      const medicine = medicinesData.find(
        (m) => m && m._id === selectedMedicine
      );
      if (
        !medicine ||
        !medicine.name ||
        !medicine.batchNumber ||
        typeof medicine.sellingPrice !== "number"
      ) {
        toast.error("Invalid medicine selected");
        return;
      }

      const currentItems = Array.isArray(items) ? items : [];
      const existingItem = currentItems.find(
        (item) => item && item.medicine === selectedMedicine
      );

      if (existingItem) {
        setItems(
          currentItems.map((item) =>
            item && item.medicine === selectedMedicine
              ? {
                  ...item,
                  quantity: item.quantity + 1,
                  total:
                    (item.quantity + 1) *
                    item.unitPrice *
                    (1 - item.discount / 100),
                }
              : item
          )
        );
      } else {
        setItems([
          ...currentItems,
          {
            medicine: selectedMedicine,
            name: medicine.name,
            batchNumber: medicine.batchNumber,
            quantity: 1,
            unitPrice: medicine.sellingPrice,
            discount: 0,
            total: medicine.sellingPrice,
          },
        ]);
      }

      setSelectedMedicine("");
      setSearchTerm("");
    } catch (error) {
      console.error("Error adding item:", error);
      toast.error("Failed to add medicine");
    }
  };

  const updateItem = (
    medicineId: string,
    field: keyof MedicineItem,
    value: number
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

          if (
            field === "quantity" ||
            field === "unitPrice" ||
            field === "discount"
          ) {
            const quantity = updatedItem.quantity || 0;
            const unitPrice = updatedItem.unitPrice || 0;
            const discount = Math.min(
              100,
              Math.max(0, updatedItem.discount || 0)
            );

            updatedItem.discount = discount;
            const discountedPrice = unitPrice * (1 - discount / 100);
            updatedItem.total = quantity * discountedPrice;
          }

          return updatedItem;
        })
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
    doc.text("Patient Information:", 14, 50);
    doc.text(`Name: ${prescription.patientName}`, 20, 58);
    doc.text(`Phone: ${prescription.patientPhone}`, 20, 66);

    doc.setFontSize(12);
    doc.text("Prescribed Items:", 14, 80);

    const itemData =
      prescription.medications && Array.isArray(prescription.medications)
        ? prescription.medications.map((item) => [
            item.medicine?.name || "Unknown",
            item.quantity?.toString() || "0",
            `AFN ${(item.unitPrice || 0).toFixed(2)}`,
            `${item.discount || 0}%`,
            `AFN ${(item.total || 0).toFixed(2)}`,
          ])
        : [];

    autoTable(doc, {
      head: [["Medicine", "Qty", "Unit Price", "Discount", "Total"]],
      body: itemData,
      startY: 85,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [59, 130, 246] },
      columnStyles: {
        0: { cellWidth: 70 },
        1: { cellWidth: 20 },
        2: { cellWidth: 30 },
        3: { cellWidth: 25 },
        4: { cellWidth: 30 },
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
    doc.text("Prescribed by:", 14, lastY);
    doc.text(prescription.issuedBy?.name || "System", 14, lastY + 5);
    doc.text("Thank you for your visit!", 105, lastY + 10, { align: "center" });

    doc.save(`prescription-${prescription.invoiceNumber}.pdf`);
  };

  const handleSubmit = async () => {
    if (
      !patientName?.trim() ||
      !patientPhone?.trim() ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      toast.error("Please fill all required fields");
      return;
    }

    try {
      const response = await fetch("/api/pharmacy/prescriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientName,
          patientPhone,
          invoiceNumber,
          items: items.map((item) => ({
            medicine: item.medicine,
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
      setPatientName("");
      setPatientPhone("");
      setItems([]);
      setPaymentMethod("cash");
      mutateStock();
      mutatePrescriptions();
      setActiveTab("history");
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "Failed to issue prescription"
      );
    }
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
                <span>Issue Medicine</span>
                <div className="flex items-center gap-2">
                  <Label className="whitespace-nowrap">Invoice #:</Label>
                  <Input
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="w-40"
                  />
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <Label>Patient Name *</Label>
                  <Input
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    placeholder="Enter patient name"
                  />
                </div>
                <div>
                  <Label>Patient Phone *</Label>
                  <Input
                    value={patientPhone}
                    onChange={(e) => setPatientPhone(e.target.value)}
                    placeholder="Enter patient phone"
                  />
                </div>
              </div>

              <div className="mb-6">
                <Label>Add Medicine</Label>
                <div className="flex items-center relative mb-2">
                  <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search medicine by name or batch..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="flex gap-2">
                  <Select
                    value={selectedMedicine}
                    onValueChange={setSelectedMedicine}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select medicine" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60 overflow-auto">
                      {filteredMedicines.length > 0 ? (
                        filteredMedicines.map((medicine) => (
                          <SelectItem key={medicine._id} value={medicine._id}>
                            <div className="flex flex-col">
                              <span>{medicine.name}</span>
                              <span className="text-xs text-muted-foreground">
                                Batch: {medicine.batchNumber} | Qty:{" "}
                                {medicine.currentQuantity} | Price: AFN
                                {medicine.sellingPrice.toFixed(2)}
                              </span>
                            </div>
                          </SelectItem>
                        ))
                      ) : (
                        <div className="p-2 text-sm text-muted-foreground text-center">
                          {medicinesData.length === 0
                            ? "Loading medicines..."
                            : "No available medicines found"}
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                  <Button onClick={addItem} disabled={!selectedMedicine}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add
                  </Button>
                </div>
              </div>

              {items.length > 0 && (
                <div className="border rounded-lg mb-6 overflow-hidden">
                  <div className="grid grid-cols-12 gap-2 p-2 bg-gray-100 font-medium">
                    <div className="col-span-5">Medicine</div>
                    <div className="col-span-2">Price</div>
                    <div className="col-span-2">Qty</div>
                    <div className="col-span-2">Discount %</div>
                    <div className="col-span-1">Total</div>
                  </div>

                  {items.map((item) => (
                    <div
                      key={item.medicine}
                      className="grid grid-cols-12 gap-2 p-2 border-t"
                    >
                      <div className="col-span-5">
                        <div className="font-medium">{item.name}</div>
                        <div className="text-xs text-muted-foreground">
                          Batch: {item.batchNumber}
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
                              parseFloat(e.target.value)
                            )
                          }
                          min="0"
                          step="0.01"
                          readOnly
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
                              Math.max(1, item.quantity - 1)
                            )
                          }
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
                              parseInt(e.target.value) || 1
                            )
                          }
                          min="1"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() =>
                            updateItem(
                              item.medicine,
                              "quantity",
                              item.quantity + 1
                            )
                          }
                        >
                          <PlusCircle className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="number"
                          value={item.discount}
                          onChange={(e) =>
                            updateItem(
                              item.medicine,
                              "discount",
                              parseFloat(e.target.value)
                            )
                          }
                          min="0"
                          max="100"
                          step="1"
                        />
                      </div>
                      <div className="col-span-1 flex items-center justify-between">
                        <span>AFN {item.total.toFixed(2)}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(item.medicine)}
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
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="insurance">Insurance</SelectItem>
                      <SelectItem value="mobile">Mobile Payment</SelectItem>
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

              <div className="flex justify-end">
                <Button onClick={handleSubmit} disabled={items.length === 0}>
                  <CheckCircle className="mr-2 h-4 w-4" /> Issue Prescription
                </Button>
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
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingPrescriptions ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                          Loading prescriptions...
                        </TableCell>
                      </TableRow>
                    ) : currentPrescriptions.length > 0 ? (
                      currentPrescriptions.map((prescription: Prescription) => (
                        <TableRow key={prescription._id}>
                          <TableCell className="font-medium">
                            {prescription.invoiceNumber}
                          </TableCell>
                          <TableCell>
                            <div>{prescription.patientName}</div>
                            <div className="text-xs text-muted-foreground">
                              {prescription.patientPhone}
                            </div>
                          </TableCell>
                          <TableCell>
                            {new Date(
                              prescription.createdAt
                            ).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            AFN {prescription.totalAmount?.toFixed(2) || "0.00"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {prescription.paymentMethod}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                generatePrescriptionPDF(prescription)
                              }
                              title="Download PDF"
                            >
                              <DownloadIcon className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
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
                      filteredPrescriptions.length
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
                        }
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
