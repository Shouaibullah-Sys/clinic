// app/api/pharmacy/inventory/low-stock/route.ts
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
    // Get medicines with less than 20% stock remaining
    const lowStockItems = await MedicineStock.find({
      $and: [
        { currentQuantity: { $gt: 0 } },
        { originalQuantity: { $gt: 0 } },
        {
          $expr: {
            $lt: [
              { $divide: ['$currentQuantity', '$originalQuantity'] },
              0.2 // 20% threshold
            ]
          }
        }
      ]
    })
    .select('name batchNumber currentQuantity originalQuantity')
    .lean();

    // Safely calculate remaining percentage
    const result = lowStockItems.map(item => {
      try {
        const percentage = (item.currentQuantity / item.originalQuantity) * 100;
        return {
          ...item,
          remainingPercentage: parseFloat(percentage.toFixed(2))
        };
      } catch (calcError) {
        console.error('Error calculating percentage for item:', item, calcError);
        return {
          ...item,
          remainingPercentage: 0
        };
      }
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Detailed error in low-stock endpoint:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch low stock items',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
