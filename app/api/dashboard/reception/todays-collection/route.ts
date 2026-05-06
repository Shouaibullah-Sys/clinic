import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenPayload } from "@/lib/auth/jwt";

export async function GET(request: NextRequest) {
  try {
    const payload = await getTokenPayload(request);
    if (!payload) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    if (!["admin", "receptionist"].includes(payload.role)) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // 1. Get Appointment Payments
    const appointmentPayments = await prisma.payment.findMany({
      where: {
        paymentDate: { gte: today, lt: tomorrow },
        status: "completed",
        department: "consultation",
      },
    });

    const appointmentData = appointmentPayments.reduce(
      (acc, p) => ({
        totalAmount: acc.totalAmount + p.amount,
        totalNetAmount: acc.totalNetAmount + (p.netAmount || 0),
        totalDiscount: acc.totalDiscount + (p.discountAmount || 0),
        count: acc.count + 1,
      }),
      { totalAmount: 0, totalNetAmount: 0, totalDiscount: 0, count: 0 },
    );

    // 2. Get Lab Tests
    const labTests = await prisma.labTest.findMany({
      where: {
        createdAt: { gte: today, lt: tomorrow },
        status: { not: "cancelled" },
      },
    });

    const labData = labTests.reduce((acc, t) => {
      const charges = typeof t.charges === "string" ? JSON.parse(t.charges) : t.charges;
      if (charges?.paymentStatus && ["paid", "partial"].includes(charges.paymentStatus)) {
        return {
          totalPaid: acc.totalPaid + (charges.paid || 0),
          totalAmount: acc.totalAmount + (charges.totalAmount || 0),
          totalDiscount: acc.totalDiscount + (charges.discount || 0),
          count: acc.count + 1,
        };
      }
      return acc;
    }, { totalPaid: 0, totalAmount: 0, totalDiscount: 0, count: 0 });

    // 3. Get Radiology Exams
    const radiologyExams = await prisma.radiologyExam.findMany({
      where: {
        createdAt: { gte: today, lt: tomorrow },
        status: { not: "cancelled" },
      },
    });

    const radiologyData = radiologyExams.reduce((acc, e) => {
      const charges = typeof e.charges === "string" ? JSON.parse(e.charges) : e.charges;
      if (charges?.paymentStatus && ["paid", "partial"].includes(charges.paymentStatus)) {
        return {
          totalPaid: acc.totalPaid + (charges.paid || 0),
          totalAmount: acc.totalAmount + (charges.totalAmount || 0),
          totalDiscount: acc.totalDiscount + (charges.discount || 0),
          count: acc.count + 1,
        };
      }
      return acc;
    }, { totalPaid: 0, totalAmount: 0, totalDiscount: 0, count: 0 });

    // 4. Get Approved Discounts
    const approvedDiscounts = await prisma.discountRequest.findMany({
      where: {
        status: "approved",
        approvedAt: { gte: today, lt: tomorrow },
      },
    });

    const discountData = approvedDiscounts.reduce(
      (acc, d) => ({
        totalDiscountAmount: acc.totalDiscountAmount + (d.amount || 0),
        count: acc.count + 1,
      }),
      { totalDiscountAmount: 0, count: 0 },
    );

    // 5. Get Expenses
    const expenses = await prisma.receptionExpense.findMany({
      where: {
        date: { gte: today, lt: tomorrow },
      },
    });

    const expenseData = expenses.reduce(
      (acc, e) => ({
        totalExpenses: acc.totalExpenses + e.amount,
        count: acc.count + 1,
        byCategory: [...acc.byCategory, { category: e.category, amount: e.amount }],
      }),
      { totalExpenses: 0, count: 0, byCategory: [] as { category: string | null; amount: number }[] },
    );

    const expensesByCategory: Record<string, number> = {
      supplies: 0,
      maintenance: 0,
      utilities: 0,
      miscellaneous: 0,
      food: 0,
      transport: 0,
    };

    expenseData.byCategory.forEach((item) => {
      if (item.category && expensesByCategory[item.category] !== undefined) {
        expensesByCategory[item.category] += item.amount;
      }
    });

    const totalCollection =
      appointmentData.totalNetAmount + labData.totalPaid + radiologyData.totalPaid;

    const totalDiscounts =
      appointmentData.totalDiscount + labData.totalDiscount + radiologyData.totalDiscount + discountData.totalDiscountAmount;

    const netCollection = totalCollection - totalDiscounts;
    const netAfterExpenses = netCollection - expenseData.totalExpenses;

    const todaysCollection = {
      appointments: {
        totalAmount: appointmentData.totalAmount,
        netAmount: appointmentData.totalNetAmount,
        discount: appointmentData.totalDiscount,
        count: appointmentData.count,
      },
      lab: {
        totalPaid: labData.totalPaid,
        totalAmount: labData.totalAmount,
        discount: labData.totalDiscount,
        count: labData.count,
      },
      radiology: {
        totalPaid: radiologyData.totalPaid,
        totalAmount: radiologyData.totalAmount,
        discount: radiologyData.totalDiscount,
        count: radiologyData.count,
      },
      discounts: {
        totalDiscountAmount: discountData.totalDiscountAmount,
        count: discountData.count,
      },
      expenses: {
        totalExpenses: expenseData.totalExpenses,
        count: expenseData.count,
        byCategory: expensesByCategory,
      },
      summary: {
        totalCollection,
        totalDiscounts,
        netCollection,
        totalExpenses: expenseData.totalExpenses,
        netAfterExpenses,
      },
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