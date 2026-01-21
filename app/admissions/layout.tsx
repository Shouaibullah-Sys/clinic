// app/admissions/layout.tsx
import { ReactNode } from "react";
import AdmissionHeader from "@/components/admission/Header";
import { AdmissionSidebar } from "@/components/admission/Sidebar";

export default function AdmissionLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <AdmissionHeader />
      <div className="flex">
        <AdmissionSidebar />
        <main className="flex-1 p-6">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
