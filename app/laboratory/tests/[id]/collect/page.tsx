// app/laboratory/tests/[id]/collect/page.tsx

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
  };
  doctor: {
    name: string;
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
        throw new Error('Failed to fetch test information');
      }
      
      const data = await response.json();
      setTest(data.data);
      
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
      setError(err.message);
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
  // Handle undefined/null collectionStatus as "pending" (default)
  const effectiveCollectionStatus = test?.collectionStatus || "pending";
  const condition3 = ["pending", "scheduled"].includes(effectiveCollectionStatus);

  const canCollectSample = condition1 && condition2 && condition3;
  const requiresPaymentVerification = test?.priority === "routine" && !test?.paymentVerified;
  const canProceed = test?.priority !== "routine" || test?.paymentVerified;

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

      {/* Debug Information */}
      <Card className="mb-6 bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Info className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold text-blue-800">Collection Status</h3>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={fetchTestInfo}
              className="text-blue-600 hover:text-blue-800"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
            <div>
              <span className="text-blue-600">Collection Status:</span>
              <span className={`font-medium ml-2 ${test.collectionStatus === "pending" ? "text-yellow-600" : "text-green-600"}`}>
                {test.collectionStatus}
              </span>
            </div>
            <div>
              <span className="text-blue-600">Payment Verified:</span>
              <span className={`font-medium ml-2 ${test.paymentVerified ? "text-green-600" : "text-red-600"}`}>
                {test.paymentVerified ? "Yes" : "No"}
              </span>
            </div>
            <div>
              <span className="text-blue-600">Priority:</span>
              <span className="font-medium ml-2 capitalize">{test.priority}</span>
            </div>
            <div>
              <span className="text-blue-600">Can Collect:</span>
              <span className={`font-medium ml-2 ${canCollectSample ? "text-green-600" : "text-red-600"}`}>
                {canCollectSample ? "Yes" : "No"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form - ALWAYS SHOW THIS */}
        <div className="lg:col-span-2 space-y-6">
          {/* Show warnings but don't hide form */}
          {requiresPaymentVerification && (
            <Alert className="bg-yellow-50 border-yellow-200">
              <CreditCard className="h-4 w-4 text-yellow-600" />
              <AlertTitle className="text-yellow-800">Payment Verification Required</AlertTitle>
              <AlertDescription className="text-yellow-700">
                This routine test requires payment verification before sample collection.
                {test.charges.due > 0 && (
                  <span className="block mt-1 font-medium">
                    Payment due: ₹{test.charges.due}
                  </span>
                )}
              </AlertDescription>
              <Button 
                variant="outline" 
                className="mt-2 border-yellow-300 text-yellow-700 hover:bg-yellow-100"
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
              </AlertDescription>
            </Alert>
          )}

          {/* FORM - ALWAYS VISIBLE */}
          <form onSubmit={handleSubmit} className="space-y-6 relative">
            {/* Disabled overlay when can't collect */}
            {!canCollectSample && (
              <div className="absolute inset-0 bg-white/70 backdrop-blur-sm z-10 rounded-lg flex items-center justify-center">
                <div className="text-center p-6 bg-white border rounded-lg shadow-lg">
                  <AlertTriangle className="h-12 w-12 mx-auto text-yellow-500 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Form Disabled</h3>
                  <p className="text-gray-600 mb-4">
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
                            className="text-red-600 hover:text-red-700"
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
                <Badge className={
                  test.collectionStatus === "pending" ? "bg-yellow-100 text-yellow-800" :
                  test.collectionStatus === "scheduled" ? "bg-blue-100 text-blue-800" :
                  "bg-gray-100 text-gray-800"
                }>
                  {test.collectionStatus}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Priority</p>
                <Badge className={
                  test.priority === "emergency" ? "bg-red-100 text-red-800 border-red-300" :
                  test.priority === "urgent" ? "bg-orange-100 text-orange-800 border-orange-300" :
                  "bg-blue-100 text-blue-800 border-blue-300"
                }>
                  {test.priority}
                </Badge>
              </div>
              {test.specimen?.type && (
                <div>
                  <p className="text-sm text-muted-foreground">Specimen Type</p>
                  <p className="font-medium">{test.specimen.type}</p>
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
                  {test.doctor?.name 
                    ? `Dr. ${test.doctor.name}`
                    : test.doctor 
                      ? test.doctor.toString() 
                      : 'Doctor not assigned'
                  }
                </p>
              </div>
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
                  <Badge className={
                    test.paymentVerified ? "bg-green-100 text-green-800" :
                    test.charges.paymentStatus === "paid" ? "bg-green-100 text-green-800" :
                    test.charges.paymentStatus === "partial" ? "bg-yellow-100 text-yellow-800" :
                    "bg-red-100 text-red-800"
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
                <p className="font-medium text-green-600">₹{test.charges.paid}</p>
              </div>
              {test.charges.due > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground">Due Amount</p>
                  <p className="font-medium text-red-600">₹{test.charges.due}</p>
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