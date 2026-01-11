// app/api/dashboard/combined-stats/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDailySummary, getMonthlySummary } from "@/lib/tailor-data";
import { getExpensesSummary } from "@/lib/expense-data"; // You'll need to create this

interface RecentActivity {
  date: string;
  type: string;
  description: string;
  amount?: number;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date") 
      ? new Date(searchParams.get("date") as string) 
      : new Date();
    
    const month = searchParams.get("month") 
      ? parseInt(searchParams.get("month") as string) 
      : new Date().getMonth() + 1;
    
    const year = searchParams.get("year") 
      ? parseInt(searchParams.get("year") as string) 
      : new Date().getFullYear();

    // Get tailor records summary
    const tailorSummary = await getDailySummary(date);
    
    // Get expenses summary (you'll need to create this function)
    const expensesSummary = await getExpensesSummary(date);
    
    // Get monthly summaries
    const tailorMonthly = await getMonthlySummary(month, year);
    const expensesMonthly = await getExpensesSummary(undefined, month, year);

    const combinedStats = {
      // Daily stats
      daily: {
        tailor: tailorSummary,
        expenses: expensesSummary,
        netProfit: tailorSummary.totalPaid - expensesSummary.totalAmount,
      },
      
      // Monthly stats
      monthly: {
        tailor: tailorMonthly,
        expenses: expensesMonthly,
        netProfit: tailorMonthly.totalPaid - expensesMonthly.totalAmount,
      },
      
      // Quick stats
      quickStats: {
        totalOrders: tailorSummary.totalRecords,
        totalExpenses: expensesSummary.totalExpenses,
        pendingOrders: tailorSummary.pendingOrders,
        pendingExpenses: expensesSummary.pendingCount,
        upcomingDeliveries: tailorSummary.pendingOrders,
        revenueGrowth: 12.5, // Calculate based on previous period
        expenseGrowth: 8.2, // Calculate based on previous period
      },
      
      // Charts data
      charts: {
        weeklyRevenue: generateWeeklyRevenueData(),
        expenseByCategory: generateExpenseByCategoryData(),
        orderVsExpense: generateOrderVsExpenseData(),
      },
      
      // Recent activities
      recentActivities: ([
        ...generateRecentOrders(),
        ...generateRecentExpenses(),
      ] as RecentActivity[]).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10),
    };

    return NextResponse.json(combinedStats);
  } catch (error) {
    console.error("Error fetching combined dashboard stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard stats" },
      { status: 500 }
    );
  }
}

// Helper functions (you'll need to implement these based on your data)
function generateWeeklyRevenueData() {
  // Return array of { date: string, revenue: number, expenses: number }
  return [];
}

function generateExpenseByCategoryData() {
  // Return array of { name: string, value: number, color: string }
  return [];
}

function generateOrderVsExpenseData() {
  // Return array of { month: string, orders: number, expenses: number }
  return [];
}

function generateRecentOrders(): RecentActivity[] {
  // Return array of recent order activities
  return [];
}

function generateRecentExpenses(): RecentActivity[] {
  // Return array of recent expense activities
  return [];
}