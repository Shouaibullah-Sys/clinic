// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/dbConnect";
import { User } from "@/lib/models/User";
import jwt from "jsonwebtoken";
import { z } from "zod";

// Zod schema for login validation
const loginSchema = z.object({
  email: z.string().email("Invalid email address"), // Fixed: should be z.string().email()
  password: z.string().min(1, "Password is required"),
});

export async function POST(request: NextRequest) {
  if (!process.env.JWT_SECRET) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    
    console.log('Login request received:', { 
      email: body.email, 
      passwordLength: body.password?.length 
    });
    
    // Validate input
    const validationResult = loginSchema.safeParse(body);
    
    if (!validationResult.success) {
      console.log('Validation failed:', validationResult.error.issues);
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

    const { email, password } = validationResult.data;

    console.log('Login attempt for:', email);
    
    // Normalize email to lowercase for case-insensitive comparison
    const normalizedEmail = email.toLowerCase().trim();
    console.log('Normalized email:', normalizedEmail);

    try {
      await dbConnect();
      console.log('Database connected successfully');
    } catch (dbError) {
      console.error("Database connection error:", dbError);
      return NextResponse.json(
        { error: "Database connection failed. Please try again later." },
        { status: 503 }
      );
    }

    let user;
    try {
      // Find user with email (case-insensitive)
      user = await User.findOne({ 
        email: { $regex: new RegExp(`^${normalizedEmail}$`, 'i') }
      }).select("+password");
      
      console.log('User found:', user ? 'YES' : 'NO');
      
      if (user) {
        console.log('User details:', {
          email: user.email,
          storedEmail: user.email,
          approved: user.approved,
          active: user.active,
          hasPassword: !!user.password,
          passwordLength: user.password?.length,
          passwordStartsWith: user.password?.substring(0, 20) + '...'
        });
      }
    } catch (queryError) {
      console.error("Database query failed:", queryError);
      return NextResponse.json(
        {
          error: "Database operation failed. Please try again later.",
        },
        { status: 503 }
      );
    }

    if (!user) {
      console.log('User not found for email:', normalizedEmail);
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    console.log('Password comparison details:', {
      inputPasswordLength: password.length,
      inputPasswordFirst10: password.substring(0, 10) + (password.length > 10 ? '...' : ''),
      storedHashFirst30: user.password.substring(0, 30) + '...',
      storedHashLength: user.password.length
    });

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    console.log('Password match result:', isMatch);

    if (!isMatch) {
      console.log('Password comparison failed');
      
      // Debug: Try to hash the input to see what it produces
      const testHash = await bcrypt.hash(password, 10);
      console.log('Test hash of input (first 30 chars):', testHash.substring(0, 30) + '...');
      console.log('Stored hash (first 30 chars):', user.password.substring(0, 30) + '...');
      
      return NextResponse.json(
        { 
          error: "Invalid email or password",
          hint: "Check your email and password. Passwords are case-sensitive."
        },
        { status: 401 }
      );
    }

    console.log('Password comparison successful');

    if (!user.approved) {
      console.log('User not approved:', user.email);
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
      console.log('User account inactive:', user.email);
      return NextResponse.json(
        { error: "Account is deactivated" },
        { status: 403 }
      );
    }

    // Create tokens
    const accessToken = jwt.sign(
      {
        id: user._id,
        role: user.role,
        email: user.email,
        employeeId: user.employeeId,
        name: user.name,
      },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    const refreshToken = jwt.sign(
      {
        id: user._id,
        type: "refresh",
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Store refresh token in database (limit to 5 recent tokens)
    const userDoc = user as any;
    userDoc.refreshTokens = userDoc.refreshTokens || [];
    userDoc.refreshTokens.push(refreshToken);

    // Keep only last 5 refresh tokens for security
    if (userDoc.refreshTokens.length > 5) {
      userDoc.refreshTokens = userDoc.refreshTokens.slice(-5);
    }

    await userDoc.save();

    console.log('Login successful for:', user.email);
    console.log('Tokens generated');

    const response = NextResponse.json({
      user: {
        _id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        employeeId: user.employeeId,
        designation: user.designation,
        department: user.department,
        gender: user.gender,
        address: user.address,
        avatar: user.avatar,
        approved: user.approved,
        active: user.active,
        joiningDate: user.joiningDate,
      },
      accessToken,
      refreshToken,
    });

    // Set HTTP-only cookies
    response.cookies.set("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60, // 24 hours
      path: "/",
    });

    response.cookies.set("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
