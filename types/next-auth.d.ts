//type/next-auth.d.ts

import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      avatar: any;
      phone: string;
      id: string;
      name?: string | null;
      email?: string | null;
      role: "admin" | "ceo" | "laboratory" | "pharmacy";
    };
  }

  interface User {
    id: string;
    name?: string | null;
    email?: string | null;
    role: "admin" | "ceo" | "laboratory" | "pharmacy";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "admin" | "ceo" | "laboratory" | "pharmacy";
  }
}