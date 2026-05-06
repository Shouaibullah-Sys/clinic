import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenPayload } from "@/lib/auth/jwt";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const payload = await getTokenPayload(request);
    if (!payload || !["admin", "doctor", "nurse"].includes(payload.role)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const admission = await prisma.admission.findUnique({
      where: { id },
      include: {
        patient: { select: { patientId: true, name: true } },
        doctor: { select: { name: true, specialization: true } },
      },
    });

    if (!admission) {
      return NextResponse.json({ success: false, error: "Admission not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: admission });
  } catch (error) {
    console.error("Error fetching admission:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch admission" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const payload = await getTokenPayload(request);
    if (!payload || !["admin", "doctor", "nurse"].includes(payload.role)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const userRole = payload.role;
    const userId = payload.id;

    if (!["admin", "doctor", "nurse"].includes(userRole)) {
      return NextResponse.json({ success: false, error: "Insufficient permissions" }, { status: 403 });
    }

    const { id } = await params;
    const admission = await prisma.admission.findUnique({ where: { id } });
    if (!admission) {
      return NextResponse.json({ success: false, error: "Admission not found" }, { status: 404 });
    }

    let updateData: any = { ...body };

    if (body.status === "discharged") {
      if (!["admin", "doctor"].includes(userRole)) {
        return NextResponse.json({ success: false, error: "Only admin or doctor can discharge patients" }, { status: 403 });
      }
      if (!body.dischargeSummary) {
        return NextResponse.json({ success: false, error: "Discharge summary is required" }, { status: 400 });
      }
      updateData.dischargeDate = new Date();
      updateData.status = "discharged";
    }

    const updatedAdmission = await prisma.admission.update({
      where: { id },
      data: updateData,
      include: {
        patient: { select: { patientId: true, name: true } },
        doctor: { select: { name: true, specialization: true } },
      },
    });

    return NextResponse.json({ success: true, data: updatedAdmission });
  } catch (error) {
    console.error("Error updating admission:", error);
    return NextResponse.json({ success: false, error: "Failed to update admission" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const payload = await getTokenPayload(request);
    if (!payload || payload.role !== "admin") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const admission = await prisma.admission.findUnique({ where: { id } });
    if (!admission) {
      return NextResponse.json({ success: false, error: "Admission not found" }, { status: 404 });
    }

    if (admission.status === "admitted") {
      return NextResponse.json({ success: false, error: "Cannot delete active admission" }, { status: 400 });
    }

    await prisma.admission.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Admission deleted successfully" });
  } catch (error) {
    console.error("Error deleting admission:", error);
    return NextResponse.json({ success: false, error: "Failed to delete admission" }, { status: 500 });
  }
}