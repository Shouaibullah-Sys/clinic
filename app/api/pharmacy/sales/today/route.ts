// app/api/pharmacy/sales/today/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Prescription } from '@/lib/models/Prescription';
import dbConnect from '@/lib/dbConnect';
import { getTokenPayload } from '@/lib/auth/jwt';

export async function GET(req: NextRequest) {
  await dbConnect();
  const payload = await getTokenPayload(req);
  
  if (!payload || !(payload.role === 'admin' || payload.role === 'pharmacy')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get start and end of today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get today's prescriptions
    const prescriptions = await Prescription.find({
      date: { $gte: today, $lt: tomorrow },
      status: 'completed'
    }).lean();

    // Calculate sales by payment method
    const salesData = prescriptions.reduce((acc, prescription) => {
      acc.totalSales += prescription.totalAmount;
      
      if (prescription.paymentMethod === 'cash') {
        acc.cashSales += prescription.totalAmount;
      } else if (prescription.paymentMethod === 'card') {
        acc.cardSales += prescription.totalAmount;
      } else if (prescription.paymentMethod === 'insurance') {
        acc.insuranceSales += prescription.totalAmount;
      }
      
      return acc;
    }, { 
      totalSales: 0, 
      cashSales: 0, 
      cardSales: 0, 
      insuranceSales: 0 
    });

    return NextResponse.json(salesData);
  } catch (error) {
    console.error('Failed to fetch today\'s sales:', error);
    return NextResponse.json(
      { error: 'Failed to fetch today\'s sales' }, 
      { status: 500 }
    );
  }
}
