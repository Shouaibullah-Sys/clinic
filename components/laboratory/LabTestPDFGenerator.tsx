// components/laboratory/LabTestPDFGenerator.tsx
"use client";

import { Button } from "@/components/ui/button";
import { PrinterIcon, DownloadIcon } from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// Interfaces for lab test data
interface TestParameter {
  name: string;
  value: string | number;
  unit?: string;
  normalRange?: string;
  remarks?: string;
}

interface TestResults {
  parameters?: TestParameter[];
  reportedBy?: {
    name: string;
  };
  reportedAt?: string;
  verifiedBy?: {
    name: string;
  };
  verifiedAt?: string;
}

interface Patient {
  name: string;
  patientId: string;
  phone?: string;
  age?: number;
  gender?: string;
  dateOfBirth?: string;
}

interface Doctor {
  name: string;
  specialization?: string;
  department?: string;
}

interface LabTest {
  _id: string;
  testId: string;
  testName: string;
  category?: string;
  patient?: Patient;
  doctor?: Doctor;
  status: string;
  collectionStatus: string;
  processingStatus: string;
  orderedAt: string;
  completedAt?: string;
  specimen?: {
    type: string;
    quantity?: string;
  };
  results?: TestResults;
  priority?: string;
  labReferenceId?: string;
}

interface LabTestPDFGeneratorProps {
  test: LabTest;
  mode?: "print" | "download";
  buttonLabel?: string;
  buttonVariant?: "default" | "outline" | "ghost" | "destructive" | "secondary";
  buttonSize?: "default" | "sm" | "lg" | "icon";
}

/**
 * LabTestPDFGenerator - A component to generate and print/download laboratory test result PDFs
 *
 * This component creates professional-looking PDF reports for completed laboratory tests,
 * including patient information, test details, results with reference ranges, and laboratory header.
 *
 * @param test - The lab test object containing all test data
 * @param mode - Either "print" to open print dialog or "download" to save PDF file
 * @param buttonLabel - Custom label for the button (default: "Print Report")
 * @param buttonVariant - Button style variant (default: "default")
 * @param buttonSize - Button size (default: "default")
 */
const LabTestPDFGenerator = ({
  test,
  mode = "print",
  buttonLabel,
  buttonVariant = "default",
  buttonSize = "default",
}: LabTestPDFGeneratorProps) => {
  /**
   * Generates the PDF document with test results
   */
  const generatePDF = () => {
    if (!test) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;
    let yPos = margin;

    // Helper function to add text with automatic line wrapping
    const addText = (
      text: string,
      x: number,
      y: number,
      fontSize: number = 10,
      fontStyle: string = "normal",
      align: "left" | "center" | "right" = "left",
    ) => {
      doc.setFontSize(fontSize);
      doc.setFont("helvetica", fontStyle);
      doc.text(text, x, y, { align });
      return y + fontSize * 0.4;
    };

    // Helper function to check if value is abnormal
    const isAbnormal = (parameter: TestParameter): boolean => {
      if (!parameter.normalRange || !parameter.remarks) return false;
      const remarks = parameter.remarks.toLowerCase();
      return (
        remarks.includes("abnormal") ||
        remarks.includes("high") ||
        remarks.includes("low") ||
        remarks.includes("critical")
      );
    };

    // ==================== HEADER SECTION ====================
    // Laboratory Header
    yPos = addText(
      "LABORATORY TEST REPORT",
      pageWidth / 2,
      yPos,
      18,
      "bold",
      "center",
    );
    yPos += 2;
    yPos = addText(
      "Sajad Barekzai Hospital",
      pageWidth / 2,
      yPos,
      12,
      "bold",
      "center",
    );
    yPos = addText(
      "Comprehensive Diagnostic Services",
      pageWidth / 2,
      yPos,
      9,
      "normal",
      "center",
    );
    yPos += 4;

    // Separator line
    doc.setDrawColor(59, 130, 246);
    doc.setLineWidth(0.5);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 6;

    // ==================== TEST INFORMATION ====================
    // Test ID and Reference
    yPos = addText(`Test ID: ${test.testId}`, margin, yPos, 10, "bold");
    yPos = addText(
      `Lab Reference: ${test.labReferenceId || "N/A"}`,
      pageWidth - margin,
      yPos,
      10,
      "normal",
      "right",
    );
    yPos += 2;

    // Test Name and Category
    yPos = addText(`Test: ${test.testName}`, margin, yPos, 12, "bold");
    if (test.category) {
      yPos = addText(
        `Category: ${test.category.replace(/_/g, " ")}`,
        margin,
        yPos,
        9,
      );
    }
    yPos += 2;

    // Priority Badge
    if (test.priority) {
      const priorityColors: Record<string, [number, number, number]> = {
        emergency: [239, 68, 68], // red
        urgent: [249, 115, 22], // orange
        routine: [59, 130, 246], // blue
      };
      const priorityColor = priorityColors[test.priority] || [107, 114, 128]; // gray

      doc.setFillColor(priorityColor[0], priorityColor[1], priorityColor[2]);
      doc.rect(margin, yPos - 4, 30, 6, "F");
      doc.setTextColor(255, 255, 255);
      yPos = addText(
        test.priority.toUpperCase(),
        margin + 15,
        yPos,
        8,
        "bold",
        "center",
      );
      doc.setTextColor(0, 0, 0);
      yPos += 2;
    }

    // ==================== PATIENT INFORMATION ====================
    yPos += 2;
    yPos = addText("PATIENT INFORMATION", margin, yPos, 11, "bold");
    yPos += 2;

    const patientInfo = [
      ["Name:", test.patient?.name || "N/A"],
      ["Patient ID:", test.patient?.patientId || "N/A"],
      [
        "Age/Gender:",
        `${test.patient?.age || "N/A"}y / ${test.patient?.gender || "N/A"}`,
      ],
      ["Phone:", test.patient?.phone || "N/A"],
    ];

    autoTable(doc, {
      startY: yPos,
      head: [],
      body: patientInfo,
      theme: "plain",
      styles: { fontSize: 9, cellPadding: 1 },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 40 },
        1: { cellWidth: 60 },
      },
    });

    yPos = (doc as any).lastAutoTable.finalY + 4;

    // ==================== DOCTOR INFORMATION ====================
    yPos = addText("DOCTOR INFORMATION", margin, yPos, 11, "bold");
    yPos += 2;

    const doctorInfo = [
      ["Doctor:", test.doctor?.name ? `Dr. ${test.doctor.name}` : "N/A"],
      ["Specialization:", test.doctor?.specialization || "N/A"],
      ["Department:", test.doctor?.department || "N/A"],
    ];

    autoTable(doc, {
      startY: yPos,
      head: [],
      body: doctorInfo,
      theme: "plain",
      styles: { fontSize: 9, cellPadding: 1 },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 40 },
        1: { cellWidth: 60 },
      },
    });

    yPos = (doc as any).lastAutoTable.finalY + 4;

    // ==================== TEST DETAILS ====================
    yPos = addText("TEST DETAILS", margin, yPos, 11, "bold");
    yPos += 2;

    const formatDate = (dateString?: string) => {
      if (!dateString) return "N/A";
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    };

    const testDetails = [
      ["Ordered Date:", formatDate(test.orderedAt)],
      ["Completed Date:", formatDate(test.completedAt)],
      ["Specimen Type:", test.specimen?.type || "N/A"],
      ["Collection Status:", test.collectionStatus?.toUpperCase() || "N/A"],
      ["Processing Status:", test.processingStatus?.toUpperCase() || "N/A"],
    ];

    autoTable(doc, {
      startY: yPos,
      head: [],
      body: testDetails,
      theme: "plain",
      styles: { fontSize: 9, cellPadding: 1 },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 50 },
        1: { cellWidth: 50 },
      },
    });

    yPos = (doc as any).lastAutoTable.finalY + 4;

    // ==================== TEST RESULTS ====================
    if (test.results?.parameters && test.results.parameters.length > 0) {
      yPos = addText("TEST RESULTS", margin, yPos, 11, "bold");
      yPos += 2;

      // Prepare results table data
      const resultsTableData = test.results.parameters.map((param) => {
        const abnormal = isAbnormal(param);
        return [
          param.name,
          `${param.value} ${param.unit || ""}`,
          param.normalRange || "-",
          param.remarks || "-",
        ];
      });

      autoTable(doc, {
        startY: yPos,
        head: [["Parameter", "Result", "Reference Range", "Remarks"]],
        body: resultsTableData,
        styles: { fontSize: 9 },
        headStyles: {
          fillColor: [59, 130, 246],
          fontStyle: "bold",
          halign: "center",
        },
        columnStyles: {
          0: { cellWidth: 50, fontStyle: "bold" },
          1: { cellWidth: 35, halign: "center" },
          2: { cellWidth: 45 },
          3: { cellWidth: 40 },
        },
        didParseCell: (data) => {
          // Highlight abnormal results
          const rowIndex = data.row.index;
          const param = test.results?.parameters?.[rowIndex];
          if (param && isAbnormal(param)) {
            data.cell.styles.textColor = [220, 38, 38]; // red
            data.cell.styles.fontStyle = "bold";
          }
        },
      });

      yPos = (doc as any).lastAutoTable.finalY + 4;

      // ==================== REPORTING INFORMATION ====================
      yPos = addText("REPORTING INFORMATION", margin, yPos, 11, "bold");
      yPos += 2;

      const reportingInfo = [
        ["Reported By:", test.results.reportedBy?.name || "N/A"],
        ["Reported At:", formatDate(test.results.reportedAt)],
        ["Verified By:", test.results.verifiedBy?.name || "N/A"],
        ["Verified At:", formatDate(test.results.verifiedAt)],
      ];

      autoTable(doc, {
        startY: yPos,
        head: [],
        body: reportingInfo,
        theme: "plain",
        styles: { fontSize: 9, cellPadding: 1 },
        columnStyles: {
          0: { fontStyle: "bold", cellWidth: 40 },
          1: { cellWidth: 60 },
        },
      });

      yPos = (doc as any).lastAutoTable.finalY + 4;
    } else {
      yPos = addText(
        "No results available for this test.",
        margin,
        yPos,
        10,
        "italic",
      );
      yPos += 4;
    }

    // ==================== FOOTER ====================
    // Check if we need a new page for footer
    if (yPos > pageHeight - 40) {
      doc.addPage();
      yPos = margin;
    }

    yPos = pageHeight - 30;
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 5;

    // Footer text
    yPos = addText(
      "This is a computer-generated report. Please verify with the laboratory if you have any questions.",
      pageWidth / 2,
      yPos,
      8,
      "normal",
      "center",
    );
    yPos = addText(
      `Report generated on: ${new Date().toLocaleString()}`,
      pageWidth / 2,
      yPos,
      8,
      "normal",
      "center",
    );

    // ==================== OUTPUT ====================
    if (mode === "print") {
      // Open print dialog
      doc.autoPrint();
      window.open(doc.output("bloburl"), "_blank");
    } else {
      // Download PDF
      const fileName = `lab-test-${test.testId}-${new Date().toISOString().split("T")[0]}.pdf`;
      doc.save(fileName);
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
    <Button variant={buttonVariant} size={buttonSize} onClick={generatePDF}>
      {icon}
      {label}
    </Button>
  );
};

export default LabTestPDFGenerator;
