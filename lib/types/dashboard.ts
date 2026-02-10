export interface DashboardStats {
  todaysRevenue: number;
  todaysExpenses: number;
  todaysOphthalmologyRevenue: number;
  pendingOrders: number;
  totalStockValue: number;
  totalStockQuantity: number;
  lowStockItemsCount: number;
  todaysOrdersCount: number;
  todaysConsultations: number;
  stats: {
    revenue: { today: number; change: string };
    orders: { today: number; pending: number; change: string };
    stock: {
      totalItems: number;
      totalQuantity: number;
      totalValue: number;
      lowStock: number;
    };
    ophthalmology: { today: number; revenue: number; change: string };
  };
}

export interface AdminStats {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  totalOrders: number;
  totalStockValue: number;
  totalConsultations: number;
  pendingOrders: number;
  monthlyData: Array<{
    month: string;
    revenue: number;
    expenses: number;
    profit: number;
  }>;
  topProducts: Array<{
    name: string;
    revenue: number;
    quantity: number;
  }>;
  expenseBreakdown: Array<{
    category: string;
    amount: number;
  }>;
}

export interface QuickStats {
  weeklyData: Array<{ date: string; orders: number; revenue: number }>;
  weeklyRevenue: number;
  glassTypeData: Array<{ name: string; value: number; color: string }>;
  recentActivities: Array<{
    id: string;
    type: string;
    description: string;
    amount: number;
    time: string;
    icon: string;
  }>;
}

export interface LowStockItem {
  _id: string;
  name: string;
  glassType: string;
  current: number;
  threshold: number;
  unitPrice: number;
  percentage: number;
}

export interface StaffStats {
  glassStock: {
    totalItems: number;
    totalQuantity: number;
    lowStock: number;
  };
  todayOrders: number;
  todayRevenue: number;
  pendingOrders: number;
  todaysConsultations: number;
  weeklyData: Array<{ day: string; orders: number; revenue: number }>;
  recentOrders: Array<{
    _id: string;
    invoiceNumber: string;
    customerName: string;
    totalAmount: number;
    status: string;
    createdAt: string;
    items: Array<{
      glassProduct: string;
      quantity: number;
    }>;
  }>;
}
