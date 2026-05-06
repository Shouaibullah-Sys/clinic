// app/api/pharmacy/prescriptions/[id]/finalize/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenPayload } from "@/lib/auth/jwt";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const payload = await getTokenPayload(request);

    if (!payload || !["pharmacist", "pharmacy_head", "admin"].includes(payload.role)) {
      return NextResponse.json(
        { success: false, error: "Forbidden. Only pharmacists and pharmacy heads can finalize sales." },
        { status: 403 },
      );
    }

    const { id: saleId } = await params;

    const sale = await (prisma as any).pharmacySale.findUnique({
      where: { id: saleId },
    });

    if (!sale) {
      return NextResponse.json(
        { success: false, error: "Pharmacy sale not found" },
        { status: 404 },
      );
    }

    if (sale.status === "completed") {
      return NextResponse.json(
        { success: false, error: "Sale has already been finalized" },
        { status: 400 },
      );
    }

    if (sale.status === "cancelled") {
      return NextResponse.json(
        { success: false, error: "Cannot finalize a cancelled sale" },
        { status: 400 },
      );
    }

    if (sale.paymentStatus !== "paid" && sale.balance > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Cannot finalize sale. Payment has not been completed.",
        },
        { status: 400 },
      );
    }

    const body = await request.json();

    if (body.status && body.status !== "completed") {
      return NextResponse.json(
        { success: false, error: "Status must be 'completed'" },
        { status: 400 },
      );
    }

    const updatedSale = await (prisma as any).pharmacySale.update({
      where: { id: saleId },
      data: {
        status: "completed",
        finalizedAt: new Date(),
        finalizedById: payload.id,
        notes: body.notes || sale.notes,
      },
      include: {
        soldBy: { select: { name: true } },
        finalizedBy: { select: { name: true } },
      },
    });

    console.log(`Pharmacy sale ${sale.saleId} finalized by ${payload.name}`);

    return NextResponse.json({
      success: true,
      data: updatedSale,
      message: "Sale finalized successfully",
    });
  } catch (error: any) {
    console.error("Error finalizing pharmacy sale:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to finalize sale",
      },
      { status: 500 },
    );
  }
}