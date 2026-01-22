// app/api/doctors/route.ts

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { User } from "@/lib/models/User";
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
    
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("active") !== "false";
    const department = searchParams.get("department");
    
    // Build query
    let query: any = { role: "doctor", active: activeOnly };
    
    if (department && department !== "all") {
      query.department = department;
    }
    
    // Get doctors
    const doctors = await User.find(query)
      .select("_id name email phone specialization department availability active approved consultationFee")
      .sort({ name: 1 })
      .lean();
    
    // Get unique departments
    const departments = await User.distinct("department", { role: "doctor", active: true });
    
    return NextResponse.json({
      success: true,
      data: doctors,
      departments: departments.filter(Boolean).sort(),
      total: doctors.length,
    });
    
  } catch (error) {
    console.error("Error fetching doctors:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch doctors" },
      { status: 500 }
    );
  }
}