// app/api/reception/lab-tests/[id]/charges/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/auth";

function verifyToken(token: string) {
  return null;
}

async function getLabTestWithPopulatedFields(labTest: any, populateAppointment: boolean = false) {
  if (!labTest) return labTest;

  const populated = {
    ...labTest,
  };

  return populated;
}

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

    if (!["receptionist", "admin"].includes(auth.userRole || "")) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden. Only receptionists can process payments.",
        },
        { status: 403 },
      );
    }

    const { id: testId } = await params;
    const body = await request.json();
    const {
      tax,
      discount,
      otherCharges,
      paymentMethod,
      paidAmount,
      transactionId,
      verifyPayment = true,
      price,
    } = body;

    const labTest = await prisma.labTest.findUnique({
      where: { id: testId },
    });

    if (!labTest) {
      return NextResponse.json(
        { success: false, error: "Lab test not found" },
        { status: 404 },
      );
    }

    if (labTest.status === "cancelled") {
      return NextResponse.json(
        { success: false, error: "Cannot process payment for cancelled test" },
        { status: 400 },
      );
    }

    if (price !== undefined) {
      const parsedPrice = parseFloat(price);
      if (isNaN(parsedPrice) || parsedPrice < 0) {
        return NextResponse.json(
          {
            success: false,
            error: "Price must be a valid number greater than or equal to 0",
          },
          { status: 400 },
        );
      }
    }

    const charges = labTest.charges as any;
    const currentPaid = charges.paid || 0;
    const newPaidAmount =
      paidAmount !== undefined ? parseFloat(paidAmount) : currentPaid;

    const effectivePrice =
      price !== undefined
        ? parseFloat(price)
        : (labTest.discountedPrice || labTest.price || 0);
    const totalAmount = effectivePrice;

    if (newPaidAmount > totalAmount) {
      return NextResponse.json(
        {
          success: false,
          error: `Payment amount (${newPaidAmount}) exceeds total amount (${totalAmount})`,
          maxAllowed: totalAmount,
        },
        { status: 400 },
      );
    }

    const newCharges = {
      ...charges,
      paid: newPaidAmount,
      totalAmount: totalAmount,
      paymentDate: new Date(),
      collectedById: auth.userId,
      ...(tax !== undefined && { tax: parseFloat(tax) }),
      ...(discount !== undefined && { discount: parseFloat(discount) }),
      ...(otherCharges !== undefined && { otherCharges: parseFloat(otherCharges) }),
      ...(paymentMethod && { paymentMethod }),
      ...(transactionId && { transactionId }),
    };

    let updatedLabTest: any;
    let message: string;

    const isFullyPaid = newPaidAmount >= totalAmount;

    if (isFullyPaid && verifyPayment) {
      updatedLabTest = await prisma.labTest.update({
        where: { id: testId },
        data: {
          charges: newCharges,
          paymentVerified: true,
          paymentVerifiedById: auth.userId,
          paymentVerifiedAt: new Date(),
          ...(price !== undefined && { price: parseFloat(price) }),
        },
      });
      message = "Payment verified successfully";
    } else {
      updatedLabTest = await prisma.labTest.update({
        where: { id: testId },
        data: {
          charges: newCharges,
          ...(price !== undefined && { price: parseFloat(price) }),
        },
      });
      message = "Payment processed successfully";
    }

    console.log(
      `Payment processed for test ${testId}: paid=${updatedLabTest.charges.paid}, paymentStatus=${updatedLabTest.charges.paymentStatus}, paymentVerified=${updatedLabTest.paymentVerified}`,
    );

    const canCollectSample =
      updatedLabTest.status !== "cancelled" &&
      (updatedLabTest.paymentVerified || updatedLabTest.priority !== "routine") &&
      ["pending", "scheduled"].includes(updatedLabTest.collectionStatus);

    return NextResponse.json({
      success: true,
      data: updatedLabTest,
      paymentStatus: {
        paid: updatedLabTest.charges.paid,
        due: updatedLabTest.charges.due,
        total: updatedLabTest.charges.totalAmount,
        isFullyPaid: updatedLabTest.charges.paid >= updatedLabTest.charges.totalAmount,
        paymentVerified: updatedLabTest.paymentVerified,
      },
      collectionInfo: {
        canCollectSample,
        message: canCollectSample
          ? "Payment verified. Sample can now be collected."
          : "Payment verified but sample collection not yet available.",
        requiresPaymentVerification:
          !updatedLabTest.paymentVerified && updatedLabTest.priority === "routine",
      },
      message,
    });
  } catch (error: any) {
    console.error("Error processing payment:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process payment" },
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

    if (!["receptionist", "admin", "doctor"].includes(auth.userRole || "")) {
      return NextResponse.json(
        { success: false, error: "Forbidden. Access denied." },
        { status: 403 },
      );
    }

    const { id: testId } = await params;

    const labTest = await prisma.labTest.findUnique({
      where: { id: testId },
      include: {
        patient: {
          select: {
            name: true,
            patientId: true,
            phone: true,
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

    if (!labTest) {
      return NextResponse.json(
        { success: false, error: "Lab test not found" },
        { status: 404 },
      );
    }

    const canCollectSample =
      labTest.status !== "cancelled" &&
      (labTest.paymentVerified || labTest.priority !== "routine") &&
      ["pending", "scheduled"].includes(labTest.collectionStatus);

    return NextResponse.json({
      success: true,
      data: labTest,
      collectionEligibility: {
        canCollectSample,
        requiresPaymentVerification:
          !labTest.paymentVerified && labTest.priority === "routine",
        paymentStatus: (labTest.charges as any).paymentStatus,
        paymentVerified: labTest.paymentVerified,
        priority: labTest.priority,
      },
    });
  } catch (error: any) {
    console.error("Error fetching lab test charges:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch charges" },
      { status: 500 },
    );
  }
}

export async function PATCH(
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

    if (!["receptionist", "lab_technician", "admin"].includes(auth.userRole || "")) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden. Only authorized staff can verify payments.",
        },
        { status: 403 },
      );
    }

    const { id: testId } = await params;
    const body = await request.json();
    const { verify = true, notes, paymentMethod, transactionId } = body;

    const labTest = await prisma.labTest.findUnique({
      where: { id: testId },
    });

    if (!labTest) {
      return NextResponse.json(
        { success: false, error: "Lab test not found" },
        { status: 404 },
      );
    }

    if (labTest.status === "cancelled") {
      return NextResponse.json(
        { success: false, error: "Cannot verify payment for cancelled test" },
        { status: 400 },
      );
    }

    let updatedTest: any;
    let message: string;

    if (verify) {
      const updates: any = {
        paymentVerified: true,
        paymentVerifiedById: auth.userId,
        paymentVerifiedAt: new Date(),
      };

      if (paymentMethod) {
        const charges = labTest.charges as any;
        updates.charges = {
          ...charges,
          paymentMethod,
          ...(transactionId && { transactionId }),
        };
      }

      updatedTest = await prisma.labTest.update({
        where: { id: testId },
        data: updates,
      });

      message = "Payment verified successfully";
    } else {
      const charges = labTest.charges as any;
      updatedTest = await prisma.labTest.update({
        where: { id: testId },
        data: {
          paymentVerified: false,
          paymentVerifiedById: null,
          paymentVerifiedAt: null,
          charges: {
            ...charges,
            paymentMethod: null,
            transactionId: null,
          },
        },
      });
      message = "Payment verification removed";
    }

    return NextResponse.json({
      success: true,
      data: updatedTest,
      message,
    });
  } catch (error: any) {
    console.error("Error manually verifying payment:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to verify payment" },
      { status: 500 },
    );
  }
}