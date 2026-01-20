// store/useAuthStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type UserRole = "admin" | "staff" | "doctor" | "nurse" | "receptionist" | "pharmacist" | "lab_technician" | "radiologist";

export interface User {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  phone: string;
  avatar?: string;
  approved: boolean;
  active: boolean;
  department?: string;
  specialization?: string;
  licenseNumber?: string;
  joiningDate?: string;
  permissions: string[];
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (user: User, accessToken: string, refreshToken: string) => void;
  logout: () => void;
  initialize: () => Promise<void>;
  refreshAccessToken: () => Promise<void>;
  clearError: () => void;
  updateUser: (userData: Partial<User>) => void;
  setAccessToken: (token: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: true,
      error: null,

      login: (user, accessToken, refreshToken) => {
        // Set HTTP-only cookies via API call (handled by server)
        set({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
      },

      setAccessToken: (token) => {
        set({ accessToken: token });
      },

      logout: async () => {
        try {
          // Call logout API to clear server-side cookies
          await fetch("/api/auth/logout", {
            method: "POST",
            credentials: "include",
          });
        } catch (error) {
          console.error("Logout API call failed:", error);
        }

        // Clear client-side state
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
      },

      initialize: async () => {
        try {
          // Check if we have a token in localStorage
          const storedToken = localStorage.getItem("auth-storage");
          if (storedToken) {
            const parsed = JSON.parse(storedToken);
            if (parsed.state.accessToken) {
              // Verify token is still valid by calling /api/auth/me
              const response = await fetch("/api/auth/me", {
                headers: {
                  Authorization: `Bearer ${parsed.state.accessToken}`,
                },
                credentials: "include",
              });

              if (response.ok) {
                const user = await response.json();
                set({
                  user,
                  accessToken: parsed.state.accessToken,
                  isAuthenticated: true,
                  isLoading: false,
                });
                return;
              }
            }
          }

          // If no valid token, try to refresh
          const refreshToken = get().refreshToken;
          if (refreshToken) {
            try {
              await get().refreshAccessToken();
            } catch (error) {
              console.error("Token refresh failed:", error);
              set({ isLoading: false });
            }
          } else {
            set({ isLoading: false });
          }
        } catch (error) {
          console.error("Initialization error:", error);
          set({ isLoading: false });
        }
      },

      refreshAccessToken: async () => {
        const refreshToken = get().refreshToken;
        
        if (!refreshToken) {
          throw new Error("No refresh token available");
        }

        try {
          const response = await fetch("/api/auth/refresh", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${refreshToken}`,
            },
            credentials: "include",
          });

          if (response.ok) {
            const data = await response.json();
            const { accessToken, user } = data;

            set({
              user,
              accessToken,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });
          } else {
            throw new Error("Failed to refresh token");
          }
        } catch (error) {
          get().logout();
          throw error;
        }
      },

      updateUser: (userData) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...userData } : null,
        })),

      clearError: () => set({ error: null }),
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);