// app/admissions/dashboard/page.tsx
"use client";

import { useAuthStore } from "@/store/useAuthStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bed, UserPlus, Users, Clock, Calendar, Activity, Plus, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

export default function AdmissionDashboardPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [stats, setStats] = useState({
    activeAdmissions: 0,
    dischargedToday: 0,
    newAdmissions: 0,
    awaitingBeds: 0,
    occupiedBeds: 0,
    totalBeds: 100,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch admission stats
    const fetchStats = async () => {
      try {
        // You'll need to create this API endpoint
        const response = await fetch("/api/admissions/stats");
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error("Error fetching admission stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const bedOccupancy = ((stats.occupiedBeds / stats.totalBeds) * 100).toFixed(1);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Admission Dashboard</h1>
          <p className="text-gray-500">
            Welcome, {user?.name}! Today is {format(new Date(), "EEEE, MMMM d, yyyy")}
          </p>
        </div>
        <Button onClick={() => router.push("/admissions/new")}>
          <Plus className="mr-2 h-4 w-4" />
          New Admission
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Admissions</CardTitle>
            <Bed className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.activeAdmissions}</div>
            <p className="text-xs text-gray-500">Currently admitted patients</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Admissions</CardTitle>
            <UserPlus className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.newAdmissions}</div>
            <p className="text-xs text-gray-500">Admitted in last 24 hours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bed Occupancy</CardTitle>
            <Activity className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{bedOccupancy}%</div>
            <p className="text-xs text-gray-500">
              {stats.occupiedBeds} of {stats.totalBeds} beds occupied
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              className="w-full justify-start" 
              variant="outline"
              onClick={() => router.push("/admissions")}
            >
              <Bed className="mr-2 h-4 w-4" />
              View All Admissions
            </Button>
            <Button 
              className="w-full justify-start" 
              variant="outline"
              onClick={() => router.push("/admissions/new")}
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Create New Admission
            </Button>
            <Button 
              className="w-full justify-start" 
              variant="outline"
              onClick={() => router.push("/patients")}
            >
              <Users className="mr-2 h-4 w-4" />
              View Patients
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.awaitingBeds > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center p-3 bg-yellow-50 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mr-3" />
                  <div>
                    <p className="font-medium">Patients Awaiting Beds</p>
                    <p className="text-sm text-gray-500">{stats.awaitingBeds} patients need beds</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <AlertCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <p className="text-gray-500">No urgent alerts</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}