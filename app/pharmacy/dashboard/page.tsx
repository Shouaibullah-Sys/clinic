// app/pharmacy/dashboard/page.tsx
"use client";
import { useState, useMemo } from "react";
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
  ChevronLeftIcon,
  ChevronRightIcon,
  EditIcon,
  TrashIcon,
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
import { useAuthStore } from "@/store/useAuthStore";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  flexRender,
  ColumnDef,
} from "@tanstack/react-table";

// Types
type DashboardStats = {
  totalSales: number;
  cashSales: number;
  cardSales: number;
  insuranceSales: number;
  totalExpenses: number;
  inventoryValue: number;
  lowStockItems: number;
};

type LowStockItem = {
  _id: string;
  name: string;
  batchNumber: string;
  currentQuantity: number;
  originalQuantity: number;
  remainingPercentage: number;
};

type MedicineStock = {
  _id: string;
  name: string;
  batchNumber: string;
  expiryDate: string;
  currentQuantity: number;
  originalQuantity: number;
  unitPrice: number;
  sellingPrice: number;
  supplier: string;
};

type RecentPrescription = {
  _id: string;
  invoiceNumber: string;
  patientName: string;
  totalAmount: number;
  paymentMethod: string;
  createdAt: string;
  status: string;
};

type RecentExpense = {
  _id: string;
  amount: number;
  category: string;
  description: string;
  date: string;
};

// Fetcher function with timeout and error handling
const fetcher = async (url: string) => {
  try {
    // Add timeout to prevent hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000); // 25 second timeout (increased for optimized queries)

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      // Handle different error types
      if (response.status === 401) {
        throw new Error("Unauthorized access");
      } else if (response.status === 403) {
        throw new Error("Access forbidden");
      } else if (response.status >= 500) {
        throw new Error(`Server error: ${response.status}`);
      } else {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    }

    const contentType = response.headers.get("content-type");
    if (contentType && contentType.indexOf("application/json") !== -1) {
      const data = await response.json();
      return data;
    } else {
      throw new Error("Response is not JSON");
    }
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        console.error(`Request timeout for ${url}`);
        throw new Error("Request timeout - please check your connection");
      }
    }
    console.error(`Error fetching ${url}:`, error);
    throw error;
  }
};

// Table Pagination Component
function TablePagination({ table }: { table: any }) {
  return (
    <div className="flex items-center justify-end space-x-2 py-4">
      <Button
        variant="outline"
        size="sm"
        onClick={() => table.previousPage()}
        disabled={!table.getCanPreviousPage()}
      >
        <ChevronLeftIcon className="h-4 w-4" />
      </Button>
      <span className="text-sm font-medium">
        Page {table.getState().pagination.pageIndex + 1} of{" "}
        {table.getPageCount()}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={() => table.nextPage()}
        disabled={!table.getCanNextPage()}
      >
        <ChevronRightIcon className="h-4 w-4" />
      </Button>
    </div>
  );
}

// Mobile Card Components
function MobilePrescriptionCard({
  prescription,
}: {
  prescription: RecentPrescription;
}) {
  return (
    <Card className="mb-3 p-3">
      <CardContent className="p-0 space-y-2">
        <div className="flex justify-between items-start">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                {prescription.patientName}
              </span>
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
            </div>
            <p className="text-xs text-muted-foreground">
              Invoice: {prescription.invoiceNumber}
            </p>
            <p className="text-xs text-muted-foreground">
              {format(new Date(prescription.createdAt), "MMM d, yyyy")}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold">
              AFN {prescription.totalAmount.toFixed(2)}
            </p>
            <Badge variant="outline" className="text-xs capitalize mt-1">
              {prescription.paymentMethod}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MobileExpenseCard({ expense }: { expense: RecentExpense }) {
  return (
    <Card className="mb-3 p-3">
      <CardContent className="p-0 space-y-2">
        <div className="flex justify-between items-start">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{expense.category}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {expense.description}
            </p>
            <p className="text-xs text-muted-foreground">
              {format(new Date(expense.date), "MMM d, yyyy")}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-red-600">
              AFN {expense.amount.toFixed(2)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MobileMedicineCard({
  medicine,
  onEdit,
}: {
  medicine: MedicineStock;
  onEdit: (medicine: MedicineStock) => void;
}) {
  const stockPercentage =
    (medicine.currentQuantity / medicine.originalQuantity) * 100;

  return (
    <Card className="mb-3 p-3">
      <CardContent className="p-0 space-y-2">
        <div className="flex justify-between items-start">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{medicine.name}</span>
              <Badge variant="secondary" className="text-xs">
                {medicine.batchNumber}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Expires: {format(new Date(medicine.expiryDate), "MMM yyyy")}
            </p>
            <p className="text-xs text-muted-foreground">
              Stock: {medicine.currentQuantity} / {medicine.originalQuantity}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <Progress
                value={stockPercentage}
                className="w-20 h-2"
                style={
                  {
                    "--progress-indicator-color":
                      stockPercentage < 10
                        ? "#ef4444"
                        : stockPercentage < 20
                        ? "#eab308"
                        : "#22c55e",
                  } as React.CSSProperties
                }
              />
              <span className="text-xs font-medium">
                {stockPercentage.toFixed(0)}%
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="space-y-1">
              <p className="text-sm font-bold">
                AFN {medicine.sellingPrice.toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground">
                Buy: AFN {medicine.unitPrice.toFixed(2)}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(medicine)}
              className="mt-2 h-6 w-6 p-0"
            >
              <EditIcon className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Component for Prescriptions Table with TanStack React Table
function PrescriptionsTableWithPagination({
  prescriptions,
}: {
  prescriptions: RecentPrescription[];
}) {
  const columns = useMemo<ColumnDef<RecentPrescription>[]>(
    () => [
      {
        accessorKey: "patientName",
        header: "Patient",
        cell: ({ row }) => (
          <div className="text-xs sm:text-sm">
            {row.getValue("patientName")}
          </div>
        ),
      },
      {
        accessorKey: "totalAmount",
        header: "Amount",
        cell: ({ row }) => (
          <div className="text-xs sm:text-sm">
            AFN {Number(row.getValue("totalAmount")).toFixed(2)}
          </div>
        ),
      },
      {
        accessorKey: "paymentMethod",
        header: "Payment",
        cell: ({ row }) => (
          <Badge variant="outline" className="text-xs capitalize">
            {row.getValue("paymentMethod")}
          </Badge>
        ),
      },
      {
        accessorKey: "createdAt",
        header: "Date",
        cell: ({ row }) => (
          <div className="text-xs sm:text-sm">
            {format(new Date(row.getValue("createdAt")), "MMM d, yyyy")}
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge
            variant={
              row.getValue("status") === "completed"
                ? "default"
                : row.getValue("status") === "pending"
                ? "secondary"
                : "destructive"
            }
            className="text-xs"
          >
            {row.getValue("status")}
          </Badge>
        ),
      },
    ],
    []
  );

  const table = useReactTable({
    data: prescriptions,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  return (
    <>
      {/* Desktop Table View */}
      <div className="hidden sm:block">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
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
                  className="h-24 text-center"
                >
                  No prescriptions found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View */}
      <div className="sm:hidden space-y-3">
        {table.getRowModel().rows?.length ? (
          table
            .getRowModel()
            .rows.map((row) => (
              <MobilePrescriptionCard
                key={row.id}
                prescription={row.original}
              />
            ))
        ) : (
          <div className="text-center py-4 text-muted-foreground">
            No prescriptions found.
          </div>
        )}
      </div>

      {table.getPageCount() > 1 && <TablePagination table={table} />}
    </>
  );
}

// Component for Inventory Table with TanStack React Table
function InventoryTableWithPagination({
  onEditMedicine,
}: {
  onEditMedicine: (medicine: MedicineStock) => void;
}) {
  const {
    data: inventory,
    isLoading,
    mutate,
  } = useSWR("/api/pharmacy/inventory", fetcher);

  const columns = useMemo<ColumnDef<MedicineStock>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Medicine",
        cell: ({ row }) => (
          <div className="font-medium text-xs sm:text-sm">
            {row.getValue("name")}
          </div>
        ),
      },
      {
        accessorKey: "batchNumber",
        header: "Batch No.",
        cell: ({ row }) => (
          <div className="text-xs sm:text-sm">
            {row.getValue("batchNumber")}
          </div>
        ),
      },
      {
        accessorKey: "expiryDate",
        header: "Expiry",
        cell: ({ row }) => (
          <div className="text-xs sm:text-sm">
            {format(new Date(row.getValue("expiryDate")), "MMM yyyy")}
          </div>
        ),
      },
      {
        accessorKey: "currentQuantity",
        header: "Stock",
        cell: ({ row }) => {
          const medicine = row.original;
          const stockPercentage =
            (medicine.currentQuantity / medicine.originalQuantity) * 100;
          return (
            <div className="flex items-center">
              <span className="mr-2 text-xs sm:text-sm">
                {medicine.currentQuantity}
              </span>
              <Progress
                value={stockPercentage}
                className="w-24 h-2"
                style={
                  {
                    "--progress-indicator-color":
                      stockPercentage < 10
                        ? "#ef4444"
                        : stockPercentage < 20
                        ? "#eab308"
                        : "#22c55e",
                  } as React.CSSProperties
                }
              />
            </div>
          );
        },
      },
      {
        accessorKey: "unitPrice",
        header: "Unit Price",
        cell: ({ row }) => (
          <div className="text-xs sm:text-sm">
            AFN {Number(row.getValue("unitPrice")).toFixed(2)}
          </div>
        ),
      },
      {
        accessorKey: "sellingPrice",
        header: "Selling Price",
        cell: ({ row }) => (
          <div className="text-xs sm:text-sm">
            AFN {Number(row.getValue("sellingPrice")).toFixed(2)}
          </div>
        ),
      },
      {
        accessorKey: "supplier",
        header: "Supplier",
        cell: ({ row }) => (
          <div className="text-xs sm:text-sm">{row.getValue("supplier")}</div>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const handleDelete = async (id: string) => {
            if (confirm("Are you sure you want to delete this medicine?")) {
              try {
                await fetch(`/api/pharmacy/inventory/${id}`, {
                  method: "DELETE",
                });
                mutate(); // Refresh the data
              } catch (error) {
                console.error("Failed to delete medicine:", error);
              }
            }
          };

          return (
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEditMedicine(row.original)}
                className="h-6 w-6 sm:h-8 sm:w-8 p-0"
              >
                <EditIcon className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDelete(row.original._id)}
                className="h-6 w-6 sm:h-8 sm:w-8 p-0"
              >
                <TrashIcon className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
            </div>
          );
        },
      },
    ],
    [mutate, onEditMedicine]
  );

  const table = useReactTable({
    data: inventory || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2Icon className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <>
      {/* Desktop Table View */}
      <div className="hidden sm:block">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
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
                  className="h-24 text-center"
                >
                  No medicine found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View */}
      <div className="sm:hidden space-y-3">
        {table.getRowModel().rows?.length ? (
          table
            .getRowModel()
            .rows.map((row) => (
              <MobileMedicineCard
                key={row.id}
                medicine={row.original}
                onEdit={onEditMedicine}
              />
            ))
        ) : (
          <div className="text-center py-4 text-muted-foreground">
            No medicine found.
          </div>
        )}
      </div>

      {table.getPageCount() > 1 && <TablePagination table={table} />}
    </>
  );
}

// Component for Expenses Table with TanStack React Table
function ExpensesTableWithPagination({
  expenses,
}: {
  expenses: RecentExpense[];
}) {
  const columns = useMemo<ColumnDef<RecentExpense>[]>(
    () => [
      {
        accessorKey: "amount",
        header: "Amount",
        cell: ({ row }) => (
          <div className="font-medium text-xs sm:text-sm">
            AFN {Number(row.getValue("amount")).toFixed(2)}
          </div>
        ),
      },
      {
        accessorKey: "category",
        header: "Category",
        cell: ({ row }) => (
          <div className="text-xs sm:text-sm">{row.getValue("category")}</div>
        ),
      },
      {
        accessorKey: "description",
        header: "Description",
        cell: ({ row }) => (
          <div className="text-xs sm:text-sm">
            {row.getValue("description")}
          </div>
        ),
      },
      {
        accessorKey: "date",
        header: "Date",
        cell: ({ row }) => (
          <div className="text-xs sm:text-sm">
            {format(new Date(row.getValue("date")), "MMM d, yyyy")}
          </div>
        ),
      },
    ],
    []
  );

  const table = useReactTable({
    data: expenses,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  return (
    <>
      {/* Desktop Table View */}
      <div className="hidden sm:block">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
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
                  className="h-24 text-center"
                >
                  No expenses found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View */}
      <div className="sm:hidden space-y-3">
        {table.getRowModel().rows?.length ? (
          table
            .getRowModel()
            .rows.map((row) => (
              <MobileExpenseCard key={row.id} expense={row.original} />
            ))
        ) : (
          <div className="text-center py-4 text-muted-foreground">
            No expenses found.
          </div>
        )}
      </div>

      {table.getPageCount() > 1 && <TablePagination table={table} />}
    </>
  );
}

// Dialog Components
function AddExpenseDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const expenseData = {
      amount: parseFloat(formData.get("amount") as string),
      category: formData.get("category") as string,
      description: formData.get("description") as string,
      date: formData.get("date") as string,
    };

    try {
      const response = await fetch("/api/pharmacy/expenses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(expenseData),
      });

      if (response.ok) {
        onOpenChange(false);
        // You might want to refresh the expenses data here
      } else {
        console.error("Failed to add expense");
      }
    } catch (error) {
      console.error("Error adding expense:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg">
            Add New Expense
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Enter the details of the new expense. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
              <Label
                htmlFor="amount"
                className="text-left sm:text-right text-xs sm:text-sm"
              >
                Amount
              </Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                step="0.01"
                className="col-span-1 sm:col-span-3 text-xs sm:text-sm"
                required
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
              <Label
                htmlFor="category"
                className="text-left sm:text-right text-xs sm:text-sm"
              >
                Category
              </Label>
              <Select name="category" required>
                <SelectTrigger className="col-span-1 sm:col-span-3 text-xs sm:text-sm">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="medicines" className="text-xs sm:text-sm">
                    Medicines
                  </SelectItem>
                  <SelectItem value="supplies" className="text-xs sm:text-sm">
                    Supplies
                  </SelectItem>
                  <SelectItem value="equipment" className="text-xs sm:text-sm">
                    Equipment
                  </SelectItem>
                  <SelectItem value="utilities" className="text-xs sm:text-sm">
                    Utilities
                  </SelectItem>
                  <SelectItem value="rent" className="text-xs sm:text-sm">
                    Rent
                  </SelectItem>
                  <SelectItem value="salaries" className="text-xs sm:text-sm">
                    Salaries
                  </SelectItem>
                  <SelectItem value="other" className="text-xs sm:text-sm">
                    Other
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
              <Label
                htmlFor="description"
                className="text-left sm:text-right text-xs sm:text-sm"
              >
                Description
              </Label>
              <Textarea
                id="description"
                name="description"
                className="col-span-1 sm:col-span-3 text-xs sm:text-sm"
                required
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
              <Label
                htmlFor="date"
                className="text-left sm:text-right text-xs sm:text-sm"
              >
                Date
              </Label>
              <Input
                id="date"
                name="date"
                type="date"
                className="col-span-1 sm:col-span-3 text-xs sm:text-sm"
                required
                defaultValue={format(new Date(), "yyyy-MM-dd")}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="submit"
              disabled={isLoading}
              className="text-xs sm:text-sm"
            >
              {isLoading ? (
                <Loader2Icon className="h-3 w-3 sm:h-4 sm:w-4 animate-spin mr-1 sm:mr-2" />
              ) : null}
              Save Expense
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AddMedicineDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const medicineData = {
      name: formData.get("name") as string,
      batchNumber: formData.get("batchNumber") as string,
      expiryDate: formData.get("expiryDate") as string,
      currentQuantity: parseInt(formData.get("currentQuantity") as string),
      originalQuantity: parseInt(formData.get("originalQuantity") as string),
      unitPrice: parseFloat(formData.get("unitPrice") as string),
      sellingPrice: parseFloat(formData.get("sellingPrice") as string),
      supplier: formData.get("supplier") as string,
    };

    try {
      const response = await fetch("/api/pharmacy/inventory", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(medicineData),
      });

      if (response.ok) {
        onOpenChange(false);
        // You might want to refresh the inventory data here
      } else {
        console.error("Failed to add medicine");
      }
    } catch (error) {
      console.error("Error adding medicine:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg">
            Add New Medicine
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Enter the details of the new medicine. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
              <Label
                htmlFor="name"
                className="text-left sm:text-right text-xs sm:text-sm"
              >
                Name
              </Label>
              <Input
                id="name"
                name="name"
                className="col-span-1 sm:col-span-3 text-xs sm:text-sm"
                required
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
              <Label
                htmlFor="batchNumber"
                className="text-left sm:text-right text-xs sm:text-sm"
              >
                Batch Number
              </Label>
              <Input
                id="batchNumber"
                name="batchNumber"
                className="col-span-1 sm:col-span-3 text-xs sm:text-sm"
                required
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
              <Label
                htmlFor="expiryDate"
                className="text-left sm:text-right text-xs sm:text-sm"
              >
                Expiry Date
              </Label>
              <Input
                id="expiryDate"
                name="expiryDate"
                type="date"
                className="col-span-1 sm:col-span-3 text-xs sm:text-sm"
                required
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
              <Label
                htmlFor="currentQuantity"
                className="text-left sm:text-right text-xs sm:text-sm"
              >
                Current Quantity
              </Label>
              <Input
                id="currentQuantity"
                name="currentQuantity"
                type="number"
                className="col-span-1 sm:col-span-3 text-xs sm:text-sm"
                required
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
              <Label
                htmlFor="originalQuantity"
                className="text-left sm:text-right text-xs sm:text-sm"
              >
                Original Quantity
              </Label>
              <Input
                id="originalQuantity"
                name="originalQuantity"
                type="number"
                className="col-span-1 sm:col-span-3 text-xs sm:text-sm"
                required
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
              <Label
                htmlFor="unitPrice"
                className="text-left sm:text-right text-xs sm:text-sm"
              >
                Unit Price
              </Label>
              <Input
                id="unitPrice"
                name="unitPrice"
                type="number"
                step="0.01"
                className="col-span-1 sm:col-span-3 text-xs sm:text-sm"
                required
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
              <Label
                htmlFor="sellingPrice"
                className="text-left sm:text-right text-xs sm:text-sm"
              >
                Selling Price
              </Label>
              <Input
                id="sellingPrice"
                name="sellingPrice"
                type="number"
                step="0.01"
                className="col-span-1 sm:col-span-3 text-xs sm:text-sm"
                required
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
              <Label
                htmlFor="supplier"
                className="text-left sm:text-right text-xs sm:text-sm"
              >
                Supplier
              </Label>
              <Input
                id="supplier"
                name="supplier"
                className="col-span-1 sm:col-span-3 text-xs sm:text-sm"
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="submit"
              disabled={isLoading}
              className="text-xs sm:text-sm"
            >
              {isLoading ? (
                <Loader2Icon className="h-3 w-3 sm:h-4 sm:w-4 animate-spin mr-1 sm:mr-2" />
              ) : null}
              Save Medicine
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditMedicineDialog({
  open,
  onOpenChange,
  medicine,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  medicine: MedicineStock | null;
}) {
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!medicine) return;

    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const medicineData = {
      name: formData.get("name") as string,
      batchNumber: formData.get("batchNumber") as string,
      expiryDate: formData.get("expiryDate") as string,
      currentQuantity: parseInt(formData.get("currentQuantity") as string),
      originalQuantity: parseInt(formData.get("originalQuantity") as string),
      unitPrice: parseFloat(formData.get("unitPrice") as string),
      sellingPrice: parseFloat(formData.get("sellingPrice") as string),
      supplier: formData.get("supplier") as string,
    };

    try {
      const response = await fetch(`/api/pharmacy/inventory/${medicine._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(medicineData),
      });

      if (response.ok) {
        onOpenChange(false);
        // You might want to refresh the inventory data here
      } else {
        console.error("Failed to update medicine");
      }
    } catch (error) {
      console.error("Error updating medicine:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!medicine) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg">
            Edit Medicine
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Update the details of this medicine. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
              <Label
                htmlFor="edit-name"
                className="text-left sm:text-right text-xs sm:text-sm"
              >
                Name
              </Label>
              <Input
                id="edit-name"
                name="name"
                className="col-span-1 sm:col-span-3 text-xs sm:text-sm"
                required
                defaultValue={medicine.name}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
              <Label
                htmlFor="edit-batchNumber"
                className="text-left sm:text-right text-xs sm:text-sm"
              >
                Batch Number
              </Label>
              <Input
                id="edit-batchNumber"
                name="batchNumber"
                className="col-span-1 sm:col-span-3 text-xs sm:text-sm"
                required
                defaultValue={medicine.batchNumber}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
              <Label
                htmlFor="edit-expiryDate"
                className="text-left sm:text-right text-xs sm:text-sm"
              >
                Expiry Date
              </Label>
              <Input
                id="edit-expiryDate"
                name="expiryDate"
                type="date"
                className="col-span-1 sm:col-span-3 text-xs sm:text-sm"
                required
                defaultValue={format(
                  new Date(medicine.expiryDate),
                  "yyyy-MM-dd"
                )}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
              <Label
                htmlFor="edit-currentQuantity"
                className="text-left sm:text-right text-xs sm:text-sm"
              >
                Current Quantity
              </Label>
              <Input
                id="edit-currentQuantity"
                name="currentQuantity"
                type="number"
                className="col-span-1 sm:col-span-3 text-xs sm:text-sm"
                required
                defaultValue={medicine.currentQuantity}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
              <Label
                htmlFor="edit-originalQuantity"
                className="text-left sm:text-right text-xs sm:text-sm"
              >
                Original Quantity
              </Label>
              <Input
                id="edit-originalQuantity"
                name="originalQuantity"
                type="number"
                className="col-span-1 sm:col-span-3 text-xs sm:text-sm"
                required
                defaultValue={medicine.originalQuantity}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
              <Label
                htmlFor="edit-unitPrice"
                className="text-left sm:text-right text-xs sm:text-sm"
              >
                Unit Price
              </Label>
              <Input
                id="edit-unitPrice"
                name="unitPrice"
                type="number"
                step="0.01"
                className="col-span-1 sm:col-span-3 text-xs sm:text-sm"
                required
                defaultValue={medicine.unitPrice}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
              <Label
                htmlFor="edit-sellingPrice"
                className="text-left sm:text-right text-xs sm:text-sm"
              >
                Selling Price
              </Label>
              <Input
                id="edit-sellingPrice"
                name="sellingPrice"
                type="number"
                step="0.01"
                className="col-span-1 sm:col-span-3 text-xs sm:text-sm"
                required
                defaultValue={medicine.sellingPrice}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
              <Label
                htmlFor="edit-supplier"
                className="text-left sm:text-right text-xs sm:text-sm"
              >
                Supplier
              </Label>
              <Input
                id="edit-supplier"
                name="supplier"
                className="col-span-1 sm:col-span-3 text-xs sm:text-sm"
                required
                defaultValue={medicine.supplier}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="submit"
              disabled={isLoading}
              className="text-xs sm:text-sm"
            >
              {isLoading ? (
                <Loader2Icon className="h-3 w-3 sm:h-4 sm:w-4 animate-spin mr-1 sm:mr-2" />
              ) : null}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function PharmacyDashboard() {
  const { user } = useAuthStore();

  // Fetch all dashboard data
  const { data: stats, isLoading: statsLoading } = useSWR<DashboardStats>(
    "/api/pharmacy/dashboard/stats",
    fetcher
  );
  const { data: recentPrescriptions, isLoading: prescriptionsLoading } = useSWR<
    RecentPrescription[]
  >("/api/pharmacy/prescriptions/recent", fetcher);
  const {
    data: lowStockData,
    isLoading: stockLoading,
    error: stockError,
    mutate: refetchLowStock,
  } = useSWR("/api/pharmacy/inventory/low-stock", fetcher);
  const lowStockItems = lowStockData?.data || [];
  const { data: recentExpenses, isLoading: expensesLoading } = useSWR<
    RecentExpense[]
  >("/api/pharmacy/expenses/recent", fetcher);

  // Dialog states
  const [isAddExpenseDialogOpen, setIsAddExpenseDialogOpen] = useState(false);
  const [isAddMedicineDialogOpen, setIsAddMedicineDialogOpen] = useState(false);
  const [isEditMedicineDialogOpen, setIsEditMedicineDialogOpen] =
    useState(false);
  const [selectedMedicine, setSelectedMedicine] =
    useState<MedicineStock | null>(null);

  // Calculate percentage changes (mock data - replace with actual comparison logic)
  const salesChange = 12.5;
  const expensesChange = -4.3;
  const inventoryChange = 2.1;

  // Loading state for the entire dashboard
  const isLoading =
    statsLoading || prescriptionsLoading || stockLoading || expensesLoading;

  // Handle medicine edit
  const handleEditMedicine = (medicine: MedicineStock) => {
    setSelectedMedicine(medicine);
    setIsEditMedicineDialogOpen(true);
  };

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-xl sm:text-3xl font-bold">Pharmacy Dashboard</h1>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button variant="outline" className="text-xs sm:text-sm">
            <CalendarIcon className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            {format(new Date(), "MMMM d, yyyy")}
          </Button>
          <Button
            variant="outline"
            onClick={() => refetchLowStock()}
            className="text-xs sm:text-sm"
          >
            Refresh Stock Alerts
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2Icon className="h-12 w-12 animate-spin" />
        </div>
      ) : (
        <>
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium">
                  Total Sales
                </CardTitle>
                <ReceiptIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-lg sm:text-2xl font-bold">
                  AFN {stats?.totalSales?.toFixed(2) || "0.00"}
                </div>
                <div
                  className={`flex items-center text-xs ${
                    salesChange >= 0 ? "text-green-500" : "text-red-500"
                  }`}
                >
                  {salesChange >= 0 ? (
                    <TrendingUpIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  ) : (
                    <TrendingDownIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  )}
                  {Math.abs(salesChange)}% from last period
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium">
                  Total Expenses
                </CardTitle>
                <WalletIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-lg sm:text-2xl font-bold">
                  AFN {stats?.totalExpenses?.toFixed(2) || "0.00"}
                </div>
                <div
                  className={`flex items-center text-xs ${
                    expensesChange >= 0 ? "text-green-500" : "text-red-500"
                  }`}
                >
                  {expensesChange >= 0 ? (
                    <TrendingUpIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  ) : (
                    <TrendingDownIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  )}
                  {Math.abs(expensesChange)}% from last period
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium">
                  Inventory Value
                </CardTitle>
                <PillIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-lg sm:text-2xl font-bold">
                  AFN {stats?.inventoryValue?.toFixed(2) || "0.00"}
                </div>
                <div
                  className={`flex items-center text-xs ${
                    inventoryChange >= 0 ? "text-green-500" : "text-red-500"
                  }`}
                >
                  {inventoryChange >= 0 ? (
                    <TrendingUpIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  ) : (
                    <TrendingDownIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  )}
                  {Math.abs(inventoryChange)}% from last period
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium">
                  Low Stock Items
                </CardTitle>
                <AlertCircleIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-lg sm:text-2xl font-bold">
                  {stats?.lowStockItems || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Items below 20% stock level
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="flex overflow-x-auto w-full">
              <TabsTrigger value="overview" className="text-xs sm:text-sm">
                Overview
              </TabsTrigger>
              <TabsTrigger value="inventory" className="text-xs sm:text-sm">
                Inventory
              </TabsTrigger>
              <TabsTrigger value="expenses" className="text-xs sm:text-sm">
                Expenses
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4">
                  <CardHeader>
                    <CardTitle className="text-sm sm:text-base">
                      Recent Prescriptions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <PrescriptionsTableWithPagination
                      prescriptions={recentPrescriptions || []}
                    />
                  </CardContent>
                </Card>

                <Card className="col-span-3">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-sm sm:text-base">
                      Low Stock Alerts
                    </CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => refetchLowStock()}
                      className="text-xs"
                    >
                      Refresh
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {stockError ? (
                      <div className="text-red-500 text-center py-4 text-sm">
                        Failed to load low stock items. Please check your API
                        endpoint.
                      </div>
                    ) : lowStockItems.length === 0 ? (
                      <div className="text-muted-foreground text-center py-4 text-sm">
                        No low stock items. All inventory levels are good.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {lowStockItems.map((item: LowStockItem) => (
                          <div
                            key={item._id}
                            className="flex items-center p-3 border rounded-lg"
                          >
                            <div className="space-y-1 w-full">
                              <p className="text-sm font-medium leading-none">
                                {item.name} - {item.batchNumber}
                              </p>
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">
                                  {item.currentQuantity} /{" "}
                                  {item.originalQuantity} remaining
                                </span>
                                <span
                                  className={`text-xs font-medium ${
                                    item.remainingPercentage < 10
                                      ? "text-red-500"
                                      : item.remainingPercentage < 20
                                      ? "text-amber-500"
                                      : "text-green-500"
                                  }`}
                                >
                                  {item.remainingPercentage.toFixed(0)}%
                                </span>
                              </div>
                              <Progress
                                value={item.remainingPercentage}
                                className="h-2 mt-1"
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
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="inventory">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-sm sm:text-base">
                    Medicine Inventory
                  </CardTitle>
                  <Button
                    size="sm"
                    onClick={() => setIsAddMedicineDialogOpen(true)}
                    className="text-xs sm:text-sm"
                  >
                    <PlusIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    Add Medicine
                  </Button>
                </CardHeader>
                <CardContent>
                  <InventoryTableWithPagination
                    onEditMedicine={handleEditMedicine}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="expenses">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-sm sm:text-base">
                    Expense Records
                  </CardTitle>
                  <Button
                    size="sm"
                    onClick={() => setIsAddExpenseDialogOpen(true)}
                    className="text-xs sm:text-sm"
                  >
                    <PlusIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    Add Expense
                  </Button>
                </CardHeader>
                <CardContent>
                  <ExpensesTableWithPagination
                    expenses={recentExpenses || []}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Add Expense Dialog */}
          <AddExpenseDialog
            open={isAddExpenseDialogOpen}
            onOpenChange={setIsAddExpenseDialogOpen}
          />

          {/* Add Medicine Dialog */}
          <AddMedicineDialog
            open={isAddMedicineDialogOpen}
            onOpenChange={setIsAddMedicineDialogOpen}
          />

          {/* Edit Medicine Dialog */}
          <EditMedicineDialog
            open={isEditMedicineDialogOpen}
            onOpenChange={setIsEditMedicineDialogOpen}
            medicine={selectedMedicine}
          />
        </>
      )}
    </div>
  );
}
