// store/useAuthStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import Cookies from "universal-cookie";
import { jwtDecode } from "jwt-decode";

export type UserRole = "admin" | "staff";

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
  joiningDate?: string;
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
}

interface TokenPayload {
  exp: number;
  userId: string;
  role: UserRole;
  [key: string]: unknown;
}

const cookies = new Cookies();

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
        // Note: Cookies are now handled server-side in the login API route
        // The server sets HTTP-only cookies for security
        set({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
      },

      logout: () => {
        cookies.remove("accessToken", { path: "/" });
        cookies.remove("refreshToken", { path: "/" });

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
        const accessToken = cookies.get<string>("accessToken");
        const refreshToken = cookies.get<string>("refreshToken");

        if (accessToken) {
          try {
            const decoded = jwtDecode<TokenPayload>(accessToken);
            if (decoded.exp * 1000 > Date.now()) {
              const response = await fetch("/api/auth/me", {
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  "Content-Type": "application/json",
                },
              });

              if (response.ok) {
                const user = (await response.json()) as User;
                set({
                  user,
                  accessToken,
                  refreshToken,
                  isAuthenticated: true,
                  isLoading: false,
                });
                return;
              }
            }
          } catch (error) {
            console.error("Access token verification failed:", error);
          }
        }

        if (refreshToken) {
          try {
            await get().refreshAccessToken();
          } catch (error) {
            console.error("Token refresh failed during initialization:", error);
            set({ isLoading: false });
          }
        } else {
          set({ isLoading: false });
        }
      },

      refreshAccessToken: async () => {
        const refreshToken = cookies.get<string>("refreshToken");
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
          });

          if (response.ok) {
            const data = (await response.json()) as {
              accessToken: string;
              user: User;
            };
            const { accessToken, user } = data;

            // Note: Access token cookie is now handled server-side in the refresh API route
            // The server sets HTTP-only cookies for security

            set({
              user,
              accessToken,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });
          } else {
            const errorData = (await response.json()) as { error?: string };
            throw new Error(errorData.error || "Failed to refresh token");
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
    }
  )
);

// Utility functions for auth
export const isAdmin = (user: User | null): boolean => {
  return user?.role === "admin";
};

export const isStaff = (user: User | null): boolean => {
  return user?.role === "staff";
};

export const isApproved = (user: User | null): boolean => {
  return user?.approved === true;
};

export const isActive = (user: User | null): boolean => {
  return user?.active === true;
};
