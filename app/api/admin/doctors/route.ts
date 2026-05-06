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

async function authenticateAdmin(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { error: "Unauthorized. No token provided.", status: 401 };
  }

  const token = authHeader.split(" ")[1];
  const payload = await verifyToken(token);

  if (!payload) {
    return { error: "Invalid or expired token.", status: 401 };
  }

  const userRole = payload.role as string;

  if (userRole !== "admin") {
    return { error: "Forbidden. Admin access required.", status: 403 };
  }

  return {
    userId: payload.id as string,
    userRole,
  };
}

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateAdmin(request);
    if ("error" in auth) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const department = searchParams.get("department");
    const active = searchParams.get("active");
    const approved = searchParams.get("approved");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    let where: any = { role: "doctor" };

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { specialization: { contains: search } },
        { licenseNumber: { contains: search } },
        { phone: { contains: search } },
      ];
    }

    if (department && department !== "all") {
      where.department = department;
    }

    if (active === "true") {
      where.active = true;
    } else if (active === "false") {
      where.active = false;
    }

    if (approved === "true") {
      where.approved = true;
    } else if (approved === "false") {
      where.approved = false;
    }

    const [doctors, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: { id: true, name: true, email: true, phone: true, department: true, specialization: true, licenseNumber: true, qualifications: true, experience: true, consultationFee: true, availability: true, approved: true, active: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    const departments = await prisma.user.findMany({
      where: { role: "doctor", department: { not: null } },
      select: { department: true },
      distinct: ["department"],
    });

    const departmentList = departments
      .map((d) => d.department)
      .filter((d): d is string => !!d)
      .sort();

    return NextResponse.json({
      success: true,
      data: doctors,
      departments: departmentList,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching doctors:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch doctors" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateAdmin(request);
    if ("error" in auth) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status }
      );
    }

    const body = await request.json();
    const {
      name,
      email,
      phone,
      department,
      specialization,
      licenseNumber,
      qualifications,
      experience,
      consultationFee,
      availability,
      biography,
      password = "Doctor@123",
    } = body;

    if (!name || !email || !phone || !department || !specialization || !licenseNumber) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: name, email, phone, department, specialization, and licenseNumber are required",
        },
        { status: 400 }
      );
    }

    const existingEmail = await prisma.user.findFirst({
      where: { email: email.toLowerCase() },
    });

    if (existingEmail) {
      return NextResponse.json(
        { success: false, error: "Email already exists" },
        { status: 409 }
      );
    }

    const existingLicense = await prisma.user.findFirst({
      where: { licenseNumber },
    });

    if (existingLicense) {
      return NextResponse.json(
        { success: false, error: "License number already exists" },
        { status: 409 }
      );
    }

    const qualificationsArray: string[] = typeof qualifications === "string"
      ? qualifications.split(",").map((q: string) => q.trim()).filter(Boolean)
      : Array.isArray(qualifications) ? qualifications : [];

    const doctor = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        phone: phone.trim(),
        password,
        role: "doctor",
        department: department.trim(),
        specialization: specialization.trim(),
        licenseNumber: licenseNumber.trim(),
        qualifications: typeof qualificationsArray === "string" ? qualificationsArray : JSON.stringify(qualificationsArray),
        experience: experience ? parseInt(experience) : undefined,
        consultationFee: consultationFee ? parseFloat(consultationFee) : undefined,
        biography: biography?.trim(),
        approved: true,
        active: true,
        joiningDate: new Date(),
        permissions: "[]",
        refreshTokens: "[]",
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: doctor,
        message: "Doctor created successfully. Default password: Doctor@123",
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating doctor:", error);

    if (error.code === "P2002") {
      return NextResponse.json(
        { success: false, error: "A doctor with this email or license number already exists" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: error.message || "Failed to create doctor" },
      { status: 500 }
    );
  }
}