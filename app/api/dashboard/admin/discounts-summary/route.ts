// app/api/dashboard/admin/discounts-summary/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import dbConnect from "@/lib/dbConnect";
import { DiscountRequest } from "@/lib/models/DiscountRequest";
import { Payment } from "@/lib/models/Payment";
import { LabTest } from "@/lib/models/LabTest";
import { RadiologyExam } from "@/lib/models/RadiologyExam";
import { DischargeCard } from "@/lib/models/DischargeCard";

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

    // Get discount requests by status
    const discountsByStatus = await DiscountRequest.aggregate([
      {
        $match: {
          requestedAt: { $gte: startDate, $lt: endDate },
        },
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalRequestedAmount: { $sum: "$requestedAmount" },
          totalApprovedAmount: { $sum: { $ifNull: ["$approvedAmount", 0] } },
        },
      },
    ]);

    // Get discounts by category
    const discountsByCategory = await DiscountRequest.aggregate([
      {
        $match: {
          requestedAt: { $gte: startDate, $lt: endDate },
          status: "approved",
        },
      },
      {
        $group: {
          _id: "$requestCategory",
          count: { $sum: 1 },
          totalAmount: { $sum: "$approvedAmount" },
        },
      },
      {
        $sort: { totalAmount: -1 },
      },
    ]);

    // Get discounts by approver
    const discountsByApprover = await DiscountRequest.aggregate([
      {
        $match: {
          requestedAt: { $gte: startDate, $lt: endDate },
          status: "approved",
          approvedBy: { $exists: true },
        },
      },
      {
        $group: {
          _id: "$approvedBy",
          approverName: { $first: "$reviewedByName" },
          count: { $sum: 1 },
          totalAmount: { $sum: "$approvedAmount" },
        },
      },
      {
        $sort: { totalAmount: -1 },
      },
      {
        $limit: 10,
      },
    ]);

    // Get pending discount requests
    const pendingDiscounts = await DiscountRequest.find({
      status: "pending",
    })
      .sort({ requestedAt: -1 })
      .limit(20)
      .populate("patient", "name patientId phone")
      .populate("requestedBy", "name role")
      .lean();

    // Get recent approved discounts
    const recentApprovedDiscounts = await DiscountRequest.find({
      status: "approved",
      approvedAt: { $gte: startDate, $lt: endDate },
    })
      .sort({ approvedAt: -1 })
      .limit(20)
      .populate("patient", "name patientId phone")
      .populate("requestedBy", "name role")
      .populate("approvedBy", "name role")
      .lean();

    // Get daily discount trend
    const dailyDiscountTrend = await DiscountRequest.aggregate([
      {
        $match: {
          approvedAt: { $gte: startDate, $lt: endDate },
          status: "approved",
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$approvedAt" },
          },
          totalAmount: { $sum: "$approvedAmount" },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    // Get discounts from payments
    const paymentDiscounts = await Payment.aggregate([
      {
        $match: {
          paymentDate: { $gte: startDate, $lt: endDate },
          status: "completed",
          discountAmount: { $gt: 0 },
        },
      },
      {
        $group: {
          _id: null,
          totalDiscountAmount: { $sum: "$discountAmount" },
          count: { $sum: 1 },
        },
      },
    ]);

    // Get discounts from lab tests
    const labDiscounts = await LabTest.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lt: endDate },
          "charges.discount": { $gt: 0 },
        },
      },
      {
        $group: {
          _id: null,
          totalDiscountAmount: { $sum: "$charges.discount" },
          count: { $sum: 1 },
        },
      },
    ]);

    // Get discounts from radiology exams
    const radiologyDiscounts = await RadiologyExam.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lt: endDate },
          "charges.discount": { $gt: 0 },
        },
      },
      {
        $group: {
          _id: null,
          totalDiscountAmount: { $sum: "$charges.discount" },
          count: { $sum: 1 },
        },
      },
    ]);

    // Get discounts from discharge cards
    const dischargeDiscounts = await DischargeCard.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lt: endDate },
          "billing.discountAmount": { $gt: 0 },
        },
      },
      {
        $group: {
          _id: null,
          totalDiscountAmount: { $sum: "$billing.discountAmount" },
          count: { $sum: 1 },
        },
      },
    ]);

    // Calculate totals
    const totalApprovedDiscounts =
      discountsByStatus.find((d: any) => d._id === "approved")
        ?.totalApprovedAmount || 0;
    const totalPendingDiscounts =
      discountsByStatus.find((d: any) => d._id === "pending")
        ?.totalRequestedAmount || 0;
    const totalRejectedDiscounts =
      discountsByStatus.find((d: any) => d._id === "rejected")
        ?.totalRequestedAmount || 0;

    const totalDiscountsFromPayments =
      paymentDiscounts[0]?.totalDiscountAmount || 0;
    const totalDiscountsFromLab = labDiscounts[0]?.totalDiscountAmount || 0;
    const totalDiscountsFromRadiology =
      radiologyDiscounts[0]?.totalDiscountAmount || 0;
    const totalDiscountsFromDischarge =
      dischargeDiscounts[0]?.totalDiscountAmount || 0;

    const totalAllDiscounts =
      totalApprovedDiscounts +
      totalDiscountsFromPayments +
      totalDiscountsFromLab +
      totalDiscountsFromRadiology +
      totalDiscountsFromDischarge;

    // Get discount percentage of revenue
    const totalRevenue = await Payment.aggregate([
      {
        $match: {
          paymentDate: { $gte: startDate, $lt: endDate },
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

    const revenue = totalRevenue[0]?.totalRevenue || 0;
    const discountPercentage =
      revenue > 0 ? (totalAllDiscounts / revenue) * 100 : 0;

    return NextResponse.json({
      success: true,
      data: {
        period,
        dateRange: {
          startDate,
          endDate,
        },
        summary: {
          totalApprovedDiscounts,
          totalPendingDiscounts,
          totalRejectedDiscounts,
          totalAllDiscounts,
          totalRevenue: revenue,
          discountPercentage,
        },
        byStatus: discountsByStatus,
        byCategory: discountsByCategory,
        byApprover: discountsByApprover,
        bySource: {
          discountRequests: totalApprovedDiscounts,
          payments: totalDiscountsFromPayments,
          labTests: totalDiscountsFromLab,
          radiologyExams: totalDiscountsFromRadiology,
          dischargeCards: totalDiscountsFromDischarge,
        },
        dailyTrend: dailyDiscountTrend,
        pendingDiscounts: pendingDiscounts.map((d: any) => ({
          id: d._id.toString(),
          discountId: d.discountId,
          patient: d.patient,
          patientName: d.patient?.name,
          requestedBy: d.requestedBy,
          requestedByName: d.requestedBy?.name,
          requestedAmount: d.requestedAmount,
          discountPercentage: d.discountPercentage,
          reason: d.reason,
          requestCategory: d.requestCategory,
          status: d.status,
          requestedAt: d.requestedAt,
          expiryDate: d.expiryDate,
        })),
        recentApprovedDiscounts: recentApprovedDiscounts.map((d: any) => ({
          id: d._id.toString(),
          discountId: d.discountId,
          patient: d.patient,
          patientName: d.patient?.name,
          requestedBy: d.requestedBy,
          requestedByName: d.requestedBy?.name,
          approvedBy: d.approvedBy,
          approvedByName: d.approvedBy?.name,
          requestedAmount: d.requestedAmount,
          approvedAmount: d.approvedAmount,
          discountPercentage: d.discountPercentage,
          reason: d.reason,
          requestCategory: d.requestCategory,
          status: d.status,
          requestedAt: d.requestedAt,
          approvedAt: d.approvedAt,
          reviewNotes: d.reviewNotes,
        })),
      },
    });
  } catch (error) {
    console.error("Error fetching discounts summary:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
