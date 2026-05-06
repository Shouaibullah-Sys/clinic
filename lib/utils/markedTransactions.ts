import { prisma } from "@/lib/prisma";

type MarkedFilterInput = {
  userId: string;
  module: string;
  baseQuery: any;
  dateFrom?: Date;
  dateTo?: Date;
};

export async function buildMarkedOnlyQuery({
  userId,
  module,
  baseQuery,
  dateFrom,
  dateTo,
}: MarkedFilterInput): Promise<{
  query: any;
  restricted: boolean;
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { markedOnlyAccess: true },
  });

  if (!user?.markedOnlyAccess) {
    return { query: baseQuery, restricted: false };
  }

  const marked = await prisma.markedTransaction.findMany({
    where: {
      module,
      transactionDate: {
        ...(dateFrom && { gte: dateFrom }),
        ...(dateTo && { lte: dateTo }),
      },
    },
    select: { transactionId: true },
  });

  const ids = marked
    .map((m) => m.transactionId)
    .filter((id) => id);

  return {
    query: {
      ...baseQuery,
      id: { in: ids },
    },
    restricted: true,
  };
}
