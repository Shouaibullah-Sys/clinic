// app/api/pharmacy/pending-discharge-cards/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenPayload } from "@/lib/auth/jwt";

export async function GET(req: NextRequest) {
  const payload = await getTokenPayload(req);

  if (
    !payload ||
    !((payload.role === "pharmacist" || payload.role === "pharmacy_head") || payload.role === "admin")
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const search = searchParams.get("search") || "";
    const skip = (page - 1) * limit;

    const where: any = {
      billingMedicinesPaid: true,
      pharmacyDispensingStatus: { in: ["pending", "partial", null] },
      status: { notIn: ["cancelled", "draft"] },
    };

    if (search) {
      where.OR = [
        { patient: { name: { contains: search, mode: "insensitive" } } },
        { patient: { patientId: { contains: search, mode: "insensitive" } } },
      ];
    }

    const dischargeCards = await (prisma as any).dischargeCard.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        patient: {
          select: { id: true, name: true, patientId: true, phone: true },
        },
        doctor: {
          select: { id: true, name: true, specialization: true },
        },
      },
    });

    const total = await (prisma as any).dischargeCard.count({ where });

    const cardsWithTotals = dischargeCards.map((card: any) => {
      const billing = JSON.parse(card.billing || "{}");
      const preOpMedicines = JSON.parse(card.preOpMedicines || "[]");
      const postOpMedicines = JSON.parse(card.postOpMedicines || "[]");
      const dischargeMedicines = JSON.parse(card.dischargeMedicines || "[]");

      const preOpTotal = preOpMedicines.reduce((sum: number, med: any) => sum + (med.totalPrice || 0), 0) || 0;
      const postOpTotal = postOpMedicines.reduce((sum: number, med: any) => sum + (med.totalPrice || 0), 0) || 0;
      const dischargeTotal = dischargeMedicines.reduce((sum: number, med: any) => sum + (med.totalPrice || 0), 0) || 0;

      const totalMedicineCost = preOpTotal + postOpTotal + dischargeTotal;
      const totalMedicines = preOpMedicines.length + postOpMedicines.length + dischargeMedicines.length;

      const preOpDispensed = preOpMedicines.filter((m: any) => m.dispensed).length || 0;
      const postOpDispensed = postOpMedicines.filter((m: any) => m.dispensed).length || 0;
      const dischargeDispensed = dischargeMedicines.filter((m: any) => m.dispensed).length || 0;
      const totalDispensed = preOpDispensed + postOpDispensed + dischargeDispensed;

      return {
        id: card.id,
        dischargeId: card.dischargeId,
        patient: card.patient,
        doctor: card.doctor,
        operationName: card.operationName,
        operationDate: card.operationDate,
        diagnosis: card.diagnosis,
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
        pharmacyDispensingStatus: card.pharmacyDispensingStatus || "pending",
        status: card.status,
        createdAt: card.createdAt,
      };
    });

    const pendingCards = cardsWithTotals.filter(
      (card: any) => card.remainingMedicines > 0,
    );

    return NextResponse.json({
      success: true,
      data: pendingCards,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("Error fetching pending discharge cards:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch pending discharge cards",
        data: [],
      },
      { status: 500 },
    );
  }
}