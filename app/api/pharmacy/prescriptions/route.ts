// app/api/pharmacy/prescriptions/route.ts - UPDATED for PharmacySale
import { NextRequest, NextResponse } from "next/server";
import PharmacySale from "@/lib/models/PharmacySale";
import { MedicineStock } from "@/lib/models/MedicineStock";
import dbConnect from "@/lib/dbConnect";
import { getTokenPayload } from "@/lib/auth/jwt";
import { z } from "zod";

const PharmacySaleSchema = z.object({
  customerName: z.string().min(2),
  customerPhone: z.string().min(10),
  invoiceNumber: z.string().min(1),
  items: z.array(
    z.object({
      medicine: z.string(),
      name: z.string(),
      quantity: z.number().min(1),
      discount: z.number().min(0).max(100).default(0),
      unitPrice: z.number().min(0),
    }),
  ),
  totalAmount: z.number().min(0),
  amountPaid: z.number().min(0),
  paymentMethod: z.enum(["cash", "card", "insurance"]).default("cash"),
  status: z.enum(["pending", "completed", "cancelled"]).default("pending"),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  await dbConnect();
  const payload = await getTokenPayload(req);

  if (
    !payload ||
    !(payload.role === "pharmacist" || payload.role === "admin")
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    const search = searchParams.get("search") || "";
    const skip = (page - 1) * limit;

    // Build query for search functionality
    let query = {};
    if (search) {
      query = {
        $or: [
          { invoiceNumber: { $regex: search, $options: "i" } },
          { customerName: { $regex: search, $options: "i" } },
          { customerPhone: { $regex: search, $options: "i" } },
          { saleId: { $regex: search, $options: "i" } },
        ],
      };
    }

    // Use regular query with pagination for better TypeScript compatibility
    const sales = await PharmacySale.find(query)
      .populate({
        path: "items.medicine",
        select:
          "name form dosage frequency route currentQuantity sellingPrice unitPrice",
        model: "MedicineStock", // Explicitly specify the model
      })
      .populate("soldBy", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Get total count for pagination
    const total = await PharmacySale.countDocuments(query);

    return NextResponse.json(
      {
        success: true,
        data: sales,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Failed to fetch pharmacy sales:", error);
    return NextResponse.json(
      { error: "Failed to fetch pharmacy sales" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  await dbConnect();
  const payload = await getTokenPayload(req);

  if (
    !payload ||
    !(payload.role === "pharmacist" || payload.role === "admin")
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const validation = PharmacySaleSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    // Calculate subtotal and process each medication
    let subtotal = 0;
    const processedItems = [];

    for (const item of validation.data.items) {
      const medicine = await MedicineStock.findById(item.medicine);
      if (!medicine) {
        return NextResponse.json(
          { error: `Medicine not found: ${item.medicine}` },
          { status: 404 },
        );
      }

      if (medicine.currentQuantity < item.quantity) {
        return NextResponse.json(
          { error: `Insufficient stock for ${medicine.name}` },
          { status: 400 },
        );
      }

      // Calculate item total price with discount
      const itemTotal =
        item.unitPrice * item.quantity * (1 - item.discount / 100);
      subtotal += itemTotal;

      processedItems.push({
        medicine: item.medicine,
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount,
        totalPrice: itemTotal,
      });
    }

    // Calculate balance
    const balance = validation.data.totalAmount - validation.data.amountPaid;

    // Determine payment status
    let paymentStatus: "pending" | "partial" | "paid" = "pending";
    if (validation.data.amountPaid >= validation.data.totalAmount) {
      paymentStatus = "paid";
    } else if (validation.data.amountPaid > 0) {
      paymentStatus = "partial";
    }

    // Generate saleId explicitly (guaranteed to run)
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    const random = Math.floor(1000 + Math.random() * 9000);
    const saleId = `SALES${year}${month}${day}${random}`;

    // Create pharmacy sale
    const newSale = await PharmacySale.create({
      saleId, // Explicitly set saleId
      customerName: validation.data.customerName,
      customerPhone: validation.data.customerPhone,
      invoiceNumber: validation.data.invoiceNumber,
      items: processedItems,
      subtotal: subtotal,
      totalAmount: validation.data.totalAmount,
      amountPaid: validation.data.amountPaid,
      balance: balance,
      paymentMethod: validation.data.paymentMethod,
      paymentStatus: paymentStatus,
      status: validation.data.status,
      soldBy: payload.id,
      notes: validation.data.notes,
    });

    return NextResponse.json(newSale, { status: 201 });
  } catch (error) {
    console.error("Failed to create pharmacy sale:", error);
    return NextResponse.json(
      { error: "Failed to create pharmacy sale" },
      { status: 500 },
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
