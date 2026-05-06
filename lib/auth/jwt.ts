//lib/auth.jwt.ts

import { jwtVerify } from 'jose';
import { NextRequest } from 'next/server';
import { z } from 'zod';

const JwtPayloadSchema = z.object({
  id: z.string(),
  role: z.enum(['admin', 'staff', 'doctor', 'nurse', 'receptionist', 'pharmacist', 'pharmacy_head', 'lab_technician', 'radiologist', 'admission']),
  name: z.string().optional(),
  email: z.string().email().optional(),
  employeeId: z.string().nullish(),
});

export type JwtPayload = z.infer<typeof JwtPayloadSchema>;

export const getTokenPayload = async (req: NextRequest): Promise<JwtPayload | null> => {
  // Try Authorization header first (Bearer token)
  const authHeader = req.headers.get('authorization');
  let token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
  
  // Fall back to cookie
  if (!token) {
    token = req.cookies.get('accessToken')?.value || null;
  }
  
  // Also try x-access-token header
  if (!token) {
    const xToken = req.headers.get('x-access-token');
    if (xToken) token = xToken;
  }
  
  if (!token) return null;
  
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);
    
    // Validate and parse the payload
    return JwtPayloadSchema.parse(payload);
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
};
