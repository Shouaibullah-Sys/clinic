// app/api/pharmacy/dashboard/stats/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Prescription } from "@/lib/models/Prescription";
import { Expense } from "@/lib/models/Expense";
import { MedicineStock } from "@/lib/models/MedicineStock";
import dbConnect from "@/lib/dbConnect";
import { getTokenPayload } from "@/lib/auth/jwt";

export async function GET(req: NextRequest) {
  await dbConnect();
  const payload = await getTokenPayload(req);

  if (!payload || !(payload.role === "admin" || payload.role === "pharmacy")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get date range from query params
    const searchParams = req.nextUrl.searchParams;
    const fromDate = searchParams.get("from");
    const toDate = searchParams.get("to");

    // Validate and parse dates
    const dateStart = fromDate ? new Date(fromDate) : new Date();
    dateStart.setHours(0, 0, 0, 0);

    const dateEnd = toDate ? new Date(toDate) : new Date();
    dateEnd.setHours(23, 59, 59, 999);

    if (isNaN(dateStart.getTime()) || isNaN(dateEnd.getTime())) {
      return NextResponse.json(
        { error: "Invalid date format. Use YYYY-MM-DD" },
        { status: 400 }
      );
    }

    // Optimized: Single aggregation pipeline for all sales data
    const salesData = await Prescription.aggregate(
      [
        {
          $match: {
            createdAt: { $gte: dateStart, $lte: dateEnd },
            status: "completed",
          },
        },
        {
          $group: {
            _id: null,
            totalSales: { $sum: "$totalAmount" },
            cashSales: {
              $sum: {
                $cond: [{ $eq: ["$paymentMethod", "cash"] }, "$totalAmount", 0],
              },
            },
            cardSales: {
              $sum: {
                $cond: [{ $eq: ["$paymentMethod", "card"] }, "$totalAmount", 0],
              },
            },
            insuranceSales: {
              $sum: {
                $cond: [
                  { $eq: ["$paymentMethod", "insurance"] },
                  "$totalAmount",
                  0,
                ],
              },
            },
          },
        },
      ],
      { maxTimeMS: 10000 }
    ); // 10 second timeout for this aggregation

    // Get expenses data with timeout
    const expensesData = await Expense.aggregate(
      [
        { $match: { date: { $gte: dateStart, $lte: dateEnd } } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ],
      { maxTimeMS: 5000 }
    ); // 5 second timeout

    // Get inventory data with optimized queries and timeout
    let inventoryValue = 0;
    let lowStockItems = 0;

    try {
      // Use Promise.allSettled to prevent one query from blocking others
      const [inventoryResult, lowStockResult] = await Promise.allSettled([
        MedicineStock.aggregate(
          [
            { $match: { currentQuantity: { $gt: 0 } } },
            {
              $group: {
                _id: null,
                total: {
                  $sum: { $multiply: ["$currentQuantity", "$unitPrice"] },
                },
              },
            },
          ],
          { maxTimeMS: 8000 }
        ), // 8 second timeout

        MedicineStock.find({
          currentQuantity: { $gt: 0 },
          originalQuantity: { $gt: 0 },
          $expr: {
            $lt: [{ $divide: ["$currentQuantity", "$originalQuantity"] }, 0.2],
          },
        }).countDocuments({ maxTimeMS: 5000 }), // 5 second timeout
      ]);

      if (inventoryResult.status === "fulfilled") {
        inventoryValue = inventoryResult.value[0]?.total || 0;
      } else {
        console.error("Inventory value query failed:", inventoryResult.reason);
      }

      if (lowStockResult.status === "fulfilled") {
        lowStockItems = lowStockResult.value || 0;
      } else {
        console.error("Low stock query failed:", lowStockResult.reason);
      }
    } catch (err) {
      console.error("Inventory stats error:", err);
    }

    return NextResponse.json({
      totalSales: salesData[0]?.totalSales || 0,
      cashSales: salesData[0]?.cashSales || 0,
      cardSales: salesData[0]?.cardSales || 0,
      insuranceSales: salesData[0]?.insuranceSales || 0,
      totalExpenses: expensesData[0]?.total || 0,
      inventoryValue: inventoryValue || 0,
      lowStockItems: lowStockItems || 0,
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard stats" },
      { status: 500 }
    );
  }
}
