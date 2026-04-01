// scripts/remove-labtest-gender-ranges.js
// Removes male/female/child ranges from LabTest documents (results/specimen/testParameters).

const mongoose = require("mongoose");
require("dotenv").config({ path: ".env.local" });

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI is not set.");
  process.exit(1);
}

async function run() {
  await mongoose.connect(uri);
  const collection = mongoose.connection.collection("labtests");
  const updates = [];

  updates.push(
    await collection.updateMany(
      { "results.parameters": { $exists: true } },
      {
        $unset: {
          "results.parameters.$[].maleRange": "",
          "results.parameters.$[].femaleRange": "",
          "results.parameters.$[].childRange": "",
        },
      },
    ),
  );

  updates.push(
    await collection.updateMany(
      { "specimen.parameters": { $exists: true } },
      {
        $unset: {
          "specimen.parameters.$[].maleRange": "",
          "specimen.parameters.$[].femaleRange": "",
          "specimen.parameters.$[].childRange": "",
        },
      },
    ),
  );

  updates.push(
    await collection.updateMany(
      { testParameters: { $exists: true } },
      {
        $unset: {
          "testParameters.$[].maleRange": "",
          "testParameters.$[].femaleRange": "",
          "testParameters.$[].childRange": "",
        },
      },
    ),
  );

  const modifiedTotal = updates.reduce(
    (sum, res) => sum + (res.modifiedCount || 0),
    0,
  );
  console.log(
    `Updated ${modifiedTotal} lab test documents (gender ranges removed).`,
  );
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Failed to remove gender ranges from lab tests:", err);
  process.exit(1);
});
