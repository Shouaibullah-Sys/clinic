// app/api/reception/lab-tests/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenPayload } from "@/lib/auth/jwt";
import { buildMarkedOnlyQuery } from "@/lib/utils/markedTransactions";

// GET: Receptionist views all lab tests with filters
export async function GET(request: NextRequest) {
  try {
    const payload = await getTokenPayload(request);
    
    if (!payload) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. No token provided." },
        { status: 401 }
      );
    }

    const userRole = payload.role;

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
    
    let where: any = {};
    
    // Filter by patient
    if (patientId) {
      where.patientId = patientId;
    }
    
    // Filter by appointment
    if (appointmentId) {
      where.appointmentId = appointmentId;
    }
    
    // Filter by status
    if (status) {
      where.status = status;
    }
    
    // Filter by payment status - need to parse charges JSON
    // Note: SQLite Prisma can't query inside JSON, so we'll filter after
    
    // Filter by date range
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        where.createdAt.gte = new Date(dateFrom);
      }
      if (dateTo) {
        where.createdAt.lte = new Date(dateTo);
      }
    }

    // Apply marked only query
    const { query: markedQuery } = await buildMarkedOnlyQuery({
      userId: payload.id as string,
      module: "lab",
      baseQuery: where,
    });

    // Get lab tests with pagination
    const [labTests, total] = await Promise.all([
      prisma.labTest.findMany({
        where: markedQuery,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          patient: {
            select: {
              id: true,
              name: true,
              patientId: true,
              phone: true,
            },
          },
          appointment: {
            select: {
              id: true,
              appointmentId: true,
              date: true,
            },
          },
          doctor: {
            select: {
              id: true,
              name: true,
              specialization: true,
            },
          },
          orderedBy: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      prisma.labTest.count({ where: markedQuery }),
    ]);

    // Calculate summary statistics (filter after for payment status since it's in JSON)
    const allTests = await prisma.labTest.findMany({
      where: markedQuery,
    });

    let unpaidTests = 0;
    let totalRevenue = 0;
    let pendingCollection = 0;

    for (const test of allTests) {
      const charges = JSON.parse(test.charges || '{"totalAmount": 0, "paymentStatus": "pending", "due": 0}');
      const paymentStat = charges.paymentStatus;
      
      if (paymentStatus && paymentStat !== paymentStatus) continue;
      
      if (paymentStat === 'pending' || paymentStat === 'partial') {
        unpaidTests++;
      }
      
      if (paymentStat === 'paid') {
        totalRevenue += charges.totalAmount || 0;
      }
      
      if (paymentStat === 'pending' || paymentStat === 'partial') {
        pendingCollection += charges.due || 0;
      }
    }

    return NextResponse.json({
      success: true,
      data: labTests,
      summary: {
        totalTests: total,
        unpaidTests,
        totalRevenue,
        pendingCollection,
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