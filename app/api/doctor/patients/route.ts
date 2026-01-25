// app/api/doctor/patients/route.ts - FIXED WITH TYPES

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { Appointment } from "@/lib/models/Appointment";
import { Patient } from "@/lib/models/Patient";
import { jwtVerify } from "jose";
import mongoose, { Types } from "mongoose";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this";

async function verifyToken(token: string) {
  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    console.log("✅ Token verified, payload:", payload);
    return payload;
  } catch (error) {
    console.error("❌ Token verification failed:", error);
    return null;
  }
}

// Define types for the returned data
interface PatientData {
  _id: Types.ObjectId | string;
  patientId: string;
  name: string;
  phone: string;
  email?: string;
  dateOfBirth: Date;
  gender: string;
  bloodGroup?: string;
  allergies?: string[];
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  address?: string;
  lastVisit?: Date | null;
  totalVisits: number;
}

export async function GET(request: NextRequest) {
  console.log("🚀 /api/doctor/patients called");
  
  try {
    // Connect to database
    console.log("📊 Connecting to database...");
    await dbConnect();
    console.log("✅ Database connected");
    
    // Authentication
    const authHeader = request.headers.get("authorization");
    console.log("🔑 Auth header exists:", !!authHeader);
    console.log("🔑 Auth header:", authHeader?.substring(0, 30) + "...");
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("❌ No valid Bearer token");
      return NextResponse.json(
        { success: false, error: "Unauthorized. No token provided." },
        { status: 401 }
      );
    }
    
    const token = authHeader.split(" ")[1];
    const payload = await verifyToken(token);
    
    if (!payload) {
      console.log("❌ Invalid token payload");
      return NextResponse.json(
        { success: false, error: "Invalid or expired token." },
        { status: 401 }
      );
    }
    
    const userId = payload.id as string;
    const userRole = payload.role as string;
    
    console.log("👤 User ID from token:", userId);
    console.log("🎭 User role from token:", userRole);
    
    // Only doctors can access
    if (userRole !== "doctor") {
      console.log("❌ User is not a doctor");
      return NextResponse.json(
        { success: false, error: "Forbidden. Doctor access required." },
        { status: 403 }
      );
    }
    
    // Convert userId to ObjectId
    let doctorId: Types.ObjectId;
    try {
      doctorId = new mongoose.Types.ObjectId(userId);
      console.log("🆔 Doctor ObjectId created:", doctorId);
    } catch (error) {
      console.error("❌ Invalid doctor ID format:", userId, error);
      return NextResponse.json(
        { success: false, error: "Invalid doctor ID format" },
        { status: 400 }
      );
    }
    
    // Get unique patient IDs from doctor's appointments
    console.log("🔎 Querying appointments for doctor:", doctorId);
    
    // First, check if doctor has any appointments
    const appointmentCount = await Appointment.countDocuments({
      doctor: doctorId,
      status: { $nin: ["cancelled", "no-show"] },
    });
    
    console.log("📊 Total appointments for doctor:", appointmentCount);
    
    if (appointmentCount === 0) {
      console.log("ℹ️ Doctor has no appointments");
      return NextResponse.json({
        success: true,
        data: [],
        message: "No patients found for this doctor",
      });
    }
    
    // Get distinct patient IDs
    console.log("🔍 Getting distinct patient IDs...");
    const patientIds = await Appointment.distinct("patient", {
      doctor: doctorId,
      status: { $nin: ["cancelled", "no-show"] },
    });
    
    console.log("📋 Raw patient IDs:", patientIds);
    console.log("📊 Number of patient IDs found:", patientIds.length);
    
    if (patientIds.length === 0) {
      console.log("ℹ️ No patient IDs found");
      return NextResponse.json({
        success: true,
        data: [],
        message: "No patient IDs found",
      });
    }
    
    // Convert patientIds to ObjectId
    const patientObjectIds: Types.ObjectId[] = patientIds
      .map((id: any) => {
        try {
          if (id instanceof mongoose.Types.ObjectId) {
            return id;
          }
          return new mongoose.Types.ObjectId(id.toString());
        } catch (error) {
          console.error("Error converting to ObjectId:", id, error);
          return null;
        }
      })
      .filter((id: any): id is Types.ObjectId => id !== null);
    
    console.log("🔄 Converted patient ObjectIds:", patientObjectIds);
    console.log("📊 Valid patient ObjectIds:", patientObjectIds.length);
    
    if (patientObjectIds.length === 0) {
      console.log("ℹ️ No valid patient ObjectIds");
      return NextResponse.json({
        success: true,
        data: [],
        message: "No valid patient IDs",
      });
    }
    
    // Get patient details
    console.log("🔍 Fetching patient details...");
    const patients = await Patient.find({ 
      _id: { $in: patientObjectIds },
      active: true 
    })
      .select("name phone email patientId dateOfBirth gender bloodGroup allergies emergencyContact address")
      .lean<PatientData[]>();
    
    console.log("✅ Patients found in database:", patients.length);
    console.log("👥 Patient names:", patients.map(p => p.name));
    
    // Get last visit date and total visits for each patient
    console.log("📅 Fetching appointment details for each patient...");
    const patientsWithLastVisit = await Promise.all(
      patients.map(async (patient: PatientData) => {
        const patientId = patient._id;
        console.log(`🔍 Processing patient: ${patient.name} (${patientId})`);
        
        const lastAppointment = await Appointment.findOne({
          doctor: doctorId,
          patient: patientId,
          status: { $nin: ["cancelled", "no-show"] },
        })
          .sort({ startTime: -1 })
          .select("startTime")
          .lean();
        
        const totalVisits = await Appointment.countDocuments({
          doctor: doctorId,
          patient: patientId,
          status: { $nin: ["cancelled", "no-show"] },
        });
        
        console.log(`   📊 ${patient.name}: total visits = ${totalVisits}, last visit = ${lastAppointment?.startTime}`);
        
        return {
          ...patient,
          _id: patientId.toString(),
          lastVisit: lastAppointment?.startTime || null,
          totalVisits,
        };
      })
    );
    
    // Sort by last visit date (most recent first)
    patientsWithLastVisit.sort((a, b) => {
      if (!a.lastVisit) return 1;
      if (!b.lastVisit) return -1;
      return new Date(b.lastVisit).getTime() - new Date(a.lastVisit).getTime();
    });
    
    console.log("✅ Final data prepared, patients count:", patientsWithLastVisit.length);
    
    return NextResponse.json({
      success: true,
      data: patientsWithLastVisit,
      count: patientsWithLastVisit.length,
    });
    
  } catch (error: any) {
    console.error("❌ Error fetching doctor patients:", error);
    console.error("Stack trace:", error.stack);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || "Failed to fetch patients",
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}