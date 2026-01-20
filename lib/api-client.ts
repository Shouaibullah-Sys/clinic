// lib/api-client.ts
import axios, { AxiosError, AxiosResponse } from "axios";
import { toast } from "sonner";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("accessToken") || 
                  document.cookie.match(/accessToken=([^;]+)/)?.[1];
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      if (typeof window !== "undefined") {
        toast.error("Session expired. Please log in again.");
        window.location.href = "/login";
      }
    }
    
    if (error.response?.status === 403) {
      // Handle forbidden access
      toast.error("Access Denied", {
        description: "You don't have permission to perform this action",
      });
    }
    
    // Handle other errors
    if (error.response?.status && error.response.status >= 400) {
      const errorMessage = (error.response?.data as any)?.error || error.message;
      toast.error("Request Failed", {
        description: errorMessage,
      });
    }
    
    return Promise.reject(error);
  }
);

// Helper functions
export const apiRequest = async <T>(
  url: string,
  options?: {
    method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
    data?: any;
    params?: any;
    toastSuccess?: boolean; // Optional flag to show success toast
    successMessage?: string; // Custom success message
  }
): Promise<{ data: T; status: number }> => {
  try {
    const response = await api.request({
      url,
      method: options?.method || "GET",
      data: options?.data,
      params: options?.params,
    });
    
    // Show success toast if requested
    if (options?.toastSuccess && response.status >= 200 && response.status < 300) {
      const message = options.successMessage || getSuccessMessage(options?.method || "GET");
      toast.success(message);
    }
    
    return {
      data: response.data,
      status: response.status,
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      // Error toast is already shown in the interceptor
      throw new Error(error.response?.data?.error || error.message);
    }
    throw error;
  }
};

// Helper function to generate success messages based on HTTP method
const getSuccessMessage = (method: string): string => {
  switch (method) {
    case "POST":
      return "Created successfully";
    case "PUT":
      return "Updated successfully";
    case "DELETE":
      return "Deleted successfully";
    case "PATCH":
      return "Updated successfully";
    default:
      return "Operation successful";
  }
};

// Service API functions
export const serviceApi = {
  // Imaging
  getImagingRecords: (filters: any) =>
    apiRequest<{ records: any[]; total: number }>("/services/imaging", { params: filters }),
  
  createImagingRecord: (data: any) =>
    apiRequest("/services/imaging", { 
      method: "POST", 
      data,
      toastSuccess: true,
      successMessage: "Imaging record created successfully"
    }),
  
  // Emergency
  getEmergencyCases: (filters: any) =>
    apiRequest<{ records: any[]; total: number }>("/services/emergency", { params: filters }),
  
  createEmergencyCase: (data: any) =>
    apiRequest("/services/emergency", { 
      method: "POST", 
      data,
      toastSuccess: true,
      successMessage: "Emergency case created successfully"
    }),
  
  // Laboratory
  getLabTests: (filters: any) =>
    apiRequest<{ records: any[]; total: number }>("/services/laboratory", { params: filters }),
  
  createLabTest: (data: any) =>
    apiRequest("/services/laboratory", { 
      method: "POST", 
      data,
      toastSuccess: true,
      successMessage: "Lab test created successfully"
    }),
  
  // Pharmacy
  getPrescriptions: (filters: any) =>
    apiRequest<{ records: any[]; total: number }>("/services/pharmacy", { params: filters }),
  
  createPrescription: (data: any) =>
    apiRequest("/services/pharmacy", { 
      method: "POST", 
      data,
      toastSuccess: true,
      successMessage: "Prescription created successfully"
    }),
  
  // Other services...
};

// Alternative: You can also create a wrapper function for success toasts
export const apiRequestWithToast = async <T>(
  url: string,
  options?: {
    method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
    data?: any;
    params?: any;
    loadingMessage?: string;
    successMessage?: string;
    errorMessage?: string;
  }
): Promise<{ data: T; status: number }> => {
  const toastId = options?.loadingMessage 
    ? toast.loading(options.loadingMessage)
    : undefined;
  
  try {
    const response = await api.request({
      url,
      method: options?.method || "GET",
      data: options?.data,
      params: options?.params,
    });
    
    if (toastId) {
      toast.success(options?.successMessage || "Success!", {
        id: toastId,
      });
    } else if (options?.successMessage) {
      toast.success(options.successMessage);
    }
    
    return {
      data: response.data,
      status: response.status,
    };
  } catch (error) {
    if (toastId) {
      toast.error(options?.errorMessage || "Operation failed", {
        id: toastId,
      });
    }
    throw error;
  }
};
