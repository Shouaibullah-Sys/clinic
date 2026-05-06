// app/api/radiology/templates/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenPayload } from "@/lib/auth/jwt";

export async function GET(request: NextRequest) {
  try {
    const payload = await getTokenPayload(request);
    if (!payload) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const serviceType = searchParams.get("serviceType");
    const category = searchParams.get("category");
    const bodyPart = searchParams.get("bodyPart");
    const active = searchParams.get("active");
    const search = searchParams.get("search");

    const where: any = {};

    if (serviceType) {
      where.serviceType = serviceType;
    }

    if (category) {
      where.category = category;
    }

    if (bodyPart) {
      where.bodyPart = bodyPart;
    }

    if (active !== null) {
      where.active = active === "true";
    } else {
      where.active = true;
    }

    if (search) {
      where.OR = [
        { examName: { contains: search, mode: "insensitive" } },
        { category: { contains: search, mode: "insensitive" } },
        { bodyPart: { contains: search, mode: "insensitive" } },
      ];
    }

    const templates = await prisma.radiologyTemplate.findMany({
      where,
      orderBy: [{ category: "asc" }, { examName: "asc" }],
    });

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

export async function POST(request: NextRequest) {
  try {
    const payload = await getTokenPayload(request);
    if (!payload) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const allowedRoles = ["radiologist", "doctor", "admin"];
    if (!allowedRoles.includes(payload.role)) {
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
      examName,
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
    } = body;

    if (
      !examName ||
      !category ||
      !duration ||
      basePrice === undefined
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing required fields: examName, category, duration, and basePrice are required.",
        },
        { status: 400 },
      );
    }

    const existingTemplate = await prisma.radiologyTemplate.findFirst({
      where: { examName },
    });

    if (existingTemplate) {
      return NextResponse.json(
        { success: false, error: "Template already exists" },
        { status: 409 },
      );
    }

    const templateRecord = await prisma.radiologyTemplate.create({
      data: {
        templateCode: examName.toUpperCase().replace(/\s+/g, "_"),
        name: examName,
        examName: examName.toUpperCase(),
        serviceType: "other",
        category,
        bodyPart,
        views: JSON.stringify(views || []),
        description,
        contrastRequired: contrastRequired || false,
        contrastType,
        preparationInstructions,
        duration,
        basePrice,
        active,
        parameters: JSON.stringify(parameters || []),
        createdById: payload.id,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: templateRecord,
        message: "Radiology template created successfully",
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("Error creating radiology template:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to create radiology template",
      },
      { status: 500 },
    );
  }
}