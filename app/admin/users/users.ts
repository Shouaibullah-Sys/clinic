// app/admin/users/users.ts
import { IUser } from "@/lib/models/User";

export const getUsers = async (accessToken: string): Promise<IUser[]> => {
  const response = await fetch("/api/admin/users", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    credentials: "include",
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch users");
  }
  
  const data = await response.json();
  return data.data || [];
};

export const createUser = async (
  data: Partial<IUser>,
  accessToken: string
): Promise<IUser> => {
  const response = await fetch("/api/admin/users", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create user");
  }
  
  return response.json();
};

export const updateUser = async (
  id: string,
  data: Partial<IUser>,
  accessToken: string
): Promise<IUser> => {
  const response = await fetch(`/api/admin/users/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update user");
  }
  
  return response.json();
};

export const deleteUser = async (
  id: string,
  accessToken: string
): Promise<void> => {
  const response = await fetch(`/api/admin/users/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete user");
  }
};