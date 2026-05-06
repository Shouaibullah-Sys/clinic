// app/api/patients/search/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status || 401 },
      );
    }

    const userRole = auth.userRole!;

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

    const patients = await prisma.patient.findMany({
      where: {
        active: true,
        OR: [
          { name: { contains: query } },
          { phone: { contains: query } },
          { email: { contains: query } },
          { guardian: { contains: query } },
          { refPerson: { contains: query } },
          { passTskNo: { contains: query } },
          { registrationNo: { contains: query } },
          { patientId: { contains: query } },
        ],
      },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        guardian: true,
        refPerson: true,
        passTskNo: true,
        registrationNo: true,
        patientId: true,
        address: true,
        gender: true,
        dateOfBirth: true,
      },
      take: limit,
    });

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
