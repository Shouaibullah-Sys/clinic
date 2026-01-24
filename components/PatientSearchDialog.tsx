// components/PatientSearchDialog.tsx

"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, User, Phone, Calendar, FileText, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

interface Patient {
  _id: string;
  name: string;
  patientId: string;
  phone: string;
  email?: string;
  dateOfBirth?: string;
  age?: number;
  gender?: string;
  bloodGroup?: string;
  address?: string;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  medicalHistory?: string[];
  allergies?: string[];
  lastVisit?: string;
}

interface PatientSearchDialogProps {
  onSelect: (patient: Patient) => void;
  trigger?: React.ReactNode;
}

export function PatientSearchDialog({ onSelect, trigger }: PatientSearchDialogProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  // Search patients
  const searchPatients = async () => {
    if (!searchQuery.trim()) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/patients/search?q=${encodeURIComponent(searchQuery)}`);
      
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.data || []);
      }
    } catch (error) {
      console.error("Error searching patients:", error);
    } finally {
      setLoading(false);
    }
  };

  // Handle search
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery.trim()) {
        searchPatients();
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  // Handle patient selection
  const handleSelect = (patient: Patient) => {
    setSelectedPatient(patient);
  };

  // Handle confirm
  const handleConfirm = () => {
    if (selectedPatient) {
      onSelect(selectedPatient);
      setOpen(false);
      setSelectedPatient(null);
      setSearchQuery("");
      setSearchResults([]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline">
            <Search className="h-4 w-4 mr-2" />
            Search Patient
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Search Patient</DialogTitle>
          <DialogDescription>
            Search for patient by name, ID, or phone number
          </DialogDescription>
        </DialogHeader>

        {/* Search Input */}
        <div className="space-y-2">
          <Label htmlFor="patient-search">Search</Label>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="patient-search"
              placeholder="Search by name, patient ID, or phone..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Search Results */}
        <div className="space-y-4 max-h-100 overflow-y-auto">
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : searchResults.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {searchResults.length} patient{searchResults.length !== 1 ? 's' : ''} found
              </p>
              {searchResults.map((patient) => (
                <div
                  key={patient._id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedPatient?._id === patient._id
                      ? 'border-primary bg-primary/5'
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => handleSelect(patient)}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{patient.name}</h3>
                        {selectedPatient?._id === patient._id && (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          {patient.patientId}
                        </div>
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {patient.phone}
                        </div>
                        {patient.age && (
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {patient.age}y, {patient.gender}
                          </div>
                        )}
                      </div>
                      {patient.bloodGroup && (
                        <Badge variant="outline" className="mt-1">
                          Blood Group: {patient.bloodGroup}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : searchQuery ? (
            <div className="text-center py-8">
              <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No patients found</h3>
              <p className="text-muted-foreground mt-2">
                No patients match your search criteria.
              </p>
            </div>
          ) : null}
        </div>

        {/* Selected Patient Preview */}
        {selectedPatient && (
          <div className="p-4 border rounded-lg bg-muted/30">
            <h3 className="font-medium mb-2">Selected Patient</h3>
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">{selectedPatient.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Patient ID</p>
                  <p className="font-medium">{selectedPatient.patientId}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{selectedPatient.phone}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Age / Gender</p>
                  <p className="font-medium">
                    {selectedPatient.age ? `${selectedPatient.age} years` : 'N/A'} / {selectedPatient.gender || 'N/A'}
                  </p>
                </div>
              </div>
              {selectedPatient.allergies && selectedPatient.allergies.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground">Allergies</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedPatient.allergies.map((allergy, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {allergy}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setOpen(false);
              setSelectedPatient(null);
              setSearchQuery("");
              setSearchResults([]);
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedPatient}
          >
            Select Patient
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}