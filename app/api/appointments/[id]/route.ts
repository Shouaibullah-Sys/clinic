// app/api/appointments/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenPayload } from "@/lib/auth/jwt";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getTokenPayload(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { id: appointmentId } = await params;

    console.log(
      `Fetching appointment ${appointmentId} for user ${user.id} (${user.role})`,
    );

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            patientId: true,
            dateOfBirth: true,
            gender: true,
            address: true,
            bloodGroup: true,
          },
        },
        doctor: {
          select: {
            id: true,
            name: true,
            specialization: true,
            department: true,
            licenseNumber: true,
            phone: true,
            email: true,
          },
        },
        createdBy: {
          select: {
            name: true,
            role: true,
          },
        },
      },
    });

    if (!appointment) {
      return NextResponse.json(
        { success: false, error: "Appointment not found" },
        { status: 404 },
      );
    }

    const isDoctorOwner =
      user.role === "doctor" && appointment.doctorId === user.id;
    const isReceptionistOrAdmin = ["receptionist", "admin"].includes(user.role);

    if (!isDoctorOwner && !isReceptionistOrAdmin) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden. You don't have permission to view this appointment.",
        },
        { status: 403 },
      );
    }

    const labTests = await prisma.labTest.findMany({
      where: { appointmentId },
      include: {
        patient: { select: { name: true, patientId: true } },
        doctor: { select: { name: true } },
        createdBy: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    console.log(
      `Found ${labTests.length} lab tests for appointment ${appointmentId}`,
    );

    const prescriptions = await prisma.prescription.findMany({
      where: { appointmentId },
      include: {
        patient: { select: { name: true, patientId: true } },
        doctor: { select: { name: true, specialization: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    console.log(
      `Found ${prescriptions.length} prescriptions for appointment ${appointmentId}`,
    );

    const labTestsTotal = labTests.reduce((sum, test) => {
      const charges = JSON.parse(test.charges || "{}") as { tax?: number; otherCharges?: number; discount?: number };
      const basePrice = test.discountedPrice || test.price || 0;
      const tax = charges?.tax || 0;
      const otherCharges = charges?.otherCharges || 0;
      const discount = charges?.discount || 0;
      return sum + basePrice + tax + otherCharges - discount;
    }, 0);

    const prescriptionsTotal = prescriptions.reduce((sum, prescription) => {
      const medications = JSON.parse(prescription.medications || "[]") as Array<{ quantity?: number; price?: number }>;
      if (medications && Array.isArray(medications)) {
        return (
          sum +
          medications.reduce(
            (medSum, med) =>
              medSum + (med.quantity || 1) * (med.price || 0),
            0,
          )
        );
      }
      return sum;
    }, 0);

    const consultationFee =
      appointment.consultationFee ??
      appointment.doctorFee ??
      (appointment.appointmentType === "emergency"
        ? 150
        : appointment.appointmentType === "procedure"
          ? 200
          : 100);

    const totalAmount = labTestsTotal + prescriptionsTotal + consultationFee;

    const paidAmount = labTests.reduce(
      (sum, test) => {
        const charges = JSON.parse(test.charges || "{}") as { paid?: number };
        return sum + (charges?.paid || 0);
      },
      0,
    );

    const dueAmount = labTests.reduce(
      (sum, test) => {
        const charges = JSON.parse(test.charges || "{}") as { due?: number };
        return sum + (charges?.due || 0);
      },
      0,
    );

    return NextResponse.json({
      success: true,
      data: {
        ...appointment,
        labTests,
        prescriptions,
        billingSummary: {
          consultationFee,
          labTestsTotal,
          prescriptionsTotal,
          totalAmount,
          paidAmount,
          dueAmount,
          paymentStatus:
            dueAmount === 0
              ? "fully_paid"
              : paidAmount > 0
                ? "partially_paid"
                : "pending",
        },
      },
    });
  } catch (error: any) {
    console.error("Error fetching appointment:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch appointment" },
      { status: 500 },
    );
  }
}
