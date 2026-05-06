import { prisma } from "@/lib/prisma";

/**
 * Base repository class providing common CRUD operations using Prisma.
 * All model repositories extend this base.
 */
export class BaseRepository<T extends { id: string }> {
  constructor(protected model: any) {}

  async findById(id: string): Promise<T | null> {
    return this.model.findUnique({ where: { id } }) as Promise<T | null>;
  }

  async findAll(params?: {
    skip?: number;
    take?: number;
    where?: any;
    orderBy?: any;
  }): Promise<T[]> {
    const { skip, take, where, orderBy } = params || {};
    return this.model.findMany({
      skip,
      take,
      where,
      orderBy: orderBy || { createdAt: "desc" },
    }) as Promise<T[]>;
  }

  async create(data: any): Promise<T> {
    return this.model.create({ data }) as Promise<T>;
  }

  async update(id: string, data: any): Promise<T> {
    return this.model.update({ where: { id }, data }) as Promise<T>;
  }

  async delete(id: string): Promise<T> {
    return this.model.delete({ where: { id } }) as Promise<T>;
  }

  async count(where?: any): Promise<number> {
    return this.model.count({ where });
  }
}

export default prisma;