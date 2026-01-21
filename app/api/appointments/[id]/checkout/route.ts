// app/api/appointments/[id]/checkout/route.ts
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
    
    // Only admin, receptionist, and doctors can check out patients
    if (!["admin", "receptionist", "doctor"].includes(userRole)) {
      return NextResponse.json(
        { success: false, error: "Forbidden. You don't have permission to check out patients." },
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
    
    // Check if appointment can be checked out
    if (appointment.status !== "checked-in") {
      return NextResponse.json(
        { success: false, error: `Cannot check out appointment with status: ${appointment.status}. Patient must be checked in first.` },
        { status: 400 }
      );
    }
    
    // Check if user is the doctor or has permission
    if (userRole === "doctor" && appointment.doctor.toString() !== userId) {
      return NextResponse.json(
        { success: false, error: "Forbidden. Only the assigned doctor can check out this patient." },
        { status: 403 }
      );
    }
    
    // Check out patient
    await appointment.checkOut();
    
    return NextResponse.json({
      success: true,
      data: appointment,
      message: "Patient checked out successfully",
    });
    
  } catch (error: any) {
    console.error("Error checking out patient:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to check out patient" },
      { status: 500 }
    );
  }
}