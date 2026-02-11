// lib/services/indo.service.ts
import { BaseService } from "./base.service";
import { Admission } from "@/lib/models/Admission";

export interface IndoServiceHandler {
  listInpatients(
    token: string,
    filters: any,
    pagination: { page: number; limit: number },
  ): Promise<any>;
  admitPatient(token: string, data: any): Promise<any>;
  addDailyProgress(
    token: string,
    admissionId: string,
    progress: any,
  ): Promise<any>;
}

export class IndoService extends BaseService implements IndoServiceHandler {
  async listInpatients(
    token: string,
    filters: any,
    pagination: { page: number; limit: number },
  ): Promise<any> {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const query: any = {};
    if (filters.status) query.status = filters.status;
    if (filters.unit) query.unit = filters.unit;
    if (filters.admittingDoctor)
      query.admittingDoctor = filters.admittingDoctor;

    const [inpatients, total] = await Promise.all([
      Admission.find(query).skip(skip).limit(limit).sort({ admissionDate: -1 }),
      Admission.countDocuments(query),
    ]);

    return {
      data: inpatients,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async admitPatient(token: string, data: any): Promise<any> {
    const admission = new Admission(data);
    await admission.save();
    return admission;
  }

  async addDailyProgress(
    token: string,
    admissionId: string,
    progress: any,
  ): Promise<any> {
    const admission = await Admission.findOne({ admissionId });
    if (!admission) {
      throw new Error("Admission not found");
    }

    if (!admission.treatments) {
      admission.treatments = [];
    }

    admission.treatments.push({
      date: new Date(),
      treatment: progress.treatment || progress.notes || "Daily progress",
      administeredBy: progress.administeredBy || admission.doctor,
      notes: progress.notes,
    });

    await admission.save();
    return admission;
  }
}
