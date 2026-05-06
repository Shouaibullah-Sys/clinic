/**
 * Smart Mongoose→Prisma converter.
 * Converts files one at a time with proper syntax handling.
 * Uses Node.js to read/write files with careful string replacements.
 * 
 * Run: npx tsx scripts/convert-smart.ts [filename]
 *   - Without args: converts all route.ts files in app/api
 *   - With filename: converts a single file
 */

import * as fs from 'fs';
import * as path from 'path';

const API_DIR = path.resolve(__dirname, '../app/api');
const LIB_DIR = path.resolve(__dirname, '../lib');

interface ModelInfo {
  importStatement: string;
  prismaName: string;
}

function findModelImports(content: string): ModelInfo[] {
  const models: ModelInfo[] = [];
  const importRegex = /import\s*\{([^}]+)\}\s*from\s*["']@\/lib\/models\/([^"']+)["']/g;
  let match;
  
  while ((match = importRegex.exec(content)) !== null) {
    const imports = match[1].split(',').map(s => s.trim());
    for (const imp of imports) {
      // Skip type-only imports
      if (imp.startsWith('I') && imp[1] === imp[1].toUpperCase()) continue;
      if (imp === 'ensureUserOptionalUniqueIndexes') continue;
      
      const prismaName = MODEL_MAP[imp];
      if (prismaName) {
        models.push({ importStatement: match[0], prismaName });
      }
    }
  }
  
  return models;
}

const MODEL_MAP: Record<string, string> = {
  User: 'user', Patient: 'patient', Appointment: 'appointment',
  Billing: 'billing', Prescription: 'prescription', Medicine: 'medicine',
  MedicineStock: 'medicineStock', LabTest: 'labTest', LabTestTemplate: 'labTestTemplate',
  RadiologyService: 'radiologyService', RadiologyTemplate: 'radiologyTemplate',
  RadiologyExam: 'radiologyExam', MedicalRecord: 'medicalRecord', TestResult: 'testResult',
  PharmacySale: 'pharmacySale', Admission: 'admission', Session: 'session',
  Payment: 'payment', Invoice: 'invoice', DischargeCard: 'dischargeCard',
  DailyRecord: 'dailyRecord', Expense: 'expense', Warehouse: 'warehouse',
  APILog: 'aPILog', AppSetting: 'appSetting', ServiceDepartment: 'serviceDepartment',
  DiscountRequest: 'discountRequest', DailyCashCollection: 'dailyCashCollection',
  CashAtHand: 'cashAtHand', DailyExpense: 'dailyExpense',
  CashReconciliation: 'cashReconciliation', MarkedTransaction: 'markedTransaction',
  ReceptionExpense: 'receptionExpense', AdminExpense: 'adminExpense',
  CashFloat: 'cashFloat', CashAudit: 'cashAudit', MedicineIssue: 'medicineIssue',
  WarehouseTransfer: 'warehouseTransfer', WarehouseBatch: 'warehouseBatch',
  LaboratoryService: 'laboratoryService', EmergencyService: 'emergencyService',
  DentalService: 'dentalService', OPDService: 'oPDService',
  OTService: 'oTService', PharmacyService: 'pharmacyService',
  ImagingService: 'imagingService',
};

function convertFile(filePath: string): boolean {
  let content = fs.readFileSync(filePath, 'utf-8');
  const original = content;

  // Check if this is already converted
  if (content.includes('from "@/lib/prisma"')) return false;

  const models = findModelImports(content);
  const hasDbConnect = content.includes('from "@/lib/dbConnect"');
  const hasMongoose = content.includes('from "mongoose"');

  if (models.length === 0 && !hasDbConnect) return false;

  // ---- STEP 1: Remove old imports ----

  // Remove dbConnect import
  content = content.replace(/import dbConnect from ["']@\/lib\/dbConnect["'];?\s*\n?/g, '');

  // Remove mongoose import (only if not used elsewhere like in types)
  if (hasMongoose) {
    content = content.replace(/import\s+\*?\s*mongoose\s+from\s+["']mongoose["'];?\s*\n?/g, '');
  }

  // Remove model imports and type imports  
  const importLinesToRemove: string[] = [];
  const importRegex = /^import\s*\{[^}]+\}\s*from\s*["']@\/lib\/models\/[^"']+["'];?$/gm;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    importLinesToRemove.push(match[0]);
  }
  // Also remove type-only model imports
  const typeImportRegex = /^import\s+type\s*\{[^}]+\}\s*from\s*["']@\/lib\/models\/[^"']+["'];?$/gm;
  while ((match = typeImportRegex.exec(content)) !== null) {
    importLinesToRemove.push(match[0]);
  }

  for (const line of importLinesToRemove) {
    content = content.replace(line, '');
  }

  // ---- STEP 2: Add prisma import ----
  if (models.length > 0 && !content.includes('from "@/lib/prisma"')) {
    // Find the last import and add after it
    const importLines = content.match(/^import .+;?$/gm);
    if (importLines && importLines.length > 0) {
      const lastImport = importLines[importLines.length - 1];
      const idx = content.lastIndexOf(lastImport);
      content = content.slice(0, idx + lastImport.length) + '\nimport { prisma } from "@/lib/prisma";' + content.slice(idx + lastImport.length);
    } else {
      content = 'import { prisma } from "@/lib/prisma";\n' + content;
    }
  }

  // ---- STEP 3: Remove dbConnect() calls ----
  content = content.replace(/await\s+dbConnect\(\);\s*\n?/g, '');
  content = content.replace(/await\s+ensureUserOptionalUniqueIndexes\(\);\s*\n?/g, '');

  // ---- STEP 4: Convert code patterns ----
  
  // Replace ._id with .id (but not in string literals)
  // Be careful: _id when used as a property (user._id) should become .id
  // But when used as a key name in objects { _id: value }, keep it
  content = content.replace(/(\w+)\._id\b(?!\s*:)/g, '$1.id');
  
  // Remove .lean() calls
  content = content.replace(/\.lean\(\)/g, '');
  
  // Remove .toObject() calls
  content = content.replace(/\.toObject\(\)/g, '');
  
  // Remove .select() chains (these need manual attention but removing them prevents timeout)
  content = content.replace(/\.select\(["'][^"']*["']\)/g, '');
  
  // Remove .populate() calls
  content = content.replace(/\.populate\([^)]*\)/g, '');
  
  // Convert new mongoose.Types.ObjectId() to just the id string
  content = content.replace(/new\s+mongoose\.Types\.ObjectId\(([^)]*)\)/g, '$1');
  content = content.replace(/mongoose\.Types\.ObjectId\.isValid\([^)]+\)/g, 'true');

  // ---- STEP 5: Convert model method calls to Prisma ----
  for (const [mongoName, prismaName] of Object.entries(MODEL_MAP)) {
    const methods: [RegExp, string][] = [
      [new RegExp(`${mongoName}\\.findByIdAndUpdate\\(`, 'g'), `prisma.${prismaName}.update({ where: { id: `],
      [new RegExp(`${mongoName}\\.findByIdAndDelete\\(`, 'g'), `prisma.${prismaName}.delete({ where: { id: `],
      [new RegExp(`${mongoName}\\.findOneAndUpdate\\(`, 'g'), `prisma.${prismaName}.update({ where: `],
      [new RegExp(`${mongoName}\\.findOneAndDelete\\(`, 'g'), `prisma.${prismaName}.delete({ where: `],
      [new RegExp(`${mongoName}\\.findById\\(`, 'g'), `prisma.${prismaName}.findUnique({ where: { id: `],
      [new RegExp(`${mongoName}\\.findOne\\(`, 'g'), `prisma.${prismaName}.findFirst({ where: `],
      [new RegExp(`${mongoName}\\.countDocuments\\(`, 'g'), `prisma.${prismaName}.count({ where: `],
      [new RegExp(`${mongoName}\\.deleteMany\\(`, 'g'), `prisma.${prismaName}.deleteMany({ where: `],
    ];

    // Handle find() with object argument - need to be careful
    // find({...}) -> findMany({where: {...}})
    // But also: find().sort() -> need to handle chains
    content = content.replace(
      new RegExp(`${mongoName}\\.find\\((?!\\))`, 'g'),
      (match) => `prisma.${prismaName}.findMany(`
    );
    // Fix the closing: if findMany has a where, it's fine
    // If it doesn't (find()), it will need fixing

    // create method
    content = content.replace(
      new RegExp(`${mongoName}\\.create\\(`, 'g'),
      `prisma.${prismaName}.create({ data: `
    );
    
    // updateMany  
    content = content.replace(
      new RegExp(`${mongoName}\\.updateMany\\(`, 'g'),
      `prisma.${prismaName}.updateMany({ data: `
    );
    // Note: updateMany needs where and data. The original MongoDB updateMany
    // had { filter }, { update } structure.
    // Prisma updateMany uses { where: ..., data: ... }
    // We'll need to fix this manually
    
    // insertMany
    content = content.replace(
      new RegExp(`${mongoName}\\.insertMany\\(`, 'g'),
      `prisma.${prismaName}.createMany({ data: `
    );
  }

  // ---- STEP 6: Convert sort() to orderBy() ----
  content = content.replace(/\.sort\(\{([^}]+)\}\)/g, (match, args) => {
    return `.orderBy({ ${args.trim()
      .replace(/:\s*1\b/g, ': "asc"')
      .replace(/:\s*-1\b/g, ': "desc"')
    } })`;
  });

  // ---- STEP 7: Convert skip/limit to prisma skip/take ----
  // Prisma uses skip and take, same as MongoDB
  // skip() and limit() are already the same

  // ---- STEP 8: Replace MongoDB query operators ----
  // $regex patterns
  content = content.replace(/\{\s*\$regex:\s*new\s+RegExp\(`\^\(\.\+\)\$`,\s*"i"\s*\)\s*\}/g, '{ contains: $1 }');
  content = content.replace(/\{\s*\$regex:\s*new\s+RegExp\(([^,]+),\s*"i"\)\s*\}/g, '{ contains: $1, mode: "insensitive" }');
  content = content.replace(/\{\s*\$regex:\s*([^,]+),\s*\$options:\s*"i"\s*\}/g, '{ contains: $1, mode: "insensitive" }');
  content = content.replace(/\{\s*\$regex:\s*([^,]+)\s*\}/g, '{ contains: $1 }');
  content = content.replace(/\{\s*\$options:\s*"i"\s*\}/g, '{ mode: "insensitive" }');
  
  // $set: { ... } -> just { ... } (only in update operations)
  content = content.replace(/\{\s*\$set:\s*\{/g, '{');
  // This might leave dangling braces, let's clean up common patterns
  
  // Other operators
  const ops: Record<string, string> = {
    '$gte': 'gte', '$lte': 'lte', '$gt': 'gt', '$lt': 'lt',
    '$ne': 'not', '$in': 'in', '$nin': 'notIn',
    '$or': 'OR', '$and': 'AND', '$nor': 'NOT',
    '$exists': 'not', '$all': 'hasEvery', '$elemMatch': 'some',
  };
  for (const [mongo, prisma_] of Object.entries(ops)) {
    content = content.replace(new RegExp(`\\${mongo}:`, 'g'), `${prisma_}:`);
  }

  // ---- STEP 9: Fix common structural issues ----
  
  // Fix: { new: true } option in update -> remove
  content = content.replace(/,\s*\{\s*new:\s*true(?:\s*,\s*[^}]*)?\}\s*\)/g, '})');
  content = content.replace(/,\s*\{\s*new:\s*true\s*\}/g, '');
  
  // Fix: extra closing from $set removal
  content = content.replace(/}\s*},/g, '},');
  content = content.replace(/}\s*}\s*,\s*{/g, '}, {');
  
  // Fix: model.save() call (after create/update)
  // This pattern: await someVar.save();
  content = content.replace(/await\s+\w+\.save\(\);\s*\n?/g, '');
  // Just .save() at end of line
  content = content.replace(/\.save\(\);/g, ';');
  
  // Fix: trailing commas in object literals (MongoDB allows them, strict TS might not)
  // Remove trailing commas before closing }
  content = content.replace(/,\s*\}/g, '}');
  // But don't break arrays
  content = content.replace(/,\s*\]/g, ']');

  // ---- STEP 10: Clean up ----
  
  // Remove empty lines from removed imports
  content = content.replace(/\n{3,}/g, '\n\n');
  
  // Remove double prisma imports
  const prismaImportLines = content.match(/^import \{ prisma \} from ["']@\/lib\/prisma["'];?$/gm);
  if (prismaImportLines && prismaImportLines.length > 1) {
    content = content.replace(/^import \{ prisma \} from ["']@\/lib\/prisma["'];?\n/gm, '');
    content = 'import { prisma } from "@/lib/prisma";\n' + content;
  }

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf-8');
    return true;
  }
  
  return false;
}

// Process files
const args = process.argv.slice(2);
let filesToProcess: string[];

if (args.length > 0) {
  // Convert specific file
  filesToProcess = args.map(f => path.resolve(process.cwd(), f));
} else {
  // Convert all route.ts files
  function walkDir(dir: string): string[] {
    const files: string[] = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) files.push(...walkDir(fullPath));
      else if (entry.name === 'route.ts') files.push(fullPath);
    }
    return files;
  }
  filesToProcess = walkDir(API_DIR);
}

// Skip already-converted auth files
const skipFiles = ['auth/login/route.ts', 'auth/register/route.ts', 'auth/logout/route.ts', 'auth/me/route.ts', 'auth/refresh/route.ts', 'auth/reset-password/route.ts'];

let converted = 0;
let skipped = 0;

for (const file of filesToProcess) {
  const relPath = path.relative(API_DIR, file);
  if (skipFiles.includes(relPath)) {
    skipped++;
    continue;
  }
  
  try {
    if (convertFile(file)) {
      console.log(`✅ ${relPath}`);
      converted++;
    }
  } catch (err) {
    console.error(`❌ ${relPath}: ${err}`);
  }
}

console.log(`\nDone: ${converted} converted, ${skipped} skipped`);