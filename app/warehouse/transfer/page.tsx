// app/warehouse/transfer/page.tsx
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
  Search,
  ArrowRight,
  Package,
  AlertCircle,
  CheckCircle,
  Trash2,
  Calendar,
  DollarSign,
} from "lucide-react";
import { format } from "date-fns";

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
  status: string;
  remainingPercentage: number;
}

interface WarehouseMedicine {
  _id: string;
  name: string;
  genericName?: string;
  category: string;
  manufacturer: string;
  availableBatches: WarehouseBatch[];
  totalAvailableQuantity: number;
}

interface TransferItem {
  warehouseBatchId: string;
  medicineName: string;
  batchNumber: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  expiryDate: string;
}

export default function WarehouseTransferPage() {
  const router = useRouter();
  const { user, accessToken } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<WarehouseMedicine[]>([]);
  const [selectedItems, setSelectedItems] = useState<TransferItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isTransferring, setIsTransferring] = useState(false);

  // Check if user has access
  useEffect(() => {
    if (user && !["admin", "pharmacy_head"].includes(user.role)) {
      router.push("/unauthorized");
    }
  }, [user, router]);

  // Search warehouse medicines
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (searchQuery.length >= 2) {
        searchWarehouse();
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery, accessToken]);

  const searchWarehouse = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/warehouse/search?q=${encodeURIComponent(searchQuery)}`,
        {
          headers: {
            "Content-Type": "application/json",
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
        },
      );

      const data = await response.json();

      if (data.success) {
        setSearchResults(data.data || []);
      } else {
        setError(data.error || "Failed to search warehouse");
        setSearchResults([]);
      }
    } catch (error) {
      console.error("Error searching warehouse:", error);
      setError("Failed to search warehouse");
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const addToTransferList = (batch: WarehouseBatch, medicineName: string) => {
    // Check if already in list
    const existingItem = selectedItems.find(
      (item) => item.warehouseBatchId === batch._id,
    );

    if (existingItem) {
      setError("This batch is already in the transfer list");
      return;
    }

    const newItem: TransferItem = {
      warehouseBatchId: batch._id,
      medicineName,
      batchNumber: batch.batchNumber,
      quantity: batch.quantity,
      unitCost: batch.unitCost,
      totalCost: batch.quantity * batch.unitCost,
      expiryDate: batch.expiryDate,
    };

    setSelectedItems([...selectedItems, newItem]);
    setSuccess(`Added ${medicineName} (${batch.batchNumber}) to transfer list`);
    setTimeout(() => setSuccess(null), 3000);
  };

  const removeFromTransferList = (warehouseBatchId: string) => {
    setSelectedItems(
      selectedItems.filter(
        (item) => item.warehouseBatchId !== warehouseBatchId,
      ),
    );
  };

  const updateQuantity = (warehouseBatchId: string, newQuantity: number) => {
    setSelectedItems(
      selectedItems.map((item) => {
        if (item.warehouseBatchId === warehouseBatchId) {
          return {
            ...item,
            quantity: newQuantity,
            totalCost: newQuantity * item.unitCost,
          };
        }
        return item;
      }),
    );
  };

  const executeTransfer = async () => {
    if (selectedItems.length === 0) {
      setError("No items selected for transfer");
      return;
    }

    try {
      setIsTransferring(true);
      setError(null);

      const response = await fetch("/api/warehouse/transfers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          items: selectedItems.map((item) => ({
            warehouseBatchId: item.warehouseBatchId,
            quantity: item.quantity,
          })),
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(
          "Transfer completed successfully! Medicines added to pharmacy stock.",
        );
        setSelectedItems([]);
        setSearchResults([]);
        setSearchQuery("");
      } else {
        setError(data.error || "Failed to complete transfer");
      }
    } catch (error) {
      console.error("Error executing transfer:", error);
      setError("Failed to complete transfer");
    } finally {
      setIsTransferring(false);
    }
  };

  const totalTransferValue = selectedItems.reduce(
    (sum, item) => sum + item.totalCost,
    0,
  );
  const totalTransferQuantity = selectedItems.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );

  if (!user || !["admin", "pharmacy_head"].includes(user.role)) {
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
          <h1 className="text-3xl font-bold">Transfer to Pharmacy</h1>
          <p className="text-gray-500 mt-1">
            Search warehouse and transfer medicines to pharmacy stock
          </p>
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
        <Alert className=" text-green-800 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Search Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Search Warehouse
            </CardTitle>
            <CardDescription>
              Enter at least 2 characters to search for medicines
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search medicines by name, generic name, or manufacturer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {loading && (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            )}

            {!loading &&
              searchQuery.length >= 2 &&
              searchResults.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Package className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>No medicines found</p>
                </div>
              )}

            {!loading && searchResults.length > 0 && (
              <div className="space-y-4 max-h-[500px] overflow-y-auto">
                {searchResults.map((medicine) => (
                  <div key={medicine._id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold">{medicine.name}</h3>
                        {medicine.genericName && (
                          <p className="text-sm text-gray-500">
                            {medicine.genericName}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline">{medicine.category}</Badge>
                          <span className="text-sm text-gray-500">
                            {medicine.manufacturer}
                          </span>
                        </div>
                      </div>
                      <Badge className=" text-green-700">
                        {medicine.totalAvailableQuantity} units
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm font-medium">Available Batches:</p>
                      {medicine.availableBatches.map((batch) => (
                        <div
                          key={batch._id}
                          className="flex items-center justify-between p-2  rounded"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">
                                {batch.batchNumber}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {batch.form}
                              </Badge>
                              <span className="text-xs text-gray-500">
                                {batch.dosage}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                              <Calendar className="h-3 w-3" />
                              {format(
                                new Date(batch.expiryDate),
                                "MMM d, yyyy",
                              )}
                              <span>•</span>
                              <span>{batch.quantity} units</span>
                              <span>•</span>
                              <DollarSign className="h-3 w-3" />
                              {batch.unitCost.toFixed(2)} each
                            </div>
                          </div>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() =>
                              addToTransferList(batch, medicine.name)
                            }
                          >
                            <ArrowRight className="h-4 w-4 mr-1" />
                            Add
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Transfer List Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Transfer List
            </CardTitle>
            <CardDescription>
              {selectedItems.length} item(s) selected
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedItems.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Package className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>No items selected</p>
                <p className="text-sm">
                  Search and add medicines from the warehouse
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {selectedItems.map((item) => (
                    <div
                      key={item.warehouseBatchId}
                      className="border rounded-lg p-3"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-medium text-sm">
                            {item.medicineName}
                          </h4>
                          <p className="text-xs text-gray-500">
                            {item.batchNumber}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            removeFromTransferList(item.warehouseBatchId)
                          }
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <Label className="text-xs text-gray-500">
                            Quantity
                          </Label>
                          <Input
                            type="number"
                            min="1"
                            max={item.quantity}
                            value={item.quantity}
                            onChange={(e) =>
                              updateQuantity(
                                item.warehouseBatchId,
                                parseInt(e.target.value) || 1,
                              )
                            }
                            className="h-8"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-gray-500">
                            Total Cost
                          </Label>
                          <div className="h-8 flex items-center font-medium">
                            ${item.totalCost.toFixed(2)}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                        <Calendar className="h-3 w-3" />
                        Expires:{" "}
                        {format(new Date(item.expiryDate), "MMM d, yyyy")}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Transfer Summary */}
                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Total Items:</span>
                    <span className="font-medium">{selectedItems.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Total Quantity:</span>
                    <span className="font-medium">
                      {totalTransferQuantity} units
                    </span>
                  </div>
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total Value:</span>
                    <span>${totalTransferValue.toFixed(2)}</span>
                  </div>
                </div>

                <Button
                  className="w-full"
                  variant="secondary"
                  onClick={executeTransfer}
                  disabled={isTransferring || selectedItems.length === 0}
                >
                  {isTransferring ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Transferring...
                    </>
                  ) : (
                    <>
                      <ArrowRight className="h-4 w-4 mr-2" />
                      Complete Transfer
                    </>
                  )}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
