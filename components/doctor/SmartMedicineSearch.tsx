// app/components/doctor/SmartMedicineSearch.tsx - ENHANCED
"use client";

import { useState, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Search,
  Pill,
  AlertTriangle,
  Clock,
  Package,
  DollarSign,
  RefreshCw,
  Plus,
  X,
  AlertCircle,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { toast } from "sonner";

interface Medicine {
  _id: string;
  name: string;
  batchNumber: string;
  supplier: string;
  currentQuantity: number;
  originalQuantity: number;
  unitPrice: number;
  sellingPrice: number;
  expiryDate: string;
  remainingPercentage: number;
  isLowStock: boolean;
  isExpiringSoon: boolean;
  status: "available" | "low-stock" | "expiring-soon";
}

interface SmartMedicineSearchProps {
  onSelectMedicine: (medicine: Medicine) => void;
  selectedMedicines?: Medicine[];
  placeholder?: string;
  disabled?: boolean;
}

export function SmartMedicineSearch({
  onSelectMedicine,
  selectedMedicines = [],
  placeholder = "Search medicines...",
  disabled = false,
}: SmartMedicineSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const { accessToken } = useAuthStore();

  // Debounced search
  const debouncedSearch = useMemo(
    () => searchQuery,
    [searchQuery]
  );

  useEffect(() => {
    const performSearch = async () => {
      if (debouncedSearch.length < 2) {
        setMedicines([]);
        setShowResults(false);
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(
          `/api/pharmacy/medicines/search?q=${encodeURIComponent(debouncedSearch)}&limit=20`,
          {
            headers: {
              "Content-Type": "application/json",
              ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
            },
          }
        );

        if (!response.ok) {
          throw new Error("Failed to search medicines");
        }

        const result = await response.json();
        
        if (result.success) {
          setMedicines(result.data);
          setLastUpdated(new Date());
          setShowResults(true);
        }
      } catch (error) {
        console.error("Error searching medicines:", error);
        toast.error("Failed to search medicines");
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(performSearch, 300);
    return () => clearTimeout(timeoutId);
  }, [debouncedSearch, accessToken]);

  const handleSelectMedicine = (medicine: Medicine) => {
    // Check if medicine is already selected
    const isAlreadySelected = selectedMedicines.some(
      selected => selected._id === medicine._id
    );

    if (isAlreadySelected) {
      toast.warning("This medicine is already selected");
      return;
    }

    // NEW: Warn about low stock
    if (medicine.isLowStock) {
      toast.warning(`Warning: ${medicine.name} is low in stock (${medicine.currentQuantity} remaining)`);
    }

    onSelectMedicine(medicine);
    setSearchQuery("");
    setShowResults(false);
  };

  // NEW: Enhanced stock warning level function
  const getStockWarningLevel = (quantity: number, remainingPercentage: number) => {
    if (quantity === 0) return { level: "Out of Stock", color: "text-red-600", icon: AlertCircle };
    if (remainingPercentage <= 10) return { level: "Very Low", color: "text-red-500", icon: TrendingDown };
    if (remainingPercentage <= 25) return { level: "Low", color: "text-orange-500", icon: TrendingDown };
    if (remainingPercentage <= 50) return { level: "Moderate", color: "text-yellow-500", icon: TrendingUp };
    return { level: "Good", color: "text-green-500", icon: TrendingUp };
  };

  const getStatusBadge = (medicine: Medicine) => {
    if (medicine.isLowStock) {
      return (
        <Badge variant="destructive" className="text-xs">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Low Stock
        </Badge>
      );
    }
    
    if (medicine.isExpiringSoon) {
      return (
        <Badge variant="outline" className="text-xs">
          <Clock className="h-3 w-3 mr-1" />
          Expiring Soon
        </Badge>
      );
    }

    return (
      <Badge variant="default" className="text-xs">
        <Package className="h-3 w-3 mr-1" />
        Available
      </Badge>
    );
  };

  const getStockColor = (percentage: number) => {
    if (percentage <= 20) return "text-red-500";
    if (percentage <= 50) return "text-yellow-500";
    return "text-green-500";
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-2 mb-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => searchQuery.length >= 2 && setShowResults(true)}
            placeholder={placeholder}
            disabled={disabled}
            className="pl-10"
          />
          {loading && (
            <RefreshCw className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setSearchQuery("");
            setShowResults(false);
          }}
          disabled={disabled}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {showResults && medicines.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto">
          <div className="p-3 border-b bg-gray-50">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{medicines.length} results found</span>
              {lastUpdated && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Updated {lastUpdated.toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>
          
          <div className="divide-y">
            {medicines.map((medicine) => {
              const stockWarning = getStockWarningLevel(medicine.currentQuantity, medicine.remainingPercentage);
              const StockIcon = stockWarning.icon;
              
              return (
                <button
                  key={medicine._id}
                  onClick={() => handleSelectMedicine(medicine)}
                  className="w-full text-left p-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Pill className="h-4 w-4 text-blue-500" />
                        <span className="font-medium text-sm">{medicine.name}</span>
                        <span className="text-xs text-muted-foreground">({medicine.batchNumber})</span>
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
                        <span>Supplier: {medicine.supplier}</span>
                        <span>Expiry: {new Date(medicine.expiryDate).toLocaleDateString()}</span>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <span className={`font-medium ${getStockColor(medicine.remainingPercentage)}`}>
                            {medicine.currentQuantity} in stock
                          </span>
                          <span className="text-xs text-muted-foreground">
                            ({medicine.remainingPercentage}% remaining)
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-3 w-3 text-green-500" />
                          <span className="text-sm font-medium">
                            ${medicine.sellingPrice.toFixed(2)}
                          </span>
                        </div>
                      </div>
                      
                      {/* NEW: Enhanced stock warning display */}
                      <div className="mt-2 flex items-center gap-2">
                        <StockIcon className={`h-3 w-3 ${stockWarning.color}`} />
                        <span className={`text-xs ${stockWarning.color} font-medium`}>
                          {stockWarning.level}
                        </span>
                        {medicine.isExpiringSoon && (
                          <Badge variant="outline" className="text-xs">
                            <Clock className="h-2 w-2 mr-1" />
                            Expiring Soon
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-1">
                      {getStatusBadge(medicine)}
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectMedicine(medicine);
                        }}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Select
                      </Button>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {showResults && medicines.length === 0 && !loading && searchQuery.length >= 2 && (
        <div className="absolute top-full left-0 right-0 z-50 bg-white border border-gray-200 rounded-lg shadow-lg">
          <div className="p-4 text-center text-muted-foreground">
            No medicines found for "{searchQuery}"
          </div>
        </div>
      )}

      {selectedMedicines.length > 0 && (
        <div className="mt-4">
          <Label className="text-sm font-medium mb-2 block">Selected Medicines</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {selectedMedicines.map((medicine) => {
              const stockWarning = getStockWarningLevel(medicine.currentQuantity, medicine.remainingPercentage);
              const StockIcon = stockWarning.icon;
              
              return (
                <div key={medicine._id} className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                  <div className="flex items-center gap-2">
                    <Pill className="h-4 w-4 text-blue-500" />
                    <div>
                      <div className="font-medium text-sm">{medicine.name}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <StockIcon className={`h-3 w-3 ${stockWarning.color}`} />
                        <span className={stockWarning.color}>{stockWarning.level}</span>
                        <span>• {medicine.currentQuantity} in stock</span>
                        <span>• ${medicine.sellingPrice.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                  <Badge variant={medicine.isLowStock ? "destructive" : "default"}>
                    {medicine.isLowStock ? "Low Stock" : "Available"}
                  </Badge>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
