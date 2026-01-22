// app/api/appointments/[id]/medicines/route.ts

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { Medicine } from "@/lib/models/Medicine";
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

// POST: Add medicine to appointment
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
        { success: false, error: "Forbidden. You don't have permission to add medicines." },
        { status: 403 }
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
      notes 
    } = body;
    
    // Validation
    if (!name || !dosage || !frequency || !duration || !quantity || !price) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }
    
    // Check if appointment exists
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return NextResponse.json(
        { success: false, error: "Appointment not found" },
        { status: 404 }
      );
    }
    
    // Generate medicine ID
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const random = Math.floor(1000 + Math.random() * 9000);
    const medicineId = `MED${year}${month}${random}`;
    
    // Create medicine
    const medicine = new Medicine({
      medicineId,
      appointment: appointmentId,
      patient: appointment.patient,
      name: name.trim(),
      genericName: genericName?.trim(),
      dosage: dosage.trim(),
      frequency: frequency.trim(),
      duration: duration.trim(),
      quantity: parseInt(quantity),
      price: parseFloat(price),
      total: total || parseFloat(price) * parseInt(quantity),
      status: "prescribed",
      prescribedBy: userId,
      prescribedAt: new Date(),
      notes: notes?.trim(),
    });
    
    await medicine.save();
    
    // Populate response
    await medicine.populate("patient", "name patientId");
    
    return NextResponse.json({
      success: true,
      data: medicine,
      message: "Medicine added successfully"
    }, { status: 201 });
    
  } catch (error: any) {
    console.error("Error adding medicine:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to add medicine" },
      { status: 500 }
    );
  }
}

// GET: Get medicines for appointment
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
    
    const medicines = await Medicine.find({ appointment: appointmentId })
      .populate("patient", "name patientId")
      .sort({ prescribedAt: -1 })
      .lean();
    
    return NextResponse.json({
      success: true,
      data: medicines,
    });
    
  } catch (error) {
    console.error("Error fetching medicines:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch medicines" },
      { status: 500 }
    );
  }
}