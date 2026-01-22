// app/api/appointments/route.ts

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { Appointment, IAppointment } from "@/lib/models/Appointment";
import { Patient } from "@/lib/models/Patient";
import { User } from "@/lib/models/User";
import { jwtVerify } from "jose";
import mongoose from "mongoose";
import { startOfDay, endOfDay } from "date-fns";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this";

// Define response interface for appointments with display fields
interface AppointmentResponse {
  id: string;
  appointmentId: string;
  patient: any;
  doctor: any;
  department?: string;
  appointmentType: string;
  date: Date;
  startTime: Date;
  endTime: Date;
  duration: number;
  autoNumber: string;
  status: string;
  reason: string;
  symptoms?: string;
  priority: string;
  notes?: string;
  checkInTime?: Date;
  checkOutTime?: Date;
  waitingTime?: number;
  consultationTime?: number;
  referralSource?: string;
  previousAppointment?: string;
  rescheduledFrom?: string;
  cancelledBy?: any;
  cancelledReason?: string;
  cancelledAt?: Date;
  createdBy: any;
  updatedBy?: any;
  createdAt: Date;
  updatedAt: Date;
  
  // Virtuals
  isPastDue: boolean;
  isToday: boolean;
  isUpcoming: boolean;
  formattedDate: string;
  formattedTime: string;
  timeSlot: string;
  
  // Display fields
  displayStartTime: string;
  displayEndTime: string;
  localStartTime: Date;
  localEndTime: Date;
  localDate?: string;
}

// Helper function to format time
function formatToLocalTime(date: Date): string {
  const localDate = new Date(date);
  
  // Format as 12-hour time with AM/PM
  let hours = localDate.getHours();
  const minutes = localDate.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  
  return `${hours}:${minutes} ${ampm}`;
}

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

// Transform appointment to response format
function transformAppointmentToResponse(appointment: any): AppointmentResponse {
  const appointmentObj = appointment.toObject ? appointment.toObject() : appointment;
  
  return {
    ...appointmentObj,
    id: appointmentObj._id?.toString() || appointmentObj.id,
    displayStartTime: formatToLocalTime(new Date(appointmentObj.startTime)),
    displayEndTime: formatToLocalTime(new Date(appointmentObj.endTime)),
    localStartTime: new Date(appointmentObj.startTime),
    localEndTime: new Date(appointmentObj.endTime),
    localDate: new Date(appointmentObj.startTime).toISOString().split('T')[0],
    // Add virtual fields
    isPastDue: appointmentObj.isPastDue || (new Date() > new Date(appointmentObj.startTime) && appointmentObj.status === "scheduled"),
    isToday: appointmentObj.isToday || (new Date(appointmentObj.startTime).toDateString() === new Date().toDateString()),
    isUpcoming: appointmentObj.isUpcoming || (new Date() < new Date(appointmentObj.startTime) && appointmentObj.status === "scheduled"),
    formattedDate: appointmentObj.formattedDate || new Date(appointmentObj.startTime).toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    }),
    formattedTime: appointmentObj.formattedTime || new Date(appointmentObj.startTime).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    timeSlot: appointmentObj.timeSlot || `${new Date(appointmentObj.startTime).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    })} - ${new Date(appointmentObj.endTime).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    })}`,
  };
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
    
    // Check if it's a specific endpoint request
    const endpoint = searchParams.get("endpoint");
    
    // Handle different GET endpoints
    if (endpoint === "count") {
      return handleGetCount(request, searchParams, auth);
    } else if (endpoint === "next-slot") {
      return handleGetNextSlot(request, searchParams, auth);
    } else if (endpoint === "available-slots") {
      return handleGetAvailableSlots(request, searchParams, auth);
    } else if (endpoint === "check-availability") {
      return handleCheckAvailability(request, searchParams, auth);
    } else {
      // Default: get appointments
      return handleGetAppointments(request, searchParams, auth);
    }
    
  } catch (error) {
    console.error("Error in GET request:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST: Create new appointment with auto-numbering only
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
      duration = 20,
      appointmentType = "consultation",
      reason,
      symptoms,
      priority = "medium",
      notes,
      department,
      autoNumber,
    } = body;
    
    // Validate required fields
    if (!patientId || !doctorId || !reason) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: patientId, doctorId, and reason are required" },
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
    
    // Parse start time (use current time if not provided)
    let appointmentStartTime = new Date();
    if (startTime) {
      appointmentStartTime = new Date(startTime);
      if (isNaN(appointmentStartTime.getTime())) {
        return NextResponse.json(
          { success: false, error: "Invalid start time" },
          { status: 400 }
        );
      }
    }
    
    // Ensure duration is at least 20 minutes
    const appointmentDuration = Math.max(20, duration);
    
    // Calculate end time
    const appointmentEndTime = new Date(appointmentStartTime);
    appointmentEndTime.setMinutes(appointmentEndTime.getMinutes() + appointmentDuration);
    
    // Get appointment date
    const appointmentDate = new Date(appointmentStartTime);
    appointmentDate.setHours(0, 0, 0, 0);
    
    // Get appointment count for the date for auto-numbering
    const appointmentCount = await Appointment.getAppointmentCountByDate(doctorId, appointmentDate);
    const appointmentAutoNumber = autoNumber || (appointmentCount + 1).toString().padStart(3, '0');
    
    // Generate appointment ID
    const generateAppointmentId = () => {
      const date = new Date();
      const year = date.getFullYear().toString().slice(-2);
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      const day = date.getDate().toString().padStart(2, "0");
      const random = Math.floor(100 + Math.random() * 900);
      return `APT${year}${month}${day}${random}`;
    };
    
    const appointmentId = generateAppointmentId();
    
    // Create appointment
    const appointment = new Appointment({
      appointmentId: appointmentId,
      patient: patientId,
      doctor: doctorId,
      department: department || doctor.department,
      appointmentType,
      date: appointmentDate,
      startTime: appointmentStartTime,
      endTime: appointmentEndTime,
      duration: appointmentDuration,
      autoNumber: appointmentAutoNumber,
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
    
    // Transform to response format
    const appointmentResponse = transformAppointmentToResponse(appointment);
    
    return NextResponse.json({
      success: true,
      data: appointmentResponse,
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
    
    if (error.name === 'ValidationError') {
      const errors: string[] = [];
      for (const field in error.errors) {
        errors.push(`${field}: ${error.errors[field].message}`);
      }
      console.error('Validation errors:', errors);
      return NextResponse.json(
        { success: false, error: "Validation failed", details: errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create appointment" },
      { status: 500 }
    );
  }
}

// PATCH: Update appointment
export async function PATCH(request: NextRequest) {
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
    const appointmentId = searchParams.get("id");
    
    if (!appointmentId) {
      return NextResponse.json(
        { success: false, error: "Appointment ID is required" },
        { status: 400 }
      );
    }
    
    const body = await request.json();
    const { status, notes, cancelledReason } = body;
    
    if (!status && !notes && !cancelledReason) {
      return NextResponse.json(
        { success: false, error: "No update data provided" },
        { status: 400 }
      );
    }
    
    // Find appointment
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return NextResponse.json(
        { success: false, error: "Appointment not found" },
        { status: 404 }
      );
    }
    
    // Check permissions
    if (userRole === "doctor" && appointment.doctor.toString() !== userId) {
      return NextResponse.json(
        { success: false, error: "You can only update your own appointments" },
        { status: 403 }
      );
    }
    
    // Update fields
    if (status) {
      // Validate status transition
      const validStatuses = ["scheduled", "confirmed", "checked-in", "in-progress", "completed", "cancelled", "no-show"];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { success: false, error: "Invalid status" },
          { status: 400 }
        );
      }
      
      appointment.status = status;
      
      // Handle cancellation
      if (status === "cancelled") {
        appointment.cancelledBy = new mongoose.Types.ObjectId(userId);
        appointment.cancelledReason = cancelledReason || "Cancelled by user";
        appointment.cancelledAt = new Date();
      }
      
      // Handle check-in
      if (status === "checked-in") {
        appointment.checkInTime = new Date();
      }
      
      // Handle completion
      if (status === "completed") {
        appointment.checkOutTime = new Date();
      }
    }
    
    if (notes !== undefined) {
      appointment.notes = notes.trim();
    }
    
    appointment.updatedBy = new mongoose.Types.ObjectId(userId);
    await appointment.save();
    
    // Populate response
    await appointment.populate([
      { path: "patient", select: "name phone email patientId" },
      { path: "doctor", select: "name specialization department" },
    ]);
    
    // Transform to response format
    const appointmentResponse = transformAppointmentToResponse(appointment);
    
    return NextResponse.json({
      success: true,
      data: appointmentResponse,
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

// DELETE: Cancel an appointment
export async function DELETE(request: NextRequest) {
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
    const appointmentId = searchParams.get("id");
    
    if (!appointmentId) {
      return NextResponse.json(
        { success: false, error: "Appointment ID is required" },
        { status: 400 }
      );
    }
    
    // Find appointment
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return NextResponse.json(
        { success: false, error: "Appointment not found" },
        { status: 404 }
      );
    }
    
    // Check permissions
    const canCancel = 
      userRole === "admin" || 
      userRole === "receptionist" ||
      (userRole === "doctor" && appointment.doctor.toString() === userId) ||
      (userRole === "patient" && appointment.patient.toString() === userId);
    
    if (!canCancel) {
      return NextResponse.json(
        { success: false, error: "You don't have permission to cancel this appointment" },
        { status: 403 }
      );
    }
    
    // Cancel appointment
    appointment.status = "cancelled";
    appointment.cancelledBy = new mongoose.Types.ObjectId(userId);
    appointment.cancelledAt = new Date();
    appointment.cancelledReason = "Cancelled by user";
    appointment.updatedBy = new mongoose.Types.ObjectId(userId);
    
    await appointment.save();
    
    return NextResponse.json({
      success: true,
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

// Helper functions for different GET endpoints
async function handleGetAppointments(
  request: NextRequest,
  searchParams: URLSearchParams,
  auth: any
) {
  const { userId, userRole } = auth;
  
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
    if (status === "upcoming") {
      query.status = { $nin: ["cancelled", "no-show", "completed"] };
      query.startTime = { $gte: new Date() };
    } else if (status === "past") {
      query.startTime = { $lt: new Date() };
      query.status = { $nin: ["cancelled"] };
    } else {
      query.status = status;
    }
  } else {
    // Default: exclude cancelled and no-show
    query.status = { $nin: ["cancelled", "no-show"] };
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
  
  // Search by autoNumber or appointmentId
  const search = searchParams.get("search");
  if (search) {
    const searchRegex = new RegExp(search, "i");
    query.$or = [
      { appointmentId: searchRegex },
      { autoNumber: searchRegex },
      { reason: searchRegex },
    ];
  }
  
  // Pagination
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");
  const skip = (page - 1) * limit;
  
  // Sorting
  const sortBy = searchParams.get("sortBy") || "startTime";
  const sortOrder = searchParams.get("sortOrder") === "desc" ? -1 : 1;
  
  // Build population paths
  const populatePaths = [
    { path: "patient", select: "name phone email patientId dateOfBirth gender" },
    { path: "doctor", select: "name specialization department phone" },
    { path: "createdBy", select: "name" },
  ];
  
  const appointments = await Appointment.find(query)
    .populate(populatePaths)
    .sort({ [sortBy]: sortOrder })
    .skip(skip)
    .limit(limit)
    .lean();
  
  // Transform appointments to response format
  const transformedAppointments = appointments.map(transformAppointmentToResponse);
  
  const total = await Appointment.countDocuments(query);
  
  return NextResponse.json({
    success: true,
    data: transformedAppointments,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
}

async function handleGetCount(
  request: NextRequest,
  searchParams: URLSearchParams,
  auth: any
) {
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
}

async function handleGetNextSlot(
  request: NextRequest,
  searchParams: URLSearchParams,
  auth: any
) {
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
      displayStartTime: formatToLocalTime(nextSlot.startTime),
      displayEndTime: formatToLocalTime(nextSlot.endTime),
    },
  });
}

async function handleGetAvailableSlots(
  request: NextRequest,
  searchParams: URLSearchParams,
  auth: any
) {
  const doctorId = searchParams.get("doctorId");
  const date = searchParams.get("date");
  const duration = parseInt(searchParams.get("duration") || "20");
  const limit = parseInt(searchParams.get("limit") || "10");
  
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
  
  const slots = await Appointment.getAvailableSlots(doctorId, targetDate, duration, limit);
  
  return NextResponse.json({
    success: true,
    data: slots.map(slot => ({
      startTime: slot.startTime.toISOString(),
      endTime: slot.endTime.toISOString(),
      formattedTime: slot.formattedTime,
      autoNumber: slot.autoNumber,
      displayStartTime: formatToLocalTime(slot.startTime),
      displayEndTime: formatToLocalTime(slot.endTime),
    })),
    count: slots.length,
  });
}

async function handleCheckAvailability(
  request: NextRequest,
  searchParams: URLSearchParams,
  auth: any
) {
  const doctorId = searchParams.get("doctorId");
  const startTime = searchParams.get("startTime");
  const duration = parseInt(searchParams.get("duration") || "20");
  
  if (!doctorId || !startTime) {
    return NextResponse.json(
      { success: false, error: "doctorId and startTime are required" },
      { status: 400 }
    );
  }
  
  const appointmentStartTime = new Date(startTime);
  if (isNaN(appointmentStartTime.getTime())) {
    return NextResponse.json(
      { success: false, error: "Invalid start time format" },
      { status: 400 }
    );
  }
  
  const isAvailable = await Appointment.checkAvailability(
    doctorId,
    appointmentStartTime,
    duration
  );
  
  return NextResponse.json({
    success: true,
    data: {
      isAvailable,
      startTime: appointmentStartTime.toISOString(),
      duration,
      displayStartTime: formatToLocalTime(appointmentStartTime),
    },
  });
}