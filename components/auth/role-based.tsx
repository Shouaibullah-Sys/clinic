// components/auth/role-based.tsx
"use client";

import { useAuthStore } from "@/store/useAuthStore";
import { ReactNode } from "react";

interface RoleBasedProps {
  children: ReactNode;
  allowedRoles: (
    | "admin"
    | "staff"
    | "doctor"
    | "nurse"
    | "receptionist"
    | "pharmacist"
    | "pharmacy"
    | "lab_technician"
    | "radiologist"
    | "admission"
  )[];
  fallback?: ReactNode;
  showLoading?: boolean;
}

export function RoleBased({
  children,
  allowedRoles,
  fallback = null,
  showLoading = true,
}: RoleBasedProps) {
  const { user, isLoading } = useAuthStore();

  if (isLoading && showLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user || !allowedRoles.includes(user.role)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

export function AdminOnly({
  children,
  fallback,
  showLoading = true,
}: {
  children: ReactNode;
  fallback?: ReactNode;
  showLoading?: boolean;
}) {
  return (
    <RoleBased
      allowedRoles={["admin"]}
      fallback={fallback}
      showLoading={showLoading}
    >
      {children}
    </RoleBased>
  );
}

export function StaffOnly({
  children,
  fallback,
  showLoading = true,
}: {
  children: ReactNode;
  fallback?: ReactNode;
  showLoading?: boolean;
}) {
  return (
    <RoleBased
      allowedRoles={["staff", "admin"]}
      fallback={fallback}
      showLoading={showLoading}
    >
      {children}
    </RoleBased>
  );
}

export function withRole<P extends object>(
  Component: React.ComponentType<P>,
  allowedRoles: (
    | "admin"
    | "staff"
    | "doctor"
    | "nurse"
    | "receptionist"
    | "pharmacist"
    | "pharmacy"
    | "lab_technician"
    | "radiologist"
    | "admission"
  )[],
) {
  return function WithRoleWrapper(props: P) {
    const { user } = useAuthStore();

    if (!user || !allowedRoles.includes(user.role)) {
      return null;
    }

    return <Component {...props} />;
  };
}

// Specialized role-based components
export function AdminControls({ children }: { children: ReactNode }) {
  return <AdminOnly>{children}</AdminOnly>;
}

export function StaffControls({ children }: { children: ReactNode }) {
  return <StaffOnly>{children}</StaffOnly>;
}

// Permission-based components
export function CanView({
  children,
  permission,
}: {
  children: ReactNode;
  permission: string;
}) {
  const { user } = useAuthStore();

  // Define permissions based on roles
  const permissions: Record<string, string[]> = {
    admin: [
      "view_all",
      "edit_all",
      "delete_all",
      "manage_users",
      "manage_settings",
    ],
    staff: ["view_own", "edit_own", "create_orders", "manage_glass_stock"],
  };

  const hasPermission = user && permissions[user.role]?.includes(permission);

  if (!hasPermission) {
    return null;
  }

  return <>{children}</>;
}
