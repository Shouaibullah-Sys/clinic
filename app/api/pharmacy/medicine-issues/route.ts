// app/api/pharmacy/medicine-issues/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenPayload } from "@/lib/auth/jwt";

export async function POST(req: NextRequest) {
  try {
    const payload = await getTokenPayload(req);

    if (
      !payload ||
      !(payload.role === "admin" || (payload.role === "pharmacist" || payload.role === "pharmacy_head"))
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

    const issuePromises = items.map(async (item: any) => {
      return await (prisma as any).medicineIssue.create({
        data: {
          medicineId: item.medicineId,
          quantity: item.quantity,
          issueDate: new Date(),
          issuedTo: item.issuedTo,
          issuedById: item.issuedBy,
          prescriptionId: prescriptionId,
        },
      });
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
    const payload = await getTokenPayload(req);

    if (
      !payload ||
      !(payload.role === "admin" || (payload.role === "pharmacist" || payload.role === "pharmacy_head"))
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const issues = await (prisma as any).medicineIssue.findMany({
      skip,
      take: limit,
      orderBy: { issueDate: "desc" },
      include: {
        medicine: { select: { name: true, form: true, dosage: true, frequency: true, route: true } },
      },
    });

    const total = await (prisma as any).medicineIssue.count();

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