"use client";

// app/(dashboard)/services/imaging/new/page.tsx
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { ImagingForm } from "@/components/forms/imaging-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useCreateService } from "@/lib/hooks/use-services";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { ImagingRecord } from "@/lib/schemas/imaging";

export default function NewImagingPage() {
  const router = useRouter();
  const createMutation = useCreateService("imaging");

  const handleSubmit = async (data: ImagingRecord) => {
    try {
      await createMutation.mutateAsync(data);
      toast("Success", {
        description: "Imaging record created successfully",
      });
      router.push("/services/imaging");
    } catch (error) {
      toast("Error", {
        description: "Failed to create imaging record",
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/services/imaging">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              New Imaging Record
            </h1>
            <p className="text-muted-foreground">
              Schedule a new X-Ray, CT Scan, MRI, or Ultrasound
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Imaging Details</CardTitle>
            <CardDescription>
              Fill in the details for the imaging procedure
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ImagingForm
              onSubmit={handleSubmit}
              isLoading={createMutation.isPending}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Guidelines</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <ul className="list-disc pl-5 space-y-1">
              <li>Ensure patient consent is obtained before imaging</li>
              <li>
                Check for pregnancy in female patients of childbearing age
              </li>
              <li>Verify no contraindications for contrast agents</li>
              <li>Use appropriate radiation protection measures</li>
              <li>Document any previous imaging studies for comparison</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
