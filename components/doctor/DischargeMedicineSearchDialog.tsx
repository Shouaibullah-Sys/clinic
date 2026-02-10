// components/doctor/DischargeMedicineSearchDialog.tsx

"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Loader2,
  Search,
  X,
  AlertCircle,
  Calendar,
  Package,
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface Medicine {
  _id: string;
  name: string;
  form: string;
  dosage: string;
  frequency: string;
  route: string;
  expiryDate: string;
  currentQuantity: number;
  sellingPrice: number;
  supplier?: string;
}

interface DischargeMedicineSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMedicineSelected: (medicine: {
    _id: string;
    name: string;
    form: string;
    dosage: string;
    frequency: string;
    route: string;
    sellingPrice: number;
    currentQuantity: number;
    expiryDate: string;
  }) => void;
  accessToken: string;
}

export function DischargeMedicineSearchDialog({
  open,
  onOpenChange,
  onMedicineSelected,
  accessToken,
}: DischargeMedicineSearchDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchingMedicines, setSearchingMedicines] = useState(false);
  const [medicines, setMedicines] = useState<Medicine[]>([]);

  // Search medicines from pharmacy inventory
  const searchMedicines = useCallback(
    async (query: string) => {
      if (query.length < 2) {
        setMedicines([]);
        return;
      }

      setSearchingMedicines(true);
      try {
        const response = await fetch(
          `/api/pharmacy/medicines/search?q=${encodeURIComponent(query)}&limit=10`,
          {
            headers: {
              "Content-Type": "application/json",
              ...(accessToken
                ? { Authorization: `Bearer ${accessToken}` }
                : {}),
            },
          },
        );

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            setMedicines(result.data);
          }
        }
      } catch (error) {
        console.error("Error searching medicines:", error);
        toast.error("Failed to search medicines");
      } finally {
        setSearchingMedicines(false);
      }
    },
    [accessToken],
  );

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery) {
        searchMedicines(searchQuery);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, searchMedicines]);

  // Handle dialog close
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setSearchQuery("");
      setMedicines([]);
    }
    onOpenChange(isOpen);
  };

  // Handle medicine selection
  const handleSelectMedicine = (medicine: Medicine) => {
    // Only allow selection if in stock
    if (medicine.currentQuantity <= 0) {
      toast.warning("This medicine is out of stock");
      return;
    }

    // Check expiry
    const expiryDate = new Date(medicine.expiryDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (expiryDate < today) {
      toast.warning("This medicine has expired");
      return;
    }

    onMedicineSelected({
      _id: medicine._id,
      name: medicine.name,
      form: medicine.form,
      dosage: medicine.dosage,
      frequency: medicine.frequency,
      route: medicine.route,
      sellingPrice: medicine.sellingPrice,
      currentQuantity: medicine.currentQuantity,
      expiryDate: medicine.expiryDate,
    });

    // Close dialog
    setSearchQuery("");
    setMedicines([]);
    onOpenChange(false);

    toast.success(`${medicine.name} selected`);
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  // Calculate days to expiry
  const getDaysToExpiry = (expiryDate: string): number => {
    const expiry = new Date(expiryDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = expiry.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Get expiry warning level
  const getExpiryWarning = (
    expiryDate: string,
  ): "none" | "soon" | "critical" | "expired" => {
    const daysToExpiry = getDaysToExpiry(expiryDate);

    if (daysToExpiry < 0) return "expired";
    if (daysToExpiry <= 7) return "critical";
    if (daysToExpiry <= 30) return "soon";
    return "none";
  };

  // Get stock status
  const getStockStatus = (stock: number) => {
    if (stock === 0)
      return { text: "Out of Stock", variant: "destructive" as const };
    if (stock <= 10)
      return { text: "Low Stock", variant: "destructive" as const };
    if (stock <= 50) return { text: "Limited", variant: "warning" as const };
    return { text: "In Stock", variant: "default" as const };
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Search Medicines
          </DialogTitle>
          <DialogDescription>
            Search pharmacy inventory to add discharge medicines
          </DialogDescription>
        </DialogHeader>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by medicine name, brand, or generic name..."
            className="pl-10"
            autoFocus
          />
          {searchingMedicines && (
            <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-primary" />
          )}
          {searchQuery && !searchingMedicines && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setMedicines([]);
              }}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Search Results */}
        {searchQuery.length >= 2 && (
          <div className="border rounded-lg overflow-hidden">
            <div className="max-h-80 overflow-y-auto">
              {medicines.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Medicine Name</TableHead>
                      <TableHead>Form</TableHead>
                      <TableHead>Dosage</TableHead>
                      <TableHead>Frequency</TableHead>
                      <TableHead>Route</TableHead>
                      <TableHead>Expiry</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead className="w-24">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {medicines.map((medicine) => {
                      const stockStatus = getStockStatus(
                        medicine.currentQuantity,
                      );
                      const expiryWarning = getExpiryWarning(
                        medicine.expiryDate,
                      );
                      const isExpired = expiryWarning === "expired";
                      const isOutOfStock = medicine.currentQuantity === 0;

                      return (
                        <TableRow
                          key={medicine._id}
                          className={cn(
                            isExpired && "bg-muted/50",
                            isOutOfStock && !isExpired && "bg-muted/30",
                          )}
                        >
                          <TableCell>
                            <div className="font-medium">{medicine.name}</div>
                            {medicine.supplier && (
                              <div className="text-sm text-muted-foreground">
                                {medicine.supplier}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{medicine.form}</span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{medicine.dosage}</span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">
                              {medicine.frequency}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{medicine.route}</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <div className="flex flex-col">
                                <span
                                  className={cn(
                                    "text-sm",
                                    expiryWarning === "critical" &&
                                      "text-red-600 font-medium",
                                    expiryWarning === "soon" &&
                                      "text-yellow-600",
                                  )}
                                >
                                  {formatDate(medicine.expiryDate)}
                                </span>
                                {expiryWarning === "critical" && (
                                  <span className="text-xs text-red-600 flex items-center gap-1">
                                    <AlertCircle className="h-3 w-3" />
                                    Expires soon
                                  </span>
                                )}
                                {expiryWarning === "expired" && (
                                  <span className="text-xs text-red-600 flex items-center gap-1">
                                    <AlertCircle className="h-3 w-3" />
                                    Expired
                                  </span>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={stockStatus.variant}
                              className={cn(
                                "gap-1",
                                stockStatus.variant === "destructive" &&
                                  "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400",
                                stockStatus.variant === "warning" &&
                                  "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400",
                              )}
                            >
                              {medicine.currentQuantity}
                              <span className="text-xs">
                                {stockStatus.text}
                              </span>
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium">
                              {medicine.sellingPrice.toFixed(2)} AFN
                            </span>
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => handleSelectMedicine(medicine)}
                              disabled={isOutOfStock || isExpired}
                              className={cn(
                                isExpired && "opacity-50 cursor-not-allowed",
                              )}
                            >
                              Select
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : searchingMedicines ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="text-center py-12">
                  <Search className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="font-medium mb-2">
                    {searchQuery.length < 2
                      ? "Enter at least 2 characters to search"
                      : "No medicines found"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {searchQuery.length < 2
                      ? "Start typing to search the pharmacy inventory"
                      : "Try a different search term"}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Empty State */}
        {searchQuery.length < 2 && (
          <div className="text-center py-12 border-2 border-dashed rounded-lg">
            <Search className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <p className="font-medium mb-2">Search for Medicines</p>
            <p className="text-sm text-muted-foreground">
              Enter at least 2 characters to search the pharmacy inventory
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
