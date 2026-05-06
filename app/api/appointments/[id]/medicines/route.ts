// app/api/appointments/[id]/medicines/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this";

async function verifyToken(token: string) {
  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    return payload as { id: string; role: string };
  } catch (error) {
    return null;
  }
}

function generateMedicineId(): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const random = Math.floor(1000 + Math.random() * 9000);
  return `MED${year}${month}${random}`;
}

// POST: Add medicine to appointment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Authentication
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. No token provided." },
        { status: 401 },
      );
    }

    const token = authHeader.split(" ")[1];
    const payload = await verifyToken(token);

    if (!payload) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired token." },
        { status: 401 },
      );
    }

    const userId = payload.id as string;
    const userRole = payload.role as string;

    // Authorization
    if (!["admin", "receptionist", "doctor"].includes(userRole)) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden. You don't have permission to add medicines.",
        },
        { status: 403 },
      );
    }

    const { id: appointmentId } = await params;
    const body = await request.json();
    const {
      name,
      genericName,
      dosage,
      frequency,
      duration,
      quantity,
      price,
      total,
      notes,
      form,
      route,
    } = body;

    // Validation
    if (!name || !dosage || !frequency || !duration || !quantity || !price) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Check if appointment exists
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
    });
    if (!appointment) {
      return NextResponse.json(
        { success: false, error: "Appointment not found" },
        { status: 404 },
      );
    }

    const totalAmount = total || parseFloat(price) * parseInt(quantity);

    // Create medicine
    const medicine = await prisma.prescribedMedicine.create({
      data: {
        medicineId: generateMedicineId(),
        appointmentId,
        patientId: appointment.patientId,
        name: name.trim(),
        genericName: genericName?.trim(),
        dosage: dosage.trim(),
        frequency: frequency.trim(),
        duration: duration.trim(),
        quantity: parseInt(quantity),
        price: parseFloat(price),
        total: totalAmount,
        status: "prescribed",
        prescribedBy: userId,
        notes: notes?.trim(),
        form: form.trim(),
        route: route.trim(),
      },
      include: {
        patient: {
          select: {
            name: true,
            patientId: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: medicine,
        message: "Medicine added successfully",
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("Error adding medicine:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to add medicine" },
      { status: 500 },
    );
  }
}

// GET: Get medicines for appointment
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Authentication
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. No token provided." },
        { status: 401 },
      );
    }

    const token = authHeader.split(" ")[1];
    const payload = await verifyToken(token);

    if (!payload) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired token." },
        { status: 401 },
      );
    }

    const { id: appointmentId } = await params;

    const medicines = await prisma.prescribedMedicine.findMany({
      where: { appointmentId },
      include: {
        patient: {
          select: {
            name: true,
            patientId: true,
          },
        },
      },
      orderBy: { prescribedAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: medicines,
    });
  } catch (error) {
    console.error("Error fetching medicines:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch medicines" },
      { status: 500 },
    );
  }
}