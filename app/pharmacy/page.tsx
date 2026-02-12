// app/pharmacy/page.tsx - UPDATED
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  Search,
  Eye,
  Package,
  AlertCircle,
  Calendar,
  User,
  Pill,
  FileText,
  PlusCircle,
  ClipboardList,
} from "lucide-react";
import { format } from "date-fns";

interface Prescription {
  _id: string;
  prescriptionId: string;
  patient: {
    name: string;
    patientId: string;
    phone: string;
  };
  doctor: {
    name: string;
    specialization: string;
  };
  medications: Array<{
    name: string;
    quantity: number;
  }>;
  diagnosis: string;
  prescribedDate: string;
  status: string;
  dispensingStatus: "pending" | "partial" | "full" | "cancelled";
}

interface DischargeCard {
  _id: string;
  dischargeId: string;
  patient: {
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
  preOpMedicines: Array<{
    name: string;
    quantity: number;
    totalPrice: number;
    dispensed?: boolean;
  }>;
  postOpMedicines: Array<{
    name: string;
    quantity: number;
    totalPrice: number;
    dispensed?: boolean;
  }>;
  dischargeMedicines: Array<{
    name: string;
    quantity: number;
    totalPrice: number;
    dispensed?: boolean;
  }>;
  preOpTotal: number;
  postOpTotal: number;
  dischargeTotal: number;
  totalMedicineCost: number;
  totalMedicines: number;
  totalDispensed: number;
  remainingMedicines: number;
  pharmacyDispensingStatus: "pending" | "partial" | "full";
  createdAt: string;
}

export default function PharmacyPage() {
  const router = useRouter();
  const { user, accessToken } = useAuthStore();
  const [activeTab, setActiveTab] = useState("prescriptions");
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [dischargeCards, setDischargeCards] = useState<DischargeCard[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dischargeCardsLoading, setDischargeCardsLoading] = useState(false);
  const [dischargeCardsError, setDischargeCardsError] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (user && ["admin", "pharmacist"].includes(user.role) && accessToken) {
      fetchPendingPrescriptions();
    }
  }, [user, accessToken]);

  // Fetch discharge cards when tab is changed to discharge-cards
  useEffect(() => {
    if (
      activeTab === "discharge-cards" &&
      user &&
      ["admin", "pharmacist"].includes(user.role) &&
      accessToken
    ) {
      fetchPendingDischargeCards();
    }
  }, [activeTab, user, accessToken]);

  useEffect(() => {
    // Check if user has pharmacy access
    if (user && !["admin", "pharmacist"].includes(user.role)) {
      router.push("/unauthorized");
    }
  }, [user, router]);

  const fetchPendingPrescriptions = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(
        `/api/pharmacy/pending-prescriptions?status=pending&limit=50`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      const data = await response.json();

      if (data.success) {
        setPrescriptions(data.data || []);
      } else {
        setError(data.error || "Failed to fetch prescriptions");
        setPrescriptions([]);
      }
    } catch (error) {
      console.error("Error fetching prescriptions:", error);
      setError("Failed to fetch prescriptions");
      setPrescriptions([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredPrescriptions = prescriptions.filter((prescription) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      prescription.prescriptionId.toLowerCase().includes(searchLower) ||
      prescription.patient.name.toLowerCase().includes(searchLower) ||
      prescription.patient.patientId.toLowerCase().includes(searchLower) ||
      prescription.doctor.name.toLowerCase().includes(searchLower)
    );
  });

  const handleDispensePrescription = (prescriptionId: string) => {
    router.push(`/pharmacy/dispense?prescriptionId=${prescriptionId}`);
  };

  const handleDispenseDischargeCard = (cardId: string) => {
    router.push(`/pharmacy/dispense-discharge/${cardId}`);
  };

  const fetchPendingDischargeCards = async () => {
    try {
      setDischargeCardsLoading(true);
      setDischargeCardsError(null);
      const response = await fetch(`/api/pharmacy/pending-discharge-cards`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setDischargeCards(data.data || []);
      } else {
        setDischargeCardsError(data.error || "Failed to fetch discharge cards");
        setDischargeCards([]);
      }
    } catch (error) {
      console.error("Error fetching discharge cards:", error);
      setDischargeCardsError("Failed to fetch discharge cards");
      setDischargeCards([]);
    } finally {
      setDischargeCardsLoading(false);
    }
  };

  const filteredDischargeCards = dischargeCards.filter((card) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      card.dischargeId.toLowerCase().includes(searchLower) ||
      card.patient.name.toLowerCase().includes(searchLower) ||
      card.patient.patientId.toLowerCase().includes(searchLower) ||
      card.doctor.name.toLowerCase().includes(searchLower) ||
      card.operationName.toLowerCase().includes(searchLower)
    );
  });

  const getDispensingStatusBadge = (status: string) => {
    const variants = {
      pending: "bg-yellow-100 text-yellow-800",
      partial: "bg-blue-100 text-blue-800",
      full: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
    };
    return (
      <Badge
        variant="outline"
        className={variants[status as keyof typeof variants]}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (!user || !["admin", "pharmacist"].includes(user.role)) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Unauthorized Access</h2>
          <p className="text-gray-600">
            You don't have permission to access this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Pharmacy Management</h1>
          <p className="text-gray-500 mt-1">
            Manage prescriptions, inventory, and dispensing
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => router.push("/pharmacy/issue")}
            variant="secondary"
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Direct Sale
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push("/pharmacy/stock")}
          >
            <Package className="mr-2 h-4 w-4" />
            Manage Stock
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger
            value="prescriptions"
            className="flex items-center gap-2"
          >
            <FileText className="h-4 w-4" />
            Prescriptions
          </TabsTrigger>
          <TabsTrigger
            value="discharge-cards"
            className="flex items-center gap-2"
          >
            <ClipboardList className="h-4 w-4" />
            Discharge Cards
          </TabsTrigger>
          <TabsTrigger value="inventory" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Inventory
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            History
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="prescriptions" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Pill className="h-5 w-5" />
                    Pending Prescriptions
                  </CardTitle>
                  <CardDescription>
                    Select a prescription to dispense medicines to patients
                  </CardDescription>
                </div>
                <div className="relative w-full md:w-64">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by patient, ID, or doctor..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : filteredPrescriptions.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    No Pending Prescriptions
                  </h3>
                  <p className="text-gray-500 mb-6">
                    All prescriptions have been processed.
                  </p>
                  <Button variant="outline" onClick={fetchPendingPrescriptions}>
                    Refresh
                  </Button>
                </div>
              ) : (
                <>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Prescription ID</TableHead>
                          <TableHead>Patient</TableHead>
                          <TableHead>Doctor</TableHead>
                          <TableHead>Medicines</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPrescriptions.map((prescription) => (
                          <TableRow key={prescription._id}>
                            <TableCell className="font-mono font-bold">
                              {prescription.prescriptionId}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {prescription.patient.name}
                                </span>
                                <span className="text-sm text-muted-foreground">
                                  ID: {prescription.patient.patientId}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span>Dr. {prescription.doctor.name}</span>
                                <span className="text-sm text-muted-foreground">
                                  {prescription.doctor.specialization}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {prescription.medications.length} items
                                </span>
                                <span className="text-sm text-muted-foreground">
                                  {prescription.medications
                                    .map((m) => m.name)
                                    .join(", ")}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {format(
                                new Date(prescription.prescribedDate),
                                "MMM d, yyyy",
                              )}
                            </TableCell>
                            <TableCell>
                              {getDispensingStatusBadge(
                                prescription.dispensingStatus,
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                onClick={() =>
                                  handleDispensePrescription(prescription._id)
                                }
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                Dispense
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-muted-foreground">
                      Showing {filteredPrescriptions.length} of{" "}
                      {prescriptions.length} prescriptions
                    </div>
                    <Button
                      variant="outline"
                      onClick={fetchPendingPrescriptions}
                      disabled={loading}
                    >
                      Refresh List
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Discharge Cards Tab */}
        <TabsContent value="discharge-cards" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardList className="h-5 w-5" />
                    Pending Discharge Cards
                  </CardTitle>
                  <CardDescription>
                    Select a discharge card to dispense medicines to patients
                  </CardDescription>
                </div>
                <div className="relative w-full md:w-64">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by patient, ID, or operation..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {dischargeCardsError && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{dischargeCardsError}</AlertDescription>
                </Alert>
              )}

              {dischargeCardsLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : filteredDischargeCards.length === 0 ? (
                <div className="text-center py-8">
                  <ClipboardList className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    No Pending Discharge Cards
                  </h3>
                  <p className="text-gray-500 mb-6">
                    All discharge card medicines have been processed.
                  </p>
                  <Button
                    variant="outline"
                    onClick={fetchPendingDischargeCards}
                  >
                    Refresh
                  </Button>
                </div>
              ) : (
                <>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Discharge ID</TableHead>
                          <TableHead>Patient</TableHead>
                          <TableHead>Operation</TableHead>
                          <TableHead>Medicines</TableHead>
                          <TableHead>Total Cost</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredDischargeCards.map((card) => (
                          <TableRow key={card._id}>
                            <TableCell className="font-mono font-bold">
                              {card.dischargeId}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {card.patient.name}
                                </span>
                                <span className="text-sm text-muted-foreground">
                                  ID: {card.patient.patientId}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {card.operationName}
                                </span>
                                <span className="text-sm text-muted-foreground">
                                  Dr. {card.doctor.name}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {card.totalMedicines} items
                                </span>
                                <span className="text-sm text-muted-foreground">
                                  {card.remainingMedicines} remaining
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">
                                ${card.totalMedicineCost.toFixed(2)}
                              </div>
                            </TableCell>
                            <TableCell>
                              {getDispensingStatusBadge(
                                card.pharmacyDispensingStatus,
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                onClick={() =>
                                  handleDispenseDischargeCard(card._id)
                                }
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                Dispense
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-muted-foreground">
                      Showing {filteredDischargeCards.length} of{" "}
                      {dischargeCards.length} discharge cards
                    </div>
                    <Button
                      variant="outline"
                      onClick={fetchPendingDischargeCards}
                      disabled={dischargeCardsLoading}
                    >
                      Refresh List
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory">
          <Card>
            <CardHeader>
              <CardTitle>Medicine Inventory</CardTitle>
              <CardDescription>
                Manage your pharmacy stock and inventory
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  Inventory Management
                </h3>
                <p className="text-gray-500 mb-6">
                  Manage your medicine stock, add new items, and track inventory
                  levels.
                </p>
                <Button
                  variant="secondary"
                  onClick={() => router.push("/pharmacy/stock")}
                >
                  Go to Stock Management
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Dispensing History</CardTitle>
              <CardDescription>
                View history of all dispensed medicines
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Dispensing History</h3>
                <p className="text-gray-500 mb-6">
                  View the complete history of all dispensed prescriptions and
                  medicines.
                </p>
                <Button
                  variant="secondary"
                  onClick={() => router.push("/pharmacy/history")}
                >
                  View History
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <CardTitle>Pharmacy Reports</CardTitle>
              <CardDescription>Generate reports and analytics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  Reports & Analytics
                </h3>
                <p className="text-gray-500 mb-6">
                  Generate reports for sales, inventory, and dispensing
                  activities.
                </p>
                <Button
                  variant="secondary"
                  onClick={() => router.push("/pharmacy/reports")}
                >
                  Generate Reports
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
