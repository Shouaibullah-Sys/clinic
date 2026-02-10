// app/api/pharmacy/medicine-issues/route.ts

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { MedicineIssue } from "@/lib/models/MedicineIssue";
import { MedicineStock } from "@/lib/models/MedicineStock";
import { getTokenPayload } from "@/lib/auth/jwt";

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const payload = await getTokenPayload(req);

    if (
      !payload ||
      !(payload.role === "admin" || payload.role === "pharmacist")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { prescriptionId, items } = body;

    if (!items || !Array.isArray(items)) {
      return NextResponse.json(
        { error: "Items are required" },
        { status: 400 },
      );
    }

    // Create issue records
    const issuePromises = items.map(async (item: any) => {
      const issue = new MedicineIssue({
        medicineId: item.medicineId,
        quantity: item.quantity,
        issueDate: new Date(),
        issuedTo: item.issuedTo,
        issuedBy: item.issuedBy,
        prescriptionId: prescriptionId,
      });

      return await issue.save();
    });

    const issues = await Promise.all(issuePromises);

    return NextResponse.json({
      success: true,
      data: issues,
      message: "Medicine issue records created",
    });
  } catch (error: any) {
    console.error("Error creating medicine issues:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create medicine issues" },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const payload = await getTokenPayload(req);

    if (
      !payload ||
      !(payload.role === "admin" || payload.role === "pharmacist")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const issues = await MedicineIssue.find({})
      .populate("medicineId", "name form dosage frequency route")
      .sort({ issueDate: -1 })
      .skip(skip)
      .limit(limit);

    const total = await MedicineIssue.countDocuments();

    return NextResponse.json({
      success: true,
      data: issues,
      pagination: { page, limit, total },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to fetch medicine issues" },
      { status: 500 },
    );
  }
}
