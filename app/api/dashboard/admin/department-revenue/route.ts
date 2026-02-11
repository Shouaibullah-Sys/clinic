// app/api/dashboard/admin/department-revenue/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import dbConnect from "@/lib/dbConnect";
import { Payment } from "@/lib/models/Payment";
import { LabTest } from "@/lib/models/LabTest";
import { RadiologyExam } from "@/lib/models/RadiologyExam";
import { DischargeCard } from "@/lib/models/DischargeCard";
import { Prescription } from "@/lib/models/Prescription";
import { Appointment } from "@/lib/models/Appointment";
import { User } from "@/lib/models/User";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(req);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(req.url);
    const department = searchParams.get("department") || "consultation";
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

    let departmentData: any = {
      department,
      period,
      dateRange: { startDate, endDate },
      summary: {
        totalRevenue: 0,
        totalDiscounts: 0,
        netRevenue: 0,
        totalTransactions: 0,
        averageTransactionValue: 0,
      },
      dailyTrend: [],
      topServices: [],
      topStaff: [],
      paymentMethods: [],
    };

    switch (department) {
      case "consultation":
        // Get consultation revenue
        const consultationPayments = await Payment.aggregate([
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
              totalDiscounts: { $sum: { $ifNull: ["$discountAmount", 0] } },
              count: { $sum: 1 },
            },
          },
        ]);

        const consultationData = consultationPayments[0] || {
          totalRevenue: 0,
          totalDiscounts: 0,
          count: 0,
        };

        departmentData.summary = {
          totalRevenue: consultationData.totalRevenue,
          totalDiscounts: consultationData.totalDiscounts,
          netRevenue:
            consultationData.totalRevenue - consultationData.totalDiscounts,
          totalTransactions: consultationData.count,
          averageTransactionValue:
            consultationData.count > 0
              ? consultationData.totalRevenue / consultationData.count
              : 0,
        };

        // Get daily trend
        departmentData.dailyTrend = await Payment.aggregate([
          {
            $match: {
              paymentDate: { $gte: startDate, $lt: endDate },
              status: "completed",
              department: "consultation",
            },
          },
          {
            $group: {
              _id: {
                $dateToString: { format: "%Y-%m-%d", date: "$paymentDate" },
              },
              revenue: { $sum: "$amount" },
              discounts: { $sum: { $ifNull: ["$discountAmount", 0] } },
              count: { $sum: 1 },
            },
          },
          {
            $sort: { _id: 1 },
          },
        ]);

        // Get top doctors by revenue
        departmentData.topStaff = await Payment.aggregate([
          {
            $match: {
              paymentDate: { $gte: startDate, $lt: endDate },
              status: "completed",
              department: "consultation",
            },
          },
          {
            $lookup: {
              from: "appointments",
              localField: "appointment",
              foreignField: "_id",
              as: "appointment",
            },
          },
          {
            $unwind: {
              path: "$appointment",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $group: {
              _id: "$appointment.doctor",
              totalRevenue: { $sum: "$amount" },
              count: { $sum: 1 },
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "_id",
              foreignField: "_id",
              as: "doctor",
            },
          },
          {
            $unwind: "$doctor",
          },
          {
            $project: {
              staffId: "$_id",
              staffName: "$doctor.name",
              specialization: "$doctor.specialization",
              totalRevenue: 1,
              count: 1,
            },
          },
          {
            $sort: { totalRevenue: -1 },
          },
          {
            $limit: 10,
          },
        ]);

        // Get payment methods
        departmentData.paymentMethods = await Payment.aggregate([
          {
            $match: {
              paymentDate: { $gte: startDate, $lt: endDate },
              status: "completed",
              department: "consultation",
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

        break;

      case "laboratory":
        // Get lab revenue
        const labPayments = await LabTest.aggregate([
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
              totalDiscounts: { $sum: "$charges.discount" },
              count: { $sum: 1 },
            },
          },
        ]);

        const labData = labPayments[0] || {
          totalRevenue: 0,
          totalDiscounts: 0,
          count: 0,
        };

        departmentData.summary = {
          totalRevenue: labData.totalRevenue,
          totalDiscounts: labData.totalDiscounts,
          netRevenue: labData.totalRevenue - labData.totalDiscounts,
          totalTransactions: labData.count,
          averageTransactionValue:
            labData.count > 0 ? labData.totalRevenue / labData.count : 0,
        };

        // Get daily trend
        departmentData.dailyTrend = await LabTest.aggregate([
          {
            $match: {
              createdAt: { $gte: startDate, $lt: endDate },
              "charges.paymentStatus": "paid",
              status: { $ne: "cancelled" },
            },
          },
          {
            $group: {
              _id: {
                $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
              },
              revenue: { $sum: "$charges.totalAmount" },
              discounts: { $sum: "$charges.discount" },
              count: { $sum: 1 },
            },
          },
          {
            $sort: { _id: 1 },
          },
        ]);

        // Get top tests by revenue
        departmentData.topServices = await LabTest.aggregate([
          {
            $match: {
              createdAt: { $gte: startDate, $lt: endDate },
              "charges.paymentStatus": "paid",
              status: { $ne: "cancelled" },
            },
          },
          {
            $group: {
              _id: "$testName",
              totalRevenue: { $sum: "$charges.totalAmount" },
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

        break;

      case "radiology":
        // Get radiology revenue
        const radiologyPayments = await RadiologyExam.aggregate([
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
              totalDiscounts: { $sum: "$charges.discount" },
              count: { $sum: 1 },
            },
          },
        ]);

        const radiologyData = radiologyPayments[0] || {
          totalRevenue: 0,
          totalDiscounts: 0,
          count: 0,
        };

        departmentData.summary = {
          totalRevenue: radiologyData.totalRevenue,
          totalDiscounts: radiologyData.totalDiscounts,
          netRevenue: radiologyData.totalRevenue - radiologyData.totalDiscounts,
          totalTransactions: radiologyData.count,
          averageTransactionValue:
            radiologyData.count > 0
              ? radiologyData.totalRevenue / radiologyData.count
              : 0,
        };

        // Get daily trend
        departmentData.dailyTrend = await RadiologyExam.aggregate([
          {
            $match: {
              createdAt: { $gte: startDate, $lt: endDate },
              "charges.paymentStatus": "paid",
              status: { $ne: "cancelled" },
            },
          },
          {
            $group: {
              _id: {
                $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
              },
              revenue: { $sum: "$charges.totalAmount" },
              discounts: { $sum: "$charges.discount" },
              count: { $sum: 1 },
            },
          },
          {
            $sort: { _id: 1 },
          },
        ]);

        // Get top exams by revenue
        departmentData.topServices = await RadiologyExam.aggregate([
          {
            $match: {
              createdAt: { $gte: startDate, $lt: endDate },
              "charges.paymentStatus": "paid",
              status: { $ne: "cancelled" },
            },
          },
          {
            $group: {
              _id: "$examName",
              totalRevenue: { $sum: "$charges.totalAmount" },
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

        break;

      case "pharmacy":
        // Get pharmacy revenue
        const pharmacyPayments = await Prescription.aggregate([
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

        const pharmacyData = pharmacyPayments[0] || {
          totalRevenue: 0,
          count: 0,
        };

        departmentData.summary = {
          totalRevenue: pharmacyData.totalRevenue,
          totalDiscounts: 0,
          netRevenue: pharmacyData.totalRevenue,
          totalTransactions: pharmacyData.count,
          averageTransactionValue:
            pharmacyData.count > 0
              ? pharmacyData.totalRevenue / pharmacyData.count
              : 0,
        };

        // Get daily trend
        departmentData.dailyTrend = await Prescription.aggregate([
          {
            $match: {
              dispensingStatus: "full",
              dispensedDate: { $gte: startDate, $lt: endDate },
            },
          },
          {
            $group: {
              _id: {
                $dateToString: { format: "%Y-%m-%d", date: "$dispensedDate" },
              },
              revenue: { $sum: "$totalAmount" },
              count: { $sum: 1 },
            },
          },
          {
            $sort: { _id: 1 },
          },
        ]);

        // Get top medicines by revenue
        departmentData.topServices = await Prescription.aggregate([
          {
            $match: {
              dispensingStatus: "full",
              dispensedDate: { $gte: startDate, $lt: endDate },
            },
          },
          {
            $unwind: "$medications",
          },
          {
            $group: {
              _id: "$medications.name",
              totalRevenue: {
                $sum: {
                  $multiply: ["$medications.quantity", "$medications.price"],
                },
              },
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

        break;

      case "admissions":
        // Get admissions revenue
        const admissionsPayments = await Payment.aggregate([
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
              totalDiscounts: { $sum: { $ifNull: ["$discountAmount", 0] } },
              count: { $sum: 1 },
            },
          },
        ]);

        const admissionsData = admissionsPayments[0] || {
          totalRevenue: 0,
          totalDiscounts: 0,
          count: 0,
        };

        departmentData.summary = {
          totalRevenue: admissionsData.totalRevenue,
          totalDiscounts: admissionsData.totalDiscounts,
          netRevenue:
            admissionsData.totalRevenue - admissionsData.totalDiscounts,
          totalTransactions: admissionsData.count,
          averageTransactionValue:
            admissionsData.count > 0
              ? admissionsData.totalRevenue / admissionsData.count
              : 0,
        };

        // Get daily trend
        departmentData.dailyTrend = await Payment.aggregate([
          {
            $match: {
              paymentDate: { $gte: startDate, $lt: endDate },
              status: "completed",
              department: "admission",
            },
          },
          {
            $group: {
              _id: {
                $dateToString: { format: "%Y-%m-%d", date: "$paymentDate" },
              },
              revenue: { $sum: "$amount" },
              discounts: { $sum: { $ifNull: ["$discountAmount", 0] } },
              count: { $sum: 1 },
            },
          },
          {
            $sort: { _id: 1 },
          },
        ]);

        break;

      case "discharge":
        // Get discharge card revenue
        const dischargePayments = await DischargeCard.aggregate([
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
              totalDiscounts: { $sum: "$billing.discountAmount" },
              count: { $sum: 1 },
            },
          },
        ]);

        const dischargeData = dischargePayments[0] || {
          totalRevenue: 0,
          totalDiscounts: 0,
          count: 0,
        };

        departmentData.summary = {
          totalRevenue: dischargeData.totalRevenue,
          totalDiscounts: dischargeData.totalDiscounts,
          netRevenue: dischargeData.totalRevenue - dischargeData.totalDiscounts,
          totalTransactions: dischargeData.count,
          averageTransactionValue:
            dischargeData.count > 0
              ? dischargeData.totalRevenue / dischargeData.count
              : 0,
        };

        // Get daily trend
        departmentData.dailyTrend = await DischargeCard.aggregate([
          {
            $match: {
              createdAt: { $gte: startDate, $lt: endDate },
              "billing.paymentStatus": "paid",
              status: { $ne: "cancelled" },
            },
          },
          {
            $group: {
              _id: {
                $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
              },
              revenue: { $sum: "$billing.totalAmount" },
              discounts: { $sum: "$billing.discountAmount" },
              count: { $sum: 1 },
            },
          },
          {
            $sort: { _id: 1 },
          },
        ]);

        // Get top operations by revenue
        departmentData.topServices = await DischargeCard.aggregate([
          {
            $match: {
              createdAt: { $gte: startDate, $lt: endDate },
              "billing.paymentStatus": "paid",
              status: { $ne: "cancelled" },
            },
          },
          {
            $group: {
              _id: "$operationName",
              totalRevenue: { $sum: "$billing.totalAmount" },
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

        // Get top doctors by revenue
        departmentData.topStaff = await DischargeCard.aggregate([
          {
            $match: {
              createdAt: { $gte: startDate, $lt: endDate },
              "billing.paymentStatus": "paid",
              status: { $ne: "cancelled" },
            },
          },
          {
            $group: {
              _id: "$doctor",
              totalRevenue: { $sum: "$billing.totalAmount" },
              count: { $sum: 1 },
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "_id",
              foreignField: "_id",
              as: "doctor",
            },
          },
          {
            $unwind: "$doctor",
          },
          {
            $project: {
              staffId: "$_id",
              staffName: "$doctor.name",
              specialization: "$doctor.specialization",
              totalRevenue: 1,
              count: 1,
            },
          },
          {
            $sort: { totalRevenue: -1 },
          },
          {
            $limit: 10,
          },
        ]);

        break;

      default:
        return NextResponse.json(
          { error: "Invalid department" },
          { status: 400 },
        );
    }

    return NextResponse.json({
      success: true,
      data: departmentData,
    });
  } catch (error) {
    console.error("Error fetching department revenue:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
