// app/admin/users/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import UserForm from "./UserForm";
import UserTable from "./UserTable";
import { IUser } from "@/lib/models/User";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Plus, RefreshCw, Users, Shield, UserCheck, UserX, Stethoscope, UserCog, Building, Package } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminUsersPage() {
  const router = useRouter();
  const { user, accessToken, isAuthenticated, isLoading: authLoading } = useAuthStore();
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<IUser | null>(null);
  const [users, setUsers] = useState<IUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user is admin
  useEffect(() => {
    if (!authLoading && (!isAuthenticated || user?.role !== "admin")) {
      router.push("/unauthorized");
    }
  }, [authLoading, isAuthenticated, user, router]);

  // Load users
  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("Loading users, accessToken present:", !!accessToken);
      const response = await fetch("/api/admin/users", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        credentials: "include",
      });

      console.log("Fetch response status:", response.status);
      if (response.status === 401) {
        console.log("401 response, session expired");
        setError("Session expired. Please login again.");
        return;
      }

      if (!response.ok) {
        console.log("Response not ok, throwing error");
        throw new Error("Failed to load users");
      }

      const data = await response.json();
      console.log("Received data:", data);
      setUsers(data.data || []);
    } catch (err) {
      console.error("Error loading users:", err);
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  // Load users on mount
  useEffect(() => {
    if (isAuthenticated && user?.role === "admin") {
      loadUsers();
    }
  }, [isAuthenticated, user]);

  const handleRefresh = () => {
    loadUsers();
    setOpenDialog(false);
    setSelectedUser(null);
  };

  if (authLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-96" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-32" />
          </div>
          <Skeleton className="h-[400px] w-full" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== "admin") {
    return (
      <div className="container mx-auto py-8">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You need to be an administrator to access this page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const stats = {
    total: users.length,
    active: users.filter(u => u.active).length,
    approved: users.filter(u => u.approved).length,
    admins: users.filter(u => u.role === "admin").length,
    doctors: users.filter(u => u.role === "doctor").length,
    nurses: users.filter(u => u.role === "nurse").length,
    receptionists: users.filter(u => u.role === "receptionist").length,
    pharmacists: users.filter(u => u.role === "pharmacist").length,
  };

  return (
    <div className="container mx-auto py-6 px-4">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 dark:bg-primary/20">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                User Management
              </h1>
              <p className="text-muted-foreground">
                Manage system users, roles, and permissions
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="bg-background">
              {stats.total} Total Users
            </Badge>
            <Badge variant="secondary">
              {stats.active} Active
            </Badge>
            <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400">
              {stats.approved} Approved
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadUsers}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Dialog open={openDialog} onOpenChange={setOpenDialog}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                onClick={() => setSelectedUser(null)}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl">
                  {selectedUser ? "Edit User" : "Create New User"}
                </DialogTitle>
              </DialogHeader>
              <UserForm
                user={
                  selectedUser
                    ? ({
                        ...selectedUser,
                        _id: selectedUser._id.toString(),
                        joiningDate: selectedUser.joiningDate
                          ? (typeof selectedUser.joiningDate === 'string'
                              ? selectedUser.joiningDate
                              : selectedUser.joiningDate.toISOString())
                          : new Date().toISOString()
                      } as unknown) as (Partial<IUser> & { _id?: string })
                    : null
                }
                onSuccess={handleRefresh}
                accessToken={accessToken}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card className={stats.active === 0 ? "border-red-200 dark:border-red-800" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              Active
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.active === 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>
              {stats.active}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Admins
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {stats.admins}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Stethoscope className="h-4 w-4" />
              Doctors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {stats.doctors}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <UserCog className="h-4 w-4" />
              Nurses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-pink-600 dark:text-pink-400">
              {stats.nurses}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Building className="h-4 w-4" />
              Reception
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">
              {stats.receptionists}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Package className="h-4 w-4" />
              Pharmacy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
              {stats.pharmacists}
            </div>
          </CardContent>
        </Card>

        <Card className={stats.total - stats.approved > 0 ? "border-yellow-200 dark:border-yellow-800" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <UserX className="h-4 w-4" />
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.total - stats.approved > 0 ? "text-yellow-600 dark:text-yellow-400" : ""}`}>
              {stats.total - stats.approved}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Users List</CardTitle>
        </CardHeader>
        <CardContent>
          <UserTable
            users={users}
            loading={loading}
            onEdit={(user) => {
              setSelectedUser(user);
              setOpenDialog(true);
            }}
            onRefresh={loadUsers}
            accessToken={accessToken}
          />
        </CardContent>
      </Card>

      {/* Quick Actions */}
      {users.length > 0 && (
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" size="sm" className="w-full justify-start gap-2">
                <UserCheck className="h-4 w-4" />
                Approve All Pending
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start gap-2">
                <UserX className="h-4 w-4" />
                Deactivate Inactive
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start gap-2">
                <RefreshCw className="h-4 w-4" />
                Send Welcome Emails
              </Button>
            </CardContent>
          </Card>

          <Card className="md:col-span-3">
            <CardHeader>
              <CardTitle className="text-sm">Role Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries({
                  admin: stats.admins,
                  doctor: stats.doctors,
                  nurse: stats.nurses,
                  receptionist: stats.receptionists,
                  pharmacist: stats.pharmacists,
                }).map(([role, count]) => (
                  <div key={role} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-primary" />
                      <span className="text-sm capitalize">{role}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-secondary rounded-full h-2">
                        <div 
                          className="h-full bg-primary rounded-full" 
                          style={{ width: `${(count / stats.total) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
