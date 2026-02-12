// app/api/dashboard/admin/doctor-collections/route.ts
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { Appointment } from "@/lib/models/Appointment";
import { DischargeCard } from "@/lib/models/DischargeCard";
import { User } from "@/lib/models/User";
import { Patient } from "@/lib/models/Patient";
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

// Helper function to get date range based on period
function getDateRange(period: string, startDate?: string, endDate?: string) {
  const now = new Date();
  let start: Date;
  let end: Date;

  if (startDate && endDate) {
    start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    return { start, end, type: "custom" };
  }

  switch (period) {
    case "today":
      start = new Date(now);
      start.setHours(0, 0, 0, 0);
      end = new Date(now);
      end.setHours(23, 59, 59, 999);
      break;
    case "week":
      const dayOfWeek = now.getDay();
      const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      start = new Date(now);
      start.setDate(diff);
      start.setHours(0, 0, 0, 0);
      end = new Date(now);
      end.setHours(23, 59, 59, 999);
      break;
    case "month":
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      start.setHours(0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case "year":
      start = new Date(now.getFullYear(), 0, 1);
      start.setHours(0, 0, 0, 0);
      end = new Date(now.getFullYear(), 11, 31);
      end.setHours(23, 59, 59, 999);
      break;
    default:
      start = new Date(now);
      start.setHours(0, 0, 0, 0);
      end = new Date(now);
      end.setHours(23, 59, 59, 999);
  }

  return { start, end, type: period };
}

// GET: Get doctor-wise collection summary
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    // Authentication
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. No token provided." },
        { status: 401 },
      );
    }

    const token = authHeader.split(" ")[1];
    const payload = await verifyToken(token);

    if (!payload) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired token." },
        { status: 401 },
      );
    }

    const userRole = payload.role as string;

    // Only admin can access this endpoint
    if (userRole !== "admin") {
      return NextResponse.json(
        { success: false, error: "Forbidden. Admin access required." },
        { status: 403 },
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "today";
    const department = searchParams.get("department");
    const doctorId = searchParams.get("doctorId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Get date range
    const dateRange = getDateRange(
      period,
      startDate || undefined,
      endDate || undefined,
    );

    // Build doctor filter
    const doctorFilter: any = { role: "doctor", active: true };
    if (department && department !== "all") {
      doctorFilter.department = department;
    }
    if (doctorId) {
      doctorFilter._id = doctorId;
    }

    // Get all active doctors
    const doctors = await User.find(doctorFilter)
      .select("_id name department specialization consultationFee")
      .lean();

    console.log("[DoctorCollections] Found", doctors.length, "active doctors");

    // Create a map for quick doctor lookup
    const doctorMap = new Map();
    doctors.forEach((doc: any) => {
      doctorMap.set(doc._id.toString(), {
        doctorId: doc._id.toString(),
        doctorName: doc.name,
        department: doc.department || "N/A",
        specialization: doc.specialization || "N/A",
        consultationFee: doc.consultationFee || 0,
        appointmentCount: 0,
        appointmentRevenue: 0,
        operationCount: 0,
        operationRevenue: 0,
        totalCollection: 0,
      });
    });

    // Aggregate appointments - Use startTime for date filtering
    // Include multiple statuses since appointments may not be checked out properly
    // "scheduled" appointments are still valid patient visits that should be counted
    const appointmentMatch: any = {
      status: {
        $in: [
          "completed",
          "checked-in",
          "in-progress",
          "scheduled",
          "confirmed",
        ],
      },
      startTime: { $gte: dateRange.start, $lte: dateRange.end },
    };
    if (doctorId) {
      appointmentMatch.doctor = doctorId;
    }

    console.warn(
      "DEBUG: Appointment match query:",
      JSON.stringify(appointmentMatch, null, 2),
    );

    console.log(
      "[DoctorCollections] Appointment match query:",
      JSON.stringify(appointmentMatch, null, 2),
    );

    // Debug: Check total appointments in date range regardless of status
    // Using startTime instead of date for more reliable filtering
    const debugAppointments = await Appointment.find({
      startTime: { $gte: dateRange.start, $lte: dateRange.end },
    })
      .select("status date startTime doctor consultationFee")
      .limit(10)
      .lean();

    console.log(
      `[DoctorCollections] Total appointments in date range: ${debugAppointments.length}`,
    );
    const statusCounts: Record<string, number> = {};
    debugAppointments.forEach((apt: any) => {
      statusCounts[apt.status] = (statusCounts[apt.status] || 0) + 1;
    });
    console.log("[DoctorCollections] Appointments by status:", statusCounts);

    // Debug: Check some sample appointments
    if (debugAppointments.length > 0) {
      console.log(
        "[DoctorCollections] Sample appointments:",
        debugAppointments.slice(0, 3),
      );
    }

    const appointmentAggregation = await Appointment.aggregate([
      { $match: appointmentMatch },
      {
        $lookup: {
          from: "users",
          localField: "doctor",
          foreignField: "_id",
          as: "doctorInfo",
        },
      },
      { $unwind: { path: "$doctorInfo", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: "$doctor",
          appointmentCount: { $sum: 1 },
          appointmentRevenue: {
            $sum: {
              $cond: [
                { $eq: ["$appointmentType", "emergency"] },
                { $ifNull: ["$doctorInfo.consultationFee", 0] },
                { $ifNull: ["$doctorInfo.consultationFee", 0] },
              ],
            },
          },
        },
      },
    ]);

    console.log(
      "[DoctorCollections] Appointment aggregation result:",
      appointmentAggregation,
    );

    // Update doctor map with appointment data
    appointmentAggregation.forEach((apt: any) => {
      const doctorIdStr = apt._id?.toString();
      if (doctorIdStr && doctorMap.has(doctorIdStr)) {
        const doctorData = doctorMap.get(doctorIdStr);
        doctorData.appointmentCount = apt.appointmentCount || 0;
        doctorData.appointmentRevenue = apt.appointmentRevenue || 0;
      }
    });

    // Aggregate discharge cards (operations)
    const dischargeMatch: any = {
      status: { $in: ["paid", "completed"] },
      dischargeDate: { $gte: dateRange.start, $lte: dateRange.end },
    };
    if (doctorId) {
      dischargeMatch.doctor = doctorId;
    }

    const dischargeAggregation = await DischargeCard.aggregate([
      { $match: dischargeMatch },
      {
        $group: {
          _id: "$doctor",
          operationCount: { $sum: 1 },
          operationRevenue: { $sum: "$billing.paidAmount" },
        },
      },
    ]);

    // Update doctor map with discharge data
    dischargeAggregation.forEach((discharge: any) => {
      const doctorIdStr = discharge._id?.toString();
      if (doctorIdStr && doctorMap.has(doctorIdStr)) {
        const doctorData = doctorMap.get(doctorIdStr);
        doctorData.operationCount = discharge.operationCount || 0;
        doctorData.operationRevenue = discharge.operationRevenue || 0;
      }
    });

    // Calculate totals and convert to array
    const byDoctor = Array.from(doctorMap.values())
      // FIX: Show ALL doctors, not just those with activity
      // .filter((doc: any) => {
      //   // Only include doctors who have some activity
      //   return doc.appointmentCount > 0 || doc.operationCount > 0;
      // })
      .map((doc: any) => {
        doc.totalCollection = doc.appointmentRevenue + doc.operationRevenue;
        return doc;
      })
      .sort((a: any, b: any) => b.totalCollection - a.totalCollection);

    console.log(
      "[DoctorCollections] Returning",
      byDoctor.length,
      "doctors in collection summary",
    );

    // Calculate summary
    const summary = {
      totalAppointments: byDoctor.reduce(
        (sum: number, doc: any) => sum + doc.appointmentCount,
        0,
      ),
      totalAppointmentRevenue: byDoctor.reduce(
        (sum: number, doc: any) => sum + doc.appointmentRevenue,
        0,
      ),
      totalOperations: byDoctor.reduce(
        (sum: number, doc: any) => sum + doc.operationCount,
        0,
      ),
      totalOperationRevenue: byDoctor.reduce(
        (sum: number, doc: any) => sum + doc.operationRevenue,
        0,
      ),
      grandTotal: byDoctor.reduce(
        (sum: number, doc: any) => sum + doc.totalCollection,
        0,
      ),
    };

    // If a specific doctor is selected, get detailed breakdown
    let detailedAppointments: any[] = [];
    let detailedOperations: any[] = [];

    if (doctorId) {
      // Get detailed appointments for the selected doctor
      // Include all non-cancelled statuses
      const appointments = await Appointment.find({
        doctor: doctorId,
        status: {
          $in: [
            "completed",
            "checked-in",
            "in-progress",
            "scheduled",
            "confirmed",
          ],
        },
        startTime: { $gte: dateRange.start, $lte: dateRange.end },
      })
        .populate("patient", "name phone")
        .sort({ startTime: -1 })
        .lean();

      detailedAppointments = appointments.map((apt: any) => ({
        appointmentId: apt._id,
        date: apt.startTime || apt.date,
        patientName: apt.patient?.name || "N/A",
        patientPhone: apt.patient?.phone || "N/A",
        appointmentType: apt.appointmentType || "regular",
        fee: apt.doctorFee || apt.consultationFee || 0,
        status: apt.status,
      }));

      // Get detailed operations (discharge cards) for the selected doctor
      const dischargeCards = await DischargeCard.find({
        doctor: doctorId,
        status: { $in: ["paid", "completed"] },
        dischargeDate: { $gte: dateRange.start, $lte: dateRange.end },
      })
        .populate("patient", "name phone")
        .sort({ dischargeDate: -1 })
        .lean();

      detailedOperations = dischargeCards.map((card: any) => ({
        dischargeCardId: card._id,
        dischargeId: card.dischargeId,
        date: card.dischargeDate,
        patientName: card.patient?.name || "N/A",
        patientPhone: card.patient?.phone || "N/A",
        totalAmount: card.billing?.totalAmount || 0,
        paidAmount: card.billing?.paidAmount || 0,
        discount: card.billing?.discount || 0,
        status: card.status,
      }));
    }

    return NextResponse.json({
      success: true,
      data: {
        summary,
        byDoctor,
        period: {
          type: dateRange.type,
          startDate: dateRange.start,
          endDate: dateRange.end,
        },
        // Include detailed breakdown when a specific doctor is selected
        ...(doctorId && {
          doctorDetails: doctorMap.has(doctorId)
            ? doctorMap.get(doctorId)
            : null,
          detailedAppointments,
          detailedOperations,
        }),
      },
    });
  } catch (error: any) {
    console.error("Error fetching doctor collections:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch doctor collections",
      },
      { status: 500 },
    );
  }
}
