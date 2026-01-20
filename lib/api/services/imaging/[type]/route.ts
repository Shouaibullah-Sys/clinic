// lib/api/services/imaging/[type]/route.ts - Combined imaging service
import { NextRequest, NextResponse } from "next/server";
import { ServiceRegistry } from "@/lib/services/base.service";
import { authorizeServiceAccess } from "@/lib/auth.jwt";

const IMAGING_TYPES = ['xray', 'ct_scan', 'mri', 'ultrasound'] as const;

export async function GET(
  request: NextRequest,
  { params }: { params: { type: string } }
) {
  try {
    const imagingType = params.type.toLowerCase();
    
    if (!IMAGING_TYPES.includes(imagingType as any)) {
      return NextResponse.json(
        { error: 'Invalid imaging type' },
        { status: 400 }
      );
    }

    const token = request.cookies.get('accessToken')?.value;
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Authorize user for this imaging service
    const user = await authorizeServiceAccess(request, imagingType as any, 'read');
    
    const service = ServiceRegistry.get(imagingType, request);
    
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const patientId = searchParams.get('patientId');
    const status = searchParams.get('status');
    
    const filters: any = {};
    if (patientId) filters.patient = patientId;
    if (status) filters.status = status;
    if (imagingType) filters.imagingType = imagingType;
    
    const result = await service.listImagingRecords(
      token,
      filters,
      { page, limit }
    );
    
    return NextResponse.json({
      ...result,
      imagingType
    });
  } catch (error: any) {
    console.error('Imaging service error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch imaging records' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { type: string } }
) {
  try {
    const imagingType = params.type.toLowerCase();
    
    if (!IMAGING_TYPES.includes(imagingType as any)) {
      return NextResponse.json(
        { error: 'Invalid imaging type' },
        { status: 400 }
      );
    }

    const token = request.cookies.get('accessToken')?.value;
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const user = await authorizeServiceAccess(request, imagingType as any, 'create');
    const service = ServiceRegistry.get(imagingType, request);
    const data = await request.json();
    
    // Add imaging type to data
    const recordData = {
      ...data,
      imagingType,
      bodyPart: data.bodyPart || 'Not specified',
      clinicalIndication: data.clinicalIndication || 'Not specified',
      priority: data.priority || 'routine'
    };
    
    const record = await service.createImagingRecord(token, recordData);
    
    return NextResponse.json(record, { status: 201 });
  } catch (error: any) {
    console.error('Create imaging record error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create imaging record' },
      { status: 500 }
    );
  }
}