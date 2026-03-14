// app/api/debug/insert-templates/route.ts
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { LabTestTemplate } from "@/lib/models/LabTestTemplate";
import mongoose from "mongoose";

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const body = await request.json();
    const { templates } = body;

    if (!templates || !Array.isArray(templates)) {
      return NextResponse.json(
        { success: false, error: "Templates array is required" },
        { status: 400 },
      );
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
      existing: [] as string[],
    };

    for (const template of templates) {
      try {
        // Check if already exists
        const existing = await LabTestTemplate.findOne({
          testCode: template.testCode.toUpperCase(),
        });

        if (existing) {
          results.existing.push(template.testCode);
          results.failed++;
          continue;
        }

        // Create the template
        await LabTestTemplate.create({
          ...template,
          testCode: template.testCode.toUpperCase(),
        });

        results.success++;
      } catch (error: any) {
        results.failed++;
        results.errors.push(`${template.testCode}: ${error.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      results,
      message: `Inserted ${results.success} templates, ${results.failed} failed (${results.existing.length} already existed)`,
    });
  } catch (error: any) {
    console.error("Error inserting templates:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}

// GET method to test the endpoint
export async function GET() {
  try {
    await dbConnect();

    const templates = await LabTestTemplate.find({})
      .select("testCode testName category active")
      .sort({ category: 1, testName: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      count: templates.length,
      data: templates,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
