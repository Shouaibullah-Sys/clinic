// middleware.ts - UPDATED WITH COMPLETE ROLE-BASED ROUTING
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

// JWT_SECRET is required for security
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error(
    "JWT_SECRET environment variable is not set. Please set it in your .env file.",
  );
}

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
  "/public/(.*)",
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
    "/settings",
  ],
  doctor: [
    "/doctor",
    "/dashboard",
    "/patients",
    "/admissions",
    "/prescriptions",
    "/medical-records",
    "/doctor/dashboard",
    "/doctor/patients",
    "/doctor/appointments",
    "/doctor/prescriptions",
    "/doctor/lab-tests",
    "/services/imaging",
  ],
  nurse: [
    "/nurse",
    "/dashboard",
    "/patients",
    "/admissions",
    "/medications",
    "/vital-signs",
  ],
  receptionist: [
    "/reception",
    "/dashboard",
    "/patients",
    "/admissions",
    "/appointments",
    "/billing",
    "/reception/lab-tests",
    "/services/imaging/reception",
  ],
  pharmacist: [
    "/pharmacy",
    "/dashboard",
    "/prescriptions",
    "/inventory",
    "/medications",
    "/pharmacy/dashboard",
    "/pharmacy/stock",
    "/pharmacy/prescriptions",
    "/pharmacy/select-prescription",
    "/pharmacy/dispense",
    "/pharmacy/pending-prescriptions",
  ],
  lab_technician: ["/laboratory", "/dashboard", "/lab-tests", "/lab-results"],
  radiologist: [
    "/radiology",
    "/dashboard",
    "/imaging",
    "/radiology-reports",
    "/services/imaging/radiologist",
  ],
  admission: ["/admissions", "/dashboard", "/patients", "/beds"],
  staff: ["/staff", "/dashboard"],
};

// Helper function to check if user has access to a path
function hasPathAccess(userRole: string, pathname: string): boolean {
  // Admin has access to all routes
  if (userRole === "admin") {
    return true;
  }

  const allowedPaths = roleRoutes[userRole] || [];
  return allowedPaths.some((allowedPath) => pathname.startsWith(allowedPath));
}

// API route role-based access mapping
const apiRoleRoutes: Record<string, string[]> = {
  admin: [
    "/api/admin",
    "/api/dashboard/admin",
    "/api/users",
    "/api/doctors",
    "/api/admissions",
    "/api/patients",
    "/api/appointments",
    "/api/billing",
    "/api/reports",
  ],
  doctor: [
    "/api/doctor",
    "/api/patients",
    "/api/appointments",
    "/api/prescriptions",
    "/api/medical-records",
    "/api/lab-tests",
  ],
  nurse: [
    "/api/nurse",
    "/api/patients",
    "/api/admissions",
    "/api/medications",
    "/api/vital-signs",
  ],
  receptionist: [
    "/api/reception",
    "/api/patients",
    "/api/admissions",
    "/api/appointments",
    "/api/billing",
    "/api/dashboard/reception",
  ],
  pharmacist: [
    "/api/pharmacy",
    "/api/prescriptions",
    "/api/inventory",
    "/api/medications",
  ],
  lab_technician: ["/api/laboratory", "/api/lab-tests"],
  radiologist: ["/api/radiology", "/api/imaging"],
  admission: ["/api/admissions", "/api/patients"],
  staff: ["/api/staff"],
};

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if it's a public route
  const isPublicRoute = publicRoutes.some((route) => {
    if (route.includes("(.*)")) {
      const pattern = new RegExp(route.replace(/\(\.\*\)/g, ".*"));
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
        { status: 401 },
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
    const userActive = payload.active !== false;
    const userApproved = payload.approved !== false;

    // Check if user is active and approved
    if (!userActive || !userApproved) {
      console.error(`User ${userId} is not active or not approved`, {
        active: userActive,
        approved: userApproved,
      });

      // For API routes, return JSON error
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          {
            success: false,
            error: !userActive
              ? "Your account is not active. Please contact your administrator."
              : "Your account is not approved. Please contact your administrator.",
          },
          { status: 403 },
        );
      }

      // For pages, redirect to unauthorized with context
      const unauthorizedUrl = new URL("/unauthorized", request.url);
      unauthorizedUrl.searchParams.set("url", pathname);
      unauthorizedUrl.searchParams.set(
        "reason",
        !userActive ? "inactive" : "not_approved",
      );
      return NextResponse.redirect(unauthorizedUrl);
    }

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
        staff: "/staff/dashboard",
      };

      const redirectPath = roleDashboardMap[userRole] || "/staff/dashboard";
      return NextResponse.redirect(new URL(redirectPath, request.url));
    }

    // Check API route access
    if (pathname.startsWith("/api/")) {
      const allowedApiPaths = apiRoleRoutes[userRole] || [];
      const hasApiAccess = allowedApiPaths.some((allowedPath) =>
        pathname.startsWith(allowedPath),
      );

      if (!hasApiAccess) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Forbidden. You don't have permission to access this resource.",
          },
          { status: 403 },
        );
      }

      // Add user info to headers for API routes
      const headers = new Headers(request.headers);
      headers.set("x-user-id", userId);
      headers.set("x-user-role", userRole);

      // Add user name if available in token
      const userName = payload.name as string;
      if (userName) {
        headers.set("x-user-name", userName);
      }

      return NextResponse.next({
        request: {
          headers,
        },
      });
    }

    // Check page route access using helper function
    if (!hasPathAccess(userRole, pathname)) {
      const unauthorizedUrl = new URL("/unauthorized", request.url);
      // Add context to unauthorized page
      unauthorizedUrl.searchParams.set("url", pathname);
      // Get required roles for this path
      const requiredRoles = Object.entries(roleRoutes)
        .filter(([_, paths]) => paths.some((path) => pathname.startsWith(path)))
        .map(([role]) => role)
        .join(",");
      unauthorizedUrl.searchParams.set("roles", requiredRoles);
      return NextResponse.redirect(unauthorizedUrl);
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
