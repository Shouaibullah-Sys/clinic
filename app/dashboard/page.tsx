// app/dashboard/page.tsx - UPDATED WITH ROLE-BASED REDIRECT
"use client";

import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { useEffect, useState, useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { getDashboardPath } from "@/utils/roleRedirects"; // You need to create this

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!isLoading && !initialized) {
      if (!isAuthenticated) {
        router.push("/login");
        return;
      }

      // If user is authenticated, redirect to their role-specific dashboard
      if (user) {
        const dashboardPath = getDashboardPath(user.role);
        console.log(`Redirecting ${user.role} to ${dashboardPath}`);
        router.push(dashboardPath);
      }
      
      setInitialized(true);
    }
  }, [isAuthenticated, user, isLoading, router, initialized]);

  if (isLoading || !initialized) {
    return (
      <div className="container mx-auto p-4 sm:p-6 md:p-8">
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-64 mt-8" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
        <p>Redirecting to your dashboard...</p>
      </div>
    </div>
  );
}