// app/laboratory/expenses/page.tsx

"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CalendarIcon,
  SearchIcon,
  MoreVerticalIcon,
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
} from "@/components/ui/dialog";
import { useAuthStore } from "@/store/useAuthStore";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

// Import TanStack Table components and hooks
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";

// Define types based on laboratory expense categories :cite[1]:cite[8]
interface Expense {
  _id: string;
  date: string;
  description: string;
  amount: number;
  category:
    | "supplies"
    | "equipment"
    | "personnel"
    | "maintenance"
    | "utilities"
    | "other";
  expenseType: "normal" | "doctor_salary";
  doctorName?: string;
  fromDate?: string;
  toDate?: string;
  percentage?: number;
  calculatedFromRecords?: number;
  recordedBy?: {
    name: string;
    _id: string;
  };
}

interface ExpensesResponse {
  expenses: Expense[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalRecords: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

interface User {
  name: string;
  _id: string;
}

interface AuthStore {
  user: User | null;
}

// Laboratory-specific expense categories :cite[8]
const EXPENSE_CATEGORIES = [
  { value: "supplies", label: "Lab Supplies" },
  { value: "equipment", label: "Equipment" },
  { value: "personnel", label: "Personnel" },
  { value: "maintenance", label: "Maintenance" },
  { value: "utilities", label: "Utilities" },
  { value: "other", label: "Other" },
] as const;

const EXPENSE_TYPES = [
  { value: "normal", label: "Normal Expense" },
  { value: "doctor_salary", label: "Doctor Salary" },
];

// Fetch expenses with TanStack Query
const fetchExpenses = async (params: {
  startDate?: string;
  endDate?: string;
  page: number;
  pageSize: number;
}): Promise<ExpensesResponse> => {
  const queryString = new URLSearchParams();
  if (params.startDate) queryString.append("startDate", params.startDate);
  if (params.endDate) queryString.append("endDate", params.endDate);
  queryString.append("page", params.page.toString());
  queryString.append("limit", params.pageSize.toString());

  const response = await fetch(
    `/api/laboratory/expenses?${queryString.toString()}`
  );
  if (!response.ok) {
    throw new Error("Failed to fetch expenses");
  }
  return response.json();
};

export default function LaboratoryExpenses() {
  const { user } = useAuthStore() as AuthStore;
  const queryClient = useQueryClient();

  // State for filters and form
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState<number>(0);
  const [category, setCategory] = useState<Expense["category"]>("supplies");
  const [expenseType, setExpenseType] = useState<"normal" | "doctor_salary">(
    "normal"
  );
  const [doctorName, setDoctorName] = useState("");
  const [fromDate, setFromDate] = useState<Date | undefined>();
  const [toDate, setToDate] = useState<Date | undefined>();
  const [percentage, setPercentage] = useState<number>(100);
  const [calculatedAmount, setCalculatedAmount] = useState<number>(0);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [filterStartDate, setFilterStartDate] = useState<Date | undefined>();
  const [filterEndDate, setFilterEndDate] = useState<Date | undefined>();
  const [searchTerm, setSearchTerm] = useState("");
  const [currentExpense, setCurrentExpense] = useState<Expense | null>(null);

  // TanStack Table pagination state
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  // TanStack Query for data fetching
  const {
    data: response,
    error,
    isLoading,
    isError,
  } = useQuery({
    queryKey: [
      "expenses",
      filterStartDate?.toISOString(),
      filterEndDate?.toISOString(),
      pagination.pageIndex,
      pagination.pageSize,
    ],
    queryFn: () =>
      fetchExpenses({
        startDate: filterStartDate?.toISOString(),
        endDate: filterEndDate?.toISOString(),
        page: pagination.pageIndex + 1,
        pageSize: pagination.pageSize,
      }),
    staleTime: 5 * 60 * 1000,
  });

  // Mutations for CRUD operations
  const createExpenseMutation = useMutation({
    mutationFn: (expenseData: any) =>
      fetch("/api/laboratory/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(expenseData),
      }).then((res) => {
        if (!res.ok) throw new Error("Failed to create expense");
        return res.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast.success("Expense created successfully");
      setDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create expense");
    },
  });

  const updateExpenseMutation = useMutation({
    mutationFn: ({ id, expenseData }: { id: string; expenseData: any }) =>
      fetch(`/api/laboratory/expenses?id=${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(expenseData),
      }).then((res) => {
        if (!res.ok) throw new Error("Failed to update expense");
        return res.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast.success("Expense updated successfully");
      setDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update expense");
    },
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/laboratory/expenses?id=${id}`, {
        method: "DELETE",
      }).then((res) => {
        if (!res.ok) throw new Error("Failed to delete expense");
        return res.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast.success("Expense deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete expense");
    },
  });

  const expenses = response?.expenses || [];
  const serverPagination = response?.pagination;

  // Define responsive columns for TanStack Table
  const columns: ColumnDef<Expense>[] = useMemo(
    () => [
      {
        accessorKey: "date",
        header: () => <span className="text-xs sm:text-sm">Date</span>,
        cell: ({ row }) => {
          return (
            <span className="text-xs sm:text-sm whitespace-nowrap">
              {format(new Date(row.original.date), "MMM dd, yyyy")}
            </span>
          );
        },
      },
      {
        accessorKey: "description",
        header: () => <span className="text-xs sm:text-sm">Description</span>,
        cell: ({ row }) => {
          return (
            <div className="max-w-[120px] sm:max-w-[200px] truncate text-xs sm:text-sm">
              {row.original.description}
            </div>
          );
        },
      },
      {
        accessorKey: "category",
        header: () => (
          <span className="text-xs sm:text-sm hidden sm:table-cell">
            Category
          </span>
        ),
        cell: ({ row }) => {
          const categoryLabel =
            EXPENSE_CATEGORIES.find(
              (cat) => cat.value === row.original.category
            )?.label || row.original.category;
          return (
            <div className="hidden sm:table-cell">
              <Badge variant="secondary" className="text-xs">
                {categoryLabel}
              </Badge>
            </div>
          );
        },
      },
      {
        accessorKey: "amount",
        header: () => <span className="text-xs sm:text-sm">Amount</span>,
        cell: ({ row }) => {
          return (
            <span className="text-xs sm:text-sm font-medium whitespace-nowrap">
              AFN {row.original.amount.toFixed(2)}
            </span>
          );
        },
      },
      {
        id: "actions",
        header: () => <span className="text-xs sm:text-sm">Actions</span>,
        cell: ({ row }) => {
          return (
            <div className="flex space-x-1 sm:space-x-2">
              {/* Mobile dropdown menu */}
              <div className="block sm:hidden">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <MoreVerticalIcon className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="text-xs">
                    <DropdownMenuItem
                      onClick={() => handleEditClick(row.original)}
                    >
                      <PencilIcon className="h-3 w-3 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDeleteClick(row.original._id)}
                      className="text-red-600"
                    >
                      <TrashIcon className="h-3 w-3 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Desktop buttons */}
              <div className="hidden sm:flex space-x-1 sm:space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEditClick(row.original)}
                  className="h-6 w-6 sm:h-8 sm:w-8 p-0"
                >
                  <PencilIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDeleteClick(row.original._id)}
                  disabled={deleteExpenseMutation.isPending}
                  className="h-6 w-6 sm:h-8 sm:w-8 p-0"
                >
                  <TrashIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
              </div>
            </div>
          );
        },
      },
    ],
    [deleteExpenseMutation.isPending]
  );

  // Setup TanStack Table
  const table = useReactTable({
    data: expenses,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onPaginationChange: setPagination,
    manualPagination: true,
    rowCount: serverPagination?.totalRecords,
    state: {
      pagination,
    },
    pageCount: serverPagination?.totalPages ?? -1,
  });

  // Calculate total expenses
  const totalExpenses = useMemo(
    () =>
      expenses.reduce(
        (sum: number, expense: Expense) => sum + (expense?.amount || 0),
        0
      ),
    [expenses]
  );

  // Reset form function
  const resetForm = (): void => {
    setDate(new Date());
    setDescription("");
    setAmount(0);
    setCategory("supplies");
    setExpenseType("normal");
    setDoctorName("");
    setFromDate(undefined);
    setToDate(undefined);
    setPercentage(100);
    setCalculatedAmount(0);
    setCurrentExpense(null);
  };

  const handleEditClick = (expense: Expense): void => {
    setCurrentExpense(expense);
    setDate(new Date(expense.date));
    setDescription(expense.description);
    setAmount(expense.amount);
    setCategory(expense.category);
    setExpenseType(expense.expenseType);
    setDoctorName(expense.doctorName || "");
    setFromDate(expense.fromDate ? new Date(expense.fromDate) : undefined);
    setToDate(expense.toDate ? new Date(expense.toDate) : undefined);
    setPercentage(expense.percentage || 100);
    setCalculatedAmount(expense.calculatedFromRecords || 0);
    setDialogOpen(true);
  };

  const handleDeleteClick = async (id: string): Promise<void> => {
    if (!confirm("Are you sure you want to delete this expense?")) return;
    deleteExpenseMutation.mutate(id);
  };

  const handleSubmit = async (): Promise<void> => {
    if (!date || !description || amount <= 0) {
      toast.error("Please fill all required fields");
      return;
    }

    if (
      expenseType === "doctor_salary" &&
      (!fromDate || !toDate || !doctorName)
    ) {
      toast.error("Please select date range and doctor name");
      return;
    }

    const expenseData = {
      date,
      description,
      amount,
      category,
      expenseType,
      doctorName: expenseType === "doctor_salary" ? doctorName : undefined,
      fromDate: expenseType === "doctor_salary" ? fromDate : undefined,
      toDate: expenseType === "doctor_salary" ? toDate : undefined,
      percentage: expenseType === "doctor_salary" ? percentage : undefined,
      calculatedFromRecords:
        expenseType === "doctor_salary" ? calculatedAmount : undefined,
    };

    if (currentExpense) {
      updateExpenseMutation.mutate({ id: currentExpense._id, expenseData });
    } else {
      createExpenseMutation.mutate(expenseData);
    }
  };

  // Mobile card view component
  const MobileExpenseCard = ({ expense }: { expense: Expense }) => {
    const categoryLabel =
      EXPENSE_CATEGORIES.find((cat) => cat.value === expense.category)?.label ||
      expense.category;

    return (
      <Card className="mb-3 p-3">
        <CardContent className="p-0 space-y-2">
          <div className="flex justify-between items-start">
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  {format(new Date(expense.date), "MMM dd, yyyy")}
                </span>
                <Badge variant="secondary" className="text-xs">
                  {categoryLabel}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {expense.description}
              </p>
              {expense.doctorName && (
                <p className="text-xs text-muted-foreground">
                  Doctor: {expense.doctorName}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-sm font-bold">
                AFN {expense.amount.toFixed(2)}
              </p>
              <div className="flex space-x-1 mt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEditClick(expense)}
                  className="h-6 w-6 p-0"
                >
                  <PencilIcon className="h-3 w-3" />
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDeleteClick(expense._id)}
                  disabled={deleteExpenseMutation.isPending}
                  className="h-6 w-6 p-0"
                >
                  <TrashIcon className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const isSubmitting =
    createExpenseMutation.isPending || updateExpenseMutation.isPending;

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-4">
        <h1 className="text-xl sm:text-2xl font-bold">Laboratory Expenses</h1>
        <Button
          onClick={() => {
            resetForm();
            setDialogOpen(true);
          }}
          className="w-full sm:w-auto text-xs sm:text-sm"
        >
          <PlusIcon className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
          Add Expense
        </Button>
      </div>

      {/* Filter Card */}
      <Card className="mb-4 sm:mb-6">
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="text-sm sm:text-base">
            Filter Expenses
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search Input */}
            <div className="relative">
              <Label className="text-sm font-medium mb-2 block">Search</Label>
              <SearchIcon className="absolute left-3 top-8 h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
              <Input
                placeholder="Search expenses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 sm:pl-9 text-xs sm:text-sm"
              />
            </div>

            {/* Start Date Filter */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal text-xs sm:text-sm",
                      !filterStartDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                    {filterStartDate ? (
                      format(filterStartDate, "MMM dd, yyyy")
                    ) : (
                      <span>Pick a date</span>
                    )}
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
            </div>

            {/* End Date Filter */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal text-xs sm:text-sm",
                      !filterEndDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                    {filterEndDate ? (
                      format(filterEndDate, "MMM dd, yyyy")
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={filterEndDate}
                    onSelect={setFilterEndDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Clear Filters Button */}
            <div className="flex items-end">
              <Button
                variant="secondary"
                className="w-full text-xs sm:text-sm"
                onClick={() => {
                  setFilterStartDate(undefined);
                  setFilterEndDate(undefined);
                  setSearchTerm("");
                  table.setPageIndex(0);
                }}
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Total Expenses Card */}
      <Card className="mb-4 sm:mb-6 hover:shadow-md transition-shadow">
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <h3 className="text-sm sm:text-lg font-medium text-muted-foreground">
              Total Expenses
            </h3>
            <p className="text-lg sm:text-2xl font-bold">
              AFN {totalExpenses.toFixed(2)}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Desktop Table View (hidden on mobile) */}
      <div className="hidden sm:block border rounded-lg overflow-hidden mb-4">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className="text-xs sm:text-sm whitespace-nowrap p-2 sm:p-4"
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
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="text-center py-4"
                  >
                    <Skeleton className="h-8 sm:h-10 w-full" />
                  </TableCell>
                </TableRow>
              ) : table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
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
                    colSpan={columns.length}
                    className="text-center py-8 text-xs sm:text-sm text-muted-foreground"
                  >
                    No expenses found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Mobile Card View (shown only on mobile) */}
      <div className="sm:hidden space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} className="p-3">
              <CardContent className="p-0 space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-16" />
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-16" />
                  <div className="flex space-x-1">
                    <Skeleton className="h-6 w-6" />
                    <Skeleton className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : expenses.length > 0 ? (
          expenses.map((expense) => (
            <MobileExpenseCard key={expense._id} expense={expense} />
          ))
        ) : (
          <Card className="p-6 text-center">
            <CardContent>
              <p className="text-sm text-muted-foreground">No expenses found</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Pagination Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
        <div className="text-sm text-muted-foreground">
          Showing {table.getRowModel().rows.length} of{" "}
          {serverPagination?.totalRecords || 0} expenses
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="text-xs"
          >
            Previous
          </Button>

          <div className="flex items-center gap-1">
            {Array.from(
              { length: Math.min(5, table.getPageCount()) },
              (_, i) => {
                const pageNumber = i + 1;
                return (
                  <Button
                    key={pageNumber}
                    variant={pagination.pageIndex === i ? "default" : "outline"}
                    size="sm"
                    onClick={() => table.setPageIndex(i)}
                    className="text-xs h-8 w-8 p-0"
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
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="text-xs"
          >
            Next
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          <p className="text-sm font-medium hidden sm:block">Rows per page</p>
          <select
            value={pagination.pageSize}
            onChange={(e) => {
              table.setPageSize(Number(e.target.value));
            }}
            className="h-8 w-[70px] rounded-md border border-input bg-background px-3 py-1 text-sm"
          >
            {[10, 20, 30, 50, 100].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Expense Form Dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open: boolean) => {
          if (!open) {
            resetForm();
          }
          setDialogOpen(open);
        }}
      >
        <DialogContent className="w-[95vw] max-w-md sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">
              {currentExpense ? "Edit Expense" : "Add New Expense"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Date Field */}
            <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
              <Label className="text-left sm:text-right text-sm font-medium">
                Date*
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "col-span-1 sm:col-span-3 justify-start text-left font-normal text-xs sm:text-sm",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
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

            {/* Description Input */}
            <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
              <Label className="text-left sm:text-right text-sm font-medium">
                Description*
              </Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="col-span-1 sm:col-span-3 text-xs sm:text-sm"
                placeholder="Enter expense description"
              />
            </div>

            {/* Amount Input */}
            <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
              <Label className="text-left sm:text-right text-sm font-medium">
                Amount (AFN)*
              </Label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                min="0"
                step="0.01"
                className="col-span-1 sm:col-span-3 text-xs sm:text-sm"
                placeholder="0.00"
              />
            </div>

            {/* Category Select */}
            <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
              <Label className="text-left sm:text-right text-sm font-medium">
                Category*
              </Label>
              <Select
                value={category}
                onValueChange={(value: Expense["category"]) =>
                  setCategory(value)
                }
              >
                <SelectTrigger className="col-span-1 sm:col-span-3 text-xs sm:text-sm">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <SelectItem
                      key={cat.value}
                      value={cat.value}
                      className="text-xs sm:text-sm"
                    >
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Expense Type Select */}
            <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
              <Label className="text-left sm:text-right text-sm font-medium">
                Expense Type
              </Label>
              <Select
                value={expenseType}
                onValueChange={(value: "normal" | "doctor_salary") =>
                  setExpenseType(value)
                }
              >
                <SelectTrigger className="col-span-1 sm:col-span-3 text-xs sm:text-sm">
                  <SelectValue placeholder="Select expense type" />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_TYPES.map((type) => (
                    <SelectItem
                      key={type.value}
                      value={type.value}
                      className="text-xs sm:text-sm"
                    >
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Doctor Salary Specific Fields */}
            {expenseType === "doctor_salary" && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                  <Label className="text-left sm:text-right text-sm font-medium">
                    Doctor Name*
                  </Label>
                  <Input
                    value={doctorName}
                    onChange={(e) => setDoctorName(e.target.value)}
                    className="col-span-1 sm:col-span-3 text-xs sm:text-sm"
                    placeholder="Enter doctor name"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                  <Label className="text-left sm:text-right text-sm font-medium">
                    From Date*
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "col-span-1 sm:col-span-3 justify-start text-left font-normal text-xs sm:text-sm",
                          !fromDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                        {fromDate ? (
                          format(fromDate, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={fromDate}
                        onSelect={setFromDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                  <Label className="text-left sm:text-right text-sm font-medium">
                    To Date*
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "col-span-1 sm:col-span-3 justify-start text-left font-normal text-xs sm:text-sm",
                          !toDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                        {toDate ? (
                          format(toDate, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={toDate}
                        onSelect={setToDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                  <Label className="text-left sm:text-right text-sm font-medium">
                    Percentage (%)
                  </Label>
                  <Input
                    type="number"
                    value={percentage}
                    onChange={(e) =>
                      setPercentage(parseInt(e.target.value) || 0)
                    }
                    min="0"
                    max="100"
                    className="col-span-1 sm:col-span-3 text-xs sm:text-sm"
                    placeholder="100"
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto text-xs sm:text-sm"
              onClick={() => {
                setDialogOpen(false);
                resetForm();
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="w-full sm:w-auto text-xs sm:text-sm"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
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
