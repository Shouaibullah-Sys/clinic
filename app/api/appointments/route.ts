// app/api/appointments/route.ts

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { Appointment } from "@/lib/models/Appointment";
import { Patient } from "@/lib/models/Patient";
import { User } from "@/lib/models/User";
import { jwtVerify } from "jose";
import mongoose from "mongoose";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this";

async function verifyToken(token: string) {
  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch (error) {
    return null;
  }
}

// POST: Create new appointment
export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    // Authentication
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. No token provided." },
        { status: 401 },
      );
    }

    const token = authHeader.split(" ")[1];
    const payload = await verifyToken(token);

    if (!payload) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired token." },
        { status: 401 },
      );
    }

    const userId = payload.id as string;
    const userRole = payload.role as string;

    // Authorization
    if (!["admin", "receptionist", "doctor"].includes(userRole)) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden. You don't have permission to create appointments.",
        },
        { status: 403 },
      );
    }

    const body = await request.json();
    const {
      patientId,
      doctorId,
      startTime,
      endTime,
      duration = 20,
      appointmentType,
      reason,
      symptoms,
      priority,
      notes,
      autoNumber,
    } = body;

    // Validation
    if (!patientId || !doctorId || !startTime || !reason) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing required fields: patientId, doctorId, startTime, and reason are required",
        },
        { status: 400 },
      );
    }

    // Check if patient exists
    const patient = await Patient.findById(patientId);
    if (!patient) {
      return NextResponse.json(
        { success: false, error: "Patient not found" },
        { status: 404 },
      );
    }

    // Check if doctor exists and is active
    const doctor = await User.findOne({
      _id: doctorId,
      role: "doctor",
      active: true,
    });
    if (!doctor) {
      return NextResponse.json(
        { success: false, error: "Doctor not found or inactive" },
        { status: 404 },
      );
    }

    // Parse times
    const appointmentStartTime = new Date(startTime);
    const appointmentEndTime = endTime
      ? new Date(endTime)
      : new Date(appointmentStartTime.getTime() + duration * 60000);

    // Validate appointment time
    const now = new Date();
    if (appointmentStartTime < now) {
      return NextResponse.json(
        { success: false, error: "Appointment time cannot be in the past" },
        { status: 400 },
      );
    }

    // Check availability
    const isAvailable = await Appointment.checkAvailability(
      doctorId,
      appointmentStartTime,
      duration,
      undefined,
    );

    if (!isAvailable) {
      return NextResponse.json(
        { success: false, error: "Doctor is not available at this time" },
        { status: 409 },
      );
    }

    // Generate appointment ID
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    const random = Math.floor(100 + Math.random() * 900);
    const appointmentId = `APT${year}${month}${day}${random}`;

    // Get or generate auto number
    let finalAutoNumber = autoNumber;
    if (!finalAutoNumber) {
      const appointmentDate = new Date(appointmentStartTime);
      appointmentDate.setHours(0, 0, 0, 0);
      const count = await Appointment.getAppointmentCountByDate(
        doctorId,
        appointmentDate,
      );
      finalAutoNumber = (count + 1).toString().padStart(3, "0");
    }

    // Create appointment
    const appointmentData = {
      appointmentId,
      patient: new mongoose.Types.ObjectId(patientId),
      doctor: new mongoose.Types.ObjectId(doctorId),
      department: doctor.department,
      appointmentType: appointmentType || "consultation",
      date: new Date(appointmentStartTime.setHours(0, 0, 0, 0)),
      startTime: appointmentStartTime,
      endTime: appointmentEndTime,
      duration,
      autoNumber: finalAutoNumber,
      status: "scheduled",
      reason: reason.trim(),
      symptoms: symptoms?.trim(),
      priority: priority || "medium",
      notes: notes?.trim(),
      createdBy: new mongoose.Types.ObjectId(userId),
    };

    const appointment = new Appointment(appointmentData);
    await appointment.save();

    // Populate response
    await appointment.populate([
      { path: "patient", select: "name phone email patientId" },
      { path: "doctor", select: "name specialization department" },
      { path: "createdBy", select: "name" },
    ]);

    return NextResponse.json(
      {
        success: true,
        data: {
          id: appointment._id.toString(),
          appointmentId: appointment.appointmentId,
          autoNumber: appointment.autoNumber,
          patient: appointment.patient,
          doctor: appointment.doctor,
          startTime: appointment.startTime,
          endTime: appointment.endTime,
          duration: appointment.duration,
          appointmentType: appointment.appointmentType,
          status: appointment.status,
          reason: appointment.reason,
          priority: appointment.priority,
        },
        message: "Appointment created successfully",
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("Error creating appointment:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to create appointment",
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 },
    );
  }
}

// GET: Get appointments with filters
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    // Authentication
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. No token provided." },
        { status: 401 },
      );
    }

    const token = authHeader.split(" ")[1];
    const payload = await verifyToken(token);

    if (!payload) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired token." },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const doctorId = searchParams.get("doctorId");
    const patientId = searchParams.get("patientId");
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    let query: any = {};

    // Filter by date range (startDate and endDate)
    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.startTime = { $gte: start, $lte: end };
    }
    // Filter by single date (backward compatibility)
    else if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      query.startTime = { $gte: start, $lte: end };
    }

    // Filter by doctor
    if (doctorId) {
      query.doctor = doctorId;
    }

    // Filter by patient
    if (patientId) {
      query.patient = patientId;
    }

    // Filter by status
    if (status) {
      query.status = status;
    }

    // Get appointments
    let appointments;
    let total;

    if (search) {
      // Use aggregation with $lookup for search functionality
      const searchRegex = new RegExp(search, "i");
      const pipeline: any[] = [
        {
          $lookup: {
            from: "patients",
            localField: "patient",
            foreignField: "_id",
            as: "patient",
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "doctor",
            foreignField: "_id",
            as: "doctor",
          },
        },
        {
          $unwind: {
            path: "$patient",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $unwind: {
            path: "$doctor",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $match: {
            $and: [
              query,
              {
                $or: [
                  { "patient.name": searchRegex },
                  { "patient.phone": searchRegex },
                  { "patient.patientId": searchRegex },
                  { appointmentId: searchRegex },
                  { "doctor.name": searchRegex },
                  { reason: searchRegex },
                ],
              },
            ],
          },
        },
        {
          $sort: { startTime: 1 },
        },
        {
          $skip: skip,
        },
        {
          $limit: limit,
        },
        {
          $project: {
            _id: 1,
            appointmentId: 1,
            autoNumber: 1,
            patient: {
              _id: "$patient._id",
              name: "$patient.name",
              phone: "$patient.phone",
              patientId: "$patient.patientId",
            },
            doctor: {
              _id: "$doctor._id",
              name: "$doctor.name",
              specialization: "$doctor.specialization",
              department: "$doctor.department",
            },
            date: 1,
            startTime: 1,
            endTime: 1,
            duration: 1,
            appointmentType: 1,
            status: 1,
            reason: 1,
            priority: 1,
            notes: 1,
            checkInTime: 1,
            checkOutTime: 1,
            createdAt: 1,
            updatedAt: 1,
          },
        },
      ];

      // Get total count for search
      const countPipeline: any[] = [
        {
          $lookup: {
            from: "patients",
            localField: "patient",
            foreignField: "_id",
            as: "patient",
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "doctor",
            foreignField: "_id",
            as: "doctor",
          },
        },
        {
          $unwind: {
            path: "$patient",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $unwind: {
            path: "$doctor",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $match: {
            $and: [
              query,
              {
                $or: [
                  { "patient.name": searchRegex },
                  { "patient.phone": searchRegex },
                  { "patient.patientId": searchRegex },
                  { appointmentId: searchRegex },
                  { "doctor.name": searchRegex },
                  { reason: searchRegex },
                ],
              },
            ],
          },
        },
        {
          $count: "total",
        },
      ];

      const [appointmentsResult, countResult] = await Promise.all([
        Appointment.aggregate(pipeline),
        Appointment.aggregate(countPipeline),
      ]);

      appointments = appointmentsResult;
      total = countResult[0]?.total || 0;
    } else {
      // Regular query without search
      const [appointmentsResult, totalResult] = await Promise.all([
        Appointment.find(query)
          .populate("patient", "name phone patientId")
          .populate("doctor", "name specialization department")
          .sort({ startTime: 1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Appointment.countDocuments(query),
      ]);

      appointments = appointmentsResult;
      total = totalResult;
    }

    return NextResponse.json({
      success: true,
      data: appointments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching appointments:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch appointments" },
      { status: 500 },
    );
  }
}
