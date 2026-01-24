"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Search,
  TestTube,
  Eye,
  FileText,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  User,
  Stethoscope
} from "lucide-react";
import Link from "next/link";
import { useAuthStore } from "@/store/useAuthStore";
import { format } from "date-fns";

interface LabTest {
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
  status: string;
  collectionStatus: string;
  processingStatus: string;
  orderedAt: string;
  paymentVerified: boolean;
  priority: string;
}

export default function LaboratoryTestsPage() {
  const { accessToken } = useAuthStore();
  const [tests, setTests] = useState<LabTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchTests();
  }, []);

  const fetchTests = async () => {
    try {
      setLoading(true);
      if (!accessToken) return;

      const response = await fetch('/api/laboratory/tests', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setTests(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching tests:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTests = tests.filter(test => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      test.testId.toLowerCase().includes(query) ||
      test.testName.toLowerCase().includes(query) ||
      test.patient.name.toLowerCase().includes(query) ||
      test.patient.patientId.toLowerCase().includes(query)
    );
  });

  const getStatusBadge = (test: LabTest) => {
    // If results already entered
    if (test.processingStatus === "completed") {
      return <Badge className="bg-green-100 text-green-800">Results Entered</Badge>;
    }
    
    // If sample collected, ready for exam
    if (test.collectionStatus === "collected") {
      return <Badge className="bg-blue-100 text-blue-800">Ready for Exam</Badge>;
    }
    
    // If sample not collected yet
    if (test.collectionStatus === "pending") {
      return <Badge className="bg-yellow-100 text-yellow-800">Pending Collection</Badge>;
    }
    
    return <Badge variant="outline">{test.status}</Badge>;
  };

  const canEnterExam = (test: LabTest) => {
    return test.collectionStatus === "collected" && 
           test.processingStatus !== "completed" &&
           test.paymentVerified;
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="h-8 bg-gray-200 rounded animate-pulse w-1/4 mb-6" />
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Laboratory Tests</h1>
          <p className="text-muted-foreground">
            Enter exam results for requested tests
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchTests}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Search */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tests by ID, name, or patient..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Tests Table */}
      <Card>
        <CardHeader>
          <CardTitle>Requested Tests ({filteredTests.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Test ID</TableHead>
                <TableHead>Test Name</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Doctor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Ordered</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <TestTube className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium">No tests found</h3>
                    <p className="text-muted-foreground mt-2">
                      {searchQuery ? "No tests match your search" : "No tests available"}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredTests.map((test) => (
                  <TableRow key={test._id}>
                    <TableCell className="font-medium">
                      {test.testId}
                    </TableCell>
                    <TableCell>{test.testName}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{test.patient.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {test.patient.patientId}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Stethoscope className="h-4 w-4 text-gray-500" />
                        <span>Dr. {test.doctor?.name || 'Unknown'}</span>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(test)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={
                        test.priority === "emergency" ? "border-red-300 text-red-700" :
                        test.priority === "urgent" ? "border-orange-300 text-orange-700" :
                        "border-blue-300 text-blue-700"
                      }>
                        {test.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(test.orderedAt), "MMM dd, HH:mm")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          asChild
                        >
                          <Link href={`/laboratory/tests/${test._id}`}>
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Link>
                        </Button>
                        
                        {canEnterExam(test) && (
                          <Button 
                            size="sm"
                            asChild
                          >
                            <Link href={`/laboratory/tests/${test._id}/exam`}>
                              <FileText className="h-4 w-4 mr-1" />
                              Enter Exam
                            </Link>
                          </Button>
                        )}

                        {test.collectionStatus === "collected" &&
                         test.processingStatus !== "completed" &&
                         test.paymentVerified && (
                          <Button
                            size="sm"
                            asChild
                          >
                            <Link href={`/laboratory/tests/${test._id}/add-parameters`}>
                              <FileText className="h-4 w-4 mr-1" />
                              Add Parameters
                            </Link>
                          </Button>
                        )}

                        {!test.paymentVerified && (
                          <Button 
                            variant="secondary" 
                            size="sm"
                            asChild
                          >
                            <Link href={`/laboratory/tests/${test._id}/verify-payment`}>
                              Verify Payment
                            </Link>
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}