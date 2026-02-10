"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Printer, Download, Loader2 } from "lucide-react";
import {
  generateDischargeCardPDF,
  DischargeCardPDFData,
} from "@/lib/pdf-generator";

interface DischargeCardPrintButtonProps {
  card: DischargeCardPDFData;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "icon";
  showText?: boolean;
}

export function DischargeCardPrintButton({
  card,
  variant = "outline",
  size = "sm",
  showText = false,
}: DischargeCardPrintButtonProps) {
  const [loading, setLoading] = useState(false);

  const handlePrint = () => {
    setLoading(true);
    try {
      generateDischargeCardPDF(card, "print");
      // Reset loading after a short delay to allow PDF to generate
      setTimeout(() => setLoading(false), 500);
    } catch (error) {
      console.error("Error generating discharge card PDF:", error);
      setLoading(false);
    }
  };

  const handleDownload = () => {
    setLoading(true);
    try {
      generateDischargeCardPDF(card, "download");
      setTimeout(() => setLoading(false), 500);
    } catch (error) {
      console.error("Error downloading discharge card PDF:", error);
      setLoading(false);
    }
  };

  return (
    <div className="flex gap-2">
      <Button
        variant={variant}
        size={size}
        onClick={handlePrint}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Printer className="h-4 w-4" />
        )}
        {showText && <span className="ml-2">Print</span>}
      </Button>
      <Button
        variant={variant}
        size={size}
        onClick={handleDownload}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        {showText && <span className="ml-2">Download</span>}
      </Button>
    </div>
  );
}
