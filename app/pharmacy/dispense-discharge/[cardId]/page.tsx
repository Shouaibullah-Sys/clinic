// app/pharmacy/dispense-discharge/[cardId]/page.tsx

"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Package,
  User,
  Pill,
  Calendar,
  AlertTriangle,
  Loader2,
  Info,
  Check,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface MedicineItem {
  _id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  instructions?: string;
  frequency?: string;
  duration?: string;
  notes?: string;
  administeredDate?: string;
  medicine?: {
    _id: string;
    name: string;
    form: string;
    dosage: string;
    frequency: string;
    route: string;
    currentQuantity: number;
    sellingPrice: number;
    expiryDate: string;
  };
  dispensed?: boolean;
  dispensedDate?: string;
}

interface DischargeCard {
  _id: string;
  dischargeId: string;
  patient: {
    _id: string;
    name: string;
    patientId: string;
    phone: string;
  };
  doctor: {
    name: string;
    specialization: string;
  };
  operationName: string;
  operationDate: string;
  diagnosis: string;
  admissionDate: string;
  dischargeDate: string;
  preOpMedicines: MedicineItem[];
  postOpMedicines: MedicineItem[];
  dischargeMedicines: MedicineItem[];
  preOpTotal: number;
  postOpTotal: number;
  dischargeTotal: number;
  totalMedicineCost: number;
  totalMedicines: number;
  totalDispensed: number;
  remainingMedicines: number;
  preOpDispensed: number;
  postOpDispensed: number;
  dischargeDispensed: number;
  pharmacyDispensingStatus: "pending" | "partial" | "full";
  billing: {
    medicinesPaid: boolean;
    medicinesPaidAmount: number;
  };
  dischargeInstructions: string;
  followUpDate?: string;
}

interface DispensingItem {
  medicineId: string;
  medicineName: string;
  index: number;
  type: "preOp" | "postOp" | "discharge";
  prescribedQuantity: number;
  dispensedQuantity: number;
  form: string;
  dosage: string;
  frequency: string;
  route: string;
  unitPrice: number;
  totalPrice: number;
  availableStock: number;
  instructions: string;
  expiryDate?: string;
  isLowStock: boolean;
  isExpiringSoon: boolean;
  status:
    | "available"
    | "low-stock"
    | "expiring-soon"
    | "out-of-stock"
    | "already-dispensed";
  foundInStock: boolean;
  alreadyDispensed: boolean;
}

export default function DispenseDischargePage() {
  const params = useParams();
  const router = useRouter();
  const { user, accessToken, isLoading: authLoading } = useAuthStore();

  const cardId = params.cardId as string;

  const [dischargeCard, setDischargeCard] = useState<DischargeCard | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dispensingItems, setDispensingItems] = useState<DispensingItem[]>([]);
  const [dispensing, setDispensing] = useState(false);
  const [stockLoading, setStockLoading] = useState(false);

  // Fetch discharge card
  const fetchDischargeCard = async () => {
    if (!cardId || !accessToken) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/pharmacy/discharge-cards/${cardId}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch discharge card (${response.status})`);
      }

      const data = await response.json();

      if (data.success && data.data) {
        console.log("✅ Discharge card loaded:", data.data);
        setDischargeCard(data.data);
      } else {
        throw new Error("Invalid discharge card data");
      }
    } catch (error: any) {
      console.error("Error fetching discharge card:", error);
      setError(error.message || "Failed to load discharge card");
      toast.error("Error loading discharge card");
    } finally {
      setLoading(false);
    }
  };

  // Find medicine in stock
  const findMedicineInStock = async (
    medicineName: string,
  ): Promise<any | null> => {
    try {
      setStockLoading(true);

      const searchResponse = await fetch(
        `/api/pharmacy/medicines/search?q=${encodeURIComponent(medicineName)}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );

      if (searchResponse.ok) {
        const searchData = await searchResponse.json();

        if (
          searchData.success &&
          searchData.data &&
          searchData.data.length > 0
        ) {
          console.log(
            `✅ Found medicine "${medicineName}" in stock:`,
            searchData.data[0],
          );
          return searchData.data[0];
        }
      }

      return null;
    } catch (error) {
      console.error(`Error finding medicine "${medicineName}":`, error);
      return null;
    } finally {
      setStockLoading(false);
    }
  };

  // Load medicines from discharge card and link to stock
  const loadAndLinkMedicines = async () => {
    if (!dischargeCard || !accessToken) {
      toast.error("Cannot load medicines from discharge card");
      return;
    }

    try {
      console.log(
        "🔄 Loading medicines from discharge card and linking to stock...",
      );
      const items: DispensingItem[] = [];

      // Process pre-op medicines
      for (let i = 0; i < dischargeCard.preOpMedicines.length; i++) {
        const med = dischargeCard.preOpMedicines[i];
        const item = await processMedicine(med, "preOp", i);
        if (item) items.push(item);
      }

      // Process post-op medicines
      for (let i = 0; i < dischargeCard.postOpMedicines.length; i++) {
        const med = dischargeCard.postOpMedicines[i];
        const item = await processMedicine(med, "postOp", i);
        if (item) items.push(item);
      }

      // Process discharge medicines
      for (let i = 0; i < dischargeCard.dischargeMedicines.length; i++) {
        const med = dischargeCard.dischargeMedicines[i];
        const item = await processMedicine(med, "discharge", i);
        if (item) items.push(item);
      }

      console.log("📦 Final dispensing items:", items);
      setDispensingItems(items);
    } catch (error) {
      console.error("Error loading medicines:", error);
      toast.error("Failed to load medicines");
    }
  };

  // Process a single medicine
  const processMedicine = async (
    med: MedicineItem,
    type: "preOp" | "postOp" | "discharge",
    index: number,
  ): Promise<DispensingItem | null> => {
    const medicineName = med.name || (med.medicine?.name as string);

    // Check if already dispensed
    if (med.dispensed) {
      return {
        medicineId: med.medicine?._id || med._id,
        medicineName,
        index,
        type,
        prescribedQuantity: med.quantity,
        dispensedQuantity: 0,
        form: med.medicine?.form || "N/A",
        dosage: med.medicine?.dosage || "N/A",
        frequency: med.medicine?.frequency || "N/A",
        route: med.medicine?.route || "N/A",
        unitPrice: med.unitPrice,
        totalPrice: 0,
        availableStock: med.medicine?.currentQuantity || 0,
        instructions: med.instructions || "",
        expiryDate: med.medicine?.expiryDate,
        isLowStock: false,
        isExpiringSoon: false,
        status: "already-dispensed",
        foundInStock: true,
        alreadyDispensed: true,
      };
    }

    // Search for medicine in stock
    let medicineData: any = null;
    if (med.medicine?._id) {
      try {
        const stockResponse = await fetch(
          `/api/pharmacy/medicines/${med.medicine._id}`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          },
        );
        if (stockResponse.ok) {
          const stockData = await stockResponse.json();
          if (stockData.success && stockData.data) {
            medicineData = stockData.data;
          }
        }
      } catch (error) {
        console.error("Error fetching medicine stock:", error);
      }
    }

    if (!medicineData) {
      medicineData = await findMedicineInStock(medicineName);
    }

    if (medicineData) {
      const availableStock = medicineData.currentQuantity || 0;
      const prescribedQty = med.quantity || 1;
      const dispensedQty = Math.min(prescribedQty, availableStock);
      const unitPrice = medicineData.sellingPrice || med.unitPrice || 0;
      const isLowStock = medicineData.currentQuantity <= 20;
      const isExpiringSoon = medicineData.isExpiringSoon || false;

      return {
        medicineId: medicineData._id,
        medicineName,
        index,
        type,
        prescribedQuantity: prescribedQty,
        dispensedQuantity: dispensedQty,
        form: medicineData.form || "N/A",
        dosage: medicineData.dosage || "N/A",
        frequency: medicineData.frequency || "N/A",
        route: medicineData.route || "N/A",
        unitPrice: unitPrice,
        totalPrice: dispensedQty * unitPrice,
        availableStock: availableStock,
        instructions: med.instructions || "",
        expiryDate: medicineData.expiryDate,
        isLowStock,
        isExpiringSoon,
        status:
          availableStock === 0
            ? "out-of-stock"
            : isLowStock
              ? "low-stock"
              : isExpiringSoon
                ? "expiring-soon"
                : "available",
        foundInStock: true,
        alreadyDispensed: false,
      };
    } else {
      // Medicine not found in stock
      return {
        medicineId: med._id,
        medicineName,
        index,
        type,
        prescribedQuantity: med.quantity || 1,
        dispensedQuantity: 0,
        form: "N/A",
        dosage: "N/A",
        frequency: "N/A",
        route: "N/A",
        unitPrice: med.unitPrice || 0,
        totalPrice: 0,
        availableStock: 0,
        instructions: med.instructions || "",
        isLowStock: false,
        isExpiringSoon: false,
        status: "out-of-stock",
        foundInStock: false,
        alreadyDispensed: false,
      };
    }
  };

  // Update dispensed quantity
  const updateDispensedQuantity = (medicineId: string, quantity: number) => {
    setDispensingItems((items) =>
      items.map((item) => {
        if (item.medicineId === medicineId) {
          const dispensedQty = Math.max(
            0,
            Math.min(quantity, item.availableStock),
          );
          return {
            ...item,
            dispensedQuantity: dispensedQty,
            totalPrice: dispensedQty * item.unitPrice,
          };
        }
        return item;
      }),
    );
  };

  // Handle dispense
  const handleDispense = async () => {
    if (!dischargeCard || !user || !accessToken) {
      toast.error("Missing information");
      return;
    }

    // Get items to dispense
    const itemsToDispense = dispensingItems.filter(
      (item) =>
        item.dispensedQuantity > 0 &&
        item.foundInStock &&
        !item.alreadyDispensed,
    );

    if (itemsToDispense.length === 0) {
      toast.error("Please select quantities to dispense");
      return;
    }

    try {
      setDispensing(true);

      const dispenseData = {
        medicinesToDispense: itemsToDispense.map((item) => ({
          medicineId: item.medicineId,
          quantity: item.dispensedQuantity,
          type: item.type,
          index: item.index,
        })),
        dispensedBy: user._id,
      };

      console.log("🚀 Dispensing:", dispenseData);

      const response = await fetch(
        `/api/pharmacy/discharge-cards/${cardId}/dispense`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(dispenseData),
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to dispense");
      }

      toast.success("✅ Medicines dispensed successfully!");

      // Redirect after success
      setTimeout(() => {
        router.push("/pharmacy");
      }, 1500);
    } catch (error: any) {
      console.error("Dispensing failed:", error);
      toast.error(error.message || "Dispensing failed");
    } finally {
      setDispensing(false);
    }
  };

  // Calculate totals
  const calculateTotal = () => {
    return dispensingItems.reduce((sum, item) => sum + item.totalPrice, 0);
  };

  // Calculate dispensing status
  const totalDispensed = dispensingItems.reduce(
    (sum, item) =>
      sum +
      (item.alreadyDispensed
        ? item.prescribedQuantity
        : item.dispensedQuantity),
    0,
  );
  const totalPrescribed = dispensingItems.reduce(
    (sum, item) => sum + item.prescribedQuantity,
    0,
  );
  const dispensingStatus =
    totalDispensed === 0
      ? "pending"
      : totalDispensed < totalPrescribed
        ? "partial"
        : "full";

  // Load discharge card on mount
  useEffect(() => {
    if (cardId && accessToken) {
      fetchDischargeCard();
    }
  }, [cardId, accessToken]);

  // Load medicines when discharge card loads
  useEffect(() => {
    if (dischargeCard) {
      loadAndLinkMedicines();
    }
  }, [dischargeCard]);

  // Auth check
  useEffect(() => {
    if (!authLoading && user && !["admin", "pharmacist", "pharmacy_head"].includes(user.role)) {
      router.push("/unauthorized");
    }
  }, [user, authLoading, router]);

  if (!cardId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">
              No Discharge Card Selected
            </h2>
            <Button onClick={() => router.push("/pharmacy")}>
              Back to Pharmacy
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-muted-foreground">Loading discharge card...</p>
        </div>
      </div>
    );
  }

  if (error || !dischargeCard) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="border-red-200">
          <CardContent className="p-6">
            <AlertCircle className="h-8 w-8 text-red-500 mb-4" />
            <h2 className="text-xl font-semibold text-red-800 mb-2">Error</h2>
            <p className="text-red-700 mb-4">
              {error || "Discharge card not found"}
            </p>
            <div className="flex gap-3">
              <Button onClick={fetchDischargeCard}>Retry</Button>
              <Button
                onClick={() => router.push("/pharmacy")}
                variant="outline"
              >
                Back to Pharmacy
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if already fully dispensed
  if (dischargeCard.pharmacyDispensingStatus === "full") {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="border-green-200">
          <CardContent className="p-6 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Already Dispensed</h2>
            <p className="text-gray-600 mb-4">
              All medicines for this discharge card have already been dispensed.
            </p>
            <Button onClick={() => router.push("/pharmacy")}>
              Back to Pharmacy
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if medicines are paid
  if (!dischargeCard.billing?.medicinesPaid) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="border-yellow-200">
          <CardContent className="p-6">
            <AlertTriangle className="h-8 w-8 text-yellow-500 mb-4" />
            <h2 className="text-xl font-semibold text-yellow-800 mb-2">
              Payment Required
            </h2>
            <p className="text-yellow-700 mb-4">
              Medicines have not been paid yet. Please ask reception to verify
              payment before dispensing.
            </p>
            <div className="flex gap-3">
              <Button
                onClick={() => router.push("/pharmacy")}
                variant="outline"
              >
                Back to Pharmacy
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" onClick={() => router.push("/pharmacy")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Pharmacy
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Dispense Discharge Medicines</h1>
          <p className="text-muted-foreground">
            Discharge Card: {dischargeCard.dischargeId} • Patient:{" "}
            {dischargeCard.patient.name}
          </p>
        </div>
        <Badge variant={dispensingStatus === "full" ? "default" : "secondary"}>
          {dispensingStatus.toUpperCase()}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Discharge Card Info */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Patient Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm text-muted-foreground">
                  Patient Name
                </Label>
                <p className="font-medium">{dischargeCard.patient.name}</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">
                  Patient ID
                </Label>
                <p className="font-mono">{dischargeCard.patient.patientId}</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Phone</Label>
                <p>{dischargeCard.patient.phone}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Pill className="h-5 w-5" />
                Surgery Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm text-muted-foreground">
                  Operation
                </Label>
                <p className="font-medium">{dischargeCard.operationName}</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Doctor</Label>
                <p className="font-medium">Dr. {dischargeCard.doctor.name}</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">
                  Diagnosis
                </Label>
                <p>{dischargeCard.diagnosis}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground">
                    Admission
                  </Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar className="h-4 w-4" />
                    {format(
                      new Date(dischargeCard.admissionDate),
                      "MMM d, yyyy",
                    )}
                  </div>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">
                    Discharge
                  </Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar className="h-4 w-4" />
                    {format(
                      new Date(dischargeCard.dischargeDate),
                      "MMM d, yyyy",
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Medicine Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span>Pre-op Medicines</span>
                <span className="font-medium">
                  ${dischargeCard.preOpTotal.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Post-op Medicines</span>
                <span className="font-medium">
                  ${dischargeCard.postOpTotal.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Discharge Medicines</span>
                <span className="font-medium">
                  ${dischargeCard.dischargeTotal.toFixed(2)}
                </span>
              </div>
              <div className="border-t pt-4">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-green-600">
                    ${dischargeCard.totalMedicineCost.toFixed(2)}
                  </span>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                <div className="flex justify-between">
                  <span>Dispensed: {dischargeCard.totalDispensed}</span>
                  <span>Remaining: {dischargeCard.remainingMedicines}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {stockLoading && (
            <Alert>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              <AlertDescription>
                Checking stock availability...
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Right Column: Medicines */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Medicines to Dispense
                </span>
                <Badge variant="outline">
                  {
                    dispensingItems.filter(
                      (i) => i.dispensedQuantity > 0 || i.alreadyDispensed,
                    ).length
                  }{" "}
                  / {dispensingItems.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dispensingItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4" />
                  <p>No medicines to dispense</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Medicine</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Prescribed</TableHead>
                        <TableHead>In Stock</TableHead>
                        <TableHead>Dispense</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dispensingItems.map((item) => (
                        <TableRow
                          key={item.medicineId}
                          className={
                            item.alreadyDispensed
                              ? "bg-green-50"
                              : !item.foundInStock
                                ? "bg-red-50"
                                : item.status === "low-stock"
                                  ? "bg-orange-50"
                                  : item.status === "expiring-soon"
                                    ? "bg-yellow-50"
                                    : ""
                          }
                        >
                          <TableCell>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium">
                                  {item.medicineName}
                                </p>
                                {item.alreadyDispensed ? (
                                  <span title="Already dispensed">
                                    <Check className="h-4 w-4 text-green-500" />
                                  </span>
                                ) : item.foundInStock ? (
                                  <span title="Found in stock">
                                    <Check className="h-4 w-4 text-green-500" />
                                  </span>
                                ) : (
                                  <span title="Not in stock">
                                    <X className="h-4 w-4 text-red-500" />
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground space-y-1">
                                <p>Form: {item.form}</p>
                                <p>Dosage: {item.dosage}</p>
                                <p>Frequency: {item.frequency}</p>
                                <p>Route: {item.route}</p>
                              </div>
                              {item.expiryDate && (
                                <p className="text-xs text-muted-foreground">
                                  Expires:{" "}
                                  {format(
                                    new Date(item.expiryDate),
                                    "MMM d, yyyy",
                                  )}
                                </p>
                              )}
                              {item.instructions && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {item.instructions}
                                </p>
                              )}
                              {item.alreadyDispensed && (
                                <Badge className="bg-green-500 text-xs mt-1">
                                  Already Dispensed
                                </Badge>
                              )}
                              {!item.foundInStock && !item.alreadyDispensed && (
                                <Badge
                                  variant="destructive"
                                  className="text-xs mt-1"
                                >
                                  Not in stock
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {item.type === "preOp"
                                ? "Pre-op"
                                : item.type === "postOp"
                                  ? "Post-op"
                                  : "Discharge"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">
                              {item.prescribedQuantity}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div
                              className={
                                !item.foundInStock
                                  ? "text-red-600 font-bold"
                                  : item.availableStock === 0
                                    ? "text-red-600"
                                    : item.availableStock <
                                        item.prescribedQuantity
                                      ? "text-orange-500"
                                      : "text-green-600"
                              }
                            >
                              {item.foundInStock ? item.availableStock : "0"}
                            </div>
                          </TableCell>
                          <TableCell>
                            {item.alreadyDispensed ? (
                              <Badge variant="secondary">Done</Badge>
                            ) : (
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  min="0"
                                  max={
                                    item.foundInStock ? item.availableStock : 0
                                  }
                                  value={item.dispensedQuantity}
                                  onChange={(e) =>
                                    updateDispensedQuantity(
                                      item.medicineId,
                                      parseInt(e.target.value) || 0,
                                    )
                                  }
                                  className="w-20"
                                  disabled={
                                    !item.foundInStock ||
                                    item.availableStock === 0
                                  }
                                />
                                {item.foundInStock &&
                                  item.availableStock > 0 && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() =>
                                        updateDispensedQuantity(
                                          item.medicineId,
                                          Math.min(
                                            item.prescribedQuantity,
                                            item.availableStock,
                                          ),
                                        )
                                      }
                                      className="text-xs"
                                    >
                                      Max
                                    </Button>
                                  )}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              ${item.unitPrice.toFixed(2)}
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">
                            ${item.totalPrice.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Summary Alert */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p>Review before dispensing:</p>
                <div className="text-sm grid grid-cols-2 gap-2">
                  <div>
                    <span className="font-medium">Total Prescribed:</span>{" "}
                    {totalPrescribed} units
                  </div>
                  <div>
                    <span className="font-medium">To Dispense:</span>{" "}
                    {dispensingItems
                      .filter((i) => i.dispensedQuantity > 0)
                      .reduce((sum, i) => sum + i.dispensedQuantity, 0)}{" "}
                    units
                  </div>
                  <div>
                    <span className="font-medium">Status:</span>{" "}
                    {dispensingStatus.toUpperCase()}
                  </div>
                  <div>
                    <span className="font-medium">Found in Stock:</span>{" "}
                    {dispensingItems.filter((i) => i.foundInStock).length} /{" "}
                    {dispensingItems.length}
                  </div>
                </div>
              </div>
            </AlertDescription>
          </Alert>

          {/* Action Buttons */}
          <div className="flex justify-end gap-4">
            <Button
              variant="outline"
              onClick={() => router.push("/pharmacy")}
              disabled={dispensing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDispense}
              disabled={
                dispensing ||
                dispensingItems.filter(
                  (i) =>
                    i.dispensedQuantity > 0 &&
                    i.foundInStock &&
                    !i.alreadyDispensed,
                ).length === 0
              }
            >
              {dispensing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Dispense Medicines ($
                  {calculateTotal().toFixed(2)})
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
