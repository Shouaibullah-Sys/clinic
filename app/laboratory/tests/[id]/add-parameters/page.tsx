// app/laboratory/tests/[id]/add-parameters/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Plus, Trash2, TestTube, CheckCircle, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

// Test parameter interface
interface TestParameter {
  id: string;
  name: string;
  value: string;
  unit: string;
  normalRange: string;
  remarks: string;
}

export default function AddTestParametersPage() {
  const params = useParams();
  const router = useRouter();
  const { accessToken } = useAuthStore();
  
  const [loading, setLoading] = useState(true);
  const [test, setTest] = useState<any>(null);
  const [parameters, setParameters] = useState<TestParameter[]>([
    { id: "1", name: "", value: "", unit: "", normalRange: "", remarks: "" }
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTestDetails();
  }, [params.id]);

  const fetchTestDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/laboratory/tests/${params.id}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });
      
      if (!response.ok) throw new Error('Failed to fetch test');
      
      const data = await response.json();
      if (data.success) {
        setTest(data.data);
        
        // If test already has parameters, load them
        if (data.data.results?.parameters?.length > 0) {
          setParameters(data.data.results.parameters.map((p: any, index: number) => ({
            id: (index + 1).toString(),
            name: p.name || "",
            value: p.value || "",
            unit: p.unit || "",
            normalRange: p.normalRange || "",
            remarks: p.remarks || ""
          })));
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addParameter = () => {
    const newId = (parameters.length + 1).toString();
    setParameters([
      ...parameters,
      { id: newId, name: "", value: "", unit: "", normalRange: "", remarks: "" }
    ]);
  };

  const removeParameter = (id: string) => {
    if (parameters.length > 1) {
      setParameters(parameters.filter(p => p.id !== id));
    }
  };

  const updateParameter = (id: string, field: keyof TestParameter, value: string) => {
    setParameters(parameters.map(param => 
      param.id === id ? { ...param, [field]: value } : param
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSubmitting(true);
      
      // Filter out empty parameters
      const validParameters = parameters.filter(p => p.name.trim() && p.value.trim());
      
      if (validParameters.length === 0) {
        alert("Please add at least one test parameter");
        return;
      }
      
      const payload = {
        parameters: validParameters.map(p => ({
          name: p.name,
          value: p.value,
          unit: p.unit,
          normalRange: p.normalRange,
          remarks: p.remarks
        })),
        status: "completed",
        processingStatus: "completed"
      };
      
      const response = await fetch(`/api/laboratory/tests/${params.id}/results`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        alert("Test parameters added successfully!");
        router.push(`/laboratory/tests/${params.id}`);
      } else {
        throw new Error(data.error || "Failed to save parameters");
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
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (error || !test) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error || "Test not found"}</AlertDescription>
        </Alert>
        <Button onClick={() => router.push('/laboratory/tests')} className="mt-4">
          Back to Tests
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Add Test Parameters</h1>
          <p className="text-muted-foreground">
            {test.testName} - {test.testId}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TestTube className="h-5 w-5" />
                  Test Parameters
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {parameters.map((param, index) => (
                  <div key={param.id} className="p-4 border rounded-lg space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">Parameter #{index + 1}</h3>
                      {parameters.length > 1 && (
                        <Button
                          type="button"
                          onClick={() => removeParameter(param.id)}
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Parameter Name *</Label>
                        <Input
                          value={param.name}
                          onChange={(e) => updateParameter(param.id, "name", e.target.value)}
                          placeholder="e.g., Hemoglobin, WBC Count"
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Value *</Label>
                        <Input
                          value={param.value}
                          onChange={(e) => updateParameter(param.id, "value", e.target.value)}
                          placeholder="Enter test result value"
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Unit</Label>
                        <Input
                          value={param.unit}
                          onChange={(e) => updateParameter(param.id, "unit", e.target.value)}
                          placeholder="e.g., g/dL, cells/μL"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Normal Range</Label>
                        <Input
                          value={param.normalRange}
                          onChange={(e) => updateParameter(param.id, "normalRange", e.target.value)}
                          placeholder="e.g., 13.5-17.5 g/dL"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Remarks</Label>
                      <Textarea
                        value={param.remarks}
                        onChange={(e) => updateParameter(param.id, "remarks", e.target.value)}
                        placeholder="Any additional remarks or notes..."
                        rows={2}
                      />
                    </div>
                  </div>
                ))}
                
                <Button 
                  type="button" 
                  onClick={addParameter} 
                  variant="outline" 
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Another Parameter
                </Button>
              </CardContent>
            </Card>
            
            <div className="flex gap-2">
              <Button 
                type="submit" 
                disabled={submitting}
                className="flex-1"
                size="lg"
              >
                {submitting ? "Saving..." : "Save Test Parameters"}
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
        
        {/* Sidebar - Test Info */}
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
                <p className="text-sm text-muted-foreground">Patient</p>
                <p className="font-medium">{test.patient?.name || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Doctor</p>
                <p className="font-medium">{test.doctor?.name || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Payment</p>
                <Badge className={
                  test.paymentVerified ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                }>
                  {test.paymentVerified ? "Verified" : "Pending"}
                </Badge>
              </div>
            </CardContent>
          </Card>
          
          {/* Quick Tips */}
          <Card>
            <CardHeader>
              <CardTitle>Tips</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>• Add all relevant test parameters</p>
              <p>• Include units and normal ranges</p>
              <p>• Mark abnormal values in remarks</p>
              <p>• Doctor will review and finalize</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}