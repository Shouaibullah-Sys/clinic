// app/api/appointments/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { Appointment } from "@/lib/models/Appointment";
import { LabTest } from "@/lib/models/LabTest";
import { Prescription } from "@/lib/models/Prescription";
import { jwtVerify } from "jose";
import mongoose from "mongoose";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this";

async function verifyToken(token: string) {
  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch (error) {
    return null;
  }
}

// GET: Get single appointment details with ALL related data
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await dbConnect();

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

    // UNWRAP THE PARAMS PROMISE
    const { id: appointmentId } = await params;

    console.log(
      `Fetching appointment ${appointmentId} for user ${userId} (${userRole})`,
    );

    // Get appointment with basic info
    const appointment = await Appointment.findById(appointmentId)
      .populate(
        "patient",
        "name phone email patientId dateOfBirth gender address bloodGroup",
      )
      .populate(
        "doctor",
        "name specialization department licenseNumber phone email",
      )
      .populate("createdBy", "name role")
      .lean();

    if (!appointment) {
      return NextResponse.json(
        { success: false, error: "Appointment not found" },
        { status: 404 },
      );
    }

    // Check permissions
    const isDoctorOwner =
      userRole === "doctor" && appointment.doctor?._id?.toString() === userId;
    const isReceptionistOrAdmin = ["receptionist", "admin"].includes(userRole);

    if (!isDoctorOwner && !isReceptionistOrAdmin) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Forbidden. You don't have permission to view this appointment.",
        },
        { status: 403 },
      );
    }

    // IMPORTANT: Fetch ALL lab tests for this appointment
    const labTests = await LabTest.find({
      appointment: new mongoose.Types.ObjectId(appointmentId),
    })
      .populate("patient", "name patientId")
      .populate("doctor", "name")
      .populate("orderedBy", "name")
      .select(
        "testId testName category price discountedPrice status priority specimen charges orderedAt collectedAt completedAt reportedAt notes",
      )
      .sort({ orderedAt: -1 })
      .lean();

    console.log(
      `Found ${labTests.length} lab tests for appointment ${appointmentId}`,
    );

    // Fetch ALL prescriptions for this appointment
    const prescriptions = await Prescription.find({
      appointment: new mongoose.Types.ObjectId(appointmentId),
    })
      .populate("patient", "name patientId")
      .populate("doctor", "name specialization")
      .select(
        "prescriptionId prescribedDate diagnosis medications instructions notes status expiryDate",
      )
      .sort({ prescribedDate: -1 })
      .lean();

    console.log(
      `Found ${prescriptions.length} prescriptions for appointment ${appointmentId}`,
    );

    // Calculate totals for billing
    const labTestsTotal = labTests.reduce((sum, test) => {
      const basePrice = test.discountedPrice || test.price || 0;
      const tax = test.charges?.tax || 0;
      const otherCharges = test.charges?.otherCharges || 0;
      const discount = test.charges?.discount || 0;
      return sum + basePrice + tax + otherCharges - discount;
    }, 0);

    const prescriptionsTotal = prescriptions.reduce((sum, prescription) => {
      if (prescription.medications && Array.isArray(prescription.medications)) {
        return (
          sum +
          prescription.medications.reduce(
            (medSum: number, med: any) =>
              medSum + (med.quantity || 1) * (med.price || 0),
            0,
          )
        );
      }
      return sum;
    }, 0);

    const consultationFee =
      appointment.appointmentType === "emergency"
        ? 150
        : appointment.appointmentType === "procedure"
          ? 200
          : 100;

    const totalAmount = labTestsTotal + prescriptionsTotal + consultationFee;

    // Calculate payment summary
    const paidAmount = labTests.reduce(
      (sum, test) => sum + (test.charges?.paid || 0),
      0,
    );

    const dueAmount = labTests.reduce(
      (sum, test) => sum + (test.charges?.due || 0),
      0,
    );

    return NextResponse.json({
      success: true,
      data: {
        ...appointment,
        labTests, // Make sure this is included
        prescriptions, // Make sure this is included
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
