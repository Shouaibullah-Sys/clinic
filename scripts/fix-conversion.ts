import * as fs from 'fs';
import * as path from 'path';

function walkDir(dir: string): string[] {
  const files: string[] = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory() && !fullPath.includes('node_modules') && !fullPath.includes('.next')) {
        files.push(...walkDir(fullPath));
      } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
        files.push(fullPath);
      }
    }
  } catch {}
  return files;
}

const API_DIR = path.resolve(__dirname, '../app/api');
const files = walkDir(API_DIR);
let fixCount = 0;

const modelNames = [
  'User', 'Patient', 'Appointment', 'Billing', 'Prescription',
  'Medicine', 'MedicineStock', 'LabTest', 'LabTestTemplate',
  'RadiologyService', 'RadiologyTemplate', 'RadiologyExam',
  'MedicalRecord', 'TestResult', 'PharmacySale', 'Admission',
  'Session', 'Payment', 'Invoice', 'DischargeCard', 'DailyRecord',
  'Expense', 'Warehouse', 'APILog', 'AppSetting', 'ServiceDepartment',
  'WarehouseBatch', 'WarehouseTransfer'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf-8');
  const original = content;

  // Remove duplicate prisma imports
  const lines = content.split('\n');
  let prismaImportCount = 0;
  const filteredLines = lines.filter(line => {
    if (line.includes('from "@/lib/prisma"') || line.includes("from '@/lib/prisma'")) {
      prismaImportCount++;
      return prismaImportCount === 1;
    }
    return true;
  });
  content = filteredLines.join('\n');

  // Fix: prisma.model.update({ where: { id: id }, data: { ...  with trailing comma
  // This happens when $set: { was present
  content = content.replace(/data:\s*\{,\s*/g, 'data: { ');
  
  // Fix: empty data objects after conversion
  content = content.replace(/,\s*data:\s*\{\s*\}/g, '');
  
  // Remove { new: true } options from update
  content = content.replace(/,\s*\{\s*new:\s*true\s*\}/g, '');
  content = content.replace(/,\s*\{\s*new:\s*true\s*,\s*[^}]*\s*\}/g, '');
  
  // Fix remaining $set operators
  content = content.replace(/\{\s*\$set:\s*\{/g, '{');
  
  // Fix malformed prisma calls with empty parameters
  content = content.replace(/prisma\.\w+\.findMany\(\{ where: \{\s*\}\s*\}\)/g, (match) => {
    return match.replace(/\{ where: \{\s*\}\s*\}/g, '{}');
  });
  
  // Fix: prisma.x.update({ where: { id: x }, data: { ... with closing issues
  content = content.replace(/\.update\(\{ where: \{ id: ([^}]+) \}, data: \{([^}]*)\}\s*\}\)/g, (match, id, data) => {
    return `.update({ where: { id: ${id.trim()} }, data: { ${data.trim()} } })`;
  });

  // Fix double-closed braces from findByIdAndUpdate conversion
  content = content.replace(/\},\s*\}\)\)/g, '})');
  
  // Fix: Model.deleteMany({ ... }) → prisma.model.deleteMany({ where: { ... } })
  for (const model of modelNames) {
    const prismaName = model.charAt(0).toLowerCase() + model.slice(1);
    
    // deleteMany
    const deleteManyRegex = new RegExp(`${model}\\.deleteMany\\(`, 'g');
    content = content.replace(deleteManyRegex, `prisma.${prismaName}.deleteMany({ where: `);
    
    // updateMany
    const updateManyRegex = new RegExp(`${model}\\.updateMany\\(`, 'g');
    content = content.replace(updateManyRegex, `prisma.${prismaName}.updateMany({ where: `);
  }

  // Fix: ensure proper closing for findMany/updateMany that now have extra where
  // findMany({ where: { where: ... }}) -> findMany({ where: ... })
  content = content.replace(/where:\s*\{\s*where:\s*\{/g, 'where: {');
  // Fix extra closing braces
  content = content.replace(/\}\s*\}\s*\)\s*\)/g, '})');
  
  // Fix: MongoDB query patterns like { status: { $ne: "paid" } } → { status: { not: "paid" } }
  content = content.replace(/\$\w+:/g, (match) => {
    const opMap: Record<string, string> = {
      '$gte:': 'gte:', '$lte:': 'lte:', '$gt:': 'gt:', '$lt:': 'lt:',
      '$ne:': 'not:', '$in:': 'in:', '$nin:': 'notIn:',
      '$regex:': 'contains:', '$options:': 'mode:',
      '$or:': 'OR:', '$and:': 'AND:', '$nor:': 'NOT:',
      '$exists:': 'exists:', '$type:': 'type:',
      '$all:': 'hasEvery:',
    };
    return opMap[match] || match;
  });

  // Fix: Mode should be string, not repeated
  content = content.replace(/mode:\s*['"]i['"\)]/g, 'mode: "insensitive"');
  
  if (content !== original) {
    fs.writeFileSync(file, content, 'utf-8');
    fixCount++;
  }
}

console.log(`Fixed ${fixCount} files`);