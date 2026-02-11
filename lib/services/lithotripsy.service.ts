// lib/services/lithotripsy.service.ts
import { BaseService } from "./base.service";
import { LithotripsyService } from "@/lib/models/LithotripsyService";

export interface LithotripsyServiceHandler {
  listLithotripsyProcedures(
    token: string,
    filters: any,
    pagination: { page: number; limit: number },
  ): Promise<any>;
  createLithotripsyProcedure(token: string, data: any): Promise<any>;
}

export class LithotripsyServiceClass
  extends BaseService
  implements LithotripsyServiceHandler
{
  async listLithotripsyProcedures(
    token: string,
    filters: any,
    pagination: { page: number; limit: number },
  ): Promise<any> {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const query: any = {};
    if (filters.status) query.status = filters.status;
    if (filters.patient) query.patient = filters.patient;

    const [procedures, total] = await Promise.all([
      LithotripsyService.find(query)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      LithotripsyService.countDocuments(query),
    ]);

    return {
      data: procedures,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async createLithotripsyProcedure(token: string, data: any): Promise<any> {
    const procedure = new LithotripsyService(data);
    await procedure.save();
    return procedure;
  }
}
