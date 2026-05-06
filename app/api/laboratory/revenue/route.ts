// app/api/laboratory/revenue/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenPayload } from "@/lib/auth/jwt";
import { canAccessLaboratory } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const payload = await getTokenPayload(request);
    if (!payload) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    if (!canAccessLaboratory(payload.role)) {
      return NextResponse.json(
        { success: false, error: "Forbidden. You don't have permission to access revenue data." },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get("timeRange") || "month";

    console.log(`Revenue data requested by ${payload.role} ${payload.name}`);

    const now = new Date();
    const months = [];

    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        month: date.toLocaleString("default", { month: "short", year: "numeric" }),
        start: new Date(date.getFullYear(), date.getMonth(), 1),
        end: new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999),
      });
    }

    const labTests = await prisma.labTest.findMany({
      where: { createdAt: { lte: months[months.length - 1].end } },
    });

    const revenueData = months.map((month) => {
      let revenue = 0;
      for (const test of labTests) {
        if (test.createdAt >= month.start && test.createdAt <= month.end) {
          const charges = typeof test.charges === "string" ? JSON.parse(test.charges) : test.charges;
          if (charges?.paymentStatus === "paid") {
            revenue += charges.totalAmount || 0;
          }
        }
      }
      const expenses = revenue * 0.3;
      const profit = revenue - expenses;
      return { month: month.month, revenue, expenses, profit };
    });

    return NextResponse.json({
      success: true,
      data: revenueData,
      timeRange,
    });
  } catch (error: any) {
    console.error("Error fetching revenue data:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch revenue data" },
      { status: 500 },
    );
  }
}