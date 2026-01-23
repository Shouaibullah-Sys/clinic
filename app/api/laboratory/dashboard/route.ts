// app/api/laboratory/dashboard/route.ts

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

// GET: Laboratory dashboard statistics
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
        { success: false, error: "Forbidden. You don't have permission to access laboratory dashboard." },
        { status: 403 }
      );
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Base query
    let baseQuery: any = { status: { $ne: "cancelled" } };
    
    // If doctor is viewing, only show their tests
    if (userRole === "doctor") {
      baseQuery.doctor = userId;
    }
    
    // Get dashboard statistics
    const [
      totalTestsToday,
      pendingCollection,
      pendingProcessing,
      pendingVerification,
      urgentTests,
      completedToday,
      unpaidTests,
    ] = await Promise.all([
      // Total tests ordered today
      LabTest.countDocuments({
        ...baseQuery,
        orderedAt: { $gte: today, $lt: tomorrow },
      }),
      
      // Tests pending collection
      LabTest.countDocuments({
        ...baseQuery,
        collectionStatus: { $in: ["pending", "scheduled"] },
      }),
      
      // Tests pending processing
      LabTest.countDocuments({
        ...baseQuery,
        collectionStatus: "collected",
        processingStatus: "pending",
      }),
      
      // Tests pending verification
      LabTest.countDocuments({
        ...baseQuery,
        processingStatus: "completed",
        verificationStatus: "pending",
      }),
      
      // Urgent tests
      LabTest.countDocuments({
        ...baseQuery,
        priority: { $in: ["urgent", "emergency"] },
        status: { $nin: ["completed", "reported", "cancelled"] },
      }),
      
      // Tests completed today
      LabTest.countDocuments({
        ...baseQuery,
        processingStatus: "completed",
        updatedAt: { $gte: today, $lt: tomorrow },
      }),
      
      // Unpaid tests
      LabTest.countDocuments({
        ...baseQuery,
        "charges.paymentStatus": { $in: ["pending", "partial"] },
      }),
    ]);
    
    // Calculate total revenue for today
    const revenueToday = await LabTest.aggregate([
      {
        $match: {
          ...baseQuery,
          "charges.paymentStatus": "paid",
          "charges.paymentDate": { $gte: today, $lt: tomorrow },
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$charges.totalAmount" }
        }
      }
    ]);
    
    // Get recent tests for dashboard
    const recentTests = await LabTest.find(baseQuery)
      .populate("patient", "name patientId")
      .populate("doctor", "name specialization")
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();
    
    // Get tests that need attention (unpaid but ordered)
    const unpaidOrderedTests = await LabTest.find({
      ...baseQuery,
      "charges.paymentStatus": { $in: ["pending", "partial"] },
      status: "ordered",
    })
      .populate("patient", "name patientId phone")
      .populate("doctor", "name")
      .sort({ orderedAt: 1 })
      .limit(5)
      .lean();
    
    return NextResponse.json({
      success: true,
      data: {
        statistics: {
          totalTestsToday,
          pendingCollection,
          pendingProcessing,
          pendingVerification,
          urgentTests,
          completedToday,
          unpaidTests,
          revenueToday: revenueToday[0]?.total || 0,
        },
        recentTests,
        unpaidOrderedTests,
      },
    });
    
  } catch (error: any) {
    console.error("Error fetching laboratory dashboard:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch dashboard" },
      { status: 500 }
    );
  }
}