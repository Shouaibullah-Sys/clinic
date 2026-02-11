// app/api/admissions/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { Admission } from "@/lib/models/Admission";
import { Patient } from "@/lib/models/Patient";
import { User } from "@/lib/models/User";
import { authMiddleware } from "@/lib/middleware/auth";

// GET single admission
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    console.log("params:", id, "typeof params:", typeof id);
    // Apply auth middleware
    const authResult = await authMiddleware(request);
    if (!authResult.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    await dbConnect();

    const admission = await Admission.findById(id)
      .populate("patient")
      .populate("doctor")
      .populate("treatments.administeredBy", "name role")
      .lean();

    if (!admission) {
      return NextResponse.json(
        { success: false, error: "Admission not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: admission,
    });
  } catch (error) {
    console.error("Error fetching admission:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch admission" },
      { status: 500 },
    );
  }
}

// PUT update admission
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Apply auth middleware
    const authResult = await authMiddleware(request);
    if (!authResult.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    await dbConnect();

    const body = await request.json();
    const userRole = request.headers.get("x-user-role");
    const userId = request.headers.get("x-user-id");

    // Check permissions
    if (!["admin", "doctor", "nurse"].includes(userRole || "")) {
      return NextResponse.json(
        { success: false, error: "Insufficient permissions" },
        { status: 403 },
      );
    }

    const { id } = await params;
    const admission = await Admission.findById(id);
    if (!admission) {
      return NextResponse.json(
        { success: false, error: "Admission not found" },
        { status: 404 },
      );
    }

    // Special handling for discharge
    if (body.status === "discharged") {
      if (!["admin", "doctor"].includes(userRole || "")) {
        return NextResponse.json(
          {
            success: false,
            error: "Only admin or doctor can discharge patients",
          },
          { status: 403 },
        );
      }

      if (!body.dischargeSummary) {
        return NextResponse.json(
          { success: false, error: "Discharge summary is required" },
          { status: 400 },
        );
      }

      body.dischargeDate = new Date();
    }

    // Special handling for vital signs
    if (body.vitalSigns) {
      body.vitalSigns = [
        ...admission.vitalSigns,
        {
          ...body.vitalSigns,
          date: new Date(),
          recordedBy: userId,
        },
      ];
    }

    // Special handling for treatments
    if (body.treatments) {
      body.treatments = [
        ...admission.treatments,
        {
          ...body.treatments,
          date: new Date(),
          administeredBy: userId,
        },
      ];
    }

    // Update admission
    Object.assign(admission, body);
    await admission.save();

    await admission.populate("patient", "patientId name");
    await admission.populate("doctor", "name specialization");

    return NextResponse.json({
      success: true,
      data: admission,
    });
  } catch (error) {
    console.error("Error updating admission:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update admission" },
      { status: 500 },
    );
  }
}

// DELETE admission
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Apply auth middleware
    const authResult = await authMiddleware(request);
    if (!authResult.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    await dbConnect();

    const userRole = request.headers.get("x-user-role");

    // Only admin can delete admissions
    if (userRole !== "admin") {
      return NextResponse.json(
        { success: false, error: "Only admin can delete admissions" },
        { status: 403 },
      );
    }

    const { id } = await params;
    const admission = await Admission.findById(id);
    if (!admission) {
      return NextResponse.json(
        { success: false, error: "Admission not found" },
        { status: 404 },
      );
    }

    // Only cancelled or discharged admissions can be deleted
    if (admission.status === "admitted") {
      return NextResponse.json(
        { success: false, error: "Cannot delete active admission" },
        { status: 400 },
      );
    }

    await admission.deleteOne();

    return NextResponse.json({
      success: true,
      message: "Admission deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting admission:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete admission" },
      { status: 500 },
    );
  }
}
