// app/finance/expenses/page.tsx

"use client";

import { useState, useCallback, useMemo } from "react";
import useSWR, { mutate } from "swr";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CalendarIcon,
  SearchIcon,
  Receipt,
  Download,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { useAuthStore } from "@/store/useAuthStore";
import Cookies from "universal-cookie";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

// Import TanStack Table components and hooks
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";

// Import expense types from the model
import {
  ExpenseCategory,
  ExpenseSubcategory,
  PaymentMethod,
  ExpenseStatus,
} from "@/lib/types/expense";

interface Expense {
  _id: string;
  date: string;
  description: string;
  amount: number;
  category: ExpenseCategory;
  subcategory?: string;
  paymentMethod: PaymentMethod;
  receiptNumber?: string;
  receiptImage?: string;
  notes?: string;
  status: ExpenseStatus;
  recordedBy: {
    _id: string;
    name: string;
    email: string;
  };
  approvedBy?: {
    _id: string;
    name: string;
  };
  approvedAt?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: "rent", label: "Rent" },
  { value: "utilities", label: "Utilities" },
  { value: "supplies", label: "Supplies" },
  { value: "maintenance", label: "Maintenance" },
  { value: "salary", label: "Salary" },
  { value: "marketing", label: "Marketing" },
  { value: "travel", label: "Travel" },
  { value: "equipment", label: "Equipment" },
  { value: "insurance", label: "Insurance" },
  { value: "tax", label: "Tax" },
  { value: "software", label: "Software" },
  { value: "professional_fees", label: "Professional Fees" },
  { value: "office", label: "Office" },
  { value: "medical", label: "Medical" },
  { value: "glass_supplies", label: "Glass Supplies" },
  { value: "other", label: "Other" },
];

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "credit_card", label: "Credit Card" },
  { value: "check", label: "Check" },
  { value: "mobile_payment", label: "Mobile Payment" },
];

const EXPENSE_STATUSES: {
  value: ExpenseStatus;
  label: string;
  color: string;
}[] = [
  {
    value: "pending",
    label: "Pending",
    color: "bg-yellow-100 text-yellow-800",
  },
  {
    value: "approved",
    label: "Approved",
    color: "bg-green-100 text-green-800",
  },
  { value: "rejected", label: "Rejected", color: "bg-red-100 text-red-800" },
  { value: "paid", label: "Paid", color: "bg-blue-100 text-blue-800" },
];

// Subcategories mapping based on category
const SUBCATEGORIES: Record<
  ExpenseCategory,
  { value: string; label: string }[]
> = {
  rent: [
    { value: "office_rent", label: "Office Rent" },
    { value: "warehouse_rent", label: "Warehouse Rent" },
    { value: "clinic_rent", label: "Clinic Rent" },
  ],
  utilities: [
    { value: "electricity", label: "Electricity" },
    { value: "water", label: "Water" },
    { value: "internet", label: "Internet" },
    { value: "phone", label: "Phone" },
    { value: "gas", label: "Gas" },
  ],
  supplies: [
    { value: "office_supplies", label: "Office Supplies" },
    { value: "medical_supplies", label: "Medical Supplies" },
    { value: "cleaning_supplies", label: "Cleaning Supplies" },
    { value: "glass_materials", label: "Glass Materials" },
  ],
  maintenance: [
    { value: "equipment_repair", label: "Equipment Repair" },
    { value: "building_maintenance", label: "Building Maintenance" },
    { value: "vehicle_maintenance", label: "Vehicle Maintenance" },
  ],
  salary: [
    { value: "staff_salary", label: "Staff Salary" },
    { value: "doctor_salary", label: "Doctor Salary" },
    { value: "admin_salary", label: "Admin Salary" },
    { value: "bonus", label: "Bonus" },
  ],
  marketing: [
    { value: "advertising", label: "Advertising" },
    { value: "promotions", label: "Promotions" },
    { value: "website", label: "Website" },
    { value: "brochures", label: "Brochures" },
  ],
  travel: [
    { value: "transportation", label: "Transportation" },
    { value: "accommodation", label: "Accommodation" },
    { value: "meals", label: "Meals" },
    { value: "fuel", label: "Fuel" },
  ],
  equipment: [
    { value: "medical_equipment", label: "Medical Equipment" },
    { value: "office_equipment", label: "Office Equipment" },
    { value: "tools", label: "Tools" },
    { value: "computers", label: "Computers" },
  ],
  insurance: [
    { value: "health_insurance", label: "Health Insurance" },
    { value: "property_insurance", label: "Property Insurance" },
    { value: "liability_insurance", label: "Liability Insurance" },
  ],
  tax: [
    { value: "income_tax", label: "Income Tax" },
    { value: "property_tax", label: "Property Tax" },
    { value: "sales_tax", label: "Sales Tax" },
  ],
  software: [
    { value: "subscription", label: "Subscription" },
    { value: "license", label: "License" },
    { value: "maintenance", label: "Maintenance" },
  ],
  professional_fees: [
    { value: "legal", label: "Legal" },
    { value: "accounting", label: "Accounting" },
    { value: "consulting", label: "Consulting" },
  ],
  office: [
    { value: "stationery", label: "Stationery" },
    { value: "printing", label: "Printing" },
    { value: "postage", label: "Postage" },
    { value: "refreshments", label: "Refreshments" },
  ],
  medical: [
    { value: "medicines", label: "Medicines" },
    { value: "instruments", label: "Instruments" },
    { value: "disposables", label: "Disposables" },
  ],
  glass_supplies: [
    { value: "glass_sheets", label: "Glass Sheets" },
    { value: "frames", label: "Frames" },
    { value: "tools", label: "Tools" },
    { value: "chemicals", label: "Chemicals" },
  ],
  other: [
    { value: "miscellaneous", label: "Miscellaneous" },
    { value: "donations", label: "Donations" },
    { value: "gifts", label: "Gifts" },
  ],
};

const cookies = new Cookies();

const getAuthHeaders = () => {
  const token = cookies.get("accessToken");
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

const fetcher = (url: string) =>
  fetch(url, { credentials: "include" }).then((res) => {
    if (!res.ok) {
      return res.json().then((err) => Promise.reject(err));
    }
    return res.json();
  });

export default function GlassStoreExpenses() {
  const { user } = useAuthStore();
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState<number>(0);
  const [category, setCategory] = useState<ExpenseCategory>("other");
  const [subcategory, setSubcategory] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [receiptNumber, setReceiptNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<ExpenseStatus>("pending");
  const [tags, setTags] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [filterStartDate, setFilterStartDate] = useState<Date | undefined>();
  const [filterEndDate, setFilterEndDate] = useState<Date | undefined>();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState<ExpenseCategory | "all">(
    "all"
  );
  const [filterStatus, setFilterStatus] = useState<ExpenseStatus | "all">(
    "all"
  );
  const [currentExpense, setCurrentExpense] = useState<Expense | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [sorting, setSorting] = useState<SortingState>([
    { id: "date", desc: true },
  ]);

  // Construct API URL with filters
  const apiUrl = useMemo(() => {
    const params = new URLSearchParams();

    if (filterStartDate) {
      params.append("startDate", filterStartDate.toISOString());
    }
    if (filterEndDate) {
      params.append("endDate", filterEndDate.toISOString());
    }
    if (filterCategory !== "all") {
      params.append("category", filterCategory);
    }
    if (filterStatus !== "all") {
      params.append("status", filterStatus);
    }
    if (searchTerm) {
      params.append("search", searchTerm);
    }

    return `/api/finance/expenses?${params.toString()}`;
  }, [
    filterStartDate,
    filterEndDate,
    filterCategory,
    filterStatus,
    searchTerm,
  ]);

  const { data: expenses, isLoading } = useSWR<Expense[]>(apiUrl, fetcher);

  // Define columns for TanStack Table
  const columns: ColumnDef<Expense>[] = [
    {
      accessorKey: "date",
      header: "Date",
      cell: ({ row }) => {
        return format(new Date(row.original.date), "MMM d, yy");
      },
      sortingFn: "datetime",
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => {
        return (
          <div className="max-w-[120px] sm:max-w-[200px] truncate">
            <div className="font-medium">{row.original.description}</div>
            {row.original.receiptNumber && (
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Receipt className="h-3 w-3" />
                {row.original.receiptNumber}
              </div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "category",
      header: "Category",
      cell: ({ row }) => {
        const categoryData = EXPENSE_CATEGORIES.find(
          (c) => c.value === row.original.category
        );
        return (
          <div className="max-w-25 truncate hidden sm:table-cell">
            {categoryData?.label || row.original.category}
          </div>
        );
      },
    },
    {
      accessorKey: "amount",
      header: "Amount",
      cell: ({ row }) => {
        return (
          <div className="font-semibold">
            AFN {row.original.amount.toFixed(2)}
          </div>
        );
      },
    },
    {
      accessorKey: "paymentMethod",
      header: "Payment",
      cell: ({ row }) => {
        const methodData = PAYMENT_METHODS.find(
          (m) => m.value === row.original.paymentMethod
        );
        return (
          <div className="max-w-[80px] truncate hidden md:table-cell">
            {methodData?.label || row.original.paymentMethod}
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const statusData = EXPENSE_STATUSES.find(
          (s) => s.value === row.original.status
        );
        return (
          <Badge className={`${statusData?.color} capitalize`}>
            {statusData?.label || row.original.status}
          </Badge>
        );
      },
    },
    {
      accessorKey: "recordedBy",
      header: "Recorded By",
      cell: ({ row }) => {
        return (
          <div className="max-w-[100px] truncate hidden lg:table-cell">
            {row.original.recordedBy?.name || "-"}
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const canEdit =
          user?.role === "admin" ||
          (user?.role === "staff" && row.original.status === "pending");

        return (
          <div className="flex gap-1 sm:gap-2">
            {canEdit && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 sm:h-8 sm:w-8"
                onClick={() => handleEditClick(row.original)}
              >
                <PencilIcon className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
            )}
            {user?.role === "admin" && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 sm:h-8 sm:w-8"
                onClick={() => handleDeleteClick(row.original._id)}
                disabled={isDeleting}
              >
                <TrashIcon className="h-3 w-3 sm:h-4 sm:w-4 text-red-500" />
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  const filteredExpenses = useMemo<Expense[]>(() => {
    if (!expenses) return [];
    return expenses;
  }, [expenses]);

  // Setup TanStack Table with pagination
  const table = useReactTable({
    data: filteredExpenses,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  const totalExpenses = useMemo<number>(
    () =>
      Array.isArray(filteredExpenses)
        ? filteredExpenses.reduce(
            (sum: number, expense: Expense) => sum + (expense?.amount || 0),
            0
          )
        : 0,
    [filteredExpenses]
  );

  const pendingExpenses = useMemo<number>(
    () =>
      Array.isArray(filteredExpenses)
        ? filteredExpenses.filter((e) => e.status === "pending").length
        : 0,
    [filteredExpenses]
  );

  const approvedExpenses = useMemo<number>(
    () =>
      Array.isArray(filteredExpenses)
        ? filteredExpenses
            .filter((e) => e.status === "approved")
            .reduce((sum, expense) => sum + (expense?.amount || 0), 0)
        : 0,
    [filteredExpenses]
  );

  const paidExpenses = useMemo<number>(
    () =>
      Array.isArray(filteredExpenses)
        ? filteredExpenses
            .filter((e) => e.status === "paid")
            .reduce((sum, expense) => sum + (expense?.amount || 0), 0)
        : 0,
    [filteredExpenses]
  );

  const resetForm = (): void => {
    setDate(new Date());
    setDescription("");
    setAmount(0);
    setCategory("other");
    setSubcategory("");
    setPaymentMethod("cash");
    setReceiptNumber("");
    setNotes("");
    setStatus("pending");
    setTags("");
    setCurrentExpense(null);
  };

  const handleEditClick = (expense: Expense): void => {
    setCurrentExpense(expense);
    setDate(new Date(expense.date));
    setDescription(expense.description);
    setAmount(expense.amount);
    setCategory(expense.category);
    setSubcategory(expense.subcategory || "");
    setPaymentMethod(expense.paymentMethod);
    setReceiptNumber(expense.receiptNumber || "");
    setNotes(expense.notes || "");
    setStatus(expense.status);
    setTags(expense.tags?.join(", ") || "");
    setDialogOpen(true);
  };

  const handleDeleteClick = async (id: string): Promise<void> => {
    if (!confirm("Are you sure you want to delete this expense?")) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/finance/expenses/${id}`, {
        method: "DELETE",
        credentials: "include",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error("Failed to delete expense");
      }

      toast.success("Expense deleted successfully");
      mutate(apiUrl);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Delete failed");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleStatusChange = async (
    id: string,
    newStatus: ExpenseStatus
  ): Promise<void> => {
    if (!confirm(`Are you sure you want to mark this expense as ${newStatus}?`))
      return;

    try {
      const response = await fetch(`/api/finance/expenses/${id}/status`, {
        method: "PATCH",
        credentials: "include",
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error("Failed to update expense status");
      }

      toast.success(`Expense marked as ${newStatus}`);
      mutate(apiUrl);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Update failed");
    }
  };

  const handleSubmit = async (): Promise<void> => {
    if (!date || !description || amount <= 0) {
      toast.error("Please fill all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      const expenseData = {
        date,
        description,
        amount,
        category,
        subcategory: subcategory || undefined,
        paymentMethod,
        receiptNumber: receiptNumber || undefined,
        notes: notes || undefined,
        status: user?.role === "admin" ? status : "pending",
        tags: tags
          .split(",")
          .map((tag) => tag.trim())
          .filter((tag) => tag),
      };

      const url = currentExpense
        ? `/api/finance/expenses/${currentExpense._id}`
        : "/api/finance/expenses";

      const method = currentExpense ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        credentials: "include",
        headers: getAuthHeaders(),
        body: JSON.stringify(expenseData),
      });

      if (!response.ok) {
        throw new Error(
          currentExpense
            ? "Failed to update expense"
            : "Failed to create expense"
        );
      }

      toast.success(
        `Expense ${currentExpense ? "updated" : "created"} successfully`
      );
      setDialogOpen(false);
      mutate(apiUrl);
      resetForm();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExport = async (): Promise<void> => {
    try {
      const response = await fetch(`${apiUrl}&export=csv`, {
        credentials: "include",
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error("Failed to export");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `expenses-${format(new Date(), "yyyy-MM-dd")}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Expenses exported successfully");
    } catch (error) {
      toast.error("Failed to export expenses");
    }
  };

  // Function to generate pagination items
  const generatePaginationItems = () => {
    const currentPage = table.getState().pagination.pageIndex + 1;
    const pageCount = table.getPageCount();
    const items = [];

    // Previous button
    items.push(
      <PaginationItem key="prev">
        <PaginationPrevious
          onClick={() => table.previousPage()}
          className={
            !table.getCanPreviousPage()
              ? "pointer-events-none opacity-50"
              : "cursor-pointer"
          }
        />
      </PaginationItem>
    );

    // Page numbers with ellipsis for many pages
    if (pageCount <= 6) {
      // Show all pages if there are 6 or fewer
      for (let i = 1; i <= pageCount; i++) {
        items.push(
          <PaginationItem key={i}>
            <PaginationLink
              onClick={() => table.setPageIndex(i - 1)}
              isActive={currentPage === i}
              className="cursor-pointer"
            >
              {i}
            </PaginationLink>
          </PaginationItem>
        );
      }
    } else {
      // Always show first page
      items.push(
        <PaginationItem key={1}>
          <PaginationLink
            onClick={() => table.setPageIndex(0)}
            isActive={currentPage === 1}
            className="cursor-pointer"
          >
            1
          </PaginationLink>
        </PaginationItem>
      );

      // Show ellipsis if current page is beyond 3
      if (currentPage > 3) {
        items.push(
          <PaginationItem key="ellipsis-start">
            <PaginationEllipsis />
          </PaginationItem>
        );
      }

      // Calculate which page numbers to show
      let startPage = Math.max(2, currentPage - 1);
      let endPage = Math.min(pageCount - 1, currentPage + 1);

      // Adjust if we're near the start or end
      if (currentPage <= 3) {
        endPage = 4;
      } else if (currentPage >= pageCount - 2) {
        startPage = pageCount - 3;
      }

      // Show the calculated page numbers
      for (let i = startPage; i <= endPage; i++) {
        items.push(
          <PaginationItem key={i}>
            <PaginationLink
              onClick={() => table.setPageIndex(i - 1)}
              isActive={currentPage === i}
              className="cursor-pointer"
            >
              {i}
            </PaginationLink>
          </PaginationItem>
        );
      }

      // Show ellipsis if current page is not near the end
      if (currentPage < pageCount - 2) {
        items.push(
          <PaginationItem key="ellipsis-end">
            <PaginationEllipsis />
          </PaginationItem>
        );
      }

      // Always show last page
      items.push(
        <PaginationItem key={pageCount}>
          <PaginationLink
            onClick={() => table.setPageIndex(pageCount - 1)}
            isActive={currentPage === pageCount}
            className="cursor-pointer"
          >
            {pageCount}
          </PaginationLink>
        </PaginationItem>
      );
    }

    // Next button
    items.push(
      <PaginationItem key="next">
        <PaginationNext
          onClick={() => table.nextPage()}
          className={
            !table.getCanNextPage()
              ? "pointer-events-none opacity-50"
              : "cursor-pointer"
          }
        />
      </PaginationItem>
    );

    return items;
  };

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 max-w-7xl">
      {/* Header - Responsive */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Expense Management</h1>
          <p className="text-sm text-muted-foreground">
            Track and manage all glass store expenses
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            onClick={handleExport}
            className="flex-1 sm:flex-none"
          >
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button
            onClick={() => {
              resetForm();
              setDialogOpen(true);
            }}
            className="flex-1 sm:flex-none"
          >
            <PlusIcon className="mr-2 h-4 w-4" />
            Add Expense
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4 sm:p-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Expenses
                </p>
                <h3 className="text-lg sm:text-2xl font-bold mt-2">
                  AFN {totalExpenses.toFixed(2)}
                </h3>
              </div>
              <Receipt className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4 sm:p-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Pending Approval
                </p>
                <h3 className="text-lg sm:text-2xl font-bold mt-2">
                  {pendingExpenses} expenses
                </h3>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4 sm:p-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Approved
                </p>
                <h3 className="text-lg sm:text-2xl font-bold mt-2">
                  AFN {approvedExpenses.toFixed(2)}
                </h3>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4 sm:p-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Paid
                </p>
                <h3 className="text-lg sm:text-2xl font-bold mt-2">
                  AFN {paidExpenses.toFixed(2)}
                </h3>
              </div>
              <Receipt className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Card - Responsive */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="text-sm sm:text-base">
              Filter Expenses
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setFilterStartDate(undefined);
                setFilterEndDate(undefined);
                setFilterCategory("all");
                setFilterStatus("all");
                setSearchTerm("");
              }}
            >
              Clear Filters
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search Input */}
            <div className="lg:col-span-2">
              <Label className="text-sm font-medium mb-2 block">Search</Label>
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by description, receipt..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Category Filter */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Category</Label>
              <Select
                value={filterCategory}
                onValueChange={(value: ExpenseCategory | "all") =>
                  setFilterCategory(value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {EXPENSE_CATEGORIES.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Status</Label>
              <Select
                value={filterStatus}
                onValueChange={(value: ExpenseStatus | "all") =>
                  setFilterStatus(value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {EXPENSE_STATUSES.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Range */}
            <div className="sm:col-span-2 lg:col-span-2">
              <Label className="text-sm font-medium mb-2 block">
                Date Range
              </Label>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "flex-1 justify-start text-left font-normal",
                        !filterStartDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filterStartDate
                        ? format(filterStartDate, "MMM d")
                        : "Start"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={filterStartDate}
                      onSelect={setFilterStartDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <span className="flex items-center">-</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "flex-1 justify-start text-left font-normal",
                        !filterEndDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filterEndDate ? format(filterEndDate, "MMM d") : "End"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={filterEndDate}
                      onSelect={setFilterEndDate}
                      initialFocus
                      disabled={(date) =>
                        filterStartDate ? date < filterStartDate : false
                      }
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table Section */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        className="whitespace-nowrap"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                        {{
                          asc: " ↑",
                          desc: " ↓",
                        }[header.column.getIsSorted() as string] ?? null}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="text-center py-8"
                    >
                      <div className="space-y-2">
                        <Skeleton className="h-8 w-full" />
                        <Skeleton className="h-8 w-full" />
                        <Skeleton className="h-8 w-full" />
                      </div>
                    </TableCell>
                  </TableRow>
                ) : table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && "selected"}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
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
                      colSpan={columns.length}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No expenses found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
        <div className="text-sm text-muted-foreground">
          Showing {table.getRowModel().rows.length} of {filteredExpenses.length}{" "}
          expenses
        </div>

        <Pagination>
          <PaginationContent>{generatePaginationItems()}</PaginationContent>
        </Pagination>

        <div className="flex items-center space-x-2">
          <p className="text-sm font-medium">Rows per page</p>
          <Select
            value={`${table.getState().pagination.pageSize}`}
            onValueChange={(value) => {
              table.setPageSize(Number(value));
            }}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue placeholder={table.getState().pagination.pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {[10, 20, 30, 40, 50].map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Expense Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {currentExpense ? "Edit Expense" : "Add New Expense"}
            </DialogTitle>
            <DialogDescription>
              {currentExpense
                ? "Update expense details"
                : "Add a new expense to the system"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Basic Information */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Date */}
              <div className="space-y-2">
                <Label htmlFor="date">Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (AFN) *</Label>
                <Input
                  id="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                />
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select
                  value={category}
                  onValueChange={(value: ExpenseCategory) => {
                    setCategory(value);
                    setSubcategory(""); // Reset subcategory when category changes
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Subcategory */}
              <div className="space-y-2">
                <Label htmlFor="subcategory">Subcategory</Label>
                <Select
                  value={subcategory}
                  onValueChange={setSubcategory}
                  disabled={!category}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select subcategory" />
                  </SelectTrigger>
                  <SelectContent>
                    {SUBCATEGORIES[category]?.map((subcat) => (
                      <SelectItem key={subcat.value} value={subcat.value}>
                        {subcat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Description and Payment */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Description */}
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="description">Description *</Label>
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter expense description"
                />
              </div>

              {/* Payment Method */}
              <div className="space-y-2">
                <Label htmlFor="paymentMethod">Payment Method *</Label>
                <Select
                  value={paymentMethod}
                  onValueChange={(value: PaymentMethod) =>
                    setPaymentMethod(value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((method) => (
                      <SelectItem key={method.value} value={method.value}>
                        {method.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Receipt Number */}
              <div className="space-y-2">
                <Label htmlFor="receiptNumber">Receipt Number</Label>
                <Input
                  id="receiptNumber"
                  value={receiptNumber}
                  onChange={(e) => setReceiptNumber(e.target.value)}
                  placeholder="Optional"
                />
              </div>
            </div>

            {/* Status and Tags (Admin only) */}
            {user?.role === "admin" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Status */}
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={status}
                    onValueChange={(value: ExpenseStatus) => setStatus(value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPENSE_STATUSES.map((stat) => (
                        <SelectItem key={stat.value} value={stat.value}>
                          {stat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Tags */}
                <div className="space-y-2">
                  <Label htmlFor="tags">Tags</Label>
                  <Input
                    id="tags"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="urgent, monthly, recurring (comma separated)"
                  />
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes about this expense"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDialogOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting
                ? "Processing..."
                : currentExpense
                ? "Update Expense"
                : "Add Expense"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
