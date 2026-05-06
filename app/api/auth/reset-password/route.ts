import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({ email: z.string().email(), newPassword: z.string().min(6), confirmPassword: z.string(), adminKey: z.string().optional() }).refine(d => d.newPassword === d.confirmPassword, { message: "Passwords don't match", path: ["confirmPassword"] });

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const v = schema.safeParse(body);
    if (!v.success) return NextResponse.json({ error: "Validation failed", details: v.error.issues }, { status: 400 });
    const { email, newPassword, adminKey } = v.data;
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (adminKey !== process.env.ADMIN_RESET_KEY && user.role !== "admin") return NextResponse.json({ error: "Only administrators can reset passwords" }, { status: 403 });
    const salt = await bcrypt.genSalt(10);
    await prisma.user.update({ where: { id: user.id }, data: { password: await bcrypt.hash(newPassword, salt) } });
    return NextResponse.json({ message: "Password reset successfully" });
  } catch (error) {
    console.error("Password reset error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}