// app/api/auth/register/route.ts
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { User } from "@/lib/models/User";
import jwt from "jsonwebtoken";
import { z } from "zod";

// Zod schema for registration validation
const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  role: z.enum(["admin", "doctor", "nurse", "staff", "receptionist"]),
  department: z.string().optional(),
  designation: z.string().optional(),
  employeeId: z.string().optional(),
  gender: z.enum(["male", "female", "other"]).optional(),
  address: z.string().optional(),
  avatar: z.string().optional(),
});

export async function POST(request: NextRequest) {
  if (!process.env.JWT_SECRET) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    
    // Validate input
    const validationResult = registerSchema.safeParse(body);
    
    if (!validationResult.success) {
      const errors = validationResult.error.issues.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));
      
      return NextResponse.json(
        { 
          error: "Validation failed", 
          details: errors 
        },
        { status: 400 }
      );
    }

    const { 
      name, 
      email, 
      password, 
      phone, 
      role,
      department,
      designation,
      employeeId,
      gender,
      address,
      avatar 
    } = validationResult.data;

    await dbConnect();

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { error: "User already exists with this email" },
        { status: 409 }
      );
    }

    // Check if employeeId already exists
    if (employeeId) {
      const existingEmployee = await User.findOne({ employeeId });
      if (existingEmployee) {
        return NextResponse.json(
          { error: "Employee ID already exists" },
          { status: 409 }
        );
      }
    }

    // Generate employee ID if not provided
    const generatedEmployeeId = employeeId || generateEmployeeId(role);
    
    // Set default designation if not provided
    const defaultDesignation = designation || getDefaultDesignation(role);
    
    // Set default department if not provided
    const defaultDepartment = department || getDefaultDepartment(role);

    // Create new user with all required fields
    const user = new User({
      name,
      email,
      password,
      phone,
      role,
      employeeId: generatedEmployeeId,
      designation: defaultDesignation,
      department: defaultDepartment,
      gender: gender || "other",
      address: address || "",
      avatar: avatar || "",
      approved: role === "admin" ? true : false, // Admins auto-approved
      active: true,
      joiningDate: new Date(),
      refreshTokens: [],
    });

    await user.save();

    // Create tokens for immediate login after registration
    const accessToken = jwt.sign(
      {
        id: user._id,
        role: user.role,
        email: user.email,
        employeeId: user.employeeId,
      },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    const refreshToken = jwt.sign(
      {
        id: user._id,
        type: "refresh",
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Store refresh token in database
    user.refreshTokens.push(refreshToken);
    await user.save();

    const response = NextResponse.json({
      message: role === "admin" 
        ? "Registration successful! You can now login." 
        : "Registration successful! Account pending admin approval.",
      user: {
        _id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        employeeId: user.employeeId,
        designation: user.designation,
        department: user.department,
        gender: user.gender,
        approved: user.approved,
        active: user.active,
        joiningDate: user.joiningDate,
      },
      accessToken,
      refreshToken,
    });

    // Set HTTP-only cookies
    response.cookies.set("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 15 * 60, // 15 minutes
      path: "/",
    });

    response.cookies.set("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("Registration error:", error);
    
    // Handle MongoDB duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return NextResponse.json(
        { error: `${field} already exists` },
        { status: 409 }
      );
    }
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((err: any) => ({
        field: err.path,
        message: err.message
      }));
      
      return NextResponse.json(
        { 
          error: "Validation failed", 
          details: errors 
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Helper function to generate employee ID
function generateEmployeeId(role: string): string {
  const prefix = getRolePrefix(role);
  const year = new Date().getFullYear().toString().slice(-2);
  const random = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}${year}${random}`;
}

function getRolePrefix(role: string): string {
  const prefixes: Record<string, string> = {
    admin: "ADM",
    doctor: "DOC",
    nurse: "NUR",
    staff: "STF",
    receptionist: "REC",
  };
  return prefixes[role] || "EMP";
}

function getDefaultDesignation(role: string): string {
  const designations: Record<string, string> = {
    admin: "Administrator",
    doctor: "Medical Doctor",
    nurse: "Registered Nurse",
    staff: "Hospital Staff",
    receptionist: "Receptionist",
  };
  return designations[role] || "Employee";
}

function getDefaultDepartment(role: string): string {
  const departments: Record<string, string> = {
    admin: "Administration",
    doctor: "General Medicine",
    nurse: "Nursing",
    staff: "Support Services",
    receptionist: "Front Desk",
  };
  return departments[role] || "General";
}
