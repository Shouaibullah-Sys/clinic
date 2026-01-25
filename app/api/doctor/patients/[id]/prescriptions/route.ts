// app/api/doctor/patients/[id]/prescriptions/route.ts - UPDATED

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { Prescription } from "@/lib/models/Prescription";
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params for Next.js 16
    const { id: patientId } = await params;
    
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
    
    console.log(`Fetching prescriptions for patient ${patientId} by doctor ${userId}`);
    
    // Only doctors can access
    if (userRole !== "doctor") {
      return NextResponse.json(
        { success: false, error: "Forbidden. Doctor access required." },
        { status: 403 }
      );
    }
    
    const doctorId = new mongoose.Types.ObjectId(userId);
    
    const prescriptions = await Prescription.find({
      patient: patientId,
      doctor: doctorId,
    })
      .select("prescriptionId prescribedDate medications diagnosis instructions notes status expiryDate")
      .populate("doctor", "name specialization")
      .sort({ prescribedDate: -1 })
      .lean();
    
    console.log(`Found ${prescriptions.length} prescriptions`);
    
    return NextResponse.json({
      success: true,
      data: prescriptions,
    });
    
  } catch (error: any) {
    console.error("Error fetching prescriptions:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch prescriptions" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params for Next.js 16
    const { id: patientId } = await params;
    
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
    
    console.log(`Creating prescription for patient ${patientId} by doctor ${userId}`);
    
    // Only doctors can create prescriptions
    if (userRole !== "doctor") {
      return NextResponse.json(
        { success: false, error: "Forbidden. Doctor access required." },
        { status: 403 }
      );
    }
    
    // Check if request body can be parsed
    let body;
    try {
      body = await request.json();
    } catch (jsonError) {
      console.error("JSON parse error:", jsonError);
      return NextResponse.json(
        { success: false, error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }
    
    const {
      appointmentId,
      diagnosis,
      medications,
      notes,
      patientInstructions,
      followUpDate,
      validityDays = 7,
    } = body;
    
    // Validation
    if (!diagnosis) {
      return NextResponse.json(
        { success: false, error: "Diagnosis is required" },
        { status: 400 }
      );
    }
    
    if (!medications || !Array.isArray(medications) || medications.length === 0) {
      return NextResponse.json(
        { success: false, error: "At least one medication is required" },
        { status: 400 }
      );
    }
    
    // Validate each medication
    const validatedMedications = medications.map((med: any, index: number) => {
      if (!med.name || !med.dosage || !med.frequency || !med.duration) {
        throw new Error(`Medication ${index + 1} is missing required fields (name, dosage, frequency, duration)`);
      }
      
      // Convert route to lowercase and validate
      const route = (med.route?.toString().trim() || "oral").toLowerCase();
      const validRoutes = ["oral", "topical", "inhalation", "injection", "rectal", "vaginal", "ophthalmic", "otic", "nasal", "transdermal"];
      
      if (!validRoutes.includes(route)) {
        throw new Error(`Medication ${index + 1}: "${route}" is not a valid route. Valid routes are: ${validRoutes.join(", ")}`);
      }
      
      return {
        name: med.name.trim(),
        dosage: med.dosage.toString().trim(),
        frequency: med.frequency.toString().trim(),
        duration: med.duration.toString().trim(),
        instructions: med.instructions?.toString().trim() || "",
        quantity: med.quantity ? parseInt(med.quantity) || 1 : 1,
        route: route,
        refills: med.refills ? parseInt(med.refills) || 0 : 0,
        refillsRemaining: med.refills ? parseInt(med.refills) || 0 : 0,
      };
    });
    
    const doctorId = new mongoose.Types.ObjectId(userId);
    
    // Create prescription using the model's pre-save hook to generate prescriptionId
    const prescriptionData: any = {
      patient: patientId,
      doctor: doctorId,
      diagnosis: diagnosis.trim(),
      medications: validatedMedications,
      instructions: patientInstructions?.trim() || "",
      notes: notes?.trim() || "",
      status: "active",
    };
    
    // Add expiry date
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + (parseInt(validityDays) || 7));
    prescriptionData.expiryDate = expiryDate;
    
    // Add appointment if provided
    if (appointmentId) {
      prescriptionData.appointment = appointmentId;
    }
    
    // Add follow-up date if provided
    if (followUpDate) {
      prescriptionData.followUpDate = new Date(followUpDate);
    }
    
    // Create and save prescription
    const prescription = new Prescription(prescriptionData);
    await prescription.save();
    
    console.log(`Prescription created successfully: ${prescription.prescriptionId}`);
    
    return NextResponse.json({
      success: true,
      data: prescription,
      message: "Prescription created successfully",
    }, { status: 201 });
    
  } catch (error: any) {
    console.error("Error creating prescription:", error);
    
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
        { success: false, error: "Duplicate prescription ID detected" },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create prescription" },
      { status: 500 }
    );
  }
}