// lib/hooks/useAuth.ts - React hook for frontend
import { useState, useEffect } from "react";

interface AuthUser {
  _id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  approved: boolean;
  active: boolean;
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch("/api/auth/me");
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (err) {
      setError("Failed to check authentication");
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        await checkAuth();
        return { success: true };
      } else {
        const error = await response.json();
        return { success: false, error: error.message };
      }
    } catch (err) {
      return { success: false, error: "Login failed" };
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const canAccess = (resource: string, action: string) => {
    if (!user) return false;
    
    // Simple permission check - extend with RBAC
    if (user.role === "admin") return true;
    
    const permissions: Record<string, string[]> = {
      dental: ["admin", "doctor", "nurse"],
      ecg: ["admin", "doctor", "nurse"],
      // ... other services
    };

    return permissions[resource]?.includes(user.role) || false;
  };

  return {
    user,
    loading,
    error,
    login,
    logout,
    checkAuth,
    canAccess,
    isAuthenticated: !!user,
  };
}