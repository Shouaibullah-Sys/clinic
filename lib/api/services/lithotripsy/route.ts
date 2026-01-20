// lib/api/services/lithotripsy/route.ts
import { NextRequest, NextResponse } from "next/server";
import { ServiceRegistry } from "@/lib/services/base.service";
import { authorizeServiceAccess } from "@/lib/auth.jwt";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('accessToken')?.value;
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const user = await authorizeServiceAccess(request, 'lithotripsy', 'read');
    const service = ServiceRegistry.get('lithotripsy', request);
    
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const patientId = searchParams.get('patientId');
    const status = searchParams.get('status');
    
    const filters: any = {};
    if (patientId) filters.patient = patientId;
    if (status) filters.status = status;
    
    const result = await service.listLithotripsyProcedures(
      token,
      filters,
      { page, limit }
    );
    
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Lithotripsy service error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch lithotripsy procedures' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('accessToken')?.value;
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const user = await authorizeServiceAccess(request, 'lithotripsy', 'create');
    const service = ServiceRegistry.get('lithotripsy', request);
    const data = await request.json();
    
    // Generate lithotripsy ID
    const lithotripsyId = `LITH-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    const procedure = await service.createLithotripsyProcedure(token, {
      ...data,
      lithotripsyId,
      status: 'scheduled',
      priority: data.priority || 'routine'
    });
    
    return NextResponse.json(procedure, { status: 201 });
  } catch (error: any) {
    console.error('Create lithotripsy procedure error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create lithotripsy procedure' },
      { status: 500 }
    );
  }
}