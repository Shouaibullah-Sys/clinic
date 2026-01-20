// components/services/service-card.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, TrendingUp, Users, Clock } from "lucide-react";
import Link from "next/link";

interface ServiceCardProps {
  service: {
    name: string;
    displayName: string;
    description: string;
    icon: string;
    color: string;
    permissions: string[];
  };
}

export function ServiceCard({ service }: ServiceCardProps) {
  const colorVariants: Record<string, string> = {
    red: "bg-red-100 text-red-800 border-red-200",
    blue: "bg-blue-100 text-blue-800 border-blue-200",
    green: "bg-green-100 text-green-800 border-green-200",
    purple: "bg-purple-100 text-purple-800 border-purple-200",
    orange: "bg-orange-100 text-orange-800 border-orange-200",
    teal: "bg-teal-100 text-teal-800 border-teal-200",
  };

  const iconVariants: Record<string, string> = {
    xray: "🩻",
    ct_scan: "📷",
    mri: "🧲",
    ultrasound: "👶",
    emergency: "🚨",
    opd: "👨‍⚕️",
    laboratory: "🧪",
    ot: "🔪",
    pharmacy: "💊",
    indo: "🏥",
    lithotripsy: "💎",
    endoscopy: "🔬",
    ambulance: "🚑",
    dental: "🦷",
    ecg: "📈",
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-xl">{service.displayName}</CardTitle>
            <CardDescription>{service.description}</CardDescription>
          </div>
          <div className="text-3xl">{iconVariants[service.name] || "🏥"}</div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {service.permissions.map((permission) => (
              <Badge key={permission} variant="secondary">
                {permission}
              </Badge>
            ))}
          </div>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              <span>Active</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>24/7</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Link href={`/services/${service.name}`} className="w-full">
              <Button className="w-full">
                Access Service
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
