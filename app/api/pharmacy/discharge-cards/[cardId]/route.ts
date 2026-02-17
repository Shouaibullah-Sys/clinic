// app/api/pharmacy/discharge-cards/[cardId]/route.ts

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { DischargeCard } from "@/lib/models/DischargeCard";
import { getTokenPayload } from "@/lib/auth/jwt";

export async function GET(
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

    console.log("Fetching discharge card:", cardId);

    // Find discharge card with patient and doctor populated
    const dischargeCard = await DischargeCard.findById(cardId)
      .populate("patient", "name patientId phone guardian dateOfBirth gender")
      .populate("doctor", "name specialization")
      .populate(
        "preOpMedicines.medicine",
        "name form dosage frequency route currentQuantity sellingPrice expiryDate",
      )
      .populate(
        "postOpMedicines.medicine",
        "name form dosage frequency route currentQuantity sellingPrice expiryDate",
      )
      .populate(
        "dischargeMedicines.medicine",
        "name form dosage frequency route currentQuantity sellingPrice expiryDate",
      );

    if (!dischargeCard) {
      return NextResponse.json(
        { error: "Discharge card not found" },
        { status: 404 },
      );
    }

    // Calculate totals
    const preOpTotal =
      dischargeCard.preOpMedicines?.reduce(
        (sum: number, med: any) => sum + (med.totalPrice || 0),
        0,
      ) || 0;
    const postOpTotal =
      dischargeCard.postOpMedicines?.reduce(
        (sum: number, med: any) => sum + (med.totalPrice || 0),
        0,
      ) || 0;
    const dischargeTotal =
      dischargeCard.dischargeMedicines?.reduce(
        (sum: number, med: any) => sum + (med.totalPrice || 0),
        0,
      ) || 0;

    const totalMedicineCost = preOpTotal + postOpTotal + dischargeTotal;
    const totalMedicines =
      (dischargeCard.preOpMedicines?.length || 0) +
      (dischargeCard.postOpMedicines?.length || 0) +
      (dischargeCard.dischargeMedicines?.length || 0);

    // Count dispensed medicines
    const preOpDispensed =
      dischargeCard.preOpMedicines?.filter((m: any) => m.dispensed).length || 0;
    const postOpDispensed =
      dischargeCard.postOpMedicines?.filter((m: any) => m.dispensed).length ||
      0;
    const dischargeDispensed =
      dischargeCard.dischargeMedicines?.filter((m: any) => m.dispensed)
        .length || 0;
    const totalDispensed =
      preOpDispensed + postOpDispensed + dischargeDispensed;

    // Format the response
    const formattedCard = {
      _id: dischargeCard._id,
      dischargeId: dischargeCard.dischargeId,
      patient: dischargeCard.patient,
      doctor: dischargeCard.doctor,
      operationName: dischargeCard.operationName,
      operationDate: dischargeCard.operationDate,
      operationType: dischargeCard.operationType,
      diagnosis: dischargeCard.diagnosis,
      admissionDate: dischargeCard.admissionDate,
      dischargeDate: dischargeCard.dischargeDate,
      totalDays: dischargeCard.totalDays,
      preOpMedicines: dischargeCard.preOpMedicines || [],
      postOpMedicines: dischargeCard.postOpMedicines || [],
      dischargeMedicines: dischargeCard.dischargeMedicines || [],
      preOpTotal,
      postOpTotal,
      dischargeTotal,
      totalMedicineCost,
      totalMedicines,
      totalDispensed,
      remainingMedicines: totalMedicines - totalDispensed,
      preOpDispensed,
      postOpDispensed,
      dischargeDispensed,
      pharmacyDispensingStatus:
        dischargeCard.pharmacyDispensingStatus || "pending",
      billing: dischargeCard.billing,
      status: dischargeCard.status,
      dischargeInstructions: dischargeCard.dischargeInstructions,
      followUpDate: dischargeCard.followUpDate,
      followUpInstructions: dischargeCard.followUpInstructions,
      createdAt: dischargeCard.createdAt,
    };

    return NextResponse.json({
      success: true,
      data: formattedCard,
    });
  } catch (error: any) {
    console.error("Error fetching discharge card:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch discharge card",
      },
      { status: 500 },
    );
  }
}
