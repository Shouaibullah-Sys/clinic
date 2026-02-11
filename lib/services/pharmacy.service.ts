// lib/services/pharmacy.service.ts
import { NextRequest } from "next/server";
import { BaseService, ServiceError, ServiceRegistry } from "./base.service";
import { ServiceActivityTracker } from "@/lib/middleware/activity-logger";
import {
  IPharmacyService,
  PharmacyService,
} from "@/lib/models/PharmacyService";
import { IUser } from "@/lib/models/User";

export class PharmacyServiceHandler extends BaseService {
  async createPharmacyService(
    token: string,
    data: Partial<IPharmacyService>,
  ): Promise<IPharmacyService> {
    const { user } = await this.validateAndAuthorize(
      token,
      "patients",
      "create",
    );

    await this.checkServiceAccess(user, "pharmacy", "create");

    // Validate required fields
    if (!data.patient || !data.prescription) {
      throw new ServiceError("Patient and service type are required", 400);
    }

    // Log service access
    if (this.request) {
      await ServiceActivityTracker.trackServiceAccess(
        this.request,
        "pharmacy",
        "create",
        user._id,
      );
    }

    const pharmacyService = await PharmacyService.create({
      ...data,
      status: "pending",
      serviceDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await this.auditLog(
      "create",
      "pharmacy_service",
      pharmacyService._id.toString(),
      user._id,
      user.role,
      { data },
    );

    return pharmacyService;
  }

  async getPharmacyService(
    token: string,
    serviceId: string,
  ): Promise<IPharmacyService> {
    const { user } = await this.authenticate(token);

    // Log service access
    if (this.request) {
      await ServiceActivityTracker.trackServiceAccess(
        this.request,
        "pharmacy",
        "read",
        user._id,
        serviceId,
      );
    }

    const service = await PharmacyService.findById(serviceId)
      .populate("patient", "name age gender")
      .populate("pharmacist", "name designation")
      .populate("department", "name");

    if (!service) {
      // Log not found error
      if (this.request) {
        await ServiceActivityTracker.trackServiceError(
          this.request,
          "pharmacy",
          "read",
          user._id,
          new Error("Pharmacy service not found"),
          serviceId,
        );
      }

      throw new ServiceError("Pharmacy service not found", 404);
    }

    // Check access permissions
    if (user.role !== "admin" && service.pharmacist?.toString() !== user._id) {
      await this.authorize(user, "patients", "read");
    }

    return service;
  }

  async updatePharmacyService(
    token: string,
    serviceId: string,
    updates: Partial<IPharmacyService>,
  ): Promise<IPharmacyService> {
    const { user } = await this.validateAndAuthorize(
      token,
      "patients",
      "update",
    );

    const service = await PharmacyService.findById(serviceId);
    if (!service) {
      throw new ServiceError("Pharmacy service not found", 404);
    }

    // Check if user is authorized to update this service
    if (user.role !== "admin" && service.pharmacist?.toString() !== user._id) {
      // Log unauthorized update attempt
      if (this.request) {
        await ServiceActivityTracker.trackServiceError(
          this.request,
          "pharmacy",
          "update",
          user._id,
          new Error("Not authorized to update this service"),
          serviceId,
        );
      }

      throw new ServiceError("Not authorized to update this service", 403);
    }

    const previousState = { ...service.toObject() };

    Object.assign(service, updates);
    service.updatedAt = new Date();
    await service.save();

    // Log successful update
    if (this.request) {
      await ServiceActivityTracker.trackDataChange(
        this.request,
        "pharmacy",
        "update",
        user._id,
        serviceId,
        updates,
        previousState,
      );
    }

    await this.auditLog(
      "update",
      "pharmacy_service",
      service._id.toString(),
      user._id,
      user.role,
      {
        previousState,
        newState: service.toObject(),
        changes: updates,
      },
    );

    return service;
  }

  async listPharmacyServices(
    token: string,
    filters: any = {},
    options: {
      page?: number;
      limit?: number;
      sort?: any;
    } = {},
  ): Promise<{
    services: IPharmacyService[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const { user } = await this.authenticate(token);
    const { page = 1, limit = 20, sort = { createdAt: -1 } } = options;

    // Log list access
    if (this.request) {
      await ServiceActivityTracker.trackServiceAccess(
        this.request,
        "pharmacy",
        "list",
        user._id,
      );
    }

    // Build query based on user role
    let query: any = {};

    if (user.role === "pharmacist") {
      query = { pharmacist: user._id };
    } else if (user.role === "receptionist" || user.role === "staff") {
      query = { status: { $in: ["pending", "in_progress"] } };
    }

    // Apply additional filters
    query = { ...query, ...filters };

    const total = await PharmacyService.countDocuments(query);
    const services = await PharmacyService.find(query)
      .populate("patient", "name age gender")
      .populate("pharmacist", "name designation")
      .skip((page - 1) * limit)
      .limit(limit)
      .sort(sort);

    return {
      services,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async deletePharmacyService(token: string, serviceId: string): Promise<void> {
    const { user } = await this.validateAndAuthorize(
      token,
      "patients",
      "delete",
    );

    if (user.role !== "admin") {
      // Log unauthorized delete attempt
      if (this.request) {
        await ServiceActivityTracker.trackServiceError(
          this.request,
          "pharmacy",
          "delete",
          user._id,
          new Error("Only administrators can delete services"),
          serviceId,
        );
      }

      throw new ServiceError("Only administrators can delete services", 403);
    }

    const service = await PharmacyService.findById(serviceId);
    if (!service) {
      throw new ServiceError("Service not found", 404);
    }

    // Log deletion
    if (this.request) {
      await ServiceActivityTracker.trackDataChange(
        this.request,
        "pharmacy",
        "delete",
        user._id,
        serviceId,
        { status: "cancelled" },
        service.toObject(),
      );
    }

    // Soft delete
    service.status = "cancelled";
    service.updatedAt = new Date();
    await service.save();

    await this.auditLog(
      "delete",
      "pharmacy_service",
      serviceId,
      user._id,
      user.role,
      { service: service.toObject() },
    );
  }

  // Statistics and reports
  async getStatistics(
    token: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<any> {
    const { user } = await this.authenticate(token);

    if (user.role !== "admin") {
      throw new ServiceError("Only administrators can view statistics", 403);
    }

    const query: any = {};
    if (startDate || endDate) {
      query.serviceDate = {};
      if (startDate) query.serviceDate.$gte = startDate;
      if (endDate) query.serviceDate.$lte = endDate;
    }

    const [totalServices, completedServices, cancelledServices, byServiceType] =
      await Promise.all([
        PharmacyService.countDocuments(query),
        PharmacyService.countDocuments({ ...query, status: "completed" }),
        PharmacyService.countDocuments({ ...query, status: "cancelled" }),
        PharmacyService.aggregate([
          { $match: query },
          { $group: { _id: "$prescription", count: { $sum: 1 } } },
        ]),
      ]);

    // Log statistics access
    if (this.request) {
      await ServiceActivityTracker.trackServiceAccess(
        this.request,
        "pharmacy",
        "statistics",
        user._id,
      );
    }

    return {
      totalServices,
      completedServices,
      cancelledServices,
      byServiceType: byServiceType.reduce((acc: any, item: any) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
    };
  }
}

// Register the service
ServiceRegistry.register("pharmacy", new PharmacyServiceHandler());
