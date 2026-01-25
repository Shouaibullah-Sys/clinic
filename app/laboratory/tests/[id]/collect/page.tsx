//app/laboratory/tests/[id]/collect/page.tsx

"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  ArrowLeft, 
  TestTube, 
  AlertTriangle, 
  CheckCircle, 
  Calendar,
  User,
  Stethoscope,
  CreditCard,
  Clock,
  Plus,
  Trash2,
  Info,
  RefreshCw
} from "lucide-react";
import { format } from "date-fns";
import { useAuthStore } from "@/store/useAuthStore";
import { Skeleton } from "@/components/ui/skeleton";

interface TestInfo {
  _id: string;
  testId: string;
  testName: string;
  patient: {
    name: string;
    patientId: string;
    dateOfBirth?: string;
    age?: number;
    gender?: string;
    phone?: string;
  };
  doctor?: {
    name: string;
  };
  orderedBy?: {
    name: string;
    role?: string;
  };
  priority: string;
  status: string;
  collectionStatus: string;
  paymentVerified: boolean;
  charges: {
    paymentStatus: string;
    paid: number;
    due: number;
  };
  specimen?: {
    type?: string;
    quantity?: string;
    container?: string;
    remarks?: string;
  };
  [key: string]: any; // Allow additional properties
}

interface SampleParameter {
  id: string;
  name: string;
  value: string;
  unit: string;
  remarks: string;
}

const SPECIMEN_TYPES = ["blood", "urine", "stool", "tissue", "saliva", "other"] as const;

// Default parameters for each specimen type
const DEFAULT_PARAMETERS: Record<string, SampleParameter[]> = {
  blood: [
    { id: "1", name: "Volume", value: "", unit: "ml", remarks: "" },
    { id: "2", name: "Color", value: "", unit: "", remarks: "" },
    { id: "3", name: "Clotting", value: "", unit: "", remarks: "" },
    { id: "4", name: "Hemolysis", value: "", unit: "", remarks: "" },
  ],
  urine: [
    { id: "1", name: "Volume", value: "", unit: "ml", remarks: "" },
    { id: "2", name: "Color", value: "", unit: "", remarks: "" },
    { id: "3", name: "Clarity", value: "", unit: "", remarks: "" },
    { id: "4", name: "Specific Gravity", value: "", unit: "", remarks: "" },
  ],
  stool: [
    { id: "1", name: "Consistency", value: "", unit: "", remarks: "" },
    { id: "2", name: "Color", value: "", unit: "", remarks: "" },
    { id: "3", name: "Quantity", value: "", unit: "g", remarks: "" },
    { id: "4", name: "Mucus", value: "", unit: "", remarks: "" },
  ],
  tissue: [
    { id: "1", name: "Type", value: "", unit: "", remarks: "" },
    { id: "2", name: "Size", value: "", unit: "cm", remarks: "" },
    { id: "3", name: "Color", value: "", unit: "", remarks: "" },
    { id: "4", name: "Fixation", value: "", unit: "", remarks: "" },
  ],
  saliva: [
    { id: "1", name: "Volume", value: "", unit: "ml", remarks: "" },
    { id: "2", name: "Color", value: "", unit: "", remarks: "" },
    { id: "3", name: "Viscosity", value: "", unit: "", remarks: "" },
    { id: "4", name: "pH", value: "", unit: "", remarks: "" },
  ],
  other: [
    { id: "1", name: "Description", value: "", unit: "", remarks: "" },
    { id: "2", name: "Quantity", value: "", unit: "", remarks: "" },
    { id: "3", name: "Appearance", value: "", unit: "", remarks: "" },
  ],
};

// Helper function to calculate age
const calculateAge = (dateOfBirth: string | Date): number => {
  if (!dateOfBirth) return 0;
  const dob = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  
  return age;
};

// Helper function to get doctor name
const getDoctorName = (test: TestInfo | null): string => {
  if (!test) return "Doctor not available";
  
  // Try doctor field first
  if (test.doctor?.name) {
    return test.doctor.name.startsWith('Dr. ') 
      ? test.doctor.name 
      : `Dr. ${test.doctor.name}`;
  }
  
  // Try orderedBy if they are a doctor
  if (test.orderedBy?.name && test.orderedBy?.role === 'doctor') {
    const name = test.orderedBy.name;
    return name.startsWith('Dr. ') ? name : `Dr. ${name}`;
  }
  
  // Check if orderedBy has a name (might be a receptionist who ordered it)
  if (test.orderedBy?.name) {
    return test.orderedBy.name;
  }
  
  return "Doctor not assigned";
};

// Format date for display
const formatDate = (dateString?: string): string => {
  if (!dateString) return "N/A";
  try {
    return format(new Date(dateString), 'dd/MM/yyyy');
  } catch {
    return "Invalid date";
  }
};

export default function CollectSamplePage() {
  const params = useParams();
  const router = useRouter();
  const { accessToken } = useAuthStore();
  const [test, setTest] = useState<TestInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [sampleId, setSampleId] = useState("");
  const [sampleCondition, setSampleCondition] = useState("satisfactory");
  const [collectionNotes, setCollectionNotes] = useState("");
  const [sampleConditionNotes, setSampleConditionNotes] = useState("");
  const [confirmPayment, setConfirmPayment] = useState(false);
  const [confirmPatient, setConfirmPatient] = useState(false);
  const [confirmSpecimen, setConfirmSpecimen] = useState(false);
  
  // Dynamic parameters
  const [specimenType, setSpecimenType] = useState<string>("blood");
  const [specimenQuantity, setSpecimenQuantity] = useState("");
  const [specimenContainer, setSpecimenContainer] = useState("");
  const [specimenRemarks, setSpecimenRemarks] = useState("");
  const [parameters, setParameters] = useState<SampleParameter[]>([
    { id: "1", name: "", value: "", unit: "", remarks: "" }
  ]);

  // Generate sample ID
  useEffect(() => {
    if (!sampleId) {
      const date = new Date();
      const year = date.getFullYear().toString().slice(-2);
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      const day = date.getDate().toString().padStart(2, "0");
      const random = Math.floor(1000 + Math.random() * 9000);
      setSampleId(`SMP${year}${month}${day}${random}`);
    }
  }, [sampleId]);

  useEffect(() => {
    fetchTestInfo();
  }, [params.id]);

  const fetchTestInfo = async () => {
    try {
      setLoading(true);
      if (!accessToken) {
        router.push('/login');
        return;
      }

      console.log(`Fetching test info for ID: ${params.id}`);
      
      const response = await fetch(`/api/laboratory/tests/${params.id}/collect/info`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.status === 401) {
        router.push('/login');
        return;
      }
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`Failed to fetch test information: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("API Response data:", data);
      
      if (!data.success) {
        throw new Error(data.error || "API returned unsuccessful response");
      }
      
      // Process the data
      const processedData: TestInfo = {
        ...data.data,
        doctor: data.data.doctor || { name: "Not Assigned" },
        patient: {
          name: data.data.patient?.name || "Unknown Patient",
          patientId: data.data.patient?.patientId || "N/A",
          phone: data.data.patient?.phone || null,
          dateOfBirth: data.data.patient?.dateOfBirth || null,
          age: data.data.patient?.age || 
               (data.data.patient?.dateOfBirth 
                 ? calculateAge(data.data.patient.dateOfBirth) 
                 : undefined),
          gender: data.data.patient?.gender || null
        },
        orderedBy: data.data.orderedBy || null,
        collectionStatus: data.data.collectionStatus || "pending",
        priority: data.data.priority || "routine",
        status: data.data.status || "pending",
        paymentVerified: data.data.paymentVerified || false,
        charges: data.data.charges || {
          paymentStatus: "pending",
          paid: 0,
          due: 0
        }
      };
      
      console.log("Processed test data:", processedData);
      setTest(processedData);

      // Pre-fill specimen type if exists
      if (data.data.specimen?.type) {
        setSpecimenType(data.data.specimen.type);
        setParameters(DEFAULT_PARAMETERS[data.data.specimen.type] || [{ id: "1", name: "", value: "", unit: "", remarks: "" }]);
      }
      
      // Pre-fill other specimen details
      if (data.data.specimen?.quantity) {
        setSpecimenQuantity(data.data.specimen.quantity);
      }
      if (data.data.specimen?.container) {
        setSpecimenContainer(data.data.specimen.container);
      }
      if (data.data.specimen?.remarks) {
        setSpecimenRemarks(data.data.specimen.remarks);
      }
    } catch (err: any) {
      console.error("Error fetching test info:", err);
      setError(err.message || "Failed to load test information");
    } finally {
      setLoading(false);
    }
  };

  // Handle specimen type change
  useEffect(() => {
    if (specimenType && DEFAULT_PARAMETERS[specimenType]) {
      setParameters(DEFAULT_PARAMETERS[specimenType]);
    } else {
      setParameters([{ id: "1", name: "", value: "", unit: "", remarks: "" }]);
    }
  }, [specimenType]);

  const addParameter = () => {
    const newId = (parameters.length + 1).toString();
    setParameters([
      ...parameters,
      { id: newId, name: "", value: "", unit: "", remarks: "" }
    ]);
  };

  const removeParameter = (id: string) => {
    if (parameters.length > 1) {
      setParameters(parameters.filter(p => p.id !== id));
    }
  };

  const updateParameter = (id: string, field: keyof SampleParameter, value: string) => {
    setParameters(parameters.map(param => 
      param.id === id ? { ...param, [field]: value } : param
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!confirmPayment || !confirmPatient || !confirmSpecimen) {
      alert("Please confirm all requirements before collecting sample");
      return;
    }
    
    try {
      setSubmitting(true);
      if (!accessToken) {
        router.push('/login');
        return;
      }
      
      const payload = {
        sampleId,
        sampleCondition,
        collectionNotes,
        sampleConditionNotes,
        specimen: {
          type: specimenType,
          quantity: specimenQuantity,
          container: specimenContainer,
          remarks: specimenRemarks,
          parameters: parameters.filter(p => p.name.trim() && p.value.trim()),
        },
      };
      
      console.log("Submitting sample data:", payload);
      
      const response = await fetch(`/api/laboratory/tests/${params.id}/collect`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      if (response.status === 401) {
        router.push('/login');
        return;
      }
      
      const data = await response.json();
      
      if (response.ok) {
        alert(data.message || "Sample collected successfully!");
        router.push(`/laboratory/tests/${params.id}`);
      } else {
        throw new Error(data.error || "Failed to collect sample");
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Check conditions
  const condition1 = test?.status !== "cancelled";
  const condition2 = (test?.paymentVerified || test?.priority !== "routine");
  const effectiveCollectionStatus = test?.collectionStatus || "pending";
  const condition3 = ["pending", "scheduled"].includes(effectiveCollectionStatus);

  const canCollectSample = condition1 && condition2 && condition3;
  const requiresPaymentVerification = test?.priority === "routine" && !test?.paymentVerified;

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <Skeleton className="h-8 w-64 mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-96 lg:col-span-2" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (error || !test) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Sample Collection</h1>
        </div>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error || "Failed to load test information. Please try again."}
          </AlertDescription>
        </Alert>
        <Button onClick={() => router.push('/laboratory/tests')} className="mt-4">
          Back to Tests
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Collect Sample</h1>
          <p className="text-muted-foreground">
            Collect specimen for test: {test.testName}
          </p>
        </div>
      </div>

      {/* Debug Information (only in development) */}
      {process.env.NODE_ENV === 'development' && (
        <Card className="mb-6 border border-blue-200 dark:border-blue-800 bg-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <h3 className="font-semibold text-blue-800 dark:text-blue-300">Debug Information</h3>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={fetchTestInfo}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 text-sm">
              <div>
                <p className="text-blue-600 dark:text-blue-400">Doctor Found:</p>
                <p className="font-medium text-foreground">{getDoctorName(test)}</p>
              </div>
              <div>
                <p className="text-blue-600 dark:text-blue-400">Patient Age:</p>
                <p className="font-medium text-foreground">
                  {test.patient.age ? `${test.patient.age} years` : "N/A"}
                  {test.patient.dateOfBirth && ` (DOB: ${formatDate(test.patient.dateOfBirth)})`}
                </p>
              </div>
              <div>
                <p className="text-blue-600 dark:text-blue-400">Data Source:</p>
                <p className="font-medium text-foreground">
                  {test.doctor?.name ? "From doctor field" : 
                   test.orderedBy?.role === 'doctor' ? "From orderedBy" : 
                   "Not found"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Show warnings but don't hide form */}
          {requiresPaymentVerification && (
            <Alert className="border border-yellow-200 dark:border-yellow-800 bg-card">
              <CreditCard className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              <AlertTitle className="text-yellow-800 dark:text-yellow-300">Payment Verification Required</AlertTitle>
              <AlertDescription className="text-yellow-700 dark:text-yellow-400">
                This routine test requires payment verification before sample collection.
                {test.charges.due > 0 && (
                  <span className="block mt-1 font-medium">
                    Payment due: ₹{test.charges.due}
                  </span>
                )}
              </AlertDescription>
              <Button 
                variant="outline" 
                className="mt-2 border-yellow-300 dark:border-yellow-700 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/30"
                onClick={() => router.push(`/laboratory/tests/${params.id}/verify-payment`)}
              >
                Verify Payment Now
              </Button>
            </Alert>
          )}

          {!canCollectSample && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Cannot Collect Sample Yet</AlertTitle>
              <AlertDescription>
                Please ensure:
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li>Payment is verified (for routine tests)</li>
                  <li>Collection status is "pending" or "scheduled"</li>
                  <li>Test is not cancelled</li>
                </ul>
                <div className="mt-2 text-sm">
                  <p>Current status:</p>
                  <ul className="list-disc pl-5">
                    <li>Payment Verified: {test.paymentVerified ? "Yes" : "No"}</li>
                    <li>Collection Status: {test.collectionStatus}</li>
                    <li>Test Status: {test.status}</li>
                    <li>Priority: {test.priority}</li>
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* FORM */}
          <form onSubmit={handleSubmit} className="space-y-6 relative">
            {/* Disabled overlay when can't collect */}
            {!canCollectSample && (
              <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 rounded-lg flex items-center justify-center">
                <div className="text-center p-6 bg-card border rounded-lg shadow-lg">
                  <AlertTriangle className="h-12 w-12 mx-auto text-yellow-500 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Form Disabled</h3>
                  <p className="text-muted-foreground mb-4">
                    Complete the requirements above to enable sample collection
                  </p>
                  {requiresPaymentVerification && (
                    <Button 
                      variant="default"
                      onClick={() => router.push(`/laboratory/tests/${params.id}/verify-payment`)}
                    >
                      Verify Payment
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TestTube className="h-5 w-5" />
                  Sample Information
                </CardTitle>
                <CardDescription>
                  Basic sample collection details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Sample ID */}
                <div className="space-y-2">
                  <Label htmlFor="sampleId">Sample ID</Label>
                  <div className="flex gap-2">
                    <Input
                      id="sampleId"
                      value={sampleId}
                      onChange={(e) => setSampleId(e.target.value)}
                      placeholder="Enter sample ID"
                      required
                      disabled={!canCollectSample}
                    />
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={() => {
                        const date = new Date();
                        const year = date.getFullYear().toString().slice(-2);
                        const month = (date.getMonth() + 1).toString().padStart(2, "0");
                        const day = date.getDate().toString().padStart(2, "0");
                        const random = Math.floor(1000 + Math.random() * 9000);
                        setSampleId(`SMP${year}${month}${day}${random}`);
                      }}
                      disabled={!canCollectSample}
                    >
                      Generate
                    </Button>
                  </div>
                </div>

                {/* Sample Condition */}
                <div className="space-y-2">
                  <Label htmlFor="sampleCondition">Sample Condition</Label>
                  <Select 
                    value={sampleCondition} 
                    onValueChange={setSampleCondition}
                    disabled={!canCollectSample}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select sample condition" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="satisfactory">Satisfactory</SelectItem>
                      <SelectItem value="hemolyzed">Hemolyzed</SelectItem>
                      <SelectItem value="clotted">Clotted</SelectItem>
                      <SelectItem value="insufficient">Insufficient Volume</SelectItem>
                      <SelectItem value="contaminated">Contaminated</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Sample Condition Notes */}
                {sampleCondition !== "satisfactory" && (
                  <div className="space-y-2">
                    <Label htmlFor="sampleConditionNotes">Condition Notes</Label>
                    <Textarea
                      id="sampleConditionNotes"
                      value={sampleConditionNotes}
                      onChange={(e) => setSampleConditionNotes(e.target.value)}
                      placeholder="Describe the sample condition issue..."
                      rows={3}
                      disabled={!canCollectSample}
                    />
                  </div>
                )}

                {/* Collection Notes */}
                <div className="space-y-2">
                  <Label htmlFor="collectionNotes">Collection Notes</Label>
                  <Textarea
                    id="collectionNotes"
                    value={collectionNotes}
                    onChange={(e) => setCollectionNotes(e.target.value)}
                    placeholder="Any additional notes about the collection process..."
                    rows={3}
                    disabled={!canCollectSample}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Specimen Details */}
            <Card>
              <CardHeader>
                <CardTitle>Specimen Details</CardTitle>
                <CardDescription>
                  Select specimen type and provide details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="specimenType">Specimen Type *</Label>
                    <Select 
                      value={specimenType} 
                      onValueChange={setSpecimenType}
                      disabled={!canCollectSample}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select specimen type" />
                      </SelectTrigger>
                      <SelectContent>
                        {SPECIMEN_TYPES.map(type => (
                          <SelectItem key={type} value={type}>
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="specimenQuantity">Quantity</Label>
                    <Input
                      id="specimenQuantity"
                      value={specimenQuantity}
                      onChange={(e) => setSpecimenQuantity(e.target.value)}
                      placeholder="e.g., 5ml, 10g"
                      disabled={!canCollectSample}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="specimenContainer">Container</Label>
                    <Input
                      id="specimenContainer"
                      value={specimenContainer}
                      onChange={(e) => setSpecimenContainer(e.target.value)}
                      placeholder="e.g., EDTA tube, sterile container"
                      disabled={!canCollectSample}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="specimenRemarks">Specimen Remarks</Label>
                  <Textarea
                    id="specimenRemarks"
                    value={specimenRemarks}
                    onChange={(e) => setSpecimenRemarks(e.target.value)}
                    placeholder="Any special instructions or observations..."
                    rows={2}
                    disabled={!canCollectSample}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Dynamic Parameters */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Sample Parameters</span>
                  <Button 
                    type="button" 
                    onClick={addParameter} 
                    variant="outline" 
                    size="sm"
                    disabled={!canCollectSample}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Parameter
                  </Button>
                </CardTitle>
                <CardDescription>
                  Record specific characteristics of the sample
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {parameters.map((param) => (
                    <div key={param.id} className="p-4 border rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium">Parameter</h3>
                        {parameters.length > 1 && (
                          <Button
                            type="button"
                            onClick={() => removeParameter(param.id)}
                            variant="ghost"
                            size="sm"
                            className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                            disabled={!canCollectSample}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div className="space-y-2">
                          <Label>Parameter Name</Label>
                          <Input
                            value={param.name}
                            onChange={(e) => updateParameter(param.id, "name", e.target.value)}
                            placeholder="e.g., Volume, Color, pH"
                            disabled={!canCollectSample}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Value</Label>
                          <Input
                            value={param.value}
                            onChange={(e) => updateParameter(param.id, "value", e.target.value)}
                            placeholder="Enter value"
                            disabled={!canCollectSample}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Unit</Label>
                          <Input
                            value={param.unit}
                            onChange={(e) => updateParameter(param.id, "unit", e.target.value)}
                            placeholder="e.g., ml, g, pH"
                            disabled={!canCollectSample}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Remarks</Label>
                          <Input
                            value={param.remarks}
                            onChange={(e) => updateParameter(param.id, "remarks", e.target.value)}
                            placeholder="Optional remarks"
                            disabled={!canCollectSample}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-4 text-sm text-muted-foreground">
                  <p>Default parameters are pre-filled based on specimen type. You can add, remove, or modify them.</p>
                </div>
              </CardContent>
            </Card>

            {/* Confirmation Checks */}
            <Card>
              <CardHeader>
                <CardTitle>Confirmations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Separator />
                
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="confirmPayment"
                    checked={confirmPayment}
                    onCheckedChange={(checked) => setConfirmPayment(checked as boolean)}
                    disabled={!canCollectSample}
                  />
                  <Label htmlFor="confirmPayment" className="leading-none">
                    <div className="font-medium">Payment Verification</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      I confirm that payment has been verified or this is an urgent/emergency test
                    </div>
                  </Label>
                </div>

                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="confirmPatient"
                    checked={confirmPatient}
                    onCheckedChange={(checked) => setConfirmPatient(checked as boolean)}
                    disabled={!canCollectSample}
                  />
                  <Label htmlFor="confirmPatient" className="leading-none">
                    <div className="font-medium">Patient Identity</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      I have verified the patient's identity before sample collection
                    </div>
                  </Label>
                </div>

                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="confirmSpecimen"
                    checked={confirmSpecimen}
                    onCheckedChange={(checked) => setConfirmSpecimen(checked as boolean)}
                    disabled={!canCollectSample}
                  />
                  <Label htmlFor="confirmSpecimen" className="leading-none">
                    <div className="font-medium">Specimen Collection</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      I have followed proper specimen collection procedures and labeling
                    </div>
                  </Label>
                </div>
              </CardContent>
            </Card>

            {/* Submit Button */}
            <div className="flex gap-2">
              <Button 
                type="submit" 
                disabled={submitting || !canCollectSample || !confirmPayment || !confirmPatient || !confirmSpecimen}
                className="flex-1"
                size="lg"
              >
                {submitting ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Collecting Sample...
                  </>
                ) : (
                  <>
                    <TestTube className="h-4 w-4 mr-2" />
                    {canCollectSample ? "Collect Sample" : "Complete Requirements First"}
                  </>
                )}
              </Button>
              <Button 
                type="button" 
                variant="outline"
                onClick={() => router.back()}
                size="lg"
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>

        {/* Sidebar - Test Information */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Test Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Test ID</p>
                <p className="font-medium">{test.testId}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Test Name</p>
                <p className="font-medium">{test.testName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge variant={
                  test.collectionStatus === "pending" ? "secondary" :
                  test.collectionStatus === "scheduled" ? "default" :
                  "outline"
                }>
                  {test.collectionStatus}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Priority</p>
                <Badge variant={
                  test.priority === "emergency" ? "destructive" :
                  test.priority === "urgent" ? "default" :
                  "secondary"
                }>
                  {test.priority}
                </Badge>
              </div>
              {test.specimen?.type && (
                <div>
                  <p className="text-sm text-muted-foreground">Specimen Type</p>
                  <p className="font-medium capitalize">{test.specimen.type}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Patient Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium">{test.patient.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Patient ID</p>
                <p className="font-medium">{test.patient.patientId}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Age</p>
                <p className="font-medium">
                  {test.patient.age ? `${test.patient.age} years` : "N/A"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Gender</p>
                <p className="font-medium capitalize">{test.patient.gender || "N/A"}</p>
              </div>
              {test.patient.phone && (
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{test.patient.phone}</p>
                </div>
              )}
              {test.patient.dateOfBirth && (
                <div>
                  <p className="text-sm text-muted-foreground">Date of Birth</p>
                  <p className="font-medium">
                    {formatDate(test.patient.dateOfBirth)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Stethoscope className="h-5 w-5" />
                Doctor Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Doctor</p>
                <p className="font-medium">
                  {getDoctorName(test)}
                </p>
              </div>
              {test.orderedBy && (
                <div>
                  <p className="text-sm text-muted-foreground">Ordered By</p>
                  <p className="font-medium">
                    {test.orderedBy.name}
                    {test.orderedBy.role && ` (${test.orderedBy.role})`}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Payment Status</p>
                <div className="flex items-center gap-2">
                  <Badge variant={
                    test.paymentVerified ? "default" :
                    test.charges.paymentStatus === "paid" ? "default" :
                    test.charges.paymentStatus === "partial" ? "secondary" :
                    "destructive"
                  }>
                    {test.paymentVerified ? "Verified" : test.charges.paymentStatus}
                  </Badge>
                  {test.paymentVerified && (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  )}
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Paid Amount</p>
                <p className="font-medium text-green-600 dark:text-green-400">₹{test.charges.paid}</p>
              </div>
              {test.charges.due > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground">Due Amount</p>
                  <p className="font-medium text-red-600 dark:text-red-400">₹{test.charges.due}</p>
                </div>
              )}
              {test.priority === "routine" && !test.paymentVerified && (
                <Alert variant="destructive" className="mt-2">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Payment verification required for routine tests
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}