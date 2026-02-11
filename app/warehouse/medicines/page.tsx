// app/warehouse/medicines/page.tsx
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
import { Plus, Search, Edit, Trash2, AlertCircle, Package } from "lucide-react";

interface WarehouseMedicine {
  _id: string;
  warehouseId: string;
  name: string;
  genericName?: string;
  category: string;
  manufacturer: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const CATEGORIES = [
  "Antibiotic",
  "Analgesic",
  "Antipyretic",
  "Anti-inflammatory",
  "Antihistamine",
  "Antiviral",
  "Antifungal",
  "Cardiovascular",
  "Gastrointestinal",
  "Respiratory",
  "Central Nervous System",
  "Endocrine",
  "Vitamins & Supplements",
  "Dermatological",
  "Ophthalmic",
  "Other",
];

export default function WarehouseMedicinesPage() {
  const router = useRouter();
  const { user, accessToken } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [medicines, setMedicines] = useState<WarehouseMedicine[]>([]);
  const [selectedMedicine, setSelectedMedicine] =
    useState<WarehouseMedicine | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Form states
  const [medicineForm, setMedicineForm] = useState({
    name: "",
    genericName: "",
    category: "",
    manufacturer: "",
    description: "",
    isActive: true,
  });

  // Check if user has access
  useEffect(() => {
    if (user && !["admin", "pharmacist"].includes(user.role)) {
      router.push("/unauthorized");
    }
  }, [user, router]);

  // Fetch medicines
  const fetchMedicines = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/warehouse?search=${searchQuery}`, {
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
      });

      const data = await response.json();

      if (data.success) {
        setMedicines(data.data || []);
      } else {
        setError(data.error || "Failed to fetch medicines");
        setMedicines([]);
      }
    } catch (error) {
      console.error("Error fetching medicines:", error);
      setError("Failed to fetch medicines");
      setMedicines([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && ["admin", "pharmacist"].includes(user.role) && accessToken) {
      fetchMedicines();
    }
  }, [user, accessToken, searchQuery]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const isEdit = !!selectedMedicine;

    try {
      const method = isEdit ? "PUT" : "POST";
      const url = isEdit
        ? `/api/warehouse/${selectedMedicine?._id}`
        : "/api/warehouse";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify(medicineForm),
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
      const response = await fetch(`/api/warehouse/${selectedMedicine._id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
      });

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
      genericName: "",
      category: "",
      manufacturer: "",
      description: "",
      isActive: true,
    });
    setSelectedMedicine(null);
  };

  // Open edit dialog
  const openEditDialog = (medicine: WarehouseMedicine) => {
    setSelectedMedicine(medicine);
    setMedicineForm({
      name: medicine.name,
      genericName: medicine.genericName || "",
      category: medicine.category,
      manufacturer: medicine.manufacturer,
      description: medicine.description || "",
      isActive: medicine.isActive,
    });
    setEditDialogOpen(true);
  };

  // Open delete dialog
  const openDeleteDialog = (medicine: WarehouseMedicine) => {
    setSelectedMedicine(medicine);
    setDeleteDialogOpen(true);
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Warehouse Medicines</h1>
          <p className="text-gray-500 mt-1">
            Manage medicine catalog in warehouse
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => setAddDialogOpen(true)}>
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

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search medicines by name, generic name, or manufacturer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Medicines Table */}
      <Card>
        <CardHeader>
          <CardTitle>Medicine Catalog</CardTitle>
          <CardDescription>
            {medicines.length} medicine(s) in warehouse
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : medicines.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No medicines found</h3>
              <p className="text-gray-500">
                {searchQuery
                  ? "Try adjusting your search terms"
                  : "No medicines have been added yet."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Medicine ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Generic Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Manufacturer</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {medicines.map((medicine) => (
                    <TableRow key={medicine._id}>
                      <TableCell className="font-mono text-sm">
                        {medicine.warehouseId}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{medicine.name}</div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {medicine.genericName || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{medicine.category}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {medicine.manufacturer}
                      </TableCell>
                      <TableCell>
                        {medicine.isActive ? (
                          <Badge className="bg-green-100 text-green-700">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
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
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Medicine Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Medicine</DialogTitle>
            <DialogDescription>
              Add a new medicine to the warehouse catalog
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Medicine Name *</Label>
                <Input
                  id="name"
                  value={medicineForm.name}
                  onChange={(e) =>
                    setMedicineForm({ ...medicineForm, name: e.target.value })
                  }
                  placeholder="e.g., Amoxicillin"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="genericName">Generic Name</Label>
                <Input
                  id="genericName"
                  value={medicineForm.genericName}
                  onChange={(e) =>
                    setMedicineForm({
                      ...medicineForm,
                      genericName: e.target.value,
                    })
                  }
                  placeholder="e.g., Amoxicillin Trihydrate"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select
                  value={medicineForm.category}
                  onValueChange={(value) =>
                    setMedicineForm({ ...medicineForm, category: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="manufacturer">Manufacturer *</Label>
                <Input
                  id="manufacturer"
                  value={medicineForm.manufacturer}
                  onChange={(e) =>
                    setMedicineForm({
                      ...medicineForm,
                      manufacturer: e.target.value,
                    })
                  }
                  placeholder="e.g., Pharma Corp"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={medicineForm.description}
                  onChange={(e) =>
                    setMedicineForm({
                      ...medicineForm,
                      description: e.target.value,
                    })
                  }
                  placeholder="Additional information about this medicine"
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Medicine</DialogTitle>
            <DialogDescription>Update medicine details</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
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
                <Label htmlFor="edit-genericName">Generic Name</Label>
                <Input
                  id="edit-genericName"
                  value={medicineForm.genericName}
                  onChange={(e) =>
                    setMedicineForm({
                      ...medicineForm,
                      genericName: e.target.value,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-category">Category *</Label>
                <Select
                  value={medicineForm.category}
                  onValueChange={(value) =>
                    setMedicineForm({ ...medicineForm, category: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-manufacturer">Manufacturer *</Label>
                <Input
                  id="edit-manufacturer"
                  value={medicineForm.manufacturer}
                  onChange={(e) =>
                    setMedicineForm({
                      ...medicineForm,
                      manufacturer: e.target.value,
                    })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Input
                  id="edit-description"
                  value={medicineForm.description}
                  onChange={(e) =>
                    setMedicineForm({
                      ...medicineForm,
                      description: e.target.value,
                    })
                  }
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="edit-isActive"
                  checked={medicineForm.isActive}
                  onChange={(e) =>
                    setMedicineForm({
                      ...medicineForm,
                      isActive: e.target.checked,
                    })
                  }
                  className="h-4 w-4"
                />
                <Label htmlFor="edit-isActive">Active</Label>
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
              <Button type="submit">Update Medicine</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Medicine</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this medicine? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          {selectedMedicine && (
            <div className="border rounded-lg p-4 my-4">
              <h4 className="font-semibold mb-2">Medicine Details</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-gray-500">Name</p>
                  <p className="font-medium">{selectedMedicine.name}</p>
                </div>
                <div>
                  <p className="text-gray-500">Category</p>
                  <p className="font-medium">{selectedMedicine.category}</p>
                </div>
                <div>
                  <p className="text-gray-500">Manufacturer</p>
                  <p className="font-medium">{selectedMedicine.manufacturer}</p>
                </div>
                <div>
                  <p className="text-gray-500">ID</p>
                  <p className="font-medium">{selectedMedicine.warehouseId}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
