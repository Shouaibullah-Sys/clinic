//types/index.ts

export interface AuthError {
  message: string;
  code: string;
}

import { IUser } from '@/lib/models/User';

export type UserRole = 'admin' | 'ceo' | 'laboratory' | 'pharmacy';

export interface LabDailyRecord {
  _id: string;
  patientName: string;
  testType: string;
  phone: string;
  amountCharged: number;
  amountPaid: number;
  paymentStatus: 'Paid' | 'Unpaid' | 'Partially Paid';
  date: Date;
  createdBy: Pick<IUser, '_id' | 'name' | 'role'>;
}