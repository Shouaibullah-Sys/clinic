import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";
import * as joseErrors from "jose/errors";
import jwt from "jsonwebtoken";

type RefreshTokenPayload = jwt.JwtPayload & { id?: string; type?: string };

function withClearedAuthCookies(response: NextResponse, includeRefreshToken = false) {
  const opts = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, maxAge: 0, path: "/" };
  response.cookies.set("accessToken", "", opts);
  if (includeRefreshToken) response.cookies.set("refreshToken", "", opts);
  return response;
}

async function refreshAccessToken(refreshToken: string) {
  const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET!) as RefreshTokenPayload;
  if (decoded.type !== "refresh") throw new Error("Invalid token type");
  if (typeof decoded.id !== "string") throw new Error("Invalid refresh token subject");
  const user = await prisma.user.findUnique({ where: { id: decoded.id } });
  if (!user) throw new Error("User not found");
  const tokens: string[] = JSON.parse(user.refreshTokens || "[]");
  if (!tokens.includes(refreshToken)) throw new Error("Invalid refresh token");
  const newAccessToken = jwt.sign({ id: user.id, role: user.role, email: user.email, employeeId: user.employeeId, name: user.name }, process.env.JWT_SECRET!, { expiresIn: "24h" });
  return { newAccessToken, user };
}

export async function GET(request: NextRequest) {
  try {
    let accessToken = request.cookies.get("accessToken")?.value;
    const refreshToken = request.cookies.get("refreshToken")?.value;
    if (!accessToken) {
      const authHeader = request.headers.get("authorization");
      if (authHeader?.startsWith("Bearer ")) accessToken = authHeader.substring(7);
    }
    if (!accessToken) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    let payloadId: string | undefined;
    try {
      const result = await jwtVerify(accessToken, secret);
      if (typeof result.payload.id === "string") payloadId = result.payload.id;
    } catch (jwtError) {
      if (jwtError instanceof joseErrors.JWTExpired && refreshToken) {
        try {
          const { newAccessToken, user } = await refreshAccessToken(refreshToken);
          const response = NextResponse.json({ user: { ...user, _id: user.id } });
          response.cookies.set("accessToken", newAccessToken, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 86400, path: "/" });
          if (user.role === 'doctor') response.cookies.set("doctorId", user.id, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 86400, path: "/" });
          return response;
        } catch { return withClearedAuthCookies(NextResponse.json({ error: "Session expired" }, { status: 401 }), true); }
      }
      if (jwtError instanceof joseErrors.JWTExpired) return NextResponse.json({ error: "Token expired" }, { status: 401 });
      if (jwtError instanceof joseErrors.JWTInvalid) return NextResponse.json({ error: "Invalid token" }, { status: 401 });
      throw jwtError;
    }
    if (typeof payloadId !== "string") return withClearedAuthCookies(NextResponse.json({ error: "Session invalid" }, { status: 401 }), true);
    const user = await prisma.user.findUnique({ where: { id: payloadId } });
    if (!user) return withClearedAuthCookies(NextResponse.json({ error: "User not found" }, { status: 401 }), true);
    if (!user.approved) return NextResponse.json({ error: "Account pending admin approval", user: { _id: user.id, name: user.name, email: user.email, role: user.role, approved: user.approved } }, { status: 403 });
    if (!user.active) return NextResponse.json({ error: "Account deactivated" }, { status: 403 });
    const { password, refreshTokens: _, ...safeUser } = user;
    return NextResponse.json({ user: { ...safeUser, _id: user.id } });
  } catch (error) {
    console.error("Get user error:", error);
    if (error instanceof joseErrors.JOSEError) return NextResponse.json({ error: "Token error" }, { status: 401 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}