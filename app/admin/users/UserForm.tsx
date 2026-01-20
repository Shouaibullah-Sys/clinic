// app/admin/users/UserForm.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  UserRoleEnum,
  DepartmentOptions,
  DesignationOptions,
} from "@/lib/schemas/userSchema";
import { z } from "zod";
import { IUser } from "@/lib/models/User";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

// Define a unified schema that handles both create and update scenarios
const UserFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits").max(15),
  role: z.enum(UserRoleEnum),
  department: z.string().min(1, "Department is required"),
  designation: z.string().min(1, "Designation is required"),
  specialization: z.string().optional(),
  licenseNumber: z.string().optional(),
  approved: z.boolean().default(false),
  active: z.boolean().default(true),
  address: z.string().optional(),
  gender: z.enum(["male", "female", "other"]).optional(),
  joiningDate: z.string().or(z.date()).optional(),
  avatar: z.string().optional(),
  password: z.string().optional(),
});

type UserFormValues = z.infer<typeof UserFormSchema>;

interface UserFormProps {
  user?: (Partial<IUser> & { _id?: string }) | null;
  onSuccess: () => void;
  accessToken: string | null;
}

export default function UserForm({ user, onSuccess, accessToken }: UserFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const isEditMode = !!user?._id;

  // Initialize form with the unified schema
  const form = useForm({
    resolver: zodResolver(UserFormSchema),
    defaultValues: {
      name: user?.name || "",
      email: user?.email || "",
      phone: user?.phone || "",
      password: "",
      role: user?.role || "staff",
      department: user?.department || "",
      designation: user?.designation || "",
      specialization: user?.specialization || "",
      licenseNumber: user?.licenseNumber || "",
      approved: user?.approved ?? false,
      active: user?.active ?? true,
      address: user?.address || "",
      gender: user?.gender || "male",
      joiningDate: user?.joiningDate 
        ? new Date(user.joiningDate).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
      avatar: user?.avatar || "",
    },
  });

  // Reset form when user changes
  useEffect(() => {
    if (user) {
      form.reset({
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
        password: "",
        role: user.role || "staff",
        department: user.department || "",
        designation: user.designation || "",
        specialization: user.specialization || "",
        licenseNumber: user.licenseNumber || "",
        approved: user.approved ?? false,
        active: user.active ?? true,
        address: user.address || "",
        gender: user.gender || "male",
        joiningDate: user.joiningDate 
          ? new Date(user.joiningDate).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0],
        avatar: user.avatar || "",
      });
    }
  }, [user, form]);

  const onSubmit = async (data: any) => {
    if (!accessToken) {
      toast.error("Authentication required. Please login again.");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const url = user?._id
        ? `/api/admin/users/${user._id}`
        : "/api/admin/users";

      const method = user?._id ? "PUT" : "POST";

      // Prepare payload
      const payload: any = { ...data };

      // For updates: remove password if empty
      if (isEditMode && (!payload.password || payload.password.trim() === "")) {
        delete payload.password;
      }

      // Convert joiningDate to ISO string
      if (payload.joiningDate) {
        payload.joiningDate = new Date(payload.joiningDate).toISOString();
      }

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(
          responseData.error || 
          responseData.message || 
          `Failed to ${isEditMode ? "update" : "create"} user`
        );
      }

      toast.success(
        isEditMode 
          ? "User updated successfully" 
          : "User created successfully"
      );
      onSuccess();
    } catch (error: unknown) {
      console.error("Form submission error:", error);
      setFormError(
        error instanceof Error 
          ? error.message 
          : "An unexpected error occurred"
      );
      toast.error(
        error instanceof Error 
          ? error.message 
          : "Failed to save user"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderPasswordField = () => (
    <FormField
      control={form.control}
      name="password"
      render={({ field }: any) => (
        <FormItem>
          <FormLabel>
            Password {!isEditMode && <span className="text-red-500">*</span>}
          </FormLabel>
          <FormControl>
            <Input
              type="password"
              {...field}
              value={field.value || ""}
              placeholder={isEditMode ? "Leave empty to keep current" : "Enter password"}
              autoComplete="new-password"
            />
          </FormControl>
          {!isEditMode && (
            <FormDescription>
              Password must be at least 8 characters with uppercase, lowercase, number, and special character
            </FormDescription>
          )}
          <FormMessage />
        </FormItem>
      )}
    />
  );

  return (
    <div className="space-y-4">
      {formError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-4"
        >
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }: any) => (
                <FormItem>
                  <FormLabel>Full Name *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="John Doe" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }: any) => (
                <FormItem>
                  <FormLabel>Email *</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      {...field}
                      placeholder="john@example.com"
                      disabled={isEditMode}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }: any) => (
                <FormItem>
                  <FormLabel>Phone *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="+1234567890" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="gender"
              render={({ field }: any) => (
                <FormItem>
                  <FormLabel>Gender</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Role and Department */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="role"
              render={({ field }: any) => (
                <FormItem>
                  <FormLabel>Role *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {UserRoleEnum.map((role) => (
                        <SelectItem key={role} value={role}>
                          {role.charAt(0).toUpperCase() + role.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="department"
              render={({ field }: any) => (
                <FormItem>
                  <FormLabel>Department *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {DepartmentOptions.map((dept) => (
                        <SelectItem key={dept} value={dept}>
                          {dept}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="designation"
              render={({ field }: any) => (
                <FormItem>
                  <FormLabel>Designation *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select designation" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {DesignationOptions.map((designation) => (
                        <SelectItem key={designation} value={designation}>
                          {designation}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="joiningDate"
              render={({ field }: any) => (
                <FormItem>
                  <FormLabel>Joining Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Specialization for medical staff */}
          {(form.watch("role") === "doctor" || 
            form.watch("role") === "nurse" || 
            form.watch("role") === "radiologist") && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="specialization"
                render={({ field }: any) => (
                  <FormItem>
                    <FormLabel>Specialization</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., Cardiology, Orthopedics" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="licenseNumber"
                render={({ field }: any) => (
                  <FormItem>
                    <FormLabel>License Number</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Medical license number" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          {/* Password */}
          {renderPasswordField()}

          {/* Address */}
          <FormField
            control={form.control}
            name="address"
            render={({ field }: any) => (
              <FormItem>
                <FormLabel>Address</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="Full address"
                    rows={3}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Status Switches */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="approved"
              render={({ field }: any) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Approved</FormLabel>
                    <FormDescription>
                      User can access the system
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="active"
              render={({ field }: any) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Active</FormLabel>
                    <FormDescription>
                      User account is active
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          <div className="flex justify-end gap-4 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onSuccess()}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? isEditMode
                  ? "Updating..."
                  : "Creating..."
                : isEditMode
                ? "Update User"
                : "Create User"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
