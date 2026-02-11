// lib/services/endoscopy.service.ts
import { NextRequest } from "next/server";
import { BaseService, ServiceError, ServiceRegistry } from "./base.service";
import { ServiceActivityTracker } from "@/lib/middleware/activity-logger";
import {
  IEndoscopyService,
  EndoscopyService,
} from "@/lib/models/EndoscopyService";
import { IUser } from "@/lib/models/User";

export class EndoscopyServiceHandler extends BaseService {
  async createEndoscopyProcedure(
    token: string,
    data: Partial<IEndoscopyService>,
  ): Promise<IEndoscopyService> {
    const { user } = await this.validateAndAuthorize(
      token,
      "patients",
      "create",
    );

    await this.checkServiceAccess(user, "endoscopy", "create");

    // Validate required fields
    if (!data.patient || !data.procedureType) {
      throw new ServiceError("Patient and procedure type are required", 400);
    }

    // Log service access
    if (this.request) {
      await ServiceActivityTracker.trackServiceAccess(
        this.request,
        "endoscopy",
        "create",
        user._id,
      );
    }

    const endoscopyProcedure = await EndoscopyService.create({
      ...data,
      status: "scheduled",
      scheduledDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await this.auditLog(
      "create",
      "endoscopy_procedure",
      endoscopyProcedure._id.toString(),
      user._id,
      user.role,
      { data },
    );

    return endoscopyProcedure;
  }

  async getEndoscopyProcedure(
    token: string,
    procedureId: string,
  ): Promise<IEndoscopyService> {
    const { user } = await this.authenticate(token);

    // Log service access
    if (this.request) {
      await ServiceActivityTracker.trackServiceAccess(
        this.request,
        "endoscopy",
        "read",
        user._id,
        procedureId,
      );
    }

    const procedure = await EndoscopyService.findById(procedureId)
      .populate("patient", "name age gender")
      .populate("performingDoctor", "name designation")
      .populate("nurse", "name")
      .populate("department", "name");

    if (!procedure) {
      // Log not found error
      if (this.request) {
        await ServiceActivityTracker.trackServiceError(
          this.request,
          "endoscopy",
          "read",
          user._id,
          new Error("Endoscopy procedure not found"),
          procedureId,
        );
      }

      throw new ServiceError("Endoscopy procedure not found", 404);
    }

    // Check access permissions
    if (
      user.role !== "admin" &&
      procedure.performingDoctor?.toString() !== user._id
    ) {
      await this.authorize(user, "patients", "read");
    }

    return procedure;
  }

  async updateEndoscopyProcedure(
    token: string,
    procedureId: string,
    updates: Partial<IEndoscopyService>,
  ): Promise<IEndoscopyService> {
    const { user } = await this.validateAndAuthorize(
      token,
      "patients",
      "update",
    );

    const procedure = await EndoscopyService.findById(procedureId);
    if (!procedure) {
      throw new ServiceError("Endoscopy procedure not found", 404);
    }

    // Check if user is authorized to update this procedure
    if (
      user.role !== "admin" &&
      procedure.performingDoctor?.toString() !== user._id
    ) {
      // Log unauthorized update attempt
      if (this.request) {
        await ServiceActivityTracker.trackServiceError(
          this.request,
          "endoscopy",
          "update",
          user._id,
          new Error("Not authorized to update this procedure"),
          procedureId,
        );
      }

      throw new ServiceError("Not authorized to update this procedure", 403);
    }

    const previousState = { ...procedure.toObject() };

    Object.assign(procedure, updates);
    procedure.updatedAt = new Date();
    await procedure.save();

    // Log successful update
    if (this.request) {
      await ServiceActivityTracker.trackDataChange(
        this.request,
        "endoscopy",
        "update",
        user._id,
        procedureId,
        updates,
        previousState,
      );
    }

    await this.auditLog(
      "update",
      "endoscopy_procedure",
      procedure._id.toString(),
      user._id,
      user.role,
      {
        previousState,
        newState: procedure.toObject(),
        changes: updates,
      },
    );

    return procedure;
  }

  async listEndoscopyProcedures(
    token: string,
    filters: any = {},
    options: {
      page?: number;
      limit?: number;
      sort?: any;
    } = {},
  ): Promise<{
    procedures: IEndoscopyService[];
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
        "endoscopy",
        "list",
        user._id,
      );
    }

    // Build query based on user role
    let query: any = {};

    if (user.role === "doctor" || user.role === "nurse") {
      query = {
        $or: [{ performingDoctor: user._id }, { nurse: user._id }],
      };
    } else if (user.role === "receptionist" || user.role === "staff") {
      query = { status: { $in: ["scheduled", "in_progress"] } };
    }

    // Apply additional filters
    query = { ...query, ...filters };

    const total = await EndoscopyService.countDocuments(query);
    const procedures = await EndoscopyService.find(query)
      .populate("patient", "name age gender")
      .populate("performingDoctor", "name designation")
      .populate("nurse", "name")
      .skip((page - 1) * limit)
      .limit(limit)
      .sort(sort);

    return {
      procedures,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async deleteEndoscopyProcedure(
    token: string,
    procedureId: string,
  ): Promise<void> {
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
          "endoscopy",
          "delete",
          user._id,
          new Error("Only administrators can delete procedures"),
          procedureId,
        );
      }

      throw new ServiceError("Only administrators can delete procedures", 403);
    }

    const procedure = await EndoscopyService.findById(procedureId);
    if (!procedure) {
      throw new ServiceError("Procedure not found", 404);
    }

    // Log deletion
    if (this.request) {
      await ServiceActivityTracker.trackDataChange(
        this.request,
        "endoscopy",
        "delete",
        user._id,
        procedureId,
        { status: "cancelled" },
        procedure.toObject(),
      );
    }

    // Soft delete
    procedure.status = "cancelled";
    procedure.updatedAt = new Date();
    await procedure.save();

    await this.auditLog(
      "delete",
      "endoscopy_procedure",
      procedureId,
      user._id,
      user.role,
      { procedure: procedure.toObject() },
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
      totalProcedures,
      completedProcedures,
      cancelledProcedures,
      byProcedureType,
    ] = await Promise.all([
      EndoscopyService.countDocuments(query),
      EndoscopyService.countDocuments({ ...query, status: "completed" }),
      EndoscopyService.countDocuments({ ...query, status: "cancelled" }),
      EndoscopyService.aggregate([
        { $match: query },
        { $group: { _id: "$procedureType", count: { $sum: 1 } } },
      ]),
    ]);

    // Log statistics access
    if (this.request) {
      await ServiceActivityTracker.trackServiceAccess(
        this.request,
        "endoscopy",
        "statistics",
        user._id,
      );
    }

    return {
      totalProcedures,
      completedProcedures,
      cancelledProcedures,
      byProcedureType: byProcedureType.reduce((acc: any, item: any) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
    };
  }
}

// Register the service
ServiceRegistry.register("endoscopy", new EndoscopyServiceHandler());
