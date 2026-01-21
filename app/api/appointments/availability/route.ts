// app/api/appointments/availability/route.ts

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { Appointment } from "@/lib/models/Appointment";
import { User } from "@/lib/models/User";
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

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    // Get token from Authorization header
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. No token provided." },
        { status: 401 }
      );
    }

    const token = authHeader.split(" ")[1];
    const payload = await verifyToken(token);

    if (!payload) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired token." },
        { status: 401 }
      );
    }

    const userRole = payload.role as string;

    // Allow receptionists, doctors, nurses, and admins
    if (!["admin", "receptionist", "doctor", "nurse"].includes(userRole)) {
      return NextResponse.json(
        { success: false, error: "Forbidden. Access denied." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const doctorId = searchParams.get("doctorId");
    const date = searchParams.get("date");
    const duration = parseInt(searchParams.get("duration") || "30");

    if (!doctorId || !date) {
      return NextResponse.json(
        { success: false, error: "doctorId and date are required" },
        { status: 400 }
      );
    }

    // Validate doctor exists and is active
    const doctor = await User.findOne({ _id: doctorId, role: "doctor", active: true });
    if (!doctor) {
      return NextResponse.json(
        { success: false, error: "Doctor not found or inactive" },
        { status: 404 }
      );
    }

    // Parse date
    const targetDate = new Date(date);
    if (isNaN(targetDate.getTime())) {
      return NextResponse.json(
        { success: false, error: "Invalid date format" },
        { status: 400 }
      );
    }

    // Get doctor's availability for the day of the week
    const dayOfWeek = targetDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const availability = doctor.availability;

    if (!availability || !availability.days || !availability.days.includes(dayOfWeek)) {
      return NextResponse.json({
        success: true,
        data: {
          availableSlots: [],
          message: "Doctor is not available on this day"
        }
      });
    }

    // Generate time slots based on doctor's availability
    const slots = [];
    const startTime = new Date(targetDate);
    const [startHour, startMinute] = availability.startTime.split(':').map(Number);
    startTime.setHours(startHour, startMinute, 0, 0);

    const endTime = new Date(targetDate);
    const [endHour, endMinute] = availability.endTime.split(':').map(Number);
    endTime.setHours(endHour, endMinute, 0, 0);

    // Break time
    let breakStart: Date | null = null;
    let breakEnd: Date | null = null;

    if (availability.breakStart && availability.breakEnd) {
      breakStart = new Date(targetDate);
      const [breakStartHour, breakStartMinute] = availability.breakStart.split(':').map(Number);
      breakStart.setHours(breakStartHour, breakStartMinute, 0, 0);

      breakEnd = new Date(targetDate);
      const [breakEndHour, breakEndMinute] = availability.breakEnd.split(':').map(Number);
      breakEnd.setHours(breakEndHour, breakEndMinute, 0, 0);
    }

    // Generate 15-minute intervals
    const currentTime = new Date(startTime);
    while (currentTime < endTime) {
      // Skip break time
      if (breakStart && breakEnd && currentTime >= breakStart && currentTime < breakEnd) {
        currentTime.setMinutes(currentTime.getMinutes() + 15);
        continue;
      }

      // Check if this slot is available
      const slotEndTime = new Date(currentTime);
      slotEndTime.setMinutes(slotEndTime.getMinutes() + duration);

      // Don't create slots that would end after doctor's end time
      if (slotEndTime > endTime) {
        currentTime.setMinutes(currentTime.getMinutes() + 15);
        continue;
      }

      // Check availability using the model's method
      const isAvailable = await Appointment.checkAvailability(doctorId, currentTime, duration);

      if (isAvailable) {
        const formattedTime = currentTime.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });

        slots.push({
          startTime: currentTime.toISOString(),
          endTime: slotEndTime.toISOString(),
          formattedTime: `${formattedTime} - ${slotEndTime.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          })}`
        });
      }

      currentTime.setMinutes(currentTime.getMinutes() + 15);
    }

    return NextResponse.json({
      success: true,
      data: {
        availableSlots: slots,
        doctorName: doctor.name,
        date: targetDate.toISOString().split('T')[0]
      }
    });

  } catch (error) {
    console.error("Error checking availability:", error);
    return NextResponse.json(
      { success: false, error: "Failed to check availability" },
      { status: 500 }
    );
  }
}