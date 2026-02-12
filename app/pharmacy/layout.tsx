// app/pharmacy/layout.tsx
"use client";
import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  HandCoins,
  CheckCheck,
  Warehouse,
  Home,
  Menu,
  Pill,
  Receipt,
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
import { ThemeToggle } from "@/components/ui/theme-toggle";
import SessionChecker from "@/components/SessionChecker";

const navLinks = [
  { href: "/pharmacy/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/pharmacy/stock", label: "Stock Management", icon: Package },
  { href: "/pharmacy/issue", label: "Issue Medicine", icon: Pill },
  {
    href: "/pharmacy/select-prescription",
    label: "Dispense Medicine",
    icon: HandCoins,
  },
  { href: "/pharmacy/inventory", label: "Inventory", icon: CheckCheck },
  { href: "/warehouse", label: "Warehouse Management", icon: Warehouse },
  { href: "/warehouse/medicines", label: "Medicines", icon: Package },
  { href: "/warehouse/batches", label: "Batches", icon: Package },
  { href: "/warehouse/transfer", label: "Medicines Transfer", icon: Receipt },
];

export default function PharmacyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, initialize, isLoading } = useAuthStore();
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (!isLoading && !initialized) {
      if (!user) {
        router.push("/login");
      } else if (user?.role !== "pharmacist" && user?.role !== "admin") {
        router.push("/unauthorized");
      }
      setInitialized(true);
    }
  }, [user, router, isLoading, initialized]);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  // Show loading state while initializing
  if (isLoading || !initialized) {
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

  // Redirect non-pharmacy users
  if (user && user.role !== "pharmacist" && user.role !== "admin") {
    return null;
  }

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <SessionChecker />
      <SidebarProvider defaultOpen={true}>
        <div className="flex min-h-screen w-full">
          {/* Sidebar for Desktop */}
          <Sidebar collapsible="icon" className="hidden md:block border-r">
            <SidebarHeader>
              <div className="flex items-center gap-2 px-4 py-3">
                <span className="text-lg font-semibold group-data-[collapsible=icon]:hidden">
                  Pharmacy Module
                </span>
                <span className="text-lg font-semibold group-data-[collapsible=icon]:block hidden">
                  P
                </span>
              </div>
            </SidebarHeader>

            <SidebarContent>
              {/* Pharmacy Navigation */}
              <SidebarGroup>
                <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">
                  Pharmacy
                </SidebarGroupLabel>
                <SidebarMenu>
                  {navLinks.slice(0, 5).map((link) => (
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
                </SidebarMenu>
              </SidebarGroup>

              {/* Warehouse Navigation */}
              <SidebarGroup>
                <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">
                  Warehouse
                </SidebarGroupLabel>
                <SidebarMenu>
                  {navLinks.slice(5).map((link) => (
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
                </SidebarMenu>
              </SidebarGroup>

              {/* Admin Navigation */}
              {user?.role === "admin" && (
                <SidebarGroup>
                  <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">
                    Admin
                  </SidebarGroupLabel>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild tooltip="Admin Dashboard">
                        <Link href="/dashboard">
                          <Home className="h-4 w-4" />
                          <span>Admin Dashboard</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroup>
              )}
            </SidebarContent>

            <SidebarFooter>
              <div className="flex flex-col gap-3 p-4">
                <div className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {user?.name?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col min-w-0 group-data-[collapsible=icon]:hidden">
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
                  className="w-full group-data-[collapsible=icon]:hidden"
                >
                  Logout
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleLogout}
                  className="hidden group-data-[collapsible=icon]:flex"
                  title="Logout"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" x2="9" y1="12" y2="12" />
                  </svg>
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
            <SheetContent side="left" className="w-72 p-0">
              <div className="flex h-full flex-col">
                <div className="flex h-14 items-center border-b px-6">
                  <span className="font-semibold text-lg">Pharmacy Module</span>
                </div>

                <div className="flex-1 overflow-y-auto py-4">
                  {/* Pharmacy Navigation - Mobile */}
                  <div className="px-4 mb-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-2">
                      Pharmacy
                    </h3>
                    <nav className="grid gap-1">
                      {navLinks.slice(0, 5).map((link) => (
                        <Link
                          key={link.href}
                          href={link.href}
                          className={cn(
                            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all",
                            pathname === link.href
                              ? "bg-primary text-primary-foreground"
                              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                          )}
                          onClick={() => document.body.click()}
                        >
                          <link.icon className="h-4 w-4" />
                          {link.label}
                        </Link>
                      ))}
                    </nav>
                  </div>

                  {/* Warehouse Navigation - Mobile */}
                  <div className="px-4 mb-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-2">
                      Warehouse
                    </h3>
                    <nav className="grid gap-1">
                      {navLinks.slice(5).map((link) => (
                        <Link
                          key={link.href}
                          href={link.href}
                          className={cn(
                            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all",
                            pathname === link.href
                              ? "bg-primary text-primary-foreground"
                              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                          )}
                          onClick={() => document.body.click()}
                        >
                          <link.icon className="h-4 w-4" />
                          {link.label}
                        </Link>
                      ))}
                    </nav>
                  </div>

                  {/* Admin Navigation - Mobile */}
                  {user?.role === "admin" && (
                    <div className="px-4">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-2">
                        Admin
                      </h3>
                      <nav className="grid gap-1">
                        <Link
                          href="/dashboard"
                          className={cn(
                            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all",
                            pathname === "/dashboard"
                              ? "bg-primary text-primary-foreground"
                              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                          )}
                          onClick={() => document.body.click()}
                        >
                          <Home className="h-4 w-4" />
                          Admin Dashboard
                        </Link>
                      </nav>
                    </div>
                  )}
                </div>

                <div className="border-t p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {user?.name?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
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
            {/* Desktop Header */}
            <header className="sticky top-0 z-30 hidden h-14 items-center gap-4 border-b bg-background px-6 md:flex">
              <SidebarTrigger className="-ml-1" />
              <div className="flex-1" />
              <ThemeToggle />
            </header>

            {/* Mobile Header */}
            <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background px-4 md:hidden">
              <div className="flex items-center gap-2">
                <span className="font-semibold">Pharmacy Module</span>
              </div>
              <div className="flex items-center gap-2">
                <ThemeToggle />
                {user?.role === "admin" && (
                  <Link href="/dashboard">
                    <Button variant="secondary" size="sm" className="gap-2">
                      <Home className="h-4 w-4" />
                      <span className="hidden sm:inline">Admin</span>
                    </Button>
                  </Link>
                )}
              </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 overflow-auto">
              <div className="container mx-auto p-4 md:p-6 lg:p-8">
                {children}
              </div>
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </ThemeProvider>
  );
}
