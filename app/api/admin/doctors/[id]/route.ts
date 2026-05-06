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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateAdmin(request);
    if ("error" in auth) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status }
      );
    }

    const { id } = await params;

    const doctor = await prisma.user.findFirst({
      where: { id, role: "doctor" },
      select: { id: true, name: true, email: true, phone: true, department: true, specialization: true, licenseNumber: true, qualifications: true, experience: true, consultationFee: true, availability: true, approved: true, active: true, createdAt: true },
    });

    if (!doctor) {
      return NextResponse.json(
        { success: false, error: "Doctor not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: doctor,
    });

  } catch (error) {
    console.error("Error fetching doctor:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch doctor" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateAdmin(request);
    if ("error" in auth) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status }
      );
    }

    const { id } = await params;
    const doctor = await prisma.user.findFirst({
      where: { id, role: "doctor" },
    });

    if (!doctor) {
      return NextResponse.json(
        { success: false, error: "Doctor not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const allowedFields: (keyof typeof body)[] = [
      "name", "email", "phone", "department", "specialization",
      "licenseNumber", "qualifications", "experience", "consultationFee",
      "availability", "biography", "active", "approved", "avatar"
    ];

    const updateData: any = {};

    allowedFields.forEach(field => {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    });

    if (updateData.qualifications && typeof updateData.qualifications === 'string') {
      updateData.qualifications = updateData.qualifications.split(',').map((q: string) => q.trim()).filter(Boolean);
    }

    if (updateData.availability && typeof updateData.availability === 'object') {
      if (typeof updateData.availability.days === 'string') {
        updateData.availability.days = updateData.availability.days.split(',').map((day: string) => day.trim().toLowerCase()).filter(Boolean);
      } else if (Array.isArray(updateData.availability.days)) {
        updateData.availability.days = updateData.availability.days.map((day: string) => day.trim().toLowerCase()).filter(Boolean);
      }
      updateData.availability = JSON.stringify(updateData.availability);
    }

    if (updateData.email && updateData.email !== doctor.email) {
      const existingEmail = await prisma.user.findFirst({
        where: { email: updateData.email.toLowerCase(), NOT: { id: doctor.id } },
      });

      if (existingEmail) {
        return NextResponse.json(
          { success: false, error: "Email already exists" },
          { status: 409 }
        );
      }
      updateData.email = updateData.email.toLowerCase();
    }

    if (updateData.licenseNumber && updateData.licenseNumber !== doctor.licenseNumber) {
      const existingLicense = await prisma.user.findFirst({
        where: { licenseNumber: updateData.licenseNumber, NOT: { id: doctor.id } },
      });

      if (existingLicense) {
        return NextResponse.json(
          { success: false, error: "License number already exists" },
          { status: 409 }
        );
      }
    }

    const updatedDoctor = await prisma.user.update({
      where: { id: doctor.id },
      data: updateData,
      select: { id: true, name: true, email: true, phone: true, department: true, specialization: true, licenseNumber: true, qualifications: true, experience: true, consultationFee: true, availability: true, approved: true, active: true },
    });

    return NextResponse.json({
      success: true,
      data: updatedDoctor,
      message: "Doctor updated successfully"
    });

  } catch (error: any) {
    console.error("Error updating doctor:", error);

    if (error.code === "P2002") {
      return NextResponse.json(
        { success: false, error: "A doctor with this email or license number already exists" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: error.message || "Failed to update doctor" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateAdmin(request);
    if ("error" in auth) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status }
      );
    }

    const { id } = await params;

    const doctor = await prisma.user.findFirst({
      where: { id, role: "doctor" },
    });

    if (!doctor) {
      return NextResponse.json(
        { success: false, error: "Doctor not found" },
        { status: 404 }
      );
    }

    const updatedDoctor = await prisma.user.update({
      where: { id: doctor.id },
      data: { active: false },
      select: { id: true, name: true, email: true, phone: true, department: true, specialization: true, licenseNumber: true, qualifications: true, experience: true, consultationFee: true, availability: true, approved: true, active: true },
    });

    return NextResponse.json({
      success: true,
      data: updatedDoctor,
      message: "Doctor deactivated successfully"
    });

  } catch (error: any) {
    console.error("Error deactivating doctor:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to deactivate doctor" },
      { status: 500 }
    );
  }
}