// app/api/tailor/records/[id]/deliver/route.ts
import { NextRequest, NextResponse } from "next/server";
import { markAsDelivered } from "@/lib/tailor-data";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { error: "Record ID is required" },
        { status: 400 }
      );
    }

    const updatedRecord = await markAsDelivered(id);
    
    if (!updatedRecord) {
      return NextResponse.json(
        { error: "Record not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedRecord);
  } catch (error) {
    console.error("Error marking as delivered:", error);
    return NextResponse.json(
      { error: "Failed to mark as delivered" },
      { status: 500 }
    );
  }
}