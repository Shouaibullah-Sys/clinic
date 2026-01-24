// app/api/laboratory/tests/route.ts

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { LabTest } from "@/lib/models/LabTest";
import { authenticateRequest, canAccessLaboratory } from "@/lib/auth";

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
    
    // Check if user can access laboratory
    if (!canAccessLaboratory(auth.userRole)) {
      return NextResponse.json(
        { success: false, error: "Forbidden. You don't have permission to access lab tests." },
        { status: 403 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "10");
    const sort = searchParams.get("sort") || "orderedAt";
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    
    console.log(`Lab tests requested by ${auth.userRole} ${auth.userName}`);
    
    // Build query
    const query: any = {};

    // Only show tests that have been paid and verified
    query.paymentVerified = true;

    if (status && status !== "all") {
      query.status = status;
    }

    if (priority && priority !== "all") {
      query.priority = priority;
    }
    
    // If user is lab technician, show all tests
    // If user is doctor, show only their tests
    if (auth.userRole === "doctor") {
      query.doctor = auth.userId;
    }
    
    // Fetch tests
    const tests = await LabTest.find(query)
      .populate("patient", "name patientId phone")
      .populate("doctor", "name specialization")
      .populate("orderedBy", "name")
      .sort({ [sort]: -1 })
      .limit(limit)
      .lean();

    console.log(`Lab tests query:`, query);
    console.log(`Found ${tests.length} tests for ${auth.userRole}`);
    tests.forEach(test => {
      console.log(`Test ${test.testId}: paymentVerified=${test.paymentVerified}, status=${test.status}, charges=${JSON.stringify(test.charges)}`);
    });

    return NextResponse.json({
      success: true,
      data: tests,
      count: tests.length,
      userRole: auth.userRole
    });
    
  } catch (error: any) {
    console.error("Error fetching lab tests:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch lab tests" },
      { status: 500 }
    );
  }
}