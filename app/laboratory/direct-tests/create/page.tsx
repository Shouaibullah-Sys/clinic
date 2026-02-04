// app/laboratory/direct-tests/create/page.tsx

"use client";

import { useState, useEffect } from "react";
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
  ChevronDown,
  ChevronUp,
  Filter,
  Sparkles,
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { toast } from "sonner";

interface Patient {
  _id: string;
  name: string;
  patientId: string;
  phone?: string;
  email?: string;
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

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedTestId, setSelectedTestId] = useState<string>("");
  const [selectedTest, setSelectedTest] = useState<LabTest | null>(null);
  const [priority, setPriority] = useState<"routine" | "urgent" | "emergency">(
    "routine",
  );
  const [notes, setNotes] = useState("");

  const [testParameters, setTestParameters] = useState<TestParameter[]>([
    { id: "1", name: "", value: "", unit: "", normalRange: "", remarks: "" },
  ]);

  // Smart Search states
  const [patientSearchQuery, setPatientSearchQuery] = useState("");
  const [patientSearchResults, setPatientSearchResults] = useState<Patient[]>(
    [],
  );
  const [searchingPatients, setSearchingPatients] = useState(false);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const [recentPatients, setRecentPatients] = useState<Patient[]>([]);
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(
    null,
  );

  // Test search states
  const [testSearchQuery, setTestSearchQuery] = useState("");
  const [testSearchResults, setTestSearchResults] = useState<LabTest[]>([]);
  const [showTestDropdown, setShowTestDropdown] = useState(false);
  const [popularTests, setPopularTests] = useState<LabTest[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<{
    [key: string]: boolean;
  }>({});

  // New patient creation state
  const [showCreatePatientDialog, setShowCreatePatientDialog] = useState(false);
  const [creatingPatient, setCreatingPatient] = useState(false);
  const [newPatient, setNewPatient] = useState({
    name: "",
    phone: "",
    email: "",
    dateOfBirth: "",
    gender: "",
    address: "",
  });

  // Load recent patients on component mount
  useEffect(() => {
    loadRecentPatients();
    loadPopularTests();

    // Initialize all categories as expanded by default
    const initialExpanded: { [key: string]: boolean } = {};
    labTests.forEach((category) => {
      initialExpanded[category.name] = true;
    });
    setExpandedCategories(initialExpanded);
  }, []);

  const loadRecentPatients = async () => {
    try {
      if (!accessToken) return;

      const response = await fetch("/api/patients/recent?limit=5", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setRecentPatients(data.data || []);
      }
    } catch (err) {
      console.error("Error loading recent patients:", err);
    }
  };

  const loadPopularTests = () => {
    // Simulate popular tests - in a real app, this would come from an API
    const popular = [
      labTests.flatMap((c) => c.tests).find((t) => t.id === "h1")!, // CBC
      labTests.flatMap((c) => c.tests).find((t) => t.id === "cc6")!, // LFT
      labTests.flatMap((c) => c.tests).find((t) => t.id === "cc7")!, // KFT
      labTests.flatMap((c) => c.tests).find((t) => t.id === "cc5")!, // Lipid Profile
      labTests.flatMap((c) => c.tests).find((t) => t.id === "cp1")!, // Urine Routine
    ].filter(Boolean);
    setPopularTests(popular);
  };

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

  // Smart test search - update testSearchResults for dropdown
  useEffect(() => {
    if (testSearchQuery.trim() === "") {
      setTestSearchResults([]);
      setShowTestDropdown(false);
      return;
    }

    const query = testSearchQuery.toLowerCase().trim();
    const results: LabTest[] = [];

    labTests.forEach((category) => {
      category.tests.forEach((test) => {
        const testName = test.name.toLowerCase();
        const categoryName = category.name.toLowerCase();

        // Smart matching: check for partial matches, acronyms, etc.
        const words = testName.split(/\s+/);
        const acronym = words.map((w) => w[0]).join("");

        if (
          testName.includes(query) ||
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
    setShowTestDropdown(results.length > 0);
  }, [testSearchQuery]);

  // Handle test selection change - populate test parameters
  useEffect(() => {
    if (selectedTestId) {
      const test = labTests
        .flatMap((category) => category.tests)
        .find((t) => t.id === selectedTestId);
      if (test) {
        setSelectedTest(test);
        setTestParameters(
          test.parameters.map((p) => ({
            id: p.id,
            name: p.name,
            value: "",
            unit: p.unit,
            normalRange: p.normalRange,
            remarks: "",
          })),
        );
      } else {
        setSelectedTest(null);
        setTestParameters([
          {
            id: "1",
            name: "",
            value: "",
            unit: "",
            normalRange: "",
            remarks: "",
          },
        ]);
      }
    } else {
      setSelectedTest(null);
      setTestParameters([
        {
          id: "1",
          name: "",
          value: "",
          unit: "",
          normalRange: "",
          remarks: "",
        },
      ]);
    }
  }, [selectedTestId]);

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
    setPatientSearchQuery(patient.name);
    setShowPatientDropdown(false);
    setPatientSearchResults([]);
  };

  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPatient.name || !newPatient.phone) {
      toast.error("Name and phone are required");
      return;
    }

    try {
      setCreatingPatient(true);

      const response = await fetch("/api/patients", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newPatient.name,
          phone: newPatient.phone,
          email: newPatient.email || undefined,
          dateOfBirth: newPatient.dateOfBirth || undefined,
          gender: newPatient.gender || undefined,
          address: newPatient.address || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create patient");
      }

      const data = await response.json();
      toast.success("Patient created successfully");

      setSelectedPatient(data.data);
      setPatientSearchQuery(data.data.name);
      setShowCreatePatientDialog(false);
      loadRecentPatients();

      setNewPatient({
        name: "",
        phone: "",
        email: "",
        dateOfBirth: "",
        gender: "",
        address: "",
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to create patient");
    } finally {
      setCreatingPatient(false);
    }
  };

  const handleSelectTest = (testId: string) => {
    setSelectedTestId(testId);
    setTestSearchQuery("");
    setShowTestDropdown(false);
  };

  const toggleCategory = (categoryName: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryName]: !prev[categoryName],
    }));
  };

  const handleClearSearch = () => {
    setTestSearchQuery("");
    setTestSearchResults([]);
    setShowTestDropdown(false);
  };

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

    if (!selectedPatient) {
      toast.error("Please select a patient");
      return;
    }

    if (!selectedTestId) {
      toast.error("Please select a test type");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const validTestParameters = testParameters.filter(
        (p) => p.name.trim() && p.value.trim(),
      );

      const payload = {
        patientId: selectedPatient._id,
        testName: selectedTest?.name,
        category: labTests
          .find((cat) => cat.tests.some((t) => t.id === selectedTestId))
          ?.name.replace(/\s+/g, "_")
          .toLowerCase(),
        price: selectedTest?.price,
        priority,
        notes: notes || undefined,
        specimenType: selectedTestId,
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

      const response = await fetch("/api/laboratory/direct-tests", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create direct lab test");
      }

      const data = await response.json();
      toast.success("Direct lab test created successfully");
      router.push(`/laboratory/direct-tests/${data.data._id}`);
    } catch (err: any) {
      setError(err.message || "Failed to create direct lab test");
      toast.error(err.message || "Failed to create direct lab test");
    } finally {
      setSubmitting(false);
    }
  };

  // FIX 1: Show all tests by default
  // FIX 2: When searching, filter tests but still show them
  const filteredTests = labTests.map((category) => {
    if (!testSearchQuery) {
      // When no search query, show all tests
      return {
        ...category,
        tests: category.tests,
      };
    }

    const query = testSearchQuery.toLowerCase();
    const filteredCategoryTests = category.tests.filter(
      (test) =>
        test.name.toLowerCase().includes(query) ||
        test.id.toLowerCase().includes(query) ||
        category.name.toLowerCase().includes(query),
    );

    return {
      ...category,
      tests: filteredCategoryTests,
    };
  });

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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Patient and Test Selection */}
          <div className="lg:col-span-2 space-y-6">
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
                <div className="relative">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, phone, or patient ID..."
                      className="pl-9 pr-9"
                      value={patientSearchQuery}
                      onChange={(e) => setPatientSearchQuery(e.target.value)}
                      onFocus={() => {
                        if (
                          patientSearchQuery.length >= 2 ||
                          recentPatients.length > 0
                        ) {
                          setShowPatientDropdown(true);
                        }
                      }}
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
                          setSelectedPatient(null);
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
                </div>

                {/* Patient Dropdown with Smart Features */}
                {showPatientDropdown && (
                  <div className="border rounded-md shadow-sm bg-background overflow-hidden">
                    {/* Recent Patients */}
                    {!patientSearchQuery && recentPatients.length > 0 && (
                      <div className="border-b">
                        <div className="px-3 py-2 bg-muted/50 text-xs font-medium text-muted-foreground">
                          Recent Patients
                        </div>
                        {recentPatients.map((patient) => (
                          <button
                            key={patient._id}
                            type="button"
                            className="w-full text-left px-3 py-2 hover:bg-accent transition-colors flex items-center gap-3"
                            onClick={() => handleSelectPatient(patient)}
                          >
                            <User className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium">{patient.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {patient.patientId}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Search Results */}
                    {patientSearchResults.length > 0 && (
                      <div>
                        <div className="px-3 py-2 bg-muted/50 text-xs font-medium text-muted-foreground">
                          Search Results
                        </div>
                        {patientSearchResults.map((patient) => (
                          <button
                            key={patient._id}
                            type="button"
                            className="w-full text-left px-3 py-2 hover:bg-accent transition-colors flex items-center justify-between"
                            onClick={() => handleSelectPatient(patient)}
                          >
                            <div className="flex items-center gap-3">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <div className="font-medium">
                                  {patient.name}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {patient.patientId} • {patient.phone}
                                </div>
                              </div>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              Select
                            </Badge>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* No Results */}
                    {patientSearchQuery &&
                      patientSearchResults.length === 0 &&
                      !searchingPatients && (
                        <div className="p-4 text-center">
                          <p className="text-sm text-muted-foreground mb-3">
                            No patients found matching "{patientSearchQuery}"
                          </p>
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full"
                            onClick={() => setShowCreatePatientDialog(true)}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Create New Patient
                          </Button>
                        </div>
                      )}
                  </div>
                )}

                {/* Selected Patient */}
                {selectedPatient && (
                  <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-md border border-green-200 dark:border-green-800">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <div>
                          <div className="font-medium">
                            {selectedPatient.name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Patient ID: {selectedPatient.patientId}
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
                {/* Smart Test Search */}
                <div className="relative">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search tests (e.g., 'cbc', 'liver', 'urine routine')..."
                      className="pl-9 pr-9"
                      value={testSearchQuery}
                      onChange={(e) => setTestSearchQuery(e.target.value)}
                      onFocus={() => setShowTestDropdown(true)}
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
                  </div>

                  {/* Smart Test Search Dropdown */}
                  {showTestDropdown && testSearchResults.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 border rounded-md shadow-lg bg-background max-h-80 overflow-y-auto">
                      <div className="p-2 border-b">
                        <div className="text-xs font-medium text-muted-foreground px-2">
                          Quick Results ({testSearchResults.length})
                        </div>
                      </div>
                      {testSearchResults.map((test) => {
                        const category = labTests.find((cat) =>
                          cat.tests.some((t) => t.id === test.id),
                        )?.name;

                        return (
                          <button
                            key={test.id}
                            type="button"
                            className="w-full text-left px-4 py-3 hover:bg-accent transition-colors border-b last:border-b-0"
                            onClick={() => handleSelectTest(test.id)}
                          >
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex-1">
                                <div className="font-medium">{test.name}</div>
                                <div className="text-sm text-muted-foreground">
                                  {category} • {test.parameters.length}{" "}
                                  parameters
                                </div>
                              </div>
                              <Badge variant="secondary" className="text-xs">
                                ₹{test.price}
                              </Badge>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Popular Tests */}
                {!testSearchQuery && popularTests.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Filter className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Popular Tests</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {popularTests.map((test) => (
                        <Badge
                          key={test.id}
                          variant="outline"
                          className="cursor-pointer hover:bg-accent transition-colors"
                          onClick={() => handleSelectTest(test.id)}
                        >
                          {test.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Test Categories - FIXED: Show all tests by default, filter when searching */}
                <div className="border rounded-md overflow-hidden">
                  {filteredTests.map((category) => {
                    const isExpanded =
                      expandedCategories[category.name] !== false;

                    // Show category only if it has tests or if we're not searching
                    if (category.tests.length === 0 && testSearchQuery)
                      return null;

                    return (
                      <div key={category.name}>
                        <button
                          type="button"
                          className="w-full px-4 py-3 flex items-center justify-between hover:bg-accent transition-colors border-b bg-muted/30"
                          onClick={() => toggleCategory(category.name)}
                        >
                          <div className="flex items-center gap-3">
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            )}
                            <span className="font-medium">{category.name}</span>
                            <Badge variant="secondary" className="text-xs">
                              {category.tests.length}
                            </Badge>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {isExpanded
                              ? "Click to collapse"
                              : "Click to expand"}
                          </span>
                        </button>

                        {isExpanded && (
                          <div className="bg-background">
                            {category.tests.map((test) => (
                              <button
                                key={test.id}
                                type="button"
                                className={`w-full text-left px-4 py-3 hover:bg-accent transition-colors border-b last:border-b-0 flex items-center justify-between ${
                                  selectedTestId === test.id ? "bg-accent" : ""
                                }`}
                                onClick={() => handleSelectTest(test.id)}
                              >
                                <div className="flex-1">
                                  <div className="font-medium">{test.name}</div>
                                  <div className="text-sm text-muted-foreground">
                                    {test.parameters.length} parameters
                                  </div>
                                </div>
                                <div className="flex items-center gap-4">
                                  <Badge variant="outline" className="text-xs">
                                    ₹{test.price}
                                  </Badge>
                                  {selectedTestId === test.id && (
                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                  )}
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Show message when no tests match search */}
                  {testSearchQuery &&
                    filteredTests.every((cat) => cat.tests.length === 0) && (
                      <div className="p-8 text-center text-muted-foreground">
                        <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No tests found matching "{testSearchQuery}"</p>
                        <p className="text-sm mt-1">
                          Try a different search term
                        </p>
                      </div>
                    )}
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
          </div>

          {/* Right Column - Test Details and Options */}
          <div className="space-y-6">
            {/* Selected Test Details */}
            {selectedTest && (
              <Card>
                <CardHeader>
                  <CardTitle>Test Details</CardTitle>
                  <CardDescription>
                    Review selected test details
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Test Name</Label>
                    <p className="font-medium mt-1">{selectedTest.name}</p>
                  </div>

                  <div>
                    <Label>Category</Label>
                    <div className="mt-1">
                      <Badge variant="outline">
                        {labTests.find((cat) =>
                          cat.tests.some((t) => t.id === selectedTestId),
                        )?.name || "General"}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Price</Label>
                      <p className="font-medium mt-1">₹{selectedTest.price}</p>
                    </div>
                    <div>
                      <Label>Parameters</Label>
                      <p className="font-medium mt-1 text-center">
                        {selectedTest.parameters.length}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Test Options */}
            <Card>
              <CardHeader>
                <CardTitle>Test Options</CardTitle>
                <CardDescription>
                  Configure additional test settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
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
                  <p className="text-xs text-muted-foreground mt-1">
                    Higher priority tests may be processed faster
                  </p>
                </div>

                <div>
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Add any additional notes or instructions..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Summary */}
            {selectedPatient && selectedTest && (
              <Card>
                <CardHeader>
                  <CardTitle>Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Patient
                    </span>
                    <span className="font-medium">{selectedPatient.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Test</span>
                    <span className="font-medium">{selectedTest.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Price</span>
                    <span className="font-medium">₹{selectedTest.price}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Priority
                    </span>
                    <Badge
                      variant="outline"
                      className={
                        priority === "emergency"
                          ? "border-red-300 text-red-700 bg-red-50 dark:bg-red-950/20 dark:text-red-400"
                          : priority === "urgent"
                            ? "border-orange-300 text-orange-700 bg-orange-50 dark:bg-orange-950/20 dark:text-orange-400"
                            : "border-green-300 text-green-700 bg-green-50 dark:bg-green-950/20 dark:text-green-400"
                      }
                    >
                      {priority.charAt(0).toUpperCase() + priority.slice(1)}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

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
            disabled={submitting || !selectedPatient || !selectedTestId}
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
                <Label htmlFor="patientPhone">
                  Phone <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="patientPhone"
                  type="tel"
                  value={newPatient.phone}
                  onChange={(e) =>
                    setNewPatient({ ...newPatient, phone: e.target.value })
                  }
                  placeholder="Enter phone number"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="patientEmail">Email</Label>
                <Input
                  id="patientEmail"
                  type="email"
                  value={newPatient.email}
                  onChange={(e) =>
                    setNewPatient({ ...newPatient, email: e.target.value })
                  }
                  placeholder="Enter email address"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="patientGender">Gender</Label>
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
                <Label htmlFor="patientDateOfBirth">Date of Birth</Label>
                <Input
                  id="patientDateOfBirth"
                  type="date"
                  value={newPatient.dateOfBirth}
                  onChange={(e) =>
                    setNewPatient({
                      ...newPatient,
                      dateOfBirth: e.target.value,
                    })
                  }
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
