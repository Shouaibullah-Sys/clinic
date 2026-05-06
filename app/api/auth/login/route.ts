import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export async function POST(request: NextRequest) {
  if (!process.env.JWT_SECRET) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }
  try {
    const body = await request.json();
    const validationResult = loginSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json({ error: "Validation failed", details: validationResult.error.issues }, { status: 400 });
    }
    const { email, password } = validationResult.data;
    const normalizedEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    if (!user.approved) return NextResponse.json({ error: "Account pending admin approval", user: { _id: user.id, name: user.name, email: user.email, role: user.role, approved: user.approved } }, { status: 403 });
    if (!user.active) return NextResponse.json({ error: "Account is deactivated" }, { status: 403 });
    const accessToken = jwt.sign({ id: user.id, role: user.role, email: user.email, employeeId: user.employeeId, name: user.name }, process.env.JWT_SECRET, { expiresIn: "24h" });
    const refreshToken = jwt.sign({ id: user.id, type: "refresh" }, process.env.JWT_SECRET, { expiresIn: "7d" });
    const currentTokens: string[] = JSON.parse(user.refreshTokens || "[]");
    currentTokens.push(refreshToken);
    await prisma.user.update({ where: { id: user.id }, data: { refreshTokens: JSON.stringify(currentTokens.slice(-5)) } });
    const { password: _, ...userWithoutPassword } = user;
    const response = NextResponse.json({ user: { ...userWithoutPassword, _id: user.id }, accessToken, refreshToken });
    response.cookies.set("accessToken", accessToken, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 86400, path: "/" });
    response.cookies.set("refreshToken", refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 604800, path: "/" });
    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}