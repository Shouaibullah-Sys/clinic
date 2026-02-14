"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Search,
  X,
  Loader2,
  AlertCircle,
  CheckCircle,
  Clock,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/components/ui/cn";

export interface MedicineStock {
  _id: string;
  name: string;
  form: string;
  dosage: string;
  frequency: string;
  route: string;
  expiryDate: string;
  currentQuantity: number;
  originalQuantity: number;
  unitPrice: number;
  sellingPrice: number;
  supplier: string;
  description?: string;
  remainingPercentage?: number;
  isLowStock?: boolean;
  isExpiringSoon?: boolean;
  status?: "low-stock" | "expiring-soon" | "available";
  daysToExpiry?: number;
}

interface MedicineSearchProps {
  onMedicineSelect: (medicine: MedicineStock | null) => void;
  selectedMedicine?: MedicineStock | null;
  placeholder?: string;
  autoClear?: boolean;
}

interface SearchResponse {
  success: boolean;
  data: MedicineStock[];
  total: number;
  error?: string;
}

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default function MedicineSearch({
  onMedicineSelect,
  selectedMedicine,
  placeholder = "Search medicine by name or supplier...",
  autoClear = false,
}: MedicineSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<MedicineStock[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const requestIdRef = useRef(0);

  const debouncedQuery = useDebounce(searchQuery, 300);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Search medicines
  const searchMedicines = useCallback(async (query: string) => {
    if (!query.trim()) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/pharmacy/medicines/search?q=${encodeURIComponent(query)}&limit=20`,
      );

      if (!response.ok) {
        throw new Error("Failed to search medicines");
      }

      const data: SearchResponse = await response.json();
      if (requestId !== requestIdRef.current) return;

      if (data.success && data.data) {
        setResults(data.data);
        setIsOpen(true);
      } else {
        setResults([]);
        setError(data.error || "No medicines found");
        setIsOpen(true);
      }
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      console.error("Error searching medicines:", err);
      setError("Failed to search medicines. Please try again.");
      setResults([]);
      setIsOpen(true);
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  // Trigger search when debounced query changes
  useEffect(() => {
    searchMedicines(debouncedQuery);
  }, [debouncedQuery, searchMedicines]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen || results.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < results.length - 1 ? prev + 1 : prev,
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
      } else if (e.key === "Enter" && selectedIndex >= 0) {
        e.preventDefault();
        handleSelectMedicine(results[selectedIndex]);
      } else if (e.key === "Escape") {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, results, selectedIndex]);

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && resultsRef.current) {
      const selectedElement = resultsRef.current.children[
        selectedIndex
      ] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedIndex]);

  const handleSelectMedicine = (medicine: MedicineStock) => {
    onMedicineSelect(medicine);
    setSearchQuery("");
    setResults([]);
    setIsOpen(false);
    setSelectedIndex(-1);

    // Auto-clear the selected medicine after a short delay if autoClear is enabled
    if (autoClear) {
      setTimeout(() => {
        onMedicineSelect(null);
      }, 100);
    }
  };

  const handleClear = () => {
    setSearchQuery("");
    setResults([]);
    setIsOpen(false);
    setSelectedIndex(-1);
    setError(null);
    inputRef.current?.focus();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextQuery = e.target.value;
    setSearchQuery(nextQuery);
    setError(null);
    // Clear previous query results immediately to avoid selecting stale medicines.
    setResults([]);
    setIsOpen(Boolean(nextQuery.trim()));
    setSelectedIndex(-1);
  };

  const getStatusBadge = (medicine: MedicineStock) => {
    switch (medicine.status) {
      case "low-stock":
        return (
          <Badge variant="destructive" className="text-xs">
            <AlertCircle className="h-3 w-3 mr-1" />
            Low Stock
          </Badge>
        );
      case "expiring-soon":
        return (
          <Badge
            variant="outline"
            className="text-xs border-orange-500 text-orange-600"
          >
            <Clock className="h-3 w-3 mr-1" />
            {medicine.daysToExpiry} days left
          </Badge>
        );
      default:
        return (
          <Badge
            variant="default"
            className="text-xs bg-green-500 hover:bg-green-600"
          >
            <CheckCircle className="h-3 w-3 mr-1" />
            Available
          </Badge>
        );
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={handleInputChange}
          placeholder={placeholder}
          className="pl-9 pr-10"
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
        />
        {searchQuery && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
            onClick={handleClear}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
        {isLoading && (
          <Loader2 className="absolute right-10 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Selected medicine display */}
      {selectedMedicine && !searchQuery && (
        <div className="mt-2 p-3 border rounded-lg bg-muted/50">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium truncate">
                  {selectedMedicine.name}
                </span>
                {getStatusBadge(selectedMedicine)}
              </div>
              <div className="text-xs text-muted-foreground space-y-0.5">
                <div>
                  {selectedMedicine.form} | {selectedMedicine.dosage} |{" "}
                  {selectedMedicine.frequency} | {selectedMedicine.route}
                </div>
                <div>
                  Qty: {selectedMedicine.currentQuantity} | Price: AFN{" "}
                  {selectedMedicine.sellingPrice.toFixed(2)}
                </div>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0"
              onClick={() => onMedicineSelect(null as any)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Autocomplete dropdown */}
      {isOpen &&
        (isLoading ||
          results.length > 0 ||
          error ||
          Boolean(searchQuery.trim())) && (
        <div
          ref={resultsRef}
          className="absolute z-50 w-full mt-1 bg-background border rounded-lg shadow-lg max-h-80 overflow-auto"
        >
          {error ? (
            <div className="p-4 text-sm text-destructive flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          ) : isLoading ? (
            <div className="p-4 text-sm text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching...
            </div>
          ) : results.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground text-center">
              No medicines found
            </div>
          ) : (
            results.map((medicine, index) => (
              <button
                key={medicine._id}
                type="button"
                onClick={() => handleSelectMedicine(medicine)}
                className={cn(
                  "w-full text-left p-3 border-b last:border-b-0 transition-colors",
                  "hover:bg-muted/50 focus:bg-muted/50 focus:outline-none",
                  selectedIndex === index && "bg-muted/50",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium truncate">
                        {medicine.name}
                      </span>
                      {getStatusBadge(medicine)}
                    </div>
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      <div>
                        {medicine.form} | {medicine.dosage} |{" "}
                        {medicine.frequency} | {medicine.route}
                      </div>
                      <div>
                        Qty: {medicine.currentQuantity} | Price: AFN{" "}
                        {medicine.sellingPrice.toFixed(2)}
                      </div>
                      {medicine.supplier && (
                        <div>Supplier: {medicine.supplier}</div>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
