// lib/utils/ml-search.ts - ML-powered search utilities for medicine search

import * as tf from "@tensorflow/tfjs";
import * as use from "@tensorflow-models/universal-sentence-encoder";
import levenshtein from "fast-levenshtein";

// Types
export interface Medicine {
  _id: string;
  name: string;
  form: string;
  dosage: string;
  frequency: string;
  route: string;
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

export interface SpellSuggestion {
  original: string;
  corrected: string;
  confidence: number;
}

export interface AutocompleteSuggestion {
  text: string;
  frequency: number;
  relevance: number;
}

export interface SearchResult {
  medicine: Medicine;
  score: number;
  matchType: "exact" | "fuzzy" | "semantic";
}

// Cache interfaces
interface SearchCache {
  [key: string]: {
    results: SearchResult[];
    timestamp: number;
  };
}

interface EmbeddingCache {
  [key: string]: Float32Array;
}

// Global state
let model: use.UniversalSentenceEncoder | null = null;
let isModelLoading = false;
let modelLoadPromise: Promise<use.UniversalSentenceEncoder> | null = null;

// Caches
const searchCache: SearchCache = {};
const embeddingCache: EmbeddingCache = {};
const searchFrequencyCache: Map<string, number> = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 100;

// ============================================================================
// MODEL LOADING
// ============================================================================

/**
 * Lazy load the Universal Sentence Encoder model
 */
export async function loadModel(): Promise<use.UniversalSentenceEncoder> {
  if (model) {
    return model;
  }

  if (modelLoadPromise) {
    return modelLoadPromise;
  }

  isModelLoading = true;
  modelLoadPromise = (async () => {
    try {
      // Load the model
      model = await use.load();
      isModelLoading = false;
      return model;
    } catch (error) {
      isModelLoading = false;
      console.error("Failed to load TensorFlow.js model:", error);
      throw new Error("Failed to load ML model");
    }
  })();

  return modelLoadPromise;
}

/**
 * Check if model is loaded
 */
export function isModelReady(): boolean {
  return model !== null;
}

/**
 * Check if model is currently loading
 */
export function isModelLoadingState(): boolean {
  return isModelLoading;
}

// ============================================================================
// SPELL CORRECTION
// ============================================================================

/**
 * Calculate Levenshtein distance between two strings
 */
function calculateLevenshteinDistance(str1: string, str2: string): number {
  return levenshtein.get(str1, str2);
}

/**
 * Calculate similarity score based on Levenshtein distance
 */
function calculateSimilarity(str1: string, str2: string): number {
  const distance = calculateLevenshteinDistance(str1, str2);
  const maxLength = Math.max(str1.length, str2.length);
  if (maxLength === 0) return 1;
  return 1 - distance / maxLength;
}

/**
 * Find the best spell correction from a vocabulary
 */
export function findBestSpellCorrection(
  query: string,
  vocabulary: string[],
  threshold: number = 0.7,
): SpellSuggestion | null {
  if (!query || query.length < 2) return null;

  let bestMatch: string | null = null;
  let bestScore = 0;

  for (const word of vocabulary) {
    const similarity = calculateSimilarity(
      query.toLowerCase(),
      word.toLowerCase(),
    );

    if (similarity > bestScore && similarity >= threshold) {
      bestScore = similarity;
      bestMatch = word;
    }
  }

  if (bestMatch && bestMatch.toLowerCase() !== query.toLowerCase()) {
    return {
      original: query,
      corrected: bestMatch,
      confidence: bestScore,
    };
  }

  return null;
}

/**
 * Get spell suggestions for a query
 */
export function getSpellSuggestions(
  query: string,
  vocabulary: string[],
  maxSuggestions: number = 3,
): SpellSuggestion[] {
  if (!query || query.length < 2) return [];

  const suggestions: Array<{ word: string; score: number }> = [];

  for (const word of vocabulary) {
    const similarity = calculateSimilarity(
      query.toLowerCase(),
      word.toLowerCase(),
    );

    if (similarity >= 0.5 && similarity < 1) {
      suggestions.push({ word, score: similarity });
    }
  }

  // Sort by similarity score and return top suggestions
  suggestions.sort((a, b) => b.score - a.score);

  return suggestions.slice(0, maxSuggestions).map((s) => ({
    original: query,
    corrected: s.word,
    confidence: s.score,
  }));
}

/**
 * Build vocabulary from medicine names
 */
export function buildVocabulary(medicines: Medicine[]): string[] {
  const vocabulary = new Set<string>();

  for (const medicine of medicines) {
    // Add full name
    vocabulary.add(medicine.name.toLowerCase());

    // Add individual words from name
    const words = medicine.name.split(/\s+/);
    for (const word of words) {
      if (word.length > 2) {
        vocabulary.add(word.toLowerCase());
      }
    }

    // Add form
    vocabulary.add(medicine.form.toLowerCase());

    // Add dosage
    vocabulary.add(medicine.dosage.toLowerCase());

    // Add frequency
    vocabulary.add(medicine.frequency.toLowerCase());

    // Add route
    vocabulary.add(medicine.route.toLowerCase());

    // Add supplier name words
    const supplierWords = medicine.supplier.split(/\s+/);
    for (const word of supplierWords) {
      if (word.length > 2) {
        vocabulary.add(word.toLowerCase());
      }
    }
  }

  return Array.from(vocabulary);
}

// ============================================================================
// AUTOCOMPLETE
// ============================================================================

/**
 * Generate n-grams from a string
 */
function generateNGrams(text: string, n: number = 2): string[] {
  const ngrams: string[] = [];
  const normalized = text.toLowerCase();

  for (let i = 0; i <= normalized.length - n; i++) {
    ngrams.push(normalized.substring(i, i + n));
  }

  return ngrams;
}

/**
 * Build n-gram index for autocomplete
 */
function buildNGramIndex(
  vocabulary: string[],
  n: number = 2,
): Map<string, Set<string>> {
  const index = new Map<string, Set<string>>();

  for (const word of vocabulary) {
    const ngrams = generateNGrams(word, n);

    for (const ngram of ngrams) {
      if (!index.has(ngram)) {
        index.set(ngram, new Set());
      }
      index.get(ngram)!.add(word);
    }
  }

  return index;
}

/**
 * Get autocomplete suggestions based on query
 */
export function getAutocompleteSuggestions(
  query: string,
  vocabulary: string[],
  frequencyCache: Map<string, number>,
  maxSuggestions: number = 5,
): AutocompleteSuggestion[] {
  if (!query || query.length < 2) return [];

  const normalizedQuery = query.toLowerCase();
  const suggestions: Map<string, { frequency: number; relevance: number }> =
    new Map();

  // Exact matches
  for (const word of vocabulary) {
    if (word.startsWith(normalizedQuery)) {
      const frequency = frequencyCache.get(word) || 0;
      const relevance = 1.0; // Exact prefix match
      suggestions.set(word, { frequency, relevance });
    }
  }

  // Fuzzy matches using n-grams
  const ngramIndex = buildNGramIndex(vocabulary);
  const queryNGrams = generateNGrams(normalizedQuery);

  for (const ngram of queryNGrams) {
    const matches = ngramIndex.get(ngram);
    if (matches) {
      for (const word of matches) {
        if (!suggestions.has(word)) {
          const frequency = frequencyCache.get(word) || 0;
          const relevance = calculateSimilarity(normalizedQuery, word);
          if (relevance >= 0.5) {
            suggestions.set(word, { frequency, relevance });
          }
        }
      }
    }
  }

  // Convert to array and sort
  const sortedSuggestions = Array.from(suggestions.entries())
    .map(([text, data]) => ({
      text,
      frequency: data.frequency,
      relevance: data.relevance,
    }))
    .sort((a, b) => {
      // Primary sort by relevance, secondary by frequency
      if (b.relevance !== a.relevance) {
        return b.relevance - a.relevance;
      }
      return b.frequency - a.frequency;
    })
    .slice(0, maxSuggestions);

  return sortedSuggestions;
}

/**
 * Update search frequency cache
 */
export function updateSearchFrequency(term: string): void {
  const normalized = term.toLowerCase();
  const current = searchFrequencyCache.get(normalized) || 0;
  searchFrequencyCache.set(normalized, current + 1);

  // Limit cache size
  if (searchFrequencyCache.size > MAX_CACHE_SIZE) {
    const entries = Array.from(searchFrequencyCache.entries());
    entries.sort((a, b) => a[1] - b[1]);
    const toRemove = entries.slice(0, entries.length - MAX_CACHE_SIZE);
    for (const [key] of toRemove) {
      searchFrequencyCache.delete(key);
    }
  }
}

/**
 * Get top search terms by frequency
 */
export function getTopSearchTerms(limit: number = 10): string[] {
  return Array.from(searchFrequencyCache.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([term]) => term);
}

// ============================================================================
// SEMANTIC SEARCH
// ============================================================================

/**
 * Get embedding for a text using the loaded model
 */
async function getEmbedding(text: string): Promise<Float32Array> {
  // Check cache first
  const cacheKey = text.toLowerCase();
  if (embeddingCache[cacheKey]) {
    return embeddingCache[cacheKey];
  }

  if (!model) {
    throw new Error("Model not loaded");
  }

  const embeddings = await model.embed([text]);
  const embedding = await embeddings.data();
  const embeddingArray = new Float32Array(embedding);

  // Cache the embedding
  embeddingCache[cacheKey] = embeddingArray;

  // Limit cache size
  const keys = Object.keys(embeddingCache);
  if (keys.length > MAX_CACHE_SIZE) {
    delete embeddingCache[keys[0]];
  }

  return embeddingArray;
}

/**
 * Calculate cosine similarity between two embeddings
 */
function cosineSimilarity(
  embedding1: Float32Array,
  embedding2: Float32Array,
): number {
  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (let i = 0; i < embedding1.length; i++) {
    dotProduct += embedding1[i] * embedding2[i];
    norm1 += embedding1[i] * embedding1[i];
    norm2 += embedding2[i] * embedding2[i];
  }

  return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
}

/**
 * Perform semantic search using embeddings
 */
export async function semanticSearch(
  query: string,
  medicines: Medicine[],
  threshold: number = 0.5,
): Promise<SearchResult[]> {
  if (!model) {
    console.warn("Model not loaded, skipping semantic search");
    return [];
  }

  try {
    const queryEmbedding = await getEmbedding(query);
    const results: SearchResult[] = [];

    for (const medicine of medicines) {
      const medicineEmbedding = await getEmbedding(medicine.name);
      const similarity = cosineSimilarity(queryEmbedding, medicineEmbedding);

      if (similarity >= threshold) {
        results.push({
          medicine,
          score: similarity,
          matchType: "semantic",
        });
      }
    }

    // Sort by similarity score
    results.sort((a, b) => b.score - a.score);

    return results;
  } catch (error) {
    console.error("Error in semantic search:", error);
    return [];
  }
}

// ============================================================================
// FUZZY SEARCH
// ============================================================================

/**
 * Perform fuzzy search using string similarity
 */
export function fuzzySearch(
  query: string,
  medicines: Medicine[],
  threshold: number = 0.6,
): SearchResult[] {
  const normalizedQuery = query.toLowerCase();
  const results: SearchResult[] = [];

  for (const medicine of medicines) {
    // Check name similarity
    const nameSimilarity = calculateSimilarity(
      normalizedQuery,
      medicine.name.toLowerCase(),
    );

    // Check form similarity
    const formSimilarity = calculateSimilarity(
      normalizedQuery,
      medicine.form.toLowerCase(),
    );

    // Check dosage similarity
    const dosageSimilarity = calculateSimilarity(
      normalizedQuery,
      medicine.dosage.toLowerCase(),
    );

    // Check frequency similarity
    const frequencySimilarity = calculateSimilarity(
      normalizedQuery,
      medicine.frequency.toLowerCase(),
    );

    // Check route similarity
    const routeSimilarity = calculateSimilarity(
      normalizedQuery,
      medicine.route.toLowerCase(),
    );

    // Check supplier similarity
    const supplierSimilarity = calculateSimilarity(
      normalizedQuery,
      medicine.supplier.toLowerCase(),
    );

    // Take the maximum similarity
    const maxSimilarity = Math.max(
      nameSimilarity,
      formSimilarity,
      dosageSimilarity,
      frequencySimilarity,
      routeSimilarity,
      supplierSimilarity,
    );

    if (maxSimilarity >= threshold) {
      results.push({
        medicine,
        score: maxSimilarity,
        matchType: "fuzzy",
      });
    }
  }

  // Sort by similarity score
  results.sort((a, b) => b.score - a.score);

  return results;
}

// ============================================================================
// HYBRID SEARCH
// ============================================================================

/**
 * Perform hybrid search combining exact, fuzzy, and semantic results
 */
export async function hybridSearch(
  query: string,
  medicines: Medicine[],
  options: {
    exactWeight?: number;
    fuzzyWeight?: number;
    semanticWeight?: number;
    fuzzyThreshold?: number;
    semanticThreshold?: number;
  } = {},
): Promise<SearchResult[]> {
  const {
    exactWeight = 1.0,
    fuzzyWeight = 0.7,
    semanticWeight = 0.8,
    fuzzyThreshold = 0.6,
    semanticThreshold = 0.5,
  } = options;

  const normalizedQuery = query.toLowerCase();
  const combinedResults = new Map<string, SearchResult>();

  // Exact matches
  for (const medicine of medicines) {
    const nameMatch = medicine.name.toLowerCase() === normalizedQuery;
    const formMatch = medicine.form.toLowerCase() === normalizedQuery;
    const dosageMatch = medicine.dosage.toLowerCase() === normalizedQuery;
    const frequencyMatch = medicine.frequency.toLowerCase() === normalizedQuery;
    const routeMatch = medicine.route.toLowerCase() === normalizedQuery;

    if (nameMatch || formMatch || dosageMatch || frequencyMatch || routeMatch) {
      const existing = combinedResults.get(medicine._id);
      const score = existing ? existing.score + exactWeight : exactWeight;

      combinedResults.set(medicine._id, {
        medicine,
        score,
        matchType: "exact",
      });
    }
  }

  // Fuzzy matches
  const fuzzyResults = fuzzySearch(query, medicines, fuzzyThreshold);
  for (const result of fuzzyResults) {
    const existing = combinedResults.get(result.medicine._id);
    const score = existing
      ? existing.score + result.score * fuzzyWeight
      : result.score * fuzzyWeight;

    combinedResults.set(result.medicine._id, {
      medicine: result.medicine,
      score,
      matchType: existing ? existing.matchType : "fuzzy",
    });
  }

  // Semantic matches (only if model is loaded)
  if (model) {
    try {
      const semanticResults = await semanticSearch(
        query,
        medicines,
        semanticThreshold,
      );
      for (const result of semanticResults) {
        const existing = combinedResults.get(result.medicine._id);
        const score = existing
          ? existing.score + result.score * semanticWeight
          : result.score * semanticWeight;

        combinedResults.set(result.medicine._id, {
          medicine: result.medicine,
          score,
          matchType: existing ? existing.matchType : "semantic",
        });
      }
    } catch (error) {
      console.error("Error in semantic search:", error);
    }
  }

  // Convert to array and sort
  const results = Array.from(combinedResults.values()).sort(
    (a, b) => b.score - a.score,
  );

  return results;
}

// ============================================================================
// CACHING
// ============================================================================

/**
 * Get cached search results
 */
export function getCachedSearch(query: string): SearchResult[] | null {
  const cacheKey = query.toLowerCase();
  const cached = searchCache[cacheKey];

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.results;
  }

  return null;
}

/**
 * Cache search results
 */
export function cacheSearchResults(
  query: string,
  results: SearchResult[],
): void {
  const cacheKey = query.toLowerCase();

  searchCache[cacheKey] = {
    results,
    timestamp: Date.now(),
  };

  // Limit cache size
  const keys = Object.keys(searchCache);
  if (keys.length > MAX_CACHE_SIZE) {
    // Remove oldest entries
    const sortedKeys = keys.sort((a, b) => {
      return searchCache[a].timestamp - searchCache[b].timestamp;
    });

    for (let i = 0; i < sortedKeys.length - MAX_CACHE_SIZE; i++) {
      delete searchCache[sortedKeys[i]];
    }
  }
}

/**
 * Clear all caches
 */
export function clearCaches(): void {
  Object.keys(searchCache).forEach((key) => delete searchCache[key]);
  Object.keys(embeddingCache).forEach((key) => delete embeddingCache[key]);
  searchFrequencyCache.clear();
}

/**
 * Clear expired cache entries
 */
export function clearExpiredCache(): void {
  const now = Date.now();

  Object.keys(searchCache).forEach((key) => {
    if (now - searchCache[key].timestamp >= CACHE_TTL) {
      delete searchCache[key];
    }
  });
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Preload embeddings for a list of medicines
 */
export async function preloadMedicineEmbeddings(
  medicines: Medicine[],
): Promise<void> {
  if (!model) {
    console.warn("Model not loaded, skipping preload");
    return;
  }

  try {
    const names = medicines.map((m) => m.name);
    await model.embed(names);
    console.log(`Preloaded embeddings for ${medicines.length} medicines`);
  } catch (error) {
    console.error("Error preloading embeddings:", error);
  }
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
  searchCacheSize: number;
  embeddingCacheSize: number;
  frequencyCacheSize: number;
} {
  return {
    searchCacheSize: Object.keys(searchCache).length,
    embeddingCacheSize: Object.keys(embeddingCache).length,
    frequencyCacheSize: searchFrequencyCache.size,
  };
}

/**
 * Initialize the ML search system
 */
export async function initializeMLSearch(medicines: Medicine[]): Promise<void> {
  try {
    // Load the model
    await loadModel();

    // Build vocabulary
    const vocabulary = buildVocabulary(medicines);
    console.log(`Built vocabulary with ${vocabulary.length} terms`);

    // Preload embeddings
    await preloadMedicineEmbeddings(medicines);

    console.log("ML search system initialized successfully");
  } catch (error) {
    console.error("Failed to initialize ML search system:", error);
    throw error;
  }
}
