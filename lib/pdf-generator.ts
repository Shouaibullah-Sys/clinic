// lib/pdf-generator.ts
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

export interface TestParameter {
  name: string;
  value: string | number;
  unit?: string;
  normalRange?: string;
  remarks?: string;
  flag?: "normal" | "low" | "high" | "critical";
}

export interface TestResults {
  parameters?: TestParameter[];
  interpretation?: string;
  reportedBy?: {
    _id?: string;
    name: string;
  } | null;
  reportedAt?: string;
  verifiedBy?: {
    _id?: string;
    name: string;
  } | null;
  verifiedAt?: string;
}

export interface Patient {
  _id?: string;
  name: string;
  patientId: string;
  phone?: string;
  age?: number;
  gender?: string;
  dateOfBirth?: string;
}

export interface Doctor {
  _id?: string;
  name: string;
  specialization?: string;
  department?: string;
}

export interface LabTest {
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

export const generateLabTestPDF = (
  test: LabTest,
  mode: "print" | "download" = "print",
) => {
  if (!test) return;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = 100;

  // --- PROFESSIONAL MEDICAL COLOR SCHEME ---
  const primary = [0, 90, 156]; // Medical blue
  const accent = [220, 60, 50]; // Alert red for critical values
  const bgLight = [250, 251, 252];
  const textDark = [30, 30, 30];
  const normalGreen = [56, 161, 105]; // Normal range indicator
  const alertOrange = [245, 159, 0]; // Borderline indicator

  // --- HEADER WITH MEDICAL BRANDING ---
  doc.setFillColor(primary[0], primary[1], primary[2]);
  doc.rect(0, 0, pageWidth, 80, "F");

  // Professional accent line
  doc.setDrawColor(accent[0], accent[1], accent[2]);
  doc.setLineWidth(2);
  doc.line(0, 80, pageWidth, 80);

  // Security watermark
  (doc as any).setGState(new (doc as any).GState({ opacity: 0.03 }));
  doc.setTextColor(100, 100, 100);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(36);
  doc.text("CONFIDENTIAL MEDICAL REPORT", pageWidth / 2, pageHeight / 2, {
    align: "center",
    angle: 45,
  });
  (doc as any).setGState(new (doc as any).GState({ opacity: 1 }));

  // Header titles
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text("LABORATORY TEST REPORT", pageWidth / 2, 35, { align: "center" });

  doc.setFontSize(12);
  doc.setTextColor(240, 240, 240);
  doc.text("Professional Medical Laboratory", pageWidth / 2, 55, {
    align: "center",
  });

  // Header document info
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(230, 230, 230);
  doc.text(`Report ID: LAB-${test.labReferenceId || test.testId}`, 40, 70);
  doc.text(
    `Date: ${format(new Date(test.orderedAt), "PPP")}`,
    pageWidth - 40,
    70,
    {
      align: "right",
    },
  );

  // === PROFESSIONAL SECTION DESIGN ===
  const drawSectionHeader = (title: string) => {
    y += 25;
    // Medical accent indicator
    doc.setFillColor(accent[0], accent[1], accent[2]);
    doc.rect(40, y - 16, 5, 20, "F");

    // Professional section background
    doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
    doc.roundedRect(40, y - 16, pageWidth - 80, 20, 3, 3, "FD");

    // Section title
    doc.setTextColor(primary[0], primary[1], primary[2]);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(title, 55, y);
    y += 12;
  };

  const addSectionSeparator = () => {
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
    y += 12;
    doc.line(50, y, pageWidth - 50, y);
    y += 12;
  };

  // --- PATIENT & TEST INFORMATION ---
  drawSectionHeader("Patient & Test Information");
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.setFontSize(10);

  // Single line patient info
  const patientInfo = `Patient: ${test.patient?.name || "N/A"} | ID: ${test.patient?.patientId || "N/A"} | Gender: ${test.patient?.gender || "N/A"} | Phone: ${test.patient?.phone || "Not provided"}`;
  doc.text(patientInfo, 55, y);

  y += 20;
  doc.text(`Report Date: ${format(new Date(test.orderedAt), "PPP")}`, 55, y);
  addSectionSeparator();

  // --- TEST INFORMATION ---
  drawSectionHeader("Test Information");
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.setFontSize(10);

  doc.text(`Test Name: ${test.testName}`, 55, y);
  doc.text(
    `Category: ${test.category?.replace(/_/g, " ") || "N/A"}`,
    55,
    y + 16,
  );
  doc.text(`Test ID: ${test.testId}`, 55, y + 32);
  doc.text(`Lab Reference: ${test.labReferenceId || "N/A"}`, 55, y + 48);
  doc.text(`Specimen Type: ${test.specimen?.type || "N/A"}`, 55, y + 64);

  // Priority badge
  if (test.priority) {
    const priorityColors: Record<string, [number, number, number]> = {
      emergency: [239, 68, 68],
      urgent: [249, 115, 22],
      routine: [59, 130, 246],
    };
    const priorityColor = priorityColors[test.priority] || [107, 114, 128];

    doc.setFillColor(priorityColor[0], priorityColor[1], priorityColor[2]);
    doc.roundedRect(300, y - 8, 60, 18, 3, 3, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(test.priority.toUpperCase(), 330, y + 4, { align: "center" });
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  }

  y += 85;
  addSectionSeparator();

  // --- DOCTOR INFORMATION ---
  // Handle doctor - can be object with name or undefined
  const doctorName = test.doctor?.name;
  if (doctorName) {
    drawSectionHeader("Doctor Information");
    y += 8;

    doc.setFont("helvetica", "normal");
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    doc.setFontSize(10);

    doc.text(`Doctor: Dr. ${doctorName}`, 55, y);
    doc.text(
      `Specialization: ${test.doctor?.specialization || "N/A"}`,
      55,
      y + 16,
    );
    doc.text(`Department: ${test.doctor?.department || "N/A"}`, 55, y + 32);

    y += 50;
    addSectionSeparator();
  }

  // --- TEST RESULTS ---
  if (test.results?.parameters && test.results.parameters.length > 0) {
    drawSectionHeader("Laboratory Findings");
    y += 10;

    // Test header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(primary[0], primary[1], primary[2]);
    doc.text(`${test.testName}`, 55, y);
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(
      `Category: ${test.category?.replace(/_/g, " ") || "General"}`,
      55,
      y + 14,
    );

    y += 30;

    // Parameters table header
    doc.setFillColor(primary[0], primary[1], primary[2]);
    doc.rect(55, y, pageWidth - 110, 20, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Parameter", 65, y + 12);
    doc.text("Value", 250, y + 12);
    doc.text("Unit", 350, y + 12);
    doc.text("Reference Range", 420, y + 12);
    doc.text("Status", pageWidth - 65, y + 12, { align: "right" });

    y += 20;

    // Helper function to check if value is abnormal
    const isAbnormal = (
      param: TestParameter,
    ): { status: string; color: number[] } => {
      const remarks = param.remarks?.toLowerCase() || "";
      const numValue = parseFloat(param.value.toString());
      const isNumeric = !isNaN(numValue);

      if (isNumeric && param.normalRange) {
        // Parse normal range (format: "min - max")
        const rangeMatch = param.normalRange.match(
          /(\d+\.?\d*)\s*-\s*(\d+\.?\d*)/,
        );
        if (rangeMatch) {
          const min = parseFloat(rangeMatch[1]);
          const max = parseFloat(rangeMatch[2]);
          if (numValue < min) {
            return { status: "Low", color: alertOrange };
          } else if (numValue > max) {
            return { status: "High", color: accent };
          }
        }
      }

      if (
        remarks.includes("abnormal") ||
        remarks.includes("high") ||
        remarks.includes("low") ||
        remarks.includes("critical")
      ) {
        if (remarks.includes("critical")) {
          return { status: "Critical", color: accent };
        }
        return { status: "Abnormal", color: accent };
      }

      return { status: "Normal", color: normalGreen };
    };

    // Test parameters
    test.results.parameters.forEach((param, paramIndex) => {
      // Alternate row background for readability
      if (paramIndex % 2 === 0) {
        doc.setFillColor(248, 249, 250);
        doc.rect(55, y, pageWidth - 110, 18, "F");
      }

      const { status, color } = isAbnormal(param);

      doc.setTextColor(textDark[0], textDark[1], textDark[2]);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);

      // Parameter data
      doc.text(param.name, 65, y + 10);
      doc.text(param.value.toString(), 250, y + 10);
      doc.text(param.unit || "-", 350, y + 10);
      doc.text(param.normalRange || "-", 420, y + 10);

      // Status with color coding
      doc.setTextColor(color[0], color[1], color[2]);
      doc.text(status, pageWidth - 65, y + 10, { align: "right" });

      y += 18;

      // Page break check
      if (y > pageHeight - 100) {
        doc.addPage();
        y = 50;
        // Recreate table header on new page
        doc.setFillColor(primary[0], primary[1], primary[2]);
        doc.rect(55, y, pageWidth - 110, 20, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.text("Parameter", 65, y + 12);
        doc.text("Value", 250, y + 12);
        doc.text("Unit", 350, y + 12);
        doc.text("Reference Range", 420, y + 12);
        doc.text("Status", pageWidth - 65, y + 12, { align: "right" });
        y += 20;
      }
    });

    y += 15;
    addSectionSeparator();

    // --- REPORTING INFORMATION ---
    drawSectionHeader("Reporting Information");
    y += 8;

    doc.setFont("helvetica", "normal");
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    doc.setFontSize(10);

    // Handle reportedBy - can be object with name or null
    const reportedByName = test.results?.reportedBy?.name || "N/A";
    doc.text(`Reported By: ${reportedByName}`, 55, y);
    doc.text(
      `Reported At: ${test.results?.reportedAt ? format(new Date(test.results.reportedAt), "PPP p") : "N/A"}`,
      55,
      y + 16,
    );

    // Handle verifiedBy - can be object with name or null
    const verifiedByName = test.results?.verifiedBy?.name || "Pending";
    doc.text(`Verified By: ${verifiedByName}`, 55, y + 32);
    doc.text(
      `Verified At: ${test.results?.verifiedAt ? format(new Date(test.results.verifiedAt), "PPP p") : "Pending"}`,
      55,
      y + 48,
    );

    y += 65;
    addSectionSeparator();
  } else {
    drawSectionHeader("Laboratory Findings");
    y += 10;
    doc.setFont("helvetica", "italic");
    doc.setTextColor(150, 150, 150);
    doc.text("No test results available.", 55, y);
    addSectionSeparator();
  }

  // --- INTERPRETATION & NOTES ---
  drawSectionHeader("Clinical Interpretation");
  y += 10;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.setFontSize(9);

  // Count abnormal results
  let abnormalCount = 0;
  let criticalCount = 0;

  if (test.results?.parameters && test.results.parameters.length > 0) {
    test.results.parameters.forEach((param) => {
      const remarks = param.remarks?.toLowerCase() || "";
      const numValue = parseFloat(param.value.toString());
      const isNumeric = !isNaN(numValue);

      if (isNumeric && param.normalRange) {
        const rangeMatch = param.normalRange.match(
          /(\d+\.?\d*)\s*-\s*(\d+\.?\d*)/,
        );
        if (rangeMatch) {
          const min = parseFloat(rangeMatch[1]);
          const max = parseFloat(rangeMatch[2]);
          if (numValue < min || numValue > max) {
            abnormalCount++;
            // Check if critically abnormal (more than 50% outside range)
            const range = max - min;
            const deviation =
              numValue < min
                ? ((min - numValue) / range) * 100
                : ((numValue - max) / range) * 100;

            if (deviation > 50) {
              criticalCount++;
            }
          }
        }
      }

      if (remarks.includes("abnormal") || remarks.includes("critical")) {
        abnormalCount++;
        if (remarks.includes("critical")) {
          criticalCount++;
        }
      }
    });
  }

  if (abnormalCount === 0) {
    doc.text(
      "• All laboratory parameters are within normal reference ranges.",
      55,
      y,
    );
    doc.text("• No significant abnormalities detected.", 55, y + 14);
    doc.text("• Results suggest normal physiological status.", 55, y + 28);
  } else if (criticalCount > 0) {
    doc.setTextColor(accent[0], accent[1], accent[2]);
    doc.text(
      `• CRITICAL: ${criticalCount} parameter(s) require immediate medical attention.`,
      55,
      y,
    );
    doc.text(
      `• ABNORMAL: ${abnormalCount} parameter(s) outside reference ranges.`,
      55,
      y + 14,
    );
    doc.text(
      "• Urgent consultation with healthcare provider recommended.",
      55,
      y + 28,
    );
  } else {
    doc.setTextColor(alertOrange[0], alertOrange[1], alertOrange[2]);
    doc.text(
      `• ABNORMAL: ${abnormalCount} parameter(s) outside reference ranges.`,
      55,
      y,
    );
    doc.text("• Follow-up testing recommended in 2-4 weeks.", 55, y + 14);
    doc.text(
      "• Consult with healthcare provider for clinical correlation.",
      55,
      y + 28,
    );
  }

  y += 50;
  addSectionSeparator();

  // --- AUTHORIZATION FOOTER ---
  y += 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(primary[0], primary[1], primary[2]);
  doc.text("AUTHORIZED LABORATORY PERSONNEL", pageWidth / 2, y, {
    align: "center",
  });

  y += 25;
  doc.setDrawColor(primary[0], primary[1], primary[2]);
  doc.setLineWidth(0.5);
  doc.line(pageWidth / 2 - 80, y, pageWidth / 2 + 80, y);

  // --- CONFIDENTIALITY FOOTER ---
  const footerY = pageHeight - 40;
  doc.setFontSize(8);
  doc.setTextColor(130, 130, 130);
  doc.setFont("helvetica", "normal");
  doc.text(
    "CONFIDENTIAL MEDICAL DOCUMENT - Unauthorized disclosure prohibited. Electronically generated report.",
    pageWidth / 2,
    footerY,
    { align: "center" },
  );

  doc.setFontSize(7);
  doc.text(
    `Report generated on: ${format(new Date(), "PPPP 'at' p")}`,
    pageWidth / 2,
    footerY + 12,
    { align: "center" },
  );

  // --- OUTPUT ---
  if (mode === "print") {
    // Create a blob and open print window
    const pdfBlob = doc.output("blob");
    const pdfUrl = URL.createObjectURL(pdfBlob);

    // Create a hidden iframe for printing
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    iframe.src = pdfUrl;
    iframe.onload = () => {
      iframe.contentWindow?.print();
      // Clean up after print
      setTimeout(() => {
        document.body.removeChild(iframe);
        URL.revokeObjectURL(pdfUrl);
      }, 1000);
    };
    document.body.appendChild(iframe);
  } else {
    // Download PDF
    const fileName = `lab-report-${test.patient?.name?.toLowerCase().replace(/\s+/g, "-") || "patient"}-${test.testId}.pdf`;
    doc.save(fileName);
  }
};

// Direct Lab Test Interface
export interface DirectLabTest {
  _id: string;
  testId: string;
  testName: string;
  category: string;
  patient: {
    _id: string;
    name: string;
    patientId: string;
    phone?: string;
    age?: number;
    gender?: string;
    dateOfBirth?: string;
  };
  createdBy?: {
    _id: string;
    name: string;
  };
  status: string;
  collectionStatus: string;
  processingStatus: string;
  paymentVerified: boolean;
  priority: string;
  createdAtDirect: string;
  finalized: boolean;
  readyForPrint: boolean;
  printedAt?: string;
  charges?: {
    paymentStatus: string;
    totalAmount: number;
    paid: number;
    due: number;
  };
  specimen?: {
    type: string;
    quantity?: string;
  };
  results?: {
    parameters: Array<{
      name: string;
      value: string | number;
      unit?: string;
      normalRange?: string;
      remarks?: string;
      flag?: "normal" | "low" | "high" | "critical";
    }>;
    interpretation?: string;
    reportedBy?: {
      _id?: string;
      name: string;
    } | null;
    reportedAt?: string;
    verifiedBy?: {
      _id?: string;
      name: string;
    } | null;
    verifiedAt?: string;
  };
}

/**
 * generateDirectTestPDF - Generates a professional PDF report for direct laboratory tests
 *
 * This function creates a comprehensive PDF report for direct lab tests (tests ordered without a doctor),
 * including patient information, test details, results with reference ranges, and payment information.
 *
 * @param test - The direct lab test object containing all test data
 * @param mode - Either "print" to open print dialog or "download" to save PDF file
 */
export const generateDirectTestPDF = (
  test: DirectLabTest,
  mode: "print" | "download" = "print",
) => {
  if (!test) return;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = 100;

  // --- PROFESSIONAL MEDICAL COLOR SCHEME ---
  const primary = [0, 90, 156]; // Medical blue
  const accent = [220, 60, 50]; // Alert red for critical values
  const bgLight = [250, 251, 252];
  const textDark = [30, 30, 30];
  const normalGreen = [56, 161, 105]; // Normal range indicator
  const alertOrange = [245, 159, 0]; // Borderline indicator

  // --- HEADER WITH MEDICAL BRANDING ---
  doc.setFillColor(primary[0], primary[1], primary[2]);
  doc.rect(0, 0, pageWidth, 80, "F");

  // Professional accent line
  doc.setDrawColor(accent[0], accent[1], accent[2]);
  doc.setLineWidth(2);
  doc.line(0, 80, pageWidth, 80);

  // Security watermark
  (doc as any).setGState(new (doc as any).GState({ opacity: 0.03 }));
  doc.setTextColor(100, 100, 100);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(36);
  doc.text("CONFIDENTIAL MEDICAL REPORT", pageWidth / 2, pageHeight / 2, {
    align: "center",
    angle: 45,
  });
  (doc as any).setGState(new (doc as any).GState({ opacity: 1 }));

  // Header titles
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text("DIRECT LABORATORY TEST REPORT", pageWidth / 2, 35, {
    align: "center",
  });

  doc.setFontSize(12);
  doc.setTextColor(240, 240, 240);
  doc.text("Professional Medical Laboratory", pageWidth / 2, 55, {
    align: "center",
  });

  // Header document info
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(230, 230, 230);
  doc.text(`Report ID: DIR-${test.testId}`, 40, 70);
  doc.text(
    `Date: ${format(new Date(test.createdAtDirect), "PPP")}`,
    pageWidth - 40,
    70,
    {
      align: "right",
    },
  );

  // === PROFESSIONAL SECTION DESIGN ===
  const drawSectionHeader = (title: string) => {
    y += 25;
    // Medical accent indicator
    doc.setFillColor(accent[0], accent[1], accent[2]);
    doc.rect(40, y - 16, 5, 20, "F");

    // Professional section background
    doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
    doc.roundedRect(40, y - 16, pageWidth - 80, 20, 3, 3, "FD");

    // Section title
    doc.setTextColor(primary[0], primary[1], primary[2]);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(title, 55, y);
    y += 12;
  };

  const addSectionSeparator = () => {
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
    y += 12;
    doc.line(50, y, pageWidth - 50, y);
    y += 12;
  };

  // --- PATIENT & TEST INFORMATION ---
  drawSectionHeader("Patient & Test Information");
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.setFontSize(10);

  // Single line patient info
  const patientInfo = `Patient: ${test.patient?.name || "N/A"} | ID: ${test.patient?.patientId || "N/A"} | Gender: ${test.patient?.gender || "N/A"} | Phone: ${test.patient?.phone || "Not provided"}`;
  doc.text(patientInfo, 55, y);

  y += 20;
  doc.text(
    `Report Date: ${format(new Date(test.createdAtDirect), "PPP")}`,
    55,
    y,
  );
  addSectionSeparator();

  // --- TEST INFORMATION ---
  drawSectionHeader("Test Information");
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.setFontSize(10);

  doc.text(`Test Name: ${test.testName}`, 55, y);
  doc.text(
    `Category: ${test.category?.replace(/_/g, " ") || "N/A"}`,
    55,
    y + 16,
  );
  doc.text(`Test ID: ${test.testId}`, 55, y + 32);
  doc.text(`Specimen Type: ${test.specimen?.type || "N/A"}`, 55, y + 48);

  // Priority badge
  if (test.priority) {
    const priorityColors: Record<string, [number, number, number]> = {
      emergency: [239, 68, 68],
      urgent: [249, 115, 22],
      routine: [59, 130, 246],
    };
    const priorityColor = priorityColors[test.priority] || [107, 114, 128];

    doc.setFillColor(priorityColor[0], priorityColor[1], priorityColor[2]);
    doc.roundedRect(300, y - 8, 60, 18, 3, 3, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(test.priority.toUpperCase(), 330, y + 4, { align: "center" });
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  }

  y += 70;
  addSectionSeparator();

  // --- PAYMENT INFORMATION ---
  if (test.charges) {
    drawSectionHeader("Payment Information");
    y += 8;

    doc.setFont("helvetica", "normal");
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    doc.setFontSize(10);

    const formatPrice = (price: number) => {
      return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(price);
    };

    doc.text(`Total Amount: ${formatPrice(test.charges.totalAmount)}`, 55, y);
    doc.text(`Amount Paid: ${formatPrice(test.charges.paid)}`, 55, y + 16);
    doc.text(`Amount Due: ${formatPrice(test.charges.due)}`, 55, y + 32);

    // Payment status badge
    const paymentStatusColors: Record<string, [number, number, number]> = {
      paid: [56, 161, 105],
      partial: [245, 159, 0],
      pending: [107, 114, 128],
    };
    const paymentColor = paymentStatusColors[test.charges.paymentStatus] || [
      107, 114, 128,
    ];

    doc.setFillColor(paymentColor[0], paymentColor[1], paymentColor[2]);
    doc.roundedRect(300, y - 8, 70, 18, 3, 3, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(test.charges.paymentStatus.toUpperCase(), 335, y + 4, {
      align: "center",
    });
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);

    y += 55;
    addSectionSeparator();
  }

  // --- TEST RESULTS ---
  if (test.results?.parameters && test.results.parameters.length > 0) {
    drawSectionHeader("Laboratory Findings");
    y += 10;

    // Test header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(primary[0], primary[1], primary[2]);
    doc.text(`${test.testName}`, 55, y);
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(
      `Category: ${test.category?.replace(/_/g, " ") || "General"}`,
      55,
      y + 14,
    );

    y += 30;

    // Parameters table header
    doc.setFillColor(primary[0], primary[1], primary[2]);
    doc.rect(55, y, pageWidth - 110, 20, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Parameter", 65, y + 12);
    doc.text("Value", 250, y + 12);
    doc.text("Unit", 350, y + 12);
    doc.text("Reference Range", 420, y + 12);
    doc.text("Status", pageWidth - 65, y + 12, { align: "right" });

    y += 20;

    // Helper function to check if value is abnormal
    const isAbnormal = (
      param: TestParameter,
    ): { status: string; color: number[] } => {
      const remarks = param.remarks?.toLowerCase() || "";
      const numValue = parseFloat(param.value.toString());
      const isNumeric = !isNaN(numValue);

      if (isNumeric && param.normalRange) {
        // Parse normal range (format: "min - max")
        const rangeMatch = param.normalRange.match(
          /(\d+\.?\d*)\s*-\s*(\d+\.?\d*)/,
        );
        if (rangeMatch) {
          const min = parseFloat(rangeMatch[1]);
          const max = parseFloat(rangeMatch[2]);
          if (numValue < min) {
            return { status: "Low", color: alertOrange };
          } else if (numValue > max) {
            return { status: "High", color: accent };
          }
        }
      }

      if (
        remarks.includes("abnormal") ||
        remarks.includes("high") ||
        remarks.includes("low") ||
        remarks.includes("critical")
      ) {
        if (remarks.includes("critical")) {
          return { status: "Critical", color: accent };
        }
        return { status: "Abnormal", color: accent };
      }

      return { status: "Normal", color: normalGreen };
    };

    // Test parameters
    test.results.parameters.forEach((param, paramIndex) => {
      // Alternate row background for readability
      if (paramIndex % 2 === 0) {
        doc.setFillColor(248, 249, 250);
        doc.rect(55, y, pageWidth - 110, 18, "F");
      }

      const { status, color } = isAbnormal(param);

      doc.setTextColor(textDark[0], textDark[1], textDark[2]);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);

      // Parameter data
      doc.text(param.name, 65, y + 10);
      doc.text(param.value.toString(), 250, y + 10);
      doc.text(param.unit || "-", 350, y + 10);
      doc.text(param.normalRange || "-", 420, y + 10);

      // Status with color coding
      doc.setTextColor(color[0], color[1], color[2]);
      doc.text(status, pageWidth - 65, y + 10, { align: "right" });

      y += 18;

      // Page break check
      if (y > pageHeight - 100) {
        doc.addPage();
        y = 50;
        // Recreate table header on new page
        doc.setFillColor(primary[0], primary[1], primary[2]);
        doc.rect(55, y, pageWidth - 110, 20, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.text("Parameter", 65, y + 12);
        doc.text("Value", 250, y + 12);
        doc.text("Unit", 350, y + 12);
        doc.text("Reference Range", 420, y + 12);
        doc.text("Status", pageWidth - 65, y + 12, { align: "right" });
        y += 20;
      }
    });

    y += 15;
    addSectionSeparator();

    // --- REPORTING INFORMATION ---
    drawSectionHeader("Reporting Information");
    y += 8;

    doc.setFont("helvetica", "normal");
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    doc.setFontSize(10);

    // Handle reportedBy - can be object with name or null
    const reportedByName = test.results?.reportedBy?.name || "N/A";
    doc.text(`Reported By: ${reportedByName}`, 55, y);
    doc.text(
      `Reported At: ${test.results?.reportedAt ? format(new Date(test.results.reportedAt), "PPP p") : "N/A"}`,
      55,
      y + 16,
    );

    // Handle verifiedBy - can be object with name or null
    const verifiedByName = test.results?.verifiedBy?.name || "Pending";
    doc.text(`Verified By: ${verifiedByName}`, 55, y + 32);
    doc.text(
      `Verified At: ${test.results?.verifiedAt ? format(new Date(test.results.verifiedAt), "PPP p") : "Pending"}`,
      55,
      y + 48,
    );

    y += 65;
    addSectionSeparator();
  } else {
    drawSectionHeader("Laboratory Findings");
    y += 10;
    doc.setFont("helvetica", "italic");
    doc.setTextColor(150, 150, 150);
    doc.text("No test results available.", 55, y);
    addSectionSeparator();
  }

  // --- INTERPRETATION & NOTES ---
  drawSectionHeader("Clinical Interpretation");
  y += 10;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.setFontSize(9);

  // Count abnormal results
  let abnormalCount = 0;
  let criticalCount = 0;

  if (test.results?.parameters && test.results.parameters.length > 0) {
    test.results.parameters.forEach((param) => {
      const remarks = param.remarks?.toLowerCase() || "";
      const numValue = parseFloat(param.value.toString());
      const isNumeric = !isNaN(numValue);

      if (isNumeric && param.normalRange) {
        const rangeMatch = param.normalRange.match(
          /(\d+\.?\d*)\s*-\s*(\d+\.?\d*)/,
        );
        if (rangeMatch) {
          const min = parseFloat(rangeMatch[1]);
          const max = parseFloat(rangeMatch[2]);
          if (numValue < min || numValue > max) {
            abnormalCount++;
            // Check if critically abnormal (more than 50% outside range)
            const range = max - min;
            const deviation =
              numValue < min
                ? ((min - numValue) / range) * 100
                : ((numValue - max) / range) * 100;

            if (deviation > 50) {
              criticalCount++;
            }
          }
        }
      }

      if (remarks.includes("abnormal") || remarks.includes("critical")) {
        abnormalCount++;
        if (remarks.includes("critical")) {
          criticalCount++;
        }
      }
    });
  }

  if (abnormalCount === 0) {
    doc.text(
      "• All laboratory parameters are within normal reference ranges.",
      55,
      y,
    );
    doc.text("• No significant abnormalities detected.", 55, y + 14);
    doc.text("• Results suggest normal physiological status.", 55, y + 28);
  } else if (criticalCount > 0) {
    doc.setTextColor(accent[0], accent[1], accent[2]);
    doc.text(
      `• CRITICAL: ${criticalCount} parameter(s) require immediate medical attention.`,
      55,
      y,
    );
    doc.text(
      `• ABNORMAL: ${abnormalCount} parameter(s) outside reference ranges.`,
      55,
      y + 14,
    );
    doc.text(
      "• Urgent consultation with healthcare provider recommended.",
      55,
      y + 28,
    );
  } else {
    doc.setTextColor(alertOrange[0], alertOrange[1], alertOrange[2]);
    doc.text(
      `• ABNORMAL: ${abnormalCount} parameter(s) outside reference ranges.`,
      55,
      y,
    );
    doc.text("• Follow-up testing recommended in 2-4 weeks.", 55, y + 14);
    doc.text(
      "• Consult with healthcare provider for clinical correlation.",
      55,
      y + 28,
    );
  }

  y += 50;
  addSectionSeparator();

  // --- AUTHORIZATION FOOTER ---
  y += 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(primary[0], primary[1], primary[2]);
  doc.text("AUTHORIZED LABORATORY PERSONNEL", pageWidth / 2, y, {
    align: "center",
  });

  y += 25;
  doc.setDrawColor(primary[0], primary[1], primary[2]);
  doc.setLineWidth(0.5);
  doc.line(pageWidth / 2 - 80, y, pageWidth / 2 + 80, y);

  // --- CONFIDENTIALITY FOOTER ---
  const footerY = pageHeight - 40;
  doc.setFontSize(8);
  doc.setTextColor(130, 130, 130);
  doc.setFont("helvetica", "normal");
  doc.text(
    "CONFIDENTIAL MEDICAL DOCUMENT - Unauthorized disclosure prohibited. Electronically generated report.",
    pageWidth / 2,
    footerY,
    { align: "center" },
  );

  doc.setFontSize(7);
  doc.text(
    `Report generated on: ${format(new Date(), "PPPP 'at' p")}`,
    pageWidth / 2,
    footerY + 12,
    { align: "center" },
  );

  // --- OUTPUT ---
  if (mode === "print") {
    // Create a blob and open print window
    const pdfBlob = doc.output("blob");
    const pdfUrl = URL.createObjectURL(pdfBlob);

    // Create a hidden iframe for printing
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    iframe.src = pdfUrl;
    iframe.onload = () => {
      iframe.contentWindow?.print();
      // Clean up after print
      setTimeout(() => {
        document.body.removeChild(iframe);
        URL.revokeObjectURL(pdfUrl);
      }, 1000);
    };
    document.body.appendChild(iframe);
  } else {
    // Download PDF
    const fileName = `direct-lab-report-${test.patient?.name?.toLowerCase().replace(/\s+/g, "-") || "patient"}-${test.testId}.pdf`;
    doc.save(fileName);
  }
};

// Discharge Card Interface
export interface DischargeCardPDFData {
  _id: string;
  dischargeId: string;
  operationName: string;
  operationCost: number;
  operationDate: string;
  operationType: string;
  diagnosis: string;
  admissionDate: string;
  dischargeDate: string;
  totalDays: number;
  preOpMedicines: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    dosage?: string;
  }>;
  postOpMedicines: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    dosage?: string;
    frequency?: string;
    duration?: string;
  }>;
  dischargeMedicines: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    instructions?: string;
  }>;
  otherRequirements: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  billing: {
    subtotal: number;
    totalAmount: number;
    paidAmount: number;
    balance: number;
    paymentStatus: string;
  };
  status: string;
  dischargeInstructions: string;
  followUpDate?: string;
  doctor: {
    name: string;
    specialization: string;
  };
  patient: {
    name: string;
    patientId: string;
    phone?: string;
    age?: number;
    gender?: string;
    dateOfBirth?: string;
  };
  createdAt: string;
}

/**
 * generateDischargeCardPDF - Generates a professional PDF discharge card for patients
 *
 * This function creates a comprehensive discharge card including:
 * - Patient information
 * - Operation details
 * - Pre-op, post-op, and discharge medicines
 * - Billing information
 * - Discharge instructions
 *
 * @param card - The discharge card data object
 * @param mode - Either "print" to open print dialog or "download" to save PDF file
 */
export const generateDischargeCardPDF = (
  card: DischargeCardPDFData,
  mode: "print" | "download" = "print",
) => {
  if (!card) return;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = 100;

  // --- PROFESSIONAL MEDICAL COLOR SCHEME ---
  const primary = [0, 90, 156]; // Medical blue
  const accent = [220, 60, 50]; // Alert red
  const bgLight = [250, 251, 252];
  const textDark = [30, 30, 30];
  const successGreen = [56, 161, 105]; // Success green for paid status
  const warningOrange = [245, 159, 0]; // Warning for pending payments

  // --- HEADER WITH MEDICAL BRANDING ---
  doc.setFillColor(primary[0], primary[1], primary[2]);
  doc.rect(0, 0, pageWidth, 80, "F");

  // Professional accent line
  doc.setDrawColor(accent[0], accent[1], accent[2]);
  doc.setLineWidth(2);
  doc.line(0, 80, pageWidth, 80);

  // Security watermark
  (doc as any).setGState(new (doc as any).GState({ opacity: 0.03 }));
  doc.setTextColor(100, 100, 100);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(36);
  doc.text("HOSPITAL DISCHARGE DOCUMENT", pageWidth / 2, pageHeight / 2, {
    align: "center",
    angle: 45,
  });
  (doc as any).setGState(new (doc as any).GState({ opacity: 1 }));

  // Header titles
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text("DISCHARGE CARD", pageWidth / 2, 35, { align: "center" });

  doc.setFontSize(12);
  doc.setTextColor(240, 240, 240);
  doc.text("Professional Medical Center", pageWidth / 2, 55, {
    align: "center",
  });

  // Header document info
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(230, 230, 230);
  doc.text(`Discharge ID: ${card.dischargeId}`, 40, 70);
  doc.text(
    `Date: ${format(new Date(card.createdAt), "PPP")}`,
    pageWidth - 40,
    70,
    {
      align: "right",
    },
  );

  // === PROFESSIONAL SECTION DESIGN ===
  const drawSectionHeader = (title: string) => {
    y += 25;
    // Medical accent indicator
    doc.setFillColor(accent[0], accent[1], accent[2]);
    doc.rect(40, y - 16, 5, 20, "F");

    // Professional section background
    doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
    doc.roundedRect(40, y - 16, pageWidth - 80, 20, 3, 3, "FD");

    // Section title
    doc.setTextColor(primary[0], primary[1], primary[2]);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(title, 55, y);
    y += 12;
  };

  const addSectionSeparator = () => {
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
    y += 12;
    doc.line(50, y, pageWidth - 50, y);
    y += 12;
  };

  // --- PATIENT INFORMATION ---
  drawSectionHeader("Patient Information");
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.setFontSize(10);

  doc.text(`Patient Name: ${card.patient.name}`, 55, y);
  doc.text(`Patient ID: ${card.patient.patientId}`, 300, y);

  y += 16;
  doc.text(`Phone: ${card.patient.phone || "Not provided"}`, 55, y);
  doc.text(
    `Gender/Age: ${card.patient.gender || "N/A"} / ${card.patient.age || "N/A"}`,
    300,
    y,
  );

  y += 30;
  addSectionSeparator();

  // --- ADMISSION & DISCHARGE DETAILS ---
  drawSectionHeader("Admission & Discharge Details");
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.setFontSize(10);

  doc.text(
    `Admission Date: ${format(new Date(card.admissionDate), "PPP")}`,
    55,
    y,
  );
  doc.text(
    `Discharge Date: ${format(new Date(card.dischargeDate), "PPP")}`,
    300,
    y,
  );

  y += 16;
  doc.text(`Total Days: ${card.totalDays} days`, 55, y);
  doc.text(`Diagnosis: ${card.diagnosis}`, 200, y);

  y += 30;
  addSectionSeparator();

  // --- OPERATION DETAILS ---
  drawSectionHeader("Operation Details");
  y += 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(primary[0], primary[1], primary[2]);
  doc.text(`${card.operationName}`, 55, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);

  y += 20;
  doc.text(`Operation Type: ${card.operationType}`, 55, y);
  doc.text(
    `Operation Date: ${format(new Date(card.operationDate), "PPP")}`,
    250,
    y,
  );

  y += 16;
  doc.text(`Operation Cost: ${card.operationCost.toFixed(2)}`, 55, y);

  y += 30;
  addSectionSeparator();

  // --- MEDICINES SECTION ---
  // Define the type for medicines with section
  type MedicineWithSection = {
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    section: string;
    instructions?: string;
  };

  const allMedicines: MedicineWithSection[] = [
    ...card.preOpMedicines.map((m) => ({
      ...m,
      section: "Pre-Operation Medicines",
    })),
    ...card.postOpMedicines.map((m) => ({
      ...m,
      section: "Post-Operation Medicines",
    })),
    ...card.dischargeMedicines.map((m) => ({
      ...m,
      section: "Discharge Medicines (Take-Home)",
    })),
  ];

  if (allMedicines.length > 0) {
    drawSectionHeader("Medicines");
    y += 10;

    // Table header
    doc.setFillColor(primary[0], primary[1], primary[2]);
    doc.rect(55, y, pageWidth - 110, 20, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Category", 65, y + 12);
    doc.text("Medicine Name", 140, y + 12);
    doc.text("Qty", 280, y + 12);
    doc.text("Price", 350, y + 12);
    doc.text("Total", pageWidth - 65, y + 12, { align: "right" });

    y += 20;

    let currentSection = "";
    let medicinesCost = 0;

    allMedicines.forEach((med, index) => {
      medicinesCost += med.totalPrice;

      // Section header
      if (med.section !== currentSection) {
        currentSection = med.section;
        doc.setFillColor(240, 240, 240);
        doc.rect(55, y - 8, pageWidth - 110, 18, "F");
        doc.setTextColor(primary[0], primary[1], primary[2]);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.text(med.section, 65, y + 4);
        y += 18;
      }

      // Alternate row background
      if (index % 2 === 0) {
        doc.setFillColor(248, 249, 250);
        doc.rect(55, y, pageWidth - 110, 18, "F");
      }

      doc.setTextColor(textDark[0], textDark[1], textDark[2]);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);

      doc.text("", 65, y + 10); // Empty category cell for non-header rows
      doc.text(med.name, 140, y + 10);
      doc.text(med.quantity.toString(), 280, y + 10);
      doc.text(`${med.unitPrice.toFixed(2)}`, 350, y + 10);
      doc.text(`${med.totalPrice.toFixed(2)}`, pageWidth - 65, y + 10, {
        align: "right",
      });

      // Add instructions for discharge medicines if present
      if (med.instructions) {
        doc.setFont("helvetica", "italic");
        doc.setTextColor(100, 100, 100);
        doc.setFontSize(8);
        doc.text(`Instructions: ${med.instructions}`, 140, y + 24);
        y += 10;
      }

      y += 18;

      // Page break check
      if (y > pageHeight - 120) {
        doc.addPage();
        y = 50;
      }
    });

    // Medicines total
    y += 5;
    doc.setDrawColor(220, 220, 220);
    doc.line(350, y, pageWidth - 50, y);
    y += 12;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    doc.text("Total Medicines Cost:", 350, y);
    doc.text(`${medicinesCost.toFixed(2)}`, pageWidth - 50, y, {
      align: "right",
    });

    y += 25;
    addSectionSeparator();
  }

  // --- OTHER REQUIREMENTS ---
  if (card.otherRequirements.length > 0) {
    drawSectionHeader("Other Requirements");
    y += 10;

    // Table header
    doc.setFillColor(primary[0], primary[1], primary[2]);
    doc.rect(55, y, pageWidth - 110, 20, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Item", 65, y + 12);
    doc.text("Quantity", 250, y + 12);
    doc.text("Unit Price", 380, y + 12);
    doc.text("Total", pageWidth - 65, y + 12, { align: "right" });

    y += 20;

    let otherRequirementsCost = 0;

    card.otherRequirements.forEach((item, index) => {
      otherRequirementsCost += item.totalPrice;

      // Alternate row background
      if (index % 2 === 0) {
        doc.setFillColor(248, 249, 250);
        doc.rect(55, y, pageWidth - 110, 18, "F");
      }

      doc.setTextColor(textDark[0], textDark[1], textDark[2]);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);

      doc.text(item.description || "", 65, y + 10);
      doc.text(item.quantity.toString(), 250, y + 10);
      doc.text(`${item.unitPrice.toFixed(2)}`, 380, y + 10);
      doc.text(`${item.totalPrice.toFixed(2)}`, pageWidth - 65, y + 10, {
        align: "right",
      });

      y += 18;

      // Page break check
      if (y > pageHeight - 120) {
        doc.addPage();
        y = 50;
      }
    });

    // Other requirements total
    y += 5;
    doc.setDrawColor(220, 220, 220);
    doc.line(350, y, pageWidth - 50, y);
    y += 12;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Total Other Requirements:", 350, y);
    doc.text(`${otherRequirementsCost.toFixed(2)}`, pageWidth - 50, y, {
      align: "right",
    });

    y += 25;
    addSectionSeparator();
  }

  // --- BILLING SUMMARY ---
  drawSectionHeader("Billing Summary");
  y += 10;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);

  doc.text(`Operation Cost: ${card.operationCost.toFixed(2)}`, 55, y);
  y += 16;

  const medicinesCost =
    card.preOpMedicines.reduce((sum, m) => sum + m.totalPrice, 0) +
    card.postOpMedicines.reduce((sum, m) => sum + m.totalPrice, 0) +
    card.dischargeMedicines.reduce((sum, m) => sum + m.totalPrice, 0);
  doc.text(`Medicines Cost: ${medicinesCost.toFixed(2)}`, 55, y);
  y += 16;

  const otherRequirementsCost = card.otherRequirements.reduce(
    (sum, r) => sum + r.totalPrice,
    0,
  );
  doc.text(`Other Requirements: ${otherRequirementsCost.toFixed(2)}`, 55, y);
  y += 16;

  doc.setDrawColor(220, 220, 220);
  doc.line(50, y, 250, y);
  y += 12;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(primary[0], primary[1], primary[2]);
  doc.text(`Total Amount: ${card.billing.totalAmount.toFixed(2)}`, 55, y);

  y += 20;

  // Payment status badge
  const paymentStatusColor =
    card.billing.paymentStatus === "paid"
      ? successGreen
      : card.billing.paymentStatus === "partial"
        ? warningOrange
        : [107, 114, 128];

  doc.setFillColor(
    paymentStatusColor[0],
    paymentStatusColor[1],
    paymentStatusColor[2],
  );
  doc.roundedRect(200, y - 12, 80, 24, 3, 3, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(card.billing.paymentStatus.toUpperCase(), 240, y + 4, {
    align: "center",
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text(`Paid: ${card.billing.paidAmount.toFixed(2)}`, 300, y);
  doc.text(`Balance: ${card.billing.balance.toFixed(2)}`, 420, y);

  y += 30;
  addSectionSeparator();

  // --- DISCHARGE INSTRUCTIONS ---
  if (card.dischargeInstructions) {
    drawSectionHeader("Discharge Instructions");
    y += 10;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);

    // Split long text into lines
    const splitInstructions = doc.splitTextToSize(
      card.dischargeInstructions,
      pageWidth - 110,
    );
    doc.text(splitInstructions, 55, y);

    y += splitInstructions.length * 14 + 20;
    addSectionSeparator();
  }

  // --- FOLLOW UP ---
  if (card.followUpDate) {
    drawSectionHeader("Follow Up");
    y += 10;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    doc.text(
      `Follow Up Date: ${format(new Date(card.followUpDate), "PPP")}`,
      55,
      y,
    );

    y += 25;
    addSectionSeparator();
  }

  // --- DOCTOR INFORMATION ---
  drawSectionHeader("Attending Physician");
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.setFontSize(10);

  doc.text(`Dr. ${card.doctor.name}`, 55, y);
  doc.text(`Specialization: ${card.doctor.specialization}`, 200, y);

  y += 40;

  // --- SIGNATURE LINE ---
  doc.setDrawColor(textDark[0], textDark[1], textDark[2]);
  doc.setLineWidth(0.5);
  doc.line(55, y, 200, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text("Doctor's Signature & Stamp", 55, y + 12);

  // --- CONFIDENTIALITY FOOTER ---
  const footerY = pageHeight - 40;
  doc.setFontSize(8);
  doc.setTextColor(130, 130, 130);
  doc.setFont("helvetica", "normal");
  doc.text(
    "CONFIDENTIAL MEDICAL DOCUMENT - Unauthorized disclosure prohibited. This document is for medical purposes only.",
    pageWidth / 2,
    footerY,
    { align: "center" },
  );

  doc.setFontSize(7);
  doc.text(
    `Document generated on: ${format(new Date(), "PPPP 'at' p")}`,
    pageWidth / 2,
    footerY + 12,
    { align: "center" },
  );

  // --- OUTPUT ---
  if (mode === "print") {
    // Create a blob and open print window
    const pdfBlob = doc.output("blob");
    const pdfUrl = URL.createObjectURL(pdfBlob);

    // Create a hidden iframe for printing
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    iframe.src = pdfUrl;
    iframe.onload = () => {
      iframe.contentWindow?.print();
      // Clean up after print
      setTimeout(() => {
        document.body.removeChild(iframe);
        URL.revokeObjectURL(pdfUrl);
      }, 1000);
    };
    document.body.appendChild(iframe);
  } else {
    // Download PDF
    const fileName = `discharge-card-${card.patient.name?.toLowerCase().replace(/\s+/g, "-") || "patient"}-${card.dischargeId}.pdf`;
    doc.save(fileName);
  }
};
