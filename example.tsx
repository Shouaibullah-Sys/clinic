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
          "The Reticulocyte Count measures the percentage of young red blood cells in the blood, reflecting bone marrow activity. It is essential for diagnosing and classifying anemia, as it helps determine whether the bone marrow is responding appropriately to anemia by producing more red blood cells. This test is crucial for monitoring recovery from bone marrow suppression, post-chemotherapy, or after treatment for nutritional deficiencies like iron, B12, or folate. It aids in differentiating between hemolytic anemia (high reticulocyte count) and bone marrow failure or nutritional deficiencies (low reticulocyte count).\n\nInterpretations:\nHigh Reticulocyte Count: Indicates increased red blood cell production, often seen in hemolytic anemia, blood loss, or response to anemia treatment.\nLow Reticulocyte Count: Indicates decreased bone marrow production, seen in aplastic anemia, iron deficiency, or B12/folate deficiency.",
      },
      {
        id: "1.2",
        name: "Sickle Cell Count",
        value: "",
        unit: "",
        normalRange: "Negative",
        price: "1500",
        comment:
          "The Sickle Cell Count, often performed via a sickle cell solubility test or peripheral smear, detects the presence of Hemoglobin S (HbS), the abnormal hemoglobin responsible for sickle cell disease. This test is critical for diagnosing sickle cell trait and disease, enabling early intervention and management to prevent complications like vaso-occlusive crises, infections, and chronic organ damage. It is particularly important in high-risk populations and for genetic counseling, as it helps identify carriers and affected individuals.\n\nInterpretations:\nPositive: Indicates the presence of Hemoglobin S, suggesting either sickle cell trait (one gene) or sickle cell disease (two genes). Further testing like Hemoglobin Electrophoresis is needed for definitive diagnosis.\nNegative: Indicates no detectable Hemoglobin S, ruling out sickle cell trait and disease.",
      },
      {
        id: "1.3",
        name: "Coomb's Direct",
        value: "",
        unit: "",
        normalRange: "Negative",
        price: "700",
        comment:
          "The Direct Coomb's Test (Direct Antiglobulin Test) detects antibodies or complement proteins coating the surface of red blood cells. It is primarily used to diagnose autoimmune hemolytic anemia, where the body's immune system mistakenly attacks its own red blood cells. It is also essential in investigating hemolytic transfusion reactions and hemolytic disease of the newborn. A positive result confirms the presence of immune-mediated red blood cell destruction, guiding further diagnostic and therapeutic decisions.\n\nInterpretations:\nPositive: Indicates antibodies or complement are attached to red blood cells, suggesting autoimmune hemolytic anemia, drug-induced hemolysis, or hemolytic transfusion reaction.\nNegative: Indicates no detectable antibodies on red blood cells, making immune-mediated hemolysis less likely.",
      },
      {
        id: "1.4",
        name: "Coomb's Indirect",
        value: "",
        unit: "",
        normalRange: "Negative",
        price: "700",
        comment:
          "The Indirect Coomb's Test (Indirect Antiglobulin Test) detects circulating antibodies in the blood that can bind to red blood cells. It is a cornerstone of pre-transfusion testing, including blood typing and cross-matching, to ensure compatibility between donor and recipient blood. It is also used in prenatal care to screen for antibodies in pregnant women that could cause hemolytic disease of the newborn. By identifying unexpected antibodies, it helps prevent adverse transfusion reactions and manage at-risk pregnancies.\n\nInterpretations:\nPositive: Indicates the presence of unexpected antibodies in the serum, which may require further identification to ensure safe blood transfusion or monitor pregnancy.\nNegative: Indicates no unexpected antibodies detected, allowing for routine blood transfusion or lower risk of hemolytic disease of the newborn.",
      },
      {
        id: "1.5",
        name: "Cross Matching",
        value: "",
        unit: "",
        normalRange: "Compatible",
        price: "200",
        comment:
          "Crossmatching is a final compatibility test performed before blood transfusion. It mixes the recipient's serum with the donor's red blood cells to confirm that no significant antibodies are present that would cause a transfusion reaction. This test is vital for patient safety, ensuring that transfused blood is fully compatible and minimizing the risk of hemolytic reactions, which can be life-threatening. It is an essential step in all blood transfusions, from routine surgeries to emergency trauma care.\n\nInterpretations:\nCompatible: No agglutination or reaction, indicating donor blood is safe for transfusion.\nIncompatible: Agglutination or reaction, indicating the donor blood is not suitable and an alternative unit must be found.",
      },
      {
        id: "1.6",
        name: "Hb. Electrophoresis",
        value: "",
        unit: "%",
        normalRange: "HbA >95%, HbA2 <3.5%, HbF <1%",
        price: "3000",
        comment:
          "Hemoglobin Electrophoresis is a test that separates and measures the different types of hemoglobin in the blood. It is the definitive diagnostic tool for identifying hemoglobinopathies such as sickle cell disease, thalassemia, and other genetic hemoglobin disorders. This test is essential for accurate diagnosis, guiding treatment decisions, and providing genetic counseling. It helps differentiate between various conditions with overlapping symptoms, such as iron deficiency anemia and thalassemia trait.\n\nInterpretations:\nElevated HbA2 and HbF: Suggestive of beta-thalassemia trait.\nPresence of HbS: Indicates sickle cell trait (with HbA) or sickle cell disease (without HbA).\nPresence of other variants (HbC, HbE): Indicates specific hemoglobinopathies.",
      },
      {
        id: "1.7",
        name: "Protein Electrophoresis",
        value: "",
        unit: "g/dL",
        normalRange: "Total: 6.4–8.3, Albumin: 3.5–5.0",
        price: "3000",
        comment:
          "Serum Protein Electrophoresis (SPEP) is a test that separates proteins in the blood based on their electrical charge, allowing for the identification of abnormal protein patterns. It is a key screening and diagnostic tool for multiple myeloma, Waldenström's macroglobulinemia, and other disorders of abnormal protein production (gammopathies). It also helps assess liver function, nutritional status, and chronic inflammation. The detection of a monoclonal spike (M-spike) is highly suggestive of a plasma cell disorder, prompting further investigation.\n\nInterpretations:\nMonoclonal gammopathy (M-spike): Suggests multiple myeloma, Waldenström's, or MGUS.\nElevated gamma globulin: May indicate chronic inflammation, infection, or liver disease.\nLow albumin: Can indicate liver disease, malnutrition, or protein-losing conditions.",
      },
      {
        id: "1.8",
        name: "Special Smear",
        value: "",
        unit: "",
        normalRange: "See report",
        price: "1200",
        comment:
          "A Special Smear, often a peripheral blood smear, involves microscopic examination of blood cells by a hematologist to evaluate cell morphology. It is invaluable for diagnosing and monitoring a wide range of hematological conditions, including leukemias, anemias, thrombocytopenia, and parasitic infections like malaria. It provides detailed information about cell size, shape, and inclusions that automated analyzers may miss, offering crucial insights into the underlying disease process.\n\nInterpretations:\nFindings are descriptive and must be interpreted by a hematologist. Examples include: presence of blast cells (suggesting leukemia), spherocytes (suggesting hemolytic anemia), or malarial parasites.",
      },
      {
        id: "1.9",
        name: "Osmotic Fragility Test",
        value: "",
        unit: "%",
        normalRange: "0.45–0.30% NaCl",
        price: "800",
        comment:
          "The Osmotic Fragility Test measures the resistance of red blood cells to hemolysis when exposed to varying concentrations of salt solution. It is primarily used to diagnose hereditary spherocytosis, a condition where red blood cells are spherical and more fragile than normal. It can also be helpful in differentiating other types of hemolytic anemias. The test provides functional information about the red blood cell membrane, aiding in the diagnosis of membrane disorders.\n\nInterpretations:\nIncreased fragility (hemolysis at higher NaCl concentrations): Indicates hereditary spherocytosis or autoimmune hemolytic anemia.\nDecreased fragility (hemolysis at lower NaCl concentrations): Indicates thalassemia, sickle cell disease, or liver disease.",
      },
      {
        id: "1.10",
        name: "G6PD",
        value: "",
        unit: "U/g Hb",
        normalRange: ">4.6",
        price: "1000",
        comment:
          "The G6PD test measures the activity of the glucose-6-phosphate dehydrogenase enzyme in red blood cells. It is used to diagnose G6PD deficiency, an inherited disorder that can cause hemolytic anemia triggered by certain medications, infections, or foods like fava beans. This test is crucial for identifying individuals at risk, guiding medication choices, and preventing acute hemolytic episodes. It is often performed in individuals of African, Mediterranean, or Asian descent, where the deficiency is more common.\n\nInterpretations:\nLow G6PD activity: Indicates G6PD deficiency, confirming the diagnosis. The level of deficiency may vary depending on the specific genetic variant.\nNormal G6PD activity: Rules out G6PD deficiency as a cause of hemolysis, though testing during an acute episode may yield falsely normal results.",
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
          "The Amylase test measures the level of the enzyme amylase in the blood, which is primarily produced by the pancreas and salivary glands. It is a key diagnostic test for acute pancreatitis, where levels rise significantly. It is also used to monitor the progression of pancreatic diseases and to diagnose other conditions affecting the pancreas or salivary glands, such as mumps or pancreatic duct obstruction. Elevated amylase is a sensitive marker for pancreatic injury.\n\nInterpretations:\nElevated Amylase: Strongly suggests acute pancreatitis, but can also be seen in pancreatic cancer, gallbladder attacks, macroamylasemia, or salivary gland disorders.\nLow Amylase: May indicate chronic pancreatitis, cystic fibrosis, or liver disease.",
      },
      {
        id: "2.2",
        name: "Lipase Level",
        value: "",
        unit: "U/L",
        normalRange: "10–140",
        price: "600",
        comment:
          "The Lipase test measures the level of lipase, an enzyme produced by the pancreas that helps digest fats. It is considered more specific and sensitive than amylase for diagnosing acute pancreatitis, as lipase is produced almost exclusively by the pancreas and remains elevated for a longer period. This test is essential for confirming pancreatic inflammation and ruling out other causes of abdominal pain. It is also used to monitor chronic pancreatic conditions.\n\nInterpretations:\nElevated Lipase: Highly indicative of acute pancreatitis. It can also be elevated in pancreatic cancer, bowel obstruction, or peptic ulcer disease, but to a lesser extent.\nNormal Lipase: Makes acute pancreatitis less likely, especially when combined with a normal amylase.",
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
          "The T3 test measures the level of triiodothyronine, a key thyroid hormone that regulates metabolism, heart rate, and body temperature. It is used to evaluate thyroid function, particularly in diagnosing hyperthyroidism, where T3 levels are often disproportionately elevated compared to T4. It is also helpful in monitoring treatment for thyroid disorders. This test provides insight into the active form of thyroid hormone in the body.\n\nInterpretations:\nElevated T3: Commonly seen in hyperthyroidism (e.g., Graves' disease) and T3 thyrotoxicosis.\nLow T3: Can indicate hypothyroidism, but is also seen in euthyroid sick syndrome (non-thyroidal illness).",
      },
      {
        id: "3.2",
        name: "T4",
        value: "",
        unit: "µg/dL",
        normalRange: "5–12",
        price: "600",
        comment:
          "The T4 test measures the level of thyroxine, the primary hormone produced by the thyroid gland. It is a fundamental test for assessing thyroid function, used to diagnose both hyperthyroidism (high T4) and hypothyroidism (low T4). It helps determine the overall output of the thyroid gland and is often measured alongside TSH for a comprehensive evaluation. Free T4 (FT4) is the unbound, active form and is often a more accurate reflection of thyroid status.\n\nInterpretations:\nElevated T4: Indicates hyperthyroidism, thyroiditis, or excess thyroid hormone replacement.\nLow T4: Indicates hypothyroidism, pituitary dysfunction, or insufficient thyroid hormone replacement.",
      },
      {
        id: "3.3",
        name: "TSH",
        value: "",
        unit: "µIU/mL",
        normalRange: "0.4–4.5",
        price: "600",
        comment:
          "The Thyroid-Stimulating Hormone (TSH) test is the primary screening test for thyroid disorders. TSH is produced by the pituitary gland and stimulates the thyroid to produce T3 and T4. The test is highly sensitive and helps diagnose hyperthyroidism (low TSH) and hypothyroidism (high TSH). It is essential for monitoring patients on thyroid hormone replacement therapy and for evaluating pituitary function.\n\nInterpretations:\nElevated TSH: Indicates primary hypothyroidism (underactive thyroid).\nLow TSH: Indicates hyperthyroidism (overactive thyroid) or excessive thyroid hormone replacement.\nNormal TSH: Generally indicates normal thyroid function, though subclinical disease may still be present.",
      },
      {
        id: "3.4",
        name: "FT3",
        value: "",
        unit: "pg/mL",
        normalRange: "2.3–4.2",
        price: "800",
        comment:
          "The Free T3 (FT3) test measures the unbound, active fraction of triiodothyronine in the blood. It provides a more accurate assessment of thyroid function than total T3, as it is not influenced by protein levels. FT3 is particularly useful in diagnosing hyperthyroidism and monitoring patients with thyroid disorders, especially when total hormone levels may be misleading due to conditions affecting binding proteins.\n\nInterpretations:\nElevated FT3: Strongly suggests hyperthyroidism, especially T3 thyrotoxicosis.\nLow FT3: May indicate hypothyroidism, but is also seen in euthyroid sick syndrome and starvation.",
      },
      {
        id: "3.5",
        name: "FT4",
        value: "",
        unit: "ng/dL",
        normalRange: "0.8–1.8",
        price: "800",
        comment:
          "The Free T4 (FT4) test measures the unbound, active fraction of thyroxine in the blood. It is a crucial test for assessing thyroid function, as it reflects the actual hormone available to tissues. FT4 is less affected by changes in binding proteins than total T4 and is used alongside TSH for accurate diagnosis of thyroid disorders and for monitoring treatment efficacy.\n\nInterpretations:\nElevated FT4: Indicates hyperthyroidism or excessive thyroid hormone replacement.\nLow FT4: Indicates hypothyroidism or central (pituitary) hypothyroidism.",
      },
      {
        id: "3.6",
        name: "Hba1c",
        value: "",
        unit: "%",
        normalRange: "<5.7",
        price: "800",
        comment:
          "The Hemoglobin A1c (HbA1c) test measures average blood glucose levels over the past 2-3 months by assessing the percentage of glycated hemoglobin. It is the standard test for diagnosing and monitoring diabetes and prediabetes. This test is crucial for assessing long-term glycemic control, predicting complication risk, and guiding treatment adjustments in diabetic patients.\n\nInterpretations:\n<5.7%: Normal\n5.7–6.4%: Prediabetes\n≥6.5%: Diabetes\nFor diabetics, target levels are typically <7%, though individualized goals may apply.",
      },
      {
        id: "3.7",
        name: "TG (Thyroglobulin)",
        value: "",
        unit: "ng/mL",
        normalRange: "3–40",
        price: "2500",
        comment:
          "Thyroglobulin (TG) is a protein produced by thyroid cells. This test is primarily used as a tumor marker to monitor patients after treatment for differentiated thyroid cancer (papillary or follicular). It is also used to evaluate congenital hypothyroidism and thyroiditis. After total thyroidectomy and radioactive iodine ablation, thyroglobulin levels should become undetectable; any detectable level may indicate residual or recurrent disease.\n\nInterpretations:\nUndetectable after thyroid cancer treatment: Indicates successful treatment and no residual disease.\nDetectable or rising levels: Suggests residual, recurrent, or metastatic thyroid cancer.\nElevated with anti-TG antibodies: May be falsely low, requiring careful interpretation.",
      },
      {
        id: "3.8",
        name: "Calcitonin",
        value: "",
        unit: "pg/mL",
        normalRange: "<10",
        price: "3000",
        comment:
          "Calcitonin is a hormone produced by the parafollicular cells (C-cells) of the thyroid gland. This test is primarily used as a tumor marker for medullary thyroid cancer (MTC), which arises from C-cells. It is also used for screening family members of patients with MEN2 syndromes (multiple endocrine neoplasia type 2) and for monitoring treatment response in MTC patients. Elevated levels are highly suggestive of MTC.\n\nInterpretations:\nElevated Calcitonin: Strongly suggests medullary thyroid cancer, but can also be elevated in other neuroendocrine tumors, renal failure, and certain medications.\nNormal levels: Makes MTC less likely, but provocative testing may be needed in suspected cases.",
      },
      {
        id: "3.9",
        name: "Anti TPO Ab",
        value: "",
        unit: "IU/mL",
        normalRange: "<35",
        price: "2500",
        comment:
          "Anti-Thyroid Peroxidase (Anti-TPO) antibodies are autoantibodies directed against an enzyme essential for thyroid hormone production. This test is used to diagnose autoimmune thyroid disorders, including Hashimoto's thyroiditis (the most common cause of hypothyroidism) and Graves' disease. It is also helpful in predicting the risk of developing thyroid dysfunction in patients with other autoimmune conditions and in pregnant women.\n\nInterpretations:\nPositive/High Anti-TPO: Indicates autoimmune thyroid disease, most commonly Hashimoto's thyroiditis. Also seen in many patients with Graves' disease.\nNegative: Does not rule out autoimmune thyroid disease, as some patients are seronegative.",
      },
      {
        id: "3.10",
        name: "Anti TG Ab",
        value: "",
        unit: "IU/mL",
        normalRange: "<20",
        price: "2500",
        comment:
          "Anti-Thyroglobulin (Anti-TG) antibodies are autoantibodies directed against thyroglobulin, a protein stored in the thyroid gland. This test is used in conjunction with Anti-TPO to diagnose autoimmune thyroid disorders, particularly Hashimoto's thyroiditis. It is also crucial for interpreting thyroglobulin (TG) tumor marker results in thyroid cancer patients, as the presence of Anti-TG antibodies can interfere with TG measurements, causing falsely low or high results.\n\nInterpretations:\nPositive/High Anti-TG: Supports a diagnosis of autoimmune thyroid disease, especially Hashimoto's thyroiditis.\nPositive in thyroid cancer patients: Renders TG measurements unreliable for monitoring, requiring alternative monitoring methods.",
      },
      {
        id: "3.11",
        name: "TSH Receptor Ab",
        value: "",
        unit: "IU/L",
        normalRange: "<1.75",
        price: "3000",
        comment:
          "TSH Receptor Antibodies (TRAb) are autoantibodies that bind to and stimulate the TSH receptor on thyroid cells, causing excessive thyroid hormone production. This test is primarily used to diagnose Graves' disease, the most common cause of hyperthyroidism. It is also used to predict neonatal thyrotoxicosis in pregnant women with Graves' disease and to monitor response to treatment.\n\nInterpretations:\nPositive/High TRAb: Strongly supports a diagnosis of Graves' disease.\nNegative: Does not completely rule out Graves' disease, especially in mild cases. May be seen in other causes of hyperthyroidism.",
      },
      {
        id: "3.12",
        name: "PTH",
        value: "",
        unit: "pg/mL",
        normalRange: "15–65",
        price: "2000",
        comment:
          "Parathyroid Hormone (PTH) is a key regulator of calcium and phosphorus balance in the body. This test measures PTH levels to evaluate calcium metabolism disorders. It is essential for diagnosing hyperparathyroidism (primary or secondary) and hypoparathyroidism. It helps differentiate between parathyroid-related causes of abnormal calcium levels and other causes such as malignancy or vitamin D disorders.\n\nInterpretations:\nElevated PTH with high calcium: Suggests primary hyperparathyroidism.\nElevated PTH with low/normal calcium: Suggests secondary hyperparathyroidism (e.g., from vitamin D deficiency or kidney disease).\nLow PTH with low calcium: Suggests hypoparathyroidism.\nLow PTH with high calcium: Suggests non-PTH mediated hypercalcemia (e.g., malignancy).",
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
          "Follicle-Stimulating Hormone (FSH) is a pituitary hormone essential for reproductive function. In women, it stimulates ovarian follicle development and estrogen production. In men, it stimulates sperm production. This test is used to evaluate infertility, menstrual irregularities, and pituitary function. It is also used to assess ovarian reserve and confirm menopause.\n\nInterpretations:\nHigh FSH with low estrogen: Indicates primary ovarian failure (menopause, premature ovarian insufficiency).\nHigh FSH with low testosterone: Indicates primary testicular failure.\nLow or normal FSH with low sex hormones: Suggests secondary (pituitary/hypothalamic) hypogonadism.",
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
          "Luteinizing Hormone (LH) is a pituitary hormone that triggers ovulation in women and stimulates testosterone production in men. This test is used with FSH to evaluate fertility issues, menstrual disorders, and pituitary function. In women, the LH surge predicts ovulation, making it useful for timing conception. It also helps diagnose polycystic ovary syndrome (PCOS) and menopause.\n\nInterpretations:\nHigh LH with high FSH: Indicates primary gonadal failure.\nHigh LH/LH:FSH ratio >2: Suggestive of PCOS.\nLow LH: May indicate hypothalamic or pituitary dysfunction.\nLH surge (mid-cycle): Predicts impending ovulation.",
      },
      {
        id: "3.15",
        name: "Prolactin",
        value: "",
        unit: "ng/mL",
        normalRange: "Male: 2–18, Female: 3–30",
        price: "1200",
        comment:
          "Prolactin is a hormone produced by the pituitary gland that stimulates milk production after childbirth. This test is used to evaluate galactorrhea (milk production not related to breastfeeding), infertility, irregular periods, and pituitary tumors (prolactinomas). It is also used to monitor known prolactin-secreting tumors and assess pituitary function.\n\nInterpretations:\nElevated Prolactin: Indicates hyperprolactinemia, which can be caused by prolactinoma, medications, hypothyroidism, kidney disease, or chest wall stimulation.\nMildly elevated: May be stress-related or due to macroprolactin (benign).\nVery high levels (>250 ng/mL): Highly suggestive of prolactinoma.",
      },
      {
        id: "3.16",
        name: "Testosterone Total",
        value: "",
        unit: "ng/dL",
        normalRange: "Male: 300–1000, Female: 15–70",
        price: "1200",
        comment:
          "Total Testosterone measures all testosterone in the blood, including both bound (to proteins) and unbound (free) fractions. It is the primary test for evaluating androgen status. In men, it is used to diagnose hypogonadism (low testosterone) and monitor testosterone replacement therapy. In women, it helps evaluate hirsutism, virilization, and PCOS.\n\nInterpretations:\nLow in men: Indicates hypogonadism, which may be primary (testicular failure) or secondary (pituitary/hypothalamic).\nHigh in men: Rare, but may indicate testicular tumors or androgen insensitivity.\nHigh in women: Suggests PCOS, congenital adrenal hyperplasia, or androgen-secreting tumors.",
      },
      {
        id: "3.17",
        name: "Testosterone Free",
        value: "",
        unit: "pg/mL",
        normalRange: "Male: 50–210, Female: 1–8",
        price: "2500",
        comment:
          "Free Testosterone measures the unbound, biologically active fraction of testosterone. This test is useful when total testosterone levels are borderline or when conditions affecting binding proteins (like SHBG) are present. It provides a more accurate assessment of androgen status, particularly in conditions like obesity, diabetes, or thyroid disorders that alter SHBG levels.\n\nInterpretations:\nLow Free Testosterone with normal Total Testosterone: May indicate increased SHBG (binding protein), reducing active hormone availability.\nNormal or High Free Testosterone with normal Total Testosterone: May indicate decreased SHBG, increasing active hormone availability.\nClinical symptoms of androgen excess/deficiency often correlate better with free than total testosterone.",
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
          "Estradiol (E2) is the primary form of estrogen, a female sex hormone essential for reproductive function and bone health. This test is used to evaluate ovarian function, menstrual disorders, and fertility. It is also used to monitor ovulation induction, assess menopausal status, and evaluate hormone replacement therapy. In men, it helps evaluate gynecomastia and estrogen-secreting tumors.\n\nInterpretations:\nHigh E2: May indicate ovarian tumors, early puberty, or gynecomastia in men. During fertility treatment, high levels indicate good follicular development.\nLow E2: Indicates ovarian failure (menopause), hypogonadism, or hypothalamic dysfunction.",
      },
      {
        id: "3.19",
        name: "Progesterone",
        value: "",
        unit: "ng/mL",
        normalRange: "Follicular: <1, Luteal: 5–20",
        price: "1000",
        comment:
          "Progesterone is a hormone that prepares the uterine lining for implantation and maintains pregnancy. This test is used to confirm ovulation, evaluate luteal phase function (ability to sustain pregnancy), and monitor high-risk pregnancies. It is also used in the evaluation of ectopic pregnancy and threatened abortion. Progesterone levels rise after ovulation and remain elevated if pregnancy occurs.\n\nInterpretations:\nMid-luteal levels >5 ng/mL: Confirms ovulation.\nLow luteal progesterone: May indicate luteal phase defect, contributing to infertility.\nIn early pregnancy, rising levels: Indicate healthy pregnancy.\nLow or falling levels: May indicate ectopic pregnancy or impending miscarriage.",
      },
      {
        id: "3.20",
        name: "DHEA SO4",
        value: "",
        unit: "µg/dL",
        normalRange: "Male: 100–400, Female: 50–300",
        price: "3000",
        comment:
          "Dehydroepiandrosterone Sulfate (DHEA-SO4) is an androgen hormone produced primarily by the adrenal glands. This test is used to evaluate adrenal function and diagnose adrenal tumors or hyperplasia. It is helpful in investigating hirsutism (excess hair growth in women), infertility, and precocious puberty. Since DHEA-S is almost exclusively adrenal in origin, it helps localize the source of androgen excess.\n\nInterpretations:\nElevated DHEA-S: Suggests adrenal source of androgen excess (adrenal tumor, congenital adrenal hyperplasia, or Cushing's disease).\nLow DHEA-S: May indicate adrenal insufficiency (Addison's disease) or hypopituitarism.",
      },
      {
        id: "3.21",
        name: "AMH Level",
        value: "",
        unit: "ng/mL",
        normalRange: "1–3.5",
        price: "2500",
        comment:
          "Anti-Müllerian Hormone (AMH) is produced by ovarian follicles and reflects the ovarian reserve (remaining egg supply). This test is used to assess fertility potential, predict response to fertility treatment (IVF), and diagnose conditions like PCOS (where AMH is often high). It is also used to predict the timing of menopause and to assess ovarian damage after cancer treatment. Unlike other fertility hormones, AMH remains relatively stable throughout the menstrual cycle.\n\nInterpretations:\nLow AMH: Indicates diminished ovarian reserve, potentially reduced fertility, and approaching menopause.\nHigh AMH: Often seen in PCOS, indicating many small follicles. May also indicate granulosa cell tumors.\nAMH helps guide fertility treatment protocols (higher AMH may require lower medication doses to prevent overstimulation).",
      },
      {
        id: "3.22",
        name: "Beta HCG",
        value: "",
        unit: "mIU/mL",
        normalRange: "<5 (Non-pregnant)",
        price: "1000",
        comment:
          "Beta-Human Chorionic Gonadotropin (Beta-HCG) is a hormone produced during pregnancy. This test is the standard for pregnancy detection and monitoring. Quantitative Beta-HCG helps date early pregnancy, assess viability, and diagnose complications like ectopic pregnancy or miscarriage. It is also used as a tumor marker for certain cancers, including gestational trophoblastic disease and some germ cell tumors.\n\nInterpretations:\n>5 mIU/mL: Positive for pregnancy\nSerial measurements: In early normal pregnancy, levels double every 48-72 hours.\nSlow-rising or falling levels: Suggest ectopic pregnancy or miscarriage.\nVery high levels: May indicate multiple pregnancy or gestational trophoblastic disease.\nPersistent elevation after pregnancy: May indicate retained products of conception or gestational trophoblastic disease.",
      },
      {
        id: "3.23",
        name: "Sex Hormone Binding Globulin (SHBG)",
        value: "",
        unit: "nmol/L",
        normalRange: "Male: 10–60, Female: 20–130",
        price: "2500",
        comment:
          "Sex Hormone Binding Globulin (SHBG) is a protein produced by the liver that binds to sex hormones (testosterone and estradiol), regulating their availability. This test is used to evaluate androgen status, particularly when total testosterone levels are misleading due to conditions affecting SHBG. It is essential for calculating free testosterone and assessing conditions like PCOS, hypogonadism, and thyroid disorders.\n\nInterpretations:\nHigh SHBG: Decreases free testosterone. Seen in hyperthyroidism, liver disease, oral contraceptive use, and aging.\nLow SHBG: Increases free testosterone. Seen in obesity, hypothyroidism, PCOS, and androgen use. May contribute to symptoms of androgen excess even with normal total testosterone.",
      },
      {
        id: "3.24",
        name: "Dihydrotestosterone (DHT)",
        value: "",
        unit: "ng/dL",
        normalRange: "Male: 30–85, Female: 5–20",
        price: "2500",
        comment:
          "Dihydrotestosterone (DHT) is a potent androgen derived from testosterone by the enzyme 5-alpha reductase. It is responsible for male sexual development and conditions like male pattern baldness, acne, and benign prostatic hyperplasia. This test is used to evaluate 5-alpha reductase deficiency in undermasculinized males and to assess androgen status in conditions where DHT-mediated effects are prominent.\n\nInterpretations:\nLow DHT with normal or high testosterone: Suggests 5-alpha reductase deficiency, causing ambiguous genitalia in males and delayed male puberty.\nHigh DHT: May contribute to androgenetic alopecia, hirsutism, and prostate enlargement. Medications like finasteride work by blocking DHT production.",
      },
      {
        id: "3.25",
        name: "Aldosterone",
        value: "",
        unit: "ng/dL",
        normalRange: "4–31",
        price: "3500",
        comment:
          "Aldosterone is a hormone produced by the adrenal glands that regulates blood pressure by controlling sodium and potassium balance. This test is used to diagnose primary aldosteronism (Conn's syndrome), a treatable cause of hypertension. It is also used to evaluate adrenal insufficiency and conditions causing electrolyte imbalances. Aldosterone levels are interpreted alongside renin levels.\n\nInterpretations:\nHigh Aldosterone with low Renin: Indicates primary aldosteronism (adrenal overproduction).\nHigh Aldosterone with high Renin: Indicates secondary aldosteronism (response to kidney stimuli, e.g., renal artery stenosis).\nLow Aldosterone: May indicate adrenal insufficiency (Addison's disease).",
      },
      {
        id: "3.26",
        name: "Plasma Direct Renin",
        value: "",
        unit: "µIU/mL",
        normalRange: "5–50",
        price: "3500",
        comment:
          "Direct Renin measurement assesses the activity of the renin-angiotensin-aldosterone system (RAAS), which regulates blood pressure and electrolyte balance. This test is primarily used with aldosterone to diagnose primary aldosteronism, a common cause of secondary hypertension. It is also used to evaluate renal artery stenosis and guide treatment in hypertensive patients.\n\nInterpretations:\nLow Renin: Suppressed RAAS, often due to volume overload or primary aldosteronism.\nHigh Renin: Indicates stimulated RAAS, seen in renal artery stenosis, dehydration, or renovascular hypertension. Also seen in renin-secreting tumors.",
      },
      {
        id: "3.27",
        name: "Aldosterone: Renin Ratio",
        value: "",
        unit: "",
        normalRange: "<30",
        price: "5000",
        comment:
          "The Aldosterone:Renin Ratio (ARR) is the primary screening test for primary aldosteronism (Conn's syndrome), a curable cause of hypertension. By comparing aldosterone levels to renin activity, this ratio identifies patients whose aldosterone production is inappropriately high relative to their renin status. It is recommended for hypertensive patients with resistant hypertension, hypokalemia, or early-onset hypertension.\n\nInterpretations:\nARR >30: Screen positive for primary aldosteronism, requiring confirmatory testing.\nHigh ratio with high aldosterone and low renin: Classic pattern for primary aldosteronism.\nFalse positives/negatives can occur with medications (especially diuretics, ACE inhibitors), requiring careful medication adjustment before testing.",
      },
      {
        id: "3.28",
        name: "Cortisol",
        value: "",
        unit: "µg/dL",
        normalRange: "Morning: 5–25, Evening: 2–10",
        price: "1000",
        comment:
          "Cortisol is a steroid hormone produced by the adrenal glands that helps regulate metabolism, stress response, and inflammation. This test is used to diagnose Cushing's syndrome (cortisol excess) and Addison's disease (cortisol deficiency). Because cortisol follows a diurnal rhythm (highest in morning, lowest at midnight), timing of collection is critical. It is often measured with ACTH to localize the cause of adrenal dysfunction.\n\nInterpretations:\nHigh Cortisol: Suggests Cushing's syndrome (pituitary tumor, adrenal tumor, or ectopic ACTH production). Loss of diurnal variation is also characteristic.\nLow Cortisol: Suggests adrenal insufficiency (Addison's disease or secondary adrenal insufficiency from pituitary dysfunction).",
      },
      {
        id: "3.29",
        name: "ACTH",
        value: "",
        unit: "pg/mL",
        normalRange: "10–60",
        price: "2500",
        comment:
          "Adrenocorticotropic Hormone (ACTH) is produced by the pituitary gland and stimulates cortisol production from the adrenal glands. This test is used with cortisol to diagnose disorders of the hypothalamic-pituitary-adrenal axis. It helps differentiate between primary adrenal insufficiency (Addison's disease) and secondary adrenal insufficiency (pituitary dysfunction). It is also essential for identifying the cause of Cushing's syndrome.\n\nInterpretations:\nHigh ACTH with high cortisol: Suggests ACTH-dependent Cushing's (pituitary tumor or ectopic ACTH production).\nLow ACTH with high cortisol: Suggests ACTH-independent Cushing's (adrenal tumor).\nHigh ACTH with low cortisol: Indicates primary adrenal insufficiency (adrenal glands don't respond to ACTH).\nLow/normal ACTH with low cortisol: Indicates secondary adrenal insufficiency (pituitary doesn't produce enough ACTH).",
      },
      {
        id: "3.30",
        name: "17-OH Progesterone",
        value: "",
        unit: "ng/dL",
        normalRange: "Male: 30–200, Female Follicular: 15–70",
        price: "3000",
        comment:
          "17-Hydroxyprogesterone (17-OHP) is a steroid hormone intermediate in cortisol production. This test is primarily used to diagnose congenital adrenal hyperplasia (CAH), particularly the most common form (21-hydroxylase deficiency). It is also used in the evaluation of hirsutism, infertility, and ambiguous genitalia in newborns. Elevated levels indicate blockage in cortisol synthesis.\n\nInterpretations:\nMarkedly elevated 17-OHP: Diagnostic for 21-hydroxylase deficiency (most common form of CAH).\nMildly elevated: May indicate non-classic/late-onset CAH, PCOS, or ovarian/adrenal tumors.\nBaseline and stimulated levels (ACTH stimulation test) may be used for diagnosis of mild cases.",
      },
      {
        id: "3.31",
        name: "Growth Hormone",
        value: "",
        unit: "ng/mL",
        normalRange: "<5",
        price: "2500",
        comment:
          "Growth Hormone (GH) is produced by the pituitary gland and stimulates growth, cell reproduction, and metabolism. Random GH levels are often difficult to interpret due to pulsatile secretion. This test is primarily used in stimulation or suppression tests to diagnose GH deficiency (short stature in children) or GH excess (acromegaly/gigantism). It is also used to monitor treatment for acromegaly.\n\nInterpretations:\nElevated random GH: May suggest acromegaly/gigantism, but confirmation requires GH suppression test (oral glucose tolerance test).\nLow random GH: Not diagnostic alone due to pulsatile secretion. GH stimulation testing is needed for deficiency diagnosis.\nIn acromegaly, GH fails to suppress after glucose load.",
      },
      {
        id: "3.32",
        name: "Insulin-Like Growth Factor 1 (IGF-1)",
        value: "",
        unit: "ng/mL",
        normalRange: "Age-dependent",
        price: "3000",
        comment:
          "Insulin-Like Growth Factor 1 (IGF-1) mediates the effects of growth hormone and has a longer half-life, making it a stable marker of average GH production. This test is preferred over random GH for screening and monitoring growth disorders. It is used to diagnose GH deficiency in children, acromegaly in adults, and to monitor treatment response in GH-related disorders.\n\nInterpretations:\nLow IGF-1 (age-adjusted): Suggests GH deficiency (may require GH stimulation testing for confirmation).\nHigh IGF-1 (age-adjusted): Strongly suggests acromegaly/gigantism; requires GH suppression test for confirmation.\nNormal IGF-1: Generally rules out significant GH disorders, though mild cases may be missed.",
      },
      {
        id: "3.33",
        name: "Insulin Fasting",
        value: "",
        unit: "µIU/mL",
        normalRange: "2–20",
        price: "2000",
        comment:
          "Fasting Insulin measures insulin levels after an overnight fast, reflecting baseline insulin secretion. This test is used to evaluate insulin resistance, a precursor to type 2 diabetes and metabolic syndrome. It is also used in the diagnosis of insulinomas (insulin-secreting tumors) and in assessing hypoglycemia. Fasting insulin helps guide management of conditions like PCOS, obesity, and prediabetes.\n\nInterpretations:\nHigh fasting insulin: Indicates insulin resistance (body requires more insulin to maintain normal glucose). Common in metabolic syndrome, PCOS, obesity, and prediabetes.\nLow fasting insulin with low glucose: May indicate normal insulin sensitivity.\nHigh insulin with hypoglycemia: Suggests hyperinsulinemic hypoglycemia (insulinoma, factitious insulin use).",
      },
      {
        id: "3.34",
        name: "C-Peptide",
        value: "",
        unit: "ng/mL",
        normalRange: "0.5–2.7",
        price: "2000",
        comment:
          "C-Peptide is released in equal amounts with insulin from the pancreas and reflects endogenous insulin production. This test is crucial for differentiating between type 1 and type 2 diabetes, evaluating hypoglycemia, and detecting factitious insulin use (exogenous insulin suppresses C-peptide). It is also used to assess residual beta-cell function in diabetic patients and to monitor pancreatic transplant function.\n\nInterpretations:\nLow C-peptide with high glucose: Indicates type 1 diabetes or long-standing type 2 diabetes with beta-cell failure.\nHigh C-peptide with hypoglycemia: Suggests endogenous hyperinsulinemia (insulinoma).\nLow C-peptide with hypoglycemia: Suggests exogenous insulin use (factitious hypoglycemia) or sulfonylurea use.",
      },
      {
        id: "3.35",
        name: "Gastrin-17",
        value: "",
        unit: "pg/mL",
        normalRange: "<10",
        price: "3000",
        comment:
          "Gastrin-17 is a hormone that stimulates gastric acid secretion. This test is primarily used to diagnose Zollinger-Ellison syndrome (gastrinoma), a condition causing severe peptic ulcers. It is also used in the evaluation of pernicious anemia and after gastric surgery. Elevated gastrin leads to excessive stomach acid production, causing ulcers and diarrhea.\n\nInterpretations:\nElevated Gastrin: May indicate gastrinoma (Zollinger-Ellison syndrome), especially if very high. Also elevated in pernicious anemia (achlorhydria), chronic gastritis, and after gastric surgery.\nProvocative testing (secretin stimulation test) helps differentiate gastrinoma from other causes of hypergastrinemia.",
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
          "Prothrombin Time (PT) and International Normalized Ratio (INR) measure the time it takes for blood to clot via the extrinsic pathway. This test is essential for monitoring warfarin (Coumadin) anticoagulation therapy, where the INR target is typically 2-3. It is also used to evaluate liver function, vitamin K deficiency, and bleeding disorders. The INR standardizes results across different laboratories, allowing for consistent therapeutic monitoring.\n\nInterpretations:\nElevated PT/INR: Indicates prolonged clotting time. Causes include warfarin therapy, liver disease, vitamin K deficiency, or factor deficiencies (VII, X, V, II).\nLow PT/INR: May indicate risk of thrombosis or lab error.\nIn warfarin therapy, therapeutic INR varies by indication (typically 2-3 for most conditions, higher for mechanical heart valves).",
      },
      {
        id: "4.2",
        name: "APTT",
        value: "",
        unit: "sec",
        normalRange: "25–35",
        price: "400",
        comment:
          "Activated Partial Thromboplastin Time (APTT) measures clotting time via the intrinsic pathway. This test is primarily used to monitor heparin anticoagulation therapy and to screen for hemophilia A and B (factor VIII and IX deficiencies). It is also used to evaluate lupus anticoagulant and other coagulation factor deficiencies (XII, XI, IX, VIII).\n\nInterpretations:\nElevated APTT: Indicates prolonged clotting time. Causes include heparin therapy, hemophilia A/B, von Willebrand disease, factor deficiencies (XII, XI, IX, VIII), or lupus anticoagulant.\nNormal APTT with bleeding history: May indicate mild factor deficiency or platelet disorder requiring further testing.\nMixing studies help differentiate factor deficiencies from inhibitors (like lupus anticoagulant).",
      },
      {
        id: "4.3",
        name: "Mixing Study",
        value: "",
        unit: "",
        normalRange: "Correction",
        price: "1800",
        comment:
          "The Mixing Study is performed when PT or APTT is prolonged to determine the cause. Patient plasma is mixed with normal plasma; if the prolonged time corrects to normal, it suggests a factor deficiency. If it does not correct, it suggests an inhibitor (like lupus anticoagulant or factor-specific antibodies). This test is essential for diagnosing hemophilia, acquired inhibitors, and lupus anticoagulant.\n\nInterpretations:\nCorrection (prolonged time becomes normal): Indicates deficiency of one or more clotting factors.\nNo correction (remains prolonged): Indicates presence of an inhibitor (antibody) against specific clotting factors or phospholipids (lupus anticoagulant).\nImmediate vs. incubated mixing helps differentiate factor inhibitors (like factor VIII inhibitor) from lupus anticoagulant.",
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
          "Serum Iron measures the amount of iron circulating in the blood bound to transferrin. This test is part of the iron profile used to evaluate iron deficiency and overload disorders. It is essential for diagnosing anemia, monitoring iron therapy, and assessing conditions like hemochromatosis. Iron levels fluctuate throughout the day and are affected by recent iron intake.\n\nInterpretations:\nLow Iron: Indicates iron deficiency anemia, chronic disease anemia, or blood loss.\nHigh Iron: Suggests hemochromatosis, iron overload from transfusions, or liver disease.\nInterpretation requires correlation with ferritin, TIBC, and transferrin saturation.",
      },
      {
        id: "5.2",
        name: "Ferritin Level",
        value: "",
        unit: "ng/mL",
        normalRange: "Male: 20–250, Female: 10–150",
        price: "1500",
        comment:
          "Ferritin is the primary iron storage protein and reflects total body iron stores. It is the most sensitive and specific test for diagnosing iron deficiency anemia. Ferritin is also an acute-phase reactant, increasing with inflammation, infection, and liver disease. This test is used to evaluate both iron deficiency and iron overload conditions.\n\nInterpretations:\nLow Ferritin (<30 ng/mL): Highly specific for iron deficiency anemia. Even lower levels (<12-15) are diagnostic.\nHigh Ferritin: Indicates iron overload (hemochromatosis, hemosiderosis), but also elevated in inflammation, liver disease, malignancy, and metabolic syndrome.\nInflammatory states may falsely elevate ferritin, masking iron deficiency.",
      },
      {
        id: "5.3",
        name: "TIBC",
        value: "",
        unit: "µg/dL",
        normalRange: "250–400",
        price: "2000",
        comment:
          "Total Iron-Binding Capacity (TIBC) measures the blood's capacity to bind iron with transferrin. It indirectly reflects transferrin levels. TIBC typically increases when iron stores are low and decreases when iron stores are high or in inflammatory states. This test is used with serum iron and ferritin to diagnose iron deficiency, anemia of chronic disease, and iron overload.\n\nInterpretations:\nHigh TIBC: Indicates iron deficiency (body is trying to bind more iron). Also elevated in pregnancy and oral contraceptive use.\nLow TIBC: Indicates iron overload (hemochromatosis), chronic inflammation, malnutrition, or liver disease.\nTransferrin saturation (Iron/TIBC x 100%) <15% suggests iron deficiency; >45-50% suggests iron overload.",
      },
      {
        id: "5.4",
        name: "S.Transferrin",
        value: "",
        unit: "mg/dL",
        normalRange: "200–360",
        price: "2000",
        comment:
          "Serum Transferrin is the primary iron transport protein in the blood. This test measures the protein directly, unlike TIBC which measures its function. Transferrin levels are used to evaluate iron status and nutritional status. It is particularly useful in assessing protein malnutrition and in conditions where TIBC measurement may be unreliable.\n\nInterpretations:\nHigh Transferrin: Indicates iron deficiency, pregnancy, or estrogen therapy.\nLow Transferrin: Indicates iron overload (hemochromatosis), protein malnutrition, liver disease, or chronic inflammation.\nTransferrin saturation (calculated from iron and transferrin) provides information about iron availability for erythropoiesis.",
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
          "Gamma-Glutamyl Transferase (GGT) is an enzyme found in the liver, bile ducts, and kidneys. It is a sensitive marker for liver and bile duct diseases, particularly those involving cholestasis (blockage of bile flow). GGT is also used to monitor alcohol abuse, as it is elevated in most cases of excessive alcohol consumption. It helps differentiate between liver and bone sources of elevated ALP.\n\nInterpretations:\nElevated GGT: Indicates liver disease (hepatitis, cirrhosis), bile duct obstruction, alcohol abuse, or medication-induced liver injury (certain drugs). Also elevated in pancreatitis, heart failure, and diabetes.\nGGT with elevated ALP suggests hepatobiliary origin; normal GGT with elevated ALP suggests bone origin.",
      },
      {
        id: "6.2",
        name: "Total Protein",
        value: "",
        unit: "g/dL",
        normalRange: "6.4–8.3",
        price: "200",
        comment:
          "Total Protein measures the combined amount of albumin and globulins in the blood. This test is used to assess nutritional status, liver function, kidney function, and hydration status. It helps screen for conditions like multiple myeloma (elevated proteins) and liver or kidney disease (low proteins). Abnormal results require fractionation into albumin and globulin for specific diagnosis.\n\nInterpretations:\nHigh Total Protein: May indicate dehydration, chronic inflammation, multiple myeloma (high globulins), or sarcoidosis.\nLow Total Protein: Indicates malnutrition, malabsorption, liver disease (decreased production), kidney disease (protein loss), or severe burns.",
      },
      {
        id: "6.3",
        name: "Albumin",
        value: "",
        unit: "g/dL",
        normalRange: "3.5–5.0",
        price: "200",
        comment:
          "Albumin is the main protein produced by the liver and helps maintain oncotic pressure, transport substances, and provide nutrition. This test is used to assess liver and kidney function, nutritional status, and chronic disease severity. Low albumin is a marker of poor prognosis in many conditions and is used to monitor critically ill patients.\n\nInterpretations:\nLow Albumin (hypoalbuminemia): Indicates liver disease (cirrhosis), kidney disease (nephrotic syndrome), malnutrition, malabsorption, chronic inflammation, or protein-losing enteropathy.\nHigh Albumin: Usually indicates dehydration.",
      },
      {
        id: "6.4",
        name: "Globulin",
        value: "",
        unit: "g/dL",
        normalRange: "2.0–3.5",
        price: "200",
        comment:
          "Globulins are a group of proteins (including antibodies) involved in immune function and inflammation. This test is calculated by subtracting albumin from total protein. It is used to evaluate immune status, chronic inflammation, and conditions like multiple myeloma. Elevated globulins often indicate increased antibody production.\n\nInterpretations:\nHigh Globulins: Indicates chronic inflammation, infection, autoimmune disease, liver disease, or multiple myeloma (monoclonal gammopathy).\nLow Globulins: May indicate immunodeficiency, malnutrition, or protein-losing conditions.\nSerum protein electrophoresis is needed to determine which globulin fraction is abnormal.",
      },
      {
        id: "6.5",
        name: "A/G Ratio",
        value: "",
        unit: "",
        normalRange: "1.0–2.0",
        price: "200",
        comment:
          "The Albumin/Globulin (A/G) Ratio compares albumin to globulin levels, providing insight into relative protein fractions. An abnormal ratio prompts investigation into underlying causes. This test helps screen for liver disease, kidney disease, and immunological disorders. It is interpreted alongside total protein and individual protein measurements.\n\nInterpretations:\nLow A/G Ratio (<1.0): Indicates either low albumin or high globulins. Seen in liver disease, nephrotic syndrome, chronic inflammation, and multiple myeloma.\nHigh A/G Ratio (>2.0): Less common, may indicate low globulins (immunodeficiency) or very high albumin (dehydration).",
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
          "Lactate Dehydrogenase (LDH) is an enzyme found in many body tissues, including heart, liver, kidneys, and muscles. It is released when cells are damaged. This test is used to assess tissue damage, including myocardial infarction, hemolysis, liver disease, and muscle injury. It is also a tumor marker for certain cancers and helps evaluate the severity of conditions like pneumonia.\n\nInterpretations:\nElevated LDH: Indicates tissue damage from myocardial infarction (peaks 3-4 days post-event), hemolytic anemia, liver disease, pulmonary embolism, muscle injury, or malignancy (especially lymphoma, germ cell tumors).\nIsoenzyme testing (LDH-1, LDH-2) helps localize the source of elevation.",
      },
      {
        id: "7.2",
        name: "CPK",
        value: "",
        unit: "U/L",
        normalRange: "Male: 55–170, Female: 30–145",
        price: "500",
        comment:
          "Creatine Phosphokinase (CPK) is an enzyme found primarily in heart muscle, skeletal muscle, and brain. It is released when muscle tissue is damaged. This test is used to diagnose and monitor myocardial infarction, muscle injury (rhabdomyolysis), muscular dystrophy, and severe muscle inflammation. It is also used to assess damage from seizures, prolonged immobilization, or crush injuries.\n\nInterpretations:\nElevated CPK: Indicates muscle damage. Causes include myocardial infarction (with CK-MB), rhabdomyolysis (skeletal muscle injury), strenuous exercise, trauma, seizures, medications (statins), and muscular dystrophies.\nIsoenzyme testing (CK-MB, CK-MM) helps localize the source.",
      },
      {
        id: "7.3",
        name: "CK-MB",
        value: "",
        unit: "U/L",
        normalRange: "<5% of total CK",
        price: "500",
        comment:
          "CK-MB is an isoenzyme of creatine kinase found predominantly in heart muscle. This test was historically the standard for diagnosing myocardial infarction, though it has largely been replaced by troponin which is more sensitive and specific. It is still used to detect reperfusion after thrombolytic therapy and to diagnose reinfarction. CK-MB rises within 4-6 hours of heart attack and returns to normal within 2-3 days.\n\nInterpretations:\nElevated CK-MB with elevated total CK: Suggests myocardial injury, especially if CK-MB >5-6% of total CK. However, small amounts of CK-MB can be released from skeletal muscle.\nCK-MB may also be elevated in myocarditis, cardiac contusion, and after cardiac surgery.",
      },
      {
        id: "7.4",
        name: "Troponin I",
        value: "",
        unit: "ng/mL",
        normalRange: "<0.04",
        price: "1000",
        comment:
          "Troponin I is a protein found exclusively in heart muscle that regulates muscle contraction. It is the gold standard biomarker for diagnosing myocardial infarction (heart attack) due to its high sensitivity and specificity for cardiac injury. Troponin rises within 3-6 hours of symptom onset and remains elevated for 7-10 days. This test is essential for evaluating acute coronary syndrome and risk stratification.\n\nInterpretations:\nElevated Troponin I (>99th percentile): Indicates myocardial injury, most commonly due to acute myocardial infarction. Also elevated in myocarditis, heart failure, pulmonary embolism, sepsis, and severe stress (Takotsubo cardiomyopathy).\nSerial measurements (3-6 hours apart) are used to detect rising/falling patterns diagnostic of MI.",
      },
      {
        id: "7.5",
        name: "Troponin T",
        value: "",
        unit: "ng/mL",
        normalRange: "<0.01",
        price: "1000",
        comment:
          "Troponin T is a cardiac-specific protein that, like Troponin I, is the preferred biomarker for diagnosing myocardial infarction. It is highly sensitive and specific for cardiac muscle injury. Troponin T rises within 3-6 hours of symptom onset and remains elevated for up to 14 days. This test is crucial for evaluating acute coronary syndrome, guiding treatment decisions, and assessing prognosis.\n\nInterpretations:\nElevated Troponin T (>99th percentile): Indicates myocardial injury. Causes include acute MI, unstable angina, myocarditis, heart failure, pulmonary embolism, and renal failure (though renal patients may have chronically elevated levels).\nHigh-sensitivity troponin assays can detect very low levels, improving early diagnosis and risk stratification.",
      },
      {
        id: "7.6",
        name: "D-Dimer",
        value: "",
        unit: "ng/mL",
        normalRange: "<250",
        price: "1000",
        comment:
          "D-Dimer is a fibrin degradation fragment produced when blood clots break down. This test is primarily used to rule out venous thromboembolism (deep vein thrombosis and pulmonary embolism) due to its high negative predictive value. It is also used in the diagnosis of disseminated intravascular coagulation (DIC). A negative D-Dimer essentially excludes thrombosis in low-risk patients.\n\nInterpretations:\nNegative/Normal D-Dimer: Effectively rules out DVT/PE in low-to-moderate risk patients.\nPositive/Elevated D-Dimer: Indicates possible thrombosis, but is non-specific. Elevated in many conditions including pregnancy, cancer, infection, inflammation, recent surgery, and liver disease. Positive results require imaging (ultrasound, CT) for confirmation.",
      },
      {
        id: "7.7",
        name: "Myoglobin",
        value: "",
        unit: "ng/mL",
        normalRange: "Male: 20–80, Female: 15–60",
        price: "2500",
        comment:
          "Myoglobin is an oxygen-binding protein found in heart and skeletal muscle. It is released rapidly after muscle injury, rising within 1-3 hours of myocardial infarction, making it an early marker. However, it lacks cardiac specificity as it is also elevated in skeletal muscle injury. This test is used for early detection of myocardial infarction and to assess reperfusion after treatment. It is also used to evaluate rhabdomyolysis.\n\nInterpretations:\nElevated Myoglobin: Indicates muscle damage. In cardiac setting, early elevation suggests MI but requires confirmation with troponin. Also elevated in rhabdomyolysis, trauma, seizures, and strenuous exercise.\nRapid rise and fall (within 24 hours) characterizes myoglobin; persistent elevation suggests ongoing damage.",
      },
      {
        id: "7.8",
        name: "Angiotensin Converting Enzyme (ACE)",
        value: "",
        unit: "U/L",
        normalRange: "8–52",
        price: "3000",
        comment:
          "Angiotensin-Converting Enzyme (ACE) is an enzyme involved in blood pressure regulation. This test is primarily used to diagnose and monitor sarcoidosis, a granulomatous disorder where ACE levels are often elevated. It is also used in the diagnosis of Gaucher's disease and leprosy. ACE levels reflect granuloma burden in sarcoidosis and help monitor treatment response.\n\nInterpretations:\nElevated ACE: Strongly suggests active sarcoidosis (60-70% of patients). Also elevated in Gaucher's disease, leprosy, hyperthyroidism, and diabetes.\nNormal ACE: Does not exclude sarcoidosis; 30-40% of patients have normal levels.\nFalling levels with treatment indicate response to therapy in sarcoidosis.",
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
          "Serum Electrolytes (Sodium, Potassium, Chloride) are minerals essential for nerve conduction, muscle function, hydration, and acid-base balance. This panel is one of the most commonly ordered tests, used to evaluate hydration status, kidney function, acid-base disorders, and cardiac rhythm abnormalities. It is essential for monitoring patients on diuretics, with kidney disease, or with gastrointestinal losses.\n\nInterpretations:\nSodium (Na): High (hypernatremia) indicates dehydration or excess salt; low (hyponatremia) indicates overhydration, heart failure, or SIADH.\nPotassium (K): High (hyperkalemia) indicates kidney failure, ACE inhibitor use, or cell breakdown; life-threatening arrhythmias can occur. Low (hypokalemia) indicates diuretic use, diarrhea, or vomiting.\nChloride (Cl): Follows sodium; high in metabolic acidosis, low in vomiting.",
      },
      {
        id: "8.2",
        name: "Calcium Ca",
        value: "",
        unit: "mg/dL",
        normalRange: "8.5–10.2",
        price: "200",
        comment:
          "Calcium is essential for bone health, muscle contraction, nerve transmission, and blood clotting. This test measures total calcium (bound + free) and is used to evaluate parathyroid function, bone disorders, and certain cancers. It helps diagnose hyperparathyroidism, hypoparathyroidism, and monitor patients with chronic kidney disease or malabsorption.\n\nInterpretations:\nHigh Calcium (hypercalcemia): Suggests primary hyperparathyroidism, malignancy (especially lung, breast, myeloma), excessive vitamin D intake, or sarcoidosis.\nLow Calcium (hypocalcemia): Indicates hypoparathyroidism, vitamin D deficiency, kidney disease, pancreatitis, or malabsorption. Symptoms include tetany and muscle cramps.\nIonized calcium (free) may be needed when protein levels are abnormal.",
      },
      {
        id: "8.3",
        name: "Mg",
        value: "",
        unit: "mg/dL",
        normalRange: "1.7–2.2",
        price: "200",
        comment:
          "Magnesium is essential for muscle and nerve function, heart rhythm, and bone health. It is a cofactor for many enzymes. This test is used to evaluate neuromuscular symptoms (twitching, weakness), cardiac arrhythmias, and to monitor patients with malnutrition, alcoholism, or taking certain medications (diuretics, proton pump inhibitors).\n\nInterpretations:\nLow Magnesium (hypomagnesemia): Causes include alcoholism, diuretic use, malnutrition, diarrhea, and certain medications. Can cause weakness, tetany, and arrhythmias. Often associated with low potassium and calcium.\nHigh Magnesium (hypermagnesemia): Usually due to kidney failure or excessive intake (antacids, laxatives). Can cause weakness, low blood pressure, and cardiac arrest.",
      },
      {
        id: "8.4",
        name: "Phosphorus",
        value: "",
        unit: "mg/dL",
        normalRange: "2.5–4.5",
        price: "1000",
        comment:
          "Phosphorus is essential for bone formation, energy metabolism, and cell membrane structure. This test is used with calcium to evaluate parathyroid function, bone disorders, and kidney disease. It helps diagnose hyperparathyroidism, hypoparathyroidism, and monitor patients with chronic kidney disease (where phosphorus often rises).\n\nInterpretations:\nHigh Phosphorus: Indicates kidney failure, hypoparathyroidism, or excessive intake. High phosphorus with low calcium suggests chronic kidney disease.\nLow Phosphorus: Indicates hyperparathyroidism, vitamin D deficiency, malnutrition, or long-term antacid use. Severe deficiency causes muscle weakness and bone pain.",
      },
      {
        id: "8.5",
        name: "Zinc",
        value: "",
        unit: "µg/dL",
        normalRange: "70–120",
        price: "2000",
        comment:
          "Zinc is an essential trace mineral involved in immune function, wound healing, cell division, and growth. This test is used to evaluate zinc deficiency in patients with poor wound healing, hair loss, chronic diarrhea, or malnutrition. It is also used to monitor patients on total parenteral nutrition or with conditions affecting zinc absorption (Crohn's disease, celiac disease).\n\nInterpretations:\nLow Zinc: Indicates deficiency, causing impaired immune function, delayed wound healing, hair loss, skin rashes, and growth retardation in children.\nHigh Zinc: Usually from excessive supplementation, causing copper deficiency and neurological symptoms.",
      },
      {
        id: "8.6",
        name: "ABGs (18 parameters)",
        value: "",
        unit: "Various",
        normalRange: "pH: 7.35–7.45, pCO2: 35–45, pO2: 80–100, HCO3: 22–26",
        price: "2000",
        comment:
          "Arterial Blood Gases (ABGs) measure oxygenation, ventilation, and acid-base status using arterial blood. This test is critical for managing critically ill patients, those with respiratory failure, and metabolic disorders. It provides information about lung function (oxygenation and CO2 removal) and kidney compensation for acid-base disturbances. ABGs guide interventions like mechanical ventilation and bicarbonate therapy.\n\nInterpretations:\nAcid-base disorders are identified by pH, pCO2, and HCO3:\nRespiratory Acidosis: Low pH, high pCO2 (hypoventilation)\nRespiratory Alkalosis: High pH, low pCO2 (hyperventilation)\nMetabolic Acidosis: Low pH, low HCO3 (DKA, renal failure, diarrhea)\nMetabolic Alkalosis: High pH, high HCO3 (vomiting, diuretics)\nOxygenation status assessed by pO2 and O2 saturation.",
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
          "25-Hydroxyvitamin D is the major circulating form of vitamin D and the best indicator of overall vitamin D status. This test is used to diagnose vitamin D deficiency, which is extremely common and contributes to bone disorders (osteoporosis, osteomalacia), immune dysfunction, and possibly cardiovascular disease. It is essential for evaluating patients with bone pain, muscle weakness, or risk factors for deficiency (limited sun exposure, malabsorption, dark skin).\n\nInterpretations:\n<20 ng/mL: Deficient - associated with osteomalacia/rickets, requires treatment.\n20-29 ng/mL: Insufficient - suboptimal for bone health.\n30-100 ng/mL: Sufficient - optimal for most health outcomes.\n>100 ng/mL: Potentially toxic - can cause hypercalcemia and kidney stones.",
      },
      {
        id: "9.2",
        name: "Vitamin B9 (Folic Acid)",
        value: "",
        unit: "ng/mL",
        normalRange: "5–20",
        price: "2000",
        comment:
          "Folate (Vitamin B9) is essential for DNA synthesis, red blood cell production, and fetal neural tube development. This test is used to evaluate macrocytic anemia (often with B12) and to assess nutritional status, especially in pregnancy, alcoholism, and malabsorption conditions. Folate deficiency can cause megaloblastic anemia identical to B12 deficiency, but without the neurological complications.\n\nInterpretations:\nLow Folate: Indicates deficiency, causing megaloblastic anemia, glossitis, and during pregnancy, neural tube defects in fetus. Causes include poor nutrition, alcoholism, malabsorption (celiac, Crohn's), and certain medications (methotrexate, phenytoin).\nNormal/High Folate: Usually adequate, though red blood cell folate may better reflect tissue stores.",
      },
      {
        id: "9.3",
        name: "Vit B12",
        value: "",
        unit: "pg/mL",
        normalRange: "200–900",
        price: "1500",
        comment:
          "Vitamin B12 (Cobalamin) is essential for red blood cell formation, neurological function, and DNA synthesis. This test is used to evaluate macrocytic anemia, neurological symptoms (neuropathy, memory loss), and nutritional status. B12 deficiency can cause irreversible neurological damage if untreated, making early diagnosis critical. It is common in vegetarians, elderly, and those with malabsorption.\n\nInterpretations:\nLow B12 (<200 pg/mL): Indicates deficiency, causing megaloblastic anemia, peripheral neuropathy, subacute combined degeneration of spinal cord, and cognitive impairment. Causes include pernicious anemia (autoimmune), gastrectomy, Crohn's disease, and vegan diet.\nBorderline (200-300 pg/mL): May require additional testing (methylmalonic acid, homocysteine) to confirm deficiency.",
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
          "The TB-IGRA (Interferon-Gamma Release Assay) is a blood test that detects latent tuberculosis infection by measuring the immune response to TB antigens. It is more specific than the skin test (PPD) and not affected by BCG vaccination. This test is used for screening high-risk individuals, contacts of TB patients, and healthcare workers. It helps identify latent TB infection that requires treatment to prevent progression to active disease.\n\nInterpretations:\nPositive: Indicates infection with M. tuberculosis (latent or active). Does not distinguish between latent and active TB; clinical evaluation and chest X-ray are needed.\nNegative: No evidence of TB infection.\nIndeterminate/Borderline: May occur with immunosuppression or lab error; may require repeat testing.",
      },
      {
        id: "10.2",
        name: "Hbs Ag",
        value: "",
        unit: "",
        normalRange: "Non-reactive",
        price: "1000",
        comment:
          "Hepatitis B Surface Antigen (HBsAg) is a protein on the surface of hepatitis B virus. Its presence indicates active hepatitis B infection, either acute or chronic. This test is the primary screening tool for hepatitis B, used in blood donor screening, prenatal testing, and evaluation of patients with liver disease. A positive result means the person is infectious and can transmit the virus to others.\n\nInterpretations:\nPositive/Reactive: Indicates active hepatitis B infection. Acute infection (if newly positive) or chronic infection (if positive >6 months). Requires further testing (HBeAg, HBV DNA, liver function) for management.\nNegative/Non-reactive: No active infection; patient is not infectious for HBV.",
      },
      {
        id: "10.3",
        name: "Hbs Ab",
        value: "",
        unit: "mIU/mL",
        normalRange: ">10 (Protective)",
        price: "1000",
        comment:
          "Hepatitis B Surface Antibody (anti-HBs) is produced in response to hepatitis B infection or vaccination. This test determines immunity to hepatitis B. It is used to assess vaccine response (should be >10 mIU/mL after vaccination) and to confirm recovery from past infection. It helps identify individuals who need vaccination and those who are protected.\n\nInterpretations:\n>10 mIU/mL: Protective immunity. If after vaccination, indicates successful immunization. If with positive anti-HBc, indicates resolved infection with immunity.\n<10 mIU/mL: Non-immune; susceptible to HBV infection. Vaccination is recommended.",
      },
      {
        id: "10.4",
        name: "Hbe Ag",
        value: "",
        unit: "",
        normalRange: "Non-reactive",
        price: "1500",
        comment:
          "Hepatitis B e Antigen (HBeAg) is a viral protein associated with active viral replication and high infectivity. This test is used in patients with chronic hepatitis B to assess viral activity and guide treatment decisions. Positive HBeAg indicates that the virus is actively replicating and the patient is highly infectious.\n\nInterpretations:\nPositive: Indicates active viral replication, high HBV DNA levels, and high infectivity. Often associated with liver inflammation and may guide antiviral therapy.\nNegative: Lower viral replication, though precore mutants can have active disease with negative HBeAg.",
      },
      {
        id: "10.5",
        name: "Hbe Ab",
        value: "",
        unit: "",
        normalRange: "Non-reactive",
        price: "1500",
        comment:
          "Hepatitis B e Antibody (anti-HBe) appears when HBeAg disappears, indicating reduced viral replication. This test is used with HBeAg to stage chronic hepatitis B and assess response to treatment. Seroconversion from HBeAg positive to anti-HBe positive is a favorable outcome, indicating lower infectivity and often better prognosis.\n\nInterpretations:\nPositive: Indicates lower viral replication and infectivity. May occur after resolution of acute infection or after successful treatment of chronic hepatitis B.\nNegative with positive HBeAg: Indicates active replication.\nSome patients with precore mutants may have active disease despite positive anti-HBe.",
      },
      {
        id: "10.6",
        name: "Hbc Total",
        value: "",
        unit: "",
        normalRange: "Non-reactive",
        price: "1500",
        comment:
          "Total Hepatitis B Core Antibody (anti-HBc) detects both IgG and IgM antibodies to the hepatitis B core antigen. This test indicates past or ongoing HBV infection and is used to diagnose occult hepatitis B (when HBsAg is negative but infection has occurred). It helps differentiate between resolved infection and vaccine-induced immunity.\n\nInterpretations:\nPositive with negative HBsAg and positive HBsAb: Indicates resolved infection with immunity.\nPositive with positive HBsAg: Indicates active infection.\nPositive alone (isolated anti-HBc): May indicate occult infection, window period after acute infection, or false positive.",
      },
      {
        id: "10.7",
        name: "Hbc IgM",
        value: "",
        unit: "",
        normalRange: "Non-reactive",
        price: "1800",
        comment:
          "IgM Hepatitis B Core Antibody (anti-HBc IgM) is produced during acute or recent hepatitis B infection. This test is essential for diagnosing acute hepatitis B, distinguishing it from acute exacerbations of chronic hepatitis B. It is positive during the first 6 months of infection and may remain positive in some chronic cases during flares.\n\nInterpretations:\nPositive: Indicates acute or recent hepatitis B infection (within 6 months). May also be positive during flares of chronic hepatitis B.\nNegative with positive HBsAg: Suggests chronic hepatitis B.",
      },
      {
        id: "10.8",
        name: "HCV Ab",
        value: "",
        unit: "",
        normalRange: "Non-reactive",
        price: "1500",
        comment:
          "Hepatitis C Antibody (anti-HCV) detects antibodies to hepatitis C virus, indicating past or present infection. This test is the primary screening tool for hepatitis C, used in high-risk individuals, blood donors, and patients with elevated liver enzymes. A positive result indicates exposure to HCV but does not distinguish between active and resolved infection.\n\nInterpretations:\nPositive/Reactive: Indicates exposure to HCV. Requires HCV RNA testing to determine if infection is active (current) or resolved (if RNA negative).\nNegative/Non-reactive: No evidence of HCV exposure, though early infection (window period) may be negative.",
      },
      {
        id: "10.9",
        name: "HEV IgG",
        value: "",
        unit: "",
        normalRange: "Non-reactive",
        price: "2500",
        comment:
          "Hepatitis E Virus IgG antibody indicates past infection with hepatitis E, a viral cause of acute hepatitis transmitted through contaminated water. This test is used to determine previous exposure and immunity to HEV. It appears during recovery and persists long-term, indicating resolved infection.\n\nInterpretations:\nPositive: Indicates past HEV infection (resolved). Patient is no longer infectious and has some immunity.\nNegative: No evidence of past HEV infection.",
      },
      {
        id: "10.10",
        name: "HEV IgM",
        value: "",
        unit: "",
        normalRange: "Non-reactive",
        price: "2500",
        comment:
          "Hepatitis E Virus IgM antibody indicates acute or recent HEV infection. This test is used to diagnose acute hepatitis E in patients with symptoms of viral hepatitis, especially those with recent travel to endemic areas. IgM appears early in infection and indicates active viral replication.\n\nInterpretations:\nPositive: Indicates acute HEV infection. Patient is infectious and requires supportive care.\nNegative: Does not rule out early infection; may need repeat testing if suspicion is high.",
      },
      {
        id: "10.11",
        name: "HDV IgG/IgM",
        value: "",
        unit: "",
        normalRange: "Non-reactive",
        price: "2500",
        comment:
          "Hepatitis D Virus antibodies detect infection with HDV, a defective virus that requires HBV for replication. This test is used in HBsAg-positive patients to diagnose HDV coinfection (simultaneous with HBV) or superinfection (HDV in chronic HBV). HDV infection causes more severe liver disease than HBV alone.\n\nInterpretations:\nIgM Positive: Indicates acute HDV infection (coinfection or superinfection).\nIgG Positive: Indicates past or chronic HDV infection.\nPositive in HBsAg+ patient: Confirms HDV infection and indicates more severe liver disease.",
      },
      {
        id: "10.12",
        name: "HIV Ab",
        value: "",
        unit: "",
        normalRange: "Non-reactive",
        price: "2000",
        comment:
          "HIV Antibody test detects antibodies to Human Immunodeficiency Virus, the cause of AIDS. This test is the primary screening tool for HIV infection, used for routine screening, prenatal testing, and diagnosis of symptomatic patients. Modern tests detect both HIV-1 and HIV-2 and have a short window period. Positive results require confirmatory testing.\n\nInterpretations:\nNon-reactive/Negative: No antibodies detected. If recent exposure (<4 weeks), repeat testing may be needed (window period).\nReactive/Positive: Antibodies detected; requires confirmatory testing (Western blot or HIV RNA) before diagnosis.\nEarly infection may be antibody-negative but RNA positive (acute HIV syndrome).",
      },
      {
        id: "10.13",
        name: "HAV IgG",
        value: "",
        unit: "",
        normalRange: "Non-reactive",
        price: "2000",
        comment:
          "Hepatitis A Virus IgG antibody indicates past infection with or vaccination against hepatitis A. This test determines immunity to HAV, which is transmitted through fecal-oral route. It is used for pre-vaccination screening (to avoid unnecessary vaccination) and to confirm past infection in patients with previous hepatitis.\n\nInterpretations:\nPositive: Indicates immunity to HAV from past infection or vaccination. Patient is protected and not infectious.\nNegative: Susceptible to HAV infection; vaccination recommended for at-risk individuals.",
      },
      {
        id: "10.14",
        name: "HAV IgM",
        value: "",
        unit: "",
        normalRange: "Non-reactive",
        price: "2000",
        comment:
          "Hepatitis A Virus IgM antibody indicates acute or recent HAV infection. This test is used to diagnose acute hepatitis A in patients with symptoms of viral hepatitis (jaundice, nausea, elevated liver enzymes). IgM appears early in infection and indicates active viral shedding and infectiousness.\n\nInterpretations:\nPositive: Confirms acute hepatitis A infection. Patient is infectious; requires supportive care and public health reporting.\nNegative: No acute infection; symptoms due to other causes.",
      },
      {
        id: "10.15",
        name: "Brucella IgG",
        value: "",
        unit: "",
        normalRange: "<1:80",
        price: "750",
        comment:
          "The Brucella IgG antibody test detects past or chronic infection with Brucella species, the bacteria causing brucellosis. This zoonotic infection is transmitted through contact with infected animals or unpasteurized dairy products. IgG antibodies indicate past exposure, chronic infection, or late-stage disease. This test is essential for diagnosing chronic brucellosis, which can cause persistent symptoms like fever, joint pain, and fatigue. It helps differentiate between acute and chronic infection and monitor treatment response.\n\nInterpretations:\nIgM Positive and IgG Negative: Suggests acute brucellosis, indicating recent infection.\nIgM Negative and IgG Positive: Suggests chronic or past brucellosis, or recovery from earlier infection.\nIgM Positive and IgG Positive: Suggests acute infection with potential chronic exposure; may indicate recent infection in person with prior exposure.\nIgM Negative and IgG Negative: Likely indicates no exposure to Brucella or no immune response yet.",
      },
      {
        id: "10.16",
        name: "Brucella IgM",
        value: "",
        unit: "",
        normalRange: "<1:80",
        price: "750",
        comment:
          "The Brucella IgM antibody test detects recent infection with Brucella species, the bacteria causing brucellosis. This zoonotic infection presents with fever, sweats, joint pain, and fatigue. IgM antibodies appear early in infection and indicate acute disease. This test is crucial for early diagnosis and treatment of brucellosis, preventing chronic complications. It is especially important in endemic areas and in patients with exposure risk (farmers, veterinarians, consumers of unpasteurized dairy).\n\nInterpretations:\nIgM Positive and IgG Negative: Suggests acute brucellosis, indicating recent infection.\nIgM Negative and IgG Positive: Suggests chronic or past brucellosis.\nIgM Positive and IgG Positive: Suggests acute infection with potential chronic exposure.\nIgM Negative and IgG Negative: Likely indicates no exposure to Brucella.",
      },
      {
        id: "10.17",
        name: "TORCH PROFILE",
        value: "",
        unit: "",
        normalRange: "Negative",
        price: "6400",
        comment:
          "TORCH profile screens for a group of infections that can cause congenital anomalies if acquired during pregnancy: Toxoplasmosis, Rubella, CMV, and Herpes Simplex. (The 'O' stands for Other infections like syphilis, parvovirus). This test is used in pregnant women with flu-like symptoms, fetal abnormalities on ultrasound, or in immunocompromised patients. It helps diagnose maternal infections that could affect the fetus, guiding management and intervention.\n\nInterpretations:\nIgM Positive: May indicate recent/active infection; requires further testing and correlation with clinical findings.\nIgG Positive: Indicates past infection and immunity (except for HSV where reactivation is possible).\nInterpretation is complex and often requires paired acute/convalescent testing and IgG avidity to determine timing of infection.",
      },
      {
        id: "10.18",
        name: "Toxo IgG",
        value: "",
        unit: "IU/mL",
        normalRange: "<8.8",
        price: "800",
        comment:
          "Toxoplasma gondii IgG antibodies indicate past infection with the parasite that causes toxoplasmosis. This test is crucial in prenatal care to determine immunity and in immunocompromised patients (HIV, transplant) to assess risk of reactivation. It is also used with IgM to diagnose acute infection. IgG appears 1-2 weeks after infection and persists lifelong, indicating immunity.\n\nInterpretations:\nPositive: Indicates past Toxoplasma infection and immunity. In pregnancy, no risk of congenital transmission (unless immunocompromised).\nNegative: Susceptible to primary infection; requires preventive measures during pregnancy.",
      },
      {
        id: "10.19",
        name: "Toxo IgM",
        value: "",
        unit: "",
        normalRange: "Negative",
        price: "800",
        comment:
          "Toxoplasma gondii IgM antibodies indicate recent or acute infection. This test is essential for diagnosing primary toxoplasmosis in pregnant women (to assess risk of congenital transmission) and in immunocompromised patients. IgM appears early and may persist for months, so positive results require confirmation with IgG avidity testing to determine timing of infection.\n\nInterpretations:\nPositive: Suggests recent infection (within last 12-18 months). In pregnancy, requires further testing (IgG avidity, amniocentesis) to assess fetal risk.\nNegative: No evidence of recent infection, though very early infection may be negative.",
      },
      {
        id: "10.20",
        name: "Rubella IgG",
        value: "",
        unit: "IU/mL",
        normalRange: ">10 (Immune)",
        price: "800",
        comment:
          "Rubella IgG antibodies indicate immunity to rubella (German measles) from past infection or vaccination. This test is essential in prenatal care to determine if a woman is protected against rubella, which can cause severe congenital defects if acquired during pregnancy. It is also used for pre-vaccination screening and to confirm immunity in healthcare workers.\n\nInterpretations:\n>10 IU/mL: Immune - protected against rubella. No risk of congenital rubella syndrome if exposed during pregnancy.\n<10 IU/mL: Non-immune - susceptible to rubella; vaccination recommended (postpartum if pregnant).",
      },
      {
        id: "10.21",
        name: "Rubella IgM",
        value: "",
        unit: "",
        normalRange: "Negative",
        price: "800",
        comment:
          "Rubella IgM antibodies indicate recent rubella infection or recent vaccination. This test is used to diagnose acute rubella, especially in pregnant women with rash or exposure. Rubella infection in early pregnancy carries high risk of congenital rubella syndrome (deafness, heart defects, cataracts). IgM appears within days of rash and persists for several weeks.\n\nInterpretations:\nPositive: Indicates recent rubella infection (or recent vaccination). In pregnancy, requires counseling regarding fetal risk.\nNegative: No evidence of recent infection.",
      },
      {
        id: "10.22",
        name: "CMV IgG",
        value: "",
        unit: "IU/mL",
        normalRange: ">0.5 (Positive)",
        price: "800",
        comment:
          "Cytomegalovirus (CMV) IgG antibodies indicate past infection with CMV, a common herpesvirus. This test is used in prenatal care to determine immunity, in immunocompromised patients (HIV, transplant) to assess risk of reactivation, and in diagnosis of congenital CMV. IgG persists lifelong, indicating past infection and immunity to reinfection (though reactivation can occur).\n\nInterpretations:\nPositive: Indicates past CMV infection and immunity. Risk of congenital CMV is from primary infection in pregnancy, though reactivation can also rarely transmit.\nNegative: Susceptible to primary CMV infection.",
      },
      {
        id: "10.23",
        name: "CMV IgM",
        value: "",
        unit: "",
        normalRange: "Negative",
        price: "800",
        comment:
          "Cytomegalovirus (CMV) IgM antibodies indicate recent or active CMV infection. This test is essential for diagnosing primary CMV infection in pregnant women (risk of congenital infection) and in immunocompromised patients. IgM appears during primary infection but can also be positive during reactivation. Positive results require confirmation and correlation with clinical findings.\n\nInterpretations:\nPositive: Suggests recent primary infection or reactivation. In pregnancy, may require IgG avidity testing to determine timing.\nNegative: No evidence of recent infection.",
      },
      {
        id: "10.24",
        name: "HSV IgG",
        value: "",
        unit: "",
        normalRange: "<0.9",
        price: "800",
        comment:
          "Herpes Simplex Virus (HSV) IgG antibodies indicate past infection with HSV-1 or HSV-2. This test is used to determine HSV status, differentiate between HSV-1 and HSV-2, and assess immunity. It is essential in prenatal care to identify women at risk of transmitting HSV to neonate during delivery. IgG appears weeks after primary infection and persists lifelong.\n\nInterpretations:\nPositive: Indicates past HSV infection. Type-specific testing determines HSV-1 (usually oral) vs HSV-2 (usually genital).\nNegative: No evidence of past infection; susceptible to primary HSV.",
      },
      {
        id: "10.25",
        name: "HSV IgM",
        value: "",
        unit: "",
        normalRange: "Negative",
        price: "800",
        comment:
          "Herpes Simplex Virus (HSV) IgM antibodies indicate recent or primary HSV infection. This test is used to diagnose acute HSV infection, especially in pregnant women with first episode genital herpes (high risk of neonatal transmission). IgM appears during primary infection but may also be positive during reactivation, limiting its specificity.\n\nInterpretations:\nPositive: Suggests recent primary HSV infection, but can also occur with reactivation. Requires correlation with clinical presentation and type-specific IgG.\nNegative: No evidence of recent infection.",
      },
      {
        id: "10.26",
        name: "EBV IgG/IgM",
        value: "",
        unit: "",
        normalRange: "See report",
        price: "4000",
        comment:
          "Epstein-Barr Virus (EBV) antibody panel detects antibodies to various EBV antigens, helping diagnose infectious mononucleosis and determine stage of infection. The panel typically includes Viral Capsid Antigen (VCA) IgG and IgM, Epstein-Barr Nuclear Antigen (EBNA) IgG, and Early Antigen (EA) IgG. This comprehensive testing distinguishes acute, past, and reactivated EBV infection.\n\nInterpretations:\nAcute Infection: VCA IgM positive, VCA IgG positive, EBNA negative.\nPast Infection: VCA IgM negative, VCA IgG positive, EBNA positive.\nReactivation: High VCA IgG, positive EA IgG, variable EBNA.\nNo Infection: All antibodies negative.",
      },
      {
        id: "10.27",
        name: "Mumps IgG/IgM",
        value: "",
        unit: "",
        normalRange: "Negative",
        price: "4000",
        comment:
          "Mumps antibody testing detects immune response to paramyxovirus, which causes mumps (parotitis, orchitis, meningitis). This test is used to diagnose acute mumps infection (IgM) and determine immunity (IgG) from vaccination or past infection. It is essential for outbreak investigation and for evaluating patients with parotitis.\n\nInterpretations:\nIgM Positive: Indicates acute or recent mumps infection.\nIgG Positive: Indicates immunity from vaccination or past infection.\nBoth Negative: Susceptible to mumps infection.",
      },
      {
        id: "10.28",
        name: "Varicella IgG/IgM",
        value: "",
        unit: "",
        normalRange: "Negative",
        price: "6000",
        comment:
          "Varicella-Zoster Virus (VZV) antibody testing detects immune response to the virus causing chickenpox and shingles. This test is used to determine immunity (IgG) in healthcare workers, pregnant women, and immunocompromised patients. It also diagnoses acute varicella (IgM) in atypical cases. IgG indicates protection against chickenpox.\n\nInterpretations:\nIgG Positive: Immune to varicella from past infection or vaccination.\nIgM Positive: Indicates acute varicella infection (chickenpox) or reactivation (zoster).\nBoth Negative: Susceptible to varicella; vaccination recommended.",
      },
      {
        id: "10.29",
        name: "Anti CCP",
        value: "",
        unit: "U/mL",
        normalRange: "<20",
        price: "1500",
        comment:
          "Anti-Cyclic Citrullinated Peptide (Anti-CCP) antibodies are highly specific for rheumatoid arthritis (RA). This test is used with rheumatoid factor to diagnose RA, predict disease severity, and differentiate RA from other forms of arthritis. Anti-CCP appears early in RA and is associated with more aggressive, erosive disease. It may be positive even when rheumatoid factor is negative.\n\nInterpretations:\nPositive (>20 U/mL): Strongly suggests rheumatoid arthritis. High levels correlate with more severe, erosive disease.\nNegative: Does not exclude RA (30% of RA patients are seronegative). May help differentiate from other arthritides.",
      },
      {
        id: "10.30",
        name: "Anti TP",
        value: "",
        unit: "",
        normalRange: "Non-reactive",
        price: "1500",
        comment:
          "Anti-TP (Treponema pallidum) antibody test detects antibodies to the bacterium causing syphilis. This treponemal test confirms syphilis infection after positive screening (RPR/VDRL). It remains positive for life even after successful treatment, distinguishing it from non-treponemal tests that revert to negative. It is used for diagnosis and confirmation of syphilis.\n\nInterpretations:\nReactive/Positive: Indicates current or past syphilis infection. Does not distinguish between active and treated infection.\nNon-reactive/Negative: No evidence of treponemal infection, though early primary syphilis may be negative.",
      },
      {
        id: "10.31",
        name: "Anti Phospholipid IgG",
        value: "",
        unit: "U/mL",
        normalRange: "<20",
        price: "800",
        comment:
          "Antiphospholipid antibodies (IgG) are autoantibodies associated with antiphospholipid syndrome (APS), a condition causing blood clots and pregnancy complications. This test detects IgG antibodies against phospholipid-binding proteins. It is used to diagnose APS in patients with unexplained thrombosis, recurrent miscarriage, or autoimmune diseases like lupus.\n\nInterpretations:\nPositive (>20 U/mL): May indicate APS, especially if persistently positive on repeat testing and with clinical events. Requires correlation with lupus anticoagulant and anticardiolipin antibodies.\nNegative: No evidence of antiphospholipid antibodies.",
      },
      {
        id: "10.32",
        name: "Anti Phospholipid IgM",
        value: "",
        unit: "U/mL",
        normalRange: "<20",
        price: "800",
        comment:
          "Antiphospholipid antibodies (IgM) are autoantibodies associated with antiphospholipid syndrome (APS). This test detects IgM antibodies against phospholipid-binding proteins. IgM antibodies may be transient and less specific than IgG for thrombosis risk. It is used with IgG and lupus anticoagulant to diagnose APS in patients with thrombosis or pregnancy loss.\n\nInterpretations:\nPositive (>20 U/mL): May indicate APS, but IgM is less specific than IgG. Requires persistence on repeat testing and correlation with clinical events.\nNegative: No evidence of IgM antiphospholipid antibodies.",
      },
      {
        id: "10.33",
        name: "Anti Cardiolipin IgG",
        value: "",
        unit: "U/mL",
        normalRange: "<20",
        price: "900",
        comment:
          "Anticardiolipin antibodies (IgG) are a subset of antiphospholipid antibodies targeting cardiolipin, a phospholipid. This test is used to diagnose antiphospholipid syndrome (APS), which causes arterial/venous thrombosis and pregnancy complications. IgG anticardiolipin antibodies are strongly associated with thrombotic risk and are part of the diagnostic criteria for APS.\n\nInterpretations:\nPositive (>20 U/mL): May indicate APS, especially if medium-high positive and persistent. Requires repeat testing after 12 weeks for confirmation.\nNegative: No evidence of anticardiolipin antibodies.",
      },
      {
        id: "10.34",
        name: "Anti Cardiolipin IgM",
        value: "",
        unit: "U/mL",
        normalRange: "<20",
        price: "900",
        comment:
          "Anticardiolipin antibodies (IgM) are autoantibodies targeting cardiolipin, used in diagnosing antiphospholipid syndrome (APS). IgM antibodies may be transient and less strongly associated with thrombosis than IgG. This test is part of the APS diagnostic panel along with IgG and lupus anticoagulant.\n\nInterpretations:\nPositive (>20 U/mL): May indicate APS, but IgM is less specific. Requires persistence and clinical correlation.\nNegative: No evidence of IgM anticardiolipin antibodies.",
      },
      {
        id: "10.35",
        name: "Beta-2 Glycoprotein IgG",
        value: "",
        unit: "U/mL",
        normalRange: "<20",
        price: "3000",
        comment:
          "Beta-2 Glycoprotein I antibodies (IgG) are autoantibodies targeting a phospholipid-binding protein, strongly associated with antiphospholipid syndrome (APS). This test is more specific for APS than anticardiolipin antibodies and is part of the diagnostic criteria. IgG antibodies to beta-2 glycoprotein are associated with thrombosis and pregnancy complications.\n\nInterpretations:\nPositive (>20 U/mL): Strongly suggests APS, especially with thrombosis or pregnancy loss. Requires confirmation with repeat testing.\nNegative: No evidence of beta-2 glycoprotein antibodies.",
      },
      {
        id: "10.36",
        name: "Beta-2 Glycoprotein IgM",
        value: "",
        unit: "U/mL",
        normalRange: "<20",
        price: "3000",
        comment:
          "Beta-2 Glycoprotein I antibodies (IgM) target a phospholipid-binding protein and are used to diagnose antiphospholipid syndrome (APS). IgM antibodies are less common and less strongly associated with thrombosis than IgG, but still part of APS diagnostic criteria. This test is used with other antiphospholipid antibodies in patients with unexplained thrombosis or pregnancy loss.\n\nInterpretations:\nPositive (>20 U/mL): May indicate APS, but requires persistence and clinical correlation.\nNegative: No evidence of IgM beta-2 glycoprotein antibodies.",
      },
      {
        id: "10.37",
        name: "Lupus Anticoagulant",
        value: "",
        unit: "",
        normalRange: "Negative",
        price: "4000",
        comment:
          "Lupus Anticoagulant (LA) is an antiphospholipid antibody that prolongs phospholipid-dependent clotting tests. Despite its name, it is associated with thrombosis, not bleeding. This test is part of the diagnostic criteria for antiphospholipid syndrome and is used in patients with unexplained thrombosis, recurrent miscarriage, or autoimmune disease. LA detection requires specialized coagulation testing with mixing studies and confirmatory tests.\n\nInterpretations:\nPositive: Indicates presence of lupus anticoagulant, strongly associated with thrombosis and pregnancy loss. Requires confirmation after 12 weeks.\nNegative: No evidence of lupus anticoagulant.",
      },
      {
        id: "10.38",
        name: "Immunoglobulin A",
        value: "",
        unit: "mg/dL",
        normalRange: "70–400",
        price: "2000",
        comment:
          "Immunoglobulin A (IgA) is an antibody that protects mucosal surfaces (respiratory, GI, genitourinary). This test measures total IgA levels and is used to diagnose IgA deficiency (most common primary immunodeficiency), monitor multiple myeloma (IgA type), and evaluate immune function in recurrent infections. It is also used in diagnosing IgA nephropathy and other autoimmune conditions.\n\nInterpretations:\nLow IgA: Indicates IgA deficiency, associated with increased infections, autoimmune disease, and transfusion reactions.\nHigh IgA: May indicate IgA multiple myeloma, chronic liver disease, inflammation, or infection.",
      },
      {
        id: "10.39",
        name: "Immunoglobulin M",
        value: "",
        unit: "mg/dL",
        normalRange: "40–230",
        price: "2000",
        comment:
          "Immunoglobulin M (IgM) is the first antibody produced during initial infection and is important for primary immune response. This test measures total IgM levels and is used to diagnose hyper-IgM syndromes, monitor IgM monoclonal gammopathies (Waldenström's macroglobulinemia), and evaluate immune function. Elevated IgM may indicate recent infection or certain lymphoproliferative disorders.\n\nInterpretations:\nHigh IgM: May indicate Waldenström's macroglobulinemia, recent infection, autoimmune disease, or liver disease.\nLow IgM: May indicate immunodeficiency (common variable immunodeficiency) or certain genetic disorders.",
      },
      {
        id: "10.40",
        name: "Immunoglobulin G",
        value: "",
        unit: "mg/dL",
        normalRange: "700–1600",
        price: "2000",
        comment:
          "Immunoglobulin G (IgG) is the most abundant antibody, providing long-term immunity after infection or vaccination. This test measures total IgG levels and is used to diagnose immunodeficiency, monitor IgG monoclonal gammopathies (multiple myeloma), and evaluate immune response. It also helps diagnose autoimmune conditions and chronic infections.\n\nInterpretations:\nHigh IgG: May indicate chronic infection, autoimmune disease, liver disease, or multiple myeloma.\nLow IgG: Indicates immunodeficiency (common variable immunodeficiency, IgG subclass deficiency), increasing infection risk.",
      },
      {
        id: "10.41",
        name: "Total IgE",
        value: "",
        unit: "IU/mL",
        normalRange: "<100",
        price: "1500",
        comment:
          "Immunoglobulin E (IgE) mediates allergic responses and defense against parasites. This test measures total IgE levels and is used to evaluate allergic diseases (asthma, eczema, rhinitis), parasitic infections, and certain immunodeficiency disorders. Elevated IgE suggests atopic predisposition, while very high levels may indicate allergic bronchopulmonary aspergillosis or hyper-IgE syndrome.\n\nInterpretations:\nElevated IgE: Indicates allergic disorders, parasitic infection, or hyper-IgE syndrome. Higher levels correlate with more severe atopy.\nNormal IgE: Does not exclude allergy, as allergies can be organ-specific without systemic IgE elevation.",
      },
      {
        id: "10.42",
        name: "Anti Allergent Specific IgE",
        value: "",
        unit: "kU/L",
        normalRange: "<0.35",
        price: "4000",
        comment:
          "Specific IgE testing measures IgE antibodies against specific allergens (pollens, foods, animal dander, molds). This test is used to identify allergic triggers in patients with asthma, rhinitis, eczema, or anaphylaxis. It provides objective evidence of sensitization and guides allergen avoidance and immunotherapy. Results are reported as classes (0-VI) based on IgE level.\n\nInterpretations:\nClass 0 (<0.35 kU/L): No significant IgE - unlikely allergic.\nClass I-II (0.35-3.49): Low-moderate IgE - possible allergy.\nClass III-VI (>3.5): High IgE - strong evidence of allergy.\nPositive results must correlate with clinical history for diagnosis.",
      },
      {
        id: "10.43",
        name: "CRP Quantitative",
        value: "",
        unit: "mg/dL",
        normalRange: "<0.5",
        price: "1000",
        comment:
          "C-Reactive Protein (CRP) is an acute-phase reactant produced by the liver in response to inflammation. This test measures inflammation levels and is used to diagnose and monitor infections, autoimmune diseases (rheumatoid arthritis, lupus), and tissue injury. High-sensitivity CRP (hs-CRP) is used for cardiovascular risk assessment. CRP rises within hours of inflammation and falls rapidly with resolution.\n\nInterpretations:\n<1 mg/dL: Normal or low inflammation.\n1-10 mg/dL: Moderate inflammation (infection, autoimmune disease, tissue injury).\n>10 mg/dL: Marked inflammation (severe infection, trauma, vasculitis).\nIn cardiovascular risk: <1 mg/L low risk, 1-3 mg/L average risk, >3 mg/L high risk.",
      },
      {
        id: "10.44",
        name: "RA Factor Quantitative",
        value: "",
        unit: "IU/mL",
        normalRange: "<20",
        price: "1000",
        comment:
          "Rheumatoid Factor (RF) is an autoantibody targeting the Fc portion of IgG. It is used to diagnose rheumatoid arthritis (RA) and other autoimmune conditions. RF is positive in 70-80% of RA patients but can also be positive in other diseases (Sjogren's, lupus, hepatitis) and in healthy elderly individuals. Higher titers correlate with more severe, erosive RA.\n\nInterpretations:\nPositive (>20 IU/mL): Suggests rheumatoid arthritis, but not specific. High titers support RA diagnosis with compatible symptoms.\nNegative: Does not exclude RA (seronegative RA). May help differentiate RA from other arthritides.",
      },
      {
        id: "10.45",
        name: "ANA Quantitative",
        value: "",
        unit: "",
        normalRange: "<1:40",
        price: "1500",
        comment:
          "Antinuclear Antibodies (ANA) are autoantibodies against cell nucleus components. This test is the primary screening tool for systemic lupus erythematosus (SLE) and other autoimmune rheumatic diseases. A positive ANA requires further testing for specific antibodies (anti-dsDNA, anti-Smith, etc.) for definitive diagnosis. ANA is reported as titer (dilution) and pattern (homogeneous, speckled, etc.).\n\nInterpretations:\nNegative (<1:40): Effectively rules out SLE (95% sensitive).\nPositive (≥1:40): Indicates possible autoimmune disease, but can occur in healthy individuals (especially at low titers). Higher titers (≥1:160) more significant.\nPatterns provide clues: Homogeneous (anti-dsDNA), Speckled (anti-ENA), Nucleolar (scleroderma).",
      },
      {
        id: "10.46",
        name: "cANCA",
        value: "",
        unit: "",
        normalRange: "<1:20",
        price: "6000",
        comment:
          "cANCA (Cytoplasmic Antineutrophil Cytoplasmic Antibody) targets proteinase-3 (PR3) in neutrophils. This autoantibody is highly specific for granulomatosis with polyangiitis (GPA, formerly Wegener's granulomatosis), a vasculitis affecting respiratory tract and kidneys. cANCA levels correlate with disease activity and help monitor treatment response.\n\nInterpretations:\nPositive: Strongly suggests granulomatosis with polyangiitis (GPA), especially with compatible clinical findings. May also occur in microscopic polyangiitis and Churg-Strauss syndrome.\nNegative: Does not exclude vasculitis; 10-20% of GPA patients are ANCA-negative.",
      },
      {
        id: "10.47",
        name: "pANCA",
        value: "",
        unit: "",
        normalRange: "<1:20",
        price: "3000",
        comment:
          "pANCA (Perinuclear Antineutrophil Cytoplasmic Antibody) most commonly targets myeloperoxidase (MPO). This autoantibody is associated with microscopic polyangiitis, Churg-Strauss syndrome, and some forms of vasculitis. It is also positive in inflammatory bowel disease (especially ulcerative colitis) and autoimmune hepatitis. pANCA helps diagnose and differentiate vasculitic syndromes.\n\nInterpretations:\nPositive: May indicate microscopic polyangiitis, Churg-Strauss syndrome, or drug-induced vasculitis. Also positive in ulcerative colitis and autoimmune hepatitis.\nNegative: Does not exclude these conditions.",
      },
      {
        id: "10.48",
        name: "Anti dsDNA",
        value: "",
        unit: "IU/mL",
        normalRange: "<30",
        price: "4000",
        comment:
          "Anti-double stranded DNA (anti-dsDNA) antibodies are highly specific for systemic lupus erythematosus (SLE) and are included in diagnostic criteria. Levels correlate with disease activity, especially lupus nephritis (kidney involvement). This test is used to diagnose SLE, monitor disease flares, and guide treatment intensity.\n\nInterpretations:\nPositive: Strongly supports SLE diagnosis, especially with high titers. Rising levels may indicate impending flare, particularly renal involvement.\nNegative: Does not exclude SLE (only 60-70% of SLE patients have anti-dsDNA).",
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
          "Alpha-Fetoprotein (AFP) is a tumor marker used primarily for hepatocellular carcinoma (liver cancer) and germ cell tumors (testicular, ovarian). It is also used in prenatal screening for neural tube defects and Down syndrome. In liver disease, rising AFP suggests malignant transformation. Serial monitoring helps assess treatment response and detect recurrence.\n\nInterpretations:\nElevated (>10 ng/mL): May indicate hepatocellular carcinoma (especially >500 ng/mL), germ cell tumors, or liver regeneration (hepatitis, cirrhosis). Mild elevation can occur in benign liver disease.\nVery high (>1000 ng/mL): Strongly suggests hepatocellular carcinoma or germ cell tumor.",
      },
      {
        id: "11.2",
        name: "CEA (Carcinoembryonic Ag)",
        value: "",
        unit: "ng/mL",
        normalRange: "<3",
        price: "2000",
        comment:
          "Carcinoembryonic Antigen (CEA) is a tumor marker used primarily for colorectal cancer, but also elevated in other GI cancers, lung cancer, and breast cancer. It is not diagnostic but used for monitoring treatment response, detecting recurrence, and prognosis. CEA can be elevated in smokers and benign conditions (IBD, pancreatitis, liver disease).\n\nInterpretations:\nElevated: May indicate colorectal, pancreatic, gastric, lung, or breast cancer. Rising levels suggest progression or recurrence.\nNormal: Does not exclude cancer. In known cancer, falling levels indicate treatment response.\nSmokers may have benign elevations up to 5-10 ng/mL.",
      },
      {
        id: "11.3",
        name: "Total PSA",
        value: "",
        unit: "ng/mL",
        normalRange: "<4",
        price: "1000",
        comment:
          "Prostate-Specific Antigen (PSA) is a protein produced by the prostate gland. It is used to screen for prostate cancer, monitor treatment response, and detect recurrence. PSA is prostate-specific but not cancer-specific; it can be elevated in benign prostatic hyperplasia (BPH), prostatitis, and after prostate manipulation. Age-specific ranges improve accuracy.\n\nInterpretations:\n<4 ng/mL: Normal in most men (though some cancers occur below this level).\n4-10 ng/mL: Gray zone; may indicate BPH or cancer. Further testing (free PSA, MRI, biopsy) needed.\n>10 ng/mL: High suspicion of prostate cancer; biopsy usually indicated.\nRising PSA over time (PSA velocity) increases cancer suspicion.",
      },
      {
        id: "11.4",
        name: "Free PSA",
        value: "",
        unit: "ng/mL",
        normalRange: ">25% of total",
        price: "2500",
        comment:
          "Free PSA measures the unbound fraction of PSA, while total PSA measures both bound and free. The free-to-total PSA ratio helps distinguish between benign prostate conditions and prostate cancer when total PSA is in the gray zone (4-10 ng/mL). A low percentage of free PSA suggests higher cancer risk.\n\nInterpretations:\n% free PSA >25%: Low probability of prostate cancer (suggests BPH).\n% free PSA <10%: High probability of prostate cancer.\n% free PSA 10-25%: Intermediate risk; may require additional evaluation.\nThis test is most useful in men with total PSA 4-10 ng/mL and negative DRE.",
      },
      {
        id: "11.5",
        name: "CA 125",
        value: "",
        unit: "U/mL",
        normalRange: "<35",
        price: "2000",
        comment:
          "Cancer Antigen 125 (CA-125) is a tumor marker primarily used for ovarian cancer, but also elevated in endometrial, fallopian tube, and pancreatic cancers. It is used to monitor treatment response and detect recurrence in known ovarian cancer. CA-125 can also be elevated in benign conditions (endometriosis, pregnancy, fibroids, pelvic inflammatory disease, liver disease).\n\nInterpretations:\nElevated: May indicate ovarian cancer, especially in postmenopausal women with pelvic mass. Rising levels suggest progression or recurrence.\nNormal: Does not exclude early-stage ovarian cancer.\nSerial monitoring is more valuable than single values.",
      },
      {
        id: "11.6",
        name: "CA 19-9",
        value: "",
        unit: "U/mL",
        normalRange: "<37",
        price: "2000",
        comment:
          "Cancer Antigen 19-9 (CA 19-9) is a tumor marker primarily used for pancreatic cancer, but also elevated in biliary, gastric, and colorectal cancers. It is used to monitor treatment response and detect recurrence. CA 19-9 can be elevated in benign conditions (pancreatitis, cholangitis, biliary obstruction, cirrhosis). About 5-10% of population are Lewis antigen-negative and cannot produce CA 19-9.\n\nInterpretations:\nElevated: May indicate pancreatic cancer, especially with symptoms and imaging. Rising levels suggest progression.\nVery high (>1000 U/mL): Often indicates advanced/metastatic disease.\nNormal: Does not exclude early pancreatic cancer.",
      },
      {
        id: "11.7",
        name: "CA 15-3",
        value: "",
        unit: "U/mL",
        normalRange: "<30",
        price: "2000",
        comment:
          "Cancer Antigen 15-3 (CA 15-3) is a tumor marker primarily used for breast cancer, particularly metastatic disease. It is not used for screening or early diagnosis but for monitoring treatment response and detecting recurrence in known breast cancer. CA 15-3 can be elevated in other cancers (lung, ovarian, pancreatic) and benign conditions (liver disease, benign breast disease).\n\nInterpretations:\nElevated: May indicate metastatic breast cancer, especially rising levels. Falling levels indicate treatment response.\nNormal: Does not exclude active disease, especially early-stage.\nSerial monitoring during treatment is more informative than single values.",
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
          "Stool Reducing Substances test detects sugars (glucose, lactose, fructose) in stool that are not absorbed by the intestine. This test is primarily used to diagnose carbohydrate malabsorption, especially lactose intolerance in infants and children. Reducing substances appear in stool when disaccharidase deficiency (like lactase deficiency) prevents sugar digestion and absorption.\n\nInterpretations:\nPositive: Indicates carbohydrate malabsorption. In infants, may suggest lactase deficiency, glucose-galactose malabsorption, or other disaccharidase deficiencies.\nNegative: No evidence of carbohydrate malabsorption, though mild cases may be missed.",
      },
      {
        id: "12.2",
        name: "Urine Reducing Substances",
        value: "",
        unit: "",
        normalRange: "Negative",
        price: "100",
        comment:
          "Urine Reducing Substances test detects sugars (glucose, galactose, fructose, pentoses) in urine. This test screens for inborn errors of metabolism (galactosemia, hereditary fructose intolerance) and helps monitor diabetic patients when blood glucose testing is unavailable. It is less specific than glucose oxidase methods for glucose detection.\n\nInterpretations:\nPositive: Indicates presence of reducing sugars. May indicate diabetes (glucose), galactosemia (galactose), or fructose intolerance (fructose). Requires specific sugar identification.\nNegative: No significant reducing substances detected.",
      },
      {
        id: "12.3",
        name: "Urine Ketone Bodies",
        value: "",
        unit: "",
        normalRange: "Negative",
        price: "200",
        comment:
          "Urine Ketones test detects ketone bodies (acetoacetate, acetone) produced during fat metabolism. This test is essential for monitoring diabetic ketoacidosis (DKA), especially in type 1 diabetes. It is also used in fasting, starvation, vomiting, and very low-carbohydrate diets. Ketones appear when insulin deficiency prevents glucose utilization.\n\nInterpretations:\nPositive: Indicates ketosis. In diabetics, suggests DKA (requires immediate medical attention). In non-diabetics, may indicate starvation, vomiting, or high-fat diets.\nNegative: No significant ketosis.",
      },
      {
        id: "12.4",
        name: "Urine Bs, Bp",
        value: "",
        unit: "",
        normalRange: "Negative",
        price: "200",
        comment:
          "Urine Bs, Bp likely refers to urine bile salts and bile pigments (bilirubin). This test screens for liver and biliary tract disease. Bile pigments (bilirubin) appear in urine in hepatocellular or obstructive jaundice. Bile salts may appear in cholestasis. This simple test helps differentiate types of jaundice and monitor liver disease.\n\nInterpretations:\nPositive Bilirubin: Indicates conjugated hyperbilirubinemia (hepatitis, cirrhosis, biliary obstruction).\nPositive Bile Salts: May indicate cholestasis.\nNegative: Normal finding; unconjugated hyperbilirubinemia (hemolysis, Gilbert's) does not cause bilirubinuria.",
      },
      {
        id: "12.5",
        name: "A/C Ratio",
        value: "",
        unit: "",
        normalRange: "<30 mg/g",
        price: "1000",
        comment:
          "Albumin-to-Creatinine Ratio (ACR) measures albumin excretion in urine, corrected for urine concentration using creatinine. This test is the preferred method for detecting and monitoring albuminuria, an early marker of kidney disease, especially in diabetes and hypertension. It is more convenient than 24-hour urine collection.\n\nInterpretations:\n<30 mg/g: Normal to mildly increased (normalbuminuria).\n30-300 mg/g: Moderately increased (microalbuminuria) - indicates early kidney disease.\n>300 mg/g: Severely increased (macroalbuminuria) - indicates established kidney disease.\nPersistent elevation indicates CKD and increased cardiovascular risk.",
      },
      {
        id: "12.6",
        name: "24 Hour Urine CrCl",
        value: "",
        unit: "mL/min",
        normalRange: "90–140",
        price: "1200",
        comment:
          "24-Hour Urine Creatinine Clearance (CrCl) measures how effectively kidneys filter waste (creatinine) from blood. It requires collecting all urine for 24 hours and a blood creatinine sample. This test assesses glomerular filtration rate (GFR), staging chronic kidney disease, and monitoring kidney function in patients with known renal disease.\n\nInterpretations:\n90-140 mL/min: Normal GFR\n60-89 mL/min: Mildly decreased (CKD stage 2)\n30-59 mL/min: Moderately decreased (CKD stage 3)\n15-29 mL/min: Severely decreased (CKD stage 4)\n<15 mL/min: Kidney failure (CKD stage 5)\nResults depend on accurate 24-hour collection.",
      },
      {
        id: "12.7",
        name: "24 Hour Urine Protein",
        value: "",
        unit: "mg/24h",
        normalRange: "<150",
        price: "1000",
        comment:
          "24-Hour Urine Protein quantifies total protein excretion over 24 hours, the gold standard for diagnosing and monitoring proteinuria. This test is essential for evaluating kidney disease, especially glomerulonephritis, nephrotic syndrome, and diabetic nephropathy. It helps assess severity of kidney damage and guide treatment.\n\nInterpretations:\n<150 mg/24h: Normal\n150-500 mg/24h: Mild proteinuria\n500-3000 mg/24h: Moderate proteinuria\n>3000 mg/24h: Nephrotic-range proteinuria, diagnostic of nephrotic syndrome\nHigher levels indicate more severe glomerular damage.",
      },
      {
        id: "12.8",
        name: "24 Hour Urine Albumin",
        value: "",
        unit: "mg/24h",
        normalRange: "<30",
        price: "1800",
        comment:
          "24-Hour Urine Albumin specifically measures albumin excretion, the predominant protein in early kidney disease. This test is more sensitive than total protein for detecting early diabetic nephropathy and other glomerular diseases. It helps diagnose and stage chronic kidney disease, especially in diabetic patients.\n\nInterpretations:\n<30 mg/24h: Normal\n30-300 mg/24h: Microalbuminuria - early kidney disease\n>300 mg/24h: Macroalbuminuria - established kidney disease\nPersistent albuminuria indicates CKD and increased cardiovascular risk.",
      },
      {
        id: "12.9",
        name: "24 Hour Urine Microalbumin",
        value: "",
        unit: "mg/24h",
        normalRange: "<30",
        price: "1800",
        comment:
          "24-Hour Urine Microalbumin measures small amounts of albumin (30-300 mg/24h) not detected by routine urine dipstick. This test is the earliest marker of diabetic nephropathy and is recommended annually for diabetic patients. Early detection allows interventions to slow kidney disease progression.\n\nInterpretations:\n<30 mg/24h: Normal\n30-300 mg/24h: Microalbuminuria - indicates early kidney damage\n>300 mg/24h: Macroalbuminuria - established proteinuria\nTwo of three positive tests over 3-6 months confirm diagnosis.",
      },
      {
        id: "12.10",
        name: "24 Hour Urine Uric Acid",
        value: "",
        unit: "mg/24h",
        normalRange: "250–750",
        price: "1500",
        comment:
          "24-Hour Urine Uric Acid measures uric acid excretion, used to evaluate gout and nephrolithiasis (kidney stones). This test helps classify gout as overproducer or underexcretor of uric acid, guiding treatment selection. It is also used in patients with recurrent uric acid stones to guide prevention.\n\nInterpretations:\n<250 mg/24h: Low excretion (underexcretor) - most common in gout.\n250-750 mg/24h: Normal excretion.\n>750 mg/24h: High excretion (overproducer) - higher risk of uric acid stones; may require allopurinol.",
      },
      {
        id: "12.11",
        name: "24 Hour Urine Urea",
        value: "",
        unit: "g/24h",
        normalRange: "15–30",
        price: "1200",
        comment:
          "24-Hour Urine Urea measures urea nitrogen excretion, reflecting protein intake and catabolism. This test is used to assess nitrogen balance in critically ill patients, evaluate dietary protein intake, and diagnose disorders of protein metabolism. It helps guide nutritional support in malnourished or hypercatabolic patients.\n\nInterpretations:\n<15 g/24h: Low protein intake or catabolism (malnutrition, liver disease).\n15-30 g/24h: Normal protein intake.\n>30 g/24h: High protein intake or catabolism (trauma, infection, steroids).",
      },
      {
        id: "12.12",
        name: "24 Hour Urine Copper",
        value: "",
        unit: "µg/24h",
        normalRange: "<60",
        price: "3500",
        comment:
          "24-Hour Urine Copper measures copper excretion, primarily used to diagnose Wilson's disease, a genetic disorder of copper accumulation. In Wilson's disease, urinary copper is markedly elevated (>100 µg/24h) due to defective copper transport. This test is also used to monitor chelation therapy in Wilson's disease.\n\nInterpretations:\n<60 µg/24h: Normal.\n60-100 µg/24h: Borderline; may require further testing.\n>100 µg/24h: Strongly suggestive of Wilson's disease, especially with low serum ceruloplasmin.\nAlso elevated in primary biliary cholangitis and chronic active hepatitis.",
      },
      {
        id: "12.13",
        name: "24 Hour Urine Oxalate",
        value: "",
        unit: "mg/24h",
        normalRange: "<45",
        price: "3000",
        comment:
          "24-Hour Urine Oxalate measures oxalate excretion, used to evaluate and manage calcium oxalate kidney stones (most common stone type). Hyperoxaluria (high oxalate) promotes stone formation. This test helps identify dietary, enteric (malabsorption), or primary (genetic) hyperoxaluria, guiding prevention strategies.\n\nInterpretations:\n<45 mg/24h: Normal.\n45-60 mg/24h: Mild hyperoxaluria.\n>60 mg/24h: Significant hyperoxaluria, requiring dietary modification (low oxalate diet) and possibly medication.\nVery high levels (>100 mg/24h) suggest primary hyperoxaluria.",
      },
      {
        id: "12.14",
        name: "24 Hour Urine Ca",
        value: "",
        unit: "mg/24h",
        normalRange: "100–300",
        price: "1000",
        comment:
          "24-Hour Urine Calcium measures calcium excretion, used to evaluate kidney stones, hypercalcemia, and bone disorders. It helps diagnose hypercalciuria (high urine calcium), a common cause of calcium kidney stones. This test also helps differentiate types of hyperparathyroidism and monitor patients on calcium or vitamin D supplementation.\n\nInterpretations:\n<100 mg/24h: Low excretion (hypocalciuria) - may indicate hypoparathyroidism or renal failure.\n100-300 mg/24h: Normal.\n>300 mg/24h: High excretion (hypercalciuria) - increases stone risk. May be dietary, absorptive, or renal in origin.",
      },
      {
        id: "12.15",
        name: "24 Hour Urine Mg",
        value: "",
        unit: "mg/24h",
        normalRange: "24–255",
        price: "1200",
        comment:
          "24-Hour Urine Magnesium measures magnesium excretion, used to evaluate magnesium deficiency and kidney magnesium wasting. Low urine magnesium with low blood magnesium suggests inadequate intake or GI loss. High urine magnesium with low blood magnesium suggests renal magnesium wasting (from medications like diuretics, cisplatin, or genetic disorders).\n\nInterpretations:\n24-255 mg/24h: Normal range (wide due to dietary variation).\nLow urine magnesium with low blood magnesium: Extrarenal loss (GI).\nHigh urine magnesium with low blood magnesium: Renal magnesium wasting.\nHigh urine magnesium with normal/high blood magnesium: Excessive intake (supplements).",
      },
      {
        id: "12.16",
        name: "24 Hour Urine Na",
        value: "",
        unit: "mmol/24h",
        normalRange: "40–220",
        price: "1200",
        comment:
          "24-Hour Urine Sodium measures sodium excretion, reflecting dietary salt intake. This test is used to evaluate hypertension (salt sensitivity), assess adherence to low-salt diets, and diagnose disorders of sodium regulation (hyponatremia, hypernatremia). It helps differentiate between causes of hyponatremia and guides diuretic therapy.\n\nInterpretations:\n40-220 mmol/24h: Normal range (corresponds to 2.3-13 g salt/day).\n<40 mmol/24h: Very low sodium intake or salt-retaining states (heart failure, cirrhosis).\n>220 mmol/24h: High sodium intake (>13 g salt/day) - may contribute to hypertension.\nIn hyponatremia, urine sodium helps distinguish volume status.",
      },
      {
        id: "12.17",
        name: "24 Hour Urine Phosphorus",
        value: "",
        unit: "mg/24h",
        normalRange: "400–1300",
        price: "1200",
        comment:
          "24-Hour Urine Phosphorus measures phosphate excretion, used to evaluate kidney stones, bone disorders, and calcium/phosphorus metabolism. It helps diagnose hyperphosphaturia (excessive phosphate loss), which can cause hypophosphatemia and bone disease. This test is also used in patients with recurrent stones and in evaluating hyperparathyroidism.\n\nInterpretations:\n400-1300 mg/24h: Normal (varies with diet).\nLow excretion: May indicate hypoparathyroidism or renal failure.\nHigh excretion: May indicate hyperparathyroidism, vitamin D deficiency, or renal phosphate wasting (Fanconi syndrome, X-linked hypophosphatemia).",
      },
      {
        id: "12.18",
        name: "Bence Jones Protein",
        value: "",
        unit: "",
        normalRange: "Negative",
        price: "1200",
        comment:
          "Bence Jones Protein test detects free monoclonal light chains (kappa or lambda) in urine, which are diagnostic for multiple myeloma and other plasma cell dyscrasias. These light chains precipitate when urine is heated. This test is used for diagnosis, monitoring treatment response, and detecting recurrence in myeloma patients. It is more sensitive when combined with serum free light chain assay.\n\nInterpretations:\nPositive: Indicates monoclonal light chains, diagnostic of multiple myeloma, Waldenström's macroglobulinemia, or AL amyloidosis.\nNegative: Does not exclude myeloma, as some patients produce only intact immunoglobulins.\nQuantification helps monitor disease activity.",
      },
      {
        id: "12.19",
        name: "Urine Multi Drug Test",
        value: "",
        unit: "",
        normalRange: "Negative",
        price: "1200",
        comment:
          "Urine Multi-Drug Test screens for common drugs of abuse, including amphetamines, cocaine, opiates, marijuana (THC), benzodiazepines, and barbiturates. This test is used in workplace screening, substance abuse treatment monitoring, emergency medicine (altered mental status), and legal/forensic settings. Results are typically qualitative (positive/negative).\n\nInterpretations:\nNegative: No drugs detected above cutoff levels.\nPositive: Drug(s) detected above cutoff; requires confirmation by GC-MS for definitive identification.\nFalse positives can occur with某些 medications; confirmatory testing is essential for medical/legal decisions.",
      },
      {
        id: "12.20",
        name: "Urine Pregnancy Test",
        value: "",
        unit: "",
        normalRange: "Negative",
        price: "100",
        comment:
          "Urine Pregnancy Test detects human chorionic gonadotropin (hCG) in urine, a hormone produced during pregnancy. This rapid, qualitative test is used for early pregnancy detection in clinical settings and at home. It is highly accurate when performed correctly after missed period. hCG appears in urine shortly after implantation.\n\nInterpretations:\nPositive: Indicates pregnancy. Two lines appear (test and control).\nNegative: No pregnancy detected. If period is missed, repeat in one week.\nVery early testing may yield false negative due to low hCG levels.",
      },
      {
        id: "12.21",
        name: "Renal Stone Analysis",
        value: "",
        unit: "",
        normalRange: "See report",
        price: "2000",
        comment:
          "Renal Stone Analysis identifies the chemical composition of kidney stones passed or removed from the urinary tract. This test is essential for determining the cause of stone formation and guiding prevention strategies. Different stone types require different preventive approaches (dietary changes, medications).\n\nInterpretations:\nCalcium Oxalate/Phosphate: Most common (80%). Associated with hypercalciuria, hyperoxaluria, and dietary factors.\nUric Acid: Associated with gout, high purine diet, and acidic urine.\nStruvite (Magnesium Ammonium Phosphate): Infection-related (urease-producing bacteria).\nCystine: Indicates cystinuria (genetic disorder).\nComposition guides specific prevention strategies.",
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
          "Small Biopsy histopathology examines tissue samples from endoscopic procedures (gastric, colonic, bronchial) or small skin lesions. A pathologist examines the tissue microscopically to diagnose benign vs. malignant conditions, inflammation, infection, or other pathologies. This test is essential for definitive diagnosis of many cancers and inflammatory diseases.\n\nInterpretations:\nResults include diagnosis (specific lesion), grade (if malignant), margin status (if applicable), and additional findings. Examples: 'Adenocarcinoma, moderately differentiated' or 'Chronic gastritis, H. pylori positive'.\nNormal: 'Benign tissue with no significant pathology'.",
      },
      {
        id: "13.2",
        name: "Medium Biopsy",
        value: "",
        unit: "",
        normalRange: "See report",
        price: "3000",
        comment:
          "Medium Biopsy histopathology examines larger tissue samples from surgical procedures or core needle biopsies (breast, liver, prostate). This test provides detailed diagnosis, including tumor type, grade, invasion status, and biomarker status (ER/PR, HER2 in breast cancer). It guides treatment decisions and prognosis.\n\nInterpretations:\nComprehensive report includes diagnosis, tumor characteristics, grade, stage (if applicable), margin status, and special stains. Examples: 'Invasive ductal carcinoma, grade 2, ER+, PR+, HER2-' or 'Cirrhosis with no evidence of malignancy'.",
      },
      {
        id: "13.3",
        name: "Large Biopsy",
        value: "",
        unit: "",
        normalRange: "See report",
        price: "3500",
        comment:
          "Large Biopsy histopathology examines excisional biopsies or surgical resection specimens (whole tumors, organs). This comprehensive examination provides definitive diagnosis, complete staging (tumor size, lymph node involvement, metastasis), margin assessment, and prognostic markers. It is essential for cancer management and treatment planning.\n\nInterpretations:\nDetailed report includes macroscopic description, microscopic findings, diagnosis, grade, stage (pTNM), margin status, lymph node involvement, and special studies. Examples: 'pT2N1M0 colon adenocarcinoma, 4/12 lymph nodes positive' or 'Complete excision of melanoma, Breslow thickness 1.2 mm, Clark level III, margins clear'.",
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
          "Fine Needle Aspiration (FNA) Cytology examines cells aspirated from lumps or masses using a thin needle. This minimally invasive test is used to evaluate thyroid nodules, lymph nodes, breast lumps, salivary gland masses, and deep-seated lesions (under imaging guidance). It helps distinguish benign from malignant lesions, often avoiding surgical biopsy.\n\nInterpretations:\nBenign: No malignant cells (e.g., colloid nodule, reactive lymph node).\nMalignant: Malignant cells identified; type specified if possible (e.g., papillary thyroid carcinoma).\nSuspicious/Atypical: Cells worrisome but not diagnostic; may require biopsy.\nNon-diagnostic: Insufficient cells; repeat FNA or biopsy needed.",
      },
      {
        id: "14.2",
        name: "Urine Cytology",
        value: "",
        unit: "",
        normalRange: "Negative for malignant cells",
        price: "2500",
        comment:
          "Urine Cytology examines urine sediment microscopically to detect malignant cells from the urinary tract (bladder, ureters, kidneys). It is primarily used to screen for and monitor bladder cancer, especially in high-risk patients (smokers, chemical workers) and those with hematuria. It is also used to monitor recurrence in treated bladder cancer.\n\nInterpretations:\nNegative: No malignant cells seen.\nAtypical: Abnormal cells not diagnostic; requires further evaluation.\nSuspicious: Cells suspicious for malignancy.\nPositive: Malignant cells identified; type specified (usually transitional cell carcinoma).\nHigh-grade tumors are more readily detected than low-grade.",
      },
      {
        id: "14.3",
        name: "Fecal Cytology",
        value: "",
        unit: "",
        normalRange: "See report",
        price: "2000",
        comment:
          "Fecal Cytology examines stool for malignant cells, primarily used to detect colorectal cancer. While largely replaced by colonoscopy and fecal immunochemical testing (FIT), it may still be used in settings where colonoscopy is unavailable or for research. It detects exfoliated malignant cells from colorectal tumors.\n\nInterpretations:\nNegative: No malignant cells identified.\nPositive: Malignant cells seen; suggests colorectal cancer.\nLimited sensitivity limits routine use; colonoscopy remains gold standard.",
      },
      {
        id: "14.4",
        name: "CSF Cytology",
        value: "",
        unit: "",
        normalRange: "Negative for malignant cells",
        price: "2000",
        comment:
          "Cerebrospinal Fluid (CSF) Cytology examines spinal fluid for malignant cells, primarily to diagnose leptomeningeal carcinomatosis (spread of cancer to brain/spinal cord membranes). It is used in patients with known cancers (breast, lung, melanoma, leukemia/lymphoma) who develop neurological symptoms. Multiple samples may be needed for higher sensitivity.\n\nInterpretations:\nNegative: No malignant cells seen.\nPositive: Malignant cells identified; type specified if possible.\nAtypical cells may require correlation with clinical and imaging findings.\nHigh specificity but limited sensitivity (requires adequate cellularity).",
      },
      {
        id: "14.5",
        name: "Bronchial Wash Cytology",
        value: "",
        unit: "",
        normalRange: "See report",
        price: "1500",
        comment:
          "Bronchial Wash Cytology examines cells obtained by washing the bronchial tree during bronchoscopy. This test is used to diagnose lung cancer, especially central tumors, and detect infections (fungal, viral, parasitic). It is less invasive than biopsy and can sample larger airway areas.\n\nInterpretations:\nNegative: No malignant cells; normal respiratory cells.\nPositive: Malignant cells identified; type specified (squamous cell, adenocarcinoma, small cell).\nAtypical/Suspicious: Requires correlation with biopsy.\nInfectious organisms may also be identified (Pneumocystis, fungi).",
      },
      {
        id: "14.6",
        name: "Fluid Cytology",
        value: "",
        unit: "",
        normalRange: "See report",
        price: "2000",
        comment:
          "Fluid Cytology examines body fluids (pleural, peritoneal, pericardial) for malignant cells. This test is essential for diagnosing malignant effusions (fluid accumulation due to cancer spread) and staging cancers. It helps identify the primary tumor type and guides treatment. Common in lung, breast, ovarian, and GI cancers.\n\nInterpretations:\nNegative: No malignant cells; reactive mesothelial cells may be seen.\nPositive: Malignant cells identified; type and possible primary suggested (e.g., adenocarcinoma consistent with lung primary).\nAtypical cells require correlation with clinical and imaging findings.",
      },
      {
        id: "14.7",
        name: "Pap Smear",
        value: "",
        unit: "",
        normalRange: "Negative for intraepithelial lesion",
        price: "2000",
        comment:
          "Papanicolaou (Pap) smear screens for cervical cancer and precancerous lesions by examining cells scraped from the cervix. This test has dramatically reduced cervical cancer incidence and mortality. It detects HPV-related cellular changes (dysplasia) before cancer develops. It is often combined with HPV testing.\n\nInterpretations:\nNegative: No abnormal cells; routine screening.\nASC-US: Atypical squamous cells of undetermined significance - may require HPV testing.\nLSIL: Low-grade squamous intraepithelial lesion - mild dysplasia; often HPV-related.\nHSIL: High-grade squamous intraepithelial lesion - moderate/severe dysplasia; requires colposcopy.\nAGC: Atypical glandular cells - may indicate endometrial or endocervical pathology.",
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
          "Acid-Fast Bacilli (AFB) culture detects Mycobacterium tuberculosis and other mycobacteria (M. avium, M. kansasii). This test is the gold standard for diagnosing tuberculosis and other mycobacterial infections. It is more sensitive than AFB smear and allows species identification and drug susceptibility testing. Culture takes 2-8 weeks due to slow mycobacterial growth.\n\nInterpretations:\nNo growth: Negative after 8 weeks; no mycobacterial infection.\nPositive: Mycobacteria isolated; species identification and susceptibility testing performed.\nContaminated: Non-mycobacterial overgrowth; repeat culture needed.",
      },
      {
        id: "15.2",
        name: "Tissue Culture and Sensitivity",
        value: "",
        unit: "",
        normalRange: "No growth",
        price: "2500",
        comment:
          "Tissue Culture and Sensitivity identifies bacterial, fungal, or mycobacterial pathogens from tissue biopsies. This test is essential for diagnosing deep-seated infections (abscesses, osteomyelitis, infected prostheses) when surface cultures are inadequate. It provides definitive identification and antibiotic susceptibility to guide targeted therapy.\n\nInterpretations:\nNo growth: No pathogens isolated after appropriate incubation.\nPositive: Pathogen identified; susceptibility results guide antibiotic selection.\nNormal flora: Expected commensal organisms (depending on site).",
      },
      {
        id: "15.3",
        name: "Bone Marrow Culture and Sensitivity",
        value: "",
        unit: "",
        normalRange: "No growth",
        price: "2500",
        comment:
          "Bone Marrow Culture detects systemic infections that may not be detectable in blood, including typhoid fever, brucellosis, tuberculosis, and fungal infections (histoplasmosis). It is used in patients with fever of unknown origin, suspected disseminated infections, or immunocompromised hosts. Bone marrow has higher sensitivity than blood culture for certain intracellular pathogens.\n\nInterpretations:\nNo growth: No pathogens isolated.\nPositive: Pathogen identified (Salmonella typhi, Brucella, Mycobacterium, fungi).\nFindings guide targeted antimicrobial therapy.",
      },
      {
        id: "15.4",
        name: "H. Pylori Culture and Sensitivity",
        value: "",
        unit: "",
        normalRange: "No growth",
        price: "2000",
        comment:
          "H. pylori culture from gastric biopsy identifies Helicobacter pylori infection and determines antibiotic susceptibility. This test is used when empiric treatment fails (clarithromycin resistance suspected) or in regions with high antibiotic resistance. Culture allows targeted therapy, improving eradication rates and preventing further resistance.\n\nInterpretations:\nNo growth: No H. pylori isolated (though false negatives occur).\nPositive: H. pylori identified; susceptibility results guide antibiotic selection.\nResistance to clarithromycin, metronidazole, or levofloxacin is increasingly common.",
      },
      {
        id: "15.5",
        name: "Blood Culture and Sensitivity",
        value: "",
        unit: "",
        normalRange: "No growth",
        price: "1500",
        comment:
          "Blood Culture detects bacteria (bacteremia) or fungi (fungemia) in the bloodstream, a life-threatening condition requiring immediate treatment. This test is essential for diagnosing sepsis, endocarditis, and bloodstream infections. Multiple sets from different sites improve sensitivity. Positive cultures identify the pathogen and provide antibiotic susceptibility to guide therapy.\n\nInterpretations:\nNo growth: No pathogens detected after 5 days (negative).\nPositive: Pathogen identified; susceptibility results guide antibiotic selection.\nContaminants (skin flora like coagulase-negative staphylococci) may occur; clinical correlation needed.",
      },
      {
        id: "15.6",
        name: "Urine Culture and Sensitivity",
        value: "",
        unit: "CFU/mL",
        normalRange: "<10,000",
        price: "1200",
        comment:
          "Urine Culture and Sensitivity diagnoses urinary tract infections (UTIs) by quantifying bacteria and identifying pathogens. It is used in patients with UTI symptoms, recurrent infections, pregnancy, or treatment failure. Significant bacteriuria (>100,000 CFU/mL) indicates infection. Susceptibility testing guides antibiotic selection, especially important with rising antibiotic resistance.\n\nInterpretations:\n<10,000 CFU/mL: Negative; no significant growth.\n10,000-100,000 CFU/mL: Mixed growth or contamination; may require repeat if symptomatic.\n>100,000 CFU/mL: Positive for UTI; pathogen identified; susceptibility results provided.\nCommon pathogens: E. coli, Klebsiella, Proteus, Enterococcus.",
      },
      {
        id: "15.7",
        name: "Stool Culture and Sensitivity",
        value: "",
        unit: "",
        normalRange: "No pathogens",
        price: "1200",
        comment:
          "Stool Culture identifies bacterial pathogens causing gastroenteritis (Salmonella, Shigella, Campylobacter, E. coli O157, Yersinia). This test is used in patients with severe or bloody diarrhea, recent travel, immunocompromised status, or outbreak investigation. It helps guide specific antibiotic therapy and public health interventions.\n\nInterpretations:\nNo pathogens: Normal fecal flora; no enteric pathogens isolated.\nPositive: Pathogen identified; susceptibility testing performed if indicated.\nNormal flora includes E. coli, Enterococcus, Bacteroides; pathogens are reported specifically.",
      },
      {
        id: "15.8",
        name: "Semen Culture and Sensitivity",
        value: "",
        unit: "",
        normalRange: "No growth",
        price: "1200",
        comment:
          "Semen Culture detects bacterial infections in seminal fluid, which can cause male infertility, prostatitis, or epididymitis. It is used in men with genitourinary symptoms, abnormal semen analysis, or suspected sexually transmitted infections. Significant growth indicates infection requiring antibiotic treatment.\n\nInterpretations:\nNo growth: No pathogens isolated.\nPositive: Pathogen identified (E. coli, Enterococcus, Staphylococcus, Neisseria gonorrhoeae); susceptibility results guide treatment.\nContamination with skin flora may occur.",
      },
      {
        id: "15.9",
        name: "Vaginal Culture and Sensitivity",
        value: "",
        unit: "",
        normalRange: "Normal flora",
        price: "1200",
        comment:
          "Vaginal Culture identifies pathogens causing vaginitis, pelvic inflammatory disease, or pregnancy complications. It detects bacteria (Group B Streptococcus, Staphylococcus, E. coli), yeast (Candida), and sexually transmitted infections (Neisseria gonorrhoeae). Susceptibility testing guides treatment. Group B Strep screening in pregnancy prevents neonatal infection.\n\nInterpretations:\nNormal flora: Lactobacillus species predominant; no pathogens.\nPositive: Pathogen identified (Group B Strep, Candida, Gardnerella, N. gonorrhoeae); susceptibility provided if relevant.\nMixed growth may indicate bacterial vaginosis.",
      },
      {
        id: "15.10",
        name: "Throat Culture and Sensitivity",
        value: "",
        unit: "",
        normalRange: "Normal flora",
        price: "1200",
        comment:
          "Throat Culture primarily detects Group A Streptococcus (S. pyogenes), the cause of strep throat. It is used in patients with sore throat, fever, and risk of rheumatic fever complications. Though rapid antigen tests are faster, culture remains gold standard for confirmation and detects other pathogens (Corynebacterium diphtheriae, Neisseria gonorrhoeae).\n\nInterpretations:\nNormal flora: Mixed respiratory flora; no pathogens.\nPositive: Group A Streptococcus identified (or other pathogen); susceptibility testing if needed.\nCarrier state may occur (positive without symptoms).",
      },
      {
        id: "15.11",
        name: "Wound /Pus Swab Culture and Sensitivity",
        value: "",
        unit: "",
        normalRange: "No growth",
        price: "1200",
        comment:
          "Wound/Pus Swab Culture identifies bacteria infecting wounds, abscesses, or surgical sites. This test guides antibiotic therapy for infected wounds, diabetic foot ulcers, pressure ulcers, and post-surgical infections. It detects aerobic and anaerobic bacteria, providing susceptibility results for targeted treatment.\n\nInterpretations:\nNo growth: No pathogens isolated (though anaerobes may not grow without special handling).\nPositive: Pathogen(s) identified (Staphylococcus aureus, Pseudomonas, E. coli, anaerobes); susceptibility results guide treatment.\nPolymicrobial infections common in diabetic and pressure ulcers.",
      },
      {
        id: "15.12",
        name: "CSF Culture and Sensitivity",
        value: "",
        unit: "",
        normalRange: "No growth",
        price: "1200",
        comment:
          "Cerebrospinal Fluid (CSF) Culture detects bacteria, fungi, or mycobacteria causing meningitis or encephalitis. This test is critical in patients with fever, headache, neck stiffness, and altered mental status. Rapid diagnosis and treatment are essential to prevent neurological damage and death. Positive cultures identify the pathogen and guide antibiotic selection.\n\nInterpretations:\nNo growth: No pathogens isolated after appropriate incubation.\nPositive: Pathogen identified (S. pneumoniae, N. meningitidis, H. influenzae, Listeria, fungi); susceptibility testing performed.\nContamination is rare but possible with skin flora.",
      },
      {
        id: "15.13",
        name: "Pleural Fluid Culture and Sensitivity",
        value: "",
        unit: "",
        normalRange: "No growth",
        price: "1200",
        comment:
          "Pleural Fluid Culture identifies pathogens causing empyema (infected pleural effusion) or parapneumonic effusions. This test is used in patients with pneumonia complicated by pleural effusion, chest trauma, or post-surgical infections. Positive culture guides antibiotic therapy and may indicate need for drainage.\n\nInterpretations:\nNo growth: No pathogens isolated (may occur with prior antibiotics).\nPositive: Pathogen identified (Streptococcus, Staphylococcus, anaerobes, TB); susceptibility testing performed.\nSterile empyema may occur with prior antibiotic treatment.",
      },
      {
        id: "15.14",
        name: "Peritoneal Fluid Culture and Sensitivity",
        value: "",
        unit: "",
        normalRange: "No growth",
        price: "1200",
        comment:
          "Peritoneal Fluid Culture detects bacterial peritonitis, including spontaneous bacterial peritonitis (SBP) in cirrhotic patients and secondary peritonitis from bowel perforation. This test is essential in patients with ascites, abdominal pain, and fever. Positive cultures guide antibiotic selection and may indicate need for surgical intervention.\n\nInterpretations:\nNo growth: No pathogens isolated.\nPositive: Pathogen identified (E. coli, Klebsiella, Streptococcus, anaerobes); susceptibility results guide treatment.\nPolymicrobial infection suggests secondary peritonitis (surgical emergency).",
      },
      {
        id: "15.15",
        name: "Synovial Fluid Culture and Sensitivity",
        value: "",
        unit: "",
        normalRange: "No growth",
        price: "1200",
        comment:
          "Synovial Fluid Culture diagnoses septic arthritis, a medical emergency requiring prompt treatment to prevent joint destruction. This test is used in patients with acute monoarthritis (swollen, painful joint), fever, and risk factors (prosthetic joint, immunosuppression). Positive culture identifies the pathogen and guides antibiotic therapy.\n\nInterpretations:\nNo growth: No pathogens isolated (may occur with prior antibiotics or fastidious organisms).\nPositive: Pathogen identified (S. aureus most common, Streptococci, Gonococcus, Gram-negative rods); susceptibility results guide treatment.\nProsthetic joint infections may require sonication for detection.",
      },
      {
        id: "15.16",
        name: "Ear Swab Culture and Sensitivity",
        value: "",
        unit: "",
        normalRange: "No growth",
        price: "1200",
        comment:
          "Ear Swab Culture identifies pathogens causing otitis externa (swimmer's ear) and chronic suppurative otitis media. This test guides antibiotic therapy in patients with ear discharge, pain, or treatment failure. Common pathogens include Pseudomonas aeruginosa, Staphylococcus aureus, and fungi (Aspergillus, Candida).\n\nInterpretations:\nNo growth: No pathogens isolated.\nPositive: Pathogen identified; susceptibility results guide treatment.\nPolymicrobial infections common in chronic cases.",
      },
      {
        id: "15.17",
        name: "Eye Swab Culture and Sensitivity",
        value: "",
        unit: "",
        normalRange: "No growth",
        price: "1200",
        comment:
          "Eye Swab Culture identifies pathogens causing conjunctivitis, keratitis, endophthalmitis, or neonatal ophthalmia. This test guides antibiotic therapy in severe infections, contact lens-related infections, or treatment failure. Common pathogens include S. aureus, S. pneumoniae, H. influenzae, Pseudomonas, and Neisseria gonorrhoeae.\n\nInterpretations:\nNo growth: No pathogens isolated.\nPositive: Pathogen identified; susceptibility results guide antibiotic selection.\nNormal conjunctival flora may include coagulase-negative staphylococci.",
      },
      {
        id: "15.18",
        name: "Rectal Swab Culture and Sensitivity",
        value: "",
        unit: "",
        normalRange: "Normal flora",
        price: "1200",
        comment:
          "Rectal Swab Culture detects enteric pathogens (Salmonella, Shigella, Campylobacter, E. coli O157) and screens for antibiotic-resistant organisms (VRE, CRE) in hospitalized patients. It is used in diarrheal illness, outbreak investigation, and infection control screening. It may also detect gonorrhea in men who have sex with men.\n\nInterpretations:\nNormal flora: No pathogens isolated.\nPositive: Pathogen identified; susceptibility testing performed.\nResistance screening: Reports presence of VRE, CRE, or MRSA.",
      },
      {
        id: "15.19",
        name: "Uretheral Swab Culture and Sensitivity",
        value: "",
        unit: "",
        normalRange: "No growth",
        price: "1200",
        comment:
          "Urethral Swab Culture diagnoses urethritis caused by sexually transmitted infections (Neisseria gonorrhoeae) and other bacteria. It is used in symptomatic patients (discharge, dysuria) and for partner tracing. Culture allows susceptibility testing for N. gonorrhoeae, important due to emerging antibiotic resistance.\n\nInterpretations:\nNo growth: No pathogens isolated.\nPositive: N. gonorrhoeae or other pathogens identified; susceptibility results guide treatment.\nChlamydia trachomatis requires molecular testing (PCR), not culture.",
      },
      {
        id: "15.20",
        name: "Kidney Fluid Culture and Sensitivity",
        value: "",
        unit: "",
        normalRange: "No growth",
        price: "1200",
        comment:
          "Kidney Fluid Culture (from cysts, nephrostomy, or renal abscess) identifies pathogens causing renal infections, including pyonephrosis, renal abscess, and infected cysts (in polycystic kidney disease). This test guides antibiotic therapy in complicated urinary tract infections and helps prevent sepsis.\n\nInterpretations:\nNo growth: No pathogens isolated.\nPositive: Pathogen identified (E. coli, Klebsiella, Proteus, Enterococcus); susceptibility results guide treatment.\nPolymicrobial infections may occur with enteric organisms.",
      },
      {
        id: "15.21",
        name: "Bronchial Wash Culture",
        value: "",
        unit: "",
        normalRange: "No growth",
        price: "1200",
        comment:
          "Bronchial Wash Culture, obtained during bronchoscopy, identifies pathogens causing pneumonia, bronchitis, or lung abscess. It is used in immunocompromised patients, those with severe or ventilator-associated pneumonia, and when standard sputum cultures are inadequate. It detects bacteria, mycobacteria, and fungi.\n\nInterpretations:\nNo growth: No pathogens isolated.\nPositive: Pathogen identified (S. pneumoniae, H. influenzae, S. aureus, Pseudomonas, mycobacteria, fungi); susceptibility results guide treatment.\nQuantitative cultures help distinguish infection from colonization.",
      },
      {
        id: "15.22",
        name: "Sputum Culture and Sensitivity",
        value: "",
        unit: "",
        normalRange: "Normal flora",
        price: "1200",
        comment:
          "Sputum Culture identifies bacterial pathogens causing lower respiratory tract infections (pneumonia, bronchitis). It is used in patients with productive cough, fever, and chest X-ray abnormalities. Quality is assessed by Gram stain (few squamous cells, many neutrophils). Positive culture guides antibiotic therapy.\n\nInterpretations:\nNormal flora: Mixed oropharyngeal flora; no predominant pathogen.\nPositive: Predominant pathogen identified (S. pneumoniae, H. influenzae, M. catarrhalis, S. aureus); susceptibility results guide treatment.\nPoor quality specimens (many squamous cells) may be rejected.",
      },
      {
        id: "15.23",
        name: "Fungal Culture and Sensitivity",
        value: "",
        unit: "",
        normalRange: "No growth",
        price: "1200",
        comment:
          "Fungal Culture detects pathogenic fungi from various specimens (blood, tissue, respiratory secretions). This test is essential for diagnosing invasive fungal infections in immunocompromised patients (HIV, transplant, chemotherapy). It identifies yeasts (Candida, Cryptococcus) and molds (Aspergillus, Fusarium, endemic fungi like Histoplasma). Susceptibility testing guides antifungal therapy.\n\nInterpretations:\nNo growth: No fungi isolated after appropriate incubation (may take weeks).\nPositive: Fungus identified; susceptibility testing performed for certain organisms.\nContaminants (environmental molds) may occur; clinical correlation needed.",
      },
      {
        id: "15.24",
        name: "Water Culture",
        value: "",
        unit: "",
        normalRange: "No growth",
        price: "1200",
        comment:
          "Water Culture tests water samples for bacterial contamination, particularly coliforms and Pseudomonas. It is used for infection control in healthcare settings (dialysis water, hydrotherapy pools), drinking water safety, and investigating outbreaks. Detection of Pseudomonas or coliforms indicates contamination requiring remediation.\n\nInterpretations:\nNo growth: Water safe for intended use.\nPositive: Coliforms or Pseudomonas detected; indicates contamination.\nQuantitative results guide remediation efforts.",
      },
      {
        id: "15.25",
        name: "Leishman Bodies",
        value: "",
        unit: "",
        normalRange: "Not seen",
        price: "300",
        comment:
          "Leishman Bodies test detects amastigotes of Leishmania parasites in tissue aspirates (spleen, bone marrow, lymph node, skin). This test diagnoses visceral leishmaniasis (kala-azar) and cutaneous leishmaniasis. Microscopic visualization of Leishman-Donovan bodies in macrophages confirms infection. It is essential in endemic regions and travelers returning from endemic areas.\n\nInterpretations:\nNot seen: No amastigotes detected (though may be missed with low parasitemia).\nSeen: Amastigotes identified; confirms leishmaniasis.\nCorrelation with clinical presentation and serology recommended.",
      },
      {
        id: "15.26",
        name: "Gram Stain",
        value: "",
        unit: "",
        normalRange: "No organisms seen",
        price: "300",
        comment:
          "Gram Stain is a rapid, essential test for visualizing bacteria in clinical specimens (sputum, CSF, urine, wounds). It classifies bacteria as Gram-positive (purple) or Gram-negative (pink) and describes morphology (cocci, rods). This test provides immediate guidance for empiric antibiotic therapy while awaiting culture results.\n\nInterpretations:\nNo organisms seen: No bacteria observed.\nGram-positive cocci in clusters: Suggests Staphylococcus.\nGram-positive cocci in chains: Suggests Streptococcus.\nGram-negative rods: Suggests Enterobacteriaceae (E. coli, Klebsiella), Pseudomonas.\nGram-negative diplococci: Suggests Neisseria.\nAlso detects yeast and some parasites.",
      },
      {
        id: "15.27",
        name: "ZN Stain",
        value: "",
        unit: "",
        normalRange: "No AFB seen",
        price: "300",
        comment:
          "Ziehl-Neelsen (ZN) Stain detects acid-fast bacilli (AFB), primarily Mycobacterium tuberculosis, in clinical specimens (sputum, tissue, CSF). This rapid test provides preliminary diagnosis of tuberculosis while awaiting culture (which takes weeks). Positive smear indicates infectiousness and need for isolation and empiric treatment.\n\nInterpretations:\nNo AFB seen: Negative for acid-fast bacilli (though TB not ruled out).\nPositive: Red rods seen; number reported (1+, 2+, 3+) indicating bacterial load.\nSensitivity lower than culture; negative smear does not exclude TB.",
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
          "Hepatitis B Virus (HBV) DNA quantitative PCR measures viral load in patients with chronic hepatitis B. This test is essential for determining need for antiviral treatment, monitoring treatment response, and assessing risk of progression to cirrhosis and liver cancer. Viral load helps distinguish inactive carrier state from active hepatitis requiring therapy.\n\nInterpretations:\nNot detected: No HBV DNA detectable.\nLow level (<2000 IU/mL): Often inactive carrier; lower risk of progression.\nHigh level (>2000 IU/mL): Active viral replication; treatment may be indicated.\nRising levels on treatment suggest resistance or non-adherence.",
      },
      {
        id: "16.2",
        name: "Hepatitis C Quantitative PCR",
        value: "",
        unit: "IU/mL",
        normalRange: "Not detected",
        price: "3500",
        comment:
          "Hepatitis C Virus (HCV) RNA quantitative PCR measures viral load to confirm active infection and guide treatment. After positive HCV antibody, this test determines if infection is current (RNA detected) or resolved (RNA negative). Baseline viral load helps predict treatment response and duration. Undetectable RNA at treatment completion (SVR) indicates cure.\n\nInterpretations:\nNot detected: No HCV RNA; indicates resolved infection or successful treatment.\nDetected: Active HCV infection; level reported in IU/mL.\nTreatment monitoring: Undetectable at 12 or 24 weeks post-treatment = sustained virologic response (cure).",
      },
      {
        id: "16.3",
        name: "HCV Genotyping",
        value: "",
        unit: "",
        normalRange: "See report",
        price: "8000",
        comment:
          "Hepatitis C Virus (HCV) Genotyping identifies the specific genotype (1-6) and subtype of HCV. Genotype determines treatment regimen, duration, and predicts response to therapy. Different genotypes have varying susceptibility to direct-acting antivirals. Genotype 1 is most common in US, genotype 3 harder to treat with older regimens.\n\nInterpretations:\nGenotype 1a, 1b: Most common; requires specific DAA combinations.\nGenotype 2: Generally easier to treat.\nGenotype 3: Associated with faster fibrosis progression; requires specific regimens.\nGenotypes 4,5,6: Less common; treatable with pangenotypic regimens.",
      },
      {
        id: "16.4",
        name: "HDV Detection and Quantification",
        value: "",
        unit: "",
        normalRange: "Not detected",
        price: "6000",
        comment:
          "Hepatitis D Virus (HDV) RNA detection confirms active HDV infection in HBsAg-positive patients. HDV is a defective virus requiring HBV for replication and causes severe, rapidly progressive liver disease. This test is used to diagnose HDV coinfection or superinfection and to monitor response to antiviral therapy (pegylated interferon).\n\nInterpretations:\nNot detected: No HDV RNA; active HDV infection excluded.\nDetected: Confirms active HDV infection; quantification guides treatment decisions.\nLevels monitored during therapy to assess response.",
      },
      {
        id: "16.5",
        name: "HEV Detection and Quantification",
        value: "",
        unit: "",
        normalRange: "Not detected",
        price: "5000",
        comment:
          "Hepatitis E Virus (HEV) RNA detection confirms active HEV infection, particularly in immunocompromised patients who may not mount an antibody response. HEV causes acute hepatitis, chronic infection in transplant recipients, and extrahepatic manifestations (neurological). This test is used when serology is inconclusive or chronic infection suspected.\n\nInterpretations:\nNot detected: No HEV RNA; active infection unlikely.\nDetected: Confirms active HEV infection; quantification may guide management.\nChronic HEV defined by persistent RNA >3 months.",
      },
      {
        id: "16.6",
        name: "HIV Quantitative PCR",
        value: "",
        unit: "copies/mL",
        normalRange: "Not detected",
        price: "6000",
        comment:
          "HIV RNA quantitative PCR (viral load) measures the amount of HIV in blood, essential for managing HIV infection. It is used to diagnose acute HIV (before antibodies develop), guide treatment initiation, monitor antiretroviral therapy effectiveness, and detect treatment failure. Undetectable viral load (<20-50 copies/mL) indicates successful treatment.\n\nInterpretations:\nNot detected: Below limit of detection; indicates effective treatment.\nDetected: Level reported; rising levels indicate treatment failure or non-adherence.\nBaseline viral load predicts disease progression and guides treatment choices.",
      },
      {
        id: "16.7",
        name: "CMV Quantification",
        value: "",
        unit: "IU/mL",
        normalRange: "Not detected",
        price: "8000",
        comment:
          "Cytomegalovirus (CMV) DNA quantification measures viral load in immunocompromised patients (transplant recipients, HIV) at risk for CMV disease. This test is used for preemptive therapy (treating before symptoms develop), diagnosing CMV syndrome (fever, cytopenias), and monitoring treatment response. Rising levels indicate need for antiviral therapy.\n\nInterpretations:\nNot detected: No CMV reactivation.\nLow level (<1000 IU/mL): May indicate low-grade reactivation; monitor closely.\nHigh level (>1000 IU/mL): Significant reactivation; preemptive therapy often indicated.\nFalling levels on treatment indicate response.",
      },
      {
        id: "16.8",
        name: "HSV1/2 Detection and Quantification",
        value: "",
        unit: "",
        normalRange: "Not detected",
        price: "5500",
        comment:
          "HSV-1/2 DNA detection by PCR identifies and quantifies Herpes Simplex Virus in lesions, CSF, blood, or other specimens. This test is gold standard for diagnosing HSV encephalitis (CSF), neonatal herpes, and disseminated infection. It is more sensitive than culture and allows typing (HSV-1 vs HSV-2).\n\nInterpretations:\nNot detected: No HSV DNA; infection unlikely.\nDetected: HSV DNA present; type specified (HSV-1 or HSV-2).\nIn CSF, any detection indicates encephalitis/meningitis.\nQuantification may guide treatment duration.",
      },
      {
        id: "16.9",
        name: "HPV DNA Detection",
        value: "",
        unit: "",
        normalRange: "Not detected",
        price: "5000",
        comment:
          "Human Papillomavirus (HPV) DNA detection identifies high-risk HPV types (16, 18, others) associated with cervical cancer. This test is used with Pap smear for cervical cancer screening in women over 30 and for triage of abnormal Pap results. Persistent high-risk HPV infection is necessary for cervical cancer development.\n\nInterpretations:\nNot detected: No high-risk HPV DNA; low cancer risk; routine screening.\nDetected: High-risk HPV present; type specified (16,18, other). Requires further evaluation (colposcopy) if persistent or with abnormal Pap.\nHPV 16/18 highest risk; other types intermediate risk.",
      },
      {
        id: "16.10",
        name: "EPV Quantification",
        value: "",
        unit: "IU/mL",
        normalRange: "Not detected",
        price: "3500",
        comment:
          "Epstein-Barr Virus (EBV) DNA quantification measures viral load in immunocompromised patients at risk for EBV-related lymphoproliferative disorders (post-transplant). It is also used to diagnose EBV infection in atypical cases and monitor chronic active EBV. Rising levels post-transplant may indicate need for immunosuppression reduction.\n\nInterpretations:\nNot detected: No EBV DNA.\nLow level: May indicate latent infection or low-grade reactivation.\nHigh level: Significant reactivation; in transplant, may predict PTLD.\nFalling levels with treatment indicate response.",
      },
      {
        id: "16.11",
        name: "Genexpert MTB/RIF",
        value: "",
        unit: "",
        normalRange: "Not detected",
        price: "3000",
        comment:
          "GeneXpert MTB/RIF is a rapid PCR test that detects Mycobacterium tuberculosis and rifampin resistance (a marker for MDR-TB) simultaneously within 2 hours. This WHO-endorsed test has revolutionized TB diagnosis, especially in high-burden settings and for extrapulmonary TB. It is more sensitive than smear microscopy and provides rapid resistance information.\n\nInterpretations:\nMTB not detected: No TB DNA; TB unlikely but not excluded.\nMTB detected, RIF resistance not detected: TB confirmed; rifampin susceptible.\nMTB detected, RIF resistance detected: Rifampin-resistant TB (MDR-TB suspected).\nIndeterminate: Test failed; repeat or use alternative method.",
      },
      {
        id: "16.12",
        name: "MTB DNA Detection",
        value: "",
        unit: "",
        normalRange: "Not detected",
        price: "4000",
        comment:
          "Mycobacterium tuberculosis DNA detection by PCR provides rapid diagnosis of tuberculosis from respiratory and extrapulmonary specimens. It is more sensitive than smear microscopy and provides results in hours vs weeks for culture. This test is essential for diagnosing smear-negative TB, extrapulmonary TB, and pediatric TB.\n\nInterpretations:\nNot detected: No MTB DNA; TB not ruled out (may require culture).\nDetected: MTB DNA present; confirms TB infection.\nQuantification may correlate with infectiousness.",
      },
      {
        id: "16.13",
        name: "JAK2 Gen Mutation",
        value: "",
        unit: "",
        normalRange: "Not detected",
        price: "7000",
        comment:
          "JAK2 V617F mutation testing detects the most common mutation in myeloproliferative neoplasms (MPNs). This test is essential for diagnosing polycythemia vera (PV), essential thrombocythemia (ET), and primary myelofibrosis (PMF). JAK2 mutation is present in >95% of PV and 50-60% of ET and PMF.\n\nInterpretations:\nNot detected: No JAK2 mutation; does not exclude MPN (may have CALR or MPL mutation).\nDetected: Confirms MPN diagnosis with compatible clinical findings. In PV, confirms diagnosis; in ET/PMF, helps classify.\nAllele burden may correlate with disease phenotype.",
      },
      {
        id: "16.14",
        name: "Factor V Leiden Mutation Detection",
        value: "",
        unit: "",
        normalRange: "Not detected",
        price: "3500",
        comment:
          "Factor V Leiden mutation testing detects the most common inherited thrombophilia, caused by a mutation (G1691A) that makes factor V resistant to activated protein C. This test is used in patients with unexplained venous thrombosis (especially at young age), recurrent thrombosis, or family history of thrombophilia. It helps guide anticoagulation duration.\n\nInterpretations:\nNot detected: No mutation (wild type).\nHeterozygous: One copy of mutation; moderately increased thrombosis risk.\nHomozygous: Two copies; markedly increased thrombosis risk.\nInheritance is autosomal dominant.",
      },
      {
        id: "16.15",
        name: "Chromosomal Analysis",
        value: "",
        unit: "",
        normalRange: "Normal karyotype",
        price: "8000",
        comment:
          "Chromosomal Analysis (karyotyping) examines chromosome number and structure. This test is used in prenatal diagnosis (amniocentesis, CVS), evaluation of developmental delay/intellectual disability, infertility, recurrent miscarriage, and hematologic malignancies (leukemia). It detects aneuploidies (Down syndrome), translocations, deletions, and duplications.\n\nInterpretations:\n46,XX: Normal female karyotype.\n46,XY: Normal male karyotype.\nAbnormal: Described using International System for Human Cytogenomic Nomenclature (e.g., 47,XY,+21 = Down syndrome; t(9;22) = Philadelphia chromosome in CML).",
      },
      {
        id: "16.16",
        name: "HLA B 27",
        value: "",
        unit: "",
        normalRange: "Negative",
        price: "8000",
        comment:
          "HLA-B27 testing detects the human leukocyte antigen B27, strongly associated with ankylosing spondylitis and other spondyloarthropathies (reactive arthritis, psoriatic arthritis, IBD-related arthritis). This test is used in patients with inflammatory back pain, sacroiliitis, or uveitis to support diagnosis. Positive result increases likelihood but not diagnostic alone.\n\nInterpretations:\nNegative: HLA-B27 not detected; makes ankylosing spondylitis less likely.\nPositive: HLA-B27 detected; supports diagnosis of spondyloarthropathy with compatible clinical findings.\nAbout 8% of healthy Caucasians are positive without disease.",
      },
      {
        id: "16.17",
        name: "HLA 1/2 Donor Tissue Type",
        value: "",
        unit: "",
        normalRange: "See report",
        price: "20000",
        comment:
          "HLA (Human Leukocyte Antigen) typing for donors determines tissue compatibility for organ and stem cell transplantation. Class I (A, B, C) and Class II (DR, DQ, DP) antigens are typed to match donor and recipient, reducing risk of graft rejection and graft-versus-host disease. High-resolution typing improves outcomes.\n\nInterpretations:\nReport lists HLA alleles at each locus (A*02:01, B*07:02, etc.).\nMatch grade: 10/10, 8/8 indicates number of matched alleles.\nBetter matching improves transplant outcomes.",
      },
      {
        id: "16.18",
        name: "HLA 1/2 Recipient Tissue Type",
        value: "",
        unit: "",
        normalRange: "See report",
        price: "20000",
        comment:
          "HLA typing for transplant recipients determines their tissue type to find compatible donors (living or deceased). Matching HLA antigens between recipient and donor reduces rejection risk and improves graft survival. It is essential for kidney, liver, heart, and stem cell transplantation. Typing includes Class I (A, B, C) and Class II (DR, DQ).\n\nInterpretations:\nReport lists recipient's HLA alleles.\nUsed to search donor registries and assess compatibility with potential donors.\nUnacceptable antigens (to which recipient has antibodies) are identified to avoid.",
      },
      {
        id: "16.19",
        name: "Celiac HLA DQ Association",
        value: "",
        unit: "",
        normalRange: "See report",
        price: "1000",
        comment:
          "Celiac HLA DQ testing detects HLA-DQ2 and HLA-DQ8 alleles, which are necessary (but not sufficient) for developing celiac disease. Over 95% of celiac patients carry DQ2 or DQ8. This test has high negative predictive value: absence of DQ2/DQ8 essentially rules out celiac disease. It is used when diagnosis is uncertain (seronegative, already on gluten-free diet) and for screening at-risk relatives.\n\nInterpretations:\nDQ2 and DQ8 negative: Celiac disease extremely unlikely (rules out).\nDQ2 or DQ8 positive: Genetic susceptibility present; does not diagnose celiac (only 3% of positives develop disease).\nRequires serology and biopsy for diagnosis.",
      },
    ],
  },
] as const;

export default labTestCommentTemplates;
