// providers/AuthProvider.tsx
"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const initialize = useAuthStore((state) => state.initialize);
  const refreshAccessToken = useAuthStore((state) => state.refreshAccessToken);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      try {
        await initialize();
      } catch (error) {
        console.error("Auth initialization failed:", error);
      } finally {
        setInitialized(true);
      }
    };

    initAuth();
  }, [initialize]);

  useEffect(() => {
    if (!isAuthenticated) return;

    let timeoutId: NodeJS.Timeout;
    const intervalId = setInterval(() => {
      if (isAuthenticated) {
        refreshAccessToken().catch(() => {
          console.warn("Periodic token refresh failed");
        });
      }
    }, 30 * 60 * 1000);

    const scheduleTokenRefresh = async () => {
      try {
        // Refresh token 1 minute before expiry (access token expires in 15 minutes)
        const refreshDelay = 14 * 60 * 1000; // 14 minutes

        timeoutId = setTimeout(async () => {
          try {
            await refreshAccessToken();
            // Schedule next refresh after successful refresh
            scheduleTokenRefresh();
          } catch (error) {
            console.error("Token refresh failed:", error);
            // If refresh fails, try again in 1 minute
            timeoutId = setTimeout(scheduleTokenRefresh, 60 * 1000);
          }
        }, refreshDelay);
      } catch (error) {
        console.error("Error scheduling token refresh:", error);
      }
    };

    // Schedule first refresh
    scheduleTokenRefresh();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, [isAuthenticated, refreshAccessToken]);

  // Optional: Show loading state while initializing
  if (!initialized && isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return <>{children}</>;
}
