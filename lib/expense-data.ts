// lib/expense-data.ts
import dbConnect from "@/lib/dbConnect";
import { Expense } from "@/lib/models/Expense";

export async function getExpensesSummary(
  date?: Date,
  month?: number,
  year?: number
) {
  await dbConnect();

  let query: any = {};

  if (date) {
    const startOfDay = new Date(date.setHours(0, 0, 0, 0));
    const endOfDay = new Date(date.setHours(23, 59, 59, 999));
    query.date = { $gte: startOfDay, $lte: endOfDay };
  } else if (month && year) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);
    query.date = { $gte: startDate, $lte: endDate };
  }

  const expenses = await Expense.find(query);

  const summary = {
    totalExpenses: expenses.reduce((sum, exp) => sum + exp.amount, 0),
    totalAmount: expenses.reduce((sum, exp) => sum + exp.amount, 0),
    pendingCount: expenses.filter(exp => exp.status === "pending").length,
    approvedCount: expenses.filter(exp => exp.status === "approved").length,
    paidCount: expenses.filter(exp => exp.status === "paid").length,
    rejectedCount: expenses.filter(exp => exp.status === "rejected").length,
    byCategory: {} as Record<string, number>,
    byPaymentMethod: {} as Record<string, number>,
  };

  // Calculate by category
  expenses.forEach(expense => {
    summary.byCategory[expense.category] = 
      (summary.byCategory[expense.category] || 0) + expense.amount;
    
    summary.byPaymentMethod[expense.paymentMethod] = 
      (summary.byPaymentMethod[expense.paymentMethod] || 0) + expense.amount;
  });

  return summary;
}

export async function getExpensesByCategory(month?: number, year?: number) {
  await dbConnect();
  
  let query: any = {};
  if (month && year) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);
    query.date = { $gte: startDate, $lte: endDate };
  }

  const expenses = await Expense.find(query);
  
  const categoryTotals: Record<string, number> = {};
  
  expenses.forEach(expense => {
    categoryTotals[expense.category] = 
      (categoryTotals[expense.category] || 0) + expense.amount;
  });

  return categoryTotals;
}