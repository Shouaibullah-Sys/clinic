import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(req);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "today";

    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    switch (period) {
      case "today":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        break;
      case "week":
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);
        break;
      case "month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case "year":
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
        endDate.setHours(23, 59, 59, 999);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    }

    // Get consultation revenue from payments
    const consultationPayments = await prisma.payment.findMany({
      where: {
        paymentDate: { gte: startDate, lt: endDate },
        status: "completed",
        department: "consultation",
      },
    });

    const consultationData = consultationPayments.reduce(
      (acc, p) => ({
        totalRevenue: acc.totalRevenue + p.amount,
        totalNetAmount: acc.totalNetAmount + (p.netAmount || 0),
        totalDiscount: acc.totalDiscount + (p.discountAmount || 0),
        count: acc.count + 1,
      }),
      { totalRevenue: 0, totalNetAmount: 0, totalDiscount: 0, count: 0 }
    );

    // Get laboratory revenue
    const labTests = await prisma.labTest.findMany({
      where: {
        createdAt: { gte: startDate, lt: endDate },
        status: { not: "cancelled" },
      },
    });

    const labData = labTests.reduce((acc, test) => {
      const charges = typeof test.charges === "string" ? JSON.parse(test.charges) : test.charges;
      if (charges?.paymentStatus === "paid") {
        return {
          totalRevenue: acc.totalRevenue + (charges?.totalAmount || test.totalAmount || 0),
          totalPaid: acc.totalPaid + (charges?.paid || test.paid || 0),
          totalDiscount: acc.totalDiscount + (charges?.discount || test.discount || 0),
          count: acc.count + 1,
        };
      }
      return acc;
    }, { totalRevenue: 0, totalPaid: 0, totalDiscount: 0, count: 0 });

    // Get radiology revenue
    const radiologyExams = await prisma.radiologyExam.findMany({
      where: {
        createdAt: { gte: startDate, lt: endDate },
        status: { not: "cancelled" },
      },
    });

    const radiologyData = radiologyExams.reduce((acc, exam) => {
      const charges = typeof exam.charges === "string" ? JSON.parse(exam.charges) : exam.charges;
      if (charges?.paymentStatus === "paid") {
        return {
          totalRevenue: acc.totalRevenue + (charges?.totalAmount || exam.totalAmount || 0),
          totalPaid: acc.totalPaid + (charges?.paid || exam.paid || 0),
          totalDiscount: acc.totalDiscount + (charges?.discount || exam.discount || 0),
          count: acc.count + 1,
        };
      }
      return acc;
    }, { totalRevenue: 0, totalPaid: 0, totalDiscount: 0, count: 0 });

    // Get pharmacy revenue - using charges.totalAmount from prescriptions
    const prescriptions = await prisma.prescription.findMany({
      where: {
        dispensingStatus: "full",
        createdAt: { gte: startDate, lt: endDate },
      },
    });

    const pharmacyData = prescriptions.reduce((acc, p) => {
      const charges = typeof p.charges === "string" ? JSON.parse(p.charges) : p.charges;
      const total = charges?.totalAmount || 0;
      return {
        totalRevenue: acc.totalRevenue + total,
        count: acc.count + 1,
      };
    }, { totalRevenue: 0, count: 0 });

    // Get admissions revenue
    const admissionPayments = await prisma.payment.findMany({
      where: {
        paymentDate: { gte: startDate, lt: endDate },
        status: "completed",
        department: "admission",
      },
    });

    const admissionsData = admissionPayments.reduce(
      (acc, p) => ({
        totalRevenue: acc.totalRevenue + p.amount,
        totalNetAmount: acc.totalNetAmount + (p.netAmount || 0),
        totalDiscount: acc.totalDiscount + (p.discountAmount || 0),
        count: acc.count + 1,
      }),
      { totalRevenue: 0, totalNetAmount: 0, totalDiscount: 0, count: 0 }
    );

    // Get discharge card revenue
    const dischargeCards = await prisma.dischargeCard.findMany({
      where: {
        createdAt: { gte: startDate, lt: endDate },
        status: { not: "cancelled" },
      },
    });

    const dischargeData = dischargeCards.reduce((acc, card) => {
      const billing = typeof card.billing === "string" ? JSON.parse(card.billing) : card.billing;
      if (billing?.paymentStatus === "paid") {
        return {
          totalRevenue: acc.totalRevenue + (billing?.totalAmount || 0),
          totalPaid: acc.totalPaid + (billing?.paidAmount || 0),
          totalDiscount: acc.totalDiscount + (billing?.discountAmount || 0),
          count: acc.count + 1,
        };
      }
      return acc;
    }, { totalRevenue: 0, totalPaid: 0, totalDiscount: 0, count: 0 });

    // Get revenue by payment method
    const allPayments = await prisma.payment.findMany({
      where: {
        paymentDate: { gte: startDate, lt: endDate },
        status: "completed",
      },
    });

    const paymentMethodMap = allPayments.reduce((acc: any, p) => {
      const method = p.paymentMethod || "unknown";
      if (!acc[method]) {
        acc[method] = { totalRevenue: 0, count: 0 };
      }
      acc[method].totalRevenue += p.amount;
      acc[method].count += 1;
      return acc;
    }, {});

    const revenueByPaymentMethod = Object.entries(paymentMethodMap)
      .map(([method, data]: any) => ({ _id: method, ...data }))
      .sort((a: any, b: any) => b.totalRevenue - a.totalRevenue);

    // Get daily revenue trend for charts
    const dailyRevenueMap: any = {};
    allPayments.forEach((p) => {
      const dateStr = p.paymentDate.toISOString().split("T")[0];
      if (!dailyRevenueMap[dateStr]) {
        dailyRevenueMap[dateStr] = { _id: dateStr, totalRevenue: 0, count: 0 };
      }
      dailyRevenueMap[dateStr].totalRevenue += p.amount;
      dailyRevenueMap[dateStr].count += 1;
    });

    const dailyRevenueTrend = Object.values(dailyRevenueMap).sort((a: any, b: any) =>
      a._id.localeCompare(b._id)
    );

    // Get top services by revenue
    const serviceTypeMap: any = {};
    allPayments.forEach((p) => {
      const type = p.serviceType || "other";
      if (!serviceTypeMap[type]) {
        serviceTypeMap[type] = { _id: type, totalRevenue: 0, count: 0 };
      }
      serviceTypeMap[type].totalRevenue += p.amount;
      serviceTypeMap[type].count += 1;
    });

    const topServices = Object.values(serviceTypeMap)
      .sort((a: any, b: any) => b.totalRevenue - a.totalRevenue)
      .slice(0, 10);

    // Calculate totals
    const totalRevenue =
      consultationData.totalRevenue +
      labData.totalRevenue +
      radiologyData.totalRevenue +
      pharmacyData.totalRevenue +
      admissionsData.totalRevenue +
      dischargeData.totalRevenue;

    const totalDiscounts =
      consultationData.totalDiscount +
      labData.totalDiscount +
      radiologyData.totalDiscount +
      admissionsData.totalDiscount +
      dischargeData.totalDiscount;

    const netRevenue = totalRevenue - totalDiscounts;

    const revenueByDepartment = [
      {
        department: "Consultation",
        totalRevenue: consultationData.totalRevenue,
        netRevenue: consultationData.totalNetAmount,
        discount: consultationData.totalDiscount,
        count: consultationData.count,
        percentage: totalRevenue > 0 ? (consultationData.totalRevenue / totalRevenue) * 100 : 0,
      },
      {
        department: "Laboratory",
        totalRevenue: labData.totalRevenue,
        netRevenue: labData.totalPaid,
        discount: labData.totalDiscount,
        count: labData.count,
        percentage: totalRevenue > 0 ? (labData.totalRevenue / totalRevenue) * 100 : 0,
      },
      {
        department: "Radiology",
        totalRevenue: radiologyData.totalRevenue,
        netRevenue: radiologyData.totalPaid,
        discount: radiologyData.totalDiscount,
        count: radiologyData.count,
        percentage: totalRevenue > 0 ? (radiologyData.totalRevenue / totalRevenue) * 100 : 0,
      },
      {
        department: "Pharmacy",
        totalRevenue: pharmacyData.totalRevenue,
        netRevenue: pharmacyData.totalRevenue,
        discount: 0,
        count: pharmacyData.count,
        percentage: totalRevenue > 0 ? (pharmacyData.totalRevenue / totalRevenue) * 100 : 0,
      },
      {
        department: "Admissions",
        totalRevenue: admissionsData.totalRevenue,
        netRevenue: admissionsData.totalNetAmount,
        discount: admissionsData.totalDiscount,
        count: admissionsData.count,
        percentage: totalRevenue > 0 ? (admissionsData.totalRevenue / totalRevenue) * 100 : 0,
      },
      {
        department: "Discharge/Operations",
        totalRevenue: dischargeData.totalRevenue,
        netRevenue: dischargeData.totalPaid,
        discount: dischargeData.totalDiscount,
        count: dischargeData.count,
        percentage: totalRevenue > 0 ? (dischargeData.totalRevenue / totalRevenue) * 100 : 0,
      },
    ];

    return NextResponse.json({
      success: true,
      data: {
        period,
        dateRange: {
          startDate,
          endDate,
        },
        summary: {
          totalRevenue,
          totalDiscounts,
          netRevenue,
          totalTransactions:
            consultationData.count +
            labData.count +
            radiologyData.count +
            pharmacyData.count +
            admissionsData.count +
            dischargeData.count,
        },
        byDepartment: revenueByDepartment,
        byPaymentMethod: revenueByPaymentMethod,
        dailyTrend: dailyRevenueTrend,
        topServices,
      },
    });
  } catch (error) {
    console.error("Error fetching revenue breakdown:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}