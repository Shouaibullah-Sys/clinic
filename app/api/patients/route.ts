// app/api/patients/route.ts

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { Patient } from "@/lib/models/Patient";
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

// POST: Create new patient
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
    
    // Authorization
    if (!["admin", "receptionist", "doctor"].includes(userRole)) {
      return NextResponse.json(
        { success: false, error: "Forbidden. You don't have permission to create patients." },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    const {
      name,
      phone,
      email,
      dateOfBirth,
      gender,
      address,
      emergencyContact,
      bloodGroup,
      allergies,
      medicalHistory,
    } = body;
    
    // Validation
    if (!name || !phone || !dateOfBirth || !gender) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Missing required fields: name, phone, dateOfBirth, and gender are required" 
        },
        { status: 400 }
      );
    }
    
    // Clean phone number
    const cleanPhone = phone.replace(/\D/g, '');

    if (cleanPhone.length < 10) {
      return NextResponse.json(
        { success: false, error: "Phone number must be at least 10 digits" },
        { status: 400 }
      );
    }

    // Check for existing patient
    const existingPatient = await Patient.findOne({
      phone: { $regex: cleanPhone, $options: 'i' }
    });

    if (existingPatient) {
      return NextResponse.json({
        success: false,
        error: "A patient with this phone number already exists",
        data: {
          id: existingPatient._id,
          name: existingPatient.name,
          phone: existingPatient.phone,
          patientId: existingPatient.patientId,
          email: existingPatient.email,
          dateOfBirth: existingPatient.dateOfBirth,
          gender: existingPatient.gender,
        }
      }, { status: 409 });
    }
    
    // Generate patient ID
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const random = Math.floor(1000 + Math.random() * 9000);
    let generatedPatientId = `PAT${year}${month}${random}`;

    // Check for ID collision
    const existingWithSameId = await Patient.findOne({ patientId: generatedPatientId });
    if (existingWithSameId) {
      const newRandom = Math.floor(1000 + Math.random() * 9000);
      generatedPatientId = `PAT${year}${month}${newRandom}`;
    }
    
    // Create patient
    const patientData: any = {
      patientId: generatedPatientId,
      name: name.trim(),
      phone: cleanPhone,
      dateOfBirth: new Date(dateOfBirth),
      gender,
      createdBy: new mongoose.Types.ObjectId(userId),
      active: true,
    };
    
    // Add optional fields
    if (email) patientData.email = email.trim().toLowerCase();
    if (address) patientData.address = address.trim();
    if (emergencyContact) patientData.emergencyContact = emergencyContact.trim();
    if (bloodGroup) patientData.bloodGroup = bloodGroup;
    if (allergies) patientData.allergies = allergies.trim();
    if (medicalHistory) patientData.medicalHistory = medicalHistory.trim();
    
    const patient = new Patient(patientData);

    // Save patient
    try {
      await patient.save();
    } catch (saveError: any) {
      if (saveError.code === 11000) {
        const field = Object.keys(saveError.keyPattern)[0];
        return NextResponse.json(
          {
            success: false,
            error: `A patient with this ${field} already exists`,
            details: saveError.keyValue
          },
          { status: 409 }
        );
      }
      
      if (saveError.name === 'ValidationError') {
        const errors: string[] = [];
        for (const field in saveError.errors) {
          errors.push(`${field}: ${saveError.errors[field].message}`);
        }
        return NextResponse.json(
          { 
            success: false, 
            error: "Validation failed",
            details: errors.join(', ')
          },
          { status: 400 }
        );
      }
      
      throw saveError;
    }
    
    // Return success
    return NextResponse.json({
      success: true,
      data: {
        id: patient._id.toString(),
        _id: patient._id.toString(),
        patientId: patient.patientId,
        name: patient.name,
        phone: patient.phone,
        email: patient.email,
        dateOfBirth: patient.dateOfBirth?.toISOString().split('T')[0],
        gender: patient.gender,
        address: patient.address,
      },
      message: "Patient created successfully"
    }, { status: 201 });
    
  } catch (error: any) {
    console.error("Error creating patient:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || "Failed to create patient",
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

// GET: Search patients
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
    
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("q") || searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;
    
    let query: any = { active: true };
    
    if (search) {
      const searchRegex = new RegExp(search, "i");
      query.$or = [
        { name: searchRegex },
        { phone: searchRegex },
        { email: searchRegex },
        { patientId: searchRegex },
      ];
    }
    
    const [patients, total] = await Promise.all([
      Patient.find(query)
        .select("_id name phone email patientId dateOfBirth gender address")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Patient.countDocuments(query),
    ]);
    
    return NextResponse.json({
      success: true,
      data: patients.map(p => ({
        ...p,
        dateOfBirth: p.dateOfBirth ? p.dateOfBirth.toISOString().split('T')[0] : undefined
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
    
  } catch (error) {
    console.error("Error fetching patients:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch patients" },
      { status: 500 }
    );
  }
}