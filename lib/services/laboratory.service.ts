// lib/services/laboratory.service.ts
import { NextRequest } from "next/server";
import { BaseService, ServiceError, ServiceRegistry } from "./base.service";
import { ServiceActivityTracker } from "@/lib/middleware/activity-logger";
import {
  ILaboratoryService,
  LaboratoryService,
} from "@/lib/models/DentalService";
import { IUser } from "@/lib/models/User";

export class LaboratoryServiceHandler extends BaseService {
  async createLaboratoryTest(
    token: string,
    data: Partial<ILaboratoryService>,
  ): Promise<ILaboratoryService> {
    const { user } = await this.validateAndAuthorize(
      token,
      "patients",
      "create",
    );

    await this.checkServiceAccess(user, "laboratory", "create");

    // Validate required fields
    if (!data.patient || !data.labType) {
      throw new ServiceError("Patient and test type are required", 400);
    }

    // Log service access
    if (this.request) {
      await ServiceActivityTracker.trackServiceAccess(
        this.request,
        "laboratory",
        "create",
        user._id,
      );
    }

    const laboratoryTest = await LaboratoryService.create({
      ...data,
      status: "pending",
      scheduledDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await this.auditLog(
      "create",
      "laboratory_test",
      laboratoryTest._id.toString(),
      user._id,
      user.role,
      { data },
    );

    return laboratoryTest;
  }

  async getLaboratoryTest(
    token: string,
    testId: string,
  ): Promise<ILaboratoryService> {
    const { user } = await this.authenticate(token);

    // Log service access
    if (this.request) {
      await ServiceActivityTracker.trackServiceAccess(
        this.request,
        "laboratory",
        "read",
        user._id,
        testId,
      );
    }

    const test = await LaboratoryService.findById(testId)
      .populate("patient", "name age gender")
      .populate("requestingDoctor", "name designation")
      .populate("technician", "name")
      .populate("department", "name");

    if (!test) {
      // Log not found error
      if (this.request) {
        await ServiceActivityTracker.trackServiceError(
          this.request,
          "laboratory",
          "read",
          user._id,
          new Error("Laboratory test not found"),
          testId,
        );
      }

      throw new ServiceError("Laboratory test not found", 404);
    }

    // Check access permissions
    if (
      user.role !== "admin" &&
      test.requestingDoctor?.toString() !== user._id
    ) {
      await this.authorize(user, "patients", "read");
    }

    return test;
  }

  async updateLaboratoryTest(
    token: string,
    testId: string,
    updates: Partial<ILaboratoryService>,
  ): Promise<ILaboratoryService> {
    const { user } = await this.validateAndAuthorize(
      token,
      "patients",
      "update",
    );

    const test = await LaboratoryService.findById(testId);
    if (!test) {
      throw new ServiceError("Laboratory test not found", 404);
    }

    // Check if user is authorized to update this test
    if (
      user.role !== "admin" &&
      test.requestingDoctor?.toString() !== user._id
    ) {
      // Log unauthorized update attempt
      if (this.request) {
        await ServiceActivityTracker.trackServiceError(
          this.request,
          "laboratory",
          "update",
          user._id,
          new Error("Not authorized to update this test"),
          testId,
        );
      }

      throw new ServiceError("Not authorized to update this test", 403);
    }

    const previousState = { ...test.toObject() };

    Object.assign(test, updates);
    test.updatedAt = new Date();
    await test.save();

    // Log successful update
    if (this.request) {
      await ServiceActivityTracker.trackDataChange(
        this.request,
        "laboratory",
        "update",
        user._id,
        testId,
        updates,
        previousState,
      );
    }

    await this.auditLog(
      "update",
      "laboratory_test",
      test._id.toString(),
      user._id,
      user.role,
      {
        previousState,
        newState: test.toObject(),
        changes: updates,
      },
    );

    return test;
  }

  async listLaboratoryTests(
    token: string,
    filters: any = {},
    options: {
      page?: number;
      limit?: number;
      sort?: any;
    } = {},
  ): Promise<{
    tests: ILaboratoryService[];
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
        "laboratory",
        "list",
        user._id,
      );
    }

    // Build query based on user role
    let query: any = {};

    if (user.role === "doctor" || user.role === "nurse") {
      query = {
        $or: [{ requestingDoctor: user._id }, { technician: user._id }],
      };
    } else if (user.role === "receptionist" || user.role === "staff") {
      query = { status: { $in: ["pending", "in_progress"] } };
    }

    // Apply additional filters
    query = { ...query, ...filters };

    const total = await LaboratoryService.countDocuments(query);
    const tests = await LaboratoryService.find(query)
      .populate("patient", "name age gender")
      .populate("requestingDoctor", "name designation")
      .populate("technician", "name")
      .skip((page - 1) * limit)
      .limit(limit)
      .sort(sort);

    return {
      tests,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async deleteLaboratoryTest(token: string, testId: string): Promise<void> {
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
          "laboratory",
          "delete",
          user._id,
          new Error("Only administrators can delete tests"),
          testId,
        );
      }

      throw new ServiceError("Only administrators can delete tests", 403);
    }

    const test = await LaboratoryService.findById(testId);
    if (!test) {
      throw new ServiceError("Test not found", 404);
    }

    // Log deletion
    if (this.request) {
      await ServiceActivityTracker.trackDataChange(
        this.request,
        "laboratory",
        "delete",
        user._id,
        testId,
        { status: "cancelled" },
        test.toObject(),
      );
    }

    // Soft delete
    test.status = "cancelled";
    test.updatedAt = new Date();
    await test.save();

    await this.auditLog(
      "delete",
      "laboratory_test",
      testId,
      user._id,
      user.role,
      { test: test.toObject() },
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

    const [totalTests, completedTests, cancelledTests, byTestType] =
      await Promise.all([
        LaboratoryService.countDocuments(query),
        LaboratoryService.countDocuments({ ...query, status: "completed" }),
        LaboratoryService.countDocuments({ ...query, status: "cancelled" }),
        LaboratoryService.aggregate([
          { $match: query },
          { $group: { _id: "$labType", count: { $sum: 1 } } },
        ]),
      ]);

    // Log statistics access
    if (this.request) {
      await ServiceActivityTracker.trackServiceAccess(
        this.request,
        "laboratory",
        "statistics",
        user._id,
      );
    }

    return {
      totalTests,
      completedTests,
      cancelledTests,
      byTestType: byTestType.reduce((acc: any, item: any) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
    };
  }
}

// Register the service
ServiceRegistry.register("laboratory", new LaboratoryServiceHandler());
