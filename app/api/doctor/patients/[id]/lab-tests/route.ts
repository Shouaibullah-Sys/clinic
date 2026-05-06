import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenPayload } from "@/lib/auth/jwt";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: patientId } = await params;

    const payload = await getTokenPayload(request);
    if (!payload) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. No token provided." },
        { status: 401 },
      );
    }

    const userId = payload.id;
    const userRole = payload.role;

    if (userRole !== "doctor") {
      return NextResponse.json(
        { success: false, error: "Forbidden. Doctor access required." },
        { status: 403 },
      );
    }

    const labTests = await prisma.labTest.findMany({
      where: {
        patientId: patientId,
        OR: [{ doctorId: userId }, { orderedById: userId }],
      },
      select: {
        id: true,
        testId: true,
        testName: true,
        category: true,
        createdAt: true,
        status: true,
        collectionStatus: true,
        processingStatus: true,
        verificationStatus: true,
        priority: true,
        notes: true,
        testParameters: true,
        charges: true,
        price: true,
        discountedPrice: true,
        doctor: { select: { name: true } },
        orderedBy: { select: { name: true } },
        appointment: { select: { appointmentId: true, date: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: labTests,
    });
  } catch (error: any) {
    console.error("Error fetching lab tests:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch lab tests" },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: patientId } = await params;

    const payload = await getTokenPayload(request);
    if (!payload) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. No token provided." },
        { status: 401 },
      );
    }

    const userId = payload.id;
    const userRole = payload.role;

    if (!["doctor", "admin"].includes(userRole)) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden. Only doctors can order lab tests.",
        },
        { status: 403 },
      );
    }

    const body = await request.json();
    const {
      appointmentId,
      templateId,
      testName,
      category,
      priority = "routine",
      notes,
    } = body;

    if (!templateId && (!testName || !category)) {
      return NextResponse.json(
        {
          success: false,
          error: "Either templateId or (testName and category) must be provided",
        },
        { status: 400 },
      );
    }

    let template = null;
    let priceNum = 0;
    let description = notes?.trim();
    let instructions = notes?.trim();
    let specimenType = "other";

    if (templateId) {
      template = await prisma.labTestTemplate.findUnique({ where: { id: templateId } });
      if (!template) {
        return NextResponse.json(
          {
            success: false,
            error: "Lab test template not found",
          },
          { status: 404 },
        );
      }

      priceNum = template.basePrice || 0;
      description = template.instruction || notes?.trim();
      instructions = template.instruction || notes?.trim();
      const params = template.specimenType ? JSON.parse(template.specimenType) : [];
      specimenType = params[0] || "other";
    } else {
      priceNum = 0;
      description = notes?.trim();
      instructions = notes?.trim();

      const categoryToSpecimenMap: { [key: string]: string } = {
        hematology: "blood",
        blood_test: "blood",
        urine_test: "urine",
        stool_test: "stool",
        biopsy: "tissue",
        culture: "other",
        hormone_test: "blood",
        genetic_test: "blood",
        other: "other",
      };

      specimenType = categoryToSpecimenMap[category] || "other";
    }

    let appointment = null;
    if (appointmentId) {
      appointment = await prisma.appointment.findFirst({
        where: { id: appointmentId, patientId: patientId },
      });

      if (!appointment) {
        return NextResponse.json(
          {
            success: false,
            error: "Appointment not found or does not belong to this patient",
          },
          { status: 404 },
        );
      }
    }

    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const random = Math.floor(100 + Math.random() * 900);
    const newTestId = `TEST${year}${month}${random}`;

    const finalTestName = template ? template.testName : testName.trim();
    const finalCategory = template ? template.category : category;

    const charges = {
      basePrice: priceNum,
      tax: 0,
      discount: 0,
      otherCharges: 0,
      totalAmount: priceNum,
      paid: 0,
      due: priceNum,
      paymentStatus: "pending",
    };

    const labTestData: any = {
      testId: newTestId,
      patientId,
      doctorId: userId,
      testName: finalTestName,
      category: finalCategory,
      description: description,
      price: priceNum,
      priority,
      notes: notes?.trim(),
      orderedById: userId,
      collectionStatus: "pending",
      processingStatus: "pending",
      verificationStatus: "pending",
      paymentVerified: false,
      charges: JSON.stringify(charges),
      testParameters: template?.parameters
        ? JSON.stringify(
            JSON.parse(template.parameters).map((param: any) => ({
              name: param.parameterName,
              value: "",
              unit: param.unit,
              normalRange: param.normalRange,
              flag: "normal",
              remarks: "",
            })),
          )
        : JSON.stringify([]),
    };

    if (appointmentId) {
      labTestData.appointmentId = appointmentId;
    }

    const labTest = await prisma.labTest.create({ data: labTestData });

    console.log(
      `Lab test ordered successfully: ${labTest.testId} for appointment: ${appointmentId || "No appointment linked"}`,
    );

    return NextResponse.json(
      {
        success: true,
        data: labTest,
        message: "Lab test ordered successfully",
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("Error ordering lab test:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to order lab test" },
      { status: 500 },
    );
  }
}