// lib/hooks/use-services.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api-client";

export const serviceKeys = {
  all: ["services"] as const,
  lists: () => [...serviceKeys.all, "list"] as const,
  list: (filters: any) => [...serviceKeys.lists(), filters] as const,
  details: () => [...serviceKeys.all, "detail"] as const,
  detail: (id: string) => [...serviceKeys.details(), id] as const,
};

// Generic service hooks
export const useServiceList = <T>(serviceType: string, filters = {}) => {
  return useQuery({
    queryKey: [serviceType, "list", filters],
    queryFn: async () => {
      const response = await apiRequest(`/api/services/${serviceType}`, {
        params: filters,
      });
      return response.data as { records: T[]; total: number; page: number; totalPages: number };
    },
  });
};

export const useServiceDetail = <T>(serviceType: string, id: string) => {
  return useQuery({
    queryKey: [serviceType, "detail", id],
    queryFn: async () => {
      const response = await apiRequest(`/api/services/${serviceType}/${id}`);
      return response.data as T;
    },
    enabled: !!id,
  });
};

export const useCreateService = <T>(serviceType: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: Partial<T>) => {
      const response = await apiRequest(`/api/services/${serviceType}`, {
        method: "POST",
        data,
      });
      return response.data as T;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [serviceType, "list"] });
    },
  });
};

export const useUpdateService = <T>(serviceType: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<T> }) => {
      const response = await apiRequest(`/api/services/${serviceType}/${id}`, {
        method: "PUT",
        data,
      });
      return response.data as T;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: [serviceType, "list"] });
      queryClient.invalidateQueries({ queryKey: [serviceType, "detail", id] });
    },
  });
};

export const useDeleteService = (serviceType: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      await apiRequest(`/api/services/${serviceType}/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [serviceType, "list"] });
    },
  });
};

// Service-specific hooks
export const useImagingRecords = (filters = {}) => 
  useServiceList<any>("imaging", filters);

export const useEmergencyCases = (filters = {}) => 
  useServiceList<any>("emergency", filters);

export const useLaboratoryTests = (filters = {}) => 
  useServiceList<any>("laboratory", filters);

export const usePrescriptions = (filters = {}) => 
  useServiceList<any>("pharmacy", filters);

export const useDentalRecords = (filters = {}) => 
  useServiceList<any>("dental", filters);

export const useECGRecords = (filters = {}) =>
  useServiceList<any>("ecg", filters);

// Services list hook
const services = [
  {
    name: "imaging",
    displayName: "Imaging Services",
    description: "X-ray, CT Scan, MRI, and Ultrasound services",
    icon: "xray",
    color: "blue",
    permissions: ["view", "create", "edit"],
  },
  {
    name: "emergency",
    displayName: "Emergency Services",
    description: "24/7 emergency care and ambulance services",
    icon: "emergency",
    color: "red",
    permissions: ["view", "create", "edit"],
  },
  {
    name: "laboratory",
    displayName: "Laboratory Services",
    description: "Blood tests, pathology, and diagnostic tests",
    icon: "laboratory",
    color: "green",
    permissions: ["view", "create", "edit"],
  },
  {
    name: "pharmacy",
    displayName: "Pharmacy Services",
    description: "Prescription management and medication dispensing",
    icon: "pharmacy",
    color: "purple",
    permissions: ["view", "create", "edit"],
  },
  {
    name: "dental",
    displayName: "Dental Services",
    description: "Dental care and oral health services",
    icon: "dental",
    color: "orange",
    permissions: ["view", "create", "edit"],
  },
  {
    name: "ecg",
    displayName: "ECG Services",
    description: "Electrocardiogram and cardiac monitoring",
    icon: "ecg",
    color: "teal",
    permissions: ["view", "create", "edit"],
  },
];

export const useServices = () => {
  return useQuery({
    queryKey: serviceKeys.lists(),
    queryFn: async () => {
      // Simulate API call or return static data
      return { services };
    },
  });
};
