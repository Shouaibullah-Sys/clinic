// app/reception/discounts/new/page.tsx

"use client";

import { useState, useEffect, useRef } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, ArrowLeft, Search } from "lucide-react";
import { Patient } from "@/lib/models/Patient";

interface PatientSearchResult {
  _id: string;
  name: string;
  phone: string;
  guardian?: string;
}

export default function NewDiscountRequestPage() {
  const router = useRouter();
  const { user, accessToken } = useAuthStore();
  const formRef = useRef<HTMLFormElement>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PatientSearchResult[]>([]);
  const [selectedPatient, setSelectedPatient] =
    useState<PatientSearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Check if user has permission
  useEffect(() => {
    if (user && !["admin", "receptionist"].includes(user.role)) {
      router.push("/unauthorized");
    }
  }, [user, router]);

  const handlePatientSearch = async () => {
    if (!searchQuery.trim()) return;

    try {
      const response = await fetch(
        `/api/patients/search?q=${encodeURIComponent(searchQuery)}`,
        {
          headers: {
            "Content-Type": "application/json",
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
        },
      );

      const data = await response.json();

      if (data.success) {
        setSearchResults(data.data);
      } else {
        setError(data.error || "Failed to search patients");
      }
    } catch (error) {
      console.error("Error searching patients:", error);
      setError("Failed to search patients");
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData(formRef.current!);
    const data = {
      patientId: formData.get("patientId"),
      requestedAmount: formData.get("amount"),
      reason: formData.get("reason"),
      requestCategory: formData.get("category"),
      originalAmount: formData.get("originalAmount") || formData.get("amount"),
    };

    // Validation
    if (
      !data.patientId ||
      !data.requestedAmount ||
      !data.reason ||
      !data.requestCategory
    ) {
      setError("Please fill in all required fields");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/dashboard/reception/discounts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        setSuccess("Discount request submitted successfully!");
        // Clear form
        formRef.current?.reset();
        setSelectedPatient(null);
        setSearchResults([]);

        // Redirect after 2 seconds
        setTimeout(() => {
          router.push("/reception/dashboard");
        }, 2000);
      } else {
        setError(result.error || "Failed to create discount request");
      }
    } catch (error) {
      console.error("Error creating discount request:", error);
      setError("Failed to create discount request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!user || !["admin", "receptionist"].includes(user.role)) {
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
    <div className="container mx-auto p-4 md:p-6 max-w-4xl">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        <h1 className="text-2xl md:text-3xl font-bold">New Discount Request</h1>
        <p className="text-gray-500 mt-2">
          Submit a discount request for patient approval
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Discount Request Form</CardTitle>
          <CardDescription>
            Fill in the details below to submit a discount request. All fields
            are required.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mb-6 bg-green-50 text-green-800 border-green-200">
              <AlertCircle className="h-4 w-4 text-green-600" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
            {/* Patient Search */}
            <div className="space-y-4">
              <Label htmlFor="patientSearch">Search Patient</Label>
              <div className="flex gap-2">
                <Input
                  id="patientSearch"
                  placeholder="Search by name, phone, or patient ID"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handlePatientSearch}
                  disabled={!searchQuery.trim()}
                >
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </Button>
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="border rounded-lg p-4 max-h-60 overflow-y-auto">
                  <h3 className="font-semibold mb-2">Select Patient</h3>
                  <div className="space-y-2">
                    {searchResults.map((patient) => (
                      <div
                        key={patient._id}
                        className={`p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${
                          selectedPatient?._id === patient._id
                            ? "bg-blue-50 border-blue-200"
                            : ""
                        }`}
                        onClick={() => {
                          setSelectedPatient(patient);
                          setSearchResults([]);
                        }}
                      >
                        <p className="font-medium">{patient.name}</p>
                        <div className="text-sm text-gray-500">
                          {patient.phone && <span>Phone: {patient.phone}</span>}
                          {patient.guardian && (
                            <span className="ml-4">
                              Guardian: {patient.guardian}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Selected Patient */}
              {selectedPatient && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-green-800">
                        Selected Patient
                      </p>
                      <p className="text-green-700">{selectedPatient.name}</p>
                      <p className="text-sm text-green-600">
                        {selectedPatient.phone}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedPatient(null)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      Clear
                    </Button>
                  </div>
                  <input
                    type="hidden"
                    name="patientId"
                    value={selectedPatient._id}
                  />
                </div>
              )}
            </div>

            {/* Discount Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="category">Discount Category *</Label>
                <Select name="category" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="financial_hardship">
                      Financial Hardship
                    </SelectItem>
                    <SelectItem value="senior_citizen">
                      Senior Citizen
                    </SelectItem>
                    <SelectItem value="staff_discount">
                      Staff Discount
                    </SelectItem>
                    <SelectItem value="insurance_coverage">
                      Insurance Coverage
                    </SelectItem>
                    <SelectItem value="promotional">Promotional</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="originalAmount">Original Amount ($)</Label>
                <Input
                  id="originalAmount"
                  name="originalAmount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  min="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Discount Amount ($) *</Label>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  min="0"
                  required
                />
                <p className="text-xs text-gray-500">
                  The amount to be discounted
                </p>
              </div>
            </div>

            {/* Reason */}
            <div className="space-y-2">
              <Label htmlFor="reason">Reason for Discount *</Label>
              <Textarea
                id="reason"
                name="reason"
                placeholder="Please provide a detailed reason for the discount request..."
                rows={4}
                required
                className="resize-none"
              />
              <p className="text-xs text-gray-500">
                Provide a clear justification for the discount request
              </p>
            </div>

            {/* Submit Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                className="flex-1"
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading || !selectedPatient}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Submitting...
                  </>
                ) : (
                  "Submit Discount Request"
                )}
              </Button>
            </div>

            {!selectedPatient && (
              <Alert className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Please select a patient before submitting the discount
                  request.
                </AlertDescription>
              </Alert>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
