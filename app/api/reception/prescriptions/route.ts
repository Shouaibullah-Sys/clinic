// app/api/reception/prescriptions/route.ts

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { Prescription } from "@/lib/models/Prescription";
import { authenticateRequest } from "@/lib/auth";

// GET: Receptionist views all prescriptions with filters
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    // Authenticate the request
    const auth = await authenticateRequest(request);
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status || 401 },
      );
    }

    // Only receptionist and admin can view all prescriptions
    const allowedRoles = ["receptionist", "admin"];
    if (!auth.userRole || !allowedRoles.includes(auth.userRole)) {
      return NextResponse.json(
        { success: false, error: "Forbidden. Access denied." },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get("patientId");
    const appointmentId = searchParams.get("appointmentId");
    const status = searchParams.get("status");
    const paymentStatus = searchParams.get("paymentStatus");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    let query: any = {};

    // Filter by patient
    if (patientId) {
      query.patient = patientId;
    }

    // Filter by appointment
    if (appointmentId) {
      query.appointment = appointmentId;
    }

    // Filter by status
    if (status) {
      query.status = status;
    }

    // Filter by payment status
    if (paymentStatus) {
      query["charges.paymentStatus"] = paymentStatus;
    }

    // Filter by date range
    if (dateFrom || dateTo) {
      query.prescribedDate = {};
      if (dateFrom) {
        query.prescribedDate.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        query.prescribedDate.$lte = new Date(dateTo);
      }
    }

    // Get prescriptions
    const [prescriptions, total] = await Promise.all([
      Prescription.find(query)
        .populate("patient", "name patientId phone")
        .populate("appointment", "appointmentId date")
        .populate("doctor", "name specialization")
        .populate("charges.collectedBy", "name")
        .populate("paymentVerifiedBy", "name")
        .sort({ prescribedDate: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Prescription.countDocuments(query),
    ]);

    // Calculate summary statistics
    const unpaidPrescriptions = await Prescription.countDocuments({
      "charges.paymentStatus": { $in: ["unpaid", "partial"] },
    });

    const totalRevenue = await Prescription.aggregate([
      { $match: { "charges.paymentStatus": "paid" } },
      { $group: { _id: null, total: { $sum: "$charges.totalAmount" } } },
    ]);

    const pendingCollection = await Prescription.aggregate([
      { $match: { "charges.paymentStatus": { $in: ["unpaid", "partial"] } } },
      { $group: { _id: null, total: { $sum: "$charges.due" } } },
    ]);

    return NextResponse.json({
      success: true,
      data: prescriptions,
      summary: {
        totalPrescriptions: total,
        unpaidPrescriptions,
        totalRevenue: totalRevenue[0]?.total || 0,
        pendingCollection: pendingCollection[0]?.total || 0,
      },
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("Error fetching prescriptions:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch prescriptions",
      },
      { status: 500 },
    );
  }
}
