// app/laboratory/tests/page.tsx
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import {
  Search,
  Filter,
  MoreVertical,
  Eye,
  FileText,
  TestTube,
  AlertTriangle,
  CheckCircle,
  Clock,
  Calendar,
  Download,
  Printer,
  Mail,
  RefreshCw,
  Plus,
  Activity
} from "lucide-react";
import { format } from "date-fns";
import { useAuthStore } from "@/store/useAuthStore";

interface LabTest {
  _id: string;
  testId: string;
  testName: string;
  category: string;
  patient: {
    name: string;
    patientId: string;
    phone: string;
  };
  doctor: {
    name: string;
    specialization: string;
  };
  status: string;
  priority: string;
  collectionStatus: string;
  processingStatus: string;
  verificationStatus: string;
  paymentVerified: boolean;
  orderedAt: string;
  charges: {
    paymentStatus: string;
    totalAmount: number;
    paid: number;
    due: number;
  };
  results?: {
    reportedAt?: string;
  };
}

export default function LaboratoryTestsPage() {
  const { accessToken } = useAuthStore();
  const [tests, setTests] = useState<LabTest[]>([]);
  const [filteredTests, setFilteredTests] = useState<LabTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [collectionFilter, setCollectionFilter] = useState("all");
  const [processingFilter, setProcessingFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [selectedTest, setSelectedTest] = useState<LabTest | null>(null);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportNotes, setReportNotes] = useState("");

  useEffect(() => {
    fetchTests();
  }, []);

  const fetchTests = async () => {
    try {
      setLoading(true);
      if (!accessToken) return;

      const response = await fetch('/api/laboratory/tests?limit=50', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.status === 401) {
        window.location.href = '/login';
        return;
      }
      
      if (response.ok) {
        const data = await response.json();
        setTests(data.data || []);
        setFilteredTests(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching tests:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    filterTests();
  }, [searchQuery, statusFilter, collectionFilter, processingFilter, paymentFilter, tests]);

  const filterTests = () => {
    let filtered = [...tests];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(test =>
        test.testId.toLowerCase().includes(query) ||
        test.testName.toLowerCase().includes(query) ||
        test.patient.name.toLowerCase().includes(query) ||
        test.patient.patientId.toLowerCase().includes(query) ||
        test.doctor.name.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(test => test.status === statusFilter);
    }

    // Apply collection filter
    if (collectionFilter !== "all") {
      filtered = filtered.filter(test => test.collectionStatus === collectionFilter);
    }

    // Apply processing filter
    if (processingFilter !== "all") {
      filtered = filtered.filter(test => test.processingStatus === processingFilter);
    }

    // Apply payment filter
    if (paymentFilter !== "all") {
      if (paymentFilter === "verified") {
        filtered = filtered.filter(test => test.paymentVerified);
      } else if (paymentFilter === "pending") {
        filtered = filtered.filter(test => !test.paymentVerified);
      }
    }

    setFilteredTests(filtered);
  };

  const getStatusBadge = (test: LabTest) => {
    if (test.verificationStatus === "verified") {
      return <Badge className="bg-green-100 text-green-800">Reported</Badge>;
    }
    
    if (test.processingStatus === "completed") {
      return <Badge className="bg-purple-100 text-purple-800">Ready for Report</Badge>;
    }
    
    if (test.processingStatus === "processing") {
      return <Badge className="bg-blue-100 text-blue-800">Processing</Badge>;
    }
    
    if (test.collectionStatus === "collected") {
      return <Badge className="bg-yellow-100 text-yellow-800">Collected</Badge>;
    }
    
    if (test.collectionStatus === "pending") {
      return <Badge className="bg-gray-100 text-gray-800">Pending Collection</Badge>;
    }
    
    return <Badge className="bg-gray-100 text-gray-800">{test.status}</Badge>;
  };

  const handleGenerateReport = (test: LabTest) => {
    setSelectedTest(test);
    setShowReportDialog(true);
  };

  const handlePrintReport = (test: LabTest) => {
    // Generate and print report
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Lab Report - ${test.testId}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 40px; }
              .header { text-align: center; margin-bottom: 30px; }
              .header h1 { color: #333; margin-bottom: 5px; }
              .header .subtitle { color: #666; font-size: 14px; }
              .patient-info, .test-info, .results { margin: 20px 0; }
              .section-title { border-bottom: 2px solid #333; padding-bottom: 5px; margin-bottom: 15px; }
              table { width: 100%; border-collapse: collapse; margin: 10px 0; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f5f5f5; }
              .footer { margin-top: 50px; text-align: right; font-size: 12px; color: #666; }
              @media print {
                body { margin: 0; }
                .no-print { display: none; }
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>MEDICAL LABORATORY REPORT</h1>
              <div class="subtitle">${format(new Date(), "MMMM dd, yyyy")}</div>
            </div>
            
            <div class="patient-info">
              <div class="section-title">Patient Information</div>
              <table>
                <tr>
                  <td><strong>Patient Name:</strong></td>
                  <td>${test.patient.name}</td>
                  <td><strong>Patient ID:</strong></td>
                  <td>${test.patient.patientId}</td>
                </tr>
                <tr>
                  <td><strong>Referring Doctor:</strong></td>
                  <td>Dr. ${test.doctor.name}</td>
                  <td><strong>Specialization:</strong></td>
                  <td>${test.doctor.specialization}</td>
                </tr>
              </table>
            </div>
            
            <div class="test-info">
              <div class="section-title">Test Information</div>
              <table>
                <tr>
                  <td><strong>Test ID:</strong></td>
                  <td>${test.testId}</td>
                  <td><strong>Test Name:</strong></td>
                  <td>${test.testName}</td>
                </tr>
                <tr>
                  <td><strong>Category:</strong></td>
                  <td>${test.category}</td>
                  <td><strong>Priority:</strong></td>
                  <td>${test.priority}</td>
                </tr>
                <tr>
                  <td><strong>Ordered Date:</strong></td>
                  <td>${format(new Date(test.orderedAt), "MMM dd, yyyy HH:mm")}</td>
                  <td><strong>Status:</strong></td>
                  <td>${test.status}</td>
                </tr>
              </table>
            </div>
            
            <div class="results">
              <div class="section-title">Test Results</div>
              <p>Test results are being processed. Report will be available once completed.</p>
            </div>
            
            <div class="footer">
              <p>Generated on ${format(new Date(), "MMMM dd, yyyy HH:mm")}</p>
              <p>Authorized Laboratory Signature</p>
            </div>
            
            <div class="no-print" style="margin-top: 30px;">
              <button onclick="window.print()">Print Report</button>
              <button onclick="window.close()">Close</button>
            </div>
            
            <script>
              window.onload = function() {
                window.print();
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const handleSendReport = async (test: LabTest) => {
    if (!accessToken) return;
    
    // Send report via email
    try {
      const response = await fetch(`/api/laboratory/tests/${test._id}/send-report`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipient: "",
          notes: reportNotes,
        }),
      });

      if (response.ok) {
        alert('Report sent successfully!');
        setShowReportDialog(false);
        setReportNotes("");
      } else {
        throw new Error('Failed to send report');
      }
    } catch (error) {
      console.error('Error sending report:', error);
      alert('Failed to send report. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="h-8 bg-gray-200 rounded animate-pulse w-1/4" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
        <div className="space-y-4">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Laboratory Tests</h1>
          <p className="text-muted-foreground">
            Manage and track all laboratory tests
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchTests}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button asChild>
            <Link href="/laboratory/tests/new">
              <Plus className="h-4 w-4 mr-2" />
              New Test Order
            </Link>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tests..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Test Status" />
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
            <Select value={collectionFilter} onValueChange={setCollectionFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Collection" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Collection</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="collected">Collected</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Payment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Payment</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Stats Tabs */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid grid-cols-2 md:grid-cols-5 w-full">
          <TabsTrigger value="all">All Tests ({tests.length})</TabsTrigger>
          <TabsTrigger value="pending">
            Pending Collection ({tests.filter(t => t.collectionStatus === "pending").length})
          </TabsTrigger>
          <TabsTrigger value="processing">
            In Processing ({tests.filter(t => t.processingStatus === "processing").length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({tests.filter(t => t.processingStatus === "completed").length})
          </TabsTrigger>
          <TabsTrigger value="reported">
            Reported ({tests.filter(t => t.verificationStatus === "verified").length})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="space-y-4">
          <TestsTable tests={filteredTests} onGenerateReport={handleGenerateReport} />
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          <TestsTable tests={filteredTests.filter(t => t.collectionStatus === "pending")} onGenerateReport={handleGenerateReport} />
        </TabsContent>

        <TabsContent value="processing" className="space-y-4">
          <TestsTable tests={filteredTests.filter(t => t.processingStatus === "processing")} onGenerateReport={handleGenerateReport} />
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          <TestsTable tests={filteredTests.filter(t => t.processingStatus === "completed")} onGenerateReport={handleGenerateReport} />
        </TabsContent>

        <TabsContent value="reported" className="space-y-4">
          <TestsTable tests={filteredTests.filter(t => t.verificationStatus === "verified")} onGenerateReport={handleGenerateReport} />
        </TabsContent>
      </Tabs>

      {/* Report Dialog */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent className="sm:max-w-125">
          <DialogHeader>
            <DialogTitle>Generate Lab Report</DialogTitle>
            <DialogDescription>
              Generate and send laboratory report for {selectedTest?.testId}
            </DialogDescription>
          </DialogHeader>
          
          {selectedTest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Patient</Label>
                  <div className="text-sm font-medium">{selectedTest.patient.name}</div>
                </div>
                <div>
                  <Label>Test</Label>
                  <div className="text-sm font-medium">{selectedTest.testName}</div>
                </div>
                <div>
                  <Label>Test ID</Label>
                  <div className="text-sm font-medium">{selectedTest.testId}</div>
                </div>
                <div>
                  <Label>Doctor</Label>
                  <div className="text-sm font-medium">Dr. {selectedTest.doctor.name}</div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="report-notes">Additional Notes</Label>
                <Textarea
                  id="report-notes"
                  placeholder="Add any additional notes or comments for the report..."
                  value={reportNotes}
                  onChange={(e) => setReportNotes(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
          )}
          
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => selectedTest && handlePrintReport(selectedTest)}
            >
              <Printer className="h-4 w-4 mr-2" />
              Print Report
            </Button>
            <Button
              onClick={() => selectedTest && handleSendReport(selectedTest)}
            >
              <Mail className="h-4 w-4 mr-2" />
              Send to Doctor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TestsTable({ tests, onGenerateReport }: { tests: LabTest[]; onGenerateReport: (test: LabTest) => void }) {
  if (tests.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <TestTube className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No tests found</h3>
          <p className="text-muted-foreground mt-2">
            No laboratory tests match your current filters.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Test ID</TableHead>
            <TableHead>Patient</TableHead>
            <TableHead>Test Name</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Payment</TableHead>
            <TableHead>Ordered</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tests.map((test) => (
            <TableRow key={test._id}>
              <TableCell className="font-medium">
                <Link 
                  href={`/laboratory/tests/${test._id}`}
                  className="hover:text-primary hover:underline"
                >
                  {test.testId}
                </Link>
              </TableCell>
              <TableCell>
                <div>
                  <div className="font-medium">{test.patient.name}</div>
                  <div className="text-sm text-muted-foreground">{test.patient.patientId}</div>
                </div>
              </TableCell>
              <TableCell>{test.testName}</TableCell>
              <TableCell>
                <Badge className={getStatusColor(test.status)}>
                  {test.status}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge 
                  variant="outline" 
                  className={getPriorityColor(test.priority)}
                >
                  {test.priority}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Badge className={getPaymentColor(test.paymentVerified, test.charges.paymentStatus)}>
                    {test.paymentVerified ? "Verified" : test.charges.paymentStatus}
                  </Badge>
                  {test.charges.due > 0 && (
                    <span className="text-xs text-red-600">
                      ₹{test.charges.due}
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                {format(new Date(test.orderedAt), "MMM dd, HH:mm")}
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/laboratory/tests/${test._id}`}>
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Link>
                    </DropdownMenuItem>
                    
                    {test.collectionStatus === "pending" && (
                      <DropdownMenuItem asChild>
                        <Link href={`/laboratory/tests/${test._id}/collect`}>
                          <TestTube className="h-4 w-4 mr-2" />
                          Collect Sample
                        </Link>
                      </DropdownMenuItem>
                    )}
                    
                    {test.collectionStatus === "collected" && test.processingStatus === "pending" && (
                      <DropdownMenuItem asChild>
                        <Link href={`/laboratory/tests/${test._id}/process`}>
                          <Activity className="h-4 w-4 mr-2" />
                          Process Test
                        </Link>
                      </DropdownMenuItem>
                    )}
                    
                    {test.processingStatus === "completed" && test.verificationStatus === "pending" && (
                      <DropdownMenuItem asChild>
                        <Link href={`/laboratory/tests/${test._id}/results`}>
                          <FileText className="h-4 w-4 mr-2" />
                          Enter Results
                        </Link>
                      </DropdownMenuItem>
                    )}
                    
                    {test.verificationStatus === "verified" && (
                      <>
                        <DropdownMenuItem onClick={() => onGenerateReport(test)}>
                          <Printer className="h-4 w-4 mr-2" />
                          Generate Report
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Download className="h-4 w-4 mr-2" />
                          Download PDF
                        </DropdownMenuItem>
                      </>
                    )}
                    
                    <DropdownMenuSeparator />
                    
                    {!test.paymentVerified && (
                      <DropdownMenuItem asChild>
                        <Link href={`/laboratory/tests/${test._id}/verify-payment`}>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Verify Payment
                        </Link>
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// Helper functions for styling
function getStatusColor(status: string) {
  switch (status) {
    case "ordered": return "bg-blue-100 text-blue-800";
    case "collected": return "bg-yellow-100 text-yellow-800";
    case "processing": return "bg-purple-100 text-purple-800";
    case "completed": return "bg-green-100 text-green-800";
    case "reported": return "bg-emerald-100 text-emerald-800";
    case "cancelled": return "bg-red-100 text-red-800";
    default: return "bg-gray-100 text-gray-800";
  }
}

function getPriorityColor(priority: string) {
  switch (priority) {
    case "emergency": return "bg-red-100 text-red-800 border-red-300";
    case "urgent": return "bg-orange-100 text-orange-800 border-orange-300";
    default: return "bg-blue-100 text-blue-800 border-blue-300";
  }
}

function getPaymentColor(verified: boolean, status: string) {
  if (verified) return "bg-green-100 text-green-800";
  switch (status) {
    case "paid": return "bg-green-100 text-green-800";
    case "partial": return "bg-yellow-100 text-yellow-800";
    case "pending": return "bg-red-100 text-red-800";
    default: return "bg-gray-100 text-gray-800";
  }
} 