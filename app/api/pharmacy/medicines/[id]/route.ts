// app/api/pharmacy/medicines/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTokenPayload } from '@/lib/auth/jwt';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const payload = await getTokenPayload(req);

  if (!payload || !(payload.role === 'admin' || payload.role === 'pharmacist' || payload.role === 'pharmacy_head')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const medicine = await prisma.medicineStock.findUnique({
      where: { id },
      include: {
        medicine: true,
      },
    });
    if (!medicine) {
      return NextResponse.json(
        { error: 'Medicine not found' },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data: medicine });
  } catch (error) {
    console.error('Error fetching medicine:', error);
    return NextResponse.json(
      { error: 'Failed to fetch medicine' },
      { status: 500 }
    );
  }
}