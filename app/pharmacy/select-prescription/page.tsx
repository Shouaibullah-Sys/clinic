// app/pharmacy/select-prescription/page.tsx - UPDATED
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Search,
  Pill,
  User,
  Calendar,
  AlertCircle,
  Loader2,
  FileText,
} from "lucide-react";
import { format } from "date-fns";

// Update interface to match your Prescription model
interface PrescriptionItem {
  medicine?: {
    _id: string;
    name: string;
    currentQuantity: number;
  };
  name: string;
  quantity: number;
  dosage: string;
  frequency: string;
  duration: string;
}

interface Prescription {
  _id: string;
  prescriptionId: string;
  patient: {
    _id: string;
    name: string;
    patientId: string;
    phone?: string;
  };
  doctor: {
    _id: string;
    name: string;
    specialization?: string;
  };
  medications: PrescriptionItem[];
  prescribedDate: string;
  expiryDate?: string;
  status: "active" | "completed" | "cancelled" | "expired";
  dispensingStatus: "pending" | "partial" | "full" | "cancelled";
  notes?: string;
  instructions?: string;
}

export default function SelectPrescriptionPage() {
  const router = useRouter();
  const { user, accessToken, isLoading: authLoading } = useAuthStore();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Role check
  useEffect(() => {
    if (!authLoading && user && !["admin", "pharmacist"].includes(user.role)) {
      router.push("/unauthorized");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && ["admin", "pharmacist"].includes(user.role) && accessToken) {
      fetchPrescriptions();
    }
  }, [user, accessToken]);

  const fetchPrescriptions = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch pending prescriptions from pharmacy API
      const response = await fetch(
        "/api/pharmacy/pending-prescriptions?status=pending&limit=50",
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch prescriptions: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        console.log("Fetched prescriptions:", data.data);
        setPrescriptions(data.data || []);
      } else {
        setError(data.error || "Failed to fetch prescriptions");
        setPrescriptions([]);
      }
    } catch (error: any) {
      console.error("Error fetching prescriptions:", error);
      setError(error.message || "Failed to connect to server");
      setPrescriptions([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredPrescriptions = prescriptions.filter((prescription) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      prescription.prescriptionId?.toLowerCase().includes(searchLower) ||
      prescription.patient?.name?.toLowerCase().includes(searchLower) ||
      prescription.patient?.patientId?.toLowerCase().includes(searchLower) ||
      prescription.doctor?.name?.toLowerCase().includes(searchLower)
    );
  });

  const handleSelectPrescription = (prescriptionId: string) => {
    router.push(`/pharmacy/dispense?prescriptionId=${prescriptionId}`);
  };

  const getDispensingStatusBadge = (status: string) => {
    const variants = {
      pending: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
      partial: "bg-blue-100 text-blue-800 hover:bg-blue-100",
      full: "bg-green-100 text-green-800 hover:bg-green-100",
      cancelled: "bg-red-100 text-red-800 hover:bg-red-100",
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

  const getStatusBadge = (status: string) => {
    const variants = {
      active: "bg-green-100 text-green-800 hover:bg-green-100",
      completed: "bg-blue-100 text-blue-800 hover:bg-blue-100",
      cancelled: "bg-red-100 text-red-800 hover:bg-red-100",
      expired: "bg-gray-100 text-gray-800 hover:bg-gray-100",
    };
    return (
      <Badge
        variant="outline"
        className={variants[status as keyof typeof variants] || "bg-gray-100"}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  // Calculate total quantity of medicines
  const calculateTotalMedicines = (medications: PrescriptionItem[]) => {
    return medications.reduce((total, med) => total + (med.quantity || 0), 0);
  };

  // Get medicine names (first 2)
  const getMedicineNames = (medications: PrescriptionItem[]) => {
    const names = medications.slice(0, 2).map((m) => m.name);
    if (medications.length > 2) {
      return `${names.join(", ")} +${medications.length - 2} more`;
    }
    return names.join(", ");
  };

  // Check if prescription is expired
  const isExpired = (expiryDate?: string) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  };

  if (authLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user || !["admin", "pharmacist"].includes(user.role)) {
    return null; // Already redirected by useEffect
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              Select Prescription to Dispense
            </h1>
            <p className="text-muted-foreground">
              Choose a prescription from the list below to begin dispensing
              medicines
            </p>
          </div>
          <Button onClick={() => router.push("/pharmacy")} variant="outline">
            Back to Pharmacy
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Pending Prescriptions
                <Badge variant="secondary" className="ml-2">
                  {filteredPrescriptions.length}
                </Badge>
              </CardTitle>
              <CardDescription>
                Prescriptions waiting to be dispensed. Select one to begin.
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by patient or doctor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button
                onClick={fetchPrescriptions}
                variant="outline"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Refresh"
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-12 w-12 animate-spin text-blue-600 mb-4" />
              <p className="text-muted-foreground">Loading prescriptions...</p>
            </div>
          ) : filteredPrescriptions.length === 0 ? (
            <div className="text-center py-12">
              <Pill className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">
                No Pending Prescriptions
              </h3>
              <p className="text-muted-foreground mb-6">
                {prescriptions.length === 0
                  ? "There are no pending prescriptions to dispense."
                  : "No prescriptions match your search criteria."}
              </p>
              <div className="flex gap-3 justify-center">
                <Button onClick={fetchPrescriptions}>Refresh List</Button>
                {searchTerm && (
                  <Button onClick={() => setSearchTerm("")} variant="outline">
                    Clear Search
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[140px]">
                        Prescription ID
                      </TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead>Doctor</TableHead>
                      <TableHead>Medicines</TableHead>
                      <TableHead className="w-[120px]">Date</TableHead>
                      <TableHead className="w-[100px]">Status</TableHead>
                      <TableHead className="w-[120px] text-right">
                        Action
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPrescriptions.map((prescription) => {
                      const isPrescriptionExpired = isExpired(
                        prescription.expiryDate,
                      );

                      return (
                        <TableRow
                          key={prescription._id}
                          className={`hover: bg-dark:background ${isPrescriptionExpired ? "opacity-70" : ""}`}
                        >
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-mono font-bold text-sm">
                                {prescription.prescriptionId}
                              </span>
                              {isPrescriptionExpired && (
                                <Badge
                                  variant="destructive"
                                  className="mt-1 text-xs"
                                >
                                  Expired
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {prescription.patient?.name || "Unknown"}
                              </span>
                              {prescription.patient?.patientId && (
                                <span className="text-xs text-muted-foreground">
                                  ID: {prescription.patient.patientId}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <div className="min-w-0">
                                <span className="truncate block">
                                  Dr. {prescription.doctor?.name || "Unknown"}
                                </span>
                                {prescription.doctor?.specialization && (
                                  <span className="text-xs text-muted-foreground truncate block">
                                    {prescription.doctor.specialization}
                                  </span>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col space-y-1">
                              <Badge variant="outline" className="w-fit">
                                {prescription.medications?.length || 0} items
                                <span className="ml-1 text-xs">
                                  (
                                  {calculateTotalMedicines(
                                    prescription.medications || [],
                                  )}{" "}
                                  total)
                                </span>
                              </Badge>
                              {prescription.medications &&
                                prescription.medications.length > 0 && (
                                  <p
                                    className="text-xs text-muted-foreground truncate"
                                    title={getMedicineNames(
                                      prescription.medications,
                                    )}
                                  >
                                    {getMedicineNames(prescription.medications)}
                                  </p>
                                )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                <span className="text-sm">
                                  {format(
                                    new Date(prescription.prescribedDate),
                                    "MMM d, yyyy",
                                  )}
                                </span>
                              </div>
                              {prescription.expiryDate && (
                                <span className="text-xs text-muted-foreground mt-1">
                                  Expires:{" "}
                                  {format(
                                    new Date(prescription.expiryDate),
                                    "MMM d",
                                  )}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              {getStatusBadge(prescription.status)}
                              {getDispensingStatusBadge(
                                prescription.dispensingStatus,
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              onClick={() =>
                                handleSelectPrescription(prescription._id)
                              }
                              disabled={
                                isPrescriptionExpired ||
                                prescription.status === "cancelled"
                              }
                              title={
                                isPrescriptionExpired
                                  ? "Prescription expired"
                                  : prescription.status === "cancelled"
                                    ? "Prescription cancelled"
                                    : "Dispense medicines"
                              }
                            >
                              {isPrescriptionExpired ? "Expired" : "Dispense"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
                <div className="text-sm text-muted-foreground">
                  Showing {filteredPrescriptions.length} of{" "}
                  {prescriptions.length} prescriptions
                  {searchTerm && ` matching "${searchTerm}"`}
                </div>
                <div className="flex items-center gap-3">
                  {searchTerm && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSearchTerm("")}
                    >
                      Clear Search
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => router.push("/pharmacy")}
                  >
                    Back to Pharmacy
                  </Button>
                  <Button onClick={fetchPrescriptions} disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Refreshing...
                      </>
                    ) : (
                      "Refresh List"
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Stats Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Pending
                </p>
                <p className="text-2xl font-bold">{prescriptions.length}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Active Today
                </p>
                <p className="text-2xl font-bold">
                  {
                    prescriptions.filter(
                      (p) =>
                        new Date(p.prescribedDate).toDateString() ===
                        new Date().toDateString(),
                    ).length
                  }
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Medicines
                </p>
                <p className="text-2xl font-bold">
                  {prescriptions.reduce(
                    (total, p) =>
                      total + calculateTotalMedicines(p.medications || []),
                    0,
                  )}
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                <Pill className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
