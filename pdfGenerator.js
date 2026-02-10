// scripts/pdfGenerator.js

// Patient section WITH "Patient Information" title

// Configuration for page layout
const defaultConfig = {
  page: {
    orientation: "portrait",
    unit: "pt",
    format: "a4",
    margins: { top: 40, bottom: 40, left: 40, right: 20 }, // Increased left margin from 20 to 40
  },
  colors: {
    primary: [64, 81, 59], // #40513B – main headers / primary elements
    accent: [54, 70, 50], // slightly darker – accents / highlights
    secondary: [90, 110, 85], // muted green – secondary elements
    textDark: [20, 20, 20], // dark color for all titles / important text
    border: [190, 200, 185], // subtle green-gray border lines
    tableStriped: [235, 240, 235], // very light green-gray – table stripes
    sectionBg: [220, 230, 220], // soft green background for sections
    sectionHeader: [20, 20, 20], // dark text for section headers
    divider: [175, 190, 175], // subtle divider lines
    bgLight: [246, 248, 246], // near-white background with green tint
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
    headerHeight: 130, // Free empty header space
    patientInfoHeight: 35, // Height for patient info with labels
    columnCount: 5, // Total columns on page
    leftColumnWidth: 0.25, // 1/4 width for left column
    rightColumnsWidth: 0.75, // 3/4 width for medication table
    columnGap: 10, // Gap between columns
    tableRowHeight: 25, // Base row height for medicine table
    tableHeaderHeight: 35, // Header height with accent bar
    patientFieldSpacing: {
      idStartPercent: 0.05, // Patient ID starts at 5% of width
      nameStartPercent: 0.05, // Name starts at 5% of width
      sexStartPercent: 0.6, // Sex starts at 60% of width
      ageStartPercent: 0.4, // Age starts at 40% of width
      dateStartPercent: 0.74, // Date starts at 74% of width
    },
    // New properties from comprehensive example
    sectionSpacing: 8,
    blockSpacing: 6,
    lineSpacing: 3,
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
      columnWidths: [20, 150, 65, 55, 90], // Adjusted for A4 width, made Frequency and Instructions wider
      rowHeight: 25, // Increased base row height
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
    show: true,
    showDigitalNote: true,
    height: 30,
  },
};

// Create empty header space without title
function addEmptyHeader(doc, y, pageWidth, prescription, config) {
  // Removed PRESCRIPTION title and underline as requested
  return y + config.layout.headerHeight;
}

// Create patient information WITHOUT title - data with design elements
function addPatientInfo(doc, y, pageWidth, prescription, config) {
  const startX = config.page.margins.left;
  const availableWidth =
    pageWidth - config.page.margins.left - config.page.margins.right;

  // Calculate field positions - Patient ID on top row, other info on second row
  const firstRowY = y + 12; // First row for Patient ID
  const secondRowY = y + config.layout.patientInfoHeight / 2 + 10; // Second row for other info

  const idStartX =
    startX + availableWidth * config.layout.patientFieldSpacing.idStartPercent;
  const nameStartX =
    startX +
    availableWidth * config.layout.patientFieldSpacing.nameStartPercent;
  const sexStartX =
    startX + availableWidth * config.layout.patientFieldSpacing.sexStartPercent;
  const ageStartX =
    startX + availableWidth * config.layout.patientFieldSpacing.ageStartPercent;
  const dateStartX =
    startX +
    availableWidth * config.layout.patientFieldSpacing.dateStartPercent;

  // Get patient data
  const patientAutId = prescription.patientAutId || "";
  const name = prescription.patientName || "N/A";
  const gender = prescription.patientGender || "N/A";
  const age = prescription.patientAge || "N/A";

  // DEBUG: Log age data
  console.log("DEBUG: PDF Generator - patientAge:", prescription.patientAge);
  console.log(
    "DEBUG: PDF Generator - patientAgeUnit:",
    prescription.patientAgeUnit,
  );

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

  const date = formatDate(prescription.date);

  doc.setFont(config.typography.defaultFont, "normal");
  doc.setFontSize(config.typography.fontSizes.body);
  doc.setTextColor(...config.colors.textDark);

  // Draw labels and values - adjusted positions for labels
  const labelOffset = 45; // Space for label before value

  // Draw Patient ID at the top (first row)
  if (patientAutId) {
    doc.setFont(config.typography.defaultFont, "bold");
    doc.setFontSize(config.typography.fontSizes.small);
    doc.setTextColor(...config.colors.primary);
    doc.text("Patient ID:", idStartX, firstRowY);
    doc.setFont(config.typography.defaultFont, "normal");
    doc.setFontSize(config.typography.fontSizes.body);
    doc.text(patientAutId, idStartX + labelOffset, firstRowY);
  }

  // Draw other patient info on second row
  doc.setFont(config.typography.defaultFont, "bold");
  doc.text("Name:", nameStartX, secondRowY);
  doc.setFont(config.typography.defaultFont, "normal");
  doc.text(name, nameStartX + labelOffset, secondRowY);

  doc.setFont(config.typography.defaultFont, "bold");
  doc.text("Age:", ageStartX, secondRowY);
  doc.setFont(config.typography.defaultFont, "normal");

  // Map age unit values to display format
  const ageUnitMap = {
    year: "Years",
    month: "Months",
    day: "Days",
  };

  const ageUnit = prescription.patientAgeUnit || "";
  const ageUnitDisplay = ageUnitMap[ageUnit] || ageUnit;
  const ageWithUnit = ageUnitDisplay ? `${age} ${ageUnitDisplay}` : age;

  // DEBUG: Log final age display
  console.log("DEBUG: Final age display:", ageWithUnit);

  doc.text(ageWithUnit, ageStartX + labelOffset, secondRowY);

  doc.setFont(config.typography.defaultFont, "bold");
  doc.text("Sex:", sexStartX, secondRowY);
  doc.setFont(config.typography.defaultFont, "normal");
  doc.text(gender, sexStartX + labelOffset, secondRowY);

  doc.setFont(config.typography.defaultFont, "bold");
  doc.text("Date:", dateStartX, secondRowY);
  doc.setFont(config.typography.defaultFont, "normal");
  doc.text(date, dateStartX + labelOffset, secondRowY);

  // Draw a subtle divider line below patient info
  doc.setDrawColor(...config.colors.divider);
  doc.setLineWidth(0.3);
  doc.line(
    startX,
    y + config.layout.patientInfoHeight + 2,
    startX + availableWidth,
    y + config.layout.patientInfoHeight + 2,
  );

  // Return Y position for next element
  return y + config.layout.patientInfoHeight + 10;
}

// Keep this function as is - you might still use it elsewhere
function formatVitalSigns(vitalSigns) {
  console.log("DEBUG: formatVitalSigns received:", vitalSigns);

  if (
    !vitalSigns ||
    typeof vitalSigns !== "object" ||
    Object.keys(vitalSigns).length === 0
  ) {
    return "N/A";
  }

  const parts = [];

  // Check each vital sign and only add if it has a value
  if (vitalSigns.heartRate && vitalSigns.heartRate.toString().trim() !== "")
    parts.push(`HR: ${vitalSigns.heartRate} bpm`);

  if (vitalSigns.spo2 && vitalSigns.spo2.toString().trim() !== "")
    parts.push(`SPO₂: ${vitalSigns.spo2}%`);

  if (vitalSigns.weight && vitalSigns.weight.toString().trim() !== "")
    parts.push(`Weight: ${vitalSigns.weight} Kg`);

  // Handle blood pressure - check if it has any content
  if (vitalSigns.bloodPressure) {
    const bp = vitalSigns.bloodPressure.toString().trim();
    // Check if it's not empty and not just "/"
    if (bp !== "" && bp !== "/") {
      parts.push(`BP: ${bp} mmHg`);
    }
  }

  const result = parts.length > 0 ? parts.join(", ") : "N/A";
  console.log("DEBUG: Formatted vital signs:", result);
  return result;
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

// Add vital signs section in right column - all data in ONE LINE inside each box
function addVitalSignsSection(doc, y, x, width, prescription, config) {
  const vitalSigns = prescription.vitalSigns || {};

  console.log("DEBUG: addVitalSignsSection - vitalSigns:", vitalSigns);
  console.log("DEBUG: weight value:", vitalSigns.weight);
  console.log("DEBUG: weight type:", typeof vitalSigns.weight);

  // Draw accent bar for title
  doc.setFillColor(...config.colors.accent);
  doc.rect(x, y, 4, 16, "F");

  // Vital Signs title
  doc.setFont(config.typography.defaultFont, "bold");
  doc.setFontSize(config.typography.fontSizes.subheading);
  doc.setTextColor(...config.colors.primary);
  doc.text("Vital Signs:", x + 10, y + 11);

  // Move to next line for vital sign boxes
  y += 25; // Space after title

  // Box parameters
  const boxHeight = 25; // Reduced height since everything is on one line
  const boxSpacing = 6;

  // Calculate available width for boxes
  const availableWidth = width - 70; // 70px margins on both sides to reduce box width

  // Define custom widths for each vital sign box (SPO₂ gets wider)
  const boxWidths = {
    heartRate: (availableWidth - boxSpacing * 3) / 5, // Smaller
    spo2: (availableWidth - boxSpacing * 3) / 4, // Wider for SPO₂
    weight: (availableWidth - boxSpacing * 3) / 5, // Smaller
    bloodPressure: (availableWidth - boxSpacing * 3) / 5, // Medium width for BP
  };

  // Adjust widths to ensure they all fit within availableWidth
  const totalCustomWidth =
    Object.values(boxWidths).reduce((a, b) => a + b, 0) + boxSpacing * 3;
  const scaleFactor = availableWidth / totalCustomWidth;

  // Scale all widths proportionally
  for (let key in boxWidths) {
    boxWidths[key] *= scaleFactor;
  }

  let currentX = x; // Start at left margin

  // Define vital signs in order with their custom widths
  const vitalSignsList = [
    {
      key: "heartRate",
      label: "HR",
      unit: "bpm",
      displayValue: vitalSigns.heartRate || "",
      boxWidth: boxWidths.heartRate,
    },
    {
      key: "spo2",
      label: "SPO2",
      unit: "",
      displayValue: vitalSigns.spo2 || "",
      boxWidth: boxWidths.spo2, // This box will be wider
    },
    {
      key: "weight",
      label: "Weight",
      unit: "",
      displayValue: vitalSigns.weight || "",
      boxWidth: boxWidths.weight,
    },
    {
      key: "bloodPressure",
      label: "BP",
      unit: "mmHg",
      displayValue: vitalSigns.bloodPressure || "",
      boxWidth: boxWidths.bloodPressure,
    },
  ];

  // Draw each vital sign box
  vitalSignsList.forEach((vital) => {
    const boxWidth = vital.boxWidth;

    // Draw box background with light green
    doc.setFillColor(...config.colors.sectionBg);
    doc.rect(currentX, y, boxWidth, boxHeight, "F");

    // Draw box border
    doc.setDrawColor(...config.colors.border);
    doc.setLineWidth(0.3);
    doc.rect(currentX, y, boxWidth, boxHeight, "S");

    // Calculate center position
    const centerX = currentX + boxWidth / 2;
    const centerY = y + boxHeight / 2 + 3; // +3 for better vertical centering

    // Prepare text for one-line display
    let displayText = "";

    if (vital.displayValue && vital.displayValue.toString().trim() !== "") {
      if (vital.key === "bloodPressure" && vital.displayValue.includes("/")) {
        // For BP, show "BP: 120/80 mmHg"
        displayText = `${vital.label}: ${vital.displayValue} ${vital.unit}`;
      } else if (vital.key === "spo2") {
        // For SPO₂, we have more width so we can show full text
        displayText = `${vital.label}: ${vital.displayValue} ${vital.unit}`;
      } else {
        // For others, show "HR: 72 bpm"
        displayText = `${vital.label}: ${vital.displayValue} ${vital.unit}`;
      }
    } else {
      // If no value, show "HR: N/A"
      displayText = `${vital.label}: N/A`;
    }

    // Draw the complete text on one line
    doc.setFont(config.typography.defaultFont, "bold");

    // Use slightly larger font for SPO₂ since we have more width
    if (vital.key === "spo2") {
      doc.setFontSize(config.typography.fontSizes.small);
    } else {
      doc.setFontSize(config.typography.fontSizes.tiny);
    }

    doc.setTextColor(...config.colors.sectionHeader);

    // Split text if too long (shouldn't happen with SPO₂ since box is wider)
    const maxTextWidth = boxWidth - 10; // Leave 5px padding on each side
    const lines = doc.splitTextToSize(displayText, maxTextWidth);

    if (lines.length === 1) {
      // Single line - center it
      doc.text(displayText, centerX, centerY, { align: "center" });
    } else {
      // Multiple lines - still try to center but show all lines
      const lineHeight = vital.key === "spo2" ? 8 : 7; // Slightly more spacing for SPO₂
      const totalHeight = lines.length * lineHeight;
      const startY = centerY - totalHeight / 2 + lineHeight / 2;

      for (let i = 0; i < lines.length; i++) {
        doc.text(lines[i], centerX, startY + i * lineHeight, {
          align: "center",
        });
      }
    }

    // Move to next box position
    currentX += boxWidth + boxSpacing;
  });

  return y + boxHeight + 15;
}

// Add Laboratory section in right column with boxes (3 per row)
function addLaboratorySection(doc, y, x, width, prescription, config) {
  // Laboratory content
  const laboratory = prescription.laboratory;
  if (!laboratory) {
    return y; // Skip section if no laboratory data
  }

  // Draw accent bar for title
  doc.setFillColor(...config.colors.accent);
  doc.rect(x, y, 4, 16, "F");

  // Laboratory title
  doc.setFont(config.typography.defaultFont, "bold");
  doc.setFontSize(config.typography.fontSizes.subheading);
  doc.setTextColor(...config.colors.primary);
  doc.text("Laboratory:", x + 10, y + 11);

  // Move to next line for laboratory boxes
  y += 20; // Space after title

  // Box parameters
  const boxHeight = 20;
  const boxSpacing = 5; // Increased spacing for better visibility

  // Calculate available width for boxes (with margins on both sides)
  const availableWidth = width - 40; // 20px margins on each side
  const boxWidth = (availableWidth - boxSpacing * 2) / 3; // 3 boxes per row with 2 spacings

  const labItems = laboratory
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item);

  let currentY = y;
  let currentX = x;
  let itemsInCurrentRow = 0;

  // Draw laboratory boxes
  for (let i = 0; i < labItems.length; i++) {
    const item = labItems[i];

    // Draw laboratory box
    drawLaboratoryBox(
      doc,
      currentX,
      currentY,
      boxWidth,
      boxHeight,
      item,
      config,
    );

    itemsInCurrentRow++;
    currentX += boxWidth + boxSpacing;

    // Move to next row after 3 items
    if (itemsInCurrentRow >= 3) {
      itemsInCurrentRow = 0;
      currentX = x;
      currentY += boxHeight + boxSpacing;
    }
  }

  // If there were any items in the current row, move to next line
  if (itemsInCurrentRow > 0) {
    currentY += boxHeight + boxSpacing;
  }

  return currentY + 10;
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
  const chiefComplaints = prescription.chiefComplaints;
  const ccHasContent = chiefComplaints && chiefComplaints.trim() !== "";

  // Calculate height needed for Chief Complaint section
  const ccSectionHeight = 20 + (ccHasContent ? 20 : 0) + 20; // Title + items + spacing

  // Draw left accent bar for Chief Complaint
  doc.setFillColor(...config.colors.accent);
  doc.rect(x, currentY, 4, ccSectionHeight, "F");

  // Chief Complaint title
  doc.setFont(config.typography.defaultFont, "bold");
  doc.setFontSize(config.typography.fontSizes.subheading);
  doc.setTextColor(...config.colors.primary);
  doc.text("Chief Complaint:", x + 10, currentY + 12);
  currentY += 20;

  if (ccHasContent) {
    const ccItems = chiefComplaints
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item);

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
          // Add more spacing between lines for better readability
          const lineSpacing = lineHeight * 1.4;
          doc.text(line, x + 10 + 12, ccItemY + lineIndex * lineSpacing); // Indent to align with text
        }
      });

      // Add more spacing between items for better readability
      const itemSpacing = lines.length * lineHeight * 1.2;
      ccItemY += itemSpacing;
    });
    currentY = ccItemY + 20;
  }

  currentY += 30; // Add extra space before PH Surgery History title

  // PH Surgery History section
  const pastMedicalHistory = prescription.pastMedicalHistory;
  const pmhHasContent = pastMedicalHistory && pastMedicalHistory.trim() !== "";

  // Calculate height needed for PH Surgery History section
  const pmhSectionHeight = 20 + (pmhHasContent ? 20 : 0) + 20;

  // Draw left accent bar for PH surgery history
  doc.setFillColor(...config.colors.accent);
  doc.rect(x, currentY, 4, pmhSectionHeight, "F");

  // PH Surgery History title
  doc.setFont(config.typography.defaultFont, "bold");
  doc.setFontSize(config.typography.fontSizes.subheading);
  doc.setTextColor(...config.colors.primary);
  doc.text("Past/Surgical H/O:", x + 10, currentY + 12);
  currentY += 20;

  if (pmhHasContent) {
    const pmhItems = pastMedicalHistory
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item);

    // PH Surgery History content - wrap long items to next line
    let pmhItemY = currentY;
    pmhItems.forEach((item) => {
      const maxWidth = width - 20;
      const fontSize = config.typography.fontSizes.small;
      const lineHeight = fontSize * 1.2;

      const lines = doc.splitTextToSize(item, maxWidth);

      lines.forEach((line, lineIndex) => {
        if (lineIndex === 0) {
          drawCheckedItem(doc, x + 10, pmhItemY, line, config);
        } else {
          doc.setFont(config.typography.defaultFont, "normal");
          doc.setFontSize(config.typography.fontSizes.small);
          doc.setTextColor(...config.colors.textDark);
          // Add more spacing between lines for better readability
          const lineSpacing = lineHeight * 1.4;
          doc.text(line, x + 10 + 12, pmhItemY + lineIndex * lineSpacing);
        }
      });

      // Add more spacing between items for better readability
      const itemSpacing = lines.length * lineHeight * 1.2;
      pmhItemY += itemSpacing;
    });
    currentY = pmhItemY + 20;
  }

  currentY += 30; // Add extra space before Physical Examination title

  // Physical examination section
  const investigations = prescription.investigations;
  const invHasContent = investigations && investigations.trim() !== "";

  // Calculate height needed for Physical Examination section
  const invSectionHeight = 20 + (invHasContent ? 20 : 0) + 20;

  // Draw left accent bar for physical examination
  doc.setFillColor(...config.colors.accent);
  doc.rect(x, currentY, 4, invSectionHeight, "F");

  // Physical examination title
  doc.setFont(config.typography.defaultFont, "bold");
  doc.setFontSize(config.typography.fontSizes.subheading);
  doc.setTextColor(...config.colors.primary);
  doc.text("Physical Examination:", x + 10, currentY + 12);
  currentY += 20;

  if (invHasContent) {
    const invItems = investigations
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item);

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
          // Add more spacing between lines for better readability
          const lineSpacing = lineHeight * 1.4;
          doc.text(line, x + 10 + 12, invItemY + lineIndex * lineSpacing);
        }
      });

      // Add more spacing between items for better readability
      const itemSpacing = lines.length * lineHeight * 1.2;
      invItemY += itemSpacing;
    });
    currentY = invItemY + 20;
  }

  currentY += 30; // Add extra space before Risk Factor title

  // Risk Factor section
  const riskFactor = prescription.riskFactor;
  const rfHasContent = riskFactor && riskFactor.trim() !== "";

  // Calculate height needed for Risk Factor section
  const rfSectionHeight = 20 + (rfHasContent ? 20 : 0) + 10;

  // Draw left accent bar for risk factor
  doc.setFillColor(...config.colors.accent);
  doc.rect(x, currentY, 4, rfSectionHeight, "F");

  // Risk Factor title
  doc.setFont(config.typography.defaultFont, "bold");
  doc.setFontSize(config.typography.fontSizes.subheading);
  doc.setTextColor(...config.colors.primary);
  doc.text("Risk Factor:", x + 10, currentY + 12);
  currentY += 20;

  if (rfHasContent) {
    const rfItems = riskFactor
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item);

    // Risk Factor content - wrap long items to next line
    let rfItemY = currentY;
    rfItems.forEach((item) => {
      const maxWidth = width - 20;
      const fontSize = config.typography.fontSizes.small;
      const lineHeight = fontSize * 1.2;

      const lines = doc.splitTextToSize(item, maxWidth);

      lines.forEach((line, lineIndex) => {
        if (lineIndex === 0) {
          drawCheckedItem(doc, x + 10, rfItemY, line, config);
        } else {
          doc.setFont(config.typography.defaultFont, "normal");
          doc.setFontSize(config.typography.fontSizes.small);
          doc.setTextColor(...config.colors.textDark);
          const lineSpacing = lineHeight * 1.2;
          doc.text(line, x + 10 + 12, rfItemY + lineIndex * lineSpacing);
        }
      });

      const itemSpacing = lines.length * lineHeight * 1.4;
      rfItemY += itemSpacing;
    });
    currentY = rfItemY + 20;
  }

  // Imaging section
  const radiology = prescription.radiology;
  const radHasContent = radiology && radiology.trim() !== "";

  // Draw section if there's content or just the title
  const radSectionHeight = 20 + (radHasContent ? 20 : 0) + 10;

  // Draw left accent bar for imaging
  doc.setFillColor(...config.colors.accent);
  doc.rect(x, currentY, 4, radSectionHeight, "F");

  // Imaging title
  doc.setFont(config.typography.defaultFont, "bold");
  doc.setFontSize(config.typography.fontSizes.subheading);
  doc.setTextColor(...config.colors.primary);
  doc.text("Imaging:", x + 10, currentY + 12);
  currentY += 20;

  if (radHasContent) {
    const radItems = radiology
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item);

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
          // Add more spacing between lines for better readability
          const lineSpacing = lineHeight * 1.2;
          doc.text(line, x + 10 + 12, radItemY + lineIndex * lineSpacing);
        }
      });

      // Add more spacing between items for better readability
      const itemSpacing = lines.length * lineHeight * 1.4;
      radItemY += itemSpacing;
    });
    currentY = radItemY + 10;
  }

  return currentY;
}

// Add left column with diagnosis and advice below diagnosis
function addLeftColumn(doc, y, x, width, prescription, config) {
  let currentY = y;

  // Vaccination, PH Surgery History, and Investigation section
  currentY = addVaccinationPastMedicalHistoryInvestigationSection(
    doc,
    currentY,
    x,
    width,
    prescription,
    config,
  );

  currentY += 50; // Add spacing before diagnosis

  // Diagnosis section with styling
  const diagnosis = prescription.diagnosis;
  const diagnosisHasContent = diagnosis && diagnosis.trim() !== "";

  // Calculate height based on content
  const diagnosisHeight = 20 + (diagnosisHasContent ? 20 : 0) + 25;

  // Draw left accent bar
  doc.setFillColor(...config.colors.accent);
  doc.rect(x, currentY, 4, diagnosisHeight, "F");

  // Diagnosis title
  doc.setFont(config.typography.defaultFont, "bold");
  doc.setFontSize(config.typography.fontSizes.subheading);
  doc.setTextColor(...config.colors.primary);
  doc.text("Diagnosis:", x + 10, currentY + 12);
  currentY += 20;

  if (diagnosisHasContent) {
    const diagnosisItems = diagnosis
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item);
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
          // Add more spacing between lines for better readability
          const lineSpacing = lineHeight * 1.4;
          doc.text(line, x + 10 + 12, diagItemY + lineIndex * lineSpacing); // Indent to align with text
        }
      });

      // Add more spacing between items for better readability
      const itemSpacing = lines.length * lineHeight * 1.4;
      diagItemY += itemSpacing;
    });
    currentY = diagItemY + 25;
  }

  // Follow Up section
  currentY = addAdviceSection(doc, currentY, x, width, prescription, config);

  return currentY;
}

// Add Follow Up section
function addAdviceSection(doc, y, x, width, prescription, config) {
  const advice = prescription.additionalAdvice;
  const adviceHasContent = advice && advice.trim() !== "" && advice !== "N/A";

  // Calculate height needed for advice section
  const fontSize = config.typography.fontSizes.small;
  const lineHeight = fontSize * 1.3;
  const maxWidth = width - 20;

  // Split advice into lines if there's content
  const adviceLines = adviceHasContent
    ? doc.splitTextToSize(advice, maxWidth)
    : [];
  const adviceHeight =
    20 + (adviceHasContent ? adviceLines.length * lineHeight : 0) + 10;

  // Draw left accent bar
  doc.setFillColor(...config.colors.accent);
  doc.rect(x, y, 4, adviceHeight, "F");

  // Advice title
  doc.setFont(config.typography.defaultFont, "bold");
  doc.setFontSize(config.typography.fontSizes.subheading);
  doc.setTextColor(...config.colors.primary);
  doc.text("Follow Up:", x + 10, y + 12);

  // Draw advice content if available
  if (adviceHasContent) {
    let adviceY = y + 25;
    doc.setFont(config.typography.defaultFont, "normal");
    doc.setFontSize(fontSize);
    doc.setTextColor(...config.colors.textDark);

    adviceLines.forEach((line, index) => {
      doc.text(line, x + 10, adviceY + index * lineHeight);
    });
  }

  return y + adviceHeight + 10;
}

// Calculate row height and split text for each column
function calculateRowData(doc, medication, columnWidths, config, rowNumber) {
  const fontSize = config.typography.fontSizes.body;
  const lineHeight = fontSize * config.typography.lineHeights.normal;
  const cellPadding = 6; // Top and bottom padding for cells
  const columnPaddings = [2, 5, 5, 5, 5]; // Different horizontal padding per column

  // Prepare medicine with dosage text
  const medicineWithDosage =
    medication.medicine && medication.dosage
      ? `${medication.medicine}-${medication.dosage}`
      : medication.medicine || "N/A";

  // Split text for each column
  const columnData = [];
  const columnLines = [];

  // Column 0: Row number
  columnData.push(rowNumber);
  columnLines.push([rowNumber]);

  // Column 1: Medicine with dosage
  const medicineWidth = columnWidths[1] - columnPaddings[1] * 2;
  const medicineTextLines = doc.splitTextToSize(
    medicineWithDosage,
    medicineWidth,
  );
  columnData.push(medicineWithDosage);
  columnLines.push(medicineTextLines);

  // Column 2: Frequency
  const frequencyWidth = columnWidths[2] - columnPaddings[2] * 2;
  const frequencyText = medication.frequency || "N/A";
  const frequencyLines = doc.splitTextToSize(frequencyText, frequencyWidth);
  columnData.push(frequencyText);
  columnLines.push(frequencyLines);

  // Column 3: Quantity
  const quantityWidth = columnWidths[3] - columnPaddings[3] * 2;
  const quantityText = medication.quantity || "N/A";
  const quantityLines = doc.splitTextToSize(quantityText, quantityWidth);
  columnData.push(quantityText);
  columnLines.push(quantityLines);

  // Column 4: Instructions
  const instructionsWidth = columnWidths[4] - columnPaddings[4] * 2;
  const instructionsText = medication.instructions || "N/A";
  const instructionsLines = doc.splitTextToSize(
    instructionsText,
    instructionsWidth,
  );
  columnData.push(instructionsText);
  columnLines.push(instructionsLines);

  // Find maximum lines across all columns
  const maxLines = Math.max(...columnLines.map((lines) => lines.length));

  // Calculate row height based on maximum lines
  const rowHeight = Math.max(
    config.medications.table.rowHeight || 25,
    cellPadding * 2 + maxLines * lineHeight,
  );

  return {
    rowHeight,
    columnData,
    columnLines,
    maxLines,
    lineHeight,
  };
}

// Add medications table with perfect vertical centering
function addMedicationsTable(doc, y, startX, tableWidth, prescription, config) {
  const medications = prescription.medicines || [];

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

  // Remove duplicates
  const uniqueMedications = medications.filter((med, index, self) => {
    const key = `${med.medicine}-${med.dosage}-${med.frequency}-${med.quantity}`;
    return (
      index ===
      self.findIndex(
        (m) => `${m.medicine}-${m.dosage}-${m.frequency}-${m.quantity}` === key,
      )
    );
  });

  // Table configuration
  const tableConfig = {
    headers: config.medications.table.headers,
    columnWidths: config.medications.table.columnWidths,
    startX: tableStartX,
    padding: 4,
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

  // Draw table header with accent bar
  doc.setFillColor(...config.colors.accent);
  doc.rect(tableConfig.startX, y, 4, 16, "F");

  doc.setFont(config.typography.defaultFont, "bold");
  doc.setFontSize(config.typography.fontSizes.heading);
  doc.setTextColor(...config.colors.primary);

  // Title "PRESCRIPTIONS"
  doc.text("PRESCRIPTIONS", tableConfig.startX + 10, y + 11);

  y += 28;

  // Draw column headers
  doc.setFont(config.typography.defaultFont, "bold");
  doc.setFontSize(config.typography.fontSizes.small);
  doc.setTextColor(...config.colors.primary);

  let currentX = tableConfig.startX;
  for (let i = 0; i < tableConfig.headers.length; i++) {
    const header = tableConfig.headers[i];
    const width = tableConfig.columnWidths[i];
    const padding = i === 0 ? 2 : 5;

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

  // Pre-calculate all row data
  const rowDataList = [];
  for (let i = 0; i < uniqueMedications.length; i++) {
    const rowNumber = config.medications.table.showRowNumbers
      ? `${i + 1}.`
      : "";
    const rowData = calculateRowData(
      doc,
      uniqueMedications[i],
      tableConfig.columnWidths,
      config,
      rowNumber,
    );
    rowDataList.push(rowData);
  }

  // Draw medication rows with perfect vertical centering
  const pageHeight = doc.internal.pageSize.getHeight();
  const maxRowsOnFirstPage = config.medications.table.maxRowsOnFirstPage;
  const footerHeight = config.footer.height + 50;

  let rowStartY = y;

  for (let i = 0; i < uniqueMedications.length; i++) {
    const rowData = rowDataList[i];
    const rowHeight = rowData.rowHeight;

    // Check if we need a new page
    if (
      i >= maxRowsOnFirstPage ||
      rowStartY + rowHeight > pageHeight - footerHeight
    ) {
      doc.addPage();
      rowStartY = config.page.margins.top + 50;

      // Redraw headers on new page
      currentX = tableConfig.startX;
      doc.setFont(config.typography.defaultFont, "bold");
      doc.setFontSize(config.typography.fontSizes.small);
      doc.setTextColor(...config.colors.primary);

      for (let j = 0; j < tableConfig.headers.length; j++) {
        const header = tableConfig.headers[j];
        const width = tableConfig.columnWidths[j];
        const padding = j === 0 ? 2 : 5;

        doc.text(header, currentX + padding, rowStartY, {
          maxWidth: width - padding * 2,
        });
        currentX += width;
      }

      rowStartY += 12;
    }

    // Row background (striped rows)
    if (config.medications.table.stripedRows && i % 2 === 0) {
      doc.setFillColor(...config.colors.tableStriped);
      doc.rect(
        tableConfig.startX,
        rowStartY - 5,
        totalTableWidth,
        rowHeight,
        "F",
      );
    }

    // Draw row border
    doc.setDrawColor(...config.colors.border);
    doc.setLineWidth(0.2);
    doc.rect(
      tableConfig.startX,
      rowStartY - 5,
      totalTableWidth,
      rowHeight,
      "S",
    );

    // Draw row data with perfect vertical centering
    currentX = tableConfig.startX;
    doc.setFont(config.typography.defaultFont, "normal");
    doc.setFontSize(config.typography.fontSizes.body);
    doc.setTextColor(...config.colors.textDark);

    const columnPaddings = [2, 5, 5, 5, 5];
    const lineHeight = rowData.lineHeight;

    for (let j = 0; j < rowData.columnLines.length; j++) {
      const lines = rowData.columnLines[j];
      const cellWidth = tableConfig.columnWidths[j];
      const padding = columnPaddings[j];

      // Calculate vertical position for this cell
      const cellTop = rowStartY - 5;
      const cellHeight = rowHeight;
      const totalTextHeight = lines.length * lineHeight;
      const textStartY =
        cellTop + (cellHeight - totalTextHeight) / 2 + lineHeight * 0.8;

      // Draw each line
      for (let k = 0; k < lines.length; k++) {
        const lineY = textStartY + k * lineHeight;
        doc.text(lines[k], currentX + padding, lineY);
      }

      currentX += cellWidth;
    }

    rowStartY += rowHeight + 2; // Small gap between rows
  }

  return rowStartY + 10;
}

// Add signature section
function addSignatureSection(doc, y, pageWidth, prescription, config) {
  if (!config.signature.show) return y;

  const rightSectionX = pageWidth - config.page.margins.right - 200;

  // Calculate signature position - near bottom but above footer
  const pageHeight = doc.internal.pageSize.getHeight();
  const signatureY = pageHeight - config.page.margins.bottom - 50;

  // Signature line with green color
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
    signatureY + 15 - 30,
    { align: "center" },
  );

  // Title
  if (config.signature.includeTitle) {
    doc.setFont(config.typography.defaultFont, "normal");
    doc.setFontSize(config.typography.fontSizes.small);
    doc.setTextColor(...config.colors.textDark);
    doc.text(
      "Consultant Interventional Cardiologist",
      rightSectionX + config.signature.lineLength / 2,
      signatureY + 25 - 30,
      { align: "center" },
    );
  }

  return y;
}

// Add footer
function addFooter(doc, pageWidth, pageHeight, config) {
  if (!config.footer.show) return;

  const footerY = pageHeight - config.footer.height;

  if (config.footer.showDigitalNote) {
    doc.setFontSize(config.typography.fontSizes.tiny);
    doc.setTextColor(...config.colors.textDark);
  }
}

// Main PDF generation function
async function generatePrescriptionPDF(prescription, userConfig = {}) {
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
      patientFieldSpacing: {
        ...defaultConfig.layout.patientFieldSpacing,
        ...userConfig?.layout?.patientFieldSpacing,
      },
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

  // Load jsPDF
  const { jsPDF } = window.jspdf;
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

  // STEP 2: Add patient information
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

  // STEP 4.5: Add vital signs in right column above prescriptions
  let rightY = addVitalSignsSection(
    doc,
    y + 10,
    rightColumnX,
    rightColumnWidth,
    prescription,
    config,
  );

  // STEP 4.6: Add Laboratory section in right column below vital signs
  rightY = addLaboratorySection(
    doc,
    rightY,
    rightColumnX,
    rightColumnWidth,
    prescription,
    config,
  );

  // STEP 5: Add medications table in right column
  rightY = addMedicationsTable(
    doc,
    rightY + 10,
    rightColumnX,
    rightColumnWidth,
    prescription,
    config,
  );

  // Use the maximum Y position for next sections
  y = Math.max(leftY, rightY);

  // STEP 7: Add signature section
  addSignatureSection(doc, y, pageWidth, prescription, config);

  // STEP 8: Add footer
  addFooter(doc, pageWidth, pageHeight, config);

  // Generate filename and save
  const patientName = prescription.patientName || "patient";
  const safeName = patientName.toLowerCase().replace(/[^a-z0-9]/g, "-");
  const dateStr = prescription.date
    ? new Date(prescription.date).toISOString().split("T")[0]
    : new Date().toISOString().split("T")[0];
  const fileName = `prescription-${safeName}-${dateStr}.pdf`;
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

function adjustPatientFieldPositions(
  namePercent,
  sexPercent,
  agePercent,
  datePercent,
) {
  defaultConfig.layout.patientFieldSpacing.nameStartPercent = namePercent;
  defaultConfig.layout.patientFieldSpacing.sexStartPercent = sexPercent;
  defaultConfig.layout.patientFieldSpacing.ageStartPercent = agePercent;
  defaultConfig.layout.patientFieldSpacing.dateStartPercent = datePercent;
  console.log(
    `Patient field positions adjusted: Name=${namePercent * 100}%, Sex=${sexPercent * 100}%, Age=${agePercent * 100}%, Date=${datePercent * 100}%`,
  );
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

// Export for global use
window.PDFGenerator = {
  generatePrescriptionPDF,
  downloadPrescriptionPDF: generatePrescriptionPDF,

  // Configuration functions for dynamic adjustments
  adjustHeaderSize,
  adjustPatientInfoHeight,
  adjustPatientFieldPositions,
  adjustTableRowHeight,
  adjustColumnWidths,
  adjustMedicationColumnWidths,

  // Current configuration
  getConfig: () => ({ ...defaultConfig }),

  // Reset to default configuration
  resetConfig: () => {
    defaultConfig.layout.headerHeight = 160;
    defaultConfig.layout.patientInfoHeight = 35;
    defaultConfig.layout.leftColumnWidth = 0.25;
    defaultConfig.layout.rightColumnsWidth = 0.75;
    defaultConfig.layout.patientFieldSpacing.nameStartPercent = 0.1;
    defaultConfig.layout.patientFieldSpacing.ageStartPercent = 0.55;
    defaultConfig.layout.patientFieldSpacing.sexStartPercent = 0.65;
    defaultConfig.layout.patientFieldSpacing.dateStartPercent = 0.9;
    defaultConfig.medications.table.columnWidths = [20, 130, 55, 55, 110];
    defaultConfig.medications.table.rowHeight = 25;
    console.log("Configuration reset to defaults");
  },
};

// Make it available globally
window.downloadPrescriptionPDF = generatePrescriptionPDF;

// Example usage with very long medicine names for testing
function downloadExamplePDF() {
  const prescriptionData = {
    patientName: "John Michael Doe",
    patientGender: "Male",
    patientAge: "35",
    date: new Date().toISOString(),
    doctorName: "Dr. Sarah Johnson",
    diagnosis: "Upper respiratory tract infection with fever",
    laboratory:
      "CBC,LFT,KFT,TFT,Lipid Profile,Urine R/M,Blood Sugar Fasting,Blood Sugar PP,HbA1c,ESR,CRP",
    additionalAdvice:
      "Rest adequately, drink plenty of fluids, avoid smoking and alcohol. Return if symptoms worsen or persist beyond 7 days.",
    medicines: [
      {
        medicine: "Amoxicillin Cap",
        dosage: "500mg",
        frequency: "Three times daily after meals",
        quantity: "10 capsules",
        instructions: "Take with plenty of water",
      },
      {
        medicine:
          "Amoxicillin Cap:AmoxicillinCap: Amoxicillin Cap:Amoxicillin Cap: AmoxicillinCap: AmoxicillinCap:Amoxicillin",
        dosage: "500mg",
        frequency: "Twice daily",
        quantity: "20 tablets",
        instructions: "Take with food, complete full course",
      },
      {
        medicine:
          "Paracetamol (Acetaminophen) Extended Release Tablets with additional pain relief properties",
        dosage: "650mg",
        frequency: "Every 6-8 hours as needed for pain or fever",
        quantity: "30 tablets",
        instructions:
          "Do not exceed 4 tablets in 24 hours, take with food if stomach upset occurs, avoid alcohol while taking this medication",
      },
    ],
  };

  generatePrescriptionPDF(prescriptionData);
}
