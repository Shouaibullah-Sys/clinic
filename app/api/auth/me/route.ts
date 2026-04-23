// app/api/auth/me/route.ts - Get current user
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { User } from "@/lib/models/User";
import { jwtVerify } from "jose";
import * as joseErrors from "jose/errors";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

type RefreshTokenPayload = jwt.JwtPayload & {
  id?: string;
  type?: string;
};

type AuthMeUser = {
  _id: mongoose.Types.ObjectId | string;
  approved: boolean;
  active: boolean;
  name: string;
  email: string;
  role: string;
} & Record<string, unknown>;

function isAuthMeUser(value: unknown): value is AuthMeUser {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    "_id" in record &&
    typeof record.approved === "boolean" &&
    typeof record.active === "boolean" &&
    typeof record.name === "string" &&
    typeof record.email === "string" &&
    typeof record.role === "string"
  );
}

function withClearedAuthCookies(
  response: NextResponse,
  includeRefreshToken = false,
) {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 0,
    path: "/",
  };

  response.cookies.set("accessToken", "", cookieOptions);
  if (includeRefreshToken) {
    response.cookies.set("refreshToken", "", cookieOptions);
  }

  return response;
}

// Helper function to refresh the access token
async function refreshAccessToken(refreshToken: string) {
  // Verify refresh token using jsonwebtoken
  const decoded = jwt.verify(
    refreshToken,
    process.env.JWT_SECRET!,
  ) as RefreshTokenPayload;

  if (decoded.type !== "refresh") {
    throw new Error("Invalid token type");
  }

  if (
    typeof decoded.id !== "string" ||
    !mongoose.Types.ObjectId.isValid(decoded.id)
  ) {
    throw new Error("Invalid refresh token subject");
  }

  await dbConnect();
  const user = await User.findById(decoded.id);

  if (!user) {
    throw new Error("User not found");
  }

  // Check if refresh token exists in user's tokens
  if (!user.refreshTokens || !user.refreshTokens.includes(refreshToken)) {
    throw new Error("Invalid refresh token");
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
    process.env.JWT_SECRET!,
    { expiresIn: "24h" },
  );

  return { newAccessToken, user };
}

export async function GET(request: NextRequest) {
  try {
    let accessToken = request.cookies.get("accessToken")?.value;
    const refreshToken = request.cookies.get("refreshToken")?.value;

    // If no cookie, check Authorization header
    if (!accessToken) {
      const authHeader = request.headers.get("authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        accessToken = authHeader.substring(7);
      }
    }

    if (!accessToken) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);

    let payloadId: string | undefined;

    try {
      // Verify access token
      const result = await jwtVerify(accessToken, secret);
      if (typeof result.payload.id === "string") {
        payloadId = result.payload.id;
      }
    } catch (jwtError) {
      // If token is expired and we have a refresh token, try to refresh
      if (jwtError instanceof joseErrors.JWTExpired && refreshToken) {
        try {
          console.log("Access token expired, attempting refresh...");
          const { newAccessToken, user } = await refreshAccessToken(refreshToken);

          // Create response with new token
          const response = NextResponse.json({
            user: {
              ...user.toObject(),
              _id: user._id.toString(),
            },
          });

          // Set the new access token cookie
          response.cookies.set("accessToken", newAccessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 24 * 60 * 60,
            path: "/",
          });

          return response;
        } catch (refreshError) {
          console.error("Token refresh failed:", refreshError);
          // Refresh failed, return 401
          return withClearedAuthCookies(
            NextResponse.json(
              { error: "Session expired. Please login again." },
              { status: 401 },
            ),
            true,
          );
        }
      }

      // For other JWT errors, return appropriate error
      if (jwtError instanceof joseErrors.JWTExpired) {
        return NextResponse.json({ error: "Token expired" }, { status: 401 });
      }

      if (jwtError instanceof joseErrors.JWTInvalid) {
        return NextResponse.json({ error: "Invalid token" }, { status: 401 });
      }

      // Handle other JOSE-specific errors if needed
      if (jwtError instanceof joseErrors.JOSEError) {
        return NextResponse.json(
          { error: "Token validation failed" },
          { status: 401 },
        );
      }

      // Re-throw unknown errors
      throw jwtError;
    }

    if (
      typeof payloadId !== "string" ||
      !mongoose.Types.ObjectId.isValid(payloadId)
    ) {
      return withClearedAuthCookies(
        NextResponse.json(
          { error: "Session is invalid. Please login again." },
          { status: 401 },
        ),
        true,
      );
    }

    await dbConnect();
    const userResult = await User.findById(payloadId)
      .select("-password -refreshTokens")
      .lean();

    if (!isAuthMeUser(userResult)) {
      return withClearedAuthCookies(
        NextResponse.json({ error: "User not found" }, { status: 401 }),
        true,
      );
    }
    const user = userResult;

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
          },
        },
        { status: 403 },
      );
    }

    if (!user.active) {
      return NextResponse.json(
        { error: "Account is deactivated" },
        { status: 403 },
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
      return NextResponse.json({ error: "Token expired" }, { status: 401 });
    }

    if (error instanceof joseErrors.JWTInvalid) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // Handle other JOSE-specific errors if needed
    if (error instanceof joseErrors.JOSEError) {
      return NextResponse.json(
        { error: "Token validation failed" },
        { status: 401 },
      );
    }

    if (
      error instanceof mongoose.Error.CastError &&
      error.path === "_id"
    ) {
      return withClearedAuthCookies(
        NextResponse.json(
          { error: "Session is invalid. Please login again." },
          { status: 401 },
        ),
        true,
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
