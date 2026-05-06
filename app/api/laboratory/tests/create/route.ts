// app/api/laboratory/tests/create/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenPayload } from "@/lib/auth/jwt";
import { canAccessLaboratory } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const payload = await getTokenPayload(request);
    if (!payload) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (!canAccessLaboratory(payload.role)) {
      return NextResponse.json(
        { success: false, error: "Forbidden. You don't have permission to create lab tests." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      appointment,
      patient,
      doctor,
      testName,
      category,
      description,
      price,
      discountedPrice,
      priority = "routine",
      notes,
      specimen,
      collectionDetails,
      parameters,
      turnaroundTime,
      charges,
      paymentMethod,
    } = body;

    console.log(`Creating lab test by ${payload.role} ${payload.name}:`, { patient, doctor, testName });

    if (!patient || !doctor || !testName || !category) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: patient, doctor, testName, category are required.",
        },
        { status: 400 }
      );
    }

    const patientExists = await prisma.patient.findUnique({ where: { id: patient } });
    if (!patientExists) {
      return NextResponse.json({ success: false, error: "Patient not found" }, { status: 404 });
    }

    const doctorExists = await prisma.user.findUnique({ where: { id: doctor } });
    if (!doctorExists || !["doctor", "admin"].includes(doctorExists.role)) {
      return NextResponse.json(
        { success: false, error: "Invalid doctor or doctor not found" },
        { status: 400 }
      );
    }

    let testTemplate = null;
    if (body.templateId) {
      testTemplate = await prisma.labTestTemplate.findUnique({ where: { id: body.templateId } });
      if (!testTemplate) {
        return NextResponse.json({ success: false, error: "Test template not found" }, { status: 404 });
      }
    }

    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const random = Math.floor(1000 + Math.random() * 9000);
    const testId = `LAB${year}${month}${random}`;

    const templateParams = testTemplate?.parameters ? JSON.parse(testTemplate.parameters) : [];
    const testParameters = parameters && parameters.length > 0
      ? parameters.map((param: any) => ({
          name: param.name,
          value: param.value || "",
          unit: param.unit,
          normalRange: param.normalRange,
          flag: param.flag || "normal",
          remarks: param.remarks,
        }))
      : templateParams.map((param: any) => ({
          name: param.parameterName,
          value: "",
          unit: param.unit,
          normalRange: param.normalRange,
          flag: "normal",
          remarks: "",
        }));

    const chargesData = {
      basePrice: price || (testTemplate?.basePrice || 0),
      tax: charges?.tax || 0,
      discount: charges?.discount || 0,
      otherCharges: charges?.otherCharges || 0,
      totalAmount: 0,
      paid: charges?.paid || 0,
      due: 0,
      paymentStatus: "pending",
      paymentMethod,
      transactionId: charges?.transactionId,
      paymentDate: charges?.paymentDate ? new Date(charges.paymentDate) : undefined,
      collectedBy: charges?.collectedBy,
    };

    const labTestData: any = {
      testId,
      appointmentId: appointment || undefined,
      patientId: patient,
      doctorId: doctor,
      testName,
      category,
      description,
      price: price || testTemplate?.basePrice || 0,
      discountedPrice,
      priority,
      notes,
      orderedById: payload.id,
      collectionStatus: "pending",
      processingStatus: "pending",
      verificationStatus: "pending",
      paymentVerified: priority !== "routine",
      charges: JSON.stringify(chargesData),
      testParameters: JSON.stringify(testParameters),
      turnaroundTime: turnaroundTime || testTemplate?.turnaroundTime || 24,
    };

    const labTest = await prisma.labTest.create({ data: labTestData });

    const populatedTest = await prisma.labTest.findUnique({
      where: { id: labTest.id },
      include: {
        patient: { select: { name: true, patientId: true, phone: true } },
        doctor: { select: { name: true, specialization: true, phone: true } },
        orderedBy: { select: { name: true } },
        appointment: { select: { appointmentId: true, date: true } },
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: populatedTest,
        message: "Lab test created successfully",
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating lab test:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create lab test" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const payload = await getTokenPayload(request);
    if (!payload) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (!canAccessLaboratory(payload.role)) {
      return NextResponse.json(
        { success: false, error: "Forbidden. You don't have permission to access lab tests." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get("patientId");
    const doctorId = searchParams.get("doctorId");

    const testTemplates = await prisma.labTestTemplate.findMany({
      where: { active: true },
      orderBy: [{ category: "asc" }, { testName: "asc" }],
    });

    let patientData = null;
    let doctorData = null;

    if (patientId) {
      patientData = await prisma.patient.findUnique({
        where: { id: patientId },
        select: {
          name: true,
          patientId: true,
          phone: true,
          dateOfBirth: true,
          gender: true,
          bloodGroup: true,
          allergies: true,
          medicalHistory: true,
        },
      });
    }

    if (doctorId) {
      doctorData = await prisma.user.findUnique({
        where: { id: doctorId },
        select: { name: true, specialization: true, department: true, phone: true, email: true },
      });
    }

    const categories = [...new Set(testTemplates.map((template) => template.category).filter(Boolean))];

    const specimenTypes = ["blood", "urine", "stool", "tissue", "saliva", "other"];

    const priorityOptions = [
      { value: "routine", label: "Routine", description: "Standard processing time" },
      { value: "urgent", label: "Urgent", description: "Priority processing" },
      { value: "emergency", label: "Emergency", description: "Immediate processing" },
    ];

    const testCategories = [
      { value: "hematology", label: "Hematology", description: "Blood cell analysis" },
      { value: "blood_test", label: "Blood Test", description: "General blood tests" },
      { value: "urine_test", label: "Urine Test", description: "Urinalysis" },
      { value: "stool_test", label: "Stool Test", description: "Stool analysis" },
      { value: "imaging", label: "Imaging", description: "X-ray, MRI, CT scan" },
      { value: "biopsy", label: "Biopsy", description: "Tissue sample analysis" },
      { value: "culture", label: "Culture", description: "Microbial culture" },
      { value: "hormone_test", label: "Hormone Test", description: "Hormone level analysis" },
      { value: "genetic_test", label: "Genetic Test", description: "Genetic analysis" },
      { value: "other", label: "Other", description: "Other tests" },
    ];

    return NextResponse.json({
      success: true,
      data: {
        testTemplates,
        patient: patientData,
        doctor: doctorData,
        categories,
        specimenTypes,
        priorityOptions,
        testCategories,
        paymentMethods: ["cash", "card", "upi", "netbanking", "cheque", "insurance"],
        defaultParameters: {
          cbc: [
            { name: "Hemoglobin", unit: "g/dL", normalRange: "12.0-16.0", criticalLow: 7, criticalHigh: 20 },
            { name: "WBC Count", unit: "x10³/µL", normalRange: "4.0-11.0", criticalLow: 2, criticalHigh: 30 },
            { name: "Platelet Count", unit: "x10³/µL", normalRange: "150-400", criticalLow: 50, criticalHigh: 1000 },
            { name: "RBC Count", unit: "x10⁶/µL", normalRange: "4.0-5.5", criticalLow: 3, criticalHigh: 7 },
          ],
          blood_sugar: [
            { name: "Fasting Blood Sugar", unit: "mg/dL", normalRange: "70-100", criticalLow: 50, criticalHigh: 200 },
            { name: "Post Prandial", unit: "mg/dL", normalRange: "<140", criticalLow: 50, criticalHigh: 300 },
            { name: "HbA1c", unit: "%", normalRange: "<5.7", criticalLow: 4, criticalHigh: 10 },
          ],
          lipid_profile: [
            { name: "Total Cholesterol", unit: "mg/dL", normalRange: "<200", criticalLow: 0, criticalHigh: 300 },
            { name: "LDL Cholesterol", unit: "mg/dL", normalRange: "<100", criticalLow: 0, criticalHigh: 190 },
            { name: "HDL Cholesterol", unit: "mg/dL", normalRange: ">40", criticalLow: 20, criticalHigh: 100 },
            { name: "Triglycerides", unit: "mg/dL", normalRange: "<150", criticalLow: 0, criticalHigh: 500 },
          ],
        },
        defaultCharges: {
          taxPercentage: 18,
          otherCharges: 0,
        },
      },
    });
  } catch (error: any) {
    console.error("Error fetching lab test creation data:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch lab test creation data" },
      { status: 500 }
    );
  }
}