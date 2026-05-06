import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this";

async function verifyToken(token: string) {
  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch (error) {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. No token provided." },
        { status: 401 },
      );
    }

    const token = authHeader.split(" ")[1];
    const payload = await verifyToken(token);

    if (!payload) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired token." },
        { status: 401 },
      );
    }

    const userId = payload.id as string;
    const userRole = payload.role as string;

    if (
      ![
        "admin",
        "receptionist",
        "doctor",
        "lab_technician",
        "nurse",
        "pharmacist",
        "radiologist",
      ].includes(userRole)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden. You don't have permission to create patients.",
        },
        { status: 403 },
      );
    }

    const body = await request.json();
    const {
      name,
      phone,
      email,
      guardian,
      refPerson,
      passTskNo,
      registrationNo,
      dateOfBirth,
      gender,
      address,
      emergencyContact,
      bloodGroup,
      allergies,
      medicalHistory,
    } = body;

    if (!name || !dateOfBirth || !gender) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing required fields: name, dateOfBirth, and gender are required",
        },
        { status: 400 },
      );
    }

    const cleanPhone =
      typeof phone === "string" && phone.trim()
        ? phone.replace(/\D/g, "")
        : "";

    if (cleanPhone && cleanPhone.length < 10) {
      return NextResponse.json(
        { success: false, error: "Phone number must be at least 10 digits" },
        { status: 400 },
      );
    }

    if (cleanPhone) {
      const existingPatient = await prisma.patient.findFirst({
        where: { phone: { equals: cleanPhone } },
      });

      if (existingPatient) {
        return NextResponse.json(
          {
            success: false,
            error: "A patient with this phone number already exists",
            data: {
              id: existingPatient.id,
              name: existingPatient.name,
              phone: existingPatient.phone,
              patientId: existingPatient.patientId,
              email: existingPatient.email,
              guardian: existingPatient.guardian,
              refPerson: existingPatient.refPerson,
              passTskNo: existingPatient.passTskNo,
              registrationNo: existingPatient.registrationNo,
              dateOfBirth: existingPatient.dateOfBirth,
              gender: existingPatient.gender,
            },
          },
          { status: 409 },
        );
      }
    }

    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const random = Math.floor(1000 + Math.random() * 9000);
    let generatedPatientId = `PAT${year}${month}${random}`;

    const existingWithSameId = await prisma.patient.findUnique({
      where: { patientId: generatedPatientId },
    });
    if (existingWithSameId) {
      const newRandom = Math.floor(1000 + Math.random() * 9000);
      generatedPatientId = `PAT${year}${month}${newRandom}`;
    }

    const patientData: any = {
      patientId: generatedPatientId,
      name: name.trim(),
      dateOfBirth: new Date(dateOfBirth),
      gender,
      createdById: userId,
      active: true,
    };

    if (cleanPhone) patientData.phone = cleanPhone;
    if (email) patientData.email = email.trim().toLowerCase();
    if (guardian) patientData.guardian = guardian.trim();
    if (refPerson) patientData.refPerson = refPerson.trim();
    if (passTskNo) patientData.passTskNo = passTskNo.trim();
    if (registrationNo) patientData.registrationNo = registrationNo.trim();
    if (address) patientData.address = address.trim();
    if (emergencyContact) patientData.emergencyContact = emergencyContact.trim();
    if (bloodGroup) patientData.bloodGroup = bloodGroup;
    patientData.allergies = allergies ? allergies.trim() : "";
    if (medicalHistory) patientData.medicalHistory = medicalHistory.trim();

    const patient = await prisma.patient.create({
      data: patientData,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          id: patient.id,
          _id: patient.id,
          patientId: patient.patientId,
          name: patient.name,
          phone: patient.phone,
          email: patient.email,
          guardian: patient.guardian,
          refPerson: patient.refPerson,
          passTskNo: patient.passTskNo,
          registrationNo: patient.registrationNo,
          dateOfBirth: patient.dateOfBirth?.toISOString().split("T")[0],
          gender: patient.gender,
          address: patient.address,
        },
        message: "Patient created successfully",
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("Error creating patient:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to create patient",
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. No token provided." },
        { status: 401 },
      );
    }

    const token = authHeader.split(" ")[1];
    const payload = await verifyToken(token);

    if (!payload) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired token." },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("q") || searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    let where: any = { active: true };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { phone: { contains: search } },
        { email: { contains: search, mode: "insensitive" } },
        { patientId: { contains: search } },
      ];
    }

    const [patients, total] = await Promise.all([
      prisma.patient.findMany({
        where,
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          patientId: true,
          dateOfBirth: true,
          gender: true,
          address: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.patient.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: patients.map((p) => ({
        ...p,
        dateOfBirth: p.dateOfBirth
          ? p.dateOfBirth.toISOString().split("T")[0]
          : undefined,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching patients:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch patients" },
      { status: 500 },
    );
  }
}