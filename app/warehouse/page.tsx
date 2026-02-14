// app/warehouse/page.tsx
"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Package,
  ArrowRight,
  Plus,
  History,
  Search,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";

interface WarehouseStats {
  totalMedicines: number;
  totalBatches: number;
  availableBatches: number;
  expiringSoon: number;
  expired: number;
  totalTransfers: number;
}

export default function WarehouseDashboard() {
  const router = useRouter();
  const { user, accessToken } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<WarehouseStats | null>(null);

  // Check if user has access
  useEffect(() => {
    if (user && !["admin", "pharmacy_head"].includes(user.role)) {
      router.push("/unauthorized");
    }
  }, [user, router]);

  // Fetch warehouse stats
  useEffect(() => {
    if (user && ["admin", "pharmacy_head"].includes(user.role)) {
      fetchStats();
    }
  }, [user]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      // Fetch medicines count
      const medicinesRes = await fetch("/api/warehouse", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const medicinesData = await medicinesRes.json();

      // Fetch batches count
      const batchesRes = await fetch("/api/warehouse/batches", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const batchesData = await batchesRes.json();

      // Fetch transfers count
      const transfersRes = await fetch("/api/warehouse/transfers", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const transfersData = await transfersRes.json();

      if (
        medicinesData.success &&
        batchesData.success &&
        transfersData.success
      ) {
        const batches = batchesData.data || [];
        const now = new Date();
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(now.getDate() + 30);

        const expiringSoon = batches.filter((b: any) => {
          const expiry = new Date(b.expiryDate);
          return expiry > now && expiry <= thirtyDaysFromNow;
        }).length;

        const expired = batches.filter(
          (b: any) => new Date(b.expiryDate) < now,
        ).length;

        setStats({
          totalMedicines: medicinesData.count || 0,
          totalBatches: batches.length,
          availableBatches: batches.filter((b: any) => b.status === "available")
            .length,
          expiringSoon,
          expired,
          totalTransfers: transfersData.count || 0,
        });
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!user || !["admin", "pharmacy_head"].includes(user.role)) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Unauthorized Access</h2>
          <p className="text-gray-600">
            You don't have permission to access this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Warehouse Management</h1>
          <p className="text-gray-500 mt-1">
            Manage warehouse inventory and transfer medicines to pharmacy
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={fetchStats} disabled={loading}>
            <Search className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Link href="/warehouse/transfer">
            <Button>
              <ArrowRight className="h-4 w-4 mr-2" />
              Transfer to Pharmacy
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total Medicines
            </CardTitle>
            <Package className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "..." : stats?.totalMedicines || 0}
            </div>
            <p className="text-xs text-gray-500 mt-1">In warehouse catalog</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Batches</CardTitle>
            <Package className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "..." : stats?.totalBatches || 0}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {loading ? "..." : stats?.availableBatches || 0} available
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "..." : stats?.expiringSoon || 0}
            </div>
            <p className="text-xs text-gray-500 mt-1">Within 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Expired</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "..." : stats?.expired || 0}
            </div>
            <p className="text-xs text-gray-500 mt-1">Requires attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total Transfers
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "..." : stats?.totalTransfers || 0}
            </div>
            <p className="text-xs text-gray-500 mt-1">To pharmacy</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/warehouse/medicines">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Manage Medicines
              </CardTitle>
              <CardDescription>
                Add, edit, or remove medicines from warehouse catalog
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/warehouse/batches">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Manage Batches
              </CardTitle>
              <CardDescription>
                Add new batches, track expiry dates, and manage stock levels
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/warehouse/transfer">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-700">
                <ArrowRight className="h-5 w-5" />
                Transfer to Pharmacy
              </CardTitle>
              <CardDescription className="text-blue-600">
                Search warehouse and transfer medicines to pharmacy stock
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Start Guide</CardTitle>
          <CardDescription>
            Get started with warehouse management
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-sm font-bold">
              1
            </div>
            <div>
              <p className="font-medium">Add Medicines to Warehouse</p>
              <p className="text-sm text-gray-500">
                Create medicine entries in the warehouse catalog
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-sm font-bold">
              2
            </div>
            <div>
              <p className="font-medium">Add Batches</p>
              <p className="text-sm text-gray-500">
                Add stock batches with expiry dates and quantities
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-sm font-bold">
              3
            </div>
            <div>
              <p className="font-medium">Transfer to Pharmacy</p>
              <p className="text-sm text-gray-500">
                Search warehouse and transfer medicines to pharmacy stock
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
