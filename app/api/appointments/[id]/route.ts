// app/api/appointments/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { Appointment } from "@/lib/models/Appointment";
import { jwtVerify } from "jose";
import mongoose from "mongoose"; // Import mongoose for ObjectId

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

// GET: Get single appointment
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    
    const auth = await authenticate(request);
    if ("error" in auth) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status }
      );
    }
    
    const { userId, userRole } = auth;
    const appointmentId = params.id;
    
    const appointment = await Appointment.findById(appointmentId)
      .populate("patient", "name phone email patientId dateOfBirth gender")
      .populate("doctor", "name specialization department phone email")
      .populate("createdBy", "name")
      .populate("cancelledBy", "name");
    
    if (!appointment) {
      return NextResponse.json(
        { success: false, error: "Appointment not found" },
        { status: 404 }
      );
    }
    
    // Check permissions - Convert strings to ObjectId for comparison
    const isOwner = 
      appointment.doctor._id.toString() === userId ||
      appointment.patient._id.toString() === userId ||
      appointment.createdBy.toString() === userId;
    
    const canView = isOwner || ["admin", "receptionist"].includes(userRole);
    
    if (!canView) {
      return NextResponse.json(
        { success: false, error: "Forbidden. You don't have permission to view this appointment." },
        { status: 403 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: appointment,
    });
    
  } catch (error) {
    console.error("Error fetching appointment:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch appointment" },
      { status: 500 }
    );
  }
}

// PUT: Update appointment
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    
    const auth = await authenticate(request);
    if ("error" in auth) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status }
      );
    }
    
    const { userId, userRole } = auth;
    const appointmentId = params.id;
    
    // Check if appointment exists
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return NextResponse.json(
        { success: false, error: "Appointment not found" },
        { status: 404 }
      );
    }
    
    // Check permissions
    const canUpdate = 
      appointment.doctor.toString() === userId ||
      appointment.createdBy.toString() === userId ||
      ["admin", "receptionist"].includes(userRole);
    
    if (!canUpdate) {
      return NextResponse.json(
        { success: false, error: "Forbidden. You don't have permission to update this appointment." },
        { status: 403 }
      );
    }
    
    // Cannot update cancelled or completed appointments
    if (["cancelled", "completed", "no-show"].includes(appointment.status)) {
      return NextResponse.json(
        { success: false, error: `Cannot update appointment with status: ${appointment.status}` },
        { status: 400 }
      );
    }
    
    const body = await request.json();
    const updates: any = {};
    
    // Allowed fields to update
    const allowedFields = [
      "startTime", "duration", "appointmentType", "reason", 
      "symptoms", "priority", "notes", "department", "status"
    ];
    
    allowedFields.forEach(field => {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    });
    
    // If updating time, check availability
    if (updates.startTime || updates.duration) {
      const newStartTime = updates.startTime ? new Date(updates.startTime) : appointment.startTime;
      const newDuration = updates.duration || appointment.duration;
      
      const isAvailable = await Appointment.checkAvailability(
        appointment.doctor.toString(),
        newStartTime,
        newDuration,
        appointmentId
      );
      
      if (!isAvailable) {
        return NextResponse.json(
          { success: false, error: "Doctor is not available at this time" },
          { status: 409 }
        );
      }
    }
    
    // Update appointment - Convert string userId to ObjectId
    Object.assign(appointment, updates);
    appointment.updatedBy = new mongoose.Types.ObjectId(userId); // Convert string to ObjectId
    await appointment.save();
    
    // Populate response
    await appointment.populate([
      { path: "patient", select: "name phone email patientId" },
      { path: "doctor", select: "name specialization department" },
      { path: "createdBy", select: "name" },
      { path: "updatedBy", select: "name" },
    ]);
    
    return NextResponse.json({
      success: true,
      data: appointment,
      message: "Appointment updated successfully",
    });
    
  } catch (error: any) {
    console.error("Error updating appointment:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update appointment" },
      { status: 500 }
    );
  }
}

// DELETE: Cancel appointment
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    
    const auth = await authenticate(request);
    if ("error" in auth) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status }
      );
    }
    
    const { userId, userRole } = auth;
    const appointmentId = params.id;
    
    // Check if appointment exists
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return NextResponse.json(
        { success: false, error: "Appointment not found" },
        { status: 404 }
      );
    }
    
    // Check permissions
    const canCancel = 
      appointment.doctor.toString() === userId ||
      appointment.createdBy.toString() === userId ||
      ["admin", "receptionist"].includes(userRole);
    
    if (!canCancel) {
      return NextResponse.json(
        { success: false, error: "Forbidden. You don't have permission to cancel this appointment." },
        { status: 403 }
      );
    }
    
    // Cannot cancel already cancelled or completed appointments
    if (["cancelled", "completed"].includes(appointment.status)) {
      return NextResponse.json(
        { success: false, error: `Appointment is already ${appointment.status}` },
        { status: 400 }
      );
    }
    
    const body = await request.json();
    const { reason } = body;
    
    // Cancel appointment - Use the instance method which handles ObjectId conversion
    await appointment.cancel(userId, reason);
    
    // Populate response
    await appointment.populate([
      { path: "patient", select: "name phone email" },
      { path: "doctor", select: "name specialization" },
      { path: "cancelledBy", select: "name" },
    ]);
    
    return NextResponse.json({
      success: true,
      data: appointment,
      message: "Appointment cancelled successfully",
    });
    
  } catch (error: any) {
    console.error("Error cancelling appointment:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to cancel appointment" },
      { status: 500 }
    );
  }
}