// app/components/doctor/LabTestOrder.tsx

"use client";

import { useState } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Plus, TestTube } from "lucide-react";

interface LabTestOrderProps {
  appointmentId: string;
  patientId: string;
  patientName: string;
  onTestOrdered?: () => void;
}

const commonTests = [
  { name: "Complete Blood Count (CBC)", category: "blood_test", price: 25 },
  { name: "Basic Metabolic Panel", category: "blood_test", price: 35 },
  { name: "Lipid Panel", category: "blood_test", price: 40 },
  { name: "Thyroid Function Test", category: "hormone_test", price: 45 },
  { name: "Urinalysis", category: "urine_test", price: 20 },
  { name: "Stool Culture", category: "stool_test", price: 30 },
  { name: "Liver Function Test", category: "blood_test", price: 38 },
  { name: "HbA1c", category: "blood_test", price: 28 },
];

export function LabTestOrder({
  appointmentId,
  patientId,
  patientName,
  onTestOrdered,
}: LabTestOrderProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    testName: "",
    category: "blood_test",
    description: "",
    price: "",
    priority: "routine",
    notes: "",
    specimenType: "blood",
  });
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSelectTest = (test: typeof commonTests[0]) => {
    setFormData({
      ...formData,
      testName: test.name,
      category: test.category,
      price: test.price.toString(),
    });
  };
  
  const handleSubmit = async () => {
    if (!formData.testName || !formData.price) {
      toast("Error",{
        description: "Test name and price are required",
      });
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await fetch("/api/doctor/lab-tests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
        body: JSON.stringify({
          appointmentId,
          ...formData,
          price: parseFloat(formData.price),
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast("Success",{
          description: "Lab test ordered successfully",
        });
        setOpen(false);
        setFormData({
          testName: "",
          category: "blood_test",
          description: "",
          price: "",
          priority: "routine",
          notes: "",
          specimenType: "blood",
        });
        onTestOrdered?.();
      } else {
        toast("Error",{
          description: data.error || "Failed to order lab test",
        });
      }
    } catch (error) {
      console.error("Error ordering lab test:", error);
      toast("Error",{
        description: "Failed to order lab test",
      });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <TestTube className="h-4 w-4 mr-2" />
          Order Lab Test
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            Order Lab Test
          </DialogTitle>
          <DialogDescription>
            Order lab test for {patientName}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Common Tests */}
          <div>
            <Label className="mb-2 block">Common Tests</Label>
            <div className="grid grid-cols-2 gap-2">
              {commonTests.map((test) => (
                <Button
                  key={test.name}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleSelectTest(test)}
                  className="justify-start"
                >
                  {test.name} - ${test.price}
                </Button>
              ))}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="testName">Test Name *</Label>
              <Input
                id="testName"
                name="testName"
                value={formData.testName}
                onChange={handleInputChange}
                placeholder="Enter test name"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => handleSelectChange("category", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="blood_test">Blood Test</SelectItem>
                  <SelectItem value="urine_test">Urine Test</SelectItem>
                  <SelectItem value="stool_test">Stool Test</SelectItem>
                  <SelectItem value="imaging">Imaging</SelectItem>
                  <SelectItem value="biopsy">Biopsy</SelectItem>
                  <SelectItem value="culture">Culture</SelectItem>
                  <SelectItem value="hormone_test">Hormone Test</SelectItem>
                  <SelectItem value="genetic_test">Genetic Test</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="specimenType">Specimen Type</Label>
              <Select
                value={formData.specimenType}
                onValueChange={(value) => handleSelectChange("specimenType", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="blood">Blood</SelectItem>
                  <SelectItem value="urine">Urine</SelectItem>
                  <SelectItem value="stool">Stool</SelectItem>
                  <SelectItem value="tissue">Tissue</SelectItem>
                  <SelectItem value="saliva">Saliva</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="price">Price ($) *</Label>
              <Input
                id="price"
                name="price"
                type="number"
                step="0.01"
                value={formData.price}
                onChange={handleInputChange}
                placeholder="0.00"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => handleSelectChange("priority", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="routine">Routine</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="emergency">Emergency</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Test description..."
              rows={2}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              placeholder="Additional notes..."
              rows={2}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Ordering...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Order Test
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}