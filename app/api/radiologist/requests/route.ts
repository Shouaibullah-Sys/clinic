// app/api/radiologist/requests/route.ts

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { RadiologyService } from "@/lib/models/RadiologyService";
import "@/lib/models/Patient";
import "@/lib/models/User";
import "@/lib/models/RadiologyTemplate";
import { authenticateRequest, hasRequiredRole } from "@/lib/auth";
import mongoose from "mongoose";

// Type definitions for populated data
interface PopulatedPatient {
  _id: mongoose.Types.ObjectId;
  name: string;
  patientId: string;
  phone?: string;
  guardian?: string;
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

interface RadiologyRequestWithPopulatedData {
  _id: mongoose.Types.ObjectId;
  serviceId: string;
  serviceType: string;
  bodyPart: string;
  view: string;
  patient: PopulatedPatient | mongoose.Types.ObjectId;
  referringDoctor: PopulatedDoctor | mongoose.Types.ObjectId;
  radiologist: PopulatedUser | mongoose.Types.ObjectId;
  technician: PopulatedUser | mongoose.Types.ObjectId;
  status: string;
  reportStatus: string;
  billingStatus: string;
  priority: string;
  requestDate: Date;
  scheduledDate: Date;
  performedDate?: Date;
  contrastUsed?: boolean;
  contrastType?: string;
  notes?: string;
  findings?: string;
  impression?: string;
  recommendations?: string;
  images?: any[];
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

// GET: Fetch radiology requests for radiologist
export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    // Authenticate the request
    const auth = await authenticateRequest(request);
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status || 401 }
      );
    }

    // Check if user is a radiologist or admin
    const allowedRoles = ["radiologist", "admin"];
    if (!hasRequiredRole(auth.userRole, allowedRoles)) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Forbidden. You don't have permission to access radiology requests.",
          userRole: auth.userRole,
          allowedRoles: allowedRoles
        },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const tab = searchParams.get("tab") || "pending";
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const limit = parseInt(searchParams.get("limit") || "100");
    const sort = searchParams.get("sort") || "-requestDate";
    
    console.log(`Fetching radiology requests for radiologist ${auth.userName}, tab: ${tab}`);
    
    // Build query based on tab selection
    const query: any = { 
      status: { $ne: "cancelled" } // Exclude cancelled requests by default
    };
    
    switch (tab) {
      case "pending":
        // Requests pending to be started
        query.status = "scheduled";
        query.reportStatus = "pending";
        break;
      case "in-progress":
        // Requests currently being processed
        query.status = "in-progress";
        query.reportStatus = "pending";
        break;
      case "completed":
        // Requests with completed reports
        query.reportStatus = "completed";
        break;
      case "all":
      default:
        // All requests except cancelled
        break;
    }
    
    // Add additional filters
    if (status && status !== "all") {
      query.status = status;
    }
    
    if (priority && priority !== "all") {
      query.priority = priority;
    }
    
    // For radiologists, show requests that are either:
    // 1. Payment verified (billingStatus: "paid" or "billed"), OR
    // 2. High priority (urgent/emergency) even if not paid
    if (auth.userRole === "radiologist") {
      query.$or = [
        { billingStatus: { $in: ["paid", "billed"] } },
        { priority: { $in: ["urgent", "emergency"] } }
      ];
    }
    
    console.log("Radiology requests query:", JSON.stringify(query, null, 2));
    
    // Convert sort string to MongoDB sort object
    const sortObj: any = {};
    if (sort.startsWith("-")) {
      sortObj[sort.substring(1)] = -1;
    } else {
      sortObj[sort] = 1;
    }
    
    // Fetch requests with proper population
    const requests = await RadiologyService.find(query)
      .populate<{ patient: PopulatedPatient }>("patient", "name patientId phone guardian dateOfBirth gender")
      .populate<{ referringDoctor: PopulatedDoctor }>("referringDoctor", "name specialization department")
      .populate<{ radiologist: PopulatedUser }>("radiologist", "name")
      .populate<{ technician: PopulatedUser }>("technician", "name")
      .populate("templateId", "templateCode examName findingsTemplate impressionTemplate recommendationTemplate clinicalIndicationTemplate techniqueTemplate comparisonTemplate criticalFindingsChecklist")
      .sort(sortObj)
      .limit(limit)
      .lean();
    
    console.log(`Found ${requests.length} radiology requests for ${auth.userName}`);
    
    // Log some sample requests for debugging
    if (requests.length > 0) {
      console.log("Sample requests:");
      requests.slice(0, 3).forEach((req: any, index: number) => {
        const patientName = getPatientName(req.patient);
        const patientId = getPatientId(req.patient);
        
        console.log(`${index + 1}. ${req.serviceId}: ${req.serviceType.toUpperCase()} - ${req.bodyPart}`);
        console.log(`   Patient: ${patientName} (${patientId})`);
        console.log(`   Status: ${req.status}, Report Status: ${req.reportStatus}, Billing: ${req.billingStatus}`);
        console.log(`   Priority: ${req.priority}, Scheduled: ${req.scheduledDate}`);
      });
    } else {
      console.log("No radiology requests found. Database may be empty or query too restrictive.");
      console.log("Query was:", query);
      
      // Check total count in database for debugging
      const totalCount = await RadiologyService.countDocuments({});
      console.log(`Total radiology requests in database: ${totalCount}`);
      
      const pendingCount = await RadiologyService.countDocuments({ status: "scheduled" });
      const inProgressCount = await RadiologyService.countDocuments({ status: "in-progress" });
      console.log(`Scheduled: ${pendingCount}, In Progress: ${inProgressCount}`);
    }
    
    return NextResponse.json({
      success: true,
      data: requests,
      count: requests.length,
      userRole: auth.userRole,
      query: query,
      tab: tab
    });
    
  } catch (error: any) {
    console.error("Error fetching radiology requests:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || "Failed to fetch radiology requests",
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
