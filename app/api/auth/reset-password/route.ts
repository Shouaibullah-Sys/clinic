// app/api/auth/reset-password/route.ts
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/dbConnect";
import { User } from "@/lib/models/User";
import { z } from "zod";

const resetSchema = z.object({
  email: z.string().email("Invalid email address"),
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
  adminKey: z.string().optional(), // For admin resets
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const validationResult = resetSchema.safeParse(body);

    if (!validationResult.success) {
      const errors = validationResult.error.issues.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));
      
      return NextResponse.json(
        { 
          error: "Validation failed", 
          details: errors 
        },
        { status: 400 }
      );
    }

    const { email, newPassword, adminKey } = validationResult.data;

    await dbConnect();

    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Check if admin key is required (for non-admin users)
    const isAdminRequest = adminKey === process.env.ADMIN_RESET_KEY;
    
    if (!isAdminRequest && user.role !== 'admin') {
      return NextResponse.json(
        { error: "Only administrators can reset passwords" },
        { status: 403 }
      );
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    // Update password
    user.password = hashedPassword;
    await user.save();

    console.log(`Password reset for ${email}`);
    console.log(`New password hash: ${hashedPassword.substring(0, 30)}...`);

    return NextResponse.json({
      message: "Password reset successfully",
      user: {
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Password reset error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
