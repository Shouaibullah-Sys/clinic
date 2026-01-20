"use client";

// app/(dashboard)/services/emergency/page.tsx
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { EmergencyTable } from "@/components/data-table/emergency-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEmergencyCases } from "@/lib/hooks/use-services";
import { Search, Plus, AlertTriangle, Ambulance, Clock, User } from "lucide-react";
import { useState } from "react";

export default function EmergencyServicesPage() {
  const [filters, setFilters] = useState({
    status: "",
    triageLevel: "all",
    search: "",
  });
  const { data, isLoading } = useEmergencyCases(filters);

  // Mock data
  const mockData = [
    {
      id: "1",
      emergencyId: "EMG-2024-001",
      patientName: "Robert Johnson",
      triageLevel: "emergent",
      chiefComplaint: "Chest pain radiating to left arm",
      status: "active",
      arrivalTime: "2024-01-15T14:30:00Z",
      attendingDoctor: "Dr. Sarah Miller",
    },
    {
      id: "2",
      emergencyId: "EMG-2024-002",
      patientName: "Maria Garcia",
      triageLevel: "urgent",
      chiefComplaint: "Severe abdominal pain with vomiting",
      status: "active",
      arrivalTime: "2024-01-15T15:15:00Z",
      attendingDoctor: "Dr. James Wilson",
    },
    // Add more mock data...
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Emergency Department</h1>
            <p className="text-muted-foreground">
              Real-time monitoring and management of emergency cases
            </p>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Emergency Case
          </Button>
        </div>

        {/* Emergency Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Cases</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">8</div>
              <p className="text-xs text-muted-foreground">
                +2 from yesterday
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Waiting Time</CardTitle>
              <Clock className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">18m</div>
              <p className="text-xs text-muted-foreground">
                Average wait time
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ambulance Calls</CardTitle>
              <Ambulance className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">5</div>
              <p className="text-xs text-muted-foreground">
                Today's dispatch
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Staff On Duty</CardTitle>
              <User className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">12</div>
              <p className="text-xs text-muted-foreground">
                Doctors & nurses
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Triage Distribution */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Triage Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm">Resuscitation</span>
                    <span className="text-sm font-semibold">1</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-red-600" style={{ width: "10%" }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm">Emergent</span>
                    <span className="text-sm font-semibold">3</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-orange-500" style={{ width: "30%" }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm">Urgent</span>
                    <span className="text-sm font-semibold">4</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-yellow-500" style={{ width: "40%" }} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">Recent Cases</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    <div>
                      <div className="font-medium">John Doe</div>
                      <div className="text-sm text-muted-foreground">Chest pain • Resuscitation</div>
                    </div>
                  </div>
                  <div className="text-sm">14:30</div>
                </div>
                {/* Add more recent cases */}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Emergency Cases Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Active Emergency Cases</CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search cases..."
                    className="pl-10 w-50"
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  />
                </div>
                <Select
                  value={filters.triageLevel}
                  onValueChange={(value) => setFilters({ ...filters, triageLevel: value })}
                >
                  <SelectTrigger className="w-35">
                    <SelectValue placeholder="Triage Level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="resuscitation">Resuscitation</SelectItem>
                    <SelectItem value="emergent">Emergent</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <EmergencyTable data={mockData} />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
