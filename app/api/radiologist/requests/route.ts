import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest, hasRequiredRole } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status || 401 }
      );
    }

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

    let where: any = { status: { not: "cancelled" } };
    
    switch (tab) {
      case "pending":
        where.status = "scheduled";
        where.reportStatus = "pending";
        break;
      case "in-progress":
        where.status = "in-progress";
        where.reportStatus = "pending";
        break;
      case "completed":
        where.reportStatus = "completed";
        break;
    }
    
    if (status && status !== "all") {
      where.status = status;
    }
    
    if (priority && priority !== "all") {
      where.priority = priority;
    }

    if (auth.userRole === "radiologist") {
      where.OR = [
        { billingStatus: { in: ["paid", "billed"] } },
        { priority: { in: ["urgent", "emergency"] } }
      ];
    }
    
    console.log("Radiology requests query:", JSON.stringify(where, null, 2));
    
    const sortObj: any = {};
    if (sort.startsWith("-")) {
      sortObj[sort.substring(1)] = "desc";
    } else {
      sortObj[sort] = "asc";
    }

    const requests = await prisma.radiologyRequest.findMany({
      where,
      include: {
        patient: { select: { name: true, patientId: true, phone: true, guardian: true, dateOfBirth: true, gender: true } },
        referringDoctor: { select: { name: true, specialization: true, department: true } },
        radiologist: { select: { name: true } },
        technician: { select: { name: true } },
        department: { select: { name: true } }
      },
      orderBy: sortObj,
      take: limit,
    });
    
    console.log(`Found ${requests.length} radiology requests for ${auth.userName}`);
    
    if (requests.length > 0) {
      console.log("Sample requests:");
      requests.slice(0, 3).forEach((req, index) => {
        console.log(`${index + 1}. ${req.serviceId}: ${req.serviceType?.toUpperCase()} - ${req.bodyPart}`);
        console.log(`   Patient: ${req.patient?.name} (${req.patient?.patientId})`);
        console.log(`   Status: ${req.status}, Report Status: ${req.reportStatus}, Billing: ${req.billingStatus}`);
      });
    } else {
      console.log("No radiology requests found.");
      const totalCount = await prisma.radiologyRequest.count();
      console.log(`Total radiology requests in database: ${totalCount}`);
    }
    
    return NextResponse.json({
      success: true,
      data: requests,
      count: requests.length,
      userRole: auth.userRole,
      query: where,
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
