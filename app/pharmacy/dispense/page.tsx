// app/pharmacy/dispense/page.tsx - COMPLETE FIXED VERSION
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
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Medicine {
  _id: string;
  name: string;
  batchNumber: string;
  currentQuantity: number;
  sellingPrice: number;
  unitPrice: number;
}

interface PrescriptionItem {
  medicine: Medicine;
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
  name: string;
  prescribedQuantity: number;
  dispensedQuantity: number;
  batchNumber: string;
  unitPrice: number;
  totalPrice: number;
  availableStock: number;
  instructions: string;
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

  // Debug logging
  useEffect(() => {
    console.log("Dispense page state:", { 
      prescriptionId, 
      accessToken: !!accessToken, 
      user: !!user,
      userRole: user?.role,
      authLoading 
    });
  }, [prescriptionId, accessToken, user, authLoading]);

  // Check if no prescription ID
  useEffect(() => {
    if (!prescriptionId) {
      setError("No prescription selected. Please select a prescription first.");
      setLoading(false);
    }
  }, [prescriptionId]);

  // Role check
  useEffect(() => {
    if (!authLoading && user && !["admin", "pharmacist"].includes(user.role)) {
      toast.error("You don't have permission to access this page");
      router.push("/unauthorized");
    }
  }, [user, authLoading, router]);

  // Fetch prescription when we have ID and access token
  useEffect(() => {
    const fetchData = async () => {
      if (!prescriptionId || !accessToken) {
        return;
      }

      if (user && !["admin", "pharmacist"].includes(user.role)) {
        return;
      }

      await fetchPrescription();
    };

    if (prescriptionId && accessToken) {
      fetchData();
    }
  }, [prescriptionId, accessToken, user]);

  const fetchPrescription = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log("Fetching prescription with ID:", prescriptionId);

      // Try pharmacy API endpoint first
      const response = await fetch(`/api/pharmacy/prescriptions/${prescriptionId}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });

      console.log("Response status:", response.status);

      if (!response.ok) {
        // Try doctor API as fallback
        const doctorResponse = await fetch(`/api/doctor/prescriptions/${prescriptionId}`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!doctorResponse.ok) {
          const errorData = await doctorResponse.json().catch(() => ({}));
          console.error("Error response:", errorData);
          throw new Error(errorData.error || `Failed to fetch prescription (${doctorResponse.status})`);
        }

        const doctorData = await doctorResponse.json();
        console.log("Success from doctor API:", doctorData);
        
        if (doctorData.success && doctorData.data) {
          setPrescription(doctorData.data);
        } else {
          throw new Error("Invalid data structure from API");
        }
      } else {
        const data = await response.json();
        console.log("Success from pharmacy API:", data);
        
        if (data.success && data.data) {
          setPrescription(data.data);
        } else {
          throw new Error("Invalid data structure from API");
        }
      }
    } catch (error: any) {
      console.error("Error fetching prescription:", error);
      setError(error.message || "Failed to load prescription. Please try again.");
      toast.error("Error loading prescription");
    } finally {
      setLoading(false);
    }
  };

  // Auto-fill medicines when prescription loads
  useEffect(() => {
    if (prescription) {
      console.log("Prescription loaded, auto-filling medicines");
      autoFillMedicines();
    }
  }, [prescription]);

  const autoFillMedicines = () => {
  if (!prescription || !prescription.medications) {
    console.error("No medications found in prescription");
    toast.error("Prescription has no medicines");
    return;
  }

  try {
    const items: DispensingItem[] = prescription.medications.map((med) => {
      // Check if medicine data is available
      if (!med.medicine || !med.medicine._id) {
        console.warn("Medicine data missing for:", med.name);
        return {
          medicineId: med.name, // Use name as fallback ID
          name: med.name,
          prescribedQuantity: med.quantity || 1,
          dispensedQuantity: 0,
          batchNumber: med.medicine?.batchNumber || "N/A",
          unitPrice: med.medicine?.sellingPrice || med.price || 0,
          totalPrice: 0,
          availableStock: med.medicine?.currentQuantity || 0,
          instructions: med.instructions || "",
        };
      }

      const medicine = med.medicine;
      const availableStock = medicine.currentQuantity || 0;
      const prescribedQty = med.quantity || 1;
      const dispensedQty = Math.min(prescribedQty, availableStock);
      const unitPrice = medicine.sellingPrice || med.price || 0;
      
      return {
        medicineId: medicine._id,
        name: med.name,
        prescribedQuantity: prescribedQty,
        dispensedQuantity: dispensedQty,
        batchNumber: medicine.batchNumber,
        unitPrice: unitPrice,
        totalPrice: dispensedQty * unitPrice,
        availableStock: availableStock,
        instructions: med.instructions || "",
      };
    });

    console.log("Auto-filled items:", items);
    setDispensingItems(items);
    
    // Set patient instructions from prescription
    if (prescription.instructions) {
      setPatientInstructions(prescription.instructions);
    }
    
    if (prescription.notes) {
      setPharmacyNotes(prescription.notes);
    }
  } catch (error) {
    console.error("Error auto-filling medicines:", error);
    toast.error("Error preparing medicines for dispensing");
  }
};

  const updateDispensedQuantity = (medicineId: string, quantity: number) => {
    setDispensingItems(items =>
      items.map(item => {
        if (item.medicineId === medicineId) {
          const dispensedQty = Math.max(0, Math.min(quantity, item.availableStock));
          return {
            ...item,
            dispensedQuantity: dispensedQty,
            totalPrice: dispensedQty * item.unitPrice,
          };
        }
        return item;
      })
    );
  };

  const calculateTotal = () => {
    return dispensingItems.reduce((sum, item) => sum + item.totalPrice, 0);
  };

  const handleDispense = async () => {
    if (!prescription || !user) {
      toast.error("Prescription or user information missing");
      return;
    }

    try {
      setDispensing(true);

      // Validation
      const totalDispensed = dispensingItems.reduce((sum, item) => sum + item.dispensedQuantity, 0);
      if (totalDispensed === 0) {
        toast.error("Please select quantities to dispense");
        setDispensing(false);
        return;
      }

      const outOfStockItems = dispensingItems.filter(
        item => item.dispensedQuantity > item.availableStock
      );

      if (outOfStockItems.length > 0) {
        toast.error("Some items exceed available stock");
        setDispensing(false);
        return;
      }

      console.log("Dispensing medicines:", dispensingItems);

      // Prepare dispense data
      const dispenseData = {
        dispensedBy: user._id,
        items: dispensingItems.map(item => ({
          medicine: item.medicineId,
          dispensedQuantity: item.dispensedQuantity,
          batchNumber: item.batchNumber,
          unitPrice: item.unitPrice,
        })),
        totalAmount: calculateTotal(),
        paymentMethod,
        pharmacyNotes,
        patientInstructions,
        dispensingStatus: "full",
      };

      console.log("Dispense data:", dispenseData);

      // Update prescription status
      const updateResponse = await fetch(`/api/pharmacy/prescriptions/${prescription._id}/dispense`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(dispenseData),
      });

      const updateResult = await updateResponse.json();
      
      if (updateResponse.ok) {
        toast.success("Medicines dispensed successfully");
        
        // Create dispensing record (optional)
        try {
          await fetch("/api/pharmacy/dispensing", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              prescription: prescription._id,
              patient: prescription.patient._id,
              items: dispensingItems,
              totalAmount: calculateTotal(),
              paymentMethod,
              notes: pharmacyNotes,
            }),
          });
        } catch (dispensingError) {
          console.error("Error creating dispensing record:", dispensingError);
        }

        // Redirect after success
        setTimeout(() => {
          router.push("/pharmacy");
        }, 1500);
      } else {
        throw new Error(updateResult.error || "Failed to dispense medicines");
      }
    } catch (error: any) {
      console.error("Dispensing failed:", error);
      toast.error(error.message || "Dispensing failed");
    } finally {
      setDispensing(false);
    }
  };

  // ========== RENDER LOGIC ==========

  // If no prescription ID
  if (!prescriptionId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">No Prescription Selected</h2>
            <p className="text-muted-foreground mb-6">
              Please go back to the pharmacy page and select a prescription to dispense.
            </p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => router.push("/pharmacy")}>
                Return to Pharmacy
              </Button>
              <Button onClick={() => router.push("/pharmacy/select-prescription")} variant="outline">
                Select Prescription
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading state
  if (loading || authLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-muted-foreground">Loading prescription details...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="border-red-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="h-8 w-8 text-red-500" />
              <div>
                <h2 className="text-xl font-semibold text-red-800">Error Loading Prescription</h2>
                <p className="text-red-700 mt-1">{error}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button onClick={() => router.push("/pharmacy")} variant="outline">
                Return to Pharmacy
              </Button>
              <Button onClick={fetchPrescription}>
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // No prescription found
  if (!prescription) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Prescription Not Found</h2>
            <p className="text-muted-foreground mb-6">
              The prescription with ID {prescriptionId} could not be found.
            </p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => router.push("/pharmacy")}>
                Return to Pharmacy
              </Button>
              <Button onClick={fetchPrescription} variant="outline">
                Retry Loading
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ========== MAIN RENDER ==========
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" onClick={() => router.push("/pharmacy")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Pharmacy
        </Button>
        <h1 className="text-3xl font-bold">Dispense Medicines</h1>
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
                <p className="font-mono font-bold mt-1">{prescription.prescriptionId}</p>
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
                    <SelectValue placeholder="Select payment method" />
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
                  AFN {calculateTotal().toFixed(2)}
                </div>
              </div>
            </CardContent>
          </Card>
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
                  {dispensingItems.filter(item => item.dispensedQuantity > 0).length} of{" "}
                  {dispensingItems.length} items
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dispensingItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4" />
                  <p>No medicines found in this prescription</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Medicine</TableHead>
                        <TableHead>Batch</TableHead>
                        <TableHead>Prescribed</TableHead>
                        <TableHead>Available</TableHead>
                        <TableHead>Dispense</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dispensingItems.map((item) => (
                        <TableRow key={item.medicineId}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{item.name}</p>
                              {item.instructions && (
                                <p className="text-xs text-muted-foreground">
                                  {item.instructions}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{item.batchNumber}</TableCell>
                          <TableCell>{item.prescribedQuantity}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {item.availableStock}
                              {item.availableStock < item.prescribedQuantity && (
                                <AlertCircle className="h-4 w-4 text-red-500" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              max={item.availableStock}
                              value={item.dispensedQuantity}
                              onChange={(e) =>
                                updateDispensedQuantity(item.medicineId, parseInt(e.target.value) || 0)
                              }
                              className="w-20"
                            />
                          </TableCell>
                          <TableCell>AFN {item.unitPrice.toFixed(2)}</TableCell>
                          <TableCell className="font-medium">
                            AFN {item.totalPrice.toFixed(2)}
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
                  placeholder="Additional instructions for the patient..."
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

          {dispensingItems.length > 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Review the quantities before dispensing. Ensure all information is correct.
              </AlertDescription>
            </Alert>
          )}

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
              disabled={dispensing || calculateTotal() === 0 || dispensingItems.length === 0}
            >
              {dispensing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Dispense Medicines
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}