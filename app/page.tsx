"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/button";
import { Heart, ArrowRight } from "lucide-react";
import Image from "next/image";

export default function LandingPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();

  // Simple redirect - no complex switch needed
  useEffect(() => {
    if (isAuthenticated && user) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, user, router]);

  // Clean loading state
  if (isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Redirecting...</p>
        </div>
      </div>
    );
  }

  // Ultra-simple landing page
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Simple Header */}
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center justify-center rounded-lg p-2">
              <Image
                src="/logo.png"
                alt="Atal Clinic Logo"
                width={40}
                height={40}
                className="w-full h-full object-contain"
                priority
              />
            </div>
            <span className="font-semibold text-foreground">Atal Clinic</span>
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => router.push("/login")}>
              Login
            </Button>
            <Button variant="secondary" onClick={() => router.push("/login")}>
              Register
            </Button>
          </div>
        </div>
      </header>

      {/* Main Hero - Clean, centered, one clear message */}
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-sm mb-6">
            <span>Hospital Management System</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Welcome to Atatl Clinic
          </h1>

          <p className="text-lg text-muted-foreground mb-8">
            Secure access for administrators, doctors, nurses, and staff.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              variant="secondary"
              size="lg"
              onClick={() => router.push("/login")}
            >
              Login to Dashboard
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => router.push("/login")}
            >
              Request Account
            </Button>
          </div>
        </div>
      </main>

      {/* Minimal Footer */}
      <footer className="border-t border-border py-6">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Atal Clinic. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
