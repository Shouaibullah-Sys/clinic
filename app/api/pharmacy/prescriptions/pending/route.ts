// app/api/pharmacy/prescriptions/pending/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/auth";
import { buildMarkedOnlyQuery } from "@/lib/utils/markedTransactions";

// GET: List pending pharmacy payments
export async function GET(request: NextRequest) {
  try {
    // Authenticate the request
    const auth = await authenticateRequest(request);
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status || 401 },
      );
    }

    // Only receptionists, pharmacists, and admin can view pending payments
    const allowedRoles = ["receptionist", "pharmacist", "pharmacy_head", "admin"];
    if (!auth.userRole || !allowedRoles.includes(auth.userRole)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Forbidden. You don't have permission to view pending payments.",
        },
        { status: 403 },
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search") || "";
    const paymentStatus = searchParams.get("paymentStatus") || "pending";
    const status = searchParams.get("status") || "pending";

    // Build query
    let where: any = {};

    if (status !== "all") {
      where.status = status;
    }

    if (paymentStatus === "unpaid") {
      where.paymentStatus = { in: ["pending", "partial"] };
    } else if (paymentStatus !== "all") {
      where.paymentStatus = paymentStatus;
    }

    // Add search filter if provided
    if (search) {
      where.OR = [
        { saleId: { contains: search, mode: "insensitive" } },
        { invoiceNumber: { contains: search, mode: "insensitive" } },
        { customerName: { contains: search, mode: "insensitive" } },
        { customerPhone: { contains: search, mode: "insensitive" } },
      ];
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    const { query: finalQuery } = await buildMarkedOnlyQuery({
      userId: auth.userId!,
      module: "pharmacy",
      baseQuery: where,
    });

    // Fetch pending sales
    const [sales, total] = await Promise.all([
      prisma.pharmacySale.findMany({
        where: finalQuery,
        include: { soldBy: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.pharmacySale.count({ where: finalQuery }),
    ]);

    // Calculate pagination info
    const pages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      data: sales,
      pagination: {
        page,
        limit,
        total,
        pages,
      },
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to fetch pending payments";
    console.error("Error fetching pending pharmacy payments:", error);
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 },
    );
  }
}
