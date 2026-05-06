import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";

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

async function checkAvailability(
  doctorId: string,
  startTime: Date,
  duration: number,
) {
  const endTime = new Date(startTime);
  endTime.setMinutes(endTime.getMinutes() + duration);

  const conflicting = await prisma.appointment.findFirst({
    where: {
      doctorId,
      status: { notIn: ["cancelled", "no-show"] },
      OR: [
        { startTime: { lt: endTime, gte: startTime } },
        { endTime: { gt: startTime, lte: endTime } },
        { startTime: { gte: startTime }, endTime: { lte: endTime } },
        { startTime: { lte: startTime }, endTime: { gte: endTime } },
      ],
    },
  });
  return !conflicting;
}

function calculateEndtime(startTime: Date, duration: number) {
  const endtime = new Date(startTime);
  endtime.setMinutes(endtime.getMinutes() + duration);
  return endtime;
}

export async function POST(request: NextRequest) {
  try {
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
      consultationFee,
      doctorFee,
    } = body;

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

    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
    });
    if (!patient) {
      return NextResponse.json(
        { success: false, error: "Patient not found" },
        { status: 404 },
      );
    }

    const doctor = await prisma.user.findFirst({
      where: { id: doctorId, role: "doctor", active: true },
    });
    if (!doctor) {
      return NextResponse.json(
        { success: false, error: "Doctor not found or inactive" },
        { status: 404 },
      );
    }

    const appointmentStartTime = new Date(startTime);
    const appointmentEndTime = endTime
      ? new Date(endTime)
      : calculateEndtime(appointmentStartTime, duration);
    const requestedStartTime = new Date(appointmentStartTime);
    let autoAdjusted = false;

    const now = new Date();
    if (appointmentStartTime < now) {
      return NextResponse.json(
        { success: false, error: "Appointment time cannot be in the past" },
        { status: 400 },
      );
    }

    const isAvailable = await checkAvailability(
      doctorId,
      appointmentStartTime,
      duration,
    );

    if (!isAvailable) {
      const maxSlotsToCheck = 30;
      const slotIntervalMinutes = 20;

      let foundSlot: Date | null = null;
      for (let i = 1; i <= maxSlotsToCheck; i++) {
        const candidateStart = new Date(
          appointmentStartTime.getTime() + i * slotIntervalMinutes * 60000,
        );
        const available = await checkAvailability(
          doctorId,
          candidateStart,
          duration,
        );
        if (available) {
          foundSlot = candidateStart;
          break;
        }
      }

      if (!foundSlot) {
        return NextResponse.json(
          { success: false, error: "Doctor is not available at this time" },
          { status: 409 },
        );
      }

      autoAdjusted = true;
      appointmentStartTime.setTime(foundSlot.getTime());
    }

    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    const random = Math.floor(100 + Math.random() * 900);
    const appointmentId = `APT${year}${month}${day}${random}`;

    let finalAutoNumber = autoNumber;
    if (!finalAutoNumber) {
      const appointmentDate = new Date(appointmentStartTime);
      appointmentDate.setHours(0, 0, 0, 0);
      const count = await prisma.appointment.count({
        where: { doctorId, date: appointmentDate },
      });
      finalAutoNumber = (count + 1).toString().padStart(3, "0");
    }

    let resolvedConsultationFee: number | undefined = undefined;
    if (consultationFee !== undefined || doctorFee !== undefined) {
      const rawFee = consultationFee !== undefined ? consultationFee : doctorFee;
      const parsedFee = parseFloat(rawFee);
      if (isNaN(parsedFee) || parsedFee < 0) {
        return NextResponse.json(
          {
            success: false,
            error: "Consultation fee must be a valid non-negative number",
          },
          { status: 400 },
        );
      }
      resolvedConsultationFee = parsedFee;
    } else if (doctor.consultationFee !== undefined && doctor.consultationFee !== null) {
      resolvedConsultationFee = doctor.consultationFee;
    }

    const appointmentDate = new Date(appointmentStartTime);
    appointmentDate.setHours(0, 0, 0, 0);

    const appointment = await prisma.appointment.create({
      data: {
        appointmentId,
        patientId,
        doctorId,
        department: doctor.department || undefined,
        appointmentType: appointmentType || "consultation",
        date: appointmentDate,
        startTime: appointmentStartTime,
        endTime: appointmentEndTime,
        duration,
        autoNumber: finalAutoNumber,
        status: "scheduled",
        reason: reason.trim(),
        symptoms: symptoms?.trim() || undefined,
        priority: priority || "medium",
        notes: notes?.trim() || undefined,
        createdById: userId,
        ...(resolvedConsultationFee !== undefined && {
          consultationFee: resolvedConsultationFee,
          doctorFee: resolvedConsultationFee,
        }),
      },
    });

    const populatedAppointment = await prisma.appointment.findUnique({
      where: { id: appointment.id },
      include: {
        patient: { select: { name: true, phone: true, patientId: true } },
        doctor: { select: { name: true, specialization: true, department: true } },
      },
    });

    if (!populatedAppointment) {
      return NextResponse.json(
        { success: false, error: "Failed to create appointment" },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          id: populatedAppointment.id,
          appointmentId: populatedAppointment.appointmentId,
          autoNumber: populatedAppointment.autoNumber,
          patient: populatedAppointment.patient,
          doctor: populatedAppointment.doctor,
          startTime: populatedAppointment.startTime,
          endTime: populatedAppointment.endTime,
          duration: populatedAppointment.duration,
          appointmentType: populatedAppointment.appointmentType,
          status: populatedAppointment.status,
          reason: populatedAppointment.reason,
          priority: populatedAppointment.priority,
          autoAdjusted,
          requestedStartTime: autoAdjusted ? requestedStartTime : undefined,
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

export async function GET(request: NextRequest) {
  try {
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

    let where: any = {};

    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.startTime = { gte: start, lte: end };
    } else if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      where.startTime = { gte: start, lte: end };
    }

    if (doctorId) {
      where.doctorId = doctorId;
    }

    if (patientId) {
      where.patientId = patientId;
    }

    if (status) {
      where.status = status;
    }

    let appointments: any[] = [];
    let total = 0;

    if (search) {
      const searchWhere = {
        ...where,
        patient: {
          name: { contains: search },
        },
        OR: [
          { patient: { name: { contains: search } } },
          { patient: { phone: { contains: search } } },
          { patient: { patientId: { contains: search } } },
          { appointmentId: { contains: search } },
          { doctor: { name: { contains: search } } },
          { reason: { contains: search } },
        ],
      };

      appointments = await prisma.appointment.findMany({
        where: searchWhere,
        include: {
          patient: { select: { name: true, phone: true, patientId: true } },
          doctor: { select: { name: true, specialization: true, department: true } },
        },
        orderBy: { startTime: "asc" },
        skip,
        take: limit,
      });

      total = await prisma.appointment.count({ where: searchWhere });
    } else {
      appointments = await prisma.appointment.findMany({
        where,
        include: {
          patient: { select: { name: true, phone: true, patientId: true } },
          doctor: { select: { name: true, specialization: true, department: true } },
        },
        orderBy: { startTime: "asc" },
        skip,
        take: limit,
      });

      total = await prisma.appointment.count({ where });
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