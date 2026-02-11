// lib/api/services/emergency/route.ts
import { NextRequest, NextResponse } from "next/server";
import { ServiceRegistry } from "@/lib/services/base.service";
import { authorizeServiceAccess } from "@/lib/middleware/api-auth";
import { EmergencyServiceHandler } from "@/lib/services/emergency.service";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("accessToken")?.value;
    if (!token) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const user = await authorizeServiceAccess(request, "emergency", "read");
    const service = ServiceRegistry.get<EmergencyServiceHandler>(
      "emergency",
      request,
    );

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const status = searchParams.get("status");
    const triageLevel = searchParams.get("triageLevel");

    const filters: any = {};
    if (status) filters.status = status;
    if (triageLevel) filters.triageLevel = triageLevel;

    const result = await service.listEmergencyCases(token, filters, {
      page,
      limit,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Emergency service error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch emergency cases" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("accessToken")?.value;
    if (!token) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const user = await authorizeServiceAccess(request, "emergency", "create");
    const service = ServiceRegistry.get<EmergencyServiceHandler>(
      "emergency",
      request,
    );
    const data = await request.json();

    // Generate emergency ID
    const emergencyId = `EMG-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const emergencyCase = await service.createEmergencyCase(token, {
      ...data,
      emergencyId,
      status: "active",
      triageLevel: data.triageLevel || "urgent",
    });

    return NextResponse.json(emergencyCase, { status: 201 });
  } catch (error: any) {
    console.error("Create emergency case error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create emergency case" },
      { status: 500 },
    );
  }
}
