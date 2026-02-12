// components/laboratory/DirectTestPDFGenerator.tsx
"use client";

import { Button } from "@/components/ui/button";
import { PrinterIcon, DownloadIcon } from "lucide-react";
import { generateDirectTestPDF } from "@/lib/pdf-generator";
import { DirectLabTest } from "@/lib/pdf-generator";

interface DirectTestPDFGeneratorProps {
  test: DirectLabTest;
  mode?: "print" | "download";
  buttonLabel?: string;
  buttonVariant?: "default" | "outline" | "ghost" | "destructive" | "secondary";
  buttonSize?: "default" | "sm" | "lg" | "icon";
}

/**
 * DirectTestPDFGenerator - A professional component to generate direct laboratory test result PDFs
 *
 * This component creates professional-looking PDF reports for completed direct laboratory tests,
 * including patient information, test details, results with reference ranges, and laboratory header.
 *
 * @param test - The direct lab test object containing all test data
 * @param mode - Either "print" to open print dialog or "download" to save PDF file
 * @param buttonLabel - Custom label for the button (default: "Print Report")
 * @param buttonVariant - Button style variant (default: "default")
 * @param buttonSize - Button size (default: "default")
 */
const DirectTestPDFGenerator = ({
  test,
  mode = "print",
  buttonLabel,
  buttonVariant = "default",
  buttonSize = "default",
}: DirectTestPDFGeneratorProps) => {
  /**
   * Generates the PDF document with test results
   */
  const handleGeneratePDF = async () => {
    try {
      await generateDirectTestPDF(test, mode);
    } catch (error) {
      console.error("Failed to generate direct test PDF:", error);
      alert("Failed to generate PDF. Please try again.");
    }
  };

  const icon =
    mode === "print" ? (
      <PrinterIcon className="mr-2 h-4 w-4" />
    ) : (
      <DownloadIcon className="mr-2 h-4 w-4" />
    );
  const label =
    buttonLabel || (mode === "print" ? "Print Report" : "Download PDF");

  return (
    <Button
      variant={buttonVariant}
      size={buttonSize}
      onClick={handleGeneratePDF}
    >
      {icon}
      {label}
    </Button>
  );
};

export default DirectTestPDFGenerator;
