// lib/services/imaging.service.ts
import { NextRequest } from "next/server";
import { BaseService, ServiceError, ServiceRegistry } from "./base.service";
import { ServiceActivityTracker } from "@/lib/middleware/activity-logger";
import { IImagingService, ImagingService } from "@/lib/models/DentalService";
import { IUser } from "@/lib/models/User";

export class ImagingServiceHandler extends BaseService {
  async createImagingRecord(
    token: string,
    data: Partial<IImagingService>,
  ): Promise<IImagingService> {
    const { user } = await this.validateAndAuthorize(
      token,
      "patients",
      "create",
    );

    await this.checkServiceAccess(user, "xray", "create");

    // Validate required fields
    if (!data.patient || !data.imagingType) {
      throw new ServiceError("Patient and imagingType are required", 400);
    }

    // Log service access
    if (this.request) {
      await ServiceActivityTracker.trackServiceAccess(
        this.request,
        "imaging",
        "create",
        user._id,
      );
    }

    const imagingRecord = await ImagingService.create({
      ...data,
      status: "scheduled",
      scheduledDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await this.auditLog(
      "create",
      "imaging_record",
      imagingRecord._id.toString(),
      user._id,
      user.role,
      { data },
    );

    return imagingRecord;
  }

  async getImagingRecord(
    token: string,
    recordId: string,
  ): Promise<IImagingService> {
    const { user } = await this.authenticate(token);

    // Log service access
    if (this.request) {
      await ServiceActivityTracker.trackServiceAccess(
        this.request,
        "imaging",
        "read",
        user._id,
        recordId,
      );
    }

    const record = await ImagingService.findById(recordId)
      .populate("patient", "name age gender")
      .populate("radiologist", "name designation")
      .populate("technician", "name")
      .populate("department", "name");

    if (!record) {
      // Log not found error
      if (this.request) {
        await ServiceActivityTracker.trackServiceError(
          this.request,
          "imaging",
          "read",
          user._id,
          new Error("Imaging record not found"),
          recordId,
        );
      }

      throw new ServiceError("Imaging record not found", 404);
    }

    // Check access permissions
    if (user.role !== "admin" && record.radiologist?.toString() !== user._id) {
      await this.authorize(user, "patients", "read");
    }

    return record;
  }

  async updateImagingRecord(
    token: string,
    recordId: string,
    updates: Partial<IImagingService>,
  ): Promise<IImagingService> {
    const { user } = await this.validateAndAuthorize(
      token,
      "patients",
      "update",
    );

    const record = await ImagingService.findById(recordId);
    if (!record) {
      throw new ServiceError("Imaging record not found", 404);
    }

    // Check if user is authorized to update this record
    if (user.role !== "admin" && record.radiologist?.toString() !== user._id) {
      // Log unauthorized update attempt
      if (this.request) {
        await ServiceActivityTracker.trackServiceError(
          this.request,
          "imaging",
          "update",
          user._id,
          new Error("Not authorized to update this record"),
          recordId,
        );
      }

      throw new ServiceError("Not authorized to update this record", 403);
    }

    const previousState = { ...record.toObject() };

    Object.assign(record, updates);
    record.updatedAt = new Date();
    await record.save();

    // Log successful update
    if (this.request) {
      await ServiceActivityTracker.trackDataChange(
        this.request,
        "imaging",
        "update",
        user._id,
        recordId,
        updates,
        previousState,
      );
    }

    await this.auditLog(
      "update",
      "imaging_record",
      record._id.toString(),
      user._id,
      user.role,
      {
        previousState,
        newState: record.toObject(),
        changes: updates,
      },
    );

    return record;
  }

  async listImagingRecords(
    token: string,
    filters: any = {},
    options: {
      page?: number;
      limit?: number;
      sort?: any;
    } = {},
  ): Promise<{
    records: IImagingService[];
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
        "imaging",
        "list",
        user._id,
      );
    }

    // Build query based on user role
    let query: any = {};

    if (user.role === "doctor" || user.role === "nurse") {
      query = {
        $or: [{ radiologist: user._id }, { technician: user._id }],
      };
    } else if (user.role === "receptionist" || user.role === "staff") {
      query = { status: { $in: ["scheduled", "in_progress"] } };
    }

    // Apply additional filters
    query = { ...query, ...filters };

    const total = await ImagingService.countDocuments(query);
    const records = await ImagingService.find(query)
      .populate("patient", "name age gender")
      .populate("radiologist", "name designation")
      .populate("technician", "name")
      .skip((page - 1) * limit)
      .limit(limit)
      .sort(sort);

    return {
      records,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async deleteImagingRecord(token: string, recordId: string): Promise<void> {
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
          "imaging",
          "delete",
          user._id,
          new Error("Only administrators can delete records"),
          recordId,
        );
      }

      throw new ServiceError("Only administrators can delete records", 403);
    }

    const record = await ImagingService.findById(recordId);
    if (!record) {
      throw new ServiceError("Record not found", 404);
    }

    // Log deletion
    if (this.request) {
      await ServiceActivityTracker.trackDataChange(
        this.request,
        "imaging",
        "delete",
        user._id,
        recordId,
        { status: "cancelled" },
        record.toObject(),
      );
    }

    // Soft delete
    record.status = "cancelled";
    record.updatedAt = new Date();
    await record.save();

    await this.auditLog(
      "delete",
      "imaging_record",
      recordId,
      user._id,
      user.role,
      { record: record.toObject() },
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

    const [totalRecords, completedRecords, cancelledRecords, byModality] =
      await Promise.all([
        ImagingService.countDocuments(query),
        ImagingService.countDocuments({ ...query, status: "completed" }),
        ImagingService.countDocuments({ ...query, status: "cancelled" }),
        ImagingService.aggregate([
          { $match: query },
          { $group: { _id: "$imagingType", count: { $sum: 1 } } },
        ]),
      ]);

    // Log statistics access
    if (this.request) {
      await ServiceActivityTracker.trackServiceAccess(
        this.request,
        "imaging",
        "statistics",
        user._id,
      );
    }

    return {
      totalRecords,
      completedRecords,
      cancelledRecords,
      byModality: byModality.reduce((acc: any, item: any) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
    };
  }
}

// Register the service
ServiceRegistry.register("imaging", new ImagingServiceHandler());
