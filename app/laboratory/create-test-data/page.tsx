// app/laboratory/create-test-data/page.tsx

"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuthStore } from "@/store/useAuthStore";
import { toast } from "sonner";
import { Loader2, FlaskConical, Plus, CheckCircle } from "lucide-react";

export default function CreateTestDataPage() {
  const { accessToken } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    patientId: "6971c8ac9575b7961d2f87e2", // From your debug data
    doctorId: "6970964403a8e252ef531d0d", // From your debug data
    testName: "Complete Blood Count",
    category: "hematology",
    price: "150",
    priority: "routine",
    status: "ordered",
    collectionStatus: "pending",
    processingStatus: "pending",
    paymentVerified: "true"
  });

  const createTestLabTest = async (testData: any) => {
    try {
      const response = await fetch('/api/laboratory/create-test', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testData),
      });

      const result = await response.json();
      if (result.success) {
        toast.success(`Created test: ${result.data.testId}`);
        return result.data;
      } else {
        toast.error(`Failed: ${result.error}`);
        return null;
      }
    } catch (error) {
      console.error('Error creating test:', error);
      toast.error('Network error');
      return null;
    }
  };

  const handleCreateSingleTest = async () => {
    setLoading(true);
    try {
      const testData = {
        patientId: formData.patientId,
        doctorId: formData.doctorId,
        testName: formData.testName,
        category: formData.category,
        price: parseFloat(formData.price),
        priority: formData.priority,
        status: formData.status,
        collectionStatus: formData.collectionStatus,
        processingStatus: formData.processingStatus,
        paymentVerified: formData.paymentVerified === "true"
      };

      await createTestLabTest(testData);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBatchTests = async () => {
    setLoading(true);
    try {
      const testTypes = [
        // Test 1: Pending collection (routine, not paid)
        {
          testName: "Urinalysis",
          category: "urine_test",
          price: 80,
          priority: "routine",
          status: "ordered",
          collectionStatus: "pending",
          processingStatus: "pending",
          paymentVerified: false
        },
        // Test 2: Pending collection (urgent, not paid but should show)
        {
          testName: "Emergency Blood Gas",
          category: "blood_test",
          price: 200,
          priority: "urgent",
          status: "ordered",
          collectionStatus: "pending",
          processingStatus: "pending",
          paymentVerified: false
        },
        // Test 3: Collected, ready for processing
        {
          testName: "Liver Function Test",
          category: "blood_test",
          price: 250,
          priority: "routine",
          status: "ordered",
          collectionStatus: "collected",
          processingStatus: "pending",
          paymentVerified: true
        },
        // Test 4: Currently processing
        {
          testName: "COVID-19 RT-PCR",
          category: "culture",
          price: 500,
          priority: "emergency",
          status: "processing",
          collectionStatus: "collected",
          processingStatus: "processing",
          paymentVerified: true
        },
        // Test 5: Completed, ready for reporting
        {
          testName: "Thyroid Function Test",
          category: "hormone_test",
          price: 300,
          priority: "routine",
          status: "completed",
          collectionStatus: "collected",
          processingStatus: "completed",
          paymentVerified: true
        }
      ];

      let createdCount = 0;
      for (const test of testTypes) {
        const testData = {
          patientId: formData.patientId,
          doctorId: formData.doctorId,
          ...test
        };
        
        const result = await createTestLabTest(testData);
        if (result) createdCount++;
        
        // Small delay between creations
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      toast.success(`Created ${createdCount} test lab tests`);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Create Test Lab Tests</h1>
        <p className="text-muted-foreground mt-2">
          Create sample lab tests for testing the laboratory workflow
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FlaskConical className="h-5 w-5" />
              Create Single Test
            </CardTitle>
            <CardDescription>
              Create one lab test with custom parameters
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Test Name</Label>
              <Input
                value={formData.testName}
                onChange={(e) => setFormData({...formData, testName: e.target.value})}
                placeholder="Enter test name"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({...formData, category: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hematology">Hematology</SelectItem>
                    <SelectItem value="blood_test">Blood Test</SelectItem>
                    <SelectItem value="urine_test">Urine Test</SelectItem>
                    <SelectItem value="culture">Culture</SelectItem>
                    <SelectItem value="hormone_test">Hormone Test</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Price</Label>
                <Input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({...formData, price: e.target.value})}
                  placeholder="Enter price"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => setFormData({...formData, priority: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="routine">Routine</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="emergency">Emergency</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Collection Status</Label>
                <Select
                  value={formData.collectionStatus}
                  onValueChange={(value) => setFormData({...formData, collectionStatus: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="collected">Collected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Processing Status</Label>
                <Select
                  value={formData.processingStatus}
                  onValueChange={(value) => setFormData({...formData, processingStatus: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Payment Verified</Label>
                <Select
                  value={formData.paymentVerified}
                  onValueChange={(value) => setFormData({...formData, paymentVerified: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Yes</SelectItem>
                    <SelectItem value="false">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button 
              onClick={handleCreateSingleTest} 
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Single Test
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FlaskConical className="h-5 w-5" />
              Create Batch Tests
            </CardTitle>
            <CardDescription>
              Create multiple test lab tests in various states for testing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-800 mb-2">Tests to be created:</h3>
              <ul className="space-y-2 text-sm text-blue-700">
                <li className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-yellow-500"></div>
                  <span>Urinalysis - Pending collection (routine, unpaid)</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-orange-500"></div>
                  <span>Emergency Blood Gas - Pending collection (urgent, unpaid)</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500"></div>
                  <span>Liver Function Test - Collected, ready for processing</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-purple-500"></div>
                  <span>COVID-19 RT-PCR - Currently processing</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                  <span>Thyroid Function Test - Completed, ready for reporting</span>
                </li>
              </ul>
            </div>

            <div className="space-y-2">
              <Label>Patient ID</Label>
              <Input
                value={formData.patientId}
                onChange={(e) => setFormData({...formData, patientId: e.target.value})}
                placeholder="Enter patient ID"
              />
            </div>

            <div className="space-y-2">
              <Label>Doctor ID</Label>
              <Input
                value={formData.doctorId}
                onChange={(e) => setFormData({...formData, doctorId: e.target.value})}
                placeholder="Enter doctor ID"
              />
            </div>

            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Textarea
                placeholder="Any additional notes..."
                className="min-h-25"
              />
            </div>

            <Button 
              onClick={handleCreateBatchTests} 
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating Batch...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Create 5 Test Lab Tests
                </>
              )}
            </Button>

            <div className="text-sm text-gray-500 pt-4 border-t">
              <p className="font-medium mb-1">Note:</p>
              <p>This will create 5 test lab tests in various states to demonstrate the laboratory workflow.</p>
              <p className="mt-2">You need to be logged in as an admin to use this feature.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}