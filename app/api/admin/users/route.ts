// app/api/admin/users/route.ts
import { NextRequest, NextResponse } from "next/server";
import { User } from "@/lib/models/User";
import dbConnect from "@/lib/dbConnect";
import { CreateUserSchema } from "@/lib/schemas/userSchema";
import bcrypt from "bcryptjs";
import { jwtVerify } from "jose";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this";

async function verifyToken(token: string) {
  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch (error) {
    return null;
  }
}

// Helper to authenticate admin
async function authenticateAdmin(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { error: "Unauthorized. No token provided.", status: 401 };
  }

  const token = authHeader.split(" ")[1];
  const payload = await verifyToken(token);

  if (!payload) {
    return { error: "Invalid or expired token.", status: 401 };
  }

  const userRole = payload.role as string;

  // Only admin can access
  if (userRole !== "admin") {
    return { error: "Forbidden. Admin access required.", status: 403 };
  }

  return {
    userId: payload.id as string,
    userRole,
  };
}

// Type for user data without sensitive information
type SafeUserData = Omit<
  InstanceType<typeof User>,
  "password" | "refreshTokens"
>;

export async function GET(request: NextRequest) {
  console.log("GET /api/admin/users called");
  await dbConnect();

  try {
    const auth = await authenticateAdmin(request);
    if ("error" in auth) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status },
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

export async function POST(request: NextRequest) {
  await dbConnect();

  try {
    const auth = await authenticateAdmin(request);
    if ("error" in auth) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status },
      );
    }

    const body = await request.json();

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
