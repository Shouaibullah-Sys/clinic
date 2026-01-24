import { useAuthStore } from "@/store/useAuthStore";

export async function fetchJSON(url: string, options?: RequestInit) {
  const { accessToken } = useAuthStore.getState();

  const headers = {
    'Content-Type': 'application/json',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    ...options?.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // Always include cookies
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      error: `HTTP ${response.status}: ${response.statusText}`
    }));
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
}

export function useApiHeaders() {
  const { accessToken } = useAuthStore.getState();
  
  return {
    'Content-Type': 'application/json',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  };
}

export async function fetchWithAuth(url: string, options?: RequestInit) {
  const headers = useApiHeaders();

  const response = await fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...options?.headers,
    },
    credentials: 'include', // Always include cookies
  });

  return response;
}