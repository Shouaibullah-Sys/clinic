// lib/api/services/ambulance/route.ts
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

    const user = await authorizeServiceAccess(request, 'ambulance', 'read');
    const service = ServiceRegistry.get('ambulance', request);
    
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');
    const date = searchParams.get('date');
    const ambulanceType = searchParams.get('type');
    
    const filters: any = {};
    if (status) filters.status = status;
    if (date) filters.pickupTime = { $gte: new Date(date) };
    if (ambulanceType) filters.ambulanceType = ambulanceType;
    
    const result = await service.listAmbulanceTrips(
      token,
      filters,
      { page, limit }
    );
    
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Ambulance service error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch ambulance trips' },
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

    const user = await authorizeServiceAccess(request, 'ambulance', 'create');
    const service = ServiceRegistry.get('ambulance', request);
    const data = await request.json();
    
    // Generate ambulance ID
    const ambulanceId = `AMB-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    const ambulanceTrip = await service.createAmbulanceTrip(token, {
      ...data,
      ambulanceId,
      status: 'dispatched',
      pickupTime: new Date(),
      ambulanceType: data.ambulanceType || 'basic'
    });
    
    return NextResponse.json(ambulanceTrip, { status: 201 });
  } catch (error: any) {
    console.error('Create ambulance trip error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create ambulance trip' },
      { status: 500 }
    );
  }
}

// Update trip status
export async function PATCH(request: NextRequest) {
  try {
    const token = request.cookies.get('accessToken')?.value;
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const user = await authorizeServiceAccess(request, 'ambulance', 'update');
    const service = ServiceRegistry.get('ambulance', request);
    const { tripId, status, location } = await request.json();
    
    const ambulanceTrip = await service.updateTripStatus(token, tripId, status, location);
    
    return NextResponse.json(ambulanceTrip);
  } catch (error: any) {
    console.error('Update ambulance trip error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update ambulance trip' },
      { status: 500 }
    );
  }
}