/**
 * Script to insert laboratory test templates into the database
 * Run with: node scripts/insert-lab-templates.js
 */

const mongoose = require("mongoose");
require("dotenv").config({ path: ".env.local" });

// Template data to insert
const templates = [
  {
    testCode: "CHEM_001",
    testName: "Urea",
    category: "biochemistry",
    description:
      "Measures blood urea nitrogen to assess kidney function and hydration status.\n\nNormal Ranges:\nAdult Male: 8-20 mg/dL\nAdult Female: 6-20 mg/dL\nChild: 5-18 mg/dL\nInfant: 5-15 mg/dL\n\nInterpretation:\nElevated levels may indicate kidney dysfunction, dehydration, or high protein diet.\nDecreased levels may indicate liver failure, malnutrition, or overhydration.",
    specimenType: ["blood"],
    turnaroundTime: 24,
    basePrice: 300,
  },
  {
    testCode: "CHEM_002",
    testName: "Creatinine",
    category: "biochemistry",
    description:
      "Measures kidney function by assessing waste product from muscle breakdown.\n\nNormal Ranges:\nAdult Male: 0.7-1.3 mg/dL\nAdult Female: 0.6-1.1 mg/dL\nAdolescent: 0.5-1.0 mg/dL\nChild: 0.3-0.7 mg/dL\n\nInterpretation:\nElevated levels indicate impaired kidney function.\nLevels vary with muscle mass, age, and gender.",
    specimenType: ["blood"],
    turnaroundTime: 24,
    basePrice: 300,
  },
  {
    testCode: "CHEM_003",
    testName: "Uric Acid",
    category: "biochemistry",
    description:
      "Measures uric acid levels to assess for gout, kidney stones, and metabolic disorders.\n\nNormal Ranges:\nAdult Male: 3.5-7.2 mg/dL\nAdult Female: 2.6-6.0 mg/dL\nChild: 2.0-5.5 mg/dL\n\nInterpretation:\nElevated levels: Gout, kidney stones, tumor lysis syndrome.\nDecreased levels: Wilson's disease, Fanconi syndrome.",
    specimenType: ["blood"],
    turnaroundTime: 24,
    basePrice: 350,
  },
  {
    testCode: "CHEM_004",
    testName: "Vitamin D3 (25-Hydroxy)",
    category: "biochemistry",
    description:
      "Assesses vitamin D status for bone health and calcium metabolism.\n\nNormal Ranges:\nSufficient: 30-100 ng/mL\nInsufficient: 20-29 ng/mL\nDeficient: <20 ng/mL\nToxicity Risk: >100 ng/mL\n\nInterpretation:\nDeficiency leads to rickets in children, osteomalacia in adults.\nInsufficiency common in limited sun exposure.",
    specimenType: ["blood"],
    turnaroundTime: 48,
    basePrice: 1200,
  },
  {
    testCode: "CHEM_005",
    testName: "Cholesterol (Total)",
    category: "biochemistry",
    description:
      "Measures total cholesterol for cardiovascular risk assessment.\n\nNormal Ranges:\nDesirable: <200 mg/dL\nBorderline High: 200-239 mg/dL\nHigh: ≥240 mg/dL\n\nInterpretation:\nHigh levels increase risk of atherosclerosis and heart disease.\nPart of lipid panel for comprehensive assessment.",
    specimenType: ["blood"],
    turnaroundTime: 24,
    basePrice: 250,
  },
  {
    testCode: "CHEM_006",
    testName: "Triglycerides",
    category: "biochemistry",
    description:
      "Measures fat levels in blood for cardiovascular and metabolic assessment.\n\nNormal Ranges:\nNormal: <150 mg/dL\nBorderline High: 150-199 mg/dL\nHigh: 200-499 mg/dL\nVery High: ≥500 mg/dL\n\nInterpretation:\nElevated levels: Metabolic syndrome, diabetes, pancreatitis risk.\nBest measured after 12-hour fasting.",
    specimenType: ["blood"],
    turnaroundTime: 24,
    basePrice: 250,
  },
  {
    testCode: "CHEM_007",
    testName: "Fasting Blood Sugar (FBS)",
    category: "biochemistry",
    description:
      "Measures blood glucose after fasting to screen for diabetes.\n\nNormal Ranges:\nNormal: 70-99 mg/dL\nPrediabetes: 100-125 mg/dL\nDiabetes: ≥126 mg/dL\n\nInterpretation:\nRequires 8-12 hours fasting.\nConfirm with repeat testing or HbA1c.",
    specimenType: ["blood"],
    turnaroundTime: 24,
    basePrice: 200,
  },
  {
    testCode: "SERO_001",
    testName: "Rheumatoid Factor (RF)",
    category: "serology",
    description:
      "Detects autoantibodies associated with rheumatoid arthritis.\n\nNormal Ranges:\nNegative: <14 IU/mL\nWeak Positive: 14-30 IU/mL\nPositive: >30 IU/mL\n\nInterpretation:\nPositive in 70-80% of rheumatoid arthritis patients.\nMay also be positive in other autoimmune diseases and chronic infections.",
    specimenType: ["blood"],
    turnaroundTime: 24,
    basePrice: 500,
  },
  {
    testCode: "SERO_002",
    testName: "Anti-Streptolysin O (ASO)",
    category: "serology",
    description:
      "Detects antibodies against streptococcus bacteria.\n\nNormal Ranges:\nAdult: <200 IU/mL\nChild: <150 IU/mL\nPositive: >200 IU/mL\n\nInterpretation:\nElevated 1-3 weeks post-strep infection.\nIndicates recent strep infection, not current.",
    specimenType: ["blood"],
    turnaroundTime: 24,
    basePrice: 450,
  },
  {
    testCode: "SERO_003",
    testName: "C-Reactive Protein (CRP)",
    category: "serology",
    description:
      "Measures inflammation marker in blood.\n\nNormal Ranges:\nNormal: <3 mg/L\nMild Elevation: 3-10 mg/L\nModerate Elevation: 10-100 mg/L\nMarked Elevation: >100 mg/L\n\nInterpretation:\nNon-specific marker of inflammation.\nElevated in infection, tissue injury, autoimmune disease.",
    specimenType: ["blood"],
    turnaroundTime: 24,
    basePrice: 400,
  },
  {
    testCode: "SERO_004",
    testName: "Brucella abortus Antibodies",
    category: "serology",
    description:
      "Serological test for Brucella abortus infection (brucellosis).\n\nNormal Ranges:\nNegative: <1:80\nBorderline: 1:80\nPositive: ≥1:160\n\nInterpretation:\nAssociated with cattle exposure.\nCauses undulant fever in humans.",
    specimenType: ["blood"],
    turnaroundTime: 48,
    basePrice: 600,
  },
  {
    testCode: "SERO_005",
    testName: "Brucella melitensis Antibodies",
    category: "serology",
    description:
      "Serological test for Brucella melitensis infection.\n\nNormal Ranges:\nNegative: <1:80\nBorderline: 1:80\nPositive: ≥1:160\n\nInterpretation:\nMore severe form of brucellosis.\nTypically associated with goat/sheep exposure.",
    specimenType: ["blood"],
    turnaroundTime: 48,
    basePrice: 600,
  },
  {
    testCode: "SERO_006",
    testName: "TORCH Profile",
    category: "serology",
    description:
      "Comprehensive screening for infections affecting pregnancy: Toxoplasma, Rubella, CMV, Herpes, and others.\n\nIncludes:\n- Toxoplasma gondii IgG/IgM\n- Rubella IgG/IgM\n- CMV IgG/IgM\n- HSV-1 IgG/IgM\n- HSV-2 IgG/IgM\n\nInterpretation:\nIgG: Past infection/immunity\nIgM: Acute/recent infection\nCritical for assessing risk of congenital infections during pregnancy.",
    specimenType: ["blood"],
    turnaroundTime: 72,
    basePrice: 3500,
  },
  {
    testCode: "URINE_001",
    testName: "Urine Routine Examination",
    category: "urinalysis",
    description:
      "Complete urine analysis includes physical, chemical, and microscopic examination of urine. Used to detect various conditions.",
    specimenType: ["urine"],
    containerType: ["sterile container"],
    sampleVolume: "10-20 mL",
    fastingRequired: false,
    preparationInstructions:
      "Collect mid-stream urine in a sterile container. First morning sample is preferred.",
    turnaroundTime: 24,
    basePrice: 300,
    parameters: [
      {
        parameterCode: "COLOR",
        parameterName: "Color",
        unit: "",
        normalRange: "Pale Yellow",
        group: "Physical Examination",
      },
      {
        parameterCode: "APPEARANCE",
        parameterName: "Appearance",
        unit: "",
        normalRange: "Clear",
        group: "Physical Examination",
      },
      {
        parameterCode: "PH",
        parameterName: "pH",
        unit: "",
        normalRange: "4.5-8.0",
        group: "Physical Examination",
      },
      {
        parameterCode: "SG",
        parameterName: "Specific Gravity",
        unit: "",
        normalRange: "1.003-1.035",
        group: "Physical Examination",
      },
      {
        parameterCode: "PROTEIN",
        parameterName: "Protein",
        unit: "",
        normalRange: "Negative",
        group: "Chemical Examination",
      },
      {
        parameterCode: "GLUCOSE",
        parameterName: "Glucose",
        unit: "",
        normalRange: "Negative",
        group: "Chemical Examination",
      },
      {
        parameterCode: "KETONES",
        parameterName: "Ketones",
        unit: "",
        normalRange: "Negative",
        group: "Chemical Examination",
      },
      {
        parameterCode: "BILIRUBIN",
        parameterName: "Bilirubin",
        unit: "",
        normalRange: "Negative",
        group: "Chemical Examination",
      },
      {
        parameterCode: "BLOOD",
        parameterName: "Blood",
        unit: "",
        normalRange: "Negative",
        group: "Chemical Examination",
      },
      {
        parameterCode: "NITRITE",
        parameterName: "Nitrite",
        unit: "",
        normalRange: "Negative",
        group: "Chemical Examination",
      },
      {
        parameterCode: "LEUCOCYTES",
        parameterName: "Leucocytes",
        unit: "",
        normalRange: "Negative",
        group: "Chemical Examination",
      },
      {
        parameterCode: "PUS",
        parameterName: "Pus Cells",
        unit: "/HPF",
        normalRange: "0-2",
        group: "Microscopic Examination",
      },
      {
        parameterCode: "RBC",
        parameterName: "RBCs",
        unit: "/HPF",
        normalRange: "0-1",
        group: "Microscopic Examination",
      },
      {
        parameterCode: "EPITHELIAL",
        parameterName: "Epithelial Cells",
        unit: "/HPF",
        normalRange: "0-2",
        group: "Microscopic Examination",
      },
      {
        parameterCode: "CASTS",
        parameterName: "Casts",
        unit: "/LPF",
        normalRange: "0-1",
        group: "Microscopic Examination",
      },
      {
        parameterCode: "CRYSTALS",
        parameterName: "Crystals",
        unit: "",
        normalRange: "None",
        group: "Microscopic Examination",
      },
      {
        parameterCode: "BACTERIA",
        parameterName: "Bacteria",
        unit: "",
        normalRange: "None",
        group: "Microscopic Examination",
      },
    ],
  },
  {
    testCode: "STOOL_001",
    testName: "Stool Examination",
    category: "stool_test",
    description:
      "Stool routine and microscopy test examines stool for parasites, ova, cysts, and other abnormalities.",
    specimenType: ["stool"],
    containerType: ["stool container"],
    sampleVolume: "5-10 g",
    fastingRequired: false,
    preparationInstructions:
      "Collect fresh stool sample in a clean, dry container. Avoid contamination with urine or water.",
    turnaroundTime: 24,
    basePrice: 350,
    parameters: [
      {
        parameterCode: "COLOR",
        parameterName: "Color",
        unit: "",
        normalRange: "Brown",
        group: "Physical Examination",
      },
      {
        parameterCode: "CONSISTENCY",
        parameterName: "Consistency",
        unit: "",
        normalRange: "Formed",
        group: "Physical Examination",
      },
      {
        parameterCode: "MUCUS",
        parameterName: "Mucus",
        unit: "",
        normalRange: "Absent",
        group: "Physical Examination",
      },
      {
        parameterCode: "BLOOD",
        parameterName: "Blood",
        unit: "",
        normalRange: "Absent",
        group: "Physical Examination",
      },
      {
        parameterCode: "OVA",
        parameterName: "Ova/Cysts",
        unit: "",
        normalRange: "Absent",
        group: "Microscopic Examination",
      },
      {
        parameterCode: "OCCULT",
        parameterName: "Occult Blood",
        unit: "",
        normalRange: "Negative",
        group: "Microscopic Examination",
      },
      {
        parameterCode: "PH",
        parameterName: "pH",
        unit: "",
        normalRange: "6.5-7.5",
        group: "Microscopic Examination",
      },
    ],
  },
  {
    testCode: "SEMN_001",
    testName: "Semen Analysis",
    category: "other",
    description:
      "Semen analysis evaluates physical and microscopic parameters of semen. Used to assess male fertility and reproductive health.\n\nPreparation:\nMaintain 2-7 days of abstinence before sample collection.\nCollect the entire ejaculate in a sterile container.",
    specimenType: ["other"],
    containerType: ["sterile container"],
    sampleVolume: "2-5 mL",
    preparationInstructions:
      "Maintain 2-7 days of abstinence before sample collection. Collect the entire ejaculate in a sterile container.",
    turnaroundTime: 24,
    basePrice: 800,
    parameters: [
      {
        parameterCode: "VOLUME",
        parameterName: "Volume",
        unit: "mL",
        normalRange: "1.5-5.0",
        group: "Physical Examination",
      },
      {
        parameterCode: "COLOR",
        parameterName: "Color",
        unit: "",
        normalRange: "White/Grey",
        group: "Physical Examination",
      },
      {
        parameterCode: "PH",
        parameterName: "pH",
        unit: "",
        normalRange: "7.2-8.0",
        group: "Physical Examination",
      },
      {
        parameterCode: "LIQUEFACTION",
        parameterName: "Liquefaction Time",
        unit: "min",
        normalRange: "<60",
        group: "Physical Examination",
      },
      {
        parameterCode: "COUNT",
        parameterName: "Sperm Count",
        unit: "million/mL",
        normalRange: "15-200",
        group: "Microscopic Examination",
      },
      {
        parameterCode: "MOTILITY_P",
        parameterName: "Motility (Progressive)",
        unit: "%",
        normalRange: ">32",
        group: "Microscopic Examination",
      },
      {
        parameterCode: "MOTILITY_T",
        parameterName: "Motility (Total)",
        unit: "%",
        normalRange: ">40",
        group: "Microscopic Examination",
      },
      {
        parameterCode: "PUS",
        parameterName: "Pus Cells",
        unit: "/HPF",
        normalRange: "<5",
        group: "Microscopic Examination",
      },
      {
        parameterCode: "RBC",
        parameterName: "RBCs",
        unit: "/HPF",
        normalRange: "<2",
        group: "Microscopic Examination",
      },
      {
        parameterCode: "MORPH",
        parameterName: "Morphology",
        unit: "%",
        normalRange: ">4",
        group: "Morphology",
      },
    ],
  },
];

async function insertTemplates() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });

    console.log("✓ Database connected successfully");

    // Define the LabTestTemplate schema inline
    const labTestTemplateSchema = new mongoose.Schema(
      {
        testCode: { type: String, required: true, uppercase: true, trim: true },
        testName: { type: String, required: true, trim: true },
        category: { type: String, required: true },
        description: { type: String, trim: true },
        specimenType: [{ type: String }],
        containerType: [{ type: String }],
        sampleVolume: { type: String },
        fastingRequired: { type: Boolean, default: false },
        preparationInstructions: { type: String, trim: true },
        turnaroundTime: { type: Number, required: true },
        basePrice: { type: Number, required: true },
        active: { type: Boolean, default: true },
        parameters: { type: Array, default: [] },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      },
      { timestamps: true },
    );

    // Check if model exists, otherwise create it
    const LabTestTemplate =
      mongoose.models.LabTestTemplate ||
      mongoose.model("LabTestTemplate", labTestTemplateSchema);

    // First, check existing templates
    const existingTemplates = await LabTestTemplate.find({}).lean();
    console.log(
      `\nExisting templates in database: ${existingTemplates.length}`,
    );

    // Get the test codes that already exist
    const existingCodes = new Set(existingTemplates.map((t) => t.testCode));
    console.log("Existing test codes:", Array.from(existingCodes));

    // Find an admin user to assign as creator
    const User =
      mongoose.models.User ||
      mongoose.model(
        "User",
        new mongoose.Schema({
          email: String,
          name: String,
          role: String,
          approved: Boolean,
          active: Boolean,
        }),
      );

    const adminUser = await User.findOne({
      role: "admin",
      approved: true,
      active: true,
    }).lean();

    if (!adminUser) {
      console.log(
        "⚠ No admin user found, will create templates without createdBy",
      );
    } else {
      console.log(`\n✓ Using admin user: ${adminUser.name || adminUser.email}`);
    }

    // Filter templates that don't already exist
    const newTemplates = templates.filter(
      (t) => !existingCodes.has(t.testCode.toUpperCase()),
    );
    console.log(`\nTemplates to insert: ${newTemplates.length}`);
    console.log(
      "New test codes:",
      newTemplates.map((t) => t.testCode),
    );

    if (newTemplates.length > 0) {
      // Add createdBy if admin user exists
      const templatesToInsert = newTemplates.map((t) => ({
        ...t,
        testCode: t.testCode.toUpperCase(),
        createdBy: adminUser ? adminUser._id : undefined,
      }));

      const result = await LabTestTemplate.insertMany(templatesToInsert, {
        ordered: false,
      });
      console.log(`\n✓ Successfully inserted ${result.length} templates`);
    } else {
      console.log("\n✓ All templates already exist in the database");
    }

    // Verify final count
    const finalCount = await LabTestTemplate.countDocuments({});
    console.log(`\nTotal templates in database: ${finalCount}`);

    await mongoose.disconnect();
    console.log("\n✓ Database connection closed");

    process.exit(0);
  } catch (error) {
    console.error("Error:", error.message);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  }
}

insertTemplates();
