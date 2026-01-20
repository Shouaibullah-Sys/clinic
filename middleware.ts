// middleware.ts - Updated with service routes
import { NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Service dashboard routes
  const serviceRoutes = [
    '/services/xray',
    '/services/ct-scan',
    '/services/mri',
    '/services/ultrasound',
    '/services/emergency',
    '/services/opd',
    '/services/laboratory',
    '/services/ot',
    '/services/pharmacy',
    '/services/indo',
    '/services/lithotripsy',
    '/services/endoscopy',
    '/services/ambulance',
    '/services/dental',
    '/services/ecg'
  ];
  
  if (serviceRoutes.some(route => path.startsWith(route))) {
    const accessToken = request.cookies.get('accessToken')?.value;
    
    if (!accessToken) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    
    return NextResponse.next();
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/services/:path*',
    '/dashboard/:path*',
    '/admin/:path*',
    '/doctor/:path*',
    '/nurse/:path*',
    '/staff/:path*'
  ]
};
