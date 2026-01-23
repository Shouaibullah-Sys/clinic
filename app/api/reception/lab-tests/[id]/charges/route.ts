// app/api/reception/lab-tests/[id]/charges/route.ts

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { LabTest } from "@/lib/models/LabTest";
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

// Helper function to safely populate appointment with proper date handling
async function safePopulateLabTest(labTest: any) {
  if (!labTest) return labTest;
  
  // First populate all other fields except appointment
  const populated = await LabTest.populate(labTest, [
    { path: "patient", select: "name patientId phone" },
    { path: "doctor", select: "name specialization" },
    { path: "charges.collectedBy", select: "name" },
  ]);
  
  // Now safely handle appointment population separately
  if (populated.appointment) {
    const Appointment = (await import("@/lib/models/Appointment")).Appointment;
    const appointment = await Appointment.findById(populated.appointment)
      .select("appointmentId date startTime endTime")
      .lean();

    if (appointment) {
      // Convert date strings to Date objects
      (populated as any).appointment = {
        ...appointment,
        date: appointment.date ? new Date(appointment.date) : null,
        startTime: appointment.startTime ? new Date(appointment.startTime) : null,
        endTime: appointment.endTime ? new Date(appointment.endTime) : null,
      };
    }
  }
  
  return populated;
}

// PUT: Update lab test charges (receptionist)
export async function PUT(
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
    
    // Only receptionist and admin can update charges
    if (!["receptionist", "admin"].includes(userRole)) {
      return NextResponse.json(
        { success: false, error: "Forbidden. Only receptionists can update charges." },
        { status: 403 }
      );
    }
    
    const { id: testId } = await params;
    const body = await request.json();
    const {
      tax,
      discount,
      otherCharges,
      paymentMethod,
      paidAmount,
      transactionId,
    } = body;
    
    // Find lab test
    const labTest = await LabTest.findById(testId);
    
    if (!labTest) {
      return NextResponse.json(
        { success: false, error: "Lab test not found" },
        { status: 404 }
      );
    }
    
    // Calculate new paid amount (add to existing paid amount)
    const currentPaid = labTest.charges.paid || 0;
    const newPaidAmount = paidAmount !== undefined ? paidAmount : labTest.charges.paid;
    
    // Update ONLY the charges fields
    const updates: any = {};
    
    if (tax !== undefined) updates["charges.tax"] = parseFloat(tax);
    if (discount !== undefined) updates["charges.discount"] = parseFloat(discount);
    if (otherCharges !== undefined) updates["charges.otherCharges"] = parseFloat(otherCharges);
    if (paymentMethod) updates["charges.paymentMethod"] = paymentMethod;
    if (transactionId) updates["charges.transactionId"] = transactionId;
    
    if (paidAmount !== undefined) {
      updates["charges.paid"] = parseFloat(paidAmount);
      updates["charges.paymentDate"] = new Date();
      updates["charges.collectedBy"] = new mongoose.Types.ObjectId(userId);
    }
    
    // Use findOneAndUpdate to only update the specific fields
    // This prevents validation errors on other fields
    const updatedLabTest = await LabTest.findByIdAndUpdate(
      testId,
      {
        $set: updates,
        $inc: { "charges.totalAmount": 0 } // Force update calculation in pre-save hook
      },
      {
        new: true,
        runValidators: true // Only validate the fields being updated
      }
    );

    if (!updatedLabTest) {
      return NextResponse.json(
        { success: false, error: "Failed to update lab test charges" },
        { status: 500 }
      );
    }
    
    // Safely populate the lab test with proper date handling
    const populatedLabTest = await safePopulateLabTest(updatedLabTest);
    
    return NextResponse.json({
      success: true,
      data: populatedLabTest,
      message: "Lab test charges updated successfully"
    });
    
  } catch (error: any) {
    console.error("Error updating lab test charges:", error);
    
    // Handle specific validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((err: any) => err.message);
      return NextResponse.json(
        { success: false, error: `Validation error: ${errors.join(', ')}` },
        { status: 400 }
      );
    }
    
    if (error.code === 11000) {
      return NextResponse.json(
        { success: false, error: "A duplicate key error occurred" },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update charges" },
      { status: 500 }
    );
  }
}

// GET: Get lab test charges details
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
    
    const userRole = payload.role as string;
    
    // Only receptionist, admin, and doctor can view charges
    if (!["receptionist", "admin", "doctor"].includes(userRole)) {
      return NextResponse.json(
        { success: false, error: "Forbidden. Access denied." },
        { status: 403 }
      );
    }
    
    const { id: testId } = await params;
    
    const labTest = await LabTest.findById(testId)
      .populate("patient", "name patientId phone")
      .populate("doctor", "name specialization")
      .populate("charges.collectedBy", "name")
      .lean();
    
    if (!labTest) {
      return NextResponse.json(
        { success: false, error: "Lab test not found" },
        { status: 404 }
      );
    }
    
    // Safely handle appointment separately
    if (labTest.appointment) {
      const Appointment = (await import("@/lib/models/Appointment")).Appointment;
      const appointment = await Appointment.findById(labTest.appointment)
        .select("appointmentId date startTime endTime")
        .lean();

      if (appointment) {
        // Convert date strings to Date objects
        (labTest as any).appointment = {
          ...appointment,
          date: appointment.date ? new Date(appointment.date) : null,
          startTime: appointment.startTime ? new Date(appointment.startTime) : null,
          endTime: appointment.endTime ? new Date(appointment.endTime) : null,
        };
      }
    }
    
    return NextResponse.json({
      success: true,
      data: labTest,
    });
    
  } catch (error: any) {
    console.error("Error fetching lab test charges:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch charges" },
      { status: 500 }
    );
  }
}