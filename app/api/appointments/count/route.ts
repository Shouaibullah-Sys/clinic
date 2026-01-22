// app/api/appointments/count/route.ts

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
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

async function authenticate(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { error: "Unauthorized. No token provided.", status: 401 };
  }

  const token = authHeader.split(" ")[1];
  const payload = await verifyToken(token);
  
  if (!payload) {
    return { error: "Invalid or expired token.", status: 401 };
  }

  return { userId: payload.id as string, userRole: payload.role as string };
}

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    const auth = await authenticate(request);
    if ("error" in auth) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const doctorId = searchParams.get("doctorId");
    const date = searchParams.get("date");
    
    if (!doctorId) {
      return NextResponse.json(
        { success: false, error: "doctorId is required" },
        { status: 400 }
      );
    }
    
    const targetDate = date ? new Date(date) : new Date();
    if (isNaN(targetDate.getTime())) {
      return NextResponse.json(
        { success: false, error: "Invalid date format" },
        { status: 400 }
      );
    }
    
    const count = await Appointment.getAppointmentCountByDate(doctorId, targetDate);
    
    return NextResponse.json({
      success: true,
      count,
      date: targetDate.toISOString().split('T')[0],
    });
    
  } catch (error) {
    console.error("Error getting appointment count:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get appointment count" },
      { status: 500 }
    );
  }
}