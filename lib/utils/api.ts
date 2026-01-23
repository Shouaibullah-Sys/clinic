// lib/utils/api.ts

export async function fetchWithAuth(url: string, options: RequestInit = {}) {
  try {
    // Get token from localStorage
    const token = localStorage.getItem('token');
    
    if (!token) {
      // Redirect to login if no token
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      throw new Error('No authentication token found');
    }
    
    // Add authorization header
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    };
    
    const response = await fetch(url, {
      ...options,
      headers,
    });
    
    // Handle 401 - Unauthorized
    if (response.status === 401) {
      // Clear token and redirect to login
      localStorage.removeItem('token');
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      throw new Error('Session expired. Please login again.');
    }
    
    return response;
  } catch (error) {
    console.error('API call error:', error);
    throw error;
  }
}

export async function fetchJSON(url: string, options: RequestInit = {}) {
  const response = await fetchWithAuth(url, options);
  return response.json();
}