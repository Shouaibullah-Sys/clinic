// lib/auth.jwt.ts

import { jwtVerify } from 'jose';
import { NextRequest } from 'next/server';
import { z } from 'zod';

// Define all possible user roles in the system
const UserRoleSchema = z.enum([
  'admin', 
  'doctor', 
  'nurse', 
  'staff', 
  'receptionist',
  'ceo',
  'laboratory',
  'pharmacy',
  'radiologist',
  'surgeon',
  'anesthetist',
  'physiotherapist',
  'dental',
  'cardiologist'
]);

// Service types for authorization
const ServiceTypeSchema = z.enum([
  'xray',
  'ct_scan',
  'mri',
  'ultrasound',
  'emergency',
  'opd',
  'laboratory',
  'ot',
  'pharmacy',
  'indo',
  'lithotripsy',
  'endoscopy',
  'ambulance',
  'dental',
  'ecg'
]);

// Action types for RBAC
const ActionTypeSchema = z.enum([
  'create',
  'read',
  'update',
  'delete',
  'approve',
  'cancel',
  'billing',
  'report',
  'administer',
  'dispatch'
]);

const JwtPayloadSchema = z.object({
  id: z.string(),
  role: UserRoleSchema,
  name: z.string().optional(),
  email: z.string().email().optional(),
  department: z.string().optional(),
  employeeId: z.string().optional(),
  permissions: z.array(z.string()).optional(),
  services: z.array(ServiceTypeSchema).optional(),
});

export type JwtPayload = z.infer<typeof JwtPayloadSchema>;
export type UserRole = JwtPayload['role'];
export type ServiceType = z.infer<typeof ServiceTypeSchema>;
export type ActionType = z.infer<typeof ActionTypeSchema>;

// Service permissions mapping
export const ServicePermissions: Record<ServiceType, UserRole[]> = {
  xray: ['admin', 'doctor', 'nurse', 'radiologist', 'staff'],
  ct_scan: ['admin', 'doctor', 'radiologist'],
  mri: ['admin', 'doctor', 'radiologist'],
  ultrasound: ['admin', 'doctor', 'nurse'],
  emergency: ['admin', 'doctor', 'nurse', 'receptionist'],
  opd: ['admin', 'doctor', 'nurse', 'receptionist'],
  laboratory: ['admin', 'doctor', 'nurse', 'laboratory', 'staff'],
  ot: ['admin', 'doctor', 'nurse', 'surgeon', 'anesthetist'],
  pharmacy: ['admin', 'doctor', 'nurse', 'pharmacy', 'staff', 'receptionist'],
  indo: ['admin', 'doctor', 'nurse'],
  lithotripsy: ['admin', 'doctor', 'surgeon'],
  endoscopy: ['admin', 'doctor', 'nurse'],
  ambulance: ['admin', 'nurse', 'receptionist', 'staff'],
  dental: ['admin', 'doctor', 'nurse', 'dental'],
  ecg: ['admin', 'doctor', 'nurse', 'cardiologist']
};

// Role-based permissions matrix
export const RolePermissions: Record<UserRole, { services: ServiceType[], actions: ActionType[] }> = {
  admin: {
    services: ['xray', 'ct_scan', 'mri', 'ultrasound', 'emergency', 'opd', 'laboratory', 'ot', 'pharmacy', 'indo', 'lithotripsy', 'endoscopy', 'ambulance', 'dental', 'ecg'],
    actions: ['create', 'read', 'update', 'delete', 'approve', 'cancel', 'billing', 'report', 'administer', 'dispatch']
  },
  doctor: {
    services: ['xray', 'ct_scan', 'mri', 'ultrasound', 'emergency', 'opd', 'laboratory', 'ot', 'pharmacy', 'indo', 'lithotripsy', 'endoscopy', 'dental', 'ecg'],
    actions: ['create', 'read', 'update', 'delete', 'cancel', 'report', 'administer']
  },
  nurse: {
    services: ['xray', 'ultrasound', 'emergency', 'opd', 'laboratory', 'ot', 'pharmacy', 'indo', 'endoscopy', 'ambulance', 'dental', 'ecg'],
    actions: ['create', 'read', 'update', 'administer', 'dispatch']
  },
  staff: {
    services: ['xray', 'laboratory', 'pharmacy', 'ambulance'],
    actions: ['read', 'update']
  },
  receptionist: {
    services: ['emergency', 'opd', 'pharmacy', 'ambulance'],
    actions: ['create', 'read', 'update', 'cancel']
  },
  ceo: {
    services: ['xray', 'ct_scan', 'mri', 'ultrasound', 'emergency', 'opd', 'laboratory', 'ot', 'pharmacy', 'indo', 'lithotripsy', 'endoscopy', 'ambulance', 'dental', 'ecg'],
    actions: ['read', 'report']
  },
  laboratory: {
    services: ['laboratory'],
    actions: ['create', 'read', 'update', 'report']
  },
  pharmacy: {
    services: ['pharmacy'],
    actions: ['create', 'read', 'update', 'administer']
  },
  radiologist: {
    services: ['xray', 'ct_scan', 'mri', 'ultrasound'],
    actions: ['read', 'update', 'report']
  },
  surgeon: {
    services: ['ot', 'lithotripsy', 'endoscopy'],
    actions: ['create', 'read', 'update', 'administer']
  },
  anesthetist: {
    services: ['ot'],
    actions: ['create', 'read', 'update', 'administer']
  },
  physiotherapist: {
    services: ['opd'],
    actions: ['create', 'read', 'update']
  },
  dental: {
    services: ['dental'],
    actions: ['create', 'read', 'update', 'administer']
  },
  cardiologist: {
    services: ['ecg'],
    actions: ['create', 'read', 'update', 'report']
  }
};

export const getTokenPayload = async (req: NextRequest): Promise<JwtPayload | null> => {
  const token = req.cookies.get('accessToken')?.value;
  if (!token) return null;
  
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);
    
    // Validate and parse the payload
    return JwtPayloadSchema.parse(payload);
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
};

export const getUserFromRequest = async (req: NextRequest): Promise<JwtPayload | null> => {
  return await getTokenPayload(req);
};

export const hasPermission = (user: JwtPayload, service: ServiceType, action: ActionType): boolean => {
  // Admin has all permissions
  if (user.role === 'admin') return true;

  // Check if user's role has access to this service
  const roleAccess = RolePermissions[user.role];
  if (!roleAccess) return false;

  // Check if service is allowed for this role
  if (!roleAccess.services.includes(service)) return false;

  // Check if action is allowed for this role
  if (!roleAccess.actions.includes(action)) return false;

  // Check service-specific permissions
  const allowedRoles = ServicePermissions[service];
  if (!allowedRoles.includes(user.role)) return false;

  return true;
};

export const canAccessService = (user: JwtPayload, service: ServiceType): boolean => {
  return hasPermission(user, service, 'read');
};

export const getUserServices = (user: JwtPayload): ServiceType[] => {
  return RolePermissions[user.role]?.services || [];
};

export const getUserActions = (user: JwtPayload, service?: ServiceType): ActionType[] => {
  const rolePermissions = RolePermissions[user.role];
  if (!rolePermissions) return [];

  if (service) {
    // Check if service is accessible
    if (!rolePermissions.services.includes(service)) return [];
  }

  return rolePermissions.actions;
};

// Token verification with enhanced payload
export const verifyToken = async (token: string): Promise<JwtPayload | null> => {
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);
    return JwtPayloadSchema.parse(payload);
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
};

// Middleware helper for route protection
export const authorizeRoute = async (
  req: NextRequest,
  requiredService?: ServiceType,
  requiredAction?: ActionType
): Promise<{
  authorized: boolean;
  user?: JwtPayload;
  error?: string;
}> => {
  const user = await getTokenPayload(req);
  
  if (!user) {
    return {
      authorized: false,
      error: 'Authentication required'
    };
  }

  if (!user.role) {
    return {
      authorized: false,
      user,
      error: 'User role not found'
    };
  }

  // If no specific service/action required, just check authentication
  if (!requiredService || !requiredAction) {
    return {
      authorized: true,
      user
    };
  }

  // Check specific permissions
  if (!hasPermission(user, requiredService, requiredAction)) {
    return {
      authorized: false,
      user,
      error: `Insufficient permissions for ${requiredAction} on ${requiredService}`
    };
  }

  return {
    authorized: true,
    user
  };
};

// Service-specific authorization helpers
export const authorizeServiceAccess = async (
  req: NextRequest,
  service: ServiceType,
  action: ActionType
): Promise<JwtPayload> => {
  const result = await authorizeRoute(req, service, action);
  
  if (!result.authorized || !result.user) {
    throw new Error(result.error || 'Unauthorized access');
  }

  return result.user;
};

// Department-based authorization
export const checkDepartmentAccess = (user: JwtPayload, department: string): boolean => {
  // Admin can access all departments
  if (user.role === 'admin') return true;
  
  // If user has department info, check match
  if (user.department) {
    return user.department.toLowerCase() === department.toLowerCase();
  }
  
  return true; // Allow if no department specified
};

// Create enhanced token payload for services
export const createTokenPayload = (userData: {
  id: string;
  role: UserRole;
  name?: string;
  email?: string;
  department?: string;
  employeeId?: string;
}): JwtPayload => {
  return {
    id: userData.id,
    role: userData.role,
    name: userData.name,
    email: userData.email,
    department: userData.department,
    employeeId: userData.employeeId,
    permissions: RolePermissions[userData.role]?.actions || [],
    services: RolePermissions[userData.role]?.services || []
  };
};

// Token expiration helper
export const isTokenExpiringSoon = async (token: string, thresholdMinutes: number = 30): Promise<boolean> => {
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);
    
    if (!payload.exp) return false;
    
    const expirationTime = payload.exp * 1000; // Convert to milliseconds
    const currentTime = Date.now();
    const thresholdMs = thresholdMinutes * 60 * 1000;
    
    return expirationTime - currentTime <= thresholdMs;
  } catch (error) {
    return false;
  }
};