// app/api/radiology/templates/route.ts

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { RadiologyTemplate } from "@/lib/models/RadiologyTemplate";
import { authenticateRequest, hasRequiredRole } from "@/lib/auth";
import mongoose from "mongoose";

// GET: Fetch all radiology exam templates (with optional filtering)
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
    const serviceType = searchParams.get("serviceType");
    const category = searchParams.get("category");
    const bodyPart = searchParams.get("bodyPart");
    const active = searchParams.get("active");
    const search = searchParams.get("search");

    // Build query - only return active templates by default
    const query: any = {};

    if (serviceType) {
      query.serviceType = serviceType;
    }

    if (category) {
      query.category = category;
    }

    if (bodyPart) {
      query.bodyPart = bodyPart;
    }

    // Only return active templates by default
    if (active !== null) {
      query.active = active === "true";
    } else {
      query.active = true; // Default to active only
    }

    if (search) {
      query.$or = [
        { examName: { $regex: search, $options: "i" } },
        { templateCode: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { bodyPart: { $regex: search, $options: "i" } },
      ];
    }

    const templates = await RadiologyTemplate.find(query)
      .populate("createdBy", "name email")
      .sort({ category: 1, examName: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: templates,
      count: templates.length,
    });
  } catch (error: any) {
    console.error("Error fetching radiology templates:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch radiology templates",
      },
      { status: 500 },
    );
  }
}

// POST: Create a new radiology exam template
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

    // Only radiologists, doctors, and admins can create templates
    const allowedRoles = ["radiologist", "doctor", "admin"];
    if (!hasRequiredRole(auth.userRole, allowedRoles)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Forbidden. You don't have permission to create radiology templates.",
        },
        { status: 403 },
      );
    }

    const body = await request.json();
    const {
      templateCode,
      examName,
      serviceType,
      category,
      bodyPart,
      views,
      description,
      contrastRequired,
      contrastType,
      preparationInstructions,
      duration,
      basePrice,
      active = true,
      parameters,
      clinicalIndicationTemplate,
      techniqueTemplate,
      comparisonTemplate,
      findingsTemplate,
      impressionTemplate,
      recommendationTemplate,
      criticalFindingsChecklist,
    } = body;

    // Validate required fields
    if (
      !templateCode ||
      !examName ||
      !serviceType ||
      !category ||
      !duration ||
      basePrice === undefined
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing required fields: templateCode, examName, serviceType, category, duration, and basePrice are required.",
        },
        { status: 400 },
      );
    }

    // Check if template code already exists
    const existingTemplate = await RadiologyTemplate.findOne({
      templateCode: templateCode.toUpperCase(),
    });
    if (existingTemplate) {
      return NextResponse.json(
        { success: false, error: "Template code already exists" },
        { status: 409 },
      );
    }

    // Create the template
    const template = await RadiologyTemplate.create({
      templateCode: templateCode.toUpperCase(),
      examName,
      serviceType,
      category,
      bodyPart,
      views: views || [],
      description,
      contrastRequired: contrastRequired || false,
      contrastType,
      preparationInstructions,
      duration,
      basePrice,
      active,
      parameters: parameters || [],
      clinicalIndicationTemplate,
      techniqueTemplate,
      comparisonTemplate,
      findingsTemplate,
      impressionTemplate,
      recommendationTemplate,
      criticalFindingsChecklist: criticalFindingsChecklist || [],
      createdBy: new mongoose.Types.ObjectId(auth.userId),
    });

    // Populate for response
    const populatedTemplate = await RadiologyTemplate.findById(template._id)
      .populate("createdBy", "name email")
      .lean();

    return NextResponse.json(
      {
        success: true,
        data: populatedTemplate,
        message: "Radiology template created successfully",
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("Error creating radiology template:", error);

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
        { success: false, error: "Duplicate template code detected" },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to create radiology template",
      },
      { status: 500 },
    );
  }
}
