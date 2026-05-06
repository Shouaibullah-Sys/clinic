import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenPayload } from "@/lib/auth/jwt";
import { z } from "zod";

const PaymentSchema = z.object({
  amount: z.number().min(1),
  paymentMethod: z.enum(["cash", "card", "insurance"]),
  discount: z.number().min(0).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await getTokenPayload(request);
    if (!auth) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const allowedRoles = ["receptionist", "pharmacist", "pharmacy_head", "admin"];
    const userRole = auth.role as string;
    if (!userRole || !allowedRoles.includes(userRole)) {
      return NextResponse.json(
        { success: false, error: "Insufficient permissions" },
        { status: 403 },
      );
    }

    const { id: saleId } = await params;
    const body = await request.json();
    const validation = PaymentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: validation.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const sale = await prisma.pharmacySale.findUnique({
      where: { id: saleId },
    });

    if (!sale) {
      return NextResponse.json({ success: false, error: "Pharmacy sale not found" }, { status: 404 });
    }

    if (sale.paymentStatus === "paid") {
      return NextResponse.json({ success: false, error: "Payment already processed" }, { status: 400 });
    }

    const { amount, paymentMethod, discount = 0 } = validation.data;
    const dueAmount = sale.totalAmount - sale.amountPaid;

    if (amount > dueAmount) {
      return NextResponse.json(
        { success: false, error: `Amount exceeds due: ${dueAmount}` },
        { status: 400 },
      );
    }

    const newAmountPaid = sale.amountPaid + amount;
    const newBalance = Math.max(0, sale.totalAmount - newAmountPaid - discount);
    const newStatus = newBalance <= 0 ? "paid" : "partial";

    await prisma.payment.create({
      data: {
        paymentId: `PAY${Date.now()}`,
        amount,
        paymentMethod,
        receivedById: auth.id,
        paymentDate: new Date(),
        netAmount: amount,
        pharmacySaleId: saleId,
      },
    });

    const updatedSale = await prisma.pharmacySale.update({
      where: { id: saleId },
      data: {
        amountPaid: newAmountPaid,
        balance: newBalance,
        discount: discount,
        paymentStatus: newStatus,
        paymentMethod,
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedSale,
      message: "Payment processed successfully",
    });
  } catch (error: any) {
    console.error("Error processing payment:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process payment" },
      { status: 500 },
    );
  }
}