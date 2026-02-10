// app/api/doctor/patients/[id]/discharge-cards/route.ts

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { DischargeCard } from "@/lib/models/DischargeCard";
import { Patient } from "@/lib/models/Patient";
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

// GET - Get all discharge cards for a patient
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: patientId } = await params;

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

    // GET: Doctors, admins, and receptionists can view discharge cards
    // POST: Only doctors and admins can create discharge cards
    if (req.method === "GET") {
      // Receptionists need access to view discharge cards for payment processing
      if (
        userRole !== "doctor" &&
        userRole !== "admin" &&
        userRole !== "receptionist"
      ) {
        return NextResponse.json(
          { success: false, error: "Forbidden. Access required." },
          { status: 403 },
        );
      }
    } else {
      // POST - Only doctors and admins can create discharge cards
      if (userRole !== "doctor" && userRole !== "admin") {
        return NextResponse.json(
          { success: false, error: "Forbidden. Doctor access required." },
          { status: 403 },
        );
      }
    }

    // Verify patient exists
    const patient = await Patient.findById(patientId);
    if (!patient) {
      return NextResponse.json(
        { success: false, error: "Patient not found" },
        { status: 404 },
      );
    }

    // Build query
    const query: any = { patient: patientId };

    // If doctor, only show their own discharge cards
    if (userRole === "doctor") {
      query.doctor = new mongoose.Types.ObjectId(userId);
    }

    const dischargeCards = await DischargeCard.find(query)
      .populate("doctor", "name specialization")
      .populate("createdBy", "name")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: dischargeCards,
    });
  } catch (error: any) {
    console.error("Error fetching discharge cards:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch discharge cards",
      },
      { status: 500 },
    );
  }
}

// POST - Create a new discharge card
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: patientId } = await params;

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

    // Only doctors can create discharge cards
    if (userRole !== "doctor" && userRole !== "admin") {
      return NextResponse.json(
        { success: false, error: "Forbidden. Doctor access required." },
        { status: 403 },
      );
    }

    // Verify patient exists
    const patient = await Patient.findById(patientId);
    if (!patient) {
      return NextResponse.json(
        { success: false, error: "Patient not found" },
        { status: 404 },
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

    // Validate required fields
    const requiredFields = [
      "operationName",
      "operationDate",
      "diagnosis",
      "procedureNotes",
      "admissionDate",
      "dischargeDate",
      "dischargeInstructions",
    ];

    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { success: false, error: `${field} is required` },
          { status: 400 },
        );
      }
    }

    // Generate discharge ID
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    const random = Math.floor(1000 + Math.random() * 9000);
    const dischargeId = `DC${year}${month}${day}${random}`;

    // Calculate total days
    let totalDays = 0;
    if (body.admissionDate && body.dischargeDate) {
      const admission = new Date(body.admissionDate);
      const discharge = new Date(body.dischargeDate);
      const diffTime = Math.abs(discharge.getTime() - admission.getTime());
      totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    // Create discharge card
    const dischargeCard = new DischargeCard({
      ...body,
      dischargeId,
      totalDays,
      patient: patientId,
      doctor: new mongoose.Types.ObjectId(userId),
      createdBy: new mongoose.Types.ObjectId(userId),
    });

    await dischargeCard.save();

    // Populate references for response
    await dischargeCard.populate("doctor", "name specialization");

    return NextResponse.json({
      success: true,
      message: "Discharge card created successfully",
      data: dischargeCard,
    });
  } catch (error: any) {
    console.error("Error creating discharge card:", error);

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
        error: error.message || "Failed to create discharge card",
      },
      { status: 500 },
    );
  }
}
