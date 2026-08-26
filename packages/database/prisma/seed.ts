import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const EXPENSE_CATEGORIES: Array<{ name: string; icon: string }> = [
  { name: 'Food', icon: '🍔' },
  { name: 'Grocery', icon: '🛒' },
  { name: 'Transport', icon: '🚌' },
  { name: 'Fuel', icon: '⛽' },
  { name: 'Shopping', icon: '🛍️' },
  { name: 'Medical', icon: '💊' },
  { name: 'Education', icon: '🎓' },
  { name: 'Electricity', icon: '💡' },
  { name: 'Internet', icon: '🌐' },
  { name: 'Mobile', icon: '📱' },
  { name: 'Rent', icon: '🏠' },
  { name: 'Insurance', icon: '🛡️' },
  { name: 'Entertainment', icon: '🎬' },
  { name: 'Travel', icon: '✈️' },
  { name: 'Bike/Vehicle', icon: '🏍️' },
  { name: 'Household', icon: '🧹' },
  { name: 'Personal', icon: '👤' },
  { name: 'EMI', icon: '🏦' },
  { name: 'Other', icon: '📦' },
];

const INCOME_CATEGORIES: Array<{ name: string; icon: string }> = [
  { name: 'Salary', icon: '💼' },
  { name: 'Freelance', icon: '💻' },
  { name: 'Business', icon: '🏢' },
  { name: 'Interest', icon: '📈' },
  { name: 'Refund', icon: '↩️' },
  { name: 'Gift', icon: '🎁' },
  { name: 'Other', icon: '📦' },
];

async function upsertSystemCategory(name: string, type: 'EXPENSE' | 'INCOME', icon: string) {
  const existing = await prisma.expenseCategory.findFirst({
    where: { userId: null, name, type },
  });
  if (existing) {
    await prisma.expenseCategory.update({
      where: { id: existing.id },
      data: { icon, isSystem: true },
    });
    return;
  }
  await prisma.expenseCategory.create({
    data: { userId: null, name, type, icon, isSystem: true, isActive: true },
  });
}

async function main() {
  for (const c of EXPENSE_CATEGORIES) {
    await upsertSystemCategory(c.name, 'EXPENSE', c.icon);
  }
  for (const c of INCOME_CATEGORIES) {
    await upsertSystemCategory(c.name, 'INCOME', c.icon);
  }
  console.log(`Seeded ${EXPENSE_CATEGORIES.length} expense categories and ${INCOME_CATEGORIES.length} income categories.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
