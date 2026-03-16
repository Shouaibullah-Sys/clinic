// components/laboratory/LabTestPDFGenerator.tsx

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Printer, Download } from "lucide-react";
import {
  generateLabTestPDF,
  generateDirectTestPDF,
  LabTest,
  DirectLabTest,
} from "@/lib/pdf-generator";

interface LabTestPDFGeneratorProps {
  test: LabTest | LabTest[] | DirectLabTest | DirectLabTest[];
  mode?: "print" | "download";
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

  const primaryTest = Array.isArray(test) ? test[0] : test;
  const isDirectTest = (value: LabTest | DirectLabTest): value is DirectLabTest =>
    "createdAtDirect" in value || "directBatchId" in value;
  const useDirectGenerator =
    generator === "direct" || (primaryTest ? isDirectTest(primaryTest) : false);

  const handleGeneratePDF = async () => {
    try {
      setIsGenerating(true);
      if (useDirectGenerator) {
        await generateDirectTestPDF(
          test as DirectLabTest | DirectLabTest[],
          mode,
        );
        return;
      }
      await generateLabTestPDF(test as LabTest | LabTest[], mode);
    } catch (error) {
      console.error("Failed to generate PDF:", error);
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
        : "Download PDF");

    const icons = {
      print: <Printer className="h-4 w-4 mr-2" />,
      download: <Download className="h-4 w-4 mr-2" />,
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
    </div>
  );
};

export default LabTestPDFGenerator;
