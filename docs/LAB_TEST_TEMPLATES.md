# Lab Test Templates System

## Overview

The Lab Test Templates system provides a reusable, standardized way to manage laboratory tests. Doctors can order tests using predefined templates, and receptionists can use the same templates for pricing and billing.

## Features

- **Predefined Test Templates**: Common lab tests with standardized parameters, normal ranges, and pricing
- **Flexible Ordering**: Doctors can order tests using templates or custom test names
- **Automatic Parameter Setup**: Templates automatically populate test parameters and normal ranges
- **Price Management**: Receptionists can view and update prices from templates
- **Category Organization**: Tests organized by category (hematology, biochemistry, etc.)
- **Specimen Type Tracking**: Automatic specimen type assignment based on test category

## API Endpoints

### Get All Templates

```
GET /api/laboratory/templates
```

Query Parameters:

- `category` - Filter by category (e.g., hematology, biochemistry)
- `active` - Filter by active status (true/false)
- `search` - Search by test name or code

Example:

```bash
curl -X GET "http://localhost:3000/api/laboratory/templates?category=hematology&active=true"
```

### Get Single Template

```
GET /api/laboratory/templates/:id
```

### Create Template

```
POST /api/laboratory/templates
```

Required Fields:

- `testCode` - Unique test code (e.g., "CBC", "FBS")
- `testName` - Test name (e.g., "Complete Blood Count")
- `category` - Test category
- `turnaroundTime` - Processing time in hours
- `basePrice` - Base price for the test

Optional Fields:

- `description` - Test description
- `specimenType` - Array of specimen types (e.g., ["blood"])
- `containerType` - Array of container types
- `sampleVolume` - Required sample volume
- `fastingRequired` - Whether fasting is required
- `preparationInstructions` - Patient preparation instructions
- `active` - Whether template is active (default: true)
- `parameters` - Array of test parameters

Example:

```json
{
  "testCode": "CBC",
  "testName": "Complete Blood Count (CBC)",
  "category": "hematology",
  "description": "A complete blood count (CBC) is a blood test used to evaluate your overall health",
  "specimenType": ["blood"],
  "containerType": ["EDTA tube"],
  "sampleVolume": "3 mL",
  "fastingRequired": false,
  "preparationInstructions": "No special preparation required",
  "turnaroundTime": 24,
  "basePrice": 500,
  "active": true,
  "parameters": [
    {
      "parameterCode": "HGB",
      "parameterName": "Hemoglobin",
      "unit": "g/dL",
      "normalRange": "12.0-16.0",
      "criticalLow": 7,
      "criticalHigh": 20,
      "maleRange": "13.5-17.5",
      "femaleRange": "12.0-16.0",
      "childRange": "11.5-15.5",
      "methodology": "Automated hematology analyzer"
    }
  ]
}
```

### Update Template

```
PUT /api/laboratory/templates/:id
```

### Delete Template

```
DELETE /api/laboratory/templates/:id
```

## Using Templates in Lab Test Orders

### Doctor's Perspective

Doctors can order lab tests using templates:

```bash
POST /api/doctor/patients/:patientId/lab-tests
```

Request Body (using template):

```json
{
  "appointmentId": "appointment_id",
  "templateId": "template_id",
  "priority": "routine",
  "notes": "Additional notes"
}
```

Request Body (custom test):

```json
{
  "appointmentId": "appointment_id",
  "testName": "Custom Test Name",
  "category": "other",
  "priority": "routine",
  "notes": "Additional notes"
}
```

### Receptionist's Perspective

Receptionists can view templates to get pricing information:

```bash
GET /api/laboratory/templates?active=true
```

## Seeding Templates

To populate the database with common lab test templates, run the seed script:

```bash
npx tsx scripts/seed-lab-test-templates.ts
```

This will:

1. Connect to the database
2. Find an admin user to use as the creator
3. Create or update templates from `data/lab-test-templates.ts`
4. Display a summary of created/updated templates

## Template Categories

Available categories:

- `hematology` - Blood cell analysis
- `biochemistry` - Chemical analysis of blood
- `microbiology` - Bacterial/fungal culture
- `serology` - Antibody detection
- `immunology` - Immune system tests
- `hormonal` - Hormone level analysis
- `urinalysis` - Urine analysis
- `stool_test` - Stool analysis
- `molecular` - DNA/RNA testing
- `imaging` - Imaging studies
- `other` - Other tests

## Specimen Types

Common specimen types:

- `blood` - Blood samples
- `urine` - Urine samples
- `stool` - Stool samples
- `csf` - Cerebrospinal fluid
- `sputum` - Sputum samples
- `tissue` - Tissue samples
- `swab` - Swab samples
- `other` - Other specimen types

## Parameter Structure

Each test parameter includes:

- `parameterCode` - Unique parameter code (e.g., "HGB")
- `parameterName` - Parameter name (e.g., "Hemoglobin")
- `unit` - Unit of measurement (e.g., "g/dL")
- `normalRange` - Normal range string (e.g., "12.0-16.0")
- `criticalLow` - Critical low value (optional)
- `criticalHigh` - Critical high value (optional)
- `maleRange` - Male-specific normal range (optional)
- `femaleRange` - Female-specific normal range (optional)
- `childRange` - Child-specific normal range (optional)
- `methodology` - Testing methodology (optional)

## Benefits

1. **Standardization**: Consistent test names, parameters, and normal ranges
2. **Efficiency**: Quick test ordering with pre-populated data
3. **Accuracy**: Reduced manual entry errors
4. **Pricing**: Centralized price management
5. **Flexibility**: Support for both template-based and custom tests
6. **Scalability**: Easy to add new tests and update existing ones

## Example Workflow

### Doctor Orders Test Using Template

1. Doctor selects a test from the template list
2. System automatically populates:
   - Test name and category
   - Base price
   - Specimen type
   - Test parameters with normal ranges
   - Preparation instructions
3. Doctor adds any additional notes
4. Test is created with all template data

### Receptionist Views Test Price

1. Receptionist searches for test by name or code
2. System displays:
   - Test name and code
   - Base price
   - Category
   - Specimen requirements
   - Fasting requirements
3. Receptionist uses price for billing

## Maintenance

To add or update templates:

1. Edit `data/lab-test-templates.ts`
2. Run the seed script: `npx tsx scripts/seed-lab-test-templates.ts`
3. Or use the API endpoints to create/update templates directly

## Security

- Only lab technicians, doctors, and admins can create/update templates
- Only admins can delete templates
- All authenticated users can view templates
- Template creation requires authentication
