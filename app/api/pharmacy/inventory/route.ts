// app/api/pharmacy/inventory/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { MedicineStock } from '@/lib/models/MedicineStock';
import dbConnect from '@/lib/dbConnect';
import { getTokenPayload } from '@/lib/auth/jwt';

export async function GET(req: NextRequest) {
  await dbConnect();
  const payload = await getTokenPayload(req);
  
  if (!payload || !(payload.role === 'admin' || payload.role === 'pharmacy')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const inventory = await MedicineStock.find()
      .sort({ name: 1 })
      .lean();

    // Calculate remaining percentage and expiry status
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);

    const enhancedInventory = inventory.map(item => {
      const remainingPercentage = (item.currentQuantity / item.originalQuantity) * 100;
      const expiryDate = new Date(item.expiryDate);
      
      let expiryStatus: 'valid' | 'expiring-soon' | 'expired' = 'valid';
      if (expiryDate < now) {
        expiryStatus = 'expired';
      } else if (expiryDate <= thirtyDaysFromNow) {
        expiryStatus = 'expiring-soon';
      }

      return {
        ...item,
        remainingPercentage,
        expiryStatus
      };
    });

    return NextResponse.json(enhancedInventory);
  } catch (error) {
    console.error('Error fetching inventory:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inventory' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  await dbConnect();
  const payload = await getTokenPayload(req);
  
  if (!payload || !(payload.role === 'admin' || payload.role === 'pharmacy')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    
    // Check for duplicate batch number
    const existingBatch = await MedicineStock.findOne({ 
      batchNumber: body.batchNumber 
    });
    
    if (existingBatch) {
      return NextResponse.json(
        { error: 'Batch number already exists' },
        { status: 400 }
      );
    }

    const newItem = await MedicineStock.create(body);
    return NextResponse.json(newItem, { status: 201 });
  } catch (error) {
    console.error('Error creating inventory item:', error);
    return NextResponse.json(
      { error: 'Failed to create inventory item' },
      { status: 500 }
    );
  }
}
