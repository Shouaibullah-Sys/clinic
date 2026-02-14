// app/api/pharmacy/pending-discharge-cards/route.ts
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import "@/lib/models"; // Import all models to ensure they are registered
import { DischargeCard } from "@/lib/models/DischargeCard";
import { getTokenPayload } from "@/lib/auth/jwt";

export async function GET(req: NextRequest) {
  await dbConnect();
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

    // Build query for discharge cards with medicines ready for pharmacy dispensing
    let query: any = {
      "billing.medicinesPaid": true, // Only show paid discharge medicines
      $or: [
        { pharmacyDispensingStatus: { $exists: false } },
        { pharmacyDispensingStatus: null },
        { pharmacyDispensingStatus: "pending" },
        { pharmacyDispensingStatus: "partial" },
      ],
      $and: [
        {
          $or: [
            { "preOpMedicines.0": { $exists: true } },
            { "postOpMedicines.0": { $exists: true } },
            { "dischargeMedicines.0": { $exists: true } },
          ],
        },
      ],
      status: { $nin: ["cancelled", "draft"] },
    };

    console.log("Query for pending discharge cards:", query);

    // Fetch discharge cards with patient and doctor populated
    const dischargeCards = await DischargeCard.find(query)
      .populate({
        path: "patient",
        select: "name patientId phone",
        match: search
          ? {
              $or: [
                { name: { $regex: search, $options: "i" } },
                { patientId: { $regex: search, $options: "i" } },
              ],
            }
          : {},
      })
      .populate({
        path: "doctor",
        select: "name specialization",
      })
      .populate({
        path: "preOpMedicines.medicine",
        select: "name form dosage frequency route currentQuantity sellingPrice",
        model: "MedicineStock",
      })
      .populate({
        path: "postOpMedicines.medicine",
        select: "name form dosage frequency route currentQuantity sellingPrice",
        model: "MedicineStock",
      })
      .populate({
        path: "dischargeMedicines.medicine",
        select: "name form dosage frequency route currentQuantity sellingPrice",
        model: "MedicineStock",
      })
      .select(
        "dischargeId patient doctor operationName operationDate diagnosis preOpMedicines postOpMedicines dischargeMedicines billing pharmacyDispensingStatus status createdAt",
      )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Filter out cards where patient wasn't found (if searching)
    const filteredCards = search
      ? dischargeCards.filter((card) => card.patient && card.doctor)
      : dischargeCards;

    // Calculate totals for each card
    const cardsWithTotals = filteredCards.map((card) => {
      const preOpTotal =
        card.preOpMedicines?.reduce(
          (sum: number, med: any) => sum + (med.totalPrice || 0),
          0,
        ) || 0;
      const postOpTotal =
        card.postOpMedicines?.reduce(
          (sum: number, med: any) => sum + (med.totalPrice || 0),
          0,
        ) || 0;
      const dischargeTotal =
        card.dischargeMedicines?.reduce(
          (sum: number, med: any) => sum + (med.totalPrice || 0),
          0,
        ) || 0;

      const totalMedicineCost = preOpTotal + postOpTotal + dischargeTotal;
      const totalMedicines =
        (card.preOpMedicines?.length || 0) +
        (card.postOpMedicines?.length || 0) +
        (card.dischargeMedicines?.length || 0);

      // Count dispensed medicines
      const preOpDispensed =
        card.preOpMedicines?.filter((m: any) => m.dispensed).length || 0;
      const postOpDispensed =
        card.postOpMedicines?.filter((m: any) => m.dispensed).length || 0;
      const dischargeDispensed =
        card.dischargeMedicines?.filter((m: any) => m.dispensed).length || 0;
      const totalDispensed =
        preOpDispensed + postOpDispensed + dischargeDispensed;

      return {
        _id: card._id,
        dischargeId: card.dischargeId,
        patient: card.patient,
        doctor: card.doctor,
        operationName: card.operationName,
        operationDate: card.operationDate,
        diagnosis: card.diagnosis,
        preOpMedicines: card.preOpMedicines || [],
        postOpMedicines: card.postOpMedicines || [],
        dischargeMedicines: card.dischargeMedicines || [],
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

    // Filter to show only cards with remaining medicines to dispense
    const pendingCards = cardsWithTotals.filter(
      (card) => card.remainingMedicines > 0,
    );

    const total = await DischargeCard.countDocuments(query);

    console.log(
      `Found ${pendingCards.length} discharge cards with medicines to dispense`,
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
