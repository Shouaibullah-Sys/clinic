// lib/services/auth.service.ts
import jwt from "jsonwebtoken";
import { IUser, User } from "@/lib/models/User";
import { SessionModel as Session, ISession } from "@/lib/models/SessionModel";

export interface DecodedToken {
  id: string;
  role: IUser["role"];
  email: string;
  iat?: number;
  exp?: number;
}

export class AuthService {
  static generateTokens(user: IUser) {
    const accessToken = jwt.sign(
      {
        id: user._id.toString(),
        role: user.role,
        email: user.email,
        name: user.name,
      },
      process.env.JWT_SECRET!,
      { expiresIn: "24h" },
    );

    const refreshToken = jwt.sign(
      {
        id: user._id.toString(),
        role: user.role,
        email: user.email,
      },
      process.env.JWT_REFRESH_SECRET!,
      { expiresIn: "7d" },
    );

    return { accessToken, refreshToken };
  }

  static verifyAccessToken(token: string): DecodedToken | null {
    try {
      return jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;
    } catch (error) {
      return null;
    }
  }

  static verifyRefreshToken(token: string): DecodedToken | null {
    try {
      return jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as DecodedToken;
    } catch (error) {
      return null;
    }
  }

  static async createSession(
    userId: string,
    userRole: IUser["role"],
    ipAddress?: string,
    userAgent?: string,
  ): Promise<string> {
    const sessionId = this.generateSessionId();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours expiry

    await Session.create({
      id: sessionId,
      userId,
      userRole,
      expiresAt,
      ipAddress,
      userAgent,
    });

    return sessionId;
  }

  static async validateSession(sessionId: string): Promise<ISession | null> {
    const session = await Session.findOne({ id: sessionId });

    if (!session || session.expiresAt < new Date()) {
      await Session.deleteOne({ id: sessionId });
      return null;
    }

    return session;
  }

  static async deleteSession(sessionId: string): Promise<void> {
    await Session.deleteOne({ id: sessionId });
  }

  static async deleteAllUserSessions(userId: string): Promise<void> {
    await Session.deleteMany({ userId });
  }

  private static generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Role-based access control
export class RBAC {
  private static permissions: any = {
    admin: {
      users: ["create", "read", "update", "delete", "approve"],
      patients: ["create", "read", "update", "delete", "export"],
      appointments: ["create", "read", "update", "delete", "cancel"],
      services: ["create", "read", "update", "delete", "billing"],
      reports: ["read", "export", "generate"],
      settings: ["read", "update"],
      inventory: ["create", "read", "update", "delete"],
      billing: ["create", "read", "update", "delete", "refund"],
    },
    doctor: {
      patients: ["create", "read", "update"],
      appointments: ["create", "read", "update", "cancel"],
      prescriptions: ["create", "read", "update", "delete"],
      medical_records: ["create", "read", "update"],
      lab_orders: ["create", "read"],
      imaging_orders: ["create", "read"],
      referrals: ["create", "read"],
      discharge: ["create"],
    },
    nurse: {
      patients: ["read", "update"],
      appointments: ["read", "update"],
      medications: ["read", "administer"],
      vitals: ["create", "read", "update"],
      nursing_notes: ["create", "read", "update"],
      lab_samples: ["collect", "read"],
    },
    receptionist: {
      patients: ["create", "read", "update"],
      appointments: ["create", "read", "update", "cancel"],
      billing: ["create", "read"],
      registrations: ["create", "read"],
    },
    staff: {
      patients: ["read"],
      appointments: ["read"],
      inventory: ["read"],
    },
    pharmacist: {
      patients: ["read"],
      medications: ["read", "update"],
      prescriptions: ["read", "update"],
    },
    lab_technician: {
      patients: ["read"],
      lab_samples: ["create", "read", "update"],
      lab_orders: ["read", "update"],
    },
    radiologist: {
      patients: ["read"],
      imaging_orders: ["read", "update"],
      imaging_reports: ["create", "read"],
    },
    admission: {
      patients: ["create", "read", "update"],
      admissions: ["create", "read", "update"],
    },
  };

  static can(role: string, resource: string, action: string): boolean {
    if (role === "admin") return true;

    const rolePermissions = this.permissions[role];
    if (!rolePermissions) return false;

    const resourcePermissions =
      rolePermissions[resource as keyof typeof rolePermissions];
    if (!resourcePermissions) return false;

    return resourcePermissions.includes(action);
  }

  static getResourcesForRole(role: string): string[] {
    return Object.keys(this.permissions[role] || {});
  }

  static getActionsForRole(role: string, resource: string): string[] {
    if (role === "admin") return ["all"];

    const rolePermissions = this.permissions[role];
    if (!rolePermissions) return [];

    return rolePermissions[resource as keyof typeof rolePermissions] || [];
  }
}

// Authentication and authorization helpers
export async function authenticateUser(token: string): Promise<{
  user: (Omit<IUser, "_id"> & { _id: string }) | null;
  token: string | null;
  error?: string;
}> {
  try {
    if (!token) {
      return {
        user: null,
        token: null,
        error: "No authentication token provided",
      };
    }

    const decoded = AuthService.verifyAccessToken(token);
    if (!decoded) {
      return {
        user: null,
        token: null,
        error: "Invalid token",
      };
    }

    const user: any = await User.findById(decoded.id)
      .select("-password -refreshTokens")
      .lean();

    if (!user) {
      return {
        user: null,
        token: null,
        error: "User not found",
      };
    }

    if (!user.approved) {
      return {
        user: null,
        token: null,
        error: "Account pending admin approval",
      };
    }

    if (!user.active) {
      return {
        user: null,
        token: null,
        error: "User account is deactivated",
      };
    }

    return {
      user: {
        ...user,
        _id: user._id.toString(),
        role: user.role,
      },
      token,
    };
  } catch (error) {
    console.error("Authentication error:", error);
    return {
      user: null,
      token: null,
      error: "Authentication failed",
    };
  }
}

export function authorizeUser(
  user: Omit<IUser, "_id"> & { _id: string },
  resource: string,
  action: string,
): boolean {
  return RBAC.can(user.role, resource, action);
}

// Service access control
export const ServicePermissions = {
  dental: ["admin", "doctor", "nurse"],
  ecg: ["admin", "doctor", "nurse"],
  imaging: ["admin", "doctor", "nurse", "staff"],
  emergency: ["admin", "doctor", "nurse", "receptionist"],
  opd: ["admin", "doctor", "nurse", "receptionist"],
  laboratory: ["admin", "doctor", "nurse", "staff"],
  ot: ["admin", "doctor", "nurse"],
  pharmacy: ["admin", "doctor", "nurse", "staff", "receptionist"],
  indo: ["admin", "doctor", "nurse"],
  lithotripsy: ["admin", "doctor"],
  endoscopy: ["admin", "doctor", "nurse"],
  ambulance: ["admin", "nurse", "receptionist", "staff"],
};

export function canAccessService(
  userRole: IUser["role"],
  serviceType: string,
  action: string,
): boolean {
  const allowedRoles =
    ServicePermissions[serviceType as keyof typeof ServicePermissions] || [];
  return allowedRoles.includes(userRole) || userRole === "admin";
}

export function getServicesForRole(userRole: IUser["role"]): string[] {
  const allServices = Object.keys(ServicePermissions);
  return allServices.filter((service) =>
    canAccessService(userRole, service, "read"),
  );
}
