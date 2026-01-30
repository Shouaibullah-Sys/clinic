//app/laboratory/tests/[id]/collect/page.tsx

"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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
import {
  ArrowLeft,
  TestTube,
  AlertTriangle,
  CheckCircle,
  User,
  Stethoscope,
  CreditCard,
  Clock,
  Plus,
  Trash2,
  Info,
  RefreshCw,
} from "lucide-react";
import { format } from "date-fns";
import { useAuthStore } from "@/store/useAuthStore";
import { Skeleton } from "@/components/ui/skeleton";

interface TestInfo {
  _id: string;
  testId: string;
  testName: string;
  patient: {
    name: string;
    patientId: string;
    dateOfBirth?: string;
    age?: number;
    gender?: string;
    phone?: string;
  };
  doctor?: {
    name: string;
  };
  orderedBy?: {
    name: string;
    role?: string;
  };
  priority: string;
  status: string;
  collectionStatus: string;
  paymentVerified: boolean;
  charges: {
    paymentStatus: string;
    paid: number;
    due: number;
  };
  specimen?: {
    type?: string;
    quantity?: string;
    container?: string;
    remarks?: string;
  };
  [key: string]: any; // Allow additional properties
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
  parameters: SampleParameter[];
}

interface LabTestCategory {
  name: string;
  tests: LabTest[];
}

const SPECIMEN_TYPES = [
  "blood",
  "urine",
  "stool",
  "tissue",
  "saliva",
  "other",
] as const;

// Comprehensive lab tests data structure with all categories
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

// Default parameters for each specimen type
const DEFAULT_PARAMETERS: Record<string, SampleParameter[]> = {
  blood: [
    {
      id: "1",
      name: "Volume",
      unit: "ml",
      normalRange: "",
      result: "",
    },
    {
      id: "2",
      name: "Color",
      unit: "",
      normalRange: "",
      result: "",
    },
    {
      id: "3",
      name: "Clotting",
      unit: "",
      normalRange: "",
      result: "",
    },
    {
      id: "4",
      name: "Hemolysis",
      unit: "",
      normalRange: "",
      result: "",
    },
  ],
  urine: [
    {
      id: "1",
      name: "Volume",
      unit: "ml",
      normalRange: "",
      result: "",
    },
    {
      id: "2",
      name: "Color",
      unit: "",
      normalRange: "",
      result: "",
    },
    {
      id: "3",
      name: "Clarity",
      unit: "",
      normalRange: "",
      result: "",
    },
    {
      id: "4",
      name: "Specific Gravity",
      unit: "",
      normalRange: "",
      result: "",
    },
  ],
  stool: [
    {
      id: "1",
      name: "Consistency",
      unit: "",
      normalRange: "",
      result: "",
    },
    {
      id: "2",
      name: "Color",
      unit: "",
      normalRange: "",
      result: "",
    },
    {
      id: "3",
      name: "Quantity",
      unit: "g",
      normalRange: "",
      result: "",
    },
    {
      id: "4",
      name: "Mucus",
      unit: "",
      normalRange: "",
      result: "",
    },
  ],
  tissue: [
    {
      id: "1",
      name: "Type",
      unit: "",
      normalRange: "",
      result: "",
    },
    {
      id: "2",
      name: "Size",
      unit: "cm",
      normalRange: "",
      result: "",
    },
    {
      id: "3",
      name: "Color",
      unit: "",
      normalRange: "",
      result: "",
    },
    {
      id: "4",
      name: "Fixation",
      unit: "",
      normalRange: "",
      result: "",
    },
  ],
  saliva: [
    {
      id: "1",
      name: "Volume",
      unit: "ml",
      normalRange: "",
      result: "",
    },
    {
      id: "2",
      name: "Color",
      unit: "",
      normalRange: "",
      result: "",
    },
    {
      id: "3",
      name: "Viscosity",
      unit: "",
      normalRange: "",
      result: "",
    },
    { id: "4", name: "pH", unit: "", normalRange: "", result: "" },
  ],
  other: [
    {
      id: "1",
      name: "Description",
      unit: "",
      normalRange: "",
      result: "",
    },
    {
      id: "2",
      name: "Quantity",
      unit: "",
      normalRange: "",
      result: "",
    },
    {
      id: "3",
      name: "Appearance",
      unit: "",
      normalRange: "",
      result: "",
    },
  ],
};

// Helper function to calculate age
const calculateAge = (dateOfBirth: string | Date): number => {
  if (!dateOfBirth) return 0;
  const dob = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }

  return age;
};

// Helper function to get doctor name
const getDoctorName = (test: TestInfo | null): string => {
  if (!test) return "Doctor not available";

  // Try doctor field first
  if (test.doctor?.name) {
    return test.doctor.name.startsWith("Dr. ")
      ? test.doctor.name
      : `Dr. ${test.doctor.name}`;
  }

  // Try orderedBy if they are a doctor
  if (test.orderedBy?.name && test.orderedBy?.role === "doctor") {
    const name = test.orderedBy.name;
    return name.startsWith("Dr. ") ? name : `Dr. ${name}`;
  }

  // Check if orderedBy has a name (might be a receptionist who ordered it)
  if (test.orderedBy?.name) {
    return test.orderedBy.name;
  }

  return "Doctor not assigned";
};

// Format date for display
const formatDate = (dateString?: string): string => {
  if (!dateString) return "N/A";
  try {
    return format(new Date(dateString), "dd/MM/yyyy");
  } catch {
    return "Invalid date";
  }
};

// Check if user can see prices (receptionist role)
const canSeePrices = (userRole?: string): boolean => {
  return userRole === "receptionist";
};

export default function CollectSamplePage() {
  const params = useParams();
  const router = useRouter();
  const { accessToken, user } = useAuthStore();
  const [test, setTest] = useState<TestInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [sampleId, setSampleId] = useState("");
  const [sampleCondition, setSampleCondition] = useState("satisfactory");
  const [sampleConditionNotes, setSampleConditionNotes] = useState("");

  // Dynamic parameters
  const [selectedTestId, setSelectedTestId] = useState<string>("");
  const [specimenQuantity, setSpecimenQuantity] = useState("");
  const [specimenContainer, setSpecimenContainer] = useState("");
  const [specimenRemarks, setSpecimenRemarks] = useState("");
  const [parameters, setParameters] = useState<SampleParameter[]>([
    { id: "1", name: "", unit: "", normalRange: "", result: "" },
  ]);

  // Test parameters (results)
  const [testParameters, setTestParameters] = useState<TestParameter[]>([
    { id: "1", name: "", value: "", unit: "", normalRange: "", remarks: "" },
  ]);

  // Generate sample ID
  useEffect(() => {
    if (!sampleId) {
      const date = new Date();
      const year = date.getFullYear().toString().slice(-2);
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      const day = date.getDate().toString().padStart(2, "0");
      const random = Math.floor(1000 + Math.random() * 9000);
      setSampleId(`SMP${year}${month}${day}${random}`);
    }
  }, [sampleId]);

  useEffect(() => {
    fetchTestInfo();
  }, [params.id]);

  const fetchTestInfo = async () => {
    try {
      setLoading(true);
      if (!accessToken) {
        router.push("/login");
        return;
      }

      console.log(`Fetching test info for ID: ${params.id}`);

      const response = await fetch(
        `/api/laboratory/tests/${params.id}/collect/info`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error("API Error Response:", errorText);
        throw new Error(`Failed to fetch test information: ${response.status}`);
      }

      const data = await response.json();
      console.log("API Response data:", data);

      if (!data.success) {
        throw new Error(data.error || "API returned unsuccessful response");
      }

      // Process the data
      const processedData: TestInfo = {
        ...data.data,
        doctor: data.data.doctor || { name: "Not Assigned" },
        patient: {
          name: data.data.patient?.name || "Unknown Patient",
          patientId: data.data.patient?.patientId || "N/A",
          phone: data.data.patient?.phone || null,
          dateOfBirth: data.data.patient?.dateOfBirth || null,
          age:
            data.data.patient?.age ||
            (data.data.patient?.dateOfBirth
              ? calculateAge(data.data.patient.dateOfBirth)
              : undefined),
          gender: data.data.patient?.gender || null,
        },
        orderedBy: data.data.orderedBy || null,
        collectionStatus: data.data.collectionStatus || "pending",
        priority: data.data.priority || "routine",
        status: data.data.status || "pending",
        paymentVerified: data.data.paymentVerified || false,
        charges: data.data.charges || {
          paymentStatus: "pending",
          paid: 0,
          due: 0,
        },
      };

      console.log("Processed test data:", processedData);
      setTest(processedData);

      // Pre-fill selected test if exists
      if (data.data.specimen?.type) {
        setSelectedTestId(data.data.specimen.type);
        // Find the test in labTests and populate its parameters
        const test = labTests
          .flatMap((category) => category.tests)
          .find((t) => t.id === data.data.specimen.type);
        if (test) {
          setParameters(test.parameters);
        } else {
          setParameters([
            { id: "1", name: "", unit: "", normalRange: "", result: "" },
          ]);
        }
      }

      // Pre-fill other specimen details
      if (data.data.specimen?.quantity) {
        setSpecimenQuantity(data.data.specimen.quantity);
      }
      if (data.data.specimen?.container) {
        setSpecimenContainer(data.data.specimen.container);
      }
      if (data.data.specimen?.remarks) {
        setSpecimenRemarks(data.data.specimen.remarks);
      }
    } catch (err: any) {
      console.error("Error fetching test info:", err);
      setError(err.message || "Failed to load test information");
    } finally {
      setLoading(false);
    }
  };

  // Handle test selection change
  useEffect(() => {
    if (selectedTestId) {
      // Find the test in labTests and populate its parameters
      const test = labTests
        .flatMap((category) => category.tests)
        .find((t) => t.id === selectedTestId);
      if (test) {
        setParameters(test.parameters);
      } else {
        setParameters([
          {
            id: "1",
            name: "",
            unit: "",
            normalRange: "",
            result: "",
          },
        ]);
      }
    } else {
      setParameters([
        {
          id: "1",
          name: "",
          unit: "",
          normalRange: "",
          result: "",
        },
      ]);
    }
  }, [selectedTestId]);

  const addParameter = () => {
    const newId = (parameters.length + 1).toString();
    setParameters([
      ...parameters,
      {
        id: newId,
        name: "",
        unit: "",
        normalRange: "",
        result: "",
      },
    ]);
  };

  const removeParameter = (id: string) => {
    if (parameters.length > 1) {
      setParameters(parameters.filter((p) => p.id !== id));
    }
  };

  const updateParameter = (
    id: string,
    field: keyof SampleParameter,
    value: string,
  ) => {
    setParameters(
      parameters.map((param) =>
        param.id === id ? { ...param, [field]: value } : param,
      ),
    );
  };

  // Test parameters management functions
  const addTestParameter = () => {
    const newId = (testParameters.length + 1).toString();
    setTestParameters([
      ...testParameters,
      {
        id: newId,
        name: "",
        value: "",
        unit: "",
        normalRange: "",
        remarks: "",
      },
    ]);
  };

  const removeTestParameter = (id: string) => {
    if (testParameters.length > 1) {
      setTestParameters(testParameters.filter((p) => p.id !== id));
    }
  };

  const updateTestParameter = (
    id: string,
    field: keyof TestParameter,
    value: string,
  ) => {
    setTestParameters(
      testParameters.map((param) =>
        param.id === id ? { ...param, [field]: value } : param,
      ),
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSubmitting(true);
      if (!accessToken) {
        router.push("/login");
        return;
      }

      // Filter valid test parameters (name and value are required)
      const validTestParameters = testParameters.filter(
        (p) => p.name.trim() && p.value.trim(),
      );

      const payload = {
        sampleId,
        sampleCondition,
        sampleConditionNotes,
        specimen: {
          type: selectedTestId,
          quantity: specimenQuantity,
          container: specimenContainer,
          remarks: specimenRemarks,
          parameters: parameters.filter(
            (p) => p.name.trim() && p.result.trim(),
          ),
        },
        results: {
          parameters: validTestParameters.map((p) => ({
            name: p.name,
            value: p.value,
            unit: p.unit,
            normalRange: p.normalRange,
            remarks: p.remarks,
          })),
        },
      };

      console.log("Submitting sample data:", payload);

      const response = await fetch(
        `/api/laboratory/tests/${params.id}/collect`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      const data = await response.json();

      if (response.ok) {
        alert(data.message || "Sample collected successfully!");
        router.push(`/laboratory/tests/${params.id}`);
      } else {
        throw new Error(data.error || "Failed to collect sample");
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Check conditions - Collect Sample is now the LAST step
  const condition1 = test?.status !== "cancelled";
  const condition2 = test?.paymentVerified || test?.priority !== "routine";
  const condition3 = test?.collectionStatus !== "collected";

  const canCollectSample = condition1 && condition2 && condition3;
  const requiresPaymentVerification =
    test?.priority === "routine" && !test?.paymentVerified;

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <Skeleton className="h-8 w-64 mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-96 lg:col-span-2" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (error || !test) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Sample Collection</h1>
        </div>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error || "Failed to load test information. Please try again."}
          </AlertDescription>
        </Alert>
        <Button
          onClick={() => router.push("/laboratory/tests")}
          className="mt-4"
        >
          Back to Tests
        </Button>
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
            Collect Sample
          </h1>
          <p className="text-muted-foreground">
            Collect specimen for test: {test.testName}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Show warnings but don't hide form */}
          {requiresPaymentVerification && (
            <Alert className="border border-yellow-200 dark:border-yellow-800 bg-card">
              <CreditCard className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              <AlertTitle className="text-yellow-800 dark:text-yellow-300">
                Payment Verification Required
              </AlertTitle>
              <AlertDescription className="text-yellow-700 dark:text-yellow-400">
                This routine test requires payment verification before sample
                collection.
                {canSeePrices(user?.role) && test.charges.due > 0 && (
                  <span className="block mt-1 font-medium">
                    Payment due: ₹{test.charges.due}
                  </span>
                )}
              </AlertDescription>
              <Button
                variant="outline"
                className="mt-2 border-yellow-300 dark:border-yellow-700 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/30"
                onClick={() =>
                  router.push(`/laboratory/tests/${params.id}/verify-payment`)
                }
              >
                Verify Payment Now
              </Button>
            </Alert>
          )}

          {!canCollectSample && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Cannot Collect Sample Yet</AlertTitle>
              <AlertDescription>
                Please ensure:
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li>Payment is verified (for routine tests)</li>
                  <li>Sample has not been collected yet</li>
                  <li>Test is not cancelled</li>
                </ul>
                <div className="mt-2 text-sm">
                  <p>Current status:</p>
                  <ul className="list-disc pl-5">
                    <li>
                      Payment Verified: {test.paymentVerified ? "Yes" : "No"}
                    </li>
                    <li>Collection Status: {test.collectionStatus}</li>
                    <li>Test Status: {test.status}</li>
                    <li>Priority: {test.priority}</li>
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          )}
          {/* FORM */}
          <form onSubmit={handleSubmit} className="space-y-6 relative">
            {/* Disabled overlay when can't collect */}
            {!canCollectSample && (
              <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 rounded-lg flex items-center justify-center">
                <div className="text-center p-6 bg-card border rounded-lg shadow-lg">
                  <AlertTriangle className="h-12 w-12 mx-auto text-yellow-500 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Form Disabled</h3>
                  <p className="text-muted-foreground mb-4">
                    Complete the requirements above to enable sample collection
                  </p>
                  {requiresPaymentVerification && (
                    <Button
                      variant="default"
                      onClick={() =>
                        router.push(
                          `/laboratory/tests/${params.id}/verify-payment`,
                        )
                      }
                    >
                      Verify Payment
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TestTube className="h-5 w-5" />
                  Sample Information
                </CardTitle>
                <CardDescription>
                  Basic sample collection details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Sample ID */}
                <div className="space-y-2">
                  <Label htmlFor="sampleId">Sample ID</Label>
                  <div className="flex gap-2">
                    <Input
                      id="sampleId"
                      value={sampleId}
                      onChange={(e) => setSampleId(e.target.value)}
                      placeholder="Enter sample ID"
                      required
                      disabled={!canCollectSample}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        const date = new Date();
                        const year = date.getFullYear().toString().slice(-2);
                        const month = (date.getMonth() + 1)
                          .toString()
                          .padStart(2, "0");
                        const day = date.getDate().toString().padStart(2, "0");
                        const random = Math.floor(1000 + Math.random() * 9000);
                        setSampleId(`SMP${year}${month}${day}${random}`);
                      }}
                      disabled={!canCollectSample}
                    >
                      Generate
                    </Button>
                  </div>
                </div>

                {/* Sample Condition */}
                <div className="space-y-2">
                  <Label htmlFor="sampleCondition">Sample Condition</Label>
                  <Select
                    value={sampleCondition}
                    onValueChange={setSampleCondition}
                    disabled={!canCollectSample}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select sample condition" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="satisfactory">Satisfactory</SelectItem>
                      <SelectItem value="hemolyzed">Hemolyzed</SelectItem>
                      <SelectItem value="clotted">Clotted</SelectItem>
                      <SelectItem value="insufficient">
                        Insufficient Volume
                      </SelectItem>
                      <SelectItem value="contaminated">Contaminated</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Sample Condition Notes */}
                {sampleCondition !== "satisfactory" && (
                  <div className="space-y-2">
                    <Label htmlFor="sampleConditionNotes">
                      Condition Notes
                    </Label>
                    <Textarea
                      id="sampleConditionNotes"
                      value={sampleConditionNotes}
                      onChange={(e) => setSampleConditionNotes(e.target.value)}
                      placeholder="Describe the sample condition issue..."
                      rows={3}
                      disabled={!canCollectSample}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
            {/* Specimen Details */}
            <Card>
              <CardHeader>
                <CardTitle>Specimen Details</CardTitle>
                <CardDescription>
                  Select test type and provide details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="specimenType">Test Type *</Label>
                    <Select
                      value={selectedTestId}
                      onValueChange={setSelectedTestId}
                      disabled={!canCollectSample}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select test type" />
                      </SelectTrigger>
                      <SelectContent>
                        {labTests.map((category) => (
                          <div key={category.name}>
                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
                              {category.name}
                            </div>
                            {category.tests.map((test) => (
                              <SelectItem key={test.id} value={test.id}>
                                {test.name}
                              </SelectItem>
                            ))}
                          </div>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="specimenQuantity">Quantity</Label>
                    <Input
                      id="specimenQuantity"
                      value={specimenQuantity}
                      onChange={(e) => setSpecimenQuantity(e.target.value)}
                      placeholder="e.g., 5ml, 10g"
                      disabled={!canCollectSample}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="specimenContainer">Container</Label>
                    <Input
                      id="specimenContainer"
                      value={specimenContainer}
                      onChange={(e) => setSpecimenContainer(e.target.value)}
                      placeholder="e.g., EDTA tube, sterile container"
                      disabled={!canCollectSample}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="specimenRemarks">Specimen Remarks</Label>
                  <Textarea
                    id="specimenRemarks"
                    value={specimenRemarks}
                    onChange={(e) => setSpecimenRemarks(e.target.value)}
                    placeholder="Any special instructions or observations..."
                    rows={2}
                    disabled={!canCollectSample}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Dynamic Parameters */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Sample Parameters</span>
                  <Button
                    type="button"
                    onClick={addParameter}
                    variant="outline"
                    size="sm"
                    disabled={!canCollectSample}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Parameter
                  </Button>
                </CardTitle>
                <CardDescription>
                  Record test parameters with name, unit, normal range, and
                  result
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {parameters.map((param) => (
                    <div
                      key={param.id}
                      className="p-4 border rounded-lg space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium">Parameter</h3>
                        {parameters.length > 1 && (
                          <Button
                            type="button"
                            onClick={() => removeParameter(param.id)}
                            variant="ghost"
                            size="sm"
                            className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                            disabled={!canCollectSample}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div className="space-y-2">
                          <Label>Parameter Name</Label>
                          <Input
                            value={param.name}
                            onChange={(e) =>
                              updateParameter(param.id, "name", e.target.value)
                            }
                            placeholder="e.g., Volume, Color, pH"
                            disabled={!canCollectSample}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Result</Label>
                          <Input
                            value={param.result}
                            onChange={(e) =>
                              updateParameter(
                                param.id,
                                "result",
                                e.target.value,
                              )
                            }
                            placeholder="Enter result"
                            disabled={!canCollectSample}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Unit</Label>
                          <Input
                            value={param.unit}
                            onChange={(e) =>
                              updateParameter(param.id, "unit", e.target.value)
                            }
                            placeholder="e.g., ml, g, pH"
                            disabled={!canCollectSample}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Normal Range</Label>
                          <Input
                            value={param.normalRange}
                            onChange={(e) =>
                              updateParameter(
                                param.id,
                                "normalRange",
                                e.target.value,
                              )
                            }
                            placeholder="e.g., 4.5-11.0"
                            disabled={!canCollectSample}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 text-sm text-muted-foreground">
                  <p>
                    Parameters include name, unit, normal range, and result
                    fields. Default parameters are pre-filled based on the
                    selected test type. You can add, remove, or modify them.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Test Parameters (Results) */}
            <Card className="border-blue-200 dark:border-blue-800">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <TestTube className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    Test Parameters (Results)
                  </span>
                  <Button
                    type="button"
                    onClick={addTestParameter}
                    variant="outline"
                    size="sm"
                    disabled={!canCollectSample}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Parameter
                  </Button>
                </CardTitle>
                <CardDescription>
                  Enter test result values with parameter name, value, unit,
                  normal range, and remarks
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {testParameters.map((param, index) => (
                    <div
                      key={param.id}
                      className="p-4 border rounded-lg space-y-4 bg-blue-50/50 dark:bg-blue-950/20"
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium">Parameter #{index + 1}</h3>
                        {testParameters.length > 1 && (
                          <Button
                            type="button"
                            onClick={() => removeTestParameter(param.id)}
                            variant="ghost"
                            size="sm"
                            className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                            disabled={!canCollectSample}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Parameter Name *</Label>
                          <Input
                            value={param.name}
                            onChange={(e) =>
                              updateTestParameter(
                                param.id,
                                "name",
                                e.target.value,
                              )
                            }
                            placeholder="e.g., Hemoglobin, WBC Count"
                            disabled={!canCollectSample}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Value *</Label>
                          <Input
                            value={param.value}
                            onChange={(e) =>
                              updateTestParameter(
                                param.id,
                                "value",
                                e.target.value,
                              )
                            }
                            placeholder="Enter test result value"
                            disabled={!canCollectSample}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Unit</Label>
                          <Input
                            value={param.unit}
                            onChange={(e) =>
                              updateTestParameter(
                                param.id,
                                "unit",
                                e.target.value,
                              )
                            }
                            placeholder="e.g., g/dL, cells/μL"
                            disabled={!canCollectSample}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Normal Range</Label>
                          <Input
                            value={param.normalRange}
                            onChange={(e) =>
                              updateTestParameter(
                                param.id,
                                "normalRange",
                                e.target.value,
                              )
                            }
                            placeholder="e.g., 13.5-17.5 g/dL"
                            disabled={!canCollectSample}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Remarks</Label>
                        <Textarea
                          value={param.remarks}
                          onChange={(e) =>
                            updateTestParameter(
                              param.id,
                              "remarks",
                              e.target.value,
                            )
                          }
                          placeholder="Any additional remarks or notes..."
                          rows={2}
                          disabled={!canCollectSample}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 text-sm text-muted-foreground">
                  <p>
                    Test parameters include the actual test results. Parameter
                    Name and Value are required. Unit, Normal Range, and Remarks
                    are optional.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Submit Button */}
            <div className="flex gap-2">
              <Button
                type="submit"
                disabled={submitting || !canCollectSample}
                className="flex-1"
                size="lg"
              >
                {submitting ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Collecting Sample...
                  </>
                ) : (
                  <>
                    <TestTube className="h-4 w-4 mr-2" />
                    {canCollectSample
                      ? "Collect Sample"
                      : "Complete Requirements First"}
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                size="lg"
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>

        {/* Sidebar - Test Information */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Test Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Test ID</p>
                <p className="font-medium">{test.testId}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Test Name</p>
                <p className="font-medium">{test.testName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge
                  variant={
                    test.collectionStatus === "pending"
                      ? "secondary"
                      : test.collectionStatus === "scheduled"
                        ? "default"
                        : "outline"
                  }
                >
                  {test.collectionStatus}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Priority</p>
                <Badge
                  variant={
                    test.priority === "emergency"
                      ? "destructive"
                      : test.priority === "urgent"
                        ? "default"
                        : "secondary"
                  }
                >
                  {test.priority}
                </Badge>
              </div>
              {test.specimen?.type && (
                <div>
                  <p className="text-sm text-muted-foreground">Test Type</p>
                  <p className="font-medium">
                    {(() => {
                      const testType = labTests
                        .flatMap((category) => category.tests)
                        .find((t) => t.id === test.specimen?.type);
                      return testType ? testType.name : test.specimen.type;
                    })()}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Patient Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium">{test.patient.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Patient ID</p>
                <p className="font-medium">{test.patient.patientId}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Age</p>
                <p className="font-medium">
                  {test.patient.age ? `${test.patient.age} years` : "N/A"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Gender</p>
                <p className="font-medium capitalize">
                  {test.patient.gender || "N/A"}
                </p>
              </div>
              {test.patient.phone && (
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{test.patient.phone}</p>
                </div>
              )}
              {test.patient.dateOfBirth && (
                <div>
                  <p className="text-sm text-muted-foreground">Date of Birth</p>
                  <p className="font-medium">
                    {formatDate(test.patient.dateOfBirth)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Stethoscope className="h-5 w-5" />
                Doctor Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Doctor</p>
                <p className="font-medium">{getDoctorName(test)}</p>
              </div>
              {test.orderedBy && (
                <div>
                  <p className="text-sm text-muted-foreground">Ordered By</p>
                  <p className="font-medium">
                    {test.orderedBy.name}
                    {test.orderedBy.role && ` (${test.orderedBy.role})`}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Payment Status</p>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      test.paymentVerified
                        ? "default"
                        : test.charges.paymentStatus === "paid"
                          ? "default"
                          : test.charges.paymentStatus === "partial"
                            ? "secondary"
                            : "destructive"
                    }
                  >
                    {test.paymentVerified
                      ? "Verified"
                      : test.charges.paymentStatus}
                  </Badge>
                  {test.paymentVerified && (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  )}
                </div>
              </div>
              {canSeePrices(user?.role) && (
                <>
                  <div>
                    <p className="text-sm text-muted-foreground">Paid Amount</p>
                    <p className="font-medium text-green-600 dark:text-green-400">
                      ₹{test.charges.paid}
                    </p>
                  </div>
                  {test.charges.due > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Due Amount
                      </p>
                      <p className="font-medium text-red-600 dark:text-red-400">
                        ₹{test.charges.due}
                      </p>
                    </div>
                  )}
                </>
              )}
              {test.priority === "routine" && !test.paymentVerified && (
                <Alert variant="destructive" className="mt-2">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Payment verification required for routine tests
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
