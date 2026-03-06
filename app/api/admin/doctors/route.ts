// app/api/admin/doctors/route.ts

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
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

// Helper to authenticate admin
async function authenticateAdmin(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { error: "Unauthorized. No token provided.", status: 401 };
  }

  const token = authHeader.split(" ")[1];
  const payload = await verifyToken(token);
  
  if (!payload) {
    return { error: "Invalid or expired token.", status: 401 };
  }

  const userRole = payload.role as string;
  
  // Only admin can access
  if (userRole !== "admin") {
    return { error: "Forbidden. Admin access required.", status: 403 };
  }

  return { 
    userId: payload.id as string, 
    userRole 
  };
}

// GET: Get all doctors with filters
export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    const auth = await authenticateAdmin(request);
    if ("error" in auth) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const department = searchParams.get("department");
    const active = searchParams.get("active");
    const approved = searchParams.get("approved");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;
    
    // Build query
    let query: any = { role: "doctor" };
    
    // Search filter
    if (search) {
      const searchRegex = new RegExp(search, "i");
      query.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { specialization: searchRegex },
        { licenseNumber: searchRegex },
        { phone: searchRegex },
      ];
    }
    
    // Department filter
    if (department && department !== "all") {
      query.department = department;
    }
    
    // Active filter
    if (active === "true") {
      query.active = true;
    } else if (active === "false") {
      query.active = false;
    }
    
    // Approved filter
    if (approved === "true") {
      query.approved = true;
    } else if (approved === "false") {
      query.approved = false;
    }
    
    // Get unique departments for filter
    const departments = await User.distinct("department", { role: "doctor" });
    
    const [doctors, total] = await Promise.all([
      User.find(query)
        .select("-password") // Exclude password
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(query),
    ]);
    
    return NextResponse.json({
      success: true,
      data: doctors,
      departments: departments.filter(Boolean), // Remove null/undefined
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
    
  } catch (error) {
    console.error("Error fetching doctors:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch doctors" },
      { status: 500 }
    );
  }
}

// POST: Create new doctor (admin only)
export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    const auth = await authenticateAdmin(request);
    if ("error" in auth) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status }
      );
    }
    
    const body = await request.json();
    const {
      name,
      email,
      phone,
      department,
      specialization,
      licenseNumber,
      qualifications,
      experience,
      consultationFee,
      availability,
      biography,
      password = "Doctor@123", // Default password
    } = body;
    
    console.log("Creating new doctor with data:", { ...body, password: "[REDACTED]" });
    
    // Validate required fields
    if (!name || !email || !phone || !department || !specialization || !licenseNumber) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Missing required fields: name, email, phone, department, specialization, and licenseNumber are required" 
        },
        { status: 400 }
      );
    }
    
    // Check if email already exists
    const existingEmail = await User.findOne({ email: email.toLowerCase() });
    if (existingEmail) {
      return NextResponse.json(
        { success: false, error: "Email already exists" },
        { status: 409 }
      );
    }
    
    // Check if license number already exists
    const existingLicense = await User.findOne({ licenseNumber });
    if (existingLicense) {
      return NextResponse.json(
        { success: false, error: "License number already exists" },
        { status: 409 }
      );
    }
    
    // Parse qualifications if it's a string
    let qualificationsArray: string[] = [];
    if (qualifications) {
      if (typeof qualifications === 'string') {
        qualificationsArray = qualifications.split(',').map(q => q.trim()).filter(Boolean);
      } else if (Array.isArray(qualifications)) {
        qualificationsArray = qualifications;
      }
    }
    
    // Parse availability days if it's a string
    let availabilityDays: string[] = [];
    if (availability?.days) {
      if (typeof availability.days === 'string') {
        availabilityDays = availability.days.split(',').map((day: string) => day.trim().toLowerCase());
      } else if (Array.isArray(availability.days)) {
        availabilityDays = availability.days.map((day: string) => day.toLowerCase());
      }
    }
    
    // Create doctor
    const doctorData: any = {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      password,
      role: "doctor",
      department: department.trim(),
      specialization: specialization.trim(),
      licenseNumber: licenseNumber.trim(),
      qualifications: qualificationsArray,
      experience: experience ? parseInt(experience) : undefined,
      consultationFee: consultationFee ? parseFloat(consultationFee) : undefined,
      biography: biography?.trim(),
      approved: true, // Auto-approve when created by admin
      active: true,
      joiningDate: new Date(),
      permissions: [
        "view_patients",
        "create_prescriptions",
        "view_appointments",
        "update_medical_records",
      ],
    };
    
    // Add availability if provided
    if (availability) {
      doctorData.availability = {
        days: availabilityDays,
        startTime: availability.startTime || "09:00",
        endTime: availability.endTime || "17:00",
        breakStart: availability.breakStart,
        breakEnd: availability.breakEnd,
      };
    }
    
    const doctor = new User(doctorData);
    
    await doctor.save();
    
    // Remove password from response
    const doctorResponse = doctor.toObject();
    delete doctorResponse.password;
    
    return NextResponse.json({
      success: true,
      data: doctorResponse,
      message: "Doctor created successfully. Default password: Doctor@123"
    }, { status: 201 });
    
  } catch (error: any) {
    console.error("Error creating doctor:", error);
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return NextResponse.json(
        { 
          success: false, 
          error: `A doctor with this ${field} already exists`,
          details: error.keyValue
        },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || "Failed to create doctor" 
      },
      { status: 500 }
    );
  }
}
