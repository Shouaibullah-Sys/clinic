// app/api/dashboard/reception/queue/route.ts

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

    // Mock patient queue data - in a real app, this would query appointments/appointments table
    const mockQueue = [
      {
        id: "1",
        patientName: "John Doe",
        patientId: "PAT001",
        checkInTime: new Date().toISOString(),
        estimatedWaitTime: 15,
        priority: "normal" as const,
        status: "waiting" as const,
        appointmentType: "General Consultation",
        doctorName: "Dr. Smith",
      },
      {
        id: "2",
        patientName: "Jane Smith",
        patientId: "PAT002",
        checkInTime: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        estimatedWaitTime: 5,
        priority: "urgent" as const,
        status: "with_doctor" as const,
        appointmentType: "Follow-up",
        doctorName: "Dr. Johnson",
      },
    ];

    return NextResponse.json({
      success: true,
      data: mockQueue,
    });
  } catch (error) {
    console.error("Error fetching patient queue:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch patient queue" },
      { status: 500 },
    );
  }
}