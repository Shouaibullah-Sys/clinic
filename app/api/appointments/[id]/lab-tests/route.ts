// app/api/appointments/[id]/lab-tests/route.ts

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { LabTest } from "@/lib/models/LabTest";
import { Appointment } from "@/lib/models/Appointment";
import { jwtVerify } from "jose";

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

// POST: Add lab test to appointment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    
    // Authentication
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. No token provided." },
        { status: 401 }
      );
    }
    
    const token = authHeader.split(" ")[1];
    const payload = await verifyToken(token);
    
    if (!payload) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired token." },
        { status: 401 }
      );
    }
    
    const userId = payload.id as string;
    const userRole = payload.role as string;
    
    // Authorization
    if (!["admin", "receptionist", "doctor"].includes(userRole)) {
      return NextResponse.json(
        { success: false, error: "Forbidden. You don't have permission to add lab tests." },
        { status: 403 }
      );
    }
    
    const { id: appointmentId } = await params;
    const body = await request.json();
    const { testName, category, price, notes } = body;
    
    // Validation
    if (!testName || !category || !price) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: testName, category, and price are required" },
        { status: 400 }
      );
    }
    
    // Check if appointment exists
    const appointment = await Appointment.findById(appointmentId)
      .populate("doctor", "name");
    if (!appointment) {
      return NextResponse.json(
        { success: false, error: "Appointment not found" },
        { status: 404 }
      );
    }

    console.log(`Creating lab test for appointment ${appointmentId}, appointment doctor:`, appointment.doctor);
    
    // Generate test ID
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const random = Math.floor(1000 + Math.random() * 9000);
    const testId = `LAB${year}${month}${random}`;
    
    // Create lab test
    const labTest = new LabTest({
      testId,
      appointment: appointmentId,
      patient: appointment.patient,
      testName: testName.trim(),
      category,
      price: parseFloat(price),
      status: "pending",
      orderedBy: userId,
      orderedAt: new Date(),
      notes: notes?.trim(),
    });
    
    await labTest.save();
    
    // Populate response
    await labTest.populate("patient", "name patientId");
    
    return NextResponse.json({
      success: true,
      data: labTest,
      message: "Lab test added successfully"
    }, { status: 201 });
    
  } catch (error: any) {
    console.error("Error adding lab test:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to add lab test" },
      { status: 500 }
    );
  }
}

// GET: Get lab tests for appointment
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    
    // Authentication
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. No token provided." },
        { status: 401 }
      );
    }
    
    const token = authHeader.split(" ")[1];
    const payload = await verifyToken(token);
    
    if (!payload) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired token." },
        { status: 401 }
      );
    }
    
    const { id: appointmentId } = await params;
    
    const labTests = await LabTest.find({ appointment: appointmentId })
      .populate("patient", "name patientId")
      .sort({ orderedAt: -1 })
      .lean();
    
    return NextResponse.json({
      success: true,
      data: labTests,
    });
    
  } catch (error) {
    console.error("Error fetching lab tests:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch lab tests" },
      { status: 500 }
    );
  }
}