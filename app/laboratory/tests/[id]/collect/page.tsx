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
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ArrowLeft, 
  TestTube, 
  AlertTriangle, 
  CheckCircle, 
  Calendar,
  User,
  Stethoscope,
  CreditCard,
  Clock
} from "lucide-react";
import { format } from "date-fns";

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
  };
}

export default function CollectSamplePage() {
  const params = useParams();
  const router = useRouter();
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
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/laboratory/tests/${params.id}/collect?info=true`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch test information');
      }
      
      const data = await response.json();
      setTest(data.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!confirmPayment || !confirmPatient || !confirmSpecimen) {
      alert("Please confirm all requirements before collecting sample");
      return;
    }
    
    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch(`/api/laboratory/tests/${params.id}/collect`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sampleId,
          sampleCondition,
          collectionNotes,
          sampleConditionNotes,
        }),
      });
      
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

  // Check if sample can be collected
  const canCollectSample = test.collectionStatus === "pending" || test.collectionStatus === "scheduled";
  const requiresPaymentVerification = test.priority === "routine" && !test.paymentVerified;
  const canProceed = test.priority !== "routine" || test.paymentVerified;

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {!canCollectSample && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Cannot Collect Sample</AlertTitle>
              <AlertDescription>
                Sample collection is not available for this test. Current status: {test.collectionStatus}
              </AlertDescription>
            </Alert>
          )}

          {requiresPaymentVerification && (
            <Alert>
              <CreditCard className="h-4 w-4" />
              <AlertTitle>Payment Verification Required</AlertTitle>
              <AlertDescription>
                This routine test requires payment verification before sample collection.
                {test.charges.due > 0 && (
                  <span className="block mt-1 font-medium">
                    Payment due: ₹{test.charges.due}
                  </span>
                )}
              </AlertDescription>
              <Button 
                variant="outline" 
                className="mt-2"
                onClick={() => router.push(`/laboratory/tests/${params.id}/verify-payment`)}
              >
                Verify Payment
              </Button>
            </Alert>
          )}

          {canCollectSample && canProceed && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TestTube className="h-5 w-5" />
                  Sample Collection Details
                </CardTitle>
                <CardDescription>
                  Record sample collection information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
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
                    />
                  </div>

                  {/* Confirmation Checks */}
                  <div className="space-y-4">
                    <Separator />
                    <h3 className="font-medium">Confirmations</h3>
                    
                    <div className="flex items-start space-x-2">
                      <Checkbox
                        id="confirmPayment"
                        checked={confirmPayment}
                        onCheckedChange={(checked) => setConfirmPayment(checked as boolean)}
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
                      />
                      <Label htmlFor="confirmSpecimen" className="leading-none">
                        <div className="font-medium">Specimen Collection</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          I have followed proper specimen collection procedures and labeling
                        </div>
                      </Label>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="flex gap-2">
                    <Button 
                      type="submit" 
                      disabled={submitting || !confirmPayment || !confirmPatient || !confirmSpecimen}
                      className="flex-1"
                    >
                      {submitting ? (
                        <>
                          <Clock className="h-4 w-4 mr-2 animate-spin" />
                          Collecting...
                        </>
                      ) : (
                        <>
                          <TestTube className="h-4 w-4 mr-2" />
                          Collect Sample
                        </>
                      )}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={() => router.back()}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
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