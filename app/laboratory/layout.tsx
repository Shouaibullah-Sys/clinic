// app/laboratory/layout.tsx
"use client";
import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  Home,
  Menu,
  FileText,
  TestTube,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { useAuthStore } from "@/store/useAuthStore";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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
      <SidebarProvider defaultOpen={true}>
        <div className="flex min-h-screen w-full">
          {/* Sidebar for Desktop */}
          <Sidebar collapsible="icon" className="hidden md:block">
            <SidebarHeader>
              <div className="flex items-center gap-2 px-4 py-3">
                <span className="text-lg font-semibold">Laboratory Module</span>
              </div>
            </SidebarHeader>

            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupLabel>Navigation</SidebarGroupLabel>
                <SidebarMenu>
                  {navLinks.map((link) => (
                    <SidebarMenuItem key={link.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === link.href}
                        tooltip={link.label}
                      >
                        <Link href={link.href}>
                          <link.icon className="h-4 w-4" />
                          <span>{link.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}

                  {user?.role === "admin" && (
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild tooltip="Admin Dashboard">
                        <Link href="/dashboard">
                          <Home className="h-4 w-4" />
                          <span>Admin Dashboard</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}
                </SidebarMenu>
              </SidebarGroup>
            </SidebarContent>

            <SidebarFooter>
              <div className="flex flex-col gap-3 p-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {user?.name?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col min-w-0">
                    <p className="font-medium truncate">{user?.name}</p>
                    <p className="text-sm text-muted-foreground capitalize truncate">
                      {user?.role}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  className="w-full"
                >
                  Logout
                </Button>
              </div>
            </SidebarFooter>

            <SidebarRail />
          </Sidebar>

          {/* Mobile Sidebar Sheet */}
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="fixed left-4 top-4 z-50 md:hidden"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <div className="flex h-full flex-col">
                <div className="flex h-14 items-center border-b px-4">
                  <span className="font-semibold">Laboratory Module</span>
                </div>

                <div className="flex-1 overflow-auto py-2">
                  <nav className="grid items-start gap-2 px-2">
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
                        onClick={() => document.body.click()} // Close sheet on click
                      >
                        <link.icon className="h-4 w-4" />
                        {link.label}
                      </Link>
                    ))}

                    {user?.role === "admin" && (
                      <Link
                        href="/dashboard"
                        className="mt-4 flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:bg-accent"
                        onClick={() => document.body.click()}
                      >
                        <Home className="h-4 w-4" />
                        Admin Dashboard
                      </Link>
                    )}
                  </nav>
                </div>

                <div className="mt-auto border-t p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {user?.name?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col min-w-0">
                      <p className="font-medium truncate">{user?.name}</p>
                      <p className="text-sm text-muted-foreground capitalize truncate">
                        {user?.role}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        handleLogout();
                        document.body.click();
                      }}
                      className="ml-auto"
                    >
                      Logout
                    </Button>
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          {/* Main Content Area */}
          <SidebarInset className="flex flex-col flex-1 w-full">
            {/* Mobile Header - Only show on mobile */}
            <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 md:hidden">
              <div className="flex items-center gap-4 ml-auto">
                {user?.role === "admin" && (
                  <Link href="/dashboard">
                    <Button variant="secondary" size="sm" className="gap-2">
                      <Home className="h-4 w-4" />
                      <span>Admin</span>
                    </Button>
                  </Link>
                )}
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {user?.name?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <Button variant="outline" size="sm" onClick={handleLogout}>
                    Logout
                  </Button>
                </div>
              </div>
            </header>

            {/* Desktop Header - Shows trigger and user info */}
            <header className="sticky top-0 z-30 hidden h-14 items-center gap-4 border-b bg-background px-6 md:flex">
              <SidebarTrigger className="-ml-1" />
              <div className="flex-1" /> {/* Spacer */}
              <div className="flex items-center gap-4">
                {user?.role === "admin" && (
                  <Link href="/dashboard">
                    <Button variant="secondary" size="sm" className="gap-2">
                      <Home className="h-4 w-4" />
                      <span>Admin Dashboard</span>
                    </Button>
                  </Link>
                )}
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {user?.name?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden md:block text-sm">
                    <p className="font-medium">{user?.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {user?.role}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleLogout}>
                    Logout
                  </Button>
                </div>
              </div>
            </header>

            {/* Main Content - Now takes full width */}
            <main className="flex-1 overflow-auto">
              <div className="container mx-auto p-4 md:p-6">{children}</div>
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </ThemeProvider>
  );
}
