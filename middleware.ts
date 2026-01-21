// middleware.ts - UPDATED WITH COMPLETE ROLE-BASED ROUTING
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this";

// Public routes that don't require authentication
const publicRoutes = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/unauthorized",
  "/api/auth/(.*)",
  "/_next/static/(.*)",
  "/_next/image/(.*)",
  "/favicon.ico",
  "/public/(.*)"
];

// Role-based route mapping
const roleRoutes: Record<string, string[]> = {
  admin: [
    "/admin",
    "/dashboard",
    "/admissions",
    "/patients",
    "/doctors",
    "/nurses",
    "/staff",
    "/reception",
    "/pharmacy",
    "/laboratory",
    "/radiology",
    "/services",
    "/reports",
    "/settings"
  ],
  doctor: [
    "/doctor",
    "/dashboard",
    "/patients",
    "/admissions",
    "/prescriptions",
    "/medical-records"
  ],
  nurse: [
    "/nurse",
    "/dashboard",
    "/patients",
    "/admissions",
    "/medications",
    "/vital-signs"
  ],
  receptionist: [
    "/reception",
    "/dashboard",
    "/patients",
    "/admissions",
    "/appointments",
    "/billing"
  ],
  pharmacist: [
    "/pharmacy",
    "/dashboard",
    "/prescriptions",
    "/inventory",
    "/medications"
  ],
  lab_technician: [
    "/laboratory",
    "/dashboard",
    "/lab-tests",
    "/lab-results"
  ],
  radiologist: [
    "/radiology",
    "/dashboard",
    "/imaging",
    "/radiology-reports"
  ],
  admission: [
    "/admissions",
    "/dashboard",
    "/patients",
    "/beds"
  ],
  staff: [
    "/staff",
    "/dashboard"
  ]
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if it's a public route
  const isPublicRoute = publicRoutes.some(route => {
    if (route.includes('(.*)')) {
      const pattern = new RegExp(route.replace(/\(\.\*\)/g, '.*'));
      return pattern.test(pathname);
    }
    return pathname.startsWith(route);
  });

  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Get token from cookies
  const token = request.cookies.get("accessToken")?.value;

  if (!token) {
    // For API routes, return JSON error
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Please login." },
        { status: 401 }
      );
    }
    
    // For pages, redirect to login
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    // Verify JWT token
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);

    const userId = payload.id as string;
    const userRole = payload.role as string;

    // Special case: Dashboard should redirect to role-specific dashboard
    if (pathname === "/dashboard") {
      const roleDashboardMap: Record<string, string> = {
        admin: "/admin/dashboard",
        doctor: "/doctor/dashboard",
        nurse: "/nurse/dashboard",
        receptionist: "/reception/dashboard",
        pharmacist: "/pharmacy/dashboard",
        lab_technician: "/laboratory/dashboard",
        radiologist: "/radiology/dashboard",
        admission: "/admissions/dashboard",
        staff: "/staff/dashboard"
      };
      
      const redirectPath = roleDashboardMap[userRole] || "/staff/dashboard";
      return NextResponse.redirect(new URL(redirectPath, request.url));
    }

    // Check role-based access for protected routes
    if (pathname.startsWith("/admin/") && userRole !== "admin") {
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }

    if (pathname.startsWith("/doctor/") && !["admin", "doctor"].includes(userRole)) {
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }

    if (pathname.startsWith("/nurse/") && !["admin", "doctor", "nurse"].includes(userRole)) {
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }

    if (pathname.startsWith("/reception/") && !["admin", "receptionist"].includes(userRole)) {
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }

    if (pathname.startsWith("/pharmacy/") && !["admin", "pharmacist"].includes(userRole)) {
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }

    if (pathname.startsWith("/laboratory/") && !["admin", "lab_technician"].includes(userRole)) {
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }

    if (pathname.startsWith("/radiology/") && !["admin", "radiologist"].includes(userRole)) {
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }

    if (pathname.startsWith("/admissions/") && !["admin", "admission", "doctor", "nurse", "receptionist"].includes(userRole)) {
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }

    if (pathname.startsWith("/staff/") && !["admin", "staff"].includes(userRole)) {
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }
    // In your middleware, ensure admin routes are protected:
if (pathname.startsWith("/admin/") && userRole !== "admin") {
  return NextResponse.redirect(new URL("/unauthorized", request.url));
}

    // General access: Check if user can access this path based on their role
    const allowedPaths = roleRoutes[userRole] || [];
    const hasAccess = allowedPaths.some(allowedPath => 
      pathname.startsWith(allowedPath)
    );

    if (!hasAccess && !pathname.startsWith("/api/")) {
      // Allow API routes with proper headers
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }

    // Add user info to headers for API routes
    if (pathname.startsWith("/api/")) {
      const headers = new Headers(request.headers);
      headers.set("x-user-id", userId);
      headers.set("x-user-role", userRole);
      
      return NextResponse.next({
        request: {
          headers,
        },
      });
    }

    return NextResponse.next();
  } catch (error) {
    console.error("Token verification failed:", error);
    
    // Clear invalid token
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("accessToken");
    response.cookies.delete("refreshToken");
    
    return response;
  }
}

export const config = {
  matcher: [
    // Match all routes except static files
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};