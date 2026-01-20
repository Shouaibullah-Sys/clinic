'use client';

// app/(dashboard)/services/imaging/page.tsx
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { ImagingTable } from "@/components/data-table/imaging-table";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useImagingRecords } from "@/lib/hooks/use-services";
import { Search, Plus, Filter, Download } from "lucide-react";
import { useState } from "react";

export default function ImagingServicesPage() {
  const [filters, setFilters] = useState({
    status: "",
    type: "",
    search: "",
  });
  const { data, isLoading } = useImagingRecords(filters);

  // Mock data - replace with actual data from API
  const mockData = [
    {
      id: "1",
      imagingType: "xray",
      patientName: "John Doe",
      bodyPart: "Chest",
      status: "completed",
      priority: "routine",
      createdAt: "2024-01-15T10:30:00Z",
    },
    {
      id: "2",
      imagingType: "ct_scan",
      patientName: "Jane Smith",
      bodyPart: "Head",
      status: "in_progress",
      priority: "urgent",
      createdAt: "2024-01-15T11:15:00Z",
    },
    // Add more mock data...
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Imaging Services</h1>
            <p className="text-muted-foreground">
              Manage X-Ray, CT Scan, MRI, and Ultrasound services
            </p>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Imaging
          </Button>
        </div>

        <Tabs defaultValue="all" className="space-y-4">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="xray">X-Ray</TabsTrigger>
              <TabsTrigger value="ct">CT Scan</TabsTrigger>
              <TabsTrigger value="mri">MRI</TabsTrigger>
              <TabsTrigger value="ultrasound">Ultrasound</TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search patients, body parts..."
                  className="pl-10"
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select
                value={filters.status}
                onValueChange={(value) => setFilters({ ...filters, status: value })}
              >
                <SelectTrigger className="w-35">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-status">All Status</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={filters.type}
                onValueChange={(value) => setFilters({ ...filters, type: value })}
              >
                <SelectTrigger className="w-35">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-types">All Types</SelectItem>
                  <SelectItem value="xray">X-Ray</SelectItem>
                  <SelectItem value="ct_scan">CT Scan</SelectItem>
                  <SelectItem value="mri">MRI</SelectItem>
                  <SelectItem value="ultrasound">Ultrasound</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <TabsContent value="all" className="space-y-4">
            <ImagingTable data={mockData} />
          </TabsContent>
          <TabsContent value="xray">
            <ImagingTable data={mockData.filter(d => d.imagingType === "xray")} />
          </TabsContent>
          <TabsContent value="ct">
            <ImagingTable data={mockData.filter(d => d.imagingType === "ct_scan")} />
          </TabsContent>
          <TabsContent value="mri">
            <ImagingTable data={mockData.filter(d => d.imagingType === "mri")} />
          </TabsContent>
          <TabsContent value="ultrasound">
            <ImagingTable data={mockData.filter(d => d.imagingType === "ultrasound")} />
          </TabsContent>
        </Tabs>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-card rounded-lg border p-6">
            <h3 className="font-semibold mb-2">Today's Schedule</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>X-Ray</span>
                <span className="font-semibold">12</span>
              </div>
              <div className="flex justify-between">
                <span>CT Scan</span>
                <span className="font-semibold">8</span>
              </div>
              <div className="flex justify-between">
                <span>MRI</span>
                <span className="font-semibold">6</span>
              </div>
              <div className="flex justify-between">
                <span>Ultrasound</span>
                <span className="font-semibold">15</span>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-lg border p-6">
            <h3 className="font-semibold mb-2">Pending Reports</h3>
            <div className="text-3xl font-bold mb-2">7</div>
            <p className="text-sm text-muted-foreground">
              Reports awaiting radiologist review
            </p>
          </div>

          <div className="bg-card rounded-lg border p-6">
            <h3 className="font-semibold mb-2">Equipment Status</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span>X-Ray Machine 1</span>
                <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                  Operational
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>CT Scanner</span>
                <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                  Operational
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>MRI Machine</span>
                <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
                  Maintenance
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
