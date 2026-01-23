// lib/auth.ts - COMPLETE AUTHENTICATION UTILITY

import { jwtDecode } from "jwt-decode";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

// Define proper JWT payload interface
interface JWTPayload {
  id: string;
  email: string;
  role: string;
  name?: string;
  phone?: string;
  approved?: boolean;
  active?: boolean;
  exp?: number;
  iat?: number;
  [key: string]: any; // Allow additional properties
}

export interface UserSession {
  user: {
    _id: string;
    name: string;
    email: string;
    role: string;
    phone: string;
    avatar?: string;
    approved: boolean;
    active: boolean;
    department?: string;
    specialization?: string;
    licenseNumber?: string;
  };
  expires?: Date;
}

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this";

// Validate JWT secret on module load
if (!process.env.JWT_SECRET) {
  console.warn("⚠️  JWT_SECRET is not set in environment variables. Using default value.");
}

// For server components - Get session from cookies
export async function getServerSession(req?: any): Promise<UserSession | null> {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("accessToken")?.value;

    if (!accessToken) {
      console.log("No access token found in cookies");
      return null;
    }

    const decoded = jwtDecode<JWTPayload>(accessToken);
    
    // Ensure required fields exist
    if (!decoded.id || !decoded.email || !decoded.role) {
      console.error("Missing required fields in JWT payload:", {
        hasId: !!decoded.id,
        hasEmail: !!decoded.email,
        hasRole: !!decoded.role
      });
      return null;
    }

    // Check if token is expired
    if (decoded.exp && Date.now() >= decoded.exp * 1000) {
      console.log("Token expired at:", new Date(decoded.exp * 1000));
      return null;
    }

    console.log("Session retrieved for user:", {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      name: decoded.name
    });

    return {
      user: {
        _id: decoded.id,
        name: decoded.name || "User",
        email: decoded.email,
        role: decoded.role,
        phone: decoded.phone || "",
        approved: decoded.approved !== false,
        active: decoded.active !== false,
        department: decoded.department,
        specialization: decoded.specialization,
        licenseNumber: decoded.licenseNumber
      },
      expires: decoded.exp ? new Date(decoded.exp * 1000) : undefined
    };
  } catch (error) {
    console.error("Session error:", error);
    return null;
  }
}

// For API routes - Verify token from Authorization header
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    if (!token || typeof token !== 'string') {
      console.error("Invalid token format");
      return null;
    }

    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify<JWTPayload>(token, secret);
    
    console.log("Token verified successfully for:", {
      id: payload.id,
      email: payload.email,
      role: payload.role
    });
    
    return payload;
  } catch (error: any) {
    console.error("Token verification failed:", {
      error: error.message,
      tokenLength: token?.length,
      tokenPreview: token?.substring(0, 20) + '...'
    });
    return null;
  }
}

// Extract token from various sources
export function extractToken(request: Request | NextRequest): string | null {
  // Try Authorization header first
  const authHeader = request.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.split(" ")[1];
  }
  
  // Try x-access-token header
  const xAccessToken = request.headers.get("x-access-token");
  if (xAccessToken) {
    return xAccessToken;
  }
  
  // Try cookies
  try {
    const cookieHeader = request.headers.get("cookie");
    if (cookieHeader) {
      const cookies = Object.fromEntries(
        cookieHeader.split('; ').map(cookie => {
          const [key, ...rest] = cookie.split('=');
          return [key, rest.join('=')];
        })
      );
      return cookies.accessToken || null;
    }
  } catch (error) {
    console.error("Error parsing cookies:", error);
  }
  
  return null;
}

// Authenticate API request with comprehensive logging
export interface AuthResult {
  success: boolean;
  userId?: string;
  userRole?: string;
  userEmail?: string;
  userName?: string;
  userData?: {
    phone?: string;
    approved?: boolean;
    active?: boolean;
    department?: string;
    specialization?: string;
  };
  error?: string;
  status?: number;
  tokenSource?: 'header' | 'cookie' | 'x-access-token';
}

export async function authenticateRequest(request: Request | NextRequest): Promise<AuthResult> {
  console.log("🔐 Authentication request for:", {
    url: request.url,
    method: request.method,
    headers: Object.fromEntries(request.headers.entries())
  });
  
  const token = extractToken(request);
  
  if (!token) {
    console.log("❌ No token found in request");
    return { 
      success: false, 
      error: "Unauthorized. No authentication token provided.", 
      status: 401 
    };
  }
  
  const payload = await verifyToken(token);
  
  if (!payload) {
    console.log("❌ Token verification failed");
    return { 
      success: false, 
      error: "Invalid or expired token. Please login again.", 
      status: 401 
    };
  }
  
  // Check if token is expired
  if (payload.exp && Date.now() >= payload.exp * 1000) {
    console.log("❌ Token expired");
    return { 
      success: false, 
      error: "Token expired. Please refresh your session.", 
      status: 401 
    };
  }
  
  console.log("✅ Authentication successful for:", {
    userId: payload.id,
    userRole: payload.role,
    userEmail: payload.email,
    userName: payload.name
  });
  
  return {
    success: true,
    userId: payload.id,
    userRole: payload.role,
    userEmail: payload.email,
    userName: payload.name,
    userData: {
      phone: payload.phone,
      approved: payload.approved,
      active: payload.active,
      department: payload.department,
      specialization: payload.specialization
    }
  };
}

// Role-based access control functions
export function hasRequiredRole(userRole: string | undefined, allowedRoles: string[] | string): boolean {
  if (!userRole) {
    console.log("Role check failed: userRole is undefined");
    return false;
  }
  
  const isAllowed = Array.isArray(allowedRoles) 
    ? allowedRoles.includes(userRole)
    : userRole === allowedRoles;
  
  console.log(`Role check: ${userRole} in ${JSON.stringify(allowedRoles)} = ${isAllowed}`);
  return isAllowed;
}

// Get allowed roles for laboratory access
export function getLabAllowedRoles(): string[] {
  return ["lab_technician", "admin", "doctor", "receptionist"];
}

// Check if user can access laboratory with safe handling
export function canAccessLaboratory(userRole: string | undefined): boolean {
  if (!userRole) {
    console.log("Laboratory access check failed: userRole is undefined");
    return false;
  }
  
  const allowed = getLabAllowedRoles().includes(userRole);
  console.log(`Laboratory access for ${userRole}: ${allowed ? 'ALLOWED' : 'DENIED'}`);
  return allowed;
}

// Get allowed roles for specific modules
export function getAllowedRolesForModule(module: string): string[] {
  const roleMap: Record<string, string[]> = {
    laboratory: ["lab_technician", "admin", "doctor", "receptionist"],
    pharmacy: ["pharmacist", "admin", "doctor"],
    radiology: ["radiologist", "admin", "doctor"],
    reception: ["receptionist", "admin"],
    doctor: ["doctor", "admin"],
    nurse: ["nurse", "admin", "doctor"],
    admin: ["admin"],
    appointments: ["admin", "doctor", "receptionist", "nurse"],
    patients: ["admin", "doctor", "receptionist", "nurse"],
    billing: ["admin", "receptionist"]
  };
  
  return roleMap[module] || ["admin"];
}

// Check module access
export function canAccessModule(userRole: string | undefined, module: string): boolean {
  if (!userRole) return false;
  const allowedRoles = getAllowedRolesForModule(module);
  return allowedRoles.includes(userRole);
}

// Create middleware-like auth check for API routes
export async function requireAuth(
  request: Request, 
  allowedRoles?: string[]
): Promise<{ authorized: boolean; auth?: AuthResult; response?: Response }> {
  const auth = await authenticateRequest(request);
  
  if (!auth.success) {
    return {
      authorized: false,
      response: new Response(
        JSON.stringify({ success: false, error: auth.error }),
        { status: auth.status || 401, headers: { 'Content-Type': 'application/json' } }
      )
    };
  }
  
  // If specific roles are required, check them
  if (allowedRoles && allowedRoles.length > 0) {
    if (!auth.userRole || !hasRequiredRole(auth.userRole, allowedRoles)) {
      return {
        authorized: false,
        auth,
        response: new Response(
          JSON.stringify({ 
            success: false, 
            error: "Forbidden. You don't have permission to access this resource.",
            requiredRoles: allowedRoles,
            userRole: auth.userRole
          }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        )
      };
    }
  }
  
  return { authorized: true, auth };
}

// Validate user is active and approved
export function isUserActive(auth: AuthResult): boolean {
  if (!auth.success || !auth.userData) return false;
  
  const isActive = auth.userData.active !== false;
  const isApproved = auth.userData.approved !== false;
  
  if (!isActive) console.log(`User ${auth.userId} is not active`);
  if (!isApproved) console.log(`User ${auth.userId} is not approved`);
  
  return isActive && isApproved;
}

// Token utilities
export function decodeTokenWithoutVerification(token: string): JWTPayload | null {
  try {
    return jwtDecode<JWTPayload>(token);
  } catch (error) {
    console.error("Failed to decode token:", error);
    return null;
  }
}

// Log auth context for debugging
export function logAuthContext(request: Request, auth: AuthResult): void {
  console.log("🔍 Authentication Context:", {
    url: request.url,
    method: request.method,
    user: auth.userId,
    role: auth.userRole,
    email: auth.userEmail,
    timestamp: new Date().toISOString()
  });
}

// Create auth headers for client-side requests
export function createAuthHeaders(token?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
}

// Check if request is from an authenticated lab technician
export function isLabTechnician(auth: AuthResult): boolean {
  return auth.success && auth.userRole === 'lab_technician';
}

// Check if request is from admin
export function isAdmin(auth: AuthResult): boolean {
  return auth.success && auth.userRole === 'admin';
}

// Check if user can view sensitive data
export function canViewSensitiveData(auth: AuthResult): boolean {
  const sensitiveDataRoles = ['admin', 'doctor', 'lab_technician'];
  return auth.success && auth.userRole ? sensitiveDataRoles.includes(auth.userRole) : false;
}

// Export types for use elsewhere
export type { JWTPayload };
export type UserRole = string;

// Utility to validate environment
export function validateAuthEnvironment(): boolean {
  const issues: string[] = [];
  
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === "your-secret-key-change-this") {
    issues.push("JWT_SECRET is not properly configured");
  }
  
  if (process.env.NODE_ENV === 'production' && process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    issues.push("JWT_SECRET is too short for production");
  }
  
  if (issues.length > 0) {
    console.error("⚠️ Auth Environment Issues:", issues);
    return false;
  }
  
  console.log("✅ Auth environment validated successfully");
  return true;
}

// Call validation on module load (development only)
if (process.env.NODE_ENV === 'development') {
  validateAuthEnvironment();
}