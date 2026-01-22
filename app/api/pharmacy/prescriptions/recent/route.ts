// app/api/pharmacy/prescriptions/recent/route.ts
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import { Prescription } from '@/lib/models/Prescription';

export async function GET() {
  try {
    await dbConnect();
    
    const prescriptions = await Prescription.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('patientName totalAmount paymentMethod createdAt status')
      .lean();

    return NextResponse.json(prescriptions);
  } catch (error) {
    console.error('Failed to fetch recent prescriptions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recent prescriptions' },
      { status: 500 }
    );
  }
}
