// lib/api/services/opd/route.ts
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

    const user = await authorizeServiceAccess(request, 'opd', 'read');
    const service = ServiceRegistry.get('opd', request);
    
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const doctorId = searchParams.get('doctorId');
    const visitType = searchParams.get('visitType');
    const date = searchParams.get('date');
    
    const filters: any = {};
    if (doctorId) filters.doctor = doctorId;
    if (visitType) filters.visitType = visitType;
    if (date) filters.date = { $gte: new Date(date) };
    
    const result = await service.listOPDVisits(
      token,
      filters,
      { page, limit }
    );
    
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('OPD service error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch OPD visits' },
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

    const user = await authorizeServiceAccess(request, 'opd', 'create');
    const service = ServiceRegistry.get('opd', request);
    const data = await request.json();
    
    // Generate OPD ID
    const opdId = `OPD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    const opdVisit = await service.createOPDVisit(token, {
      ...data,
      opdId,
      visitType: data.visitType || 'new',
      status: 'consulted'
    });
    
    return NextResponse.json(opdVisit, { status: 201 });
  } catch (error: any) {
    console.error('Create OPD visit error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create OPD visit' },
      { status: 500 }
    );
  }
}