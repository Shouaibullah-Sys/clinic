// app/api/admin/users/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CreateUserSchema } from "@/lib/schemas/userSchema";
import { getTokenPayload } from "@/lib/auth/jwt";

export async function GET(request: NextRequest) {
  console.log("GET /api/admin/users called");

  try {
    const user = await getTokenPayload(request);
    if (!user || user.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Admin access required" },
        { status: 403 },
      );
    }

    console.log("Querying users from database");
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        avatar: true,
        approved: true,
        active: true,
        employeeId: true,
        department: true,
        designation: true,
        specialization: true,
        licenseNumber: true,
        qualifications: true,
        experience: true,
        consultationFee: true,
        availability: true,
        biography: true,
        joiningDate: true,
        address: true,
        gender: true,
        permissions: true,
        markedOnlyAccess: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    console.log("Found users count:", users.length);
    const usersWithId = users.map(user => ({ ...user, _id: user.id }));
    return NextResponse.json({ success: true, data: usersWithId });
  } catch (error: unknown) {
    console.error("Failed to fetch users:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to fetch users";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getTokenPayload(request);
    if (!user || user.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Admin access required" },
        { status: 403 },
      );
    }

    const body = await request.json();

    const validation = CreateUserSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validation.error.format(),
        },
        { status: 400 },
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: body.email },
    });
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: "Email already exists" },
        { status: 400 },
      );
    }

    const newUser = await prisma.user.create({
      data: {
        email: body.email,
        password: body.password,
        name: body.name,
        role: body.role,
        phone: body.phone,
        avatar: body.avatar,
        approved: body.approved ?? true,
        active: body.active ?? true,
        employeeId: body.employeeId,
        department: body.department,
        designation: body.designation,
        specialization: body.specialization,
        licenseNumber: body.licenseNumber,
        qualifications: body.qualifications,
        experience: body.experience,
        consultationFee: body.consultationFee,
        availability: body.availability,
        biography: body.biography,
        joiningDate: body.joiningDate ? new Date(body.joiningDate) : undefined,
        address: body.address,
        gender: body.gender,
        permissions: body.permissions ?? "[]",
        refreshTokens: "[]",
        markedOnlyAccess: body.markedOnlyAccess ?? false,
      },
    });

    const { password, refreshTokens, ...userWithoutSensitive } = newUser;
    return NextResponse.json(
      { success: true, data: userWithoutSensitive },
      { status: 201 },
    );
  } catch (error: unknown) {
    console.error("Failed to create user:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to create user";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 },
    );
  }
}
