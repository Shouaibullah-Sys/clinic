// lib/pdf-generator.ts
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import "@/vazirmatn-normal.js";

const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
};

const ensurePersianFont = async (doc: jsPDF): Promise<boolean> => {
  try {
    doc.setFont("vazirmatn", "normal");
    return true;
  } catch {
    // Fallback: load TTF from public paths if available.
  }

  const candidates = [
    "/fonts/Vazirmatn-Regular.ttf",
    "/fonts/vazirmatn-normal.ttf",
    "/Vazirmatn-Regular.ttf",
    "/vazirmatn-normal.ttf",
  ];

  for (const fontPath of candidates) {
    try {
      const response = await fetch(fontPath);
      if (!response.ok) continue;
      const base64 = arrayBufferToBase64(await response.arrayBuffer());
      const vfsName = "vazirmatn-runtime.ttf";
      doc.addFileToVFS(vfsName, base64);
      doc.addFont(vfsName, "vazirmatn", "normal");
      doc.setFont("vazirmatn", "normal");
      return true;
    } catch {
      // Try next candidate.
    }
  }

  return false;
};

const shapePersian = (doc: jsPDF, text: string): string => {
  const maybeArabicProcessor = (doc as any).processArabic;
  if (typeof maybeArabicProcessor === "function") {
    return maybeArabicProcessor(text);
  }
  return text;
};

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
    parameters?: Array<{
      name: string;
      value?: string | number;
      result?: string | number;
      unit?: string;
      normalRange?: string;
      remarks?: string;
    }>;
  };
  results?: TestResults;
  priority?: string;
  labReferenceId?: string;
}

// lib/pdf-generator.ts - Updated generateLabTestPDF fu

const normalizeDirectToLabTest = (
  input: DirectLabTest | LabTest,
): LabTest => {
  if ("orderedAt" in input) return input;

  return {
    _id: input._id,
    testId: input.testId,
    testName: input.testName,
    category: input.category,
    patient: input.patient,
    doctor: (input as any).doctor,
    status: input.status,
    collectionStatus: input.collectionStatus,
    processingStatus: input.processingStatus,
    orderedAt: input.createdAtDirect,
    completedAt: (input as any).finalizedAt ?? (input as any).completedAt,
    specimen: input.specimen,
    results: input.results,
    priority: input.priority,
    labReferenceId: input.testId,
  };
};

export const generateDirectTestPDF = async (
  input: DirectLabTest | LabTest,
  mode: "print" | "download" = "print",
) => {
  if (!input) return;

  const test = normalizeDirectToLabTest(input);

  // Fallback for records where values were stored in specimen parameters.
  if (
    (!test.results?.parameters || test.results.parameters.length === 0) &&
    test.specimen?.parameters &&
    test.specimen.parameters.length > 0
  ) {
    test.results = {
      ...(test.results || {}),
      parameters: test.specimen.parameters
        .filter(
          (p) =>
            p.name &&
            p.name.trim() &&
            (p.value !== undefined ||
              p.result !== undefined ||
              p.value === 0 ||
              p.result === 0),
        )
        .map((p) => ({
          name: p.name,
          value: p.value ?? p.result ?? "",
          unit: p.unit,
          normalRange: p.normalRange,
          remarks: p.remarks,
        })),
    };
  }

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let y = 120;

  // --- HOSPITAL BRAND COLOR SCHEME ---
  const primary = [0, 92, 169]; // Hospital blue
  const accent = [0, 155, 116]; // Hospital green
  const bgLight = [250, 251, 252];
  const textDark = [30, 30, 30];
  const normalGreen = [56, 161, 105]; // Normal range indicator
  const alertOrange = [245, 159, 0]; // Borderline indicator
  await ensurePersianFont(doc);

  y += 20;

  // Helper function to draw two-column table (patient information)
  const drawTwoColumnTable = (
    rows: Array<[string, string, string, string]>,
  ) => {
    const tableX = margin;
    const tableWidth = pageWidth - margin * 2;
    const colWidth = tableWidth / 2;
    const rowHeight = 22;
    const startY = y;

    // Draw outer border
    doc.setDrawColor(primary[0], primary[1], primary[2]);
    doc.setLineWidth(0.8);
    doc.rect(tableX, startY, tableWidth, rows.length * rowHeight, "S");

    // Draw vertical divider
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(
      tableX + colWidth,
      startY,
      tableX + colWidth,
      startY + rows.length * rowHeight,
    );

    rows.forEach(([lLabel, lValue, rLabel, rValue], index) => {
      const rowY = startY + index * rowHeight;

      // Draw horizontal divider between rows
      if (index < rows.length - 1) {
        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.3);
        doc.line(
          tableX + 2,
          rowY + rowHeight,
          tableX + tableWidth - 2,
          rowY + rowHeight,
        );
      }

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(textDark[0], textDark[1], textDark[2]);

      // Format values with bold labels
      const leftText = `${lLabel}:`;
      const rightText = `${rLabel}:`;

      // Draw labels in bold
      doc.setFont("helvetica", "bold");
      doc.text(leftText, tableX + 8, rowY + 14);
      doc.text(rightText, tableX + colWidth + 8, rowY + 14);

      // Draw values in normal font
      doc.setFont("helvetica", "normal");
      doc.text(
        lValue || "N/A",
        tableX + 8 + doc.getTextWidth(leftText) + 5,
        rowY + 14,
      );
      doc.text(
        rValue || "N/A",
        tableX + colWidth + 8 + doc.getTextWidth(rightText) + 5,
        rowY + 14,
      );
    });

    y = startY + rows.length * rowHeight + 15;
  };

  // --- PATIENT INFORMATION TABLE ---
  const doctorName = test.doctor?.name ? `Dr. ${test.doctor.name}` : "N/A";
  const formatReportId = (id: string) => {
    if (/-\d{3}$/.test(id)) return id;
    const match = id.match(/^(.*?)(\d+)$/);
    if (!match) return id;
    const prefix = match[1];
    const digits = match[2];
    const tail = digits.slice(-3).padStart(3, "0");
    const head = digits.slice(0, -3);
    return `${prefix}${head}-${tail}`;
  };
  const rawReportId = `LAB-${test.labReferenceId || test.testId}`;
  const reportId = formatReportId(rawReportId);
  const reportDate = format(new Date(test.orderedAt), "PPP");

  drawTwoColumnTable([
    [
      "Patient",
      test.patient?.name || "N/A",
      "Patient ID",
      test.patient?.patientId || "N/A",
    ],
    [
      "Gender",
      test.patient?.gender || "N/A",
      "Phone",
      test.patient?.phone || "Not provided",
    ],
    ["Test ID", test.testId, "Report ID", reportId],
    ["Date", reportDate, "Doctor", doctorName],
    [
      "Category",
      test.category?.replace(/_/g, " ") || "General",
      "Priority",
      test.priority || "N/A",
    ],
  ]);

  // --- TEST TITLE ---
  y += 5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(primary[0], primary[1], primary[2]);
  const testTitle = test.testName || "Test";
  doc.text(testTitle, pageWidth / 2, y, { align: "center" });

  // Decorative line under test title
  doc.setDrawColor(accent[0], accent[1], accent[2]);
  doc.setLineWidth(0.8);
  doc.line(pageWidth / 2 - 80, y + 5, pageWidth / 2 + 80, y + 5);

  y += 20;

  // --- TEST RESULTS ---
  if (test.results?.parameters && test.results.parameters.length > 0) {
    const tableX = margin;
    const tableWidth = pageWidth - margin * 2;
    const headerHeight = 24;
    const rowHeight = 24;

    // Column positions
    const colPositions = {
      name: tableX + 15,
      value: tableX + tableWidth * 0.4,
      unit: tableX + tableWidth * 0.55,
      range: tableX + tableWidth * 0.68,
      status: tableX + tableWidth * 0.82,
    };

    // Draw outer border
    doc.setDrawColor(primary[0], primary[1], primary[2]);
    doc.setLineWidth(0.8);
    doc.rect(
      tableX,
      y,
      tableWidth,
      headerHeight + test.results.parameters.length * rowHeight,
      "S",
    );

    // Table header with background
    doc.setFillColor(primary[0], primary[1], primary[2]);
    doc.rect(tableX + 1, y + 1, tableWidth - 2, headerHeight - 2, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.text("Parameter", colPositions.name, y + 16);
    doc.text("Value", colPositions.value, y + 16);
    doc.text("Unit", colPositions.unit, y + 16);
    doc.text("Normal Range", colPositions.range, y + 16);
    doc.text("Status", colPositions.status, y + 16);

    // Draw vertical dividers in header
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.3);
    doc.line(
      colPositions.value - 8,
      y + 2,
      colPositions.value - 8,
      y + headerHeight - 2,
    );
    doc.line(
      colPositions.unit - 8,
      y + 2,
      colPositions.unit - 8,
      y + headerHeight - 2,
    );
    doc.line(
      colPositions.range - 8,
      y + 2,
      colPositions.range - 8,
      y + headerHeight - 2,
    );
    doc.line(
      colPositions.status - 8,
      y + 2,
      colPositions.status - 8,
      y + headerHeight - 2,
    );

    y += headerHeight;

    // Helper function to check if value is abnormal
    const isAbnormal = (
      param: TestParameter,
    ): { status: string; color: number[] } => {
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

    // Table body
    test.results.parameters.forEach((param, paramIndex) => {
      const rowY = y + paramIndex * rowHeight;

      // Alternate row background
      if (paramIndex % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(tableX + 1, rowY, tableWidth - 2, rowHeight - 1, "F");
      }

      // Draw horizontal divider between rows
      if (paramIndex < (test.results?.parameters?.length ?? 0) - 1) {
        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.3);
        doc.line(
          tableX + 2,
          rowY + rowHeight,
          tableX + tableWidth - 2,
          rowY + rowHeight,
        );
      }

      const { status, color } = isAbnormal(param);

      doc.setTextColor(textDark[0], textDark[1], textDark[2]);

      // Parameter name (bold)
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text(param.name, colPositions.name, rowY + 15);

      // Value (normal)
      doc.setFont("helvetica", "normal");
      doc.text(param.value.toString(), colPositions.value, rowY + 15);
      doc.text(param.unit || "-", colPositions.unit, rowY + 15);
      doc.text(param.normalRange || "-", colPositions.range, rowY + 15);

      // Status with color coding
      doc.setTextColor(color[0], color[1], color[2]);
      doc.setFont("helvetica", "bold");
      doc.text(status, colPositions.status, rowY + 15);

      // Page break check
      if (
        rowY + rowHeight > pageHeight - 80 &&
        paramIndex < (test.results?.parameters?.length ?? 0) - 1
      ) {
        doc.addPage();
        y = 50;

        // Recreate header on new page
        doc.setFillColor(primary[0], primary[1], primary[2]);
        doc.rect(tableX + 1, y, tableWidth - 2, headerHeight - 2, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.text("Parameter", colPositions.name, y + 16);
        doc.text("Value", colPositions.value, y + 16);
        doc.text("Unit", colPositions.unit, y + 16);
        doc.text("Reference Range", colPositions.range, y + 16);
        doc.text("Status", colPositions.status, y + 16);

        // Redraw vertical dividers
        doc.setDrawColor(255, 255, 255);
        doc.setLineWidth(0.3);
        doc.line(
          colPositions.value - 8,
          y + 2,
          colPositions.value - 8,
          y + headerHeight - 2,
        );
        doc.line(
          colPositions.unit - 8,
          y + 2,
          colPositions.unit - 8,
          y + headerHeight - 2,
        );
        doc.line(
          colPositions.range - 8,
          y + 2,
          colPositions.range - 8,
          y + headerHeight - 2,
        );
        doc.line(
          colPositions.status - 8,
          y + 2,
          colPositions.status - 8,
          y + headerHeight - 2,
        );

        y += headerHeight;
      }
    });

    y += test.results.parameters.length * rowHeight + 20;

    // --- REPORTED BY (with border, matching payment slip style) ---
    doc.setDrawColor(primary[0], primary[1], primary[2]);
    doc.setLineWidth(0.5);
    doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
    doc.roundedRect(margin, y - 5, 200, 35, 3, 3, "FD");

    doc.setFont("helvetica", "normal");
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    doc.setFontSize(9.5);

    doc.setFont("helvetica", "bold");
    doc.text("Reported By:", margin + 10, y + 10);
    doc.setFont("helvetica", "normal");

    const reportedByName =
      test.results?.reportedBy?.name ||
      (test as any)?.collectionDetails?.collectedBy?.name ||
      "Laboratory Staff";
    doc.text(reportedByName, margin + 80, y + 10);

    y += 35;
  } else {
    doc.setFont("helvetica", "italic");
    doc.setTextColor(150, 150, 150);
    doc.text("No test results available.", margin, y);
    y += 30;
  }

  // --- OUTPUT ---
  if (mode === "print") {
    const pdfBlob = doc.output("blob");
    const pdfUrl = URL.createObjectURL(pdfBlob);
    const printWindow = window.open(pdfUrl, "_blank");
    if (!printWindow) {
      const a = document.createElement("a");
      a.href = pdfUrl;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
    setTimeout(() => URL.revokeObjectURL(pdfUrl), 15000);
  } else {
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
    basePrice?: number;
    tax?: number;
    discount?: number;
    otherCharges?: number;
    paymentStatus: string;
    totalAmount: number;
    paid: number;
    due: number;
    paymentMethod?: string;
    transactionId?: string;
    paymentDate?: string;
  };
  specimen?: {
    type: string;
    quantity?: string;
    parameters?: Array<{
      name: string;
      value?: string | number;
      result?: string | number;
      unit?: string;
      normalRange?: string;
      remarks?: string;
    }>;
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
 * generateDirectTestPDF
 *
 * Direct tests now use the same PDF generator as standard lab tests.
 */

export const generateLabTestPDF = async (
  test: LabTest,
  mode: "print" | "download" = "print",
) => {
  if (!test) return;

  // Fallback for records where values were stored in specimen parameters.
  if (
    (!test.results?.parameters || test.results.parameters.length === 0) &&
    test.specimen?.parameters &&
    test.specimen.parameters.length > 0
  ) {
    test.results = {
      ...(test.results || {}),
      parameters: test.specimen.parameters
        .filter(
          (p) =>
            p.name &&
            p.name.trim() &&
            (p.value !== undefined ||
              p.result !== undefined ||
              p.value === 0 ||
              p.result === 0),
        )
        .map((p) => ({
          name: p.name,
          value: p.value ?? p.result ?? "",
          unit: p.unit,
          normalRange: p.normalRange,
          remarks: p.remarks,
        })),
    };
  }

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = 100; // Starting Y position
  const margin = 25; // Reduced margin from 40 to 25

  // --- PROFESSIONAL COLOR SCHEME ---
  const primary = [41, 128, 185]; // Professional blue
  const secondary = [52, 73, 94]; // Dark slate
  const accent = [39, 174, 96]; // Success green
  const warning = [241, 176, 46]; // Warning orange
  const danger = [231, 76, 60]; // Danger red
  const bgLight = [245, 247, 250];
  const textDark = [44, 62, 80];
  const borderColor = [189, 195, 199];
  const normalGreen = [56, 161, 105]; // Normal range indicator
  const alertOrange = [245, 159, 0]; // Borderline indicator

  await ensurePersianFont(doc);

  // --- PATIENT INFORMATION SECTION (with rounded corners) ---
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.setLineWidth(0.5);
  doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 100, 3, 3, "FD");

  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("PATIENT INFORMATION", margin + 15, y + 20);

  // Underline for section title
  doc.setDrawColor(primary[0], primary[1], primary[2]);
  doc.setLineWidth(0.5);
  doc.line(margin + 15, y + 23, margin + 150, y + 23);

  doc.setFontSize(9.5);

  const doctorName = test.doctor?.name ? `Dr. ${test.doctor.name}` : "N/A";
  const formatReportId = (id: string) => {
    if (/-\d{3}$/.test(id)) return id;
    const match = id.match(/^(.*?)(\d+)$/);
    if (!match) return id;
    const prefix = match[1];
    const digits = match[2];
    const tail = digits.slice(-3).padStart(3, "0");
    const head = digits.slice(0, -3);
    return `${prefix}${head}-${tail}`;
  };
  const rawReportId = `LAB-${test.labReferenceId || test.testId}`;
  const reportId = formatReportId(rawReportId);
  const reportDate = format(new Date(test.orderedAt), "PPP");

  // Patient details grid (3 columns)
  const patientDetails = [
    { label: "Patient Name", value: test.patient?.name || "N/A" },
    { label: "Patient ID", value: test.patient?.patientId || "N/A" },
    { label: "Gender", value: test.patient?.gender || "N/A" },
    { label: "Phone", value: test.patient?.phone || "Not provided" },
    { label: "Test ID", value: test.testId },
    { label: "Report ID", value: reportId },
    { label: "Date", value: reportDate },
    { label: "Doctor", value: doctorName },
    {
      label: "Category",
      value: test.category?.replace(/_/g, " ") || "General",
    },
    { label: "Priority", value: test.priority || "N/A" },
  ];

  patientDetails.forEach((detail, index) => {
    const row = Math.floor(index / 3);
    const col = index % 3;
    const x = margin + 20 + col * ((pageWidth - margin * 2 - 80) / 3);
    const yPos = y + 45 + row * 18;

    doc.setFont("helvetica", "bold");
    doc.text(`${detail.label}:`, x, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(detail.value, x + doc.getTextWidth(`${detail.label}: `) + 5, yPos);
  });

  // Calculate how many rows were used
  const rowsUsed = Math.ceil(patientDetails.length / 3);
  y += 45 + rowsUsed * 18 + 15;

  // --- TEST RESULTS ---
  if (test.results?.parameters && test.results.parameters.length > 0) {
    // Results table header - without outer border
    doc.setFillColor(primary[0], primary[1], primary[2]);
    doc.roundedRect(margin, y, pageWidth - margin * 2, 30, 3, 3, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);

    // Adjusted column positions - making Value and Status columns smaller
    // and giving more space to Normal Range column
    const colPositions = {
      parameter: margin + 15,
      value: margin + 150, // Moved left (was 200)
      unit: margin + 220,
      range: margin + 290, // More space for Normal Range
      status: pageWidth - margin - 70, // Moved left (was 60)
    };

    doc.text("Parameter", colPositions.parameter, y + 18);
    doc.text("Value", colPositions.value, y + 18);
    doc.text("Unit", colPositions.unit, y + 18);
    doc.text("Normal Range", colPositions.range, y + 18);
    doc.text("Status", colPositions.status, y + 18, { align: "right" });

    y += 40;

    // Helper function to check if value is abnormal
    const isAbnormal = (
      param: TestParameter,
    ): { status: string; color: number[] } => {
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

    // Draw table rows without outer border
    const rowHeight = 24;

    test.results.parameters.forEach((param, index) => {
      const rowY = y + index * rowHeight;

      // Alternate row background
      if (index % 2 === 0) {
        doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
        doc.rect(margin, rowY - 4, pageWidth - margin * 2, rowHeight, "F");
      }

      // Draw light horizontal line between rows
      doc.setDrawColor(230, 230, 230);
      doc.setLineWidth(0.3);
      doc.line(
        margin + 2,
        rowY + rowHeight - 4,
        pageWidth - margin - 2,
        rowY + rowHeight - 4,
      );

      const { status, color } = isAbnormal(param);

      doc.setTextColor(textDark[0], textDark[1], textDark[2]);

      // Parameter name (bold)
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text(param.name, colPositions.parameter, rowY + 10);

      // Value (normal) - smaller column
      doc.setFont("helvetica", "normal");
      doc.text(param.value.toString(), colPositions.value, rowY + 10);

      // Unit
      doc.text(param.unit || "-", colPositions.unit, rowY + 10);

      // Normal Range - now gets more space
      doc.text(param.normalRange || "-", colPositions.range, rowY + 10);

      // Status with color coding - smaller column
      doc.setTextColor(color[0], color[1], color[2]);
      doc.setFont("helvetica", "bold");
      doc.text(status, colPositions.status, rowY + 10, { align: "right" });

      // Page break check
      if (
        rowY + rowHeight > pageHeight - 80 &&
        index < test.results!.parameters!.length - 1
      ) {
        doc.addPage();
        y = 50;

        // Recreate header on new page
        doc.setFillColor(primary[0], primary[1], primary[2]);
        doc.roundedRect(margin, y, pageWidth - margin * 2, 30, 3, 3, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.text("Parameter", colPositions.parameter, y + 18);
        doc.text("Value", colPositions.value, y + 18);
        doc.text("Unit", colPositions.unit, y + 18);
        doc.text("Normal Range", colPositions.range, y + 18);
        doc.text("Status", colPositions.status, y + 18, { align: "right" });
        y += 40;
      }
    });

    y += test.results.parameters.length * rowHeight + 10;

    // --- REPORTED BY (NO BORDER, just text) ---
    doc.setFont("helvetica", "normal");
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    doc.setFontSize(9.5);

    doc.setFont("helvetica", "bold");
    doc.text("Reported By:", margin, y);
    doc.setFont("helvetica", "normal");

    const reportedByName =
      test.results?.reportedBy?.name ||
      (test as any)?.collectionDetails?.collectedBy?.name ||
      "Laboratory Staff";
    doc.text(reportedByName, margin + 70, y);

    y += 25;
  } else {
    doc.setFont("helvetica", "italic");
    doc.setTextColor(150, 150, 150);
    doc.text("No test results available.", margin, y);
    y += 30;
  }

  // --- AUTHORIZED SIGNATORY ---
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.setLineWidth(0.5);
  doc.line(pageWidth - 200, y, pageWidth - 50, y);
  doc.setFontSize(9);
  doc.setTextColor(secondary[0], secondary[1], secondary[2]);
  doc.text("Authorized Signatory", pageWidth - 125, y + 15, {
    align: "center",
  });
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text("(Lab Director)", pageWidth - 125, y + 25, { align: "center" });

  y += 40;

  // --- FOOTER ---
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(
    "This is a system-generated laboratory report and does not require a physical signature.",
    pageWidth / 2,
    pageHeight - 30,
    { align: "center" },
  );
  doc.text(
    `Generated on: ${format(new Date(), "dd MMM yyyy, hh:mm a")}`,
    pageWidth / 2,
    pageHeight - 20,
    { align: "center" },
  );

  // --- OUTPUT ---
  if (mode === "print") {
    const pdfBlob = doc.output("blob");
    const pdfUrl = URL.createObjectURL(pdfBlob);
    const printWindow = window.open(pdfUrl, "_blank");
    if (!printWindow) {
      const a = document.createElement("a");
      a.href = pdfUrl;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
    setTimeout(() => URL.revokeObjectURL(pdfUrl), 15000);
  } else {
    const fileName = `lab-report-${test.patient?.name?.toLowerCase().replace(/\s+/g, "-") || "patient"}-${test.testId}.pdf`;
    doc.save(fileName);
  }
};

/**
 * generateDirectTestPaymentSlip
 *
 * Generates an A5 payment slip PDF for a direct laboratory test.
 * Updated to match the styling of the lab test PDF generator.
 *
 */
export const generateDirectTestPaymentSlip = async (
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
  const margin = 20;
  let y = 40;

  // --- COLOR SCHEME (matching lab test style) ---
  const primary = [0, 92, 169]; // Hospital blue
  const accent = [0, 155, 116]; // Hospital green
  const bgLight = [250, 251, 252];
  const textDark = [30, 30, 30];
  const warning = [245, 159, 0]; // Warning orange
  const success = [56, 161, 105]; // Success green

  await ensurePersianFont(doc);

  // Helper function to safely format dates
  const safeFormatDate = (value?: string): string => {
    if (!value) return "N/A";
    try {
      const parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) return "N/A";
      return format(parsed, "PPP");
    } catch {
      return "N/A";
    }
  };

  const formatAmount = (value?: number): string => {
    const amount = typeof value === "number" && !isNaN(value) ? value : 0;
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "AFN",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const slipDate = test.charges?.paymentDate || test.createdAtDirect;

  // --- SINGLE BORDERED TABLE CONTAINING ALL INFORMATION ---
  const tableX = margin;
  const tableWidth = pageWidth - margin * 2;
  const rowHeight = 22;

  // Calculate number of rows: 5 info rows + 1 amount row = 6 rows total
  const totalRows = 6; // Changed from 8 to 6
  const tableHeight = totalRows * rowHeight;
  const startY = y;

  // Draw outer border
  doc.setDrawColor(primary[0], primary[1], primary[2]);
  doc.setLineWidth(0.8);
  doc.rect(tableX, startY, tableWidth, tableHeight, "S");

  // Draw vertical divider
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(
    tableX + tableWidth / 2,
    startY,
    tableX + tableWidth / 2,
    startY + tableHeight,
  );

  // Patient & Payment Information Rows (5 rows)
  const infoRows: Array<[string, string, string, string]> = [
    ["Patient", test.patient?.name || "N/A", "Date", safeFormatDate(slipDate)],
    [
      "Patient ID",
      test.patient?.patientId || "N/A",
      "Phone",
      test.patient?.phone || "N/A",
    ],
    ["Test", test.testName || "N/A", "Test ID", test.testId || "N/A"],
    [
      "Category",
      test.category?.replace(/_/g, " ") || "General",
      "Status",
      test.charges?.paymentStatus || "pending",
    ],
    [
      "Transaction",
      test.charges?.transactionId || "N/A",
      "Method",
      test.charges?.paymentMethod || "N/A",
    ],
  ];

  infoRows.forEach(([lLabel, lValue, rLabel, rValue], index) => {
    const rowY = startY + index * rowHeight;

    // Draw horizontal divider between rows
    if (index < infoRows.length - 1) {
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.3);
      doc.line(
        tableX + 2,
        rowY + rowHeight,
        tableX + tableWidth - 2,
        rowY + rowHeight,
      );
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);

    // Format values with bold labels
    const leftText = `${lLabel}:`;
    const rightText = `${rLabel}:`;

    // Draw labels in bold
    doc.setFont("helvetica", "bold");
    doc.text(leftText, tableX + 8, rowY + 14);
    doc.text(rightText, tableX + tableWidth / 2 + 8, rowY + 14);

    // Draw values in normal font
    doc.setFont("helvetica", "normal");

    // Special handling for status to show in color
    if (rLabel === "Status") {
      const statusColor =
        rValue === "paid"
          ? success
          : rValue === "partial"
            ? warning
            : [107, 114, 128]; // gray for pending
      doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
      doc.setFont("helvetica", "bold");
      doc.text(
        rValue.toUpperCase(),
        tableX + tableWidth / 2 + 8 + doc.getTextWidth(rightText) + 5,
        rowY + 14,
      );
      doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    } else {
      // Trim any extra spaces from values
      const cleanValue = rValue.trim();
      doc.text(
        cleanValue,
        tableX + tableWidth / 2 + 8 + doc.getTextWidth(rightText) + 5,
        rowY + 14,
      );
    }

    // Trim any extra spaces from left value
    const cleanLeftValue = lValue.trim();
    doc.text(
      cleanLeftValue,
      tableX + 8 + doc.getTextWidth(leftText) + 5,
      rowY + 14,
    );
  });

  // Draw a slightly thicker line to separate info from amounts
  doc.setDrawColor(primary[0], primary[1], primary[2]);
  doc.setLineWidth(0.8);
  doc.line(
    tableX + 2,
    startY + 5 * rowHeight,
    tableX + tableWidth - 2,
    startY + 5 * rowHeight,
  );

  // Amount Row (1 row)
  const totalAmount = test.charges?.totalAmount ?? 0;

  const amountRowY = startY + 5 * rowHeight;

  // Alternate row background for amount row
  doc.setFillColor(248, 250, 252);
  doc.rect(tableX + 1, amountRowY + 1, tableWidth - 2, rowHeight - 2, "F");

  // Left side - label (bold)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text("Payment Amount:", tableX + 8, amountRowY + 14);

  // Right side - amount (bold)
  doc.setFont("helvetica", "bold");
  doc.setTextColor(primary[0], primary[1], primary[2]);
  doc.text(
    formatAmount(totalAmount),
    tableX + tableWidth - 15,
    amountRowY + 14,
    { align: "right" },
  );

  y = startY + tableHeight + 20;

  // --- AUTHORIZED SIGNATORY (matching lab test style) ---
  doc.setDrawColor(primary[0], primary[1], primary[2]);
  doc.setLineWidth(0.5);
  doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
  doc.roundedRect(pageWidth - 150, y - 5, 120, 40, 3, 3, "FD");

  doc.setFont("helvetica", "normal");
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.setFontSize(8.5);

  doc.setFont("helvetica", "bold");
  doc.text("Authorized Signatory", pageWidth - 90, y + 10, {
    align: "center",
  });

  // Signature line
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(pageWidth - 130, y + 2, pageWidth - 50, y + 2);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text("(Lab Staff)", pageWidth - 90, y + 20, {
    align: "center",
  });

  y += 25;

  // --- FOOTER NOTE (matching lab test style) ---
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.5);
  doc.setTextColor(150, 150, 150);
  doc.text(
    "This is a system-generated payment slip and does not require a signature.",
    pageWidth / 2,
    pageHeight - 20,
    { align: "center" },
  );

  // --- OUTPUT (unchanged) ---
  if (mode === "print") {
    const pdfBlob = doc.output("blob");
    const pdfUrl = URL.createObjectURL(pdfBlob);
    const printWindow = window.open(pdfUrl, "_blank");
    if (!printWindow) {
      const a = document.createElement("a");
      a.href = pdfUrl;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
    setTimeout(() => URL.revokeObjectURL(pdfUrl), 15000);
  } else {
    const fileName = `payment-slip-${test.patient?.name?.toLowerCase().replace(/\s+/g, "-") || "patient"}-${test.testId}.pdf`;
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
    form?: string;
    frequency?: string;
    route?: string;
  }>;
  postOpMedicines: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    dosage?: string;
    frequency?: string;
    duration?: string;
    form?: string;
    route?: string;
  }>;
  dischargeMedicines: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    instructions?: string;
    dosage?: string;
    form?: string;
    frequency?: string;
    route?: string;
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
 * @param mode - Either "print" to ope
 * n print dialog or "download" to save PDF file
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
    dosage?: string;
    form?: string;
    frequency?: string;
    route?: string;
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
    doc.text("Form", 220, y + 12);
    doc.text("Dosage", 260, y + 12);
    doc.text("Freq", 300, y + 12);
    doc.text("Route", 340, y + 12);
    doc.text("Qty", 380, y + 12);
    doc.text("Price", 430, y + 12);
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
      doc.text(med.form || "-", 220, y + 10);
      doc.text(med.dosage || "-", 260, y + 10);
      doc.text(med.frequency || "-", 300, y + 10);
      doc.text(med.route || "-", 340, y + 10);
      doc.text(med.quantity.toString(), 380, y + 10);
      doc.text(`${med.unitPrice.toFixed(2)}`, 430, y + 10);
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
        // Recreate table header on new page
        doc.setFillColor(primary[0], primary[1], primary[2]);
        doc.rect(55, y, pageWidth - 110, 20, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.text("Category", 65, y + 12);
        doc.text("Medicine Name", 140, y + 12);
        doc.text("Form", 220, y + 12);
        doc.text("Dosage", 260, y + 12);
        doc.text("Freq", 300, y + 12);
        doc.text("Route", 340, y + 12);
        doc.text("Qty", 380, y + 12);
        doc.text("Price", 430, y + 12);
        doc.text("Total", pageWidth - 65, y + 12, { align: "right" });
        y += 20;
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
