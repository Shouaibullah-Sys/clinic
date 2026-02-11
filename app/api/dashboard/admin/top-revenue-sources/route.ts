// app/api/dashboard/admin/top-revenue-sources/route.ts
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
import { Patient } from "@/lib/models/Patient";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(req);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "service"; // service, doctor, patient
    const limit = parseInt(searchParams.get("limit") || "10");
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

    let result: any = {
      type,
      period,
      dateRange: { startDate, endDate },
      data: [],
    };

    switch (type) {
      case "service":
        // Get top services by revenue
        const topServices = await Payment.aggregate([
          {
            $match: {
              paymentDate: { $gte: startDate, $lt: endDate },
              status: "completed",
              serviceType: { $exists: true, $ne: null },
            },
          },
          {
            $group: {
              _id: "$serviceType",
              totalRevenue: { $sum: "$amount" },
              totalDiscounts: { $sum: { $ifNull: ["$discountAmount", 0] } },
              count: { $sum: 1 },
            },
          },
          {
            $sort: { totalRevenue: -1 },
          },
          {
            $limit: limit,
          },
        ]);

        // Get top lab tests
        const topLabTests = await LabTest.aggregate([
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
              totalDiscounts: { $sum: "$charges.discount" },
              count: { $sum: 1 },
            },
          },
          {
            $sort: { totalRevenue: -1 },
          },
          {
            $limit: limit,
          },
        ]);

        // Get top radiology exams
        const topRadiologyExams = await RadiologyExam.aggregate([
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
              totalDiscounts: { $sum: "$charges.discount" },
              count: { $sum: 1 },
            },
          },
          {
            $sort: { totalRevenue: -1 },
          },
          {
            $limit: limit,
          },
        ]);

        // Get top operations
        const topOperations = await DischargeCard.aggregate([
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
              totalDiscounts: { $sum: "$billing.discountAmount" },
              count: { $sum: 1 },
            },
          },
          {
            $sort: { totalRevenue: -1 },
          },
          {
            $limit: limit,
          },
        ]);

        // Get top medicines
        const topMedicines = await Prescription.aggregate([
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
            $limit: limit,
          },
        ]);

        result.data = {
          services: topServices.map((s: any) => ({
            name: s._id,
            totalRevenue: s.totalRevenue,
            totalDiscounts: s.totalDiscounts,
            netRevenue: s.totalRevenue - s.totalDiscounts,
            count: s.count,
            averageValue: s.count > 0 ? s.totalRevenue / s.count : 0,
          })),
          labTests: topLabTests.map((t: any) => ({
            name: t._id,
            totalRevenue: t.totalRevenue,
            totalDiscounts: t.totalDiscounts,
            netRevenue: t.totalRevenue - t.totalDiscounts,
            count: t.count,
            averageValue: t.count > 0 ? t.totalRevenue / t.count : 0,
          })),
          radiologyExams: topRadiologyExams.map((e: any) => ({
            name: e._id,
            totalRevenue: e.totalRevenue,
            totalDiscounts: e.totalDiscounts,
            netRevenue: e.totalRevenue - e.totalDiscounts,
            count: e.count,
            averageValue: e.count > 0 ? e.totalRevenue / e.count : 0,
          })),
          operations: topOperations.map((o: any) => ({
            name: o._id,
            totalRevenue: o.totalRevenue,
            totalDiscounts: o.totalDiscounts,
            netRevenue: o.totalRevenue - o.totalDiscounts,
            count: o.count,
            averageValue: o.count > 0 ? o.totalRevenue / o.count : 0,
          })),
          medicines: topMedicines.map((m: any) => ({
            name: m._id,
            totalRevenue: m.totalRevenue,
            count: m.count,
            averageValue: m.count > 0 ? m.totalRevenue / m.count : 0,
          })),
        };

        break;

      case "doctor":
        // Get top doctors by revenue
        const topDoctors = await Payment.aggregate([
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
              totalDiscounts: { $sum: { $ifNull: ["$discountAmount", 0] } },
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
              doctorId: "$_id",
              doctorName: "$doctor.name",
              specialization: "$doctor.specialization",
              consultationFee: "$doctor.consultationFee",
              totalRevenue: 1,
              totalDiscounts: 1,
              count: 1,
            },
          },
          {
            $sort: { totalRevenue: -1 },
          },
          {
            $limit: limit,
          },
        ]);

        // Get top doctors by operations
        const topDoctorsByOperations = await DischargeCard.aggregate([
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
              totalDiscounts: { $sum: "$billing.discountAmount" },
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
              doctorId: "$_id",
              doctorName: "$doctor.name",
              specialization: "$doctor.specialization",
              totalRevenue: 1,
              totalDiscounts: 1,
              count: 1,
            },
          },
          {
            $sort: { totalRevenue: -1 },
          },
          {
            $limit: limit,
          },
        ]);

        result.data = {
          consultations: topDoctors.map((d: any) => ({
            doctorId: d.doctorId,
            doctorName: d.doctorName,
            specialization: d.specialization,
            consultationFee: d.consultationFee,
            totalRevenue: d.totalRevenue,
            totalDiscounts: d.totalDiscounts,
            netRevenue: d.totalRevenue - d.totalDiscounts,
            count: d.count,
            averageValue: d.count > 0 ? d.totalRevenue / d.count : 0,
          })),
          operations: topDoctorsByOperations.map((d: any) => ({
            doctorId: d.doctorId,
            doctorName: d.doctorName,
            specialization: d.specialization,
            totalRevenue: d.totalRevenue,
            totalDiscounts: d.totalDiscounts,
            netRevenue: d.totalRevenue - d.totalDiscounts,
            count: d.count,
            averageValue: d.count > 0 ? d.totalRevenue / d.count : 0,
          })),
        };

        break;

      case "patient":
        // Get top patients by revenue
        const topPatients = await Patient.aggregate([
          {
            $lookup: {
              from: "payments",
              localField: "_id",
              foreignField: "patient",
              as: "payments",
            },
          },
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
              totalRevenue: {
                $add: [
                  { $sum: "$payments.amount" },
                  { $sum: "$invoices.totalAmount" },
                  { $sum: "$billings.totalAmount" },
                ],
              },
              totalDiscounts: {
                $add: [
                  { $sum: "$payments.discountAmount" },
                  { $sum: "$invoices.discountAmount" },
                  { $sum: "$billings.discount" },
                ],
              },
              transactionCount: {
                $add: [
                  { $size: "$payments" },
                  { $size: "$invoices" },
                  { $size: "$billings" },
                ],
              },
            },
          },
          {
            $match: {
              totalRevenue: { $gt: 0 },
            },
          },
          {
            $sort: { totalRevenue: -1 },
          },
          {
            $limit: limit,
          },
        ]);

        result.data = topPatients.map((p: any) => ({
          patientId: p.patientId,
          patientName: p.name,
          phone: p.phone,
          email: p.email,
          totalRevenue: p.totalRevenue,
          totalDiscounts: p.totalDiscounts || 0,
          netRevenue: p.totalRevenue - (p.totalDiscounts || 0),
          transactionCount: p.transactionCount,
          averageValue:
            p.transactionCount > 0 ? p.totalRevenue / p.transactionCount : 0,
        }));

        break;

      default:
        return NextResponse.json(
          { error: "Invalid type. Use 'service', 'doctor', or 'patient'" },
          { status: 400 },
        );
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error fetching top revenue sources:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
