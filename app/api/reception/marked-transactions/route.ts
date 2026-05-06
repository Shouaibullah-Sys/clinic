import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenPayload } from "@/lib/auth/jwt";

const allowedModules = ["lab", "appointment", "radiology", "prescription", "discharge", "pharmacy"];
const allowedRoles = ["receptionist", "admin"];

export async function GET(request: NextRequest) {
  try {
    const payload = await getTokenPayload(request);

    if (!payload || !allowedRoles.includes(payload.role)) {
      return NextResponse.json(
        { success: false, error: "Forbidden. Access denied." },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const module = searchParams.get("module");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    let where: any = {};
    if (module && allowedModules.includes(module)) {
      where.module = module;
    }

    if (dateFrom || dateTo) {
      where.transactionDate = {};
      if (dateFrom) where.transactionDate.gte = new Date(dateFrom);
      if (dateTo) where.transactionDate.lte = new Date(dateTo);
    }

    const marked = await (prisma as any).markedTransaction.findMany({
      where,
      orderBy: { markedAt: "desc" },
    });

    return NextResponse.json({ success: true, data: marked });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch marked records" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await getTokenPayload(request);

    if (!payload || !allowedRoles.includes(payload.role)) {
      return NextResponse.json(
        { success: false, error: "Forbidden. Access denied." },
        { status: 403 },
      );
    }

    const body = await request.json();
    const module = body.module;
    const transactionId = String(body.transactionId || "").trim();
    const transactionDate = body.transactionDate ? new Date(body.transactionDate) : null;
    const notes = body.notes ? String(body.notes) : undefined;

    if (!allowedModules.includes(module)) {
      return NextResponse.json(
        { success: false, error: "Invalid module" },
        { status: 400 },
      );
    }

    if (!transactionId) {
      return NextResponse.json(
        { success: false, error: "transactionId is required" },
        { status: 400 },
      );
    }

    if (!transactionDate || isNaN(transactionDate.getTime())) {
      return NextResponse.json(
        { success: false, error: "transactionDate is required" },
        { status: 400 },
      );
    }

    const record = await (prisma as any).markedTransaction.upsert({
      where: { module_transactionId: { module, transactionId } },
      create: {
        module,
        transactionId,
        transactionDate,
        markedById: payload.id,
        markedAt: new Date(),
        notes,
      },
      update: {
        transactionDate,
        markedById: payload.id,
        markedAt: new Date(),
        notes,
      },
    });

    return NextResponse.json({ success: true, data: record });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to mark record" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const payload = await getTokenPayload(request);

    if (!payload || !allowedRoles.includes(payload.role)) {
      return NextResponse.json(
        { success: false, error: "Forbidden. Access denied." },
        { status: 403 },
      );
    }

    const body = await request.json();
    const module = body.module;
    const transactionId = String(body.transactionId || "").trim();

    if (!allowedModules.includes(module)) {
      return NextResponse.json(
        { success: false, error: "Invalid module" },
        { status: 400 },
      );
    }

    if (!transactionId) {
      return NextResponse.json(
        { success: false, error: "transactionId is required" },
        { status: 400 },
      );
    }

    await (prisma as any).markedTransaction.delete({
      where: { module_transactionId: { module, transactionId } },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to unmark record" },
      { status: 500 },
    );
  }
}