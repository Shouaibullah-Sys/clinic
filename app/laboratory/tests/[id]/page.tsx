// app/laboratory/tests/[id]/page.tsx

"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { useAuthStore } from "@/store/useAuthStore";
import { 
  ArrowLeft, 
  User, 
  Stethoscope, 
  TestTube, 
  FileText,
  Clock,
  AlertTriangle,
  CheckCircle,
  CreditCard,
  Download,
  Printer,
  Mail,
  RefreshCw,
  MoreVertical
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface LabTest {
  _id: string;
  testId: string;
  testName: string;
  category: string;
  description?: string;
  priority: string;
  status: string;
  collectionStatus: string;
  processingStatus: string;
  verificationStatus: string;
  paymentVerified: boolean;
  orderedAt: string;
  
  patient: {
    name: string;
    patientId: string;
    phone: string;
    age?: number;
    gender?: string;
  };
  
  doctor?: {
    name: string;
    specialization: string;
    phone?: string;
  };
  
  orderedBy?: {
    name: string;
  };
  
  charges?: {
    basePrice: number;
    tax: number;
    discount: number;
    otherCharges: number;
    totalAmount: number;
    paid: number;
    due: number;
    paymentStatus: string;
    paymentMethod?: string;
    transactionId?: string;
    paymentDate?: string;
    collectedBy?: {
      name: string;
    };
  };
  
  specimen?: {
    type?: string;
    collectionTime?: string;
    collectedBy?: {
      name: string;
    };
    quantity?: string;
    container?: string;
    remarks?: string;
  };
  
  results?: {
    parameters: Array<{
      name: string;
      value: string | number;
      unit?: string;
      normalRange: string;
      flag?: string;
      remarks?: string;
    }>;
    interpretation?: string;
    reportedBy?: {
      name: string;
    };
    reportedAt?: string;
    verifiedBy?: {
      name: string;
    };
    verifiedAt?: string;
    reportUrl?: string;
  };
}

// Safe date formatting utility
const safeFormatDate = (dateString: string | undefined | null, formatStr: string = "MMM dd, yyyy HH:mm"): string => {
  if (!dateString) return "N/A";
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return "Invalid Date";
    }
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      ...(formatStr.includes('HH:mm') ? { 
        hour: '2-digit', 
        minute: '2-digit' 
      } : {})
    });
  } catch (error) {
    console.error('Date formatting error:', error);
    return "N/A";
  }
};

// Safe string access
const safeString = (str: string | undefined | null, fallback: string = "N/A"): string => {
  if (!str) return fallback;
  return str;
};

// Safe uppercase first letter
const safeUpperCaseFirst = (str: string | undefined | null, fallback: string = "N/A"): string => {
  if (!str) return fallback;
  return str.charAt(0).toUpperCase() + str.slice(1);
};

export default function TestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { accessToken, isLoading: authLoading } = useAuthStore();
  const [test, setTest] = useState<LabTest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && accessToken) {
      fetchTestDetails();
    }
  }, [params.id, accessToken, authLoading]);

  const fetchTestDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/laboratory/tests/${params.id}`, {
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
        throw new Error('Failed to fetch test details');
      }
      
      const data = await response.json();
      console.log("Test data:", data.data); // Debug log
      setTest(data.data);
    } catch (err: any) {
      setError(err.message || "Failed to load test details");
      console.error("Error fetching test:", err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string | undefined) => {
    if (!status) return "bg-gray-100 text-gray-800";
    
    switch (status.toLowerCase()) {
      case "ordered": return "bg-blue-100 text-blue-800";
      case "collected": return "bg-yellow-100 text-yellow-800";
      case "processing": return "bg-purple-100 text-purple-800";
      case "completed": return "bg-green-100 text-green-800";
      case "reported": return "bg-emerald-100 text-emerald-800";
      case "cancelled": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority: string | undefined) => {
    if (!priority) return "bg-blue-100 text-blue-800 border-blue-300";
    
    switch (priority.toLowerCase()) {
      case "emergency": return "bg-red-100 text-red-800 border-red-300";
      case "urgent": return "bg-orange-100 text-orange-800 border-orange-300";
      default: return "bg-blue-100 text-blue-800 border-blue-300";
    }
  };

  const getPaymentColor = (verified: boolean | undefined, status: string | undefined) => {
    if (verified) return "bg-green-100 text-green-800";
    
    if (!status) return "bg-gray-100 text-gray-800";
    
    switch (status.toLowerCase()) {
      case "paid": return "bg-green-100 text-green-800";
      case "partial": return "bg-yellow-100 text-yellow-800";
      case "pending": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const handlePrintReport = () => {
    window.print();
  };

  const handleGenerateReport = async () => {
    try {
      const response = await fetch(`/api/laboratory/tests/${params.id}/generate-report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
      });

      if (response.ok) {
        const data = await response.json();
        window.open(data.data.reportUrl, '_blank');
      } else {
        alert('Failed to generate report');
      }
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Failed to generate report');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="container mx-auto p-6">
        <Skeleton className="h-8 w-64 mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
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
          <h1 className="text-2xl font-bold">Test Not Found</h1>
        </div>
        <Card>
          <CardContent className="py-8 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto text-yellow-500 mb-4" />
            <h3 className="text-lg font-medium">Test Not Found</h3>
            <p className="text-muted-foreground mt-2">
              {error || "The requested test could not be found."}
            </p>
            <Button onClick={() => router.push('/laboratory/tests')} className="mt-4">
              Back to Tests
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Safe values
  const safeTest = {
    testId: safeString(test.testId, "Unknown"),
    testName: safeString(test.testName, "Unknown Test"),
    category: safeString(test.category, "Unknown"),
    status: safeString(test.status, "unknown"),
    priority: safeString(test.priority, "routine"),
    collectionStatus: safeString(test.collectionStatus, "pending"),
    processingStatus: safeString(test.processingStatus, "pending"),
    verificationStatus: safeString(test.verificationStatus, "pending"),
    paymentVerified: test.paymentVerified || false,
    orderedAt: test.orderedAt,
    
    patient: {
      name: safeString(test.patient?.name, "Unknown Patient"),
      patientId: safeString(test.patient?.patientId, "Unknown"),
      phone: safeString(test.patient?.phone, "N/A"),
      age: test.patient?.age,
      gender: safeString(test.patient?.gender),
    },
    
    doctor: {
      name: safeString(test.doctor?.name, "N/A"),
      specialization: safeString(test.doctor?.specialization, "N/A"),
    },
    
    orderedBy: {
      name: safeString(test.orderedBy?.name, "Unknown"),
    },
    
    charges: {
      basePrice: test.charges?.basePrice || 0,
      tax: test.charges?.tax || 0,
      discount: test.charges?.discount || 0,
      otherCharges: test.charges?.otherCharges || 0,
      totalAmount: test.charges?.totalAmount || 0,
      paid: test.charges?.paid || 0,
      due: test.charges?.due || 0,
      paymentStatus: safeString(test.charges?.paymentStatus, "pending"),
      paymentMethod: safeString(test.charges?.paymentMethod),
      transactionId: safeString(test.charges?.transactionId),
      paymentDate: test.charges?.paymentDate,
      collectedBy: test.charges?.collectedBy,
    },
    
    specimen: test.specimen,
    results: test.results,
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              {safeTest.testName}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline">{safeTest.testId}</Badge>
              <Badge className={getStatusColor(safeTest.status)}>
                {safeUpperCaseFirst(safeTest.status)}
              </Badge>
              <Badge className={getPriorityColor(safeTest.priority)}>
                {safeTest.priority}
              </Badge>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchTestDetails}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handlePrintReport}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleGenerateReport}>
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Mail className="h-4 w-4 mr-2" />
                Email Report
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Tabs defaultValue="details" className="w-full">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="specimen">Specimen</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
          <TabsTrigger value="payment">Payment</TabsTrigger>
        </TabsList>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Patient & Doctor Info */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Patient Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Patient Name</p>
                      <p className="font-medium">{safeTest.patient.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Patient ID</p>
                      <p className="font-medium">{safeTest.patient.patientId}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p className="font-medium">{safeTest.patient.phone}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Age / Gender</p>
                      <p className="font-medium">
                        {safeTest.patient.age ? `${safeTest.patient.age} years` : 'N/A'} / {safeTest.patient.gender}
                      </p>
                    </div>
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
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Doctor Name</p>
                      <p className="font-medium">Dr. {safeTest.doctor.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Specialization</p>
                      <p className="font-medium">{safeTest.doctor.specialization}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Test Info & Actions */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TestTube className="h-5 w-5" />
                    Test Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Test Category</p>
                    <p className="font-medium">{safeTest.category.replace(/_/g, ' ')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Ordered By</p>
                    <p className="font-medium">{safeTest.orderedBy.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Ordered At</p>
                    <p className="font-medium">
                      {safeFormatDate(safeTest.orderedAt, "MMM dd, yyyy HH:mm")}
                    </p>
                  </div>
                  {test.description && (
                    <div>
                      <p className="text-sm text-muted-foreground">Description</p>
                      <p className="font-medium">{test.description}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {safeTest.collectionStatus === "pending" && (
                    <Button asChild className="w-full">
                      <Link href={`/laboratory/tests/${params.id}/collect`}>
                        <TestTube className="h-4 w-4 mr-2" />
                        Collect Sample
                      </Link>
                    </Button>
                  )}
                  
                  {safeTest.collectionStatus === "collected" && safeTest.processingStatus === "pending" && (
                    <Button asChild className="w-full">
                      <Link href={`/laboratory/tests/${params.id}/process`}>
                        <Clock className="h-4 w-4 mr-2" />
                        Process Test
                      </Link>
                    </Button>
                  )}
                  
                  {safeTest.processingStatus === "completed" && safeTest.verificationStatus === "pending" && (
                    <Button asChild className="w-full">
                      <Link href={`/laboratory/tests/${params.id}/results`}>
                        <FileText className="h-4 w-4 mr-2" />
                        Enter Results
                      </Link>
                    </Button>
                  )}
                  
                  {!safeTest.paymentVerified && (
                    <Button asChild variant="outline" className="w-full">
                      <Link href={`/laboratory/tests/${params.id}/verify-payment`}>
                        <CreditCard className="h-4 w-4 mr-2" />
                        Verify Payment
                      </Link>
                    </Button>
                  )}
                  
                  <Button variant="outline" className="w-full" onClick={handlePrintReport}>
                    <Printer className="h-4 w-4 mr-2" />
                    Print Report
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Specimen Tab */}
        <TabsContent value="specimen" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube className="h-5 w-5" />
                Specimen Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {safeTest.specimen ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Type</p>
                      <p className="font-medium">{safeTest.specimen.type || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Quantity</p>
                      <p className="font-medium">{safeTest.specimen.quantity || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Container</p>
                      <p className="font-medium">{safeTest.specimen.container || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Collection Time</p>
                      <p className="font-medium">
                        {safeFormatDate(safeTest.specimen.collectionTime)}
                      </p>
                    </div>
                  </div>
                  {safeTest.specimen.remarks && (
                    <div>
                      <p className="text-sm text-muted-foreground">Remarks</p>
                      <p className="font-medium">{safeTest.specimen.remarks}</p>
                    </div>
                  )}
                  {safeTest.specimen.collectedBy && (
                    <div>
                      <p className="text-sm text-muted-foreground">Collected By</p>
                      <p className="font-medium">{safeTest.specimen.collectedBy.name}</p>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground">No specimen details available.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Results Tab */}
        <TabsContent value="results" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Test Results
              </CardTitle>
              <CardDescription>
                {safeTest.verificationStatus === "verified" 
                  ? "Results verified and ready for reporting"
                  : safeTest.processingStatus === "completed"
                  ? "Processing completed - awaiting verification"
                  : "Test results will appear here once processing is complete"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {safeTest.results ? (
                <div className="space-y-6">
                  {/* Parameters Table */}
                  {safeTest.results.parameters && safeTest.results.parameters.length > 0 && (
                    <div>
                      <h3 className="text-lg font-medium mb-4">Parameters</h3>
                      <div className="rounded-md border">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b bg-muted/50">
                              <th className="p-3 text-left font-medium">Parameter</th>
                              <th className="p-3 text-left font-medium">Value</th>
                              <th className="p-3 text-left font-medium">Unit</th>
                              <th className="p-3 text-left font-medium">Normal Range</th>
                              <th className="p-3 text-left font-medium">Flag</th>
                              <th className="p-3 text-left font-medium">Remarks</th>
                            </tr>
                          </thead>
                          <tbody>
                            {safeTest.results.parameters.map((param, index) => (
                              <tr key={index} className="border-b hover:bg-muted/50">
                                <td className="p-3">{param.name}</td>
                                <td className="p-3 font-medium">{param.value}</td>
                                <td className="p-3">{param.unit || "-"}</td>
                                <td className="p-3">{param.normalRange}</td>
                                <td className="p-3">
                                  <Badge variant={
                                    param.flag === "critical" ? "destructive" :
                                    param.flag === "high" || param.flag === "low" ? "secondary" :
                                    "default"
                                  }>
                                    {param.flag || "normal"}
                                  </Badge>
                                </td>
                                <td className="p-3">{param.remarks || "-"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                  
                  {/* Interpretation */}
                  {safeTest.results.interpretation && (
                    <div>
                      <h3 className="text-lg font-medium mb-2">Interpretation</h3>
                      <div className="p-4 bg-muted/50 rounded-md">
                        <p className="whitespace-pre-wrap">{safeTest.results.interpretation}</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Report Actions */}
                  <div className="flex gap-2">
                    <Button onClick={handleGenerateReport}>
                      <Download className="h-4 w-4 mr-2" />
                      Download Report
                    </Button>
                    <Button variant="outline" onClick={handlePrintReport}>
                      <Printer className="h-4 w-4 mr-2" />
                      Print Report
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">Results Pending</h3>
                  <p className="text-muted-foreground mt-2">
                    Test results are not available yet. Check back after processing is complete.
                  </p>
                  {safeTest.processingStatus === "completed" && (
                    <Button asChild className="mt-4">
                      <Link href={`/laboratory/tests/${params.id}/results`}>
                        Enter Results
                      </Link>
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment Tab */}
        <TabsContent value="payment" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Base Price</p>
                  <p className="font-medium">₹{safeTest.charges.basePrice.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tax</p>
                  <p className="font-medium">₹{safeTest.charges.tax.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Discount</p>
                  <p className="font-medium">₹{safeTest.charges.discount.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Other Charges</p>
                  <p className="font-medium">₹{safeTest.charges.otherCharges.toFixed(2)}</p>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <p className="font-medium">Total Amount</p>
                  <p className="font-bold">₹{safeTest.charges.totalAmount.toFixed(2)}</p>
                </div>
                <div className="flex justify-between">
                  <p className="font-medium">Paid Amount</p>
                  <p className="font-bold text-green-600">₹{safeTest.charges.paid.toFixed(2)}</p>
                </div>
                <div className="flex justify-between">
                  <p className="font-medium">Due Amount</p>
                  <p className={`font-bold ${safeTest.charges.due > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    ₹{safeTest.charges.due.toFixed(2)}
                  </p>
                </div>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Payment Status</p>
                <div className="flex items-center gap-2">
                  <Badge className={getPaymentColor(safeTest.paymentVerified, safeTest.charges.paymentStatus)}>
                    {safeTest.paymentVerified ? "Verified" : safeUpperCaseFirst(safeTest.charges.paymentStatus)}
                  </Badge>
                  {safeTest.paymentVerified && (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Payment Verified
                    </Badge>
                  )}
                </div>
              </div>
              
              {safeTest.charges.paymentMethod && (
                <div>
                  <p className="text-sm text-muted-foreground">Payment Method</p>
                  <p className="font-medium">{safeTest.charges.paymentMethod}</p>
                </div>
              )}
              
              {safeTest.charges.transactionId && (
                <div>
                  <p className="text-sm text-muted-foreground">Transaction ID</p>
                  <p className="font-medium">{safeTest.charges.transactionId}</p>
                </div>
              )}
              
              {safeTest.charges.paymentDate && (
                <div>
                  <p className="text-sm text-muted-foreground">Payment Date</p>
                  <p className="font-medium">
                    {safeFormatDate(safeTest.charges.paymentDate)}
                  </p>
                </div>
              )}
              
              {!safeTest.paymentVerified && (
                <div className="pt-4">
                  <Button asChild className="w-full">
                    <Link href={`/laboratory/tests/${params.id}/verify-payment`}>
                      <CreditCard className="h-4 w-4 mr-2" />
                      Verify Payment
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}