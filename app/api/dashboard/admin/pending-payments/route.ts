// app/api/dashboard/admin/pending-payments/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import dbConnect from "@/lib/dbConnect";
import { Invoice } from "@/lib/models/Invoice";
import { Billing } from "@/lib/models/Billing";
import { LabTest } from "@/lib/models/LabTest";
import { RadiologyExam } from "@/lib/models/RadiologyExam";
import { DischargeCard } from "@/lib/models/DischargeCard";
import { Patient } from "@/lib/models/Patient";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(req);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "all"; // all, pending, overdue
    const limit = parseInt(searchParams.get("limit") || "50");
    const page = parseInt(searchParams.get("page") || "1");

    const skip = (page - 1) * limit;

    // Build query for pending payments
    const invoiceQuery: any = {
      status: { $in: ["pending", "partially_paid"] },
      balance: { $gt: 0 },
    };

    if (status === "overdue") {
      invoiceQuery.dueDate = { $lt: new Date() };
    }

    // Get pending invoices
    const pendingInvoices = await Invoice.find(invoiceQuery)
      .populate("patient", "name patientId phone email")
      .populate("createdBy", "name")
      .sort({ dueDate: 1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const totalInvoices = await Invoice.countDocuments(invoiceQuery);

    // Get pending billings
    const pendingBillings = await Billing.find({
      paymentStatus: { $in: ["pending", "partial"] },
      balance: { $gt: 0 },
    })
      .populate("patient", "name patientId phone email")
      .populate("createdBy", "name")
      .sort({ dueDate: 1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const totalBillings = await Billing.countDocuments({
      paymentStatus: { $in: ["pending", "partial"] },
      balance: { $gt: 0 },
    });

    // Get pending lab tests
    const pendingLabTests = await LabTest.find({
      "charges.paymentStatus": { $in: ["pending", "partial"] },
      status: { $ne: "cancelled" },
    })
      .populate("patient", "name patientId phone email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const totalLabTests = await LabTest.countDocuments({
      "charges.paymentStatus": { $in: ["pending", "partial"] },
      status: { $ne: "cancelled" },
    });

    // Get pending radiology exams
    const pendingRadiologyExams = await RadiologyExam.find({
      "charges.paymentStatus": { $in: ["pending", "partial"] },
      status: { $ne: "cancelled" },
    })
      .populate("patient", "name patientId phone email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const totalRadiologyExams = await RadiologyExam.countDocuments({
      "charges.paymentStatus": { $in: ["pending", "partial"] },
      status: { $ne: "cancelled" },
    });

    // Get pending discharge cards
    const pendingDischargeCards = await DischargeCard.find({
      "billing.paymentStatus": { $in: ["pending", "partial"] },
      status: { $ne: "cancelled" },
    })
      .populate("patient", "name patientId phone email")
      .populate("doctor", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const totalDischargeCards = await DischargeCard.countDocuments({
      "billing.paymentStatus": { $in: ["pending", "partial"] },
      status: { $ne: "cancelled" },
    });

    // Calculate totals
    const totalPendingAmount =
      pendingInvoices.reduce(
        (sum: number, inv: any) => sum + (inv.balance || 0),
        0,
      ) +
      pendingBillings.reduce(
        (sum: number, bill: any) => sum + (bill.balance || 0),
        0,
      ) +
      pendingLabTests.reduce(
        (sum: number, lab: any) =>
          sum + ((lab.charges?.totalAmount || 0) - (lab.charges?.paid || 0)),
        0,
      ) +
      pendingRadiologyExams.reduce(
        (sum: number, rad: any) =>
          sum + ((rad.charges?.totalAmount || 0) - (rad.charges?.paid || 0)),
        0,
      ) +
      pendingDischargeCards.reduce(
        (sum: number, dc: any) => sum + (dc.billing?.balance || 0),
        0,
      );

    // Calculate overdue amount
    const overdueInvoices = await Invoice.find({
      status: { $in: ["pending", "partially_paid"] },
      balance: { $gt: 0 },
      dueDate: { $lt: new Date() },
    });

    const overdueBillings = await Billing.find({
      paymentStatus: { $in: ["pending", "partial"] },
      balance: { $gt: 0 },
      dueDate: { $lt: new Date() },
    });

    const totalOverdueAmount =
      overdueInvoices.reduce(
        (sum: number, inv: any) => sum + (inv.balance || 0),
        0,
      ) +
      overdueBillings.reduce(
        (sum: number, bill: any) => sum + (bill.balance || 0),
        0,
      );

    // Get payment aging buckets
    const now = new Date();
    const agingBuckets = {
      current: 0, // 0-30 days
      days31to60: 0, // 31-60 days
      days61to90: 0, // 61-90 days
      over90: 0, // Over 90 days
    };

    pendingInvoices.forEach((inv: any) => {
      const daysOverdue = Math.floor(
        (now.getTime() - new Date(inv.dueDate).getTime()) /
          (1000 * 60 * 60 * 24),
      );
      if (daysOverdue <= 30) {
        agingBuckets.current += inv.balance || 0;
      } else if (daysOverdue <= 60) {
        agingBuckets.days31to60 += inv.balance || 0;
      } else if (daysOverdue <= 90) {
        agingBuckets.days61to90 += inv.balance || 0;
      } else {
        agingBuckets.over90 += inv.balance || 0;
      }
    });

    pendingBillings.forEach((bill: any) => {
      const daysOverdue = Math.floor(
        (now.getTime() - new Date(bill.dueDate).getTime()) /
          (1000 * 60 * 60 * 24),
      );
      if (daysOverdue <= 30) {
        agingBuckets.current += bill.balance || 0;
      } else if (daysOverdue <= 60) {
        agingBuckets.days31to60 += bill.balance || 0;
      } else if (daysOverdue <= 90) {
        agingBuckets.days61to90 += bill.balance || 0;
      } else {
        agingBuckets.over90 += bill.balance || 0;
      }
    });

    // Get top patients with pending payments
    const topPendingPatients = await Patient.aggregate([
      {
        $lookup: {
          from: "invoices",
          localField: "_id",
          foreignField: "patient",
          as: "invoices",
        },
      },
      {
        $lookup: {
          from: "billings",
          localField: "_id",
          foreignField: "patient",
          as: "billings",
        },
      },
      {
        $project: {
          name: 1,
          patientId: 1,
          phone: 1,
          email: 1,
          totalPending: {
            $add: [
              { $sum: "$invoices.balance" },
              { $sum: "$billings.balance" },
            ],
          },
        },
      },
      {
        $match: {
          totalPending: { $gt: 0 },
        },
      },
      {
        $sort: { totalPending: -1 },
      },
      {
        $limit: 10,
      },
    ]);

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalPendingAmount,
          totalOverdueAmount,
          totalPendingInvoices: totalInvoices,
          totalPendingBillings: totalBillings,
          totalPendingLabTests: totalLabTests,
          totalPendingRadiologyExams: totalRadiologyExams,
          totalPendingDischargeCards: totalDischargeCards,
          agingBuckets,
        },
        invoices: pendingInvoices.map((inv: any) => ({
          id: inv._id.toString(),
          invoiceId: inv.invoiceId,
          patient: inv.patient,
          patientName: inv.patient?.name,
          patientId: inv.patient?.patientId,
          totalAmount: inv.totalAmount,
          paidAmount: inv.paidAmount,
          balance: inv.balance,
          status: inv.status,
          dueDate: inv.dueDate,
          issueDate: inv.issueDate,
          createdBy: inv.createdBy,
          createdAt: inv.createdAt,
        })),
        billings: pendingBillings.map((bill: any) => ({
          id: bill._id.toString(),
          invoiceId: bill.invoiceId,
          patient: bill.patient,
          patientName: bill.patient?.name,
          patientId: bill.patient?.patientId,
          totalAmount: bill.totalAmount,
          paidAmount: bill.paidAmount,
          balance: bill.balance,
          paymentStatus: bill.paymentStatus,
          dueDate: bill.dueDate,
          billingDate: bill.billingDate,
          createdBy: bill.createdBy,
          createdAt: bill.createdAt,
        })),
        labTests: pendingLabTests.map((lab: any) => ({
          id: lab._id.toString(),
          testId: lab.testId,
          patient: lab.patient,
          patientName: lab.patient?.name,
          patientId: lab.patient?.patientId,
          testName: lab.testName,
          totalAmount: lab.charges?.totalAmount || 0,
          paidAmount: lab.charges?.paid || 0,
          balance: (lab.charges?.totalAmount || 0) - (lab.charges?.paid || 0),
          paymentStatus: lab.charges?.paymentStatus,
          createdAt: lab.createdAt,
        })),
        radiologyExams: pendingRadiologyExams.map((rad: any) => ({
          id: rad._id.toString(),
          examId: rad.examId,
          patient: rad.patient,
          patientName: rad.patient?.name,
          patientId: rad.patient?.patientId,
          examName: rad.examName,
          totalAmount: rad.charges?.totalAmount || 0,
          paidAmount: rad.charges?.paid || 0,
          balance: (rad.charges?.totalAmount || 0) - (rad.charges?.paid || 0),
          paymentStatus: rad.charges?.paymentStatus,
          createdAt: rad.createdAt,
        })),
        dischargeCards: pendingDischargeCards.map((dc: any) => ({
          id: dc._id.toString(),
          dischargeId: dc.dischargeId,
          patient: dc.patient,
          patientName: dc.patient?.name,
          patientId: dc.patient?.patientId,
          doctor: dc.doctor,
          doctorName: dc.doctor?.name,
          operationName: dc.operationName,
          totalAmount: dc.billing?.totalAmount || 0,
          paidAmount: dc.billing?.paidAmount || 0,
          balance: dc.billing?.balance || 0,
          paymentStatus: dc.billing?.paymentStatus,
          dischargeDate: dc.dischargeDate,
          createdAt: dc.createdAt,
        })),
        topPendingPatients,
        pagination: {
          page,
          limit,
          total:
            totalInvoices +
            totalBillings +
            totalLabTests +
            totalRadiologyExams +
            totalDischargeCards,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching pending payments:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
