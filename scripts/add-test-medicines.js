#!/usr/bin/env node

/**
 * Script to add test medicine data to the database
 * Run with: node scripts/add-test-medicines.js
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import models
const { MedicineStock } = require('./../lib/models/MedicineStock');

async function addTestMedicines() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/taylor');
    console.log('Connected to database');

    // Clear existing test medicines (optional)
    await MedicineStock.deleteMany({ name: { $in: ['Aspirin', 'Paracetamol', 'Ibuprofen', 'Amoxicillin', 'Omeprazole'] } });
    console.log('Cleared existing test medicines');

    // Create test medicines
    const testMedicines = [
      {
        name: 'Aspirin',
        batchNumber: 'ASP-2024-001',
        originalQuantity: 100,
        currentQuantity: 100,
        unitPrice: 25,
        sellingPrice: 50,
        expiryDate: new Date('2026-12-31'),
        supplier: 'PharmaCorp',
        description: 'Acetylsalicylic acid for pain relief'
      },
      {
        name: 'Paracetamol',
        batchNumber: 'PAR-2024-002',
        originalQuantity: 200,
        currentQuantity: 200,
        unitPrice: 15,
        sellingPrice: 30,
        expiryDate: new Date('2027-06-30'),
        supplier: 'MediSupply',
        description: 'Acetaminophen for fever and pain'
      },
      {
        name: 'Ibuprofen',
        batchNumber: 'IBU-2024-003',
        originalQuantity: 150,
        currentQuantity: 150,
        unitPrice: 20,
        sellingPrice: 40,
        expiryDate: new Date('2026-09-30'),
        supplier: 'HealthCorp',
        description: 'NSAID for inflammation and pain'
      },
      {
        name: 'Amoxicillin',
        batchNumber: 'AMOX-2024-004',
        originalQuantity: 80,
        currentQuantity: 80,
        unitPrice: 50,
        sellingPrice: 100,
        expiryDate: new Date('2026-03-31'),
        supplier: 'BioPharma',
        description: 'Antibiotic for bacterial infections'
      },
      {
        name: 'Omeprazole',
        batchNumber: 'OME-2024-005',
        originalQuantity: 120,
        currentQuantity: 120,
        unitPrice: 30,
        sellingPrice: 60,
        expiryDate: new Date('2027-01-31'),
        supplier: 'GastroMed',
        description: 'Proton pump inhibitor for acid reflux'
      }
    ];

    // Insert medicines
    const result = await MedicineStock.insertMany(testMedicines);
    console.log(`Successfully added ${result.length} test medicines:`);
    
    result.forEach(medicine => {
      console.log(`- ${medicine.name} (Batch: ${medicine.batchNumber}, Stock: ${medicine.currentQuantity})`);
    });

    console.log('\nTest medicines are now available for dispensing!');
    console.log('You can search for them by name in the pharmacy interface.');

  } catch (error) {
    console.error('Error adding test medicines:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Database connection closed');
  }
}

// Run the script
addTestMedicines();