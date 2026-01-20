// app/api/auth/logout/route.ts
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { User } from "@/lib/models/User";
import jwt from "jsonwebtoken";

export async function POST(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get("refreshToken")?.value;
    
    if (refreshToken) {
      await dbConnect();
      
      // Verify token to get user ID
      try {
        const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET!) as any;
        
        if (decoded.id) {
          const user = await User.findById(decoded.id);
          
          if (user) {
            // Remove this refresh token from user's tokens
            user.refreshTokens = user.refreshTokens.filter(
              (token: string) => token !== refreshToken
            );
            await user.save();
          }
        }
      } catch (error) {
        // Token is invalid, but we still want to clear cookies
        console.log("Invalid token during logout");
      }
    }

    const response = NextResponse.json({
      message: "Logged out successfully",
    });

    // Clear authentication cookies
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
      { status: 500 }
    );
  }
}