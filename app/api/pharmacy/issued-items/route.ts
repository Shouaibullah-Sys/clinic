// app/api/pharmacy/issued-items/route.ts
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { getTokenPayload } from "@/lib/auth/jwt";
import { Prescription } from "@/lib/models/Prescription";
import { MedicineStock } from "@/lib/models/MedicineStock";

export async function GET(req: NextRequest) {
  await dbConnect();
  const payload = await getTokenPayload(req);

  if (!payload || !(payload.role === "pharmacy" || payload.role === "admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200); // Higher limit for inventory view
    const skip = (page - 1) * limit;

    // Set date range for the selected day
    const targetDate = dateParam ? new Date(dateParam) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Use aggregation for better performance with large datasets
    const issuedItems = await Prescription.aggregate([
      {
        $match: {
          status: "completed",
          createdAt: {
            $gte: startOfDay,
            $lte: endOfDay,
          },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "issuedBy",
          foreignField: "_id",
          as: "issuedBy",
        },
      },
      {
        $unwind: "$items",
      },
      {
        $lookup: {
          from: "medicinestocks",
          localField: "items.medicine",
          foreignField: "_id",
          as: "items.medicine",
        },
      },
      {
        $unwind: "$items.medicine",
      },
      {
        $addFields: {
          issuedBy: { $arrayElemAt: ["$issuedBy", 0] },
        },
      },
      {
        $project: {
          _id: 0,
          medicineId: "$items.medicine._id",
          name: "$items.medicine.name",
          batchNumber: "$items.medicine.batchNumber",
          quantityIssued: "$items.quantity",
          currentStock: "$items.medicine.currentQuantity",
          originalStock: "$items.medicine.originalQuantity",
          issueDate: "$createdAt",
          issuedTo: "$patientName",
          issuedBy: { $ifNull: ["$issuedBy.name", "Unknown"] },
          unitPrice: "$items.unitPrice",
          totalPrice: {
            $multiply: [
              "$items.quantity",
              "$items.unitPrice",
              { $subtract: [1, { $divide: ["$items.discount", 100] }] },
            ],
          },
          prescriptionId: "$invoiceNumber",
        },
      },
      { $sort: { issueDate: -1 } },
      { $skip: skip },
      { $limit: limit },
    ]);

    // Get total count for pagination
    const total = await Prescription.countDocuments({
      status: "completed",
      createdAt: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
    });

    return NextResponse.json({
      issuedItems,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching daily issued items:", error);
    return NextResponse.json(
      { error: "Failed to fetch daily issued items" },
      { status: 500 }
    );
  }
}
