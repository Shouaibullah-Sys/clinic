// app/api/pharmacy/pending-prescriptions/route.ts - ENHANCED
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import "@/lib/models"; // Import all models to ensure they are registered
import { Prescription } from "@/lib/models/Prescription";
import { Patient } from "@/lib/models/Patient";
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
    const status = searchParams.get("status") || "pending";
    const search = searchParams.get("search") || "";
    const skip = (page - 1) * limit;

    // Build query for pending prescriptions
    let query: any = {
      status: { $in: ["active", "pending"] }, // Include both active and pending statuses
      dispensingStatus: status, // pending, partial, etc.
      paymentVerified: true, // Only return prescriptions with verified payment
    };

    // Optional search with multiple fields
    if (search) {
      query.$or = [
        { prescriptionId: { $regex: search, $options: "i" } },
        { diagnosis: { $regex: search, $options: "i" } },
      ];
    }

    const prescriptions = await Prescription.find(query)
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
        match: search ? { name: { $regex: search, $options: "i" } } : {},
      })
      .populate({
        path: "medications.medicine",
        select:
          "name form dosage frequency route currentQuantity sellingPrice unitPrice",
        model: "MedicineStock",
      })
      .select(
        "prescriptionId patient doctor medications diagnosis notes instructions prescribedDate expiryDate status dispensingStatus",
      )
      .sort({ prescribedDate: -1 })
      .skip(skip)
      .limit(limit);

    // Filter out prescriptions where patient wasn't found (if searching)
    const filteredPrescriptions = search
      ? prescriptions.filter((p) => p.patient && p.doctor)
      : prescriptions;

    const total = await Prescription.countDocuments(query);

    return NextResponse.json({
      success: true,
      data: filteredPrescriptions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("Error fetching pending prescriptions:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch pending prescriptions",
        data: [],
      },
      { status: 500 },
    );
  }
}
