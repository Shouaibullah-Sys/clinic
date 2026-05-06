// app/api/pharmacy/prescriptions/recent/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const prescriptions = await prisma.prescription.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        patient: {
          select: {
            name: true,
          },
        },
        charges: true,
        paymentMethod: true,
        createdAt: true,
        status: true,
      },
    });

    // Transform to match expected format
    const result = prescriptions.map(p => ({
      id: p.id,
      patientName: p.patient?.name,
      totalAmount: JSON.parse(p.charges || '{}').totalAmount || 0,
      paymentMethod: p.paymentMethod,
      createdAt: p.createdAt,
      status: p.status,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to fetch recent prescriptions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recent prescriptions' },
      { status: 500 }
    );
  }
}