/**
 * Bulk conversion script to migrate all API route files from Mongoose to Prisma.
 * 
 * Run: npx tsx scripts/convert-mongo-to-prisma.ts
 * 
 * This script:
 * 1. Replaces import dbConnect with nothing (Prisma auto-connects)
 * 2. Replaces Mongoose model imports with prisma import
 * 3. Replaces MongoDB query operators with Prisma equivalents:
 *    - $regex / $options "i" -> contains mode: 'insensitive'
 *    - $gte / $lte -> gte / lte  
 *    - $ne -> not
 *    - $in -> in
 *    - User.findOne({ email }) -> prisma.user.findUnique({ where: { email } })
 *    - User.findById(id) -> prisma.user.findUnique({ where: { id } })
 *    - User.find(query) -> prisma.user.findMany({ where: query })
 *    - Model.create(data) -> prisma.model.create({ data })
 *    - model.save() -> prisma.model.update() 
 *    - ._id -> .id
 *    - .lean() -> (removed)
 *    - .toObject() -> (removed)
 *    - .select("...") -> (removed, use prisma select)
 *    - new mongoose.Types.ObjectId() -> (removed, use string directly)
 *    - .populate() -> (removed, use prisma include)
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const API_DIR = path.resolve(__dirname, '../app/api');
const LIB_DIR = path.resolve(__dirname, '../lib');

// Model name mapping: Mongoose model name -> Prisma model name (lowercase)
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
};

function convertFile(filePath: string): boolean {
  let content = fs.readFileSync(filePath, 'utf-8');
  let changed = false;
  const original = content;

  // Find all MongoDB model imports
  const modelImportRegex = /import\s+\{([^}]+)\}\s+from\s+["']@\/lib\/models\/([^"']+)["']/g;
  let match;
  const modelNames: string[] = [];

  while ((match = modelImportRegex.exec(content)) !== null) {
    const imports = match[1].split(',').map(s => s.trim());
    imports.forEach(imp => {
      if (imp !== 'IUser' && imp !== 'IPatient' && !imp.startsWith('I') && !imp.startsWith('ensure')) {
        const prismaName = MODEL_MAP[imp];
        if (prismaName) {
          modelNames.push(imp);
        }
      }
    });
  }

  if (modelNames.length === 0) {
    // Check if using dbConnect without models (unlikely but possible)
    if (content.includes('dbConnect') || content.includes('from "@/lib/dbConnect"')) {
      changed = true;
    } else {
      return false;
    }
  }

  // 1. Remove dbConnect import
  content = content.replace(/import dbConnect from ["']@\/lib\/dbConnect["'];\n?/g, '');
  
  // 2. Remove mongoose import  
  content = content.replace(/import mongoose from ["']mongoose["'];\n?/g, '');
  content = content.replace(/import \* as mongoose from ["']mongoose["'];\n?/g, '');

  // 3. Replace model imports with prisma import
  if (modelNames.length > 0) {
    // Remove all model imports
    modelNames.forEach(name => {
      // Find and remove the import line(s) for this model
      const importRegex = new RegExp(`import\\s+\\{[^}]*?${name}[^}]*?\\}\\s+from\\s+["']@\\/lib\\/models\\/[^"']+["'];?\\n?`, 'g');
      content = content.replace(importRegex, '');
    });
    
    // Also remove IUser, IPatient etc type imports
    content = content.replace(/import\s+\{[^}]*?\bI(User|Patient|Appointment|Session)\b[^}]*?\}\s+from\s+["']@\/lib\/models\/[^"']+["'];?\n?/g, '');
    
    // Remove any remaining model index.ts imports
    content = content.replace(/import\s+.*from\s+["']@\/lib\/models["'];?\n?/g, '');
    content = content.replace(/import\s+.*from\s+["']@\/lib\/models\/index["'];?\n?/g, '');
    
    // Remove ensureUserOptionalUniqueIndexes imports
    content = content.replace(/,\s*ensureUserOptionalUniqueIndexes\s*/g, '');
    content = content.replace(/import\s*\{\s*ensureUserOptionalUniqueIndexes\s*\}\s*from\s*["']@\/lib\/models\/User["'];?\n?/g, '');
    
    // Add prisma import (if not already present)
    if (!content.includes('from "@/lib/prisma"') && !content.includes("from '@/lib/prisma'")) {
      // Find the last import line
      const importLines = content.match(/^import .+;?$/gm);
      if (importLines) {
        const lastImport = importLines[importLines.length - 1];
        const lastImportIndex = content.lastIndexOf(lastImport);
        const insertPos = lastImportIndex + lastImport.length;
        content = content.slice(0, insertPos) + '\nimport { prisma } from "@/lib/prisma";' + content.slice(insertPos);
      } else {
        content = 'import { prisma } from "@/lib/prisma";\n' + content;
      }
    }
    changed = true;
  }

  // 4. Remove dbConnect() calls
  content = content.replace(/await\s+dbConnect\(\);\n?/g, '');
  content = content.replace(/await\s+ensureUserOptionalUniqueIndexes\(\);\n?/g, '');

  // 5. Replace Model.findOne with prisma.model.findFirst
  Object.entries(MODEL_MAP).forEach(([mongoName, prismaName]) => {
    // Model.findOne({ email: something })
    const findOneRegex = new RegExp(
      `${mongoName}\\.findOne\\(\\{([^}]*)\\}\\)`,
      'g'
    );
    content = content.replace(findOneRegex, (match, args) => {
      // Convert MongoDB query operators
      let where = convertQueryOperators(args.trim(), mongoName);
      return `prisma.${prismaName}.findFirst({ where: { ${where} } })`;
    });

    // Model.findById(id)
    const findByIdRegex = new RegExp(`${mongoName}\\.findById\\(([^)]+)\\)`, 'g');
    content = content.replace(findByIdRegex, (match, id) => {
      return `prisma.${prismaName}.findUnique({ where: { id: ${id.trim()} } })`;
    });
    
    // Model.find(query)
    const findRegex = new RegExp(`${mongoName}\\.find\\(`,'g');
    content = content.replace(findRegex, `prisma.${prismaName}.findMany({ where: `);
  });

  // 6. Replace ._id with .id  
  content = content.replace(/\._id\b/g, '.id');
  
  // 7. Remove .lean()
  content = content.replace(/\.lean\(\)/g, '');
  
  // 8. Remove .toObject()
  content = content.replace(/\.toObject\(\)/g, '');
  
  // 9. Remove .select("...") calls - these need manual attention
  // For now, just comment them out
  content = content.replace(/\.select\(["'][^"']*["']\)\s*/g, '');
  
  // 10. Replace new mongoose.Types.ObjectId(id)
  content = content.replace(/new\s+mongoose\.Types\.ObjectId\(([^)]+)\)/g, '$1');
  
  // 11. Remove .populate(...) calls
  content = content.replace(/\.populate\([^)]*\)\s*/g, '');
  
  // 12. Replace Model.create({...}) with prisma.model.create({data:{...}})
  Object.entries(MODEL_MAP).forEach(([mongoName, prismaName]) => {
    const createRegex = new RegExp(`${mongoName}\\.create\\(\\{`, 'g');
    content = content.replace(createRegex, `prisma.${prismaName}.create({ data: {`);
    
    // new Model(data) pattern
    const newModelRegex = new RegExp(`new\\s+${mongoName}\\((\\{[^}]+\\})\\)`, 'g');
    content = content.replace(newModelRegex, (match, data) => {
      return `${data}`;
    });
  });
  
  // 13. Replace model.save()
  Object.entries(MODEL_MAP).forEach(([mongoName, prismaName]) => {
    const saveRegex = new RegExp(`${mongoName}\\.save\\(\\)`, 'g');
    content = content.replace(saveRegex, ''); // Will need manual fix
    
    // When we have: const patient = new Patient(data); await patient.save();
    // This becomes: const patient = await prisma.patient.create({ data });
  });
  
  // 14. Replace Model.countDocuments with prisma.model.count
  Object.entries(MODEL_MAP).forEach(([mongoName, prismaName]) => {
    const countRegex = new RegExp(`${mongoName}\\.countDocuments\\(([^)]*)\\)`, 'g');
    content = content.replace(countRegex, `prisma.${prismaName}.count({ where: $1 })`);
  });

  // 15. Replace Model.findByIdAndUpdate / findByIdAndDelete
  Object.entries(MODEL_MAP).forEach(([mongoName, prismaName]) => {
    // findByIdAndUpdate(id, data, options)
    const updateRegex = new RegExp(`${mongoName}\\.findByIdAndUpdate\\(([^,]+),\s*\\{`, 'g');
    content = content.replace(updateRegex, `prisma.${prismaName}.update({ where: { id: $1 }, data: {`);
    
    // findByIdAndDelete(id)
    const deleteRegex = new RegExp(`${mongoName}\\.findByIdAndDelete\\(([^)]+)\\)`, 'g');
    content = content.replace(deleteRegex, `prisma.${prismaName}.delete({ where: { id: $1 } })`);
  });

  // 16. Replace $regex patterns with Prisma contains
  content = content.replace(/\{\s*\$regex:\s*new RegExp\(`\^\(\.\+\)\$`,\s*"i"\s*\)\s*\}/g, '{ contains: $1 }');
  content = content.replace(/\{\s*\$regex:\s*new RegExp\(([^,]+),\s*"i"\)\s*\}/g, '{ contains: $1, mode: "insensitive" }');
  content = content.replace(/\{\s*\$regex:\s*([^,]+),\s*\$options:\s*"i"\s*\}/g, '{ contains: $1, mode: "insensitive" }');
  content = content.replace(/\{\s*\$regex:\s*([^,]+)\s*\}/g, '{ contains: $1 }');

  // 17. Replace $gte, $lte, $ne, $in, $exists etc
  content = content.replace(/\$gte:/g, 'gte:');
  content = content.replace(/\$lte:/g, 'lte:');
  content = content.replace(/\$gt:/g, 'gt:');
  content = content.replace(/\$lt:/g, 'lt:');
  content = content.replace(/\$ne:/g, 'not:');
  content = content.replace(/\$in:/g, 'in:');
  content = content.replace(/\$nin:/g, 'notIn:');
  content = content.replace(/\$exists:\s*true\b/g, 'not: null');
  content = content.replace(/\$exists:\s*false\b/g, 'equals: null');
  content = content.replace(/\$options:\s*"i"/g, 'mode: "insensitive"');
  content = content.replace(/\$all:/g, 'hasEvery:');
  content = content.replace(/\$or:/g, 'OR:');
  content = content.replace(/\$and:/g, 'AND:');

  // 18. Replace $set: { field: value } with just field: value (for update operations)
  content = content.replace(/\{\s*\$set:\s*\{/g, '{');
  // Close the extra braces that $set introduced
  content = content.replace(/\}\s*\}\s*,\s*\{/g, '}, {');

  // 19. Clean up double braces from $set removal
  content = content.replace(/\$set:\s*\{/g, '');

  // 20. Replace $push: { field: value } with push equivalent
  content = content.replace(/\$push:\s*\{/g, 'push: {');

  // 21. Remove $inc operators (handle separately)
  content = content.replace(/\$inc:\s*\{[^}]+\}/g, '');

  // 22. Replace .sort({ field: 1 }) with .sort({ field: "asc" }) etc
  content = content.replace(/\.sort\(\{([^}]+)\}\)/g, (match, args) => {
    return `.orderBy({ ${args.trim()
      .replace(/: 1\b/g, ': "asc"')
      .replace(/: -1\b/g, ': "desc"')
    } })`;
  });

  // 23. Replace .skip() and .limit() with .skip() .take()
  content = content.replace(/\.skip\(/g, '.skip(');
  
  // 24. Clean up: findMany uses where clause already closed, need to close properly
  // findMany({ where: { ... } }) is fine, but findMany({ where: { ... }, skip, limit }) 
  // needs to be findMany({ where: { ... }, skip: skip, take: limit })

  // Check if any changes were made
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf-8');
    return true;
  }

  return changed;
}

function convertQueryOperators(args: string, modelName: string): string {
  // Simple replacements for common patterns
  let result = args;
  
  // Remove .select("+password") references
  result = result.replace(/\.select\(["'][^"']*["']\)/g, '');
  result = result.replace(/['"]\+password['"]/g, '');
  
  return result;
}

function walkDir(dir: string): string[] {
  const files: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkDir(fullPath));
    } else if (entry.name.endsWith('.ts') && entry.name !== 'route.tsx') {
      files.push(fullPath);
    }
  }
  return files;
}

// Convert all route.ts files
const files = walkDir(API_DIR).filter(f => f.endsWith('route.ts'));
let converted = 0;
let errors = 0;

console.log(`Found ${files.length} route files to convert...`);

for (const file of files) {
  try {
    if (convertFile(file)) {
      console.log(`✅ Converted: ${path.relative(API_DIR, file)}`);
      converted++;
    }
  } catch (err) {
    console.error(`❌ Error converting ${file}:`, err);
    errors++;
  }
}

// Also convert lib files that use models
const libFiles = walkDir(LIB_DIR).filter(f => 
  f.endsWith('.ts') && !f.includes('models/') && !f.includes('prisma/')
);

for (const file of libFiles) {
  try {
    if (convertFile(file)) {
      console.log(`✅ Converted lib: ${path.relative(LIB_DIR, file)}`);
      converted++;
    }
  } catch (err) {
    console.error(`❌ Error converting ${file}:`, err);
    errors++;
  }
}

console.log(`\nDone! ${converted} files converted, ${errors} errors.`);
console.log('Note: The conversion is mechanical. Many files will need manual fixes.');
console.log('Run the build to find compile errors and fix them.');