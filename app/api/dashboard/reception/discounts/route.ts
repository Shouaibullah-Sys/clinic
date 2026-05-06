import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this";

// Helper function to verify token
async function verifyToken(token: string) {
  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    return payload as { id: string; role: string };
  } catch (error) {
    return null;
  }
}

function generateDiscountId(): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const random = Math.floor(1000 + Math.random() * 9000);
  return `DIS${year}${month}${random}`;
}

// GET: Fetch discount requests
export async function GET(request: NextRequest) {
  try {
    // Get token from Authorization header
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

    // Only receptionist and admin can access
    if (!["admin", "receptionist"].includes(userRole)) {
      return NextResponse.json(
        { success: false, error: "Forbidden. Receptionist role required." },
        { status: 403 },
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "pending";
    const limit = parseInt(searchParams.get("limit") || "10");

    const where: any = {};

    if (status !== "all") {
      where.status = status;
    }

    // If user is receptionist, only show requests they created
    if (userRole === "receptionist") {
      where.requestedById = userId;
    }

    const discountRequests = await prisma.discountRequest.findMany({
      where,
      include: {
        patient: {
          select: {
            name: true,
            phone: true,
          },
        },
      },
      orderBy: { requestedAt: "desc" },
      take: limit,
    });

    const formattedRequests = discountRequests.map((request) => ({
      id: request.id,
      discountId: request.requestId,
      patientName: request.patient?.name || "Unknown Patient",
      requestedAmount: request.amount,
      reason: request.reason,
      requestedBy: request.requestedById || "Unknown",
      requestedAt: request.requestedAt.toISOString(),
      status: request.status,
      patientId: request.patientId,
      discountPercentage: request.discountPercentage,
      originalAmount: request.originalAmount,
      requestCategory: request.requestCategory,
    }));

    return NextResponse.json({
      success: true,
      data: formattedRequests,
    });
  } catch (error) {
    console.error("Error fetching discount requests:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch discount requests" },
      { status: 500 },
    );
  }
}

// POST: Create new discount request
export async function POST(request: NextRequest) {
  try {
    // Get token from Authorization header
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

    // Only receptionist and admin can create discount requests
    if (!["admin", "receptionist"].includes(userRole)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Forbidden. Only receptionists and admins can create discount requests.",
        },
        { status: 403 },
      );
    }

    const body = await request.json();
    const {
      patientId,
      requestedAmount,
      reason,
      invoiceId,
      appointmentId,
      requestCategory,
      originalAmount,
    } = body;

    // Validate required fields
    if (!patientId || !requestedAmount || !reason || !requestCategory) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing required fields: patientId, requestedAmount, reason, and requestCategory are required",
        },
        { status: 400 },
      );
    }

    // Validate and parse amounts
    const amount = parseFloat(requestedAmount);
    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { success: false, error: "Invalid requested amount" },
        { status: 400 },
      );
    }

    // Parse originalAmount if provided
    let parsedOriginalAmount: number | undefined;
    if (originalAmount !== undefined && originalAmount !== null && originalAmount !== "") {
      parsedOriginalAmount = parseFloat(originalAmount);
      if (isNaN(parsedOriginalAmount) || parsedOriginalAmount <= 0) {
        return NextResponse.json(
          { success: false, error: "Invalid original amount" },
          { status: 400 },
        );
      }
    }

    // Check if patient exists
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
    });
    if (!patient) {
      return NextResponse.json(
        { success: false, error: "Patient not found" },
        { status: 404 },
      );
    }

    const discountPercentage = parsedOriginalAmount
      ? (amount / parsedOriginalAmount) * 100
      : undefined;

    // Create discount request using the DiscountRequest model
    const discountRequest = await prisma.discountRequest.create({
      data: {
        requestId: generateDiscountId(),
        patientId,
        amount,
        discountPercentage,
        originalAmount: parsedOriginalAmount || amount,
        reason: reason.trim(),
        requestCategory,
        requestedById: userId,
        status: "pending",
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: discountRequest.id,
        discountId: discountRequest.requestId,
        patientId: discountRequest.patientId,
        requestedAmount: discountRequest.amount,
        reason: discountRequest.reason,
        requestCategory: discountRequest.requestCategory,
        status: discountRequest.status,
        requestedAt: discountRequest.requestedAt.toISOString(),
      },
      message: "Discount request submitted successfully",
    });
  } catch (error: any) {
    console.error("Error creating discount request:", error);

    // Handle duplicate discount ID or other errors
    if (error.code === "P2002") {
      return NextResponse.json(
        {
          success: false,
          error: "Discount request with this ID already exists",
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to create discount request",
      },
      { status: 500 },
    );
  }
}

// PUT: Update a discount request
export async function PUT(request: NextRequest) {
  try {
    // Get token from Authorization header
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

    // Only receptionist and admin can update discount requests
    if (!["admin", "receptionist"].includes(userRole)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Forbidden. Only receptionists and admins can update discount requests.",
        },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { id, requestedAmount, reason, requestCategory, originalAmount } =
      body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Discount request ID is required" },
        { status: 400 },
      );
    }

    const discountRequest = await prisma.discountRequest.findUnique({
      where: { id },
    });

    if (!discountRequest) {
      return NextResponse.json(
        { success: false, error: "Discount request not found" },
        { status: 404 },
      );
    }

    // Can only update pending requests
    if (discountRequest.status !== "pending") {
      return NextResponse.json(
        {
          success: false,
          error: "Only pending discount requests can be updated",
        },
        { status: 400 },
      );
    }

    // Non-admin users can only update their own requests
    if (userRole !== "admin" && discountRequest.requestedById !== userId) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );
    }

    const updateData: any = {};

    // Update fields
    if (requestedAmount) {
      const amount = parseFloat(requestedAmount);
      if (isNaN(amount) || amount <= 0) {
        return NextResponse.json(
          { success: false, error: "Invalid requested amount" },
          { status: 400 },
        );
      }
      updateData.amount = amount;
      if (originalAmount !== undefined && originalAmount !== null && originalAmount !== "") {
        const parsedOriginalAmount = parseFloat(originalAmount);
        if (isNaN(parsedOriginalAmount) || parsedOriginalAmount <= 0) {
          return NextResponse.json(
            { success: false, error: "Invalid original amount" },
            { status: 400 },
          );
        }
        updateData.originalAmount = parsedOriginalAmount;
        updateData.discountPercentage = (amount / parsedOriginalAmount) * 100;
      }
    }

    if (reason) updateData.reason = reason.trim();
    if (requestCategory) updateData.requestCategory = requestCategory;

    const updated = await prisma.discountRequest.update({
      where: { id },
      data: updateData,
      include: {
        patient: {
          select: {
            name: true,
            phone: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: updated.id,
        discountId: updated.discountId,
        patientName: updated.patient?.name || "Unknown Patient",
        requestedAmount: updated.amount,
        originalAmount: updated.originalAmount,
        discountPercentage: updated.discountPercentage,
        reason: updated.reason,
        requestCategory: updated.requestCategory,
        status: updated.status,
        requestedAt: updated.requestedAt.toISOString(),
      },
      message: "Discount request updated successfully",
    });
  } catch (error: any) {
    console.error("Error updating discount request:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to update discount request",
      },
      { status: 500 },
    );
  }
}

// DELETE: Delete a discount request
export async function DELETE(request: NextRequest) {
  try {
    // Get token from Authorization header
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

    // Only admins can delete discount requests
    if (userRole !== "admin") {
      return NextResponse.json(
        { success: false, error: "Only admins can delete discount requests" },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Discount request ID is required" },
        { status: 400 },
      );
    }

    const discountRequest = await prisma.discountRequest.findUnique({
      where: { id },
    });

    if (!discountRequest) {
      return NextResponse.json(
        { success: false, error: "Discount request not found" },
        { status: 404 },
      );
    }

    await prisma.discountRequest.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Discount request deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting discount request:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to delete discount request",
      },
      { status: 500 },
    );
  }
}