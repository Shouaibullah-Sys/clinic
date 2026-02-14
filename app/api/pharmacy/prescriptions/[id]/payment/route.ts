// app/api/pharmacy/prescriptions/[id]/payment/route.ts

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import PharmacySale from "@/lib/models/PharmacySale";
import { Payment } from "@/lib/models/Payment";
import { MedicineStock } from "@/lib/models/MedicineStock";
import { authenticateRequest } from "@/lib/auth";
import mongoose from "mongoose";

// POST: Process payment for a pharmacy sale
export async function POST(
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

    // Only receptionists, pharmacists, pharmacy heads, and admin can process payments
    const allowedRoles = ["receptionist", "pharmacist", "pharmacy_head", "admin"];
    if (!auth.userRole || !allowedRoles.includes(auth.userRole)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Forbidden. Only receptionists, pharmacists, and pharmacy heads can process payments.",
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

    // Check if payment is already completed
    if (sale.paymentStatus === "paid") {
      return NextResponse.json(
        { success: false, error: "Payment has already been processed" },
        { status: 400 },
      );
    }

    const body = await request.json();

    // Validate required fields
    if (!body.amount || typeof body.amount !== "number") {
      return NextResponse.json(
        { success: false, error: "Payment amount is required" },
        { status: 400 },
      );
    }

    if (!body.paymentMethod) {
      return NextResponse.json(
        { success: false, error: "Payment method is required" },
        { status: 400 },
      );
    }

    // Validate payment method
    const validPaymentMethods = ["cash", "card", "insurance"];
    if (!validPaymentMethods.includes(body.paymentMethod)) {
      return NextResponse.json(
        { success: false, error: "Invalid payment method" },
        { status: 400 },
      );
    }

    // Validate amount
    const totalAmount = sale.totalAmount;
    const paidAmount = sale.amountPaid;
    const dueAmount = totalAmount - paidAmount;

    if (body.amount <= 0) {
      return NextResponse.json(
        { success: false, error: "Payment amount must be greater than 0" },
        { status: 400 },
      );
    }

    if (body.amount > dueAmount) {
      return NextResponse.json(
        {
          success: false,
          error: `Payment amount exceeds due amount. Due: ${dueAmount}, Provided: ${body.amount}`,
        },
        { status: 400 },
      );
    }

    // Validate discount if provided
    let discountAmount = 0;
    if (body.discount !== undefined && body.discount !== null) {
      if (typeof body.discount !== "number" || body.discount < 0) {
        return NextResponse.json(
          { success: false, error: "Discount must be a non-negative number" },
          { status: 400 },
        );
      }
      discountAmount = body.discount;
    }

    // Calculate new payment status
    const newPaidAmount = paidAmount + body.amount;
    const newBalance = totalAmount - newPaidAmount;
    let newPaymentStatus: "pending" | "partial" | "paid" = "partial";

    if (newBalance <= 0) {
      newPaymentStatus = "paid";
    } else if (newPaidAmount > 0) {
      newPaymentStatus = "partial";
    } else {
      newPaymentStatus = "pending";
    }

    // Check for sufficient stock if this payment will complete the sale
    if (newPaymentStatus === "paid") {
      for (const item of sale.items) {
        const medicine = await MedicineStock.findById(item.medicine);
        if (!medicine) {
          return NextResponse.json(
            { success: false, error: `Medicine not found: ${item.name}` },
            { status: 404 },
          );
        }

        if (medicine.currentQuantity < item.quantity) {
          return NextResponse.json(
            {
              success: false,
              error: `Insufficient stock for ${medicine.name}. Available: ${medicine.currentQuantity}, Required: ${item.quantity}`,
            },
            { status: 400 },
          );
        }
      }
    }

    // Create payment record - omit patient field entirely for walk-in sales
    // This is more robust than setting null, as it works with any schema caching
    const paymentData = {
      paymentMethod: body.paymentMethod,
      amount: body.amount,
      taxAmount: 0,
      discountAmount: discountAmount,
      netAmount: body.amount - discountAmount,
      status: "completed",
      paymentDate: new Date(),
      collectedBy: new mongoose.Types.ObjectId(auth.userId!),
      department: "pharmacy",
      serviceType: "pharmacy_sale",
      referenceId: sale.saleId,
      notes: body.notes,
      // Additional fields for card payments
      ...(body.paymentMethod === "card" && {
        cardType: body.cardType,
        cardLastFour: body.cardLastFour,
      }),
      // Transaction ID if provided
      ...(body.transactionId && { transactionId: body.transactionId }),
    };

    const payment = new Payment(paymentData);
    await payment.save();

    // Deduct stock if payment is completed
    if (newPaymentStatus === "paid") {
      try {
        for (const item of sale.items) {
          const medicine = await MedicineStock.findById(item.medicine);
          if (!medicine) {
            // Rollback payment if medicine not found
            await Payment.findByIdAndDelete(payment._id);
            return NextResponse.json(
              { success: false, error: `Medicine not found: ${item.name}` },
              { status: 404 },
            );
          }

          if (medicine.currentQuantity < item.quantity) {
            // Rollback payment if insufficient stock
            await Payment.findByIdAndDelete(payment._id);
            return NextResponse.json(
              {
                success: false,
                error: `Insufficient stock for ${medicine.name}. Available: ${medicine.currentQuantity}, Required: ${item.quantity}`,
              },
              { status: 400 },
            );
          }

          // Deduct stock quantity
          medicine.currentQuantity -= item.quantity;
          await medicine.save();
        }
      } catch (stockError: any) {
        // Rollback payment if stock deduction fails
        await Payment.findByIdAndDelete(payment._id);
        console.error("Stock deduction failed:", stockError);
        return NextResponse.json(
          {
            success: false,
            error: stockError.message || "Failed to deduct stock",
          },
          { status: 500 },
        );
      }
    }

    // Update pharmacy sale
    sale.amountPaid = newPaidAmount;
    sale.balance = Math.max(0, newBalance);
    sale.paymentStatus = newPaymentStatus;
    sale.paymentMethod = body.paymentMethod;

    // Auto-finalize sale when payment is completed
    if (newPaymentStatus === "paid") {
      sale.status = "completed";
      sale.finalizedAt = new Date();
      sale.finalizedBy = new mongoose.Types.ObjectId(auth.userId!);
    }

    await sale.save();

    // Populate the response
    const populatedSale = await PharmacySale.findById(sale._id)
      .populate("soldBy", "name")
      .lean();

    console.log(
      `Payment processed for pharmacy sale ${sale.saleId}: ${body.amount} ${body.paymentMethod} by ${auth.userName}`,
    );

    return NextResponse.json({
      success: true,
      data: {
        sale: populatedSale,
        payment: {
          paymentId: payment.paymentId,
          amount: payment.amount,
          paymentMethod: payment.paymentMethod,
          status: payment.status,
        },
      },
      message: "Payment processed successfully",
    });
  } catch (error: any) {
    console.error("Error processing payment:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to process payment",
      },
      { status: 500 },
    );
  }
}
