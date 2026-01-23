// app/api/reception/lab-tests/route.ts

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { LabTest } from "@/lib/models/LabTest";
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

// GET: Receptionist views all lab tests with filters
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
    
    const userRole = payload.role as string;
    
    // Only receptionist and admin can view all lab tests
    if (!["receptionist", "admin"].includes(userRole)) {
      return NextResponse.json(
        { success: false, error: "Forbidden. Access denied." },
        { status: 403 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get("patientId");
    const appointmentId = searchParams.get("appointmentId");
    const status = searchParams.get("status");
    const paymentStatus = searchParams.get("paymentStatus");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;
    
    let query: any = {};
    
    // Filter by patient
    if (patientId) {
      query.patient = patientId;
    }
    
    // Filter by appointment
    if (appointmentId) {
      query.appointment = appointmentId;
    }
    
    // Filter by status
    if (status) {
      query.status = status;
    }
    
    // Filter by payment status
    if (paymentStatus) {
      query["charges.paymentStatus"] = paymentStatus;
    }
    
    // Filter by date range
    if (dateFrom || dateTo) {
      query.orderedAt = {};
      if (dateFrom) {
        query.orderedAt.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        query.orderedAt.$lte = new Date(dateTo);
      }
    }
    
    // Get lab tests
    const [labTests, total] = await Promise.all([
      LabTest.find(query)
        .populate("patient", "name patientId phone")
        .populate("appointment", "appointmentId date")
        .populate("doctor", "name specialization")
        .populate("orderedBy", "name")
        .sort({ orderedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      LabTest.countDocuments(query),
    ]);
    
    // Calculate summary statistics
    const unpaidTests = await LabTest.countDocuments({
      "charges.paymentStatus": { $in: ["pending", "partial"] },
    });
    
    const totalRevenue = await LabTest.aggregate([
      { $match: { "charges.paymentStatus": "paid" } },
      { $group: { _id: null, total: { $sum: "$charges.totalAmount" } } },
    ]);
    
    const pendingCollection = await LabTest.aggregate([
      { $match: { "charges.paymentStatus": { $in: ["pending", "partial"] } } },
      { $group: { _id: null, total: { $sum: "$charges.due" } } },
    ]);
    
    return NextResponse.json({
      success: true,
      data: labTests,
      summary: {
        totalTests: total,
        unpaidTests,
        totalRevenue: totalRevenue[0]?.total || 0,
        pendingCollection: pendingCollection[0]?.total || 0,
      },
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
    
  } catch (error: any) {
    console.error("Error fetching lab tests:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch lab tests" },
      { status: 500 }
    );
  }
}