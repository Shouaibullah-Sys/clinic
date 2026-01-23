// app/api/laboratory/dashboard/route.ts

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { LabTest } from "@/lib/models/LabTest";
import { Patient } from "@/lib/models/Patient";
import { User } from "@/lib/models/User";
import { authenticateRequest, canAccessLaboratory } from "@/lib/auth";
import mongoose from "mongoose";

// Type definitions for populated documents
interface PopulatedPatient {
  _id: mongoose.Types.ObjectId;
  name?: string;
  patientId?: string;
  phone?: string;
}

interface PopulatedDoctor {
  _id: mongoose.Types.ObjectId;
  name?: string;
  specialization?: string;
}

interface LabTestWithPopulated {
  _id: mongoose.Types.ObjectId;
  testId: string;
  testName: string;
  patient: PopulatedPatient | mongoose.Types.ObjectId;
  doctor: PopulatedDoctor | mongoose.Types.ObjectId;
  status: string;
  priority: string;
  category: string;
  orderedAt: Date;
  charges: {
    totalAmount?: number;
    paymentStatus?: string;
  };
  collectionStatus?: string;
  processingStatus?: string;
  verificationStatus?: string;
  results?: {
    reportedAt?: Date;
  };
}

// Helper function to safely extract patient name
function getPatientName(patient: PopulatedPatient | mongoose.Types.ObjectId | undefined): string {
  if (!patient) return "Unknown";
  
  // Check if it's an ObjectId (not populated)
  if (patient instanceof mongoose.Types.ObjectId || typeof patient === 'string') {
    return "Unknown";
  }
  
  // It's a populated patient object
  const populatedPatient = patient as PopulatedPatient;
  return populatedPatient.name || "Unknown";
}

// Helper function to safely extract patient ID
function getPatientId(patient: PopulatedPatient | mongoose.Types.ObjectId | undefined): string {
  if (!patient) return "N/A";
  
  if (patient instanceof mongoose.Types.ObjectId || typeof patient === 'string') {
    return "N/A";
  }
  
  const populatedPatient = patient as PopulatedPatient;
  return populatedPatient.patientId || "N/A";
}

// Helper function to safely extract doctor name
function getDoctorName(doctor: PopulatedDoctor | mongoose.Types.ObjectId | undefined): string {
  if (!doctor) return "Unknown";
  
  if (doctor instanceof mongoose.Types.ObjectId || typeof Patient === 'string') {
    return "Unknown";
  }
  
  const populatedDoctor = doctor as PopulatedDoctor;
  return populatedDoctor.name || "Unknown";
}

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
    
    // Safely check if user can access laboratory
    if (!auth.userRole || !canAccessLaboratory(auth.userRole)) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Forbidden. You don't have permission to access laboratory dashboard.",
          details: `User role: ${auth.userRole || 'undefined'}`
        },
        { status: 403 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get("timeRange") || "month";
    
    // Debug logging
    console.log(`Laboratory dashboard requested by:`, {
      userRole: auth.userRole,
      userName: auth.userName,
      timeRange: timeRange
    });
    
    // Calculate date range
    const now = new Date();
    let startDate = new Date();
    
    switch (timeRange) {
      case "today":
        startDate.setHours(0, 0, 0, 0);
        break;
      case "week":
        startDate.setDate(now.getDate() - 7);
        break;
      case "month":
        startDate.setMonth(now.getMonth() - 1);
        break;
      case "quarter":
        startDate.setMonth(now.getMonth() - 3);
        break;
      case "year":
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setMonth(now.getMonth() - 1);
    }
    
    // Build query
    const query: any = {
      orderedAt: { $gte: startDate }
    };
    
    // Get statistics - using Promise.all for better performance
    const [
      totalTestsToday,
      pendingCollection,
      pendingProcessing,
      pendingVerification,
      urgentTests,
      completedToday,
      unpaidTests,
      revenueResult,
      monthlyRevenueResult
    ] = await Promise.all([
      // Total tests today
      LabTest.countDocuments({
        orderedAt: { $gte: new Date().setHours(0, 0, 0, 0) }
      }),
      
      // Pending collection
      LabTest.countDocuments({
        collectionStatus: "pending",
        status: { $ne: "cancelled" }
      }),
      
      // Pending processing
      LabTest.countDocuments({
        collectionStatus: "collected",
        processingStatus: "pending",
        status: { $ne: "cancelled" }
      }),
      
      // Pending verification
      LabTest.countDocuments({
        processingStatus: "completed",
        verificationStatus: "pending",
        status: { $ne: "cancelled" }
      }),
      
      // Urgent tests
      LabTest.countDocuments({
        priority: { $in: ["urgent", "emergency"] },
        status: { $nin: ["completed", "cancelled", "reported"] }
      }),
      
      // Completed today
      LabTest.countDocuments({
        status: "completed",
        "results.reportedAt": { $gte: new Date().setHours(0, 0, 0, 0) }
      }),
      
      // Unpaid tests
      LabTest.countDocuments({
        "charges.paymentStatus": { $in: ["pending", "partial"] }
      }),
      
      // Revenue for time range
      LabTest.aggregate([
        { 
          $match: { 
            orderedAt: { $gte: startDate },
            "charges.paymentStatus": "paid"
          } 
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$charges.totalAmount" }
          }
        }
      ]),
      
      // Monthly revenue
      LabTest.aggregate([
        { 
          $match: { 
            orderedAt: { $gte: new Date(now.getFullYear(), now.getMonth(), 1) },
            "charges.paymentStatus": "paid"
          } 
        },
        {
          $group: {
            _id: null,
            monthlyRevenue: { $sum: "$charges.totalAmount" }
          }
        }
      ])
    ]);
    
    // Extract revenue values
    const totalRevenue = revenueResult[0]?.totalRevenue || 0;
    const monthlyRevenue = monthlyRevenueResult[0]?.monthlyRevenue || 0;
    const monthlyExpenses = monthlyRevenue * 0.3; // Assuming 30% expenses
    const netProfit = monthlyRevenue - monthlyExpenses;
    
    // Additional detailed stats for better insights
    const testCategories = await LabTest.aggregate([
      {
        $match: {
          orderedAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
          totalRevenue: { $sum: "$charges.totalAmount" }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);
    
    // Type-safe population with explicit typing
    const recentTests = await LabTest.find(query)
      .populate<{ patient: PopulatedPatient }>("patient", "name patientId")
      .populate<{ doctor: PopulatedDoctor }>("doctor", "name")
      .sort({ orderedAt: -1 })
      .limit(5)
      .lean() as unknown as LabTestWithPopulated[];
    
    // Format recent tests with safe property access
    const formattedRecentTests = recentTests.map(test => ({
      id: test._id.toString(),
      testId: test.testId,
      testName: test.testName,
      patientName: getPatientName(test.patient),
      patientId: getPatientId(test.patient),
      doctorName: getDoctorName(test.doctor),
      status: test.status,
      priority: test.priority,
      orderedAt: test.orderedAt,
      amount: test.charges?.totalAmount || 0,
      paymentStatus: test.charges?.paymentStatus || 'pending'
    }));
    
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
          totalRevenue,
          monthlyRevenue,
          monthlyExpenses,
          netProfit,
          completionRate: totalTestsToday > 0 ? 
            Math.round((completedToday / totalTestsToday) * 100) : 0,
          collectionRate: totalTestsToday > 0 ? 
            Math.round(((totalTestsToday - pendingCollection) / totalTestsToday) * 100) : 0
        },
        categories: testCategories.map(cat => ({
          name: cat._id || "Uncategorized",
          count: cat.count,
          revenue: cat.totalRevenue || 0
        })),
        recentTests: formattedRecentTests,
        user: {
          name: auth.userName || "Unknown",
          role: auth.userRole,
          email: auth.userEmail
        },
        timeRange: {
          selected: timeRange,
          startDate: startDate.toISOString(),
          endDate: new Date().toISOString()
        }
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error("Error fetching laboratory dashboard data:", error);
    
    // Return appropriate error response
    const errorMessage = error.message || "Failed to fetch dashboard data";
    const statusCode = error.name === 'ValidationError' ? 400 : 
                      error.name === 'CastError' ? 400 : 
                      error.code === 11000 ? 409 : 500;
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
      },
      { status: statusCode }
    );
  }
}

// OPTIONAL: Add POST method for filtering or exporting data
export async function POST(request: NextRequest) {
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
    
    // Safely check if user can access laboratory
    if (!auth.userRole || !canAccessLaboratory(auth.userRole)) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Forbidden. You don't have permission to access laboratory dashboard."
        },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    const { filters = {}, exportFormat } = body;
    
    // Apply filters if provided
    const query: any = {};
    
    if (filters.dateFrom || filters.dateTo) {
      query.orderedAt = {};
      if (filters.dateFrom) query.orderedAt.$gte = new Date(filters.dateFrom);
      if (filters.dateTo) query.orderedAt.$lte = new Date(filters.dateTo);
    }
    
    if (filters.status) query.status = filters.status;
    if (filters.priority) query.priority = filters.priority;
    if (filters.category) query.category = filters.category;
    
    // Get filtered data with type-safe population
    const tests = await LabTest.find(query)
      .populate<{ patient: PopulatedPatient }>("patient", "name patientId phone")
      .populate<{ doctor: PopulatedDoctor }>("doctor", "name specialization")
      .sort({ orderedAt: -1 })
      .lean() as unknown as LabTestWithPopulated[];
    
    // Format response based on export format
    let formattedData;
    
    if (exportFormat === 'csv') {
      // Convert to CSV format using safe property access
      const csvData = tests.map(test => ({
        'Test ID': test.testId,
        'Patient': getPatientName(test.patient),
        'Patient ID': getPatientId(test.patient),
        'Test Name': test.testName,
        'Category': test.category,
        'Status': test.status,
        'Priority': test.priority,
        'Ordered At': new Date(test.orderedAt).toLocaleString(),
        'Amount': test.charges?.totalAmount || 0,
        'Payment Status': test.charges?.paymentStatus || 'pending'
      }));
      
      formattedData = { format: 'csv', data: csvData };
    } else {
      // Format JSON response with safe property access
      formattedData = { 
        format: 'json', 
        data: tests.map(test => ({
          _id: test._id,
          testId: test.testId,
          testName: test.testName,
          patient: {
            name: getPatientName(test.patient),
            patientId: getPatientId(test.patient)
          },
          doctor: {
            name: getDoctorName(test.doctor)
          },
          status: test.status,
          priority: test.priority,
          orderedAt: test.orderedAt,
          charges: test.charges
        }))
      };
    }
    
    return NextResponse.json({
      success: true,
      data: formattedData,
      count: tests.length,
      filtersApplied: Object.keys(filters).length > 0
    });
    
  } catch (error: any) {
    console.error("Error in laboratory dashboard POST:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process request" },
      { status: 500 }
    );
  }
}