//lib/auth.jwt.ts

import { jwtVerify } from 'jose';
import { NextRequest } from 'next/server';
import { z } from 'zod';

const JwtPayloadSchema = z.object({
  id: z.string(),
  role: z.enum(['admin', 'staff', 'doctor', 'nurse', 'receptionist', 'pharmacist', 'pharmacy_head', 'lab_technician', 'radiologist', 'admission']),
  name: z.string().optional(),
  email: z.string().email().optional(),
  employeeId: z.string().optional(),
});

export type JwtPayload = z.infer<typeof JwtPayloadSchema>;

export const getTokenPayload = async (req: NextRequest): Promise<JwtPayload | null> => {
  const token = req.cookies.get('accessToken')?.value;
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
