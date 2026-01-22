declare global {
  type UserRole = 'admin' | 'ceo' | 'laboratory' | 'pharmacy';

  interface User {
    _id: string;
    name: string;
    email: string;
    phone: string;
    role: UserRole;
    approved: boolean;
    createdAt?: string;
    updatedAt?: string;
  }
}