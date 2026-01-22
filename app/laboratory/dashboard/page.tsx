// app/laboratory/dashboard/page.tsx
"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useMemo, useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Badge } from "@/components/ui/badge";

// Import TanStack Query and Table
import { useQuery } from "@tanstack/react-query";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

interface LabRecord {
  _id: string;
  amountPaid: number;
  testType: string;
  date: string;
  description?: string;
  doctorName?: string;
}

interface Expense {
  _id: string;
  amount: number;
  expenseType: string;
  date: string;
  description?: string;
}

interface TestTypeData {
  name: string;
  value: number;
}

interface ExpenseTypeData {
  name: string;
  value: number;
}

interface MonthlyData {
  name: string;
  revenue: number;
  expenses: number;
  profit: number;
}

interface Metrics {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  testTypeData: TestTypeData[];
  expenseTypeData: ExpenseTypeData[];
}

// Mobile Transaction Card Component
const MobileTransactionCard = ({ transaction }: { transaction: any }) => (
  <Card className="mb-3 p-3">
    <CardContent className="p-0 space-y-2">
      <div className="flex justify-between items-start">
        <div className="space-y-1 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {format(new Date(transaction.date), "MMM dd, yyyy")}
            </span>
            <Badge
              variant={
                transaction.displayType === "Revenue" ? "default" : "secondary"
              }
              className="text-xs"
            >
              {transaction.displayType}
            </Badge>
          </div>
          <p className="text-sm font-medium">{transaction.displayName}</p>
          {transaction.doctorName && (
            <p className="text-xs text-muted-foreground">
              Dr. {transaction.doctorName}
            </p>
          )}
        </div>
        <div className="text-right">
          <p
            className={`text-sm font-bold ${
              transaction.displayAmount >= 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            {transaction.displayAmount >= 0 ? "+" : "-"}AFN{" "}
            {Math.abs(transaction.displayAmount).toFixed(2)}
          </p>
        </div>
      </div>
    </CardContent>
  </Card>
);

// Optimized fetcher for TanStack Query
const fetchData = async (url: string) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timeoutId);
  }
};

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

function DashboardContent() {
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();

  // Debounce date changes
  const debouncedStartDate = useDebounce(startDate, 500);
  const debouncedEndDate = useDebounce(endDate, 500);

  // Build query parameters for API calls
  const buildQueryParams = useMemo(() => {
    const params = new URLSearchParams();
    if (debouncedStartDate)
      params.append("startDate", debouncedStartDate.toISOString());
    if (debouncedEndDate)
      params.append("endDate", debouncedEndDate.toISOString());
    params.append("page", "1");
    params.append("limit", "1000");
    return params.toString();
  }, [debouncedStartDate, debouncedEndDate]);

  // TanStack Query for records - always fetch data (lifetime by default)
  const {
    data: recordsResponse,
    isLoading: recordsLoading,
    error: recordsError,
  } = useQuery({
    queryKey: [
      "lab-records",
      debouncedStartDate?.toISOString(),
      debouncedEndDate?.toISOString(),
    ],
    queryFn: () => fetchData(`/api/laboratory/records?${buildQueryParams}`),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // TanStack Query for expenses - always fetch data (lifetime by default)
  const {
    data: expensesResponse,
    isLoading: expensesLoading,
    error: expensesError,
  } = useQuery({
    queryKey: [
      "lab-expenses",
      debouncedStartDate?.toISOString(),
      debouncedEndDate?.toISOString(),
    ],
    queryFn: () => fetchData(`/api/laboratory/expenses?${buildQueryParams}`),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Extract records and expenses safely
  const records = useMemo(
    () => recordsResponse?.records || [],
    [recordsResponse]
  );
  const expenses = useMemo(
    () => expensesResponse?.expenses || [],
    [expensesResponse]
  );

  // Calculate metrics with proper error handling
  const metrics = useMemo(() => {
    const validRecords = Array.isArray(records) ? records : [];
    const validExpenses = Array.isArray(expenses) ? expenses : [];

    if (validRecords.length === 0 && validExpenses.length === 0) {
      return {
        totalRevenue: 0,
        totalExpenses: 0,
        netProfit: 0,
        testTypeData: [],
        expenseTypeData: [],
      };
    }

    const totalRevenue = validRecords.reduce(
      (sum: number, record: LabRecord) => {
        if (!record || typeof record.amountPaid !== "number") return sum;
        return sum + record.amountPaid;
      },
      0
    );

    const totalExpenses = validExpenses.reduce(
      (sum: number, expense: Expense) => {
        if (!expense || typeof expense.amount !== "number") return sum;
        return sum + expense.amount;
      },
      0
    );

    const netProfit = totalRevenue - totalExpenses;

    // Group by test type safely
    const testTypeData: Record<string, number> = {};
    validRecords.forEach((record: LabRecord) => {
      if (record?.testType && typeof record.amountPaid === "number") {
        testTypeData[record.testType] =
          (testTypeData[record.testType] || 0) + record.amountPaid;
      }
    });

    // Group by expense type safely
    const expenseTypeData: Record<string, number> = {};
    validExpenses.forEach((expense: Expense) => {
      if (expense?.expenseType && typeof expense.amount === "number") {
        const type =
          expense.expenseType === "doctor_salary"
            ? "Doctor Salaries"
            : "Other Expenses";
        expenseTypeData[type] = (expenseTypeData[type] || 0) + expense.amount;
      }
    });

    return {
      totalRevenue,
      totalExpenses,
      netProfit,
      testTypeData: Object.entries(testTypeData).map(([name, value]) => ({
        name,
        value,
      })),
      expenseTypeData: Object.entries(expenseTypeData).map(([name, value]) => ({
        name,
        value,
      })),
    };
  }, [records, expenses]);

  // Monthly data for line chart
  const monthlyData = useMemo(() => {
    const validRecords = Array.isArray(records) ? records : [];
    const validExpenses = Array.isArray(expenses) ? expenses : [];

    if (validRecords.length === 0 && validExpenses.length === 0) return [];

    // Group records by month safely
    const monthlyRecords: Record<string, number> = {};
    validRecords.forEach((record: LabRecord) => {
      if (record?.date && typeof record.amountPaid === "number") {
        try {
          const month = format(new Date(record.date), "MMM yyyy");
          monthlyRecords[month] =
            (monthlyRecords[month] || 0) + record.amountPaid;
        } catch (error) {
          console.error("Error formatting record date:", error);
        }
      }
    });

    // Group expenses by month safely
    const monthlyExpenses: Record<string, number> = {};
    validExpenses.forEach((expense: Expense) => {
      if (expense?.date && typeof expense.amount === "number") {
        try {
          const month = format(new Date(expense.date), "MMM yyyy");
          monthlyExpenses[month] =
            (monthlyExpenses[month] || 0) + expense.amount;
        } catch (error) {
          console.error("Error formatting expense date:", error);
        }
      }
    });

    // Combine data
    const allMonths = new Set([
      ...Object.keys(monthlyRecords),
      ...Object.keys(monthlyExpenses),
    ]);

    return Array.from(allMonths)
      .map((month) => ({
        name: month,
        revenue: monthlyRecords[month] || 0,
        expenses: monthlyExpenses[month] || 0,
        profit: (monthlyRecords[month] || 0) - (monthlyExpenses[month] || 0),
      }))
      .sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime());
  }, [records, expenses]);

  // Combine records and expenses for the transactions table
  const combinedTransactions = useMemo(() => {
    const validRecords = Array.isArray(records) ? records : [];
    const validExpenses = Array.isArray(expenses) ? expenses : [];

    const recordsWithType = validRecords.map((record) => ({
      ...record,
      type: "record",
      displayAmount: record.amountPaid,
      displayType: "Revenue",
      displayName: record.testType,
    }));

    const expensesWithType = validExpenses.map((expense) => ({
      ...expense,
      type: "expense",
      displayAmount: -expense.amount,
      displayType:
        expense.expenseType === "doctor_salary" ? "Doctor Salary" : "Expense",
      displayName: expense.description || "Expense",
    }));

    return [...recordsWithType, ...expensesWithType].sort((a, b) => {
      try {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      } catch {
        return 0;
      }
    });
  }, [records, expenses]);

  // Define responsive columns for the transactions table
  const transactionColumns: ColumnDef<any>[] = [
    {
      accessorKey: "date",
      header: () => <span className="text-xs sm:text-sm">Date</span>,
      cell: ({ row }) => {
        try {
          return (
            <span className="text-xs sm:text-sm whitespace-nowrap">
              {format(new Date(row.original.date), "MMM dd, yyyy")}
            </span>
          );
        } catch {
          return "Invalid Date";
        }
      },
    },
    {
      accessorKey: "type",
      header: () => <span className="text-xs sm:text-sm">Type</span>,
      cell: ({ row }) => {
        return (
          <Badge
            variant={
              row.original.displayType === "Revenue" ? "default" : "secondary"
            }
            className="text-xs"
          >
            {row.original.displayType}
          </Badge>
        );
      },
    },
    {
      accessorKey: "name",
      header: () => (
        <span className="text-xs sm:text-sm hidden sm:table-cell">
          Description
        </span>
      ),
      cell: ({ row }) => {
        return (
          <div className="hidden sm:table-cell max-w-[120px] sm:max-w-[200px] truncate text-xs sm:text-sm">
            {row.original.displayName}
            {row.original.doctorName && (
              <div className="text-xs text-muted-foreground">
                Dr. {row.original.doctorName}
              </div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "amount",
      header: () => <span className="text-xs sm:text-sm">Amount</span>,
      cell: ({ row }) => {
        const amount = row.original.displayAmount;
        const isPositive = amount >= 0;

        return (
          <div
            className={`text-xs sm:text-sm font-bold ${
              isPositive ? "text-green-600" : "text-red-600"
            }`}
          >
            {isPositive ? "+" : "-"}AFN {Math.abs(amount).toFixed(2)}
          </div>
        );
      },
    },
  ];

  // Setup TanStack Table with built-in pagination for transactions
  const transactionsTable = useReactTable({
    data: combinedTransactions,
    columns: transactionColumns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  const isLoading = recordsLoading || expensesLoading;

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-[120px] w-full" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-[400px] w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
      {/* Header - Responsive */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-4">
        <h1 className="text-xl sm:text-2xl font-bold">
          Laboratory Financial Dashboard
        </h1>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "justify-start text-left font-normal text-xs sm:text-sm",
                  !startDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                {startDate ? (
                  format(startDate, "MMM dd, yyyy")
                ) : (
                  <span>Start Date</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={setStartDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "justify-start text-left font-normal text-xs sm:text-sm",
                  !endDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                {endDate ? (
                  format(endDate, "MMM dd, yyyy")
                ) : (
                  <span>End Date</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={setEndDate}
                initialFocus
                disabled={(date) => (startDate ? date < startDate : false)}
              />
            </PopoverContent>
          </Popover>
          <Button
            variant="secondary"
            onClick={() => {
              setStartDate(undefined);
              setEndDate(undefined);
            }}
            className="text-xs sm:text-sm"
          >
            Clear
          </Button>
        </div>
      </div>

      {/* Always show dashboard data - lifetime data by default */}
      <>
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-4 sm:mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm sm:text-base">
                Total Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-3xl font-bold">
                AFN {metrics?.totalRevenue?.toFixed(2) || "0.00"}
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-2">
                {debouncedStartDate && debouncedEndDate
                  ? `Filtered period: ${format(
                      debouncedStartDate,
                      "MMM d, yyyy"
                    )} - ${format(debouncedEndDate, "MMM d, yyyy")}`
                  : "Lifetime total"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm sm:text-base">
                Total Expenses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-3xl font-bold">
                AFN {metrics?.totalExpenses?.toFixed(2) || "0.00"}
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-2">
                {debouncedStartDate && debouncedEndDate
                  ? `Filtered period: ${format(
                      debouncedStartDate,
                      "MMM d, yyyy"
                    )} - ${format(debouncedEndDate, "MMM d, yyyy")}`
                  : "Lifetime total"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm sm:text-base">Net Profit</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className={`text-xl sm:text-3xl font-bold ${
                  metrics?.netProfit && metrics.netProfit >= 0
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                AFN {metrics?.netProfit?.toFixed(2) || "0.00"}
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-2">
                {debouncedStartDate && debouncedEndDate
                  ? `Filtered period: ${format(
                      debouncedStartDate,
                      "MMM d, yyyy"
                    )} - ${format(debouncedEndDate, "MMM d, yyyy")}`
                  : "Lifetime total"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm sm:text-base">
                Monthly Performance
                {debouncedStartDate && debouncedEndDate && (
                  <span className="text-xs font-normal text-muted-foreground block">
                    Filtered: {format(debouncedStartDate, "MMM d, yyyy")} -{" "}
                    {format(debouncedEndDate, "MMM d, yyyy")}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[300px] sm:h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={monthlyData}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="revenue" fill="#8884d8" name="Revenue" />
                  <Bar dataKey="expenses" fill="#82ca9d" name="Expenses" />
                  <Bar dataKey="profit" fill="#ffc658" name="Profit" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm sm:text-base">
                Revenue by Test Type
                {debouncedStartDate && debouncedEndDate && (
                  <span className="text-xs font-normal text-muted-foreground block">
                    Filtered: {format(debouncedStartDate, "MMM d, yyyy")} -{" "}
                    {format(debouncedEndDate, "MMM d, yyyy")}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[300px] sm:h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={metrics?.testTypeData || []}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                  >
                    {metrics?.testTypeData?.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm sm:text-base">
                Expense Breakdown
                {debouncedStartDate && debouncedEndDate && (
                  <span className="text-xs font-normal text-muted-foreground block">
                    Filtered: {format(debouncedStartDate, "MMM d, yyyy")} -{" "}
                    {format(debouncedEndDate, "MMM d, yyyy")}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[300px] sm:h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={metrics?.expenseTypeData || []}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                  >
                    {metrics?.expenseTypeData?.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm sm:text-base">
                Recent Transactions
                {debouncedStartDate && debouncedEndDate && (
                  <span className="text-xs font-normal text-muted-foreground block">
                    Filtered: {format(debouncedStartDate, "MMM d, yyyy")} -{" "}
                    {format(debouncedEndDate, "MMM d, yyyy")}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Desktop Table View (hidden on mobile) */}
              <div className="hidden sm:block rounded-md border mb-4">
                <Table>
                  <TableHeader>
                    {transactionsTable.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <TableHead
                            key={header.id}
                            className="text-xs sm:text-sm p-2 sm:p-4"
                          >
                            {header.isPlaceholder
                              ? null
                              : flexRender(
                                  header.column.columnDef.header,
                                  header.getContext()
                                )}
                          </TableHead>
                        ))}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody>
                    {transactionsTable.getRowModel().rows?.length ? (
                      transactionsTable.getRowModel().rows.map((row) => (
                        <TableRow
                          key={row.id}
                          data-state={row.getIsSelected() && "selected"}
                        >
                          {row.getVisibleCells().map((cell) => (
                            <TableCell key={cell.id} className="p-2 sm:p-4">
                              {flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext()
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={transactionColumns.length}
                          className="h-24 text-center text-xs sm:text-sm text-muted-foreground"
                        >
                          No transactions found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View (shown only on mobile) */}
              <div className="sm:hidden space-y-3">
                {transactionsTable.getRowModel().rows?.length ? (
                  transactionsTable
                    .getRowModel()
                    .rows.map((row) => (
                      <MobileTransactionCard
                        key={row.id}
                        transaction={row.original}
                      />
                    ))
                ) : (
                  <Card className="p-6 text-center">
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        No transactions found
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* TanStack Table Pagination Controls */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs sm:text-sm text-muted-foreground">
                  {transactionsTable.getRowModel().rows.length} of{" "}
                  {combinedTransactions.length}
                </div>

                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => transactionsTable.previousPage()}
                    disabled={!transactionsTable.getCanPreviousPage()}
                    className="text-xs h-8"
                  >
                    Prev
                  </Button>

                  <div className="hidden sm:flex items-center gap-1">
                    {Array.from(
                      {
                        length: Math.min(5, transactionsTable.getPageCount()),
                      },
                      (_, i) => {
                        const pageNumber = i + 1;
                        const currentPage =
                          transactionsTable.getState().pagination.pageIndex + 1;
                        return (
                          <Button
                            key={pageNumber}
                            variant={
                              currentPage === pageNumber ? "default" : "outline"
                            }
                            size="sm"
                            onClick={() => transactionsTable.setPageIndex(i)}
                            className="h-8 w-8 p-0 text-xs"
                          >
                            {pageNumber}
                          </Button>
                        );
                      }
                    )}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => transactionsTable.nextPage()}
                    disabled={!transactionsTable.getCanNextPage()}
                    className="text-xs h-8"
                  >
                    Next
                  </Button>
                </div>

                <div className="flex items-center space-x-2">
                  <p className="text-xs sm:text-sm lg:hidden font-medium hidden sm:block">
                    Rows per page
                  </p>
                  <select
                    value={transactionsTable.getState().pagination.pageSize}
                    onChange={(e) => {
                      transactionsTable.setPageSize(Number(e.target.value));
                    }}
                    className="h-8 w-[70px] rounded-md border border-input bg-background px-3 py-1 text-xs sm:text-sm"
                  >
                    {[10, 20, 30, 50].map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </>
    </div>
  );
}

export default function Dashboard() {
  return (
    <ErrorBoundary>
      <DashboardContent />
    </ErrorBoundary>
  );
}
