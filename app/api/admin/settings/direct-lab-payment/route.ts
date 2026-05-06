// app/api/admin/settings/direct-lab-payment/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this";

const SETTING_KEY = "directLabTestPaymentRequired";

async function verifyToken(token: string) {
  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch (error) {
    return null;
  }
}

async function authenticateAdmin(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { error: "Unauthorized. No token provided.", status: 401 };
  }

  const token = authHeader.split(" ")[1];
  const payload = await verifyToken(token);

  if (!payload) {
    return { error: "Invalid or expired token.", status: 401 };
  }

  const userRole = payload.role as string;

  if (userRole !== "admin") {
    return { error: "Forbidden. Admin access required.", status: 403 };
  }

  return {
    userId: payload.id as string,
    userRole,
  };
}

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateAdmin(request);
    if ("error" in auth) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status }
      );
    }

    const setting = await prisma.appSetting.findUnique({
      where: { key: SETTING_KEY },
    });
    const paymentRequired = setting?.value === "true" || !setting;

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
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await authenticateAdmin(request);
    if ("error" in auth) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status }
      );
    }

    if (auth.userRole !== "admin") {
      return NextResponse.json(
        { success: false, error: "Forbidden. Admin access required." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const paymentRequired = body.paymentRequired ? "true" : "false";

    const updated = await prisma.appSetting.upsert({
      where: { key: SETTING_KEY },
      update: { value: paymentRequired },
      create: {
        key: SETTING_KEY,
        value: paymentRequired,
        description: "Whether payment is required for direct lab tests",
      },
    });

    return NextResponse.json({
      success: true,
      data: { paymentRequired: updated.value === "true" },
    });
  } catch (error: any) {
    console.error("Error updating direct lab payment setting:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to update direct lab payment setting",
      },
      { status: 500 }
    );
  }
}
