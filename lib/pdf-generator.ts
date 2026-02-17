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
  guardian?: string;
  address?: string;
  refPerson?: string;
  passTskNo?: string;
  registrationNo?: string;
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
  patientSnapshot?: Patient;
  doctor?: Doctor;
  doctorName?: string;
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

const normalizeDirectToLabTest = (input: DirectLabTest | LabTest): LabTest => {
  if ("orderedAt" in input) return input;

  return {
    _id: input._id,
    testId: input.testId,
    testName: input.testName,
    category: input.category,
    patient: input.patient,
    doctor: (input as any).doctor,
    doctorName: (input as any).doctorName,
    status: input.status,
    collectionStatus: input.collectionStatus,
    processingStatus: input.processingStatus,
    orderedAt: input.createdAtDirect,
    completedAt: (input as any).finalizedAt ?? (input as any).completedAt,
    specimen: input.specimen,
    results: input.results,
    priority: input.priority,
    labReferenceId: input.testId,
    patientSnapshot: (input as any).patientSnapshot,
  };
};

export const generateDirectTestPDF = async (
  input: DirectLabTest | LabTest | Array<DirectLabTest | LabTest>,
  mode: "print" | "download" = "print",
) => {
  if (!input) return;

  const inputs = Array.isArray(input) ? input : [input];
  const normalizedTests = inputs.map((item) => normalizeDirectToLabTest(item));
  const seenTestIds = new Set<string>();
  const tests = normalizedTests.filter((item) => {
    const key = item.testId || item._id;
    if (!key) return true;
    if (seenTestIds.has(key)) return false;
    seenTestIds.add(key);
    return true;
  });
  const test = tests[0];

  // Fallback for records where values were stored in specimen parameters.
  tests.forEach((t) => {
    if (
      (!t.results?.parameters || t.results.parameters.length === 0) &&
      t.specimen?.parameters &&
      t.specimen.parameters.length > 0
    ) {
      t.results = {
        ...(t.results || {}),
        parameters: t.specimen.parameters
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
  });

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

    rows.forEach(([lLabel, lValue, rLabel, rValue], index) => {
      const rowY = startY + index * rowHeight;

      doc.setFont("courier", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(textDark[0], textDark[1], textDark[2]);

      // Format values with bold labels
      const leftText = `${lLabel}:`;
      const rightText = rLabel ? `${rLabel}:` : "";

      // Draw labels in bold
      doc.setFont("courier", "bold");
      doc.text(leftText, tableX + 8, rowY + 14);
      if (rightText) {
        doc.text(rightText, tableX + colWidth + 8, rowY + 14);
      }

      // Draw values in normal font
      doc.setFont("courier", "normal");
      const leftValue = lValue || "N/A";
      const rightValue = rLabel ? rValue || "N/A" : "";
      const leftValueX = tableX + 8 + doc.getTextWidth(leftText) + 5;
      const rightValueX =
        tableX + colWidth + 8 + doc.getTextWidth(rightText) + 5;
      doc.text(leftValue, leftValueX, rowY + 14);
      if (rightText) {
        doc.text(rightValue, rightValueX, rowY + 14);
      }

      // Underline values only (not labels)
      doc.setDrawColor(180, 180, 180);
      doc.setLineWidth(0.3);
      doc.line(leftValueX, rowY + 16, tableX + colWidth - 8, rowY + 16);
      if (rightText) {
        doc.line(rightValueX, rowY + 16, tableX + tableWidth - 8, rowY + 16);
      }
    });

    y = startY + rows.length * rowHeight + 15;
  };

  // --- PATIENT INFORMATION TABLE ---
  const doctorSource = (test as any).doctorName || test.doctor?.name;
  const doctorName = (() => {
    if (!doctorSource) return "N/A";
    const trimmed = String(doctorSource).trim();
    if (!trimmed) return "N/A";
    return /^dr\.?\s+/i.test(trimmed) ? trimmed : `Dr. ${trimmed}`;
  })();
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
  const baseReportId = test.labReferenceId || test.testId || "LAB";
  const rawReportId = /^lab[-]?/i.test(baseReportId)
    ? baseReportId
    : `LAB-${baseReportId}`;
  const reportId = formatReportId(rawReportId);
  const reportDate = format(new Date(test.orderedAt), "PPP");

  const patientRecord = test.patient || {};
  const patientSnapshot = test.patientSnapshot || {};
  const readPatientField = (field: keyof Patient, fallback = "N/A") => {
    const value =
      (patientRecord as any)[field] ?? (patientSnapshot as any)[field];
    if (value === undefined || value === null) return fallback;
    if (typeof value === "string" && value.trim() === "") return fallback;
    return value as string;
  };

  const resolveSlipAge = () => {
    const directAge =
      (patientRecord as any).age ?? (patientSnapshot as any).age;
    if (directAge !== undefined && directAge !== null && directAge !== "") {
      return String(directAge);
    }
    const dob =
      (patientRecord as any).dateOfBirth ||
      (patientSnapshot as any).dateOfBirth;
    if (!dob) return "N/A";
    const date = new Date(dob);
    if (Number.isNaN(date.getTime())) return "N/A";
    const today = new Date();
    let age = today.getFullYear() - date.getFullYear();
    const monthDiff = today.getMonth() - date.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < date.getDate())
    ) {
      age -= 1;
    }
    return age >= 0 ? String(age) : "N/A";
  };

  const preparedBy =
    test.results?.reportedBy?.name ||
    (test as any)?.collectionDetails?.collectedBy?.name ||
    (test as any)?.createdBy?.name ||
    "Laboratory Staff";

  const resolveAge = () => {
    const directAge =
      (patientRecord as any).age ?? (patientSnapshot as any).age;
    if (directAge !== undefined && directAge !== null && directAge !== "") {
      return String(directAge);
    }
    const dob =
      (patientRecord as any).dateOfBirth ||
      (patientSnapshot as any).dateOfBirth;
    if (!dob) return "N/A";
    const date = new Date(dob);
    if (Number.isNaN(date.getTime())) return "N/A";
    const today = new Date();
    let age = today.getFullYear() - date.getFullYear();
    const monthDiff = today.getMonth() - date.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < date.getDate())
    ) {
      age -= 1;
    }
    return age >= 0 ? String(age) : "N/A";
  };

  drawTwoColumnTable([
    [
      "Patient",
      readPatientField("name"),
      "Patient ID",
      readPatientField("patientId"),
    ],
    ["Age", resolveAge(), "Guardian", readPatientField("guardian")],
    ["Gender", readPatientField("gender"), "Prepared By", preparedBy],
    [
      "Phone",
      readPatientField("phone", "Not provided"),
      "Pass/Tsk #",
      readPatientField("passTskNo"),
    ],
    [
      "Address",
      readPatientField("address"),
      "Ref Person",
      readPatientField("refPerson"),
    ],
    ["Regn No", readPatientField("registrationNo"), "Test ID", test.testId],
    ["Report ID", reportId, "Date", reportDate],
    ["Doctor", doctorName, "", ""],
  ]);

  y += 5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(primary[0], primary[1], primary[2]);
  doc.text("TEST RESULTS", margin, y);
  y += 10;

  const tableX = margin;
  const tableWidth = pageWidth - margin * 2;
  const headerHeight = 24;
  const rowHeight = 24;
  const colPositions = {
    test: tableX + 10,
    name: tableX + tableWidth * 0.28,
    value: tableX + tableWidth * 0.53,
    unit: tableX + tableWidth * 0.64,
    range: tableX + tableWidth * 0.75,
    status: tableX + tableWidth * 0.9,
  };

  const isAbnormal = (
    param: TestParameter,
  ): { status: string; color: number[] } => {
    const remarks = param.remarks?.toLowerCase() || "";
    const numValue = parseFloat(param.value.toString());
    const isNumeric = !isNaN(numValue);

    if (isNumeric && param.normalRange) {
      const rangeMatch = param.normalRange.match(
        /(\\d+\\.?\\d*)\\s*-\\s*(\\d+\\.?\\d*)/,
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

  const combinedParameters = tests.flatMap((currentTest) =>
    (currentTest.results?.parameters || []).map((param) => ({
      ...param,
      testName: currentTest.testName || "Test",
    })),
  );

  if (combinedParameters.length > 0) {
    doc.setFont("courier", "normal");
    doc.setDrawColor(primary[0], primary[1], primary[2]);
    doc.setLineWidth(0.8);
    doc.rect(
      tableX,
      y,
      tableWidth,
      headerHeight + combinedParameters.length * rowHeight,
      "S",
    );

    doc.setFillColor(primary[0], primary[1], primary[2]);
    doc.rect(tableX + 1, y + 1, tableWidth - 2, headerHeight - 2, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("courier", "bold");
    doc.setFontSize(9.5);
    doc.text("Test", colPositions.test, y + 16);
    doc.text("Parameter", colPositions.name, y + 16);
    doc.text("Value", colPositions.value, y + 16);
    doc.text("Unit", colPositions.unit, y + 16);
    doc.text("Normal Range", colPositions.range, y + 16);
    doc.text("Status", colPositions.status, y + 16);

    y += headerHeight;

    combinedParameters.forEach((param, paramIndex) => {
      const rowY = y + paramIndex * rowHeight;

      if (paramIndex % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(tableX + 1, rowY, tableWidth - 2, rowHeight - 1, "F");
      }

      if (paramIndex < combinedParameters.length - 1) {
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
      doc.setFont("courier", "bold");
      doc.setFontSize(9);
      doc.text(param.testName, colPositions.test, rowY + 15);
      doc.text(param.name, colPositions.name, rowY + 15);

      doc.setFont("courier", "bold");
      doc.text(param.value.toString(), colPositions.value, rowY + 15);
      doc.text(param.unit || "-", colPositions.unit, rowY + 15);
      doc.text(param.normalRange || "-", colPositions.range, rowY + 15);

      doc.setTextColor(color[0], color[1], color[2]);
      doc.setFont("courier", "bold");
      doc.text(status, colPositions.status, rowY + 15);

      if (
        rowY + rowHeight > pageHeight - 80 &&
        paramIndex < combinedParameters.length - 1
      ) {
        doc.addPage();
        y = 50;

        doc.setFillColor(primary[0], primary[1], primary[2]);
        doc.rect(tableX + 1, y, tableWidth - 2, headerHeight - 2, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFont("courier", "bold");
        doc.text("Test", colPositions.test, y + 16);
        doc.text("Parameter", colPositions.name, y + 16);
        doc.text("Value", colPositions.value, y + 16);
        doc.text("Unit", colPositions.unit, y + 16);
        doc.text("Normal Range", colPositions.range, y + 16);
        doc.text("Status", colPositions.status, y + 16);

        y += headerHeight;
      }
    });

    y += combinedParameters.length * rowHeight + 20;
    doc.setFont("helvetica", "normal");
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
    const patientName =
      test.patient?.name || test.patientSnapshot?.name || "patient";
    const fileName = `lab-report-${patientName.toLowerCase().replace(/\s+/g, "-")}-${test.testId}.pdf`;
    doc.save(fileName);
  }
};

// Direct Lab Test Interface
export interface DirectLabTest {
  _id: string;
  testId: string;
  testName: string;
  category: string;
  directBatchId?: string;
  patient: {
    _id: string;
    name: string;
    patientId: string;
    phone?: string;
    guardian?: string;
    address?: string;
    refPerson?: string;
    passTskNo?: string;
    registrationNo?: string;
    age?: number;
    gender?: string;
    dateOfBirth?: string;
  };
  patientSnapshot?: Patient;
  createdBy?: {
    _id: string;
    name: string;
  };
  doctorName?: string;
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
  input: LabTest | LabTest[],
  mode: "print" | "download" = "print",
) => {
  if (!input) return;
  const tests = Array.isArray(input) ? input : [input];
  if (tests.length === 0) return;
  const test = tests[0];

  // Fallback for records where values were stored in specimen parameters.
  tests.forEach((t) => {
    if (
      (!t.results?.parameters || t.results.parameters.length === 0) &&
      t.specimen?.parameters &&
      t.specimen.parameters.length > 0
    ) {
      t.results = {
        ...(t.results || {}),
        parameters: t.specimen.parameters
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
  });

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = 100; // Starting Y position
  const margin = 25;

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
  const baseReportId = test.labReferenceId || test.testId || "LAB";
  const rawReportId = /^lab[-]?/i.test(baseReportId)
    ? baseReportId
    : `LAB-${baseReportId}`;
  const reportId = formatReportId(rawReportId);
  const reportDate = format(new Date(test.orderedAt), "PPP");

  // --- PATIENT INFORMATION SECTION (with rounded corners) ---
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.setLineWidth(0.5);
  doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);

  // Calculate section height based on number of rows (6 rows for the layout)
  const sectionHeight = 180; // Fixed height for the new layout
  doc.roundedRect(margin, y, pageWidth - margin * 2, sectionHeight, 3, 3, "FD");

  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("PATIENT INFORMATION", margin + 15, y + 20);

  // Underline for section title
  doc.setDrawColor(primary[0], primary[1], primary[2]);
  doc.setLineWidth(0.5);
  doc.line(margin + 15, y + 23, margin + 100, y + 23);

  doc.setFontSize(9.5);

  const startY = y + 45;
  const col1X = margin + 20;
  const col2X = margin + 250;
  const underlineEndX = margin + 220; // End of underline for col1
  const col2UnderlineEndX = pageWidth - margin - 30; // End of underline for col2

  // Row 1: Patient Name and Patient ID
  doc.setFont("helvetica", "bold");
  doc.text("Patient Name" + " ".repeat(14) + ":", col1X, startY);
  doc.setFont("helvetica", "normal");
  const patientName = test.patient?.name || "N/A";
  doc.text(patientName, col1X + 100, startY);
  doc.line(col1X + 100, startY + 2, underlineEndX, startY + 2);

  doc.setFont("helvetica", "bold");
  doc.text("Patient ID" + " ".repeat(16) + ":", col2X, startY);
  doc.setFont("helvetica", "normal");
  const patientId = test.patient?.patientId || "N/A";
  doc.text(patientId, col2X + 95, startY);
  doc.line(col2X + 95, startY + 2, col2UnderlineEndX, startY + 2);

  // Row 2: Guardian, Age/Gender in one line
  let row2Y = startY + 20;
  doc.setFont("helvetica", "bold");
  doc.text("Guardian" + " ".repeat(18) + ":", col1X, row2Y);
  doc.setFont("helvetica", "normal");
  const guardian = test.patient?.guardian || "N/A";
  doc.text(guardian, col1X + 100, row2Y);
  doc.line(col1X + 100, row2Y + 2, col1X + 180, row2Y + 2);

  doc.setFont("helvetica", "bold");
  doc.text("Age/Gender:", col1X + 190, row2Y);
  doc.setFont("helvetica", "normal");
  const ageGender = `${test.patient?.age || "N/A"}/${test.patient?.gender || "N/A"}`;
  doc.text(ageGender, col1X + 260, row2Y);
  doc.line(col1X + 260, row2Y + 2, underlineEndX, row2Y + 2);

  // Right side - Doctor Name
  doc.setFont("helvetica", "bold");
  doc.text("Doctor Name" + " ".repeat(14) + ":", col2X, row2Y);
  doc.setFont("helvetica", "normal");
  doc.text(doctorName, col2X + 95, row2Y);
  doc.line(col2X + 95, row2Y + 2, col2UnderlineEndX, row2Y + 2);

  // Row 3: Address
  let row3Y = row2Y + 20;
  doc.setFont("helvetica", "bold");
  doc.text("Address" + " ".repeat(19) + ":", col1X, row3Y);
  doc.setFont("helvetica", "normal");
  const address = test.patient?.address || "N/A";
  doc.text(address, col1X + 100, row3Y);
  doc.line(col1X + 100, row3Y + 2, underlineEndX, row3Y + 2);

  // Right side - empty or could be used for something else
  doc.setFont("helvetica", "bold");
  doc.text("Report ID" + " ".repeat(17) + ":", col2X, row3Y);
  doc.setFont("helvetica", "normal");
  doc.text(reportId, col2X + 95, row3Y);
  doc.line(col2X + 95, row3Y + 2, col2UnderlineEndX, row3Y + 2);

  // Row 4: Ref Person
  let row4Y = row3Y + 20;
  doc.setFont("helvetica", "bold");
  doc.text("Ref Person" + " ".repeat(17) + ":", col1X, row4Y);
  doc.setFont("helvetica", "normal");
  const refPerson = test.patient?.refPerson || "N/A";
  doc.text(refPerson, col1X + 100, row4Y);
  doc.line(col1X + 100, row4Y + 2, underlineEndX, row4Y + 2);

  // Right side - Test ID
  doc.setFont("helvetica", "bold");
  doc.text("Test ID" + " ".repeat(19) + ":", col2X, row4Y);
  doc.setFont("helvetica", "normal");
  doc.text(test.testId, col2X + 95, row4Y);
  doc.line(col2X + 95, row4Y + 2, col2UnderlineEndX, row4Y + 2);

  // Row 5: Phone and Pass/Taz in one line
  let row5Y = row4Y + 20;
  doc.setFont("helvetica", "bold");
  doc.text("Phone" + " ".repeat(21) + ":", col1X, row5Y);
  doc.setFont("helvetica", "normal");
  const phone = test.patient?.phone || "N/A";
  doc.text(phone, col1X + 100, row5Y);
  doc.line(col1X + 100, row5Y + 2, col1X + 180, row5Y + 2);

  doc.setFont("helvetica", "bold");
  doc.text("Pass/Taz:", col1X + 190, row5Y);
  doc.setFont("helvetica", "normal");
  const passTaz = test.patient?.passTskNo || "N/A";
  doc.text(passTaz, col1X + 250, row5Y);
  doc.line(col1X + 250, row5Y + 2, underlineEndX, row5Y + 2);

  // Right side - Date
  doc.setFont("helvetica", "bold");
  doc.text("Date" + " ".repeat(22) + ":", col2X, row5Y);
  doc.setFont("helvetica", "normal");
  doc.text(reportDate, col2X + 95, row5Y);
  doc.line(col2X + 95, row5Y + 2, col2UnderlineEndX, row5Y + 2);

  // Row 6: Regn No and Category
  let row6Y = row5Y + 20;
  doc.setFont("helvetica", "bold");
  doc.text("Regn No" + " ".repeat(19) + ":", col1X, row6Y);
  doc.setFont("helvetica", "normal");
  const regnNo = test.patient?.registrationNo || "N/A";
  doc.text(regnNo, col1X + 100, row6Y);
  doc.line(col1X + 100, row6Y + 2, underlineEndX, row6Y + 2);

  // Right side - Category
  doc.setFont("helvetica", "bold");
  doc.text("Category" + " ".repeat(18) + ":", col2X, row6Y);
  doc.setFont("helvetica", "normal");
  const category = test.category?.replace(/_/g, " ") || "General";
  doc.text(category, col2X + 95, row6Y);
  doc.line(col2X + 95, row6Y + 2, col2UnderlineEndX, row6Y + 2);

  y += sectionHeight + 10;

  // --- TEST RESULTS (KEPT EXACTLY THE SAME) ---
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
      (test as any)?.createdBy?.name ||
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
 * Generates an A5 landscape payment slip with border around all elements
 * Layout: Top half - Test Information (left side)
 *         Bottom half - Payment Information (full width)
 *         Complete border around all content
 */
export const generateDirectTestPaymentSlip = async (
  test: DirectLabTest,
  mode: "print" | "download" = "print",
  options?: { testNames?: string[] },
) => {
  if (!test) return;

  // A5 Landscape format (210mm x 148mm)
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "pt",
    format: "a5",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const borderPadding = 10;
  const contentStartX = margin + borderPadding;
  const contentWidth = pageWidth - margin * 2 - borderPadding * 2;
  const contentEndX = pageWidth - margin - borderPadding;

  await ensurePersianFont(doc);

  // TWO-COLOR THERMAL SETUP
  const black = [0, 0, 0];
  const lightGray = [150, 150, 150]; // 50% lighter than black
  const red = [255, 0, 0];

  doc.setTextColor(black[0], black[1], black[2]);
  doc.setDrawColor(lightGray[0], lightGray[1], lightGray[2]); // Set default draw color to light gray

  // Helper functions
  const safeFormatDate = (value?: string): string => {
    if (!value) return "N/A";
    try {
      const parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) return "N/A";
      return format(parsed, "dd/MM/yyyy");
    } catch {
      return "N/A";
    }
  };

  const formatTime = (value?: string): string => {
    if (!value) return "N/A";
    try {
      const parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) return "N/A";
      return format(parsed, "HH:mm");
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
    })
      .format(amount)
      .replace("AFN", "؋")
      .replace(/\s/g, ""); // Remove any spaces
  };

  // Data extraction
  const slipDate = test.charges?.paymentDate || test.createdAtDirect;
  const totalAmount = test.charges?.totalAmount ?? 0;
  const paidAmount = test.charges?.paid ?? 0;
  const dueAmount = test.charges?.due ?? 0;
  const paymentStatus = test.charges?.paymentStatus || "pending";

  const patientRecord = test.patient || {};
  const patientSnapshot = test.patientSnapshot || {};

  const readPatientField = (field: keyof Patient, fallback = "N/A") => {
    const value =
      (patientRecord as any)[field] ?? (patientSnapshot as any)[field];
    if (value === undefined || value === null) return fallback;
    if (typeof value === "string" && value.trim() === "") return fallback;
    return value as string;
  };

  const preparedBy =
    test.results?.reportedBy?.name ||
    (test as any)?.collectionDetails?.collectedBy?.name ||
    (test as any)?.createdBy?.name ||
    "Lab Staff";

  const doctorName =
    (test as any).doctorName || (test as any).doctor?.name || "N/A";

  const resolveSlipAge = () => {
    const directAge =
      (patientRecord as any).age ?? (patientSnapshot as any).age;
    if (directAge !== undefined && directAge !== null && directAge !== "") {
      return String(directAge);
    }
    const dob =
      (patientRecord as any).dateOfBirth ||
      (patientSnapshot as any).dateOfBirth;
    if (!dob) return "N/A";
    const date = new Date(dob);
    if (Number.isNaN(date.getTime())) return "N/A";
    const today = new Date();
    let age = today.getFullYear() - date.getFullYear();
    const monthDiff = today.getMonth() - date.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < date.getDate())
    ) {
      age -= 1;
    }
    return age >= 0 ? String(age) : "N/A";
  };

  const ageValue = resolveSlipAge();

  // Draw outer border with light gray
  doc.setDrawColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.setLineWidth(1.5);
  doc.rect(margin, margin, pageWidth - margin * 2, pageHeight - margin * 2);

  let y = margin + borderPadding + 10;

  // ==================== HEADER ====================
  doc.setFontSize(11);
  doc.setFont("courier", "normal");
  doc.setTextColor(black[0], black[1], black[2]);
  doc.text("PAYMENT RECEIPT", pageWidth / 2, y, { align: "center" });

  y += 12;
  doc.setDrawColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.setLineWidth(0.8);
  doc.line(contentStartX, y, contentEndX, y);
  y += 15;

  // ==================== LEFT COLUMN - PATIENT INFO ====================
  const leftColX = contentStartX;
  const rightColX = pageWidth / 2 + 15;
  const labelWidth = 70;
  const rowHeight = 16;

  // Helper for left column fields
  const drawLeftField = (label: string, value: string) => {
    doc.setFont("courier", "bold");
    doc.setFontSize(9);
    doc.setTextColor(black[0], black[1], black[2]);
    doc.text(label + ":", leftColX, y);

    doc.setFont("courier", "normal");
    const valueX = leftColX + labelWidth;
    doc.text(value || "N/A", valueX, y);

    doc.setDrawColor(lightGray[0], lightGray[1], lightGray[2]);
    doc.line(valueX, y + 2, rightColX - 15, y + 2);

    y += rowHeight;
  };

  // Helper for right column fields
  const drawRightField = (label: string, value: string) => {
    doc.setFont("courier", "bold");
    doc.setFontSize(9);
    doc.setTextColor(black[0], black[1], black[2]);
    doc.text(label + ":", rightColX, currentRightY);

    doc.setFont("courier", "normal");
    const valueX = rightColX + labelWidth;
    doc.text(value || "N/A", valueX, currentRightY);

    doc.setDrawColor(lightGray[0], lightGray[1], lightGray[2]);
    doc.line(valueX, currentRightY + 2, contentEndX, currentRightY + 2);
  };

  // Track right column position separately
  let currentRightY = y;

  // Row 1: Patient Name (left) and Patient ID (right)
  drawLeftField("Patient Name", readPatientField("name"));
  drawRightField("Patient ID", readPatientField("patientId"));
  currentRightY += rowHeight;

  // Row 2: Age (left) and Guardian (right)
  drawLeftField("Age", String(ageValue));
  drawRightField("Guardian", readPatientField("guardian"));
  currentRightY += rowHeight;

  // Row 3: Gender (left) and Phone (right)
  drawLeftField("Gender", readPatientField("gender"));
  drawRightField("Phone", readPatientField("phone"));
  currentRightY += rowHeight;

  // Row 4: Regn No (left) and Test ID (right)
  drawLeftField("Regn No", readPatientField("registrationNo"));
  drawRightField("Test ID", test.testId);
  currentRightY += rowHeight;

  // Row 5: Doctor (left) and Date (right)
  drawLeftField("Doctor", doctorName);
  drawRightField("Date", safeFormatDate(slipDate));
  currentRightY += rowHeight;

  // Row 6: Prepared By (left) and Receipt No (right)
  drawLeftField("Prepared By", preparedBy);
  drawRightField("Receipt No", test.testId);
  currentRightY += rowHeight;

  // Row 7: Pass/Tsk (left) and Ref Person (right)
  drawLeftField("Pass/Tsk", readPatientField("passTskNo"));
  drawRightField("Ref Person", readPatientField("refPerson"));
  currentRightY += rowHeight;

  // Row 8: Address (full width - both columns)
  doc.setFont("courier", "bold");
  doc.setTextColor(black[0], black[1], black[2]);
  doc.text("Address:", leftColX, y);
  doc.setFont("courier", "normal");
  const address = readPatientField("address");
  doc.text(address, leftColX + labelWidth, y);

  doc.setDrawColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.line(leftColX + labelWidth, y + 2, contentEndX, y + 2);

  y += rowHeight;

  // Update y to max of both columns
  y = Math.max(y, currentRightY) + 5;

  // ==================== PAYMENT SECTION ====================
  doc.setFont("courier", "normal");
  doc.setFontSize(12);
  doc.setTextColor(black[0], black[1], black[2]);
  doc.text("PAYMENT DETAILS", pageWidth / 2, y, { align: "center" });
  y += 20;

  const paymentLeftX = contentStartX + 40;
  const paymentRightX = contentEndX - 40;

  // Helper function to draw field with proper underline
  const drawPaymentField = (
    label: string,
    value: string,
    yPos: number,
    highlight: boolean = false,
  ) => {
    // Draw label
    doc.setFont("courier", "bold");
    doc.setFontSize(10);
    doc.setTextColor(black[0], black[1], black[2]);
    doc.text(label, paymentLeftX, yPos);

    // Calculate value width for proper underline positioning
    doc.setFont("courier", "normal");
    if (highlight) {
      doc.setTextColor(red[0], red[1], red[2]);
    }

    // Draw value
    doc.text(value, paymentRightX, yPos, { align: "right" });

    // Get value width to position underline correctly
    const valueWidth = doc.getTextWidth(value);
    const valueStartX = paymentRightX - valueWidth;

    // Draw underline from value start to paymentRightX with light gray
    doc.setDrawColor(lightGray[0], lightGray[1], lightGray[2]);
    doc.setLineWidth(0.3);
    doc.line(valueStartX, yPos + 2, paymentRightX, yPos + 2);

    // Reset color
    doc.setTextColor(black[0], black[1], black[2]);

    return yPos + 18;
  };

  // Format amounts without extra spaces
  const formatDisplayAmount = (value?: number): string => {
    const amount = typeof value === "number" && !isNaN(value) ? value : 0;
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "AFN",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
      .format(amount)
      .replace("AFN", "؋")
      .replace(/\s/g, ""); // Remove any spaces
  };

  // Test names section
  doc.setFont("courier", "bold");
  doc.setTextColor(black[0], black[1], black[2]);
  doc.text("Tests:", leftColX, y);
  y += 14;

  const tests = (() => {
    if (options?.testNames && options.testNames.length > 0) {
      const unique = new Set(options.testNames.filter(Boolean) as string[]);
      return unique.size > 0 ? Array.from(unique) : [test.testName];
    }
    return test.testName ? [test.testName] : ["N/A"];
  })();

  tests.forEach((testItem) => {
    doc.setFont("courier", "normal");
    doc.setFontSize(9);
    doc.setTextColor(black[0], black[1], black[2]);
    doc.text("• " + testItem, leftColX + 10, y);
    y += 14;
  });

  // Total Amount
  y = drawPaymentField("Total Amount:", formatDisplayAmount(totalAmount), y);

  // Paid Amount
  y = drawPaymentField("Paid Amount:", formatDisplayAmount(paidAmount), y);

  // Balance Due - highlight if > 0
  y = drawPaymentField(
    "Balance Due:",
    formatDisplayAmount(dueAmount),
    y,
    dueAmount > 0,
  );

  // Payment Status
  const statusDisplay = paymentStatus.toUpperCase();
  doc.setFont("courier", "bold");
  doc.setTextColor(black[0], black[1], black[2]);
  doc.text("Payment Status:", paymentLeftX, y);
  if (
    paymentStatus.toLowerCase() === "pending" ||
    paymentStatus.toLowerCase() === "partial"
  ) {
    doc.setTextColor(red[0], red[1], red[2]);
  }
  doc.text(statusDisplay, paymentRightX, y, { align: "right" });

  // Calculate status width for underline
  const statusWidth = doc.getTextWidth(statusDisplay);
  const statusStartX = paymentRightX - statusWidth;

  doc.setDrawColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.setLineWidth(0.3);
  doc.line(statusStartX, y + 2, paymentRightX, y + 2);

  doc.setTextColor(black[0], black[1], black[2]);
  y += 18;

  // Payment Method (if available)
  if (test.charges?.paymentMethod) {
    doc.setFont("courier", "bold");
    doc.setTextColor(black[0], black[1], black[2]);
    doc.text("Payment Method:", paymentLeftX, y);
    doc.setFont("courier", "normal");
    const methodValue = test.charges.paymentMethod;
    doc.text(methodValue, paymentRightX, y, { align: "right" });

    const methodWidth = doc.getTextWidth(methodValue);
    const methodStartX = paymentRightX - methodWidth;

    doc.setDrawColor(lightGray[0], lightGray[1], lightGray[2]);
    doc.line(methodStartX, y + 2, paymentRightX, y + 2);

    y += 18;
  }

  // Transaction ID (if available)
  if (test.charges?.transactionId) {
    doc.setFont("courier", "bold");
    doc.setTextColor(black[0], black[1], black[2]);
    doc.text("Transaction ID:", paymentLeftX, y);
    doc.setFont("courier", "normal");
    const txValue = test.charges.transactionId;
    doc.text(txValue, paymentRightX, y, { align: "right" });

    const txWidth = doc.getTextWidth(txValue);
    const txStartX = paymentRightX - txWidth;

    doc.setDrawColor(lightGray[0], lightGray[1], lightGray[2]);
    doc.line(txStartX, y + 2, paymentRightX, y + 2);

    y += 18;
  }

  // Payment Date/Time
  doc.setFont("courier", "bold");
  doc.setTextColor(black[0], black[1], black[2]);
  doc.text("Payment Date:", paymentLeftX, y);
  doc.setFont("courier", "normal");
  const paymentDateTime = `${safeFormatDate(slipDate)} ${formatTime(slipDate)}`;
  doc.text(paymentDateTime, paymentRightX, y, { align: "right" });

  // Calculate date width for underline
  const dateWidth = doc.getTextWidth(paymentDateTime);
  const dateStartX = paymentRightX - dateWidth;

  doc.setDrawColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.line(dateStartX, y + 2, paymentRightX, y + 2);

  y += 25;

  // ==================== FOOTER ====================
  // Authorized signature line with light gray
  doc.setDrawColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.line(contentStartX + 40, y + 5, contentStartX + 160, y + 5);

  doc.setFont("courier", "normal");
  doc.setFontSize(8);
  doc.setTextColor(black[0], black[1], black[2]);
  doc.text("Authorized Signature", contentStartX + 50, y + 15);

  // Print timestamp
  const printTime = `Printed: ${format(new Date(), "dd/MM/yyyy HH:mm")}`;
  doc.text(printTime, contentEndX - 150, y + 5);

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

  doc.setFont("courier", "normal");
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

  doc.setDrawColor(176, 176, 176);
  doc.line(50, y, 250, y);
  y += 12;

  doc.setFont("courier", "bold");
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
