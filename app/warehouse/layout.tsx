// app/warehouse/layout.tsx
import { ReactNode } from "react";
import PharmacyNavbar from "@/components/pharmacy/Navbar";

export default function WarehouseLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <PharmacyNavbar />
      <main className="container mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
