// lib/api/services/ot/route.ts
import { NextRequest, NextResponse } from "next/server";
import { ServiceRegistry } from "@/lib/services/base.service";
import { authorizeServiceAccess } from "@/lib/middleware/api-auth";
import { OTServiceHandler } from "@/lib/services/ot.service";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("accessToken")?.value;
    if (!token) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const user = await authorizeServiceAccess(request, "ot", "read");
    const service = ServiceRegistry.get(
      "ot",
      request,
    ) as unknown as OTServiceHandler;

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const status = searchParams.get("status");
    const surgeryDate = searchParams.get("surgeryDate");
    const surgeonId = searchParams.get("surgeonId");

    const filters: any = {};
    if (status) filters.status = status;
    if (surgeryDate)
      filters["schedule.surgeryDate"] = { $gte: new Date(surgeryDate) };
    if (surgeonId) filters["team.surgeon"] = surgeonId;

    const result = await service.listOTSurgeries(token, filters, {
      page,
      limit,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("OT service error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch OT schedules" },
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

    const user = await authorizeServiceAccess(request, "ot", "create");
    const service = ServiceRegistry.get(
      "ot",
      request,
    ) as unknown as OTServiceHandler;
    const data = await request.json();

    // Generate OT ID
    const otId = `OT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const otSchedule = await service.createOTSurgery(token, {
      ...data,
      otId,
      status: "scheduled",
      preOpChecklist: {
        consentSigned: false,
        labReports: false,
        imaging: false,
        bloodArranged: false,
        instruments: false,
        anesthesiaAssessment: false,
      },
    });

    return NextResponse.json(otSchedule, { status: 201 });
  } catch (error: any) {
    console.error("Create OT schedule error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create OT schedule" },
      { status: 500 },
    );
  }
}
