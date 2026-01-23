// components/LaboratoryDashboard.tsx

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Activity, 
  Calendar, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  FileText,
  DollarSign
} from 'lucide-react';

interface DashboardStats {
  totalTestsToday: number;
  pendingCollection: number;
  pendingProcessing: number;
  pendingVerification: number;
  urgentTests: number;
  completedToday: number;
}

interface LabTest {
  _id: string;
  testId: string;
  patient: {
    name: string;
    patientId: string;
  };
  doctor: {
    name: string;
    specialization: string;
  };
  testName: string;
  priority: string;
  status: string;
  paymentVerified: boolean;
  charges: {
    paymentStatus: string;
    totalAmount: number;
    paid: number;
    due: number;
  };
}

export function LaboratoryDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentTests, setRecentTests] = useState<LabTest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/laboratory/dashboard', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats(data.data.statistics);
        setRecentTests(data.data.recentTests || []);
      }
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Tests</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalTestsToday || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Collection</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pendingCollection || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Processing</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pendingProcessing || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Verification</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pendingVerification || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Urgent Tests</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats?.urgentTests || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.completedToday || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Tests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentTests.map((test) => (
              <div key={test._id} className="flex items-center justify-between border-b pb-4 last:border-0">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{test.testId}</span>
                    <Badge variant={
                      test.priority === 'urgent' ? 'destructive' :
                      test.priority === 'emergency' ? 'destructive' : 'secondary'
                    }>
                      {test.priority}
                    </Badge>
                    <Badge variant={
                      test.paymentVerified ? 'default' : 'outline'
                    }>
                      {test.paymentVerified ? 'Paid' : 'Payment Pending'}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {test.testName} • {test.patient.name} ({test.patient.patientId})
                  </div>
                  <div className="text-sm">
                    Doctor: {test.doctor.name} • Status: {test.status}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!test.paymentVerified && test.charges.due > 0 && (
                    <div className="flex items-center gap-1 text-sm text-red-600">
                      <DollarSign className="h-4 w-4" />
                      <span>Due: ₹{test.charges.due}</span>
                    </div>
                  )}
                  <Button size="sm" variant="outline">
                    View Details
                  </Button>
                  {!test.paymentVerified && (
                    <Button size="sm" variant="default">
                      Verify Payment
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}