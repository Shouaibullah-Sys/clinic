import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";

export async function POST(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get("refreshToken")?.value;
    if (refreshToken) {
      try {
        const decoded = jwt.verify(
          refreshToken,
          process.env.JWT_SECRET!,
        ) as any;
        if (decoded.id) {
          const user = await prisma.user.findUnique({
            where: { id: decoded.id },
          });
          if (user) {
            const tokens: string[] = JSON.parse(user.refreshTokens || "[]");
            await prisma.user.update({
              where: { id: user.id },
              data: {
                refreshTokens: JSON.stringify(
                  tokens.filter((t: string) => t !== refreshToken),
                ),
              },
            });
          }
        }
      } catch {}
    }
    const response = NextResponse.json({ message: "Logged out successfully" });
    response.cookies.set("accessToken", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });
    response.cookies.set("refreshToken", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });
    return response;
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
