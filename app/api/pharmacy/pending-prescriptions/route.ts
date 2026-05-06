// app/api/pharmacy/pending-prescriptions/route.ts - ENHANCED
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenPayload } from "@/lib/auth/jwt";

export async function GET(req: NextRequest) {
  const payload = await getTokenPayload(req);

  if (
    !payload ||
    !((payload.role === "pharmacist" || payload.role === "pharmacy_head") || payload.role === "admin")
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const status = searchParams.get("status") || "pending";
    const search = searchParams.get("search") || "";
    const skip = (page - 1) * limit;

    // Build query for pending prescriptions
    let where: any = {
      status: { in: ["active", "pending"] }, // Include both active and pending statuses
      dispensingStatus: status, // pending, partial, etc.
      paymentVerified: true, // Only return prescriptions with verified payment
    };

    // Optional search with multiple fields
    if (search) {
      where.OR = [
        { prescriptionId: { contains: search, mode: "insensitive" } },
        { diagnosis: { contains: search, mode: "insensitive" } },
      ];
    }

    const [prescriptions, total] = await Promise.all([
      prisma.prescription.findMany({
        where,
        include: {
          patient: { select: { name: true, patientId: true, phone: true } },
          doctor: { select: { name: true, specialization: true } },
        },
        orderBy: { date: "desc" },
        skip,
        take: limit,
      }),
      prisma.prescription.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: prescriptions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("Error fetching pending prescriptions:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch pending prescriptions",
        data: [],
      },
      { status: 500 },
    );
  }
}
