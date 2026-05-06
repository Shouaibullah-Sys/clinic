import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/auth";
import { transformLabTestTemplateForAPI, transformLabTestTemplatesForAPI, transformLabTestTemplateForDB } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status || 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");

    let where: any = {};

    if (search) {
      where.OR = [
        { testName: { contains: search, mode: "insensitive" } },
        { testType: { contains: search, mode: "insensitive" } },
        { instruction: { contains: search, mode: "insensitive" } },
      ];
    }

    let templates = await prisma.labTestTemplate.findMany({
      where,
      orderBy: { tests: "asc" },
    });

    // Transform to frontend-compatible format
    templates = transformLabTestTemplatesForAPI(templates);

    return NextResponse.json({
      success: true,
      data: templates,
      count: templates.length,
    });
  } catch (error: any) {
    console.error("Error fetching lab test templates:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch lab test templates",
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

    const allowedRoles = ["lab_technician", "doctor", "admin"];
    if (!allowedRoles.includes(auth.userRole!)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Forbidden. You don't have permission to create lab test templates.",
        },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { testName, testCode, category, description, instruction, preparationInstructions, basePrice, active = true, parameters, specimenType, containerType, sampleVolume, fastingRequired, turnaroundTime = 24 } = body;

    if (!testName || !category) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: testName and category are required.",
        },
        { status: 400 },
      );
    }

    const existingTemplate = await prisma.labTestTemplate.findFirst({
      where: { testType: (testCode || testName).toUpperCase().replace(/\s+/g, "_") },
    });
    if (existingTemplate) {
      return NextResponse.json(
        { success: false, error: "Test code already exists" },
        { status: 409 },
      );
    }

    // Transform to DB format
    const dbData = transformLabTestTemplateForDB({
      testCode: testCode || testName,
      testName,
      tests: body.tests || testName,
      category,
      description: description || '',
      preparationInstructions: body.preparationInstructions || instruction || description || '',
      basePrice: basePrice || 0,
      active,
      parameters: parameters || [],
      specimenType: specimenType || [],
      containerType: containerType || [],
      sampleVolume: sampleVolume || '',
      fastingRequired: fastingRequired !== undefined ? fastingRequired : false,
      turnaroundTime,
    });

    const template = await prisma.labTestTemplate.create({
      data: dbData,
    });

    // Transform back to API format
    const transformedTemplate = transformLabTestTemplateForAPI(template);

    return NextResponse.json(
      {
        success: true,
        data: transformedTemplate,
        message: "Lab test template created successfully",
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("Error creating lab test template:", error);

    if (error.code === "P2002") {
      return NextResponse.json(
        { success: false, error: "Duplicate test name detected" },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to create lab test template",
      },
      { status: 500 },
    );
  }
}