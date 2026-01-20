// middleware.ts
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

    // Role-based access control
    if (pathname.startsWith("/admin/") && userRole !== "admin") {
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
    
    return response;
  }
}

export const config = {
  matcher: [
    // Match all routes except static files
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};