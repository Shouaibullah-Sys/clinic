import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenPayload } from "@/lib/auth/jwt";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await getTokenPayload(request);
    if (!payload) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const allowedRoles = ["receptionist", "radiologist", "technician", "admin"];
    if (!allowedRoles.includes(payload.role)) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Forbidden. Only authorized staff can verify payments.",
          userRole: payload.role,
          allowedRoles: allowedRoles
        },
        { status: 403 }
      );
    }

    const { id: serviceId } = await params;
    const userId = payload.id;
    const body = await request.json();
    const { verify = true, notes } = body;

    const radiologyService = await prisma.radiologyRequest.findUnique({
      where: { id: serviceId },
    });

    if (!radiologyService) {
      return NextResponse.json(
        { success: false, error: "Radiology service not found" },
        { status: 404 }
      );
    }

    if (radiologyService.status === "cancelled") {
      return NextResponse.json(
        { success: false, error: "Cannot verify payment for cancelled service" },
        { status: 400 }
      );
    }

    if (radiologyService.paymentVerified && verify) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Payment is already verified",
          alreadyVerified: true 
        },
        { status: 400 }
      );
    }

    let updatedService;
    let message;

    if (verify) {
      updatedService = await prisma.radiologyRequest.update({
        where: { id: serviceId },
        data: {
          paymentVerified: true,
          paymentVerifiedBy: userId,
          paymentVerifiedAt: new Date(),
          billingStatus: "paid",
        },
      });
      message = "Payment verified successfully";
    } else {
      updatedService = await prisma.radiologyRequest.update({
        where: { id: serviceId },
        data: {
          paymentVerified: false,
          paymentVerifiedBy: null,
          paymentVerifiedAt: null,
          billingStatus: "pending",
        },
      });
      message = "Payment verification removed";
    }

    const populatedService = await prisma.radiologyRequest.findUnique({
      where: { id: serviceId },
      include: {
        patient: { select: { name: true, patientId: true, phone: true } },
        referringDoctor: { select: { name: true, specialization: true } },
      },
    });

    return NextResponse.json({
      success: true,
      data: populatedService,
      message,
    });

  } catch (error: any) {
    console.error("Error verifying payment:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to verify payment" },
      { status: 500 }
    );
  }
}