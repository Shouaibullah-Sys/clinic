// lib/tailor-data.ts
import dbConnect from "@/lib/dbConnect";
import { DailyRecord, IDailyRecord } from "@/lib/models/DailyRecord";

// Helper function to convert database model to API type
function toTailorRecord(record: any) {
  return {
    _id: record._id.toString(),
    date: record.date.toISOString(),
    customerName: record.customerName,
    invoiceNumber: record.invoiceNumber,
    serviceType: record.serviceType,
    clothingType: record.clothingType,
    phoneNumber: record.phoneNumber,
    amountCharged: record.amountCharged,
    amountPaid: record.amountPaid,
    discount: record.discount,
    paymentStatus: record.paymentStatus,
    orderStatus: record.orderStatus,
    deliveryDate: record.deliveryDate.toISOString(),
    measurements: record.measurements || {},
    specialInstructions: record.specialInstructions,
    recordedBy: record.recordedBy,
  };
}

// Database operations for Tailor Records
export async function getTailorRecords(
  startDate?: Date,
  endDate?: Date,
  orderStatus?: string,
  paymentStatus?: string
): Promise<any[]> {
  await dbConnect();

  let query: any = {};

  if (startDate && endDate) {
    query.date = {  
      $gte: startDate,
      $lte: endDate,
    };
  }

  if (orderStatus) {
    query.orderStatus = orderStatus;
  }

  if (paymentStatus) {
    query.paymentStatus = paymentStatus;
  }

  const records = await DailyRecord.find(query).sort({ createdAt: -1 });
  return records.map(toTailorRecord);
}

export async function getTailorRecordById(id: string): Promise<any | null> {
  await dbConnect();
  const record = await DailyRecord.findById(id);
  return record ? toTailorRecord(record) : null;
}

export async function getUpcomingDeliveries(days: number = 7): Promise<any[]> {
  await dbConnect();
  const today = new Date();
  const futureDate = new Date();
  futureDate.setDate(today.getDate() + days);

  const records = await DailyRecord.find({
    deliveryDate: { $gte: today, $lte: futureDate },
    orderStatus: { $ne: "delivered" }
  }).sort({ deliveryDate: 1 });

  return records.map(toTailorRecord);
}

export async function addTailorRecord(data: any): Promise<any> {
  await dbConnect();

  const invoiceNumber = await DailyRecord.generateInvoiceNumber();

  const record = new DailyRecord({
    customerName: data.customerName,
    serviceType: data.serviceType,
    clothingType: data.clothingType,
    phoneNumber: data.phoneNumber || "",
    invoiceNumber,
    amountCharged: data.amountCharged || 0,
    amountPaid: data.amountPaid || 0,
    discount: data.discount || 0,
    paymentStatus: data.amountPaid >= data.amountCharged ? "paid" : data.amountPaid > 0 ? "partial" : "unpaid",
    orderStatus: data.orderStatus || "pending",
    deliveryDate: data.deliveryDate || new Date(),
    date: data.date || new Date(),
    measurements: data.measurements || {},
    specialInstructions: data.specialInstructions || "",
    recordedBy: data.recordedBy,
  });

  await record.save();
  return toTailorRecord(record);
}

export async function updateTailorRecord(
  id: string,
  updates: Partial<any>
): Promise<any | null> {
  await dbConnect();

  const updateData: any = {};

  if (updates.customerName) updateData.customerName = updates.customerName;
  if (updates.serviceType) updateData.serviceType = updates.serviceType;
  if (updates.clothingType) updateData.clothingType = updates.clothingType;
  if (updates.phoneNumber !== undefined) updateData.phoneNumber = updates.phoneNumber;
  if (updates.amountCharged !== undefined) updateData.amountCharged = updates.amountCharged;
  if (updates.amountPaid !== undefined) updateData.amountPaid = updates.amountPaid;
  if (updates.discount !== undefined) updateData.discount = updates.discount;
  if (updates.orderStatus) updateData.orderStatus = updates.orderStatus;
  if (updates.deliveryDate) updateData.deliveryDate = updates.deliveryDate;
  if (updates.date) updateData.date = updates.date;
  if (updates.measurements !== undefined) updateData.measurements = updates.measurements;
  if (updates.specialInstructions !== undefined) updateData.specialInstructions = updates.specialInstructions;
  if (updates.recordedBy !== undefined) updateData.recordedBy = updates.recordedBy;

  // Recalculate payment status
  if (updates.amountCharged !== undefined || updates.amountPaid !== undefined || updates.discount !== undefined) {
    const record = await DailyRecord.findById(id);
    if (record) {
      const charged = updates.amountCharged !== undefined ? updates.amountCharged : record.amountCharged;
      const paid = updates.amountPaid !== undefined ? updates.amountPaid : record.amountPaid;
      const discount = updates.discount !== undefined ? updates.discount : record.discount;
      const netAmount = charged - discount;
      updateData.paymentStatus = paid >= netAmount ? "paid" : paid > 0 ? "partial" : "unpaid";
    }
  }

  const record = await DailyRecord.findByIdAndUpdate(id, { $set: updateData }, { new: true });
  return record ? toTailorRecord(record) : null;
}

export async function updatePayment(
  id: string,
  amount: number
): Promise<any | null> {
  await dbConnect();
  
  try {
    const record = await DailyRecord.findById(id);
    if (!record) {
      throw new Error("Record not found");
    }
    
    // Cast to any to access the instance methods
    const recordWithMethods = record as any;
    await recordWithMethods.addPayment(amount);
    return toTailorRecord(record);
  } catch (error) {
    console.error("Error updating payment:", error);
    throw error;
  }
}

export async function markAsDelivered(id: string): Promise<any | null> {
  await dbConnect();
  
  try {
    const record = await DailyRecord.findById(id);
    if (!record) {
      throw new Error("Record not found");
    }
    
    // Cast to any to access the instance methods
    const recordWithMethods = record as any;
    await recordWithMethods.markAsDelivered();
    return toTailorRecord(record);
  } catch (error) {
    console.error("Error marking as delivered:", error);
    throw error;
  }
}

export async function deleteTailorRecord(id: string): Promise<boolean> {
  await dbConnect();
  const result = await DailyRecord.findByIdAndDelete(id);
  return !!result;
}

// Summary functions
export async function getDailySummary(date?: Date): Promise<any> {
  await dbConnect();
  
  const queryDate = date || new Date();
  const startOfDay = new Date(queryDate.setHours(0, 0, 0, 0));
  const endOfDay = new Date(queryDate.setHours(23, 59, 59, 999));

  const records = await DailyRecord.find({
    date: { $gte: startOfDay, $lte: endOfDay }
  });

  const summary = {
    date: startOfDay,
    totalCharged: 0,
    totalPaid: 0,
    totalDiscount: 0,
    totalBalance: 0,
    totalRecords: records.length,
    pendingOrders: 0,
    completedOrders: 0,
    deliveredOrders: 0
  };

  records.forEach(record => {
    summary.totalCharged += record.amountCharged;
    summary.totalPaid += record.amountPaid;
    summary.totalDiscount += record.discount;
    summary.totalBalance += (record.amountCharged - record.amountPaid - record.discount);
    
    if (record.orderStatus === "pending" || record.orderStatus === "in_progress") {
      summary.pendingOrders++;
    } else if (record.orderStatus === "completed") {
      summary.completedOrders++;
    } else if (record.orderStatus === "delivered") {
      summary.deliveredOrders++;
    }
  });

  return summary;
}

export async function getMonthlySummary(month: number, year: number): Promise<any> {
  await dbConnect();
  
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);

  const records = await DailyRecord.find({
    date: { $gte: startDate, $lte: endDate }
  });

  const summary = {
    month: startDate.toLocaleString('default', { month: 'long' }),
    year,
    totalCharged: 0,
    totalPaid: 0,
    totalDiscount: 0,
    totalBalance: 0,
    totalRecords: records.length,
    serviceTypeBreakdown: {
      stitching: 0,
      alteration: 0,
      repair: 0,
      dry_cleaning: 0,
      other: 0
    },
    clothingTypeBreakdown: {
      shirt: 0,
      pant: 0,
      suit: 0,
      dress: 0,
      blouse: 0,
      skirt: 0,
      jacket: 0,
      other: 0
    }
  };

  records.forEach(record => {
    summary.totalCharged += record.amountCharged;
    summary.totalPaid += record.amountPaid;
    summary.totalDiscount += record.discount;
    summary.totalBalance += (record.amountCharged - record.amountPaid - record.discount);
    
    // Count by service type
    if (summary.serviceTypeBreakdown.hasOwnProperty(record.serviceType)) {
      summary.serviceTypeBreakdown[record.serviceType as keyof typeof summary.serviceTypeBreakdown]++;
    }
    
    // Count by clothing type
    if (summary.clothingTypeBreakdown.hasOwnProperty(record.clothingType)) {
      summary.clothingTypeBreakdown[record.clothingType as keyof typeof summary.clothingTypeBreakdown]++;
    }
  });

  return summary;
}