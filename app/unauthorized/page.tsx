// app/unauthorized/page.tsx
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/useAuthStore";
import ClinicLoadingAnimation from "@/components/ClinicLoadingAnimation";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function UnauthorizedPage() {
  const { user, isAuthenticated } = useAuthStore();
  const [showContent, setShowContent] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    // Small delay to ensure auth state is loaded
    const timer = setTimeout(() => {
      setShowContent(true);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  // Get context from URL params
  const attemptedUrl = searchParams.get("url") || "Unknown";
  const userRole = user?.role || "Unknown";
  const requiredRoles = searchParams.get("roles")?.split(",") || [];

  // Don't redirect automatically - let the user decide what to do
  if (!showContent) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <ClinicLoadingAnimation />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <div className="max-w-lg w-full p-8 bg-white rounded-lg shadow-lg dark:bg-gray-800">
        <ClinicLoadingAnimation />
        <h1 className="text-2xl font-bold text-center text-gray-800 dark:text-white mb-4">
          403 - Unauthorized Access
        </h1>
        <p className="text-center text-gray-600 dark:text-gray-300 mb-6">
          You don&apos;t have permission to access this page. Please contact
          your administrator.
        </p>

        {/* Context Information */}
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6 space-y-3">
          <div>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              Attempted URL:
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-300 break-all">
              {attemptedUrl}
            </p>
          </div>

          {isAuthenticated && (
            <div>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                Your Role:
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300 capitalize">
                {userRole.replace(/_/g, " ")}
              </p>
            </div>
          )}

          {requiredRoles.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                Required Roles:
              </p>
              <div className="flex flex-wrap gap-2 mt-1">
                {requiredRoles.map((role) => (
                  <span
                    key={role}
                    className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded capitalize"
                  >
                    {role.replace(/_/g, " ")}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row justify-center gap-4">
          {isAuthenticated ? (
            <>
              <Button
                asChild
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Link href="/dashboard">Go to Dashboard</Link>
              </Button>
              <Button asChild variant="outline">
                <Link
                  href="/login"
                  onClick={() => useAuthStore.getState().logout()}
                >
                  Logout
                </Link>
              </Button>
            </>
          ) : (
            <Button
              asChild
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Link href="/login">Login</Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
