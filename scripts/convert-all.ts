/**
 * Smart MongoDB→Prisma converter for API route files.
 * Handles the specific patterns found in this project.
 * 
 * Usage: npx tsx scripts/convert-all.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const API_DIR = path.resolve(__dirname, '../app/api');

// Map of Mongoose model names to Prisma model names (camelCase)
const MODEL_MAP: Record<string, string> = {
  User: 'user',
  Patient: 'patient',
  Appointment: 'appointment',
  Billing: 'billing',
  Prescription: 'prescription',
  Medicine: 'medicine',
  MedicineStock: 'medicineStock',
  LabTest: 'labTest',
  LabTestTemplate: 'labTestTemplate',
  RadiologyService: 'radiologyService',
  RadiologyTemplate: 'radiologyTemplate',
  RadiologyExam: 'radiologyExam',
  MedicalRecord: 'medicalRecord',
  TestResult: 'testResult',
  PharmacySale: 'pharmacySale',
  Admission: 'admission',
  Session: 'session',
  Payment: 'payment',
  Invoice: 'invoice',
  DischargeCard: 'dischargeCard',
  DailyRecord: 'dailyRecord',
  Expense: 'expense',
  Warehouse: 'warehouse',
  APILog: 'aPILog',
  AppSetting: 'appSetting',
  ServiceDepartment: 'serviceDepartment',
  DiscountRequest: 'discountRequest',
  DailyCashCollection: 'dailyCashCollection',
  CashAtHand: 'cashAtHand',
  DailyExpense: 'dailyExpense',
  CashReconciliation: 'cashReconciliation',
  MarkedTransaction: 'markedTransaction',
  ReceptionExpense: 'receptionExpense',
  AdminExpense: 'adminExpense',
  CashFloat: 'cashFloat',
  CashAudit: 'cashAudit',
  MedicineIssue: 'medicineIssue',
  WarehouseTransfer: 'warehouseTransfer',
  WarehouseBatch: 'warehouseBatch',
};

interface ConversionStats {
  filesProcessed: number;
  filesChanged: number;
}

function convertFile(filePath: string, stats: ConversionStats): void {
  let content = fs.readFileSync(filePath, 'utf-8');
  const original = content;
  
  const usedModels: string[] = [];
  
  // 1. Find which Mongoose models are imported
  for (const [modelName] of Object.entries(MODEL_MAP)) {
    const importRegex = new RegExp(`import\\s+\\{[^}]*?\\b${modelName}\\b[^}]*?\\}\\s+from\\s+["']@\\/lib\\/models\\/[^"']+["']`, 'g');
    if (importRegex.test(content)) {
      usedModels.push(modelName);
    }
  }
  
  // Also check for IUser, IPatient etc.
  const typeImports: string[] = [];
  for (const typeName of ['IUser', 'IPatient', 'IAppointment', 'ISession']) {
    if (new RegExp(`\\b${typeName}\\b`).test(content)) {
      typeImports.push(typeName);
    }
  }
  
  if (usedModels.length === 0 && !content.includes('dbConnect') && !content.includes('@/lib/dbConnect')) {
    return; // No MongoDB patterns found
  }

  // 2. Remove dbConnect import and calls
  content = content.replace(/import dbConnect from ["']@\/lib\/dbConnect["'];?\s*\n?/g, '');
  content = content.replace(/await\s+dbConnect\(\);\s*\n?/g, '');
  content = content.replace(/await\s+ensureUserOptionalUniqueIndexes\(\);\s*\n?/g, '');
  content = content.replace(/import\s*\{\s*ensureUserOptionalUniqueIndexes\s*\}\s*from\s*["']@\/lib\/models\/User["'];?\s*\n?/g, '');
  
  // 3. Remove mongoose import
  content = content.replace(/import\s+\*?\s*mongoose\s+from\s+["']mongoose["'];?\s*\n?/g, '');
  
  // 4. Remove model imports
  for (const modelName of usedModels) {
    const importRegex = new RegExp(`import\\s+\\{[^}]*?\\b${modelName}\\b[^}]*?\\}\\s+from\\s+["']@\\/lib\\/models\\/[^"']+["'];?\\s*\\n?`, 'g');
    content = content.replace(importRegex, '');
  }
  for (const typeName of typeImports) {
    content = content.replace(new RegExp(`\\b${typeName}\\b`, 'g'), 'any');
  }
  
  // 5. Add prisma import
  if (usedModels.length > 0 && !content.includes('from "@/lib/prisma"') && !content.includes("from '@/lib/prisma'")) {
    content = 'import { prisma } from "@/lib/prisma";\n' + content;
  }

  // 6. Convert Mongoose query patterns to Prisma
  // Handle: Model.findOne({ ... })
  for (const [mongoName, prismaName] of Object.entries(MODEL_MAP)) {
    // findOne with object argument
    const findOneRegex = new RegExp(`${mongoName}\\.findOne\\(`, 'g');
    content = content.replace(findOneRegex, `prisma.${prismaName}.findFirst({ where: `);
    
    // findById
    const findByIdRegex = new RegExp(`${mongoName}\\.findById\\(`, 'g');
    content = content.replace(findByIdRegex, `prisma.${prismaName}.findUnique({ where: { id: `);
    
    // find with callback argument
    const findRegex = new RegExp(`${mongoName}\\.find\\(`, 'g');
    content = content.replace(findRegex, `prisma.${prismaName}.findMany({ where: `);
    
    // countDocuments
    const countRegex = new RegExp(`${mongoName}\\.countDocuments\\(`, 'g');
    content = content.replace(countRegex, `prisma.${prismaName}.count({ where: `);
    
    // findByIdAndUpdate
    const updateRegex = new RegExp(`${mongoName}\\.findByIdAndUpdate\\(([^,]+),\\s*`, 'g');
    content = content.replace(updateRegex, `prisma.${prismaName}.update({ where: { id: $1 }, data: `);
    
    // findByIdAndDelete
    const deleteRegex = new RegExp(`${mongoName}\\.findByIdAndDelete\\(`, 'g');
    content = content.replace(deleteRegex, `prisma.${prismaName}.delete({ where: { id: `);
    
    // create: Model.create({...}) → prisma.model.create({ data: {...} })
    const createRegex = new RegExp(`${mongoName}\\.create\\(`, 'g');
    content = content.replace(createRegex, `prisma.${prismaName}.create({ data: `);
    
    // new Model(data) pattern → just data (for create)
    const newModelRegex = new RegExp(`new\\s+${mongoName}\\(`, 'g');
    content = content.replace(newModelRegex, '');
    
    // .save() on model instances
    const modelSaveRegex = new RegExp(`${mongoName}\\.save\\(\\)`, 'g');
    content = content.replace(modelSaveRegex, '');
    
    // updateMany
    const updateManyRegex = new RegExp(`${mongoName}\\.updateMany\\(`, 'g');
    content = content.replace(updateManyRegex, `prisma.${prismaName}.updateMany({ where: `);
    
    // deleteMany
    const deleteManyRegex = new RegExp(`${mongoName}\\.deleteMany\\(`, 'g');
    content = content.replace(deleteManyRegex, `prisma.${prismaName}.deleteMany({ where: `);
    
    // findOneAndUpdate
    const findOneUpdateRegex = new RegExp(`${mongoName}\\.findOneAndUpdate\\(`, 'g');
    content = content.replace(findOneUpdateRegex, `prisma.${prismaName}.update({ where: `);
    
    // findOneAndDelete
    const findOneDeleteRegex = new RegExp(`${mongoName}\\.findOneAndDelete\\(`, 'g');
    content = content.replace(findOneDeleteRegex, `prisma.${prismaName}.delete({ where: `);
    
    // insertMany
    const insertManyRegex = new RegExp(`${mongoName}\\.insertMany\\(`, 'g');
    content = content.replace(insertManyRegex, `prisma.${prismaName}.createMany({ data: `);
  }

  // 7. Remove .lean() calls
  content = content.replace(/\.lean\(\)/g, '');
  
  // 8. Remove .toObject() calls
  content = content.replace(/\.toObject\(\)/g, '');
  
  // 9. Convert .select("...") to Prisma-friendly (remove for now, will be handled manually)
  content = content.replace(/\.select\(["'][^"']*["']\)/g, '');
  
  // 10. Remove .populate() calls 
  content = content.replace(/\.populate\([^)]*\)\s*/g, '');
  
  // 11. Convert _id to id
  content = content.replace(/\._id\b(?!\s*:)/g, '.id');
  content = content.replace(/\b_id\b/g, 'id');
  
  // 12. Convert MongoDB operators
  const opMap: Record<string, string> = {
    '$gte': 'gte', '$lte': 'lte', '$gt': 'gt', '$lt': 'lt',
    '$ne': 'not', '$in': 'in', '$nin': 'notIn',
    '$or': 'OR', '$and': 'AND', '$nor': 'NOT',
    '$exists': 'not', // Special handling below
  };
  
  // Convert $regex patterns
  content = content.replace(/\{\s*\$regex:\s*new\s+RegExp\(`\^\(\.\+\)\$`,\s*"i"\s*\)\s*\}/g, '{ contains: $1 }');
  content = content.replace(/\{\s*\$regex:\s*new\s+RegExp\(([^,]+),\s*"i"\)\s*\}/g, '{ contains: $1, mode: "insensitive" }');
  content = content.replace(/\{\s*\$regex:\s*([^,]+),\s*\$options:\s*"i"\s*\}/g, '{ contains: $1, mode: "insensitive" }');
  content = content.replace(/\{\s*\$regex:\s*([^,]+)\s*\}/g, '{ contains: $1 }');
  content = content.replace(/\{\s*\$regex:\s*([^}]+)\s*\}/g, '{ contains: $1 }');
  
  // Convert remaining operators
  for (const [mongo, prisma] of Object.entries(opMap)) {
    // Match $operator: value patterns inside objects
    const regex = new RegExp(`\\${mongo}:`, 'g');
    content = content.replace(regex, `${prisma}:`);
  }
  
  // Handle $set: { ... } → just { ... }
  content = content.replace(/\$\w+:\s*\{/g, '');
  // Remove trailing double braces from $set removal
  content = content.replace(/}\s*},/g, '},');
  content = content.replace(/}\s*}\s*$/gm, '}');
  
  // 13. Handle new mongoose.Types.ObjectId()
  content = content.replace(/new\s+mongoose\.Types\.ObjectId\(([^)]*)\)/g, '$1');
  content = content.replace(/mongoose\.Types\.ObjectId\.isValid\([^)]+\)/g, 'true');
  
  // 14. Convert .sort() to .orderBy()
  content = content.replace(/\.sort\(\{([^}]+)\}\)/g, (match, args) => {
    return `.orderBy({ ${args.trim()
      .replace(/:\s*1\b/g, ': "asc"')
      .replace(/:\s*-1\b/g, ': "desc"')
    } })`;
  });

  // 15. Fix closing parentheses for Prisma calls
  // findFirst({ where: { ... }) → needs }  → findFirst({ where: { ... } })
  // findMany({ where: { ... }) → needs }
  
  // Remove { new: true } options from update calls
  content = content.replace(/,\s*\{\s*new:\s*true(\s*,\s*[^}]*)?\}\s*\)/g, '})');
  
  // 16. Clean empty data objects
  content = content.replace(/data:\s*\{\s*},/g, 'data: {} },');
  
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf-8');
    stats.filesChanged++;
  }
  stats.filesProcessed++;
}

function walkDir(dir: string): string[] {
  const files: string[] = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...walkDir(fullPath));
      } else if (entry.name === 'route.ts') {
        files.push(fullPath);
      }
    }
  } catch {}
  return files;
}

// Only convert files not already converted
const skipFiles = new Set([
  'auth/login/route.ts',
  'auth/register/route.ts', 
  'auth/logout/route.ts',
  'auth/me/route.ts',
  'auth/refresh/route.ts',
  'auth/reset-password/route.ts',
]);

const files = walkDir(API_DIR).filter(f => {
  const rel = path.relative(API_DIR, f);
  return !skipFiles.has(rel);
});

const stats: ConversionStats = { filesProcessed: 0, filesChanged: 0 };

console.log(`Found ${files.length} files to process...`);

for (const file of files) {
  try {
    convertFile(file, stats);
  } catch (err) {
    console.error(`Error processing ${path.relative(API_DIR, file)}:`, err);
  }
}

console.log(`\nProcessed ${stats.filesProcessed} files, changed ${stats.filesChanged}.`);