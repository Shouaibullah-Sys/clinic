import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenPayload } from "@/lib/auth/jwt";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: patientId } = await params;
    const user = await getTokenPayload(request);
    if (!user || user.role !== "doctor") {
      return NextResponse.json(
        { success: false, error: "Doctor access required" },
        { status: 403 }
      );
    }

    const prescriptions = await prisma.prescription.findMany({
      where: {
        patientId: patientId,
        doctorId: user.id,
      },
      orderBy: { date: "desc" },
      include: {
        doctor: { select: { name: true } },
        appointment: { select: { appointmentId: true, date: true } },
      },
    });

    return NextResponse.json({ success: true, data: prescriptions });
  } catch (error: any) {
    console.error("Error fetching prescriptions:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch prescriptions" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: patientId } = await params;
    const user = await getTokenPayload(request);
    if (!user || !["doctor", "admin"].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: "Doctor access required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { appointmentId, diagnosis, medications, instructions, followUpDate, validityDays = 7 } = body;

    if (!medications || !Array.isArray(medications) || medications.length === 0) {
      return NextResponse.json(
        { success: false, error: "At least one medication is required" },
        { status: 400 }
      );
    }

    if (diagnosis && diagnosis.trim()) {
      const existingPrescription = await prisma.prescription.findFirst({
        where: {
          patientId: patientId,
          doctorId: user.id,
          diagnosis: { contains: diagnosis.trim() },
          date: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      });

      if (existingPrescription) {
        return NextResponse.json(
          {
            success: false,
            error: "A prescription with similar diagnosis was already created for this patient in the last 24 hours.",
            existingPrescriptionId: existingPrescription.id,
          },
          { status: 400 }
        );
      }
    }

    const validatedMedications = medications.map((med: any) => ({
      medicine: med._id || med.medicine,
      name: med.name.trim(),
      form: med.form.trim(),
      dosage: med.dosage.toString().trim(),
      frequency: med.frequency.toString().trim(),
      duration: med.duration.toString().trim(),
      instructions: med.instructions?.toString().trim() || "",
      quantity: med.quantity ? parseInt(med.quantity) || 1 : 1,
      price: med.price ? parseFloat(med.price) || 0 : 0,
      route: (med.route?.toString().trim() || "oral").toLowerCase(),
      refills: med.refills ? parseInt(med.refills) || 0 : 0,
    }));

    if (appointmentId) {
      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
      });
      if (!appointment || appointment.patientId !== patientId) {
        return NextResponse.json(
          { success: false, error: "Appointment not found or does not belong to this patient" },
          { status: 404 }
        );
      }
    }

    const prescriptionId = `RX${new Date().getFullYear().toString().slice(-2)}${String(new Date().getMonth() + 1).padStart(2, "0")}${Math.floor(1000 + Math.random() * 9000)}`;

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + (parseInt(validityDays) || 7));

    const prescription = await prisma.prescription.create({
      data: {
        prescriptionId,
        patientId,
        doctorId: user.id,
        diagnosis: diagnosis || "",
        medications: JSON.stringify(validatedMedications),
        instructions: instructions || "",
        notes: "",
        status: "active",
        date: new Date(),
        expiryDate,
        appointmentId,
        followUpDate: followUpDate ? new Date(followUpDate) : null,
        createdById: user.id,
      },
    });

    return NextResponse.json(
      { success: true, data: prescription, message: "Prescription created successfully" },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating prescription:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create prescription" },
      { status: 500 }
    );
  }
}