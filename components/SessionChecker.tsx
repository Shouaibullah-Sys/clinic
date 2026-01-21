// components/SessionChecker.tsx - FIXED VERSION
"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { jwtDecode } from "jwt-decode";

export default function SessionChecker() {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading, initialize, logout, accessToken } = useAuthStore();
  const [isChecking, setIsChecking] = useState(true);
  const [hasRedirected, setHasRedirected] = useState(false);

  useEffect(() => {
    // Initialize auth state on component mount
    const initAuth = async () => {
      try {
        await initialize();
      } catch (error) {
        console.error("Auth initialization failed:", error);
      } finally {
        setIsChecking(false);
      }
    };

    initAuth();
  }, [initialize]);

  useEffect(() => {
    // Only check authentication status after initialization is complete
    if (isLoading || isChecking || hasRedirected) return;

    const publicPaths = [
      "/", 
      "/login", 
      "/register", 
      "/forgot-password",
      "/reset-password",
      "/unauthorized"
    ];
    const isPublicPath = publicPaths.includes(pathname);

    // If not authenticated and trying to access a protected route, redirect to login
    if (!isAuthenticated && !isPublicPath) {
      console.log("Not authenticated, redirecting to login");
      setHasRedirected(true);
      router.push("/login");
      return;
    }

    // If authenticated and trying to access a public route, redirect to dashboard
    if (isAuthenticated && isPublicPath && pathname !== "/unauthorized") {
      console.log("Authenticated on public route, redirecting to dashboard");
      setHasRedirected(true);
      router.push("/dashboard");
      return;
    }

    // Check if access token is expired
    const checkTokenExpiration = async () => {
      if (!accessToken) return;

      try {
        const decoded: any = jwtDecode(accessToken);
        const expirationTime = decoded.exp * 1000; // Convert to milliseconds
        const currentTime = Date.now();

        // If token expires in less than 5 minutes, try to refresh it
        if (expirationTime - currentTime < 5 * 60 * 1000) {
          try {
            await useAuthStore.getState().refreshAccessToken();
            console.log("Token refreshed successfully");
          } catch (error) {
            console.error("Token refresh failed:", error);
            logout();
            setHasRedirected(true);
            router.push("/login");
          }
        }
      } catch (error) {
        console.error("Token validation error:", error);
      }
    };

    checkTokenExpiration();
  }, [isAuthenticated, isLoading, isChecking, pathname, router, logout, accessToken, hasRedirected]);

  // Show nothing while checking or loading
  if (isLoading || isChecking) {
    return null;
  }

  return null;
}
