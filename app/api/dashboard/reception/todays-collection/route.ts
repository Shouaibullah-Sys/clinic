import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { Payment } from "@/lib/models/Payment";
import { LabTest } from "@/lib/models/LabTest";
import { RadiologyExam } from "@/lib/models/RadiologyExam";
import { DiscountRequest } from "@/lib/models/DiscountRequest";
import { ReceptionExpense } from "@/lib/models/ReceptionExpense";

// GET: Get comprehensive Today's Collection data
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const userId = request.headers.get("x-user-id");
    const userRole = request.headers.get("x-user-role");

    if (!userId || !userRole) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    if (!["admin", "receptionist"].includes(userRole)) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );
    }

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // 1. Get Appointment Payments (consultation department)
    const appointmentPayments = await Payment.aggregate([
      {
        $match: {
          paymentDate: { $gte: today, $lt: tomorrow },
          status: "completed",
          department: "consultation",
        },
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$amount" },
          totalNetAmount: { $sum: "$netAmount" },
          totalDiscount: { $sum: { $ifNull: ["$discountAmount", 0] } },
          count: { $sum: 1 },
        },
      },
    ]);

    const appointmentData = appointmentPayments[0] || {
      totalAmount: 0,
      totalNetAmount: 0,
      totalDiscount: 0,
      count: 0,
    };

    // 2. Get Lab Payments (from LabTest charges.paid)
    const labPayments = await LabTest.aggregate([
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
          totalAmount: { $sum: "$charges.totalAmount" },
          totalDiscount: { $sum: "$charges.discount" },
          count: { $sum: 1 },
        },
      },
    ]);

    const labData = labPayments[0] || {
      totalPaid: 0,
      totalAmount: 0,
      totalDiscount: 0,
      count: 0,
    };

    // 3. Get Radiology Payments (from RadiologyExam charges.paid)
    const radiologyPayments = await RadiologyExam.aggregate([
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
          totalAmount: { $sum: "$charges.totalAmount" },
          totalDiscount: { $sum: "$charges.discount" },
          count: { $sum: 1 },
        },
      },
    ]);

    const radiologyData = radiologyPayments[0] || {
      totalPaid: 0,
      totalAmount: 0,
      totalDiscount: 0,
      count: 0,
    };

    // 4. Get Approved Discounts (today)
    const approvedDiscounts = await DiscountRequest.aggregate([
      {
        $match: {
          status: "approved",
          approvedAt: { $gte: today, $lt: tomorrow },
        },
      },
      {
        $group: {
          _id: null,
          totalDiscountAmount: { $sum: "$requestedAmount" },
          count: { $sum: 1 },
        },
      },
    ]);

    const discountData = approvedDiscounts[0] || {
      totalDiscountAmount: 0,
      count: 0,
    };

    // 5. Get Expenses (today)
    const expenses = await ReceptionExpense.aggregate([
      {
        $match: {
          date: { $gte: today, $lt: tomorrow },
        },
      },
      {
        $group: {
          _id: null,
          totalExpenses: { $sum: "$amount" },
          count: { $sum: 1 },
          byCategory: {
            $push: {
              category: "$category",
              amount: "$amount",
            },
          },
        },
      },
    ]);

    const expenseData = expenses[0] || {
      totalExpenses: 0,
      count: 0,
      byCategory: [],
    };

    // Group expenses by category
    const expensesByCategory: Record<string, number> = {
      supplies: 0,
      maintenance: 0,
      utilities: 0,
      miscellaneous: 0,
      food: 0,
      transport: 0,
    };

    expenseData.byCategory.forEach((item: any) => {
      if (expensesByCategory[item.category] !== undefined) {
        expensesByCategory[item.category] += item.amount;
      }
    });

    // Calculate totals
    const totalCollection =
      appointmentData.totalNetAmount +
      labData.totalPaid +
      radiologyData.totalPaid;

    const totalDiscounts =
      appointmentData.totalDiscount +
      labData.totalDiscount +
      radiologyData.totalDiscount +
      discountData.totalDiscountAmount;

    const netCollection = totalCollection - totalDiscounts;
    const netAfterExpenses = netCollection - expenseData.totalExpenses;

    const todaysCollection = {
      // Appointment Payments
      appointments: {
        totalAmount: appointmentData.totalAmount,
        netAmount: appointmentData.totalNetAmount,
        discount: appointmentData.totalDiscount,
        count: appointmentData.count,
      },

      // Lab Payments
      lab: {
        totalPaid: labData.totalPaid,
        totalAmount: labData.totalAmount,
        discount: labData.totalDiscount,
        count: labData.count,
      },

      // Radiology Payments
      radiology: {
        totalPaid: radiologyData.totalPaid,
        totalAmount: radiologyData.totalAmount,
        discount: radiologyData.totalDiscount,
        count: radiologyData.count,
      },

      // Approved Discounts
      discounts: {
        totalDiscountAmount: discountData.totalDiscountAmount,
        count: discountData.count,
      },

      // Expenses
      expenses: {
        totalExpenses: expenseData.totalExpenses,
        count: expenseData.count,
        byCategory: expensesByCategory,
      },

      // Summary
      summary: {
        totalCollection,
        totalDiscounts,
        netCollection,
        totalExpenses: expenseData.totalExpenses,
        netAfterExpenses,
      },

      // Date info
      date: today.toISOString(),
    };

    return NextResponse.json({
      success: true,
      data: todaysCollection,
    });
  } catch (error) {
    console.error("Error fetching today's collection:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch today's collection" },
      { status: 500 },
    );
  }
}
