// app/api/patients/search/route.ts

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
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

    // Get token from Authorization header
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. No token provided." },
        { status: 401 },
      );
    }

    const token = authHeader.split(" ")[1];
    const payload = await verifyToken(token);

    if (!payload) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired token." },
        { status: 401 },
      );
    }

    const userRole = payload.role as string;

    // Allow laboratory staff and other medical staff to search patients
    // Laboratory users need this to create direct lab tests
    const allowedRoles = [
      "admin",
      "receptionist",
      "doctor",
      "nurse",
      "laboratory",
      "lab_technician",
      "technician",
    ];
    if (!allowedRoles.includes(userRole)) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");
    const limit = parseInt(searchParams.get("limit") || "10");

    if (!query || query.trim().length < 2) {
      return NextResponse.json({
        success: true,
        data: [],
        message: "Please enter at least 2 characters to search",
      });
    }

    const searchRegex = new RegExp(query, "i");

    const patients = await Patient.find({
      $or: [
        { name: searchRegex },
        { phone: searchRegex },
        { email: searchRegex },
        { patientId: searchRegex },
      ],
      active: true,
    })
      .select("name phone email patientId")
      .limit(limit)
      .lean();

    return NextResponse.json({
      success: true,
      data: patients,
      count: patients.length,
    });
  } catch (error) {
    console.error("Error searching patients:", error);
    return NextResponse.json(
      { success: false, error: "Failed to search patients" },
      { status: 500 },
    );
  }
}
