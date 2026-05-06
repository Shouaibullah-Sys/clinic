// app/api/laboratory/create-test/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenPayload } from "@/lib/auth/jwt";

export async function POST(request: NextRequest) {
  try {
    const payload = await getTokenPayload(request);
    if (!payload) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const userId = payload.id;
    const userRole = payload.role;
    const userName = payload.name || "System";

    if (!["admin", "lab_technician"].includes(userRole)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Forbidden. Only admin and laboratory staff can create test data.",
          userRole: userRole,
        },
        { status: 403 },
      );
    }

    const body = await request.json();
    const {
      patientId,
      doctorId,
      testName,
      category,
      price,
      priority = "routine",
      status = "ordered",
      collectionStatus = "pending",
      processingStatus = "pending",
      paymentVerified = false,
      notes = "Test data created for laboratory testing",
    } = body;

    if (!patientId || !doctorId || !testName || !category || !price) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing required fields: patientId, doctorId, testName, category, and price are required",
        },
        { status: 400 },
      );
    }

    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    const random = Math.floor(100 + Math.random() * 900);
    const testId = `TEST${year}${month}${day}${random}`;

    const priceNum = parseFloat(price);
    const charges = {
      basePrice: priceNum,
      tax: 0,
      discount: 0,
      otherCharges: 0,
      totalAmount: priceNum,
      paid: paymentVerified ? priceNum : 0,
      due: paymentVerified ? 0 : priceNum,
      paymentStatus: paymentVerified ? "paid" : "pending",
      paymentMethod: paymentVerified ? "cash" : undefined,
    };

    const labTestData: any = {
      testId,
      testName,
      category,
      patientId,
      doctorId,
      price: priceNum,
      priority,
      notes: `${notes} - Created by ${userName} (${userRole})`,
      orderedById: userId,
      collectionStatus,
      processingStatus,
      paymentVerified,
      charges: JSON.stringify(charges),
      testParameters: JSON.stringify([]),
    };

    if (collectionStatus === "collected") {
      const collectionDetails = {
        collectionTime: new Date().toISOString(),
        collectedBy: userId,
        collectionNotes: "Sample collected for testing",
        sampleId: `SMP${year}${month}${day}${Math.floor(100 + Math.random() * 900)}`,
        sampleCondition: "satisfactory",
      };
      labTestData.collectionStatus = "collected";
      labTestData.specimenType = "blood";
    }

    if (processingStatus === "completed") {
      labTestData.testParameters = JSON.stringify([
        {
          name: "Test Parameter",
          value: "Normal",
          unit: "Qualitative",
          normalRange: "Normal",
          flag: "normal",
          remarks: "Test completed successfully",
        },
      ]);
    }

    const labTest = await prisma.labTest.create({ data: labTestData });

    console.log(`Created test lab test: ${testId} - ${testName}`);

    const populatedTest = await prisma.labTest.findUnique({
      where: { id: labTest.id },
      include: {
        patient: { select: { name: true, patientId: true, phone: true } },
        doctor: { select: { name: true, specialization: true } },
        orderedBy: { select: { name: true } },
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: populatedTest,
        message: "Test lab test created successfully",
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("Error creating test lab test:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to create test lab test",
        details: {},
      },
      { status: 500 },
    );
  }
}