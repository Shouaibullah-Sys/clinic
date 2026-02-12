// app/warehouse/batches/page.tsx
"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Search,
  AlertCircle,
  Package,
  Calendar,
  DollarSign,
} from "lucide-react";
import { format } from "date-fns";

interface WarehouseMedicine {
  _id: string;
  name: string;
  genericName?: string;
}

interface WarehouseBatch {
  _id: string;
  batchId: string;
  batchNumber: string;
  lotNumber: string;
  form: string;
  dosage: string;
  frequency: string;
  route: string;
  expiryDate: string;
  quantity: number;
  originalQuantity: number;
  unitCost: number;
  supplier: string;
  location?: string;
  status: string;
  warehouse: WarehouseMedicine;
  createdAt: string;
}

const FORMS = [
  "Tablet",
  "Capsule",
  "Syrup",
  "Injection",
  "Ointment",
  "Cream",
  "Drops",
  "Inhaler",
  "Patch",
  "Other",
];
const ROUTES = [
  "Oral",
  "IV",
  "IM",
  "SC",
  "Topical",
  "Inhalation",
  "Ophthalmic",
  "Otic",
  "Nasal",
  "Rectal",
  "Other",
];

export default function WarehouseBatchesPage() {
  const router = useRouter();
  const { user, accessToken } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [batches, setBatches] = useState<WarehouseBatch[]>([]);
  const [warehouseMedicines, setWarehouseMedicines] = useState<
    WarehouseMedicine[]
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  // Form states
  const [batchForm, setBatchForm] = useState({
    warehouse: "",
    batchNumber: "",
    lotNumber: "",
    form: "",
    dosage: "",
    frequency: "",
    route: "",
    expiryDate: "",
    quantity: "",
    unitCost: "",
    supplier: "",
    location: "",
  });

  // Check if user has access
  useEffect(() => {
    if (user && !["admin", "pharmacist"].includes(user.role)) {
      router.push("/unauthorized");
    }
  }, [user, router]);

  // Fetch batches
  const fetchBatches = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/warehouse/batches?search=${searchQuery}`,
        {
          headers: {
            "Content-Type": "application/json",
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
        },
      );

      const data = await response.json();

      if (data.success) {
        setBatches(data.data || []);
      } else {
        setError(data.error || "Failed to fetch batches");
        setBatches([]);
      }
    } catch (error) {
      console.error("Error fetching batches:", error);
      setError("Failed to fetch batches");
      setBatches([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch warehouse medicines for dropdown
  const fetchWarehouseMedicines = async () => {
    try {
      const response = await fetch("/api/warehouse", {
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
      });

      const data = await response.json();

      if (data.success) {
        setWarehouseMedicines(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching warehouse medicines:", error);
    }
  };

  useEffect(() => {
    if (user && ["admin", "pharmacist"].includes(user.role) && accessToken) {
      fetchBatches();
      fetchWarehouseMedicines();
    }
  }, [user, accessToken, searchQuery]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/warehouse/batches", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify(batchForm),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess("Batch added successfully!");
        fetchBatches();
        setAddDialogOpen(false);
        resetForm();
      } else {
        setError(data.error || "Failed to add batch");
      }
    } catch (error) {
      console.error("Error saving batch:", error);
      setError("Failed to save batch. Please try again.");
    }
  };

  // Reset form
  const resetForm = () => {
    setBatchForm({
      warehouse: "",
      batchNumber: "",
      lotNumber: "",
      form: "",
      dosage: "",
      frequency: "",
      route: "",
      expiryDate: "",
      quantity: "",
      unitCost: "",
      supplier: "",
      location: "",
    });
  };

  // Get status badge - Using shadcn theme colors
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "available":
        return <Badge variant="default">Available</Badge>;
      case "partial":
        return <Badge variant="secondary">Partial</Badge>;
      case "depleted":
        return <Badge variant="outline">Depleted</Badge>;
      case "expired":
        return <Badge variant="destructive">Expired</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (!user || !["admin", "pharmacist"].includes(user.role)) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Unauthorized Access</h2>
          <p className="text-muted-foreground">
            You don't have permission to access this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Warehouse Batches
          </h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">
            Manage medicine batches with expiry dates and quantities
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Batch
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-primary/20 bg-primary/10">
          <AlertCircle className="h-4 w-4 text-primary" />
          <AlertDescription className="text-foreground">
            {success}
          </AlertDescription>
        </Alert>
      )}

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search batches by batch number, lot number, or supplier..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Batches Table - Desktop */}
      <Card className="hidden md:block">
        <CardHeader className="px-6">
          <CardTitle>Batch Inventory</CardTitle>
          <CardDescription>
            {batches.length} batch(es) in warehouse
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : batches.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No batches found</h3>
              <p className="text-muted-foreground text-sm">
                {searchQuery
                  ? "Try adjusting your search terms"
                  : "No batches have been added yet."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">
                      Batch ID
                    </TableHead>
                    <TableHead className="whitespace-nowrap">
                      Medicine
                    </TableHead>
                    <TableHead className="whitespace-nowrap">
                      Batch/Lot
                    </TableHead>
                    <TableHead className="whitespace-nowrap">
                      Form/Dosage
                    </TableHead>
                    <TableHead className="whitespace-nowrap">
                      Quantity
                    </TableHead>
                    <TableHead className="whitespace-nowrap">
                      Expiry Date
                    </TableHead>
                    <TableHead className="whitespace-nowrap">Cost</TableHead>
                    <TableHead className="whitespace-nowrap">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batches.map((batch) => {
                    const remainingPercentage =
                      (batch.quantity / batch.originalQuantity) * 100;
                    return (
                      <TableRow key={batch._id}>
                        <TableCell className="font-mono text-sm whitespace-nowrap">
                          {batch.batchId}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            {batch.warehouse.name}
                          </div>
                          {batch.warehouse.genericName && (
                            <div className="text-xs text-muted-foreground">
                              {batch.warehouse.genericName}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{batch.batchNumber}</div>
                            <div className="text-xs text-muted-foreground">
                              {batch.lotNumber}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{batch.form}</div>
                            <div className="text-xs text-muted-foreground">
                              {batch.dosage}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1 min-w-30">
                            <Progress
                              value={remainingPercentage}
                              className="h-2"
                            />
                            <div className="text-xs text-muted-foreground">
                              {batch.quantity} / {batch.originalQuantity}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center text-sm whitespace-nowrap">
                            <Calendar className="h-3 w-3 mr-1 text-muted-foreground" />
                            {format(new Date(batch.expiryDate), "MMM d, yyyy")}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center text-sm whitespace-nowrap">
                            <DollarSign className="h-3 w-3 mr-1 text-muted-foreground" />
                            {batch.unitCost.toFixed(2)}
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(batch.status)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Batches Cards - Mobile */}
      <div className="md:hidden space-y-4">
        {loading ? (
          <Card>
            <CardContent className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </CardContent>
          </Card>
        ) : batches.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No batches found</h3>
              <p className="text-muted-foreground text-sm">
                {searchQuery
                  ? "Try adjusting your search terms"
                  : "No batches have been added yet."}
              </p>
            </CardContent>
          </Card>
        ) : (
          batches.map((batch) => {
            const remainingPercentage =
              (batch.quantity / batch.originalQuantity) * 100;
            return (
              <Card key={batch._id}>
                <CardContent className="p-4">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm">
                          {batch.batchId}
                        </span>
                      </div>
                      <h3 className="font-semibold text-base mt-1">
                        {batch.warehouse.name}
                      </h3>
                      {batch.warehouse.genericName && (
                        <p className="text-xs text-muted-foreground">
                          {batch.warehouse.genericName}
                        </p>
                      )}
                    </div>
                    <div>{getStatusBadge(batch.status)}</div>
                  </div>

                  {/* Batch Details */}
                  <div className="bg-muted/30 rounded-lg p-3 mb-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Batch Number
                        </p>
                        <p className="text-sm font-medium">
                          {batch.batchNumber}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Lot Number
                        </p>
                        <p className="text-sm font-medium">{batch.lotNumber}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Form</p>
                        <p className="text-sm font-medium">{batch.form}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Dosage</p>
                        <p className="text-sm font-medium">{batch.dosage}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Route</p>
                        <p className="text-sm font-medium">{batch.route}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Frequency
                        </p>
                        <p className="text-sm font-medium">{batch.frequency}</p>
                      </div>
                    </div>
                  </div>

                  {/* Quantity & Expiry */}
                  <div className="space-y-3 mb-3">
                    <div>
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>Quantity</span>
                        <span>
                          {batch.quantity} / {batch.originalQuantity}
                        </span>
                      </div>
                      <Progress value={remainingPercentage} className="h-2" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Expiry Date
                        </p>
                        <div className="flex items-center text-sm">
                          <Calendar className="h-3 w-3 mr-1 text-muted-foreground" />
                          {format(new Date(batch.expiryDate), "MMM d, yyyy")}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Unit Cost
                        </p>
                        <div className="flex items-center text-sm">
                          <DollarSign className="h-3 w-3 mr-1 text-muted-foreground" />
                          {batch.unitCost.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Supplier & Location */}
                  <div className="grid grid-cols-2 gap-3 text-sm border-t pt-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Supplier</p>
                      <p className="font-medium">{batch.supplier}</p>
                    </div>
                    {batch.location && (
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Location
                        </p>
                        <p className="font-medium">{batch.location}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Add Batch Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Batch</DialogTitle>
            <DialogDescription>
              Add a new batch to warehouse inventory
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="warehouse">Medicine *</Label>
                <Select
                  value={batchForm.warehouse}
                  onValueChange={(value) =>
                    setBatchForm({ ...batchForm, warehouse: value })
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select medicine" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouseMedicines.map((med) => (
                      <SelectItem key={med._id} value={med._id}>
                        {med.name} {med.genericName && `(${med.genericName})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="batchNumber">Batch Number *</Label>
                  <Input
                    id="batchNumber"
                    value={batchForm.batchNumber}
                    onChange={(e) =>
                      setBatchForm({
                        ...batchForm,
                        batchNumber: e.target.value,
                      })
                    }
                    placeholder="e.g., BATCH-2024-001"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lotNumber">Lot Number *</Label>
                  <Input
                    id="lotNumber"
                    value={batchForm.lotNumber}
                    onChange={(e) =>
                      setBatchForm({ ...batchForm, lotNumber: e.target.value })
                    }
                    placeholder="e.g., LOT-2024-001"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="form">Form *</Label>
                  <Select
                    value={batchForm.form}
                    onValueChange={(value) =>
                      setBatchForm({ ...batchForm, form: value })
                    }
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select form" />
                    </SelectTrigger>
                    <SelectContent>
                      {FORMS.map((form) => (
                        <SelectItem key={form} value={form}>
                          {form}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dosage">Dosage *</Label>
                  <Input
                    id="dosage"
                    value={batchForm.dosage}
                    onChange={(e) =>
                      setBatchForm({ ...batchForm, dosage: e.target.value })
                    }
                    placeholder="e.g., 500mg"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="route">Route *</Label>
                  <Select
                    value={batchForm.route}
                    onValueChange={(value) =>
                      setBatchForm({ ...batchForm, route: value })
                    }
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select route" />
                    </SelectTrigger>
                    <SelectContent>
                      {ROUTES.map((route) => (
                        <SelectItem key={route} value={route}>
                          {route}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="frequency">Frequency *</Label>
                <Input
                  id="frequency"
                  value={batchForm.frequency}
                  onChange={(e) =>
                    setBatchForm({ ...batchForm, frequency: e.target.value })
                  }
                  placeholder="e.g., 3 times daily"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="expiryDate">Expiry Date *</Label>
                  <Input
                    id="expiryDate"
                    type="date"
                    value={batchForm.expiryDate}
                    onChange={(e) =>
                      setBatchForm({ ...batchForm, expiryDate: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supplier">Supplier *</Label>
                  <Input
                    id="supplier"
                    value={batchForm.supplier}
                    onChange={(e) =>
                      setBatchForm({ ...batchForm, supplier: e.target.value })
                    }
                    placeholder="e.g., MedSupply Inc"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    value={batchForm.quantity}
                    onChange={(e) =>
                      setBatchForm({ ...batchForm, quantity: e.target.value })
                    }
                    placeholder="e.g., 1000"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unitCost">Unit Cost ($) *</Label>
                  <Input
                    id="unitCost"
                    type="number"
                    step="0.01"
                    min="0"
                    value={batchForm.unitCost}
                    onChange={(e) =>
                      setBatchForm({ ...batchForm, unitCost: e.target.value })
                    }
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location (Optional)</Label>
                <Input
                  id="location"
                  value={batchForm.location}
                  onChange={(e) =>
                    setBatchForm({ ...batchForm, location: e.target.value })
                  }
                  placeholder="e.g., Shelf A-1"
                />
              </div>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddDialogOpen(false)}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button type="submit" className="w-full sm:w-auto">
                Add Batch
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
