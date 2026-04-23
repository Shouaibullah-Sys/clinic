import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import mongoose from "mongoose";
import { LabTestTemplate } from "../lib/models/LabTestTemplate";
import { User } from "../lib/models/User";

const missingTests = [
  // Biochemistry - Additional tests
  {
    testCode: "BILIRUBIN_TOTAL",
    testName: "Total Bilirubin",
    category: "biochemistry",
    description: "Total bilirubin measures the total amount of bilirubin in the blood, used to evaluate liver function and detect jaundice.",
    specimenType: ["blood"],
    containerType: ["Plain tube"],
    sampleVolume: "2-3 mL",
    fastingRequired: false,
    preparationInstructions: "No special preparation required.",
    turnaroundTime: 12,
    basePrice: 150,
    active: true,
    parameters: [{ parameterCode: "TB", parameterName: "Total Bilirubin", unit: "mg/dL", normalRange: "0.1-1.2", methodology: "Biochemistry" }]
  },
  {
    testCode: "BILIRUBIN_DIRECT",
    testName: "Direct Bilirubin",
    category: "biochemistry",
    description: "Direct bilirubin measures the conjugated form of bilirubin, used to diagnose liver and biliary tract diseases.",
    specimenType: ["blood"],
    containerType: ["Plain tube"],
    sampleVolume: "2-3 mL",
    fastingRequired: false,
    preparationInstructions: "No special preparation required.",
    turnaroundTime: 12,
    basePrice: 150,
    active: true,
    parameters: [{ parameterCode: "DB", parameterName: "Direct Bilirubin", unit: "mg/dL", normalRange: "0.0-0.3", methodology: "Biochemistry" }]
  },
  {
    testCode: "BILIRUBIN_INDIRECT",
    testName: "Indirect Bilirubin",
    category: "biochemistry",
    description: "Indirect bilirubin measures unconjugated bilirubin, important for evaluating hemolytic anemias and neonatal jaundice.",
    specimenType: ["blood"],
    containerType: ["Plain tube"],
    sampleVolume: "2-3 mL",
    fastingRequired: false,
    preparationInstructions: "No special preparation required.",
    turnaroundTime: 12,
    basePrice: 150,
    active: true,
    parameters: [{ parameterCode: "IDB", parameterName: "Indirect Bilirubin", unit: "mg/dL", normalRange: "0.1-1.0", methodology: "Biochemistry" }]
  },
  {
    testCode: "ALK_PHOS",
    testName: "Alkaline Phosphatase",
    category: "biochemistry",
    description: "Alkaline phosphatase is an enzyme found in liver, bone, and other tissues. Used to detect liver or bone disease.",
    specimenType: ["blood"],
    containerType: ["Plain tube"],
    sampleVolume: "2-3 mL",
    fastingRequired: false,
    preparationInstructions: "No special preparation required.",
    turnaroundTime: 12,
    basePrice: 200,
    active: true,
    parameters: [{ parameterCode: "ALP", parameterName: "Alkaline Phosphatase", unit: "U/L", normalRange: "44-147", methodology: "Biochemistry" }]
  },
  {
    testCode: "GGT",
    testName: "Gamma Glutamyl Transferase",
    category: "biochemistry",
    description: "GGT is an enzyme sensitive to liver damage and alcohol use. Used to diagnose liver and biliary diseases.",
    specimenType: ["blood"],
    containerType: ["Plain tube"],
    sampleVolume: "2-3 mL",
    fastingRequired: false,
    preparationInstructions: "Fasting for 8-12 hours recommended.",
    turnaroundTime: 12,
    basePrice: 250,
    active: true,
    parameters: [{ parameterCode: "GGT", parameterName: "Gamma GT", unit: "U/L", normalRange: "0-50", methodology: "Biochemistry" }]
  },
  {
    testCode: "URIC_ACID",
    testName: "Uric Acid",
    category: "biochemistry",
    description: "Uric acid measures the level of uric acid in blood, used to evaluate kidney function and diagnose gout.",
    specimenType: ["blood"],
    containerType: ["Plain tube"],
    sampleVolume: "2-3 mL",
    fastingRequired: true,
    preparationInstructions: "Fasting for 8-12 hours required.",
    turnaroundTime: 12,
    basePrice: 150,
    active: true,
    parameters: [{ parameterCode: "UA", parameterName: "Uric Acid", unit: "mg/dL", normalRange: "3.5-7.2", methodology: "Biochemistry" }]
  },
  {
    testCode: "HDL",
    testName: "HDL Cholesterol",
    category: "biochemistry",
    description: "High-density lipoprotein (HDL) is the 'good' cholesterol. Used to assess cardiovascular risk.",
    specimenType: ["blood"],
    containerType: ["Plain tube"],
    sampleVolume: "2-3 mL",
    fastingRequired: true,
    preparationInstructions: "Fasting for 9-12 hours required.",
    turnaroundTime: 12,
    basePrice: 200,
    active: true,
    parameters: [{ parameterCode: "HDL", parameterName: "HDL Cholesterol", unit: "mg/dL", normalRange: ">40", methodology: "Biochemistry" }]
  },
  {
    testCode: "LDL",
    testName: "LDL Cholesterol",
    category: "biochemistry",
    description: "Low-density lipoprotein (LDL) is the 'bad' cholesterol. Used to assess cardiovascular risk.",
    specimenType: ["blood"],
    containerType: ["Plain tube"],
    sampleVolume: "2-3 mL",
    fastingRequired: true,
    preparationInstructions: "Fasting for 9-12 hours required.",
    turnaroundTime: 12,
    basePrice: 200,
    active: true,
    parameters: [{ parameterCode: "LDL", parameterName: "LDL Cholesterol", unit: "mg/dL", normalRange: "<100", methodology: "Biochemistry" }]
  },
  {
    testCode: "VLDL",
    testName: "VLDL Cholesterol",
    category: "biochemistry",
    description: "Very low-density lipoprotein (VLDL) carries triglycerides in the blood.",
    specimenType: ["blood"],
    containerType: ["Plain tube"],
    sampleVolume: "2-3 mL",
    fastingRequired: true,
    preparationInstructions: "Fasting for 9-12 hours required.",
    turnaroundTime: 12,
    basePrice: 200,
    active: true,
    parameters: [{ parameterCode: "VLDL", parameterName: "VLDL Cholesterol", unit: "mg/dL", normalRange: "5-40", methodology: "Biochemistry" }]
  },
  // Hematology - Additional tests
  {
    testCode: "ESR",
    testName: "Erythrocyte Sedimentation Rate",
    category: "hematology",
    description: "ESR measures how quickly red blood cells settle at the bottom of a tube. A non-specific inflammation marker.",
    specimenType: ["blood"],
    containerType: ["EDTA tube"],
    sampleVolume: "2-3 mL",
    fastingRequired: false,
    preparationInstructions: "No special preparation required.",
    turnaroundTime: 24,
    basePrice: 150,
    active: true,
    parameters: [{ parameterCode: "ESR", parameterName: "ESR", unit: "mm/hr", normalRange: "Male: 0-15, Female: 0-20", methodology: "Hematology" }]
  },
  {
    testCode: "MPV",
    testName: "Mean Platelet Volume",
    category: "hematology",
    description: "MPV measures the average size of platelets, used to evaluate platelet production and activity.",
    specimenType: ["blood"],
    containerType: ["EDTA tube"],
    sampleVolume: "2-3 mL",
    fastingRequired: false,
    preparationInstructions: "No special preparation required.",
    turnaroundTime: 24,
    basePrice: 100,
    active: true,
    parameters: [{ parameterCode: "MPV", parameterName: "Mean Platelet Volume", unit: "fL", normalRange: "7.5-12.5", methodology: "Hematology" }]
  },
  {
    testCode: "RDW",
    testName: "Red Cell Distribution Width",
    category: "hematology",
    description: "RDW measures variation in red blood cell size, helps classify anemias.",
    specimenType: ["blood"],
    containerType: ["EDTA tube"],
    sampleVolume: "2-3 mL",
    fastingRequired: false,
    preparationInstructions: "No special preparation required.",
    turnaroundTime: 24,
    basePrice: 100,
    active: true,
    parameters: [{ parameterCode: "RDW", parameterName: "RDW", unit: "%", normalRange: "11.5-14.5", methodology: "Hematology" }]
  },
  {
    testCode: "PDW",
    testName: "Platelet Distribution Width",
    category: "hematology",
    description: "PDW measures variation in platelet size, used to assess platelet activation.",
    specimenType: ["blood"],
    containerType: ["EDTA tube"],
    sampleVolume: "2-3 mL",
    fastingRequired: false,
    preparationInstructions: "No special preparation required.",
    turnaroundTime: 24,
    basePrice: 100,
    active: true,
    parameters: [{ parameterCode: "PDW", parameterName: "PDW", unit: "%", normalRange: "9.0-17.0", methodology: "Hematology" }]
  },
  {
    testCode: "NEUTROPHILS",
    testName: "Neutrophils",
    category: "hematology",
    description: "Neutrophils are white blood cells that fight bacterial infections. Count helps diagnose infections and leukemia.",
    specimenType: ["blood"],
    containerType: ["EDTA tube"],
    sampleVolume: "2-3 mL",
    fastingRequired: false,
    preparationInstructions: "No special preparation required.",
    turnaroundTime: 24,
    basePrice: 150,
    active: true,
    parameters: [{ parameterCode: "NEUT", parameterName: "Neutrophils", unit: "%", normalRange: "40-70", methodology: "Hematology" }]
  },
  {
    testCode: "LYMPHOCYTES",
    testName: "Lymphocytes",
    category: "hematology",
    description: "Lymphocytes are white blood cells important for immune response. Count helps diagnose infections and leukemia.",
    specimenType: ["blood"],
    containerType: ["EDTA tube"],
    sampleVolume: "2-3 mL",
    fastingRequired: false,
    preparationInstructions: "No special preparation required.",
    turnaroundTime: 24,
    basePrice: 150,
    active: true,
    parameters: [{ parameterCode: "LYMPH", parameterName: "Lymphocytes", unit: "%", normalRange: "20-40", methodology: "Hematology" }]
  },
  {
    testCode: "EOSINOPHILS",
    testName: "Eosinophils",
    category: "hematology",
    description: "Eosinophils are white blood cells that increase in allergic conditions and parasitic infections.",
    specimenType: ["blood"],
    containerType: ["EDTA tube"],
    sampleVolume: "2-3 mL",
    fastingRequired: false,
    preparationInstructions: "No special preparation required.",
    turnaroundTime: 24,
    basePrice: 150,
    active: true,
    parameters: [{ parameterCode: "EOS", parameterName: "Eosinophils", unit: "%", normalRange: "1-6", methodology: "Hematology" }]
  },
  {
    testCode: "MONOCYTES",
    testName: "Monocytes",
    category: "hematology",
    description: "Monocytes are white blood cells that fight infections and help remove dead cells.",
    specimenType: ["blood"],
    containerType: ["EDTA tube"],
    sampleVolume: "2-3 mL",
    fastingRequired: false,
    preparationInstructions: "No special preparation required.",
    turnaroundTime: 24,
    basePrice: 150,
    active: true,
    parameters: [{ parameterCode: "MONO", parameterName: "Monocytes", unit: "%", normalRange: "2-10", methodology: "Hematology" }]
  },
  {
    testCode: "BASOPHILS",
    testName: "Basophils",
    category: "hematology",
    description: "Basophils are white blood cells involved in allergic reactions and inflammation.",
    specimenType: ["blood"],
    containerType: ["EDTA tube"],
    sampleVolume: "2-3 mL",
    fastingRequired: false,
    preparationInstructions: "No special preparation required.",
    turnaroundTime: 24,
    basePrice: 150,
    active: true,
    parameters: [{ parameterCode: "BASO", parameterName: "Basophils", unit: "%", normalRange: "0-1", methodology: "Hematology" }]
  },
  // Urinalysis - Additional tests
  {
    testCode: "URINE_BILIRUBIN",
    testName: "Urine Bilirubin",
    category: "urinalysis",
    description: "Urine bilirubin test detects bile pigments in urine, indicating liver or biliary disease.",
    specimenType: ["urine"],
    containerType: ["Sterile container"],
    sampleVolume: "10 mL",
    fastingRequired: false,
    preparationInstructions: "Collect fresh mid-stream urine.",
    turnaroundTime: 12,
    basePrice: 100,
    active: true,
    parameters: [{ parameterCode: "U_BIL", parameterName: "Urine Bilirubin", unit: "", normalRange: "Negative", methodology: "Urinalysis" }]
  },
  {
    testCode: "URINE_urobilinogen",
    testName: "Urine Urobilinogen",
    category: "urinalysis",
    description: "Urine urobilinogen test evaluates liver function and hemolysis.",
    specimenType: ["urine"],
    containerType: ["Sterile container"],
    sampleVolume: "10 mL",
    fastingRequired: false,
    preparationInstructions: "Collect fresh mid-stream urine.",
    turnaroundTime: 12,
    basePrice: 100,
    active: true,
    parameters: [{ parameterCode: "U_URO", parameterName: "Urine Urobilinogen", unit: "mg/dL", normalRange: "0.1-1.0", methodology: "Urinalysis" }]
  },
  {
    testCode: "URINE_BLOOD",
    testName: "Urine Blood",
    category: "urinalysis",
    description: "Urine blood test detects red blood cells or hemoglobin in urine, indicating kidney or urinary tract issues.",
    specimenType: ["urine"],
    containerType: ["Sterile container"],
    sampleVolume: "10 mL",
    fastingRequired: false,
    preparationInstructions: "Collect fresh mid-stream urine.",
    turnaroundTime: 12,
    basePrice: 100,
    active: true,
    parameters: [{ parameterCode: "U_BLOOD", parameterName: "Urine Blood", unit: "", normalRange: "Negative", methodology: "Urinalysis" }]
  },
  {
    testCode: "URINE_LEUKOCYTES",
    testName: "Urine Leukocytes",
    category: "urinalysis",
    description: "Urine leukocyte test detects white blood cells, indicating infection or inflammation.",
    specimenType: ["urine"],
    containerType: ["Sterile container"],
    sampleVolume: "10 mL",
    fastingRequired: false,
    preparationInstructions: "Collect fresh mid-stream urine.",
    turnaroundTime: 12,
    basePrice: 100,
    active: true,
    parameters: [{ parameterCode: "U_LEUKO", parameterName: "Urine Leukocytes", unit: "", normalRange: "Negative", methodology: "Urinalysis" }]
  },
  // Microbiology - Additional tests
  {
    testCode: "MYCOPLASMA_CULTURE",
    testName: "Mycoplasma Culture",
    category: "microbiology",
    description: "Mycoplasma culture detects Mycoplasma pneumoniae and genital mycoplasma infections.",
    specimenType: ["swab", "urine"],
    containerType: ["Sterile container", "Transport medium"],
    sampleVolume: "As required",
    fastingRequired: false,
    preparationInstructions: "Collect specimen before antibiotics.",
    turnaroundTime: 72,
    basePrice: 1500,
    active: true,
    parameters: [{ parameterCode: "MYCO", parameterName: "Mycoplasma Culture", unit: "", normalRange: "No growth", methodology: "Microbiology" }]
  },
  {
    testCode: "URINE_FUNGAL_CULTURE",
    testName: "Urine Fungal Culture",
    category: "microbiology",
    description: "Urine fungal culture detects yeast and fungal infections of the urinary tract.",
    specimenType: ["urine"],
    containerType: ["Sterile container"],
    sampleVolume: "10-20 mL",
    fastingRequired: false,
    preparationInstructions: "Collect mid-stream urine.",
    turnaroundTime: 72,
    basePrice: 1000,
    active: true,
    parameters: [{ parameterCode: "FUNG_CULT", parameterName: "Urine Fungal Culture", unit: "", normalRange: "No growth", methodology: "Microbiology" }]
  },
  {
    testCode: "WIDAL_TEST",
    testName: "Widal Test",
    category: "microbiology",
    description: "Widal test is a serological test for typhoid fever (Salmonella typhi and paratyphi).",
    specimenType: ["blood"],
    containerType: ["Plain tube"],
    sampleVolume: "3-5 mL",
    fastingRequired: false,
    preparationInstructions: "No special preparation required.",
    turnaroundTime: 24,
    basePrice: 300,
    active: true,
    parameters: [{ parameterCode: "WIDAL", parameterName: "Widal Test", unit: "", normalRange: "<1:80", methodology: "Serology" }]
  },
  // Serology - Additional tests
  {
    testCode: "DENGUE_IGG",
    testName: "Dengue IgG",
    category: "serology",
    description: "Dengue IgG indicates past dengue infection or immunity.",
    specimenType: ["blood"],
    containerType: ["Plain tube"],
    sampleVolume: "2-3 mL",
    fastingRequired: false,
    preparationInstructions: "No special preparation required.",
    turnaroundTime: 24,
    basePrice: 800,
    active: true,
    parameters: [{ parameterCode: "DEN_IgG", parameterName: "Dengue IgG", unit: "", normalRange: "Negative", methodology: "Serology" }]
  },
  {
    testCode: "DENGUE_IGM",
    testName: "Dengue IgM",
    category: "serology",
    description: "Dengue IgM indicates recent or acute dengue infection.",
    specimenType: ["blood"],
    containerType: ["Plain tube"],
    sampleVolume: "2-3 mL",
    fastingRequired: false,
    preparationInstructions: "No special preparation required.",
    turnaroundTime: 24,
    basePrice: 800,
    active: true,
    parameters: [{ parameterCode: "DEN_IgM", parameterName: "Dengue IgM", unit: "", normalRange: "Negative", methodology: "Serology" }]
  },
  {
    testCode: "C3_COMPLEMENT",
    testName: "C3 Complement",
    category: "serology",
    description: "C3 is a component of the complement system, important for immune function.",
    specimenType: ["blood"],
    containerType: ["Plain tube"],
    sampleVolume: "2-3 mL",
    fastingRequired: false,
    preparationInstructions: "No special preparation required.",
    turnaroundTime: 24,
    basePrice: 1500,
    active: true,
    parameters: [{ parameterCode: "C3", parameterName: "C3 Complement", unit: "mg/dL", normalRange: "90-180", methodology: "Immunology" }]
  },
  {
    testCode: "C4_COMPLEMENT",
    testName: "C4 Complement",
    category: "serology",
    description: "C4 is a component of the complement system.",
    specimenType: ["blood"],
    containerType: ["Plain tube"],
    sampleVolume: "2-3 mL",
    fastingRequired: false,
    preparationInstructions: "No special preparation required.",
    turnaroundTime: 24,
    basePrice: 1500,
    active: true,
    parameters: [{ parameterCode: "C4", parameterName: "C4 Complement", unit: "mg/dL", normalRange: "10-40", methodology: "Immunology" }]
  },
  {
    testCode: "ASMA",
    testName: "Anti Smooth Muscle Antibody",
    category: "serology",
    description: "ASMA is associated with autoimmune hepatitis and other liver diseases.",
    specimenType: ["blood"],
    containerType: ["Plain tube"],
    sampleVolume: "2-3 mL",
    fastingRequired: false,
    preparationInstructions: "No special preparation required.",
    turnaroundTime: 48,
    basePrice: 2000,
    active: true,
    parameters: [{ parameterCode: "ASMA", parameterName: "Anti Smooth Muscle Antibody", unit: "", normalRange: "Negative", methodology: "Immunology" }]
  },
  {
    testCode: "LKM1",
    testName: "Anti LKM-1 Antibody",
    category: "serology",
    description: "Anti-LKM-1 is associated with autoimmune hepatitis type 2.",
    specimenType: ["blood"],
    containerType: ["Plain tube"],
    sampleVolume: "2-3 mL",
    fastingRequired: false,
    preparationInstructions: "No special preparation required.",
    turnaroundTime: 48,
    basePrice: 2500,
    active: true,
    parameters: [{ parameterCode: "LKM1", parameterName: "Anti LKM-1 Antibody", unit: "", normalRange: "Negative", methodology: "Immunology" }]
  },
  // Coagulation
  {
    testCode: "FIBRINOGEN",
    testName: "Fibrinogen",
    category: "hematology",
    description: "Fibrinogen is a clotting factor essential for blood coagulation.",
    specimenType: ["blood"],
    containerType: ["Sodium citrate tube"],
    sampleVolume: "2.7 mL",
    fastingRequired: false,
    preparationInstructions: "No special preparation required.",
    turnaroundTime: 24,
    basePrice: 800,
    active: true,
    parameters: [{ parameterCode: "FIB", parameterName: "Fibrinogen", unit: "mg/dL", normalRange: "200-400", methodology: "Coagulation" }]
  },
  {
    testCode: "D_DIMER",
    testName: "D-Dimer",
    category: "hematology",
    description: "D-dimer is a marker of blood clot formation and breakdown.",
    specimenType: ["blood"],
    containerType: ["Sodium citrate tube"],
    sampleVolume: "2.7 mL",
    fastingRequired: false,
    preparationInstructions: "No special preparation required.",
    turnaroundTime: 24,
    basePrice: 1000,
    active: true,
    parameters: [{ parameterCode: "DD", parameterName: "D-Dimer", unit: "ng/mL", normalRange: "<500", methodology: "Coagulation" }]
  },
  // Additional Hormonal tests
  {
    testCode: "ANDROSTENEDIONE",
    testName: "Androstenedione",
    category: "hormonal",
    description: "Androstenedione is a precursor to testosterone and estrogen.",
    specimenType: ["blood"],
    containerType: ["Plain tube"],
    sampleVolume: "2-3 mL",
    fastingRequired: false,
    preparationInstructions: "Morning sample preferred.",
    turnaroundTime: 48,
    basePrice: 2500,
    active: true,
    parameters: [{ parameterCode: "ANDRO", parameterName: "Androstenedione", unit: "ng/dL", normalRange: "Male: 50-200, Female: 40-150", methodology: "Hormonal" }]
  },
  // Tumor Markers
  {
    testCode: "CYFRA_21_1",
    testName: "CYFRA 21-1",
    category: "biochemistry",
    description: "CYFRA 21-1 is a tumor marker for non-small cell lung cancer.",
    specimenType: ["blood"],
    containerType: ["Plain tube"],
    sampleVolume: "2-3 mL",
    fastingRequired: false,
    preparationInstructions: "No special preparation required.",
    turnaroundTime: 48,
    basePrice: 2500,
    active: true,
    parameters: [{ parameterCode: "CYFRA", parameterName: "CYFRA 21-1", unit: "ng/mL", normalRange: "<3.3", methodology: "Tumor Marker" }]
  },
  {
    testCode: "NSE",
    testName: "Neuron Specific Enolase",
    category: "biochemistry",
    description: "NSE is a tumor marker for small cell lung cancer and neuroblastoma.",
    specimenType: ["blood"],
    containerType: ["Plain tube"],
    sampleVolume: "2-3 mL",
    fastingRequired: false,
    preparationInstructions: "No special preparation required.",
    turnaroundTime: 48,
    basePrice: 2500,
    active: true,
    parameters: [{ parameterCode: "NSE", parameterName: "Neuron Specific Enolase", unit: "ng/mL", normalRange: "<16.3", methodology: "Tumor Marker" }]
  },
  // Additional Biochemistry
  {
    testCode: "AMMONIA",
    testName: "Ammonia",
    category: "biochemistry",
    description: "Blood ammonia measures the level of ammonia in blood, important for liver function assessment.",
    specimenType: ["blood"],
    containerType: ["EDTA tube (ice cold)"],
    sampleVolume: "2-3 mL",
    fastingRequired: false,
    preparationInstructions: "Send to lab immediately on ice.",
    turnaroundTime: 24,
    basePrice: 1500,
    active: true,
    parameters: [{ parameterCode: "NH3", parameterName: "Ammonia", unit: "µmol/L", normalRange: "11-32", methodology: "Biochemistry" }]
  },
  {
    testCode: "LACTATE",
    testName: "Lactate",
    category: "biochemistry",
    description: "Lactate measures lactic acid levels, used to evaluate tissue oxygenation and metabolic disorders.",
    specimenType: ["blood"],
    containerType: ["Fluoride oxalate tube"],
    sampleVolume: "2-3 mL",
    fastingRequired: false,
    preparationInstructions: "Avoid fist clenching. Place on ice.",
    turnaroundTime: 12,
    basePrice: 500,
    active: true,
    parameters: [{ parameterCode: "LAC", parameterName: "Lactate", unit: "mmol/L", normalRange: "0.5-2.0", methodology: "Biochemistry" }]
  },
  {
    testCode: "CK",
    testName: "Creatine Kinase (CK)",
    category: "biochemistry",
    description: "CK is an enzyme found in muscle tissue, used to diagnose muscle damage.",
    specimenType: ["blood"],
    containerType: ["Plain tube"],
    sampleVolume: "2-3 mL",
    fastingRequired: false,
    preparationInstructions: "Avoid strenuous exercise before test.",
    turnaroundTime: 12,
    basePrice: 400,
    active: true,
    parameters: [{ parameterCode: "CK", parameterName: "Creatine Kinase", unit: "U/L", normalRange: "Male: 55-170, Female: 30-145", methodology: "Biochemistry" }]
  },
  // Stool tests
  {
    testCode: "STOOL_OCCULT_BLOOD",
    testName: "Stool Occult Blood",
    category: "stool_test",
    description: "Stool occult blood test detects hidden blood in stool, used for gastrointestinal bleeding screening.",
    specimenType: ["stool"],
    containerType: ["Special container"],
    sampleVolume: "Small amount",
    fastingRequired: false,
    preparationInstructions: "Avoid red meat, vitamin C for 3 days.",
    turnaroundTime: 24,
    basePrice: 300,
    active: true,
    parameters: [{ parameterCode: "FOBT", parameterName: "Stool Occult Blood", unit: "", normalRange: "Negative", methodology: "Stool Test" }]
  },
  {
    testCode: "STOOL_CALPROTECTIN",
    testName: "Fecal Calprotectin",
    category: "stool_test",
    description: "Fecal calprotectin is a marker of intestinal inflammation, used to differentiate IBD from IBS.",
    specimenType: ["stool"],
    containerType: ["Special container"],
    sampleVolume: "5-10 g",
    fastingRequired: false,
    preparationInstructions: "Collect fresh stool.",
    turnaroundTime: 48,
    basePrice: 2500,
    active: true,
    parameters: [{ parameterCode: "CALPRO", parameterName: "Fecal Calprotectin", unit: "µg/g", normalRange: "<50", methodology: "Stool Test" }]
  },
  {
    testCode: "STOOL_ELASTASE",
    testName: "Fecal Elastase",
    category: "stool_test",
    description: "Fecal elastase measures pancreatic enzyme output, used to evaluate exocrine pancreatic function.",
    specimenType: ["stool"],
    containerType: ["Special container"],
    sampleVolume: "5-10 g",
    fastingRequired: false,
    preparationInstructions: "Collect fresh stool.",
    turnaroundTime: 72,
    basePrice: 2500,
    active: true,
    parameters: [{ parameterCode: "ELAST", parameterName: "Fecal Elastase", unit: "µg/g", normalRange: ">200", methodology: "Stool Test" }]
  },
  {
    testCode: "OVA_PARASITE",
    testName: "Ova and Parasite Exam",
    category: "stool_test",
    description: "Ova and parasite examination detects intestinal parasites.",
    specimenType: ["stool"],
    containerType: ["Special container"],
    sampleVolume: "5-10 g",
    fastingRequired: false,
    preparationInstructions: "Collect fresh stool, no preservatives.",
    turnaroundTime: 48,
    basePrice: 500,
    active: true,
    parameters: [{ parameterCode: "O&P", parameterName: "Ova and Parasite", unit: "", normalRange: "No parasites seen", methodology: "Stool Test" }]
  },
  // Additional serology
  {
    testCode: "RPR",
    testName: "RPR (Syphilis Screening)",
    category: "serology",
    description: "Rapid Plasma Reagin test is a screening test for syphilis.",
    specimenType: ["blood"],
    containerType: ["Plain tube"],
    sampleVolume: "2-3 mL",
    fastingRequired: false,
    preparationInstructions: "No special preparation required.",
    turnaroundTime: 24,
    basePrice: 400,
    active: true,
    parameters: [{ parameterCode: "RPR", parameterName: "RPR", unit: "", normalRange: "Non-reactive", methodology: "Serology" }]
  },
  {
    testCode: "TPHA",
    testName: "TPHA (Treponema pallidum)",
    category: "serology",
    description: "Treponema pallidum hemagglutination assay is a confirmatory test for syphilis.",
    specimenType: ["blood"],
    containerType: ["Plain tube"],
    sampleVolume: "2-3 mL",
    fastingRequired: false,
    preparationInstructions: "No special preparation required.",
    turnaroundTime: 48,
    basePrice: 600,
    active: true,
    parameters: [{ parameterCode: "TPHA", parameterName: "TPHA", unit: "", normalRange: "Non-reactive", methodology: "Serology" }]
  },
];

const MONGODB_URI = process.env.MONGODB_URI as string;

if (!MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable");
}

async function addMissingTests() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB successfully\n");

    const adminUser = await User.findOne({ role: "admin" });
    if (!adminUser) {
      console.error("No admin user found.");
      process.exit(1);
    }

    let createdCount = 0;
    let skippedCount = 0;

    for (const test of missingTests) {
      const existing = await LabTestTemplate.findOne({ testCode: test.testCode });
      
      if (existing) {
        console.log(`Skipping (exists): ${test.testCode} - ${test.testName}`);
        skippedCount++;
      } else {
        await LabTestTemplate.create({
          ...test,
          createdBy: adminUser._id
        });
        console.log(`Created: ${test.testCode} - ${test.testName}`);
        createdCount++;
      }
    }

    console.log("\n=== Complete ===");
    console.log(`Created: ${createdCount} new templates`);
    console.log(`Skipped (already exist): ${skippedCount}`);

    const totalTemplates = await LabTestTemplate.countDocuments({});
    console.log(`Total templates in database: ${totalTemplates}`);

  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

addMissingTests();