// app/api/services/imaging/route.ts
import { NextRequest, NextResponse } from "next/server";
import jwt, { JwtPayload } from "jsonwebtoken";
import { cookies } from "next/headers";
import dbConnect from "@/lib/dbConnect";
import { RadiologyService } from "@/lib/models/RadiologyService";
import { User } from "@/lib/models/User";
import { Patient } from "@/lib/models/Patient";

export async function GET(req: NextRequest) {
  if (!process.env.JWT_SECRET) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("accessToken")?.value;

    if (!accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(accessToken, process.env.JWT_SECRET) as JwtPayload;
    } catch (error) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    await dbConnect();

    // Get query parameters for filtering and pagination
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const type = searchParams.get("type");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    // Build query
    const query: any = {};
    if (status) query.status = status;
    if (type) query.serviceType = type;
    if (search) {
      query.$or = [
        { bodyPart: { $regex: search, $options: "i" } },
        { "patient.name": { $regex: search, $options: "i" } },
      ];
    }

    // Get total count for pagination
    const total = await RadiologyService.countDocuments(query);
    const totalPages = Math.ceil(total / limit);
    const skip = (page - 1) * limit;

    // Fetch records with population
    const records = await RadiologyService.find(query)
      .populate("patient", "name age gender")
      .populate("referringDoctor", "name")
      .populate("radiologist", "name")
      .populate("technician", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Transform records to match expected format
    const transformedRecords = records.map((record: any) => ({
      id: record._id.toString(),
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
      referringDoctor: record.referringDoctor?.name,
      radiologist: record.radiologist?.name,
      technician: record.technician?.name,
      patient: {
        id: record.patient?._id?.toString(),
        name: record.patient?.name,
        age: record.patient?.age,
        gender: record.patient?.gender,
      },
    }));

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
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  if (!process.env.JWT_SECRET) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("accessToken")?.value;

    if (!accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(accessToken, process.env.JWT_SECRET) as JwtPayload;
    } catch (error) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    await dbConnect();

    const body = await req.json();

    // Validate required fields
    if (!body.patientId || !body.imagingType || !body.bodyPart) {
      return NextResponse.json(
        { error: "Missing required fields: patientId, imagingType, bodyPart" },
        { status: 400 }
      );
    }

    // Find patient
    const patient = await Patient.findById(body.patientId);
    if (!patient) {
      return NextResponse.json(
        { error: "Patient not found" },
        { status: 404 }
      );
    }

    // Find referring doctor (current user)
    const referringDoctor = await User.findById(decoded.userId);
    if (!referringDoctor) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Map imaging type to service type
    const serviceTypeMap: Record<string, "x-ray" | "ct-scan" | "mri" | "ultrasound"> = {
      xray: "x-ray",
      ct_scan: "ct-scan",
      mri: "mri",
      ultrasound: "ultrasound",
    };

    const serviceType = serviceTypeMap[body.imagingType] || body.imagingType;

    // Create imaging record
    const imagingRecord = new RadiologyService({
      patient: body.patientId,
      referringDoctor: decoded.userId,
      serviceType,
      bodyPart: body.bodyPart,
      view: body.view || "Standard",
      priority: body.priority || "routine",
      contrastUsed: body.contrast || false,
      contrastType: body.contrastType,
      scheduledDate: body.scheduledDate || new Date(),
      requestDate: new Date(),
      status: "scheduled",
      reportStatus: "pending",
      billingStatus: "pending",
      notes: body.clinicalIndication,
    });

    await imagingRecord.save();

    // Populate response
    await imagingRecord.populate([
      { path: "patient", select: "name patientId" },
      { path: "referringDoctor", select: "name" },
    ]);

    return NextResponse.json({
      success: true,
      data: imagingRecord,
      message: "Imaging record created successfully",
    }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating imaging record:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
