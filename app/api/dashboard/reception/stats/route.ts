import { NextRequest, NextResponse } from "next/server";
import  dbConnect  from "@/lib/dbConnect";
import { User } from "@/lib/models/User";
import { Patient } from "@/lib/models/Patient";
import { Appointment } from "@/lib/models/Appointment";
import { Payment } from "@/lib/models/Payment";
import { DiscountRequest } from "@/lib/models/DiscountRequest";

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    // Get user info from middleware headers
    const userId = request.headers.get("x-user-id");
    const userRole = request.headers.get("x-user-role");
    
    if (!userId || !userRole) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    // Only receptionist and admin can access
    if (!["admin", "receptionist"].includes(userRole)) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Get daily visitors (patients seen today)
    const dailyVisitors = await Patient.countDocuments({
      updatedAt: { $gte: today, $lt: tomorrow }
    });
    
    // Get today's appointments
    const appointments = await Appointment.countDocuments({
      date: { $gte: today, $lt: tomorrow }
    });
    
    // Get pending appointments for today
    const pendingAppointments = await Appointment.countDocuments({
      date: { $gte: today, $lt: tomorrow },
      status: "pending"
    });
    
    // Get waiting patients (checked in but not seen)
    const waitingPatients = await Appointment.countDocuments({
      date: { $gte: today, $lt: tomorrow },
      status: "checked-in"
    });
    
    // Get check-ins (patients checked in today)
    const checkIns = await Appointment.countDocuments({
      checkInTime: { $gte: today, $lt: tomorrow },
      status: { $in: ["checked-in", "completed"] }
    });
    
    // Get today's revenue
    const todayPayments = await Payment.aggregate([
      {
        $match: {
          paymentDate: { $gte: today, $lt: tomorrow },
          status: "completed"
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$amount" }
        }
      }
    ]);
    
    const todayRevenue = todayPayments[0]?.totalRevenue || 0;
    
    // Get pending discounts
    const pendingDiscounts = await DiscountRequest.countDocuments({
      status: "pending"
    });
    
    // Get system cash total (cash payments today)
    const systemCashTotal = await Payment.aggregate([
      {
        $match: {
          paymentDate: { $gte: today, $lt: tomorrow },
          status: "completed",
          paymentMethod: "cash"
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" }
        }
      }
    ]);
    
    // Get daily cash balance (from cash reconciliation - this would come from a separate model)
    // For now, using system cash total as default
    const dailyCashBalance = systemCashTotal[0]?.total || 0;
    
    const stats = {
      dailyVisitors,
      appointments,
      waitingPatients,
      checkIns,
      pendingAppointments,
      todayRevenue,
      pendingDiscounts,
      dailyCashBalance,
      systemCashTotal: systemCashTotal[0]?.total || 0
    };
    
    return NextResponse.json({
      success: true,
      data: stats
    });
    
  } catch (error) {
    console.error("Error fetching reception stats:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch reception statistics" },
      { status: 500 }
    );
  }
}