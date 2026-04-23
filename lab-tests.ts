// lab-tests.ts
// Lab test definitions with prices, normal ranges, and comments

export interface LabTest {
  name: string;
  price: number;
  normal_range: string;
  comment: string;
}

export interface LabTestCategory {
  category: string;
  tests: LabTest[];
}

export const labTestCategories: LabTestCategory[] = [
  {
    category: "Hematology",
    tests: [
      {
        name: "CBC",
        price: 150,
        normal_range:
          "Varies (Hb: M 13-17 g/dL, F 12-15 g/dL; WBC: 4-11 x10^9/L)",
        comment: "General blood screening test",
      },
      {
        name: "HGB",
        price: 100,
        normal_range: "M: 13-17 g/dL, F: 12-15 g/dL",
        comment: "Measures hemoglobin level",
      },
      {
        name: "ESR",
        price: 100,
        normal_range: "M: 0-15 mm/hr, F: 0-20 mm/hr",
        comment: "Inflammation marker",
      },
      {
        name: "Platelet Count",
        price: 100,
        normal_range: "150-400 x10^9/L",
        comment: "Clotting function",
      },
    ],
  },
  {
    category: "Biochemistry",
    tests: [
      {
        name: "FBS",
        price: 100,
        normal_range: "70-100 mg/dL",
        comment: "Fasting glucose",
      },
      {
        name: "RBS",
        price: 100,
        normal_range: "<140 mg/dL",
        comment: "Random glucose",
      },
      {
        name: "Creatinine",
        price: 100,
        normal_range: "0.6-1.3 mg/dL",
        comment: "Kidney function",
      },
      {
        name: "Urea",
        price: 100,
        normal_range: "15-45 mg/dL",
        comment: "Renal function",
      },
      {
        name: "ALT (SGPT)",
        price: 70,
        normal_range: "7-56 U/L",
        comment: "Liver enzyme",
      },
      {
        name: "AST (SGOT)",
        price: 70,
        normal_range: "10-40 U/L",
        comment: "Liver enzyme",
      },
    ],
  },
  {
    category: "Cardiac Markers",
    tests: [
      {
        name: "Troponin I",
        price: 600,
        normal_range: "<0.04 ng/mL",
        comment: "Heart attack marker",
      },
      {
        name: "Troponin T",
        price: 800,
        normal_range: "<0.01 ng/mL",
        comment: "Cardiac injury marker",
      },
      {
        name: "CK-MB",
        price: 300,
        normal_range: "<5 ng/mL",
        comment: "Cardiac enzyme",
      },
      {
        name: "BNP",
        price: 1000,
        normal_range: "<100 pg/mL",
        comment: "Heart failure marker",
      },
    ],
  },
  {
    category: "Thyroid",
    tests: [
      {
        name: "TSH",
        price: 300,
        normal_range: "0.4-4.0 mIU/L",
        comment: "Thyroid function",
      },
      {
        name: "T3",
        price: 300,
        normal_range: "80-200 ng/dL",
        comment: "Thyroid hormone",
      },
      {
        name: "T4",
        price: 300,
        normal_range: "5-12 µg/dL",
        comment: "Thyroid hormone",
      },
      {
        name: "Free T4",
        price: 600,
        normal_range: "0.8-1.8 ng/dL",
        comment: "Active thyroid hormone",
      },
    ],
  },
  {
    category: "Fertility / Hormones",
    tests: [
      {
        name: "Testosterone",
        price: 600,
        normal_range: "M: 300-1000 ng/dL",
        comment: "Male hormone",
      },
      {
        name: "FSH",
        price: 500,
        normal_range: "1.5-12.4 IU/L",
        comment: "Fertility hormone",
      },
      {
        name: "LH",
        price: 500,
        normal_range: "1.7-8.6 IU/L",
        comment: "Ovulation/testis function",
      },
      {
        name: "Prolactin",
        price: 500,
        normal_range: "4-15 ng/mL",
        comment: "Pituitary hormone",
      },
      {
        name: "AMH",
        price: 1800,
        normal_range: "1-4 ng/mL",
        comment: "Ovarian reserve",
      },
    ],
  },
  {
    category: "Diabetes",
    tests: [
      {
        name: "HbA1c",
        price: 400,
        normal_range: "<5.7%",
        comment: "3-month glucose control",
      },
      {
        name: "Insulin",
        price: 1200,
        normal_range: "2-25 µIU/mL",
        comment: "Pancreatic function",
      },
      {
        name: "C-Peptide",
        price: 1200,
        normal_range: "0.5-2.0 ng/mL",
        comment: "Endogenous insulin marker",
      },
    ],
  },
  {
    category: "Urine",
    tests: [
      {
        name: "Urine Analysis",
        price: 100,
        normal_range: "Normal: no protein, glucose, ketones",
        comment: "General urine test",
      },
      {
        name: "Urine Protein (24h)",
        price: 200,
        normal_range: "<150 mg/day",
        comment: "Kidney disease marker",
      },
    ],
  },
  {
    category: "PCR / Infectious",
    tests: [
      {
        name: "HBV PCR",
        price: 1800,
        normal_range: "Not detected",
        comment: "Hepatitis B viral load",
      },
      {
        name: "HCV PCR",
        price: 2000,
        normal_range: "Not detected",
        comment: "Hepatitis C viral load",
      },
      {
        name: "COVID-19 PCR",
        price: 2000,
        normal_range: "Negative",
        comment: "SARS-CoV-2 detection",
      },
    ],
  },
];
