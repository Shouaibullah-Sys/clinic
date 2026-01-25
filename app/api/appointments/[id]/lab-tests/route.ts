// app/api/appointments/[id]/lab-tests/route.ts
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { LabTest } from "@/lib/models/LabTest";
import { jwtVerify } from "jose";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this";

async function verifyToken(token: string) {
  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch {
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: appointmentId } = await params;
    
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
    
    // Only receptionists, doctors, and admins can access
    if (!["receptionist", "doctor", "admin"].includes(userRole)) {
      return NextResponse.json(
        { success: false, error: "Forbidden. Insufficient permissions." },
        { status: 403 }
      );
    }
    
    // Get lab tests for this specific appointment
    const labTests = await LabTest.find({ appointment: appointmentId })
      .populate("patient", "name patientId")
      .populate("doctor", "name specialization")
      .populate("orderedBy", "name")
      .select("testId testName category description price discountedPrice status priority specimen charges orderedAt collectedAt completedAt reportedAt")
      .sort({ orderedAt: -1 })
      .lean();
    
    return NextResponse.json({
      success: true,
      data: labTests,
    });
    
  } catch (error: any) {
    console.error("Error fetching appointment lab tests:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch lab tests" },
      { status: 500 }
    );
  }
}