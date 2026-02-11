// lib/services/opd.service.ts
import { NextRequest } from "next/server";
import { BaseService, ServiceError, ServiceRegistry } from "./base.service";
import { ServiceActivityTracker } from "@/lib/middleware/activity-logger";
import { IOpdService, OpdService } from "@/lib/models/DentalService";
import { IUser } from "@/lib/models/User";

export class OpdServiceHandler extends BaseService {
  async createOpdVisit(
    token: string,
    data: Partial<IOpdService>,
  ): Promise<IOpdService> {
    const { user } = await this.validateAndAuthorize(
      token,
      "patients",
      "create",
    );

    await this.checkServiceAccess(user, "opd", "create");

    // Validate required fields
    if (!data.patient || !data.visitType) {
      throw new ServiceError("Patient and visit type are required", 400);
    }

    // Log service access
    if (this.request) {
      await ServiceActivityTracker.trackServiceAccess(
        this.request,
        "opd",
        "create",
        user._id,
      );
    }

    const opdVisit = await OpdService.create({
      ...data,
      status: "active",
      visitDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await this.auditLog(
      "create",
      "opd_visit",
      opdVisit._id.toString(),
      user._id,
      user.role,
      { data },
    );

    return opdVisit;
  }

  async getOpdVisit(token: string, visitId: string): Promise<IOpdService> {
    const { user } = await this.authenticate(token);

    // Log service access
    if (this.request) {
      await ServiceActivityTracker.trackServiceAccess(
        this.request,
        "opd",
        "read",
        user._id,
        visitId,
      );
    }

    const visit = await OpdService.findById(visitId)
      .populate("patient", "name age gender")
      .populate("doctor", "name designation")
      .populate("nurse", "name")
      .populate("department", "name");

    if (!visit) {
      // Log not found error
      if (this.request) {
        await ServiceActivityTracker.trackServiceError(
          this.request,
          "opd",
          "read",
          user._id,
          new Error("OPD visit not found"),
          visitId,
        );
      }

      throw new ServiceError("OPD visit not found", 404);
    }

    // Check access permissions
    if (user.role !== "admin" && visit.doctor?.toString() !== user._id) {
      await this.authorize(user, "patients", "read");
    }

    return visit;
  }

  async updateOpdVisit(
    token: string,
    visitId: string,
    updates: Partial<IOpdService>,
  ): Promise<IOpdService> {
    const { user } = await this.validateAndAuthorize(
      token,
      "patients",
      "update",
    );

    const visit = await OpdService.findById(visitId);
    if (!visit) {
      throw new ServiceError("OPD visit not found", 404);
    }

    // Check if user is authorized to update this visit
    if (user.role !== "admin" && visit.doctor?.toString() !== user._id) {
      // Log unauthorized update attempt
      if (this.request) {
        await ServiceActivityTracker.trackServiceError(
          this.request,
          "opd",
          "update",
          user._id,
          new Error("Not authorized to update this visit"),
          visitId,
        );
      }

      throw new ServiceError("Not authorized to update this visit", 403);
    }

    const previousState = { ...visit.toObject() };

    Object.assign(visit, updates);
    visit.updatedAt = new Date();
    await visit.save();

    // Log successful update
    if (this.request) {
      await ServiceActivityTracker.trackDataChange(
        this.request,
        "opd",
        "update",
        user._id,
        visitId,
        updates,
        previousState,
      );
    }

    await this.auditLog(
      "update",
      "opd_visit",
      visit._id.toString(),
      user._id,
      user.role,
      {
        previousState,
        newState: visit.toObject(),
        changes: updates,
      },
    );

    return visit;
  }

  async listOpdVisits(
    token: string,
    filters: any = {},
    options: {
      page?: number;
      limit?: number;
      sort?: any;
    } = {},
  ): Promise<{
    visits: IOpdService[];
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
        "opd",
        "list",
        user._id,
      );
    }

    // Build query based on user role
    let query: any = {};

    if (user.role === "doctor" || user.role === "nurse") {
      query = {
        $or: [{ doctor: user._id }, { nurse: user._id }],
      };
    } else if (user.role === "receptionist" || user.role === "staff") {
      query = { status: "active" };
    }

    // Apply additional filters
    query = { ...query, ...filters };

    const total = await OpdService.countDocuments(query);
    const visits = await OpdService.find(query)
      .populate("patient", "name age gender")
      .populate("doctor", "name designation")
      .populate("nurse", "name")
      .skip((page - 1) * limit)
      .limit(limit)
      .sort(sort);

    return {
      visits,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async deleteOpdVisit(token: string, visitId: string): Promise<void> {
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
          "opd",
          "delete",
          user._id,
          new Error("Only administrators can delete visits"),
          visitId,
        );
      }

      throw new ServiceError("Only administrators can delete visits", 403);
    }

    const visit = await OpdService.findById(visitId);
    if (!visit) {
      throw new ServiceError("Visit not found", 404);
    }

    // Log deletion
    if (this.request) {
      await ServiceActivityTracker.trackDataChange(
        this.request,
        "opd",
        "delete",
        user._id,
        visitId,
        { status: "cancelled" },
        visit.toObject(),
      );
    }

    // Soft delete
    visit.status = "cancelled";
    visit.updatedAt = new Date();
    await visit.save();

    await this.auditLog("delete", "opd_visit", visitId, user._id, user.role, {
      visit: visit.toObject(),
    });
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
      query.visitDate = {};
      if (startDate) query.visitDate.$gte = startDate;
      if (endDate) query.visitDate.$lte = endDate;
    }

    const [totalVisits, completedVisits, cancelledVisits, byVisitType] =
      await Promise.all([
        OpdService.countDocuments(query),
        OpdService.countDocuments({ ...query, status: "completed" }),
        OpdService.countDocuments({ ...query, status: "cancelled" }),
        OpdService.aggregate([
          { $match: query },
          { $group: { _id: "$visitType", count: { $sum: 1 } } },
        ]),
      ]);

    // Log statistics access
    if (this.request) {
      await ServiceActivityTracker.trackServiceAccess(
        this.request,
        "opd",
        "statistics",
        user._id,
      );
    }

    return {
      totalVisits,
      completedVisits,
      cancelledVisits,
      byVisitType: byVisitType.reduce((acc: any, item: any) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
    };
  }
}

// Register the service
ServiceRegistry.register("opd", new OpdServiceHandler());
