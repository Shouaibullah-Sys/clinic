import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";
import { z } from "zod";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  role: z.enum(["admin", "doctor", "nurse", "staff", "receptionist"]),
  department: z.string().optional(),
  designation: z.string().optional(),
  employeeId: z.string().optional(),
  gender: z.enum(["male", "female", "other"]).optional(),
  address: z.string().optional(),
  avatar: z.string().optional(),
});

export async function POST(request: NextRequest) {
  if (!process.env.JWT_SECRET) return NextResponse.json({ error: "Server config error" }, { status: 500 });
  try {
    const body = await request.json();
    const v = registerSchema.safeParse(body);
    if (!v.success) return NextResponse.json({ error: "Validation failed", details: v.error.issues }, { status: 400 });
    const { name, email, password, phone, role, department, designation, employeeId, gender, address, avatar } = v.data;
    if (await prisma.user.findUnique({ where: { email } })) return NextResponse.json({ error: "Email already exists" }, { status: 409 });
    if (employeeId && await prisma.user.findFirst({ where: { employeeId } })) return NextResponse.json({ error: "Employee ID already exists" }, { status: 409 });
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const genEmpId = employeeId || `${({ admin: "ADM", doctor: "DOC", nurse: "NUR", staff: "STF", receptionist: "REC" }[role] || "EMP")}${new Date().getFullYear().toString().slice(-2)}${Math.floor(1000 + Math.random() * 9000)}`;
    const dept = department || ({ admin: "Administration", doctor: "General Medicine", nurse: "Nursing", staff: "Support Services", receptionist: "Front Desk" }[role] || "General");
    const desig = designation || ({ admin: "Administrator", doctor: "Medical Doctor", nurse: "Registered Nurse", staff: "Hospital Staff", receptionist: "Receptionist" }[role] || "Employee");
    const user = await prisma.user.create({
      data: { name, email: email.toLowerCase(), password: hashedPassword, phone, role, employeeId: genEmpId, designation: desig, department: dept, gender: gender || "other", address: address || "", avatar: avatar || "", approved: role === "admin", active: true, joiningDate: new Date(), refreshTokens: "[]", permissions: "[]" },
    });
    const accessToken = jwt.sign({ id: user.id, role: user.role, email: user.email, employeeId: user.employeeId }, process.env.JWT_SECRET, { expiresIn: "24h" });
    const refreshToken = jwt.sign({ id: user.id, type: "refresh" }, process.env.JWT_SECRET, { expiresIn: "7d" });
    await prisma.user.update({ where: { id: user.id }, data: { refreshTokens: JSON.stringify([refreshToken]) } });
    const response = NextResponse.json({
      message: role === "admin" ? "Registration successful!" : "Registration successful! Account pending approval.",
      user: { _id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone, employeeId: user.employeeId, designation: user.designation, department: user.department, gender: user.gender, approved: user.approved, active: user.active, joiningDate: user.joiningDate },
      accessToken, refreshToken,
    });
    response.cookies.set("accessToken", accessToken, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 86400, path: "/" });
    response.cookies.set("refreshToken", refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 604800, path: "/" });
    return response;
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}