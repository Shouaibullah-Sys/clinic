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
import { Prescription } from "@/lib/models/Prescription";
import { RadiologyService } from "@/lib/models/RadiologyService";

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

    // Get today's appointments total amount (using appointment consultationFee override if present)
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
          totalAmount: {
            $sum: {
              $ifNull: [
                "$consultationFee",
                { $ifNull: ["$doctorData.consultationFee", 0] },
              ],
            },
          },
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

    // Get today's lab payments and discounts
    const todayLabPayments = await LabTest.aggregate([
      {
        $match: {
          "charges.paymentDate": { $gte: today, $lt: tomorrow },
          "charges.paymentStatus": { $in: ["paid", "partial"] },
          status: { $ne: "cancelled" },
        },
      },
      {
        $group: {
          _id: null,
          totalPaid: { $sum: "$charges.paid" },
          totalDiscount: { $sum: "$charges.discount" },
        },
      },
    ]);

    const totalLabPaymentsToday = todayLabPayments[0]?.totalPaid || 0;
    const totalLabDiscountsToday = todayLabPayments[0]?.totalDiscount || 0;

    // Get today's radiology payments and discounts (direct exams + services)
    const [todayRadiologyExamPayments, todayRadiologyServicePayments] =
      await Promise.all([
        RadiologyExam.aggregate([
          {
            $match: {
              "charges.paymentDate": { $gte: today, $lt: tomorrow },
              "charges.paymentStatus": { $in: ["paid", "partial"] },
              status: { $ne: "cancelled" },
            },
          },
          {
            $group: {
              _id: null,
              totalPaid: { $sum: "$charges.paid" },
              totalDiscount: { $sum: "$charges.discount" },
            },
          },
        ]),
        RadiologyService.aggregate([
          {
            $match: {
              "charges.paymentDate": { $gte: today, $lt: tomorrow },
              "charges.paymentStatus": { $in: ["paid", "partial"] },
              status: { $ne: "cancelled" },
            },
          },
          {
            $group: {
              _id: null,
              totalPaid: { $sum: "$charges.paid" },
              totalDiscount: { $sum: "$charges.discount" },
            },
          },
        ]),
      ]);

    const totalRadiologyPaymentsToday =
      (todayRadiologyExamPayments[0]?.totalPaid || 0) +
      (todayRadiologyServicePayments[0]?.totalPaid || 0);
    const totalRadiologyDiscountsToday =
      (todayRadiologyExamPayments[0]?.totalDiscount || 0) +
      (todayRadiologyServicePayments[0]?.totalDiscount || 0);

    // Get today's prescription payments and discounts
    const todayPrescriptionPayments = await Prescription.aggregate([
      {
        $match: {
          "charges.paymentDate": { $gte: today, $lt: tomorrow },
          "charges.paymentStatus": { $in: ["paid", "partial"] },
          status: { $ne: "cancelled" },
        },
      },
      {
        $group: {
          _id: null,
          totalPaid: { $sum: "$charges.paid" },
          totalDiscount: { $sum: "$charges.discount" },
        },
      },
    ]);

    const totalPrescriptionDiscountsToday =
      todayPrescriptionPayments[0]?.totalDiscount || 0;

    // Get today's discharge card payments and discounts
    const todayDischargePayments = await DischargeCard.aggregate([
      {
        $match: {
          "billing.paymentDate": { $gte: today, $lt: tomorrow },
          "billing.paymentStatus": { $in: ["paid", "partial"] },
        },
      },
      {
        $group: {
          _id: null,
          totalPaid: { $sum: "$billing.paidAmount" },
          totalDiscount: { $sum: "$billing.discountAmount" },
        },
      },
    ]);

    const totalDischargePaymentsToday =
      todayDischargePayments[0]?.totalPaid || 0;
    const totalDischargeDiscountsToday =
      todayDischargePayments[0]?.totalDiscount || 0;

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

    // Pharmacy sale discounts (exclude prescription payments to avoid double count)
    const todayPharmacySaleDiscounts = await Payment.aggregate([
      {
        $match: {
          paymentDate: { $gte: today, $lt: tomorrow },
          department: "pharmacy",
          serviceType: "pharmacy_sale",
          status: "completed",
        },
      },
      {
        $group: {
          _id: null,
          totalDiscount: { $sum: { $ifNull: ["$discountAmount", 0] } },
        },
      },
    ]);

    const totalPharmacyDiscountsToday =
      todayPharmacySaleDiscounts[0]?.totalDiscount || 0;

    // Consultation payment discounts (if recorded via Payment)
    const todayConsultationDiscounts = await Payment.aggregate([
      {
        $match: {
          paymentDate: { $gte: today, $lt: tomorrow },
          department: "consultation",
          status: "completed",
        },
      },
      {
        $group: {
          _id: null,
          totalDiscount: { $sum: { $ifNull: ["$discountAmount", 0] } },
        },
      },
    ]);

    const totalConsultationDiscountsToday =
      todayConsultationDiscounts[0]?.totalDiscount || 0;

    const totalApprovedDiscountsToday =
      totalLabDiscountsToday +
      totalRadiologyDiscountsToday +
      totalPrescriptionDiscountsToday +
      totalDischargeDiscountsToday +
      totalPharmacyDiscountsToday +
      totalConsultationDiscountsToday;

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
