// lib/api/services/dental/route.ts
import { NextRequest, NextResponse } from "next/server";
import { ServiceRegistry } from "@/lib/services/base.service";
import { authorizeServiceAccess } from "@/lib/middleware/api-auth";
import { DentalServiceHandler } from "@/lib/services/dental.service";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("accessToken")?.value;
    if (!token) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const user = await authorizeServiceAccess(request, "dental", "read");
    const service = ServiceRegistry.get<DentalServiceHandler>(
      "dental",
      request,
    );

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const patientId = searchParams.get("patientId");
    const dentistId = searchParams.get("dentistId");
    const visitType = searchParams.get("visitType");

    const filters: any = {};
    if (patientId) filters.patient = patientId;
    if (dentistId) filters.dentist = dentistId;
    if (visitType) filters.visitType = visitType;

    const result = await service.listDentalRecords(token, filters, {
      page,
      limit,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Dental service error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch dental records" },
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

    const user = await authorizeServiceAccess(request, "dental", "create");
    const service = ServiceRegistry.get<DentalServiceHandler>(
      "dental",
      request,
    );
    const data = await request.json();

    // Generate dental ID
    const dentalId = `DENT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const dentalRecord = await service.createDentalRecord(token, {
      ...data,
      dentalId,
      status: "scheduled",
      visitType: data.visitType || "consultation",
      billingStatus: "pending",
    });

    return NextResponse.json(dentalRecord, { status: 201 });
  } catch (error: any) {
    console.error("Create dental record error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create dental record" },
      { status: 500 },
    );
  }
}
