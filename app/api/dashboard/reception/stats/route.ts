import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { User } from "@/lib/models/User";
import { Patient } from "@/lib/models/Patient";
import { Appointment } from "@/lib/models/Appointment";
import { Payment } from "@/lib/models/Payment";
import { DiscountRequest } from "@/lib/models/DiscountRequest";
import { ReceptionExpense } from "@/lib/models/ReceptionExpense";
import { LabTest } from "@/lib/models/LabTest";
import { RadiologyExam } from "@/lib/models/RadiologyExam";
import { DischargeCard } from "@/lib/models/DischargeCard";

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    // Get user info from middleware headers
    const userId = request.headers.get("x-user-id");
    const userRole = request.headers.get("x-user-role");

    if (!userId || !userRole) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    // Only receptionist and admin can access
    if (!["admin", "receptionist"].includes(userRole)) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get daily visitors (patients seen today)
    const dailyVisitors = await Patient.countDocuments({
      updatedAt: { $gte: today, $lt: tomorrow },
    });

    // Get today's appointments
    const appointments = await Appointment.countDocuments({
      date: { $gte: today, $lt: tomorrow },
    });

    // Get pending appointments for today
    const pendingAppointments = await Appointment.countDocuments({
      date: { $gte: today, $lt: tomorrow },
      status: "pending",
    });

    // Get waiting patients (checked in but not seen)
    const waitingPatients = await Appointment.countDocuments({
      date: { $gte: today, $lt: tomorrow },
      status: "checked-in",
    });

    // Get check-ins (patients checked in today)
    const checkIns = await Appointment.countDocuments({
      checkInTime: { $gte: today, $lt: tomorrow },
      status: { $in: ["checked-in", "completed"] },
    });

    // Get today's revenue
    const todayPayments = await Payment.aggregate([
      {
        $match: {
          paymentDate: { $gte: today, $lt: tomorrow },
          status: "completed",
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$amount" },
        },
      },
    ]);

    const todayRevenue = todayPayments[0]?.totalRevenue || 0;

    // Get today's total expenses (all expenses, regardless of status)
    const todayExpenses = await ReceptionExpense.aggregate([
      {
        $match: {
          date: { $gte: today, $lt: tomorrow },
        },
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$amount" },
        },
      },
    ]);

    const totalExpensesToday = todayExpenses[0]?.totalAmount || 0;

    // Get today's appointments total amount (using doctor's consultationFee)
    const todayAppointmentsAmount = await Appointment.aggregate([
      {
        $match: {
          date: { $gte: today, $lt: tomorrow },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "doctor",
          foreignField: "_id",
          as: "doctorData",
        },
      },
      {
        $unwind: {
          path: "$doctorData",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$doctorData.consultationFee" },
        },
      },
    ]);

    console.log(
      "[Stats API] Today's appointments amount query result:",
      todayAppointmentsAmount,
    );
    const totalAppointmentsToday = todayAppointmentsAmount[0]?.totalAmount || 0;
    console.log(
      "[Stats API] Total appointments today:",
      totalAppointmentsToday,
    );

    // Get today's approved discounts total amount
    const todayApprovedDiscounts = await DiscountRequest.aggregate([
      {
        $match: {
          updatedAt: { $gte: today, $lt: tomorrow },
          status: "approved",
        },
      },
      {
        $group: {
          _id: null,
          totalDiscount: { $sum: "$requestedAmount" },
        },
      },
    ]);

    const totalApprovedDiscountsToday =
      todayApprovedDiscounts[0]?.totalDiscount || 0;

    // Get today's lab payments (paid tests)
    const todayLabPayments = await LabTest.aggregate([
      {
        $match: {
          createdAt: { $gte: today, $lt: tomorrow },
          "charges.paymentStatus": "paid",
        },
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$charges.totalAmount" },
        },
      },
    ]);

    const totalLabPaymentsToday = todayLabPayments[0]?.totalAmount || 0;

    // Get today's radiology payments (paid exams)
    const todayRadiologyPayments = await RadiologyExam.aggregate([
      {
        $match: {
          createdAt: { $gte: today, $lt: tomorrow },
          "charges.paymentStatus": "paid",
        },
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$charges.totalAmount" },
        },
      },
    ]);

    const totalRadiologyPaymentsToday =
      todayRadiologyPayments[0]?.totalAmount || 0;

    // Get today's discharge card payments (paid cards)
    const todayDischargePayments = await DischargeCard.aggregate([
      {
        $match: {
          "billing.paymentDate": { $gte: today, $lt: tomorrow },
          "billing.paymentStatus": "paid",
        },
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$billing.paidAmount" },
        },
      },
    ]);

    const totalDischargePaymentsToday =
      todayDischargePayments[0]?.totalAmount || 0;

    // Get today's pharmacy payments (cash payments only)
    const todayPharmacyPayments = await Payment.aggregate([
      {
        $match: {
          paymentDate: { $gte: today, $lt: tomorrow },
          department: "pharmacy",
          status: "completed",
          paymentMethod: "cash",
        },
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$amount" },
        },
      },
    ]);

    const totalPharmacyPaymentsToday =
      todayPharmacyPayments[0]?.totalAmount || 0;

    // Get pending discounts
    const pendingDiscounts = await DiscountRequest.countDocuments({
      status: "pending",
    });

    // Get system cash total (cash payments today)
    const systemCashTotal = await Payment.aggregate([
      {
        $match: {
          paymentDate: { $gte: today, $lt: tomorrow },
          status: "completed",
          paymentMethod: "cash",
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
        },
      },
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
      systemCashTotal: systemCashTotal[0]?.total || 0,
      // New fields for cash dashboard
      totalExpensesToday,
      totalAppointmentsToday,
      totalApprovedDiscountsToday,
      totalLabPaymentsToday,
      totalRadiologyPaymentsToday,
      totalDischargePaymentsToday,
      totalPharmacyPaymentsToday,
    };

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Error fetching reception stats:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch reception statistics" },
      { status: 500 },
    );
  }
}
