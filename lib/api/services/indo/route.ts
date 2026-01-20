// lib/api/services/indo/route.ts
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

    const user = await authorizeServiceAccess(request, 'indo', 'read');
    const service = ServiceRegistry.get('indo', request);
    
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');
    const unit = searchParams.get('unit');
    const doctorId = searchParams.get('doctorId');
    
    const filters: any = {};
    if (status) filters.status = status;
    if (unit) filters.unit = unit;
    if (doctorId) filters.admittingDoctor = doctorId;
    
    const result = await service.listInpatients(
      token,
      filters,
      { page, limit }
    );
    
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('INDO service error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch inpatients' },
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

    const user = await authorizeServiceAccess(request, 'indo', 'create');
    const service = ServiceRegistry.get('indo', request);
    const data = await request.json();
    
    // Generate admission ID
    const admissionId = `ADM-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    const admission = await service.admitPatient(token, {
      ...data,
      admissionId,
      status: 'admitted',
      admissionDate: new Date()
    });
    
    return NextResponse.json(admission, { status: 201 });
  } catch (error: any) {
    console.error('Admit patient error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to admit patient' },
      { status: 500 }
    );
  }
}

// Add daily progress
export async function PATCH(request: NextRequest) {
  try {
    const token = request.cookies.get('accessToken')?.value;
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const user = await authorizeServiceAccess(request, 'indo', 'update');
    const service = ServiceRegistry.get('indo', request);
    const { admissionId, progress } = await request.json();
    
    const updatedAdmission = await service.addDailyProgress(token, admissionId, progress);
    
    return NextResponse.json(updatedAdmission);
  } catch (error: any) {
    console.error('Add daily progress error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to add daily progress' },
      { status: 500 }
    );
  }
}