// app/api/laboratory/tests/route.ts

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { LabTest } from "@/lib/models/LabTest";
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

// GET: Laboratory staff view tests with filters
export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    // Authentication
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
    
    const userId = payload.id as string;
    const userRole = payload.role as string;
    
    // Allow laboratory staff, admin, doctors, and receptionists
    const allowedRoles = ["lab_technician", "admin", "doctor", "receptionist"];
    if (!allowedRoles.includes(userRole)) {
      return NextResponse.json(
        { success: false, error: "Forbidden. You don't have permission to access laboratory tests." },
        { status: 403 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const collectionStatus = searchParams.get("collectionStatus");
    const processingStatus = searchParams.get("processingStatus");
    const verificationStatus = searchParams.get("verificationStatus");
    const priority = searchParams.get("priority");
    const patientId = searchParams.get("patientId");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const paymentVerified = searchParams.get("paymentVerified");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;
    
    let query: any = { status: { $ne: "cancelled" } };
    
    // Apply filters
    if (status) query.status = status;
    if (collectionStatus) query.collectionStatus = collectionStatus;
    if (processingStatus) query.processingStatus = processingStatus;
    if (verificationStatus) query.verificationStatus = verificationStatus;
    if (priority) query.priority = priority;
    if (patientId) query.patient = patientId;
    if (paymentVerified !== null) {
      query.paymentVerified = paymentVerified === "true";
    }
    
    // Date range filter
    if (dateFrom || dateTo) {
      query.orderedAt = {};
      if (dateFrom) query.orderedAt.$gte = new Date(dateFrom);
      if (dateTo) query.orderedAt.$lte = new Date(dateTo);
    }
    
    // If doctor is viewing, only show their tests
    if (userRole === "doctor") {
      query.doctor = userId;
    }
    
    // Get tests with pagination
    const [tests, total] = await Promise.all([
      LabTest.find(query)
        .populate("patient", "name patientId phone age gender")
        .populate("doctor", "name specialization department")
        .populate("orderedBy", "name")
        .populate("collectionDetails.collectedBy", "name")
        .populate("paymentVerifiedBy", "name")
        .sort({ priority: -1, orderedAt: -1 }) // Urgent first, then by date
        .skip(skip)
        .limit(limit)
        .lean(),
      LabTest.countDocuments(query),
    ]);
    
    return NextResponse.json({
      success: true,
      data: tests,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
    
  } catch (error: any) {
    console.error("Error fetching laboratory tests:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch tests" },
      { status: 500 }
    );
  }
}