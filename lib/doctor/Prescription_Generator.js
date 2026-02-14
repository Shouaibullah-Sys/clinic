// lib/doctor/Prescription_Generator.js
import { jsPDF } from "jspdf";

// Patient section WITHOUT "Patient Information" title

// Configuration for page layout
const defaultConfig = {
  page: {
    orientation: "portrait",
    unit: "pt",
    format: "a4",
    margins: { top: 40, bottom: 40, left: 20, right: 20 },
  },
  colors: {
    primary: [34, 139, 34], // Forest Green - main headers
    accent: [50, 205, 50], // Lime Green - accents
    secondary: [60, 179, 113], // Medium Sea Green - secondary elements
    textDark: [0, 51, 0], // Dark Green - text
    border: [144, 238, 144], // Light Green - borders
    tableStriped: [245, 255, 245], // Mint Cream - table stripes
    sectionBg: [230, 255, 230], // Very Light Green - section backgrounds
    sectionHeader: [0, 100, 0], // Dark Green - section headers
    divider: [200, 230, 200], // Pale Green - dividers
    bgLight: [240, 255, 240], // Honeydew - backgrounds
    patientBoxBg: [240, 255, 240], // Light green background for patient box
    patientBoxBorder: [144, 238, 144], // Light green border for patient box
  },
  typography: {
    defaultFont: "helvetica",
    fontSizes: {
      title: 16,
      subtitle: 14,
      heading: 12,
      subheading: 11,
      body: 10,
      small: 9,
      tiny: 8,
    },
    lineHeights: {
      normal: 1.3,
      tight: 1.1,
      loose: 1.5,
    },
  },
  layout: {
    headerHeight: 130, // Reduced header height
    patientInfoHeight: 20, // Height for patient info boxes
    columnCount: 5, // Total columns on page
    leftColumnWidth: 0.25, // 1/4 width for left column
    rightColumnsWidth: 0.75, // 3/4 width for medication table
    columnGap: 30, // Increased gap between columns
    tableRowHeight: 25, // Row height for medicine table
    tableHeaderHeight: 35, // Header height with accent bar
    patientBoxWidth: 110, // Width of each patient info box
    patientBoxGap: 40, // Gap between patient info boxes
    patientBoxStartX: 20, // Starting X position for first box
  },
  // New sections from comprehensive example
  medications: {
    show: true,
    table: {
      headers: [
        "#",
        "Medicine with Dosage",
        "Frequency",
        "Quantity",
        "Instructions",
      ],
      columnWidths: [20, 130, 60, 80, 100], // Adjusted for A4 width, made Frequency and Instructions wider
      rowHeight: 22,
      stripedRows: true,
      showRowNumbers: true,
      showAdditionalDetails: false,
      maxRowsOnFirstPage: 15, // Increased for A4
    },
  },
  signature: {
    show: true,
    position: "right",
    lineWidth: 0.5,
    lineLength: 150, // Longer for A4
    includeTitle: true,
  },
  footer: {
    show: false, // Hide footer completely
    showDigitalNote: false,
    height: 0,
  },
};

// Create empty header space without title
function addEmptyHeader(doc, y, pageWidth, prescription, config) {
  // Removed PRESCRIPTION title and underline as requested
  return y + config.layout.headerHeight;
}

// Draw a single patient information box
function drawPatientInfoBox(doc, x, y, width, height, label, value, config) {
  // Draw box background with light green
  doc.setFillColor(...config.colors.patientBoxBg);
  doc.rect(x, y, width, height, "F");

  // Draw box border
  doc.setDrawColor(...config.colors.patientBoxBorder);
  doc.setLineWidth(0.8);
  doc.rect(x, y, width, height, "S");

  // Add subtle inner shadow effect (top border lighter)
  doc.setDrawColor(...config.colors.accent);
  doc.setLineWidth(0.3);
  doc.line(x, y, x + width, y); // Top accent line

  // Calculate positions
  const textX = x + 5; // Left padding
  const textY = y + height / 2 + 3; // Center vertically

  // Combine label and value in one line
  const displayText = `${label}: ${value}`;

  // Handle long text by wrapping
  const maxWidth = width - 10; // Leave padding
  const lines = doc.splitTextToSize(displayText, maxWidth);

  // Draw text (normal font, body size)
  doc.setFont(config.typography.defaultFont, "normal");
  doc.setFontSize(config.typography.fontSizes.body);
  doc.setTextColor(...config.colors.textDark);

  if (lines.length === 1) {
    // Single line, left align it
    doc.text(lines[0], textX, textY);
  } else {
    // Multiple lines, left align the first line and truncate if needed
    const displayValue =
      lines[0].length > 20 ? lines[0].substring(0, 17) + "..." : lines[0];
    doc.text(displayValue, textX, textY);
  }

  return y + height;
}

// Create separate patient information boxes - with labels and values in same box
function addPatientInfo(doc, y, pageWidth, prescription, config) {
  const startX = config.layout.patientBoxStartX;
  const boxGap = config.layout.patientBoxGap;
  const boxHeight = config.layout.patientInfoHeight;

  // Define individual box widths
  const nameBoxWidth = 140;
  const ageBoxWidth = 80;
  const sexBoxWidth = 80;
  const dateBoxWidth = 110;

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return new Date().toLocaleDateString("en-GB");
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-GB");
    } catch (error) {
      return new Date().toLocaleDateString("en-GB");
    }
  };

  const name = prescription.patientName || "N/A";
  const gender = prescription.patientGender || "N/A";
  const age = prescription.patientAge || "N/A";
  const date = formatDate(prescription.date);

  let currentX = startX;

  // Draw Name box (wider)
  drawPatientInfoBox(
    doc,
    currentX,
    y,
    nameBoxWidth,
    boxHeight,
    "Name",
    name,
    config,
  );
  currentX += nameBoxWidth + boxGap;

  // Draw Age box (smaller)
  drawPatientInfoBox(
    doc,
    currentX,
    y,
    ageBoxWidth,
    boxHeight,
    "Age",
    age,
    config,
  );
  currentX += ageBoxWidth + boxGap;

  // Draw Sex box (smaller)
  drawPatientInfoBox(
    doc,
    currentX,
    y,
    sexBoxWidth,
    boxHeight,
    "Sex",
    gender,
    config,
  );
  currentX += sexBoxWidth + boxGap;

  // Draw Date box
  drawPatientInfoBox(
    doc,
    currentX,
    y,
    dateBoxWidth,
    boxHeight,
    "Date",
    date,
    config,
  );

  // Return Y position for next element
  return y + boxHeight + 15;
}

// Draw a checked checkbox with text
function drawCheckedItem(doc, x, y, text, config) {
  // Draw square (checkbox)
  doc.setDrawColor(...config.colors.border);
  doc.setLineWidth(0.5);
  doc.rect(x, y, 8, 8, "S");

  // Draw checkmark
  doc.setDrawColor(...config.colors.primary);
  doc.setLineWidth(1);
  doc.line(x + 1, y + 4, x + 3, y + 6);
  doc.line(x + 3, y + 6, x + 7, y + 2);

  // Draw text
  doc.setFont(config.typography.defaultFont, "normal");
  doc.setFontSize(config.typography.fontSizes.small);
  doc.setTextColor(...config.colors.textDark);
  doc.text(text, x + 12, y + 6);
}

// Draw laboratory box with text inside
function drawLaboratoryBox(doc, x, y, width, height, text, config) {
  // Draw box background with light green
  doc.setFillColor(...config.colors.sectionBg);
  doc.rect(x, y, width, height, "F");

  // Draw box border
  doc.setDrawColor(...config.colors.border);
  doc.setLineWidth(0.3);
  doc.rect(x, y, width, height, "S");

  // Calculate center positions
  const centerX = x + width / 2;
  const boxCenterY = y + height / 2;

  // Split text if it's too long
  doc.setFont(config.typography.defaultFont, "bold");
  doc.setFontSize(config.typography.fontSizes.small);
  doc.setTextColor(...config.colors.sectionHeader);

  // Determine max characters per line based on box width
  const maxCharsPerLine = Math.floor(width / 4.5); // Approximate character width
  const textStr = text.toString();

  if (textStr.length <= maxCharsPerLine) {
    // Text fits in one line, center it
    doc.text(textStr, centerX, boxCenterY, { align: "center" });
  } else {
    // Split text into multiple lines
    const words = textStr.split(" ");
    let lines = [];
    let currentLine = "";

    for (let word of words) {
      if ((currentLine + " " + word).length <= maxCharsPerLine) {
        currentLine = currentLine ? currentLine + " " + word : word;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);

    // Limit to 2 lines maximum
    if (lines.length > 2) {
      lines = lines.slice(0, 2);
      lines[1] = lines[1].slice(0, maxCharsPerLine - 3) + "...";
    }

    // Calculate vertical positioning
    const lineHeight = 9;
    const totalHeight = lines.length * lineHeight;
    const startY = boxCenterY - totalHeight / 2 + lineHeight / 2;

    // Draw each line
    for (let i = 0; i < lines.length; i++) {
      doc.text(lines[i], centerX, startY + i * lineHeight, { align: "center" });
    }
  }
}

// Add vaccination, past medical history, physical examination, and test physical examination section
function addVaccinationPastMedicalHistoryInvestigationSection(
  doc,
  y,
  x,
  width,
  prescription,
  config,
) {
  let currentY = y;

  // Chief Complaint section
  const chiefComplaints = prescription.chiefComplaints || "N/A";
  const ccItems =
    chiefComplaints === "N/A"
      ? ["N/A"]
      : chiefComplaints
          .split(",")
          .map((item) => item.trim())
          .filter((item) => item);

  // Calculate height needed for Chief Complaint section
  const ccSectionHeight = 5 + ccItems.length * 14 + 15; // Title + items + spacing (smaller top margin)

  // Draw left accent bar for Chief Complaint
  doc.setFillColor(...config.colors.accent);
  doc.rect(x, currentY, 4, ccSectionHeight, "F");

  // Chief Complaint title
  doc.setFont(config.typography.defaultFont, "bold");
  doc.setFontSize(config.typography.fontSizes.subheading);
  doc.setTextColor(...config.colors.primary);
  doc.text("Chief Complaint:", x + 10, currentY + 10);
  currentY += 15;

  // Chief Complaint content - wrap long items to next line
  let ccItemY = currentY;
  ccItems.forEach((item) => {
    // Check if item is too long and needs to wrap
    const maxWidth = width - 20; // Leave some padding
    const fontSize = config.typography.fontSizes.small;
    const lineHeight = fontSize * 1.2;

    // Split long text into multiple lines
    const lines = doc.splitTextToSize(item, maxWidth);

    // Draw each line
    lines.forEach((line, lineIndex) => {
      if (lineIndex === 0) {
        // First line with checkbox
        drawCheckedItem(doc, x + 10, ccItemY, line, config);
      } else {
        // Subsequent lines without checkbox, indented
        doc.setFont(config.typography.defaultFont, "normal");
        doc.setFontSize(config.typography.fontSizes.small);
        doc.setTextColor(...config.colors.textDark);
        // Use consistent line spacing (1.2 multiplier)
        const lineSpacing = lineHeight * 1.2;
        doc.text(line, x + 10 + 12, ccItemY + lineIndex * lineSpacing); // Indent to align with text
      }
    });

    // Add spacing between items (using same 1.2 multiplier for consistency)
    const itemSpacing = lines.length * lineHeight * 1.2;
    ccItemY += itemSpacing;
  });
  currentY = ccItemY + 15;

  currentY += 10; // Space before Physical Examination title

  // Physical examination section
  const investigations = prescription.investigations || "N/A";
  const invItems =
    investigations === "N/A"
      ? ["N/A"]
      : investigations
          .split(",")
          .map((item) => item.trim())
          .filter((item) => item);

  // Calculate height needed for Physical Examination section
  const invSectionHeight = 5 + invItems.length * 14 + 15;

  // Draw left accent bar for physical examination
  doc.setFillColor(...config.colors.accent);
  doc.rect(x, currentY, 4, invSectionHeight, "F");

  // Physical examination title
  doc.setFont(config.typography.defaultFont, "bold");
  doc.setFontSize(config.typography.fontSizes.subheading);
  doc.setTextColor(...config.colors.primary);
  doc.text("Physical Examination:", x + 10, currentY + 10);
  currentY += 15;

  // Physical examination content - wrap long items to next line
  let invItemY = currentY;
  invItems.forEach((item) => {
    const maxWidth = width - 20;
    const fontSize = config.typography.fontSizes.small;
    const lineHeight = fontSize * 1.2;

    const lines = doc.splitTextToSize(item, maxWidth);

    lines.forEach((line, lineIndex) => {
      if (lineIndex === 0) {
        drawCheckedItem(doc, x + 10, invItemY, line, config);
      } else {
        doc.setFont(config.typography.defaultFont, "normal");
        doc.setFontSize(config.typography.fontSizes.small);
        doc.setTextColor(...config.colors.textDark);
        // Use consistent line spacing (1.2 multiplier)
        const lineSpacing = lineHeight * 1.2;
        doc.text(line, x + 10 + 12, invItemY + lineIndex * lineSpacing);
      }
    });

    // Add spacing between items (using same 1.2 multiplier for consistency)
    const itemSpacing = lines.length * lineHeight * 1.2;
    invItemY += itemSpacing;
  });
  currentY = invItemY + 15;

  // Radiology section
  const radiology = prescription.radiology;
  if (radiology) {
    const radItems = radiology
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item);

    // Calculate height needed for Radiology section
    const radSectionHeight = 5 + radItems.length * 14 + 15; // Smaller spacing

    // Draw left accent bar for radiology
    doc.setFillColor(...config.colors.accent);
    doc.rect(x, currentY, 4, radSectionHeight, "F");

    // Radiology title
    doc.setFont(config.typography.defaultFont, "bold");
    doc.setFontSize(config.typography.fontSizes.subheading);
    doc.setTextColor(...config.colors.primary);
    doc.text("Radiology:", x + 10, currentY + 10);
    currentY += 15; // Same spacing after title as other sections

    // Radiology content - wrap long items to next line
    let radItemY = currentY;
    radItems.forEach((item) => {
      const maxWidth = width - 20;
      const fontSize = config.typography.fontSizes.small;
      const lineHeight = fontSize * 1.2;

      const lines = doc.splitTextToSize(item, maxWidth);

      lines.forEach((line, lineIndex) => {
        if (lineIndex === 0) {
          drawCheckedItem(doc, x + 10, radItemY, line, config);
        } else {
          doc.setFont(config.typography.defaultFont, "normal");
          doc.setFontSize(config.typography.fontSizes.small);
          doc.setTextColor(...config.colors.textDark);
          // Use consistent line spacing (1.2 multiplier)
          const lineSpacing = lineHeight * 1.2;
          doc.text(line, x + 10 + 12, radItemY + lineIndex * lineSpacing);
        }
      });

      // Add more spacing between items for better readability
      const itemSpacing = lines.length * lineHeight * 1.2;
      radItemY += itemSpacing;
    });
    currentY = radItemY + 10; // Final spacing
  }

  return currentY;
}

// Add left column with diagnosis and vital signs below diagnosis
function addLeftColumn(doc, y, x, width, prescription, config) {
  let currentY = y;

  // Vaccination, Past Medical History, and Investigation section
  currentY = addVaccinationPastMedicalHistoryInvestigationSection(
    doc,
    currentY,
    x,
    width,
    prescription,
    config,
  );

  currentY += 20; // Spacing before Laboratory section

  // Laboratory section with styling (moved from right column to left column)
  const laboratory = prescription.laboratory;
  if (laboratory) {
    const labItems = laboratory
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item);

    // Calculate height needed for Laboratory section
    const labSectionHeight = 15 + labItems.length * 14 + 15;

    // Draw left accent bar for laboratory
    doc.setFillColor(...config.colors.accent);
    doc.rect(x, currentY, 4, labSectionHeight, "F");

    // Laboratory title
    doc.setFont(config.typography.defaultFont, "bold");
    doc.setFontSize(config.typography.fontSizes.subheading);
    doc.setTextColor(...config.colors.primary);
    doc.text("Laboratory:", x + 10, currentY + 12);
    currentY += 20;

    // Laboratory content - wrap long items to next line
    let labItemY = currentY;
    labItems.forEach((item) => {
      const maxWidth = width - 20;
      const fontSize = config.typography.fontSizes.small;
      const lineHeight = fontSize * 1.2;

      const lines = doc.splitTextToSize(item, maxWidth);

      lines.forEach((line, lineIndex) => {
        if (lineIndex === 0) {
          drawCheckedItem(doc, x + 10, labItemY, line, config);
        } else {
          doc.setFont(config.typography.defaultFont, "normal");
          doc.setFontSize(config.typography.fontSizes.small);
          doc.setTextColor(...config.colors.textDark);
          // Use consistent line spacing (1.2 multiplier)
          const lineSpacing = lineHeight * 1.2;
          doc.text(line, x + 10 + 12, labItemY + lineIndex * lineSpacing);
        }
      });

      // Add spacing between items (using same 1.2 multiplier for consistency)
      const itemSpacing = lines.length * lineHeight * 1.2;
      labItemY += itemSpacing;
    });
    currentY = labItemY + 5;
  }

  currentY += 20; // Spacing before Diagnosis section

  // Diagnosis section with styling
  const diagnosis = prescription.diagnosis || "N/A";
  const diagnosisItems =
    diagnosis === "N/A"
      ? ["N/A"]
      : diagnosis
          .split(",")
          .map((item) => item.trim())
          .filter((item) => item);

  // Calculate height needed for Diagnosis section
  const diagnosisSectionHeight = 15 + diagnosisItems.length * 14 + 15;

  // Draw left accent bar for diagnosis
  doc.setFillColor(...config.colors.accent);
  doc.rect(x, currentY, 4, diagnosisSectionHeight, "F");

  // Diagnosis title
  doc.setFont(config.typography.defaultFont, "bold");
  doc.setFontSize(config.typography.fontSizes.subheading);
  doc.setTextColor(...config.colors.primary);
  doc.text("Diagnosis:", x + 10, currentY + 12);
  currentY += 20;

  let diagItemY = currentY;
  diagnosisItems.forEach((item) => {
    // Check if item is too long and needs to wrap
    const maxWidth = width - 20; // Leave some padding
    const fontSize = config.typography.fontSizes.small;
    const lineHeight = fontSize * 1.2;

    // Split long text into multiple lines
    const lines = doc.splitTextToSize(item, maxWidth);

    // Draw each line
    lines.forEach((line, lineIndex) => {
      if (lineIndex === 0) {
        // First line with checkbox
        drawCheckedItem(doc, x + 10, diagItemY, line, config);
      } else {
        // Subsequent lines without checkbox, indented
        doc.setFont(config.typography.defaultFont, "normal");
        doc.setFontSize(config.typography.fontSizes.small);
        doc.setTextColor(...config.colors.textDark);
        // Use consistent line spacing (1.2 multiplier)
        const lineSpacing = lineHeight * 1.2;
        doc.text(line, x + 10 + 12, diagItemY + lineIndex * lineSpacing); // Indent to align with text
      }
    });

    // Add spacing between items (using same 1.2 multiplier for consistency)
    const itemSpacing = lines.length * lineHeight * 1.2;
    diagItemY += itemSpacing;
  });
  currentY = diagItemY + 5;

  currentY += 20; // Spacing before Advice section

  // Advice section with styling (same pattern as other left-side sections)
  const advice = prescription.additionalAdvice || "N/A";
  const adviceItems =
    advice === "N/A"
      ? ["N/A"]
      : advice
          .split(",")
          .map((item) => item.trim())
          .filter((item) => item);

  // Calculate height needed for Advice section
  const adviceSectionHeight = 15 + adviceItems.length * 14 + 15;

  // Draw left accent bar for advice
  doc.setFillColor(...config.colors.accent);
  doc.rect(x, currentY, 4, adviceSectionHeight, "F");

  // Advice title
  doc.setFont(config.typography.defaultFont, "bold");
  doc.setFontSize(config.typography.fontSizes.subheading);
  doc.setTextColor(...config.colors.primary);
  doc.text("Advice:", x + 10, currentY + 12);
  currentY += 20;

  let adviceItemY = currentY;
  adviceItems.forEach((item) => {
    // Check if item is too long and needs to wrap
    const maxWidth = width - 20; // Leave some padding
    const fontSize = config.typography.fontSizes.small;
    const lineHeight = fontSize * 1.2;

    // Split long text into multiple lines
    const lines = doc.splitTextToSize(item, maxWidth);

    // Draw each line
    lines.forEach((line, lineIndex) => {
      if (lineIndex === 0) {
        // First line with checkbox
        drawCheckedItem(doc, x + 10, adviceItemY, line, config);
      } else {
        // Subsequent lines without checkbox, indented
        doc.setFont(config.typography.defaultFont, "normal");
        doc.setFontSize(config.typography.fontSizes.small);
        doc.setTextColor(...config.colors.textDark);
        // Use consistent line spacing (1.2 multiplier)
        const lineSpacing = lineHeight * 1.2;
        doc.text(line, x + 10 + 12, adviceItemY + lineIndex * lineSpacing); // Indent to align with text
      }
    });

    // Add spacing between items (using same 1.2 multiplier for consistency)
    const itemSpacing = lines.length * lineHeight * 1.2;
    adviceItemY += itemSpacing;
  });
  currentY = adviceItemY + 5;

  return currentY;
}

// Add medications table with exact design from comprehensive example
function addMedicationsTable(doc, y, startX, tableWidth, prescription, config) {
  const medications = prescription.medicines || [];

  // DEBUG: Log medications data
  console.log("DEBUG: addMedicationsTable - medications:", medications);
  medications.forEach((med, index) => {
    console.log(`DEBUG: Medication ${index}:`, {
      medicine: med.medicine,
      dosage: med.dosage,
      frequency: med.frequency,
      quantity: med.quantity,
      instructions: med.instructions,
    });
  });

  if (medications.length === 0) {
    // Show empty table message with accent bar
    doc.setFillColor(...config.colors.accent);
    doc.rect(config.page.margins.left, y, 4, 16, "F");

    doc.setFont(config.typography.defaultFont, "bold");
    doc.setFontSize(config.typography.fontSizes.heading);
    doc.setTextColor(...config.colors.primary);
    doc.text("PRESCRIPTIONS", config.page.margins.left + 10, y + 11);

    y += 28;

    doc.setFont(config.typography.defaultFont, "normal");
    doc.setFontSize(config.typography.fontSizes.small);
    doc.setTextColor(...config.colors.textDark);
    doc.text("No medications prescribed", config.page.margins.left + 10, y);

    return y + 15;
  }

  // Calculate table dimensions
  const tableStartX = startX;
  // tableWidth is passed as parameter

  // Remove duplicates (optional)
  const uniqueMedications = medications.filter((med, index, self) => {
    const key = `${med.medicine}-${med.dosage}-${med.frequency}-${med.quantity}`;
    return (
      index ===
      self.findIndex(
        (m) => `${m.medicine}-${m.dosage}-${m.frequency}-${m.quantity}` === key,
      )
    );
  });

  // Table configuration - using exact design from comprehensive example
  const tableConfig = {
    headers: config.medications.table.headers,
    columnWidths: config.medications.table.columnWidths,
    rowHeight: config.medications.table.rowHeight,
    startX: tableStartX,
  };

  // Calculate total table width
  const totalTableWidth = tableConfig.columnWidths.reduce((a, b) => a + b, 0);

  // Scale column widths to fit available width if needed
  if (totalTableWidth > tableWidth) {
    const scaleFactor = tableWidth / totalTableWidth;
    tableConfig.columnWidths = tableConfig.columnWidths.map(
      (width) => width * scaleFactor,
    );
  }

  // Draw table header with accent bar (exact design from comprehensive example)
  doc.setFillColor(...config.colors.accent);
  doc.rect(tableConfig.startX, y, 4, 16, "F");

  doc.setFont(config.typography.defaultFont, "bold");
  doc.setFontSize(config.typography.fontSizes.heading);
  doc.setTextColor(...config.colors.primary);

  // Title "PRESCRIPTIONS" - English only
  doc.text("PRESCRIPTIONS", tableConfig.startX + 10, y + 11);

  y += 28; // Increased spacing as in comprehensive example

  // Draw column headers
  doc.setFont(config.typography.defaultFont, "bold");
  doc.setFontSize(config.typography.fontSizes.small);
  doc.setTextColor(...config.colors.primary);

  let currentX = tableConfig.startX;
  for (let i = 0; i < tableConfig.headers.length; i++) {
    const header = tableConfig.headers[i];
    const width = tableConfig.columnWidths[i];
    const padding = i === 0 ? 2 : 5; // Exact padding from comprehensive example

    doc.text(header, currentX + padding, y, {
      maxWidth: width - padding * 2,
    });
    currentX += width;
  }

  // Draw header line
  y += 6;
  doc.setDrawColor(...config.colors.border);
  doc.setLineWidth(0.3);
  doc.line(tableConfig.startX, y, tableConfig.startX + totalTableWidth, y);
  y += 10;

  // Draw medication rows with exact styling from comprehensive example
  const pageHeight = doc.internal.pageSize.getHeight();
  const maxRowsOnFirstPage = config.medications.table.maxRowsOnFirstPage;

  for (let i = 0; i < uniqueMedications.length; i++) {
    const med = uniqueMedications[i];

    // Check if we need a new page
    if (i >= maxRowsOnFirstPage) {
      doc.addPage();
      y = config.page.margins.top + 50; // Start lower on new pages

      // Redraw headers on new page
      currentX = tableConfig.startX;
      doc.setFont(config.typography.defaultFont, "bold");
      doc.setFontSize(config.typography.fontSizes.small);
      doc.setTextColor(...config.colors.primary);

      for (let j = 0; j < tableConfig.headers.length; j++) {
        const header = tableConfig.headers[j];
        const width = tableConfig.columnWidths[j];
        const padding = j === 0 ? 2 : 5;

        doc.text(header, currentX + padding, y, {
          maxWidth: width - padding * 2,
        });
        currentX += width;
      }

      y += 12;
    }

    // Row background (striped rows as in comprehensive example)
    if (config.medications.table.stripedRows && i % 2 === 0) {
      doc.setFillColor(...config.colors.tableStriped);
      doc.rect(
        tableConfig.startX,
        y - 5,
        totalTableWidth,
        tableConfig.rowHeight,
        "F",
      );
    }

    // Draw row border for better visibility
    doc.setDrawColor(...config.colors.border);
    doc.setLineWidth(0.2);
    doc.rect(
      tableConfig.startX,
      y - 5,
      totalTableWidth,
      tableConfig.rowHeight,
      "S",
    );

    // Prepare row data - combining medicine and dosage as in comprehensive example
    const rowNumber = config.medications.table.showRowNumbers
      ? `${i + 1}.`
      : "";
    const medicineWithDosage =
      med.medicine && med.dosage
        ? `${med.medicine}-${med.dosage}`
        : med.medicine || "N/A";

    const rowData = [
      rowNumber,
      medicineWithDosage,
      med.frequency || "N/A",
      med.quantity || "N/A",
      med.instructions || "N/A",
    ];

    // Draw row data with exact font styling
    currentX = tableConfig.startX;
    doc.setFont(config.typography.defaultFont, "normal");
    doc.setFontSize(config.typography.fontSizes.body);
    doc.setTextColor(...config.colors.textDark);

    for (let j = 0; j < rowData.length; j++) {
      const cellText = rowData[j];
      const cellWidth = tableConfig.columnWidths[j];
      const padding = j === 0 ? 2 : 5;

      // Split text if too long
      const lines = doc.splitTextToSize(cellText, cellWidth - padding * 2);

      // Draw each line with vertical centering
      const lineHeight =
        config.typography.fontSizes.body * config.typography.lineHeights.normal;
      const totalTextHeight = lines.length * lineHeight;
      const verticalOffset = (tableConfig.rowHeight - totalTextHeight) / 2;

      for (let k = 0; k < lines.length; k++) {
        const lineY = y + verticalOffset + k * lineHeight;
        doc.text(lines[k], currentX + padding, lineY);
      }

      currentX += cellWidth;
    }

    y += tableConfig.rowHeight + 2; // Small gap between rows as in comprehensive example
  }

  return y + 10;
}

// Add signature section (moved up) with exact design from comprehensive example
function addSignatureSection(doc, y, pageWidth, prescription, config) {
  if (!config.signature.show) return y;

  const rightSectionX = pageWidth - config.page.margins.right - 200;
  const pageHeight = doc.internal.pageSize.getHeight();

  // Fixed position: 90px from bottom of the page (moved up 40px)
  const signatureY = pageHeight - 170;

  // Signature line
  doc.setDrawColor(...config.colors.primary);
  doc.setLineWidth(config.signature.lineWidth);
  doc.line(
    rightSectionX,
    signatureY,
    rightSectionX + config.signature.lineLength,
    signatureY,
  );

  // Doctor name
  doc.setFont(config.typography.defaultFont, "bold");
  doc.setFontSize(config.typography.fontSizes.subheading);
  doc.setTextColor(...config.colors.primary);
  doc.text(
    prescription.doctorName || "Doctor Name",
    rightSectionX + config.signature.lineLength / 2,
    signatureY + 15,
    { align: "center" },
  );

  // Title
  if (config.signature.includeTitle) {
    const doctorTitle =
      prescription.doctorSpecialization ||
      prescription.doctorDepartment ||
      prescription.doctorTitle ||
      "Consultant";

    doc.setFont(config.typography.defaultFont, "normal");
    doc.setFontSize(config.typography.fontSizes.small);
    doc.setTextColor(...config.colors.textDark);
    doc.text(
      doctorTitle,
      rightSectionX + config.signature.lineLength / 2,
      signatureY + 28,
      { align: "center" },
    );
  }

  return Math.max(y, signatureY + 50);
}

// Add footer (hidden)
function addFooter(doc, pageWidth, pageHeight, config) {
  if (!config.footer.show) return;
  // Footer is hidden as requested
}

// Main PDF generation function
async function generatePrescriptionPDF(
  prescription,
  userConfig = {},
  mode = "download",
) {
  // Merge user config with default config
  const config = {
    ...defaultConfig,
    ...userConfig,
    page: { ...defaultConfig.page, ...userConfig?.page },
    colors: { ...defaultConfig.colors, ...userConfig?.colors },
    typography: { ...defaultConfig.typography, ...userConfig?.typography },
    layout: {
      ...defaultConfig.layout,
      ...userConfig?.layout,
    },
    medications: {
      ...defaultConfig.medications,
      ...userConfig?.medications,
      table: {
        ...defaultConfig.medications.table,
        ...userConfig?.medications?.table,
      },
    },
    signature: {
      ...defaultConfig.signature,
      ...userConfig?.signature,
    },
    footer: {
      ...defaultConfig.footer,
      ...userConfig?.footer,
    },
  };

  const doc = new jsPDF({
    orientation: config.page.orientation,
    unit: config.page.unit,
    format: config.page.format,
  });

  doc.setFont("helvetica", "normal");

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Start at top margin
  let y = config.page.margins.top;

  // STEP 1: Add header with title
  y = addEmptyHeader(doc, y, pageWidth, prescription, config);

  // STEP 2: Add separate patient information boxes
  y = addPatientInfo(doc, y, pageWidth, prescription, config);

  // STEP 3: Calculate column positions
  const availableWidth =
    pageWidth - config.page.margins.left - config.page.margins.right;
  const leftColumnWidth = availableWidth * config.layout.leftColumnWidth;
  const rightColumnWidth = availableWidth * config.layout.rightColumnsWidth;
  const leftColumnX = config.page.margins.left;
  const rightColumnX = leftColumnX + leftColumnWidth + config.layout.columnGap;

  // STEP 4: Add left column (diagnosis and additional advice) - moved down 10px
  const leftY = addLeftColumn(
    doc,
    y + 10,
    leftColumnX,
    leftColumnWidth,
    prescription,
    config,
  );

  // STEP 5: Add medications table in right column
  let rightY = addMedicationsTable(
    doc,
    y + 10,
    rightColumnX,
    rightColumnWidth,
    prescription,
    config,
  );

  // Use the maximum Y position for next sections
  y = Math.max(leftY, rightY);

  // STEP 6: Add signature section (moved up)
  addSignatureSection(doc, y, pageWidth, prescription, config);

  // STEP 7: Add footer (hidden)
  addFooter(doc, pageWidth, pageHeight, config);

  // Generate filename and output
  const patientName = prescription.patientName || "patient";
  const safeName = patientName.toLowerCase().replace(/[^a-z0-9]/g, "-");
  const dateStr = prescription.date
    ? new Date(prescription.date).toISOString().split("T")[0]
    : new Date().toISOString().split("T")[0];
  const fileName = `prescription-${safeName}-${dateStr}.pdf`;
  if (mode === "print") {
    doc.autoPrint();
    doc.output("dataurlnewwindow");
    return;
  }

  doc.save(fileName);
}

// Configuration functions for dynamic adjustments
function adjustHeaderSize(newHeight) {
  defaultConfig.layout.headerHeight = newHeight;
  console.log(`Header height adjusted to ${newHeight}pt`);
}

function adjustPatientInfoHeight(newHeight) {
  defaultConfig.layout.patientInfoHeight = newHeight;
  console.log(`Patient info height adjusted to ${newHeight}pt`);
}

function adjustPatientBoxWidth(newWidth) {
  defaultConfig.layout.patientBoxWidth = newWidth;
  console.log(`Patient box width adjusted to ${newWidth}pt`);
}

function adjustPatientBoxGap(newGap) {
  defaultConfig.layout.patientBoxGap = newGap;
  console.log(`Patient box gap adjusted to ${newGap}pt`);
}

function adjustTableRowHeight(newHeight) {
  defaultConfig.medications.table.rowHeight = newHeight;
  console.log(`Table row height adjusted to ${newHeight}pt`);
}

function adjustColumnWidths(leftColumnPercent, rightColumnsPercent) {
  if (leftColumnPercent + rightColumnsPercent !== 1) {
    console.error("Column widths must sum to 1 (100%)");
    return;
  }

  defaultConfig.layout.leftColumnWidth = leftColumnPercent;
  defaultConfig.layout.rightColumnsWidth = rightColumnsPercent;
  console.log(
    `Column widths adjusted: Left=${leftColumnPercent * 100}%, Right=${rightColumnsPercent * 100}%`,
  );
}

function adjustMedicationColumnWidths(widths) {
  if (widths.length === defaultConfig.medications.table.columnWidths.length) {
    defaultConfig.medications.table.columnWidths = widths;
    console.log("Medication column widths adjusted:", widths);
  } else {
    console.error(
      `Expected ${defaultConfig.medications.table.columnWidths.length} column widths`,
    );
  }
}

// Export for module usage
export {
  generatePrescriptionPDF,
  adjustHeaderSize,
  adjustPatientInfoHeight,
  adjustPatientBoxWidth,
  adjustPatientBoxGap,
  adjustTableRowHeight,
  adjustColumnWidths,
  adjustMedicationColumnWidths,
};

if (typeof window !== "undefined") {
  window.PDFGenerator = {
    generatePrescriptionPDF,
    downloadPrescriptionPDF: generatePrescriptionPDF,

    // Configuration functions for dynamic adjustments
    adjustHeaderSize,
    adjustPatientInfoHeight,
    adjustPatientBoxWidth,
    adjustPatientBoxGap,
    adjustTableRowHeight,
    adjustColumnWidths,
    adjustMedicationColumnWidths,

    // Current configuration
    getConfig: () => ({ ...defaultConfig }),

    // Reset to default configuration
    resetConfig: () => {
      defaultConfig.layout.headerHeight = 40;
      defaultConfig.layout.patientInfoHeight = 45;
      defaultConfig.layout.patientBoxWidth = 110;
      defaultConfig.layout.patientBoxGap = 15;
      defaultConfig.layout.patientBoxStartX = 20;
      defaultConfig.layout.leftColumnWidth = 0.25;
      defaultConfig.layout.rightColumnsWidth = 0.75;
      defaultConfig.medications.table.columnWidths = [20, 130, 55, 55, 110];
      defaultConfig.medications.table.rowHeight = 22;
      console.log("Configuration reset to defaults");
    },
  };

  // Make it available globally
  window.downloadPrescriptionPDF = generatePrescriptionPDF;
}

// Example usage
function downloadExamplePDF() {
  const prescriptionData = {
    patientName: "John Michael Doe",
    patientGender: "Male",
    patientAge: "35 years",
    date: new Date().toISOString(),
    doctorName: "Dr. Sarah Johnson",
    diagnosis: "Upper respiratory tract infection with fever",
    laboratory:
      "CBC,LFT,KFT,TFT,Lipid Profile,Urine R/M,Blood Sugar Fasting,Blood Sugar PP,HbA1c,ESR,CRP",
    // Advice is now simple text below doctor's signature
    additionalAdvice:
      "Rest adequately, Drink plenty of fluids, Avoid smoking and alcohol, Return if symptoms worsen or persist beyond 7 days",
    medicines: [
      {
        medicine: "Amoxicillin Capsules",
        dosage: "500mg",
        frequency: "Three times daily after meals",
        quantity: "14 capsules",
        instructions: "Take with plenty of water",
      },
      {
        medicine: "Paracetamol Tablets",
        dosage: "500mg",
        frequency: "As needed for fever",
        quantity: "10 tablets",
        instructions: "Take with food",
      },
    ],
  };

  generatePrescriptionPDF(prescriptionData);
}
