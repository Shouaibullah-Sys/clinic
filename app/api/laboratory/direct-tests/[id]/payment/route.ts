import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status || 401 },
      );
    }

    const allowedRoles = ["receptionist", "admin"];
    if (!allowedRoles.includes(auth.userRole!)) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden. Only receptionists can process payments.",
        },
        { status: 403 },
      );
    }

    const { id: testId } = await params;

    const labTest = await prisma.labTest.findUnique({
      where: { id: testId },
      include: { patient: true },
    });

    if (!labTest) {
      return NextResponse.json(
        { success: false, error: "Lab test not found" },
        { status: 404 },
      );
    }

    if (!labTest.isDirectTest) {
      return NextResponse.json(
        { success: false, error: "This is not a direct lab test" },
        { status: 400 },
      );
    }

    const charges = labTest.charges as any;
    if (charges.paymentStatus === "paid") {
      return NextResponse.json(
        { success: false, error: "Payment has already been processed" },
        { status: 400 },
      );
    }

    const body = await request.json();

    if (!body.amount || typeof body.amount !== "number") {
      return NextResponse.json(
        { success: false, error: "Payment amount is required" },
        { status: 400 },
      );
    }

    if (!body.paymentMethod) {
      return NextResponse.json(
        { success: false, error: "Payment method is required" },
        { status: 400 },
      );
    }

    const validPaymentMethods = [
      "cash",
      "card",
      "insurance",
      "online",
      "check",
      "bank_transfer",
    ];
    if (!validPaymentMethods.includes(body.paymentMethod)) {
      return NextResponse.json(
        { success: false, error: "Invalid payment method" },
        { status: 400 },
      );
    }

    const totalAmount = charges.basePrice || 0;
    const paidAmount = charges.paid || 0;
    const dueAmount = totalAmount - paidAmount;

    if (body.amount <= 0) {
      return NextResponse.json(
        { success: false, error: "Payment amount must be greater than 0" },
        { status: 400 },
      );
    }

    if (body.amount > dueAmount) {
      return NextResponse.json(
        {
          success: false,
          error: `Payment amount exceeds due amount. Due: ${dueAmount}, Provided: ${body.amount}`,
        },
        { status: 400 },
      );
    }

    const newPaidAmount = paidAmount + body.amount;
    const newDueAmount = totalAmount - newPaidAmount;
    let newPaymentStatus: "pending" | "partial" | "paid" | "cancelled" = "partial";

    if (newDueAmount <= 0) {
      newPaymentStatus = "paid";
    } else if (newPaidAmount > 0) {
      newPaymentStatus = "partial";
    }

    const payment = await prisma.payment.create({
      data: {
        paymentId: `PAY${Date.now().toString().slice(-6)}`,
        patientId: labTest.patientId,
        paymentMethod: body.paymentMethod,
        amount: body.amount,
        taxAmount: 0,
        discountAmount: body.discount || 0,
        netAmount: body.amount - (body.discount || 0),
        status: "completed",
        paymentDate: new Date(),
        receivedById: auth.userId!,
        department: "laboratory",
        serviceType: "direct_lab_test",
        notes: body.notes,
      },
    });

    const updatedLabTest = await prisma.labTest.update({
      where: { id: testId },
      data: {
        charges: {
          ...charges,
          paid: newPaidAmount,
          due: Math.max(0, newDueAmount),
          paymentStatus: newPaymentStatus,
          paymentMethod: body.paymentMethod,
          paymentDate: new Date(),
          collectedById: auth.userId!,
          discount: (charges.discount || 0) + (body.discount || 0),
        },
        paymentVerified: newPaymentStatus === "paid",
        paymentVerifiedById: newPaymentStatus === "paid" ? auth.userId! : null,
        paymentVerifiedAt: newPaymentStatus === "paid" ? new Date() : null,
      },
      include: {
        patient: { select: { name: true, patientId: true, phone: true } },
        createdBy: { select: { name: true } },
      },
    });

    console.log(
      `Payment processed for direct lab test ${labTest.testId}: ${body.amount} ${body.paymentMethod} by ${auth.userName}`,
    );

    return NextResponse.json({
      success: true,
      data: {
        labTest: updatedLabTest,
        payment: {
          paymentId: payment.paymentId,
          amount: payment.amount,
          paymentMethod: payment.paymentMethod,
          status: payment.status,
        },
      },
      message: "Payment processed successfully",
    });
  } catch (error: any) {
    console.error("Error processing payment:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to process payment",
      },
      { status: 500 },
    );
  }
}