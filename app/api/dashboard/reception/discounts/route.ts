import { NextRequest, NextResponse } from "next/server";
import  dbConnect  from "@/lib/dbConnect";
import { DiscountRequest } from "@/lib/models/DiscountRequest";
import { Patient } from "@/lib/models/Patient";
import { User } from "@/lib/models/User";
import { jwtVerify } from "jose";
import mongoose from "mongoose";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this";

// Helper function to verify token
async function verifyToken(token: string) {
  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch (error) {
    return null;
  }
}

// GET: Fetch discount requests
export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    // Get token from Authorization header
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
    
    // Only receptionist and admin can access
    if (!["admin", "receptionist"].includes(userRole)) {
      return NextResponse.json(
        { success: false, error: "Forbidden. Receptionist role required." },
        { status: 403 }
      );
    }
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "pending";
    const limit = parseInt(searchParams.get("limit") || "10");
    
    let query: any = {};
    
    if (status !== "all") {
      query.status = status;
    }
    
    // If user is receptionist, only show requests they created
    if (userRole === "receptionist") {
      const user = await User.findById(userId);
      if (user) {
        query.requestedBy = userId;
      }
    }
    
    const discountRequests = await DiscountRequest.find(query)
      .populate("patient", "name phone")
      .populate("requestedBy", "name role")
      .sort({ requestedAt: -1 })
      .limit(limit)
      .lean();
    
    const formattedRequests = discountRequests.map(request => ({
      id: (request._id as mongoose.Types.ObjectId).toString(),
      patientName: (request.patient as any)?.name || "Unknown Patient",
      requestedAmount: request.requestedAmount,
      reason: request.reason,
      requestedBy: (request.requestedBy as any)?.name || "Unknown",
      requestedAt: request.requestedAt.toISOString(),
      status: request.status,
      patientId: (request.patient as any)?._id.toString()
    }));
    
    return NextResponse.json({
      success: true,
      data: formattedRequests
    });
    
  } catch (error) {
    console.error("Error fetching discount requests:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch discount requests" },
      { status: 500 }
    );
  }
}

// POST: Create new discount request
export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    // Get token from Authorization header
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
    
    // Only receptionist and admin can create discount requests
    if (!["admin", "receptionist"].includes(userRole)) {
      return NextResponse.json(
        { success: false, error: "Forbidden. Only receptionists and admins can create discount requests." },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    const { patientId, requestedAmount, reason, invoiceId, appointmentId, requestCategory, originalAmount } = body;
    
    // Validate required fields
    if (!patientId || !requestedAmount || !reason || !requestCategory) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Missing required fields: patientId, requestedAmount, reason, and requestCategory are required" 
        },
        { status: 400 }
      );
    }
    
    // Validate amount
    const amount = parseFloat(requestedAmount);
    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { success: false, error: "Invalid requested amount" },
        { status: 400 }
      );
    }
    
    // Check if patient exists
    const patient = await Patient.findById(patientId);
    if (!patient) {
      return NextResponse.json(
        { success: false, error: "Patient not found" },
        { status: 404 }
      );
    }
    
    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }
    
    // Create discount request using the DiscountRequest model
    const discountRequest = new DiscountRequest({
      patient: patientId,
      requestedAmount: amount,
      discountPercentage: originalAmount ? (amount / originalAmount) * 100 : undefined,
      originalAmount: originalAmount || amount,
      reason: reason.trim(),
      requestCategory,
      requestedBy: userId,
      requestedAt: new Date(),
      status: "pending",
      invoice: invoiceId,
      appointment: appointmentId
    });
    
    await discountRequest.save();
    
    // Populate the response
    await discountRequest.populate([
      { path: "patient", select: "name phone email" },
      { path: "requestedBy", select: "name role" }
    ]);
    
    return NextResponse.json({
      success: true,
      data: {
        id: discountRequest._id.toString(),
        discountId: discountRequest.discountId,
        patientName: (discountRequest.patient as any)?.name || "Unknown Patient",
        requestedAmount: discountRequest.requestedAmount,
        reason: discountRequest.reason,
        requestCategory: discountRequest.requestCategory,
        status: discountRequest.status,
        requestedAt: discountRequest.requestedAt.toISOString()
      },
      message: "Discount request submitted successfully"
    });
    
  } catch (error: any) {
    console.error("Error creating discount request:", error);
    
    // Handle duplicate discount ID or other errors
    if (error.code === 11000) {
      return NextResponse.json(
        { success: false, error: "Discount request with this ID already exists" },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create discount request" },
      { status: 500 }
    );
  }
}