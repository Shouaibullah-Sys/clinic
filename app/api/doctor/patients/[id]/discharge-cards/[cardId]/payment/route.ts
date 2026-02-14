// app/api/doctor/patients/[id]/discharge-cards/[cardId]/payment/route.ts

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { DischargeCard } from "@/lib/models/DischargeCard";
import { jwtVerify } from "jose";
import mongoose from "mongoose";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this";

async function verifyToken(token: string) {
  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch (error) {
    return null;
  }
}

// POST - Mark discharge card as paid (by receptionist)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; cardId: string }> },
) {
  try {
    const { id: patientId, cardId } = await params;

    await dbConnect();

    // Authentication
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. No token provided." },
        { status: 401 },
      );
    }

    const token = authHeader.split(" ")[1];
    const payload = await verifyToken(token);

    if (!payload) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired token." },
        { status: 401 },
      );
    }

    const userId = payload.id as string;
    const userRole = payload.role as string;

    // Only receptionists and admins can process payments
    if (userRole !== "receptionist" && userRole !== "admin") {
      return NextResponse.json(
        { success: false, error: "Forbidden. Receptionist access required." },
        { status: 403 },
      );
    }

    let body;
    try {
      body = await req.json();
    } catch (jsonError) {
      return NextResponse.json(
        { success: false, error: "Invalid JSON in request body" },
        { status: 400 },
      );
    }

    const {
      paymentMethod,
      transactionId,
      paidAmount,
      invoiceId,
      paymentType,
      discount,
    } = body;

    // Find the discharge card
    const dischargeCard = await DischargeCard.findOne({
      _id: cardId,
      patient: patientId,
    });

    if (!dischargeCard) {
      return NextResponse.json(
        { success: false, error: "Discharge card not found" },
        { status: 404 },
      );
    }

    // Calculate medicine total
    const calculateMedicineTotal = (card: typeof dischargeCard) => {
      const preOpTotal = card.preOpMedicines.reduce(
        (sum: number, med: { totalPrice: number }) =>
          sum + (med.totalPrice || 0),
        0,
      );
      const postOpTotal = card.postOpMedicines.reduce(
        (sum: number, med: { totalPrice: number }) =>
          sum + (med.totalPrice || 0),
        0,
      );
      const dischargeMedsTotal = card.dischargeMedicines.reduce(
        (sum: number, med: { totalPrice: number }) =>
          sum + (med.totalPrice || 0),
        0,
      );
      return preOpTotal + postOpTotal + dischargeMedsTotal;
    };

    // Apply discount if provided
    if (discount !== undefined && discount !== null) {
      const discountAmount = parseFloat(discount);
      if (isNaN(discountAmount) || discountAmount < 0) {
        return NextResponse.json(
          { success: false, error: "Discount must be a non-negative number" },
          { status: 400 },
        );
      }
      dischargeCard.billing.discountAmount =
        (dischargeCard.billing.discountAmount || 0) + discountAmount;
      dischargeCard.billing.totalAmount = Math.max(
        0,
        dischargeCard.billing.totalAmount - discountAmount,
      );
      dischargeCard.billing.balance =
        dischargeCard.billing.totalAmount - dischargeCard.billing.paidAmount;
    }

    // Handle medicines-only payment
    if (paymentType === "medicines") {
      const medicineTotal = calculateMedicineTotal(dischargeCard);

      if (dischargeCard.billing.medicinesPaid) {
        return NextResponse.json(
          { success: false, error: "Medicines have already been paid" },
          { status: 400 },
        );
      }

      const amountToPay = paidAmount || medicineTotal;

      // Update medicine payment
      dischargeCard.billing.medicinesPaid = true;
      dischargeCard.billing.medicinesPaidAmount = amountToPay;
      dischargeCard.billing.medicinesPaymentDate = new Date();
      dischargeCard.billing.medicinesPaymentMethod = paymentMethod;
      dischargeCard.billing.medicinesTransactionId = transactionId;

      // Update overall billing
      dischargeCard.billing.paidAmount += amountToPay;
      dischargeCard.billing.balance =
        dischargeCard.billing.totalAmount - dischargeCard.billing.paidAmount;
      dischargeCard.billing.paymentMethod = paymentMethod;
      dischargeCard.billing.transactionId = transactionId;
      dischargeCard.billing.paymentDate = new Date();
      dischargeCard.billing.collectedBy = new mongoose.Types.ObjectId(userId);

      // Update payment status
      if (dischargeCard.billing.balance <= 0) {
        dischargeCard.billing.paymentStatus = "paid";
        dischargeCard.status = "paid";
      } else if (dischargeCard.billing.paidAmount > 0) {
        dischargeCard.billing.paymentStatus = "partial";
        dischargeCard.status = "billed";
      }

      await dischargeCard.save();

      return NextResponse.json({
        success: true,
        message: "Medicine payment processed successfully",
        data: {
          dischargeId: dischargeCard.dischargeId,
          medicineTotal,
          medicinesPaidAmount: dischargeCard.billing.medicinesPaidAmount,
          totalPaidAmount: dischargeCard.billing.paidAmount,
          balance: dischargeCard.billing.balance,
          paymentStatus: dischargeCard.billing.paymentStatus,
        },
      });
    }

    // Handle full discharge card payment (existing logic)
    const amountToPay = paidAmount || dischargeCard.billing.balance;

    // Check if already paid
    if (dischargeCard.billing.paymentStatus === "paid") {
      return NextResponse.json(
        { success: false, error: "Discharge card is already paid" },
        { status: 400 },
      );
    }

    // Update payment
    dischargeCard.billing.paidAmount += amountToPay;
    dischargeCard.billing.balance =
      dischargeCard.billing.totalAmount - dischargeCard.billing.paidAmount;
    dischargeCard.billing.paymentMethod = paymentMethod;
    dischargeCard.billing.transactionId = transactionId;
    dischargeCard.billing.paymentDate = new Date();
    dischargeCard.billing.collectedBy = new mongoose.Types.ObjectId(userId);

    if (invoiceId) {
      dischargeCard.billing.invoiceId = invoiceId;
    }

    // Update payment status
    if (dischargeCard.billing.balance <= 0) {
      dischargeCard.billing.paymentStatus = "paid";
      dischargeCard.status = "paid";
    } else if (dischargeCard.billing.paidAmount > 0) {
      dischargeCard.billing.paymentStatus = "partial";
      dischargeCard.status = "billed";
    }

    await dischargeCard.save();

    return NextResponse.json({
      success: true,
      message: "Payment processed successfully",
      data: {
        dischargeId: dischargeCard.dischargeId,
        totalAmount: dischargeCard.billing.totalAmount,
        paidAmount: dischargeCard.billing.paidAmount,
        balance: dischargeCard.billing.balance,
        paymentStatus: dischargeCard.billing.paymentStatus,
      },
    });
  } catch (error: any) {
    console.error("Error processing payment:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process payment" },
      { status: 500 },
    );
  }
}

// GET - Get payment status of a discharge card
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; cardId: string }> },
) {
  try {
    const { id: patientId, cardId } = await params;

    await dbConnect();

    // Authentication
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. No token provided." },
        { status: 401 },
      );
    }

    const token = authHeader.split(" ")[1];
    const payload = await verifyToken(token);

    if (!payload) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired token." },
        { status: 401 },
      );
    }

    const userRole = payload.role as string;

    // Only doctors, admins, and receptionists can view payment status
    if (
      userRole !== "doctor" &&
      userRole !== "admin" &&
      userRole !== "receptionist"
    ) {
      return NextResponse.json(
        { success: false, error: "Forbidden. Access required." },
        { status: 403 },
      );
    }

    const dischargeCard = await DischargeCard.findOne({
      _id: cardId,
      patient: patientId,
    }).select("dischargeId billing status");

    if (!dischargeCard) {
      return NextResponse.json(
        { success: false, error: "Discharge card not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        dischargeId: dischargeCard.dischargeId,
        status: dischargeCard.status,
        billing: dischargeCard.billing,
      },
    });
  } catch (error: any) {
    console.error("Error fetching payment status:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch payment status",
      },
      { status: 500 },
    );
  }
}
