import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { DiscountRequest } from "@/lib/models/DiscountRequest";
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

// PATCH: Approve/Reject discount request
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // Note: params is a Promise
) {
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
    
    // Only admin can approve/reject
    if (userRole !== "admin") {
      return NextResponse.json(
        { success: false, error: "Forbidden. Admin role required." },
        { status: 403 }
      );
    }
    
    // UNWRAP THE PARAMS PROMISE
    const { id: requestId } = await params;
    
    const body = await request.json();
    const { action, approvedAmount, notes } = body;
    
    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { success: false, error: "Invalid action. Use 'approve' or 'reject'." },
        { status: 400 }
      );
    }
    
    const discountRequest = await DiscountRequest.findById(requestId);
    
    if (!discountRequest) {
      return NextResponse.json(
        { success: false, error: "Discount request not found." },
        { status: 404 }
      );
    }
    
    if (discountRequest.status !== "pending") {
      return NextResponse.json(
        { success: false, error: `Cannot ${action} request with status: ${discountRequest.status}` },
        { status: 400 }
      );
    }
    
    if (action === "approve") {
      const amount = approvedAmount || discountRequest.requestedAmount;
      
      if (amount > discountRequest.originalAmount) {
        return NextResponse.json(
          { success: false, error: "Approved amount cannot exceed original amount." },
          { status: 400 }
        );
      }
      
      discountRequest.status = "approved";
      discountRequest.approvedAmount = amount;
      discountRequest.approvedPercentage = discountRequest.originalAmount 
        ? (amount / discountRequest.originalAmount) * 100 
        : undefined;
      discountRequest.approvedBy = userId;
      discountRequest.approvedAt = new Date();
      discountRequest.reviewNotes = notes;
    } else {
      discountRequest.status = "rejected";
      discountRequest.reviewedBy = userId;
      discountRequest.reviewedAt = new Date();
      discountRequest.reviewNotes = notes;
    }
    
    await discountRequest.save();
    
    // Populate response data
    await discountRequest.populate([
      { path: "patient", select: "name phone email" },
      { path: "requestedBy", select: "name role" },
      { path: "approvedBy", select: "name" },
      { path: "reviewedBy", select: "name" }
    ]);
    
    return NextResponse.json({
      success: true,
      data: discountRequest,
      message: `Discount request ${action}d successfully.`
    });
    
  } catch (error: any) {
    console.error("Error updating discount request:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update discount request" },
      { status: 500 }
    );
  }
}

// GET: Get single discount request details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // Note: params is a Promise
) {
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
    
    const userRole = payload.role as string;
    
    // Only admin can view detailed request
    if (userRole !== "admin") {
      return NextResponse.json(
        { success: false, error: "Forbidden. Admin role required." },
        { status: 403 }
      );
    }
    
    // UNWRAP THE PARAMS PROMISE
    const { id: requestId } = await params;
    
    const discountRequest = await DiscountRequest.findById(requestId)
      .populate("patient", "name phone email dateOfBirth gender address emergencyContact bloodGroup allergies medicalHistory")
      .populate("requestedBy", "name role email phone")
      .populate("approvedBy", "name")
      .populate("reviewedBy", "name")
      .populate("appliedBy", "name")
      .lean();
    
    if (!discountRequest) {
      return NextResponse.json(
        { success: false, error: "Discount request not found." },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: discountRequest
    });
    
  } catch (error: any) {
    console.error("Error fetching discount request details:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch discount request" },
      { status: 500 }
    );
  }
}