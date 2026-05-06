import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenPayload } from "@/lib/auth/jwt";

const hasRequiredRole = (userRole: string | undefined, allowedRoles: string[]) => {
  if (!userRole) return false;
  return allowedRoles.includes(userRole);
};

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const payload = await getTokenPayload(request);
    if (!payload) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const allowedRoles = ["receptionist", "admin", "radiologist", "technician"];
    if (!hasRequiredRole(payload.role, allowedRoles)) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden. Only authorized staff can update charges.",
          userRole: payload.role,
          allowedRoles: allowedRoles,
        },
        { status: 403 },
      );
    }

    const { id: serviceId } = await params;
    const userId = payload.id;
    const body = await request.json();
    const {
      basePrice,
      tax = 0,
      discount = 0,
      otherCharges = 0,
      paidAmount,
      paymentMethod,
      transactionId,
    } = body;

    const radiologyService = await prisma.radiologyRequest.findUnique({
      where: { id: serviceId },
    });

    if (!radiologyService) {
      return NextResponse.json(
        { success: false, error: "Radiology service not found" },
        { status: 404 },
      );
    }

    if (radiologyService.status === "cancelled") {
      return NextResponse.json(
        {
          success: false,
          error: "Cannot update charges for cancelled service",
        },
        { status: 400 },
      );
    }

    const charges = JSON.parse(radiologyService.charges || "{}");
    
    const effectiveBasePrice =
      basePrice !== undefined
        ? basePrice
        : charges.basePrice > 0
          ? charges.basePrice
          : paidAmount || 0;
    const totalAmount = effectiveBasePrice + tax + otherCharges - discount;

    const currentPaid = charges.paid || 0;
    const newPaid = paidAmount !== undefined ? paidAmount : currentPaid;
    const due = Math.max(0, totalAmount - newPaid);

    let paymentStatus: "pending" | "partial" | "paid" | "cancelled" = "pending";
    if (due === 0 && totalAmount > 0) {
      paymentStatus = "paid";
    } else if (newPaid > 0) {
      paymentStatus = "partial";
    }

    const updatedCharges = {
      ...charges,
      basePrice: effectiveBasePrice,
      tax,
      discount,
      otherCharges,
      totalAmount,
      paid: newPaid,
      due,
      paymentStatus,
      ...(paymentMethod && { paymentMethod }),
      ...(transactionId && { transactionId }),
    };

    const updatedService = await prisma.radiologyRequest.update({
      where: { id: serviceId },
      data: {
        charges: JSON.stringify(updatedCharges),
        paymentVerified: paymentStatus === "paid",
        paymentVerifiedBy: paymentStatus === "paid" ? userId : undefined,
        paymentVerifiedAt: paymentStatus === "paid" ? new Date() : undefined,
        billingStatus: paymentStatus === "paid" ? "paid" : "billed",
      },
    });

    const populatedService = await prisma.radiologyRequest.findUnique({
      where: { id: serviceId },
      include: {
        patient: { select: { name: true, patientId: true, phone: true } },
        referringDoctor: { select: { name: true, specialization: true } },
        radiologist: { select: { name: true } },
        technician: { select: { name: true } },
      },
    });

    return NextResponse.json({
      success: true,
      data: populatedService,
      message: "Charges updated successfully",
    });
  } catch (error: any) {
    console.error("Error updating radiology service charges:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update charges" },
      { status: 500 },
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const payload = await getTokenPayload(request);
    if (!payload) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { id: serviceId } = await params;

    const radiologyService = await prisma.radiologyRequest.findUnique({
      where: { id: serviceId },
      include: {
        patient: { select: { name: true, patientId: true, phone: true } },
        referringDoctor: { select: { name: true, specialization: true } },
      },
    });

    if (!radiologyService) {
      return NextResponse.json(
        { success: false, error: "Radiology service not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: radiologyService,
    });
  } catch (error: any) {
    console.error("Error fetching radiology service charges:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch charges" },
      { status: 500 },
    );
  }
}