// app/api/admin/users/route.ts
import { NextRequest, NextResponse } from "next/server";
import { User } from "@/lib/models/User";
import dbConnect from "@/lib/dbConnect";
import { CreateUserSchema } from "@/lib/schemas/userSchema";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

// Define types for JWT payload
interface JwtPayload {
  role: string;
  key: string; // For other possible properties
}

// Type for user data without sensitive information
type SafeUserData = Omit<
  InstanceType<typeof User>,
  "password" | "refreshTokens"
>;

export async function GET(req: NextRequest) {
  console.log("GET /api/admin/users called");
  await dbConnect();

  try {
    // Verify admin role
    const cookieStore = cookies();
    const accessToken = (await cookieStore).get("accessToken")?.value;

    console.log("Access token present:", !!accessToken);
    if (!accessToken) {
      console.log("No access token, returning 401");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use jwt.verify instead of jwtDecode for proper verification
    const decoded: JwtPayload = jwt.verify(accessToken, process.env.JWT_SECRET!) as JwtPayload;
    console.log("Decoded token role:", decoded.role);
    if (decoded.role !== "admin") {
      console.log("User not admin, returning 403");
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    console.log("Querying users from database");
    const users: SafeUserData[] = await User.find(
      {},
      "-password -refreshTokens"
    );
    console.log("Found users count:", users.length);
    return NextResponse.json({ data: users });
  } catch (error: unknown) {
    console.error("Failed to fetch users:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to fetch users";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  await dbConnect();

  try {
    // Verify admin role
    const cookieStore = cookies();
    const accessToken = (await cookieStore).get("accessToken")?.value;

    if (!accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded: JwtPayload = jwt.verify(accessToken, process.env.JWT_SECRET!) as JwtPayload;
    if (decoded.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();

    // For POST (create), password is required
    const validation = CreateUserSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validation.error.format(),
        },
        { status: 400 }
      );
    }

    // Check if email exists
    const existingUser = await User.findOne({ email: body.email });
    if (existingUser) {
      return NextResponse.json(
        { error: "Email already exists" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(body.password, 10);

    const newUser = await User.create({
      ...body,
      password: hashedPassword,
    });

    // Exclude password and refresh tokens
    const userObject = newUser.toObject();
    const { password, refreshTokens, ...userWithoutSensitive } = userObject;
    return NextResponse.json(userWithoutSensitive, { status: 201 });
  } catch (error: unknown) {
    console.error("Failed to create user:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to create user";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
