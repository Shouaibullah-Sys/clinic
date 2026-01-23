// app/api/admin/doctors/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { User } from "@/lib/models/User";
import { jwtVerify } from "jose";
import bcrypt from "bcryptjs";
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

// GET: Get single doctor
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();

    const auth = await authenticateAdmin(request);
    if ("error" in auth) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status }
      );
    }

    const { id } = await params;
    const doctorId = id;
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(doctorId)) {
      return NextResponse.json(
        { success: false, error: "Invalid doctor ID" },
        { status: 400 }
      );
    }
    
    const doctor = await User.findOne({
      _id: doctorId,
      role: "doctor"
    }).select("-password"); // Exclude password
    
    if (!doctor) {
      return NextResponse.json(
        { success: false, error: "Doctor not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: doctor,
    });
    
  } catch (error) {
    console.error("Error fetching doctor:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch doctor" },
      { status: 500 }
    );
  }
}

// PUT: Update doctor
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();

    const auth = await authenticateAdmin(request);
    if ("error" in auth) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status }
      );
    }

    const { id } = await params;
    const doctorId = id;
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(doctorId)) {
      return NextResponse.json(
        { success: false, error: "Invalid doctor ID" },
        { status: 400 }
      );
    }
    
    // Check if doctor exists
    const doctor = await User.findOne({
      _id: doctorId,
      role: "doctor"
    });
    
    if (!doctor) {
      return NextResponse.json(
        { success: false, error: "Doctor not found" },
        { status: 404 }
      );
    }
    
    const body = await request.json();
    const updates: any = {};
    
    // Allowed fields to update
    const allowedFields = [
      "name", "email", "phone", "department", "specialization",
      "licenseNumber", "qualifications", "experience", "consultationFee",
      "availability", "biography", "active", "approved", "avatar"
    ];
    
    allowedFields.forEach(field => {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    });
    
    // Handle qualifications array
    if (updates.qualifications && typeof updates.qualifications === 'string') {
      updates.qualifications = updates.qualifications.split(',').map((q: string) => q.trim()).filter(Boolean);
    }
    
    // Handle availability days
    if (updates.availability?.days) {
      if (typeof updates.availability.days === 'string') {
        console.log('Original availability.days string:', updates.availability.days);
        updates.availability.days = (updates.availability.days as string).split(',').map((day: string) => day.trim().toLowerCase()).filter((day: string) => day.length > 0);
        console.log('Processed availability.days array:', updates.availability.days);
      } else if (Array.isArray(updates.availability.days)) {
        console.log('Original availability.days array:', updates.availability.days);
        updates.availability.days = (updates.availability.days as string[]).map((day: string) => day.trim().toLowerCase()).filter((day: string) => day.length > 0);
        console.log('Filtered availability.days array:', updates.availability.days);
      }
    }
    
    // Check for email uniqueness if email is being updated
    if (updates.email && updates.email !== doctor.email) {
      const existingEmail = await User.findOne({ 
        email: updates.email.toLowerCase(),
        _id: { $ne: doctorId }
      });
      
      if (existingEmail) {
        return NextResponse.json(
          { success: false, error: "Email already exists" },
          { status: 409 }
        );
      }
      updates.email = updates.email.toLowerCase();
    }
    
    // Check for license number uniqueness if being updated
    if (updates.licenseNumber && updates.licenseNumber !== doctor.licenseNumber) {
      const existingLicense = await User.findOne({ 
        licenseNumber: updates.licenseNumber,
        _id: { $ne: doctorId }
      });
      
      if (existingLicense) {
        return NextResponse.json(
          { success: false, error: "License number already exists" },
          { status: 409 }
        );
      }
    }
    
    // Apply updates
    console.log('Updates object before saving:', JSON.stringify(updates, null, 2));
    Object.assign(doctor, updates);
    await doctor.save();
    
    // Remove password from response
    const doctorResponse = doctor.toObject();
    delete doctorResponse.password;
    
    return NextResponse.json({
      success: true,
      data: doctorResponse,
      message: "Doctor updated successfully"
    });
    
  } catch (error: any) {
    console.error("Error updating doctor:", error);
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return NextResponse.json(
        { 
          success: false, 
          error: `A doctor with this ${field} already exists` 
        },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update doctor" },
      { status: 500 }
    );
  }
}

// DELETE: Deactivate doctor (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();

    const auth = await authenticateAdmin(request);
    if ("error" in auth) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status }

      );
    }

    const { id } = await params;
    const doctorId = id;
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(doctorId)) {
      return NextResponse.json(
        { success: false, error: "Invalid doctor ID" },
        { status: 400 }
      );
    }
    
    // Check if doctor exists
    const doctor = await User.findOne({
      _id: doctorId,
      role: "doctor"
    });
    
    if (!doctor) {
      return NextResponse.json(
        { success: false, error: "Doctor not found" },
        { status: 404 }
      );
    }
    
    // Soft delete: set active to false
    doctor.active = false;
    await doctor.save();
    
    // Remove password from response
    const doctorResponse = doctor.toObject();
    delete doctorResponse.password;
    
    return NextResponse.json({
      success: true,
      data: doctorResponse,
      message: "Doctor deactivated successfully"
    });
    
  } catch (error: any) {
    console.error("Error deactivating doctor:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to deactivate doctor" },
      { status: 500 }
    );
  }
}