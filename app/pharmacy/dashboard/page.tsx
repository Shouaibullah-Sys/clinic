// app/pharmacy/dashboard/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Package, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  TrendingUp,
  Users,
  Pill
} from "lucide-react";

interface PharmacyStats {
  pendingPrescriptions: number;
  lowStockMedicines: number;
  dispensedToday: number;
  totalRevenue: number;
  activePatients: number;
}

export default function PharmacyDashboardPage() {
  const router = useRouter();
  const { user, accessToken } = useAuthStore();
  const [stats, setStats] = useState<PharmacyStats>({
    pendingPrescriptions: 0,
    lowStockMedicines: 0,
    dispensedToday: 0,
    totalRevenue: 0,
    activePatients: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, [accessToken]);

  const fetchDashboardStats = async () => {
    try {
      const response = await fetch("/api/pharmacy/dashboard/stats", {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats(data.data);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Pharmacy Dashboard</h1>
        <p className="text-muted-foreground">
          Manage prescriptions, monitor stock, and track dispensing activities
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Button 
          onClick={() => router.push("/pharmacy/select-prescription")}
          className="h-24 flex flex-col items-center justify-center"
        >
          <Package className="h-8 w-8 mb-2" />
          <span>Dispense Prescription</span>
        </Button>
        
        <Button 
          onClick={() => router.push("/pharmacy/inventory")}
          variant="outline"
          className="h-24 flex flex-col items-center justify-center"
        >
          <Pill className="h-8 w-8 mb-2" />
          <span>Manage Inventory</span>
        </Button>
        
        <Button 
          onClick={() => router.push("/pharmacy/pending")}
          variant="outline"
          className="h-24 flex flex-col items-center justify-center"
        >
          <Clock className="h-8 w-8 mb-2" />
          <span>View Pending</span>
        </Button>
        
        <Button 
          onClick={() => router.push("/pharmacy/reports")}
          variant="outline"
          className="h-24 flex flex-col items-center justify-center"
        >
          <TrendingUp className="h-8 w-8 mb-2" />
          <span>Generate Reports</span>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Prescriptions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{stats.pendingPrescriptions}</div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Low Stock Medicines
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{stats.lowStockMedicines}</div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Dispensed Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{stats.dispensedToday}</div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Today's Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">AFN {stats.totalRevenue}</div>
              <TrendingUp className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Patients
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{stats.activePatients}</div>
              <Users className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}