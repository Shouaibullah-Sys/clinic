// app/api/pharmacy/issued-items/route.ts

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { MedicineIssue } from "@/lib/models/MedicineIssue";
import { MedicineStock } from "@/lib/models/MedicineStock";
import { getTokenPayload } from "@/lib/auth/jwt";

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const payload = await getTokenPayload(req);

    if (
      !payload ||
      !(payload.role === "admin" || (payload.role === "pharmacist" || payload.role === "pharmacy_head"))
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date");

    // Build date filter for the start of the day
    let dateFilter = {};
    if (dateParam) {
      const filterDate = new Date(dateParam);
      const startOfDay = new Date(filterDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(filterDate);
      endOfDay.setHours(23, 59, 59, 999);

      dateFilter = {
        issueDate: {
          $gte: startOfDay,
          $lte: endOfDay,
        },
      };
    }

    // Fetch issued items with medicine details
    const issues = await MedicineIssue.find(dateFilter)
      .populate(
        "medicineId",
        "name form dosage currentStock originalStock unitPrice",
      )
      .sort({ issueDate: -1 })
      .lean();

    // Transform data to match DailyIssuedItem interface
    const issuedItems = issues.map((issue: any) => {
      const medicine = issue.medicineId || {};
      const unitPrice = medicine.unitPrice || 0;
      const quantity = issue.quantity || 0;
      const totalPrice = unitPrice * quantity;

      return {
        _id: issue._id.toString(),
        medicineId: medicine._id?.toString() || "",
        name: medicine.name || "Unknown Medicine",
        form: medicine.form || "N/A",
        dosage: medicine.dosage || "N/A",
        quantityIssued: quantity,
        currentStock: medicine.currentStock || 0,
        originalStock: medicine.originalStock || 0,
        issueDate: issue.issueDate,
        issuedTo: issue.issuedTo || "Unknown",
        issuedBy: issue.issuedBy || "Unknown",
        unitPrice,
        totalPrice,
        prescriptionId: issue.prescriptionId || undefined,
      };
    });

    return NextResponse.json({
      issuedItems,
      pagination: {
        total: issuedItems.length,
      },
    });
  } catch (error: any) {
    console.error("Error fetching issued items:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch issued items" },
      { status: 500 },
    );
  }
}
