// lib/services/emergency.service.ts
import { NextRequest } from "next/server";
import { BaseService, ServiceError, ServiceRegistry } from "./base.service";
import { ServiceActivityTracker } from "@/lib/middleware/activity-logger";
import {
  IEmergencyService,
  EmergencyService,
} from "@/lib/models/EmergencyService";
import { IUser } from "@/lib/models/User";

export class EmergencyServiceHandler extends BaseService {
  async createEmergencyCase(
    token: string,
    data: Partial<IEmergencyService>,
  ): Promise<IEmergencyService> {
    const { user } = await this.validateAndAuthorize(
      token,
      "patients",
      "create",
    );

    await this.checkServiceAccess(user, "emergency", "create");

    // Validate required fields
    if (!data.patient || !data.triageCategory) {
      throw new ServiceError("Patient and triage category are required", 400);
    }

    // Log service access
    if (this.request) {
      await ServiceActivityTracker.trackServiceAccess(
        this.request,
        "emergency",
        "create",
        user._id,
      );
    }

    const emergencyCase = await EmergencyService.create({
      ...data,
      status: "active",
      arrivalTime: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await this.auditLog(
      "create",
      "emergency_case",
      emergencyCase._id.toString(),
      user._id,
      user.role,
      { data },
    );

    return emergencyCase;
  }

  async getEmergencyCase(
    token: string,
    caseId: string,
  ): Promise<IEmergencyService> {
    const { user } = await this.authenticate(token);

    // Log service access
    if (this.request) {
      await ServiceActivityTracker.trackServiceAccess(
        this.request,
        "emergency",
        "read",
        user._id,
        caseId,
      );
    }

    const emergencyCase = await EmergencyService.findById(caseId)
      .populate("patient", "name age gender")
      .populate("treatingDoctor", "name designation")
      .populate("nurse", "name")
      .populate("department", "name");

    if (!emergencyCase) {
      // Log not found error
      if (this.request) {
        await ServiceActivityTracker.trackServiceError(
          this.request,
          "emergency",
          "read",
          user._id,
          new Error("Emergency case not found"),
          caseId,
        );
      }

      throw new ServiceError("Emergency case not found", 404);
    }

    // Check access permissions
    if (
      user.role !== "admin" &&
      emergencyCase.treatingDoctor?.toString() !== user._id
    ) {
      await this.authorize(user, "patients", "read");
    }

    return emergencyCase;
  }

  async updateEmergencyCase(
    token: string,
    caseId: string,
    updates: Partial<IEmergencyService>,
  ): Promise<IEmergencyService> {
    const { user } = await this.validateAndAuthorize(
      token,
      "patients",
      "update",
    );

    const emergencyCase = await EmergencyService.findById(caseId);
    if (!emergencyCase) {
      throw new ServiceError("Emergency case not found", 404);
    }

    // Check if user is authorized to update this case
    if (
      user.role !== "admin" &&
      emergencyCase.treatingDoctor?.toString() !== user._id
    ) {
      // Log unauthorized update attempt
      if (this.request) {
        await ServiceActivityTracker.trackServiceError(
          this.request,
          "emergency",
          "update",
          user._id,
          new Error("Not authorized to update this case"),
          caseId,
        );
      }

      throw new ServiceError("Not authorized to update this case", 403);
    }

    const previousState = { ...emergencyCase.toObject() };

    Object.assign(emergencyCase, updates);
    emergencyCase.updatedAt = new Date();
    await emergencyCase.save();

    // Log successful update
    if (this.request) {
      await ServiceActivityTracker.trackDataChange(
        this.request,
        "emergency",
        "update",
        user._id,
        caseId,
        updates,
        previousState,
      );
    }

    await this.auditLog(
      "update",
      "emergency_case",
      emergencyCase._id.toString(),
      user._id,
      user.role,
      {
        previousState,
        newState: emergencyCase.toObject(),
        changes: updates,
      },
    );

    return emergencyCase;
  }

  async updateDisposition(
    token: string,
    caseId: string,
    disposition: {
      status: "admitted" | "discharged" | "transferred" | "deceased";
      destination?: string;
      notes?: string;
    },
  ): Promise<IEmergencyService> {
    const { user } = await this.validateAndAuthorize(
      token,
      "patients",
      "update",
    );

    const emergencyCase = await EmergencyService.findById(caseId);
    if (!emergencyCase) {
      throw new ServiceError("Emergency case not found", 404);
    }

    // Check if user is authorized
    if (
      user.role !== "admin" &&
      emergencyCase.treatingDoctor?.toString() !== user._id
    ) {
      throw new ServiceError("Not authorized to update disposition", 403);
    }

    const previousState = { ...emergencyCase.toObject() };

    emergencyCase.disposition = disposition;
    emergencyCase.status = disposition.status;
    emergencyCase.dischargeTime = new Date();
    emergencyCase.updatedAt = new Date();
    await emergencyCase.save();

    // Log disposition update
    if (this.request) {
      await ServiceActivityTracker.trackDataChange(
        this.request,
        "emergency",
        "update_disposition",
        user._id,
        caseId,
        { disposition },
        previousState,
      );
    }

    await this.auditLog(
      "update_disposition",
      "emergency_case",
      caseId,
      user._id,
      user.role,
      {
        previousState,
        newState: emergencyCase.toObject(),
        changes: { disposition },
      },
    );

    return emergencyCase;
  }

  async listEmergencyCases(
    token: string,
    filters: any = {},
    options: {
      page?: number;
      limit?: number;
      sort?: any;
    } = {},
  ): Promise<{
    cases: IEmergencyService[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const { user } = await this.authenticate(token);
    const { page = 1, limit = 20, sort = { arrivalTime: -1 } } = options;

    // Log list access
    if (this.request) {
      await ServiceActivityTracker.trackServiceAccess(
        this.request,
        "emergency",
        "list",
        user._id,
      );
    }

    // Build query based on user role
    let query: any = {};

    if (user.role === "doctor" || user.role === "nurse") {
      query = {
        $or: [{ treatingDoctor: user._id }, { nurse: user._id }],
      };
    } else if (user.role === "receptionist" || user.role === "staff") {
      query = { status: "active" };
    }

    // Apply additional filters
    query = { ...query, ...filters };

    const total = await EmergencyService.countDocuments(query);
    const cases = await EmergencyService.find(query)
      .populate("patient", "name age gender")
      .populate("treatingDoctor", "name designation")
      .populate("nurse", "name")
      .skip((page - 1) * limit)
      .limit(limit)
      .sort(sort);

    return {
      cases,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async deleteEmergencyCase(token: string, caseId: string): Promise<void> {
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
          "emergency",
          "delete",
          user._id,
          new Error("Only administrators can delete cases"),
          caseId,
        );
      }

      throw new ServiceError("Only administrators can delete cases", 403);
    }

    const emergencyCase = await EmergencyService.findById(caseId);
    if (!emergencyCase) {
      throw new ServiceError("Case not found", 404);
    }

    // Log deletion
    if (this.request) {
      await ServiceActivityTracker.trackDataChange(
        this.request,
        "emergency",
        "delete",
        user._id,
        caseId,
        { status: "deleted" },
        emergencyCase.toObject(),
      );
    }

    // Soft delete
    emergencyCase.status = "deleted";
    emergencyCase.updatedAt = new Date();
    await emergencyCase.save();

    await this.auditLog(
      "delete",
      "emergency_case",
      caseId,
      user._id,
      user.role,
      { case: emergencyCase.toObject() },
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
      query.arrivalTime = {};
      if (startDate) query.arrivalTime.$gte = startDate;
      if (endDate) query.arrivalTime.$lte = endDate;
    }

    const [totalCases, activeCases, admittedCases, dischargedCases, byTriage] =
      await Promise.all([
        EmergencyService.countDocuments(query),
        EmergencyService.countDocuments({ ...query, status: "active" }),
        EmergencyService.countDocuments({
          ...query,
          disposition: { status: "admitted" },
        }),
        EmergencyService.countDocuments({
          ...query,
          disposition: { status: "discharged" },
        }),
        EmergencyService.aggregate([
          { $match: query },
          { $group: { _id: "$triageCategory", count: { $sum: 1 } } },
        ]),
      ]);

    // Log statistics access
    if (this.request) {
      await ServiceActivityTracker.trackServiceAccess(
        this.request,
        "emergency",
        "statistics",
        user._id,
      );
    }

    return {
      totalCases,
      activeCases,
      admittedCases,
      dischargedCases,
      byTriage: byTriage.reduce((acc: any, item: any) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
    };
  }
}

// Register the service
ServiceRegistry.register("emergency", new EmergencyServiceHandler());
