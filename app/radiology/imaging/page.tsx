"use client";

// app/radiology/imaging/page.tsx
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { ImagingTable } from "@/components/data-table/imaging-table";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useImagingRecords } from "@/lib/hooks/use-services";
import { Search, Plus, Filter, Download, RefreshCw } from "lucide-react";
import { useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { toast } from "sonner";

export default function ImagingServicesPage() {
  const [filters, setFilters] = useState({
    status: "",
    type: "",
    search: "",
  });
  const { data, isLoading, refetch } = useImagingRecords(filters);
  const { accessToken } = useAuthStore();

  // Transform API data to match table format
  const imagingRecords = data?.records || [];

  // Calculate statistics from real data
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayRecords = imagingRecords.filter(
    (r) => new Date(r.createdAt) >= today,
  );

  const todaySchedule = {
    xray: todayRecords.filter((r) => r.imagingType === "x-ray").length,
    ct: todayRecords.filter((r) => r.imagingType === "ct-scan").length,
    mri: todayRecords.filter((r) => r.imagingType === "mri").length,
    ultrasound: todayRecords.filter((r) => r.imagingType === "ultrasound")
      .length,
  };

  const pendingReports = imagingRecords.filter(
    (r) => r.reportStatus === "pending",
  ).length;

  const handleRefresh = async () => {
    try {
      await refetch();
      toast.success("Data Refreshed", {
        description: "Imaging records have been updated",
      });
    } catch (error) {
      toast.error("Refresh Failed", {
        description: "Failed to refresh imaging records",
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Imaging Services
            </h1>
            <p className="text-muted-foreground">
              Manage X-Ray, CT Scan, MRI, and Ultrasound services
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleRefresh}
              disabled={isLoading}
              variant="outline"
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>
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
            <div className="flex items-center gap-2"></div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search patients, body parts..."
                  className="pl-10"
                  value={filters.search}
                  onChange={(e) =>
                    setFilters({ ...filters, search: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select
                value={filters.status || "all"}
                onValueChange={(value) =>
                  setFilters({
                    ...filters,
                    status: value === "all" ? "" : value,
                  })
                }
              >
                <SelectTrigger className="w-35">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={filters.type || "all"}
                onValueChange={(value) =>
                  setFilters({ ...filters, type: value === "all" ? "" : value })
                }
              >
                <SelectTrigger className="w-35">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="x-ray">X-Ray</SelectItem>
                  <SelectItem value="ct-scan">CT Scan</SelectItem>
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
            <ImagingTable data={imagingRecords} />
          </TabsContent>
          <TabsContent value="xray">
            <ImagingTable
              data={imagingRecords.filter((d) => d.imagingType === "x-ray")}
            />
          </TabsContent>
          <TabsContent value="ct">
            <ImagingTable
              data={imagingRecords.filter((d) => d.imagingType === "ct-scan")}
            />
          </TabsContent>
          <TabsContent value="mri">
            <ImagingTable
              data={imagingRecords.filter((d) => d.imagingType === "mri")}
            />
          </TabsContent>
          <TabsContent value="ultrasound">
            <ImagingTable
              data={imagingRecords.filter(
                (d) => d.imagingType === "ultrasound",
              )}
            />
          </TabsContent>
        </Tabs>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-card rounded-lg border p-6">
            <h3 className="font-semibold mb-2">Today's Schedule</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>X-Ray</span>
                <span className="font-semibold">{todaySchedule.xray}</span>
              </div>
              <div className="flex justify-between">
                <span>CT Scan</span>
                <span className="font-semibold">{todaySchedule.ct}</span>
              </div>
              <div className="flex justify-between">
                <span>MRI</span>
                <span className="font-semibold">{todaySchedule.mri}</span>
              </div>
              <div className="flex justify-between">
                <span>Ultrasound</span>
                <span className="font-semibold">
                  {todaySchedule.ultrasound}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-lg border p-6">
            <h3 className="font-semibold mb-2">Pending Reports</h3>
            <div className="text-3xl font-bold mb-2">{pendingReports}</div>
            <p className="text-sm text-muted-foreground">
              Reports awaiting radiologist review
            </p>
          </div>

          <div className="bg-card rounded-lg border p-6">
            <h3 className="font-semibold mb-2">Total Records</h3>
            <div className="text-3xl font-bold mb-2">
              {imagingRecords.length}
            </div>
            <p className="text-sm text-muted-foreground">
              Total imaging records in database
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
