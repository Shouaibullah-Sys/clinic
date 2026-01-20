// app/api/admissions/route.ts
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { Admission } from "@/lib/models/Admission";
import { Patient } from "@/lib/models/Patient";
import { User } from "@/lib/models/User";
import mongoose from "mongoose";

// Helper function to check permissions
const checkPermission = (role: string, allowedRoles: string[]): boolean => {
  return allowedRoles.includes(role);
};

// GET all admissions
export async function GET(request: NextRequest) {
  try {
    // Get user info from headers (set by middleware)
    const userId = request.headers.get("x-user-id");
    const userRole = request.headers.get("x-user-role");

    console.log("Auth headers:", { userId, userRole }); // Debug log

    if (!userId || !userRole) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Please login again." },
        { status: 401 }
      );
    }

    // Check if user can view admissions
    const canView = checkPermission(userRole, [
      "admin",
      "doctor",
      "nurse",
      "receptionist",
    ]);
    
    if (!canView) {
      return NextResponse.json(
        { success: false, error: "Insufficient permissions to view admissions" },
        { status: 403 }
      );
    }

    await dbConnect();

    // Verify user exists and is active (optional, remove if causing issues)
    try {
      const user = await User.findById(userId).select("active department");
      if (!user || !user.active) {
        console.log("User not found or inactive:", userId);
      }
    } catch (error) {
      console.log("User verification skipped:", error);
    }

    const { searchParams } = new URL(request.url);
    const includeStats = searchParams.get("includeStats") === "true";
    
    if (includeStats) {
      // Return only stats without admissions data
      const [
        totalAdmissions,
        admittedCount,
        dischargedCount,
        transferredCount,
        cancelledCount,
      ] = await Promise.all([
        Admission.countDocuments({}),
        Admission.countDocuments({ status: "admitted" }),
        Admission.countDocuments({ status: "discharged" }),
        Admission.countDocuments({ status: "transferred" }),
        Admission.countDocuments({ status: "cancelled" }),
      ]);

      // Calculate average stay
      const dischargedAdmissions = await Admission.find({
        status: "discharged",
        admissionDate: { $exists: true },
        dischargeDate: { $exists: true },
      }).select("admissionDate dischargeDate");

      let averageStay = 0;
      if (dischargedAdmissions.length > 0) {
        const totalDays = dischargedAdmissions.reduce((sum, admission) => {
          const stayTime = admission.dischargeDate.getTime() - admission.admissionDate.getTime();
          const stayDays = Math.ceil(stayTime / (1000 * 60 * 60 * 24));
          return sum + (stayDays || 0);
        }, 0);
        averageStay = totalDays / dischargedAdmissions.length;
      }

      // Mock occupancy rate (you should replace with actual bed capacity)
      const occupancyRate = (admittedCount / 100) * 100;

      return NextResponse.json({
        success: true,
        stats: {
          total: totalAdmissions,
          admitted: admittedCount,
          discharged: dischargedCount,
          transferred: transferredCount,
          cancelled: cancelledCount,
          averageStay: parseFloat(averageStay.toFixed(1)),
          occupancyRate: parseFloat(occupancyRate.toFixed(1)),
        },
      });
    }

    // Regular admissions data fetch
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const status = searchParams.get("status");
    const ward = searchParams.get("ward");
    const search = searchParams.get("search");
    const sortBy = searchParams.get("sortBy") || "admissionDate";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    const skip = (page - 1) * limit;

    // Build filter
    const filter: any = {};

    if (status) filter.status = status;
    if (ward) filter.ward = { $regex: new RegExp(ward, "i") };
    
    if (search) {
      const searchRegex = new RegExp(search, "i");
      filter.$or = [
        { admissionId: searchRegex },
        { reason: searchRegex },
        { diagnosis: searchRegex },
        { ward: searchRegex },
        { bedNumber: searchRegex },
      ];
    }

    // Role-based filtering
    if (userRole === "doctor") {
      filter.$or = [
        { doctor: userId },
        { "treatments.administeredBy": userId },
      ];
    } else if (userRole === "nurse") {
      filter["treatments.administeredBy"] = userId;
    }

    // Build sort
    const sort: any = {};
    sort[sortBy] = sortOrder === "desc" ? -1 : 1;

    // Execute query
    const [admissions, total] = await Promise.all([
      Admission.find(filter)
        .populate("patient", "patientId name age gender phone")
        .populate("doctor", "name email specialization")
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Admission.countDocuments(filter),
    ]);

    return NextResponse.json({
      success: true,
      data: admissions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Error in GET /api/admissions:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch admissions data",
      },
      { status: 500 }
    );
  }
}

// POST create new admission
export async function POST(request: NextRequest) {
  try {
    // Get user info from headers
    const userId = request.headers.get("x-user-id");
    const userRole = request.headers.get("x-user-role");

    if (!userId || !userRole) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check permissions
    if (!checkPermission(userRole, ["admin", "doctor", "receptionist"])) {
      return NextResponse.json(
        { success: false, error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    await dbConnect();

    const body = await request.json();

    // Validate required fields
    const requiredFields = ["patient", "reason", "diagnosis", "ward", "bedNumber"];
    const missingFields = requiredFields.filter(field => !body[field]);

    if (missingFields.length > 0) {
      return NextResponse.json(
        { success: false, error: `Missing required fields: ${missingFields.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate patient exists
    const patient = await Patient.findById(body.patient);
    if (!patient) {
      return NextResponse.json(
        { success: false, error: "Patient not found" },
        { status: 404 }
      );
    }

    // Check if bed is occupied
    const existingAdmission = await Admission.findOne({
      ward: body.ward,
      bedNumber: body.bedNumber,
      status: "admitted",
    });

    if (existingAdmission) {
      return NextResponse.json(
        { success: false, error: "Bed is already occupied" },
        { status: 400 }
      );
    }

    // Create admission with auto-generated admissionId
    const admission = new Admission({
      patient: body.patient,
      doctor: body.doctor || userId,
      admissionDate: body.admissionDate ? new Date(body.admissionDate) : new Date(),
      expectedStay: body.expectedStay || 1,
      reason: body.reason,
      diagnosis: body.diagnosis,
      ward: body.ward,
      bedNumber: body.bedNumber,
      roomType: body.roomType || "general",
      status: "admitted",
      notes: body.notes,
      vitalSigns: body.vitalSigns || [],
      treatments: body.treatments || [],
    });

    await admission.save();

    // Populate for response
    const populatedAdmission = await Admission.findById(admission._id)
      .populate("patient", "patientId name age gender phone")
      .populate("doctor", "name email specialization")
      .lean();

    return NextResponse.json(
      {
        success: true,
        message: "Admission created successfully",
        data: populatedAdmission,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error in POST /api/admissions:", error);
    
    if (error instanceof mongoose.Error.ValidationError) {
      const errors = Object.values(error.errors).map(err => err.message);
      return NextResponse.json(
        { success: false, error: errors.join(", ") },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to create admission",
      },
      { status: 500 }
    );
  }
}

// Handle other methods
export async function PUT(request: NextRequest) {
  return NextResponse.json(
    { success: false, error: "Method not allowed" },
    { status: 405 }
  );
}

export async function DELETE(request: NextRequest) {
  return NextResponse.json(
    { success: false, error: "Method not allowed" },
    { status: 405 }
  );
}