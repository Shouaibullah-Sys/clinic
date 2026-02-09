// app/radiology/templates/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { RadiologyTemplateTable } from "@/components/radiologist/RadiologyTemplateTable";
import { useAuthStore } from "@/store/useAuthStore";
import { Loader2 } from "lucide-react";

export default function RadiologyTemplatesPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
      return;
    }

    if (!isLoading && user) {
      const allowedRoles = ["radiologist", "doctor", "admin"];
      if (!allowedRoles.includes(user.role)) {
        router.push("/unauthorized");
        return;
      }
    }
  }, [isLoading, isAuthenticated, user, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  const canAccess =
    user.role === "radiologist" ||
    user.role === "doctor" ||
    user.role === "admin";

  if (!canAccess) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-100">
          <h1 className="text-2xl font-bold text-muted-foreground">
            Access Denied
          </h1>
          <p className="text-muted-foreground mt-2">
            You don't have permission to view this page.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Radiology Templates
          </h1>
          <p className="text-muted-foreground">
            Manage radiology test templates with their specifications and
            prices.
          </p>
        </div>

        {/* Templates Table */}
        <RadiologyTemplateTable />
      </div>
    </DashboardLayout>
  );
}
