// app/api/appointments/[id]/checkin/route.ts

import { NextRequest, NextResponse } from "next/server";
import  dbConnect  from "@/lib/dbConnect";
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

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    
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
    
    // Only admin and receptionist can check in patients
    if (!["admin", "receptionist"].includes(userRole)) {
      return NextResponse.json(
        { success: false, error: "Forbidden. Only receptionists and admins can check in patients." },
        { status: 403 }
      );
    }
    
    const appointmentId = params.id;
    
    // Check if appointment exists
    const appointment = await Appointment.findById(appointmentId)
      .populate("patient", "name phone")
      .populate("doctor", "name");
    
    if (!appointment) {
      return NextResponse.json(
        { success: false, error: "Appointment not found" },
        { status: 404 }
      );
    }
    
    // Check if appointment can be checked in
    if (!["scheduled", "confirmed"].includes(appointment.status)) {
      return NextResponse.json(
        { success: false, error: `Cannot check in appointment with status: ${appointment.status}` },
        { status: 400 }
      );
    }
    
    // Check in patient
    await appointment.checkIn();
    
    return NextResponse.json({
      success: true,
      data: appointment,
      message: "Patient checked in successfully",
    });
    
  } catch (error: any) {
    console.error("Error checking in patient:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to check in patient" },
      { status: 500 }
    );
  }
}