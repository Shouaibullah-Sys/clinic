// app/api/dashboard/admin/revenue-breakdown/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import dbConnect from "@/lib/dbConnect";
import { Payment } from "@/lib/models/Payment";
import { LabTest } from "@/lib/models/LabTest";
import { RadiologyExam } from "@/lib/models/RadiologyExam";
import { DischargeCard } from "@/lib/models/DischargeCard";
import { Prescription } from "@/lib/models/Prescription";
import { Appointment } from "@/lib/models/Appointment";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(req);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "today";

    // Calculate date ranges
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    switch (period) {
      case "today":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() + 1,
        );
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
        endDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() + 1,
        );
    }

    // Get consultation revenue from payments
    const consultationRevenue = await Payment.aggregate([
      {
        $match: {
          paymentDate: { $gte: startDate, $lt: endDate },
          status: "completed",
          department: "consultation",
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$amount" },
          totalNetAmount: { $sum: "$netAmount" },
          totalDiscount: { $sum: { $ifNull: ["$discountAmount", 0] } },
          count: { $sum: 1 },
        },
      },
    ]);

    const consultationData = consultationRevenue[0] || {
      totalRevenue: 0,
      totalNetAmount: 0,
      totalDiscount: 0,
      count: 0,
    };

    // Get laboratory revenue
    const labRevenue = await LabTest.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lt: endDate },
          "charges.paymentStatus": "paid",
          status: { $ne: "cancelled" },
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$charges.totalAmount" },
          totalPaid: { $sum: "$charges.paid" },
          totalDiscount: { $sum: "$charges.discount" },
          count: { $sum: 1 },
        },
      },
    ]);

    const labData = labRevenue[0] || {
      totalRevenue: 0,
      totalPaid: 0,
      totalDiscount: 0,
      count: 0,
    };

    // Get radiology revenue
    const radiologyRevenue = await RadiologyExam.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lt: endDate },
          "charges.paymentStatus": "paid",
          status: { $ne: "cancelled" },
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$charges.totalAmount" },
          totalPaid: { $sum: "$charges.paid" },
          totalDiscount: { $sum: "$charges.discount" },
          count: { $sum: 1 },
        },
      },
    ]);

    const radiologyData = radiologyRevenue[0] || {
      totalRevenue: 0,
      totalPaid: 0,
      totalDiscount: 0,
      count: 0,
    };

    // Get pharmacy revenue
    const pharmacyRevenue = await Prescription.aggregate([
      {
        $match: {
          dispensingStatus: "full",
          dispensedDate: { $gte: startDate, $lt: endDate },
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$totalAmount" },
          count: { $sum: 1 },
        },
      },
    ]);

    const pharmacyData = pharmacyRevenue[0] || {
      totalRevenue: 0,
      count: 0,
    };

    // Get admissions revenue
    const admissionsRevenue = await Payment.aggregate([
      {
        $match: {
          paymentDate: { $gte: startDate, $lt: endDate },
          status: "completed",
          department: "admission",
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$amount" },
          totalNetAmount: { $sum: "$netAmount" },
          totalDiscount: { $sum: { $ifNull: ["$discountAmount", 0] } },
          count: { $sum: 1 },
        },
      },
    ]);

    const admissionsData = admissionsRevenue[0] || {
      totalRevenue: 0,
      totalNetAmount: 0,
      totalDiscount: 0,
      count: 0,
    };

    // Get discharge card revenue
    const dischargeRevenue = await DischargeCard.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lt: endDate },
          "billing.paymentStatus": "paid",
          status: { $ne: "cancelled" },
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$billing.totalAmount" },
          totalPaid: { $sum: "$billing.paidAmount" },
          totalDiscount: { $sum: "$billing.discountAmount" },
          count: { $sum: 1 },
        },
      },
    ]);

    const dischargeData = dischargeRevenue[0] || {
      totalRevenue: 0,
      totalPaid: 0,
      totalDiscount: 0,
      count: 0,
    };

    // Get revenue by payment method
    const revenueByPaymentMethod = await Payment.aggregate([
      {
        $match: {
          paymentDate: { $gte: startDate, $lt: endDate },
          status: "completed",
        },
      },
      {
        $group: {
          _id: "$paymentMethod",
          totalRevenue: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { totalRevenue: -1 },
      },
    ]);

    // Get daily revenue trend for charts
    const dailyRevenueTrend = await Payment.aggregate([
      {
        $match: {
          paymentDate: { $gte: startDate, $lt: endDate },
          status: "completed",
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$paymentDate" },
          },
          totalRevenue: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    // Get top services by revenue
    const topServices = await Payment.aggregate([
      {
        $match: {
          paymentDate: { $gte: startDate, $lt: endDate },
          status: "completed",
        },
      },
      {
        $group: {
          _id: "$serviceType",
          totalRevenue: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { totalRevenue: -1 },
      },
      {
        $limit: 10,
      },
    ]);

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

    // Revenue breakdown by department
    const revenueByDepartment = [
      {
        department: "Consultation",
        totalRevenue: consultationData.totalRevenue,
        netRevenue: consultationData.totalNetAmount,
        discount: consultationData.totalDiscount,
        count: consultationData.count,
        percentage:
          totalRevenue > 0
            ? (consultationData.totalRevenue / totalRevenue) * 100
            : 0,
      },
      {
        department: "Laboratory",
        totalRevenue: labData.totalRevenue,
        netRevenue: labData.totalPaid,
        discount: labData.totalDiscount,
        count: labData.count,
        percentage:
          totalRevenue > 0 ? (labData.totalRevenue / totalRevenue) * 100 : 0,
      },
      {
        department: "Radiology",
        totalRevenue: radiologyData.totalRevenue,
        netRevenue: radiologyData.totalPaid,
        discount: radiologyData.totalDiscount,
        count: radiologyData.count,
        percentage:
          totalRevenue > 0
            ? (radiologyData.totalRevenue / totalRevenue) * 100
            : 0,
      },
      {
        department: "Pharmacy",
        totalRevenue: pharmacyData.totalRevenue,
        netRevenue: pharmacyData.totalRevenue,
        discount: 0,
        count: pharmacyData.count,
        percentage:
          totalRevenue > 0
            ? (pharmacyData.totalRevenue / totalRevenue) * 100
            : 0,
      },
      {
        department: "Admissions",
        totalRevenue: admissionsData.totalRevenue,
        netRevenue: admissionsData.totalNetAmount,
        discount: admissionsData.totalDiscount,
        count: admissionsData.count,
        percentage:
          totalRevenue > 0
            ? (admissionsData.totalRevenue / totalRevenue) * 100
            : 0,
      },
      {
        department: "Discharge/Operations",
        totalRevenue: dischargeData.totalRevenue,
        netRevenue: dischargeData.totalPaid,
        discount: dischargeData.totalDiscount,
        count: dischargeData.count,
        percentage:
          totalRevenue > 0
            ? (dischargeData.totalRevenue / totalRevenue) * 100
            : 0,
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
      { status: 500 },
    );
  }
}
