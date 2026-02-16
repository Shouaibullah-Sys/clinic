// app/api/admin/settings/direct-lab-payment/route.ts

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { AppSetting } from "@/lib/models/AppSetting";
import { authenticateRequest } from "@/lib/auth";

const SETTING_KEY = "directLabTestPaymentRequired";

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const auth = await authenticateRequest(request);
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status || 401 },
      );
    }

    if (auth.userRole !== "admin") {
      return NextResponse.json(
        { success: false, error: "Forbidden. Admin access required." },
        { status: 403 },
      );
    }

    const setting = await AppSetting.findOne({ key: SETTING_KEY }).lean();
    const paymentRequired = setting?.value ?? true;

    return NextResponse.json({
      success: true,
      data: { paymentRequired },
    });
  } catch (error: any) {
    console.error("Error fetching direct lab payment setting:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error.message || "Failed to fetch direct lab payment setting",
      },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    await dbConnect();

    const auth = await authenticateRequest(request);
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status || 401 },
      );
    }

    if (auth.userRole !== "admin") {
      return NextResponse.json(
        { success: false, error: "Forbidden. Admin access required." },
        { status: 403 },
      );
    }

    const body = await request.json();
    const paymentRequired = !!body.paymentRequired;

    const updated = await AppSetting.findOneAndUpdate(
      { key: SETTING_KEY },
      {
        $set: {
          value: paymentRequired,
          updatedBy: auth.userId,
        },
      },
      { new: true, upsert: true },
    ).lean();

    return NextResponse.json({
      success: true,
      data: { paymentRequired: updated?.value ?? true },
    });
  } catch (error: any) {
    console.error("Error updating direct lab payment setting:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error.message || "Failed to update direct lab payment setting",
      },
      { status: 500 },
    );
  }
}
