// app/api/pharmacy/discharge-cards/[cardId]/dispense/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenPayload } from "@/lib/auth/jwt";

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

    const dischargeCard = await prisma.dischargeCard.findUnique({
      where: { id: cardId },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            patientId: true,
          },
        },
      },
    });

    if (!dischargeCard) {
      return NextResponse.json(
        { error: "Discharge card not found" },
        { status: 404 },
      );
    }

    const billing = JSON.parse(dischargeCard.billing || "{}");
    if (!billing.medicinesPaid) {
      return NextResponse.json(
        {
          error:
            "Medicines have not been paid yet. Please ask reception to verify payment before dispensing.",
        },
        { status: 403 },
      );
    }

    const patientName = dischargeCard.patient?.name || "Unknown Patient";

    if (dischargeCard.pharmacyDispensingStatus === "full") {
      return NextResponse.json(
        { error: "Discharge card medicines already fully dispensed" },
        { status: 400 },
      );
    }

    // Parse medicine arrays
    const preOpMedicines = JSON.parse(dischargeCard.preOpMedicines || "[]");
    const postOpMedicines = JSON.parse(dischargeCard.postOpMedicines || "[]");
    const dischargeMedicines = JSON.parse(dischargeCard.dischargeMedicines || "[]");

    let currentPreOpDispensed = preOpMedicines.filter((m: any) => m.dispensed).length;
    let currentPostOpDispensed = postOpMedicines.filter((m: any) => m.dispensed).length;
    let currentDischargeDispensed = dischargeMedicines.filter((m: any) => m.dispensed).length;

    const processedItems: any[] = [];

    for (const item of medicinesToDispense) {
      let medicineArray: any[] = [];
      let arrayName = "";

      switch (item.type) {
        case "preOp":
          medicineArray = preOpMedicines;
          arrayName = "preOpMedicines";
          break;
        case "postOp":
          medicineArray = postOpMedicines;
          arrayName = "postOpMedicines";
          break;
        case "discharge":
          medicineArray = dischargeMedicines;
          arrayName = "dischargeMedicines";
          break;
        default:
          return NextResponse.json(
            { error: `Invalid medicine type: ${item.type}` },
            { status: 400 },
          );
      }

      if (!medicineArray[item.index]) {
        return NextResponse.json(
          {
            error: `Medicine not found at index ${item.index} in ${arrayName}`,
          },
          { status: 404 },
        );
      }

      const medicineData = medicineArray[item.index];

      if (medicineData.dispensed) {
        console.log(
          `Medicine ${medicineData.name} already dispensed, skipping`,
        );
        continue;
      }

      if (medicineData.medicineId) {
        const medicine = await prisma.medicineStock.findUnique({
          where: { id: medicineData.medicineId },
        });
        if (!medicine) {
          return NextResponse.json(
            {
              error: `Medicine stock not found: ${medicineData.name}`,
            },
            { status: 404 },
          );
        }

        if (medicine.currentQty < item.quantity) {
          return NextResponse.json(
            {
              error: `Insufficient stock for ${medicine.name}. Available: ${medicine.currentQty}, Requested: ${item.quantity}`,
            },
            { status: 400 },
          );
        }

        const oldQuantity = medicine.currentQty;
        await prisma.medicineStock.update({
          where: { id: medicine.id },
          data: { currentQty: oldQuantity - item.quantity },
        });

        console.log(
          `📉 Updated ${medicine.name} stock: ${oldQuantity} → ${oldQuantity - item.quantity}`,
        );

        await prisma.medicineIssue.create({
          data: {
            medicineId: medicine.id,
            quantity: item.quantity,
            issuedTo: patientName,
            issuedById: dispensedBy,
            prescriptionId: dischargeCard.dischargeId,
          },
        });

        console.log(`📝 Created MedicineIssue record for ${medicine.name}`);

        processedItems.push({
          medicine: medicineData.name,
          medicineId: medicine.id,
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
        processedItems.push({
          medicine: medicineData.name,
          medicineId: medicineData.medicineId || "N/A",
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

      // Mark medicine as dispensed
      medicineArray[item.index].dispensed = true;
      medicineArray[item.index].dispensedDate = new Date().toISOString();
      medicineArray[item.index].dispensedBy = dispensedBy;

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

    // Update discharge card with new medicine arrays
    await prisma.dischargeCard.update({
      where: { id: cardId },
      data: {
        preOpMedicines: JSON.stringify(preOpMedicines),
        postOpMedicines: JSON.stringify(postOpMedicines),
        dischargeMedicines: JSON.stringify(dischargeMedicines),
        pharmacyDispensingStatus: "partial", // Will update below
      },
    });

    const totalPreOp = preOpMedicines.length;
    const totalPostOp = postOpMedicines.length;
    const totalDischarge = dischargeMedicines.length;
    const totalMedicines = totalPreOp + totalPostOp + totalDischarge;

    const totalDispensed =
      currentPreOpDispensed +
      currentPostOpDispensed +
      currentDischargeDispensed;

    let newStatus: "pending" | "partial" | "full" = "pending";
    if (totalDispensed === 0) {
      newStatus = "pending";
    } else if (totalDispensed < totalMedicines) {
      newStatus = "partial";
    } else {
      newStatus = "full";
    }

    await prisma.dischargeCard.update({
      where: { id: cardId },
      data: {
        pharmacyDispensingStatus: newStatus,
        pharmacyDispensedDate: new Date(),
        pharmacyDispensedBy: dispensedBy,
      },
    });

    console.log("✅ Dispensing completed successfully. Status:", newStatus);

    return NextResponse.json({
      success: true,
      data: {
        dischargeCard: {
          id: dischargeCard.id,
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
    return NextResponse.json(
      {
        error: error.message || "Failed to dispense medicines",
      },
      { status: 500 },
    );
  }
}