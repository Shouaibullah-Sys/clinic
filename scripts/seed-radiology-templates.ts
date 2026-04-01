// scripts/seed-radiology-templates.ts
// Seed or update a comprehensive radiology template catalog.

import dotenv from "dotenv";
import mongoose from "mongoose";
import { RadiologyTemplate } from "../lib/models/RadiologyTemplate";
import { User } from "../lib/models/User";

dotenv.config({ path: ".env.local" });

type ServiceType =
  | "x-ray"
  | "ct-scan"
  | "mri"
  | "ultrasound"
  | "mammography"
  | "fluoroscopy"
  | "pet-scan"
  | "bone-density"
  | "other";

type TemplateSeed = {
  templateCode: string;
  examName: string;
  serviceType: ServiceType;
  category:
    | "diagnostic"
    | "screening"
    | "interventional"
    | "therapeutic"
    | "follow-up"
    | "emergency"
    | "other";
  bodyPart?: string;
  views?: string[];
  description?: string;
  contrastRequired?: boolean;
  contrastType?: string;
  preparationInstructions?: string;
  duration: number;
  basePrice: number;
  active?: boolean;
  parameters?: Array<{
    parameterCode: string;
    parameterName: string;
    description?: string;
    normalFindings?: string;
    unit?: string;
  }>;
  clinicalIndicationTemplate?: string;
  techniqueTemplate?: string;
  comparisonTemplate?: string;
  findingsTemplate?: string;
  impressionTemplate?: string;
  recommendationTemplate?: string;
  criticalFindingsChecklist?: string[];
};

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("Please define MONGODB_URI in your environment.");
}

const standardParameters = [
  {
    parameterCode: "FINDINGS",
    parameterName: "Findings",
    description: "Structured observations from the exam",
  },
  {
    parameterCode: "IMPRESSION",
    parameterName: "Impression",
    description: "Summary and radiologist impression",
  },
  {
    parameterCode: "RECOMMEND",
    parameterName: "Recommendations",
    description: "Follow-up or additional imaging recommendations",
  },
];

const templates: TemplateSeed[] = [
  // X-RAY
  {
    templateCode: "XR-CHEST-PA-LAT",
    examName: "Chest X-Ray PA & Lateral",
    serviceType: "x-ray",
    category: "diagnostic",
    bodyPart: "Chest",
    views: ["PA View", "Lateral View"],
    duration: 15,
    basePrice: 20,
    description: "Routine chest radiograph with PA and lateral views.",
    preparationInstructions: "Remove metallic items from chest/neck.",
    parameters: standardParameters,
  },
  {
    templateCode: "XR-CHEST-AP-PORT",
    examName: "Portable Chest X-Ray AP",
    serviceType: "x-ray",
    category: "emergency",
    bodyPart: "Chest",
    views: ["AP View"],
    duration: 10,
    basePrice: 18,
    description: "Portable AP chest film for ICU/ER/inpatient use.",
    parameters: standardParameters,
  },
  {
    templateCode: "XR-ABD-KUB",
    examName: "Abdominal X-Ray KUB",
    serviceType: "x-ray",
    category: "diagnostic",
    bodyPart: "Abdomen",
    views: ["AP View"],
    duration: 15,
    basePrice: 22,
    description: "Kidney-Ureter-Bladder plain abdominal radiograph.",
    parameters: standardParameters,
  },
  {
    templateCode: "XR-SPINE-CERV-AP-LAT",
    examName: "Cervical Spine X-Ray AP & Lateral",
    serviceType: "x-ray",
    category: "diagnostic",
    bodyPart: "Spine",
    views: ["AP View", "Lateral View"],
    duration: 20,
    basePrice: 25,
    parameters: standardParameters,
  },
  {
    templateCode: "XR-SPINE-LUMB-AP-LAT",
    examName: "Lumbar Spine X-Ray AP & Lateral",
    serviceType: "x-ray",
    category: "diagnostic",
    bodyPart: "Spine",
    views: ["AP View", "Lateral View"],
    duration: 20,
    basePrice: 25,
    parameters: standardParameters,
  },
  {
    templateCode: "XR-KNEE-AP-LAT",
    examName: "Knee X-Ray AP & Lateral",
    serviceType: "x-ray",
    category: "diagnostic",
    bodyPart: "Knee",
    views: ["AP View", "Lateral View"],
    duration: 15,
    basePrice: 18,
    parameters: standardParameters,
  },
  {
    templateCode: "XR-SHOULDER-AP-LAT",
    examName: "Shoulder X-Ray AP & Lateral",
    serviceType: "x-ray",
    category: "diagnostic",
    bodyPart: "Shoulder",
    views: ["AP View", "Lateral View"],
    duration: 15,
    basePrice: 18,
    parameters: standardParameters,
  },
  {
    templateCode: "XR-PELVIS-AP",
    examName: "Pelvis X-Ray AP",
    serviceType: "x-ray",
    category: "diagnostic",
    bodyPart: "Pelvis",
    views: ["AP View"],
    duration: 15,
    basePrice: 20,
    parameters: standardParameters,
  },
  {
    templateCode: "XR-HIP-AP-LAT",
    examName: "Hip X-Ray AP & Lateral",
    serviceType: "x-ray",
    category: "diagnostic",
    bodyPart: "Hip",
    views: ["AP View", "Lateral View"],
    duration: 15,
    basePrice: 20,
    parameters: standardParameters,
  },
  {
    templateCode: "XR-HAND-OBL",
    examName: "Hand X-Ray AP/Oblique/Lateral",
    serviceType: "x-ray",
    category: "diagnostic",
    bodyPart: "Extremities",
    views: ["AP View", "Oblique View", "Lateral View"],
    duration: 15,
    basePrice: 16,
    parameters: standardParameters,
  },
  {
    templateCode: "XR-FOOT-OBL",
    examName: "Foot X-Ray AP/Oblique/Lateral",
    serviceType: "x-ray",
    category: "diagnostic",
    bodyPart: "Extremities",
    views: ["AP View", "Oblique View", "Lateral View"],
    duration: 15,
    basePrice: 16,
    parameters: standardParameters,
  },
  {
    templateCode: "XR-SKULL-AP-LAT",
    examName: "Skull X-Ray AP & Lateral",
    serviceType: "x-ray",
    category: "diagnostic",
    bodyPart: "Head",
    views: ["AP View", "Lateral View"],
    duration: 15,
    basePrice: 20,
    parameters: standardParameters,
  },

  // CT SCAN
  {
    templateCode: "CT-BRAIN-PLAIN",
    examName: "CT Brain Plain",
    serviceType: "ct-scan",
    category: "emergency",
    bodyPart: "Brain",
    views: ["Plain"],
    duration: 20,
    basePrice: 75,
    parameters: standardParameters,
  },
  {
    templateCode: "CT-BRAIN-CONTRAST",
    examName: "CT Brain with Contrast",
    serviceType: "ct-scan",
    category: "diagnostic",
    bodyPart: "Brain",
    views: ["Contrast"],
    contrastRequired: true,
    contrastType: "iodinated",
    duration: 30,
    basePrice: 95,
    preparationInstructions: "Recent renal function test preferred.",
    parameters: standardParameters,
  },
  {
    templateCode: "CT-PNS-PLAIN",
    examName: "CT Paranasal Sinuses",
    serviceType: "ct-scan",
    category: "diagnostic",
    bodyPart: "Head",
    views: ["Plain"],
    duration: 20,
    basePrice: 70,
    parameters: standardParameters,
  },
  {
    templateCode: "CT-CHEST-HRCT",
    examName: "CT Chest HRCT",
    serviceType: "ct-scan",
    category: "diagnostic",
    bodyPart: "Chest",
    views: ["Plain"],
    duration: 25,
    basePrice: 90,
    parameters: standardParameters,
  },
  {
    templateCode: "CT-CHEST-CONTRAST",
    examName: "CT Chest with Contrast",
    serviceType: "ct-scan",
    category: "diagnostic",
    bodyPart: "Chest",
    views: ["Contrast"],
    contrastRequired: true,
    contrastType: "iodinated",
    duration: 30,
    basePrice: 110,
    parameters: standardParameters,
  },
  {
    templateCode: "CT-ABD-PLAIN",
    examName: "CT Abdomen Plain",
    serviceType: "ct-scan",
    category: "diagnostic",
    bodyPart: "Abdomen",
    views: ["Plain"],
    duration: 25,
    basePrice: 95,
    parameters: standardParameters,
  },
  {
    templateCode: "CT-ABD-CONTRAST",
    examName: "CT Abdomen with Contrast",
    serviceType: "ct-scan",
    category: "diagnostic",
    bodyPart: "Abdomen",
    views: ["Contrast"],
    contrastRequired: true,
    contrastType: "iodinated",
    duration: 35,
    basePrice: 120,
    preparationInstructions: "NPO 4-6 hours. Renal function advised.",
    parameters: standardParameters,
  },
  {
    templateCode: "CT-ABD-PELVIS-CONTRAST",
    examName: "CT Abdomen & Pelvis with Contrast",
    serviceType: "ct-scan",
    category: "diagnostic",
    bodyPart: "Abdomen",
    views: ["Contrast"],
    contrastRequired: true,
    contrastType: "iodinated",
    duration: 35,
    basePrice: 130,
    preparationInstructions: "NPO 4-6 hours. Oral contrast as advised.",
    parameters: standardParameters,
  },
  {
    templateCode: "CT-KUB",
    examName: "CT KUB (Stone Protocol)",
    serviceType: "ct-scan",
    category: "diagnostic",
    bodyPart: "Abdomen",
    views: ["Plain"],
    duration: 20,
    basePrice: 90,
    parameters: standardParameters,
  },
  {
    templateCode: "CT-SPINE-CERV",
    examName: "CT Cervical Spine",
    serviceType: "ct-scan",
    category: "emergency",
    bodyPart: "Spine",
    views: ["Plain"],
    duration: 20,
    basePrice: 85,
    parameters: standardParameters,
  },
  {
    templateCode: "CT-SPINE-LS",
    examName: "CT Lumbosacral Spine",
    serviceType: "ct-scan",
    category: "diagnostic",
    bodyPart: "Spine",
    views: ["Plain"],
    duration: 20,
    basePrice: 85,
    parameters: standardParameters,
  },
  {
    templateCode: "CT-ANGIO-BRAIN",
    examName: "CT Angiography Brain",
    serviceType: "ct-scan",
    category: "interventional",
    bodyPart: "Brain",
    views: ["Contrast"],
    contrastRequired: true,
    contrastType: "iodinated",
    duration: 40,
    basePrice: 180,
    parameters: standardParameters,
  },
  {
    templateCode: "CT-ANGIO-PE",
    examName: "CT Pulmonary Angiography",
    serviceType: "ct-scan",
    category: "emergency",
    bodyPart: "Chest",
    views: ["Contrast"],
    contrastRequired: true,
    contrastType: "iodinated",
    duration: 40,
    basePrice: 185,
    parameters: standardParameters,
  },

  // MRI
  {
    templateCode: "MRI-BRAIN-PLAIN",
    examName: "MRI Brain Plain",
    serviceType: "mri",
    category: "diagnostic",
    bodyPart: "Brain",
    views: ["Plain"],
    duration: 40,
    basePrice: 180,
    preparationInstructions: "Remove metallic objects; MRI safety screening.",
    parameters: standardParameters,
  },
  {
    templateCode: "MRI-BRAIN-CONTRAST",
    examName: "MRI Brain with Contrast",
    serviceType: "mri",
    category: "diagnostic",
    bodyPart: "Brain",
    views: ["Contrast"],
    contrastRequired: true,
    contrastType: "gadolinium",
    duration: 50,
    basePrice: 210,
    parameters: standardParameters,
  },
  {
    templateCode: "MRI-PITUITARY-CONTRAST",
    examName: "MRI Pituitary with Contrast",
    serviceType: "mri",
    category: "diagnostic",
    bodyPart: "Brain",
    views: ["Contrast"],
    contrastRequired: true,
    contrastType: "gadolinium",
    duration: 45,
    basePrice: 220,
    parameters: standardParameters,
  },
  {
    templateCode: "MRI-CSPINE",
    examName: "MRI Cervical Spine",
    serviceType: "mri",
    category: "diagnostic",
    bodyPart: "Spine",
    views: ["Plain"],
    duration: 40,
    basePrice: 190,
    parameters: standardParameters,
  },
  {
    templateCode: "MRI-LSSPINE",
    examName: "MRI Lumbosacral Spine",
    serviceType: "mri",
    category: "diagnostic",
    bodyPart: "Spine",
    views: ["Plain"],
    duration: 40,
    basePrice: 190,
    parameters: standardParameters,
  },
  {
    templateCode: "MRI-KNEE",
    examName: "MRI Knee",
    serviceType: "mri",
    category: "diagnostic",
    bodyPart: "Knee",
    views: ["Plain"],
    duration: 35,
    basePrice: 175,
    parameters: standardParameters,
  },
  {
    templateCode: "MRI-SHOULDER",
    examName: "MRI Shoulder",
    serviceType: "mri",
    category: "diagnostic",
    bodyPart: "Shoulder",
    views: ["Plain"],
    duration: 35,
    basePrice: 175,
    parameters: standardParameters,
  },
  {
    templateCode: "MRI-ABDOMEN",
    examName: "MRI Abdomen",
    serviceType: "mri",
    category: "diagnostic",
    bodyPart: "Abdomen",
    views: ["Plain"],
    duration: 45,
    basePrice: 220,
    parameters: standardParameters,
  },
  {
    templateCode: "MRI-PELVIS",
    examName: "MRI Pelvis",
    serviceType: "mri",
    category: "diagnostic",
    bodyPart: "Pelvis",
    views: ["Plain"],
    duration: 45,
    basePrice: 220,
    parameters: standardParameters,
  },
  {
    templateCode: "MRI-MRCP",
    examName: "MRI MRCP",
    serviceType: "mri",
    category: "diagnostic",
    bodyPart: "Abdomen",
    views: ["Plain"],
    duration: 40,
    basePrice: 230,
    preparationInstructions: "NPO 6 hours.",
    parameters: standardParameters,
  },
  {
    templateCode: "MRI-MRA-BRAIN",
    examName: "MR Angiography Brain",
    serviceType: "mri",
    category: "interventional",
    bodyPart: "Brain",
    views: ["Plain"],
    duration: 45,
    basePrice: 240,
    parameters: standardParameters,
  },

  // ULTRASOUND
  {
    templateCode: "US-ABD-COMP",
    examName: "Ultrasound Abdomen Complete",
    serviceType: "ultrasound",
    category: "diagnostic",
    bodyPart: "Abdomen",
    views: ["Complete"],
    duration: 25,
    basePrice: 30,
    preparationInstructions: "NPO 6 hours.",
    parameters: standardParameters,
  },
  {
    templateCode: "US-ABD-PELVIS",
    examName: "Ultrasound Abdomen & Pelvis",
    serviceType: "ultrasound",
    category: "diagnostic",
    bodyPart: "Abdomen",
    views: ["Complete"],
    duration: 30,
    basePrice: 35,
    preparationInstructions: "Full bladder if pelvic assessment needed.",
    parameters: standardParameters,
  },
  {
    templateCode: "US-PELVIS-TA",
    examName: "Ultrasound Pelvis (Transabdominal)",
    serviceType: "ultrasound",
    category: "diagnostic",
    bodyPart: "Pelvis",
    views: ["Complete"],
    duration: 20,
    basePrice: 28,
    preparationInstructions: "Full bladder required.",
    parameters: standardParameters,
  },
  {
    templateCode: "US-PELVIS-TV",
    examName: "Ultrasound Pelvis (Transvaginal)",
    serviceType: "ultrasound",
    category: "diagnostic",
    bodyPart: "Pelvis",
    views: ["Complete"],
    duration: 25,
    basePrice: 32,
    parameters: standardParameters,
  },
  {
    templateCode: "US-OB-FIRST",
    examName: "Obstetric Ultrasound First Trimester",
    serviceType: "ultrasound",
    category: "screening",
    bodyPart: "Obstetric",
    views: ["Complete"],
    duration: 25,
    basePrice: 30,
    parameters: standardParameters,
  },
  {
    templateCode: "US-OB-SECOND",
    examName: "Obstetric Ultrasound Second Trimester",
    serviceType: "ultrasound",
    category: "screening",
    bodyPart: "Obstetric",
    views: ["Complete"],
    duration: 30,
    basePrice: 35,
    parameters: standardParameters,
  },
  {
    templateCode: "US-OB-THIRD",
    examName: "Obstetric Ultrasound Third Trimester",
    serviceType: "ultrasound",
    category: "follow-up",
    bodyPart: "Obstetric",
    views: ["Complete"],
    duration: 30,
    basePrice: 35,
    parameters: standardParameters,
  },
  {
    templateCode: "US-THYROID",
    examName: "Thyroid Ultrasound",
    serviceType: "ultrasound",
    category: "diagnostic",
    bodyPart: "Thyroid",
    views: ["Complete"],
    duration: 20,
    basePrice: 25,
    parameters: standardParameters,
  },
  {
    templateCode: "US-BREAST",
    examName: "Breast Ultrasound",
    serviceType: "ultrasound",
    category: "diagnostic",
    bodyPart: "Chest",
    views: ["Complete"],
    duration: 25,
    basePrice: 32,
    parameters: standardParameters,
  },
  {
    templateCode: "US-RENAL",
    examName: "Renal Ultrasound",
    serviceType: "ultrasound",
    category: "diagnostic",
    bodyPart: "Abdomen",
    views: ["Complete"],
    duration: 20,
    basePrice: 26,
    parameters: standardParameters,
  },
  {
    templateCode: "US-SCROTAL",
    examName: "Scrotal Ultrasound",
    serviceType: "ultrasound",
    category: "diagnostic",
    bodyPart: "Pelvis",
    views: ["Complete"],
    duration: 20,
    basePrice: 28,
    parameters: standardParameters,
  },
  {
    templateCode: "US-DOP-CAROTID",
    examName: "Carotid Doppler Ultrasound",
    serviceType: "ultrasound",
    category: "diagnostic",
    bodyPart: "Neck",
    views: ["Complete"],
    duration: 30,
    basePrice: 40,
    parameters: standardParameters,
  },
  {
    templateCode: "US-DOP-LOWER-LIMB",
    examName: "Lower Limb Venous Doppler",
    serviceType: "ultrasound",
    category: "diagnostic",
    bodyPart: "Extremities",
    views: ["Complete"],
    duration: 30,
    basePrice: 45,
    parameters: standardParameters,
  },

  // MAMMOGRAPHY
  {
    templateCode: "MAM-BIL-SCREEN",
    examName: "Bilateral Screening Mammography",
    serviceType: "mammography",
    category: "screening",
    bodyPart: "Chest",
    views: ["CC View", "MLO View"],
    duration: 20,
    basePrice: 55,
    parameters: standardParameters,
  },
  {
    templateCode: "MAM-BIL-DIAG",
    examName: "Bilateral Diagnostic Mammography",
    serviceType: "mammography",
    category: "diagnostic",
    bodyPart: "Chest",
    views: ["CC View", "MLO View", "Spot Compression"],
    duration: 25,
    basePrice: 65,
    parameters: standardParameters,
  },
  {
    templateCode: "MAM-UNI-DIAG",
    examName: "Unilateral Diagnostic Mammography",
    serviceType: "mammography",
    category: "diagnostic",
    bodyPart: "Chest",
    views: ["CC View", "MLO View"],
    duration: 20,
    basePrice: 45,
    parameters: standardParameters,
  },

  // FLUOROSCOPY
  {
    templateCode: "FLU-BARIUM-SWALLOW",
    examName: "Barium Swallow",
    serviceType: "fluoroscopy",
    category: "diagnostic",
    bodyPart: "Neck",
    views: ["Dynamic"],
    contrastRequired: true,
    contrastType: "barium",
    duration: 30,
    basePrice: 70,
    preparationInstructions: "NPO 6 hours.",
    parameters: standardParameters,
  },
  {
    templateCode: "FLU-BARIUM-MEAL",
    examName: "Barium Meal",
    serviceType: "fluoroscopy",
    category: "diagnostic",
    bodyPart: "Abdomen",
    views: ["Dynamic"],
    contrastRequired: true,
    contrastType: "barium",
    duration: 40,
    basePrice: 80,
    preparationInstructions: "NPO 8 hours.",
    parameters: standardParameters,
  },
  {
    templateCode: "FLU-BARIUM-ENEMA",
    examName: "Barium Enema",
    serviceType: "fluoroscopy",
    category: "diagnostic",
    bodyPart: "Abdomen",
    views: ["Dynamic"],
    contrastRequired: true,
    contrastType: "barium",
    duration: 45,
    basePrice: 85,
    preparationInstructions: "Bowel preparation required.",
    parameters: standardParameters,
  },
  {
    templateCode: "FLU-MCU",
    examName: "Micturating Cystourethrogram (MCU)",
    serviceType: "fluoroscopy",
    category: "diagnostic",
    bodyPart: "Pelvis",
    views: ["Dynamic"],
    contrastRequired: true,
    contrastType: "iodinated",
    duration: 40,
    basePrice: 90,
    parameters: standardParameters,
  },
  {
    templateCode: "FLU-HSG",
    examName: "Hysterosalpingography (HSG)",
    serviceType: "fluoroscopy",
    category: "interventional",
    bodyPart: "Pelvis",
    views: ["Dynamic"],
    contrastRequired: true,
    contrastType: "iodinated",
    duration: 35,
    basePrice: 95,
    parameters: standardParameters,
  },

  // PET-CT
  {
    templateCode: "PET-WB-ONCO",
    examName: "Whole Body PET-CT (Oncology)",
    serviceType: "pet-scan",
    category: "diagnostic",
    bodyPart: "Other",
    views: ["Whole Body"],
    contrastRequired: true,
    contrastType: "other",
    duration: 90,
    basePrice: 450,
    preparationInstructions: "Fasting 6 hours. Blood glucose assessment.",
    parameters: standardParameters,
  },
  {
    templateCode: "PET-BRAIN",
    examName: "PET-CT Brain",
    serviceType: "pet-scan",
    category: "diagnostic",
    bodyPart: "Brain",
    views: ["Complete"],
    contrastRequired: true,
    contrastType: "other",
    duration: 75,
    basePrice: 380,
    parameters: standardParameters,
  },
  {
    templateCode: "PET-CARDIAC",
    examName: "PET Cardiac Viability",
    serviceType: "pet-scan",
    category: "diagnostic",
    bodyPart: "Chest",
    views: ["Complete"],
    contrastRequired: true,
    contrastType: "other",
    duration: 90,
    basePrice: 420,
    parameters: standardParameters,
  },

  // BONE DENSITY
  {
    templateCode: "DEXA-SPINE-HIP",
    examName: "DEXA Spine & Hip",
    serviceType: "bone-density",
    category: "screening",
    bodyPart: "Spine",
    views: ["AP View"],
    duration: 20,
    basePrice: 45,
    parameters: [
      {
        parameterCode: "T_SCORE",
        parameterName: "T-Score",
        description: "Bone mineral density T-score",
      },
      {
        parameterCode: "Z_SCORE",
        parameterName: "Z-Score",
        description: "Bone mineral density Z-score",
      },
      {
        parameterCode: "INTERP",
        parameterName: "Interpretation",
        description: "Normal/Osteopenia/Osteoporosis",
      },
    ],
  },
  {
    templateCode: "DEXA-FOREARM",
    examName: "DEXA Forearm",
    serviceType: "bone-density",
    category: "screening",
    bodyPart: "Extremities",
    views: ["AP View"],
    duration: 15,
    basePrice: 30,
    parameters: [
      {
        parameterCode: "T_SCORE",
        parameterName: "T-Score",
      },
      {
        parameterCode: "Z_SCORE",
        parameterName: "Z-Score",
      },
      {
        parameterCode: "INTERP",
        parameterName: "Interpretation",
      },
    ],
  },
];

async function seedRadiologyTemplates() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI!);
    console.log("Connected to MongoDB.");

    const creatorUser =
      (await User.findOne({ role: "admin" })) ||
      (await User.findOne({ role: "radiologist" })) ||
      (await User.findOne({ role: "doctor" }));

    if (!creatorUser) {
      throw new Error(
        "No admin/radiologist/doctor user found. Create one user first.",
      );
    }

    console.log(
      `Using createdBy user: ${creatorUser.name} (${creatorUser.role})`,
    );

    let created = 0;
    let updated = 0;

    for (const template of templates) {
      const payload = {
        ...template,
        templateCode: template.templateCode.toUpperCase(),
        active: template.active ?? true,
        contrastRequired: template.contrastRequired ?? false,
        createdBy: creatorUser._id,
        parameters:
          template.parameters && template.parameters.length > 0
            ? template.parameters
            : standardParameters,
        clinicalIndicationTemplate:
          template.clinicalIndicationTemplate ||
          `Clinical indication for ${template.examName}.`,
        techniqueTemplate:
          template.techniqueTemplate ||
          `${template.serviceType.toUpperCase()} of ${template.bodyPart || "target region"} performed as per protocol.`,
        comparisonTemplate:
          template.comparisonTemplate || "No prior study available for comparison.",
        findingsTemplate:
          template.findingsTemplate ||
          `Findings:\n- ${template.bodyPart || "Target region"}: \n- Additional observations: `,
        impressionTemplate:
          template.impressionTemplate ||
          "Impression:\n1. \n2. ",
        recommendationTemplate:
          template.recommendationTemplate ||
          "Clinical correlation advised. Follow-up imaging if clinically indicated.",
        criticalFindingsChecklist:
          template.criticalFindingsChecklist || [
            "Acute hemorrhage",
            "Pneumothorax",
            "Bowel perforation",
            "Fracture/dislocation",
          ],
      };

      const existing = await RadiologyTemplate.findOne({
        templateCode: payload.templateCode,
      });

      if (existing) {
        await RadiologyTemplate.updateOne(
          { _id: existing._id },
          { $set: payload },
        );
        updated++;
      } else {
        await RadiologyTemplate.create(payload);
        created++;
      }
    }

    const total = await RadiologyTemplate.countDocuments();
    const byServiceType = await RadiologyTemplate.aggregate([
      {
        $group: {
          _id: "$serviceType",
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    console.log("\n=== Radiology Template Seeding Complete ===");
    console.log(`Catalog size: ${templates.length}`);
    console.log(`Created: ${created}`);
    console.log(`Updated: ${updated}`);
    console.log(`Total in DB: ${total}`);
    console.log("\nBy service type:");
    byServiceType.forEach((row: { _id: string; count: number }) => {
      console.log(`  ${row._id}: ${row.count}`);
    });
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
}

seedRadiologyTemplates();
