import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenPayload } from "@/lib/auth/jwt";

export async function GET(req: NextRequest) {
  try {
    const payload = await getTokenPayload(req);
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const type = searchParams.get("type");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const where: any = {};
    if (status) where.status = status;
    if (type) where.serviceType = type;
    if (search) {
      where.OR = [
        { bodyPart: { contains: search, mode: "insensitive" } },
      ];
    }

    const total = await prisma.radiologyRequest.count({ where });
    const totalPages = Math.ceil(total / limit);
    const skip = (page - 1) * limit;

    const records = await prisma.radiologyRequest.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        patient: true,
        referringDoctor: true,
        radiologist: true,
        technician: true,
      },
    });

    const transformedRecords = records.map((record: any) => {
      const charges = JSON.parse(record.charges || "{}");
      return {
        id: record.id,
        serviceId: record.serviceId,
        imagingType: record.serviceType,
        patientName: record.patient?.name || "Unknown",
        bodyPart: record.bodyPart,
        status: record.status,
        priority: record.priority,
        createdAt: record.createdAt.toISOString(),
        scheduledDate: record.scheduledDate?.toISOString(),
        performedDate: record.performedDate?.toISOString(),
        reportStatus: record.reportStatus,
        billingStatus: record.billingStatus,
        paymentStatus: charges?.paymentStatus || "pending",
        paymentVerified: record.paymentVerified || false,
        charges: {
          totalAmount: charges?.totalAmount || 0,
          paid: charges?.paid || 0,
          due: charges?.due || 0,
          paymentStatus: charges?.paymentStatus || "pending",
        },
        referringDoctor: record.referringDoctor?.name,
        radiologist: record.radiologist?.name,
        technician: record.technician?.name,
        patient: {
          id: record.patient?.id,
          name: record.patient?.name,
          gender: record.patient?.gender,
        },
      };
    });

    return NextResponse.json({
      records: transformedRecords,
      total,
      page,
      totalPages,
      limit,
    });
  } catch (error) {
    console.error("Error fetching imaging records:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const payload = await getTokenPayload(req);
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    if (!body.patientId || !body.imagingType || !body.bodyPart) {
      return NextResponse.json(
        { error: "Missing required fields: patientId, imagingType, bodyPart" },
        { status: 400 },
      );
    }

    if (!body.basePrice || isNaN(body.basePrice) || body.basePrice <= 0) {
      return NextResponse.json(
        { error: "Valid basePrice is required" },
        { status: 400 },
      );
    }

    const patient = await prisma.patient.findUnique({
      where: { id: body.patientId },
    });
    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    const referringDoctor = await prisma.user.findUnique({
      where: { id: payload.id },
    });
    if (!referringDoctor) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const serviceTypeMap: Record<string, string> = {
      xray: "x-ray",
      ct_scan: "ct-scan",
      mri: "mri",
      ultrasound: "ultrasound",
    };

    const serviceType = serviceTypeMap[body.imagingType] || body.imagingType;

    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const random = Math.floor(1000 + Math.random() * 9000);
    const generatedServiceId = `RAD${year}${month}${random}`;

    const charges = {
      basePrice: body.basePrice,
      tax: 0,
      discount: 0,
      otherCharges: 0,
      totalAmount: body.basePrice,
      paid: 0,
      due: body.basePrice,
      paymentStatus: "pending",
    };

    const imagingRecord = await prisma.radiologyRequest.create({
      data: {
        serviceId: generatedServiceId,
        patientId: body.patientId,
        referringDoctorId: payload.id,
        serviceType,
        bodyPart: body.bodyPart,
        view: body.view || "Standard",
        priority: body.priority || "routine",
        contrastUsed: body.contrast || false,
        contrastType: body.contrastType,
        scheduledDate: body.scheduledDate ? new Date(body.scheduledDate) : new Date(),
        requestDate: new Date(),
        status: "scheduled",
        reportStatus: "pending",
        billingStatus: "pending",
        notes: body.clinicalIndication,
        charges: JSON.stringify(charges),
      },
      include: {
        patient: true,
        referringDoctor: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: imagingRecord,
        message: "Imaging record created successfully",
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("Error creating imaging record:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}