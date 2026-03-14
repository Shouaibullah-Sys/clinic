// lib/pdf-generator.ts
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import QRCode from "qrcode";
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
  group?: string;
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
  description?: string;
  notes?: string;
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

const extractCommentText = (test: LabTest) => {
  const description = test.description?.trim();
  if (description) return description;

  const notes = test.notes?.trim();
  if (!notes) return "";

  const descriptionMatch = notes.match(
    /Description:\s*([\s\S]*?)(?:\n\s*Preparation:|$)/i,
  );
  if (descriptionMatch?.[1]?.trim()) {
    return descriptionMatch[1].trim();
  }

  return notes;
};

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

const safeFormatDate = (
  value?: string,
  pattern = "dd/MM/yyyy",
  fallback = "N/A",
) => {
  if (!value) return fallback;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return fallback;
  return format(parsed, pattern);
};

const getPatientField = (
  test: LabTest,
  field: keyof Patient,
  fallback = "N/A",
) => {
  const patientRecord = test.patient || {};
  const patientSnapshot = test.patientSnapshot || {};
  const value =
    (patientRecord as any)[field] ?? (patientSnapshot as any)[field];
  if (value === undefined || value === null) return fallback;
  if (typeof value === "string" && value.trim() === "") return fallback;
  return String(value);
};

const getPatientAge = (test: LabTest) => {
  const patientRecord = test.patient || {};
  const patientSnapshot = test.patientSnapshot || {};
  const directAge = (patientRecord as any).age ?? (patientSnapshot as any).age;
  if (directAge !== undefined && directAge !== null && directAge !== "") {
    return String(directAge);
  }

  const dob =
    (patientRecord as any).dateOfBirth || (patientSnapshot as any).dateOfBirth;
  if (!dob) return "N/A";

  const date = new Date(dob);
  if (Number.isNaN(date.getTime())) return "N/A";

  const today = new Date();
  let age = today.getFullYear() - date.getFullYear();
  const monthDiff = today.getMonth() - date.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
    age -= 1;
  }

  return age >= 0 ? String(age) : "N/A";
};

const getDoctorName = (test: LabTest) => {
  const doctorSource = (test as any).doctorName || test.doctor?.name;
  if (!doctorSource) return "N/A";
  const trimmed = String(doctorSource).trim();
  if (!trimmed) return "N/A";
  return /^dr\.?\s+/i.test(trimmed) ? trimmed : `Dr. ${trimmed}`;
};

const getPreparedBy = (test: LabTest) =>
  test.results?.reportedBy?.name ||
  (test as any)?.collectionDetails?.collectedBy?.name ||
  (test as any)?.createdBy?.name ||
  "Laboratory Staff";

const normalizeCategoryLabel = (category?: string) => {
  if (!category) return "LABORATORY";
  const cleaned = category.replace(/_/g, " ").trim();
  return cleaned ? cleaned.toUpperCase() : "LABORATORY";
};

const groupTestsByCategory = (tests: LabTest[]) => {
  const ordered: Array<{ key: string; title: string; tests: LabTest[] }> = [];
  const indexMap = new Map<string, number>();

  tests.forEach((test) => {
    const key = normalizeCategoryLabel(test.category);
    const existingIndex = indexMap.get(key);
    if (existingIndex !== undefined) {
      ordered[existingIndex].tests.push(test);
      return;
    }

    indexMap.set(key, ordered.length);
    ordered.push({ key, title: key, tests: [test] });
  });

  return ordered;
};

type LabRow =
  | {
      type: "section";
      label: string;
    }
  | {
      type: "group";
      label: string;
      indent?: number;
    }
  | {
      type: "row";
      name: string;
      value: string | number;
      unit: string;
      normalRange: string;
      remarks?: string;
      indent?: number;
    };

const buildCategoryRows = (tests: LabTest[]): LabRow[] => {
  const rows: LabRow[] = [];

  tests.forEach((currentTest) => {
    const parameters = currentTest.results?.parameters || [];
    const testName = currentTest.testName?.trim() || "Test";

    if (parameters.length > 1) {
      rows.push({ type: "section", label: testName });
      let currentGroup = "";
      parameters.forEach((param) => {
        const nextGroup = (param as any).group?.trim();
        if (nextGroup && nextGroup !== currentGroup) {
          rows.push({ type: "group", label: nextGroup, indent: 10 });
          currentGroup = nextGroup;
        }
        rows.push({
          type: "row",
          name: param.name || testName,
          value: param.value ?? "",
          unit: param.unit || "",
          normalRange: param.normalRange || "",
          remarks: param.remarks || "",
          indent: nextGroup ? 20 : 10,
        });
      });
      return;
    }

    if (parameters.length === 1) {
      const param = parameters[0];
      rows.push({
        type: "row",
        name: testName || param.name || "Test",
        value: param.value ?? "",
        unit: param.unit || "",
        normalRange: param.normalRange || "",
        remarks: param.remarks || "",
      });
      return;
    }

    rows.push({
      type: "row",
      name: testName,
      value: "",
      unit: "",
      normalRange: "",
    });
  });

  return rows;
};

const getResultColor = (
  value: string | number,
  normalRange?: string,
  remarks?: string,
) => {
  const red: [number, number, number] = [200, 0, 0];
  const black: [number, number, number] = [0, 0, 0];
  const numericValue = Number(value);
  const note = (remarks || "").toLowerCase();

  if (
    ["high", "low", "critical", "abnormal"].some((word) => note.includes(word))
  ) {
    return red;
  }

  if (!normalRange || Number.isNaN(numericValue)) {
    return black;
  }

  const rangeMatch = normalRange.match(/(-?\d+\.?\d*)\s*[-–]\s*(-?\d+\.?\d*)/);
  if (!rangeMatch) {
    return black;
  }

  const min = Number(rangeMatch[1]);
  const max = Number(rangeMatch[2]);
  if (Number.isNaN(min) || Number.isNaN(max)) {
    return black;
  }

  return numericValue < min || numericValue > max ? red : black;
};

const drawVerificationBlock = (
  doc: jsPDF,
  pageWidth: number,
  pageHeight: number,
  reportId: string,
  qrDataUrl?: string,
) => {
  const size = 54;
  const x = pageWidth / 2 - size / 2;
  const y = pageHeight - 142;

  if (qrDataUrl) {
    doc.addImage(qrDataUrl, "PNG", x, y, size, size);
  } else {
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.6);
    doc.rect(x, y, size, size);
    doc.rect(x + 4, y + 4, 10, 10);
    doc.rect(x + size - 14, y + 4, 10, 10);
    doc.rect(x + 4, y + size - 14, 10, 10);

    doc.setFont("courier", "bold");
    doc.setFontSize(7);
    doc.text(reportId.slice(-6), pageWidth / 2, y + size / 2 + 2, {
      align: "center",
    });
  }

  doc.setFont("courier", "normal");
  doc.setFontSize(7);
  doc.setTextColor(40, 40, 40);
};

const saveOrPrintPdf = (
  doc: jsPDF,
  mode: "print" | "download",
  fileName: string,
) => {
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
    return;
  }

  doc.save(fileName);
};

const generateSharedLabReportPDF = async (
  tests: LabTest[],
  mode: "print" | "download",
) => {
  if (tests.length === 0) return;

  tests.forEach((test) => {
    if (
      (!test.results?.parameters || test.results.parameters.length === 0) &&
      test.specimen?.parameters &&
      test.specimen.parameters.length > 0
    ) {
      test.results = {
        ...(test.results || {}),
        parameters: test.specimen.parameters
          .filter(
            (parameter) =>
              parameter.name &&
              parameter.name.trim() &&
              (parameter.value !== undefined ||
                parameter.result !== undefined ||
                parameter.value === 0 ||
                parameter.result === 0),
          )
          .map((parameter) => ({
            name: parameter.name,
            value: parameter.value ?? parameter.result ?? "",
            unit: parameter.unit,
            normalRange: parameter.normalRange,
            remarks: parameter.remarks,
          })),
      };
    }
  });

  const test = tests[0];
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "letter",
  });

  await ensurePersianFont(doc);
  doc.setFont("times", "normal");

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 30;
  const headerTop = 155;
  const tableHeaderHeight = 12;
  const rowHeight = 14;
  const footerReserve = 130;

  const baseReportId = test.labReferenceId || test.testId || "LAB";
  const rawReportId = /^lab[-]?/i.test(baseReportId)
    ? baseReportId
    : `LAB-${baseReportId}`;
  const reportId = formatReportId(rawReportId);
  const doctorName = getDoctorName(test);
  const whatsappUrl = "https://wa.me/93748893012";
  const qrDataUrl = await QRCode.toDataURL(whatsappUrl, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 180,
    color: {
      dark: "#000000",
      light: "#FFFFFF",
    },
  });
  const collectionDate = safeFormatDate(
    (test as any)?.collectionDetails?.collectedAt || test.orderedAt,
  );
  const reportingDate = safeFormatDate(
    test.results?.reportedAt || test.completedAt || test.orderedAt,
    "dd/MM/yyyy HH:mm",
  );
  const patientName = getPatientField(test, "name");
  const leftColumnRows: Array<[string, string]> = [
    ["Transaction Id", test.testId || "N/A"],
    ["Patient Name", patientName],
    ["Father", getPatientField(test, "guardian")],
    ["Age/Gender", `${getPatientAge(test)}/${getPatientField(test, "gender")}`],
  ];

  const rightColumnRows: Array<[string, string]> = [
    ["Ref. By", doctorName],
    ["Collection Date", collectionDate],
    ["Reporting Date", reportingDate],
    ["Pass/Taskera", getPatientField(test, "passTskNo")],
    ["Cont. No", getPatientField(test, "phone")],
  ];

  const renderTopBlock = (
    pageNumber: number,
    categoryTitle: string,
    categoryTests: LabTest[],
  ) => {
    doc.setTextColor(40, 40, 40);
    doc.setFont("times", "normal");
    doc.setFontSize(9.5);

    const leftX = margin;
    const rightX = pageWidth / 2 + 20;
    const infoRowGap = 12;

    leftColumnRows.forEach(([label, value], index) => {
      const y = headerTop + index * infoRowGap;
      doc.text(label, leftX, y);
      doc.text(":", leftX + 70, y);
      doc.setFont("times", "bold");
      doc.text(value || "N/A", leftX + 76, y);
      doc.setFont("times", "normal");
    });

    rightColumnRows.forEach(([label, value], index) => {
      const y = headerTop + index * infoRowGap;
      doc.text(label, rightX, y);
      doc.text(":", rightX + 70, y);
      doc.setFont("times", "bold");
      doc.text(value || "N/A", rightX + 76, y);
      doc.setFont("times", "normal");
    });

    const infoEndY = headerTop + leftColumnRows.length * infoRowGap + 4;
    doc.rect(margin, infoEndY, pageWidth - margin * 2, 16);
    doc.setFont("time", "normal");
    doc.text("Investigation Desired:", margin + 6, infoEndY + 11);
    doc.setFont("courier", "normal");

    const investigationText = categoryTests
      .map((item: LabTest) => item.testName?.trim())
      .filter(Boolean)
      .join(", ");
    const invLines = doc.splitTextToSize(
      investigationText || "N/A",
      pageWidth - margin * 2 - 120,
    );
    doc.text(invLines[0] || "N/A", margin + 118, infoEndY + 11);

    const sectionY = infoEndY + 38;
    doc.setFont("courier", "bold");
    doc.setFontSize(12);
    doc.text(categoryTitle, pageWidth / 2, sectionY, { align: "center" });
    doc.line(margin, sectionY + 4, pageWidth - margin, sectionY + 4);

    const tableY = sectionY + 8;
    doc.line(margin, tableY, pageWidth - margin, tableY);
    doc.line(
      margin,
      tableY + tableHeaderHeight,
      pageWidth - margin,
      tableY + tableHeaderHeight,
    );

    doc.setFont("courier", "bold");
    doc.setFontSize(10);
    doc.text("Test Name", margin + 4, tableY + 9);
    doc.text("Result", margin + 210, tableY + 9);
    doc.text("Unit", margin + 300, tableY + 9);
    doc.text("Normal Range", margin + 370, tableY + 9);

    return {
      contentY: tableY + tableHeaderHeight + 16,
    };
  };

  const addPageFooter = (pageNumber: number, hasMorePages: boolean) => {
    if (hasMorePages) {
      doc.setFont("times", "normal");
      doc.setFontSize(9);
      doc.text(
        `Continue On Page - ${pageNumber + 1}`,
        pageWidth / 2,
        pageHeight - 155,
        {
          align: "center",
        },
      );
    }

    drawVerificationBlock(doc, pageWidth, pageHeight, reportId, qrDataUrl);
  };

  const categoryGroups = groupTestsByCategory(tests);

  let pageNumber = 1;
  categoryGroups.forEach((group, groupIndex) => {
    if (groupIndex > 0) {
      doc.addPage();
      pageNumber += 1;
    }

    let { contentY } = renderTopBlock(pageNumber, group.title, group.tests);
    const rows = buildCategoryRows(group.tests);

    const ensureSpaceForBlock = (requiredHeight: number) => {
      if (contentY + requiredHeight <= pageHeight - footerReserve) {
        return;
      }

      addPageFooter(pageNumber, true);
      doc.addPage();
      pageNumber += 1;
      contentY = renderTopBlock(pageNumber, group.title, group.tests).contentY;
    };

    rows.forEach((row) => {
      const blockHeight = rowHeight;
      if (contentY + blockHeight > pageHeight - footerReserve) {
        addPageFooter(pageNumber, true);
        doc.addPage();
        pageNumber += 1;
        contentY = renderTopBlock(
          pageNumber,
          group.title,
          group.tests,
        ).contentY;
      }

      if (row.type === "section") {
        doc.setFont("times", "bold");
        doc.setFontSize(9);
        doc.setTextColor(40, 40, 40);
        doc.text(row.label, margin + 4, contentY);
        contentY += rowHeight;
        return;
      }
      if (row.type === "group") {
        doc.setFont("times", "bold");
        doc.setFontSize(8.6);
        doc.setTextColor(40, 40, 40);
        doc.text(row.label, margin + 4 + (row.indent ?? 0), contentY);
        contentY += rowHeight;
        return;
      }

      const color = getResultColor(row.value, row.normalRange, row.remarks);
      const resultValue = String(row.value ?? "");
      const nameLines = doc.splitTextToSize(row.name || "-", 190);
      const rangeLines = doc.splitTextToSize(row.normalRange || "-", 150);
      const nameX = margin + 4 + (row.indent ?? 0);

      doc.setFont("times", "normal");
      doc.setFontSize(8.2);
      doc.setTextColor(40, 40, 40);
      doc.text(nameLines[0] || "-", nameX, contentY);

      doc.setFont("times", "bold");
      doc.setTextColor(color[0], color[1], color[2]);
      doc.text(resultValue || "-", margin + 220, contentY);

      doc.setFont("times", "normal");
      doc.setTextColor(40, 40, 40);
      doc.text(row.unit || "", margin + 300, contentY);
      doc.text(rangeLines, margin + 370, contentY);

      contentY += rowHeight;
    });

    const interpretation = group.tests
      .map((item: LabTest) => item.results?.interpretation?.trim())
      .filter(Boolean)
      .join("\n\n");

    const commentEntries = group.tests
      .map((item: LabTest) => ({
        testName: item.testName?.trim() || "Test",
        description: extractCommentText(item),
      }))
      .filter(
        (item: { testName: string; description: string }) => item.description,
      )
      .filter(
        (
          item: { testName: string; description: string },
          index: number,
          all: Array<{ testName: string; description: string }>,
        ) =>
          all.findIndex(
            (candidate) =>
              candidate.testName === item.testName &&
              candidate.description === item.description,
          ) === index,
      );

    const renderParagraphBlock = (
      title: string,
      body: string,
      options?: { titleFontSize?: number; bodyFontSize?: number },
    ) => {
      const titleFontSize = options?.titleFontSize ?? 9;
      const bodyFontSize = options?.bodyFontSize ?? 8;
      const bodyLines = doc.splitTextToSize(body, pageWidth - margin * 2);

      ensureSpaceForBlock(22);

      doc.setFont("times", "bold");
      doc.setFontSize(titleFontSize);
      doc.setTextColor(40, 40, 40);
      doc.text(title, margin, contentY);
      contentY += 12;

      doc.setFont("times", "normal");
      doc.setFontSize(bodyFontSize);
      doc.setTextColor(60, 60, 60);

      bodyLines.forEach((line: string) => {
        ensureSpaceForBlock(12);
        doc.text(line, margin, contentY);
        contentY += 11;
      });

      contentY += 6;
    };

    if (commentEntries.length > 0) {
      ensureSpaceForBlock(22);
      doc.setFont("courier", "bold");
      doc.setFontSize(9);
      doc.setTextColor(40, 40, 40);
      doc.text("CLINICAL DESCRIPTION.", margin, contentY);
      contentY += 12;

      commentEntries.forEach((entry) => {
        if (commentEntries.length > 1) {
          renderParagraphBlock(entry.testName, entry.description, {
            titleFontSize: 10,
            bodyFontSize: 9,
          });
          return;
        }

        const descriptionLines = doc.splitTextToSize(
          entry.description,
          pageWidth - margin * 2,
        );

        ensureSpaceForBlock(20);
        doc.setFont("courier", "normal");
        doc.setFontSize(9);
        doc.setTextColor(60, 60, 60);

        descriptionLines.forEach((line: string) => {
          ensureSpaceForBlock(12);
          doc.text(line, margin, contentY);
          contentY += 11;
        });

        contentY += 6;
      });
    }

    if (interpretation) {
      renderParagraphBlock("Interpretation", interpretation, {
        titleFontSize: 9,
        bodyFontSize: 8,
      });
    }

    addPageFooter(pageNumber, false);
  });

  const fileName = `lab-report-${patientName.toLowerCase().replace(/\s+/g, "-") || "patient"}-${test.testId}.pdf`;
  saveOrPrintPdf(doc, mode, fileName);
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
  await generateSharedLabReportPDF(tests, mode);
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
  await generateSharedLabReportPDF(tests, mode);
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
