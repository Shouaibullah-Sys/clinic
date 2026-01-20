// lib/middleware/auth.ts
import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";
import { IUser } from "@/lib/models/User";
import dbConnect from "@/lib/dbConnect";
import { User } from "@/lib/models/User";

interface AuthResult {
  user: IUser | null;
  token: string | null;
}

export async function authMiddleware(
  request: NextRequest
): Promise<AuthResult> {
  try {
    await dbConnect();

    // Try to get token from Authorization header
    const authHeader = request.headers.get("authorization");
    let token = authHeader?.startsWith("Bearer ")
      ? authHeader.substring(7)
      : null;

    // If no token in header, try cookies
    if (!token) {
      const cookieHeader = request.headers.get("cookie");
      if (cookieHeader) {
        const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
          const [key, value] = cookie.trim().split('=');
          acc[key] = value;
          return acc;
        }, {} as Record<string, string>);
        
        token = cookies.accessToken || cookies.token;
      }
    }

    if (!token) {
      return { user: null, token: null };
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      id: string;
    };

    // Find user
    const user = await User.findById(decoded.id)
      .select("-password -refreshTokens")
      .lean() as IUser | null;

    if (!user || !user.active) {
      return { user: null, token: null };
    }

    return { user, token };
  } catch (error) {
    console.error("Auth middleware error:", error);
    return { user: null, token: null };
  }
}