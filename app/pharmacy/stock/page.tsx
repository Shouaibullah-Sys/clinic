// app/pharmacy/stock/page.tsx

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
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Edit,
  Trash2,
  Download,
  Printer,
  Package,
  AlertCircle,
  Calendar,
  DollarSign,
  BarChart3,
  TrendingDown,
} from "lucide-react";
import { format } from "date-fns";

interface MedicineStock {
  _id: string;
  name: string;
  form: string;
  dosage: string;
  currentQuantity: number;
  originalQuantity: number;
  expiryDate: string;
  supplier: string;
  sellingPrice: number;
  unitPrice: number;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export default function PharmacyStockPage() {
  const router = useRouter();
  const { user, accessToken } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [medicines, setMedicines] = useState<MedicineStock[]>([]);
  const [selectedMedicine, setSelectedMedicine] =
    useState<MedicineStock | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  // Form states
  const [medicineForm, setMedicineForm] = useState({
    name: "",
    form: "",
    dosage: "",
    expiryDate: "",
    originalQuantity: "",
    currentQuantity: "",
    unitPrice: "",
    sellingPrice: "",
    supplier: "",
    description: "",
  });

  // Check if user has pharmacy access
  useEffect(() => {
    if (user && !["admin", "pharmacist", "pharmacy_head"].includes(user.role)) {
      router.push("/unauthorized");
    }
  }, [user, router]);

  // Fetch medicine stock
  const fetchMedicines = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/pharmacy/stock?search=${searchQuery}`,
        {
          headers: {
            "Content-Type": "application/json",
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
        },
      );

      const data = await response.json();

      if (data.success) {
        setMedicines(data.data);
      } else {
        setError(data.error || "Failed to fetch medicine stock");
        setMedicines([]);
      }
    } catch (error) {
      console.error("Error fetching medicine stock:", error);
      setError("Failed to fetch medicine stock");
      setMedicines([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && ["admin", "pharmacist", "pharmacy_head"].includes(user.role) && accessToken) {
      fetchMedicines();
    }
  }, [user, accessToken, searchQuery]);

  // Filter medicines based on status
  const filteredMedicines = medicines.filter((medicine) => {
    // Calculate status
    const stockPercentage =
      (medicine.currentQuantity / medicine.originalQuantity) * 100;
    const expiryDate = new Date(medicine.expiryDate);
    const today = new Date();
    const daysToExpiry = Math.ceil(
      (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );

    let status = "normal";
    if (stockPercentage <= 20) status = "low_stock";
    if (stockPercentage === 0) status = "out_of_stock";
    if (daysToExpiry <= 30) status = "expiring_soon";
    if (daysToExpiry < 0) status = "expired";

    if (statusFilter === "all") return true;
    return status === statusFilter;
  });

  // Calculate statistics
  const calculateStats = () => {
    const stats = {
      totalItems: medicines.length,
      totalValue: medicines.reduce(
        (sum, med) => sum + med.currentQuantity * med.sellingPrice,
        0,
      ),
      lowStock: 0,
      expiringSoon: 0,
      expired: 0,
      outOfStock: 0,
    };

    medicines.forEach((medicine) => {
      const stockPercentage =
        (medicine.currentQuantity / medicine.originalQuantity) * 100;
      const expiryDate = new Date(medicine.expiryDate);
      const today = new Date();
      const daysToExpiry = Math.ceil(
        (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (stockPercentage <= 20) stats.lowStock++;
      if (stockPercentage === 0) stats.outOfStock++;
      if (daysToExpiry <= 30 && daysToExpiry > 0) stats.expiringSoon++;
      if (daysToExpiry < 0) stats.expired++;
    });

    return stats;
  };

  const stats = calculateStats();

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const isEdit = !!selectedMedicine;

    try {
      const method = isEdit ? "PUT" : "POST";
      const url = isEdit
        ? `/api/pharmacy/stock/${selectedMedicine?._id}`
        : "/api/pharmacy/stock";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          name: medicineForm.name,
          form: medicineForm.form,
          dosage: medicineForm.dosage,
          expiryDate: medicineForm.expiryDate,
          originalQuantity: parseInt(medicineForm.originalQuantity),
          currentQuantity: parseInt(
            medicineForm.currentQuantity || medicineForm.originalQuantity,
          ),
          unitPrice: parseFloat(medicineForm.unitPrice),
          sellingPrice: parseFloat(medicineForm.sellingPrice),
          supplier: medicineForm.supplier,
          description: medicineForm.description,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(
          isEdit
            ? "Medicine updated successfully!"
            : "Medicine added successfully!",
        );
        fetchMedicines();

        if (isEdit) {
          setEditDialogOpen(false);
        } else {
          setAddDialogOpen(false);
        }

        resetForm();
      } else {
        setError(
          data.error || `Failed to ${isEdit ? "update" : "add"} medicine`,
        );
      }
    } catch (error) {
      console.error("Error saving medicine:", error);
      setError("Failed to save medicine. Please try again.");
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!selectedMedicine) return;

    try {
      const response = await fetch(
        `/api/pharmacy/stock/${selectedMedicine._id}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
        },
      );

      const data = await response.json();

      if (data.success) {
        setSuccess("Medicine deleted successfully!");
        fetchMedicines();
        setDeleteDialogOpen(false);
        setSelectedMedicine(null);
      } else {
        setError(data.error || "Failed to delete medicine");
      }
    } catch (error) {
      console.error("Error deleting medicine:", error);
      setError("Failed to delete medicine");
    }
  };

  // Reset form
  const resetForm = () => {
    setMedicineForm({
      name: "",
      form: "",
      dosage: "",
      expiryDate: "",
      originalQuantity: "",
      currentQuantity: "",
      unitPrice: "",
      sellingPrice: "",
      supplier: "",
      description: "",
    });
    setSelectedMedicine(null);
  };

  // Open edit dialog
  const openEditDialog = (medicine: MedicineStock) => {
    setSelectedMedicine(medicine);
    setMedicineForm({
      name: medicine.name,
      form: medicine.form,
      dosage: medicine.dosage,
      expiryDate: format(new Date(medicine.expiryDate), "yyyy-MM-dd"),
      originalQuantity: medicine.originalQuantity.toString(),
      currentQuantity: medicine.currentQuantity.toString(),
      unitPrice: medicine.unitPrice.toString(),
      sellingPrice: medicine.sellingPrice.toString(),
      supplier: medicine.supplier,
      description: medicine.description || "",
    });
    setEditDialogOpen(true);
  };

  // Open delete dialog
  const openDeleteDialog = (medicine: MedicineStock) => {
    setSelectedMedicine(medicine);
    setDeleteDialogOpen(true);
  };

  // Open view dialog
  const openViewDialog = (medicine: MedicineStock) => {
    setSelectedMedicine(medicine);
    setViewDialogOpen(true);
  };

  // Get status badge
  const getStatusBadge = (medicine: MedicineStock) => {
    const stockPercentage =
      (medicine.currentQuantity / medicine.originalQuantity) * 100;
    const expiryDate = new Date(medicine.expiryDate);
    const today = new Date();
    const daysToExpiry = Math.ceil(
      (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (stockPercentage === 0) {
      return <Badge variant="destructive">Out of Stock</Badge>;
    } else if (stockPercentage <= 20) {
      return (
        <Badge className="bg-orange-500 hover:bg-orange-600">Low Stock</Badge>
      );
    } else if (daysToExpiry < 0) {
      return <Badge variant="destructive">Expired</Badge>;
    } else if (daysToExpiry <= 30) {
      return (
        <Badge className="bg-yellow-500 hover:bg-yellow-600">
          Expiring Soon
        </Badge>
      );
    } else {
      return (
        <Badge
          variant="outline"
          className="bg-green-50 text-green-700 border-green-200"
        >
          In Stock
        </Badge>
      );
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  if (!user || !["admin", "pharmacist", "pharmacy_head"].includes(user.role)) {
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
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">
            Pharmacy Stock Management
          </h1>
          <p className="text-gray-500 mt-1">
            Manage medicine inventory and stock levels
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={fetchMedicines}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="secondary" onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Medicine
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
        <Alert className="bg-green-50 text-green-800 border-green-200">
          <AlertCircle className="h-4 w-4 text-green-600" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Items</p>
                <p className="text-2xl font-bold mt-1">{stats.totalItems}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Package className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Value</p>
                <p className="text-2xl font-bold mt-1">
                  {formatCurrency(stats.totalValue)}
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Low Stock</p>
                <p className="text-2xl font-bold mt-1">{stats.lowStock}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                <TrendingDown className="h-5 w-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Expiring Soon
                </p>
                <p className="text-2xl font-bold mt-1">{stats.expiringSoon}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Search medicines..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Status Filter</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="normal">In Stock</SelectItem>
                  <SelectItem value="low_stock">Low Stock</SelectItem>
                  <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                  <SelectItem value="expiring_soon">Expiring Soon</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Total Items</Label>
              <div className="text-2xl font-bold">
                {filteredMedicines.length}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Medicine Stock Table */}
      <Card>
        <CardHeader>
          <CardTitle>Medicine Stock</CardTitle>
          <CardDescription>
            List of all medicines in stock. Click on a medicine to view details.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredMedicines.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No medicines found</h3>
              <p className="text-gray-500">
                {searchQuery || statusFilter !== "all"
                  ? "Try adjusting your filters or search terms"
                  : "No medicines have been added yet."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Medicine Name</TableHead>
                    <TableHead>Form</TableHead>
                    <TableHead>Dosage</TableHead>
                    <TableHead>Stock Level</TableHead>
                    <TableHead>Expiry Date</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMedicines.map((medicine) => {
                    const stockPercentage =
                      (medicine.currentQuantity / medicine.originalQuantity) *
                      100;

                    return (
                      <TableRow key={medicine._id}>
                        <TableCell>
                          <div className="font-medium">{medicine.name}</div>
                          <div className="text-sm text-gray-500">
                            {medicine.supplier}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {medicine.form}
                        </TableCell>
                        <TableCell className="text-sm">
                          {medicine.dosage}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-2">
                            <Progress value={stockPercentage} className="h-2" />
                            <div className="text-sm text-gray-500">
                              {medicine.currentQuantity} /{" "}
                              {medicine.originalQuantity} units
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Calendar className="h-3 w-3 mr-2 text-gray-400" />
                            {format(
                              new Date(medicine.expiryDate),
                              "MMM d, yyyy",
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            {formatCurrency(medicine.sellingPrice)}
                          </div>
                          <div className="text-sm text-gray-500">
                            Cost: {formatCurrency(medicine.unitPrice)}
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(medicine)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openViewDialog(medicine)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEditDialog(medicine)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => openDeleteDialog(medicine)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Medicine Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-[95vw] lg:max-w-6xl max-h-[90vh] overflow-y-auto p-6">
          <DialogHeader>
            <DialogTitle>Add New Medicine</DialogTitle>
            <DialogDescription>
              Add a new medicine to the pharmacy stock
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Medicine Name *</Label>
                  <Input
                    id="name"
                    value={medicineForm.name}
                    onChange={(e) =>
                      setMedicineForm({ ...medicineForm, name: e.target.value })
                    }
                    placeholder="e.g., Amoxicillin 500mg"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="form">Form *</Label>
                  <Input
                    id="form"
                    value={medicineForm.form}
                    onChange={(e) =>
                      setMedicineForm({
                        ...medicineForm,
                        form: e.target.value,
                      })
                    }
                    placeholder="e.g., Tablet, Capsule, Syrup"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dosage">Dosage *</Label>
                  <Input
                    id="dosage"
                    value={medicineForm.dosage}
                    onChange={(e) =>
                      setMedicineForm({
                        ...medicineForm,
                        dosage: e.target.value,
                      })
                    }
                    placeholder="e.g., 500mg"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="expiryDate">Expiry Date *</Label>
                  <Input
                    id="expiryDate"
                    type="date"
                    value={medicineForm.expiryDate}
                    onChange={(e) =>
                      setMedicineForm({
                        ...medicineForm,
                        expiryDate: e.target.value,
                      })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supplier">Supplier *</Label>
                  <Input
                    id="supplier"
                    value={medicineForm.supplier}
                    onChange={(e) =>
                      setMedicineForm({
                        ...medicineForm,
                        supplier: e.target.value,
                      })
                    }
                    placeholder="e.g., Pharma Corp"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="originalQuantity">Total Quantity *</Label>
                  <Input
                    id="originalQuantity"
                    type="number"
                    min="1"
                    value={medicineForm.originalQuantity}
                    onChange={(e) =>
                      setMedicineForm({
                        ...medicineForm,
                        originalQuantity: e.target.value,
                      })
                    }
                    placeholder="e.g., 100"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currentQuantity">Current Quantity</Label>
                  <Input
                    id="currentQuantity"
                    type="number"
                    min="0"
                    value={medicineForm.currentQuantity}
                    onChange={(e) =>
                      setMedicineForm({
                        ...medicineForm,
                        currentQuantity: e.target.value,
                      })
                    }
                    placeholder="Same as total quantity"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unitPrice">Unit Cost ($) *</Label>
                  <Input
                    id="unitPrice"
                    type="number"
                    step="0.01"
                    min="0"
                    value={medicineForm.unitPrice}
                    onChange={(e) =>
                      setMedicineForm({
                        ...medicineForm,
                        unitPrice: e.target.value,
                      })
                    }
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sellingPrice">Selling Price ($) *</Label>
                  <Input
                    id="sellingPrice"
                    type="number"
                    step="0.01"
                    min="0"
                    value={medicineForm.sellingPrice}
                    onChange={(e) =>
                      setMedicineForm({
                        ...medicineForm,
                        sellingPrice: e.target.value,
                      })
                    }
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={medicineForm.description}
                  onChange={(e) =>
                    setMedicineForm({
                      ...medicineForm,
                      description: e.target.value,
                    })
                  }
                  placeholder="Additional notes about this medicine..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Add Medicine</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Medicine Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-[95vw] lg:max-w-6xl max-h-[90vh] overflow-y-auto p-6">
          <DialogHeader>
            <DialogTitle>Edit Medicine</DialogTitle>
            <DialogDescription>Update medicine details</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              {/* Same form fields as Add Dialog */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Medicine Name *</Label>
                  <Input
                    id="edit-name"
                    value={medicineForm.name}
                    onChange={(e) =>
                      setMedicineForm({ ...medicineForm, name: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-form">Form *</Label>
                  <Input
                    id="edit-form"
                    value={medicineForm.form}
                    onChange={(e) =>
                      setMedicineForm({
                        ...medicineForm,
                        form: e.target.value,
                      })
                    }
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-dosage">Dosage *</Label>
                  <Input
                    id="edit-dosage"
                    value={medicineForm.dosage}
                    onChange={(e) =>
                      setMedicineForm({
                        ...medicineForm,
                        dosage: e.target.value,
                      })
                    }
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-expiryDate">Expiry Date *</Label>
                  <Input
                    id="edit-expiryDate"
                    type="date"
                    value={medicineForm.expiryDate}
                    onChange={(e) =>
                      setMedicineForm({
                        ...medicineForm,
                        expiryDate: e.target.value,
                      })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-supplier">Supplier *</Label>
                  <Input
                    id="edit-supplier"
                    value={medicineForm.supplier}
                    onChange={(e) =>
                      setMedicineForm({
                        ...medicineForm,
                        supplier: e.target.value,
                      })
                    }
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-originalQuantity">
                    Total Quantity *
                  </Label>
                  <Input
                    id="edit-originalQuantity"
                    type="number"
                    min="1"
                    value={medicineForm.originalQuantity}
                    onChange={(e) =>
                      setMedicineForm({
                        ...medicineForm,
                        originalQuantity: e.target.value,
                      })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-currentQuantity">
                    Current Quantity *
                  </Label>
                  <Input
                    id="edit-currentQuantity"
                    type="number"
                    min="0"
                    value={medicineForm.currentQuantity}
                    onChange={(e) =>
                      setMedicineForm({
                        ...medicineForm,
                        currentQuantity: e.target.value,
                      })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-unitPrice">Unit Cost ($) *</Label>
                  <Input
                    id="edit-unitPrice"
                    type="number"
                    step="0.01"
                    min="0"
                    value={medicineForm.unitPrice}
                    onChange={(e) =>
                      setMedicineForm({
                        ...medicineForm,
                        unitPrice: e.target.value,
                      })
                    }
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-sellingPrice">Selling Price ($) *</Label>
                  <Input
                    id="edit-sellingPrice"
                    type="number"
                    step="0.01"
                    min="0"
                    value={medicineForm.sellingPrice}
                    onChange={(e) =>
                      setMedicineForm({
                        ...medicineForm,
                        sellingPrice: e.target.value,
                      })
                    }
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={medicineForm.description}
                  onChange={(e) =>
                    setMedicineForm({
                      ...medicineForm,
                      description: e.target.value,
                    })
                  }
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button variant="secondary" type="submit">
                Update Medicine
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Medicine Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-[95vw] lg:max-w-6xl max-h-[90vh] overflow-y-auto p-6">
          <DialogHeader>
            <DialogTitle>Medicine Details</DialogTitle>
            <DialogDescription>
              Complete details of {selectedMedicine?.name}
            </DialogDescription>
          </DialogHeader>
          {selectedMedicine && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Basic Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-sm text-gray-500">
                        Medicine Name
                      </Label>
                      <p className="font-medium">{selectedMedicine.name}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-500">Form</Label>
                      <p className="text-sm">{selectedMedicine.form}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-500">Dosage</Label>
                      <p className="text-sm">{selectedMedicine.dosage}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-500">Supplier</Label>
                      <p className="font-medium">{selectedMedicine.supplier}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Stock Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-sm text-gray-500">
                        Stock Level
                      </Label>
                      <div className="space-y-2">
                        <Progress
                          value={
                            (selectedMedicine.currentQuantity /
                              selectedMedicine.originalQuantity) *
                            100
                          }
                          className="h-2"
                        />
                        <p className="text-sm">
                          {selectedMedicine.currentQuantity} /{" "}
                          {selectedMedicine.originalQuantity} units
                        </p>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-500">
                        Expiry Date
                      </Label>
                      <p className="font-medium">
                        {format(
                          new Date(selectedMedicine.expiryDate),
                          "MMMM d, yyyy",
                        )}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-500">Status</Label>
                      <div className="mt-1">
                        {getStatusBadge(selectedMedicine)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Pricing Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-sm text-gray-500">Unit Cost</Label>
                      <p className="font-medium">
                        {formatCurrency(selectedMedicine.unitPrice)}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-500">
                        Selling Price
                      </Label>
                      <p className="font-medium">
                        {formatCurrency(selectedMedicine.sellingPrice)}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-500">
                        Total Value
                      </Label>
                      <p className="font-medium">
                        {formatCurrency(
                          selectedMedicine.currentQuantity *
                            selectedMedicine.sellingPrice,
                        )}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {selectedMedicine.description && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Description</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-wrap">
                      {selectedMedicine.description}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Medicine</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this medicine? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {selectedMedicine && (
            <div className="border rounded-lg p-4 my-4">
              <h4 className="font-semibold mb-2">Medicine Details</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-gray-500">Name</p>
                  <p className="font-medium">{selectedMedicine.name}</p>
                </div>
                <div>
                  <p className="text-gray-500">Form</p>
                  <p className="font-medium">{selectedMedicine.form}</p>
                </div>
                <div>
                  <p className="text-gray-500">Dosage</p>
                  <p className="font-medium">{selectedMedicine.dosage}</p>
                </div>
                <div>
                  <p className="text-gray-500">Current Stock</p>
                  <p className="font-medium">
                    {selectedMedicine.currentQuantity} units
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Expiry Date</p>
                  <p className="font-medium">
                    {format(
                      new Date(selectedMedicine.expiryDate),
                      "MMM d, yyyy",
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
