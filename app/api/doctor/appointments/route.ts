// app/api/doctor/appointments/route.ts

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { Appointment } from "@/lib/models/Appointment";
import { jwtVerify } from "jose";
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  isAfter,
  isBefore,
} from "date-fns";

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

    // Only doctors can access
    if (userRole !== "doctor") {
      return NextResponse.json(
        { success: false, error: "Forbidden. Doctor access required." },
        { status: 403 },
      );
    }

    // Get query params for filtering
    const { searchParams } = new URL(request.url);
    const dateFilter = searchParams.get("date") || "all";
    const statusFilter = searchParams.get("status") || "all";

    // Build query
    const query: any = {
      doctor: userId,
      status: { $nin: ["cancelled", "no-show"] },
    };

    const today = new Date();

    switch (dateFilter) {
      case "today":
        query.startTime = { $gte: startOfDay(today), $lte: endOfDay(today) };
        break;
      case "week":
        query.startTime = { $gte: startOfWeek(today), $lte: endOfWeek(today) };
        break;
      case "month":
        query.startTime = {
          $gte: startOfMonth(today),
          $lte: endOfMonth(today),
        };
        break;
      case "past":
        query.startTime = { $lt: startOfDay(today) };
        break;
      case "future":
        query.startTime = { $gt: endOfDay(today) };
        break;
      default:
        // All dates - no date filter
        break;
    }

    if (statusFilter !== "all") {
      query.status = statusFilter;
    }

    // Get appointments for this doctor
    const appointments = await Appointment.find(query)
      .populate("patient", "name phone guardian patientId dateOfBirth gender")
      .sort({ startTime: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: appointments,
    });
  } catch (error: any) {
    console.error("Error fetching doctor appointments:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch appointments",
      },
      { status: 500 },
    );
  }
}
