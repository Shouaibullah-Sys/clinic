// app/api/appointments/next-available-slot/route.ts
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { Appointment } from "@/lib/models/Appointment";
import { User } from "@/lib/models/User";
import { jwtVerify } from "jose";
import { startOfDay, endOfDay, format, isSameDay } from "date-fns";

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

    const { searchParams } = new URL(request.url);
    const doctorId = searchParams.get("doctorId");
    const date = searchParams.get("date");
    const duration = parseInt(searchParams.get("duration") || "20");

    if (!doctorId || !date) {
      return NextResponse.json(
        { success: false, error: "doctorId and date are required" },
        { status: 400 }
      );
    }

    // Validate doctor exists
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

    // Check doctor's availability for the day
    const dayOfWeek = targetDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const availability = doctor.availability;

    if (!availability || !availability.days || !availability.days.includes(dayOfWeek)) {
      return NextResponse.json({
        success: true,
        data: null,
        message: "Doctor is not available on this day"
      });
    }

    // Get doctor's appointments for the target date
    const startOfTargetDay = startOfDay(targetDate);
    const endOfTargetDay = endOfDay(targetDate);

    const appointments = await Appointment.find({
      doctor: doctorId,
      startTime: { $gte: startOfTargetDay, $lte: endOfTargetDay },
      status: { $nin: ["cancelled", "no-show"] },
    }).sort({ startTime: 1 });

    // Get appointment count for the date for auto-numbering
    const appointmentCount = await Appointment.getAppointmentCountByDate(doctorId, targetDate);

    // Get doctor's working hours
    const [startHour, startMinute] = availability.startTime.split(':').map(Number);
    const [endHour, endMinute] = availability.endTime.split(':').map(Number);

    let currentTime = new Date(targetDate);
    currentTime.setHours(startHour, startMinute, 0, 0);

    const endTime = new Date(targetDate);
    endTime.setHours(endHour, endMinute, 0, 0);

    // If it's today, start from current time or next available slot
    const today = new Date();
    if (isSameDay(targetDate, today)) {
      const now = new Date();
      if (now > currentTime) {
        // Round up to next 20-minute interval
        const minutes = now.getMinutes();
        const remainder = minutes % 20;
        const roundedMinutes = remainder === 0 ? minutes : minutes + (20 - remainder);
        
        currentTime = new Date(now);
        currentTime.setMinutes(roundedMinutes, 0, 0);
        
        // Make sure we don't start before doctor's start time
        const doctorStartTime = new Date(targetDate);
        doctorStartTime.setHours(startHour, startMinute, 0, 0);
        if (currentTime.getTime() < doctorStartTime.getTime()) {
          currentTime = doctorStartTime;
        }
      }
    }

    // Find next available slot
    let slotNumber = appointmentCount + 1;
    
    while (currentTime.getTime() < endTime.getTime()) {
      const slotEndTime = new Date(currentTime);
      slotEndTime.setMinutes(slotEndTime.getMinutes() + duration);

      // Check if slot would end after doctor's end time
      if (slotEndTime.getTime() > endTime.getTime()) {
        break;
      }

      // Check for conflicts with existing appointments
      const hasConflict = appointments.some(appointment => {
        const appointmentStart = new Date(appointment.startTime);
        const appointmentEnd = new Date(appointment.endTime);
        
        return (
          (currentTime.getTime() >= appointmentStart.getTime() && currentTime.getTime() < appointmentEnd.getTime()) ||
          (slotEndTime.getTime() > appointmentStart.getTime() && slotEndTime.getTime() <= appointmentEnd.getTime()) ||
          (currentTime.getTime() <= appointmentStart.getTime() && slotEndTime.getTime() >= appointmentEnd.getTime())
        );
      });

      if (!hasConflict) {
        return NextResponse.json({
          success: true,
          data: {
            startTime: currentTime.toISOString(),
            endTime: slotEndTime.toISOString(),
            formattedTime: `${format(currentTime, 'HH:mm')} - ${format(slotEndTime, 'HH:mm')}`,
            autoNumber: slotNumber.toString().padStart(3, '0'),
          },
        });
      }

      // Move to next 20-minute interval
      currentTime.setMinutes(currentTime.getMinutes() + 20);
      slotNumber++;
    }

    return NextResponse.json({
      success: true,
      data: null,
      message: "No available slots found for the selected date"
    });

  } catch (error) {
    console.error("Error getting next available slot:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get next available slot" },
      { status: 500 }
    );
  }
}