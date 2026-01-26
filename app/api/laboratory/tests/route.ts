// app/api/laboratory/tests/route.ts

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { LabTest } from "@/lib/models/LabTest";
import { Patient } from "@/lib/models/Patient";
import { User } from "@/lib/models/User";
import { jwtVerify } from "jose";
import mongoose from "mongoose";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this";

// Type definitions for populated data
interface PopulatedPatient {
  _id: mongoose.Types.ObjectId;
  name: string;
  patientId: string;
  phone?: string;
  email?: string;
  dateOfBirth?: Date;
  gender?: string;
}

interface PopulatedDoctor {
  _id: mongoose.Types.ObjectId;
  name: string;
  specialization?: string;
  department?: string;
}

interface PopulatedUser {
  _id: mongoose.Types.ObjectId;
  name: string;
}

interface LabTestWithPopulatedData {
  _id: mongoose.Types.ObjectId;
  testId: string;
  testName: string;
  category: string;
  patient: PopulatedPatient | mongoose.Types.ObjectId;
  doctor: PopulatedDoctor | mongoose.Types.ObjectId;
  status: string;
  collectionStatus: string;
  processingStatus: string;
  verificationStatus: string;
  orderedAt: Date;
  paymentVerified: boolean;
  priority: string;
  charges?: {
    paymentStatus: string;
    due: number;
  };
  labReferenceId?: string;
  specimen?: {
    type: string;
    quantity?: string;
  };
  // Add other fields as needed
}

// Helper function to safely access patient properties
function getPatientName(patient: PopulatedPatient | mongoose.Types.ObjectId): string {
  if (patient instanceof mongoose.Types.ObjectId) {
    return "Unknown Patient";
  }
  return patient.name || "Unknown Patient";
}

function getPatientId(patient: PopulatedPatient | mongoose.Types.ObjectId): string {
  if (patient instanceof mongoose.Types.ObjectId) {
    return "No ID";
  }
  return patient.patientId || "No ID";
}

async function verifyToken(token: string) {
  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch (error) {
    console.error("Token verification error:", error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    // Get authentication token
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
    const userName = payload.name as string;
    
    console.log(`Lab tests requested by ${userRole}: ${userName} (${userId})`);
    
    // Check if user has access to laboratory
    const allowedRoles = ["laboratory", "lab_technician", "technician", "admin", "doctor"];
    if (!allowedRoles.includes(userRole)) {
      console.log(`Access denied for role: ${userRole}`);
      return NextResponse.json(
        { 
          success: false, 
          error: "Forbidden. You don't have permission to access lab tests.",
          userRole: userRole,
          allowedRoles: allowedRoles
        },
        { status: 403 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const tab = searchParams.get("tab") || "all";
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const limit = parseInt(searchParams.get("limit") || "100");
    const sort = searchParams.get("sort") || "-orderedAt";
    
    console.log(`Fetching lab tests for tab: ${tab}, status: ${status}, priority: ${priority}`);
    
    // Build query based on tab selection
    const query: any = { 
      status: { $ne: "cancelled" } // Exclude cancelled tests by default
    };
    
    switch (tab) {
      case "pending":
        // Tests pending collection
        query.collectionStatus = { $in: ["pending", "scheduled"] };
        break;
      case "collected":
        // Tests collected but not yet processed
        query.collectionStatus = "collected";
        query.processingStatus = { $ne: "completed" };
        break;
      case "processing":
        // Tests currently being processed
        query.processingStatus = "processing";
        break;
      case "completed":
        // Tests with completed processing
        query.processingStatus = "completed";
        query.status = { $ne: "reported" };
        break;
      case "reported":
        // Tests that have been reported
        query.status = "reported";
        break;
      case "all":
      default:
        // All tests except cancelled
        break;
    }
    
    // Add additional filters
    if (status && status !== "all") {
      query.status = status;
    }
    
    if (priority && priority !== "all") {
      query.priority = priority;
    }
    
    // For laboratory technicians, show tests that are either:
    // 1. Payment verified, OR
    // 2. High priority (urgent/emergency) even if not paid
    if (userRole === "laboratory" || userRole === "lab_technician" || userRole === "technician") {
      query.$or = [
        { paymentVerified: true },
        { priority: { $in: ["urgent", "emergency"] } }
      ];
    }
    
    // If user is doctor, show only their tests
    if (userRole === "doctor") {
      query.doctor = new mongoose.Types.ObjectId(userId);
    }
    
    console.log("Lab tests query:", JSON.stringify(query, null, 2));
    
    // Convert sort string to MongoDB sort object
    const sortObj: any = {};
    if (sort.startsWith("-")) {
      sortObj[sort.substring(1)] = -1;
    } else {
      sortObj[sort] = 1;
    }
    
    // Fetch tests with proper population
    const tests = await LabTest.find(query)
      .populate<{ patient: PopulatedPatient }>("patient", "name patientId phone email dateOfBirth gender")
      .populate<{ doctor: PopulatedDoctor }>("doctor", "name specialization department")
      .populate<{ orderedBy: PopulatedUser }>("orderedBy", "name")
      .populate<{ "collectionDetails.collectedBy": PopulatedUser }>("collectionDetails.collectedBy", "name")
      .populate<{ "processingDetails.processedBy": PopulatedUser }>("processingDetails.processedBy", "name")
      .sort(sortObj)
      .limit(limit)
      .lean();
    
    console.log(`Found ${tests.length} lab tests for ${userRole} ${userName}`);
    
    // Log some sample tests for debugging
    if (tests.length > 0) {
      console.log("Sample tests:");
      tests.slice(0, 3).forEach((test: any, index: number) => {
        // Use type-safe accessor functions
        const patientName = getPatientName(test.patient);
        const patientId = getPatientId(test.patient);
        
        console.log(`${index + 1}. ${test.testId}: ${test.testName}`);
        console.log(`   Patient: ${patientName} (${patientId})`);
        console.log(`   Status: ${test.status}, Collection: ${test.collectionStatus}, Processing: ${test.processingStatus}`);
        console.log(`   Payment Verified: ${test.paymentVerified}, Priority: ${test.priority}`);
        console.log(`   Ordered: ${test.orderedAt}`);
      });
    } else {
      console.log("No tests found. Database may be empty or query too restrictive.");
      console.log("Query was:", query);
      
      // Check total count in database for debugging
      const totalCount = await LabTest.countDocuments({});
      console.log(`Total lab tests in database: ${totalCount}`);
      
      const unverifiedCount = await LabTest.countDocuments({ paymentVerified: false });
      const verifiedCount = await LabTest.countDocuments({ paymentVerified: true });
      console.log(`Verified: ${verifiedCount}, Unverified: ${unverifiedCount}`);
    }
    
    return NextResponse.json({
      success: true,
      data: tests,
      count: tests.length,
      userRole: userRole,
      query: query,
      tab: tab
    });
    
  } catch (error: any) {
    console.error("Error fetching lab tests:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || "Failed to fetch lab tests",
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

// POST: Create a new lab test (for testing/debugging)
export async function POST(request: NextRequest) {
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
    
    // Only admin can create test data via API
    if (userRole !== "admin") {
      return NextResponse.json(
        { success: false, error: "Forbidden. Only admin can create test data." },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    
    // Create a test lab test for debugging
    const labTestData = {
      testId: `LABTEST${Date.now().toString().slice(-6)}`,
      testName: "Complete Blood Count",
      category: "hematology",
      patient: new mongoose.Types.ObjectId(body.patientId || "65f1a2b3c4d5e6f789012345"),
      doctor: new mongoose.Types.ObjectId(body.doctorId || "65f1a2b3c4d5e6f789012346"),
      price: 150,
      status: "ordered",
      collectionStatus: "pending",
      processingStatus: "pending",
      priority: "routine",
      paymentVerified: true,
      orderedBy: new mongoose.Types.ObjectId(payload.id as string),
      orderedAt: new Date(),
      charges: {
        basePrice: 150,
        tax: 0,
        discount: 0,
        otherCharges: 0,
        totalAmount: 150,
        paid: 150,
        due: 0,
        paymentStatus: "paid",
        paymentMethod: "cash"
      }
    };
    
    const labTest = new LabTest(labTestData);
    await labTest.save();
    
    console.log(`Created test lab test: ${labTest.testId}`);
    
    return NextResponse.json({
      success: true,
      data: labTest,
      message: "Test lab test created successfully"
    }, { status: 201 });
    
  } catch (error: any) {
    console.error("Error creating lab test:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create lab test" },
      { status: 500 }
    );
  }
}