import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";

type RP = jwt.JwtPayload & { id?: string; type?: string };

function clearCookies(res: NextResponse) {
  res.cookies.set("accessToken", "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 0, path: "/" });
  res.cookies.set("refreshToken", "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 0, path: "/" });
  return res;
}

export async function POST(request: NextRequest) {
  if (!process.env.JWT_SECRET) return NextResponse.json({ error: "Server config error" }, { status: 500 });
  try {
    let refreshToken = request.cookies.get("refreshToken")?.value;
    if (!refreshToken) {
      const auth = request.headers.get("authorization");
      if (auth?.startsWith("Bearer ")) refreshToken = auth.substring(7);
    }
    if (!refreshToken) return NextResponse.json({ error: "No refresh token" }, { status: 401 });
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET) as RP;
    if (decoded.type !== "refresh") return NextResponse.json({ error: "Invalid token type" }, { status: 401 });
    if (typeof decoded.id !== "string") return clearCookies(NextResponse.json({ error: "Session invalid" }, { status: 401 }));
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) return clearCookies(NextResponse.json({ error: "User not found" }, { status: 401 }));
    const stored: string[] = JSON.parse(user.refreshTokens || "[]");
    if (!stored.includes(refreshToken)) return clearCookies(NextResponse.json({ error: "Invalid refresh token" }, { status: 401 }));
    const newAccessToken = jwt.sign({ id: user.id, role: user.role, email: user.email, employeeId: user.employeeId, name: user.name }, process.env.JWT_SECRET, { expiresIn: "24h" });
    const response = NextResponse.json({ accessToken: newAccessToken, user: { _id: user.id, name: user.name, role: user.role, email: user.email } });
    response.cookies.set("accessToken", newAccessToken, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 86400, path: "/" });
    return response;
  } catch (error) {
    console.error("Refresh error:", error);
    if (error instanceof jwt.TokenExpiredError) return clearCookies(NextResponse.json({ error: "Refresh token expired" }, { status: 401 }));
    if (error instanceof jwt.JsonWebTokenError) return clearCookies(NextResponse.json({ error: "Invalid refresh token" }, { status: 401 }));
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}