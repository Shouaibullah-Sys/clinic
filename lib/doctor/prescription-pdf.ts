import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export interface DoctorPrescriptionPDFPatient {
  name: string;
  patientId?: string;
  gender?: string;
  dateOfBirth?: string;
  phone?: string;
}

export interface DoctorPrescriptionPDFMedication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

export interface DoctorPrescriptionPDFData {
  prescriptionId: string;
  date: string;
  status: string;
  notes?: string;
  patient: DoctorPrescriptionPDFPatient;
  medications: DoctorPrescriptionPDFMedication[];
  doctorName?: string;
}

const calcAge = (dob?: string): string => {
  if (!dob) return "N/A";
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return "N/A";
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }
  return `${age}`;
};

export const generateDoctorPrescriptionPDF = (
  data: DoctorPrescriptionPDFData,
  mode: "print" | "download" = "print",
) => {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "a4",
  });

  const green = [34, 139, 34] as const;
  const lightGreen = [245, 255, 245] as const;
  const dark = [0, 51, 0] as const;

  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFillColor(green[0], green[1], green[2]);
  doc.rect(0, 0, pageWidth, 72, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("PRESCRIPTION", pageWidth / 2, 28, { align: "center" });
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Doctor Prescription Record", pageWidth / 2, 46, { align: "center" });

  let y = 94;

  // Patient box row (similar spirit to your example).
  const boxH = 22;
  const label = (text: string, value: string, x: number, w: number) => {
    doc.setFillColor(lightGreen[0], lightGreen[1], lightGreen[2]);
    doc.setDrawColor(144, 238, 144);
    doc.rect(x, y, w, boxH, "FD");
    doc.setTextColor(dark[0], dark[1], dark[2]);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`${text}: ${value}`, x + 6, y + 14);
  };

  label("Name", data.patient.name || "N/A", 20, 170);
  label("Age", calcAge(data.patient.dateOfBirth), 200, 70);
  label("Sex", data.patient.gender || "N/A", 280, 70);
  label("Date", new Date(data.date).toLocaleDateString(), 360, 110);

  y += 34;
  doc.setTextColor(dark[0], dark[1], dark[2]);
  doc.setFontSize(10);
  doc.text(`Prescription ID: ${data.prescriptionId}`, 20, y);
  doc.text(`Patient ID: ${data.patient.patientId || "N/A"}`, 220, y);
  doc.text(`Status: ${data.status}`, 410, y);
  y += 14;
  doc.text(`Doctor: ${data.doctorName || "N/A"}`, 20, y);
  doc.text(`Phone: ${data.patient.phone || "N/A"}`, 220, y);

  y += 14;
  autoTable(doc, {
    startY: y,
    head: [["#", "Medicine with Dosage", "Frequency", "Duration", "Instructions"]],
    body: data.medications.map((med, idx) => [
      `${idx + 1}`,
      `${med.name} (${med.dosage})`,
      med.frequency || "-",
      med.duration || "-",
      med.instructions || "-",
    ]),
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: {
      fillColor: [34, 139, 34],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    alternateRowStyles: { fillColor: [245, 255, 245] },
    margin: { left: 20, right: 20 },
  });

  const afterTableY = (doc as any).lastAutoTable?.finalY || y + 140;
  if (data.notes) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(dark[0], dark[1], dark[2]);
    doc.setFontSize(10);
    doc.text("Advice:", 20, afterTableY + 22);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const wrapped = doc.splitTextToSize(data.notes, pageWidth - 40);
    doc.text(wrapped, 20, afterTableY + 38);
  }

  const fileName = `Prescription_${data.prescriptionId}.pdf`;
  if (mode === "print") {
    doc.autoPrint();
    doc.output("dataurlnewwindow");
  } else {
    doc.save(fileName);
  }
};

