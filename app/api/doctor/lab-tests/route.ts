// app/api/doctor/lab-tests/route.ts

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { LabTest } from "@/lib/models/LabTest";
import { Appointment } from "@/lib/models/Appointment";
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

// POST: Doctor orders lab test
export async function POST(request: NextRequest) {
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
    
    // Only doctors can order lab tests
    if (!["doctor", "admin"].includes(userRole)) {
      return NextResponse.json(
        { success: false, error: "Forbidden. Only doctors can order lab tests." },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    const {
      appointmentId,
      testName,
      category,
      description,
      price,
      priority = "routine",
      notes,
      specimenType,
    } = body;
    
    // Validation
    if (!appointmentId || !testName || !category || !price) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: appointmentId, testName, category, and price are required" },
        { status: 400 }
      );
    }
    
    // Check if appointment exists and doctor is the attending doctor
    const appointment = await Appointment.findById(appointmentId)
      .populate("patient", "_id name patientId");
    
    if (!appointment) {
      return NextResponse.json(
        { success: false, error: "Appointment not found" },
        { status: 404 }
      );
    }
    
    // Verify doctor is the attending doctor or admin
    if (appointment.doctor.toString() !== userId && userRole !== "admin") {
      return NextResponse.json(
        { success: false, error: "You can only order tests for your own appointments" },
        { status: 403 }
      );
    }
    
    // Create lab test
    const labTest = new LabTest({
      appointment: appointmentId,
      patient: appointment.patient._id,
      doctor: appointment.doctor,
      testName: testName.trim(),
      category,
      description: description?.trim(),
      price: parseFloat(price),
      priority,
      notes: notes?.trim(),
      specimen: specimenType ? { type: specimenType } : undefined,
      orderedBy: userId,
      orderedAt: new Date(),
      status: "ordered",
    });
    
    await labTest.save();
    
    // Populate response
    await labTest.populate([
      { path: "patient", select: "name patientId phone" },
      { path: "appointment", select: "appointmentId date" },
      { path: "doctor", select: "name specialization" },
      { path: "orderedBy", select: "name" },
    ]);
    
    return NextResponse.json({
      success: true,
      data: labTest,
      message: "Lab test ordered successfully"
    }, { status: 201 });
    
  } catch (error: any) {
    console.error("Error ordering lab test:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to order lab test" },
      { status: 500 }
    );
  }
}

// GET: Doctor views lab tests
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
    
    const userId = payload.id as string;
    const userRole = payload.role as string;
    
    // Only doctors and admin can view
    if (!["doctor", "admin"].includes(userRole)) {
      return NextResponse.json(
        { success: false, error: "Forbidden. Access denied." },
        { status: 403 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const appointmentId = searchParams.get("appointmentId");
    const patientId = searchParams.get("patientId");
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;
    
    let query: any = {};
    
    // Filter by doctor (unless admin)
    if (userRole === "doctor") {
      query.doctor = userId;
    }
    
    // Filter by appointment
    if (appointmentId) {
      query.appointment = appointmentId;
    }
    
    // Filter by patient
    if (patientId) {
      query.patient = patientId;
    }
    
    // Filter by status
    if (status) {
      query.status = status;
    }
    
    // Get lab tests
    const [labTests, total] = await Promise.all([
      LabTest.find(query)
        .populate("patient", "name patientId phone")
        .populate("appointment", "appointmentId date")
        .populate("doctor", "name specialization")
        .sort({ orderedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      LabTest.countDocuments(query),
    ]);
    
    return NextResponse.json({
      success: true,
      data: labTests,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
    
  } catch (error: any) {
    console.error("Error fetching lab tests:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch lab tests" },
      { status: 500 }
    );
  }
}