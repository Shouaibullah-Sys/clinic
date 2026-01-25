// app/api/doctor/patients/[id]/medical-records/route.ts - UPDATED for Next.js 16

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { MedicalRecord } from "@/lib/models/MedicalRecord";
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
    
    console.log(`Fetching medical records for patient ${patientId} by doctor ${userId}`);
    
    // Only doctors can access
    if (userRole !== "doctor") {
      return NextResponse.json(
        { success: false, error: "Forbidden. Doctor access required." },
        { status: 403 }
      );
    }
    
    const doctorId = new mongoose.Types.ObjectId(userId);
    
    // Fetch medical records where the current doctor created them for this patient
    const medicalRecords = await MedicalRecord.find({
      patient: patientId,
      doctor: doctorId,
    })
      .select("recordId visitDate diagnosis symptoms notes vitalSigns doctor")
      .populate("doctor", "name specialization")
      .sort({ visitDate: -1 })
      .lean();
    
    console.log(`Found ${medicalRecords.length} medical records`);
    
    return NextResponse.json({
      success: true,
      data: medicalRecords,
    });
    
  } catch (error: any) {
    console.error("Error fetching medical records:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch medical records" },
      { status: 500 }
    );
  }
}

// Add POST method 
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
    
    console.log(`Creating medical record for patient ${patientId} by doctor ${userId}`);
    
    if (userRole !== "doctor") {
      return NextResponse.json(
        { success: false, error: "Forbidden. Doctor access required." },
        { status: 403 }
      );
    }
    
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
      symptoms,
      notes,
      vitals,
      examinationNotes,
      treatmentPlan,
      followUpDate,
      patientInstructions,
    } = body;
    
    // Validation
    if (!diagnosis) {
      return NextResponse.json(
        { success: false, error: "Diagnosis is required" },
        { status: 400 }
      );
    }
    
    // Process symptoms
    let symptomsArray: string[] = [];
    if (typeof symptoms === "string") {
      symptomsArray = symptoms.split(",").map(s => s.trim()).filter(Boolean);
    } else if (Array.isArray(symptoms)) {
      symptomsArray = symptoms.map(s => s.toString().trim()).filter(Boolean);
    }
    
    if (symptomsArray.length === 0) {
      return NextResponse.json(
        { success: false, error: "At least one symptom is required" },
        { status: 400 }
      );
    }
    
    const doctorId = new mongoose.Types.ObjectId(userId);
    
    // Create medical record
    const medicalRecordData: any = {
      patient: patientId,
      doctor: doctorId,
      diagnosis: diagnosis.trim(),
      symptoms: symptomsArray,
      notes: notes?.trim() || "",
    };
    
    // Add vitals if provided
    if (vitals) {
      medicalRecordData.vitalSigns = {};
      
      if (vitals.bloodPressureSystolic && vitals.bloodPressureDiastolic) {
        medicalRecordData.vitalSigns.bloodPressure = {
          systolic: parseInt(vitals.bloodPressureSystolic) || 120,
          diastolic: parseInt(vitals.bloodPressureDiastolic) || 80,
        };
      }
      
      if (vitals.heartRate) {
        medicalRecordData.vitalSigns.heartRate = parseInt(vitals.heartRate) || 72;
      }
      
      if (vitals.temperature) {
        medicalRecordData.vitalSigns.temperature = parseFloat(vitals.temperature) || 36.6;
      }
      
      if (vitals.weight) {
        medicalRecordData.vitalSigns.weight = parseFloat(vitals.weight) || 0;
      }
      
      if (vitals.height) {
        medicalRecordData.vitalSigns.height = parseFloat(vitals.height) || 0;
      }
    }
    
    // Add other optional fields
    if (examinationNotes?.trim()) {
      medicalRecordData.examinationNotes = examinationNotes.trim();
    }
    
    if (treatmentPlan?.trim()) {
      medicalRecordData.treatmentPlan = treatmentPlan.trim();
    }
    
    if (followUpDate) {
      medicalRecordData.followUpDate = new Date(followUpDate);
    }
    
    if (patientInstructions?.trim()) {
      medicalRecordData.patientInstructions = patientInstructions.trim();
    }
    
    if (appointmentId) {
      medicalRecordData.appointment = appointmentId;
    }
    
    // Create and save
    const medicalRecord = new MedicalRecord(medicalRecordData);
    await medicalRecord.save();
    
    console.log(`Medical record created successfully: ${medicalRecord.recordId}`);
    
    return NextResponse.json({
      success: true,
      data: medicalRecord,
      message: "Medical record created successfully",
    }, { status: 201 });
    
  } catch (error: any) {
    console.error("Error creating medical record:", error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((err: any) => err.message);
      return NextResponse.json(
        { success: false, error: "Validation failed", details: errors },
        { status: 400 }
      );
    }
    
    if (error.code === 11000) {
      return NextResponse.json(
        { success: false, error: "Duplicate record ID detected" },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create medical record" },
      { status: 500 }
    );
  }
}

