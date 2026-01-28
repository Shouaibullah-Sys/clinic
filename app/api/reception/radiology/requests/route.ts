// app/api/reception/radiology/requests/route.ts

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { RadiologyService } from "@/lib/models/RadiologyService";
import { authenticateRequest, hasRequiredRole } from "@/lib/auth";
import mongoose from "mongoose";

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

// GET: Fetch radiology requests for receptionist payment processing
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

    // Check if user is a receptionist or admin
    const allowedRoles = ["receptionist", "admin"];
    if (!hasRequiredRole(auth.userRole, allowedRoles)) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Forbidden. You don't have permission to access radiology payment processing.",
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
    const billingStatus = searchParams.get("billingStatus");
    const limit = parseInt(searchParams.get("limit") || "100");
    const sort = searchParams.get("sort") || "-requestDate";
    
    console.log(`Fetching radiology requests for receptionist ${auth.userName}, tab: ${tab}`);
    
    // Build query based on tab selection
    const query: any = { 
      status: { $ne: "cancelled" } // Exclude cancelled requests by default
    };
    
    switch (tab) {
      case "pending":
        // Requests pending payment
        query.billingStatus = "pending";
        break;
      case "billed":
        // Requests that have been billed but not paid
        query.billingStatus = "billed";
        break;
      case "paid":
        // Requests that have been paid
        query.billingStatus = "paid";
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
    
    if (billingStatus && billingStatus !== "all") {
      query.billingStatus = billingStatus;
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
      .populate<{ patient: PopulatedPatient }>("patient", "name patientId phone email dateOfBirth gender")
      .populate<{ referringDoctor: PopulatedDoctor }>("referringDoctor", "name specialization department")
      .populate<{ radiologist: PopulatedUser }>("radiologist", "name")
      .populate<{ technician: PopulatedUser }>("technician", "name")
      .sort(sortObj)
      .limit(limit)
      .lean();
    
    console.log(`Found ${requests.length} radiology requests for ${auth.userName}`);
    
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
