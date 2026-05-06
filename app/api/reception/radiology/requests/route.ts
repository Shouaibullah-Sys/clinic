// app/api/reception/radiology/requests/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest, hasRequiredRole } from "@/lib/auth";
import { buildMarkedOnlyQuery } from "@/lib/utils/markedTransactions";

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status || 401 }
      );
    }

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

    const query: any = {
      status: { not: "cancelled" }
    };

    switch (tab) {
      case "pending":
        query.billingStatus = "pending";
        break;
      case "billed":
        query.billingStatus = "billed";
        break;
      case "paid":
        query.billingStatus = "paid";
        break;
      case "all":
      default:
        break;
    }

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

    const sortObj: any = {};
    if (sort.startsWith("-")) {
      sortObj[sort.substring(1)] = "desc";
    } else {
      sortObj[sort] = "asc";
    }

    const { query: finalQuery } = await buildMarkedOnlyQuery({
      userId: auth.userId!,
      module: "radiology",
      baseQuery: query,
    });

    const requests = await prisma.radiologyRequest.findMany({
      where: finalQuery,
      include: {
        patient: {
          select: {
            name: true,
            patientId: true,
            phone: true,
            guardian: true,
            dateOfBirth: true,
            gender: true,
          }
        },
        referringDoctor: {
          select: {
            name: true,
            specialization: true,
            department: true,
          }
        },
        radiologist: {
          select: {
            name: true,
          }
        },
        technician: {
          select: {
            name: true,
          }
        }
      },
      orderBy: sortObj,
      take: limit,
    });

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