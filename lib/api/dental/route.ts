// lib/api/dental/route.ts - Updated with request tracking
import { NextRequest, NextResponse } from "next/server";
import { apiAuthMiddleware } from "@/lib/middleware/api-auth";
import { ServiceRegistry } from "@/lib/services/base.service";
import { ServiceActivityTracker } from "@/lib/middleware/activity-logger";

export async function GET(request: NextRequest) {
  try {
    const authResult = await apiAuthMiddleware(request);
    
    if (!authResult.user || !authResult.token) {
      // Log failed authentication
      await ServiceActivityTracker.trackServiceError(
        request,
        "dental",
        "list",
        "unknown",
        new Error(authResult.error || "Unauthorized")
      );
      
      return NextResponse.json(
        { error: authResult.error || "Unauthorized" },
        { status: 401 }
      );
    }

    // Log successful authentication
    await ServiceActivityTracker.trackServiceAccess(
      request,
      "dental",
      "list",
      authResult.user._id
    );

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const status = searchParams.get("status");
    const patientId = searchParams.get("patientId");

    const filters: any = {};
    if (status) filters.status = status;
    if (patientId) filters.patient = patientId;

    const dentalService = ServiceRegistry.get("dental", request);
    const result = await dentalService.listDentalRecords(
      authResult.token,
      filters,
      { page, limit }
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Dental records error:", error);
    
    // Log API error
    await ServiceActivityTracker.trackServiceError(
      request,
      "dental",
      "list",
      "unknown",
      error
    );
    
    if (error.name === "ServiceError") {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch dental records" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await apiAuthMiddleware(request);
    
    if (!authResult.user || !authResult.token) {
      await ServiceActivityTracker.trackServiceError(
        request,
        "dental",
        "create",
        "unknown",
        new Error(authResult.error || "Unauthorized")
      );
      
      return NextResponse.json(
        { error: authResult.error || "Unauthorized" },
        { status: 401 }
      );
    }

    const data = await request.json();
    
    // Log creation attempt
    await ServiceActivityTracker.trackServiceAccess(
      request,
      "dental",
      "create",
      authResult.user._id
    );

    const dentalService = ServiceRegistry.get("dental", request);
    const record = await dentalService.createDentalRecord(authResult.token, data);

    return NextResponse.json(record, { status: 201 });
  } catch (error: any) {
    console.error("Create dental record error:", error);
    
    // Log creation error
    const userId = (await apiAuthMiddleware(request)).user?._id || "unknown";
    await ServiceActivityTracker.trackServiceError(
      request,
      "dental",
      "create",
      userId,
      error
    );
    
    if (error.name === "ServiceError") {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      { error: "Failed to create dental record" },
      { status: 500 }
    );
  }
}