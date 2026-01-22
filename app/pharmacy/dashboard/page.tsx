// app/pharmacy/dashboard/page.tsx

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Package,
  DollarSign,
  AlertCircle,
  Calendar,
  TrendingDown,
  ArrowRight,
  Plus,
  RefreshCw,
} from "lucide-react";
import { format } from "date-fns";

interface MedicineStock {
  _id: string;
  name: string;
  batchNumber: string;
  currentQuantity: number;
  originalQuantity: number;
  expiryDate: string;
  sellingPrice: number;
  unitPrice: number;
}

export default function PharmacyDashboardPage() {
  const router = useRouter();
  const { user, accessToken } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [medicines, setMedicines] = useState<MedicineStock[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Check if user has pharmacy access
  useEffect(() => {
    if (user && !["admin", "pharmacist"].includes(user.role)) {
      router.push("/unauthorized");
    }
  }, [user, router]);

  // Fetch medicine stock
  const fetchMedicines = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch("/api/pharmacy/stock?limit=10", {
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMedicines(data.data);
      } else {
        setError(data.error || "Failed to fetch medicine stock");
        setMedicines([]);
      }
    } catch (error) {
      console.error("Error fetching medicine stock:", error);
      setError("Failed to fetch medicine stock");
      setMedicines([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && ["admin", "pharmacist"].includes(user.role) && accessToken) {
      fetchMedicines();
    }
  }, [user, accessToken]);

  // Calculate statistics
  const calculateStats = () => {
    const stats = {
      totalItems: medicines.length,
      totalValue: medicines.reduce((sum, med) => sum + (med.currentQuantity * med.sellingPrice), 0),
      lowStock: 0,
      expiringSoon: 0,
      expired: 0,
      outOfStock: 0,
    };

    medicines.forEach(medicine => {
      const stockPercentage = (medicine.currentQuantity / medicine.originalQuantity) * 100;
      const expiryDate = new Date(medicine.expiryDate);
      const today = new Date();
      const daysToExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      if (stockPercentage <= 20) stats.lowStock++;
      if (stockPercentage === 0) stats.outOfStock++;
      if (daysToExpiry <= 30 && daysToExpiry > 0) stats.expiringSoon++;
      if (daysToExpiry < 0) stats.expired++;
    });

    return stats;
  };

  const stats = calculateStats();

  // Get low stock medicines
  const lowStockMedicines = medicines.filter(medicine => {
    const stockPercentage = (medicine.currentQuantity / medicine.originalQuantity) * 100;
    return stockPercentage <= 20 && stockPercentage > 0;
  }).slice(0, 5);

  // Get expiring soon medicines
  const expiringSoonMedicines = medicines.filter(medicine => {
    const expiryDate = new Date(medicine.expiryDate);
    const today = new Date();
    const daysToExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysToExpiry <= 30 && daysToExpiry > 0;
  }).slice(0, 5);

  if (!user || !["admin", "pharmacist"].includes(user.role)) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Unauthorized Access</h2>
          <p className="text-gray-600">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Pharmacy Dashboard</h1>
          <p className="text-gray-500 mt-1">Welcome back, {user.name}!</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={fetchMedicines}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => router.push("/pharmacy/stock")}>
            <Plus className="h-4 w-4 mr-2" />
            Manage Stock
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Items</p>
                <p className="text-2xl font-bold mt-1">{medicines.length}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Package className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Inventory Value</p>
                <p className="text-2xl font-bold mt-1">
                  ${stats.totalValue.toLocaleString()}
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Low Stock</p>
                <p className="text-2xl font-bold mt-1">{stats.lowStock}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                <TrendingDown className="h-5 w-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Expiring Soon</p>
                <p className="text-2xl font-bold mt-1">{stats.expiringSoon}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => router.push("/pharmacy/stock")}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Stock Management</p>
                <p className="text-lg font-bold mt-1">View All Medicines</p>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => router.push("/pharmacy/stock?status=low_stock")}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Low Stock Alert</p>
                <p className="text-lg font-bold mt-1">{stats.lowStock} Items</p>
              </div>
              <AlertCircle className="h-5 w-5 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => router.push("/pharmacy/stock?status=expiring_soon")}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Expiring Soon</p>
                <p className="text-lg font-bold mt-1">{stats.expiringSoon} Items</p>
              </div>
              <Calendar className="h-5 w-5 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => router.push("/appointments")}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Appointments</p>
                <p className="text-lg font-bold mt-1">View Prescriptions</p>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Alert */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-orange-500" />
              Low Stock Alert
            </CardTitle>
            <CardDescription>
              Medicines with stock levels below 20%
            </CardDescription>
          </CardHeader>
          <CardContent>
            {lowStockMedicines.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No low stock medicines found</p>
            ) : (
              <div className="space-y-4">
                {lowStockMedicines.map((medicine) => {
                  const stockPercentage = (medicine.currentQuantity / medicine.originalQuantity) * 100;
                  
                  return (
                    <div key={medicine._id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{medicine.name}</p>
                        <p className="text-sm text-gray-500">{medicine.batchNumber}</p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2">
                          <Progress value={stockPercentage} className="h-2 w-20" />
                          <Badge variant="destructive" className="whitespace-nowrap">
                            {medicine.currentQuantity}/{medicine.originalQuantity}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{stockPercentage.toFixed(1)}% remaining</p>
                      </div>
                    </div>
                  );
                })}
                {stats.lowStock > 5 && (
                  <Button
                    variant="ghost"
                    className="w-full"
                    onClick={() => router.push("/pharmacy/stock?status=low_stock")}
                  >
                    View All {stats.lowStock} Items
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expiring Soon Alert */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-yellow-500" />
              Expiring Soon
            </CardTitle>
            <CardDescription>
              Medicines expiring within 30 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            {expiringSoonMedicines.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No medicines expiring soon</p>
            ) : (
              <div className="space-y-4">
                {expiringSoonMedicines.map((medicine) => {
                  const expiryDate = new Date(medicine.expiryDate);
                  const today = new Date();
                  const daysToExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                  
                  return (
                    <div key={medicine._id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{medicine.name}</p>
                        <p className="text-sm text-gray-500">{medicine.batchNumber}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                          {daysToExpiry} days
                        </Badge>
                        <p className="text-xs text-gray-500 mt-1">
                          Expires: {format(expiryDate, "MMM d, yyyy")}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {stats.expiringSoon > 5 && (
                  <Button
                    variant="ghost"
                    className="w-full"
                    onClick={() => router.push("/pharmacy/stock?status=expiring_soon")}
                  >
                    View All {stats.expiringSoon} Items
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Medicines */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Medicines</CardTitle>
          <CardDescription>
            Recently added medicines to the inventory
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : medicines.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No medicines found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Medicine</th>
                    <th className="text-left py-3 px-4">Batch</th>
                    <th className="text-left py-3 px-4">Stock</th>
                    <th className="text-left py-3 px-4">Expiry</th>
                    <th className="text-left py-3 px-4">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {medicines.slice(0, 5).map((medicine) => {
                    const stockPercentage = (medicine.currentQuantity / medicine.originalQuantity) * 100;
                    const expiryDate = new Date(medicine.expiryDate);
                    
                    return (
                      <tr key={medicine._id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <p className="font-medium">{medicine.name}</p>
                          <p className="text-sm text-gray-500">{medicine.originalQuantity}</p>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="outline" className="font-mono">
                            {medicine.batchNumber}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <Progress value={stockPercentage} className="h-2 w-24" />
                            <span className="text-sm">
                              {medicine.currentQuantity}/{medicine.originalQuantity}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            {format(expiryDate, "MMM d, yyyy")}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-medium">${medicine.sellingPrice.toFixed(2)}</p>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {medicines.length > 5 && (
            <div className="mt-4">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push("/pharmacy/stock")}
              >
                View All Medicines
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}