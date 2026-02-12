// app/laboratory/tests/[id]/add-parameters/page.tsx
"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowRight, CheckCircle } from "lucide-react";

export default function AddTestParametersPage() {
  const params = useParams();
  const router = useRouter();

  useEffect(() => {
    // Redirect to the collect page immediately
    router.replace(`/laboratory/tests/${params.id}/collect`);
  }, [params.id, router]);

  return (
    <div className="container mx-auto p-6 flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Page Updated
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <ArrowRight className="h-4 w-4" />
            <AlertDescription>
              The parameter entry functionality has been merged into the Collect
              Sample page. Redirecting you there now...
            </AlertDescription>
          </Alert>
          <p className="text-sm text-muted-foreground">
            If you are not redirected automatically,{" "}
            <button
              onClick={() => router.push(`/laboratory/tests`)}
              className="text-blue-600 hover:underline"
            >
              click here
            </button>
            .
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
