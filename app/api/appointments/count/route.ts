// app/api/appointments/count/route.ts

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { Appointment } from "@/lib/models/Appointment";
import { jwtVerify } from "jose";
import { startOfDay, endOfDay } from "date-fns";

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

export async function GET(request: NextRequest) {
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
    
    const { searchParams } = new URL(request.url);
    const doctorId = searchParams.get("doctorId");
    const date = searchParams.get("date");
    
    if (!doctorId || !date) {
      return NextResponse.json(
        { success: false, error: "doctorId and date are required" },
        { status: 400 }
      );
    }
    
    const appointmentDate = new Date(date);
    const startOfTargetDay = startOfDay(appointmentDate);
    const endOfTargetDay = endOfDay(appointmentDate);
    
    const count = await Appointment.countDocuments({
      doctor: doctorId,
      startTime: { $gte: startOfTargetDay, $lte: endOfTargetDay },
      status: { $nin: ["cancelled", "no-show"] },
    });
    
    return NextResponse.json({
      success: true,
      count,
      doctorId,
      date,
    });
    
  } catch (error) {
    console.error("Error counting appointments:", error);
    return NextResponse.json(
      { success: false, error: "Failed to count appointments" },
      { status: 500 }
    );
  }
}