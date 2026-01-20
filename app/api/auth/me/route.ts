// app/api/auth/me/route.ts - Get current user
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { User } from "@/lib/models/User";
import jwt from "jsonwebtoken";

export async function GET(request: NextRequest) {
  try {
    const accessToken = request.cookies.get("accessToken")?.value;
    
    if (!accessToken) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    await dbConnect();

    // Verify access token
    const decoded = jwt.verify(accessToken, process.env.JWT_SECRET!) as any;
    
    const user = await User.findById(decoded.id)
      .select("-password -refreshTokens")
      .lean();

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

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
          }
        },
        { status: 403 }
      );
    }

    if (!user.active) {
      return NextResponse.json(
        { error: "Account is deactivated" },
        { status: 403 }
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
    
    if (error instanceof jwt.TokenExpiredError) {
      return NextResponse.json(
        { error: "Token expired" },
        { status: 401 }
      );
    }
    
    if (error instanceof jwt.JsonWebTokenError) {
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}