// app/api/pharmacy/prescriptions/[id]/edit/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenPayload } from "@/lib/auth/jwt";

// GET /api/pharmacy/prescriptions/[id]/edit
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const payload = await getTokenPayload(req);

    // Check authorization - only pharmacist or admin
    if (
      !payload ||
      !((payload.role === "pharmacist" || payload.role === "pharmacy_head") || payload.role === "admin")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: prescriptionId } = await params;

    // Find prescription with populated references
    const prescription = await prisma.prescription.findUnique({
      where: { id: prescriptionId },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            patientId: true,
            phone: true,
            guardian: true,
          },
        },
        doctor: {
          select: {
            id: true,
            name: true,
            specialization: true,
          },
        },
      },
    });

    if (!prescription) {
      return NextResponse.json(
        { error: "Prescription not found" },
        { status: 404 },
      );
    }

    // Parse medications and calculate totals
    const medications = JSON.parse(prescription.medications || "[]");
    const medicationsWithTotals = medications.map((med: any) => ({
      ...med,
      totalPrice: med.price * med.quantity,
    }));

    return NextResponse.json({
      success: true,
      data: {
        ...prescription,
        medications: medicationsWithTotals,
      },
    });
  } catch (error: any) {
    console.error("Error fetching prescription:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch prescription",
      },
      { status: 500 },
    );
  }
}

// PUT /api/pharmacy/prescriptions/[id]/edit
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const payload = await getTokenPayload(req);

    // Check authorization - only pharmacist or admin
    if (
      !payload ||
      !((payload.role === "pharmacist" || payload.role === "pharmacy_head") || payload.role === "admin")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: prescriptionId } = await params;
    const body = await req.json();
    const { medications, finalize } = body;

    // Find the prescription
    const prescription = await prisma.prescription.findUnique({
      where: { id: prescriptionId },
    });

    if (!prescription) {
      return NextResponse.json(
        { error: "Prescription not found" },
        { status: 404 },
      );
    }

    // Parse current medications
    const currentMedications = JSON.parse(prescription.medications || "[]");
    
    // Check if prescription is in a valid state for editing
    if (
      prescription.status === "cancelled" ||
      prescription.status === "expired"
    ) {
      return NextResponse.json(
        { error: "Cannot edit a cancelled or expired prescription" },
        { status: 400 },
      );
    }

    // Check if already fully dispensed
    if (prescription.dispensingStatus === "full") {
      return NextResponse.json(
        { error: "Cannot edit a fully dispensed prescription" },
        { status: 400 },
      );
    }

    let updated = false;
    let priceChanges: { index: number; oldPrice: number; newPrice: number }[] =
      [];

    // Update medication prices if provided
    if (medications && Array.isArray(medications) && medications.length > 0) {
      for (const medUpdate of medications) {
        const { index, price } = medUpdate;

        if (index < 0 || index >= currentMedications.length) {
          return NextResponse.json(
            { error: `Invalid medication index: ${index}` },
            { status: 400 },
          );
        }

        if (price !== undefined && price >= 0) {
          const oldPrice = currentMedications[index].price;
          if (oldPrice !== price) {
            priceChanges.push({ index, oldPrice, newPrice: price });
          }
          currentMedications[index].price = price;
          updated = true;
        }
      }

      if (priceChanges.length > 0) {
        console.log("Price changes:", priceChanges);
      }
    }

    // Finalize prescription if requested
    if (finalize === true) {
      // Check if already finalized
      if (prescription.pricingFinalized === true) {
        return NextResponse.json(
          { error: "Prescription prices already finalized" },
          { status: 400 },
        );
      }

      // Validate all medications have prices
      for (let i = 0; i < currentMedications.length; i++) {
        if (
          currentMedications[i].price === undefined ||
          currentMedications[i].price === null
        ) {
          return NextResponse.json(
            {
              error: `Medication "${currentMedications[i].name}" does not have a price set`,
              medicationIndex: i,
            },
            { status: 400 },
          );
        }
      }

      // Calculate charges from updated medications
      const charges = JSON.parse(prescription.charges || "{}");
      const basePrice = currentMedications.reduce(
        (sum: number, med: any) => sum + med.price * med.quantity,
        0,
      );

      // Apply current charges
      const totalAmount =
        basePrice +
        (charges.tax || 0) +
        (charges.otherCharges || 0) -
        (charges.discount || 0);

      // Update charges
      const updatedCharges = {
        ...charges,
        basePrice,
        totalAmount,
        due: Math.max(0, totalAmount - (charges.paid || 0)),
      };

      // Update payment status based on charges
      let newPaymentStatus = updatedCharges.paymentStatus || "unpaid";
      if (updatedCharges.due === 0 && totalAmount > 0) {
        updatedCharges.paymentStatus = "paid";
        newPaymentStatus = "verified";
      } else if (updatedCharges.paid > 0) {
        updatedCharges.paymentStatus = "partial";
        newPaymentStatus = "partial";
      } else {
        updatedCharges.paymentStatus = "unpaid";
        newPaymentStatus = "unpaid";
      }

      await prisma.prescription.update({
        where: { id: prescriptionId },
        data: {
          medications: JSON.stringify(currentMedications),
          charges: JSON.stringify(updatedCharges),
          pricingFinalized: true,
          pricingFinalizedById: payload.id,
          pricingFinalizedAt: new Date(),
          paymentStatus: newPaymentStatus,
        },
      });

      // Fetch updated prescription
      const updatedPrescription = await prisma.prescription.findUnique({
        where: { id: prescriptionId },
        include: {
          patient: {
            select: {
              id: true,
              name: true,
              patientId: true,
              phone: true,
              guardian: true,
            },
          },
          doctor: {
            select: {
              id: true,
              name: true,
              specialization: true,
            },
          },
        },
      });

      // Calculate medication totals for response
      const updatedMedications = JSON.parse(updatedPrescription!.medications || "[]");
      const medicationsWithTotals = updatedMedications.map((med: any) => ({
        ...med,
        totalPrice: med.price * med.quantity,
      }));

      return NextResponse.json({
        success: true,
        data: {
          ...updatedPrescription,
          medications: medicationsWithTotals,
        },
        message: "Prescription finalized successfully",
      });
    }

    // Save the updated prescription
    if (updated) {
      await prisma.prescription.update({
        where: { id: prescriptionId },
        data: {
          medications: JSON.stringify(currentMedications),
        },
      });
    }

    // Fetch updated prescription
    const updatedPrescription = await prisma.prescription.findUnique({
      where: { id: prescriptionId },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            patientId: true,
            phone: true,
            guardian: true,
          },
        },
        doctor: {
          select: {
            id: true,
            name: true,
            specialization: true,
          },
        },
      },
    });

    // Calculate medication totals for response
    const updatedMedications = JSON.parse(updatedPrescription!.medications || "[]");
    const medicationsWithTotals = updatedMedications.map((med: any) => ({
      ...med,
      totalPrice: med.price * med.quantity,
    }));

    return NextResponse.json({
      success: true,
      data: {
        ...updatedPrescription,
        medications: medicationsWithTotals,
      },
      message: "Prescription updated successfully",
    });
  } catch (error: any) {
    console.error("Error updating prescription:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to update prescription",
      },
      { status: 500 },
    );
  }
}