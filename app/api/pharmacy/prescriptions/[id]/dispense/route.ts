//app/api/pharmacy/prescriptions/[id]/dispense/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenPayload } from "@/lib/auth/jwt";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const payload = await getTokenPayload(req);

    if (
      !payload ||
      !((payload.role === "pharmacist" || payload.role === "pharmacy_head") || payload.role === "admin")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: prescriptionId } = await params;
    const body = await req.json();
    const {
      dispensedBy,
      items,
      totalAmount,
      paymentMethod,
      pharmacyNotes,
      patientInstructions,
    } = body;

    if (!dispensedBy) {
      return NextResponse.json(
        { error: "dispensedBy is required" },
        { status: 400 },
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "items is required and must be a non-empty array" },
        { status: 400 },
      );
    }

    for (const item of items) {
      if (!item.medicine) {
        return NextResponse.json(
          { error: "medicine is required for each item" },
          { status: 400 },
        );
      }
      if (!item.dispensedQuantity || item.dispensedQuantity <= 0) {
        return NextResponse.json(
          { error: "dispensedQuantity is required and must be greater than 0" },
          { status: 400 },
        );
      }
      if (!item.unitPrice || item.unitPrice < 0) {
        return NextResponse.json(
          { error: "unitPrice is required and must be non-negative" },
          { status: 400 },
        );
      }
    }

    if (totalAmount === undefined || totalAmount === null || totalAmount < 0) {
      return NextResponse.json(
        { error: "totalAmount is required and must be non-negative" },
        { status: 400 },
      );
    }

    const validPaymentMethods = ["cash", "card", "insurance", "other"];
    if (paymentMethod && !validPaymentMethods.includes(paymentMethod)) {
      return NextResponse.json(
        {
          error: `paymentMethod must be one of: ${validPaymentMethods.join(", ")}`,
        },
        { status: 400 },
      );
    }

    console.log("🔄 Dispensing prescription:", prescriptionId);
    console.log("Items to dispense:", items);

    const calculatedTotal = items.reduce(
      (sum: number, item: any) => sum + item.dispensedQuantity * item.unitPrice,
      0,
    );
    if (Math.abs(calculatedTotal - totalAmount) > 0.01) {
      return NextResponse.json(
        {
          error: `totalAmount (${totalAmount}) does not match calculated total (${calculatedTotal})`,
          calculatedTotal,
          providedTotal: totalAmount,
        },
        { status: 400 },
      );
    }

    const prescription = await (prisma as any).prescription.findUnique({
      where: { id: prescriptionId },
      include: {
        patient: { select: { name: true } },
      },
    });

    if (!prescription) {
      return NextResponse.json(
        { error: "Prescription not found" },
        { status: 404 },
      );
    }

    const charges = JSON.parse(prescription.charges || "{}");
    if (!prescription.paymentVerified) {
      return NextResponse.json(
        {
          error:
            "Payment not verified. Please ask reception to verify payment before dispensing.",
          paymentStatus: charges.paymentStatus,
          requiresPaymentVerification: true,
        },
        { status: 403 },
      );
    }

    const patientName = prescription.patient?.name || "Unknown Patient";
    console.log("Patient name:", patientName);

    if (prescription.dispensingStatus === "full") {
      return NextResponse.json(
        { error: "Prescription already dispensed" },
        { status: 400 },
      );
    }

    const processedItems = [];

    for (const item of items) {
      const medicine = await (prisma as any).medicineStock.findUnique({
        where: { id: item.medicine },
      });
      if (!medicine) {
        return NextResponse.json(
          {
            error: `Medicine not found: ${item.medicine}`,
          },
          { status: 404 },
        );
      }

      if (medicine.currentQty < item.dispensedQuantity) {
        return NextResponse.json(
          {
            error: `Insufficient stock for ${medicine.name}. Available: ${medicine.currentQty}, Requested: ${item.dispensedQuantity}`,
          },
          { status: 400 },
        );
      }

      const oldQuantity = medicine.currentQty;
      await (prisma as any).medicineStock.update({
        where: { id: item.medicine },
        data: { currentQty: medicine.currentQty - item.dispensedQuantity },
      });

      console.log(
        `📉 Updated ${medicine.name} stock: ${oldQuantity} → ${medicine.currentQty - item.dispensedQuantity}`,
      );

      await (prisma as any).medicineIssue.create({
        data: {
          medicineId: medicine.id,
          quantity: item.dispensedQuantity,
          issueDate: new Date(),
          issuedTo: patientName,
          issuedById: typeof dispensedBy === "string" ? dispensedBy : dispensedBy,
          prescriptionId: prescription.prescriptionId,
        },
      });
      console.log(`📝 Created MedicineIssue record for ${medicine.name}`);

      processedItems.push({
        medicine: medicine.name,
        quantity: item.dispensedQuantity,
        form: medicine.form || "N/A",
        dosage: medicine.dosage || "N/A",
        frequency: medicine.frequency || "N/A",
        route: medicine.route || "N/A",
        unitPrice: item.unitPrice,
        total: item.dispensedQuantity * item.unitPrice,
      });
    }

    const medications = JSON.parse(prescription.medications || "[]");
    const totalDispensed = items.reduce(
      (sum: number, item: any) => sum + item.dispensedQuantity,
      0,
    );
    const totalPrescribed = medications.reduce(
      (sum: number, med: any) => sum + (med.quantity || 0),
      0,
    );

    let dispensingStatus = "pending";
    let status = prescription.status;
    if (totalDispensed === 0) {
      dispensingStatus = "pending";
    } else if (totalDispensed < totalPrescribed) {
      dispensingStatus = "partial";
      status = "active";
    } else {
      dispensingStatus = "full";
      status = "completed";
    }

    await (prisma as any).prescription.update({
      where: { id: prescriptionId },
      data: {
        dispensedById: typeof dispensedBy === "string" ? dispensedBy : dispensedBy,
        dispensedDate: new Date(),
        pharmacyNotes,
        instructions: patientInstructions || prescription.instructions,
        dispensingStatus,
        status,
      },
    });

    console.log("✅ Dispensing completed successfully");

    return NextResponse.json({
      success: true,
      data: {
        prescription: {
          id: prescription.id,
          prescriptionId: prescription.prescriptionId,
          patient: prescription.patient,
          status,
          dispensingStatus,
          dispensedDate: new Date(),
        },
        processedItems,
        summary: {
          totalAmount,
          totalDispensed,
          paymentMethod,
        },
      },
      message: "Medicines dispensed successfully",
    });
  } catch (error: any) {
    console.error("❌ Error dispensing medicines:", error);

    if (error.errors) {
      console.error("Validation errors:", error.errors);
    }

    return NextResponse.json(
      {
        error: error.message || "Failed to dispense medicines",
      },
      { status: 500 },
    );
  }
}