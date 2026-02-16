import mongoose from "mongoose";
import {
  MarkedTransaction,
  MarkedModule,
} from "@/lib/models/MarkedTransaction";
import { User, IUser } from "@/lib/models/User";

type MarkedFilterInput = {
  userId: string;
  module: MarkedModule;
  baseQuery: Record<string, any>;
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
  query: Record<string, any>;
  restricted: boolean;
}> {
  const user = (await User.findById(userId)
    .select("markedOnlyAccess")
    .lean()) as IUser | null;

  if (!user?.markedOnlyAccess) {
    return { query: baseQuery, restricted: false };
  }

  const markedQuery: Record<string, any> = { module };
  if (dateFrom || dateTo) {
    markedQuery.transactionDate = {};
    if (dateFrom) markedQuery.transactionDate.$gte = dateFrom;
    if (dateTo) markedQuery.transactionDate.$lte = dateTo;
  }

  const marked = await MarkedTransaction.find(markedQuery)
    .select("transactionId")
    .lean();

  const ids = marked
    .map((m) => m.transactionId)
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  return {
    query: {
      ...baseQuery,
      _id: { $in: ids },
    },
    restricted: true,
  };
}
