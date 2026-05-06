import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/auth";

const SETTING_KEY = "directLabTestPaymentRequired";

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status || 401 },
      );
    }

    const setting = await prisma.appSetting.findUnique({
      where: { key: SETTING_KEY },
    });
    const paymentRequired = setting?.value ?? "true";

    return NextResponse.json({
      success: true,
      data: { paymentRequired: paymentRequired === "true" },
    });
  } catch (error: any) {
    console.error("Error fetching direct lab payment setting:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch direct lab payment setting",
      },
      { status: 500 },
    );
  }
}