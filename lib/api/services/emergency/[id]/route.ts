// lib/api/services/emergency/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { ServiceRegistry } from "@/lib/services/base.service";
import { authorizeServiceAccess } from "@/lib/middleware/api-auth";
import { EmergencyServiceHandler } from "@/lib/services/emergency.service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const token = request.cookies.get("accessToken")?.value;
    if (!token) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const { id } = await params;
    const user = await authorizeServiceAccess(request, "emergency", "read");
    const service = ServiceRegistry.get<EmergencyServiceHandler>(
      "emergency",
      request,
    );
    const emergencyCase = await service.getEmergencyCase(token, id);

    return NextResponse.json(emergencyCase);
  } catch (error: any) {
    console.error("Get emergency case error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch emergency case" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const token = request.cookies.get("accessToken")?.value;
    if (!token) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const { id } = await params;
    const user = await authorizeServiceAccess(request, "emergency", "update");
    const service = ServiceRegistry.get<EmergencyServiceHandler>(
      "emergency",
      request,
    );
    const updates = await request.json();

    const emergencyCase = await service.updateEmergencyCase(token, id, updates);

    return NextResponse.json(emergencyCase);
  } catch (error: any) {
    console.error("Update emergency case error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update emergency case" },
      { status: 500 },
    );
  }
}

// Update disposition
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const token = request.cookies.get("accessToken")?.value;
    if (!token) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const { id } = await params;
    const user = await authorizeServiceAccess(request, "emergency", "update");
    const service = ServiceRegistry.get<EmergencyServiceHandler>(
      "emergency",
      request,
    );
    const { disposition } = await request.json();

    const emergencyCase = await service.updateDisposition(
      token,
      id,
      disposition,
    );

    return NextResponse.json(emergencyCase);
  } catch (error: any) {
    console.error("Update disposition error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update disposition" },
      { status: 500 },
    );
  }
}
