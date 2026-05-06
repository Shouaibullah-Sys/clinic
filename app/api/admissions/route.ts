import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

const checkPermission = (role: string, allowedRoles: string[]): boolean => {
  return allowedRoles.includes(role);
};

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    const userRole = request.headers.get("x-user-role");

    if (!userId || !userRole) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Please login again." },
        { status: 401 }
      );
    }

    const canView = checkPermission(userRole, [
      "admin",
      "doctor",
      "nurse",
      "receptionist",
    ]);

    if (!canView) {
      return NextResponse.json(
        { success: false, error: "Insufficient permissions to view admissions" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const includeStats = searchParams.get("includeStats") === "true";

    if (includeStats) {
      const [
        totalAdmissions,
        admittedCount,
        dischargedCount,
      ] = await Promise.all([
        prisma.admission.count({}),
        prisma.admission.count({ where: { status: "admitted" } }),
        prisma.admission.count({ where: { status: "discharged" } }),
      ]);

      const occupancyRate = (admittedCount / 100) * 100;

      return NextResponse.json({
        success: true,
        stats: {
          total: totalAdmissions,
          admitted: admittedCount,
          discharged: dischargedCount,
          averageStay: 0,
          occupancyRate: parseFloat(occupancyRate.toFixed(1)),
        },
      });
    }

    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const status = searchParams.get("status");
    const ward = searchParams.get("ward");
    const search = searchParams.get("search");
    const sortBy = searchParams.get("sortBy") || "admissionDate";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    const skip = (page - 1) * limit;

    let where: Prisma.AdmissionWhereInput = {};

    if (status) where.status = status;
    if (ward) where.ward = { contains: ward };

    if (search) {
      where.OR = [
        { admissionId: { contains: search } },
        { reason: { contains: search } },
        { diagnosis: { contains: search } },
        { bedNo: { contains: search } },
      ];
    }

    if (userRole === "doctor") {
      where.doctorId = userId;
    }

    const [admissions, total] = await Promise.all([
      prisma.admission.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.admission.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: admissions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Error in GET /api/admissions:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch admissions data",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    const userRole = request.headers.get("x-user-role");

    if (!userId || !userRole) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!checkPermission(userRole, ["admin", "doctor", "receptionist"])) {
      return NextResponse.json(
        { success: false, error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const body: {
      patientId: string;
      doctor?: string;
      reason: string;
      diagnosis: string;
      ward: string;
      bedNo: string;
      admissionDate?: string;
      admissionType?: string;
      treatment?: string;
    } = await request.json();

    const requiredFields: (keyof typeof body)[] = ["patientId", "reason", "diagnosis", "ward", "bedNo"];
    const missingFields = requiredFields.filter(field => !body[field]);

    if (missingFields.length > 0) {
      return NextResponse.json(
        { success: false, error: `Missing required fields: ${missingFields.join(", ")}` },
        { status: 400 }
      );
    }

    const patient = await prisma.patient.findUnique({
      where: { id: body.patientId },
    });
    if (!patient) {
      return NextResponse.json(
        { success: false, error: "Patient not found" },
        { status: 404 }
      );
    }

    const existingAdmission = await prisma.admission.findFirst({
      where: {
        ward: body.ward,
        bedNo: body.bedNo,
        status: "admitted",
      },
    });

    if (existingAdmission) {
      return NextResponse.json(
        { success: false, error: "Bed is already occupied" },
        { status: 400 }
      );
    }

    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const random = Math.floor(1000 + Math.random() * 9000);
    const admissionId = `ADM${year}${month}${random}`;

    const admission = await prisma.admission.create({
      data: {
        admissionId,
        patientId: body.patientId,
        doctorId: body.doctor || userId,
        admissionDate: body.admissionDate ? new Date(body.admissionDate) : new Date(),
        reason: body.reason || undefined,
        diagnosis: body.diagnosis || undefined,
        ward: body.ward,
        bedNo: body.bedNo,
        admissionType: body.admissionType || "general",
        status: "admitted",
        treatment: body.treatment || undefined,
        createdById: userId,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Admission created successfully",
        data: admission,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error in POST /api/admissions:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create admission",
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  return NextResponse.json(
    { success: false, error: "Method not allowed" },
    { status: 405 }
  );
}

export async function DELETE(request: NextRequest) {
  return NextResponse.json(
    { success: false, error: "Method not allowed" },
    { status: 405 }
  );
}