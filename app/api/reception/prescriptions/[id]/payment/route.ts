// app/api/reception/prescriptions/[id]/payment/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/auth";

export async function PUT(
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
    if (!auth.userRole || !allowedRoles.includes(auth.userRole)) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden. Only receptionists can process payments.",
        },
        { status: 403 },
      );
    }

    const { id: prescriptionId } = await params;

    const prescription = await prisma.prescription.findUnique({
      where: { id: prescriptionId },
    });

    if (!prescription) {
      return NextResponse.json(
        { success: false, error: "Prescription not found" },
        { status: 404 },
      );
    }

    if (
      prescription.status === "cancelled" ||
      prescription.status === "expired"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot process payment for ${prescription.status} prescription`,
        },
        { status: 400 },
      );
    }

    if (prescription.paymentVerified) {
      return NextResponse.json(
        { success: false, error: "Payment has already been verified" },
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

    const charges = prescription.charges as any;
    const totalAmount = charges.totalAmount || 0;
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

    let discountAmount = 0;
    if (body.discount !== undefined && body.discount !== null) {
      if (typeof body.discount !== "number" || body.discount < 0) {
        return NextResponse.json(
          { success: false, error: "Discount must be a non-negative number" },
          { status: 400 },
        );
      }
      discountAmount = body.discount;
    }

    const newPaidAmount = paidAmount + body.amount;
    const newDueAmount = totalAmount - newPaidAmount;
    let newPaymentStatus: "unpaid" | "partial" | "paid" | "cancelled" =
      "partial";

    if (newDueAmount <= 0) {
      newPaymentStatus = "paid";
    } else if (newPaidAmount > 0) {
      newPaymentStatus = "partial";
    } else {
      newPaymentStatus = "unpaid";
    }

    console.log(
      `[DEBUG] Payment processing for prescription ${prescription.prescriptionId}:`,
      {
        totalAmount,
        paidAmount,
        bodyAmount: body.amount,
        newPaidAmount,
        newDueAmount,
        newPaymentStatus,
        currentPaymentVerified: prescription.paymentVerified,
      },
    );

    const payment = await prisma.payment.create({
      data: {
        patientId: prescription.patientId,
        paymentMethod: body.paymentMethod,
        amount: body.amount,
        taxAmount: 0,
        discountAmount: discountAmount,
        netAmount: body.amount - discountAmount,
        status: "completed",
        paymentDate: new Date(),
        receivedById: auth.userId!,
        department: "pharmacy",
        serviceType: "prescription",
        notes: body.notes,
        ...(body.paymentMethod === "card" && {
          cardType: body.cardType,
          cardLastFour: body.cardLastFour,
        }),
        ...(body.transactionId && { transactionId: body.transactionId }),
      },
    });

    const newCharges = {
      ...charges,
      paid: newPaidAmount,
      due: Math.max(0, newDueAmount),
      paymentStatus: newPaymentStatus,
      paymentMethod: body.paymentMethod,
      paymentDate: new Date(),
      collectedBy: auth.userId!,
      discount: (charges.discount || 0) + discountAmount,
    };

    let updatedPrescription: any;
    if (newPaymentStatus === "paid") {
      updatedPrescription = await prisma.prescription.update({
        where: { id: prescriptionId },
        data: {
          charges: newCharges,
          paymentStatus: "paid",
          paymentVerified: true,
          paymentVerifiedAt: new Date(),
        },
      });
      console.log(
        `[DEBUG] Payment verified for prescription ${prescription.prescriptionId}: paymentVerified set to true`,
      );
    } else {
      updatedPrescription = await prisma.prescription.update({
        where: { id: prescriptionId },
        data: {
          charges: newCharges,
          paymentStatus: newPaymentStatus,
        },
      });
      console.log(
        `[DEBUG] Payment NOT verified for prescription ${prescription.prescriptionId}: paymentStatus is ${newPaymentStatus}, not 'paid'`,
      );
    }

    console.log(
      `Payment processed for prescription ${prescription.prescriptionId}: ${body.amount} ${body.paymentMethod} by ${auth.userName}`,
    );

    return NextResponse.json({
      success: true,
      data: {
        prescription: updatedPrescription,
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

export async function GET(
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
    if (!auth.userRole || !allowedRoles.includes(auth.userRole)) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden. Only receptionists can view payment details.",
        },
        { status: 403 },
      );
    }

    const { id: prescriptionId } = await params;

    const prescription = await prisma.prescription.findUnique({
      where: { id: prescriptionId },
      include: {
        patient: {
          select: {
            name: true,
            patientId: true,
            phone: true,
            guardian: true,
            dateOfBirth: true,
            gender: true,
          },
        },
        doctor: {
          select: {
            name: true,
            specialization: true,
          },
        },
      },
    });

    if (!prescription) {
      return NextResponse.json(
        { success: false, error: "Prescription not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: prescription,
    });
  } catch (error: any) {
    console.error("Error fetching payment details:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch payment details",
      },
      { status: 500 },
    );
  }
}