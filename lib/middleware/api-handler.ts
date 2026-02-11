// lib/middleware/api-handler.ts

import { NextRequest, NextResponse } from "next/server";
import { authorizeRoute } from "./api-auth";
import { z, ZodSchema } from "zod";
import { logAPIActivity } from "./api-logger";

interface HandlerOptions {
  requireAuth?: boolean;
  requiredRoles?: string[];
  validate?: {
    body?: ZodSchema;
    query?: ZodSchema;
  };
  logActivity?: boolean;
}

export async function apiHandler(
  request: NextRequest,
  handler: (
    req: NextRequest,
    context: {
      user: any;
      params?: Record<string, string>;
    },
  ) => Promise<NextResponse>,
  options: HandlerOptions = {},
) {
  try {
    const {
      requireAuth = true,
      requiredRoles = [],
      validate = {},
      logActivity = true,
    } = options;

    // Validate request if schema provided
    if (validate.query) {
      const query = Object.fromEntries(request.nextUrl.searchParams);
      validate.query.parse(query);
    }

    if (validate.body && request.method !== "GET") {
      try {
        const body = await request.json();
        validate.body.parse(body);
        // Re-create request with parsed body for handler
        request = new NextRequest(request.url, {
          method: request.method,
          headers: request.headers,
          body: JSON.stringify(body),
        });
      } catch (error) {
        return NextResponse.json(
          { error: "Invalid request body", details: (error as any).errors },
          { status: 400 },
        );
      }
    }

    // Authenticate if required
    let user = null;
    if (requireAuth) {
      const authResult = await authorizeRoute(request);

      if (authResult.error || !authResult.user) {
        return NextResponse.json(
          { error: authResult.error || "Authentication required" },
          { status: 401 },
        );
      }

      user = authResult.user;

      // Check role permissions
      if (requiredRoles.length > 0 && !requiredRoles.includes(user.role)) {
        if (logActivity) {
          await logAPIActivity(user.id, "unauthorized", {
            path: request.nextUrl.pathname,
            method: request.method,
            requiredRoles,
            userRole: user.role,
          });
        }

        return NextResponse.json(
          { error: "Insufficient permissions" },
          { status: 403 },
        );
      }
    }

    // Execute handler
    const response = await handler(request, { user });

    // Log successful activity
    if (logActivity && user) {
      await logAPIActivity(user.id, "api_request", {
        path: request.nextUrl.pathname,
        method: request.method,
        status: response.status,
      });
    }

    return response;
  } catch (error) {
    console.error("API handler error:", error);

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.message },
        { status: 400 },
      );
    }

    // Handle other errors
    return NextResponse.json(
      { error: "Internal server error", message: (error as Error).message },
      { status: 500 },
    );
  }
}
