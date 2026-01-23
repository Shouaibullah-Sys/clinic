// app/components/reception/LabTestManagement.tsx

"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Search,
  DollarSign,
  Filter,
  Download,
  Printer,
  Eye,
  CreditCard,
  TestTube,
  Loader2,
} from "lucide-react";

interface LabTestCharges {
  basePrice: number;
  tax: number;
  discount: number;
  otherCharges: number;
  totalAmount: number;
  paid: number;
  due: number;
  paymentStatus: "pending" | "partial" | "paid" | "cancelled";
  paymentMethod?: string;
  transactionId?: string;
  paymentDate?: string;
  collectedBy?: {
    _id: string;
    name: string;
  };
}

interface LabTest {
  _id: string;
  testId: string;
  testName: string;
  category: string;
  price: number;
  patient: {
    _id: string;
    name: string;
    patientId: string;
    phone: string;
  };
  appointment: {
    _id: string;
    appointmentId: string;
    date: string;
  };
  doctor: {
    _id: string;
    name: string;
    specialization: string;
  };
  status: string;
  priority: string;
  charges: LabTestCharges; // Now required, not optional
  orderedAt: string;
}

export function LabTestManagement() {
  const [labTests, setLabTests] = useState<LabTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTest, setSelectedTest] = useState<LabTest | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [filters, setFilters] = useState({
    search: "",
    status: "all",
    paymentStatus: "all",
  });
  const [paymentData, setPaymentData] = useState({
    tax: 0,
    discount: 0,
    otherCharges: 0,
    paymentMethod: "cash",
    paidAmount: 0,
    transactionId: "",
  });
  
  // Helper functions for safe access
  const getCharges = (test: LabTest): LabTestCharges => {
    return test.charges || {
      basePrice: test.price,
      tax: 0,
      discount: 0,
      otherCharges: 0,
      totalAmount: test.price,
      paid: 0,
      due: test.price,
      paymentStatus: "pending" as const,
    };
  };

  const getDueAmount = (test: LabTest): number => {
    const charges = getCharges(test);
    return charges.due;
  };

  const getTotalAmount = (test: LabTest): number => {
    const charges = getCharges(test);
    return charges.totalAmount;
  };

  const getPaymentStatus = (test: LabTest): string => {
    const charges = getCharges(test);
    return charges.paymentStatus;
  };

  const getTransactionId = (test: LabTest): string => {
    const charges = getCharges(test);
    return charges.transactionId || "";
  };

  const fetchLabTests = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.search) params.set("search", filters.search);
      if (filters.status !== "all") params.set("status", filters.status);
      if (filters.paymentStatus !== "all") params.set("paymentStatus", filters.paymentStatus);
      
      const response = await fetch(`/api/reception/lab-tests?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Ensure all tests have charges with defaults
        const processedTests = data.data.map((test: any) => ({
          ...test,
          charges: test.charges || {
            basePrice: test.price,
            tax: 0,
            discount: 0,
            otherCharges: 0,
            totalAmount: test.price,
            paid: 0,
            due: test.price,
            paymentStatus: "pending",
          }
        }));
        setLabTests(processedTests);
      }
    } catch (error) {
      console.error("Error fetching lab tests:", error);
      toast("Error",{
        description: "Failed to fetch lab tests",
      });
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchLabTests();
  }, [filters.status, filters.paymentStatus]);
  
  const handleSearch = () => {
    fetchLabTests();
  };
  
  const handleUpdateCharges = async () => {
    if (!selectedTest) return;
    
    try {
      const response = await fetch(`/api/reception/lab-tests/${selectedTest._id}/charges`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
        body: JSON.stringify(paymentData),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast("Success",{
          description: "Charges updated successfully",
        });
        setPaymentDialogOpen(false);
        fetchLabTests();
      } else {
        toast("Error",{
          description: data.error || "Failed to update charges",
        });
      }
    } catch (error) {
      console.error("Error updating charges:", error);
      toast("Error",{
        description: "Failed to update charges",
      });
    }
  };
  
  const openPaymentDialog = (test: LabTest) => {
    setSelectedTest(test);
    const charges = getCharges(test);
    setPaymentData({
      tax: charges.tax || 0,
      discount: charges.discount || 0,
      otherCharges: charges.otherCharges || 0,
      paymentMethod: charges.paymentMethod || "cash",
      paidAmount: charges.due || 0,
      transactionId: charges.transactionId || "",
    });
    setPaymentDialogOpen(true);
  };
  
  const openDetailsDialog = (test: LabTest) => {
    setSelectedTest(test);
    setDetailsDialogOpen(true);
  };
  
  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      ordered: "default",
      collected: "secondary",
      processing: "outline",
      completed: "default",
      reported: "default",
      cancelled: "destructive",
    };
    
    return (
      <Badge variant={variants[status] || "outline"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };
  
  const getPaymentStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      paid: "default",
      partial: "secondary",
      pending: "outline",
      cancelled: "destructive",
    };
    
    return (
      <Badge variant={variants[status] || "outline"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };
  
  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Search</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Search by patient or test..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button onClick={handleSearch}>
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Test Status</Label>
              <Select
                value={filters.status}
                onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="ordered">Ordered</SelectItem>
                  <SelectItem value="collected">Collected</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="reported">Reported</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Payment Status</Label>
              <Select
                value={filters.paymentStatus}
                onValueChange={(value) => setFilters(prev => ({ ...prev, paymentStatus: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Payments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Payments</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Actions</Label>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={fetchLabTests}>
                  <Filter className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Lab Tests Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TestTube className="h-5 w-5" />
              Lab Tests
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Printer className="h-4 w-4 mr-2" />
                Print Report
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </CardTitle>
          <CardDescription>
            Manage lab test orders and payments
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Test ID</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Test Name</TableHead>
                    <TableHead>Doctor</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {labTests.map((test) => {
                    const charges = getCharges(test);
                    const dueAmount = getDueAmount(test);
                    const totalAmount = getTotalAmount(test);
                    const paymentStatus = getPaymentStatus(test);
                    
                    return (
                      <TableRow key={test._id}>
                        <TableCell className="font-mono">{test.testId}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{test.patient.name}</div>
                            <div className="text-sm text-gray-500">{test.patient.patientId}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{test.testName}</div>
                          <div className="text-sm text-gray-500 capitalize">
                            {test.category.replace('_', ' ')}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>{test.doctor.name}</div>
                          <div className="text-sm text-gray-500">{test.doctor.specialization}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">${totalAmount.toFixed(2)}</div>
                          {dueAmount > 0 && (
                            <div className="text-sm text-red-600">
                              Due: ${dueAmount.toFixed(2)}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(test.status)}</TableCell>
                        <TableCell>
                          {getPaymentStatusBadge(paymentStatus)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openDetailsDialog(test)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openPaymentDialog(test)}
                              disabled={paymentStatus === "paid"}
                            >
                              <CreditCard className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Update Charges
            </DialogTitle>
            <DialogDescription>
              Update payment details for {selectedTest?.testName}
            </DialogDescription>
          </DialogHeader>
          
          {selectedTest && (() => {
            const charges = getCharges(selectedTest);
            const calculatedTotal = selectedTest.price + paymentData.tax + paymentData.otherCharges - paymentData.discount;
            const amountDue = Math.max(0, calculatedTotal - paymentData.paidAmount);
            
            return (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Base Price</Label>
                    <Input value={selectedTest.price.toFixed(2)} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tax">Tax ($)</Label>
                    <Input
                      id="tax"
                      type="number"
                      step="0.01"
                      value={paymentData.tax}
                      onChange={(e) => setPaymentData(prev => ({
                        ...prev,
                        tax: parseFloat(e.target.value) || 0
                      }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="discount">Discount ($)</Label>
                    <Input
                      id="discount"
                      type="number"
                      step="0.01"
                      value={paymentData.discount}
                      onChange={(e) => setPaymentData(prev => ({
                        ...prev,
                        discount: parseFloat(e.target.value) || 0
                      }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="otherCharges">Other Charges ($)</Label>
                    <Input
                      id="otherCharges"
                      type="number"
                      step="0.01"
                      value={paymentData.otherCharges}
                      onChange={(e) => setPaymentData(prev => ({
                        ...prev,
                        otherCharges: parseFloat(e.target.value) || 0
                      }))}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="paymentMethod">Payment Method</Label>
                  <Select
                    value={paymentData.paymentMethod}
                    onValueChange={(value) => setPaymentData(prev => ({
                      ...prev,
                      paymentMethod: value
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="card">Credit Card</SelectItem>
                      <SelectItem value="insurance">Insurance</SelectItem>
                      <SelectItem value="upi">UPI</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="paidAmount">Amount Paid ($)</Label>
                  <Input
                    id="paidAmount"
                    type="number"
                    step="0.01"
                    value={paymentData.paidAmount}
                    onChange={(e) => setPaymentData(prev => ({
                      ...prev,
                      paidAmount: parseFloat(e.target.value) || 0
                    }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="transactionId">Transaction ID</Label>
                  <Input
                    id="transactionId"
                    value={paymentData.transactionId}
                    onChange={(e) => setPaymentData(prev => ({
                      ...prev,
                      transactionId: e.target.value
                    }))}
                    placeholder="Optional"
                  />
                </div>
                
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between">
                    <span>Total Amount:</span>
                    <span className="font-bold">
                      ${calculatedTotal.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Amount Due:</span>
                    <span>
                      ${amountDue.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })()}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateCharges}>
              Update Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Lab Test Details</DialogTitle>
          </DialogHeader>
          
          {selectedTest && (() => {
            const charges = getCharges(selectedTest);
            
            return (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2">Test Information</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Test ID:</span>
                        <span className="font-mono">{selectedTest.testId}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Test Name:</span>
                        <span>{selectedTest.testName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Category:</span>
                        <span className="capitalize">{selectedTest.category.replace('_', ' ')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Priority:</span>
                        <span className="capitalize">{selectedTest.priority}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Status:</span>
                        <span>{getStatusBadge(selectedTest.status)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-2">Patient Information</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Name:</span>
                        <span>{selectedTest.patient.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Patient ID:</span>
                        <span>{selectedTest.patient.patientId}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Phone:</span>
                        <span>{selectedTest.patient.phone}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2">Appointment</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Appointment ID:</span>
                        <span>{selectedTest.appointment.appointmentId}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Date:</span>
                        <span>{new Date(selectedTest.appointment.date).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-2">Doctor</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Name:</span>
                        <span>{selectedTest.doctor.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Specialization:</span>
                        <span>{selectedTest.doctor.specialization}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">Payment Details</h4>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Base Price:</span>
                        <span>${selectedTest.price.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Tax:</span>
                        <span>${charges.tax.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Discount:</span>
                        <span>${charges.discount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Other Charges:</span>
                        <span>${charges.otherCharges.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-semibold border-t pt-2">
                        <span>Total Amount:</span>
                        <span>${charges.totalAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between border-t pt-2">
                        <span className="text-gray-600">Paid:</span>
                        <span>${charges.paid.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Due:</span>
                        <span className={charges.due > 0 ? "text-red-600" : ""}>
                          ${charges.due.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Payment Status:</span>
                        <span>{getPaymentStatusBadge(charges.paymentStatus)}</span>
                      </div>
                      {charges.paymentMethod && (
                        <div className="flex justify-between col-span-2">
                          <span className="text-gray-600">Payment Method:</span>
                          <span className="capitalize">{charges.paymentMethod}</span>
                        </div>
                      )}
                      {charges.transactionId && (
                        <div className="flex justify-between col-span-2">
                          <span className="text-gray-600">Transaction ID:</span>
                          <span>{charges.transactionId}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setDetailsDialogOpen(false)}>
                    Close
                  </Button>
                  {getPaymentStatus(selectedTest) !== "paid" && (
                    <Button onClick={() => {
                      setDetailsDialogOpen(false);
                      openPaymentDialog(selectedTest);
                    }}>
                      Update Payment
                    </Button>
                  )}
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}