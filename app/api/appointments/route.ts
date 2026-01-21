// app/api/appointments/route.ts

import { NextRequest, NextResponse } from "next/server";
import  dbConnect  from "@/lib/dbConnect";
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

// GET: Fetch appointments with filters
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
    
    const { userId, userRole } = auth;
    const { searchParams } = new URL(request.url);
    
    // Build query based on role and filters
    let query: any = {};
    
    // Role-based filtering
    if (userRole === "doctor") {
      query.doctor = userId;
    } else if (userRole === "patient") {
      query.patient = userId;
    }
    // Admin and receptionist can see all appointments
    
    // Date filter
    const date = searchParams.get("date");
    if (date) {
      const targetDate = new Date(date);
      targetDate.setHours(0, 0, 0, 0);
      const nextDate = new Date(targetDate);
      nextDate.setDate(nextDate.getDate() + 1);
      query.startTime = { $gte: targetDate, $lt: nextDate };
    }
    
    // Status filter
    const status = searchParams.get("status");
    if (status && status !== "all") {
      query.status = status;
    }
    
    // Doctor filter
    const doctorId = searchParams.get("doctorId");
    if (doctorId && ["admin", "receptionist"].includes(userRole)) {
      query.doctor = doctorId;
    }
    
    // Patient filter
    const patientId = searchParams.get("patientId");
    if (patientId && ["admin", "receptionist", "doctor", "nurse"].includes(userRole)) {
      query.patient = patientId;
    }
    
    // Exclude cancelled and no-show by default
    if (!status || status === "upcoming") {
      query.status = { $nin: ["cancelled", "no-show", "completed"] };
    }
    
    // Pagination
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;
    
    // Sorting
    const sortBy = searchParams.get("sortBy") || "startTime";
    const sortOrder = searchParams.get("sortOrder") === "desc" ? -1 : 1;
    
    const appointments = await Appointment.find(query)
      .populate("patient", "name phone email patientId")
      .populate("doctor", "name specialization department")
      .populate("createdBy", "name")
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit)
      .lean();
    
    const total = await Appointment.countDocuments(query);
    
    return NextResponse.json({
      success: true,
      data: appointments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
    
  } catch (error) {
    console.error("Error fetching appointments:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch appointments" },
      { status: 500 }
    );
  }
}

// POST: Create new appointment
export async function POST(request: NextRequest) {
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
    
    // Only admin, receptionist, and doctors can create appointments
    if (!["admin", "receptionist", "doctor"].includes(userRole)) {
      return NextResponse.json(
        { success: false, error: "Forbidden. You don't have permission to create appointments." },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    const {
      patientId,
      doctorId,
      startTime,
      duration = 30,
      appointmentType = "consultation",
      reason,
      symptoms,
      priority = "medium",
      notes,
      department,
    } = body;
    
    // Validate required fields
    if (!patientId || !doctorId || !startTime || !reason) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: patientId, doctorId, startTime, and reason are required" },
        { status: 400 }
      );
    }
    
    // Validate patient exists
    const patient = await Patient.findById(patientId);
    if (!patient) {
      return NextResponse.json(
        { success: false, error: "Patient not found" },
        { status: 404 }
      );
    }
    
    // Validate doctor exists and is a doctor
    const doctor = await User.findOne({ _id: doctorId, role: "doctor", active: true });
    if (!doctor) {
      return NextResponse.json(
        { success: false, error: "Doctor not found or inactive" },
        { status: 404 }
      );
    }
    
    // Parse start time
    const appointmentStartTime = new Date(startTime);
    if (isNaN(appointmentStartTime.getTime())) {
      return NextResponse.json(
        { success: false, error: "Invalid start time" },
        { status: 400 }
      );
    }
    
    // Check if doctor is available
    const isAvailable = await Appointment.checkAvailability(
      doctorId,
      appointmentStartTime,
      duration
    );
    
    if (!isAvailable) {
      return NextResponse.json(
        { success: false, error: "Doctor is not available at this time" },
        { status: 409 }
      );
    }
    
    // Calculate end time
    const appointmentEndTime = new Date(appointmentStartTime);
    appointmentEndTime.setMinutes(appointmentEndTime.getMinutes() + duration);
    
    // Create appointment
    const appointment = new Appointment({
      patient: patientId,
      doctor: doctorId,
      department: department || doctor.department,
      appointmentType,
      date: appointmentStartTime,
      startTime: appointmentStartTime,
      endTime: appointmentEndTime,
      duration,
      reason: reason.trim(),
      symptoms: symptoms?.trim(),
      priority,
      notes: notes?.trim(),
      status: "scheduled",
      createdBy: userId,
    });
    
    await appointment.save();
    
    // Populate response
    await appointment.populate([
      { path: "patient", select: "name phone email patientId" },
      { path: "doctor", select: "name specialization department" },
      { path: "createdBy", select: "name" },
    ]);
    
    return NextResponse.json({
      success: true,
      data: appointment,
      message: "Appointment created successfully",
    }, { status: 201 });
    
  } catch (error: any) {
    console.error("Error creating appointment:", error);
    
    if (error.code === 11000) {
      return NextResponse.json(
        { success: false, error: "Appointment with this ID already exists" },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create appointment" },
      { status: 500 }
    );
  }
}