import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenPayload } from "@/lib/auth/jwt";

export async function GET(req: NextRequest) {
  const payload = await getTokenPayload(req);

  if (
    !payload ||
    !(payload.role === "admin" || (payload.role === "pharmacist" || payload.role === "pharmacy_head"))
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const inventory = await prisma.medicineStock.findMany({
      orderBy: { medicineId: "asc" },
    });

    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);

    const enhancedInventory = inventory.map((item) => {
      const remainingPercentage = item.totalQty > 0
        ? (item.currentQty / item.totalQty) * 100
        : 0;
      const expiryDate = item.expiryDate ? new Date(item.expiryDate) : null;

      let expiryStatus: "valid" | "expiring-soon" | "expired" = "valid";
      if (expiryDate && expiryDate < now) {
        expiryStatus = "expired";
      } else if (expiryDate && expiryDate <= thirtyDaysFromNow) {
        expiryStatus = "expiring-soon";
      }

      return {
        ...item,
        remainingPercentage,
        expiryStatus,
      };
    });

    return NextResponse.json(enhancedInventory);
  } catch (error) {
    console.error("Error fetching inventory:", error);
    return NextResponse.json(
      { error: "Failed to fetch inventory" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  const payload = await getTokenPayload(req);

  if (
    !payload ||
    !(payload.role === "admin" || (payload.role === "pharmacist" || payload.role === "pharmacy_head"))
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();

    const newItem = await prisma.medicineStock.create({
      data: {
        medicineId: body.medicineId,
        batchNo: body.batchNo,
        warehouseBatchId: body.warehouseBatchId,
        expiryDate: body.expiryDate ? new Date(body.expiryDate) : null,
        inwardQty: body.inwardQty,
        outwardQty: body.outwardQty || 0,
        returnQty: body.returnQty || 0,
        damageQty: body.damageQty || 0,
        costPrice: body.costPrice,
        sellPrice: body.sellPrice,
        MRP: body.MRP,
        totalQty: body.totalQty || body.inwardQty,
        currentQty: body.currentQty || body.inwardQty,
        name: body.name,
        form: body.form,
        dosage: body.dosage,
        frequency: body.frequency,
        route: body.route,
      },
    });
    return NextResponse.json(newItem, { status: 201 });
  } catch (error) {
    console.error("Error creating inventory item:", error);
    return NextResponse.json(
      { error: "Failed to create inventory item" },
      { status: 500 },
    );
  }
}