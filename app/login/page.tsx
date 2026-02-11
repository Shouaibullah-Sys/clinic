// app/login/page.tsx
import AuthTabs from "@/components/auth/AuthTabs";
import { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Sajad Barakzai Hospital",
  description: "Login to access the Sajad Barakzai Hospital management system",
};

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted  p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-28 h-28 rounded-lg bg-card p-2">
            <Image
              src="/logo2.png"
              alt="Sajad Barakzai Logo"
              width={200}
              height={200}
              className="w-full h-full object-contain"
              priority
            />
          </div>
          <h1 className="text-3xl font-bold text-foreground mt-4">
            Sajad Barakzai Hospital
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage your hospital business efficiently
          </p>
        </div>
        {/* Auth Tabs */}
        <div className="bg-card rounded-lg shadow-lg border border-border p-6 md:p-8">
          <AuthTabs />
        </div>
        {/* Footer */}
        <div className="text-center mt-6 text-sm text-muted-foreground">
          <p>
            © {new Date().getFullYear()} Sajad Barakzai Hospital Management
            System. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
