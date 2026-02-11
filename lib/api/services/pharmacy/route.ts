// lib/api/services/pharmacy/route.ts
import { NextRequest, NextResponse } from "next/server";
import { ServiceRegistry } from "@/lib/services/base.service";
import { authorizeServiceAccess } from "@/lib/middleware/api-auth";
import { PharmacyServiceHandler } from "@/lib/services/pharmacy.service";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("accessToken")?.value;
    if (!token) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const user = await authorizeServiceAccess(request, "pharmacy", "read");
    const service = ServiceRegistry.get(
      "pharmacy",
      request,
    ) as unknown as PharmacyServiceHandler;

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const patientId = searchParams.get("patientId");
    const status = searchParams.get("status");
    const date = searchParams.get("date");

    const filters: any = {};
    if (patientId) filters.patient = patientId;
    if (status) filters.status = status;
    if (date) filters.createdAt = { $gte: new Date(date) };

    const result = await service.listPharmacyServices(token, filters, {
      page,
      limit,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Pharmacy service error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch prescriptions" },
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

    const user = await authorizeServiceAccess(request, "pharmacy", "create");
    const service = ServiceRegistry.get(
      "pharmacy",
      request,
    ) as unknown as PharmacyServiceHandler;
    const data = await request.json();

    // Generate prescription ID
    const prescriptionId = `PRES-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const prescription = await service.createPharmacyService(token, {
      ...data,
      prescriptionId,
      status: "pending",
      items: data.items.map((item: any) => ({
        ...item,
        dispensingStatus: "pending",
      })),
    });

    return NextResponse.json(prescription, { status: 201 });
  } catch (error: any) {
    console.error("Create prescription error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create prescription" },
      { status: 500 },
    );
  }
}

// Dispense medication
export async function PATCH(request: NextRequest) {
  try {
    const token = request.cookies.get("accessToken")?.value;
    if (!token) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const user = await authorizeServiceAccess(
      request,
      "pharmacy",
      "administer",
    );
    const service = ServiceRegistry.get(
      "pharmacy",
      request,
    ) as unknown as PharmacyServiceHandler;
    const { prescriptionId, items } = await request.json();

    const prescription = await service.updatePharmacyService(
      token,
      prescriptionId,
      items,
    );

    return NextResponse.json(prescription);
  } catch (error: any) {
    console.error("Dispense medication error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to dispense medication" },
      { status: 500 },
    );
  }
}
