// app/api/laboratory/templates/route.ts

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { LabTestTemplate } from "@/lib/models/LabTestTemplate";
import { authenticateRequest, hasRequiredRole } from "@/lib/auth";
import mongoose from "mongoose";

// GET: Fetch all lab test templates (with optional filtering)
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const auth = await authenticateRequest(request);
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status || 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const active = searchParams.get("active");
    const search = searchParams.get("search");

    // Build query
    const query: any = {};

    if (category) {
      query.category = category;
    }

    if (active !== null) {
      query.active = active === "true";
    }

    if (search) {
      query.$or = [
        { testName: { $regex: search, $options: "i" } },
        { testCode: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const templates = await LabTestTemplate.find(query)
      .populate("createdBy", "name email")
      .sort({ category: 1, testName: 1 })
      .lean();

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

// POST: Create a new lab test template
export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const auth = await authenticateRequest(request);
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status || 401 },
      );
    }

    // Only lab technicians, doctors, and admins can create templates
    const allowedRoles = ["lab_technician", "doctor", "admin"];
    if (!hasRequiredRole(auth.userRole, allowedRoles)) {
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
    const {
      testCode,
      testName,
      category,
      description,
      specimenType,
      containerType,
      sampleVolume,
      fastingRequired,
      preparationInstructions,
      turnaroundTime,
      basePrice,
      active = true,
      parameters,
    } = body;

    // Validate required fields
    if (
      !testCode ||
      !testName ||
      !category ||
      !turnaroundTime ||
      basePrice === undefined
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing required fields: testCode, testName, category, turnaroundTime, and basePrice are required.",
        },
        { status: 400 },
      );
    }

    // Check if test code already exists
    const existingTemplate = await LabTestTemplate.findOne({
      testCode: testCode.toUpperCase(),
    });
    if (existingTemplate) {
      return NextResponse.json(
        { success: false, error: "Test code already exists" },
        { status: 409 },
      );
    }

    // Create the template
    const template = await LabTestTemplate.create({
      testCode: testCode.toUpperCase(),
      testName,
      category,
      description,
      specimenType: specimenType || [],
      containerType: containerType || [],
      sampleVolume,
      fastingRequired: fastingRequired || false,
      preparationInstructions,
      turnaroundTime,
      basePrice,
      active,
      parameters: parameters || [],
      createdBy: new mongoose.Types.ObjectId(auth.userId),
    });

    // Populate for response
    const populatedTemplate = await LabTestTemplate.findById(template._id)
      .populate("createdBy", "name email")
      .lean();

    return NextResponse.json(
      {
        success: true,
        data: populatedTemplate,
        message: "Lab test template created successfully",
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("Error creating lab test template:", error);

    // Handle validation errors
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err: any) => err.message);
      return NextResponse.json(
        { success: false, error: "Validation failed", details: errors },
        { status: 400 },
      );
    }

    // Handle duplicate key errors
    if (error.code === 11000) {
      return NextResponse.json(
        { success: false, error: "Duplicate test code detected" },
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
