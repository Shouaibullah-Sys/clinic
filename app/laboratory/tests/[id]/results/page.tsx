// app/laboratory/tests/[id]/results/page.tsx
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
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ArrowLeft, 
  FileText, 
  AlertTriangle, 
  CheckCircle, 
  Plus,
  Trash2,
  Save,
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
    age?: number;
    gender?: string;
  };
  priority: string;
  processingStatus: string;
  verificationStatus: string;
}

interface Parameter {
  name: string;
  value: string;
  unit: string;
  normalRange: string;
  flag: "normal" | "low" | "high" | "critical";
  remarks: string;
}

export default function ResultsEntryPage() {
  const params = useParams();
  const router = useRouter();
  const [test, setTest] = useState<TestInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [parameters, setParameters] = useState<Parameter[]>([
    { name: "", value: "", unit: "", normalRange: "", flag: "normal", remarks: "" }
  ]);
  const [interpretation, setInterpretation] = useState("");
  const [reportUrl, setReportUrl] = useState("");
  const [verificationNotes, setVerificationNotes] = useState("");

  useEffect(() => {
    fetchTestInfo();
  }, [params.id]);

  const fetchTestInfo = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/laboratory/tests/${params.id}/results?info=true`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch test information');
      }
      
      const data = await response.json();
      setTest(data.data);
      
      // Load existing results if any
      if (data.data.results?.parameters) {
        setParameters(data.data.results.parameters);
        setInterpretation(data.data.results.interpretation || "");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const canEnterResults = test?.processingStatus === "completed" && 
                         test?.verificationStatus === "pending";

  const addParameter = () => {
    setParameters([
      ...parameters,
      { name: "", value: "", unit: "", normalRange: "", flag: "normal", remarks: "" }
    ]);
  };

  const removeParameter = (index: number) => {
    if (parameters.length > 1) {
      setParameters(parameters.filter((_, i) => i !== index));
    }
  };

  const updateParameter = (index: number, field: keyof Parameter, value: string) => {
    const newParameters = [...parameters];
    newParameters[index] = { ...newParameters[index], [field]: value };
    
    // Auto-calculate flag based on value and normal range
    if (field === "value" || field === "normalRange") {
      const param = newParameters[index];
      if (param.value && param.normalRange) {
        const numValue = parseFloat(param.value);
        if (!isNaN(numValue)) {
          const rangeMatch = param.normalRange.match(/(\d+\.?\d*)\s*-\s*(\d+\.?\d*)/);
          if (rangeMatch) {
            const min = parseFloat(rangeMatch[1]);
            const max = parseFloat(rangeMatch[2]);
            
            if (numValue < min) {
              param.flag = "low";
            } else if (numValue > max) {
              param.flag = "high";
            } else {
              param.flag = "normal";
            }
          }
        }
      }
    }
    
    setParameters(newParameters);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate parameters
    const invalidParams = parameters.filter(p => !p.name.trim() || !p.value.trim() || !p.normalRange.trim());
    if (invalidParams.length > 0) {
      alert("Please fill in all required fields for all parameters");
      return;
    }
    
    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch(`/api/laboratory/tests/${params.id}/results`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          parameters,
          interpretation: interpretation || undefined,
          reportUrl: reportUrl || undefined,
          verificationNotes: verificationNotes || undefined,
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        alert(data.message || "Results entered successfully!");
        if (data.hasCritical) {
          alert("CRITICAL VALUES DETECTED! Please inform the doctor immediately.");
        }
        router.push(`/laboratory/tests/${params.id}`);
      } else {
        throw new Error(data.error || "Failed to enter results");
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
        <div className="space-y-6">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-96 w-full" />
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
          <h1 className="text-2xl font-bold">Enter Results</h1>
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
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Enter Test Results</h1>
          <p className="text-muted-foreground">
            Enter results for test: {test.testName}
          </p>
        </div>
      </div>

      {!canEnterResults && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Cannot Enter Results</AlertTitle>
          <AlertDescription>
            {test.processingStatus !== "completed" 
              ? "Test processing must be completed before entering results."
              : "Results have already been entered or verified."}
          </AlertDescription>
        </Alert>
      )}

      {canEnterResults && (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Test Information */}
          <Card>
            <CardHeader>
              <CardTitle>Test Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Test ID</p>
                  <p className="font-medium">{test.testId}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Test Name</p>
                  <p className="font-medium">{test.testName}</p>
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
                <div>
                  <p className="text-sm text-muted-foreground">Patient</p>
                  <p className="font-medium">{test.patient.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Patient ID</p>
                  <p className="font-medium">{test.patient.patientId}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Age / Gender</p>
                  <p className="font-medium">
                    {test.patient.age || "N/A"} / {test.patient.gender || "N/A"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Test Parameters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Test Parameters</span>
                <Button type="button" onClick={addParameter} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Parameter
                </Button>
              </CardTitle>
              <CardDescription>
                Enter test parameters and their values
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {parameters.map((param, index) => (
                  <div key={index} className="p-4 border rounded-lg space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">Parameter {index + 1}</h3>
                      {parameters.length > 1 && (
                        <Button
                          type="button"
                          onClick={() => removeParameter(index)}
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                      <div className="lg:col-span-2">
                        <Label htmlFor={`name-${index}`}>Parameter Name *</Label>
                        <Input
                          id={`name-${index}`}
                          value={param.name}
                          onChange={(e) => updateParameter(index, "name", e.target.value)}
                          placeholder="e.g., Hemoglobin"
                          required
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor={`value-${index}`}>Value *</Label>
                        <Input
                          id={`value-${index}`}
                          value={param.value}
                          onChange={(e) => updateParameter(index, "value", e.target.value)}
                          placeholder="e.g., 14.5"
                          required
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor={`unit-${index}`}>Unit</Label>
                        <Input
                          id={`unit-${index}`}
                          value={param.unit}
                          onChange={(e) => updateParameter(index, "unit", e.target.value)}
                          placeholder="e.g., g/dL"
                        />
                      </div>
                      
                      <div className="lg:col-span-2">
                        <Label htmlFor={`normalRange-${index}`}>Normal Range *</Label>
                        <Input
                          id={`normalRange-${index}`}
                          value={param.normalRange}
                          onChange={(e) => updateParameter(index, "normalRange", e.target.value)}
                          placeholder="e.g., 12.0-16.0"
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor={`flag-${index}`}>Flag</Label>
                        <Select
                          value={param.flag}
                          onValueChange={(value: any) => updateParameter(index, "flag", value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="normal">Normal</SelectItem>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="critical">Critical</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label htmlFor={`remarks-${index}`}>Remarks</Label>
                        <Input
                          id={`remarks-${index}`}
                          value={param.remarks}
                          onChange={(e) => updateParameter(index, "remarks", e.target.value)}
                          placeholder="Additional remarks"
                        />
                      </div>
                    </div>
                    
                    {param.flag !== "normal" && (
                      <Alert variant={
                        param.flag === "critical" ? "destructive" :
                        param.flag === "high" || param.flag === "low" ? "default" : "default"
                      } className="mt-2">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>
                          {param.flag === "critical" ? "CRITICAL VALUE" :
                           param.flag === "high" ? "HIGH VALUE" :
                           param.flag === "low" ? "LOW VALUE" : "ABNORMAL VALUE"}
                        </AlertTitle>
                        <AlertDescription>
                          This value falls outside the normal range: {param.normalRange}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                ))}
              </div>
              
              <div className="mt-6 text-sm text-muted-foreground">
                <p>* Required fields</p>
                <p>Normal range format: e.g., "12.0-16.0" or "120-140 mg/dL"</p>
              </div>
            </CardContent>
          </Card>

          {/* Interpretation */}
          <Card>
            <CardHeader>
              <CardTitle>Interpretation</CardTitle>
              <CardDescription>
                Provide interpretation and comments on the test results
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={interpretation}
                onChange={(e) => setInterpretation(e.target.value)}
                placeholder="Enter interpretation of the test results..."
                rows={6}
                className="font-mono text-sm"
              />
            </CardContent>
          </Card>

          {/* Additional Information */}
          <Card>
            <CardHeader>
              <CardTitle>Additional Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reportUrl">Report URL (Optional)</Label>
                <Input
                  id="reportUrl"
                  value={reportUrl}
                  onChange={(e) => setReportUrl(e.target.value)}
                  placeholder="https://example.com/report.pdf"
                  type="url"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="verificationNotes">Verification Notes (Optional)</Label>
                <Textarea
                  id="verificationNotes"
                  value={verificationNotes}
                  onChange={(e) => setVerificationNotes(e.target.value)}
                  placeholder="Add any verification notes..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Critical Value Warning */}
          {parameters.some(p => p.flag === "critical") && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>CRITICAL VALUES DETECTED</AlertTitle>
              <AlertDescription>
                One or more parameters have critical values. Please verify these results 
                carefully and inform the ordering doctor immediately after submission.
              </AlertDescription>
            </Alert>
          )}

          {/* Submit Buttons */}
          <div className="flex gap-2">
            <Button 
              type="submit" 
              disabled={submitting}
              className="flex-1"
              size="lg"
            >
              {submitting ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Saving Results...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Results
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
      )}
    </div>
  );
}