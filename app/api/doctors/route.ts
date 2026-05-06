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

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. No token provided." },
        { status: 401 }
      );
    }

    const token = authHeader.split(" ")[1];
    const payload = await verifyToken(token);

    if (!payload) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired token." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("active") !== "false";
    const department = searchParams.get("department");

    let where: any = { role: "doctor" };

    if (activeOnly) {
      where.active = true;
    }

    if (department && department !== "all") {
      where.department = department;
    }

    const doctors = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        specialization: true,
        department: true,
        availability: true,
        active: true,
        approved: true,
        consultationFee: true,
      },
      orderBy: { name: "asc" },
    });

    const departments = await prisma.user.findMany({
      where: { role: "doctor", active: true },
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
      total: doctors.length,
    });

  } catch (error) {
    console.error("Error fetching doctors:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch doctors" },
      { status: 500 }
    );
  }
}