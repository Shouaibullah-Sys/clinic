// app/api/doctor/patients/[id]/appointments/route.ts

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { Appointment } from "@/lib/models/Appointment";
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params for Next.js 16
    const { id: patientId } = await params;
    
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
    
    console.log(`Fetching appointments for patient ${patientId} by doctor ${userId}`);
    
    // Only doctors can access
    if (userRole !== "doctor") {
      return NextResponse.json(
        { success: false, error: "Forbidden. Doctor access required." },
        { status: 403 }
      );
    }
    
    const doctorId = new mongoose.Types.ObjectId(userId);
    
    const appointments = await Appointment.find({
      patient: patientId,
      doctor: doctorId,
    })
      .select("appointmentId date startTime endTime status reason priority notes checkInTime checkOutTime")
      .sort({ startTime: -1 })
      .lean();
    
    console.log(`Found ${appointments.length} appointments`);
    
    return NextResponse.json({
      success: true,
      data: appointments,
    });
    
  } catch (error: any) {
    console.error("Error fetching appointments:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch appointments" },
      { status: 500 }
    );
  }
}