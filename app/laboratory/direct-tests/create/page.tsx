// app/laboratory/direct-tests/create/page.tsx

"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Search,
  User,
  TestTube,
  Clock,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Plus,
  Trash2,
  X,
  Sparkles,
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { toast } from "sonner";

interface Patient {
  _id: string;
  name: string;
  patientId: string;
  phone?: string;
  guardian?: string;
  refPerson?: string;
  passTskNo?: string;
  registrationNo?: string;
  address?: string;
  gender?: string;
  dateOfBirth?: string;
  doctorName?: string;
}

interface SampleParameter {
  id: string;
  name: string;
  unit: string;
  normalRange: string;
  result: string;
}

interface TestParameter {
  id: string;
  name: string;
  value: string;
  unit: string;
  normalRange: string;
  remarks: string;
}

interface LabTest {
  id: string;
  name: string;
  price: number;
  testCode?: string;
  category?: string;
  description?: string;
  specimenType?: string;
  parameters: SampleParameter[];
}

interface LabTestCategory {
  name: string;
  tests: LabTest[];
}

interface LabTestTemplate {
  _id: string;
  testCode?: string;
  testName: string;
  category: string;
  description?: string;
  basePrice: number;
  specimenType?: string[];
  parameters?: Array<{
    parameterName?: string;
    name?: string;
    unit?: string;
    normalRange?: string;
  }>;
}

// Comprehensive lab tests data structure with all categories (same as collect page)
const labTests: LabTestCategory[] = [
  {
    name: "Clinical Chemistry",
    tests: [
      {
        id: "cc1",
        name: "Blood Glucose (Fasting)",
        price: 300,
        parameters: [
          {
            id: "1",
            name: "Glucose",
            unit: "mg/dL",
            normalRange: "70-100",
            result: "",
          },
        ],
      },
      {
        id: "cc2",
        name: "Blood Glucose (Random)",
        price: 250,
        parameters: [
          {
            id: "1",
            name: "Glucose",
            unit: "mg/dL",
            normalRange: "70-140",
            result: "",
          },
        ],
      },
      {
        id: "cc3",
        name: "Blood Glucose (PP)",
        price: 300,
        parameters: [
          {
            id: "1",
            name: "Glucose",
            unit: "mg/dL",
            normalRange: "<140",
            result: "",
          },
        ],
      },
      {
        id: "cc4",
        name: "HbA1c",
        price: 500,
        parameters: [
          {
            id: "1",
            name: "HbA1c",
            unit: "%",
            normalRange: "4.0-6.0",
            result: "",
          },
        ],
      },
      {
        id: "cc5",
        name: "Lipid Profile",
        price: 800,
        parameters: [
          {
            id: "1",
            name: "Total Cholesterol",
            unit: "mg/dL",
            normalRange: "<200",
            result: "",
          },
          {
            id: "2",
            name: "HDL Cholesterol",
            unit: "mg/dL",
            normalRange: "40-60",
            result: "",
          },
          {
            id: "3",
            name: "LDL Cholesterol",
            unit: "mg/dL",
            normalRange: "<100",
            result: "",
          },
          {
            id: "4",
            name: "Triglycerides",
            unit: "mg/dL",
            normalRange: "<150",
            result: "",
          },
          {
            id: "5",
            name: "VLDL Cholesterol",
            unit: "mg/dL",
            normalRange: "5-40",
            result: "",
          },
        ],
      },
      {
        id: "cc6",
        name: "Liver Function Test (LFT)",
        price: 1200,
        parameters: [
          {
            id: "1",
            name: "Total Bilirubin",
            unit: "mg/dL",
            normalRange: "0.3-1.2",
            result: "",
          },
          {
            id: "2",
            name: "Direct Bilirubin",
            unit: "mg/dL",
            normalRange: "0.0-0.3",
            result: "",
          },
          {
            id: "3",
            name: "Indirect Bilirubin",
            unit: "mg/dL",
            normalRange: "0.2-0.8",
            result: "",
          },
          {
            id: "4",
            name: "SGOT/AST",
            unit: "U/L",
            normalRange: "10-40",
            result: "",
          },
          {
            id: "5",
            name: "SGPT/ALT",
            unit: "U/L",
            normalRange: "7-56",
            result: "",
          },
          {
            id: "6",
            name: "Alkaline Phosphatase",
            unit: "U/L",
            normalRange: "40-129",
            result: "",
          },
          {
            id: "7",
            name: "GGT",
            unit: "U/L",
            normalRange: "8-61",
            result: "",
          },
          {
            id: "8",
            name: "Total Protein",
            unit: "g/dL",
            normalRange: "6.0-8.3",
            result: "",
          },
          {
            id: "9",
            name: "Albumin",
            unit: "g/dL",
            normalRange: "3.5-5.0",
            result: "",
          },
          {
            id: "10",
            name: "Globulin",
            unit: "g/dL",
            normalRange: "2.0-3.5",
            result: "",
          },
        ],
      },
      {
        id: "cc7",
        name: "Kidney Function Test (KFT)",
        price: 1000,
        parameters: [
          {
            id: "1",
            name: "Blood Urea",
            unit: "mg/dL",
            normalRange: "10-50",
            result: "",
          },
          {
            id: "2",
            name: "Serum Creatinine",
            unit: "mg/dL",
            normalRange: "0.6-1.2",
            result: "",
          },
          {
            id: "3",
            name: "Uric Acid",
            unit: "mg/dL",
            normalRange: "3.4-7.0",
            result: "",
          },
          {
            id: "4",
            name: "Sodium",
            unit: "mmol/L",
            normalRange: "136-145",
            result: "",
          },
          {
            id: "5",
            name: "Potassium",
            unit: "mmol/L",
            normalRange: "3.5-5.1",
            result: "",
          },
          {
            id: "6",
            name: "Chloride",
            unit: "mmol/L",
            normalRange: "98-107",
            result: "",
          },
          {
            id: "7",
            name: "Calcium",
            unit: "mg/dL",
            normalRange: "8.5-10.5",
            result: "",
          },
          {
            id: "8",
            name: "Phosphorus",
            unit: "mg/dL",
            normalRange: "2.5-4.5",
            result: "",
          },
        ],
      },
      {
        id: "cc8",
        name: "Electrolytes",
        price: 600,
        parameters: [
          {
            id: "1",
            name: "Sodium",
            unit: "mmol/L",
            normalRange: "136-145",
            result: "",
          },
          {
            id: "2",
            name: "Potassium",
            unit: "mmol/L",
            normalRange: "3.5-5.1",
            result: "",
          },
          {
            id: "3",
            name: "Chloride",
            unit: "mmol/L",
            normalRange: "98-107",
            result: "",
          },
          {
            id: "4",
            name: "Bicarbonate",
            unit: "mmol/L",
            normalRange: "22-29",
            result: "",
          },
        ],
      },
    ],
  },
  {
    name: "Clinical Pathology",
    tests: [
      {
        id: "cp1",
        name: "Urine Routine Examination",
        price: 400,
        parameters: [
          {
            id: "1",
            name: "Color",
            unit: "",
            normalRange: "Pale Yellow",
            result: "",
          },
          {
            id: "2",
            name: "Appearance",
            unit: "",
            normalRange: "Clear",
            result: "",
          },
          { id: "3", name: "pH", unit: "", normalRange: "4.5-8.0", result: "" },
          {
            id: "4",
            name: "Specific Gravity",
            unit: "",
            normalRange: "1.003-1.035",
            result: "",
          },
          {
            id: "5",
            name: "Protein",
            unit: "",
            normalRange: "Negative",
            result: "",
          },
          {
            id: "6",
            name: "Glucose",
            unit: "",
            normalRange: "Negative",
            result: "",
          },
          {
            id: "7",
            name: "Ketones",
            unit: "",
            normalRange: "Negative",
            result: "",
          },
          {
            id: "8",
            name: "Blood",
            unit: "",
            normalRange: "Negative",
            result: "",
          },
          {
            id: "9",
            name: "Bilirubin",
            unit: "",
            normalRange: "Negative",
            result: "",
          },
          {
            id: "10",
            name: "Urobilinogen",
            unit: "",
            normalRange: "0.1-1.0",
            result: "",
          },
          {
            id: "11",
            name: "Nitrite",
            unit: "",
            normalRange: "Negative",
            result: "",
          },
          {
            id: "12",
            name: "Leucocytes",
            unit: "",
            normalRange: "Negative",
            result: "",
          },
          {
            id: "13",
            name: "Pus Cells",
            unit: "/HPF",
            normalRange: "0-2",
            result: "",
          },
          {
            id: "14",
            name: "RBCs",
            unit: "/HPF",
            normalRange: "0-1",
            result: "",
          },
          {
            id: "15",
            name: "Epithelial Cells",
            unit: "/HPF",
            normalRange: "0-2",
            result: "",
          },
          {
            id: "16",
            name: "Casts",
            unit: "/LPF",
            normalRange: "0-1",
            result: "",
          },
          {
            id: "17",
            name: "Crystals",
            unit: "",
            normalRange: "None",
            result: "",
          },
          {
            id: "18",
            name: "Bacteria",
            unit: "",
            normalRange: "None",
            result: "",
          },
        ],
      },
      {
        id: "cp2",
        name: "Stool Examination",
        price: 350,
        parameters: [
          {
            id: "1",
            name: "Color",
            unit: "",
            normalRange: "Brown",
            result: "",
          },
          {
            id: "2",
            name: "Consistency",
            unit: "",
            normalRange: "Formed",
            result: "",
          },
          {
            id: "3",
            name: "Mucus",
            unit: "",
            normalRange: "Absent",
            result: "",
          },
          {
            id: "4",
            name: "Blood",
            unit: "",
            normalRange: "Absent",
            result: "",
          },
          {
            id: "5",
            name: "Ova/Cysts",
            unit: "",
            normalRange: "Absent",
            result: "",
          },
          {
            id: "6",
            name: "Occult Blood",
            unit: "",
            normalRange: "Negative",
            result: "",
          },
          { id: "7", name: "pH", unit: "", normalRange: "6.5-7.5", result: "" },
        ],
      },
      {
        id: "cp3",
        name: "Semen Analysis",
        price: 800,
        parameters: [
          {
            id: "1",
            name: "Volume",
            unit: "ml",
            normalRange: "1.5-5.0",
            result: "",
          },
          {
            id: "2",
            name: "Color",
            unit: "",
            normalRange: "White/Grey",
            result: "",
          },
          { id: "3", name: "pH", unit: "", normalRange: "7.2-8.0", result: "" },
          {
            id: "4",
            name: "Liquefaction Time",
            unit: "min",
            normalRange: "<60",
            result: "",
          },
          {
            id: "5",
            name: "Sperm Count",
            unit: "million/ml",
            normalRange: "15-200",
            result: "",
          },
          {
            id: "6",
            name: "Motility (Progressive)",
            unit: "%",
            normalRange: ">32",
            result: "",
          },
          {
            id: "7",
            name: "Motility (Total)",
            unit: "%",
            normalRange: ">40",
            result: "",
          },
          {
            id: "8",
            name: "Morphology",
            unit: "%",
            normalRange: ">4",
            result: "",
          },
          {
            id: "9",
            name: "Pus Cells",
            unit: "/HPF",
            normalRange: "<5",
            result: "",
          },
          {
            id: "10",
            name: "RBCs",
            unit: "/HPF",
            normalRange: "<2",
            result: "",
          },
        ],
      },
    ],
  },
  {
    name: "Hematology",
    tests: [
      {
        id: "h1",
        name: "Complete Blood Count (CBC)",
        price: 500,
        parameters: [
          {
            id: "1",
            name: "Hemoglobin",
            unit: "g/dL",
            normalRange: "12-16",
            result: "",
          },
          {
            id: "2",
            name: "RBC Count",
            unit: "million/cmm",
            normalRange: "4.0-5.5",
            result: "",
          },
          {
            id: "3",
            name: "PCV/Hematocrit",
            unit: "%",
            normalRange: "36-48",
            result: "",
          },
          {
            id: "4",
            name: "MCV",
            unit: "fL",
            normalRange: "80-100",
            result: "",
          },
          {
            id: "5",
            name: "MCH",
            unit: "pg",
            normalRange: "27-32",
            result: "",
          },
          {
            id: "6",
            name: "MCHC",
            unit: "g/dL",
            normalRange: "32-36",
            result: "",
          },
          {
            id: "7",
            name: "RDW",
            unit: "%",
            normalRange: "11.5-14.5",
            result: "",
          },
          {
            id: "8",
            name: "Total WBC Count",
            unit: "/cmm",
            normalRange: "4000-11000",
            result: "",
          },
          {
            id: "9",
            name: "Neutrophils",
            unit: "%",
            normalRange: "40-75",
            result: "",
          },
          {
            id: "10",
            name: "Lymphocytes",
            unit: "%",
            normalRange: "20-45",
            result: "",
          },
          {
            id: "11",
            name: "Monocytes",
            unit: "%",
            normalRange: "2-10",
            result: "",
          },
          {
            id: "12",
            name: "Eosinophils",
            unit: "%",
            normalRange: "0-6",
            result: "",
          },
          {
            id: "13",
            name: "Basophils",
            unit: "%",
            normalRange: "0-1",
            result: "",
          },
          {
            id: "14",
            name: "Platelet Count",
            unit: "/cmm",
            normalRange: "150000-400000",
            result: "",
          },
          {
            id: "15",
            name: "MPV",
            unit: "fL",
            normalRange: "7.5-11.5",
            result: "",
          },
        ],
      },
      {
        id: "h2",
        name: "ESR",
        price: 200,
        parameters: [
          {
            id: "1",
            name: "ESR (Westergren)",
            unit: "mm/hr",
            normalRange: "0-15",
            result: "",
          },
        ],
      },
      {
        id: "h3",
        name: "Peripheral Blood Smear",
        price: 300,
        parameters: [
          {
            id: "1",
            name: "RBC Morphology",
            unit: "",
            normalRange: "Normocytic Normochromic",
            result: "",
          },
          {
            id: "2",
            name: "WBC Morphology",
            unit: "",
            normalRange: "Normal",
            result: "",
          },
          {
            id: "3",
            name: "Platelet Morphology",
            unit: "",
            normalRange: "Normal",
            result: "",
          },
          {
            id: "4",
            name: "Malaria Parasite",
            unit: "",
            normalRange: "Not Seen",
            result: "",
          },
          {
            id: "5",
            name: "Microfilaria",
            unit: "",
            normalRange: "Not Seen",
            result: "",
          },
        ],
      },
      {
        id: "h4",
        name: "Reticulocyte Count",
        price: 250,
        parameters: [
          {
            id: "1",
            name: "Reticulocyte Count",
            unit: "%",
            normalRange: "0.5-2.5",
            result: "",
          },
        ],
      },
    ],
  },
  {
    name: "ICT/ELISA/Rapid Tests",
    tests: [
      {
        id: "ict1",
        name: "HIV (1&2) Antibody",
        price: 400,
        parameters: [
          {
            id: "1",
            name: "HIV 1&2 Antibody",
            unit: "",
            normalRange: "Non-Reactive",
            result: "",
          },
        ],
      },
      {
        id: "ict2",
        name: "HBsAg",
        price: 350,
        parameters: [
          {
            id: "1",
            name: "HBsAg",
            unit: "",
            normalRange: "Negative",
            result: "",
          },
        ],
      },
      {
        id: "ict3",
        name: "Anti-HCV",
        price: 400,
        parameters: [
          {
            id: "1",
            name: "Anti-HCV",
            unit: "",
            normalRange: "Negative",
            result: "",
          },
        ],
      },
      {
        id: "ict4",
        name: "VDRL/RPR",
        price: 300,
        parameters: [
          {
            id: "1",
            name: "VDRL/RPR",
            unit: "",
            normalRange: "Non-Reactive",
            result: "",
          },
        ],
      },
      {
        id: "ict5",
        name: "Widal Test",
        price: 250,
        parameters: [
          {
            id: "1",
            name: "TO Antigen",
            unit: "",
            normalRange: "<1:80",
            result: "",
          },
          {
            id: "2",
            name: "TH Antigen",
            unit: "",
            normalRange: "<1:80",
            result: "",
          },
          {
            id: "3",
            name: "AO Antigen",
            unit: "",
            normalRange: "<1:80",
            result: "",
          },
          {
            id: "4",
            name: "AH Antigen",
            unit: "",
            normalRange: "<1:80",
            result: "",
          },
          {
            id: "5",
            name: "BO Antigen",
            unit: "",
            normalRange: "<1:80",
            result: "",
          },
          {
            id: "6",
            name: "BH Antigen",
            unit: "",
            normalRange: "<1:80",
            result: "",
          },
        ],
      },
      {
        id: "ict6",
        name: "Typhoid IgM/IgG",
        price: 400,
        parameters: [
          {
            id: "1",
            name: "Typhoid IgM",
            unit: "",
            normalRange: "Negative",
            result: "",
          },
          {
            id: "2",
            name: "Typhoid IgG",
            unit: "",
            normalRange: "Negative",
            result: "",
          },
        ],
      },
      {
        id: "ict7",
        name: "Dengue NS1 Antigen",
        price: 500,
        parameters: [
          {
            id: "1",
            name: "Dengue NS1 Antigen",
            unit: "",
            normalRange: "Negative",
            result: "",
          },
        ],
      },
      {
        id: "ict8",
        name: "Dengue IgM/IgG",
        price: 500,
        parameters: [
          {
            id: "1",
            name: "Dengue IgM",
            unit: "",
            normalRange: "Negative",
            result: "",
          },
          {
            id: "2",
            name: "Dengue IgG",
            unit: "",
            normalRange: "Negative",
            result: "",
          },
        ],
      },
      {
        id: "ict9",
        name: "Chikungunya IgM",
        price: 450,
        parameters: [
          {
            id: "1",
            name: "Chikungunya IgM",
            unit: "",
            normalRange: "Negative",
            result: "",
          },
        ],
      },
      {
        id: "ict10",
        name: "Leptospira IgM",
        price: 500,
        parameters: [
          {
            id: "1",
            name: "Leptospira IgM",
            unit: "",
            normalRange: "Negative",
            result: "",
          },
        ],
      },
      {
        id: "ict11",
        name: "Malaria Antigen",
        price: 300,
        parameters: [
          {
            id: "1",
            name: "P. falciparum",
            unit: "",
            normalRange: "Negative",
            result: "",
          },
          {
            id: "2",
            name: "P. vivax",
            unit: "",
            normalRange: "Negative",
            result: "",
          },
        ],
      },
      {
        id: "ict12",
        name: "H. pylori Antigen",
        price: 400,
        parameters: [
          {
            id: "1",
            name: "H. pylori Antigen",
            unit: "",
            normalRange: "Negative",
            result: "",
          },
        ],
      },
    ],
  },
  {
    name: "Molecular Biology",
    tests: [
      {
        id: "mb1",
        name: "COVID-19 RT-PCR",
        price: 1500,
        parameters: [
          {
            id: "1",
            name: "SARS-CoV-2 RNA",
            unit: "",
            normalRange: "Not Detected",
            result: "",
          },
          {
            id: "2",
            name: "Ct Value (ORF1ab)",
            unit: "",
            normalRange: ">35",
            result: "",
          },
          {
            id: "3",
            name: "Ct Value (N Gene)",
            unit: "",
            normalRange: ">35",
            result: "",
          },
        ],
      },
      {
        id: "mb2",
        name: "Hepatitis B DNA PCR",
        price: 2500,
        parameters: [
          {
            id: "1",
            name: "HBV DNA",
            unit: "IU/mL",
            normalRange: "<20",
            result: "",
          },
        ],
      },
      {
        id: "mb3",
        name: "Hepatitis C RNA PCR",
        price: 2500,
        parameters: [
          {
            id: "1",
            name: "HCV RNA",
            unit: "IU/mL",
            normalRange: "<15",
            result: "",
          },
        ],
      },
      {
        id: "mb4",
        name: "HIV RNA PCR (Viral Load)",
        price: 3000,
        parameters: [
          {
            id: "1",
            name: "HIV RNA",
            unit: "copies/mL",
            normalRange: "<50",
            result: "",
          },
        ],
      },
      {
        id: "mb5",
        name: "TB PCR (GeneXpert)",
        price: 2000,
        parameters: [
          {
            id: "1",
            name: "Mycobacterium tuberculosis",
            unit: "",
            normalRange: "Not Detected",
            result: "",
          },
          {
            id: "2",
            name: "Rifampicin Resistance",
            unit: "",
            normalRange: "Not Detected",
            result: "",
          },
        ],
      },
      {
        id: "mb6",
        name: "HPV DNA PCR",
        price: 2000,
        parameters: [
          {
            id: "1",
            name: "High Risk HPV",
            unit: "",
            normalRange: "Negative",
            result: "",
          },
          {
            id: "2",
            name: "HPV 16/18",
            unit: "",
            normalRange: "Negative",
            result: "",
          },
        ],
      },
    ],
  },
  {
    name: "Immunology & Tumor Markers",
    tests: [
      {
        id: "it1",
        name: "Thyroid Profile (T3, T4, TSH)",
        price: 800,
        parameters: [
          {
            id: "1",
            name: "T3 (Total)",
            unit: "ng/dL",
            normalRange: "80-200",
            result: "",
          },
          {
            id: "2",
            name: "T4 (Total)",
            unit: "µg/dL",
            normalRange: "4.5-12.5",
            result: "",
          },
          {
            id: "3",
            name: "TSH",
            unit: "µIU/mL",
            normalRange: "0.4-4.0",
            result: "",
          },
        ],
      },
      {
        id: "it2",
        name: "Free T3 & Free T4",
        price: 600,
        parameters: [
          {
            id: "1",
            name: "Free T3",
            unit: "pg/mL",
            normalRange: "2.0-4.4",
            result: "",
          },
          {
            id: "2",
            name: "Free T4",
            unit: "ng/dL",
            normalRange: "0.8-1.8",
            result: "",
          },
        ],
      },
      {
        id: "it3",
        name: "Insulin (Fasting)",
        price: 500,
        parameters: [
          {
            id: "1",
            name: "Insulin",
            unit: "µIU/mL",
            normalRange: "2.6-24.9",
            result: "",
          },
        ],
      },
      {
        id: "it4",
        name: "C-Peptide",
        price: 600,
        parameters: [
          {
            id: "1",
            name: "C-Peptide",
            unit: "ng/mL",
            normalRange: "0.5-2.0",
            result: "",
          },
        ],
      },
      {
        id: "it5",
        name: "Cortisol",
        price: 700,
        parameters: [
          {
            id: "1",
            name: "Cortisol (Morning)",
            unit: "µg/dL",
            normalRange: "6-23",
            result: "",
          },
        ],
      },
      {
        id: "it6",
        name: "Testosterone",
        price: 800,
        parameters: [
          {
            id: "1",
            name: "Testosterone (Male)",
            unit: "ng/mL",
            normalRange: "2.7-10.7",
            result: "",
          },
          {
            id: "2",
            name: "Testosterone (Female)",
            unit: "ng/mL",
            normalRange: "0.1-0.8",
            result: "",
          },
        ],
      },
      {
        id: "it7",
        name: "FSH",
        price: 500,
        parameters: [
          {
            id: "1",
            name: "FSH (Male)",
            unit: "mIU/mL",
            normalRange: "1.5-12.4",
            result: "",
          },
          {
            id: "2",
            name: "FSH (Female - Follicular)",
            unit: "mIU/mL",
            normalRange: "3.5-12.5",
            result: "",
          },
          {
            id: "3",
            name: "FSH (Female - Midcycle)",
            unit: "mIU/mL",
            normalRange: "4.7-21.5",
            result: "",
          },
          {
            id: "4",
            name: "FSH (Female - Luteal)",
            unit: "mIU/mL",
            normalRange: "1.7-7.7",
            result: "",
          },
        ],
      },
      {
        id: "it8",
        name: "LH",
        price: 500,
        parameters: [
          {
            id: "1",
            name: "LH (Male)",
            unit: "mIU/mL",
            normalRange: "1.7-8.6",
            result: "",
          },
          {
            id: "2",
            name: "LH (Female - Follicular)",
            unit: "mIU/mL",
            normalRange: "2.4-12.6",
            result: "",
          },
          {
            id: "3",
            name: "LH (Female - Midcycle)",
            unit: "mIU/mL",
            normalRange: "14.0-95.6",
            result: "",
          },
          {
            id: "4",
            name: "LH (Female - Luteal)",
            unit: "mIU/mL",
            normalRange: "1.0-11.4",
            result: "",
          },
        ],
      },
      {
        id: "it9",
        name: "Prolactin",
        price: 500,
        parameters: [
          {
            id: "1",
            name: "Prolactin (Male)",
            unit: "ng/mL",
            normalRange: "2.0-18.0",
            result: "",
          },
          {
            id: "2",
            name: "Prolactin (Female)",
            unit: "ng/mL",
            normalRange: "2.0-29.0",
            result: "",
          },
        ],
      },
      {
        id: "it10",
        name: "CEA (Carcinoembryonic Antigen)",
        price: 1000,
        parameters: [
          {
            id: "1",
            name: "CEA",
            unit: "ng/mL",
            normalRange: "<3.0",
            result: "",
          },
        ],
      },
      {
        id: "it11",
        name: "CA-125",
        price: 1000,
        parameters: [
          {
            id: "1",
            name: "CA-125",
            unit: "U/mL",
            normalRange: "<35",
            result: "",
          },
        ],
      },
      {
        id: "it12",
        name: "CA-19.9",
        price: 1000,
        parameters: [
          {
            id: "1",
            name: "CA-19.9",
            unit: "U/mL",
            normalRange: "<37",
            result: "",
          },
        ],
      },
      {
        id: "it13",
        name: "PSA (Total)",
        price: 800,
        parameters: [
          {
            id: "1",
            name: "PSA (Total)",
            unit: "ng/mL",
            normalRange: "<4.0",
            result: "",
          },
        ],
      },
      {
        id: "it14",
        name: "AFP (Alpha-Fetoprotein)",
        price: 800,
        parameters: [
          {
            id: "1",
            name: "AFP",
            unit: "ng/mL",
            normalRange: "<10",
            result: "",
          },
        ],
      },
      {
        id: "it15",
        name: "Beta-hCG",
        price: 500,
        parameters: [
          {
            id: "1",
            name: "Beta-hCG (Male)",
            unit: "mIU/mL",
            normalRange: "<5",
            result: "",
          },
          {
            id: "2",
            name: "Beta-hCG (Female - Non-pregnant)",
            unit: "mIU/mL",
            normalRange: "<5",
            result: "",
          },
        ],
      },
    ],
  },
  {
    name: "Special Hematology",
    tests: [
      {
        id: "sh1",
        name: "Bleeding Time",
        price: 200,
        parameters: [
          {
            id: "1",
            name: "Bleeding Time (Ivy Method)",
            unit: "min",
            normalRange: "1-6",
            result: "",
          },
        ],
      },
      {
        id: "sh2",
        name: "Clotting Time",
        price: 200,
        parameters: [
          {
            id: "1",
            name: "Clotting Time (Capillary)",
            unit: "min",
            normalRange: "3-8",
            result: "",
          },
        ],
      },
      {
        id: "sh3",
        name: "PT (Prothrombin Time)",
        price: 400,
        parameters: [
          {
            id: "1",
            name: "PT",
            unit: "sec",
            normalRange: "11-15",
            result: "",
          },
          {
            id: "2",
            name: "INR",
            unit: "",
            normalRange: "0.9-1.1",
            result: "",
          },
        ],
      },
      {
        id: "sh4",
        name: "APTT",
        price: 500,
        parameters: [
          {
            id: "1",
            name: "APTT",
            unit: "sec",
            normalRange: "25-40",
            result: "",
          },
        ],
      },
      {
        id: "sh5",
        name: "Fibrinogen",
        price: 600,
        parameters: [
          {
            id: "1",
            name: "Fibrinogen",
            unit: "mg/dL",
            normalRange: "200-400",
            result: "",
          },
        ],
      },
      {
        id: "sh6",
        name: "D-Dimer",
        price: 800,
        parameters: [
          {
            id: "1",
            name: "D-Dimer",
            unit: "ng/mL",
            normalRange: "<500",
            result: "",
          },
        ],
      },
      {
        id: "sh7",
        name: "Factor VIII Assay",
        price: 1500,
        parameters: [
          {
            id: "1",
            name: "Factor VIII Activity",
            unit: "%",
            normalRange: "50-150",
            result: "",
          },
        ],
      },
      {
        id: "sh8",
        name: "Factor IX Assay",
        price: 1500,
        parameters: [
          {
            id: "1",
            name: "Factor IX Activity",
            unit: "%",
            normalRange: "50-150",
            result: "",
          },
        ],
      },
      {
        id: "sh9",
        name: "G6PD Screening",
        price: 500,
        parameters: [
          {
            id: "1",
            name: "G6PD Activity",
            unit: "",
            normalRange: "Normal",
            result: "",
          },
        ],
      },
      {
        id: "sh10",
        name: "Sickle Cell Screening",
        price: 400,
        parameters: [
          {
            id: "1",
            name: "Sickle Cell Test",
            unit: "",
            normalRange: "Negative",
            result: "",
          },
        ],
      },
    ],
  },
];

export default function CreateDirectTestPage() {
  const router = useRouter();
  const { accessToken, user } = useAuthStore();
  const isLabRole = user?.role === "lab_technician";

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedTests, setSelectedTests] = useState<LabTest[]>([]);
  const [priority, setPriority] = useState<"routine" | "urgent" | "emergency">(
    "routine",
  );
  const [notes, setNotes] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [receiptNo, setReceiptNo] = useState("");
  const receiptCounterRef = useRef(1);

  const [testParameters, setTestParameters] = useState<
    Record<string, TestParameter[]>
  >({});

  // Smart Search states
  const [patientSearchQuery, setPatientSearchQuery] = useState("");
  const [patientSearchResults, setPatientSearchResults] = useState<Patient[]>(
    [],
  );
  const [searchingPatients, setSearchingPatients] = useState(false);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const [activePatientIndex, setActivePatientIndex] = useState(-1);
  const patientSearchRef = useRef<HTMLDivElement | null>(null);
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(
    null,
  );

  // Test search states
  const [testSearchQuery, setTestSearchQuery] = useState("");
  const [testSearchResults, setTestSearchResults] = useState<LabTest[]>([]);
  const [showTestDropdown, setShowTestDropdown] = useState(false);
  const [activeSearchIndex, setActiveSearchIndex] = useState(-1);
  const testSearchRef = useRef<HTMLDivElement | null>(null);

  // New patient creation state
  const [showCreatePatientDialog, setShowCreatePatientDialog] = useState(false);
  const [creatingPatient, setCreatingPatient] = useState(false);
  const [newPatient, setNewPatient] = useState({
    name: "",
    phone: "",
    guardian: "",
    gender: "",
    address: "",
    doctorName: "",
    receiptNo: "",
    refPerson: "",
    passTskNo: "",
    registrationNo: "",
  });
  const [newPatientAge, setNewPatientAge] = useState("");

  const [templateLabTests, setTemplateLabTests] = useState<LabTestCategory[]>(
    [],
  );

  const activeLabTests = useMemo(() => templateLabTests, [templateLabTests]);

  const formatPatientId = (id?: string) => {
    if (!id) return "";
    if (/-\d{3}$/.test(id)) return id;
    const match = id.match(/^(.*?)(\d+)$/);
    if (!match) return id;
    const prefix = match[1];
    const digits = match[2];
    const tail = digits.slice(-3).padStart(3, "0");
    const head = digits.slice(0, -3);
    return `${prefix}${head}-${tail}`;
  };

  const generateReceiptNo = () => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const seq = String(receiptCounterRef.current++).padStart(3, "0");
    return `REC${yyyy}${mm}${dd}-${seq}`;
  };

  const incompletePatientFields = useMemo(() => {
    if (!selectedPatient) return [];
    const missing: string[] = [];
    if (!selectedPatient.guardian?.trim()) missing.push("Guardian");
    return missing;
  }, [selectedPatient]);

  const loadTemplateTests = async () => {
    try {
      if (!accessToken) return;
      const response = await fetch("/api/laboratory/templates?active=true", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (!response.ok) return;
      const data = await response.json();
      const templates: LabTestTemplate[] = data?.data || [];
      if (templates.length === 0) return;

      const grouped = new Map<string, LabTest[]>();
      templates.forEach((template) => {
        const categoryKey = template.category || "general";
        const categoryName = categoryKey
          .replace(/_/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase());
        const current = grouped.get(categoryName) || [];
        current.push({
          id: template._id,
          name: template.testName,
          price: Number(template.basePrice) || 0,
          testCode: template.testCode,
          category: template.category,
          description: template.description,
          specimenType: template.specimenType?.[0] || "blood",
          parameters: (template.parameters || []).map((p, index) => ({
            id: String(index + 1),
            name: p.parameterName || p.name || "",
            unit: p.unit || "",
            normalRange: p.normalRange || "",
            result: "",
          })),
        });
        grouped.set(categoryName, current);
      });

      const mappedCategories: LabTestCategory[] = Array.from(
        grouped.entries(),
      ).map(([name, tests]) => ({ name, tests }));

      setTemplateLabTests(mappedCategories);
    } catch (err) {
      console.error("Error loading template tests:", err);
    }
  };

  // Load recent patients on component mount
  useEffect(() => {
    loadTemplateTests();
  }, [accessToken]);

  // Smart patient search with debounce
  useEffect(() => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    if (patientSearchQuery.length >= 2) {
      const timer = setTimeout(() => {
        searchPatients();
      }, 300);
      setDebounceTimer(timer);
    } else if (patientSearchQuery.length === 0) {
      setPatientSearchResults([]);
      setShowPatientDropdown(false);
    }

    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [patientSearchQuery]);

  useEffect(() => {
    if (showCreatePatientDialog) {
      setNewPatient((prev) => ({
        ...prev,
        receiptNo: prev.receiptNo || generateReceiptNo(),
      }));
    }
  }, [showCreatePatientDialog]);

  // Smart test search - update testSearchResults for dropdown
  useEffect(() => {
    if (testSearchQuery.trim() === "") {
      setTestSearchResults([]);
      setShowTestDropdown(false);
      return;
    }

    const query = testSearchQuery.toLowerCase().trim();
    const results: LabTest[] = [];

    activeLabTests.forEach((category) => {
      category.tests.forEach((test) => {
        const testName = test.name.toLowerCase();
        const testCode = (test.testCode || "").toLowerCase();
        const testDescription = (test.description || "").toLowerCase();
        const categoryName = category.name.toLowerCase();
        const parameterNames = test.parameters
          .map((parameter) => parameter.name.toLowerCase())
          .join(" ");

        // Smart matching: check for partial matches, acronyms, etc.
        const words = testName.split(/\s+/);
        const acronym = words.map((w) => w[0]).join("");

        if (
          testName.includes(query) ||
          testCode.includes(query) ||
          testDescription.includes(query) ||
          parameterNames.includes(query) ||
          categoryName.includes(query) ||
          acronym.includes(query) ||
          words.some((word) => word.startsWith(query)) ||
          testName
            .replace(/[^a-z0-9]/g, "")
            .includes(query.replace(/[^a-z0-9]/g, ""))
        ) {
          results.push(test);
        }
      });
    });

    // Sort by relevance
    results.sort((a, b) => {
      const aName = a.name.toLowerCase();
      const bName = b.name.toLowerCase();

      // Exact match gets highest priority
      if (aName === query) return -1;
      if (bName === query) return 1;

      // Starts with query gets second priority
      if (aName.startsWith(query)) return -1;
      if (bName.startsWith(query)) return 1;

      // Otherwise sort alphabetically
      return aName.localeCompare(bName);
    });

    setTestSearchResults(results.slice(0, 10));
    setShowTestDropdown(true);
    setActiveSearchIndex(results.length > 0 ? 0 : -1);
  }, [testSearchQuery, activeLabTests]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        patientSearchRef.current &&
        !patientSearchRef.current.contains(event.target as Node)
      ) {
        setShowPatientDropdown(false);
      }
      if (
        testSearchRef.current &&
        !testSearchRef.current.contains(event.target as Node)
      ) {
        setShowTestDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const searchPatients = async () => {
    try {
      setSearchingPatients(true);
      if (!accessToken) {
        return;
      }

      const response = await fetch(
        `/api/patients/search?q=${encodeURIComponent(patientSearchQuery)}&limit=10`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error("Failed to search patients");
      }

      const data = await response.json();
      setPatientSearchResults(data.data || []);
      setShowPatientDropdown(true);
    } catch (err: any) {
      console.error("Error searching patients:", err);
    } finally {
      setSearchingPatients(false);
    }
  };

  const handleSelectPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setPatientSearchQuery("");
    setShowPatientDropdown(false);
    setPatientSearchResults([]);
    setActivePatientIndex(-1);
    if (!receiptNo) {
      setReceiptNo(generateReceiptNo());
    }
    if (isLabRole) {
      const missing: string[] = [];
      if (!patient.guardian?.trim()) missing.push("Guardian");
      if (missing.length > 0) {
        toast.warning("Patient info is incomplete", {
          description: `Missing: ${missing.join(", ")}. You can continue or ignore.`,
        });
      }
    }
  };

  const handlePatientSearchKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (
      !showPatientDropdown &&
      (e.key === "ArrowDown" || e.key === "ArrowUp")
    ) {
      setShowPatientDropdown(true);
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (patientSearchResults.length === 0) return;
      setActivePatientIndex((prev) =>
        prev < patientSearchResults.length - 1 ? prev + 1 : 0,
      );
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (patientSearchResults.length === 0) return;
      setActivePatientIndex((prev) =>
        prev > 0 ? prev - 1 : patientSearchResults.length - 1,
      );
      return;
    }

    if (e.key === "Enter" && showPatientDropdown) {
      e.preventDefault();
      if (activePatientIndex >= 0 && patientSearchResults[activePatientIndex]) {
        handleSelectPatient(patientSearchResults[activePatientIndex]);
      }
      return;
    }

    if (e.key === "Escape") {
      setShowPatientDropdown(false);
      setActivePatientIndex(-1);
    }
  };

  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPatient.name || !newPatient.gender || !newPatientAge) {
      toast.error("Name, gender, and age are required");
      return;
    }

    try {
      setCreatingPatient(true);

      let derivedDateOfBirth: string | undefined = undefined;
      const ageValue = Number(newPatientAge);
      if (Number.isNaN(ageValue) || ageValue <= 0 || ageValue >= 130) {
        toast.error("Please enter a valid age");
        return;
      }
      const today = new Date();
      const dob = new Date(today.getFullYear() - ageValue, 0, 1);
      derivedDateOfBirth = dob.toISOString().slice(0, 10);

      const response = await fetch("/api/patients", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newPatient.name.trim(),
          phone: newPatient.phone.trim(),
          guardian: newPatient.guardian.trim() || undefined,
          dateOfBirth: derivedDateOfBirth,
          gender: newPatient.gender,
          address: newPatient.address.trim() || undefined,
          refPerson: newPatient.refPerson.trim() || undefined,
          passTskNo: newPatient.passTskNo.trim() || undefined,
          registrationNo: newPatient.registrationNo.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create patient");
      }

      const data = await response.json();
      toast.success("Patient created successfully");

      setSelectedPatient({
        ...data.data,
        guardian:
          data.data?.guardian || newPatient.guardian?.trim() || undefined,
        refPerson:
          data.data?.refPerson || newPatient.refPerson?.trim() || undefined,
        passTskNo:
          data.data?.passTskNo || newPatient.passTskNo?.trim() || undefined,
        registrationNo:
          data.data?.registrationNo ||
          newPatient.registrationNo?.trim() ||
          undefined,
        address:
          data.data?.address || newPatient.address?.trim() || undefined,
        doctorName: newPatient.doctorName.trim() || undefined,
      });
      if (!doctorName.trim() && newPatient.doctorName.trim()) {
        setDoctorName(newPatient.doctorName.trim());
      }
      setPatientSearchQuery("");
      setShowPatientDropdown(false);
      setPatientSearchResults([]);
      setActivePatientIndex(-1);
      setShowCreatePatientDialog(false);

      setNewPatient({
        name: "",
        phone: "",
        guardian: "",
        gender: "",
        address: "",
        doctorName: "",
        receiptNo: "",
        refPerson: "",
        passTskNo: "",
        registrationNo: "",
      });
      setNewPatientAge("");
    } catch (err: any) {
      toast.error(err.message || "Failed to create patient");
    } finally {
      setCreatingPatient(false);
    }
  };

  const ensureTestParameters = (test: LabTest) => {
    setTestParameters((prev) => {
      if (prev[test.id]) return prev;
      return {
        ...prev,
        [test.id]:
          test.parameters.length > 0
            ? test.parameters.map((p) => ({
                id: p.id,
                name: p.name,
                value: "",
                unit: p.unit,
                normalRange: p.normalRange,
                remarks: "",
              }))
            : [
                {
                  id: "1",
                  name: "",
                  value: "",
                  unit: "",
                  normalRange: "",
                  remarks: "",
                },
              ],
      };
    });
  };

  const handleAddTest = (testId: string) => {
    const test = activeLabTests
      .flatMap((category) => category.tests)
      .find((t) => t.id === testId);
    if (!test) return;
    setSelectedTests((prev) => {
      if (prev.some((t) => t.id === test.id)) return prev;
      return [...prev, test];
    });
    ensureTestParameters(test);
    setTestSearchQuery("");
    setTestSearchResults([]);
    setShowTestDropdown(false);
    setActiveSearchIndex(-1);
  };

  const handleRemoveTest = (testId: string) => {
    setSelectedTests((prev) => prev.filter((t) => t.id !== testId));
    setTestParameters((prev) => {
      const next = { ...prev };
      delete next[testId];
      return next;
    });
  };

  const handleClearSearch = () => {
    setTestSearchQuery("");
    setTestSearchResults([]);
    setShowTestDropdown(false);
    setActiveSearchIndex(-1);
  };

  const handleTestSearchKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (!showTestDropdown && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setShowTestDropdown(true);
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (testSearchResults.length === 0) return;
      setActiveSearchIndex((prev) =>
        prev < testSearchResults.length - 1 ? prev + 1 : 0,
      );
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (testSearchResults.length === 0) return;
      setActiveSearchIndex((prev) =>
        prev > 0 ? prev - 1 : testSearchResults.length - 1,
      );
      return;
    }

    if (e.key === "Enter" && showTestDropdown) {
      e.preventDefault();
      if (activeSearchIndex >= 0 && testSearchResults[activeSearchIndex]) {
        handleAddTest(testSearchResults[activeSearchIndex].id);
      }
      return;
    }

    if (e.key === "Escape") {
      setShowTestDropdown(false);
      setActiveSearchIndex(-1);
    }
  };

  const addTestParameter = (testId: string) => {
    setTestParameters((prev) => {
      const current = prev[testId] || [];
      const newId = (current.length + 1).toString();
      return {
        ...prev,
        [testId]: [
          ...current,
          {
            id: newId,
            name: "",
            value: "",
            unit: "",
            normalRange: "",
            remarks: "",
          },
        ],
      };
    });
  };

  const removeTestParameter = (testId: string, id: string) => {
    setTestParameters((prev) => {
      const current = prev[testId] || [];
      if (current.length <= 1) return prev;
      return {
        ...prev,
        [testId]: current.filter((p) => p.id !== id),
      };
    });
  };

  const updateTestParameter = (
    testId: string,
    id: string,
    field: keyof TestParameter,
    value: string,
  ) => {
    setTestParameters((prev) => ({
      ...prev,
      [testId]: (prev[testId] || []).map((param) =>
        param.id === id ? { ...param, [field]: value } : param,
      ),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedPatient) {
      toast.error("Please select a patient");
      return;
    }

    if (selectedTests.length === 0) {
      toast.error("Please add at least one test");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const batchId = `DTB${Date.now()}${Math.floor(Math.random() * 1000)}`;
      const createRequests = selectedTests.map((test) => {
        const params = (testParameters[test.id] || []).filter(
          (p) => p.name.trim() && p.value.trim(),
        );
        const snapshot = {
          name: selectedPatient.name,
          patientId: selectedPatient.patientId,
          phone: selectedPatient.phone,
          gender: selectedPatient.gender,
          guardian: selectedPatient.guardian,
          address: selectedPatient.address,
          refPerson: selectedPatient.refPerson,
          passTskNo: selectedPatient.passTskNo,
          registrationNo: selectedPatient.registrationNo,
        };
        const resolvedDoctorName =
          doctorName.trim() || selectedPatient.doctorName?.trim() || undefined;
        const payload = {
          patientId: selectedPatient._id,
          testTemplateId: test.id,
          testName: test.name,
          category: activeLabTests
            .find((cat) => cat.tests.some((t) => t.id === test.id))
            ?.tests.find((t) => t.id === test.id)?.category,
          price: test.price,
          priority,
          notes: notes || undefined,
          specimenType: test.specimenType || "blood",
          doctorName: resolvedDoctorName,
          results: {
            parameters: params.map((p) => ({
              name: p.name,
              value: p.value,
              unit: p.unit,
              normalRange: p.normalRange,
              remarks: p.remarks,
            })),
          },
          batchId,
          patientSnapshot: snapshot,
        };

        return fetch("/api/laboratory/direct-tests", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }).then(async (res) => {
          if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error || "Failed to create direct lab test");
          }
          return res.json();
        });
      });

      const results = await Promise.all(createRequests);
      toast.success("Direct lab tests created successfully");
      const firstId = results[0]?.data?._id;
      if (firstId) {
        router.push(`/laboratory/direct-tests/${firstId}`);
      } else {
        router.push(`/laboratory/direct-tests`);
      }
    } catch (err: any) {
      setError(err.message || "Failed to create direct lab test");
      toast.error(err.message || "Failed to create direct lab test");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <Skeleton className="h-8 w-64 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Create Direct Lab Test
          </h1>
          <p className="text-muted-foreground mt-1">
            Create a lab test for patients visiting without a doctor
          </p>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Column - Patient and Test Selection */}
          <div className="lg:col-span-3 space-y-6">
            {/* Patient Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Select Patient
                </CardTitle>
                <CardDescription>
                  Search and select a patient for this lab test
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Smart Patient Search */}
                <div className="relative" ref={patientSearchRef}>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, phone, or patient ID..."
                      className="pl-9 pr-9"
                      value={patientSearchQuery}
                      onChange={(e) => setPatientSearchQuery(e.target.value)}
                      onFocus={() => {
                        if (patientSearchQuery.length >= 2) {
                          setShowPatientDropdown(true);
                          setActivePatientIndex(
                            patientSearchResults.length > 0 ? 0 : -1,
                          );
                        }
                      }}
                      onKeyDown={handlePatientSearchKeyDown}
                    />
                    {patientSearchQuery && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-2 h-6 w-6"
                        onClick={() => {
                          setPatientSearchQuery("");
                          setShowPatientDropdown(false);
                          setPatientSearchResults([]);
                          setActivePatientIndex(-1);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  {searchingPatients && (
                    <div className="absolute right-3 top-3">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  )}
                  {/* Patient Smart Dropdown */}
                  {showPatientDropdown && (
                    <div className="absolute z-50 w-full mt-1 border rounded-md shadow-lg bg-popover max-h-80 overflow-y-auto">
                      {patientSearchResults.length > 0
                        ? patientSearchResults.map((patient, index) => (
                            <button
                              key={patient._id}
                              type="button"
                              className={`w-full text-left px-3 py-3 transition-colors border-b last:border-b-0 ${
                                activePatientIndex === index
                                  ? "bg-accent"
                                  : "hover:bg-accent"
                              }`}
                              onMouseEnter={() => setActivePatientIndex(index)}
                              onClick={() => handleSelectPatient(patient)}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <User className="h-4 w-4 text-muted-foreground" />
                                  <div>
                                    <div className="font-medium">
                                      {patient.name}
                                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatPatientId(patient.patientId)}
                      {patient.phone
                        ? ` • ${patient.phone}`
                        : ""}
                    </div>
                                  </div>
                                </div>
                                <Badge variant="outline" className="text-xs">
                                  Select
                                </Badge>
                              </div>
                            </button>
                          ))
                        : patientSearchQuery &&
                          !searchingPatients && (
                            <div className="p-4 text-center">
                              <p className="text-sm text-muted-foreground mb-3">
                                No patients found matching "{patientSearchQuery}
                                "
                              </p>
                              <Button
                                type="button"
                                variant="outline"
                                className="w-full"
                                onClick={() => {
                                  setShowPatientDropdown(false);
                                  setShowCreatePatientDialog(true);
                                }}
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Create New Patient
                              </Button>
                            </div>
                          )}
                    </div>
                  )}
                </div>

                {/* Selected Patient */}
                {selectedPatient && (
                    <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-md border border-green-200 dark:border-green-800 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <div>
                            <div className="font-medium">
                              {selectedPatient.name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                            Lab Test ID:{" "}
                            {formatPatientId(selectedPatient.patientId)}
                            {selectedPatient.phone &&
                              ` • Phone: ${selectedPatient.phone}`}
                            </div>
                          </div>
                        </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedPatient(null);
                          setPatientSearchQuery("");
                        }}
                      >
                        Change
                        </Button>
                      </div>
                      {isLabRole && incompletePatientFields.length > 0 && (
                        <Alert variant="destructive" className="mt-2">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertTitle>Incomplete patient info</AlertTitle>
                          <AlertDescription>
                            Missing: {incompletePatientFields.join(", ")}. You
                            can continue or ignore.
                          </AlertDescription>
                        </Alert>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label htmlFor="doctorName">Doctor Name</Label>
                          <Input
                            id="doctorName"
                            value={doctorName}
                            onChange={(e) => setDoctorName(e.target.value)}
                            placeholder="Optional"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="receiptNo">Receipt No (Auto)</Label>
                          <Input
                            id="receiptNo"
                            value={receiptNo}
                            onChange={(e) => setReceiptNo(e.target.value)}
                            placeholder="Auto generated"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="labTestId">Lab Test ID</Label>
                          <Input
                            id="labTestId"
                            value={formatPatientId(selectedPatient.patientId)}
                            readOnly
                          />
                        </div>
                      </div>
                    </div>
                  )}
              </CardContent>
            </Card>

            {/* Test Type Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TestTube className="h-5 w-5" />
                  Select Test Type
                  <Badge variant="outline" className="ml-2">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Smart Search
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Search tests by name, category, or acronym
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative" ref={testSearchRef}>
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Type to search tests (e.g. cbc, liver, urine)..."
                    className="pl-9 pr-9"
                    value={testSearchQuery}
                    onChange={(e) => setTestSearchQuery(e.target.value)}
                    onFocus={() => {
                      if (testSearchQuery) {
                        setShowTestDropdown(true);
                        setActiveSearchIndex(
                          testSearchResults.length > 0 ? 0 : -1,
                        );
                      }
                    }}
                    onKeyDown={handleTestSearchKeyDown}
                  />
                  {testSearchQuery && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-2 h-6 w-6"
                      onClick={handleClearSearch}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}

                  {showTestDropdown && (
                    <div className="absolute z-50 w-full mt-1 border rounded-md shadow-lg bg-popover max-h-80 overflow-y-auto">
                  {testSearchResults.length > 0 ? (
                    testSearchResults.map((test, index) => {
                          const category = activeLabTests.find((cat) =>
                            cat.tests.some((t) => t.id === test.id),
                          )?.name;

                          const isSelected = selectedTests.some(
                            (selected) => selected.id === test.id,
                          );
                          return (
                            <button
                              key={test.id}
                              type="button"
                              className={`w-full text-left px-4 py-3 transition-colors border-b last:border-b-0 ${
                                activeSearchIndex === index
                                  ? "bg-accent"
                                  : "hover:bg-accent"
                              }`}
                              onMouseEnter={() => setActiveSearchIndex(index)}
                              onClick={() => handleAddTest(test.id)}
                            >
                              <div className="flex items-center justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium truncate">
                                    {test.name}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {category} • {test.parameters.length}{" "}
                                    parameters
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {isSelected && (
                                    <Badge variant="outline" className="text-xs">
                                      Added
                                    </Badge>
                                  )}
                                  <Badge variant="secondary" className="text-xs">
                                    ₹{test.price}
                                  </Badge>
                                </div>
                              </div>
                            </button>
                          );
                        })
                      ) : (
                        <div className="p-4 text-sm text-muted-foreground text-center">
                          No matching test found
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {!activeLabTests.length && (
                  <div className="p-4 text-sm rounded-md border text-muted-foreground">
                    No active lab templates found. Please add templates in
                    `laboratory/templates`.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Test Details and Options */}
          <div className="space-y-6">
            {/* Selected Test Details */}
            {selectedTests.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Selected Tests</CardTitle>
                  <CardDescription>
                    Review selected test details
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    {selectedTests.map((test) => {
                      const category = activeLabTests.find((cat) =>
                        cat.tests.some((t) => t.id === test.id),
                      )?.name;
                      return (
                        <div
                          key={test.id}
                          className="flex items-center justify-between border rounded-md p-3"
                        >
                          <div>
                            <div className="font-medium">{test.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {category || "General"} • {test.parameters.length}{" "}
                              parameters
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge variant="secondary" className="text-xs">
                              ₹{test.price}
                            </Badge>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveTest(test.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="pt-3 border-t space-y-4">
                    <div>
                      <Label htmlFor="priority">Priority</Label>
                      <Select
                        value={priority}
                        onValueChange={(value: any) => setPriority(value)}
                      >
                        <SelectTrigger id="priority">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="routine">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              Routine
                            </div>
                          </SelectItem>
                          <SelectItem value="urgent">
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="h-4 w-4 text-orange-500" />
                              Urgent
                            </div>
                          </SelectItem>
                          <SelectItem value="emergency">
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="h-4 w-4 text-red-500" />
                              Emergency
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Full Width Parameters Tables */}
        {selectedTests.length > 0 && (
          <div className="mt-6 space-y-6">
            {selectedTests.map((test) => {
              const params = testParameters[test.id] || [];
              return (
                <Card
                  key={test.id}
                  className="border-blue-200 dark:border-blue-800"
                >
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <TestTube className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        {test.name} (Results)
                      </span>
                      <Button
                        type="button"
                        onClick={() => addTestParameter(test.id)}
                        variant="outline"
                        size="sm"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Parameter
                      </Button>
                    </CardTitle>
                    <CardDescription>
                      Enter parameter result values in a single-row table layout
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-md border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Parameter Name *</TableHead>
                            <TableHead>Value *</TableHead>
                            <TableHead>Unit</TableHead>
                            <TableHead>Normal Range</TableHead>
                            <TableHead>Remarks</TableHead>
                            <TableHead className="w-[70px]">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {params.map((param) => (
                            <TableRow key={param.id}>
                              <TableCell>
                                <Input
                                  value={param.name}
                                  onChange={(e) =>
                                    updateTestParameter(
                                      test.id,
                                      param.id,
                                      "name",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="e.g. Hemoglobin"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={param.value}
                                  onChange={(e) =>
                                    updateTestParameter(
                                      test.id,
                                      param.id,
                                      "value",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="Result"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={param.unit}
                                  onChange={(e) =>
                                    updateTestParameter(
                                      test.id,
                                      param.id,
                                      "unit",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="Unit"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={param.normalRange}
                                  onChange={(e) =>
                                    updateTestParameter(
                                      test.id,
                                      param.id,
                                      "normalRange",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="Normal range"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={param.remarks}
                                  onChange={(e) =>
                                    updateTestParameter(
                                      test.id,
                                      param.id,
                                      "remarks",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="Remarks"
                                />
                              </TableCell>
                              <TableCell>
                                <Button
                                  type="button"
                                  onClick={() =>
                                    removeTestParameter(test.id, param.id)
                                  }
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                                  disabled={params.length === 1}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Submit Button */}
        <div className="mt-6 flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={submitting || !selectedPatient || selectedTests.length === 0}
            className="min-w-[200px]"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Direct Lab Test"
            )}
          </Button>
        </div>
      </form>

      {/* Create Patient Dialog */}
      <Dialog
        open={showCreatePatientDialog}
        onOpenChange={setShowCreatePatientDialog}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Patient</DialogTitle>
            <DialogDescription>
              Enter patient details to create a new patient record
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreatePatient} className="space-y-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="patientName">
                  Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="patientName"
                  value={newPatient.name}
                  onChange={(e) =>
                    setNewPatient({ ...newPatient, name: e.target.value })
                  }
                  placeholder="Enter patient name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="patientPhone">Phone</Label>
                <Input
                  id="patientPhone"
                  type="tel"
                  value={newPatient.phone}
                  onChange={(e) =>
                    setNewPatient({ ...newPatient, phone: e.target.value })
                  }
                  placeholder="Enter phone number"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="patientGuardian">Guardian</Label>
                <Input
                  id="patientGuardian"
                  type="text"
                  value={newPatient.guardian}
                  onChange={(e) =>
                    setNewPatient({ ...newPatient, guardian: e.target.value })
                  }
                  placeholder="Enter guardian name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="patientGender">
                  Gender <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={newPatient.gender}
                  onValueChange={(value) =>
                    setNewPatient({ ...newPatient, gender: value })
                  }
                >
                  <SelectTrigger id="patientGender">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="patientAge">
                  Age <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="patientAge"
                  type="number"
                  min="0"
                  max="130"
                  value={newPatientAge}
                  onChange={(e) => setNewPatientAge(e.target.value)}
                  placeholder="Enter age in years"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="patientDoctorName">Doctor Name</Label>
                <Input
                  id="patientDoctorName"
                  value={newPatient.doctorName}
                  onChange={(e) =>
                    setNewPatient({ ...newPatient, doctorName: e.target.value })
                  }
                  placeholder="Optional"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="patientReceiptNo">Receipt No (Auto)</Label>
                <Input
                  id="patientReceiptNo"
                  value={newPatient.receiptNo}
                  onChange={(e) =>
                    setNewPatient({ ...newPatient, receiptNo: e.target.value })
                  }
                  placeholder="Auto generated"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="patientLabTestId">Lab Test ID</Label>
                <Input
                  id="patientLabTestId"
                  value="Auto generated after save"
                  readOnly
                />
              </div>

              {isLabRole && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="patientRefPerson">Ref Person</Label>
                    <Input
                      id="patientRefPerson"
                      type="text"
                      value={newPatient.refPerson}
                      onChange={(e) =>
                        setNewPatient({
                          ...newPatient,
                          refPerson: e.target.value,
                        })
                      }
                      placeholder="Optional"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="patientPassTskNo">Pass/Tsk #</Label>
                    <Input
                      id="patientPassTskNo"
                      type="text"
                      value={newPatient.passTskNo}
                      onChange={(e) =>
                        setNewPatient({
                          ...newPatient,
                          passTskNo: e.target.value,
                        })
                      }
                      placeholder="Optional"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="patientRegistrationNo">Regn No</Label>
                    <Input
                      id="patientRegistrationNo"
                      type="text"
                      value={newPatient.registrationNo}
                      onChange={(e) =>
                        setNewPatient({
                          ...newPatient,
                          registrationNo: e.target.value,
                        })
                      }
                      placeholder="Optional"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="patientAddress">Address</Label>
                    <Textarea
                      id="patientAddress"
                      value={newPatient.address}
                      onChange={(e) =>
                        setNewPatient({ ...newPatient, address: e.target.value })
                      }
                      placeholder="Enter patient address"
                      rows={3}
                    />
                  </div>
                </>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreatePatientDialog(false)}
                disabled={creatingPatient}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={creatingPatient}>
                {creatingPatient ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Patient
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
