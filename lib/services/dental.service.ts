// lib/services/dental.service.ts
import { NextRequest } from "next/server";
import { BaseService, ServiceError, ServiceRegistry } from "./base.service";
import { ServiceActivityTracker } from "@/lib/middleware/activity-logger";
import { IDentalService, DentalService } from "@/lib/models/DentalService";
import { IUser } from "@/lib/models/User";

export class DentalServiceHandler extends BaseService {
  async createDentalRecord(
    token: string,
    data: Partial<IDentalService>
  ): Promise<IDentalService> {
    const { user } = await this.validateAndAuthorize(token, "patients", "create");
    
    await this.checkServiceAccess(user, "dental", "create");

    // Validate required fields
    if (!data.patient || !data.department) {
      throw new ServiceError("Patient and department are required", 400);
    }

    // Log service access
    if (this.request) {
      await ServiceActivityTracker.trackServiceAccess(
        this.request,
        "dental",
        "create",
        user._id
      );
    }

    // Generate dental ID
    const dentalId = `DNT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const dentalRecord = await DentalService.create({
      ...data,
      dentalId,
      dentist: user._id,
      status: "scheduled",
      billingStatus: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await this.auditLog(
      "create",
      "dental_record",
      dentalRecord._id.toString(),
      user._id,
      user.role,
      { data }
    );

    return dentalRecord;
  }

  async getDentalRecord(
    token: string,
    recordId: string
  ): Promise<IDentalService> {
    const { user } = await this.authenticate(token);

    // Log service access
    if (this.request) {
      await ServiceActivityTracker.trackServiceAccess(
        this.request,
        "dental",
        "read",
        user._id,
        recordId
      );
    }

    const record = await DentalService.findById(recordId)
      .populate("patient", "name age gender")
      .populate("dentist", "name designation department")
      .populate("dentalAssistant", "name")
      .populate("department", "name");

    if (!record) {
      // Log not found error
      if (this.request) {
        await ServiceActivityTracker.trackServiceError(
          this.request,
          "dental",
          "read",
          user._id,
          new Error("Dental record not found"),
          recordId
        );
      }
      
      throw new ServiceError("Dental record not found", 404);
    }

    // Check access permissions
    if (user.role !== "admin" && record.dentist.toString() !== user._id) {
      await this.authorize(user, "patients", "read");
    }

    return record;
  }

  async updateDentalRecord(
    token: string,
    recordId: string,
    updates: Partial<IDentalService>
  ): Promise<IDentalService> {
    const { user } = await this.validateAndAuthorize(token, "patients", "update");

    const record = await DentalService.findById(recordId);
    if (!record) {
      throw new ServiceError("Dental record not found", 404);
    }

    // Check if user is authorized to update this record
    if (user.role !== "admin" && record.dentist.toString() !== user._id) {
      // Log unauthorized update attempt
      if (this.request) {
        await ServiceActivityTracker.trackServiceError(
          this.request,
          "dental",
          "update",
          user._id,
          new Error("Not authorized to update this record"),
          recordId
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
        "dental",
        "update",
        user._id,
        recordId,
        updates,
        previousState
      );
    }

    await this.auditLog(
      "update",
      "dental_record",
      record._id.toString(),
      user._id,
      user.role,
      {
        previousState,
        newState: record.toObject(),
        changes: updates,
      }
    );

    return record;
  }

  async listDentalRecords(
    token: string,
    filters: any = {},
    options: {
      page?: number;
      limit?: number;
      sort?: any;
    } = {}
  ): Promise<{
    records: IDentalService[];
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
        "dental",
        "list",
        user._id
      );
    }

    // Build query based on user role
    let query: any = {};

    if (user.role === "doctor" || user.role === "nurse") {
      query = {
        $or: [
          { dentist: user._id },
          { dentalAssistant: user._id },
        ],
      };
    } else if (user.role === "receptionist" || user.role === "staff") {
      query = { status: { $in: ["scheduled", "in_progress"] } };
    }

    // Apply additional filters
    query = { ...query, ...filters };

    const total = await DentalService.countDocuments(query);
    const records = await DentalService.find(query)
      .populate("patient", "name age gender")
      .populate("dentist", "name designation")
      .populate("dentalAssistant", "name")
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

  async deleteDentalRecord(
    token: string,
    recordId: string
  ): Promise<void> {
    const { user } = await this.validateAndAuthorize(token, "patients", "delete");

    if (user.role !== "admin") {
      // Log unauthorized delete attempt
      if (this.request) {
        await ServiceActivityTracker.trackServiceError(
          this.request,
          "dental",
          "delete",
          user._id,
          new Error("Only administrators can delete records"),
          recordId
        );
      }
      
      throw new ServiceError("Only administrators can delete records", 403);
    }

    const record = await DentalService.findById(recordId);
    if (!record) {
      throw new ServiceError("Record not found", 404);
    }

    // Log deletion
    if (this.request) {
      await ServiceActivityTracker.trackDataChange(
        this.request,
        "dental",
        "delete",
        user._id,
        recordId,
        { status: "cancelled" },
        record.toObject()
      );
    }

    // Soft delete
    record.status = "cancelled";
    record.updatedAt = new Date();
    await record.save();

    await this.auditLog(
      "delete",
      "dental_record",
      recordId,
      user._id,
      user.role,
      { record: record.toObject() }
    );
  }

  async updateTreatmentStatus(
    token: string,
    recordId: string,
    toothNumber: number,
    procedure: string,
    status: "planned" | "in_progress" | "completed" | "cancelled"
  ): Promise<IDentalService> {
    const { user } = await this.validateAndAuthorize(token, "patients", "update");

    const record = await DentalService.findById(recordId);
    if (!record) {
      throw new ServiceError("Dental record not found", 404);
    }

    // Check if user is authorized
    if (user.role !== "admin" && record.dentist.toString() !== user._id) {
      throw new ServiceError("Not authorized to update treatment", 403);
    }

    // Log treatment update
    if (this.request) {
      await ServiceActivityTracker.trackDataChange(
        this.request,
        "dental",
        "update_treatment",
        user._id,
        recordId, 
        { toothNumber, procedure, status }
      );
    }

    // Update treatment plan
    const treatmentPlan = record.treatmentPlan.map((treatment: IDentalService['treatmentPlan'][0]) => {
      if (treatment.toothNumber === toothNumber && treatment.procedure === procedure) {
        return {
          ...treatment,
          status,
          date: status === "completed" ? new Date() : treatment.date,
        };
      }
      return treatment;
    });

    record.treatmentPlan = treatmentPlan;
    record.updatedAt = new Date();
    await record.save();

    return record;
  }

  // Statistics and reports
  async getStatistics(
    token: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<any> {
    const { user } = await this.authenticate(token);
    
    if (user.role !== "admin") {
      throw new ServiceError("Only administrators can view statistics", 403);
    }

    const query: any = {};
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = startDate;
      if (endDate) query.createdAt.$lte = endDate;
    }

    const [
      totalRecords,
      completedRecords,
      pendingRecords,
      totalRevenue,
    ] = await Promise.all([
      DentalService.countDocuments(query),
      DentalService.countDocuments({ ...query, status: "completed" }),
      DentalService.countDocuments({ ...query, status: "scheduled" }),
      DentalService.aggregate([
        { $match: query },
        { $unwind: "$treatmentPlan" },
        { $group: { _id: null, total: { $sum: "$treatmentPlan.fee" } } },
      ]),
    ]);

    // Log statistics access
    if (this.request) {
      await ServiceActivityTracker.trackServiceAccess(
        this.request,
        "dental",
        "statistics",
        user._id
      );
    }

    return {
      totalRecords,
      completedRecords,
      pendingRecords,
      totalRevenue: totalRevenue[0]?.total || 0,
      averageRevenue: totalRevenue[0]?.total / completedRecords || 0,
    };
  }
}

// Register the service
ServiceRegistry.register("dental", new DentalServiceHandler());
