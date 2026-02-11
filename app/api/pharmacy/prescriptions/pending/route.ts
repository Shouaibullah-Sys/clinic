// app/api/pharmacy/prescriptions/pending/route.ts

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import PharmacySale from "@/lib/models/PharmacySale";
import { authenticateRequest } from "@/lib/auth";

// GET: List pending pharmacy payments
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    // Authenticate the request
    const auth = await authenticateRequest(request);
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status || 401 },
      );
    }

    // Only receptionists, pharmacists, and admin can view pending payments
    const allowedRoles = ["receptionist", "pharmacist", "admin"];
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

    // Build query
    const query: any = {
      paymentStatus: "pending",
      status: "pending",
    };

    // Add search filter if provided
    if (search) {
      query.$or = [
        { saleId: { $regex: search, $options: "i" } },
        { invoiceNumber: { $regex: search, $options: "i" } },
        { customerName: { $regex: search, $options: "i" } },
        { customerPhone: { $regex: search, $options: "i" } },
      ];
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Fetch pending sales
    const [sales, total] = await Promise.all([
      PharmacySale.find(query)
        .populate("soldBy", "name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      PharmacySale.countDocuments(query),
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
  } catch (error: any) {
    console.error("Error fetching pending pharmacy payments:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch pending payments",
      },
      { status: 500 },
    );
  }
}
