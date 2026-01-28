import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { RadiologyService } from "@/lib/models/RadiologyService";
import { Appointment } from "@/lib/models/Appointment";
import { ServiceDepartment } from "@/lib/models/ServiceDepartment";
import { authenticateRequest, hasRequiredRole } from "@/lib/auth";
import mongoose from "mongoose";

// GET: Get imaging studies for a patient
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: patientId } = await params;
    
    await dbConnect();
    
    // Authenticate the request using centralized auth
    const auth = await authenticateRequest(request);
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status || 401 }
      );
    }

    // Check if user is a doctor or admin
    const allowedRoles = ["doctor", "admin"];
    if (!hasRequiredRole(auth.userRole, allowedRoles)) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Forbidden. Doctor access required.",
          userRole: auth.userRole,
          allowedRoles: allowedRoles
        },
        { status: 403 }
      );
    }
    
    const userId = auth.userId;
    console.log(`Fetching imaging studies for patient ${patientId} by doctor ${userId}`);
    
    const doctorId = new mongoose.Types.ObjectId(userId);
    
    // Get imaging studies for this patient, ordered by this doctor
    const imagingStudies = await RadiologyService.find({
      patient: patientId,
      referringDoctor: doctorId,
    })
      .select("_id serviceId serviceType bodyPart view requestDate scheduledDate performedDate status priority reportStatus findings impression")
      .populate("referringDoctor", "name")
      .populate("appointment", "appointmentId date")
      .sort({ requestDate: -1 })
      .lean();
    
    console.log(`Found ${imagingStudies.length} imaging studies for patient ${patientId}`);
    
    return NextResponse.json({
      success: true,
      data: imagingStudies,
    });
    
  } catch (error: any) {
    console.error("Error fetching imaging studies:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch imaging studies" },
      { status: 500 }
    );
  }
}

// POST: Order a new imaging study for a patient
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: patientId } = await params;
    
    await dbConnect();
    
    // Authenticate request using centralized auth
    const auth = await authenticateRequest(request);
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status || 401 }
      );
    }

    // Check if user is a doctor or admin
    const allowedRoles = ["doctor", "admin"];
    if (!hasRequiredRole(auth.userRole, allowedRoles)) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Forbidden. Only doctors can order imaging studies.",
          userRole: auth.userRole,
          allowedRoles: allowedRoles
        },
        { status: 403 }
      );
    }
    
    const userId = auth.userId;
    console.log(`Ordering imaging study for patient ${patientId} by doctor ${userId}`);
    
    const body = await request.json();
    const {
      appointmentId,
      serviceType,
      bodyPart,
      view,
      contrastUsed = false,
      contrastType,
      priority = "routine",
      notes,
      scheduledDate,
    } = body;
    
    // Validation
    if (!serviceType || !bodyPart || !view) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: serviceType, bodyPart, and view are required" },
        { status: 400 }
      );
    }
    
    // Validate service type
    const validServiceTypes = ["x-ray", "ct-scan", "mri", "ultrasound"];
    if (!validServiceTypes.includes(serviceType)) {
      return NextResponse.json(
        { success: false, error: `Invalid service type. Must be one of: ${validServiceTypes.join(", ")}` },
        { status: 400 }
      );
    }
    
    // Validate priority
    const validPriorities = ["routine", "urgent", "emergency"];
    if (!validPriorities.includes(priority)) {
      return NextResponse.json(
        { success: false, error: `Invalid priority. Must be one of: ${validPriorities.join(", ")}` },
        { status: 400 }
      );
    }
    
    // Check if appointment exists and belongs to patient (if provided)
    let appointment = null;
    if (appointmentId) {
      appointment = await Appointment.findOne({
        _id: appointmentId,
        patient: patientId,
      });
      
      if (!appointment) {
        return NextResponse.json(
          { success: false, error: "Appointment not found or does not belong to this patient" },
          { status: 404 }
        );
      }
    }
    
    const doctorId = new mongoose.Types.ObjectId(userId);
    
    // Find appropriate department based on service type (optional)
    const department = await ServiceDepartment.findOne({
      name: serviceType,
      status: "active"
    });
    
    // Set scheduled date to tomorrow if not provided
    const scheduledDateTime = scheduledDate
      ? new Date(scheduledDate)
      : new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    // Create imaging study object
    const imagingData: any = {
      patient: patientId,
      referringDoctor: doctorId,
      serviceType,
      bodyPart: bodyPart.trim(),
      view: view.trim(),
      contrastUsed,
      contrastType: contrastType?.trim(),
      requestDate: new Date(),
      scheduledDate: scheduledDateTime,
      priority,
      notes: notes?.trim(),
      status: "scheduled",
      reportStatus: "pending",
      billingStatus: "pending",
      images: [],
      findings: "",
      impression: "",
    };
    
    // Add department if found
    if (department) {
      imagingData.department = department._id;
    }
    
    // Add appointment if provided
    if (appointmentId) {
      imagingData.appointment = appointmentId;
    }
    
    // Create and save imaging study
    const imagingStudy = new RadiologyService(imagingData);
    await imagingStudy.save();
    
    // If appointment exists, update it to reference this imaging study
    if (appointmentId && appointment) {
      await Appointment.findByIdAndUpdate(
        appointmentId,
        { $addToSet: { imagingStudies: imagingStudy._id } },
        { new: true }
      );
    }
    
    // Populate response data
    await imagingStudy.populate([
      { path: "patient", select: "name patientId" },
      { path: "referringDoctor", select: "name specialization" },
      ...(appointmentId ? [{ path: "appointment", select: "appointmentId date" }] : []),
    ]);
    
    console.log(`Imaging study ordered successfully: ${imagingStudy.serviceId} for appointment: ${appointmentId || 'No appointment linked'}`);
    
    return NextResponse.json({
      success: true,
      data: imagingStudy,
      message: "Imaging study ordered successfully",
    }, { status: 201 });
    
  } catch (error: any) {
    console.error("Error ordering imaging study:", error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((err: any) => err.message);
      return NextResponse.json(
        { success: false, error: "Validation failed", details: errors },
        { status: 400 }
      );
    }
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      return NextResponse.json(
        { success: false, error: "Duplicate service ID detected" },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: error.message || "Failed to order imaging study" },
      { status: 500 }
    );
  }
}
