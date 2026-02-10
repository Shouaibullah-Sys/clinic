// app/pharmacy/dashboard/page.tsx
"use client";
import { useMemo, useState } from "react";
import useSWR from "swr";
import {
  CalendarIcon,
  PlusIcon,
  PillIcon,
  ReceiptIcon,
  WalletIcon,
  AlertCircleIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  Loader2Icon,
  FlaskConicalIcon,
  SyringeIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
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
import { safeFormat } from "@/utils/dateUtils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

// Types (unchanged)
type DashboardStats = {
  totalSales: number;
  cashSales: number;
  cardSales: number;
  insuranceSales: number;
  totalExpenses: number;
  inventoryValue: number;
  lowStockItems: number;
  labTotalRevenue: number;
  labTotalExpenses: number;
  labNetProfit: number;
  pendingLabTests: number;
  completedLabTests: number;
};

type RecentPrescription = {
  _id: string;
  patientName: string;
  totalAmount: number;
  paymentMethod: string;
  createdAt: string;
  status: "completed" | "pending" | "cancelled";
};

type LowStockItem = {
  _id: string;
  name: string;
  form: string;
  dosage: string;
  frequency: string;
  route: string;
  currentQuantity: number;
  originalQuantity: number;
  remainingPercentage: number;
};

type RecentExpense = {
  _id: string;
  amount: number;
  category: string;
  description: string;
  date: string;
  type: "pharmacy" | "laboratory";
};

type LabTestRecord = {
  _id: string;
  patientName: string;
  testType: string;
  status: "pending" | "completed" | "cancelled";
  orderedDate: string;
  completedDate?: string;
  amountPaid: number;
  doctorName?: string;
};

type LabExpense = {
  _id: string;
  amount: number;
  expenseType: string;
  description: string;
  date: string;
  doctorName?: string;
};

type TestTypeData = {
  name: string;
  value: number;
};

type ExpenseTypeData = {
  name: string;
  value: number;
};

type LabMetrics = {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  testTypeData: TestTypeData[];
  expenseTypeData: ExpenseTypeData[];
};

type MonthlyLabData = {
  name: string;
  revenue: number;
  expenses: number;
  profit: number;
};

// Fetcher function
const fetcher = (url: string) => fetch(url).then((res) => res.json());

// Pagination Component (unchanged)
// Updated Pagination Component
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  totalItems: number;
  className?: string;
}

function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  pageSize,
  onPageSizeChange,
  totalItems,
  className = "",
}: PaginationProps) {
  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-3 px-2 py-4 ${className}`}
    >
      <div className="text-sm text-muted-foreground whitespace-nowrap w-1/3">
        Showing {(currentPage - 1) * pageSize + 1} to{" "}
        {Math.min(currentPage * pageSize, totalItems)} of {totalItems} entries
      </div>

      <div className="flex items-center gap-2 sm:gap-4 flex-wrap justify-center">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium whitespace-nowrap hidden sm:block">
            Rows per page
          </p>
          <Select
            value={`${pageSize}`}
            onValueChange={(value) => {
              onPageSizeChange(Number(value));
            }}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue placeholder={pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {[10, 20, 30, 40, 50].map((size) => (
                <SelectItem key={size} value={`${size}`}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <div className="text-sm font-medium whitespace-nowrap hidden sm:block">
            Page {currentPage} of {totalPages}
          </div>
          <div className="text-sm font-medium whitespace-nowrap sm:hidden">
            {currentPage}/{totalPages}
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => onPageChange(1)}
              disabled={currentPage === 1}
            >
              <span className="sr-only">Go to first page</span>
              <ChevronsLeftIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <span className="sr-only">Go to previous page</span>
              <ChevronLeftIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages || totalPages === 0}
            >
              <span className="sr-only">Go to next page</span>
              <ChevronRightIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => onPageChange(totalPages)}
              disabled={currentPage === totalPages || totalPages === 0}
            >
              <span className="sr-only">Go to last page</span>
              <ChevronsRightIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Paginated Table Component for Recent Prescriptions (unchanged)
function RecentPrescriptionsTable({ data }: { data: RecentPrescription[] }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const totalPages = Math.ceil(data.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedData = data.slice(startIndex, startIndex + pageSize);

  return (
    <div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs sm:text-sm">Patient</TableHead>
              <TableHead className="text-xs sm:text-sm">Amount</TableHead>
              <TableHead className="text-xs sm:text-sm hidden sm:table-cell">
                Payment
              </TableHead>
              <TableHead className="text-xs sm:text-sm hidden md:table-cell">
                Date
              </TableHead>
              <TableHead className="text-xs sm:text-sm">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.map((prescription) => (
              <TableRow key={prescription._id}>
                <TableCell className="text-xs sm:text-sm font-medium">
                  {prescription.patientName}
                </TableCell>
                <TableCell className="text-xs sm:text-sm">
                  AFN {prescription.totalAmount.toFixed(2)}
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <Badge variant="outline" className="text-xs capitalize">
                    {prescription.paymentMethod}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs sm:text-sm hidden md:table-cell">
                  {format(new Date(prescription.createdAt), "MMM d, yyyy")}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      prescription.status === "completed"
                        ? "default"
                        : prescription.status === "pending"
                          ? "secondary"
                          : "destructive"
                    }
                    className="text-xs"
                  >
                    {prescription.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        pageSize={pageSize}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setCurrentPage(1);
        }}
        totalItems={data.length}
        className="mt-4"
      />
    </div>
  );
}

// Paginated Table Component for Low Stock Items (unchanged)
function LowStockItemsTable({ data }: { data: LowStockItem[] }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const totalPages = Math.ceil(data.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedData = data.slice(startIndex, startIndex + pageSize);

  return (
    <div>
      <div className="space-y-3 sm:space-y-4">
        {paginatedData.map((item) => (
          <div key={item._id} className="flex items-center">
            <div className="space-y-1 w-full">
              <p className="text-xs sm:text-sm font-medium leading-none">
                {item.name}
              </p>
              <div className="text-xs text-muted-foreground space-y-0.5">
                <p>Form: {item.form}</p>
                <p>Dosage: {item.dosage}</p>
                <p>Frequency: {item.frequency}</p>
                <p>Route: {item.route}</p>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {item.currentQuantity} / {item.originalQuantity} remaining
                </span>
                <span className="text-xs font-medium">
                  {item.remainingPercentage.toFixed(0)}%
                </span>
              </div>
              <Progress
                value={item.remainingPercentage}
                className="h-1.5 sm:h-2"
                style={
                  {
                    "--progress-indicator-color":
                      item.remainingPercentage < 10
                        ? "#ef4444"
                        : item.remainingPercentage < 20
                          ? "#eab308"
                          : "#22c55e",
                  } as React.CSSProperties
                }
              />
            </div>
          </div>
        ))}
      </div>
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        pageSize={pageSize}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setCurrentPage(1);
        }}
        totalItems={data.length}
      />
    </div>
  );
}

// Paginated Table Component for Lab Transactions (unchanged)
function LabTransactionsTable({
  labRecords,
  labExpenses,
}: {
  labRecords: LabTestRecord[];
  labExpenses: LabExpense[];
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Combine and sort transactions
  const transactions = useMemo(() => {
    const combined = [
      ...labRecords.map((record) => ({
        ...record,
        type: "revenue" as const,
        date: record.orderedDate,
      })),
      ...labExpenses.map((expense) => ({
        ...expense,
        type: "expense" as const,
        date: expense.date,
      })),
    ];

    return combined.sort((a, b) => {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }, [labRecords, labExpenses]);

  const totalPages = Math.ceil(transactions.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedData = transactions.slice(startIndex, startIndex + pageSize);

  return (
    <div>
      <div className="space-y-3 sm:space-y-4">
        {paginatedData.map((item) => {
          const isRecord = item.type === "revenue";
          const description = isRecord ? item.testType : item.description;
          const amount = isRecord ? item.amountPaid : -item.amount;
          const doctorName = item.doctorName || "N/A";

          return (
            <div
              key={item._id}
              className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-2 sm:p-3 border rounded gap-2"
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium truncate">
                  {description}
                </p>
                <p className="text-xs text-muted-foreground">
                  {safeFormat(new Date(item.date), "PP")} • {doctorName}
                </p>
              </div>
              <div
                className={`text-xs sm:text-sm font-bold flex-shrink-0 ${
                  isRecord ? "text-green-500" : "text-red-500"
                }`}
              >
                {isRecord
                  ? `+AFN ${amount.toFixed(2)}`
                  : `-AFN ${Math.abs(amount).toFixed(2)}`}
              </div>
            </div>
          );
        })}
        {transactions.length === 0 && (
          <div className="text-center py-8 text-xs sm:text-sm text-muted-foreground">
            No recent transactions
          </div>
        )}
      </div>
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        pageSize={pageSize}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setCurrentPage(1);
        }}
        totalItems={transactions.length}
        className="mt-4"
      />
    </div>
  );
}

export default function PharmacyDashboard() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [labStartDate, setLabStartDate] = useState<Date | undefined>();
  const [labEndDate, setLabEndDate] = useState<Date | undefined>();

  // Fetch all dashboard data
  const { data: stats, isLoading: statsLoading } = useSWR<DashboardStats>(
    "/api/pharmacy/dashboard/stats",
    fetcher,
  );
  const { data: recentPrescriptions, isLoading: prescriptionsLoading } = useSWR<
    RecentPrescription[]
  >("/api/pharmacy/prescriptions/recent", fetcher);
  const {
    data: lowStockItems,
    isLoading: stockLoading,
    error: stockError,
  } = useSWR<LowStockItem[]>("/api/pharmacy/inventory/low-stock", fetcher);
  const { data: recentExpenses, isLoading: expensesLoading } = useSWR<
    RecentExpense[]
  >("/api/pharmacy/expenses/recent", fetcher);
  const { data: labRecords, isLoading: labRecordsLoading } = useSWR<
    LabTestRecord[]
  >(
    `/api/laboratory/records?${new URLSearchParams({
      startDate: labStartDate?.toISOString() || "",
      endDate: labEndDate?.toISOString() || "",
    })}`,
    fetcher,
  );
  const { data: labExpenses, isLoading: labExpensesLoading } = useSWR<
    LabExpense[]
  >(
    `/api/laboratory/expenses?${new URLSearchParams({
      startDate: labStartDate?.toISOString() || "",
      endDate: labEndDate?.toISOString() || "",
    })}`,
    fetcher,
  );

  // Calculate metrics
  const labMetrics = useMemo<LabMetrics | null>(() => {
    // Ensure we have valid arrays before processing
    const validLabRecords = Array.isArray(labRecords) ? labRecords : [];
    const validLabExpenses = Array.isArray(labExpenses) ? labExpenses : [];

    if (validLabRecords.length === 0 && validLabExpenses.length === 0)
      return null;

    const totalRevenue = validLabRecords.reduce(
      (sum, record) => sum + (record?.amountPaid || 0),
      0,
    );
    const totalExpenses = validLabExpenses.reduce(
      (sum, expense) => sum + (expense?.amount || 0),
      0,
    );
    const netProfit = totalRevenue - totalExpenses;

    // Group by test type
    const testTypeData = validLabRecords.reduce(
      (acc: Record<string, number>, record) => {
        if (record?.testType && typeof record.amountPaid === "number") {
          acc[record.testType] =
            (acc[record.testType] || 0) + record.amountPaid;
        }
        return acc;
      },
      {},
    );

    // Group by expense type
    const expenseTypeData = validLabExpenses.reduce(
      (acc: Record<string, number>, expense) => {
        if (expense?.expenseType && typeof expense.amount === "number") {
          const type =
            expense.expenseType === "doctor_salary"
              ? "Doctor Salaries"
              : "Other Expenses";
          acc[type] = (acc[type] || 0) + expense.amount;
        }
        return acc;
      },
      {},
    );

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
  }, [labRecords, labExpenses]);

  // Monthly data for line chart
  const monthlyLabData = useMemo<MonthlyLabData[]>(() => {
    const validLabRecords = Array.isArray(labRecords) ? labRecords : [];
    const validLabExpenses = Array.isArray(labExpenses) ? labExpenses : [];

    if (validLabRecords.length === 0 && validLabExpenses.length === 0)
      return [];

    // Group records by month
    const monthlyRecords: Record<string, number> = {};
    validLabRecords.forEach((record) => {
      if (record?.orderedDate && typeof record.amountPaid === "number") {
        const month = safeFormat(record.orderedDate, "MMM yyyy");
        if (month !== "N/A") {
          monthlyRecords[month] =
            (monthlyRecords[month] || 0) + record.amountPaid;
        }
      }
    });

    // Group expenses by month
    const monthlyExpenses: Record<string, number> = {};
    validLabExpenses.forEach((expense) => {
      if (expense?.date && typeof expense.amount === "number") {
        const month = safeFormat(expense.date, "MMM yyyy");
        if (month !== "N/A") {
          monthlyExpenses[month] =
            (monthlyExpenses[month] || 0) + expense.amount;
        }
      }
    });

    // Combine data
    const allMonths = [
      ...new Set([
        ...Object.keys(monthlyRecords),
        ...Object.keys(monthlyExpenses),
      ]),
    ].filter((month) => month !== "N/A");

    return allMonths
      .map((month) => ({
        name: month,
        revenue: monthlyRecords[month] || 0,
        expenses: monthlyExpenses[month] || 0,
        profit: (monthlyRecords[month] || 0) - (monthlyExpenses[month] || 0),
      }))
      .sort((a, b) => {
        const dateA = new Date(a.name);
        const dateB = new Date(b.name);
        return isNaN(dateA.getTime()) || isNaN(dateB.getTime())
          ? a.name.localeCompare(b.name)
          : dateA.getTime() - dateB.getTime();
      });
  }, [labRecords, labExpenses]);

  // Calculate percentage changes
  const salesChange = 12.5;
  const expensesChange = -4.3;
  const inventoryChange = 2.1;
  const labTestsChange = 8.7;
  const labRevenueChange = 15.2;

  // Loading states
  const isLoading =
    statsLoading ||
    prescriptionsLoading ||
    stockLoading ||
    expensesLoading ||
    labRecordsLoading ||
    labExpensesLoading;
  const labLoading = labRecordsLoading || labExpensesLoading;

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 max-w-7xl">
      {/* Header - Responsive */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 gap-4">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">
          Pharmacy & Laboratory Dashboard
        </h1>
        <div className="flex gap-2 sm:gap-4 w-full sm:w-auto">
          <Button
            variant="outline"
            className="flex-1 sm:flex-none text-xs sm:text-sm"
          >
            <CalendarIcon className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">
              {format(new Date(), "MMMM d, yyyy")}
            </span>
            <span className="sm:hidden">{format(new Date(), "MMM d")}</span>
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-32 sm:h-64">
          <Loader2Icon className="h-8 w-8 sm:h-12 sm:w-12 animate-spin" />
        </div>
      ) : (
        <>
          {/* Stats Overview - Fully Responsive Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs sm:text-sm font-medium">
                  Pharmacy Sales
                </CardTitle>
                <ReceiptIcon className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-lg sm:text-xl lg:text-2xl font-bold">
                  AFN {stats?.totalSales?.toFixed(2) || "0.00"}
                </div>
                <div
                  className={`flex items-center text-xs ${
                    salesChange >= 0 ? "text-green-500" : "text-red-500"
                  }`}
                >
                  {salesChange >= 0 ? (
                    <TrendingUpIcon className="h-3 w-3 mr-1" />
                  ) : (
                    <TrendingDownIcon className="h-3 w-3 mr-1" />
                  )}
                  <span className="hidden sm:inline">
                    {Math.abs(salesChange)}% from last period
                  </span>
                  <span className="sm:hidden">{Math.abs(salesChange)}%</span>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs sm:text-sm font-medium">
                  Lab Revenue
                </CardTitle>
                <FlaskConicalIcon className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-lg sm:text-xl lg:text-2xl font-bold">
                  AFN {stats?.labTotalRevenue?.toFixed(2) || "0.00"}
                </div>
                <div
                  className={`flex items-center text-xs ${
                    labRevenueChange >= 0 ? "text-green-500" : "text-red-500"
                  }`}
                >
                  {labRevenueChange >= 0 ? (
                    <TrendingUpIcon className="h-3 w-3 mr-1" />
                  ) : (
                    <TrendingDownIcon className="h-3 w-3 mr-1" />
                  )}
                  <span className="hidden sm:inline">
                    {Math.abs(labRevenueChange)}% from last period
                  </span>
                  <span className="sm:hidden">
                    {Math.abs(labRevenueChange)}%
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs sm:text-sm font-medium">
                  Pharmacy Expenses
                </CardTitle>
                <WalletIcon className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-lg sm:text-xl lg:text-2xl font-bold">
                  AFN {stats?.totalExpenses?.toFixed(2) || "0.00"}
                </div>
                <div
                  className={`flex items-center text-xs ${
                    expensesChange >= 0 ? "text-green-500" : "text-red-500"
                  }`}
                >
                  {expensesChange >= 0 ? (
                    <TrendingUpIcon className="h-3 w-3 mr-1" />
                  ) : (
                    <TrendingDownIcon className="h-3 w-3 mr-1" />
                  )}
                  <span className="hidden sm:inline">
                    {Math.abs(expensesChange)}% from last period
                  </span>
                  <span className="sm:hidden">{Math.abs(expensesChange)}%</span>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs sm:text-sm font-medium">
                  Lab Tests
                </CardTitle>
                <SyringeIcon className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-lg sm:text-xl lg:text-2xl font-bold">
                  {stats?.completedLabTests || 0} /{" "}
                  {stats?.pendingLabTests || 0}
                </div>
                <div
                  className={`flex items-center text-xs ${
                    labTestsChange >= 0 ? "text-green-500" : "text-red-500"
                  }`}
                >
                  {labTestsChange >= 0 ? (
                    <TrendingUpIcon className="h-3 w-3 mr-1" />
                  ) : (
                    <TrendingDownIcon className="h-3 w-3 mr-1" />
                  )}
                  <span className="hidden sm:inline">
                    {Math.abs(labTestsChange)}% from last period
                  </span>
                  <span className="sm:hidden">{Math.abs(labTestsChange)}%</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content - Responsive Tabs */}
          <Tabs defaultValue="pharmacy" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2 h-9 sm:h-10">
              <TabsTrigger value="pharmacy" className="text-xs sm:text-sm">
                Pharmacy
              </TabsTrigger>
              <TabsTrigger value="laboratory" className="text-xs sm:text-sm">
                Laboratory
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pharmacy" className="space-y-4">
              {/* Pharmacy Content - Responsive Layout */}
              <div className="grid gap-4 lg:grid-cols-7">
                <Card className="lg:col-span-4">
                  <CardHeader>
                    <CardTitle className="text-sm sm:text-base">
                      Recent Prescriptions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <RecentPrescriptionsTable
                      data={recentPrescriptions || []}
                    />
                  </CardContent>
                </Card>

                <Card className="lg:col-span-3">
                  <CardHeader>
                    <CardTitle className="text-sm sm:text-base">
                      Low Stock Alerts
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {stockError ? (
                      <div className="text-red-500 text-center py-4 text-xs sm:text-sm">
                        Failed to load low stock items
                      </div>
                    ) : lowStockItems?.length === 0 ? (
                      <div className="text-muted-foreground text-center py-4 text-xs sm:text-sm">
                        No low stock items
                      </div>
                    ) : (
                      <LowStockItemsTable data={lowStockItems || []} />
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="laboratory" className="space-y-4">
              {/* Laboratory Dashboard Content - Responsive */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-4">
                <h2 className="text-lg sm:text-xl lg:text-2xl font-bold">
                  Laboratory Financial Dashboard
                </h2>
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button
                    variant="outline"
                    className="flex-1 sm:flex-none text-xs sm:text-sm"
                    onClick={() => {
                      setLabStartDate(undefined);
                      setLabEndDate(undefined);
                    }}
                  >
                    Clear Dates
                  </Button>
                </div>
              </div>

              {/* Key Metrics - Responsive Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-4 sm:mb-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm sm:text-base">
                      Total Revenue
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl sm:text-2xl lg:text-3xl font-bold">
                      AFN {labMetrics?.totalRevenue?.toFixed(2) || "0.00"}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm sm:text-base">
                      Total Expenses
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl sm:text-2xl lg:text-3xl font-bold">
                      AFN {labMetrics?.totalExpenses?.toFixed(2) || "0.00"}
                    </div>
                  </CardContent>
                </Card>
                <Card className="sm:col-span-2 lg:col-span-1">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm sm:text-base">
                      Net Profit
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div
                      className={`text-xl sm:text-2xl lg:text-3xl font-bold ${
                        labMetrics?.netProfit && labMetrics.netProfit >= 0
                          ? "text-green-500"
                          : "text-red-500"
                      }`}
                    >
                      AFN {labMetrics?.netProfit?.toFixed(2) || "0.00"}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Charts - Responsive Layout */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm sm:text-base">
                      Monthly Performance
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="min-h-[250px]">
                    {labLoading ? (
                      <Skeleton className="h-full w-full" />
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={monthlyLabData}
                          margin={{
                            top: 20,
                            right: 10,
                            left: 10,
                            bottom: 5,
                          }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis
                            dataKey="name"
                            fontSize={12}
                            tick={{ fontSize: 10 }}
                          />
                          <YAxis fontSize={12} tick={{ fontSize: 10 }} />
                          <Tooltip />
                          <Legend />
                          <Bar
                            dataKey="revenue"
                            fill="#8884d8"
                            name="Revenue"
                          />
                          <Bar
                            dataKey="expenses"
                            fill="#82ca9d"
                            name="Expenses"
                          />
                          <Bar dataKey="profit" fill="#ffc658" name="Profit" />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm sm:text-base">
                      Revenue by Test Type
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="min-h-[250px]">
                    {labLoading ? (
                      <Skeleton className="h-full w-full" />
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={labMetrics?.testTypeData || []}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            nameKey="name"
                            label={({
                              name,
                              percent,
                            }: {
                              name: string;
                              percent: number;
                            }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                            {Array.isArray(labMetrics?.testTypeData) &&
                              labMetrics.testTypeData.map((entry, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={COLORS[index % COLORS.length]}
                                />
                              ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Bottom Charts - Responsive Layout */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm sm:text-base">
                      Expense Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="min-h-[250px]">
                    {labLoading ? (
                      <Skeleton className="h-full w-full" />
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={labMetrics?.expenseTypeData || []}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            nameKey="name"
                            label={({
                              name,
                              percent,
                            }: {
                              name: string;
                              percent: number;
                            }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                            {Array.isArray(labMetrics?.expenseTypeData) &&
                              labMetrics.expenseTypeData.map((entry, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={COLORS[index % COLORS.length]}
                                />
                              ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm sm:text-base">
                      Recent Transactions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {labLoading ? (
                      <div className="h-[250px]">
                        <Skeleton className="h-full w-full" />
                      </div>
                    ) : (
                      <LabTransactionsTable
                        labRecords={labRecords || []}
                        labExpenses={labExpenses || []}
                      />
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
