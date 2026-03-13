//example.tsx
const labTestCommentTemplates = [
  {
    id: "1",
    category: "Hematology",
    items: [
      {
        id: "1.1",
        name: "Reticulocyte Count",
        value: "",
        unit: "% of RBCs",
        normalRange: "0.5–1.5%",
        price: "700",
        comment:
          "Reticulocyte count measures the number of immature red blood cells (reticulocytes) in the blood and reflects bone marrow production of RBCs. It is used to evaluate anemia and to monitor response to treatment or recovery after blood loss.\n\nInterpretations:\nHigh: Increased RBC production, often after blood loss or hemolysis.\nLow: Decreased RBC production, which may be seen with bone marrow failure or nutrient deficiencies. Correlate with other blood tests.",
      },
      {
        id: "1.2",
        name: "Sickle Cell Count",
        value: "",
        unit: "",
        normalRange: "Negative",
        price: "1500",
        comment:
          "Sickle cell testing detects hemoglobin S (Hb S) or related variants to screen for or help diagnose sickle cell trait or disease.\n\nInterpretations:\nPositive/Detected: Hb S is present; follow-up testing (e.g., hemoglobin electrophoresis) is needed to distinguish trait vs disease.\nNegative/Not detected: Hb S not detected in the sample.",
      },
      {
        id: "1.3",
        name: "Coomb's Direct",
        value: "",
        unit: "",
        normalRange: "Negative",
        price: "700",
        comment:
          "Direct Coombs (Direct Antiglobulin Test, DAT) detects antibodies or complement attached to red blood cells. It helps evaluate hemolytic anemia, transfusion reactions, and hemolytic disease of the newborn.\n\nInterpretations:\nPositive: Antibodies/complement on RBCs; immune-mediated hemolysis is possible.\nNegative: Immune-mediated hemolysis is less likely.",
      },
      {
        id: "1.4",
        name: "Coomb's Indirect",
        value: "",
        unit: "",
        normalRange: "Negative",
        price: "700",
        comment:
          "Indirect Coombs (Indirect Antiglobulin Test) detects antibodies in serum that can bind to RBCs. It is used for pre‑transfusion testing and prenatal screening.\n\nInterpretations:\nPositive: RBC antibodies present; antibody identification and compatible blood are required.\nNegative: No detectable RBC antibodies.",
      },
      {
        id: "1.5",
        name: "Cross Matching",
        value: "",
        unit: "",
        normalRange: "Compatible",
        price: "200",
        comment:
          "Crossmatching checks compatibility between donor red blood cells and recipient serum to reduce transfusion reactions. It is performed after antibody screening or when clinically significant antibodies are present.\n\nInterpretations:\nCompatible: No reaction; unit is acceptable for transfusion.\nIncompatible: Reaction present; do not transfuse that unit.",
      },
      {
        id: "1.6",
        name: "Hb. Electrophoresis",
        value: "",
        unit: "%",
        normalRange: "HbA >95%, HbA2 <3.5%, HbF <1%",
        price: "3000",
        comment:
          "Hemoglobin electrophoresis separates hemoglobin types and helps detect abnormal hemoglobins. It is used to evaluate anemia, sickle cell disease/trait, and other hemoglobin disorders.\n\nInterpretations:\nAbnormal hemoglobin fractions suggest a hemoglobinopathy; interpret with clinical context and confirmatory testing.",
      },
      {
        id: "1.7",
        name: "Protein Electrophoresis",
        value: "",
        unit: "g/dL",
        normalRange: "Total: 6.4–8.3, Albumin: 3.5–5.0",
        price: "3000",
        comment:
          "Serum protein electrophoresis separates proteins into fractions (albumin and globulins). It helps evaluate conditions that alter protein levels, including plasma cell disorders, liver/kidney disease, inflammation, and autoimmune disease.\n\nInterpretations:\nAbnormal patterns (e.g., monoclonal spike or marked fraction changes) suggest a protein disorder and require clinical correlation.",
      },
      {
        id: "1.8",
        name: "Special Smear",
        value: "",
        unit: "",
        normalRange: "See report",
        price: "1200",
        comment:
          "A peripheral blood smear (special smear) examines the size, shape, and appearance of blood cells. It helps evaluate anemia, blood and bone marrow disorders, infections, and parasitic diseases.\n\nInterpretations:\nFindings are descriptive; abnormal cell morphology guides diagnosis with other tests.",
      },
      {
        id: "1.9",
        name: "Osmotic Fragility Test",
        value: "",
        unit: "%",
        normalRange: "0.45–0.30% NaCl",
        price: "800",
        comment:
          "Osmotic fragility testing evaluates red blood cell resistance to hemolysis in hypotonic saline. Increased fragility is characteristic of hereditary spherocytosis (an RBC membrane disorder).\n\nInterpretations:\nIncreased fragility: Supports hereditary spherocytosis.\nNormal/low fragility: Suggests other causes of anemia; interpret with clinical context.",
      },
      {
        id: "1.10",
        name: "G6PD",
        value: "",
        unit: "U/g Hb",
        normalRange: ">4.6",
        price: "1000",
        comment:
          "G6PD testing measures glucose‑6‑phosphate dehydrogenase enzyme activity in RBCs. It is used to diagnose G6PD deficiency, which can cause hemolysis after infections, medications, or certain foods.\n\nInterpretations:\nLow activity: G6PD deficiency.\nNormal activity: Deficiency unlikely; results can be falsely normal during acute hemolysis.",
      },
    ],
  },
  {
    id: "2",
    category: "Pancreatic Profile",
    items: [
      {
        id: "2.1",
        name: "Amylase Level",
        value: "",
        unit: "U/L",
        normalRange: "30–110",
        price: "600",
        comment:
          "Amylase measures an enzyme from the pancreas and salivary glands. It helps evaluate suspected pancreatitis.\n\nInterpretations:\nHigh: Pancreatitis or other conditions (e.g., salivary disease); interpret with lipase and symptoms.\nNormal/low: Acute pancreatitis less likely.",
      },
      {
        id: "2.2",
        name: "Lipase Level",
        value: "",
        unit: "U/L",
        normalRange: "10–140",
        price: "600",
        comment:
          "Lipase is an enzyme mainly from the pancreas. It is more specific than amylase for pancreatitis.\n\nInterpretations:\nHigh: Pancreatitis or pancreatic injury.\nNormal: Acute pancreatitis less likely.",
      },
    ],
  },
  {
    id: "3",
    category: "Hormones and Immunoassay",
    items: [
      {
        id: "3.1",
        name: "T3",
        value: "",
        unit: "ng/dL",
        normalRange: "80–200",
        price: "600",
        comment:
          "T3 measures triiodothyronine, an active thyroid hormone. It helps evaluate thyroid function, especially suspected hyperthyroidism.\n\nInterpretations:\nHigh: Often seen in hyperthyroidism.\nLow: May be seen in hypothyroidism or severe non-thyroid illness.",
      },
      {
        id: "3.2",
        name: "T4",
        value: "",
        unit: "µg/dL",
        normalRange: "5–12",
        price: "600",
        comment:
          "T4 measures thyroxine, the main hormone produced by the thyroid. It is used with TSH to assess thyroid function.\n\nInterpretations:\nHigh: Suggests hyperthyroidism or excess thyroid hormone replacement.\nLow: Suggests hypothyroidism or pituitary disease.",
      },
      {
        id: "3.3",
        name: "TSH",
        value: "",
        unit: "µIU/mL",
        normalRange: "0.4–4.5",
        price: "600",
        comment:
          "TSH (thyroid-stimulating hormone) is the primary screening test for thyroid disorders. It reflects pituitary control of the thyroid.\n\nInterpretations:\nHigh TSH: Primary hypothyroidism (underactive thyroid).\nLow TSH: Hyperthyroidism or excessive thyroid hormone replacement.",
      },
      {
        id: "3.4",
        name: "FT3",
        value: "",
        unit: "pg/mL",
        normalRange: "2.3–4.2",
        price: "800",
        comment:
          "Free T3 (FT3) measures the unbound, active fraction of T3. It helps assess hyperthyroidism, especially when total T3 is misleading.\n\nInterpretations:\nHigh: Supports hyperthyroidism (T3 toxicosis).\nLow: May be seen in hypothyroidism or severe illness.",
      },
      {
        id: "3.5",
        name: "FT4",
        value: "",
        unit: "ng/dL",
        normalRange: "0.8–1.8",
        price: "800",
        comment:
          "Free T4 (FT4) measures the unbound, active fraction of T4. It is interpreted with TSH for thyroid disorders.\n\nInterpretations:\nHigh: Hyperthyroidism or excess replacement.\nLow: Hypothyroidism or central (pituitary) hypothyroidism.",
      },
      {
        id: "3.6",
        name: "Hba1c",
        value: "",
        unit: "%",
        normalRange: "<5.7",
        price: "800",
        comment:
          "Hemoglobin A1c (HbA1c) reflects average blood glucose over about 2-3 months. It is used to diagnose and monitor diabetes and prediabetes.\n\nInterpretations:\n<5.7%: Normal\n5.7-6.4%: Prediabetes\n>=6.5%: Diabetes (confirm with repeat testing).",
      },
      {
        id: "3.7",
        name: "TG (Thyroglobulin)",
        value: "",
        unit: "ng/mL",
        normalRange: "3–40",
        price: "2500",
        comment:
          "Thyroglobulin (TG) is a protein made by thyroid cells. It is mainly used as a tumor marker after treatment for differentiated thyroid cancer.\n\nInterpretations:\nUndetectable after thyroid removal: Expected.\nRising or detectable: Possible residual or recurrent disease (interpret with anti-TG antibodies).",
      },
      {
        id: "3.8",
        name: "Calcitonin",
        value: "",
        unit: "pg/mL",
        normalRange: "<10",
        price: "3000",
        comment:
          "Calcitonin is produced by thyroid C-cells. It is a tumor marker for medullary thyroid cancer and is used for diagnosis and follow-up.\n\nInterpretations:\nHigh: Suggests medullary thyroid cancer or other neuroendocrine tumors.\nNormal: Makes medullary thyroid cancer less likely.",
      },
      {
        id: "3.9",
        name: "Anti TPO Ab",
        value: "",
        unit: "IU/mL",
        normalRange: "<35",
        price: "2500",
        comment:
          "Anti-TPO antibodies target thyroid peroxidase and are markers of autoimmune thyroid disease.\n\nInterpretations:\nPositive: Supports Hashimoto thyroiditis or Graves disease.\nNegative: Does not completely exclude autoimmune thyroid disease.",
      },
      {
        id: "3.10",
        name: "Anti TG Ab",
        value: "",
        unit: "IU/mL",
        normalRange: "<20",
        price: "2500",
        comment:
          "Anti-thyroglobulin (Anti-TG) antibodies are markers of autoimmune thyroid disease and can interfere with thyroglobulin tumor marker testing.\n\nInterpretations:\nPositive: Supports autoimmune thyroid disease; TG tumor marker may be unreliable.\nNegative: Antibody interference is unlikely.",
      },
      {
        id: "3.11",
        name: "TSH Receptor Ab",
        value: "",
        unit: "IU/L",
        normalRange: "<1.75",
        price: "3000",
        comment:
          "TSH receptor antibodies (TRAb) stimulate the thyroid and are strongly associated with Graves disease.\n\nInterpretations:\nPositive: Supports Graves disease; also used in pregnancy to assess fetal risk.\nNegative: Graves disease less likely, but not excluded.",
      },
      {
        id: "3.12",
        name: "PTH",
        value: "",
        unit: "pg/mL",
        normalRange: "15–65",
        price: "2000",
        comment:
          "Parathyroid hormone (PTH) regulates calcium and phosphorus. It is used to evaluate hypercalcemia or hypocalcemia.\n\nInterpretations:\nHigh PTH with high calcium: Primary hyperparathyroidism.\nHigh PTH with low/normal calcium: Secondary hyperparathyroidism (e.g., vitamin D deficiency, kidney disease).\nLow PTH: Hypoparathyroidism or non-PTH mediated hypercalcemia.",
      },
      {
        id: "3.13",
        name: "FSH",
        value: "",
        unit: "mIU/mL",
        normalRange:
          "Follicular: 3–10, Ovulatory: 5–20, Luteal: 1.5–9, Postmenopausal: >20",
        price: "1000",
        comment:
          "FSH (follicle-stimulating hormone) controls ovarian and testicular function. It is used in infertility, menstrual disorders, and pituitary evaluation.\n\nInterpretations:\nHigh: Primary gonadal failure or menopause.\nLow: Pituitary or hypothalamic dysfunction.",
      },
      {
        id: "3.14",
        name: "LH",
        value: "",
        unit: "mIU/mL",
        normalRange:
          "Follicular: 2–9, Ovulatory: 10–60, Luteal: 1–9, Postmenopausal: >15",
        price: "1000",
        comment:
          "LH (luteinizing hormone) regulates ovulation and testosterone production. It is used in infertility and pituitary evaluation.\n\nInterpretations:\nHigh: Primary gonadal failure or menopause; LH surge indicates ovulation.\nLow: Pituitary or hypothalamic dysfunction.",
      },
      {
        id: "3.15",
        name: "Prolactin",
        value: "",
        unit: "ng/mL",
        normalRange: "Male: 2–18, Female: 3–30",
        price: "1200",
        comment:
          "Prolactin is a pituitary hormone involved in lactation. It is used to evaluate infertility, galactorrhea, and pituitary disorders.\n\nInterpretations:\nHigh: May indicate prolactinoma, medications, hypothyroidism, or pregnancy.\nLow: Usually not clinically significant.",
      },
      {
        id: "3.16",
        name: "Testosterone Total",
        value: "",
        unit: "ng/dL",
        normalRange: "Male: 300–1000, Female: 15–70",
        price: "1200",
        comment:
          "Total testosterone measures all circulating testosterone. It is used to evaluate androgen excess or deficiency.\n\nInterpretations:\nLow: Hypogonadism or pituitary disease.\nHigh: Androgen excess (e.g., tumors, PCOS in females).",
      },
      {
        id: "3.17",
        name: "Testosterone Free",
        value: "",
        unit: "pg/mL",
        normalRange: "Male: 50–210, Female: 1–8",
        price: "2500",
        comment:
          "Free testosterone measures the unbound, biologically active fraction. It is useful when SHBG is abnormal.\n\nInterpretations:\nLow: Androgen deficiency.\nHigh: Androgen excess.",
      },
      {
        id: "3.18",
        name: "Estradiol (E2)",
        value: "",
        unit: "pg/mL",
        normalRange:
          "Follicular: 20–150, Ovulatory: 100–500, Luteal: 60–200, Postmenopausal: <20",
        price: "1500",
        comment:
          "Estradiol (E2) is the main estrogen in reproductive-age females. It helps evaluate ovarian function, menstrual disorders, and infertility.\n\nInterpretations:\nLow: Ovarian failure or menopause.\nHigh: Pregnancy, estrogen-producing tumors, or ovarian stimulation.",
      },
      {
        id: "3.19",
        name: "Progesterone",
        value: "",
        unit: "ng/mL",
        normalRange: "Follicular: <1, Luteal: 5–20",
        price: "1000",
        comment:
          "Progesterone is produced after ovulation and during pregnancy. It is used to confirm ovulation and assess luteal function or early pregnancy support.\n\nInterpretations:\nLow mid-luteal: Suggests anovulation or luteal phase defect.\nHigh: Indicates ovulation; high in pregnancy.",
      },
      {
        id: "3.20",
        name: "DHEA SO4",
        value: "",
        unit: "µg/dL",
        normalRange: "Male: 100–400, Female: 50–300",
        price: "3000",
        comment:
          "DHEA-S is an adrenal androgen. It helps evaluate adrenal androgen excess.\n\nInterpretations:\nHigh: May indicate adrenal hyperplasia or adrenal tumor.\nLow: May be seen with adrenal insufficiency or aging.",
      },
      {
        id: "3.21",
        name: "AMH Level",
        value: "",
        unit: "ng/mL",
        normalRange: "1–3.5",
        price: "2500",
        comment:
          "AMH (anti-Mullerian hormone) reflects ovarian reserve. It is used in infertility evaluation and to estimate response to fertility treatment.\n\nInterpretations:\nLow: Reduced ovarian reserve.\nHigh: Often seen in polycystic ovary syndrome (PCOS).",
      },
      {
        id: "3.22",
        name: "Beta HCG",
        value: "",
        unit: "mIU/mL",
        normalRange: "<5 (Non-pregnant)",
        price: "1000",
        comment:
          "Beta-hCG is a pregnancy hormone produced by the placenta. It is used to detect and monitor pregnancy and certain tumors.\n\nInterpretations:\nPositive: Pregnancy or hCG-producing tumor.\nSerial rise in early pregnancy is expected; abnormal trends may suggest ectopic or failing pregnancy.",
      },
      {
        id: "3.23",
        name: "Sex Hormone Binding Globulin (SHBG)",
        value: "",
        unit: "nmol/L",
        normalRange: "Male: 10–60, Female: 20–130",
        price: "2500",
        comment:
          "SHBG binds sex hormones (testosterone and estradiol) and affects free hormone levels.\n\nInterpretations:\nHigh SHBG: Can lower free testosterone (e.g., hyperthyroidism, liver disease).\nLow SHBG: Can increase free androgens (e.g., obesity, insulin resistance).",
      },
      {
        id: "3.24",
        name: "Dihydrotestosterone (DHT)",
        value: "",
        unit: "ng/dL",
        normalRange: "Male: 30–85, Female: 5–20",
        price: "2500",
        comment:
          "Dihydrotestosterone (DHT) is a potent androgen made from testosterone. Testing can help evaluate androgen-related conditions.\n\nInterpretations:\nHigh: Androgen excess.\nLow: May be seen with 5-alpha-reductase deficiency or androgen insensitivity.",
      },
      {
        id: "3.25",
        name: "Aldosterone",
        value: "",
        unit: "ng/dL",
        normalRange: "4–31",
        price: "3500",
        comment:
          "Aldosterone helps regulate sodium, potassium, and blood pressure. It is used to evaluate hypertension and electrolyte disorders.\n\nInterpretations:\nHigh: Suggests primary aldosteronism or secondary causes (e.g., renal artery stenosis).\nLow: May indicate adrenal insufficiency or hypoaldosteronism.",
      },
      {
        id: "3.26",
        name: "Plasma Direct Renin",
        value: "",
        unit: "µIU/mL",
        normalRange: "5–50",
        price: "3500",
        comment:
          "Renin is an enzyme that regulates aldosterone. It is measured with aldosterone to evaluate hypertension and adrenal causes.\n\nInterpretations:\nLow renin with high aldosterone: Suggests primary aldosteronism.\nHigh renin: Suggests secondary aldosteronism or volume depletion.",
      },
      {
        id: "3.27",
        name: "Aldosterone: Renin Ratio",
        value: "",
        unit: "",
        normalRange: "<30",
        price: "5000",
        comment:
          "Aldosterone:renin ratio (ARR) is used to screen for primary aldosteronism in patients with hypertension and/or low potassium.\n\nInterpretations:\nHigh ARR: Suggests primary aldosteronism; confirm with additional testing.\nNormal/low ARR: Primary aldosteronism less likely.",
      },
      {
        id: "3.28",
        name: "Cortisol",
        value: "",
        unit: "µg/dL",
        normalRange: "Morning: 5–25, Evening: 2–10",
        price: "1000",
        comment:
          "Cortisol is the main stress hormone produced by the adrenal glands. It is used to evaluate Cushing syndrome and adrenal insufficiency.\n\nInterpretations:\nHigh: Suggests Cushing syndrome or stress response.\nLow: Suggests adrenal insufficiency.",
      },
      {
        id: "3.29",
        name: "ACTH",
        value: "",
        unit: "pg/mL",
        normalRange: "10–60",
        price: "2500",
        comment:
          "ACTH (adrenocorticotropic hormone) stimulates cortisol production. It is measured to distinguish pituitary vs adrenal causes of cortisol abnormalities.\n\nInterpretations:\nHigh ACTH with high cortisol: Suggests ACTH-dependent Cushing syndrome.\nLow ACTH with high cortisol: Suggests adrenal source.\nHigh ACTH with low cortisol: Suggests primary adrenal insufficiency.",
      },
      {
        id: "3.30",
        name: "17-OH Progesterone",
        value: "",
        unit: "ng/dL",
        normalRange: "Male: 30–200, Female Follicular: 15–70",
        price: "3000",
        comment:
          "17-OH progesterone is used to screen for congenital adrenal hyperplasia (CAH), especially 21-hydroxylase deficiency.\n\nInterpretations:\nHigh: Suggests CAH.\nNormal: CAH less likely.",
      },
      {
        id: "3.31",
        name: "Growth Hormone",
        value: "",
        unit: "ng/mL",
        normalRange: "<5",
        price: "2500",
        comment:
          "Growth hormone (GH) is involved in growth and metabolism. Because GH is released in pulses, stimulation or suppression tests are often required.\n\nInterpretations:\nHigh or low random values are hard to interpret; use dynamic testing and IGF-1 levels.",
      },
      {
        id: "3.32",
        name: "Insulin-Like Growth Factor 1 (IGF-1)",
        value: "",
        unit: "ng/mL",
        normalRange: "Age-dependent",
        price: "3000",
        comment:
          "IGF-1 reflects average growth hormone activity and is used to evaluate growth disorders and acromegaly.\n\nInterpretations:\nHigh: Suggests GH excess (acromegaly).\nLow: Suggests GH deficiency or malnutrition.",
      },
      {
        id: "3.33",
        name: "Insulin Fasting",
        value: "",
        unit: "µIU/mL",
        normalRange: "2–20",
        price: "2000",
        comment:
          "Fasting insulin is used with glucose to assess insulin resistance and beta-cell function.\n\nInterpretations:\nHigh with normal/high glucose: Suggests insulin resistance.\nLow with high glucose: Suggests insulin deficiency.",
      },
      {
        id: "3.34",
        name: "C-Peptide",
        value: "",
        unit: "ng/mL",
        normalRange: "0.5–2.7",
        price: "2000",
        comment:
          "C-peptide is released with endogenous insulin. It helps distinguish insulin produced by the body from injected insulin.\n\nInterpretations:\nLow: Suggests low endogenous insulin (type 1 diabetes).\nHigh: Suggests insulin resistance or insulinoma.",
      },
      {
        id: "3.35",
        name: "Gastrin-17",
        value: "",
        unit: "pg/mL",
        normalRange: "<10",
        price: "3000",
        comment:
          "Gastrin is a hormone that stimulates stomach acid. It is used to evaluate suspected Zollinger-Ellison syndrome or other causes of high acid production.\n\nInterpretations:\nHigh: May indicate gastrinoma, atrophic gastritis, or proton pump inhibitor use.\nNormal: Zollinger-Ellison syndrome less likely.",
      },
    ],
  },
  {
    id: "4",
    category: "Coagulation Profile",
    items: [
      {
        id: "4.1",
        name: "PT/ INR",
        value: "",
        unit: "sec/INR",
        normalRange: "PT: 11–13.5, INR: 0.8–1.1",
        price: "400",
        comment:
          "PT/INR measures how long blood takes to clot and is used to monitor warfarin and assess clotting function.\n\nInterpretations:\nHigh INR/PT: Blood clots more slowly (higher bleeding risk).\nLow INR/PT: Blood clots more quickly (higher clot risk).",
      },
      {
        id: "4.2",
        name: "APTT",
        value: "",
        unit: "sec",
        normalRange: "25–35",
        price: "400",
        comment:
          "APTT evaluates the intrinsic clotting pathway and is used to detect bleeding disorders or monitor heparin.\n\nInterpretations:\nProlonged: Possible clotting factor deficiency, anticoagulant effect, or inhibitor.\nNormal: Major intrinsic pathway defect less likely.",
      },
      {
        id: "4.3",
        name: "Mixing Study",
        value: "",
        unit: "",
        normalRange: "Correction",
        price: "1800",
        comment:
          "Mixing study helps distinguish clotting factor deficiency from an inhibitor. Patient plasma is mixed with normal plasma and APTT/PT is rechecked.\n\nInterpretations:\nCorrection: Suggests factor deficiency.\nNo correction: Suggests inhibitor (e.g., lupus anticoagulant).",
      },
    ],
  },
  {
    id: "5",
    category: "Iron Profile",
    items: [
      {
        id: "5.1",
        name: "Iron Level",
        value: "",
        unit: "µg/dL",
        normalRange: "60–170",
        price: "1500",
        comment:
          "Serum iron measures circulating iron and is used with ferritin and TIBC to assess iron status.\n\nInterpretations:\nLow: Iron deficiency or chronic disease.\nHigh: Iron overload or increased release from cells.",
      },
      {
        id: "5.2",
        name: "Ferritin Level",
        value: "",
        unit: "ng/mL",
        normalRange: "Male: 20–250, Female: 10–150",
        price: "1500",
        comment:
          "Ferritin reflects iron stores in the body.\n\nInterpretations:\nLow: Iron deficiency.\nHigh: Iron overload or inflammation/liver disease.",
      },
      {
        id: "5.3",
        name: "TIBC",
        value: "",
        unit: "µg/dL",
        normalRange: "250–400",
        price: "2000",
        comment:
          "TIBC reflects the blood’s capacity to bind iron (transferrin availability).\n\nInterpretations:\nHigh: Iron deficiency.\nLow: Inflammation or iron overload.",
      },
      {
        id: "5.4",
        name: "S.Transferrin",
        value: "",
        unit: "mg/dL",
        normalRange: "200–360",
        price: "2000",
        comment:
          "Transferrin is the main iron‑transport protein.\n\nInterpretations:\nHigh: Iron deficiency.\nLow: Inflammation, malnutrition, or iron overload.",
      },
    ],
  },
  {
    id: "6",
    category: "Routine Chemistry",
    items: [
      {
        id: "6.1",
        name: "Gamma GT",
        value: "",
        unit: "U/L",
        normalRange: "Male: 8–40, Female: 5–30",
        price: "500",
        comment:
          "Gamma‑glutamyl transferase (GGT) is a liver enzyme. The test helps evaluate liver and bile duct disorders and is interpreted with other liver tests.\n\nInterpretations:\nHigh GGT: May indicate liver or bile duct disease, alcohol use, or medication effects.\nNormal GGT: Makes significant GGT‑related liver injury less likely; interpret with other results.",
      },
      {
        id: "6.2",
        name: "Total Protein",
        value: "",
        unit: "g/dL",
        normalRange: "6.4–8.3",
        price: "200",
        comment:
          "Total protein measures the combined amount of albumin and globulins. It helps assess nutritional status, liver and kidney disease, and inflammatory or immune conditions.\n\nInterpretations:\nHigh total protein: May reflect dehydration or increased globulins.\nLow total protein: May reflect malnutrition, liver disease, or protein loss.\nAlways interpret with albumin and A/G ratio.",
      },
      {
        id: "6.3",
        name: "Albumin",
        value: "",
        unit: "g/dL",
        normalRange: "3.5–5.0",
        price: "200",
        comment:
          "Albumin is a major blood protein made by the liver. It helps maintain fluid balance and transports substances in the blood.\n\nInterpretations:\nLow albumin: May be seen with liver disease, kidney disease, inflammation, or malnutrition.\nHigh albumin: Often due to dehydration.",
      },
      {
        id: "6.4",
        name: "Globulin",
        value: "",
        unit: "g/dL",
        normalRange: "2.0–3.5",
        price: "200",
        comment:
          "Globulins are a group of proteins involved in immune function and transport. Globulin testing helps evaluate liver/kidney disease, immune disorders, and certain cancers.\n\nInterpretations:\nHigh globulin: May be seen with inflammation, infection, or immune disorders.\nLow globulin: May be seen with malnutrition or some kidney/liver conditions.",
      },
      {
        id: "6.5",
        name: "A/G Ratio",
        value: "",
        unit: "",
        normalRange: "1.0–2.0",
        price: "200",
        comment:
          "The albumin/globulin (A/G) ratio compares albumin to globulins. It helps interpret changes in total protein.\n\nInterpretations:\nLow A/G ratio: May reflect low albumin or high globulins (e.g., liver disease, inflammation, autoimmune disorders).\nHigh A/G ratio: May reflect low globulins or high albumin (e.g., dehydration).",
      },
    ],
  },
  {
    id: "7",
    category: "Cardiac Enzymes",
    items: [
      {
        id: "7.1",
        name: "LDH",
        value: "",
        unit: "U/L",
        normalRange: "140–280",
        price: "500",
        comment:
          "LDH (lactate dehydrogenase) is found in many tissues. High LDH usually means some type of tissue damage and must be interpreted with other tests and symptoms.\n\nInterpretations:\nHigh: Tissue damage from disease, infection, or injury; not specific to one organ.\nNormal/low: Significant LDH‑related tissue damage is less likely.",
      },
      {
        id: "7.2",
        name: "CPK",
        value: "",
        unit: "U/L",
        normalRange: "Male: 55–170, Female: 30–145",
        price: "500",
        comment:
          "Total CK (CPK) measures creatine kinase from muscle. CK rises when skeletal muscle, heart, or brain tissue is damaged.\n\nInterpretations:\nHigh: Muscle damage (injury, inflammation, or other causes).\nNormal: Significant CK‑related muscle damage is less likely.",
      },
      {
        id: "7.3",
        name: "CK-MB",
        value: "",
        unit: "U/L",
        normalRange: "<5% of total CK",
        price: "500",
        comment:
          "CK‑MB is a creatine kinase isoenzyme more specific to heart muscle. It can rise with heart muscle injury but may also increase with other conditions.\n\nInterpretations:\nHigh CK‑MB: Possible heart muscle injury; interpret with symptoms and troponin.\nNormal: Significant CK‑MB elevation is unlikely.",
      },
      {
        id: "7.4",
        name: "Troponin I",
        value: "",
        unit: "ng/mL",
        normalRange: "<0.04",
        price: "1000",
        comment:
          "Troponin I is a heart‑specific protein released when heart muscle is damaged. It is a primary test for suspected heart attack.\n\nInterpretations:\nHigh: Heart muscle injury (often heart attack).\nNormal: No evidence of significant troponin‑detectable injury at the time of testing.",
      },
      {
        id: "7.5",
        name: "Troponin T",
        value: "",
        unit: "ng/mL",
        normalRange: "<0.01",
        price: "1000",
        comment:
          "Troponin T is a heart‑specific protein released with heart muscle damage. It is used to diagnose and monitor heart injury.\n\nInterpretations:\nHigh: Heart muscle injury (often heart attack).\nNormal: No evidence of significant troponin‑detectable injury at the time of testing.",
      },
      {
        id: "7.6",
        name: "D-Dimer",
        value: "",
        unit: "ng/mL",
        normalRange: "<250",
        price: "1000",
        comment:
          "D‑dimer is a protein fragment produced when blood clots break down. It is used to evaluate possible blood clotting disorders (e.g., DVT or PE).\n\nInterpretations:\nLow/normal: Blood clotting disorder is unlikely.\nHigh: Possible clotting disorder; additional tests are needed to locate a clot and confirm cause.",
      },
      {
        id: "7.7",
        name: "Myoglobin",
        value: "",
        unit: "ng/mL",
        normalRange: "Male: 20–80, Female: 15–60",
        price: "2500",
        comment:
          "Myoglobin is a muscle protein released into blood when muscle is damaged. It can rise with heart or skeletal muscle injury.\n\nInterpretations:\nHigh: Muscle damage (e.g., heart attack, rhabdomyolysis, or muscle injury).\nNormal: Significant muscle damage is less likely.",
      },
      {
        id: "7.8",
        name: "Angiotensin Converting Enzyme (ACE)",
        value: "",
        unit: "U/L",
        normalRange: "8–52",
        price: "3000",
        comment:
          "ACE (angiotensin‑converting enzyme) is measured to help diagnose or monitor sarcoidosis and related conditions.\n\nInterpretations:\nHigh: May support sarcoidosis (not specific).\nNormal: Does not exclude sarcoidosis; interpret with clinical findings.",
      },
    ],
  },
  {
    id: "8",
    category: "Electrolytes and AGBs",
    items: [
      {
        id: "8.1",
        name: "Na, K, Cl",
        value: "",
        unit: "mmol/L",
        normalRange: "Na: 135–145, K: 3.5–5.1, Cl: 98–107",
        price: "800",
        comment:
          "Sodium, potassium, and chloride are key electrolytes that help control fluid balance and nerve/muscle function.\n\nInterpretations:\nHigh/low levels suggest fluid or electrolyte imbalance, kidney disease, or medication effects; interpret together.",
      },
      {
        id: "8.2",
        name: "Calcium Ca",
        value: "",
        unit: "mg/dL",
        normalRange: "8.5–10.2",
        price: "200",
        comment:
          "Calcium testing evaluates calcium balance and parathyroid, kidney, or bone disorders.\n\nInterpretations:\nHigh: Hyperparathyroidism, malignancy, or vitamin D excess.\nLow: Hypoparathyroidism, vitamin D deficiency, or kidney disease.",
      },
      {
        id: "8.3",
        name: "Mg",
        value: "",
        unit: "mg/dL",
        normalRange: "1.7–2.2",
        price: "200",
        comment:
          "Magnesium is an electrolyte involved in muscle, nerve, and heart function.\n\nInterpretations:\nLow: Malabsorption, losses, or medications.\nHigh: Often due to kidney failure or excess intake.",
      },
      {
        id: "8.4",
        name: "Phosphorus",
        value: "",
        unit: "mg/dL",
        normalRange: "2.5–4.5",
        price: "1000",
        comment:
          "Phosphorus (phosphate) helps with bone and energy metabolism.\n\nInterpretations:\nHigh: Kidney disease or cell breakdown.\nLow: Malnutrition, vitamin D deficiency, or hyperparathyroidism.",
      },
      {
        id: "8.5",
        name: "Zinc",
        value: "",
        unit: "µg/dL",
        normalRange: "70–120",
        price: "2000",
        comment:
          "Zinc is a trace mineral important for immunity and wound healing.\n\nInterpretations:\nLow: Possible deficiency (malnutrition, malabsorption).\nHigh: Excess supplementation or exposure.",
      },
      {
        id: "8.6",
        name: "ABGs (18 parameters)",
        value: "",
        unit: "Various",
        normalRange: "pH: 7.35–7.45, pCO2: 35–45, pO2: 80–100, HCO3: 22–26",
        price: "2000",
        comment:
          "Arterial blood gases (ABGs) assess oxygenation, ventilation, and acid‑base balance.\n\nInterpretations:\nAbnormal pH/PaCO2/HCO3 indicate respiratory or metabolic acidosis/alkalosis; interpret with clinical context.",
      },
    ],
  },
  {
    id: "9",
    category: "Vitamins",
    items: [
      {
        id: "9.1",
        name: "25 OH Vit D",
        value: "",
        unit: "ng/mL",
        normalRange: "30–100",
        price: "1500",
        comment:
          "25‑OH Vitamin D is the best test for vitamin D status.\n\nInterpretations:\nLow: Vitamin D deficiency/insufficiency.\nHigh: Possible excess or toxicity.",
      },
      {
        id: "9.2",
        name: "Vitamin B9 (Folic Acid)",
        value: "",
        unit: "ng/mL",
        normalRange: "5–20",
        price: "2000",
        comment:
          "Folate (vitamin B9) testing helps evaluate anemia and nutritional status.\n\nInterpretations:\nLow: Folate deficiency (megaloblastic anemia risk).\nHigh: Usually from supplementation.",
      },
      {
        id: "9.3",
        name: "Vit B12",
        value: "",
        unit: "pg/mL",
        normalRange: "200–900",
        price: "1500",
        comment:
          "Vitamin B12 testing evaluates megaloblastic anemia and neurologic symptoms.\n\nInterpretations:\nLow: B12 deficiency.\nNormal/high: Deficiency less likely (consider MMA if uncertain).",
      },
    ],
  },
  {
    id: "10",
    category: "Screening By ELISA",
    items: [
      {
        id: "10.1",
        name: "TB-IGRA (CLIA)",
        value: "",
        unit: "",
        normalRange: "Negative",
        price: "4500",
        comment:
          "TB-IGRA (IGRA blood test) measures immune response to TB proteins. It helps detect TB infection but does not distinguish active vs latent TB.\n\nInterpretations:\nPositive: TB infection likely; evaluate for active disease.\nNegative: TB infection less likely, but does not fully exclude it.",
      },
      {
        id: "10.2",
        name: "Hbs Ag",
        value: "",
        unit: "",
        normalRange: "Non-reactive",
        price: "1000",
        comment:
          "HBsAg (hepatitis B surface antigen) indicates current hepatitis B infection.\n\nInterpretations:\nPositive: Active HBV infection (acute or chronic).\nNegative: No current HBV infection detected.",
      },
      {
        id: "10.3",
        name: "Hbs Ab",
        value: "",
        unit: "mIU/mL",
        normalRange: ">10 (Protective)",
        price: "1000",
        comment:
          "HBsAb (anti-HBs) indicates immunity to hepatitis B from vaccination or past infection.\n\nInterpretations:\nPositive: Immune to HBV.\nNegative: Not immune; consider vaccination if appropriate.",
      },
      {
        id: "10.4",
        name: "Hbe Ag",
        value: "",
        unit: "",
        normalRange: "Non-reactive",
        price: "1500",
        comment:
          "HBeAg is associated with active hepatitis B viral replication and higher infectivity.\n\nInterpretations:\nPositive: Higher viral replication and infectivity.\nNegative: Lower replication (not always inactive).",
      },
      {
        id: "10.5",
        name: "Hbe Ab",
        value: "",
        unit: "",
        normalRange: "Non-reactive",
        price: "1500",
        comment:
          "HBeAb (anti-HBe) develops after HBeAg and often indicates lower HBV replication.\n\nInterpretations:\nPositive: Seroconversion; usually lower infectivity.\nNegative: No seroconversion yet.",
      },
      {
        id: "10.6",
        name: "Hbc Total",
        value: "",
        unit: "",
        normalRange: "Non-reactive",
        price: "1500",
        comment:
          "Total anti-HBc indicates past or current hepatitis B infection (not from vaccination).\n\nInterpretations:\nPositive: Previous or ongoing HBV infection.\nNegative: No evidence of prior HBV infection.",
      },
      {
        id: "10.7",
        name: "Hbc IgM",
        value: "",
        unit: "",
        normalRange: "Non-reactive",
        price: "1800",
        comment:
          "Anti-HBc IgM indicates recent or acute hepatitis B infection.\n\nInterpretations:\nPositive: Acute or recent HBV infection (or flare of chronic infection).\nNegative: Acute HBV less likely.",
      },
      {
        id: "10.8",
        name: "HCV Ab",
        value: "",
        unit: "",
        normalRange: "Non-reactive",
        price: "1500",
        comment:
          "HCV Ab detects antibodies to hepatitis C. It indicates exposure but does not confirm active infection.\n\nInterpretations:\nPositive: Prior exposure; confirm with HCV RNA test.\nNegative: No evidence of exposure (early infection still possible).",
      },
      {
        id: "10.9",
        name: "HEV IgG",
        value: "",
        unit: "",
        normalRange: "Non-reactive",
        price: "2500",
        comment:
          "HEV IgG indicates past hepatitis E infection or immunity.\n\nInterpretations:\nPositive: Past infection or immunity.\nNegative: No evidence of prior HEV infection.",
      },
      {
        id: "10.10",
        name: "HEV IgM",
        value: "",
        unit: "",
        normalRange: "Non-reactive",
        price: "2500",
        comment:
          "HEV IgM indicates recent or acute hepatitis E infection.\n\nInterpretations:\nPositive: Recent/acute HEV infection.\nNegative: Acute HEV less likely.",
      },
      {
        id: "10.11",
        name: "HDV IgG/IgM",
        value: "",
        unit: "",
        normalRange: "Non-reactive",
        price: "2500",
        comment:
          "HDV IgG/IgM tests for hepatitis D virus, which occurs only in people with hepatitis B.\n\nInterpretations:\nIgM positive: Recent/acute HDV infection.\nIgG positive: Past or chronic HDV infection.",
      },
      {
        id: "10.12",
        name: "HIV Ab",
        value: "",
        unit: "",
        normalRange: "Non-reactive",
        price: "2000",
        comment:
          "HIV Ab detects antibodies to HIV. Reactive screening must be confirmed with supplemental testing.\n\nInterpretations:\nReactive: HIV infection possible; confirmatory testing required.\nNonreactive: No HIV antibodies detected (repeat if recent exposure).",
      },
      {
        id: "10.13",
        name: "HAV IgG",
        value: "",
        unit: "",
        normalRange: "Non-reactive",
        price: "2000",
        comment:
          "HAV IgG indicates past hepatitis A infection or immunity from vaccination.\n\nInterpretations:\nPositive: Immune to HAV.\nNegative: Not immune.",
      },
      {
        id: "10.14",
        name: "HAV IgM",
        value: "",
        unit: "",
        normalRange: "Non-reactive",
        price: "2000",
        comment:
          "HAV IgM indicates recent or acute hepatitis A infection.\n\nInterpretations:\nPositive: Acute/recent HAV infection.\nNegative: Acute HAV unlikely.",
      },
      {
        id: "10.15",
        name: "Brucella IgG",
        value: "",
        unit: "",
        normalRange: "<1:80",
        price: "750",
        comment:
          "Brucella IgG suggests past exposure or chronic infection.\n\nInterpretations:\nPositive: Prior or chronic brucellosis; correlate with symptoms and other tests.\nNegative: No evidence of past exposure.",
      },
      {
        id: "10.16",
        name: "Brucella IgM",
        value: "",
        unit: "",
        normalRange: "<1:80",
        price: "750",
        comment:
          "Brucella IgM suggests recent or acute infection.\n\nInterpretations:\nPositive: Possible recent brucellosis; confirm with clinical correlation and culture.\nNegative: Acute infection less likely.",
      },
      {
        id: "10.17",
        name: "TORCH PROFILE",
        value: "",
        unit: "",
        normalRange: "Negative",
        price: "6400",
        comment:
          "TORCH profile screens for infections that can affect pregnancy (Toxoplasma, Rubella, CMV, HSV).\n\nInterpretations:\nIgM positive: Possible recent infection; confirm with follow-up testing.\nIgG positive: Past infection or immunity.",
      },
      {
        id: "10.18",
        name: "Toxo IgG",
        value: "",
        unit: "IU/mL",
        normalRange: "<8.8",
        price: "800",
        comment:
          "Toxoplasma IgG indicates past infection or immunity.\n\nInterpretations:\nPositive: Past exposure/immunity.\nNegative: No evidence of prior infection.",
      },
      {
        id: "10.19",
        name: "Toxo IgM",
        value: "",
        unit: "",
        normalRange: "Negative",
        price: "800",
        comment:
          "Toxoplasma IgM indicates recent infection.\n\nInterpretations:\nPositive: Possible recent infection; confirm with repeat or additional tests.\nNegative: Recent infection less likely.",
      },
      {
        id: "10.20",
        name: "Rubella IgG",
        value: "",
        unit: "IU/mL",
        normalRange: ">10 (Immune)",
        price: "800",
        comment:
          "Rubella IgG indicates immunity from vaccination or past infection.\n\nInterpretations:\nPositive: Immune.\nNegative: Not immune.",
      },
      {
        id: "10.21",
        name: "Rubella IgM",
        value: "",
        unit: "",
        normalRange: "Negative",
        price: "800",
        comment:
          "Rubella IgM indicates recent infection.\n\nInterpretations:\nPositive: Possible recent rubella infection; confirm.\nNegative: Recent infection less likely.",
      },
      {
        id: "10.22",
        name: "CMV IgG",
        value: "",
        unit: "IU/mL",
        normalRange: ">0.5 (Positive)",
        price: "800",
        comment:
          "CMV IgG indicates past CMV infection.\n\nInterpretations:\nPositive: Past exposure; immunity likely.\nNegative: No evidence of prior infection.",
      },
      {
        id: "10.23",
        name: "CMV IgM",
        value: "",
        unit: "",
        normalRange: "Negative",
        price: "800",
        comment:
          "CMV IgM indicates recent infection or reactivation.\n\nInterpretations:\nPositive: Possible recent infection; confirm with clinical context and follow-up.\nNegative: Recent infection less likely.",
      },
      {
        id: "10.24",
        name: "HSV IgG",
        value: "",
        unit: "",
        normalRange: "<0.9",
        price: "800",
        comment:
          "HSV IgG indicates past exposure to HSV.\n\nInterpretations:\nPositive: Past infection.\nNegative: No evidence of prior HSV infection.",
      },
      {
        id: "10.25",
        name: "HSV IgM",
        value: "",
        unit: "",
        normalRange: "Negative",
        price: "800",
        comment:
          "HSV IgM may indicate recent infection but can be nonspecific.\n\nInterpretations:\nPositive: Possible recent infection; interpret cautiously.\nNegative: Recent infection less likely.",
      },
      {
        id: "10.26",
        name: "EBV IgG/IgM",
        value: "",
        unit: "",
        normalRange: "See report",
        price: "4000",
        comment:
          "EBV IgG/IgM helps determine timing of Epstein-Barr virus infection.\n\nInterpretations:\nIgM positive: Recent infection.\nIgG positive: Past infection.",
      },
      {
        id: "10.27",
        name: "Mumps IgG/IgM",
        value: "",
        unit: "",
        normalRange: "Negative",
        price: "4000",
        comment:
          "Mumps IgG/IgM helps determine immunity or recent infection.\n\nInterpretations:\nIgG positive: Immunity (past infection or vaccination).\nIgM positive: Recent infection.",
      },
      {
        id: "10.28",
        name: "Varicella IgG/IgM",
        value: "",
        unit: "",
        normalRange: "Negative",
        price: "6000",
        comment:
          "Varicella IgG/IgM helps determine immunity or recent infection.\n\nInterpretations:\nIgG positive: Immunity (past infection or vaccination).\nIgM positive: Recent infection.",
      },
      {
        id: "10.29",
        name: "Anti CCP",
        value: "",
        unit: "U/mL",
        normalRange: "<20",
        price: "1500",
        comment:
          "Anti-CCP is a specific marker for rheumatoid arthritis (RA).\n\nInterpretations:\nPositive: Supports RA diagnosis and predicts more aggressive disease.\nNegative: RA still possible; interpret with clinical findings.",
      },
      {
        id: "10.30",
        name: "Anti TP",
        value: "",
        unit: "",
        normalRange: "Non-reactive",
        price: "1500",
        comment:
          "Anti-TP (treponemal antibody) indicates exposure to syphilis. It does not distinguish past vs current infection.\n\nInterpretations:\nPositive: Current or past infection; correlate with non-treponemal tests and history.\nNegative: Syphilis unlikely.",
      },
      {
        id: "10.31",
        name: "Anti Phospholipid IgG",
        value: "",
        unit: "U/mL",
        normalRange: "<20",
        price: "800",
        comment:
          "Antiphospholipid IgG antibodies are associated with antiphospholipid syndrome (APS).\n\nInterpretations:\nPositive: APS possible if persistent on repeat testing.\nNegative: APS less likely.",
      },
      {
        id: "10.32",
        name: "Anti Phospholipid IgM",
        value: "",
        unit: "U/mL",
        normalRange: "<20",
        price: "800",
        comment:
          "Antiphospholipid IgM antibodies are associated with APS.\n\nInterpretations:\nPositive: APS possible if persistent on repeat testing.\nNegative: APS less likely.",
      },
      {
        id: "10.33",
        name: "Anti Cardiolipin IgG",
        value: "",
        unit: "U/mL",
        normalRange: "<20",
        price: "900",
        comment:
          "Anticardiolipin IgG antibodies are part of APS evaluation.\n\nInterpretations:\nPositive: APS possible if persistent on repeat testing.\nNegative: APS less likely.",
      },
      {
        id: "10.34",
        name: "Anti Cardiolipin IgM",
        value: "",
        unit: "U/mL",
        normalRange: "<20",
        price: "900",
        comment:
          "Anticardiolipin IgM antibodies are part of APS evaluation.\n\nInterpretations:\nPositive: APS possible if persistent on repeat testing.\nNegative: APS less likely.",
      },
      {
        id: "10.35",
        name: "Beta-2 Glycoprotein IgG",
        value: "",
        unit: "U/mL",
        normalRange: "<20",
        price: "3000",
        comment:
          "Beta-2 glycoprotein I IgG antibodies are used in APS diagnosis.\n\nInterpretations:\nPositive: APS possible if persistent on repeat testing.\nNegative: APS less likely.",
      },
      {
        id: "10.36",
        name: "Beta-2 Glycoprotein IgM",
        value: "",
        unit: "U/mL",
        normalRange: "<20",
        price: "3000",
        comment:
          "Beta-2 glycoprotein I IgM antibodies are used in APS diagnosis.\n\nInterpretations:\nPositive: APS possible if persistent on repeat testing.\nNegative: APS less likely.",
      },
      {
        id: "10.37",
        name: "Lupus Anticoagulant",
        value: "",
        unit: "",
        normalRange: "Negative",
        price: "4000",
        comment:
          "Lupus anticoagulant is a clotting test associated with APS and increased thrombosis risk.\n\nInterpretations:\nPositive: APS possible; repeat testing needed for persistence.\nNegative: APS less likely.",
      },
      {
        id: "10.38",
        name: "Immunoglobulin A",
        value: "",
        unit: "mg/dL",
        normalRange: "70–400",
        price: "2000",
        comment:
          "Immunoglobulin A (IgA) reflects mucosal immunity. It is used to evaluate immune disorders, liver disease, and infections.\n\nInterpretations:\nHigh: Inflammation, chronic infection, or liver disease.\nLow: IgA deficiency or immune disorders.",
      },
      {
        id: "10.39",
        name: "Immunoglobulin M",
        value: "",
        unit: "mg/dL",
        normalRange: "40–230",
        price: "2000",
        comment:
          "Immunoglobulin M (IgM) is an early immune response antibody.\n\nInterpretations:\nHigh: Acute infection or inflammation.\nLow: Immune deficiency or protein loss.",
      },
      {
        id: "10.40",
        name: "Immunoglobulin G",
        value: "",
        unit: "mg/dL",
        normalRange: "700–1600",
        price: "2000",
        comment:
          "Immunoglobulin G (IgG) is the most abundant antibody and reflects past exposure or immune response.\n\nInterpretations:\nHigh: Chronic infection, inflammation, or immune disorders.\nLow: Immune deficiency or protein loss.",
      },
      {
        id: "10.41",
        name: "Total IgE",
        value: "",
        unit: "IU/mL",
        normalRange: "<100",
        price: "1500",
        comment:
          "Total IgE is associated with allergic disease and some parasitic infections.\n\nInterpretations:\nHigh: Allergy, asthma, eczema, or parasitic infection.\nNormal: Does not exclude allergy.",
      },
      {
        id: "10.42",
        name: "Anti Allergent Specific IgE",
        value: "",
        unit: "kU/L",
        normalRange: "<0.35",
        price: "4000",
        comment:
          "Specific IgE tests show sensitization to particular allergens.\n\nInterpretations:\nPositive: Sensitization to the allergen; clinical allergy requires correlation.\nNegative: Sensitization unlikely.",
      },
      {
        id: "10.43",
        name: "CRP Quantitative",
        value: "",
        unit: "mg/dL",
        normalRange: "<0.5",
        price: "1000",
        comment:
          "C-reactive protein (CRP) is a marker of inflammation. It rises with infection, inflammation, or tissue injury.\n\nInterpretations:\nHigh: Active inflammation or infection.\nNormal: Significant inflammation less likely.",
      },
      {
        id: "10.44",
        name: "RA Factor Quantitative",
        value: "",
        unit: "IU/mL",
        normalRange: "<20",
        price: "1000",
        comment:
          "Rheumatoid factor (RF) is used in evaluation of rheumatoid arthritis and other autoimmune diseases.\n\nInterpretations:\nPositive: Supports RA but is not specific.\nNegative: RA still possible.",
      },
      {
        id: "10.45",
        name: "ANA Quantitative",
        value: "",
        unit: "",
        normalRange: "<1:40",
        price: "1500",
        comment:
          "Antinuclear antibody (ANA) is a screening test for autoimmune disorders such as lupus.\n\nInterpretations:\nPositive: Autoimmune disease possible; interpret with clinical findings.\nNegative: Autoimmune disease less likely.",
      },
      {
        id: "10.46",
        name: "cANCA",
        value: "",
        unit: "",
        normalRange: "<1:20",
        price: "6000",
        comment:
          "cANCA is associated with certain vasculitides (e.g., granulomatosis with polyangiitis).\n\nInterpretations:\nPositive: Supports ANCA-associated vasculitis with compatible symptoms.\nNegative: Does not exclude vasculitis.",
      },
      {
        id: "10.47",
        name: "pANCA",
        value: "",
        unit: "",
        normalRange: "<1:20",
        price: "3000",
        comment:
          "pANCA is associated with certain vasculitides and inflammatory bowel disease.\n\nInterpretations:\nPositive: Supports diagnosis with clinical correlation.\nNegative: Does not exclude vasculitis.",
      },
      {
        id: "10.48",
        name: "Anti dsDNA",
        value: "",
        unit: "IU/mL",
        normalRange: "<30",
        price: "4000",
        comment:
          "Anti-dsDNA is a specific antibody for systemic lupus erythematosus (SLE). Levels often correlate with disease activity.\n\nInterpretations:\nPositive: Supports SLE diagnosis; high levels suggest active disease.\nNegative: SLE still possible; interpret with other tests.",
      },
    ],
  },
  {
    id: "11",
    category: "Tumor Markers",
    items: [
      {
        id: "11.1",
        name: "AFP (Alpha Feto Protein)",
        value: "",
        unit: "ng/mL",
        normalRange: "<10",
        price: "2000",
        comment:
          "AFP is a tumor marker mainly used to help diagnose and monitor liver and certain germ‑cell cancers.\n\nInterpretations:\nHigh: Possible liver/germ‑cell cancer or liver disease; not specific.\nNormal: Does not rule out cancer.",
      },
      {
        id: "11.2",
        name: "CEA (Carcinoembryonic Ag)",
        value: "",
        unit: "ng/mL",
        normalRange: "<3",
        price: "2000",
        comment:
          "CEA is a tumor marker most often used to monitor certain cancers (especially colorectal).\n\nInterpretations:\nHigh: May indicate cancer activity or other conditions; not for screening.\nNormal: Does not rule out cancer.",
      },
      {
        id: "11.3",
        name: "Total PSA",
        value: "",
        unit: "ng/mL",
        normalRange: "<4",
        price: "1000",
        comment:
          "Total PSA measures prostate‑specific antigen to help evaluate prostate disease.\n\nInterpretations:\nHigh: Could be prostate cancer, BPH, or prostatitis.\nNormal: Cancer still possible; interpret with risk and symptoms.",
      },
      {
        id: "11.4",
        name: "Free PSA",
        value: "",
        unit: "ng/mL",
        normalRange: ">25% of total",
        price: "2500",
        comment:
          "Free PSA is interpreted with total PSA to refine prostate cancer risk.\n\nInterpretations:\nLower % free PSA: Higher cancer risk.\nHigher % free PSA: More likely benign disease.",
      },
      {
        id: "11.5",
        name: "CA 125",
        value: "",
        unit: "U/mL",
        normalRange: "<35",
        price: "2000",
        comment:
          "CA‑125 is a tumor marker used mainly to monitor ovarian cancer.\n\nInterpretations:\nHigh: May be ovarian cancer or benign conditions (e.g., endometriosis); not for routine screening.\nNormal: Does not exclude cancer.",
      },
      {
        id: "11.6",
        name: "CA 19-9",
        value: "",
        unit: "U/mL",
        normalRange: "<37",
        price: "2000",
        comment:
          "CA 19‑9 is a tumor marker used to monitor pancreatic and biliary cancers.\n\nInterpretations:\nHigh: May indicate cancer or benign biliary/pancreatic disease.\nNormal: Does not rule out cancer.",
      },
      {
        id: "11.7",
        name: "CA 15-3",
        value: "",
        unit: "U/mL",
        normalRange: "<30",
        price: "2000",
        comment:
          "CA 15‑3 is a tumor marker most often used to monitor breast cancer.\n\nInterpretations:\nHigh: May indicate cancer activity or other conditions.\nNormal: Does not rule out cancer.",
      },
    ],
  },
  {
    id: "12",
    category: "Clinical Pathology",
    items: [
      {
        id: "12.1",
        name: "Stool Reducing Substances",
        value: "",
        unit: "",
        normalRange: "Negative",
        price: "500",
        comment:
          "Stool reducing substances test looks for unabsorbed sugars and can suggest carbohydrate malabsorption.\n\nInterpretations:\nPositive: Possible carbohydrate malabsorption.\nNegative: Malabsorption less likely.",
      },
      {
        id: "12.2",
        name: "Urine Reducing Substances",
        value: "",
        unit: "",
        normalRange: "Negative",
        price: "100",
        comment:
          "Urine reducing substances detect sugars in urine and can indicate inborn errors or glycosuria.\n\nInterpretations:\nPositive: Possible abnormal sugar excretion; correlate clinically.\nNegative: Reducing sugars not detected.",
      },
      {
        id: "12.3",
        name: "Urine Ketone Bodies",
        value: "",
        unit: "",
        normalRange: "Negative",
        price: "200",
        comment:
          "Urine ketones indicate fat breakdown. It is used in diabetes and starvation states.\n\nInterpretations:\nPositive: Ketosis (e.g., DKA, fasting, vomiting).\nNegative: No significant ketosis.",
      },
      {
        id: "12.4",
        name: "Urine Bs, Bp",
        value: "",
        unit: "",
        normalRange: "Negative",
        price: "200",
        comment:
          "Urine bile salts/pigments help detect cholestasis or liver disease.\n\nInterpretations:\nPositive: Suggests liver or bile duct disease.\nNegative: No bile pigments detected.",
      },
      {
        id: "12.5",
        name: "A/C Ratio",
        value: "",
        unit: "",
        normalRange: "<30 mg/g",
        price: "1000",
        comment:
          "Albumin/creatinine (A/C) ratio screens for kidney damage using a spot urine sample.\n\nInterpretations:\nHigh: Albuminuria (early kidney disease).\nNormal: No significant albuminuria.",
      },
      {
        id: "12.6",
        name: "24 Hour Urine CrCl",
        value: "",
        unit: "mL/min",
        normalRange: "90–140",
        price: "1200",
        comment:
          "24‑hour creatinine clearance estimates kidney filtration (GFR).\n\nInterpretations:\nLow: Reduced kidney function.\nHigh: Hyperfiltration in some conditions.",
      },
      {
        id: "12.7",
        name: "24 Hour Urine Protein",
        value: "",
        unit: "mg/24h",
        normalRange: "<150",
        price: "1000",
        comment:
          "24‑hour urine protein quantifies total protein loss.\n\nInterpretations:\nHigh: Proteinuria from kidney disease.\nNormal: No significant protein loss.",
      },
      {
        id: "12.8",
        name: "24 Hour Urine Albumin",
        value: "",
        unit: "mg/24h",
        normalRange: "<30",
        price: "1800",
        comment:
          "24‑hour urine albumin measures albumin loss and helps stage kidney disease.\n\nInterpretations:\nHigh: Albuminuria from kidney damage.\nNormal: No significant albumin loss.",
      },
      {
        id: "12.9",
        name: "24 Hour Urine Microalbumin",
        value: "",
        unit: "mg/24h",
        normalRange: "<30",
        price: "1800",
        comment:
          "24‑hour urine microalbumin detects early kidney injury.\n\nInterpretations:\nHigh: Early kidney damage.\nNormal: No microalbuminuria.",
      },
      {
        id: "12.10",
        name: "24 Hour Urine Uric Acid",
        value: "",
        unit: "mg/24h",
        normalRange: "250–750",
        price: "1500",
        comment:
          "24‑hour urine uric acid evaluates uric acid excretion and kidney stone risk.\n\nInterpretations:\nHigh: Hyperuricosuria (stone/gout risk).\nLow: Low uric acid excretion.",
      },
      {
        id: "12.11",
        name: "24 Hour Urine Urea",
        value: "",
        unit: "g/24h",
        normalRange: "15–30",
        price: "1200",
        comment:
          "24‑hour urine urea reflects protein metabolism and kidney excretion.\n\nInterpretations:\nHigh/low: May reflect diet, catabolism, or kidney function; interpret with serum tests.",
      },
      {
        id: "12.12",
        name: "24 Hour Urine Copper",
        value: "",
        unit: "µg/24h",
        normalRange: "<60",
        price: "3500",
        comment:
          "24‑hour urine copper helps evaluate Wilson disease and copper overload.\n\nInterpretations:\nHigh: Suggests copper overload/Wilson disease.\nNormal: Copper excess less likely.",
      },
      {
        id: "12.13",
        name: "24 Hour Urine Oxalate",
        value: "",
        unit: "mg/24h",
        normalRange: "<45",
        price: "3000",
        comment:
          "24‑hour urine oxalate assesses kidney stone risk.\n\nInterpretations:\nHigh: Hyperoxaluria (stone risk).\nNormal: Lower stone risk.",
      },
      {
        id: "12.14",
        name: "24 Hour Urine Ca",
        value: "",
        unit: "mg/24h",
        normalRange: "100–300",
        price: "1000",
        comment:
          "24‑hour urine calcium evaluates calcium excretion and stone risk.\n\nInterpretations:\nHigh: Hypercalciuria (stone risk).\nLow: Hypocalciuria.",
      },
      {
        id: "12.15",
        name: "24 Hour Urine Mg",
        value: "",
        unit: "mg/24h",
        normalRange: "24–255",
        price: "1200",
        comment:
          "24‑hour urine magnesium evaluates magnesium loss.\n\nInterpretations:\nHigh/low: May suggest altered magnesium balance; interpret with serum levels.",
      },
      {
        id: "12.16",
        name: "24 Hour Urine Na",
        value: "",
        unit: "mmol/24h",
        normalRange: "40–220",
        price: "1200",
        comment:
          "24‑hour urine sodium estimates sodium intake and renal handling.\n\nInterpretations:\nHigh: High sodium intake or excretion.\nLow: Low intake or retention.",
      },
      {
        id: "12.17",
        name: "24 Hour Urine Phosphorus",
        value: "",
        unit: "mg/24h",
        normalRange: "400–1300",
        price: "1200",
        comment:
          "24‑hour urine phosphorus evaluates phosphate excretion and balance.\n\nInterpretations:\nHigh/low: May reflect diet, kidney function, or endocrine disorders.",
      },
      {
        id: "12.18",
        name: "Bence Jones Protein",
        value: "",
        unit: "",
        normalRange: "Negative",
        price: "1200",
        comment:
          "Bence Jones protein detects free light chains in urine, used in multiple myeloma evaluation.\n\nInterpretations:\nPositive: Suggests plasma cell disorder.\nNegative: Light chains not detected.",
      },
      {
        id: "12.19",
        name: "Urine Multi Drug Test",
        value: "",
        unit: "",
        normalRange: "Negative",
        price: "1200",
        comment:
          "Urine multi‑drug screen detects common drugs of abuse.\n\nInterpretations:\nPositive: Drug detected; confirmatory testing recommended.\nNegative: Drug not detected above cutoff.",
      },
      {
        id: "12.20",
        name: "Urine Pregnancy Test",
        value: "",
        unit: "",
        normalRange: "Negative",
        price: "100",
        comment:
          "Urine pregnancy test detects hCG to confirm pregnancy.\n\nInterpretations:\nPositive: Pregnancy likely.\nNegative: May be too early; repeat if suspected.",
      },
      {
        id: "12.21",
        name: "Renal Stone Analysis",
        value: "",
        unit: "",
        normalRange: "See report",
        price: "2000",
        comment:
          "Renal stone analysis identifies stone composition to guide prevention.\n\nInterpretations:\nResults show stone type (e.g., calcium oxalate, uric acid) for targeted prevention.",
      },
    ],
  },
  {
    id: "13",
    category: "Histopathology",
    items: [
      {
        id: "13.1",
        name: "Small Biopsy",
        value: "",
        unit: "",
        normalRange: "See report",
        price: "2500",
        comment:
          "Histopathology (small biopsy) examines tissue under a microscope to diagnose disease.\n\nInterpretations:\nReport describes benign vs malignant changes and other findings.",
      },
      {
        id: "13.2",
        name: "Medium Biopsy",
        value: "",
        unit: "",
        normalRange: "See report",
        price: "3000",
        comment:
          "Histopathology (medium biopsy) examines tissue to determine diagnosis and disease extent.\n\nInterpretations:\nReport provides definitive diagnosis when combined with clinical data.",
      },
      {
        id: "13.3",
        name: "Large Biopsy",
        value: "",
        unit: "",
        normalRange: "See report",
        price: "3500",
        comment:
          "Histopathology (large biopsy) provides detailed tissue evaluation for diagnosis and staging.\n\nInterpretations:\nFindings determine pathology type and guide treatment.",
      },
    ],
  },
  {
    id: "14",
    category: "Cytology",
    items: [
      {
        id: "14.1",
        name: "FNA Cytology",
        value: "",
        unit: "",
        normalRange: "See report",
        price: "2000",
        comment:
          "FNA cytology examines cells obtained by fine‑needle aspiration to assess masses.\n\nInterpretations:\nReport classifies cells as benign, suspicious, or malignant.",
      },
      {
        id: "14.2",
        name: "Urine Cytology",
        value: "",
        unit: "",
        normalRange: "Negative for malignant cells",
        price: "2500",
        comment:
          "Urine cytology looks for abnormal cells in urine, often used to evaluate urinary tract cancers.\n\nInterpretations:\nAtypical/malignant cells suggest urothelial cancer; negative does not fully exclude.",
      },
      {
        id: "14.3",
        name: "Fecal Cytology",
        value: "",
        unit: "",
        normalRange: "See report",
        price: "2000",
        comment:
          "Fecal cytology evaluates stool for abnormal cells or parasites when indicated.\n\nInterpretations:\nFindings are descriptive and correlate with clinical context.",
      },
      {
        id: "14.4",
        name: "CSF Cytology",
        value: "",
        unit: "",
        normalRange: "Negative for malignant cells",
        price: "2000",
        comment:
          "CSF cytology examines cerebrospinal fluid for malignant or inflammatory cells.\n\nInterpretations:\nMalignant cells indicate CNS involvement; negative does not always exclude.",
      },
      {
        id: "14.5",
        name: "Bronchial Wash Cytology",
        value: "",
        unit: "",
        normalRange: "See report",
        price: "1500",
        comment:
          "Bronchial wash cytology examines airway samples for malignancy or infection.\n\nInterpretations:\nAbnormal cells suggest malignancy; interpret with imaging and biopsy if needed.",
      },
      {
        id: "14.6",
        name: "Fluid Cytology",
        value: "",
        unit: "",
        normalRange: "See report",
        price: "2000",
        comment:
          "Fluid cytology examines body fluids (pleural, ascitic, etc.) for malignancy or infection.\n\nInterpretations:\nMalignant cells indicate cancer involvement; negative does not fully exclude.",
      },
      {
        id: "14.7",
        name: "Pap Smear",
        value: "",
        unit: "",
        normalRange: "Negative for intraepithelial lesion",
        price: "2000",
        comment:
          "Pap smear screens for cervical cell abnormalities.\n\nInterpretations:\nAbnormal results require follow‑up testing or colposcopy.",
      },
    ],
  },
  {
    id: "15",
    category: "Microbiology (Culture and Sensitivity)",
    items: [
      {
        id: "15.1",
        name: "AFB Culture",
        value: "",
        unit: "",
        normalRange: "No growth",
        price: "5000",
        comment:
          "AFB culture detects Mycobacterium species (e.g., TB) from clinical samples.\n\nInterpretations:\nGrowth: Mycobacterial infection likely.\nNo growth: Mycobacteria not detected (may require repeat if suspicion remains).",
      },
      {
        id: "15.2",
        name: "Tissue Culture and Sensitivity",
        value: "",
        unit: "",
        normalRange: "No growth",
        price: "2500",
        comment:
          "Tissue culture and sensitivity identifies bacteria/fungi in tissue and tests antibiotic susceptibility.\n\nInterpretations:\nGrowth with sensitivity: Guides therapy.\nNo growth: No organisms detected.",
      },
      {
        id: "15.3",
        name: "Bone Marrow Culture and Sensitivity",
        value: "",
        unit: "",
        normalRange: "No growth",
        price: "2500",
        comment:
          "Bone marrow culture and sensitivity detects infection in bone marrow.\n\nInterpretations:\nGrowth: Infection present; susceptibility guides therapy.\nNo growth: No organisms detected.",
      },
      {
        id: "15.4",
        name: "H. Pylori Culture and Sensitivity",
        value: "",
        unit: "",
        normalRange: "No growth",
        price: "2000",
        comment:
          "H. pylori culture identifies Helicobacter pylori and antibiotic sensitivity.\n\nInterpretations:\nPositive: H. pylori detected; sensitivity guides treatment.\nNegative: H. pylori not detected.",
      },
      {
        id: "15.5",
        name: "Blood Culture and Sensitivity",
        value: "",
        unit: "",
        normalRange: "No growth",
        price: "1500",
        comment:
          "Blood culture and sensitivity detects bloodstream infection and antibiotic susceptibility.\n\nInterpretations:\nGrowth: Bacteremia/fungemia; treat per sensitivities.\nNo growth: No bloodstream infection detected.",
      },
      {
        id: "15.6",
        name: "Urine Culture and Sensitivity",
        value: "",
        unit: "CFU/mL",
        normalRange: "<10,000",
        price: "1200",
        comment:
          "Urine culture and sensitivity detects urinary tract infection and antibiotic susceptibility.\n\nInterpretations:\nGrowth: UTI organism identified; treat per sensitivities.\nNo growth: UTI less likely.",
      },
      {
        id: "15.7",
        name: "Stool Culture and Sensitivity",
        value: "",
        unit: "",
        normalRange: "No pathogens",
        price: "1200",
        comment:
          "Stool culture and sensitivity detects bacterial pathogens causing diarrhea.\n\nInterpretations:\nGrowth: Pathogen identified; treat as appropriate.\nNo growth: Bacterial infection less likely.",
      },
      {
        id: "15.8",
        name: "Semen Culture and Sensitivity",
        value: "",
        unit: "",
        normalRange: "No growth",
        price: "1200",
        comment:
          "Semen culture and sensitivity detects infection and guides antibiotics.\n\nInterpretations:\nGrowth: Organism identified.\nNo growth: No bacterial infection detected.",
      },
      {
        id: "15.9",
        name: "Vaginal Culture and Sensitivity",
        value: "",
        unit: "",
        normalRange: "Normal flora",
        price: "1200",
        comment:
          "Vaginal culture and sensitivity detects bacterial/fungal infection and guides therapy.\n\nInterpretations:\nGrowth: Organism identified.\nNo growth: No significant bacterial growth.",
      },
      {
        id: "15.10",
        name: "Throat Culture and Sensitivity",
        value: "",
        unit: "",
        normalRange: "Normal flora",
        price: "1200",
        comment:
          "Throat culture and sensitivity detects bacterial pharyngitis (e.g., strep) and guides therapy.\n\nInterpretations:\nGrowth: Pathogen identified.\nNo growth: Bacterial infection less likely.",
      },
      {
        id: "15.11",
        name: "Wound /Pus Swab Culture and Sensitivity",
        value: "",
        unit: "",
        normalRange: "No growth",
        price: "1200",
        comment:
          "Wound/pus swab culture and sensitivity identifies wound infection and antibiotic susceptibility.\n\nInterpretations:\nGrowth: Organism identified; treat per sensitivities.\nNo growth: No bacterial growth detected.",
      },
      {
        id: "15.12",
        name: "CSF Culture and Sensitivity",
        value: "",
        unit: "",
        normalRange: "No growth",
        price: "1200",
        comment:
          "CSF culture and sensitivity detects meningitis pathogens and guides antibiotics.\n\nInterpretations:\nGrowth: CNS infection likely.\nNo growth: Bacterial meningitis less likely.",
      },
      {
        id: "15.13",
        name: "Pleural Fluid Culture and Sensitivity",
        value: "",
        unit: "",
        normalRange: "No growth",
        price: "1200",
        comment:
          "Pleural fluid culture and sensitivity detects infection in pleural space.\n\nInterpretations:\nGrowth: Infection (empyema) likely.\nNo growth: No bacterial growth detected.",
      },
      {
        id: "15.14",
        name: "Peritoneal Fluid Culture and Sensitivity",
        value: "",
        unit: "",
        normalRange: "No growth",
        price: "1200",
        comment:
          "Peritoneal fluid culture and sensitivity detects intra‑abdominal infection.\n\nInterpretations:\nGrowth: Infection likely.\nNo growth: No organisms detected.",
      },
      {
        id: "15.15",
        name: "Synovial Fluid Culture and Sensitivity",
        value: "",
        unit: "",
        normalRange: "No growth",
        price: "1200",
        comment:
          "Synovial fluid culture and sensitivity detects septic arthritis.\n\nInterpretations:\nGrowth: Joint infection likely.\nNo growth: Infection less likely.",
      },
      {
        id: "15.16",
        name: "Ear Swab Culture and Sensitivity",
        value: "",
        unit: "",
        normalRange: "No growth",
        price: "1200",
        comment:
          "Ear swab culture and sensitivity detects ear infection pathogens.\n\nInterpretations:\nGrowth: Organism identified.\nNo growth: No bacterial growth detected.",
      },
      {
        id: "15.17",
        name: "Eye Swab Culture and Sensitivity",
        value: "",
        unit: "",
        normalRange: "No growth",
        price: "1200",
        comment:
          "Eye swab culture and sensitivity detects conjunctival/ocular infection pathogens.\n\nInterpretations:\nGrowth: Organism identified.\nNo growth: No bacterial growth detected.",
      },
      {
        id: "15.18",
        name: "Rectal Swab Culture and Sensitivity",
        value: "",
        unit: "",
        normalRange: "Normal flora",
        price: "1200",
        comment:
          "Rectal swab culture and sensitivity detects rectal infection or colonization.\n\nInterpretations:\nGrowth: Organism identified.\nNo growth: No bacterial growth detected.",
      },
      {
        id: "15.19",
        name: "Uretheral Swab Culture and Sensitivity",
        value: "",
        unit: "",
        normalRange: "No growth",
        price: "1200",
        comment:
          "Urethral swab culture and sensitivity detects urethral infection pathogens.\n\nInterpretations:\nGrowth: Organism identified.\nNo growth: No bacterial growth detected.",
      },
      {
        id: "15.20",
        name: "Kidney Fluid Culture and Sensitivity",
        value: "",
        unit: "",
        normalRange: "No growth",
        price: "1200",
        comment:
          "Kidney fluid culture and sensitivity detects renal infection.\n\nInterpretations:\nGrowth: Infection likely.\nNo growth: No organisms detected.",
      },
      {
        id: "15.21",
        name: "Bronchial Wash Culture",
        value: "",
        unit: "",
        normalRange: "No growth",
        price: "1200",
        comment:
          "Bronchial wash culture detects respiratory pathogens.\n\nInterpretations:\nGrowth: Pathogen identified.\nNo growth: No bacterial growth detected.",
      },
      {
        id: "15.22",
        name: "Sputum Culture and Sensitivity",
        value: "",
        unit: "",
        normalRange: "Normal flora",
        price: "1200",
        comment:
          "Sputum culture and sensitivity detects lower respiratory infection pathogens.\n\nInterpretations:\nGrowth: Pathogen identified; treat per sensitivities.\nNo growth: Bacterial infection less likely.",
      },
      {
        id: "15.23",
        name: "Fungal Culture and Sensitivity",
        value: "",
        unit: "",
        normalRange: "No growth",
        price: "1200",
        comment:
          "Fungal culture and sensitivity detects fungal infections and guides antifungal therapy.\n\nInterpretations:\nGrowth: Fungus identified.\nNo growth: No fungal infection detected.",
      },
      {
        id: "15.24",
        name: "Water Culture",
        value: "",
        unit: "",
        normalRange: "No growth",
        price: "1200",
        comment:
          "Water culture checks for microbial contamination.\n\nInterpretations:\nGrowth: Contamination detected.\nNo growth: No organisms detected.",
      },
      {
        id: "15.25",
        name: "Leishman Bodies",
        value: "",
        unit: "",
        normalRange: "Not seen",
        price: "300",
        comment:
          "Leishman bodies detection looks for Leishmania parasites in tissue/smears.\n\nInterpretations:\nPositive: Leishmaniasis.\nNegative: Parasites not detected.",
      },
      {
        id: "15.26",
        name: "Gram Stain",
        value: "",
        unit: "",
        normalRange: "No organisms seen",
        price: "300",
        comment:
          "Gram stain is a rapid test to detect and classify bacteria.\n\nInterpretations:\nPositive: Bacteria seen; guides initial therapy.\nNegative: No bacteria seen (culture may still be needed).",
      },
      {
        id: "15.27",
        name: "ZN Stain",
        value: "",
        unit: "",
        normalRange: "No AFB seen",
        price: "300",
        comment:
          "ZN stain (Ziehl‑Neelsen) detects acid‑fast bacilli (e.g., TB).\n\nInterpretations:\nPositive: AFB present; suggests mycobacterial infection.\nNegative: AFB not seen; culture/PCR may still be needed.",
      },
    ],
  },
  {
    id: "16",
    category: "Molecular Biology (PCR)",
    items: [
      {
        id: "16.1",
        name: "Hepatitis B Quantitative PCR",
        value: "",
        unit: "IU/mL",
        normalRange: "Not detected",
        price: "3500",
        comment:
          "HBV quantitative PCR measures hepatitis B viral load to assess active infection and monitor treatment.\n\nInterpretations:\nDetected: Active viral replication.\nNot detected: No measurable HBV DNA.",
      },
      {
        id: "16.2",
        name: "Hepatitis C Quantitative PCR",
        value: "",
        unit: "IU/mL",
        normalRange: "Not detected",
        price: "3500",
        comment:
          "HCV quantitative PCR measures hepatitis C viral load for diagnosis and treatment monitoring.\n\nInterpretations:\nDetected: Active HCV infection.\nNot detected: No measurable HCV RNA.",
      },
      {
        id: "16.3",
        name: "HCV Genotyping",
        value: "",
        unit: "",
        normalRange: "See report",
        price: "8000",
        comment:
          "HCV genotyping identifies viral genotype to guide therapy selection.\n\nInterpretations:\nGenotype reported to tailor treatment; not a measure of disease severity.",
      },
      {
        id: "16.4",
        name: "HDV Detection and Quantification",
        value: "",
        unit: "",
        normalRange: "Not detected",
        price: "6000",
        comment:
          "HDV detection/quantification identifies active hepatitis D infection and viral load.\n\nInterpretations:\nDetected: Active HDV infection.\nNot detected: No measurable HDV RNA.",
      },
      {
        id: "16.5",
        name: "HEV Detection and Quantification",
        value: "",
        unit: "",
        normalRange: "Not detected",
        price: "5000",
        comment:
          "HEV detection/quantification identifies active hepatitis E infection.\n\nInterpretations:\nDetected: Active HEV infection.\nNot detected: No measurable HEV RNA.",
      },
      {
        id: "16.6",
        name: "HIV Quantitative PCR",
        value: "",
        unit: "copies/mL",
        normalRange: "Not detected",
        price: "6000",
        comment:
          "HIV quantitative PCR (viral load) measures HIV RNA to monitor treatment and disease activity.\n\nInterpretations:\nDetected: Active replication.\nNot detected: Below assay limit; treatment likely effective.",
      },
      {
        id: "16.7",
        name: "CMV Quantification",
        value: "",
        unit: "IU/mL",
        normalRange: "Not detected",
        price: "8000",
        comment:
          "CMV quantification measures viral load, mainly in immunocompromised patients.\n\nInterpretations:\nDetected: Active CMV replication.\nNot detected: No measurable CMV DNA.",
      },
      {
        id: "16.8",
        name: "HSV1/2 Detection and Quantification",
        value: "",
        unit: "",
        normalRange: "Not detected",
        price: "5500",
        comment:
          "HSV‑1/2 PCR detects and quantifies herpes simplex virus DNA.\n\nInterpretations:\nDetected: HSV infection present.\nNot detected: HSV DNA not found.",
      },
      {
        id: "16.9",
        name: "HPV DNA Detection",
        value: "",
        unit: "",
        normalRange: "Not detected",
        price: "5000",
        comment:
          "HPV DNA testing detects high‑risk HPV types associated with cervical cancer.\n\nInterpretations:\nPositive: High‑risk HPV detected; follow screening guidelines.\nNegative: High‑risk HPV not detected.",
      },
      {
        id: "16.10",
        name: "EPV Quantification",
        value: "",
        unit: "IU/mL",
        normalRange: "Not detected",
        price: "3500",
        comment:
          "EBV quantification measures Epstein‑Barr virus load, often in immunocompromised patients.\n\nInterpretations:\nDetected: EBV DNA present.\nNot detected: EBV DNA not measurable.",
      },
      {
        id: "16.11",
        name: "Genexpert MTB/RIF",
        value: "",
        unit: "",
        normalRange: "Not detected",
        price: "3000",
        comment:
          "GeneXpert MTB/RIF detects TB DNA and rifampin resistance.\n\nInterpretations:\nDetected: TB likely; rifampin resistance reported if present.\nNot detected: TB DNA not found.",
      },
      {
        id: "16.12",
        name: "MTB DNA Detection",
        value: "",
        unit: "",
        normalRange: "Not detected",
        price: "4000",
        comment:
          "MTB DNA detection identifies Mycobacterium tuberculosis DNA.\n\nInterpretations:\nDetected: TB infection likely.\nNot detected: TB DNA not found.",
      },
      {
        id: "16.13",
        name: "JAK2 Gen Mutation",
        value: "",
        unit: "",
        normalRange: "Not detected",
        price: "7000",
        comment:
          "JAK2 mutation testing evaluates myeloproliferative neoplasms (e.g., polycythemia vera).\n\nInterpretations:\nPositive: Supports MPN diagnosis.\nNegative: Does not exclude MPN.",
      },
      {
        id: "16.14",
        name: "Factor V Leiden Mutation Detection",
        value: "",
        unit: "",
        normalRange: "Not detected",
        price: "3500",
        comment:
          "Factor V Leiden mutation testing evaluates inherited thrombophilia risk.\n\nInterpretations:\nPositive: Increased clot risk.\nNegative: This mutation not detected.",
      },
      {
        id: "16.15",
        name: "Chromosomal Analysis",
        value: "",
        unit: "",
        normalRange: "Normal karyotype",
        price: "8000",
        comment:
          "Chromosomal analysis (karyotype) looks for chromosomal abnormalities.\n\nInterpretations:\nAbnormal: Chromosomal disorder detected.\nNormal: No major chromosomal abnormality detected.",
      },
      {
        id: "16.16",
        name: "HLA B 27",
        value: "",
        unit: "",
        normalRange: "Negative",
        price: "8000",
        comment:
          "HLA‑B27 is associated with certain inflammatory conditions (e.g., ankylosing spondylitis).\n\nInterpretations:\nPositive: Increased risk; not diagnostic alone.\nNegative: Condition still possible.",
      },
      {
        id: "16.17",
        name: "HLA 1/2 Donor Tissue Type",
        value: "",
        unit: "",
        normalRange: "See report",
        price: "20000",
        comment:
          "HLA donor tissue typing helps match organ donors to recipients.\n\nInterpretations:\nCloser match: Lower rejection risk; used with other criteria.",
      },
      {
        id: "16.18",
        name: "HLA 1/2 Recipient Tissue Type",
        value: "",
        unit: "",
        normalRange: "See report",
        price: "20000",
        comment:
          "HLA recipient tissue typing evaluates compatibility for transplantation.\n\nInterpretations:\nResults guide donor selection and rejection risk.",
      },
      {
        id: "16.19",
        name: "Celiac HLA DQ Association",
        value: "",
        unit: "",
        normalRange: "See report",
        price: "1000",
        comment:
          "Celiac HLA‑DQ association testing checks genetic risk for celiac disease.\n\nInterpretations:\nNegative for risk alleles: Celiac disease unlikely.\nPositive: Genetic risk present; not diagnostic.",
      },
    ],
  },
] as const;

export default labTestCommentTemplates;
