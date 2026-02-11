// lib/api/services/imaging/[type]/[id]/route.ts - Individual imaging record
import { NextRequest, NextResponse } from "next/server";
import { ServiceRegistry } from "@/lib/services/base.service";
import { authorizeServiceAccess } from "@/lib/middleware/api-auth";
import { ImagingServiceHandler } from "@/lib/services/imaging.service";

const IMAGING_TYPES = ["xray", "ct_scan", "mri", "ultrasound"] as const;

export async function GET(
  request: NextRequest,
  { params }: { params: { type: string; id: string } },
) {
  try {
    const imagingType = params.type.toLowerCase();
    const recordId = params.id;

    if (!IMAGING_TYPES.includes(imagingType as any)) {
      return NextResponse.json(
        { error: "Invalid imaging type" },
        { status: 400 },
      );
    }

    const token = request.cookies.get("accessToken")?.value;
    if (!token) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const user = await authorizeServiceAccess(
      request,
      imagingType as any,
      "read",
    );
    const service = ServiceRegistry.get(
      imagingType,
      request,
    ) as ImagingServiceHandler;
    const record = await service.getImagingRecord(token, recordId);

    return NextResponse.json(record);
  } catch (error: any) {
    console.error("Get imaging record error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch imaging record" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { type: string; id: string } },
) {
  try {
    const imagingType = params.type.toLowerCase();
    const recordId = params.id;

    if (!IMAGING_TYPES.includes(imagingType as any)) {
      return NextResponse.json(
        { error: "Invalid imaging type" },
        { status: 400 },
      );
    }

    const token = request.cookies.get("accessToken")?.value;
    if (!token) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const user = await authorizeServiceAccess(
      request,
      imagingType as any,
      "update",
    );
    const service = ServiceRegistry.get(
      imagingType,
      request,
    ) as ImagingServiceHandler;
    const updates = await request.json();

    const record = await service.updateImagingRecord(token, recordId, updates);

    return NextResponse.json(record);
  } catch (error: any) {
    console.error("Update imaging record error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update imaging record" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { type: string; id: string } },
) {
  try {
    const imagingType = params.type.toLowerCase();
    const recordId = params.id;

    if (!IMAGING_TYPES.includes(imagingType as any)) {
      return NextResponse.json(
        { error: "Invalid imaging type" },
        { status: 400 },
      );
    }

    const token = request.cookies.get("accessToken")?.value;
    if (!token) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const user = await authorizeServiceAccess(
      request,
      imagingType as any,
      "delete",
    );
    const service = ServiceRegistry.get(
      imagingType,
      request,
    ) as ImagingServiceHandler;

    await service.deleteImagingRecord(token, recordId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete imaging record error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete imaging record" },
      { status: 500 },
    );
  }
}
