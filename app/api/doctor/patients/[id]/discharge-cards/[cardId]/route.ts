// app/api/doctor/patients/[id]/discharge-cards/[cardId]/route.ts

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { DischargeCard } from "@/lib/models/DischargeCard";
import { jwtVerify } from "jose";
import mongoose from "mongoose";

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

// GET - Get a specific discharge card
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; cardId: string }> },
) {
  try {
    const { id: patientId, cardId } = await params;

    await dbConnect();

    // Authentication
    const authHeader = req.headers.get("authorization");
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

    // Only doctors and admins can access discharge cards
    if (userRole !== "doctor" && userRole !== "admin") {
      return NextResponse.json(
        { success: false, error: "Forbidden. Doctor access required." },
        { status: 403 },
      );
    }

    const query: any = { _id: cardId, patient: patientId };

    // If doctor, only show their own discharge cards
    if (userRole === "doctor") {
      query.doctor = new mongoose.Types.ObjectId(userId);
    }

    const dischargeCard = await DischargeCard.findOne(query)
      .populate("doctor", "name specialization")
      .populate("patient", "name patientId phone")
      .populate("createdBy", "name")
      .lean();

    if (!dischargeCard) {
      return NextResponse.json(
        { success: false, error: "Discharge card not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: dischargeCard,
    });
  } catch (error: any) {
    console.error("Error fetching discharge card:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch discharge card",
      },
      { status: 500 },
    );
  }
}

// PUT - Update a discharge card
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; cardId: string }> },
) {
  try {
    const { id: patientId, cardId } = await params;

    await dbConnect();

    // Authentication
    const authHeader = req.headers.get("authorization");
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

    // Only doctors and admins can update discharge cards
    if (userRole !== "doctor" && userRole !== "admin") {
      return NextResponse.json(
        { success: false, error: "Forbidden. Doctor access required." },
        { status: 403 },
      );
    }

    let body;
    try {
      body = await req.json();
    } catch (jsonError) {
      return NextResponse.json(
        { success: false, error: "Invalid JSON in request body" },
        { status: 400 },
      );
    }

    // Find the discharge card
    const query: any = { _id: cardId, patient: patientId };

    if (userRole === "doctor") {
      query.doctor = new mongoose.Types.ObjectId(userId);
    }

    const existingCard = await DischargeCard.findOne(query);

    if (!existingCard) {
      return NextResponse.json(
        { success: false, error: "Discharge card not found" },
        { status: 404 },
      );
    }

    // Cannot update if already completed
    if (
      existingCard.status === "completed" ||
      existingCard.status === "cancelled"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Cannot update a completed or cancelled discharge card",
        },
        { status: 400 },
      );
    }

    // Update the discharge card
    const updatedCard = await DischargeCard.findByIdAndUpdate(
      cardId,
      {
        ...body,
        updatedBy: new mongoose.Types.ObjectId(userId),
      },
      { new: true, runValidators: true },
    )
      .populate("doctor", "name specialization")
      .populate("patient", "name patientId phone");

    return NextResponse.json({
      success: true,
      message: "Discharge card updated successfully",
      data: updatedCard,
    });
  } catch (error: any) {
    console.error("Error updating discharge card:", error);

    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err: any) => err.message);
      return NextResponse.json(
        { success: false, error: "Validation failed", details: errors },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to update discharge card",
      },
      { status: 500 },
    );
  }
}

// DELETE - Delete (cancel) a discharge card
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; cardId: string }> },
) {
  try {
    const { id: patientId, cardId } = await params;

    await dbConnect();

    // Authentication
    const authHeader = req.headers.get("authorization");
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

    // Only doctors and admins can delete discharge cards
    if (userRole !== "doctor" && userRole !== "admin") {
      return NextResponse.json(
        { success: false, error: "Forbidden. Doctor access required." },
        { status: 403 },
      );
    }

    // Find the discharge card
    const query: any = { _id: cardId, patient: patientId };

    if (userRole === "doctor") {
      query.doctor = new mongoose.Types.ObjectId(userId);
    }

    const existingCard = await DischargeCard.findOne(query);

    if (!existingCard) {
      return NextResponse.json(
        { success: false, error: "Discharge card not found" },
        { status: 404 },
      );
    }

    // Soft delete by marking as cancelled
    await DischargeCard.findByIdAndUpdate(cardId, {
      status: "cancelled",
      updatedBy: new mongoose.Types.ObjectId(userId),
    });

    return NextResponse.json({
      success: true,
      message: "Discharge card cancelled successfully",
    });
  } catch (error: any) {
    console.error("Error cancelling discharge card:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to cancel discharge card",
      },
      { status: 500 },
    );
  }
}
