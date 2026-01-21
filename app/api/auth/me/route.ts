// app/api/auth/me/route.ts - Get current user
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { User } from "@/lib/models/User";
import { jwtVerify } from "jose";
import * as joseErrors from "jose/errors"; // ✅ Import errors separately

export async function GET(request: NextRequest) {
  try {
    let accessToken = request.cookies.get("accessToken")?.value;

    // If no cookie, check Authorization header
    if (!accessToken) {
      const authHeader = request.headers.get("authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        accessToken = authHeader.substring(7);
      }
    }

    if (!accessToken) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    await dbConnect();

    // Verify access token
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(accessToken, secret);

    const user = await User.findById(payload.id)
      .select("-password -refreshTokens")
      .lean() as any;

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    if (!user.approved) {
      return NextResponse.json(
        { 
          error: "Account pending admin approval",
          user: {
            _id: user._id.toString(),
            name: user.name,
            email: user.email,
            role: user.role,
            approved: user.approved,
          }
        },
        { status: 403 }
      );
    }

    if (!user.active) {
      return NextResponse.json(
        { error: "Account is deactivated" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      user: {
        ...user,
        _id: user._id.toString(),
      },
    });
  } catch (error) {
    console.error("Get user error:", error);

    // ✅ Handle errors from the new errors module
    if (error instanceof joseErrors.JWTExpired) {
      return NextResponse.json(
        { error: "Token expired" },
        { status: 401 }
      );
    }

    if (error instanceof joseErrors.JWTInvalid) {
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 401 }
      );
    }

    // Handle other JOSE-specific errors if needed
    if (error instanceof joseErrors.JOSEError) {
      return NextResponse.json(
        { error: "Token validation failed" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}