// components/pharmacy/PDFGenerator.tsx
"use client";
import { Button } from "@/components/ui/button";
import { DownloadIcon } from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// Use the same MedicineStock interface from the report component
interface MedicineStock {
  _id: string;
  name: string;
  batchNumber: string;
  currentQuantity: number;
  originalQuantity: number;
  expiryDate: string;
  supplier: string;
  sellingPrice: number;
  unitPrice: number;
}

// Update the component props to use MedicineStock
interface PDFGeneratorProps {
  data: MedicineStock[];
  title: string;
}

const PDFGenerator = ({ data, title }: PDFGeneratorProps) => {
  const generatePDF = () => {
    if (data.length === 0) return;

    const doc = new jsPDF();
    const date = new Date().toLocaleDateString();

    // Title
    doc.setFontSize(18);
    doc.text(title, 14, 15);

    // Subtitle
    doc.setFontSize(10);
    doc.text(`Report generated on: ${date}`, 14, 22);
    doc.text(`Total items: ${data.length}`, 14, 28);

    // Prepare data for table
    const tableData = data.map((item) => [
      item.name,
      item.batchNumber,
      new Date(item.expiryDate).toLocaleDateString(),
      `${item.currentQuantity}/${item.originalQuantity}`,
      `AFN ${item.unitPrice.toFixed(2)}`,
      `AFN ${item.sellingPrice.toFixed(2)}`,
      item.supplier,
    ]);

    // Create table
    autoTable(doc, {
      head: [
        [
          "Medicine",
          "Batch",
          "Expiry Date",
          "Stock",
          "Unit Price",
          "Selling Price",
          "Supplier",
        ],
      ],
      body: tableData,
      startY: 35,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [59, 130, 246] }, // blue-500
    });

    // Save the PDF
    doc.save(`medicine-stock-report-${date.replace(/\//g, "-")}.pdf`);
  };

  return (
    <Button onClick={generatePDF}>
      <DownloadIcon className="mr-2 h-4 w-4" />
      Export to PDF
    </Button>
  );
};

export default PDFGenerator;
