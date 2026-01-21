// app/api/auth/refresh/route.ts - Token refresh endpoint
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { User } from "@/lib/models/User";
import jwt from "jsonwebtoken";

export async function POST(request: NextRequest) {
  if (!process.env.JWT_SECRET) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  try {
    let refreshToken = request.cookies.get("refreshToken")?.value;

    // If no cookie, check Authorization header
    if (!refreshToken) {
      const authHeader = request.headers.get("authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        refreshToken = authHeader.substring(7);
      }
    }

    if (!refreshToken) {
      return NextResponse.json(
        { error: "No refresh token provided" },
        { status: 401 }
      );
    }

    await dbConnect();

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET) as any;
    
    if (decoded.type !== "refresh") {
      return NextResponse.json(
        { error: "Invalid token type" },
        { status: 401 }
      );
    }

    const user = await User.findById(decoded.id);
    
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 401 }
      );
    }

    // Check if refresh token exists in user's tokens
    if (!user.refreshTokens.includes(refreshToken)) {
      return NextResponse.json(
        { error: "Invalid refresh token" },
        { status: 401 }
      );
    }

    // Create new access token
    const newAccessToken = jwt.sign(
      {
        id: user._id,
        role: user.role,
        email: user.email,
        employeeId: user.employeeId,
        name: user.name,
      },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    const response = NextResponse.json({
      accessToken: newAccessToken,
    });

    // Set new access token cookie
    response.cookies.set("accessToken", newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Token refresh error:", error);
    
    if (error instanceof jwt.TokenExpiredError) {
      return NextResponse.json(
        { error: "Refresh token expired" },
        { status: 401 }
      );
    }
    
    if (error instanceof jwt.JsonWebTokenError) {
      return NextResponse.json(
        { error: "Invalid refresh token" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}