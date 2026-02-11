// app/api/pharmacy/prescriptions/[id]/finalize/route.ts

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import PharmacySale from "@/lib/models/PharmacySale";
import { authenticateRequest } from "@/lib/auth";
import mongoose from "mongoose";

// PATCH: Finalize a pharmacy sale
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await dbConnect();

    // Authenticate the request
    const auth = await authenticateRequest(request);
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status || 401 },
      );
    }

    // Only pharmacists and admin can finalize sales
    const allowedRoles = ["pharmacist", "admin"];
    if (!auth.userRole || !allowedRoles.includes(auth.userRole)) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden. Only pharmacists can finalize sales.",
        },
        { status: 403 },
      );
    }

    // Unwrap the params promise
    const { id: saleId } = await params;

    // Find the pharmacy sale
    const sale = await PharmacySale.findById(saleId);
    if (!sale) {
      return NextResponse.json(
        { success: false, error: "Pharmacy sale not found" },
        { status: 404 },
      );
    }

    // Check if sale is already finalized
    if (sale.status === "completed") {
      return NextResponse.json(
        { success: false, error: "Sale has already been finalized" },
        { status: 400 },
      );
    }

    // Check if sale is cancelled
    if (sale.status === "cancelled") {
      return NextResponse.json(
        { success: false, error: "Cannot finalize a cancelled sale" },
        { status: 400 },
      );
    }

    // Check if payment is verified (paid or partial with zero balance)
    if (sale.paymentStatus !== "paid" && sale.balance > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Cannot finalize sale. Payment has not been completed.",
        },
        { status: 400 },
      );
    }

    const body = await request.json();

    // Validate status if provided
    if (body.status && body.status !== "completed") {
      return NextResponse.json(
        { success: false, error: "Status must be 'completed'" },
        { status: 400 },
      );
    }

    // Finalize the sale
    sale.status = "completed";
    sale.finalizedAt = new Date();
    sale.finalizedBy = new mongoose.Types.ObjectId(auth.userId!);

    // Add notes if provided
    if (body.notes) {
      sale.notes = body.notes;
    }

    await sale.save();

    // Populate the response
    const populatedSale = await PharmacySale.findById(sale._id)
      .populate("soldBy", "name")
      .populate("finalizedBy", "name")
      .lean();

    console.log(`Pharmacy sale ${sale.saleId} finalized by ${auth.userName}`);

    return NextResponse.json({
      success: true,
      data: populatedSale,
      message: "Sale finalized successfully",
    });
  } catch (error: any) {
    console.error("Error finalizing pharmacy sale:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to finalize sale",
      },
      { status: 500 },
    );
  }
}
