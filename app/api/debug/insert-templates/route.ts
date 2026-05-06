// app/api/debug/insert-templates/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
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
        const existing = await prisma.labTestTemplate.findUnique({
          where: { testType: template.testType?.toUpperCase() },
        });

        if (existing) {
          results.existing.push(template.testType);
          results.failed++;
          continue;
        }

        await prisma.labTestTemplate.create({
          data: {
            ...template,
            testType: template.testType?.toUpperCase(),
          },
        });

        results.success++;
      } catch (error: any) {
        results.failed++;
        results.errors.push(`${template.testType}: ${error.message}`);
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

export async function GET() {
  try {
    const templates = await prisma.labTestTemplate.findMany({
      select: { testType: true, testName: true, category: true, active: true },
      orderBy: [{ category: "asc" }, { testName: "asc" }],
    });

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