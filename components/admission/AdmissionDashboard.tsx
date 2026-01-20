// components/admission/AdmissionDashboard.tsx
"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { AdmissionStats, WardOccupancy } from "@/utils/admissionUtils";

export function AdmissionDashboard() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<AdmissionStats | null>(null);
  const [wardOccupancy, setWardOccupancy] = useState<WardOccupancy[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load stats
      const statsResponse = await fetch("/api/admissions/stats");
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData.data);
      }

      // Load ward occupancy
      const occupancyResponse = await fetch("/api/admissions/ward-occupancy");
      if (occupancyResponse.ok) {
        const occupancyData = await occupancyResponse.json();
        setWardOccupancy(occupancyData.data);
      }
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700">Total Admissions</h3>
          <p className="text-3xl font-bold text-blue-600">{stats?.total || 0}</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700">Currently Admitted</h3>
          <p className="text-3xl font-bold text-green-600">{stats?.admitted || 0}</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700">Average Stay</h3>
          <p className="text-3xl font-bold text-purple-600">
            {stats?.averageStay ? stats.averageStay.toFixed(1) : 0} days
          </p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-700">Occupancy Rate</h3>
          <p className="text-3xl font-bold text-orange-600">
            {stats?.occupancyRate ? stats.occupancyRate.toFixed(1) : 0}%
          </p>
        </div>
      </div>

      {/* Ward Occupancy */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Ward Occupancy</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {wardOccupancy.map((ward) => (
            <div key={ward.ward} className="border rounded-lg p-4">
              <h3 className="font-semibold">{ward.ward}</h3>
              <div className="mt-2 space-y-2">
                <div className="flex justify-between">
                  <span>Total Beds:</span>
                  <span className="font-semibold">{ward.totalBeds}</span>
                </div>
                <div className="flex justify-between">
                  <span>Occupied:</span>
                  <span className="font-semibold text-red-600">{ward.occupiedBeds}</span>
                </div>
                <div className="flex justify-between">
                  <span>Available:</span>
                  <span className="font-semibold text-green-600">{ward.availableBeds}</span>
                </div>
                <div className="mt-2">
                  <div className="flex justify-between mb-1">
                    <span>Occupancy:</span>
                    <span>{ward.occupancyRate.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${ward.occupancyRate}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}