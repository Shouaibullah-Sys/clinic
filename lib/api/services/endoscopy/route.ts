// lib/api/services/endoscopy/route.ts
import { NextRequest, NextResponse } from "next/server";
import { ServiceRegistry } from "@/lib/services/base.service";
import { authorizeServiceAccess } from "@/lib/middleware/api-auth";
import { EndoscopyServiceHandler } from "@/lib/services/endoscopy.service";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("accessToken")?.value;
    if (!token) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const user = await authorizeServiceAccess(request, "endoscopy", "read");
    const service = ServiceRegistry.get(
      "endoscopy",
      request,
    ) as EndoscopyServiceHandler;

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const patientId = searchParams.get("patientId");
    const endoscopyType = searchParams.get("type");
    const status = searchParams.get("status");

    const filters: any = {};
    if (patientId) filters.patient = patientId;
    if (endoscopyType) filters.endoscopyType = endoscopyType;
    if (status) filters.status = status;

    const result = await service.listEndoscopyProcedures(token, filters, {
      page,
      limit,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Endoscopy service error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch endoscopy procedures" },
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

    const user = await authorizeServiceAccess(request, "endoscopy", "create");
    const service = ServiceRegistry.get(
      "endoscopy",
      request,
    ) as EndoscopyServiceHandler;
    const data = await request.json();

    // Generate endoscopy ID
    const endoscopyId = `ENDO-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const procedure = await service.createEndoscopyProcedure(token, {
      ...data,
      endoscopyId,
      status: "scheduled",
      priority: data.priority || "routine",
      findings: data.findings || "Pending",
    });

    return NextResponse.json(procedure, { status: 201 });
  } catch (error: any) {
    console.error("Create endoscopy procedure error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create endoscopy procedure" },
      { status: 500 },
    );
  }
}
