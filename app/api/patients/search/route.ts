// app/api/patients/search/route.ts

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { Patient } from "@/lib/models/Patient";
import { authenticateRequest } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    // Authenticate the request
    const auth = await authenticateRequest(request);
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status || 401 },
      );
    }

    const userRole = auth.userRole!;

    // Allow laboratory staff and other medical staff to search patients
    // Laboratory users need this to create direct lab tests
    const allowedRoles = [
      "admin",
      "receptionist",
      "doctor",
      "nurse",
      "lab_technician",
      "pharmacist",
      "radiologist",
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
