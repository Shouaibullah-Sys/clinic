// app/api/settings/direct-lab-payment/route.ts

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { AppSetting, IAppSetting } from "@/lib/models/AppSetting";
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

    const setting = (await AppSetting.findOne({
      key: SETTING_KEY,
    }).lean()) as IAppSetting | null;
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
        error: error.message || "Failed to fetch direct lab payment setting",
      },
      { status: 500 },
    );
  }
}
