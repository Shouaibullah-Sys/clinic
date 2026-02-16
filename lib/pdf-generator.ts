// lib/pdf-generator.ts
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import "@/vazirmatn-normal.js";

const loadLogoDataUrl = async (logoPath: string): Promise<string | null> => {
  try {
    const response = await fetch(logoPath);
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string) || null);
      reader.onerror = () => reject(new Error("Failed to read logo file"));
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
};

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
  let y = 170;

  // --- HOSPITAL BRAND COLOR SCHEME ---
  const primary = [0, 92, 169]; // Hospital blue
  const accent = [0, 155, 116]; // Hospital green
  const bgLight = [250, 251, 252];
  const textDark = [30, 30, 30];
  const normalGreen = [56, 161, 105]; // Normal range indicator
  const alertOrange = [245, 159, 0]; // Borderline indicator
  const logoDataUrl = await loadLogoDataUrl("/logo2.png");
  await ensurePersianFont(doc);

  const drawLogoWatermark = () => {
    if (!logoDataUrl) return;
    (doc as any).setGState(new (doc as any).GState({ opacity: 0.1 }));
    doc.addImage(
      logoDataUrl,
      "PNG",
      pageWidth / 2 - 170,
      pageHeight / 2 - 170,
      340,
      340,
    );
    (doc as any).setGState(new (doc as any).GState({ opacity: 1 }));
  };

  // --- EMPTY HEADER SPACE (KEEP HEIGHT) ---
  // Intentionally left blank to preserve header height.

  // No background watermark

  const drawTwoColumnTable = (
    rows: Array<[string, string, string, string]>,
  ) => {
    // Use the same margins as patient information table will use
    const tableX = 40; // Match the test results table margin
    const tableWidth = pageWidth - 80; // Match the test results table width
    const colWidth = tableWidth / 2;
    const rowHeight = 18;
    const startY = y;

    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.6);
    doc.rect(tableX, startY - 12, tableWidth, rows.length * rowHeight, "S");
    doc.line(
      tableX + colWidth,
      startY - 12,
      tableX + colWidth,
      startY - 12 + rows.length * rowHeight,
    );

    rows.forEach(([lLabel, lValue, rLabel, rValue], index) => {
      const rowY = startY - 12 + index * rowHeight;
      if (index > 0) {
        doc.line(tableX, rowY, tableX + tableWidth, rowY);
      }

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(textDark[0], textDark[1], textDark[2]);

      const leftText = `${lLabel}: ${lValue || "N/A"}`;
      const rightText = `${rLabel}: ${rValue || "N/A"}`;
      doc.text(leftText, tableX + 6, rowY + 12);
      doc.text(rightText, tableX + colWidth + 6, rowY + 12);
    });

    y = startY - 12 + rows.length * rowHeight + 14;
  };

  // --- PATIENT INFORMATION TABLE (NO TITLE) ---
  doc.setFont("helvetica", "normal");
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.setFontSize(10);

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
  // Add more space above the test title (increased from 6 to 15)
  y += 15;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  const testTitle = test.testName || "Test";
  doc.text(testTitle, pageWidth / 2, y, { align: "center" });
  const titleWidth = doc.getTextWidth(testTitle);
  doc.setDrawColor(60, 60, 60);
  doc.setLineWidth(0.6);
  doc.line(120, y + 4, pageWidth - 120, y + 4);

  // Add more space below the test title (increased from 18 to 25)
  y += 25;

  // --- TEST RESULTS ---
  if (test.results?.parameters && test.results.parameters.length > 0) {
    // Parameters table header - adjusted margins to match patient table
    const tableX = 40; // Changed from 55 to 40 to match patient table
    const tableWidth = pageWidth - 80; // Changed from pageWidth - 110 to pageWidth - 80 to match patient table
    const headerHeight = 20;
    const rowHeight = 22;

    // Adjusted column positions to maintain proper spacing with new margins
    const col1X = tableX + 10;
    const col2X = tableX + tableWidth * 0.46;
    const col3X = tableX + tableWidth * 0.62;
    const col4X = tableX + tableWidth * 0.74;

    doc.setFillColor(primary[0], primary[1], primary[2]);
    doc.rect(tableX, y, tableWidth, headerHeight, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Parameter", col1X, y + 12);
    doc.text("Value", col2X, y + 12);
    doc.text("Unit", col3X, y + 12);
    doc.text("Reference Range", col4X, y + 12);
    doc.text("Status", pageWidth - 65, y + 12, { align: "right" });

    y += headerHeight;

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

    // Table border
    const tableStartY = y;

    // Test parameters
    test.results.parameters.forEach((param, paramIndex) => {
      // Alternate row background for readability
      if (paramIndex % 2 === 0) {
        doc.setFillColor(240, 244, 248);
        doc.rect(tableX, y, tableWidth, rowHeight, "F");
      }

      const { status, color } = isAbnormal(param);

      doc.setTextColor(textDark[0], textDark[1], textDark[2]);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);

      // Parameter data
      doc.text(param.name, col1X, y + 13);
      doc.text(param.value.toString(), col2X, y + 13);
      doc.text(param.unit || "-", col3X, y + 13);
      doc.text(param.normalRange || "-", col4X, y + 13);

      // Status with color coding
      doc.setTextColor(color[0], color[1], color[2]);
      doc.text(status, pageWidth - 65, y + 13, { align: "right" });

      y += rowHeight;

      // Page break check
      if (y > pageHeight - 100) {
        doc.addPage();
        y = 50;
        // Recreate table header on new page
        doc.setFillColor(primary[0], primary[1], primary[2]);
        doc.rect(tableX, y, tableWidth, headerHeight, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.text("Parameter", col1X, y + 12);
        doc.text("Value", col2X, y + 12);
        doc.text("Unit", col3X, y + 12);
        doc.text("Reference Range", col4X, y + 12);
        doc.text("Status", pageWidth - 65, y + 12, { align: "right" });
        y += headerHeight;
      }
    });

    // Table border enclosing rows
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.6);
    doc.rect(tableX, tableStartY, tableWidth, y - tableStartY, "S");

    // Add more space before Reported By (increased from 20 to 30)
    y += 30;

    // --- REPORTED BY ---
    doc.setFont("helvetica", "normal");
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    doc.setFontSize(10);
    const reportedByName =
      test.results?.reportedBy?.name ||
      (test as any)?.collectionDetails?.collectedBy?.name ||
      "Laboratory Staff";
    doc.text(`Reported By: ${reportedByName}`, 55, y);

    // Add more space after Reported By (increased from 24 to 30)
    y += 30;
  } else {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    doc.setFontSize(10);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(150, 150, 150);
    doc.text("No test results available.", 55, y);
  }

  // --- OUTPUT ---
  if (mode === "print") {
    // Open PDF in a new tab for more accurate print preview colors.
    const pdfBlob = doc.output("blob");
    const pdfUrl = URL.createObjectURL(pdfBlob);
    const printWindow = window.open(pdfUrl, "_blank");
    if (!printWindow) {
      // Fallback if popup is blocked.
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
 *
 * @param test - The direct lab test object containing all test data
 * @param mode - Either "print" to open print dialog or "download" to save PDF file
 */
export const generateDirectTestPDF = async (
  test: DirectLabTest,
  mode: "print" | "download" = "print",
) => {
  if (!test) return;

  const mappedTest: LabTest = {
    _id: test._id,
    testId: test.testId,
    testName: test.testName,
    category: test.category,
    patient: test.patient,
    status: test.status,
    collectionStatus: test.collectionStatus,
    processingStatus: test.processingStatus || "completed",
    orderedAt: test.createdAtDirect,
    completedAt: test.createdAtDirect,
    specimen: test.specimen,
    results: test.results,
    priority: test.priority,
    labReferenceId: test.testId,
  };

  await generateLabTestPDF(mappedTest, mode);
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
