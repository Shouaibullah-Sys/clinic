// app/api/admin/users/route.ts
import { NextRequest, NextResponse } from "next/server";
import { User } from "@/lib/models/User";
import dbConnect from "@/lib/dbConnect";
import { CreateUserSchema } from "@/lib/schemas/userSchema";
import bcrypt from "bcryptjs";

// Type for user data without sensitive information
type SafeUserData = Omit<
  InstanceType<typeof User>,
  "password" | "refreshTokens"
>;

export async function GET(req: NextRequest) {
  console.log("GET /api/admin/users called");
  await dbConnect();

  try {
    // Get user info from middleware headers
    const userId = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");

    console.log("User from middleware:", { userId, userRole });

    if (!userId || !userRole) {
      console.log("No user info from middleware, returning 401");
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    if (userRole !== "admin") {
      console.log("User not admin, returning 403");
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );
    }

    console.log("Querying users from database");
    const users: SafeUserData[] = await User.find(
      {},
      "-password -refreshTokens",
    );
    console.log("Found users count:", users.length);
    return NextResponse.json({ success: true, data: users });
  } catch (error: unknown) {
    console.error("Failed to fetch users:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to fetch users";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  await dbConnect();

  try {
    // Get user info from middleware headers
    const userId = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");

    if (!userId || !userRole) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    if (userRole !== "admin") {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );
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
        { status: 400 },
      );
    }

    // Check if email exists
    const existingUser = await User.findOne({ email: body.email });
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: "Email already exists" },
        { status: 400 },
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
    return NextResponse.json(
      { success: true, data: userWithoutSensitive },
      { status: 201 },
    );
  } catch (error: unknown) {
    console.error("Failed to create user:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to create user";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 },
    );
  }
}
