// lib/api/services/ecg/route.ts
import { NextRequest, NextResponse } from "next/server";
import { ServiceRegistry } from "@/lib/services/base.service";
import { authorizeServiceAccess } from "@/lib/middleware/api-auth";
import { ECGServiceHandler } from "@/lib/services/ecg.service";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("accessToken")?.value;
    if (!token) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const user = await authorizeServiceAccess(request, "ecg", "read");
    const service = ServiceRegistry.get<ECGServiceHandler>("ecg", request);

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const patientId = searchParams.get("patientId");
    const ecgType = searchParams.get("type");
    const status = searchParams.get("status");

    const filters: any = {};
    if (patientId) filters.patient = patientId;
    if (ecgType) filters.ecgType = ecgType;
    if (status) filters.status = status;

    const result = await service.listECGRecords(token, filters, {
      page,
      limit,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("ECG service error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch ECG records" },
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

    const user = await authorizeServiceAccess(request, "ecg", "create");
    const service = ServiceRegistry.get<ECGServiceHandler>("ecg", request);
    const data = await request.json();

    // Generate ECG ID
    const ecgId = `ECG-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const ecgRecord = await service.createECGRecord(token, {
      ...data,
      ecgId,
      status: "scheduled",
      ecgType: data.ecgType || "resting",
      priority: data.priority || "routine",
    });

    return NextResponse.json(ecgRecord, { status: 201 });
  } catch (error: any) {
    console.error("Create ECG record error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create ECG record" },
      { status: 500 },
    );
  }
}

// Submit ECG interpretation
export async function PATCH(request: NextRequest) {
  try {
    const token = request.cookies.get("accessToken")?.value;
    if (!token) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const user = await authorizeServiceAccess(request, "ecg", "report");
    const service = ServiceRegistry.get<ECGServiceHandler>("ecg", request);
    const { ecgId, interpretation } = await request.json();

    const ecgRecord = await service.updateECGInterpretation(
      token,
      ecgId,
      interpretation,
    );

    return NextResponse.json(ecgRecord);
  } catch (error: any) {
    console.error("Submit ECG interpretation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to submit ECG interpretation" },
      { status: 500 },
    );
  }
}
