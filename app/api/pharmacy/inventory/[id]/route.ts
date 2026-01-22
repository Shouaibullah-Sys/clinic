// app/api/pharmacy/inventory/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { MedicineStock } from '@/lib/models/MedicineStock';
import dbConnect from '@/lib/dbConnect';
import { getTokenPayload } from '@/lib/auth/jwt';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await dbConnect();
  const payload = await getTokenPayload(req);
  
  if (!payload || !(payload.role === 'admin' || payload.role === 'pharmacy')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const item = await MedicineStock.findById(id).lean();
    if (!item) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(item);
  } catch (error) {
    console.error('Error fetching inventory item:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inventory item' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await dbConnect();
  const payload = await getTokenPayload(req);
  
  if (!payload || !(payload.role === 'admin' || payload.role === 'pharmacy')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const updatedItem = await MedicineStock.findByIdAndUpdate(
      id,
      body,
      { new: true }
    );
    if (!updatedItem) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(updatedItem);
  } catch (error) {
    console.error('Error updating inventory item:', error);
    return NextResponse.json(
      { error: 'Failed to update inventory item' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await dbConnect();
  const payload = await getTokenPayload(req);
  
  if (!payload || !(payload.role === 'admin' || payload.role === 'pharmacy')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const deletedItem = await MedicineStock.findByIdAndDelete(id);
    if (!deletedItem) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      );
    }
    return NextResponse.json({ message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Error deleting inventory item:', error);
    return NextResponse.json(
      { error: 'Failed to delete inventory item' },
      { status: 500 }
    );
  }
}
