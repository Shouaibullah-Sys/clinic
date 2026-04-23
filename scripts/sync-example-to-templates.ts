import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import mongoose from "mongoose";
import { LabTestTemplate } from "../lib/models/LabTestTemplate";
import { User } from "../lib/models/User";

interface ExampleTest {
  id: string;
  name: string;
  unit: string;
  normalRange: string;
  price: string;
  comment: string;
}

interface ExampleCategory {
  id: string;
  category: string;
  items: ExampleTest[];
}

const exampleData: ExampleCategory[] = [
  {
    id: "1",
    category: "Hematology",
    items: [
      { id: "1.1", name: "Reticulocyte Count", unit: "% of RBCs", normalRange: "0.5–1.5%", price: "700", comment: "" },
      { id: "1.2", name: "Sickle Cell Count", unit: "", normalRange: "Negative", price: "1500", comment: "" },
      { id: "1.3", name: "Coomb's Direct", unit: "", normalRange: "Negative", price: "700", comment: "" },
      { id: "1.4", name: "Coomb's Indirect", unit: "", normalRange: "Negative", price: "700", comment: "" },
      { id: "1.5", name: "Cross Matching", unit: "", normalRange: "Compatible", price: "200", comment: "" },
      { id: "1.6", name: "Hb. Electrophoresis", unit: "%", normalRange: "HbA >95%, HbA2 <3.5%, HbF <1%", price: "3000", comment: "" },
      { id: "1.7", name: "Protein Electrophoresis", unit: "g/dL", normalRange: "Total: 6.4–8.3, Albumin: 3.5–5.0", price: "3000", comment: "" },
      { id: "1.8", name: "Special Smear", unit: "", normalRange: "See report", price: "1200", comment: "" },
      { id: "1.9", name: "Osmotic Fragility Test", unit: "%", normalRange: "0.45–0.30% NaCl", price: "800", comment: "" },
      { id: "1.10", name: "G6PD", unit: "U/g Hb", normalRange: ">4.6", price: "1000", comment: "" },
    ],
  },
  {
    id: "2",
    category: "Pancreatic Profile",
    items: [
      { id: "2.1", name: "Amylase Level", unit: "U/L", normalRange: "30–110", price: "600", comment: "" },
      { id: "2.2", name: "Lipase Level", unit: "U/L", normalRange: "10–140", price: "600", comment: "" },
    ],
  },
  {
    id: "3",
    category: "Hormones and Immunoassay",
    items: [
      { id: "3.1", name: "T3", unit: "ng/dL", normalRange: "80–200", price: "600", comment: "" },
      { id: "3.2", name: "T4", unit: "µg/dL", normalRange: "5–12", price: "600", comment: "" },
      { id: "3.3", name: "TSH", unit: "µIU/mL", normalRange: "0.4–4.5", price: "600", comment: "" },
      { id: "3.4", name: "FT3", unit: "pg/mL", normalRange: "2.3–4.2", price: "800", comment: "" },
      { id: "3.5", name: "FT4", unit: "ng/dL", normalRange: "0.8–1.8", price: "800", comment: "" },
      { id: "3.6", name: "Hba1c", unit: "%", normalRange: "<5.7", price: "800", comment: "" },
      { id: "3.7", name: "TG (Thyroglobulin)", unit: "ng/mL", normalRange: "3–40", price: "2500", comment: "" },
      { id: "3.8", name: "Calcitonin", unit: "pg/mL", normalRange: "<10", price: "3000", comment: "" },
      { id: "3.9", name: "Anti TPO Ab", unit: "IU/mL", normalRange: "<35", price: "2500", comment: "" },
      { id: "3.10", name: "Anti TG Ab", unit: "IU/mL", normalRange: "<20", price: "2500", comment: "" },
      { id: "3.11", name: "TSH Receptor Ab", unit: "IU/L", normalRange: "<1.75", price: "3000", comment: "" },
      { id: "3.12", name: "PTH", unit: "pg/mL", normalRange: "15–65", price: "2000", comment: "" },
      { id: "3.13", name: "FSH", unit: "mIU/mL", normalRange: "Follicular: 3–10, Ovulatory: 5–20, Luteal: 1.5–9, Postmenopausal: >20", price: "1000", comment: "" },
      { id: "3.14", name: "LH", unit: "mIU/mL", normalRange: "Follicular: 2–9, Ovulatory: 10–60, Luteal: 1–9, Postmenopausal: >15", price: "1000", comment: "" },
      { id: "3.15", name: "Prolactin", unit: "ng/mL", normalRange: "Male: 2–18, Female: 3–30", price: "1200", comment: "" },
      { id: "3.16", name: "Testosterone Total", unit: "ng/dL", normalRange: "Male: 300–1000, Female: 15–70", price: "1200", comment: "" },
      { id: "3.17", name: "Testosterone Free", unit: "pg/mL", normalRange: "Male: 50–210, Female: 1–8", price: "2500", comment: "" },
      { id: "3.18", name: "Estradiol (E2)", unit: "pg/mL", normalRange: "Follicular: 20–150, Ovulatory: 100–500, Luteal: 60–200, Postmenopausal: <20", price: "1500", comment: "" },
      { id: "3.19", name: "Progesterone", unit: "ng/mL", normalRange: "Follicular: <1, Luteal: 5–20", price: "1000", comment: "" },
      { id: "3.20", name: "DHEA SO4", unit: "µg/dL", normalRange: "Male: 100–400, Female: 50–300", price: "3000", comment: "" },
      { id: "3.21", name: "AMH Level", unit: "ng/mL", normalRange: "1–3.5", price: "2500", comment: "" },
      { id: "3.22", name: "Beta HCG", unit: "mIU/mL", normalRange: "<5 (Non-pregnant)", price: "1000", comment: "" },
      { id: "3.23", name: "Sex Hormone Binding Globulin (SHBG)", unit: "nmol/L", normalRange: "Male: 10–60, Female: 20–130", price: "2500", comment: "" },
      { id: "3.24", name: "Dihydrotestosterone (DHT)", unit: "ng/dL", normalRange: "Male: 30–85, Female: 5–20", price: "2500", comment: "" },
      { id: "3.25", name: "Aldosterone", unit: "ng/dL", normalRange: "4–31", price: "3500", comment: "" },
      { id: "3.26", name: "Plasma Direct Renin", unit: "µIU/mL", normalRange: "5–50", price: "3500", comment: "" },
      { id: "3.27", name: "Aldosterone: Renin Ratio", unit: "", normalRange: "<30", price: "5000", comment: "" },
      { id: "3.28", name: "Cortisol", unit: "µg/dL", normalRange: "Morning: 5–25, Evening: 2–10", price: "1000", comment: "" },
      { id: "3.29", name: "ACTH", unit: "pg/mL", normalRange: "10–60", price: "2500", comment: "" },
      { id: "3.30", name: "17-OH Progesterone", unit: "ng/dL", normalRange: "Male: 30–200, Female Follicular: 15–70", price: "3000", comment: "" },
      { id: "3.31", name: "Growth Hormone", unit: "ng/mL", normalRange: "<5", price: "2500", comment: "" },
      { id: "3.32", name: "Insulin-Like Growth Factor 1 (IGF-1)", unit: "ng/mL", normalRange: "Age-dependent", price: "3000", comment: "" },
      { id: "3.33", name: "Insulin Fasting", unit: "µIU/mL", normalRange: "2–20", price: "2000", comment: "" },
      { id: "3.34", name: "C-Peptide", unit: "ng/mL", normalRange: "0.5–2.7", price: "2000", comment: "" },
      { id: "3.35", name: "Gastrin-17", unit: "pg/mL", normalRange: "<10", price: "3000", comment: "" },
    ],
  },
  {
    id: "4",
    category: "Coagulation Profile",
    items: [
      { id: "4.1", name: "PT/ INR", unit: "sec/INR", normalRange: "PT: 11–13.5, INR: 0.8–1.1", price: "400", comment: "" },
      { id: "4.2", name: "APTT", unit: "sec", normalRange: "25–35", price: "400", comment: "" },
      { id: "4.3", name: "Mixing Study", unit: "", normalRange: "Correction", price: "1800", comment: "" },
    ],
  },
  {
    id: "5",
    category: "Iron Profile",
    items: [
      { id: "5.1", name: "Iron Level", unit: "µg/dL", normalRange: "60–170", price: "1500", comment: "" },
      { id: "5.2", name: "Ferritin Level", unit: "ng/mL", normalRange: "Male: 20–250, Female: 10–150", price: "1500", comment: "" },
      { id: "5.3", name: "TIBC", unit: "µg/dL", normalRange: "250–400", price: "2000", comment: "" },
      { id: "5.4", name: "S.Transferrin", unit: "mg/dL", normalRange: "200–360", price: "2000", comment: "" },
    ],
  },
  {
    id: "6",
    category: "Routine Chemistry",
    items: [
      { id: "6.1", name: "Gamma GT", unit: "U/L", normalRange: "Male: 8–40, Female: 5–30", price: "500", comment: "" },
      { id: "6.2", name: "Total Protein", unit: "g/dL", normalRange: "6.4–8.3", price: "200", comment: "" },
      { id: "6.3", name: "Albumin", unit: "g/dL", normalRange: "3.5–5.0", price: "200", comment: "" },
      { id: "6.4", name: "Globulin", unit: "g/dL", normalRange: "2.0–3.5", price: "200", comment: "" },
      { id: "6.5", name: "A/G Ratio", unit: "", normalRange: "1.0–2.0", price: "200", comment: "" },
    ],
  },
  {
    id: "7",
    category: "Cardiac Enzymes",
    items: [
      { id: "7.1", name: "LDH", unit: "U/L", normalRange: "140–280", price: "500", comment: "" },
      { id: "7.2", name: "CPK", unit: "U/L", normalRange: "Male: 55–170, Female: 30–145", price: "500", comment: "" },
      { id: "7.3", name: "CK-MB", unit: "U/L", normalRange: "<5% of total CK", price: "500", comment: "" },
      { id: "7.4", name: "Troponin I", unit: "ng/mL", normalRange: "<0.04", price: "1000", comment: "" },
      { id: "7.5", name: "Troponin T", unit: "ng/mL", normalRange: "<0.01", price: "1000", comment: "" },
      { id: "7.6", name: "D-Dimer", unit: "ng/mL", normalRange: "<250", price: "1000", comment: "" },
      { id: "7.7", name: "Myoglobin", unit: "ng/mL", normalRange: "Male: 20–80, Female: 15–60", price: "2500", comment: "" },
      { id: "7.8", name: "Angiotensin Converting Enzyme (ACE)", unit: "U/L", normalRange: "8–52", price: "3000", comment: "" },
    ],
  },
  {
    id: "8",
    category: "Electrolytes and AGBs",
    items: [
      { id: "8.1", name: "Na, K, Cl", unit: "mmol/L", normalRange: "Na: 135–145, K: 3.5–5.1, Cl: 98–107", price: "800", comment: "" },
      { id: "8.2", name: "Calcium Ca", unit: "mg/dL", normalRange: "8.5–10.2", price: "200", comment: "" },
      { id: "8.3", name: "Mg", unit: "mg/dL", normalRange: "1.7–2.2", price: "200", comment: "" },
      { id: "8.4", name: "Phosphorus", unit: "mg/dL", normalRange: "2.5–4.5", price: "1000", comment: "" },
      { id: "8.5", name: "Zinc", unit: "µg/dL", normalRange: "70–120", price: "2000", comment: "" },
      { id: "8.6", name: "ABGs (18 parameters)", unit: "Various", normalRange: "pH: 7.35–7.45, pCO2: 35–45, pO2: 80–100, HCO3: 22–26", price: "2000", comment: "" },
    ],
  },
  {
    id: "9",
    category: "Vitamins",
    items: [
      { id: "9.1", name: "25 OH Vit D", unit: "ng/mL", normalRange: "30–100", price: "1500", comment: "" },
      { id: "9.2", name: "Vitamin B9 (Folic Acid)", unit: "ng/mL", normalRange: "5–20", price: "2000", comment: "" },
      { id: "9.3", name: "Vit B12", unit: "pg/mL", normalRange: "200–900", price: "1500", comment: "" },
    ],
  },
  {
    id: "10",
    category: "Screening By ELISA",
    items: [
      { id: "10.1", name: "TB-IGRA (CLIA)", unit: "", normalRange: "Negative", price: "4500", comment: "" },
      { id: "10.2", name: "Hbs Ag", unit: "", normalRange: "Non-reactive", price: "1000", comment: "" },
      { id: "10.3", name: "Hbs Ab", unit: "mIU/mL", normalRange: ">10 (Protective)", price: "1000", comment: "" },
      { id: "10.4", name: "Hbe Ag", unit: "", normalRange: "Non-reactive", price: "1500", comment: "" },
      { id: "10.5", name: "Hbe Ab", unit: "", normalRange: "Non-reactive", price: "1500", comment: "" },
      { id: "10.6", name: "Hbc Total", unit: "", normalRange: "Non-reactive", price: "1500", comment: "" },
      { id: "10.7", name: "Hbc IgM", unit: "", normalRange: "Non-reactive", price: "1800", comment: "" },
      { id: "10.8", name: "HCV Ab", unit: "", normalRange: "Non-reactive", price: "1500", comment: "" },
      { id: "10.9", name: "HEV IgG", unit: "", normalRange: "Non-reactive", price: "2500", comment: "" },
      { id: "10.10", name: "HEV IgM", unit: "", normalRange: "Non-reactive", price: "2500", comment: "" },
      { id: "10.11", name: "HDV IgG/IgM", unit: "", normalRange: "Non-reactive", price: "2500", comment: "" },
      { id: "10.12", name: "HIV Ab", unit: "", normalRange: "Non-reactive", price: "2000", comment: "" },
      { id: "10.13", name: "HAV IgG", unit: "", normalRange: "Non-reactive", price: "2000", comment: "" },
      { id: "10.14", name: "HAV IgM", unit: "", normalRange: "Non-reactive", price: "2000", comment: "" },
      { id: "10.15", name: "Brucella IgG", unit: "", normalRange: "<1:80", price: "750", comment: "" },
      { id: "10.16", name: "Brucella IgM", unit: "", normalRange: "<1:80", price: "750", comment: "" },
      { id: "10.17", name: "TORCH PROFILE", unit: "", normalRange: "Negative", price: "6400", comment: "" },
      { id: "10.18", name: "Toxo IgG", unit: "IU/mL", normalRange: "<8.8", price: "800", comment: "" },
      { id: "10.19", name: "Toxo IgM", unit: "", normalRange: "Negative", price: "800", comment: "" },
      { id: "10.20", name: "Rubella IgG", unit: "IU/mL", normalRange: ">10 (Immune)", price: "800", comment: "" },
      { id: "10.21", name: "Rubella IgM", unit: "", normalRange: "Negative", price: "800", comment: "" },
      { id: "10.22", name: "CMV IgG", unit: "IU/mL", normalRange: ">0.5 (Positive)", price: "800", comment: "" },
      { id: "10.23", name: "CMV IgM", unit: "", normalRange: "Negative", price: "800", comment: "" },
      { id: "10.24", name: "HSV IgG", unit: "", normalRange: "<0.9", price: "800", comment: "" },
      { id: "10.25", name: "HSV IgM", unit: "", normalRange: "Negative", price: "800", comment: "" },
      { id: "10.26", name: "EBV IgG/IgM", unit: "", normalRange: "See report", price: "4000", comment: "" },
      { id: "10.27", name: "Mumps IgG/IgM", unit: "", normalRange: "Negative", price: "4000", comment: "" },
      { id: "10.28", name: "Varicella IgG/IgM", unit: "", normalRange: "Negative", price: "6000", comment: "" },
      { id: "10.29", name: "Anti CCP", unit: "U/mL", normalRange: "<20", price: "1500", comment: "" },
      { id: "10.30", name: "Anti TP", unit: "", normalRange: "Non-reactive", price: "1500", comment: "" },
      { id: "10.31", name: "Anti Phospholipid IgG", unit: "U/mL", normalRange: "<20", price: "800", comment: "" },
      { id: "10.32", name: "Anti Phospholipid IgM", unit: "U/mL", normalRange: "<20", price: "800", comment: "" },
      { id: "10.33", name: "Anti Cardiolipin IgG", unit: "U/mL", normalRange: "<20", price: "900", comment: "" },
      { id: "10.34", name: "Anti Cardiolipin IgM", unit: "U/mL", normalRange: "<20", price: "900", comment: "" },
      { id: "10.35", name: "Beta-2 Glycoprotein IgG", unit: "U/mL", normalRange: "<20", price: "3000", comment: "" },
      { id: "10.36", name: "Beta-2 Glycoprotein IgM", unit: "U/mL", normalRange: "<20", price: "3000", comment: "" },
      { id: "10.37", name: "Lupus Anticoagulant", unit: "", normalRange: "Negative", price: "4000", comment: "" },
      { id: "10.38", name: "Immunoglobulin A", unit: "mg/dL", normalRange: "70–400", price: "2000", comment: "" },
      { id: "10.39", name: "Immunoglobulin M", unit: "mg/dL", normalRange: "40–230", price: "2000", comment: "" },
      { id: "10.40", name: "Immunoglobulin G", unit: "mg/dL", normalRange: "700–1600", price: "2000", comment: "" },
      { id: "10.41", name: "Total IgE", unit: "IU/mL", normalRange: "<100", price: "1500", comment: "" },
      { id: "10.42", name: "Anti Allergent Specific IgE", unit: "kU/L", normalRange: "<0.35", price: "4000", comment: "" },
      { id: "10.43", name: "CRP Quantitative", unit: "mg/dL", normalRange: "<0.5", price: "1000", comment: "" },
      { id: "10.44", name: "RA Factor Quantitative", unit: "IU/mL", normalRange: "<20", price: "1000", comment: "" },
      { id: "10.45", name: "ANA Quantitative", unit: "", normalRange: "<1:40", price: "1500", comment: "" },
      { id: "10.46", name: "cANCA", unit: "", normalRange: "<1:20", price: "6000", comment: "" },
      { id: "10.47", name: "pANCA", unit: "", normalRange: "<1:20", price: "3000", comment: "" },
      { id: "10.48", name: "Anti dsDNA", unit: "IU/mL", normalRange: "<30", price: "4000", comment: "" },
    ],
  },
  {
    id: "11",
    category: "Tumor Markers",
    items: [
      { id: "11.1", name: "AFP (Alpha Feto Protein)", unit: "ng/mL", normalRange: "<10", price: "2000", comment: "" },
      { id: "11.2", name: "CEA (Carcinoembryonic Ag)", unit: "ng/mL", normalRange: "<3", price: "2000", comment: "" },
      { id: "11.3", name: "Total PSA", unit: "ng/mL", normalRange: "<4", price: "1000", comment: "" },
      { id: "11.4", name: "Free PSA", unit: "ng/mL", normalRange: ">25% of total", price: "2500", comment: "" },
      { id: "11.5", name: "CA 125", unit: "U/mL", normalRange: "<35", price: "2000", comment: "" },
      { id: "11.6", name: "CA 19-9", unit: "U/mL", normalRange: "<37", price: "2000", comment: "" },
      { id: "11.7", name: "CA 15-3", unit: "U/mL", normalRange: "<30", price: "2000", comment: "" },
    ],
  },
  {
    id: "12",
    category: "Clinical Pathology",
    items: [
      { id: "12.1", name: "Stool Reducing Substances", unit: "", normalRange: "Negative", price: "500", comment: "" },
      { id: "12.2", name: "Urine Reducing Substances", unit: "", normalRange: "Negative", price: "100", comment: "" },
      { id: "12.3", name: "Urine Ketone Bodies", unit: "", normalRange: "Negative", price: "200", comment: "" },
      { id: "12.4", name: "Urine Bs, Bp", unit: "", normalRange: "Negative", price: "200", comment: "" },
      { id: "12.5", name: "A/C Ratio", unit: "", normalRange: "<30 mg/g", price: "1000", comment: "" },
      { id: "12.6", name: "24 Hour Urine CrCl", unit: "mL/min", normalRange: "90–140", price: "1200", comment: "" },
      { id: "12.7", name: "24 Hour Urine Protein", unit: "mg/24h", normalRange: "<150", price: "1000", comment: "" },
      { id: "12.8", name: "24 Hour Urine Albumin", unit: "mg/24h", normalRange: "<30", price: "1800", comment: "" },
      { id: "12.9", name: "24 Hour Urine Microalbumin", unit: "mg/24h", normalRange: "<30", price: "1800", comment: "" },
      { id: "12.10", name: "24 Hour Urine Uric Acid", unit: "mg/24h", normalRange: "250–750", price: "1500", comment: "" },
      { id: "12.11", name: "24 Hour Urine Urea", unit: "g/24h", normalRange: "15–30", price: "1200", comment: "" },
      { id: "12.12", name: "24 Hour Urine Copper", unit: "µg/24h", normalRange: "<60", price: "3500", comment: "" },
      { id: "12.13", name: "24 Hour Urine Oxalate", unit: "mg/24h", normalRange: "<45", price: "3000", comment: "" },
      { id: "12.14", name: "24 Hour Urine Ca", unit: "mg/24h", normalRange: "100–300", price: "1000", comment: "" },
      { id: "12.15", name: "24 Hour Urine Mg", unit: "mg/24h", normalRange: "24–255", price: "1200", comment: "" },
      { id: "12.16", name: "24 Hour Urine Na", unit: "mmol/24h", normalRange: "40–220", price: "1200", comment: "" },
      { id: "12.17", name: "24 Hour Urine Phosphorus", unit: "mg/24h", normalRange: "400–1300", price: "1200", comment: "" },
      { id: "12.18", name: "Bence Jones Protein", unit: "", normalRange: "Negative", price: "1200", comment: "" },
      { id: "12.19", name: "Urine Multi Drug Test", unit: "", normalRange: "Negative", price: "1200", comment: "" },
      { id: "12.20", name: "Urine Pregnancy Test", unit: "", normalRange: "Negative", price: "100", comment: "" },
      { id: "12.21", name: "Renal Stone Analysis", unit: "", normalRange: "See report", price: "2000", comment: "" },
    ],
  },
  {
    id: "13",
    category: "Histopathology",
    items: [
      { id: "13.1", name: "Small Biopsy", unit: "", normalRange: "See report", price: "2500", comment: "" },
      { id: "13.2", name: "Medium Biopsy", unit: "", normalRange: "See report", price: "3000", comment: "" },
      { id: "13.3", name: "Large Biopsy", unit: "", normalRange: "See report", price: "3500", comment: "" },
    ],
  },
  {
    id: "14",
    category: "Cytology",
    items: [
      { id: "14.1", name: "FNA Cytology", unit: "", normalRange: "See report", price: "2000", comment: "" },
      { id: "14.2", name: "Urine Cytology", unit: "", normalRange: "Negative for malignant cells", price: "2500", comment: "" },
      { id: "14.3", name: "Fecal Cytology", unit: "", normalRange: "See report", price: "2000", comment: "" },
      { id: "14.4", name: "CSF Cytology", unit: "", normalRange: "Negative for malignant cells", price: "2000", comment: "" },
      { id: "14.5", name: "Bronchial Wash Cytology", unit: "", normalRange: "See report", price: "1500", comment: "" },
      { id: "14.6", name: "Fluid Cytology", unit: "", normalRange: "See report", price: "2000", comment: "" },
      { id: "14.7", name: "Pap Smear", unit: "", normalRange: "Negative for intraepithelial lesion", price: "2000", comment: "" },
    ],
  },
  {
    id: "15",
    category: "Microbiology (Culture and Sensitivity)",
    items: [
      { id: "15.1", name: "AFB Culture", unit: "", normalRange: "No growth", price: "5000", comment: "" },
      { id: "15.2", name: "Tissue Culture and Sensitivity", unit: "", normalRange: "No growth", price: "2500", comment: "" },
      { id: "15.3", name: "Bone Marrow Culture and Sensitivity", unit: "", normalRange: "No growth", price: "2500", comment: "" },
      { id: "15.4", name: "H. Pylori Culture and Sensitivity", unit: "", normalRange: "No growth", price: "2000", comment: "" },
      { id: "15.5", name: "Blood Culture and Sensitivity", unit: "", normalRange: "No growth", price: "1500", comment: "" },
      { id: "15.6", name: "Urine Culture and Sensitivity", unit: "CFU/mL", normalRange: "<10,000", price: "1200", comment: "" },
      { id: "15.7", name: "Stool Culture and Sensitivity", unit: "", normalRange: "No pathogens", price: "1200", comment: "" },
      { id: "15.8", name: "Semen Culture and Sensitivity", unit: "", normalRange: "No growth", price: "1200", comment: "" },
      { id: "15.9", name: "Vaginal Culture and Sensitivity", unit: "", normalRange: "Normal flora", price: "1200", comment: "" },
      { id: "15.10", name: "Throat Culture and Sensitivity", unit: "", normalRange: "Normal flora", price: "1200", comment: "" },
      { id: "15.11", name: "Wound /Pus Swab Culture and Sensitivity", unit: "", normalRange: "No growth", price: "1200", comment: "" },
      { id: "15.12", name: "CSF Culture and Sensitivity", unit: "", normalRange: "No growth", price: "1200", comment: "" },
      { id: "15.13", name: "Pleural Fluid Culture and Sensitivity", unit: "", normalRange: "No growth", price: "1200", comment: "" },
      { id: "15.14", name: "Peritoneal Fluid Culture and Sensitivity", unit: "", normalRange: "No growth", price: "1200", comment: "" },
      { id: "15.15", name: "Synovial Fluid Culture and Sensitivity", unit: "", normalRange: "No growth", price: "1200", comment: "" },
      { id: "15.16", name: "Ear Swab Culture and Sensitivity", unit: "", normalRange: "No growth", price: "1200", comment: "" },
      { id: "15.17", name: "Eye Swab Culture and Sensitivity", unit: "", normalRange: "No growth", price: "1200", comment: "" },
      { id: "15.18", name: "Rectal Swab Culture and Sensitivity", unit: "", normalRange: "Normal flora", price: "1200", comment: "" },
      { id: "15.19", name: "Uretheral Swab Culture and Sensitivity", unit: "", normalRange: "No growth", price: "1200", comment: "" },
      { id: "15.20", name: "Kidney Fluid Culture and Sensitivity", unit: "", normalRange: "No growth", price: "1200", comment: "" },
      { id: "15.21", name: "Bronchial Wash Culture", unit: "", normalRange: "No growth", price: "1200", comment: "" },
      { id: "15.22", name: "Sputum Culture and Sensitivity", unit: "", normalRange: "Normal flora", price: "1200", comment: "" },
      { id: "15.23", name: "Fungal Culture and Sensitivity", unit: "", normalRange: "No growth", price: "1200", comment: "" },
      { id: "15.24", name: "Water Culture", unit: "", normalRange: "No growth", price: "1200", comment: "" },
      { id: "15.25", name: "Leishman Bodies", unit: "", normalRange: "Not seen", price: "300", comment: "" },
      { id: "15.26", name: "Gram Stain", unit: "", normalRange: "No organisms seen", price: "300", comment: "" },
      { id: "15.27", name: "ZN Stain", unit: "", normalRange: "No AFB seen", price: "300", comment: "" },
    ],
  },
  {
    id: "16",
    category: "Molecular Biology (PCR)",
    items: [
      { id: "16.1", name: "Hepatitis B Quantitative PCR", unit: "IU/mL", normalRange: "Not detected", price: "3500", comment: "" },
      { id: "16.2", name: "Hepatitis C Quantitative PCR", unit: "IU/mL", normalRange: "Not detected", price: "3500", comment: "" },
      { id: "16.3", name: "HCV Genotyping", unit: "", normalRange: "See report", price: "8000", comment: "" },
      { id: "16.4", name: "HDV Detection and Quantification", unit: "", normalRange: "Not detected", price: "6000", comment: "" },
      { id: "16.5", name: "HEV Detection and Quantification", unit: "", normalRange: "Not detected", price: "5000", comment: "" },
      { id: "16.6", name: "HIV Quantitative PCR", unit: "copies/mL", normalRange: "Not detected", price: "6000", comment: "" },
      { id: "16.7", name: "CMV Quantification", unit: "IU/mL", normalRange: "Not detected", price: "8000", comment: "" },
      { id: "16.8", name: "HSV1/2 Detection and Quantification", unit: "", normalRange: "Not detected", price: "5500", comment: "" },
      { id: "16.9", name: "HPV DNA Detection", unit: "", normalRange: "Not detected", price: "5000", comment: "" },
      { id: "16.10", name: "EPV Quantification", unit: "IU/mL", normalRange: "Not detected", price: "3500", comment: "" },
      { id: "16.11", name: "Genexpert MTB/RIF", unit: "", normalRange: "Not detected", price: "3000", comment: "" },
      { id: "16.12", name: "MTB DNA Detection", unit: "", normalRange: "Not detected", price: "4000", comment: "" },
      { id: "16.13", name: "JAK2 Gen Mutation", unit: "", normalRange: "Not detected", price: "7000", comment: "" },
      { id: "16.14", name: "Factor V Leiden Mutation Detection", unit: "", normalRange: "Not detected", price: "3500", comment: "" },
      { id: "16.15", name: "Chromosomal Analysis", unit: "", normalRange: "Normal karyotype", price: "8000", comment: "" },
      { id: "16.16", name: "HLA B 27", unit: "", normalRange: "Negative", price: "8000", comment: "" },
      { id: "16.17", name: "HLA 1/2 Donor Tissue Type", unit: "", normalRange: "See report", price: "20000", comment: "" },
      { id: "16.18", name: "HLA 1/2 Recipient Tissue Type", unit: "", normalRange: "See report", price: "20000", comment: "" },
      { id: "16.19", name: "Celiac HLA DQ Association", unit: "", normalRange: "See report", price: "1000", comment: "" },
    ],
  },
];

const categoryMap: Record<string, string> = {
  "Hematology": "hematology",
  "Pancreatic Profile": "biochemistry",
  "Hormones and Immunoassay": "hormonal",
  "Coagulation Profile": "hematology",
  "Iron Profile": "biochemistry",
  "Routine Chemistry": "biochemistry",
  "Cardiac Enzymes": "biochemistry",
  "Electrolytes and AGBs": "biochemistry",
  "Vitamins": "biochemistry",
  "Screening By ELISA": "serology",
  "Tumor Markers": "biochemistry",
  "Clinical Pathology": "urinalysis",
  "Histopathology": "microbiology",
  "Cytology": "microbiology",
  "Microbiology (Culture and Sensitivity)": "microbiology",
  "Molecular Biology (PCR)": "molecular",
};

function generateTestCode(name: string, categoryId: string): string {
  const prefix = categoryId.split('.')[0];
  const namePart = name
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .substring(0, 8);
  return `LT${prefix}_${namePart}`;
}

const MONGODB_URI = process.env.MONGODB_URI as string;

if (!MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable");
}

async function syncLabTestTemplates() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB successfully");

    const adminUser = await User.findOne({ role: "admin" });
    if (!adminUser) {
      console.error("No admin user found. Please create an admin user first.");
      process.exit(1);
    }
    console.log(`Using admin user: ${adminUser.name} (${adminUser._id})`);

    const existingTemplates = await LabTestTemplate.find({});
    console.log(`Found ${existingTemplates.length} existing templates in database`);

    const existingTestNames = new Set(existingTemplates.map(t => t.testName.toLowerCase()));

    let createdCount = 0;
    let skippedCount = 0;

    for (const category of exampleData) {
      const dbCategory = categoryMap[category.category] || "other";
      
      for (const item of category.items) {
        if (existingTestNames.has(item.name.toLowerCase())) {
          skippedCount++;
          continue;
        }

        const testCode = generateTestCode(item.name, item.id);
        
        const template = {
          testCode,
          testName: item.name,
          category: dbCategory,
          description: item.comment || `Test: ${item.name}`,
          specimenType: ["blood"] as string[],
          containerType: ["Plain tube"],
          sampleVolume: "2-3 mL",
          fastingRequired: false,
          preparationInstructions: "No special preparation required.",
          turnaroundTime: 24,
          basePrice: parseInt(item.price) || 500,
          active: true,
          parameters: [
            {
              parameterCode: `P${item.id.replace('.', '_')}`,
              parameterName: item.name,
              unit: item.unit,
              normalRange: item.normalRange,
              methodology: category.category,
            },
          ],
          createdBy: adminUser._id,
        };

        await LabTestTemplate.create(template);
        console.log(`Created: ${testCode} - ${item.name}`);
        createdCount++;
      }
    }

    console.log("\n=== Sync Complete ===");
    console.log(`Created: ${createdCount} new templates`);
    console.log(`Skipped (already exist): ${skippedCount} templates`);

    const totalTemplates = await LabTestTemplate.countDocuments({});
    console.log(`\nTotal templates in database: ${totalTemplates}`);

  } catch (error) {
    console.error("Error syncing lab test templates:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("\nDisconnected from MongoDB");
    process.exit(0);
  }
}

syncLabTestTemplates();