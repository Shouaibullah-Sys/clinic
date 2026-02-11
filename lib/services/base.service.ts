// lib/services/base.service.ts
import { NextRequest } from "next/server";
import { IUser, User } from "@/lib/models/User";
import {
  AuthService,
  RBAC,
  authenticateUser,
  authorizeUser,
  ServicePermissions,
} from "@/lib/services/auth.service";
import {
  ActivityLogger,
  ServiceActivityTracker,
} from "@/lib/middleware/activity-logger";

export class ServiceError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
    public code?: string,
  ) {
    super(message);
    this.name = "ServiceError";
  }
}

export abstract class BaseService {
  protected request?: NextRequest;

  constructor(request?: NextRequest) {
    this.request = request;
  }

  public setRequest(request: NextRequest) {
    this.request = request;
  }

  protected async authenticate(token: string): Promise<{
    user: Omit<IUser, "_id"> & { _id: string };
    token: string;
  }> {
    const authResult = await authenticateUser(token);

    if (!authResult.user || !authResult.token) {
      // Log authentication failure
      if (this.request) {
        await ServiceActivityTracker.trackServiceError(
          this.request,
          this.constructor.name.replace("ServiceHandler", "").toLowerCase(),
          "authenticate",
          "unknown",
          new Error(authResult.error || "Authentication failed"),
        );
      }

      throw new ServiceError(authResult.error || "Authentication failed", 401);
    }

    // Log successful authentication
    if (this.request) {
      await ServiceActivityTracker.trackServiceAccess(
        this.request,
        this.constructor.name.replace("ServiceHandler", "").toLowerCase(),
        "authenticate",
        authResult.user._id,
      );
    }

    return {
      user: authResult.user,
      token: authResult.token,
    };
  }

  protected async authorize(
    user: Omit<IUser, "_id"> & { _id: string },
    resource: string,
    action: string,
  ): Promise<void> {
    if (!authorizeUser(user, resource, action)) {
      // Log authorization failure
      if (this.request) {
        await ServiceActivityTracker.trackServiceError(
          this.request,
          this.constructor.name.replace("ServiceHandler", "").toLowerCase(),
          action,
          user._id,
          new Error("Unauthorized access"),
          resource,
        );
      }

      throw new ServiceError("Unauthorized access", 403);
    }
  }

  protected async validateAndAuthorize(
    token: string,
    resource: string,
    action: string,
  ): Promise<{ user: Omit<IUser, "_id"> & { _id: string } }> {
    const auth = await this.authenticate(token);
    await this.authorize(auth.user, resource, action);
    return { user: auth.user };
  }

  protected async getUserFromToken(
    token: string,
  ): Promise<Omit<IUser, "_id"> & { _id: string }> {
    const auth = await this.authenticate(token);
    return auth.user;
  }

  protected async checkServiceAccess(
    user: Omit<IUser, "_id"> & { _id: string },
    serviceType: string,
    action: string = "read",
  ): Promise<void> {
    const allowedRoles =
      ServicePermissions[serviceType as keyof typeof ServicePermissions] || [];
    if (!allowedRoles.includes(user.role) && user.role !== "admin") {
      // Log service access denial
      if (this.request) {
        await ServiceActivityTracker.trackServiceError(
          this.request,
          serviceType,
          action,
          user._id,
          new Error(`Access denied to ${serviceType} service`),
          serviceType,
        );
      }

      throw new ServiceError(`Access denied to ${serviceType} service`, 403);
    }
  }

  // Common methods for all services
  protected async populateUserDetails(
    doc: any,
    fields: string[] = ["name", "email", "role", "department"],
  ) {
    if (!doc) return doc;

    const populateFields = fields.map((field) => {
      if (field.includes(".")) {
        return {
          path: field.split(".")[0],
          select: field.split(".")[1],
        };
      }
      return {
        path: field,
        select: fields.join(" "),
      };
    });

    for (const field of populateFields) {
      if (doc[field.path]) {
        await doc.populate(field);
      }
    }

    return doc;
  }

  protected async auditLog(
    action: string,
    resource: string,
    resourceId: string,
    userId: string,
    userRole: string,
    details: any = {},
  ) {
    // Log to activity tracker
    if (this.request) {
      await ServiceActivityTracker.trackDataChange(
        this.request,
        this.constructor.name.replace("ServiceHandler", "").toLowerCase(),
        action,
        userId,
        resourceId,
        details.changes || {},
        details.previousState,
      );
    }

    // Additional audit logging to database
    console.log("AUDIT:", {
      action,
      resource,
      resourceId,
      userId,
      userRole,
      timestamp: new Date(),
      ...details,
    });

    // In production, save to audit database
    // await AuditLog.create({ ... });
  }

  // Rate limiting helper
  protected async checkRateLimit(
    userId: string,
    action: string,
    maxRequests: number = 100,
    windowMs: number = 15 * 60 * 1000, // 15 minutes
  ): Promise<void> {
    // Implement rate limiting logic here
    // You can use Redis or in-memory store
  }

  // Request validation helper
  protected validateRequest(data: any, schema: any): void {
    // Implement validation logic
    // You can use Zod, Joi, or class-validator
  }
}

// Service registry pattern
export class ServiceRegistry {
  private static instances: Map<string, BaseService> = new Map();

  static register(name: string, service: BaseService): void {
    this.instances.set(name, service);
  }

  static get<T extends BaseService>(name: string, request?: NextRequest): T {
    const service = this.instances.get(name);
    if (!service) {
      throw new ServiceError(`Service ${name} not found`, 404);
    }

    if (request) {
      service.setRequest(request);
    }

    return service as T;
  }

  static has(name: string): boolean {
    return this.instances.has(name);
  }

  static getAllServices(): string[] {
    return Array.from(this.instances.keys());
  }
}
