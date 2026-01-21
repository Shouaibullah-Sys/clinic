// components/layout/Sidebar.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  UserPlus,
  Stethoscope,
  Bed,
  Pill,
  FileText,
  Calendar,
  DollarSign,
  BarChart3,
  Settings,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Home,
  ClipboardList,
  Activity,
  Shield,
  Bell,
  Mail,
  FolderOpen,
  CreditCard,
  Receipt,
  Database,
  Image as ImageIcon,
  Microscope,
  Ambulance,
  Heart,
  Eye,
  Package,
  Clock,
  CheckSquare,
  TrendingUp,
  FileCheck,
  UserCheck,
  Toolbox,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

interface NavItem {
  title: string;
  href: string;
  icon: React.ReactNode;
  badge?: string;
  allowedRoles: string[];
  children?: NavItem[];
}

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);
  const [openItems, setOpenItems] = useState<string[]>([]);

  const toggleCollapse = () => {
    setCollapsed(!collapsed);
  };

  const toggleItem = (title: string) => {
    setOpenItems(prev =>
      prev.includes(title)
        ? prev.filter(item => item !== title)
        : [...prev, title]
    );
  };

  // Define navigation items based on user role
  const getNavItems = (): NavItem[] => {
    const baseItems: NavItem[] = [
      {
        title: "Dashboard",
        href: "/dashboard",
        icon: <LayoutDashboard className="h-5 w-5" />,
        allowedRoles: ["admin", "doctor", "nurse", "receptionist", "pharmacist", "lab_technician", "radiologist", "admission", "staff"],
      },
    ];

    // Admin specific items
    if (user?.role === "admin") {
      baseItems.push(
        {
          title: "User Management",
          href: "/admin/users",
          icon: <Users className="h-5 w-5" />,
          allowedRoles: ["admin"],
        },
        {
          title: "System Settings",
          href: "/admin/settings",
          icon: <Settings className="h-5 w-5" />,
          allowedRoles: ["admin"],
        }
      );
    }

    // Medical staff items (admin, doctor, nurse)
    if (["admin", "doctor", "nurse", "admission", "receptionist"].includes(user?.role || "")) {
      baseItems.push(
        {
          title: "Patients",
          href: "/patients",
          icon: <Users className="h-5 w-5" />,
          allowedRoles: ["admin", "doctor", "nurse", "admission", "receptionist"],
        },
        {
          title: "Admissions",
          href: "/admissions",
          icon: <Bed className="h-5 w-5" />,
          allowedRoles: ["admin", "doctor", "nurse", "admission", "receptionist"],
          badge: "12", // You can fetch this dynamically
        }
      );
    }

    // Doctor specific items
    if (["admin", "doctor"].includes(user?.role || "")) {
      baseItems.push(
        {
          title: "Medical Records",
          href: "/medical-records",
          icon: <ClipboardList className="h-5 w-5" />,
          allowedRoles: ["admin", "doctor"],
        },
        {
          title: "Prescriptions",
          href: "/prescriptions",
          icon: <FileText className="h-5 w-5" />,
          allowedRoles: ["admin", "doctor"],
        }
      );
    }

    // Pharmacy items
    if (["admin", "pharmacist"].includes(user?.role || "")) {
      baseItems.push({
        title: "Pharmacy",
        href: "/pharmacy",
        icon: <Pill className="h-5 w-5" />,
        allowedRoles: ["admin", "pharmacist"],
      });
    }

    // Laboratory items
    if (["admin", "lab_technician"].includes(user?.role || "")) {
      baseItems.push({
        title: "Laboratory",
        href: "/laboratory",
        icon: <Microscope className="h-5 w-5" />,
        allowedRoles: ["admin", "lab_technician"],
      });
    }

    // Radiology items
    if (["admin", "radiologist"].includes(user?.role || "")) {
      baseItems.push({
        title: "Radiology",
        href: "/radiology",
        icon: <ImageIcon className="h-5 w-5" />,
        allowedRoles: ["admin", "radiologist"],
      });
    }

    // Receptionist items
    if (["admin", "receptionist"].includes(user?.role || "")) {
      baseItems.push(
        {
          title: "Appointments",
          href: "/appointments",
          icon: <Calendar className="h-5 w-5" />,
          allowedRoles: ["admin", "receptionist"],
          badge: "3",
        },
        {
          title: "Billing",
          href: "/billing",
          icon: <DollarSign className="h-5 w-5" />,
          allowedRoles: ["admin", "receptionist"],
        }
      );
    }

    // Finance/Reports (admin only)
    if (user?.role === "admin") {
      baseItems.push(
        {
          title: "Reports",
          href: "/reports",
          icon: <BarChart3 className="h-5 w-5" />,
          allowedRoles: ["admin"],
        },
        {
          title: "Financial",
          href: "/financial",
          icon: <CreditCard className="h-5 w-5" />,
          allowedRoles: ["admin"],
        }
      );
    }

    // Services (all medical staff)
    if (["admin", "doctor", "nurse", "receptionist", "admission"].includes(user?.role || "")) {
      baseItems.push({
        title: "Services",
        href: "/services",
        icon: <Activity className="h-5 w-5" />,
        allowedRoles: ["admin", "doctor", "nurse", "receptionist", "admission"],
        children: [
          {
            title: "Emergency",
            href: "/services/emergency",
            icon: <Ambulance className="h-4 w-4" />,
            allowedRoles: ["admin", "doctor", "nurse", "receptionist"],
          },
          {
            title: "OPD",
            href: "/services/opd",
            icon: <Stethoscope className="h-4 w-4" />,
            allowedRoles: ["admin", "doctor", "nurse", "receptionist"],
          },
          {
            title: "Dental",
            href: "/services/dental",
            icon: <Toolbox className="h-4 w-4" />,
            allowedRoles: ["admin", "doctor", "nurse"],
          },
          {
            title: "ECG",
            href: "/services/ecg",
            icon: <Heart className="h-4 w-4" />,
            allowedRoles: ["admin", "doctor", "nurse"],
          },
        ],
      });
    }

    // Help & Support (all users)
    baseItems.push({
      title: "Help & Support",
      href: "/help",
      icon: <HelpCircle className="h-5 w-5" />,
      allowedRoles: ["admin", "doctor", "nurse", "receptionist", "pharmacist", "lab_technician", "radiologist", "admission", "staff"],
    });

    return baseItems;
  };

  const navItems = getNavItems();

  const renderNavItem = (item: NavItem, depth = 0) => {
    const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
    const hasChildren = item.children && item.children.length > 0;
    const isOpen = openItems.includes(item.title);

    if (!item.allowedRoles.includes(user?.role || "")) {
      return null;
    }

    return (
      <div key={item.title} className="space-y-1">
        {hasChildren ? (
          <>
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start h-10 px-3 font-normal",
                isActive && "bg-accent text-accent-foreground",
                collapsed && "px-2"
              )}
              onClick={() => toggleItem(item.title)}
            >
              <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
                <div className={cn("transition-transform", isOpen && "rotate-90")}>
                  {item.icon}
                </div>
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left">{item.title}</span>
                    {item.badge && (
                      <Badge variant="secondary" className="ml-auto">
                        {item.badge}
                      </Badge>
                    )}
                    <ChevronRight className={cn(
                      "h-4 w-4 transition-transform",
                      isOpen && "rotate-90"
                    )} />
                  </>
                )}
              </div>
            </Button>
            
            {isOpen && !collapsed && item.children && (
              <div className="ml-6 space-y-1 border-l pl-3">
                {item.children.map(child => renderNavItem(child, depth + 1))}
              </div>
            )}
          </>
        ) : (
          <Link href={item.href}>
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start h-10 px-3 font-normal",
                isActive && "bg-accent text-accent-foreground",
                collapsed && "px-2"
              )}
            >
              <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
                {item.icon}
                {!collapsed && (
                  <>
                    <span className="flex-1">{item.title}</span>
                    {item.badge && (
                      <Badge variant="secondary" className="ml-auto">
                        {item.badge}
                      </Badge>
                    )}
                  </>
                )}
              </div>
            </Button>
          </Link>
        )}
      </div>
    );
  };

  return (
    <aside
      className={cn(
        "sticky top-16 h-[calc(100vh-4rem)] border-r bg-background transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex h-full flex-col">
        {/* Sidebar Header */}
        {!collapsed && (
          <div className="border-b p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                {user?.role === "admin" ? (
                  <Shield className="h-5 w-5 text-primary" />
                ) : user?.role === "doctor" ? (
                  <Stethoscope className="h-5 w-5 text-primary" />
                ) : user?.role === "nurse" ? (
                  <UserCheck className="h-5 w-5 text-primary" />
                ) : user?.role === "admission" ? (
                  <Bed className="h-5 w-5 text-primary" />
                ) : (
                  <Users className="h-5 w-5 text-primary" />
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">Hospital HMS</p>
                <p className="text-xs text-muted-foreground">
                  {user?.role === "admin" ? "Administration" :
                   user?.role === "doctor" ? "Medical Department" :
                   user?.role === "nurse" ? "Nursing" :
                   user?.role === "admission" ? "Admissions" :
                   user?.role === "receptionist" ? "Reception" :
                   user?.role === "pharmacist" ? "Pharmacy" :
                   user?.role === "lab_technician" ? "Laboratory" :
                   user?.role === "radiologist" ? "Radiology" : "Staff"}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {navItems.map(item => renderNavItem(item))}
          </div>
        </nav>

        {/* Sidebar Footer */}
        <div className="border-t p-4">
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto"
            onClick={toggleCollapse}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
          
          {!collapsed && (
            <div className="mt-4 space-y-2">
              <div className="text-xs text-muted-foreground">
                Logged in as: {user?.name}
              </div>
              <div className="text-xs text-muted-foreground">
                Role: <span className="font-medium capitalize">{user?.role}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}