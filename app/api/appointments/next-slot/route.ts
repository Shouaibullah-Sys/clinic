// app/api/appointments/next-slot/route.ts
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
    const duration = parseInt(searchParams.get("duration") || "20");
    
    if (!doctorId || !date) {
      return NextResponse.json(
        { success: false, error: "doctorId and date are required" },
        { status: 400 }
      );
    }
    
    const targetDate = new Date(date);
    if (isNaN(targetDate.getTime())) {
      return NextResponse.json(
        { success: false, error: "Invalid date format" },
        { status: 400 }
      );
    }
    
    const nextSlot = await Appointment.getNextAvailableSlot(doctorId, targetDate, duration);
    
    if (!nextSlot) {
      return NextResponse.json({
        success: true,
        data: null,
        message: "No available slots found for the selected date",
      });
    }
    
    return NextResponse.json({
      success: true,
      data: {
        startTime: nextSlot.startTime.toISOString(),
        endTime: nextSlot.endTime.toISOString(),
        formattedTime: nextSlot.formattedTime,
        autoNumber: nextSlot.autoNumber,
      },
    });
    
  } catch (error) {
    console.error("Error getting next available slot:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get next available slot" },
      { status: 500 }
    );
  }
}