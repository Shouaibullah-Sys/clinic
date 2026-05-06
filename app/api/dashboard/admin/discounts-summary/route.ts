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

    // Get discount requests by status
    const discountRequests = await prisma.discountRequest.findMany({
      where: { createdAt: { gte: startDate, lt: endDate } },
    });

    const discountsByStatusMap = new Map<string, { count: number; totalRequestedAmount: number; totalApprovedAmount: number }>();
    discountRequests.forEach((d) => {
      const existing = discountsByStatusMap.get(d.status) || { count: 0, totalRequestedAmount: 0, totalApprovedAmount: 0 };
      existing.count += 1;
      existing.totalRequestedAmount += d.amount || 0;
      existing.totalApprovedAmount += d.approvedAmount || 0;
      discountsByStatusMap.set(d.status, existing);
    });

    const discountsByStatus = Array.from(discountsByStatusMap.entries()).map(([status, data]) => ({
      _id: status,
      count: data.count,
      totalRequestedAmount: data.totalRequestedAmount,
      totalApprovedAmount: data.totalApprovedAmount,
    }));

    // Get discounts from payments
    const payments = await prisma.payment.findMany({
      where: {
        paymentDate: { gte: startDate, lt: endDate },
        status: "completed",
        discountAmount: { gt: 0 },
      },
    });

    const totalDiscountsFromPayments = payments.reduce((sum, p) => sum + (p.discountAmount || 0), 0);
    const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);

    // Get discounts from lab tests
    const labTests = await prisma.labTest.findMany({
      where: {
        createdAt: { gte: startDate, lt: endDate },
      },
    });

    const totalDiscountsFromLab = labTests.reduce((sum, t) => {
      const charges = typeof t.charges === "string" ? JSON.parse(t.charges) : t.charges;
      return sum + (charges?.discount || 0);
    }, 0);

    // Get discounts from radiology exams
    const radiologyExams = await prisma.radiologyExam.findMany({
      where: {
        createdAt: { gte: startDate, lt: endDate },
      },
    });

    const totalDiscountsFromRadiology = radiologyExams.reduce((sum, e) => {
      const charges = typeof e.charges === "string" ? JSON.parse(e.charges) : e.charges;
      return sum + (charges?.discount || 0);
    }, 0);

    // Get discounts from discharge cards
    const dischargeCards = await prisma.dischargeCard.findMany({
      where: {
        createdAt: { gte: startDate, lt: endDate },
      },
    });

    const totalDiscountsFromDischarge = dischargeCards.reduce((sum, dc) => {
      const billing = typeof dc.billing === "string" ? JSON.parse(dc.billing) : dc.billing;
      return sum + (billing?.discountAmount || 0);
    }, 0);

    // Calculate totals
    const totalApprovedDiscounts = discountsByStatus.find((d) => d._id === "approved")?.totalApprovedAmount || 0;
    const totalPendingDiscounts = discountsByStatus.find((d) => d._id === "pending")?.totalRequestedAmount || 0;
    const totalRejectedDiscounts = discountsByStatus.find((d) => d._id === "rejected")?.totalRequestedAmount || 0;

    const totalAllDiscounts = totalApprovedDiscounts + totalDiscountsFromPayments + totalDiscountsFromLab + totalDiscountsFromRadiology + totalDiscountsFromDischarge;
    const discountPercentage = totalRevenue > 0 ? (totalAllDiscounts / totalRevenue) * 100 : 0;

    // Get pending and recent approved discounts
    const pendingDiscounts = await prisma.discountRequest.findMany({
      where: { status: "pending" },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    const recentApprovedDiscounts = await prisma.discountRequest.findMany({
      where: { status: "approved", approvedAt: { gte: startDate, lt: endDate } },
      orderBy: { approvedAt: "desc" },
      take: 20,
    });

    return NextResponse.json({
      success: true,
      data: {
        period,
        dateRange: { startDate, endDate },
        summary: {
          totalApprovedDiscounts,
          totalPendingDiscounts,
          totalRejectedDiscounts,
          totalAllDiscounts,
          totalRevenue,
          discountPercentage,
        },
        byStatus: discountsByStatus,
        bySource: {
          discountRequests: totalApprovedDiscounts,
          payments: totalDiscountsFromPayments,
          labTests: totalDiscountsFromLab,
          radiologyExams: totalDiscountsFromRadiology,
          dischargeCards: totalDiscountsFromDischarge,
        },
        pendingDiscounts: pendingDiscounts.map((d) => ({
          id: d.id,
          discountId: d.requestId,
          requestedAmount: d.amount || 0,
          discountPercentage: d.discountPercentage,
          reason: d.reason,
          requestCategory: d.requestCategory,
          status: d.status,
          requestedAt: d.requestedAt,
        })),
        recentApprovedDiscounts: recentApprovedDiscounts.map((d) => ({
          id: d.id,
          discountId: d.requestId,
          requestedAmount: d.amount || 0,
          approvedAmount: d.approvedAmount || 0,
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
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}