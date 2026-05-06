import { PrismaClient } from './lib/prisma';
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.discountRequest.create({
    data: {
      discountId: 'TEST12345',
      patient: { connect: { id: 'cmot14syl0000hy0xa4mzy0he' } },
      amount: 100,
      reason: 'test',
      requestCategory: 'financial_hardship',
      requestedBy: { connect: { id: 'cmot14syl0000hy0xa4mzy0he' } },
      status: 'pending',
    },
  });
  console.log('Success:', result);
  await prisma.$disconnect();
}
main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
