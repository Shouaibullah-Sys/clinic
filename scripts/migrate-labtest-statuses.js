// scripts/migrate-labtest-statuses.js
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function migrateLabTestStatuses() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('Database connected');

    console.log('Starting migration of lab test statuses...');

    // Define LabTest schema for this script
    const LabTest = mongoose.models.LabTest || mongoose.model('LabTest', new mongoose.Schema({
      testId: String,
      appointment: mongoose.Schema.Types.ObjectId,
      patient: mongoose.Schema.Types.ObjectId,
      doctor: mongoose.Schema.Types.ObjectId,
      testName: String,
      category: String,
      description: String,
      price: Number,
      discountedPrice: Number,
      charges: {
        basePrice: Number,
        tax: Number,
        discount: Number,
        otherCharges: Number,
        totalAmount: Number,
        paid: Number,
        due: Number,
        paymentStatus: String,
        paymentMethod: String,
        transactionId: String,
        paymentDate: Date,
        collectedBy: mongoose.Schema.Types.ObjectId,
      },
      status: String,
      priority: String,
      notes: String,
      labReferenceId: String,
      collectionStatus: String,
      collectionDetails: {
        collectionTime: Date,
        collectedBy: mongoose.Schema.Types.ObjectId,
        collectionNotes: String,
        sampleId: String,
        sampleCondition: String,
        sampleConditionNotes: String,
      },
      processingStatus: String,
      processingDetails: {
        processingStartTime: Date,
        processingEndTime: Date,
        processedBy: mongoose.Schema.Types.ObjectId,
        equipmentUsed: String,
        reagentsUsed: [String],
        qualityControl: {
          passed: Boolean,
          notes: String,
          performedBy: mongoose.Schema.Types.ObjectId,
          performedAt: Date,
        },
        processingNotes: String,
      },
      verificationStatus: String,
      verificationDetails: {
        verifiedBy: mongoose.Schema.Types.ObjectId,
        verifiedAt: Date,
        verificationNotes: String,
      },
      paymentVerified: Boolean,
      paymentVerifiedBy: mongoose.Schema.Types.ObjectId,
      paymentVerifiedAt: Date,
      specimen: {
        type: String,
        collectionTime: Date,
        collectedBy: mongoose.Schema.Types.ObjectId,
        quantity: String,
        container: String,
        remarks: String,
      },
      results: {
        parameters: [{
          name: String,
          value: mongoose.Schema.Types.Mixed,
          unit: String,
          normalRange: String,
          flag: String,
          remarks: String,
        }],
        interpretation: String,
        reportedBy: mongoose.Schema.Types.ObjectId,
        reportedAt: Date,
        verifiedBy: mongoose.Schema.Types.ObjectId,
        verifiedAt: Date,
        reportUrl: String,
      },
      orderedBy: mongoose.Schema.Types.ObjectId,
      orderedAt: Date,
      collectedAt: Date,
      completedAt: Date,
      reportedAt: Date,
      cancelledAt: Date,
    }, { timestamps: true }));

    // Fix existing tests with null collectionStatus
    const collectionStatusResult = await LabTest.updateMany(
      {
        $or: [
          { collectionStatus: { $exists: false } },
          { collectionStatus: null },
          { collectionStatus: "" }
        ]
      },
      { $set: { collectionStatus: "pending" } }
    );

    console.log(`Updated collectionStatus for ${collectionStatusResult.modifiedCount} documents`);

    // Also fix other status fields if needed
    const statusResult = await LabTest.updateMany(
      { status: { $exists: false } },
      { $set: { status: "ordered" } }
    );

    console.log(`Updated status for ${statusResult.modifiedCount} documents`);

    const processingStatusResult = await LabTest.updateMany(
      { processingStatus: { $exists: false } },
      { $set: { processingStatus: "pending" } }
    );

    console.log(`Updated processingStatus for ${processingStatusResult.modifiedCount} documents`);

    const verificationStatusResult = await LabTest.updateMany(
      { verificationStatus: { $exists: false } },
      { $set: { verificationStatus: "pending" } }
    );

    console.log(`Updated verificationStatus for ${verificationStatusResult.modifiedCount} documents`);

    console.log('Migration completed successfully!');
    console.log(`Total documents updated: ${
      collectionStatusResult.modifiedCount +
      statusResult.modifiedCount +
      processingStatusResult.modifiedCount +
      verificationStatusResult.modifiedCount
    }`);

    await mongoose.disconnect();
    console.log('Database disconnected');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

migrateLabTestStatuses();