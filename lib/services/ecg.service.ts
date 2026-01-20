// lib/services/ecg.service.ts
import { BaseService, ServiceError, ServiceRegistry } from "./base.service";
import { IECGService, ECGService } from "@/lib/models/IECGService";

export class ECGServiceHandler extends BaseService {
  async createECGRecord(
    token: string,
    data: Partial<IECGService>
  ): Promise<IECGService> {
    const { user } = await this.validateAndAuthorize(token, "patients", "create");
    
    await this.checkServiceAccess(user, "ecg", "create");

    // Generate ECG ID
    const ecgId = `ECG-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const ecgRecord = await ECGService.create({
      ...data,
      ecgId,
      requestingDoctor: user._id,
      status: "scheduled",
      billingStatus: "pending",
    });

    await this.auditLog(
      "create",
      "ecg_record",
      ecgRecord._id.toString(),
      user._id,
      user.role,
      { data }
    );

    return ecgRecord;
  }

  async getECGRecord(
    token: string,
    recordId: string
  ): Promise<IECGService> {
    const { user } = await this.authenticate(token);

    const record = await ECGService.findById(recordId)
      .populate("patient", "name age gender")
      .populate("requestingDoctor", "name designation department")
      .populate("performingDoctor", "name")
      .populate("technician", "name");

    if (!record) {
      throw new ServiceError("ECG record not found", 404);
    }

    // Check access permissions
    if (
      user.role !== "admin" &&
      record.requestingDoctor.toString() !== user._id &&
      record.performingDoctor?.toString() !== user._id
    ) {
      await this.authorize(user, "patients", "read");
    }

    return record;
  }

  async listECGRecords(
    token: string,
    filters: any = {},
    options: {
      page?: number;
      limit?: number;
      sort?: any;
    } = {}
  ): Promise<{
    records: IECGService[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const { user } = await this.authenticate(token);
    const { page = 1, limit = 20, sort = { createdAt: -1 } } = options;

    // Build query based on user role
    let query: any = {};

    if (user.role === "doctor") {
      query = {
        $or: [
          { requestingDoctor: user._id },
          { performingDoctor: user._id },
        ],
      };
    } else if (user.role === "nurse" || user.role === "staff") {
      query = { status: { $in: ["scheduled", "in_progress"] } };
    }

    // Apply additional filters
    query = { ...query, ...filters };

    const total = await ECGService.countDocuments(query);
    const records = await ECGService.find(query)
      .populate("patient", "name age gender")
      .populate("requestingDoctor", "name designation")
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

  async updateECGInterpretation(
    token: string,
    recordId: string,
    interpretation: any
  ): Promise<IECGService> {
    const { user } = await this.validateAndAuthorize(token, "patients", "update");

    const record = await ECGService.findById(recordId);
    if (!record) {
      throw new ServiceError("ECG record not found", 404);
    }

    // Check if user is authorized (doctor or admin)
    if (user.role !== "admin" && user.role !== "doctor") {
      throw new ServiceError("Only doctors can interpret ECG results", 403);
    }

    record.interpretation = {
      ...record.interpretation,
      ...interpretation,
    };
    record.status = "reported";
    record.reportDate = new Date();

    await record.save();

    await this.auditLog(
      "interpret",
      "ecg_record",
      recordId,
      user._id,
      user.role,
      { interpretation }
    );

    return record;
  }
}

// Register the service
ServiceRegistry.register("ecg", new ECGServiceHandler());   