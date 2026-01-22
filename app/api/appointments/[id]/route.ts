//app/api/appointments/[id]/route.ts 
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { Appointment } from "@/lib/models/Appointment";
import { Patient } from "@/lib/models/Patient";
import { User } from "@/lib/models/User";
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

// GET: Get single appointment details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // Note: params is a Promise
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
    
    // UNWRAP THE PARAMS PROMISE
    const { id: appointmentId } = await params;
    
    // Get appointment
    const appointment = await Appointment.findById(appointmentId)
      .populate("patient", "name phone email patientId dateOfBirth gender address")
      .populate("doctor", "name specialization department licenseNumber")
      .populate("createdBy", "name")
      .lean();
    
    if (!appointment) {
      return NextResponse.json(
        { success: false, error: "Appointment not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: appointment,
    });
    
  } catch (error: any) {
    console.error("Error fetching appointment:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch appointment" },
      { status: 500 }
    );
  }
}