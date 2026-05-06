// app/api/pharmacy/discharge-cards/[cardId]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenPayload } from "@/lib/auth/jwt";

export async function GET(
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

    console.log("Fetching discharge card:", cardId);

    const dischargeCard = await (prisma as any).dischargeCard.findUnique({
      where: { id: cardId },
      include: {
        patient: { select: { id: true, name: true, patientId: true, phone: true, guardian: true, dateOfBirth: true, gender: true } },
        doctor: { select: { id: true, name: true, specialization: true } },
      },
    });

    if (!dischargeCard) {
      return NextResponse.json(
        { error: "Discharge card not found" },
        { status: 404 },
      );
    }

    const preOpMedicines = JSON.parse(dischargeCard.preOpMedicines || "[]");
    const postOpMedicines = JSON.parse(dischargeCard.postOpMedicines || "[]");
    const dischargeMedicines = JSON.parse(dischargeCard.dischargeMedicines || "[]");
    const billing = JSON.parse(dischargeCard.billing || "{}");

    const preOpTotal = preOpMedicines.reduce((sum: number, med: any) => sum + (med.totalPrice || 0), 0) || 0;
    const postOpTotal = postOpMedicines.reduce((sum: number, med: any) => sum + (med.totalPrice || 0), 0) || 0;
    const dischargeTotal = dischargeMedicines.reduce((sum: number, med: any) => sum + (med.totalPrice || 0), 0) || 0;

    const totalMedicineCost = preOpTotal + postOpTotal + dischargeTotal;
    const totalMedicines = preOpMedicines.length + postOpMedicines.length + dischargeMedicines.length;

    const preOpDispensed = preOpMedicines.filter((m: any) => m.dispensed).length || 0;
    const postOpDispensed = postOpMedicines.filter((m: any) => m.dispensed).length || 0;
    const dischargeDispensed = dischargeMedicines.filter((m: any) => m.dispensed).length || 0;
    const totalDispensed = preOpDispensed + postOpDispensed + dischargeDispensed;

    const formattedCard = {
      id: dischargeCard.id,
      dischargeId: dischargeCard.dischargeId,
      patient: dischargeCard.patient,
      doctor: dischargeCard.doctor,
      operationName: dischargeCard.operationName,
      operationDate: dischargeCard.operationDate,
      diagnosis: dischargeCard.diagnosis,
      preOpMedicines,
      postOpMedicines,
      dischargeMedicines,
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
      pharmacyDispensingStatus: dischargeCard.pharmacyDispensingStatus || "pending",
      billing,
      status: dischargeCard.status,
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