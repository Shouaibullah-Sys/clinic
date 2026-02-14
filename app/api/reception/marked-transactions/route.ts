import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { authenticateRequest } from "@/lib/auth";
import { MarkedTransaction, MarkedModule } from "@/lib/models/MarkedTransaction";

const allowedModules: MarkedModule[] = [
  "lab",
  "appointment",
  "radiology",
  "prescription",
  "discharge",
  "pharmacy",
];

const allowedRoles = ["receptionist", "admin"];

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

    if (!auth.userRole || !allowedRoles.includes(auth.userRole)) {
      return NextResponse.json(
        { success: false, error: "Forbidden. Access denied." },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const module = searchParams.get("module") as MarkedModule | null;
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    const query: Record<string, any> = {};
    if (module && allowedModules.includes(module)) {
      query.module = module;
    }

    if (dateFrom || dateTo) {
      query.transactionDate = {};
      if (dateFrom) query.transactionDate.$gte = new Date(dateFrom);
      if (dateTo) query.transactionDate.$lte = new Date(dateTo);
    }

    const marked = await MarkedTransaction.find(query)
      .sort({ markedAt: -1 })
      .lean();

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
    await dbConnect();

    const auth = await authenticateRequest(request);
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status || 401 },
      );
    }

    if (!auth.userRole || !allowedRoles.includes(auth.userRole)) {
      return NextResponse.json(
        { success: false, error: "Forbidden. Access denied." },
        { status: 403 },
      );
    }

    const body = await request.json();
    const module = body.module as MarkedModule;
    const transactionId = String(body.transactionId || "").trim();
    const transactionDate = body.transactionDate
      ? new Date(body.transactionDate)
      : null;
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

    const record = await MarkedTransaction.findOneAndUpdate(
      { module, transactionId },
      {
        module,
        transactionId,
        transactionDate,
        markedBy: auth.userId,
        markedAt: new Date(),
        notes,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

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
    await dbConnect();

    const auth = await authenticateRequest(request);
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status || 401 },
      );
    }

    if (!auth.userRole || !allowedRoles.includes(auth.userRole)) {
      return NextResponse.json(
        { success: false, error: "Forbidden. Access denied." },
        { status: 403 },
      );
    }

    const body = await request.json();
    const module = body.module as MarkedModule;
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

    await MarkedTransaction.deleteOne({ module, transactionId });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to unmark record" },
      { status: 500 },
    );
  }
}
