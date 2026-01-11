// app/api/tailor/records/upcoming/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getUpcomingDeliveries } from "@/lib/tailor-data";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = searchParams.get("days");
    
    const upcomingDeliveries = await getUpcomingDeliveries(
      days ? parseInt(days) : 7
    );
    
    return NextResponse.json(upcomingDeliveries);
  } catch (error) {
    console.error("Error fetching upcoming deliveries:", error);
    return NextResponse.json(
      { error: "Failed to fetch upcoming deliveries" },
      { status: 500 }
    );
  }
}