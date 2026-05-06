// app/api/dashboard/reception/appointments/today/route.ts

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

    // Mock today's appointments - in a real app, this would query appointments table
    const mockAppointments = [
      {
        id: "1",
        patientName: "Alice Johnson",
        patientId: "PAT003",
        time: "09:00",
        doctorName: "Dr. Smith",
        type: "Consultation",
        status: "confirmed" as const,
        phone: "+1234567890",
      },
      {
        id: "2",
        patientName: "Bob Wilson",
        patientId: "PAT004",
        time: "10:30",
        doctorName: "Dr. Johnson",
        type: "Follow-up",
        status: "scheduled" as const,
        phone: "+1234567891",
      },
      {
        id: "3",
        patientName: "Carol Brown",
        patientId: "PAT005",
        time: "14:00",
        doctorName: "Dr. Smith",
        type: "Check-up",
        status: "confirmed" as const,
        phone: "+1234567892",
      },
    ];

    return NextResponse.json({
      success: true,
      data: mockAppointments,
    });
  } catch (error) {
    console.error("Error fetching today's appointments:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch today's appointments" },
      { status: 500 },
    );
  }
}