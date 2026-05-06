// app/api/admin/users/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { UpdateUserSchema } from "@/lib/schemas/userSchema";
import bcrypt from "bcryptjs";
import { getTokenPayload } from "@/lib/auth/jwt";

type RouteParams = { id: string };

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<RouteParams> },
): Promise<NextResponse> {
  const { id } = await params;

  try {
    const user = await getTokenPayload(request);
    if (!user || user.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Admin access required" },
        { status: 403 },
      );
    }

    const foundUser = await prisma.user.findUnique({
      where: { id },
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
    if (!foundUser) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data: { ...foundUser, _id: foundUser.id } });
  } catch (error) {
    console.error("Failed to fetch user:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<RouteParams> },
): Promise<NextResponse> {
  const { id } = await params;

  try {
    const user = await getTokenPayload(request);
    if (!user || user.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Admin access required" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const validation = UpdateUserSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: validation.error.flatten(),
        },
        { status: 400 },
      );
    }

    const updateData: Record<string, unknown> = { ...validation.data };

    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password as string, 10);
    } else {
      delete updateData.password;
    }

    if (updateData.joiningDate) {
      updateData.joiningDate = new Date(updateData.joiningDate as string);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
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

    if (!updatedUser) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data: updatedUser });
  } catch (error) {
    console.error("Failed to update user:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<RouteParams> },
): Promise<NextResponse> {
  const { id } = await params;

  try {
    const user = await getTokenPayload(request);
    if (!user || user.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Admin access required" },
        { status: 403 },
      );
    }

    const deletedUser = await prisma.user.delete({
      where: { id },
    });
    if (!deletedUser) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { success: true, message: "User deleted successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Failed to delete user:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
