// app/api/pharmacy/issued-medicines/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { MedicineStock } from '@/lib/models/MedicineStock';
import dbConnect from '@/lib/dbConnect';
import { getTokenPayload } from '@/lib/auth/jwt';

// Define types
interface TokenPayload {
  id: string;
  role: string;
}

interface HistoryEntry {
  type: 'issued' | 'received' | 'adjusted';
  date: Date;
  quantity: number;
  reason?: string;
  recordedBy?: string;
}

interface MedicineStockDocument {
  _id: string;
  name: string;
  currentQuantity: number;
  history: HistoryEntry[];
  __v?: number;
}

interface DateRange {
  $gte: Date;
  $lte: Date;
}

interface MedicineQuery {
  'history.date': DateRange;
  'history.type': 'issued';
}

interface ProcessedMedicine {
  _id: string;
  name: string;
  currentQuantity: number;
  issuedQuantity: number;
  remainingQuantity: number;
  history?: HistoryEntry[];
  __v?: number;
}

export async function GET(req: NextRequest): Promise<NextResponse<ProcessedMedicine[] | { error: string }>> {
  await dbConnect();
  const payload = await getTokenPayload(req) as TokenPayload | null;
  
  if (!payload || !(payload.role === 'admin' || payload.role === 'pharmacy')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Both startDate and endDate are required' },
        { status: 400 }
      );
    }

    // Find medicines that were issued (quantity decreased) within the date range
    const query: MedicineQuery = {
      'history.date': {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      },
      'history.type': 'issued'
    };

    const issuedMedicines = await MedicineStock.find(query).lean<MedicineStockDocument[]>();

    // Process the data to show quantity changes
    const result = issuedMedicines.map(medicine => {
      const relevantHistory = medicine.history.filter(entry => 
        entry.type === 'issued' && 
        new Date(entry.date) >= new Date(startDate) && 
        new Date(entry.date) <= new Date(endDate)
      );

      const totalIssued = relevantHistory.reduce((sum, entry) => sum + entry.quantity, 0);

      const processed: ProcessedMedicine = {
        _id: medicine._id.toString(),
        name: medicine.name,
        currentQuantity: medicine.currentQuantity,
        issuedQuantity: totalIssued,
        remainingQuantity: medicine.currentQuantity,
        ...(medicine.history && { history: medicine.history }),
        ...(medicine.__v && { __v: medicine.__v })
      };

      return processed;
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('Error fetching issued medicines:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch issued medicines';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
