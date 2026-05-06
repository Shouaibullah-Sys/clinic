import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/auth";
import { buildMarkedOnlyQuery } from "@/lib/utils/markedTransactions";

const normalizeDirectTestWorkflow = (test: any) => {
  const isCollected = test.collectionStatus === "collected";
  const hasResults = (test.results?.parameters?.length || 0) > 0;

  if (!isCollected) return test;

  return {
    ...test,
    status:
      test.status === "pending" ||
      test.status === "ordered" ||
      test.status === "processing"
        ? "completed"
        : test.status,
    processingStatus: "completed",
    readyForPrint: hasResults ? true : test.readyForPrint,
  };
};

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status || 401 },
      );
    }

    const allowedRoles = ["lab_technician", "admin", "receptionist", "doctor"];
    if (!auth.userRole || !allowedRoles.includes(auth.userRole)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Forbidden. You don't have permission to access direct lab tests.",
        },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const paymentStatus = searchParams.get("paymentStatus");
    const finalized = searchParams.get("finalized");
    const readyForPrint = searchParams.get("readyForPrint");
    const batchId = searchParams.get("batchId");
    const limit = parseInt(searchParams.get("limit") || "100");
    const sort = searchParams.get("sort") || "-createdAtDirect";

    let where: any = { isDirectTest: true };

    if (status && status !== "all") {
      where.status = status;
    }

    if (paymentStatus && paymentStatus !== "all") {
      where.charges = { ...where.charges, paymentStatus };
    }

    if (finalized !== null && finalized !== undefined) {
      where.finalized = finalized === "true";
    }

    if (readyForPrint !== null && readyForPrint !== undefined) {
      where.readyForPrint = readyForPrint === "true";
    }

    if (batchId) {
      where.directBatchId = batchId;
    }

    const { query: finalQuery } = await buildMarkedOnlyQuery({
      userId: auth.userId!,
      module: "lab",
      baseQuery: where,
    });

    const tests = await prisma.labTest.findMany({
      where: finalQuery,
      include: {
        patient: {
          select: {
            name: true,
            patientId: true,
            phone: true,
            guardian: true,
            dateOfBirth: true,
            gender: true,
            address: true,
            refPerson: true,
            passTskNo: true,
            registrationNo: true,
          },
        },
        createdBy: { select: { name: true } },
      },
      orderBy: sort.startsWith("-")
        ? { [sort.substring(1)]: "desc" }
        : { [sort]: "asc" },
      take: limit,
    });

    const normalizedTests = tests.map(normalizeDirectTestWorkflow);

    return NextResponse.json({
      success: true,
      data: normalizedTests,
      count: normalizedTests.length,
      userRole: auth.userRole,
    });
  } catch (error: any) {
    console.error("Error fetching direct lab tests:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch direct lab tests",
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

    const allowedRoles = ["lab_technician", "admin", "receptionist"];
    if (!auth.userRole || !allowedRoles.includes(auth.userRole)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Forbidden. Only laboratory staff and receptionists can create direct lab tests.",
        },
        { status: 403 },
      );
    }

    const body = await request.json();

    if (!body.patientId) {
      return NextResponse.json(
        { success: false, error: "Patient ID is required" },
        { status: 400 },
      );
    }

    let testTemplate = null;
    if (body.testTemplateId) {
      testTemplate = await prisma.labTestTemplate.findUnique({
        where: { id: body.testTemplateId },
      });
      if (!testTemplate) {
        return NextResponse.json(
          { success: false, error: "Test template not found" },
          { status: 404 },
        );
      }

      if (!testTemplate.active) {
        return NextResponse.json(
          { success: false, error: "Test template is not active" },
          { status: 400 },
        );
      }
    } else if (!body.testName) {
      return NextResponse.json(
        { success: false, error: "Test name is required" },
        { status: 400 },
      );
    }

    const patient = await prisma.patient.findUnique({
      where: { id: body.patientId },
    });
    if (!patient) {
      return NextResponse.json(
        { success: false, error: "Patient not found" },
        { status: 404 },
      );
    }

    const snapshotOverrides = body.patientSnapshot || {};
    const patientSnapshot = {
      name: snapshotOverrides.name ?? patient.name,
      patientId: snapshotOverrides.patientId ?? patient.patientId,
      phone: snapshotOverrides.phone ?? patient.phone,
      gender: snapshotOverrides.gender ?? patient.gender,
      guardian: snapshotOverrides.guardian ?? patient.guardian,
      address: snapshotOverrides.address ?? patient.address,
      refPerson: snapshotOverrides.refPerson ?? patient.refPerson,
      passTskNo: snapshotOverrides.passTskNo ?? patient.passTskNo,
      registrationNo:
        snapshotOverrides.registrationNo ?? patient.registrationNo,
    };

    const testName = testTemplate?.testName || body.testName;
    const category = testTemplate?.category || body.category || "general";
    const description = testTemplate?.instruction || body.description;
    const basePrice = testTemplate?.basePrice || body.price;
    const specimenType = body.specimenType || "blood";
    const turnaroundTime =
      testTemplate?.turnaroundTime || body.turnaroundTime || 24;

    if (!basePrice || isNaN(basePrice) || basePrice <= 0) {
      return NextResponse.json(
        { success: false, error: "Valid test price is required" },
        { status: 400 },
      );
    }

    const validPriorities = ["routine", "urgent", "emergency"];
    const priority = body.priority || "routine";
    if (!validPriorities.includes(priority)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid priority. Must be routine, urgent, or emergency",
        },
        { status: 400 },
      );
    }

    let testParameters: any[] = [];
    let resultsParameters: any[] = [];
    if (testTemplate && testTemplate.parameters && Array.isArray(testTemplate.parameters)) {
      testParameters = (testTemplate.parameters as any[]).map((param: any) => ({
        parameterName: param.parameterName || param.name,
        unit: param.unit || "",
        normalRange: param.normalRange || "",
        description: param.description || "",
        group: param.group || "",
      }));
    } else if (body.parameters && Array.isArray(body.parameters)) {
      testParameters = body.parameters.map((param: any) => ({
        parameterName: param.parameterName || param.name,
        unit: param.unit || "",
        normalRange: param.normalRange || "",
        description: param.description || "",
        group: param.group || "",
      }));
    }

    if (
      body.results &&
      body.results.parameters &&
      Array.isArray(body.results.parameters)
    ) {
      resultsParameters = body.results.parameters.map((param: any) => ({
        name: param.name || param.parameterName,
        value: param.value || "",
        unit: param.unit || "",
        normalRange: param.normalRange || "",
        remarks: param.remarks || "",
        flag: param.flag || "normal",
        group: param.group || undefined,
      }));
    }

    const testId = `LABTEST${Date.now().toString().slice(-6)}`;

    const labTest = await prisma.labTest.create({
      data: {
        testId,
        testName,
        category,
        description,
        tests: body.tests || testName || "Direct Lab Test",
        totalAmount: basePrice,
        price: basePrice,
        patientId: body.patientId,
        doctorId: auth.userId!,
        orderedById: auth.userId!,
        orderedAt: new Date(),
        status: "ordered",
        collectionStatus: "pending",
        processingStatus: "pending",
        verificationStatus: "pending",
        priority,
        paymentVerified: false,
        doctorName: body.doctorName?.trim() || null,
        specimenType,
        isDirectTest: true,
        createdById: auth.userId!,
        createdAtDirect: new Date(),
        finalized: false,
        readyForPrint: false,
        testParameters: testParameters.length > 0 ? JSON.stringify(testParameters) : "[]",
        results:
          resultsParameters.length > 0
            ? JSON.stringify({ parameters: resultsParameters, interpretation: body.results.interpretation || "" })
            : "{}",
        notes: body.notes,
        directBatchId: body.batchId,
        patientSnapshot: JSON.stringify(patientSnapshot),
      },
      include: {
        patient: { select: { name: true, patientId: true, phone: true } },
        createdBy: { select: { name: true } },
      },
    });

    console.log(
      `Direct lab test created: ${labTest.testId} by ${auth.userName}`,
    );

    return NextResponse.json(
      {
        success: true,
        data: labTest,
        message: "Direct lab test created successfully",
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("Error creating direct lab test:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to create direct lab test",
      },
      { status: 500 },
    );
  }
}