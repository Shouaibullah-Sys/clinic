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
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [batchForm, setBatchForm] = useState({
    warehouse: "",
    batchNumber: "",
    lotNumber: "",
    form: "",
    dosage: "",
    expiryDate: "",
    quantity: "",
    unitCost: "",
    supplier: "",
    location: "",
  });

  useEffect(() => {
    if (user && !["admin", "pharmacist"].includes(user.role)) {
      router.push("/unauthorized");
    }
  }, [user, router]);

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
        setBatchForm({
          warehouse: "",
          batchNumber: "",
          lotNumber: "",
          form: "",
          dosage: "",
          expiryDate: "",
          quantity: "",
          unitCost: "",
          supplier: "",
          location: "",
        });
      } else {
        setError(data.error || "Failed to add batch");
      }
    } catch (error) {
      console.error("Error saving batch:", error);
      setError("Failed to save batch. Please try again.");
    }
  };

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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Warehouse Batches
          </h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">
            Manage medicine batches with expiry dates and quantities
          </p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Batch
        </Button>
      </div>
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
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search batches..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>
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
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Batch ID</TableHead>
                  <TableHead>Medicine</TableHead>
                  <TableHead>Batch/Lot</TableHead>
                  <TableHead>Form/Dosage</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batches.map((batch) => {
                  const pct = (batch.quantity / batch.originalQuantity) * 100;
                  return (
                    <TableRow key={batch._id}>
                      <TableCell className="font-mono">
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
                        <div>{batch.batchNumber}</div>
                        <div className="text-xs text-muted-foreground">
                          {batch.lotNumber}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>{batch.form}</div>
                        <div className="text-xs text-muted-foreground">
                          {batch.dosage}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Progress value={pct} className="h-2" />
                        <div className="text-xs text-muted-foreground">
                          {batch.quantity} / {batch.originalQuantity}
                        </div>
                      </TableCell>
                      <TableCell>
                        {format(new Date(batch.expiryDate), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>{batch.unitCost.toFixed(2)}</TableCell>
                      <TableCell>{getStatusBadge(batch.status)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Batch</DialogTitle>
            <DialogDescription>
              Add a new batch to warehouse inventory
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Medicine *</Label>
              <Select
                value={batchForm.warehouse}
                onValueChange={(v) =>
                  setBatchForm({ ...batchForm, warehouse: v })
                }
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select medicine" />
                </SelectTrigger>
                <SelectContent>
                  {warehouseMedicines.map((med) => (
                    <SelectItem key={med._id} value={med._id}>
                      {med.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Batch Number *</Label>
                <Input
                  value={batchForm.batchNumber}
                  onChange={(e) =>
                    setBatchForm({ ...batchForm, batchNumber: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Lot Number *</Label>
                <Input
                  value={batchForm.lotNumber}
                  onChange={(e) =>
                    setBatchForm({ ...batchForm, lotNumber: e.target.value })
                  }
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Form *</Label>
                <Select
                  value={batchForm.form}
                  onValueChange={(v) => setBatchForm({ ...batchForm, form: v })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select form" />
                  </SelectTrigger>
                  <SelectContent>
                    {FORMS.map((f) => (
                      <SelectItem key={f} value={f}>
                        {f}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Dosage *</Label>
                <Input
                  value={batchForm.dosage}
                  onChange={(e) =>
                    setBatchForm({ ...batchForm, dosage: e.target.value })
                  }
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Expiry Date *</Label>
                <Input
                  type="date"
                  value={batchForm.expiryDate}
                  onChange={(e) =>
                    setBatchForm({ ...batchForm, expiryDate: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Supplier *</Label>
                <Input
                  value={batchForm.supplier}
                  onChange={(e) =>
                    setBatchForm({ ...batchForm, supplier: e.target.value })
                  }
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Quantity *</Label>
                <Input
                  type="number"
                  value={batchForm.quantity}
                  onChange={(e) =>
                    setBatchForm({ ...batchForm, quantity: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Unit Cost ($) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={batchForm.unitCost}
                  onChange={(e) =>
                    setBatchForm({ ...batchForm, unitCost: e.target.value })
                  }
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Location (Optional)</Label>
              <Input
                value={batchForm.location}
                onChange={(e) =>
                  setBatchForm({ ...batchForm, location: e.target.value })
                }
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Add Batch</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
