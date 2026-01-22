// app/api/doctor/patients/route.ts

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { Appointment } from "@/lib/models/Appointment";
import { Patient } from "@/lib/models/Patient";
import { jwtVerify } from "jose";

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
    
    // Only doctors can access
    if (userRole !== "doctor") {
      return NextResponse.json(
        { success: false, error: "Forbidden. Doctor access required." },
        { status: 403 }
      );
    }
    
    // Get unique patient IDs from doctor's appointments
    const patientIds = await Appointment.distinct("patient", {
      doctor: userId,
      status: { $nin: ["cancelled", "no-show"] },
    });
    
    if (patientIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
      });
    }
    
    // Get patient details
    const patients = await Patient.find({ _id: { $in: patientIds } })
      .select("name phone email patientId dateOfBirth gender")
      .lean();
    
    // Get last visit date for each patient
    const patientsWithLastVisit = await Promise.all(
      patients.map(async (patient) => {
        const lastAppointment = await Appointment.findOne({
          doctor: userId,
          patient: patient._id,
          status: { $nin: ["cancelled", "no-show"] },
        })
          .sort({ startTime: -1 })
          .select("startTime")
          .lean();
        
        const totalVisits = await Appointment.countDocuments({
          doctor: userId,
          patient: patient._id,
          status: { $nin: ["cancelled", "no-show"] },
        });
        
        return {
          ...patient,
          lastVisit: lastAppointment?.startTime,
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
    
    return NextResponse.json({
      success: true,
      data: patientsWithLastVisit,
    });
    
  } catch (error: any) {
    console.error("Error fetching doctor patients:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch patients" },
      { status: 500 }
    );
  }
}