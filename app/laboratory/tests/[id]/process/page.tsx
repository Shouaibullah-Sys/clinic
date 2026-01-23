// app/laboratory/tests/[id]/process/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ArrowLeft, 
  TestTube, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Activity,
  PlayCircle,
  StopCircle,
  XCircle,
  Save
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
  priority: string;
  processingStatus: string;
  collectionStatus: string;
  paymentVerified: boolean;
  specimen?: {
    type?: string;
    collectionTime?: string;
  };
  collectionDetails?: {
    sampleId?: string;
    sampleCondition?: string;
  };
}

export default function ProcessTestPage() {
  const params = useParams();
  const router = useRouter();
  const [test, setTest] = useState<TestInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [action, setAction] = useState<"start" | "complete" | "fail">("start");
  const [equipmentUsed, setEquipmentUsed] = useState("");
  const [reagentsUsed, setReagentsUsed] = useState("");
  const [qualityControlPassed, setQualityControlPassed] = useState<boolean | null>(null);
  const [qualityControlNotes, setQualityControlNotes] = useState("");
  const [processingNotes, setProcessingNotes] = useState("");

  useEffect(() => {
    fetchTestInfo();
  }, [params.id]);

  const fetchTestInfo = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/laboratory/tests/${params.id}/process?info=true`, {
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
    
    if (action === "complete" && qualityControlPassed === null) {
      alert("Please specify quality control status");
      return;
    }
    
    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      
      const reagentsArray = reagentsUsed.split(',').map(r => r.trim()).filter(r => r);
      
      const response = await fetch(`/api/laboratory/tests/${params.id}/process`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          equipmentUsed: equipmentUsed || undefined,
          reagentsUsed: reagentsArray.length > 0 ? reagentsArray : undefined,
          qualityControlPassed,
          qualityControlNotes: qualityControlNotes || undefined,
          processingNotes: processingNotes || undefined,
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        alert(data.message || "Test processing updated successfully!");
        router.push(`/laboratory/tests/${params.id}`);
      } else {
        throw new Error(data.error || "Failed to update test processing");
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const canProcessTest = test?.collectionStatus === "collected" && 
                        test?.processingStatus === "pending" && 
                        test?.paymentVerified;

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
          <h1 className="text-2xl font-bold">Test Processing</h1>
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
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Process Test</h1>
          <p className="text-muted-foreground">
            Process laboratory test: {test.testName}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {!canProcessTest && (
            <Alert variant={
              test.paymentVerified ? "destructive" : "default"
            }>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>
                {test.paymentVerified 
                  ? "Cannot Process Test"
                  : "Payment Verification Required"}
              </AlertTitle>
              <AlertDescription>
                {test.paymentVerified
                  ? `Test cannot be processed. Current status: Collection ${test.collectionStatus}, Processing ${test.processingStatus}`
                  : "This test requires payment verification before processing can begin."}
              </AlertDescription>
              {!test.paymentVerified && (
                <Button 
                  variant="outline" 
                  className="mt-2"
                  onClick={() => router.push(`/laboratory/tests/${params.id}/verify-payment`)}
                >
                  Verify Payment
                </Button>
              )}
            </Alert>
          )}

          {canProcessTest && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Test Processing
                </CardTitle>
                <CardDescription>
                  Record test processing information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs value={action} onValueChange={(v) => setAction(v as any)} className="w-full">
                  <TabsList className="grid grid-cols-3 mb-6">
                    <TabsTrigger value="start">Start Processing</TabsTrigger>
                    <TabsTrigger value="complete">Complete Processing</TabsTrigger>
                    <TabsTrigger value="fail">Processing Failed</TabsTrigger>
                  </TabsList>

                  <form onSubmit={handleSubmit} className="space-y-6">
                    <TabsContent value="start" className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="equipmentUsed">Equipment Used</Label>
                        <Input
                          id="equipmentUsed"
                          value={equipmentUsed}
                          onChange={(e) => setEquipmentUsed(e.target.value)}
                          placeholder="Enter equipment used for processing"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="reagentsUsed">
                          Reagents Used (comma separated)
                        </Label>
                        <Input
                          id="reagentsUsed"
                          value={reagentsUsed}
                          onChange={(e) => setReagentsUsed(e.target.value)}
                          placeholder="Reagent 1, Reagent 2, Reagent 3"
                        />
                      </div>

                      <Alert>
                        <PlayCircle className="h-4 w-4" />
                        <AlertTitle>Starting Test Processing</AlertTitle>
                        <AlertDescription>
                          This will mark the test as "in processing". You can complete or fail the processing later.
                        </AlertDescription>
                      </Alert>
                    </TabsContent>

                    <TabsContent value="complete" className="space-y-6">
                      <div className="space-y-2">
                        <Label>Quality Control Status</Label>
                        <div className="flex gap-4">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="qc-passed"
                              checked={qualityControlPassed === true}
                              onCheckedChange={(checked) => setQualityControlPassed(checked ? true : null)}
                            />
                            <Label htmlFor="qc-passed" className="font-normal">
                              <CheckCircle className="h-4 w-4 inline mr-1 text-green-500" />
                              Passed
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="qc-failed"
                              checked={qualityControlPassed === false}
                              onCheckedChange={(checked) => setQualityControlPassed(checked ? false : null)}
                            />
                            <Label htmlFor="qc-failed" className="font-normal">
                              <XCircle className="h-4 w-4 inline mr-1 text-red-500" />
                              Failed
                            </Label>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="qualityControlNotes">Quality Control Notes</Label>
                        <Textarea
                          id="qualityControlNotes"
                          value={qualityControlNotes}
                          onChange={(e) => setQualityControlNotes(e.target.value)}
                          placeholder="Add quality control notes..."
                          rows={3}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="processingNotes">Processing Notes</Label>
                        <Textarea
                          id="processingNotes"
                          value={processingNotes}
                          onChange={(e) => setProcessingNotes(e.target.value)}
                          placeholder="Add any notes about the processing..."
                          rows={3}
                        />
                      </div>

                      <Alert className="bg-green-50 border-green-200">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <AlertTitle className="text-green-800">Completing Test Processing</AlertTitle>
                        <AlertDescription className="text-green-700">
                          This will mark the test as "completed" and ready for result entry.
                        </AlertDescription>
                      </Alert>
                    </TabsContent>

                    <TabsContent value="fail" className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="processingNotesFail">Failure Reason</Label>
                        <Textarea
                          id="processingNotesFail"
                          value={processingNotes}
                          onChange={(e) => setProcessingNotes(e.target.value)}
                          placeholder="Describe why the test processing failed..."
                          rows={4}
                          required
                        />
                      </div>

                      <Alert variant="destructive">
                        <XCircle className="h-4 w-4" />
                        <AlertTitle>Processing Failed</AlertTitle>
                        <AlertDescription>
                          This will mark the test as "failed" and notify the ordering doctor.
                          The test may need to be reordered.
                        </AlertDescription>
                      </Alert>
                    </TabsContent>

                    <Separator />

                    <div className="flex gap-2">
                      <Button 
                        type="submit" 
                        disabled={submitting}
                        variant={action === "fail" ? "destructive" : "default"}
                        className="flex-1"
                      >
                        {submitting ? (
                          <>
                            <Clock className="h-4 w-4 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            {action === "start" && <PlayCircle className="h-4 w-4 mr-2" />}
                            {action === "complete" && <CheckCircle className="h-4 w-4 mr-2" />}
                            {action === "fail" && <XCircle className="h-4 w-4 mr-2" />}
                            {action === "start" && "Start Processing"}
                            {action === "complete" && "Complete Processing"}
                            {action === "fail" && "Mark as Failed"}
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
                </Tabs>
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
                <p className="text-sm text-muted-foreground">Processing Status</p>
                <Badge className={
                  test.processingStatus === "processing" ? "bg-blue-100 text-blue-800" :
                  test.processingStatus === "completed" ? "bg-green-100 text-green-800" :
                  test.processingStatus === "failed" ? "bg-red-100 text-red-800" :
                  "bg-yellow-100 text-yellow-800"
                }>
                  {test.processingStatus}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Collection Status</p>
                <Badge className={
                  test.collectionStatus === "collected" ? "bg-green-100 text-green-800" :
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube className="h-5 w-5" />
                Sample Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {test.collectionDetails?.sampleId && (
                <div>
                  <p className="text-sm text-muted-foreground">Sample ID</p>
                  <p className="font-medium">{test.collectionDetails.sampleId}</p>
                </div>
              )}
              {test.specimen?.type && (
                <div>
                  <p className="text-sm text-muted-foreground">Specimen Type</p>
                  <p className="font-medium">{test.specimen.type}</p>
                </div>
              )}
              {test.specimen?.collectionTime && (
                <div>
                  <p className="text-sm text-muted-foreground">Collected</p>
                  <p className="font-medium">
                    {format(new Date(test.specimen.collectionTime), "MMM dd, HH:mm")}
                  </p>
                </div>
              )}
              {test.collectionDetails?.sampleCondition && (
                <div>
                  <p className="text-sm text-muted-foreground">Sample Condition</p>
                  <p className="font-medium">{test.collectionDetails.sampleCondition}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Patient Details</CardTitle>
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
              <CardTitle>Processing Requirements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle className={`h-4 w-4 ${test.collectionStatus === "collected" ? "text-green-500" : "text-gray-300"}`} />
                <span className="text-sm">Sample collected</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className={`h-4 w-4 ${test.paymentVerified ? "text-green-500" : "text-gray-300"}`} />
                <span className="text-sm">Payment verified</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className={`h-4 w-4 ${test.processingStatus === "pending" ? "text-green-500" : "text-gray-300"}`} />
                <span className="text-sm">Ready for processing</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}