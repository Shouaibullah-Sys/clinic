// lib/api/services/laboratory/route.ts
import { NextRequest, NextResponse } from "next/server";
import { ServiceRegistry } from "@/lib/services/base.service";
import { authorizeServiceAccess } from "@/lib/middleware/api-auth";
import { LaboratoryServiceHandler } from "@/lib/services/laboratory.service";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("accessToken")?.value;
    if (!token) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const user = await authorizeServiceAccess(request, "laboratory", "read");
    const service = ServiceRegistry.get(
      "laboratory",
      request,
    ) as unknown as LaboratoryServiceHandler;

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const patientId = searchParams.get("patientId");
    const testType = searchParams.get("testType");
    const status = searchParams.get("status");

    const filters: any = {};
    if (patientId) filters.patient = patientId;
    if (testType) filters.testType = testType;
    if (status) filters.status = status;

    const result = await service.listLaboratoryTests(token, filters, {
      page,
      limit,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Laboratory service error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch lab tests" },
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

    const user = await authorizeServiceAccess(request, "laboratory", "create");
    const service = ServiceRegistry.get(
      "laboratory",
      request,
    ) as unknown as LaboratoryServiceHandler;
    const data = await request.json();

    // Generate lab test ID
    const labId = `LAB-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const labTest = await service.createLaboratoryTest(token, {
      ...data,
      labId,
      status: "ordered",
      priority: data.priority || "routine",
    });

    return NextResponse.json(labTest, { status: 201 });
  } catch (error: any) {
    console.error("Create lab test error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create lab test" },
      { status: 500 },
    );
  }
}

// Submit test results
export async function PATCH(request: NextRequest) {
  try {
    const token = request.cookies.get("accessToken")?.value;
    if (!token) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const user = await authorizeServiceAccess(request, "laboratory", "update");
    const service = ServiceRegistry.get(
      "laboratory",
      request,
    ) as unknown as LaboratoryServiceHandler;
    const { testId, results } = await request.json();

    const labTest = await service.updateLaboratoryTest(token, testId, results);

    return NextResponse.json(labTest);
  } catch (error: any) {
    console.error("Submit test results error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to submit test results" },
      { status: 500 },
    );
  }
}
