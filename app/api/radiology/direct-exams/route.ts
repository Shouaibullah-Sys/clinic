import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/auth";

const modalityAliasToCategory: Record<string, string> = {
  "x-ray": "xray",
  xray: "xray",
  "ct-scan": "ct",
  ct: "ct",
  mri: "mri",
  ultrasound: "ultrasound",
  mammography: "mammography",
  fluoroscopy: "fluoroscopy",
  "pet-scan": "nuclear_medicine",
  nuclear_medicine: "nuclear_medicine",
  "bone-density": "other",
  other: "other",
};

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status || 401 },
      );
    }

    const allowedRoles = [
      "radiology_technician",
      "radiologist",
      "admin",
      "receptionist",
      "doctor",
    ];
    if (!auth.userRole || !allowedRoles.includes(auth.userRole)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Forbidden. You don't have permission to access direct radiology exams.",
        },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "100");
    const sort = searchParams.get("sort") || "-createdAt";

    let where: any = {};

    if (status && status !== "all") {
      where.status = status;
    }

    const exams = await prisma.radiologyExam.findMany({
      where,
      orderBy: sort.startsWith("-")
        ? { [sort.substring(1)]: "desc" }
        : { [sort]: "asc" },
      take: limit,
    });

    return NextResponse.json({
      success: true,
      data: exams,
      count: exams.length,
      userRole: auth.userRole,
    });
  } catch (error: any) {
    console.error("Error fetching direct radiology exams:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch direct radiology exams",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status || 401 },
      );
    }

    const allowedRoles = [
      "radiology_technician",
      "radiologist",
      "admin",
      "receptionist",
    ];
    if (!auth.userRole || !allowedRoles.includes(auth.userRole)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Forbidden. Only radiology staff and receptionists can create direct radiology exams.",
        },
        { status: 403 },
      );
    }

    const body = await request.json();

    if (!body.patientId) {
      return NextResponse.json(
        { success: false, error: "Patient ID is required" },
        { status: 400 },
      );
    }

    const patient = await prisma.patient.findUnique({
      where: { id: body.patientId },
    });
    if (!patient) {
      return NextResponse.json(
        { success: false, error: "Patient not found" },
        { status: 404 },
      );
    }

    const radiologyExam = await prisma.radiologyExam.create({
      data: {
        examId: `RAD${Date.now().toString().slice(-8)}`,
        serviceId: `SRV${Date.now().toString().slice(-8)}`,
        patientId: body.patientId,
        doctorId: body.doctorId || auth.userId!,
        date: new Date(),
        status: "pending",
        totalAmount: body.price || 0,
        createdById: auth.userId!,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: radiologyExam,
        message: "Direct radiology exam created successfully",
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("Error creating direct radiology exam:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to create direct radiology exam",
      },
      { status: 500 },
    );
  }
}