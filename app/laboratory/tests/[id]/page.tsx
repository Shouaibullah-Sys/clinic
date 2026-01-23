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
import { 
  ArrowLeft, 
  Calendar, 
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
  Edit,
  MoreVertical
} from "lucide-react";
import { format } from "date-fns";
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
  collectedAt?: string;
  completedAt?: string;
  reportedAt?: string;
  
  appointment: {
    appointmentId: string;
    date: string;
  };
  
  patient: {
    name: string;
    patientId: string;
    phone: string;
    age?: number;
    gender?: string;
  };
  
  doctor: {
    name: string;
    specialization: string;
    phone?: string;
  };
  
  orderedBy: {
    name: string;
  };
  
  charges: {
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
  
  collectionDetails?: {
    collectionTime?: string;
    collectedBy?: {
      name: string;
    };
    sampleId?: string;
    sampleCondition?: string;
    collectionNotes?: string;
  };
  
  processingDetails?: {
    processingStartTime?: string;
    processingEndTime?: string;
    processedBy?: {
      name: string;
    };
    equipmentUsed?: string;
    reagentsUsed?: string[];
    qualityControl?: {
      passed?: boolean;
      notes?: string;
    };
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
  
  verificationDetails?: {
    verifiedBy?: {
      name: string;
    };
    verifiedAt?: string;
    verificationNotes?: string;
  };
  
  paymentVerifiedBy?: {
    name: string;
  };
  paymentVerifiedAt?: string;
}

export default function TestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [test, setTest] = useState<LabTest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTestDetails();
  }, [params.id]);

  const fetchTestDetails = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/laboratory/tests/${params.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch test details');
      }
      
      const data = await response.json();
      setTest(data.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ordered": return "bg-blue-100 text-blue-800";
      case "collected": return "bg-yellow-100 text-yellow-800";
      case "processing": return "bg-purple-100 text-purple-800";
      case "completed": return "bg-green-100 text-green-800";
      case "reported": return "bg-emerald-100 text-emerald-800";
      case "cancelled": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "emergency": return "bg-red-100 text-red-800 border-red-300";
      case "urgent": return "bg-orange-100 text-orange-800 border-orange-300";
      default: return "bg-blue-100 text-blue-800 border-blue-300";
    }
  };

  const getPaymentColor = (verified: boolean, status: string) => {
    if (verified) return "bg-green-100 text-green-800";
    switch (status) {
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
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/laboratory/tests/${params.id}/generate-report`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
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

  if (loading) {
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
              {test.testName}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline">{test.testId}</Badge>
              <Badge className={getStatusColor(test.status)}>
                {test.status.charAt(0).toUpperCase() + test.status.slice(1)}
              </Badge>
              <Badge className={getPriorityColor(test.priority)}>
                {test.priority}
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
        <TabsList className="grid grid-cols-2 md:grid-cols-5 w-full">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="specimen">Specimen</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
          <TabsTrigger value="payment">Payment</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
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
                      <p className="font-medium">{test.patient.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Patient ID</p>
                      <p className="font-medium">{test.patient.patientId}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p className="font-medium">{test.patient.phone}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Age / Gender</p>
                      <p className="font-medium">
                        {test.patient.age ? `${test.patient.age} years` : 'N/A'} / {test.patient.gender || 'N/A'}
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
                      <p className="font-medium">Dr. {test.doctor.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Specialization</p>
                      <p className="font-medium">{test.doctor.specialization}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Appointment ID</p>
                      <p className="font-medium">{test.appointment.appointmentId}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Appointment Date</p>
                      <p className="font-medium">
                        {format(new Date(test.appointment.date), "MMM dd, yyyy")}
                      </p>
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
                    <p className="font-medium">{test.category.replace(/_/g, ' ')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Ordered By</p>
                    <p className="font-medium">{test.orderedBy.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Ordered At</p>
                    <p className="font-medium">
                      {format(new Date(test.orderedAt), "MMM dd, yyyy HH:mm")}
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
                  {test.collectionStatus === "pending" && (
                    <Button asChild className="w-full">
                      <Link href={`/laboratory/tests/${params.id}/collect`}>
                        <TestTube className="h-4 w-4 mr-2" />
                        Collect Sample
                      </Link>
                    </Button>
                  )}
                  
                  {test.collectionStatus === "collected" && test.processingStatus === "pending" && (
                    <Button asChild className="w-full">
                      <Link href={`/laboratory/tests/${params.id}/process`}>
                        <Clock className="h-4 w-4 mr-2" />
                        Process Test
                      </Link>
                    </Button>
                  )}
                  
                  {test.processingStatus === "completed" && test.verificationStatus === "pending" && (
                    <Button asChild className="w-full">
                      <Link href={`/laboratory/tests/${params.id}/results`}>
                        <FileText className="h-4 w-4 mr-2" />
                        Enter Results
                      </Link>
                    </Button>
                  )}
                  
                  {!test.paymentVerified && (
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Specimen Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TestTube className="h-5 w-5" />
                  Specimen Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {test.specimen ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Type</p>
                        <p className="font-medium">{test.specimen.type || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Quantity</p>
                        <p className="font-medium">{test.specimen.quantity || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Container</p>
                        <p className="font-medium">{test.specimen.container || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Collection Time</p>
                        <p className="font-medium">
                          {test.specimen.collectionTime 
                            ? format(new Date(test.specimen.collectionTime), "MMM dd, yyyy HH:mm")
                            : "N/A"}
                        </p>
                      </div>
                    </div>
                    {test.specimen.remarks && (
                      <div>
                        <p className="text-sm text-muted-foreground">Remarks</p>
                        <p className="font-medium">{test.specimen.remarks}</p>
                      </div>
                    )}
                    {test.specimen.collectedBy && (
                      <div>
                        <p className="text-sm text-muted-foreground">Collected By</p>
                        <p className="font-medium">{test.specimen.collectedBy.name}</p>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-muted-foreground">No specimen details available.</p>
                )}
              </CardContent>
            </Card>

            {/* Collection Status */}
            <Card>
              <CardHeader>
                <CardTitle>Collection Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Collection Status</p>
                  <Badge className={
                    test.collectionStatus === "collected" ? "bg-green-100 text-green-800" :
                    test.collectionStatus === "pending" ? "bg-yellow-100 text-yellow-800" :
                    "bg-gray-100 text-gray-800"
                  }>
                    {test.collectionStatus.charAt(0).toUpperCase() + test.collectionStatus.slice(1)}
                  </Badge>
                </div>
                
                {test.collectionDetails && (
                  <>
                    {test.collectionDetails.sampleId && (
                      <div>
                        <p className="text-sm text-muted-foreground">Sample ID</p>
                        <p className="font-medium">{test.collectionDetails.sampleId}</p>
                      </div>
                    )}
                    
                    {test.collectionDetails.sampleCondition && (
                      <div>
                        <p className="text-sm text-muted-foreground">Sample Condition</p>
                        <p className="font-medium">{test.collectionDetails.sampleCondition}</p>
                      </div>
                    )}
                    
                    {test.collectionDetails.collectionNotes && (
                      <div>
                        <p className="text-sm text-muted-foreground">Collection Notes</p>
                        <p className="font-medium">{test.collectionDetails.collectionNotes}</p>
                      </div>
                    )}
                    
                    {test.collectionDetails.collectedBy && (
                      <div>
                        <p className="text-sm text-muted-foreground">Collected By</p>
                        <p className="font-medium">{test.collectionDetails.collectedBy.name}</p>
                      </div>
                    )}
                    
                    {test.collectionDetails.collectionTime && (
                      <div>
                        <p className="text-sm text-muted-foreground">Collection Time</p>
                        <p className="font-medium">
                          {format(new Date(test.collectionDetails.collectionTime), "MMM dd, yyyy HH:mm")}
                        </p>
                      </div>
                    )}
                  </>
                )}
                
                {test.collectionStatus === "pending" && (
                  <Button asChild className="w-full mt-4">
                    <Link href={`/laboratory/tests/${params.id}/collect`}>
                      <TestTube className="h-4 w-4 mr-2" />
                      Collect Sample Now
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
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
                {test.verificationStatus === "verified" 
                  ? "Results verified and ready for reporting"
                  : test.processingStatus === "completed"
                  ? "Processing completed - awaiting verification"
                  : "Test results will appear here once processing is complete"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {test.results ? (
                <div className="space-y-6">
                  {/* Parameters Table */}
                  {test.results.parameters && test.results.parameters.length > 0 && (
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
                            {test.results.parameters.map((param, index) => (
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
                  {test.results.interpretation && (
                    <div>
                      <h3 className="text-lg font-medium mb-2">Interpretation</h3>
                      <div className="p-4 bg-muted/50 rounded-md">
                        <p className="whitespace-pre-wrap">{test.results.interpretation}</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Verification Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {test.results.reportedBy && (
                      <div>
                        <p className="text-sm text-muted-foreground">Reported By</p>
                        <p className="font-medium">{test.results.reportedBy.name}</p>
                      </div>
                    )}
                    
                    {test.results.reportedAt && (
                      <div>
                        <p className="text-sm text-muted-foreground">Reported At</p>
                        <p className="font-medium">
                          {format(new Date(test.results.reportedAt), "MMM dd, yyyy HH:mm")}
                        </p>
                      </div>
                    )}
                    
                    {test.results.verifiedBy && (
                      <div>
                        <p className="text-sm text-muted-foreground">Verified By</p>
                        <p className="font-medium">{test.results.verifiedBy.name}</p>
                      </div>
                    )}
                    
                    {test.results.verifiedAt && (
                      <div>
                        <p className="text-sm text-muted-foreground">Verified At</p>
                        <p className="font-medium">
                          {format(new Date(test.results.verifiedAt), "MMM dd, yyyy HH:mm")}
                        </p>
                      </div>
                    )}
                  </div>
                  
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
                  {test.processingStatus === "completed" && (
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Payment Details */}
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
                    <p className="font-medium">₹{test.charges.basePrice.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Tax</p>
                    <p className="font-medium">₹{test.charges.tax.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Discount</p>
                    <p className="font-medium">₹{test.charges.discount.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Other Charges</p>
                    <p className="font-medium">₹{test.charges.otherCharges.toFixed(2)}</p>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <p className="font-medium">Total Amount</p>
                    <p className="font-bold">₹{test.charges.totalAmount.toFixed(2)}</p>
                  </div>
                  <div className="flex justify-between">
                    <p className="font-medium">Paid Amount</p>
                    <p className="font-bold text-green-600">₹{test.charges.paid.toFixed(2)}</p>
                  </div>
                  <div className="flex justify-between">
                    <p className="font-medium">Due Amount</p>
                    <p className={`font-bold ${test.charges.due > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      ₹{test.charges.due.toFixed(2)}
                    </p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Payment Status</p>
                  <div className="flex items-center gap-2">
                    <Badge className={getPaymentColor(test.paymentVerified, test.charges.paymentStatus)}>
                      {test.paymentVerified ? "Verified" : test.charges.paymentStatus}
                    </Badge>
                    {test.paymentVerified && (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Payment Verified
                      </Badge>
                    )}
                  </div>
                </div>
                
                {test.charges.paymentMethod && (
                  <div>
                    <p className="text-sm text-muted-foreground">Payment Method</p>
                    <p className="font-medium">{test.charges.paymentMethod}</p>
                  </div>
                )}
                
                {test.charges.transactionId && (
                  <div>
                    <p className="text-sm text-muted-foreground">Transaction ID</p>
                    <p className="font-medium">{test.charges.transactionId}</p>
                  </div>
                )}
                
                {test.charges.paymentDate && (
                  <div>
                    <p className="text-sm text-muted-foreground">Payment Date</p>
                    <p className="font-medium">
                      {format(new Date(test.charges.paymentDate), "MMM dd, yyyy HH:mm")}
                    </p>
                  </div>
                )}
                
                {test.charges.collectedBy && (
                  <div>
                    <p className="text-sm text-muted-foreground">Collected By</p>
                    <p className="font-medium">{test.charges.collectedBy.name}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payment Verification */}
            <Card>
              <CardHeader>
                <CardTitle>Payment Verification</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Payment Verified</p>
                  <div className="flex items-center gap-2">
                    {test.paymentVerified ? (
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Verified
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Not Verified
                      </Badge>
                    )}
                  </div>
                </div>
                
                {test.paymentVerifiedBy && (
                  <div>
                    <p className="text-sm text-muted-foreground">Verified By</p>
                    <p className="font-medium">{test.paymentVerifiedBy.name}</p>
                  </div>
                )}
                
                {test.paymentVerifiedAt && (
                  <div>
                    <p className="text-sm text-muted-foreground">Verified At</p>
                    <p className="font-medium">
                      {format(new Date(test.paymentVerifiedAt), "MMM dd, yyyy HH:mm")}
                    </p>
                  </div>
                )}
                
                {test.verificationDetails?.verificationNotes && (
                  <div>
                    <p className="text-sm text-muted-foreground">Verification Notes</p>
                    <p className="font-medium">{test.verificationDetails.verificationNotes}</p>
                  </div>
                )}
                
                {!test.paymentVerified && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        This test requires payment verification before sample collection can proceed.
                      </p>
                      <Button asChild className="w-full">
                        <Link href={`/laboratory/tests/${params.id}/verify-payment`}>
                          <CreditCard className="h-4 w-4 mr-2" />
                          Verify Payment
                        </Link>
                      </Button>
                      <Button variant="outline" asChild className="w-full">
                        <Link href={`/reception/lab-tests/${params.id}/charges`}>
                          Update Payment
                        </Link>
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Test Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative pl-6 space-y-8">
                {/* Timeline line */}
                <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-muted"></div>
                
                {/* Ordered */}
                <div className="relative">
                  <div className="absolute -left-6.5 top-1 h-4 w-4 rounded-full bg-blue-500 border-4 border-background"></div>
                  <div className="space-y-1">
                    <p className="font-medium">Test Ordered</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(test.orderedAt), "MMM dd, yyyy HH:mm")}
                    </p>
                    <p className="text-sm">Ordered by: {test.orderedBy.name}</p>
                  </div>
                </div>
                
                {/* Payment */}
                <div className="relative">
                  <div className={`absolute -left-6.5 top-1 h-4 w-4 rounded-full border-4 border-background ${
                    test.charges.paid > 0 ? 'bg-green-500' : 'bg-gray-300'
                  }`}></div>
                  <div className="space-y-1">
                    <p className="font-medium">Payment</p>
                    <p className="text-sm text-muted-foreground">
                      {test.charges.paymentDate 
                        ? format(new Date(test.charges.paymentDate), "MMM dd, yyyy HH:mm")
                        : "Pending"}
                    </p>
                    <p className="text-sm">
                      Status: {test.charges.paymentStatus} | 
                      Paid: ₹{test.charges.paid} | 
                      Due: ₹{test.charges.due}
                    </p>
                    {test.charges.collectedBy && (
                      <p className="text-sm">Collected by: {test.charges.collectedBy.name}</p>
                    )}
                  </div>
                </div>
                
                {/* Collection */}
                <div className="relative">
                  <div className={`absolute -left-6.5 top-1 h-4 w-4 rounded-full border-4 border-background ${
                    test.collectionStatus === "collected" ? 'bg-green-500' :
                    test.collectionStatus === "pending" ? 'bg-yellow-500' : 'bg-gray-300'
                  }`}></div>
                  <div className="space-y-1">
                    <p className="font-medium">Sample Collection</p>
                    <p className="text-sm text-muted-foreground">
                      {test.collectionStatus === "collected" && test.specimen?.collectionTime
                        ? format(new Date(test.specimen.collectionTime), "MMM dd, yyyy HH:mm")
                        : test.collectionStatus.charAt(0).toUpperCase() + test.collectionStatus.slice(1)}
                    </p>
                    {test.specimen?.collectedBy && (
                      <p className="text-sm">Collected by: {test.specimen.collectedBy.name}</p>
                    )}
                    {test.specimen?.type && (
                      <p className="text-sm">Type: {test.specimen.type}</p>
                    )}
                  </div>
                </div>
                
                {/* Processing */}
                <div className="relative">
                  <div className={`absolute -left-6.5 top-1 h-4 w-4 rounded-full border-4 border-background ${
                    test.processingStatus === "completed" ? 'bg-green-500' :
                    test.processingStatus === "processing" ? 'bg-blue-500' :
                    test.processingStatus === "failed" ? 'bg-red-500' : 'bg-gray-300'
                  }`}></div>
                  <div className="space-y-1">
                    <p className="font-medium">Test Processing</p>
                    <p className="text-sm text-muted-foreground">
                      {test.processingStatus.charAt(0).toUpperCase() + test.processingStatus.slice(1)}
                    </p>
                    {test.processingDetails?.processedBy && (
                      <p className="text-sm">Processed by: {test.processingDetails.processedBy.name}</p>
                    )}
                    {test.processingDetails?.equipmentUsed && (
                      <p className="text-sm">Equipment: {test.processingDetails.equipmentUsed}</p>
                    )}
                  </div>
                </div>
                
                {/* Results */}
                <div className="relative">
                  <div className={`absolute -left-6.5 top-1 h-4 w-4 rounded-full border-4 border-background ${
                    test.verificationStatus === "verified" ? 'bg-green-500' :
                    test.verificationStatus === "preliminary" ? 'bg-yellow-500' : 'bg-gray-300'
                  }`}></div>
                  <div className="space-y-1">
                    <p className="font-medium">Results & Verification</p>
                    <p className="text-sm text-muted-foreground">
                      {test.verificationStatus.charAt(0).toUpperCase() + test.verificationStatus.slice(1)}
                    </p>
                    {test.results?.reportedBy && (
                      <p className="text-sm">Reported by: {test.results.reportedBy.name}</p>
                    )}
                    {test.results?.verifiedBy && (
                      <p className="text-sm">Verified by: {test.results.verifiedBy.name}</p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}