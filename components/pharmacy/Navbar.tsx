// components/pharmacy/Navbar.tsx
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { LayoutDashboard, Pill, Package, Receipt, Home, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useAuthStore } from '@/store/useAuthStore';
import { cn } from '@/lib/utils';

const navLinks = [
  { href: '/pharmacy', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/pharmacy/stock', label: 'Stock Management', icon: Package },
  { href: '/pharmacy/issue', label: 'Issue Medicine', icon: Pill },
  { href: '/pharmacy/cash', label: 'Cash at Hand', icon: Receipt },
];

export default function PharmacyNavbar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout } = useAuthStore();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between">
        {/* Mobile sidebar toggle */}
        <div className="md:hidden">
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[250px]">
              <div className="flex flex-col gap-4 py-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Pharmacy</h2>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => setIsOpen(false)}
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
                
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 transition-colors",
                      pathname === link.href
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-accent"
                    )}
                  >
                    <link.icon className="h-4 w-4" />
                    {link.label}
                  </Link>
                ))}
                
                {user?.role === 'admin' && (
                  <Link
                    href="/admin/dashboard"
                    onClick={() => setIsOpen(false)}
                    className="mt-4 flex items-center gap-3 rounded-md bg-secondary px-3 py-2 text-secondary-foreground hover:bg-secondary/80"
                  >
                    <Home className="h-4 w-4" />
                    Admin Dashboard
                  </Link>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Desktop navigation */}
        <div className="hidden md:flex items-center gap-6">
          <Link href="/pharmacy" className="font-bold">
            Pharmacy
          </Link>
          <nav className="flex items-center gap-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "text-sm font-medium transition-colors hover:text-primary",
                  pathname === link.href ? "text-primary" : "text-muted-foreground"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {/* Admin dashboard button (desktop) */}
          {user?.role === 'admin' && (
            <Link href="/admin/dashboard">
              <Button variant="secondary" size="sm" className="hidden md:flex gap-2">
                <Home className="h-4 w-4" />
                Admin Dashboard
              </Button>
            </Link>
          )}

          {/* User profile dropdown */}
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-medium">{user?.name}</p>
              <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={logout}
              className="ml-2"
            >
              Logout
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
