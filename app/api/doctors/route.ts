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

async function authenticate(request: NextRequest) {
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

  // Allow receptionists, doctors, nurses, and admins
  if (!["admin", "receptionist", "doctor", "nurse"].includes(userRole)) {
    return { error: "Forbidden. Access denied.", status: 403 };
  }

  return { userId: payload.id as string, userRole };
}

// GET: Fetch active doctors for appointment scheduling
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const auth = await authenticate(request);
    if ("error" in auth) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status }
      );
    }

    // Fetch active doctors with essential fields
    const doctors = await User.find({
      role: "doctor",
      active: true,
      approved: true,
    })
      .select("_id name specialization department phone")
      .sort({ name: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: doctors,
    });

  } catch (error) {
    console.error("Error fetching doctors:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch doctors" },
      { status: 500 }
    );
  }
}