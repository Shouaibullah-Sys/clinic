import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { Prescription } from "@/lib/models/Prescription";
import { MedicineStock } from "@/lib/models/MedicineStock";
import { getTokenPayload } from "@/lib/auth/jwt";

export async function GET(req: NextRequest) {
  await dbConnect();
  const payload = await getTokenPayload(req);

  if (!payload || !((payload.role === "pharmacist" || payload.role === "pharmacy_head") || payload.role === "admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    // Get pending prescriptions
    const pendingPrescriptions = await Prescription.countDocuments({
      status: { $in: ["active", "pending"] },
      dispensingStatus: { $in: ["pending", "partial"] }
    });

    // Get low stock medicines
    const lowStockMedicines = await MedicineStock.countDocuments({
      currentQuantity: { $lt: 10 } // Assuming minimum stock is 10
    });

    // Get dispensed today
    const dispensedToday = await Prescription.countDocuments({
      dispensingStatus: "full",
      dispensedDate: {
        $gte: startOfDay,
        $lt: endOfDay
      }
    });

    // Get today's revenue
    const prescriptionsToday = await Prescription.find({
      dispensingStatus: "full",
      dispensedDate: {
        $gte: startOfDay,
        $lt: endOfDay
      }
    }).populate("medications.medicine", "sellingPrice");

    const totalRevenue = prescriptionsToday.reduce((total: number, prescription: any) => {
      const prescriptionTotal = prescription.medications.reduce((medTotal: number, med: any) => {
        return medTotal + (med.quantity * (med.medicine?.sellingPrice || 0));
      }, 0);
      return total + prescriptionTotal;
    }, 0);

    // Get active patients (patients with prescriptions in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const activePatients = await Prescription.distinct("patient", {
      prescribedDate: { $gte: thirtyDaysAgo }
    });

    return NextResponse.json({
      success: true,
      data: {
        pendingPrescriptions,
        lowStockMedicines,
        dispensedToday,
        totalRevenue: Math.round(totalRevenue),
        activePatients: activePatients.length
      }
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard stats" },
      { status: 500 }
    );
  }
}