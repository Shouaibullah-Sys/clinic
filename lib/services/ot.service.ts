// lib/services/ot.service.ts
import { NextRequest } from "next/server";
import { BaseService, ServiceError, ServiceRegistry } from "./base.service";
import { ServiceActivityTracker } from "@/lib/middleware/activity-logger";
import { IOTService, OTService } from "@/lib/models/DentalService";
import { IUser } from "@/lib/models/User";

export class OTServiceHandler extends BaseService {
  async createOTSurgery(
    token: string,
    data: Partial<IOTService>,
  ): Promise<IOTService> {
    const { user } = await this.validateAndAuthorize(
      token,
      "patients",
      "create",
    );

    await this.checkServiceAccess(user, "ot", "create");

    // Validate required fields
    if (!data.patient || !data.surgeryType) {
      throw new ServiceError("Patient and surgery type are required", 400);
    }

    // Log service access
    if (this.request) {
      await ServiceActivityTracker.trackServiceAccess(
        this.request,
        "ot",
        "create",
        user._id,
      );
    }

    const otSurgery = await OTService.create({
      ...data,
      status: "scheduled",
      scheduledDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await this.auditLog(
      "create",
      "ot_surgery",
      otSurgery._id.toString(),
      user._id,
      user.role,
      { data },
    );

    return otSurgery;
  }

  async getOTSurgery(token: string, surgeryId: string): Promise<IOTService> {
    const { user } = await this.authenticate(token);

    // Log service access
    if (this.request) {
      await ServiceActivityTracker.trackServiceAccess(
        this.request,
        "ot",
        "read",
        user._id,
        surgeryId,
      );
    }

    const surgery = await OTService.findById(surgeryId)
      .populate("patient", "name age gender")
      .populate("surgeon", "name designation")
      .populate("anesthetist", "name")
      .populate("nurse", "name")
      .populate("department", "name");

    if (!surgery) {
      // Log not found error
      if (this.request) {
        await ServiceActivityTracker.trackServiceError(
          this.request,
          "ot",
          "read",
          user._id,
          new Error("OT surgery not found"),
          surgeryId,
        );
      }

      throw new ServiceError("OT surgery not found", 404);
    }

    // Check access permissions
    if (user.role !== "admin" && surgery.surgeon?.toString() !== user._id) {
      await this.authorize(user, "patients", "read");
    }

    return surgery;
  }

  async updateOTSurgery(
    token: string,
    surgeryId: string,
    updates: Partial<IOTService>,
  ): Promise<IOTService> {
    const { user } = await this.validateAndAuthorize(
      token,
      "patients",
      "update",
    );

    const surgery = await OTService.findById(surgeryId);
    if (!surgery) {
      throw new ServiceError("OT surgery not found", 404);
    }

    // Check if user is authorized to update this surgery
    if (user.role !== "admin" && surgery.surgeon?.toString() !== user._id) {
      // Log unauthorized update attempt
      if (this.request) {
        await ServiceActivityTracker.trackServiceError(
          this.request,
          "ot",
          "update",
          user._id,
          new Error("Not authorized to update this surgery"),
          surgeryId,
        );
      }

      throw new ServiceError("Not authorized to update this surgery", 403);
    }

    const previousState = { ...surgery.toObject() };

    Object.assign(surgery, updates);
    surgery.updatedAt = new Date();
    await surgery.save();

    // Log successful update
    if (this.request) {
      await ServiceActivityTracker.trackDataChange(
        this.request,
        "ot",
        "update",
        user._id,
        surgeryId,
        updates,
        previousState,
      );
    }

    await this.auditLog(
      "update",
      "ot_surgery",
      surgery._id.toString(),
      user._id,
      user.role,
      {
        previousState,
        newState: surgery.toObject(),
        changes: updates,
      },
    );

    return surgery;
  }

  async listOTSurgeries(
    token: string,
    filters: any = {},
    options: {
      page?: number;
      limit?: number;
      sort?: any;
    } = {},
  ): Promise<{
    surgeries: IOTService[];
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
        "ot",
        "list",
        user._id,
      );
    }

    // Build query based on user role
    let query: any = {};

    if (user.role === "doctor" || user.role === "nurse") {
      query = {
        $or: [
          { surgeon: user._id },
          { anesthetist: user._id },
          { nurse: user._id },
        ],
      };
    } else if (user.role === "receptionist" || user.role === "staff") {
      query = { status: { $in: ["scheduled", "in_progress"] } };
    }

    // Apply additional filters
    query = { ...query, ...filters };

    const total = await OTService.countDocuments(query);
    const surgeries = await OTService.find(query)
      .populate("patient", "name age gender")
      .populate("surgeon", "name designation")
      .populate("anesthetist", "name")
      .populate("nurse", "name")
      .skip((page - 1) * limit)
      .limit(limit)
      .sort(sort);

    return {
      surgeries,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async deleteOTSurgery(token: string, surgeryId: string): Promise<void> {
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
          "ot",
          "delete",
          user._id,
          new Error("Only administrators can delete surgeries"),
          surgeryId,
        );
      }

      throw new ServiceError("Only administrators can delete surgeries", 403);
    }

    const surgery = await OTService.findById(surgeryId);
    if (!surgery) {
      throw new ServiceError("Surgery not found", 404);
    }

    // Log deletion
    if (this.request) {
      await ServiceActivityTracker.trackDataChange(
        this.request,
        "ot",
        "delete",
        user._id,
        surgeryId,
        { status: "cancelled" },
        surgery.toObject(),
      );
    }

    // Soft delete
    surgery.status = "cancelled";
    surgery.updatedAt = new Date();
    await surgery.save();

    await this.auditLog(
      "delete",
      "ot_surgery",
      surgeryId,
      user._id,
      user.role,
      { surgery: surgery.toObject() },
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
      query.scheduledDate = {};
      if (startDate) query.scheduledDate.$gte = startDate;
      if (endDate) query.scheduledDate.$lte = endDate;
    }

    const [
      totalSurgeries,
      completedSurgeries,
      cancelledSurgeries,
      bySurgeryType,
    ] = await Promise.all([
      OTService.countDocuments(query),
      OTService.countDocuments({ ...query, status: "completed" }),
      OTService.countDocuments({ ...query, status: "cancelled" }),
      OTService.aggregate([
        { $match: query },
        { $group: { _id: "$surgeryType", count: { $sum: 1 } } },
      ]),
    ]);

    // Log statistics access
    if (this.request) {
      await ServiceActivityTracker.trackServiceAccess(
        this.request,
        "ot",
        "statistics",
        user._id,
      );
    }

    return {
      totalSurgeries,
      completedSurgeries,
      cancelledSurgeries,
      bySurgeryType: bySurgeryType.reduce((acc: any, item: any) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
    };
  }
}

// Register the service
ServiceRegistry.register("ot", new OTServiceHandler());
