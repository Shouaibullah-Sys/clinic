// components/admission/Sidebar.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  UserCog,
  Eye,
  BarChart3,
  Shield,
  FileText,
  Scissors,
  Calendar,
  TrendingUp,
  CreditCard,
  Home,
  LogOut,
  HelpCircle,
  Pill,
  Stethoscope,
  FilePlus,
  List,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuthStore } from "@/store/useAuthStore";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NavItem {
  title: string;
  href?: string;
  icon: React.ReactNode;
  roles: (
    | "admin"
    | "staff"
    | "doctor"
    | "nurse"
    | "receptionist"
    | "pharmacist"
    | "pharmacy"
    | "lab_technician"
    | "radiologist"
    | "admission"
  )[];
  badge?: string | number;
  children?: NavItem[];
}

export function AdmissionSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    patients: false,
    records: false,
  });

  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();

  const toggleGroup = (groupName: string) => {
    setOpenGroups((prev) => ({
      ...prev,
      [groupName]: !prev[groupName],
    }));
  };

  const navItems: NavItem[] = [
    {
      title: "Dashboard",
      href: "/admissions/dashboard",
      icon: <LayoutDashboard className="h-5 w-5" />,
      roles: ["admin", "staff"],
    },
    {
      title: "Patient Management",
      icon: <Users className="h-5 w-5" />,
      roles: ["admin", "staff"],
      children: [
        {
          title: "New Admission",
          href: "/admissions/new",
          icon: <FilePlus className="h-4 w-4" />,
          roles: ["admin", "staff"],
        },
        {
          title: "Patient List",
          href: "/admissions/patients",
          icon: <List className="h-4 w-4" />,
          roles: ["admin", "staff"],
        },
      ],
    },
    {
      title: "Medical Records",
      icon: <FileText className="h-5 w-5" />,
      roles: ["admin", "staff"],
      children: [
        {
          title: "View Records",
          href: "/admissions/records",
          icon: <Eye className="h-4 w-4" />,
          roles: ["admin", "staff"],
        },
        {
          title: "Add Record",
          href: "/admissions/records/new",
          icon: <FilePlus className="h-4 w-4" />,
          roles: ["admin", "staff"],
        },
      ],
    },
    {
      title: "Appointments",
      href: "/admissions/appointments",
      icon: <Calendar className="h-5 w-5" />,
      roles: ["admin", "staff"],
    },
    {
      title: "Reports",
      href: "/admissions/reports",
      icon: <BarChart3 className="h-5 w-5" />,
      roles: ["admin", "staff"],
    },
    {
      title: "Settings",
      href: "/admissions/settings",
      icon: <Settings className="h-5 w-5" />,
      roles: ["admin"],
    },
  ];

  // Filter items based on user role
  const filteredItems = navItems.filter(
    (item) => user?.role && item.roles.includes(user.role),
  );

  // If not authenticated, don't render the sidebar
  if (!isAuthenticated || !user) {
    return null;
  }

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <aside
      className={cn(
        "relative h-screen border-r bg-linear-to-b from-slate-50 to-white dark:from-gray-900 dark:to-gray-800 transition-all duration-300 overflow-hidden",
        collapsed ? "w-16" : "w-64",
      )}
    >
      <div className="flex h-full flex-col">
        {/* Sidebar header */}
        <div
          className={cn(
            "flex items-center border-b p-4",
            collapsed ? "justify-center" : "justify-between",
          )}
        >
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="p-2 bg-linear-to-r from-blue-500 to-cyan-500 rounded-lg">
                <Stethoscope className="h-6 w-6 text-white" />
              </div>
              <div>
                <span className="text-lg font-bold text-gray-900 dark:text-white">
                  Admissions
                </span>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Patient Management
                </p>
              </div>
            </div>
          )}

          <Button
            variant="ghost"
            size="icon"
            className={cn("h-8 w-8", collapsed ? "ml-0" : "ml-auto")}
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-2">
            {filteredItems.map((item) => {
              const isActive = item.href && pathname.startsWith(item.href);
              const isGroupActive = item.children?.some(
                (child) => child.href && pathname.startsWith(child.href),
              );

              return (
                <li key={item.title}>
                  {item.children ? (
                    <>
                      <Tooltip
                        delayDuration={0}
                        disableHoverableContent={!collapsed}
                      >
                        <TooltipTrigger asChild>
                          <div
                            className={cn(
                              "flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 group",
                              isGroupActive
                                ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300"
                                : "text-gray-700 dark:text-gray-300",
                            )}
                            onClick={() =>
                              toggleGroup(item.title.toLowerCase())
                            }
                          >
                            <span className="flex items-center w-full">
                              <div
                                className={cn(
                                  "p-1.5 rounded-md",
                                  isGroupActive
                                    ? "bg-blue-100 dark:bg-blue-800"
                                    : "bg-gray-100 dark:bg-gray-700 group-hover:bg-blue-100 dark:group-hover:bg-blue-800",
                                )}
                              >
                                {item.icon}
                              </div>
                              {!collapsed && (
                                <>
                                  <span className="ml-3 flex-1">
                                    {item.title}
                                  </span>
                                  {item.badge && (
                                    <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-200 rounded-full">
                                      {item.badge}
                                    </span>
                                  )}
                                  <ChevronRight
                                    className={cn(
                                      "h-4 w-4 transition-transform",
                                      openGroups[item.title.toLowerCase()]
                                        ? "rotate-90"
                                        : "",
                                    )}
                                  />
                                </>
                              )}
                            </span>
                          </div>
                        </TooltipTrigger>
                        {collapsed && (
                          <TooltipContent side="right">
                            <p>{item.title}</p>
                          </TooltipContent>
                        )}
                      </Tooltip>

                      {!collapsed && openGroups[item.title.toLowerCase()] && (
                        <ul className="mt-1 ml-8 pl-3 space-y-1 border-l border-gray-200 dark:border-gray-700">
                          {item.children
                            .filter(
                              (child) =>
                                user?.role && child.roles.includes(user.role),
                            )
                            .map((child) => {
                              const isChildActive =
                                child.href && pathname.startsWith(child.href);

                              return (
                                <li key={child.href}>
                                  <Tooltip
                                    delayDuration={0}
                                    disableHoverableContent={!collapsed}
                                  >
                                    <TooltipTrigger asChild>
                                      <Link
                                        href={child.href || "#"}
                                        className={cn(
                                          "flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 group",
                                          isChildActive
                                            ? "text-blue-600 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 font-semibold"
                                            : "text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-300 hover:bg-gray-50 dark:hover:bg-gray-800",
                                        )}
                                      >
                                        <span className="flex items-center w-full">
                                          {child.icon}
                                          <span className="ml-3 flex-1">
                                            {child.title}
                                          </span>
                                          {child.badge && (
                                            <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-200 rounded-full">
                                              {child.badge}
                                            </span>
                                          )}
                                        </span>
                                      </Link>
                                    </TooltipTrigger>
                                  </Tooltip>
                                </li>
                              );
                            })}
                        </ul>
                      )}
                    </>
                  ) : (
                    <Tooltip
                      delayDuration={0}
                      disableHoverableContent={!collapsed}
                    >
                      <TooltipTrigger asChild>
                        <Link
                          href={item.href || "#"}
                          className={cn(
                            "flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-800 group",
                            isActive
                              ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300"
                              : "text-gray-700 dark:text-gray-300",
                          )}
                        >
                          <span className="flex items-center w-full">
                            <div
                              className={cn(
                                "p-1.5 rounded-md",
                                isActive
                                  ? "bg-blue-100 dark:bg-blue-800"
                                  : "bg-gray-100 dark:bg-gray-700 group-hover:bg-blue-100 dark:group-hover:bg-blue-800",
                              )}
                            >
                              {item.icon}
                            </div>
                            {!collapsed && (
                              <>
                                <span className="ml-3 flex-1">
                                  {item.title}
                                </span>
                                {item.badge && (
                                  <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-200 rounded-full">
                                    {item.badge}
                                  </span>
                                )}
                              </>
                            )}
                          </span>
                        </Link>
                      </TooltipTrigger>
                      {collapsed && (
                        <TooltipContent side="right">
                          <p>{item.title}</p>
                          {item.badge && (
                            <span className="ml-2 text-xs">{item.badge}</span>
                          )}
                        </TooltipContent>
                      )}
                    </Tooltip>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User profile & Help */}
        <div className="border-t p-4 space-y-3">
          {/* User profile */}
          <div
            className={cn(
              "flex items-center",
              collapsed ? "justify-center" : "justify-between",
            )}
          >
            <div className="flex items-center gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Avatar className="h-8 w-8 cursor-pointer">
                    <AvatarImage src={user?.avatar} alt={user?.name} />
                    <AvatarFallback className="bg-linear-to-r from-blue-500 to-cyan-500 text-white">
                      {user?.name
                        ?.split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align={collapsed ? "center" : "end"}
                  side="right"
                >
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {user?.name}
                      </p>
                      <p className="text-xs leading-none text-gray-500 dark:text-gray-400 capitalize">
                        {user?.role === "admin" ? "Administrator" : "Staff"}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push("/profile")}>
                    <UserCog className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push("/settings")}>
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="text-red-600 dark:text-red-400"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {!collapsed && (
                <div className="flex-1 truncate">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {user?.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                    {user?.role === "admin" ? "Administrator" : "Staff"}
                  </p>
                </div>
              )}
            </div>

            {!collapsed && (
              <div className="flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => router.push("/help")}
                    >
                      <HelpCircle className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Help & Support</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={handleLogout}
                    >
                      <LogOut className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Logout</TooltipContent>
                </Tooltip>
              </div>
            )}
          </div>

          {/* System Status (only visible when not collapsed) */}
          {!collapsed && (
            <div className="pt-3 border-t">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500"></div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    System Online
                  </span>
                </div>
                <Shield className="h-3 w-3 text-green-500" />
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
