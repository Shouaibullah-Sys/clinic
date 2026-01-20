// components/services/service-sidebar.tsx
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Activity,
  Ambulance,
  Droplets,
  HeartPulse,
  Home,
  Hospital,
  Pill,
  Scan,
  Stethoscope,
  Syringe,
    Toolbox,
    X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const serviceItems = [
  {
    name: "dashboard",
    label: "Dashboard",
    icon: Home,
    href: "/dashboard",
  },
  {
    name: "emergency",
    label: "Emergency",
    icon: Ambulance,
    href: "/services/emergency",
    color: "text-red-500",
  },
  {
    name: "opd",
    label: "OPD",
    icon: Stethoscope,
    href: "/services/opd",
    color: "text-blue-500",
  },
  {
    name: "imaging",
    label: "Imaging",
    icon: Scan,
    href: "/services/imaging",
    color: "text-purple-500",
    children: [
      { label: "X-Ray", href: "/services/imaging?type=xray" },
      { label: "CT Scan", href: "/services/imaging?type=ct_scan" },
      { label: "MRI", href: "/services/imaging?type=mri" },
      { label: "Ultrasound", href: "/services/imaging?type=ultrasound" },
    ],
  },
  {
    name: "laboratory",
    label: "Laboratory",
    icon: Droplets,
    href: "/services/laboratory",
    color: "text-green-500",
  },
  {
    name: "ot",
    label: "Operation Theatre",
    icon: Hospital,
    href: "/services/ot",
    color: "text-orange-500",
  },
  {
    name: "pharmacy",
    label: "Pharmacy",
    icon: Pill,
    href: "/services/pharmacy",
    color: "text-teal-500",
  },
  {
    name: "indo",
    label: "Indoor Patient",
    icon: Home,
    href: "/services/indo",
    color: "text-indigo-500",
  },
  {
    name: "dental",
    label: "Dental",
    icon: Toolbox,
    href: "/services/dental",
    color: "text-emerald-500",
  },
  {
    name: "ecg",
    label: "ECG",
    icon: HeartPulse,
    href: "/services/ecg",
    color: "text-pink-500",
  },
  {
    name: "endoscopy",
    label: "Endoscopy",
    icon: Syringe,
    href: "/services/endoscopy",
    color: "text-amber-500",
  },
  {
    name: "ambulance",
    label: "Ambulance",
    icon: Ambulance,
    href: "/services/ambulance",
    color: "text-rose-500",
  },
  {
    name: "lithotripsy",
    label: "Lithotripsy",
    icon: Activity,
    href: "/services/lithotripsy",
    color: "text-violet-500",
  },
];

interface ServiceSidebarProps {
  className?: string;
}

export function ServiceSidebar({ className }: ServiceSidebarProps) {
  const pathname = usePathname();

  return (
    <div className={`pb-12 ${className}`}>
      <div className="space-y-4 py-4">
        <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
            Hospital Services
          </h2>
          <Separator className="my-2" />
          <div className="space-y-1">
            {serviceItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
              
              return (
                <div key={item.name}>
                  <Link href={item.href}>
                    <Button
                      variant={isActive ? "secondary" : "ghost"}
                      className="w-full justify-start mb-1"
                    >
                      <Icon className={`mr-2 h-4 w-4 ${item.color || ""}`} />
                      {item.label}
                    </Button>
                  </Link>
                  {item.children && isActive && (
                    <div className="ml-6 space-y-1">
                      {item.children.map((child) => (
                        <Link key={child.href} href={child.href}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start"
                          >
                            {child.label}
                          </Button>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}