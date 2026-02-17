// components/laboratory/LabTestPDFGenerator.tsx

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Printer, Download, Eye, Settings } from "lucide-react";
import {
  generateLabTestPDF,
  generateDirectTestPDF,
  LabTest,
  DirectLabTest,
} from "@/lib/pdf-generator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface LabTestPDFGeneratorProps {
  test: LabTest | LabTest[] | DirectLabTest | DirectLabTest[];
  mode?: "print" | "download" | "preview";
  buttonLabel?: string;
  buttonVariant?: "default" | "outline" | "ghost" | "destructive" | "secondary";
  buttonSize?: "default" | "sm" | "lg" | "icon";
  generator?: "standard" | "direct";
}

const LabTestPDFGenerator = ({
  test,
  mode = "download",
  buttonLabel,
  buttonVariant = "default",
  buttonSize = "default",
  generator = "standard",
}: LabTestPDFGeneratorProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const primaryTest = Array.isArray(test) ? test[0] : test;

  const handleGeneratePDF = async () => {
    if (mode === "preview") {
      setShowPreview(true);
      return;
    }

    try {
      setIsGenerating(true);
      if (generator === "direct") {
        await generateDirectTestPDF(test as any, mode);
      } else {
        await generateLabTestPDF(test as any, mode);
      }
    } catch (error) {
      console.error("Failed to generate PDF:", error);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Advanced option: Generate from React component using Puppeteer
  const generatePDFFromComponent = async () => {
    try {
      setIsGenerating(true);

      // Get the HTML of the report component
      const reportElement = document.getElementById("lab-report-content");
      if (!reportElement) {
        throw new Error("Report content not found");
      }

      const html = reportElement.outerHTML;

      // Call API route to generate PDF
      const response = await fetch("/api/pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          html,
          testId: (primaryTest as any)?.testId || "test",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate PDF");
      }

      // Create blob and download
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `lab-report-${(primaryTest as any)?.testId || "test"}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("PDF generation error:", error);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const renderButtonContent = () => {
    const label =
      buttonLabel ||
      (mode === "print"
        ? "Print"
        : mode === "preview"
          ? "Preview"
          : "Download PDF");

    const icons = {
      print: <Printer className="h-4 w-4 mr-2" />,
      download: <Download className="h-4 w-4 mr-2" />,
      preview: <Eye className="h-4 w-4 mr-2" />,
    };

    return (
      <>
        {icons[mode as keyof typeof icons]}
        {label}
      </>
    );
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={buttonVariant}
        size={buttonSize}
        onClick={handleGeneratePDF}
        disabled={isGenerating}
      >
        {isGenerating ? "Generating..." : renderButtonContent()}
      </Button>

      <Dialog>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size={buttonSize === "icon" ? "icon" : "sm"}
          >
            <Settings className="h-4 w-4" />
            {buttonSize !== "icon" && <span className="ml-2">Options</span>}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>PDF Generation Options</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <Button
                variant="outline"
                onClick={async () => {
                  try {
                    await generateLabTestPDF(test, "download");
                  } catch (error) {
                    console.error("Failed to generate PDF:", error);
                    alert("Failed to generate PDF. Please try again.");
                  }
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Quick Download
              </Button>

              <Button
                variant="outline"
                onClick={generatePDFFromComponent}
                disabled={isGenerating}
              >
                {isGenerating ? "Generating..." : "Generate with UI"}
              </Button>
            </div>

            <div className="text-sm text-gray-500">
              <p>
                <strong>Quick Download:</strong> Uses programmatic generation
                (faster)
              </p>
              <p>
                <strong>Generate with UI:</strong> Renders your React component
                to PDF (more accurate design)
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LabTestPDFGenerator;
