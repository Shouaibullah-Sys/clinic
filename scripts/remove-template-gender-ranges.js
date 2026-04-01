// scripts/remove-template-gender-ranges.js
// Removes male/female/child ranges from all LabTestTemplate parameters.

const mongoose = require("mongoose");
require("dotenv").config({ path: ".env.local" });

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI is not set.");
  process.exit(1);
}

async function run() {
  await mongoose.connect(uri);
  const collection = mongoose.connection.collection("labtesttemplates");
  const result = await collection.updateMany(
    {},
    {
      $unset: {
        "parameters.$[].maleRange": "",
        "parameters.$[].femaleRange": "",
        "parameters.$[].childRange": "",
      },
    },
  );
  console.log(
    `Updated ${result.modifiedCount || 0} template documents (gender ranges removed).`,
  );
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Failed to remove gender ranges:", err);
  process.exit(1);
});
