// app/api/pharmacy/discharge-cards/[cardId]/dispense/route.ts

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { DischargeCard } from "@/lib/models/DischargeCard";
import { MedicineStock } from "@/lib/models/MedicineStock";
import { MedicineIssue } from "@/lib/models/MedicineIssue";
import { getTokenPayload } from "@/lib/auth/jwt";
import mongoose from "mongoose";

interface MedicineToDispense {
  medicineId: string;
  quantity: number;
  type: "preOp" | "postOp" | "discharge";
  index: number;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ cardId: string }> },
) {
  try {
    await dbConnect();
    const payload = await getTokenPayload(req);

    if (
      !payload ||
      !((payload.role === "pharmacist" || payload.role === "pharmacy_head") || payload.role === "admin")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { cardId } = await params;
    const body = await req.json();
    const { medicinesToDispense, dispensedBy } = body as {
      medicinesToDispense: MedicineToDispense[];
      dispensedBy: string;
    };

    // Validate required fields
    if (!dispensedBy) {
      return NextResponse.json(
        { error: "dispensedBy is required" },
        { status: 400 },
      );
    }

    if (
      !medicinesToDispense ||
      !Array.isArray(medicinesToDispense) ||
      medicinesToDispense.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "medicinesToDispense is required and must be a non-empty array",
        },
        { status: 400 },
      );
    }

    console.log("🔄 Dispensing discharge card:", cardId);
    console.log("Items to dispense:", medicinesToDispense);

    // Find discharge card with patient populated
    const dischargeCard = await DischargeCard.findById(cardId)
      .populate("patient", "name patientId")
      .populate("doctor", "name");

    if (!dischargeCard) {
      return NextResponse.json(
        { error: "Discharge card not found" },
        { status: 404 },
      );
    }

    // Check if medicines have been paid
    if (!dischargeCard.billing?.medicinesPaid) {
      return NextResponse.json(
        {
          error:
            "Medicines have not been paid yet. Please ask reception to verify payment before dispensing.",
        },
        { status: 403 },
      );
    }

    // Get patient name
    const patientName =
      (dischargeCard.patient as any)?.name || "Unknown Patient";
    console.log("Patient name:", patientName);

    // Check if already fully dispensed
    if (dischargeCard.pharmacyDispensingStatus === "full") {
      return NextResponse.json(
        { error: "Discharge card medicines already fully dispensed" },
        { status: 400 },
      );
    }

    // Get the current dispensing status
    let currentPreOpDispensed =
      dischargeCard.preOpMedicines?.filter((m) => m.dispensed).length || 0;
    let currentPostOpDispensed =
      dischargeCard.postOpMedicines?.filter((m) => m.dispensed).length || 0;
    let currentDischargeDispensed =
      dischargeCard.dischargeMedicines?.filter((m) => m.dispensed).length || 0;

    const processedItems: any[] = [];
    const dispensedByObjId =
      typeof dispensedBy === "string"
        ? new mongoose.Types.ObjectId(dispensedBy)
        : dispensedBy;

    // Process each medicine to dispense
    for (const item of medicinesToDispense) {
      let medicineArray: any[] = [];
      let arrayName = "";

      // Get the correct medicine array based on type
      switch (item.type) {
        case "preOp":
          medicineArray = dischargeCard.preOpMedicines || [];
          arrayName = "preOpMedicines";
          break;
        case "postOp":
          medicineArray = dischargeCard.postOpMedicines || [];
          arrayName = "postOpMedicines";
          break;
        case "discharge":
          medicineArray = dischargeCard.dischargeMedicines || [];
          arrayName = "dischargeMedicines";
          break;
        default:
          return NextResponse.json(
            { error: `Invalid medicine type: ${item.type}` },
            { status: 400 },
          );
      }

      // Check if the medicine exists at the given index
      if (!medicineArray[item.index]) {
        return NextResponse.json(
          {
            error: `Medicine not found at index ${item.index} in ${arrayName}`,
          },
          { status: 404 },
        );
      }

      const medicineData = medicineArray[item.index];

      // Check if already dispensed
      if (medicineData.dispensed) {
        console.log(
          `Medicine ${medicineData.name} already dispensed, skipping`,
        );
        continue;
      }

      // If medicine has a stock reference, update stock
      if (medicineData.medicine) {
        const medicine = await MedicineStock.findById(medicineData.medicine);
        if (!medicine) {
          return NextResponse.json(
            {
              error: `Medicine stock not found: ${medicineData.name}`,
            },
            { status: 404 },
          );
        }

        // Validate stock
        if (medicine.currentQuantity < item.quantity) {
          return NextResponse.json(
            {
              error: `Insufficient stock for ${medicine.name}. Available: ${medicine.currentQuantity}, Requested: ${item.quantity}`,
            },
            { status: 400 },
          );
        }

        // Update stock quantity
        const oldQuantity = medicine.currentQuantity;
        medicine.currentQuantity -= item.quantity;
        await medicine.save();

        console.log(
          `📉 Updated ${medicine.name} stock: ${oldQuantity} → ${medicine.currentQuantity}`,
        );

        // Create medicine issue record
        const medicineIssue = new MedicineIssue({
          medicineId: medicine._id,
          quantity: item.quantity,
          issueDate: new Date(),
          issuedTo: patientName,
          issuedBy: dispensedBy,
          prescriptionId: dischargeCard.dischargeId,
        });

        await medicineIssue.save();
        console.log(`📝 Created MedicineIssue record for ${medicine.name}`);

        processedItems.push({
          medicine: medicineData.name,
          medicineId: medicine._id.toString(),
          quantity: item.quantity,
          type: item.type,
          form: medicine.form || "N/A",
          dosage: medicine.dosage || "N/A",
          frequency: medicine.frequency || "N/A",
          route: medicine.route || "N/A",
          unitPrice: medicineData.unitPrice,
          total: item.quantity * medicineData.unitPrice,
        });
      } else {
        // Medicine without stock reference (legacy data)
        processedItems.push({
          medicine: medicineData.name,
          medicineId: medicineData.medicine?.toString() || "N/A",
          quantity: item.quantity,
          type: item.type,
          form: "N/A",
          dosage: "N/A",
          frequency: "N/A",
          route: "N/A",
          unitPrice: medicineData.unitPrice,
          total: item.quantity * medicineData.unitPrice,
        });
      }

      // Mark the medicine as dispensed in the discharge card
      const updateField = `${arrayName}.${item.index}.dispensed`;
      const updateDateField = `${arrayName}.${item.index}.dispensedDate`;
      const updateByField = `${arrayName}.${item.index}.dispensedBy`;

      await DischargeCard.updateOne(
        { _id: cardId },
        {
          $set: {
            [updateField]: true,
            [updateDateField]: new Date(),
            [updateByField]: dispensedByObjId,
          },
        },
      );

      // Update counter
      switch (item.type) {
        case "preOp":
          currentPreOpDispensed++;
          break;
        case "postOp":
          currentPostOpDispensed++;
          break;
        case "discharge":
          currentDischargeDispensed++;
          break;
      }
    }

    // Calculate totals for the discharge card
    const totalPreOp = dischargeCard.preOpMedicines?.length || 0;
    const totalPostOp = dischargeCard.postOpMedicines?.length || 0;
    const totalDischarge = dischargeCard.dischargeMedicines?.length || 0;
    const totalMedicines = totalPreOp + totalPostOp + totalDischarge;

    const totalDispensed =
      currentPreOpDispensed +
      currentPostOpDispensed +
      currentDischargeDispensed;

    // Determine new dispensing status
    let newStatus: "pending" | "partial" | "full" = "pending";
    if (totalDispensed === 0) {
      newStatus = "pending";
    } else if (totalDispensed < totalMedicines) {
      newStatus = "partial";
    } else {
      newStatus = "full";
    }

    // Update discharge card dispensing status
    await DischargeCard.updateOne(
      { _id: cardId },
      {
        $set: {
          pharmacyDispensingStatus: newStatus,
          pharmacyDispensedDate: new Date(),
          pharmacyDispensedBy: dispensedByObjId,
        },
      },
    );

    console.log("✅ Dispensing completed successfully. Status:", newStatus);

    return NextResponse.json({
      success: true,
      data: {
        dischargeCard: {
          _id: dischargeCard._id,
          dischargeId: dischargeCard.dischargeId,
          patient: dischargeCard.patient,
          pharmacyDispensingStatus: newStatus,
          pharmacyDispensedDate: new Date(),
        },
        processedItems,
        summary: {
          totalMedicines,
          totalDispensed,
          remainingMedicines: totalMedicines - totalDispensed,
          preOpDispensed: currentPreOpDispensed,
          postOpDispensed: currentPostOpDispensed,
          dischargeDispensed: currentDischargeDispensed,
        },
      },
      message: "Medicines dispensed successfully",
    });
  } catch (error: any) {
    console.error("❌ Error dispensing discharge card medicines:", error);

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
