// app/laboratory/layout.tsx
"use client";
import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  Home,
  Menu,
  X,
  HandCoins,
  FileText,
  TestTube,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { useAuthStore } from "@/store/useAuthStore";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Metadata } from "next";

const navLinks = [
  { href: "/laboratory/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/laboratory/tests", label: "Tests", icon: ClipboardList },
  { href: "/laboratory/direct-tests", label: "Direct Tests", icon: TestTube },
  { href: "/laboratory/templates", label: "Templates", icon: FileText },
];

export default function LaboratoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout, initialize, isLoading } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  // Initialize auth state in useEffect
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Show loading state while initializing
  if (isLoading) {
    return (
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading...</p>
          </div>
        </div>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <div className="flex min-h-screen">
        {/* Desktop Sidebar */}
        <aside className="hidden md:block w-64 border-r bg-muted/40">
          <div className="flex h-full flex-col gap-2">
            <div className="flex h-14 items-center border-b px-4 lg:h-15">
              <Link
                href="/laboratory/dashboard"
                className="flex items-center gap-2 font-semibold"
              >
                <span className="text-lg">Laboratory Module</span>
              </Link>
            </div>

            <div className="flex-1 py-2">
              <nav className="grid items-start px-2 text-sm font-medium">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 transition-all",
                      pathname === link.href
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent",
                    )}
                  >
                    <link.icon className="h-4 w-4" />
                    {link.label}
                  </Link>
                ))}

                {user?.role === "admin" && (
                  <Link
                    href="/dashboard"
                    className="mt-4 flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:bg-accent"
                  >
                    <Home className="h-4 w-4" />
                    Admin Dashboard
                  </Link>
                )}
              </nav>
            </div>

            <div className="mt-auto p-4 border-t">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                  {user?.name?.charAt(0) || "U"}
                </div>
                <div>
                  <p className="font-medium">{user?.name}</p>
                  <p className="text-sm text-muted-foreground capitalize">
                    {user?.role}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  className="ml-auto"
                >
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </aside>

        <div className="flex flex-col w-full">
          {/* Mobile Header */}
          <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-background sm:px-6 md:hidden">
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="sm:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="sm:max-w-xs">
                <nav className="grid gap-6 text-lg font-medium">
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-semibold">Laboratory Module</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSidebarOpen(false)}
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  </div>

                  {navLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setSidebarOpen(false)}
                      className={cn(
                        "flex items-center gap-4 px-2.5",
                        pathname === link.href
                          ? "text-foreground"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <link.icon className="h-5 w-5" />
                      {link.label}
                    </Link>
                  ))}

                  {user?.role === "admin" && (
                    <Link
                      href="/dashboard"
                      onClick={() => setSidebarOpen(false)}
                      className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground"
                    >
                      <Home className="h-5 w-5" />
                      Admin Dashboard
                    </Link>
                  )}

                  <div className="mt-8 flex items-center gap-4 px-2.5">
                    <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                      {user?.name?.charAt(0) || "U"}
                    </div>
                    <div>
                      <p className="font-medium">{user?.name}</p>
                      <p className="text-sm text-muted-foreground capitalize">
                        {user?.role}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        handleLogout();
                        setSidebarOpen(false);
                      }}
                      className="ml-auto"
                    >
                      Logout
                    </Button>
                  </div>
                </nav>
              </SheetContent>
            </Sheet>

            <div className="flex items-center gap-4 ml-auto">
              {user?.role === "admin" && (
                <Link href="/dashboard">
                  <Button variant="secondary" size="sm" className="gap-2">
                    <Home className="h-4 w-4" />
                    <span className="hidden sm:inline">Admin</span>
                  </Button>
                </Link>
              )}
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                  {user?.name?.charAt(0) || "U"}
                </div>
                <Button variant="outline" size="sm" onClick={handleLogout}>
                  Logout
                </Button>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
            {children}
          </main>
        </div>
      </div>
    </ThemeProvider>
  );
}
