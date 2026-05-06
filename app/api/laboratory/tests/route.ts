import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status || 401 },
      );
    }

    const userId = auth.userId!;
    const userRole = auth.userRole!;
    const userName = auth.userName!;

    const { searchParams } = new URL(request.url);
    const tab = searchParams.get("tab") || "all";
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const limit = parseInt(searchParams.get("limit") || "100");
    const sort = searchParams.get("sort") || "-createdAt";

    const allowedRoles = ["lab_technician", "admin", "doctor"];
    if (!allowedRoles.includes(userRole)) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden. You don't have permission to access lab tests.",
          userRole: userRole,
          allowedRoles: allowedRoles,
        },
        { status: 403 },
      );
    }

    let where: any = {
      status: { not: "cancelled" },
    };

    switch (tab) {
      case "pending":
        where.sampleCollected = false;
        break;
      case "collected":
        where.sampleCollected = true;
        where.status = { not: "reported" };
        break;
      case "processing":
        where.status = "processing";
        break;
      case "completed":
        where.status = "completed";
        break;
      case "reported":
        where.status = "reported";
        break;
      case "all":
      default:
        break;
    }

    if (status && status !== "all") {
      where.status = status;
    }

    if (priority && priority !== "all") {
      where.priority = priority;
    }

    if (userRole === "lab_technician") {
      where.urgent = true;
    }

    if (userRole === "doctor") {
      where.doctorId = userId;
    }

    const tests = await prisma.labTest.findMany({
      where,
      orderBy: sort.startsWith("-")
        ? { [sort.substring(1)]: "desc" }
        : { [sort]: "asc" },
      take: limit,
    });

    return NextResponse.json({
      success: true,
      data: tests,
      count: tests.length,
      userRole: userRole,
      tab: tab,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch lab tests",
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
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

    const userRole = auth.userRole!;

    if (userRole !== "admin") {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden. Only admin can create test data.",
        },
        { status: 403 },
      );
    }

    const body = await request.json();

    const testId = `LABTEST${Date.now().toString().slice(-6)}`;

    const labTest = await prisma.labTest.create({
      data: {
        testId,
        tests: body.tests || "Complete Blood Count",
        category: body.category || "hematology",
        patientId: body.patientId,
        doctorId: body.doctorId,
        priority: body.priority || "routine",
        status: "pending",
        totalAmount: body.totalAmount || 150,
        createdById: auth.userId!,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: labTest,
        message: "Lab test created successfully",
      },
      { status: 201 },
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create lab test" },
      { status: 500 },
    );
  }
}