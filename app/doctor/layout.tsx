// app/doctor/layout.tsx


import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../globals.css";
import  AuthProvider from "@/providers/AuthProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Doctor Dashboard - Taylor Pro",
  description: "Doctor management system for Taylor Pro",
};

export default function DoctorLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthProvider>
      <div className="flex h-screen">
        <div className="flex-1 overflow-auto">
          <main className="min-h-screen">
            {children}
          </main>
        </div>
      </div>
    </AuthProvider>
  );
}