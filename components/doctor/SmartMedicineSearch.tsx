// app/components/doctor/SmartMedicineSearch.tsx - ENHANCED WITH ML
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  Sparkles,
  Lightbulb,
  ChevronDown,
  Brain,
  Loader2,
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { toast } from "sonner";
import {
  loadModel,
  isModelReady,
  isModelLoadingState,
  findBestSpellCorrection,
  getSpellSuggestions,
  buildVocabulary,
  getAutocompleteSuggestions,
  updateSearchFrequency,
  hybridSearch,
  getCachedSearch,
  cacheSearchResults,
  initializeMLSearch,
  type Medicine,
  type SpellSuggestion,
  type AutocompleteSuggestion,
  type SearchResult,
} from "@/lib/utils/ml-search";

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
  // Existing state
  const [searchQuery, setSearchQuery] = useState("");
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const { accessToken } = useAuthStore();

  // New ML state
  const [mlModelLoading, setMlModelLoading] = useState(false);
  const [mlModelReady, setMlModelReady] = useState(false);
  const [spellCorrection, setSpellCorrection] =
    useState<SpellSuggestion | null>(null);
  const [spellSuggestions, setSpellSuggestions] = useState<SpellSuggestion[]>(
    [],
  );
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState<
    AutocompleteSuggestion[]
  >([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [vocabulary, setVocabulary] = useState<string[]>([]);
  const [allMedicines, setAllMedicines] = useState<Medicine[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [usingMLSearch, setUsingMLSearch] = useState(false);

  // Initialize ML model on mount
  useEffect(() => {
    const initializeML = async () => {
      try {
        setMlModelLoading(true);
        await loadModel();
        setMlModelReady(true);
        setMlModelLoading(false);
        console.log("ML model loaded successfully");
      } catch (error) {
        console.error("Failed to load ML model:", error);
        setMlModelLoading(false);
        // Don't show error toast - ML features are optional
      }
    };

    initializeML();
  }, []);

  // Fetch all medicines for ML features
  useEffect(() => {
    const fetchAllMedicines = async () => {
      try {
        const response = await fetch(
          "/api/pharmacy/medicines/search?q=&limit=1000",
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
            setAllMedicines(result.data);
            const vocab = buildVocabulary(result.data);
            setVocabulary(vocab);
            console.log(
              `Loaded ${result.data.length} medicines for ML features`,
            );
          }
        }
      } catch (error) {
        console.error("Error fetching medicines for ML:", error);
      }
    };

    fetchAllMedicines();
  }, [accessToken]);

  // Debounced search with ML enhancements
  const debouncedSearch = useMemo(() => searchQuery, [searchQuery]);

  useEffect(() => {
    const performSearch = async () => {
      if (debouncedSearch.length < 2) {
        setMedicines([]);
        setSearchResults([]);
        setShowResults(false);
        setSpellCorrection(null);
        setSpellSuggestions([]);
        setAutocompleteSuggestions([]);
        setShowAutocomplete(false);
        return;
      }

      setLoading(true);
      setUsingMLSearch(false);

      try {
        // Check cache first
        const cachedResults = getCachedSearch(debouncedSearch);
        if (cachedResults && cachedResults.length > 0) {
          setSearchResults(cachedResults);
          setMedicines(cachedResults.map((r) => r.medicine));
          setLastUpdated(new Date());
          setShowResults(true);
          setLoading(false);
          return;
        }

        // Perform API search
        const response = await fetch(
          `/api/pharmacy/medicines/search?q=${encodeURIComponent(debouncedSearch)}&limit=20`,
          {
            headers: {
              "Content-Type": "application/json",
              ...(accessToken
                ? { Authorization: `Bearer ${accessToken}` }
                : {}),
            },
          },
        );

        if (!response.ok) {
          throw new Error("Failed to search medicines");
        }

        const result = await response.json();

        if (result.success && result.data) {
          const apiMedicines = result.data;

          // Perform ML-enhanced search if model is ready
          if (mlModelReady && allMedicines.length > 0) {
            setUsingMLSearch(true);

            // Perform hybrid search combining API results with ML predictions
            const mlResults = await hybridSearch(
              debouncedSearch,
              allMedicines,
              {
                exactWeight: 1.0,
                fuzzyWeight: 0.7,
                semanticWeight: 0.8,
                fuzzyThreshold: 0.6,
                semanticThreshold: 0.5,
              },
            );

            // Combine API results with ML results, prioritizing exact matches
            const combinedResults = new Map<string, SearchResult>();

            // Add API results with high score
            for (const medicine of apiMedicines) {
              combinedResults.set(medicine._id, {
                medicine,
                score: 1.0,
                matchType: "exact",
              });
            }

            // Add ML results
            for (const mlResult of mlResults) {
              const existing = combinedResults.get(mlResult.medicine._id);
              if (existing) {
                // Keep the higher score
                if (mlResult.score > existing.score) {
                  combinedResults.set(mlResult.medicine._id, mlResult);
                }
              } else {
                combinedResults.set(mlResult.medicine._id, mlResult);
              }
            }

            // Convert to array and sort
            const finalResults = Array.from(combinedResults.values())
              .sort((a, b) => b.score - a.score)
              .slice(0, 20);

            setSearchResults(finalResults);
            setMedicines(finalResults.map((r) => r.medicine));

            // Cache the results
            cacheSearchResults(debouncedSearch, finalResults);
          } else {
            // Use API results only
            const apiResults = apiMedicines.map((m: Medicine) => ({
              medicine: m,
              score: 1.0,
              matchType: "exact" as const,
            }));
            setSearchResults(apiResults);
            setMedicines(apiMedicines);
          }

          setLastUpdated(new Date());
          setShowResults(true);

          // Update search frequency
          updateSearchFrequency(debouncedSearch);
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
  }, [debouncedSearch, accessToken, mlModelReady, allMedicines]);

  // Spell correction
  useEffect(() => {
    if (searchQuery.length >= 3 && vocabulary.length > 0) {
      const correction = findBestSpellCorrection(searchQuery, vocabulary, 0.7);
      setSpellCorrection(correction);

      const suggestions = getSpellSuggestions(searchQuery, vocabulary, 3);
      setSpellSuggestions(suggestions);
    } else {
      setSpellCorrection(null);
      setSpellSuggestions([]);
    }
  }, [searchQuery, vocabulary]);

  // Autocomplete suggestions
  useEffect(() => {
    if (searchQuery.length >= 2 && vocabulary.length > 0) {
      const suggestions = getAutocompleteSuggestions(
        searchQuery,
        vocabulary,
        new Map<string, number>(), // Empty frequency cache for now
        5,
      );
      setAutocompleteSuggestions(suggestions);
      setShowAutocomplete(suggestions.length > 0);
    } else {
      setAutocompleteSuggestions([]);
      setShowAutocomplete(false);
    }
  }, [searchQuery, vocabulary]);

  const handleSelectMedicine = (medicine: Medicine) => {
    // Check if medicine is already selected
    const isAlreadySelected = selectedMedicines.some(
      (selected) => selected._id === medicine._id,
    );

    if (isAlreadySelected) {
      toast.warning("This medicine is already selected");
      return;
    }

    // Warn about low stock
    if (medicine.isLowStock) {
      toast.warning(
        `Warning: ${medicine.name} is low in stock (${medicine.currentQuantity} remaining)`,
      );
    }

    onSelectMedicine(medicine);
    setSearchQuery("");
    setShowResults(false);
    setShowAutocomplete(false);
    setSpellCorrection(null);
  };

  const handleApplySpellCorrection = (correction: SpellSuggestion) => {
    setSearchQuery(correction.corrected);
    setSpellCorrection(null);
    setSpellSuggestions([]);
  };

  const handleSelectAutocomplete = (suggestion: AutocompleteSuggestion) => {
    setSearchQuery(suggestion.text);
    setShowAutocomplete(false);
  };

  // Enhanced stock warning level function
  const getStockWarningLevel = (
    quantity: number,
    remainingPercentage: number,
  ) => {
    if (quantity === 0)
      return {
        level: "Out of Stock",
        color: "text-destructive",
        icon: AlertCircle,
      };
    if (remainingPercentage <= 10)
      return {
        level: "Very Low",
        color: "text-destructive",
        icon: TrendingDown,
      };
    if (remainingPercentage <= 25)
      return { level: "Low", color: "text-orange-500", icon: TrendingDown };
    if (remainingPercentage <= 50)
      return { level: "Moderate", color: "text-yellow-500", icon: TrendingUp };
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
    if (percentage <= 20) return "text-destructive";
    if (percentage <= 50) return "text-yellow-500";
    return "text-green-500";
  };

  const getMatchTypeBadge = (matchType: string) => {
    switch (matchType) {
      case "exact":
        return (
          <Badge
            variant="default"
            className="text-xs bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20"
          >
            Exact
          </Badge>
        );
      case "fuzzy":
        return (
          <Badge
            variant="outline"
            className="text-xs bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20"
          >
            Fuzzy
          </Badge>
        );
      case "semantic":
        return (
          <Badge
            variant="outline"
            className="text-xs bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20"
          >
            Semantic
          </Badge>
        );
      default:
        return null;
    }
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 0.9) return "text-green-600 dark:text-green-400";
    if (score >= 0.7) return "text-yellow-600 dark:text-yellow-400";
    return "text-orange-600 dark:text-orange-400";
  };

  return (
    <div className="relative">
      {/* ML Model Loading Indicator */}
      {mlModelLoading && (
        <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground p-2 rounded-lg bg-muted/50">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span>Loading ML model for smart search...</span>
        </div>
      )}

      {/* ML Model Ready Indicator */}
      {mlModelReady && !mlModelLoading && (
        <div className="mb-2 flex items-center gap-2 text-sm text-green-700 dark:text-green-400 p-2 rounded-lg bg-green-500/10 border border-green-500/20">
          <Brain className="h-4 w-4 text-green-600 dark:text-green-400" />
          <span>ML-powered search active</span>
          <Sparkles className="h-4 w-4 text-green-600 dark:text-green-400" />
        </div>
      )}

      {/* Spell Correction Suggestion */}
      {spellCorrection && (
        <Card className="mb-2 p-2 border-yellow-500/20 bg-yellow-500/10 dark:bg-yellow-500/5">
          <div className="flex items-center gap-2 text-sm">
            <Lightbulb className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            <span className="text-yellow-800 dark:text-yellow-200">
              Did you mean: <strong>{spellCorrection.corrected}</strong>?
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-800 dark:text-yellow-200"
              onClick={() => handleApplySpellCorrection(spellCorrection)}
            >
              Apply
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs text-yellow-600 dark:text-yellow-400 hover:text-yellow-800 dark:hover:text-yellow-200"
              onClick={() => setSpellCorrection(null)}
            >
              Dismiss
            </Button>
          </div>
        </Card>
      )}

      {/* Search Input */}
      <div className="flex items-center gap-2 mb-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => {
              if (searchQuery.length >= 2) {
                setShowResults(true);
                if (autocompleteSuggestions.length > 0) {
                  setShowAutocomplete(true);
                }
              }
            }}
            onBlur={() => {
              // Delay hiding to allow click events
              setTimeout(() => {
                setShowAutocomplete(false);
              }, 200);
            }}
            placeholder={placeholder}
            disabled={disabled}
            className="pl-10"
          />
          {loading && (
            <RefreshCw className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
          )}
          {mlModelReady && !loading && (
            <Brain className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-primary" />
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setSearchQuery("");
            setShowResults(false);
            setShowAutocomplete(false);
            setSpellCorrection(null);
          }}
          disabled={disabled}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Autocomplete Suggestions */}
      {showAutocomplete &&
        autocompleteSuggestions.length > 0 &&
        !showResults && (
          <Popover open={showAutocomplete} onOpenChange={setShowAutocomplete}>
            <PopoverTrigger asChild>
              <div className="absolute top-full left-0 right-0 z-50" />
            </PopoverTrigger>
            <PopoverContent
              className="w-full p-0"
              align="start"
              side="bottom"
              sideOffset={4}
            >
              <ScrollArea className="max-h-40">
                <div className="p-2">
                  {autocompleteSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => handleSelectAutocomplete(suggestion)}
                      className="w-full text-left px-3 py-2 hover:bg-accent rounded-md transition-colors flex items-center justify-between"
                    >
                      <span className="text-sm">{suggestion.text}</span>
                      <div className="flex items-center gap-2">
                        {suggestion.relevance >= 0.8 && (
                          <Sparkles className="h-3 w-3 text-yellow-500 dark:text-yellow-400" />
                        )}
                        <span className="text-xs text-muted-foreground">
                          {Math.round(suggestion.relevance * 100)}% match
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </PopoverContent>
          </Popover>
        )}

      {/* Search Results */}
      {showResults && medicines.length > 0 && (
        <Card className="absolute top-full left-0 right-0 z-50 max-h-96 overflow-hidden shadow-lg">
          <div className="p-3 border-b bg-muted/50">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <span>{medicines.length} results found</span>
                {usingMLSearch && (
                  <Badge
                    variant="outline"
                    className="text-xs bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20"
                  >
                    <Brain className="h-3 w-3 mr-1" />
                    ML Enhanced
                  </Badge>
                )}
              </div>
              {lastUpdated && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Updated {lastUpdated.toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>

          <ScrollArea className="max-h-80">
            <div className="divide-y divide-border">
              {medicines.map((medicine) => {
                const searchResult = searchResults.find(
                  (r) => r.medicine._id === medicine._id,
                );
                const stockWarning = getStockWarningLevel(
                  medicine.currentQuantity,
                  medicine.remainingPercentage,
                );
                const StockIcon = stockWarning.icon;

                return (
                  <button
                    key={medicine._id}
                    onClick={() => handleSelectMedicine(medicine)}
                    className="w-full text-left p-3 hover:bg-accent transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Pill className="h-4 w-4 text-primary" />
                          <span className="font-medium text-sm">
                            {medicine.name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            ({medicine.form} - {medicine.dosage})
                          </span>
                          {searchResult &&
                            getMatchTypeBadge(searchResult.matchType)}
                        </div>

                        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
                          <span>Supplier: {medicine.supplier}</span>
                          <span>
                            Expiry:{" "}
                            {new Date(medicine.expiryDate).toLocaleDateString()}
                          </span>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-medium ${getStockColor(medicine.remainingPercentage)}`}
                            >
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

                        {/* Confidence Score */}
                        {searchResult && searchResult.matchType !== "exact" && (
                          <div className="mt-2 flex items-center gap-2">
                            <Sparkles className="h-3 w-3 text-yellow-500 dark:text-yellow-400" />
                            <span
                              className={`text-xs font-medium ${getConfidenceColor(searchResult.score)}`}
                            >
                              {Math.round(searchResult.score * 100)}% confidence
                            </span>
                          </div>
                        )}

                        {/* Stock warning display */}
                        <div className="mt-2 flex items-center gap-2">
                          <StockIcon
                            className={`h-3 w-3 ${stockWarning.color}`}
                          />
                          <span
                            className={`text-xs ${stockWarning.color} font-medium`}
                          >
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
          </ScrollArea>
        </Card>
      )}

      {/* No Results */}
      {showResults &&
        medicines.length === 0 &&
        !loading &&
        searchQuery.length >= 2 && (
          <Card className="absolute top-full left-0 right-0 z-50 shadow-lg">
            <div className="p-4 text-center text-muted-foreground">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
              <p className="mb-2">No medicines found for "{searchQuery}"</p>
              {spellSuggestions.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm font-medium mb-2">
                    Try these suggestions:
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {spellSuggestions.map((suggestion, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => handleApplySpellCorrection(suggestion)}
                      >
                        {suggestion.corrected}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

      {/* Selected Medicines */}
      {selectedMedicines.length > 0 && (
        <div className="mt-4">
          <Label className="text-sm font-medium mb-2 block">
            Selected Medicines
          </Label>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {selectedMedicines.map((medicine) => {
              const stockWarning = getStockWarningLevel(
                medicine.currentQuantity,
                medicine.remainingPercentage,
              );
              const StockIcon = stockWarning.icon;

              return (
                <Card
                  key={medicine._id}
                  className="flex items-center justify-between p-3 border"
                >
                  <div className="flex items-center gap-2">
                    <Pill className="h-4 w-4 text-primary" />
                    <div>
                      <div className="font-medium text-sm">{medicine.name}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <StockIcon
                          className={`h-3 w-3 ${stockWarning.color}`}
                        />
                        <span className={stockWarning.color}>
                          {stockWarning.level}
                        </span>
                        <span>• {medicine.currentQuantity} in stock</span>
                        <span>• ${medicine.sellingPrice.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                  <Badge
                    variant={medicine.isLowStock ? "destructive" : "default"}
                  >
                    {medicine.isLowStock ? "Low Stock" : "Available"}
                  </Badge>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
