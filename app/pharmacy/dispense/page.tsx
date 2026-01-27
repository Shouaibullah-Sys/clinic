
// app/pharmacy/dispense/page.tsx

"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
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

interface Medicine {
  _id: string;
  name: string;
  batchNumber: string;
  currentQuantity: number;
  originalQuantity: number;
  unitPrice: number;
  sellingPrice: number;
  expiryDate: string;
  supplier: string;
  remainingPercentage: number;
  isLowStock: boolean;
  isExpiringSoon: boolean;
  status: string;
}

interface PrescriptionItem {
  medicine?: string | Medicine;
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
  quantity: number;
  price: number;
  route: string;
  refills: number;
  refillsRemaining: number;
}

interface Prescription {
  _id: string;
  prescriptionId: string;
  patient: {
    _id: string;
    name: string;
    patientId: string;
    phone: string;
  };
  doctor: {
    _id: string;
    name: string;
    specialization: string;
  };
  medications: PrescriptionItem[];
  diagnosis: string;
  notes?: string;
  instructions?: string;
  prescribedDate: string;
  expiryDate: string;
  followUpDate?: string;
  status: "active" | "completed" | "cancelled" | "expired";
  dispensedBy?: string;
  dispensedDate?: string;
  dispensingStatus: "pending" | "partial" | "full" | "cancelled";
  pharmacyNotes?: string;
}

interface DispensingItem {
  medicineId: string;
  medicineName: string;
  prescribedQuantity: number;
  dispensedQuantity: number;
  batchNumber: string;
  unitPrice: number;
  totalPrice: number;
  availableStock: number;
  instructions: string;
  expiryDate?: string;
  supplier?: string;
  isLowStock: boolean;
  isExpiringSoon: boolean;
  status: "available" | "low-stock" | "expiring-soon" | "out-of-stock";
  foundInStock: boolean;
}

export default function DispensePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, accessToken, isLoading: authLoading } = useAuthStore();
  
  const prescriptionId = searchParams.get("prescriptionId");
  
  const [prescription, setPrescription] = useState<Prescription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dispensingItems, setDispensingItems] = useState<DispensingItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [pharmacyNotes, setPharmacyNotes] = useState("");
  const [patientInstructions, setPatientInstructions] = useState("");
  const [dispensing, setDispensing] = useState(false);
  const [stockLoading, setStockLoading] = useState(false);

  // Fetch prescription
  const fetchPrescription = async () => {
    if (!prescriptionId || !accessToken) return;
    
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/pharmacy/prescriptions/${prescriptionId}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch prescription (${response.status})`);
      }

      const data = await response.json();
      
      if (data.success && data.data) {
        console.log("✅ Prescription loaded:", data.data);
        setPrescription(data.data);
      } else {
        throw new Error("Invalid prescription data");
      }
    } catch (error: any) {
      console.error("Error fetching prescription:", error);
      setError(error.message || "Failed to load prescription");
      toast.error("Error loading prescription");
    } finally {
      setLoading(false);
    }
  };

  // Find medicine in stock
  const findMedicineInStock = async (medicineName: string): Promise<Medicine | null> => {
    try {
      setStockLoading(true);
      
      // First try exact search
      const searchResponse = await fetch(
        `/api/pharmacy/medicines/search?q=${encodeURIComponent(medicineName)}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      );
      
      if (searchResponse.ok) {
        const searchData = await searchResponse.json();
        
        if (searchData.success && searchData.data && searchData.data.length > 0) {
          console.log(`✅ Found medicine "${medicineName}" in stock:`, searchData.data[0]);
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

  // Load medicines from prescription and link to stock
  const loadAndLinkMedicines = async () => {
    if (!prescription || !prescription.medications || !accessToken) {
      toast.error("Cannot load medicines from prescription");
      return;
    }

    try {
      console.log("🔄 Loading medicines from prescription and linking to stock...");
      const items: DispensingItem[] = [];
      
      for (const med of prescription.medications) {
        console.log(`Processing: ${med.name}`);
        
        let medicineData: Medicine | null = null;
        let foundInStock = false;
        
        // Search for medicine in stock by name
        medicineData = await findMedicineInStock(med.name);
        
        if (medicineData) {
          foundInStock = true;
          console.log(`✅ Linked "${med.name}" to stock item "${medicineData.name}"`);
          
          const availableStock = medicineData.currentQuantity || 0;
          const prescribedQty = med.quantity || 1;
          const dispensedQty = Math.min(prescribedQty, availableStock);
          const unitPrice = medicineData.sellingPrice || med.price || 0;
          const isLowStock = medicineData.currentQuantity <= 20;
          const isExpiringSoon = medicineData.isExpiringSoon || false;
          
          items.push({
            medicineId: medicineData._id,
            medicineName: med.name,
            prescribedQuantity: prescribedQty,
            dispensedQuantity: dispensedQty,
            batchNumber: medicineData.batchNumber || "N/A",
            unitPrice: unitPrice,
            totalPrice: dispensedQty * unitPrice,
            availableStock: availableStock,
            instructions: med.instructions || "",
            expiryDate: medicineData.expiryDate,
            supplier: medicineData.supplier,
            isLowStock,
            isExpiringSoon,
            status: availableStock === 0 ? "out-of-stock" : 
                   isLowStock ? "low-stock" :
                   isExpiringSoon ? "expiring-soon" : "available",
            foundInStock: true
          });
          
          // Show warnings
          if (availableStock === 0) {
            toast.warning(`${med.name} is out of stock`);
          } else if (availableStock < prescribedQty) {
            toast.warning(`${med.name}: ${availableStock} available, ${prescribedQty} prescribed`);
          }
        } else {
          // Medicine not found in stock
          console.log(`❌ "${med.name}" not found in stock`);
          
          items.push({
            medicineId: med.name,
            medicineName: med.name,
            prescribedQuantity: med.quantity || 1,
            dispensedQuantity: 0,
            batchNumber: "NOT IN STOCK",
            unitPrice: med.price || 0,
            totalPrice: 0,
            availableStock: 0,
            instructions: med.instructions || "",
            isLowStock: false,
            isExpiringSoon: false,
            status: "out-of-stock",
            foundInStock: false
          });
        }
      }
      
      console.log("📦 Final dispensing items:", items);
      setDispensingItems(items);
      
      // Set instructions from prescription
      if (prescription.instructions) {
        setPatientInstructions(prescription.instructions);
      }
      
      if (prescription.notes) {
        setPharmacyNotes(prescription.notes);
      }
      
    } catch (error) {
      console.error("Error loading medicines:", error);
      toast.error("Failed to load medicines");
    }
  };

  // Update dispensed quantity
  const updateDispensedQuantity = (medicineId: string, quantity: number) => {
    setDispensingItems(items =>
      items.map(item => {
        if (item.medicineId === medicineId) {
          const dispensedQty = Math.max(0, Math.min(quantity, item.availableStock));
          return {
            ...item,
            dispensedQuantity: dispensedQty,
            totalPrice: dispensedQty * item.unitPrice
          };
        }
        return item;
      })
    );
  };

  // Handle dispense
  const handleDispense = async () => {
    if (!prescription || !user || !accessToken) {
      toast.error("Missing information");
      return;
    }

    // Validate
    const totalDispensed = dispensingItems.reduce((sum, item) => sum + item.dispensedQuantity, 0);
    if (totalDispensed === 0) {
      toast.error("Please select quantities to dispense");
      return;
    }

    // Check if any items are out of stock
    const outOfStockItems = dispensingItems.filter(
      item => item.dispensedQuantity > 0 && item.status === "out-of-stock"
    );
    
    if (outOfStockItems.length > 0) {
      toast.error(`Cannot dispense: ${outOfStockItems.map(i => i.medicineName).join(', ')} not in stock`);
      return;
    }

    try {
      setDispensing(true);

      // Prepare items for dispensing
      const itemsToDispense = dispensingItems
        .filter(item => item.dispensedQuantity > 0 && item.foundInStock)
        .map(item => ({
          medicine: item.medicineId,
          dispensedQuantity: item.dispensedQuantity,
          batchNumber: item.batchNumber,
          unitPrice: item.unitPrice
        }));

      if (itemsToDispense.length === 0) {
        toast.error("No valid items to dispense");
        setDispensing(false);
        return;
      }

      const dispenseData = {
        dispensedBy: user._id,
        items: itemsToDispense,
        totalAmount: calculateTotal(),
        paymentMethod,
        pharmacyNotes,
        patientInstructions,
        dispensingStatus: "full"
      };

      console.log("🚀 Dispensing:", dispenseData);

      // Call dispense API
      const response = await fetch(`/api/pharmacy/prescriptions/${prescription._id}/dispense`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(dispenseData),
      });

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

  // Calculate total
  const calculateTotal = () => {
    return dispensingItems.reduce((sum, item) => sum + item.totalPrice, 0);
  };

  // Load prescription on mount
  useEffect(() => {
    if (prescriptionId && accessToken) {
      fetchPrescription();
    }
  }, [prescriptionId, accessToken]);

  // Load medicines when prescription loads
  useEffect(() => {
    if (prescription) {
      loadAndLinkMedicines();
    }
  }, [prescription]);

  // Calculate dispensing status
  const totalDispensed = dispensingItems.reduce((sum, item) => sum + item.dispensedQuantity, 0);
  const totalPrescribed = dispensingItems.reduce((sum, item) => sum + item.prescribedQuantity, 0);
  const dispensingStatus = totalDispensed === 0 
    ? "pending" 
    : totalDispensed < totalPrescribed 
      ? "partial" 
      : "full";

  // ========== RENDER ==========

  if (!prescriptionId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">No Prescription Selected</h2>
            <Button onClick={() => router.push("/pharmacy/select-prescription")}>
              Select Prescription
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
          <p className="text-muted-foreground">Loading prescription...</p>
        </div>
      </div>
    );
  }

  if (error || !prescription) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="border-red-200">
          <CardContent className="p-6">
            <AlertCircle className="h-8 w-8 text-red-500 mb-4" />
            <h2 className="text-xl font-semibold text-red-800 mb-2">Error</h2>
            <p className="text-red-700 mb-4">{error || "Prescription not found"}</p>
            <div className="flex gap-3">
              <Button onClick={fetchPrescription}>Retry</Button>
              <Button onClick={() => router.push("/pharmacy")} variant="outline">
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
          <h1 className="text-3xl font-bold">Dispense Medicines</h1>
          <p className="text-muted-foreground">
            Prescription: {prescription.prescriptionId} • Patient: {prescription.patient.name}
          </p>
        </div>
        <Badge variant={dispensingStatus === "full" ? "default" : "secondary"}>
          {dispensingStatus.toUpperCase()}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Prescription Info */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Pill className="h-5 w-5" />
                Prescription Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm text-muted-foreground">Prescription ID</Label>
                <p className="font-mono font-bold">{prescription.prescriptionId}</p>
              </div>
              
              <div>
                <Label className="text-sm text-muted-foreground">Patient</Label>
                <div className="flex items-center gap-2 mt-1">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{prescription.patient.name}</p>
                    <p className="text-sm text-muted-foreground">
                      ID: {prescription.patient.patientId}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-sm text-muted-foreground">Doctor</Label>
                <div className="mt-1">
                  <p className="font-medium">Dr. {prescription.doctor.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {prescription.doctor.specialization}
                  </p>
                </div>
              </div>

              <div>
                <Label className="text-sm text-muted-foreground">Diagnosis</Label>
                <p className="mt-1">{prescription.diagnosis}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground">Prescribed</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(prescription.prescribedDate), "MMM d, yyyy")}
                  </div>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Expires</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(prescription.expiryDate), "MMM d, yyyy")}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payment Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Payment Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="insurance">Insurance</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Total Amount</Label>
                <div className="text-2xl font-bold text-green-600">
                  ${calculateTotal().toFixed(2)}
                </div>
              </div>
            </CardContent>
          </Card>

          {stockLoading && (
            <Alert>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              <AlertDescription>Checking stock availability...</AlertDescription>
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
                  Medicines from Stock
                </span>
                <Badge variant="outline">
                  {dispensingItems.filter(i => i.dispensedQuantity > 0).length} / {dispensingItems.length}
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
                        <TableHead>Batch</TableHead>
                        <TableHead>Supplier</TableHead>
                        <TableHead>Prescribed</TableHead>
                        <TableHead>In Stock</TableHead>
                        <TableHead>Dispense</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dispensingItems.map((item) => (
                        <TableRow key={item.medicineId} className={
                          !item.foundInStock ? "bg-red-50" :
                          item.status === "low-stock" ? "bg-orange-50" :
                          item.status === "expiring-soon" ? "bg-yellow-50" : ""
                        }>
                          <TableCell>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{item.medicineName}</p>
                                {item.foundInStock ? (
                                  <span title="Found in stock">
                                    <Check className="h-4 w-4 text-green-500" />
                                  </span>
                                ) : (
                                  <span title="Not in stock">
                                    <X className="h-4 w-4 text-red-500" />
                                  </span>
                                )}
                              </div>
                              {!item.foundInStock && (
                                <Badge variant="destructive" className="mt-1 text-xs">
                                  Not in stock
                                </Badge>
                              )}
                              {item.foundInStock && item.status === "low-stock" && (
                                <Badge className="bg-orange-500 text-xs mt-1">
                                  Low Stock
                                </Badge>
                              )}
                              {item.expiryDate && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Expires: {format(new Date(item.expiryDate), "MMM d, yyyy")}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {item.batchNumber}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm">{item.supplier || "N/A"}</p>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{item.prescribedQuantity}</div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className={
                                !item.foundInStock ? "text-red-600 font-bold" :
                                item.availableStock === 0 ? "text-red-600" :
                                item.availableStock < item.prescribedQuantity ? "text-orange-500" : "text-green-600"
                              }>
                                {item.foundInStock ? item.availableStock : "0"}
                              </span>
                              {!item.foundInStock && (
                                <AlertCircle className="h-4 w-4 text-red-500" />
                              )}
                              {item.foundInStock && item.availableStock === 0 && (
                                <AlertCircle className="h-4 w-4 text-red-500" />
                              )}
                              {item.foundInStock && item.availableStock > 0 && item.availableStock < item.prescribedQuantity && (
                                <Info className="h-4 w-4 text-orange-500" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                min="0"
                                max={item.foundInStock ? item.availableStock : 0}
                                value={item.dispensedQuantity}
                                onChange={(e) =>
                                  updateDispensedQuantity(item.medicineId, parseInt(e.target.value) || 0)
                                }
                                className="w-20"
                                disabled={!item.foundInStock || item.availableStock === 0}
                              />
                              {item.foundInStock && item.availableStock > 0 && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateDispensedQuantity(item.medicineId, Math.min(item.prescribedQuantity, item.availableStock))}
                                  className="text-xs"
                                >
                                  Max
                                </Button>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">${item.unitPrice.toFixed(2)}</div>
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

          <Card>
            <CardHeader>
              <CardTitle>Additional Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Patient Instructions</Label>
                <Textarea
                  value={patientInstructions}
                  onChange={(e) => setPatientInstructions(e.target.value)}
                  placeholder="Instructions for the patient..."
                  rows={3}
                />
              </div>
              <div>
                <Label>Pharmacy Notes (Internal)</Label>
                <Textarea
                  value={pharmacyNotes}
                  onChange={(e) => setPharmacyNotes(e.target.value)}
                  placeholder="Internal notes for pharmacy..."
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Summary Alert */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p>Review before dispensing:</p>
                <div className="text-sm grid grid-cols-2 gap-2">
                  <div>
                    <span className="font-medium">Total Prescribed:</span> {totalPrescribed} units
                  </div>
                  <div>
                    <span className="font-medium">To Dispense:</span> {totalDispensed} units
                  </div>
                  <div>
                    <span className="font-medium">Status:</span> {dispensingStatus.toUpperCase()}
                  </div>
                  <div>
                    <span className="font-medium">Found in Stock:</span> {dispensingItems.filter(i => i.foundInStock).length} / {dispensingItems.length}
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
              disabled={dispensing || totalDispensed === 0}
            >
              {dispensing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Dispense Medicines (${calculateTotal().toFixed(2)})
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}