// app/api/tailor/records/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  getTailorRecords,
  addTailorRecord,
  updateTailorRecord,
  deleteTailorRecord,
  getTailorRecordById,
  getUpcomingDeliveries,
  getDailySummary,
  getMonthlySummary
} from "@/lib/tailor-data";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const orderStatus = searchParams.get("orderStatus");
    const paymentStatus = searchParams.get("paymentStatus");
    const id = searchParams.get("id");
    const summary = searchParams.get("summary");
    const month = searchParams.get("month");
    const year = searchParams.get("year");

    // Get single record by ID
    if (id) {
      const record = await getTailorRecordById(id);
      if (!record) {
        return NextResponse.json(
          { error: "Record not found" },
          { status: 404 }
        );
      }
      return NextResponse.json(record);
    }

    // Get daily summary
    if (summary === "daily") {
      const date = searchParams.get("date") 
        ? new Date(searchParams.get("date") as string) 
        : new Date();
      const dailySummary = await getDailySummary(date);
      return NextResponse.json(dailySummary);
    }

    // Get monthly summary
    if (summary === "monthly" && month && year) {
      const monthlySummary = await getMonthlySummary(
        parseInt(month),
        parseInt(year)
      );
      return NextResponse.json(monthlySummary);
    }

    // Get all records with filters
    const records = await getTailorRecords(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
      orderStatus || undefined,
      paymentStatus || undefined
    );

    return NextResponse.json(records);
  } catch (error) {
    console.error("Error fetching tailor records:", error);
    return NextResponse.json(
      { error: "Failed to fetch records" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    // TODO: Add recordedBy from session/auth if available
    // You can modify this based on your authentication setup
    // const recordedBy = {
    //   name: "System User", // Replace with actual user from session
    //   _id: "system" // Replace with actual user ID
    // };

    const recordData = {
      ...data,
      // recordedBy,
    };

    const newRecord = await addTailorRecord(recordData);
    return NextResponse.json(newRecord, { status: 201 });
  } catch (error) {
    console.error("Error creating tailor record:", error);
    return NextResponse.json(
      { error: "Failed to create record" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    
    if (!id) {
      return NextResponse.json(
        { error: "Record ID is required" },
        { status: 400 }
      );
    }

    const updates = await request.json();
    const updatedRecord = await updateTailorRecord(id, updates);
    
    if (!updatedRecord) {
      return NextResponse.json(
        { error: "Record not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedRecord);
  } catch (error) {
    console.error("Error updating tailor record:", error);
    return NextResponse.json(
      { error: "Failed to update record" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    
    if (!id) {
      return NextResponse.json(
        { error: "Record ID is required" },
        { status: 400 }
      );
    }

    const success = await deleteTailorRecord(id);
    
    if (!success) {
      return NextResponse.json(
        { error: "Record not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting tailor record:", error);
    return NextResponse.json(
      { error: "Failed to delete record" },
      { status: 500 }
    );
  }
}