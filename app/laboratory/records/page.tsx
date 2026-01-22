// app/laboratory/records/page.tsx

"use client";

import { useState, useCallback, memo, useMemo, useEffect } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { PlusIcon, PencilIcon, TrashIcon, CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Badge } from "@/components/ui/badge";

// Import TanStack Table components and hooks
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";

interface LaboratoryRecord {
  _id: string;
  date: string;
  patientName: string;
  invoiceNumber: string;
  testType: string;
  phoneNumber?: string;
  amountCharged: number;
  amountPaid: number;
  recordedBy?: {
    name: string;
    _id: string;
  };
}

interface FormFieldProps {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  optional?: boolean;
}

interface NumberFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
}

interface DateFilterProps {
  label: string;
  date?: Date;
  setDate: (date?: Date) => void;
}

interface SummaryCardProps {
  title: string;
  value: number;
}

// Optimized fetcher with timeout
const fetchRecords = async (params: {
  startDate?: string;
  endDate?: string;
  page: number;
  pageSize: number;
}) => {
  const queryString = new URLSearchParams();
  if (params.startDate) queryString.append("startDate", params.startDate);
  if (params.endDate) queryString.append("endDate", params.endDate);
  queryString.append("page", params.page.toString());
  queryString.append("limit", params.pageSize.toString());

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(
      `/api/laboratory/records?${queryString.toString()}`,
      {
        signal: controller.signal,
      }
    );

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

const FormField = memo(
  ({ label, value, onChange, optional = false }: FormFieldProps) => {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
        <Label
          htmlFor={label.toLowerCase().replace(/\s+/g, "-")}
          className="text-left sm:text-right text-sm font-medium"
        >
          {label}
          {!optional && "*"}
        </Label>
        <Input
          id={label.toLowerCase().replace(/\s+/g, "-")}
          value={value}
          onChange={onChange}
          className="col-span-1 sm:col-span-3"
        />
      </div>
    );
  }
);
FormField.displayName = "FormField";

const NumberField = memo(({ label, value, onChange }: NumberFieldProps) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
      <Label className="text-left sm:text-right text-sm font-medium">
        {label}
      </Label>
      <Input
        type="number"
        min="0"
        step="0.01"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="col-span-1 sm:col-span-3"
      />
    </div>
  );
});
NumberField.displayName = "NumberField";

const DateFilter = memo(({ label, date, setDate }: DateFilterProps) => {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal text-xs sm:text-sm",
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
  );
});
DateFilter.displayName = "DateFilter";

const SummaryCard = memo(({ title, value }: SummaryCardProps) => {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <h3 className="text-sm sm:text-lg font-medium text-muted-foreground">
            {title}
          </h3>
          <p className="text-lg sm:text-2xl font-bold">
            AFN {value.toFixed(2)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
});
SummaryCard.displayName = "SummaryCard";

// Mobile Record Card Component
const MobileRecordCard = memo(
  ({
    record,
    onEdit,
    onDelete,
    isDeleting,
  }: {
    record: LaboratoryRecord;
    onEdit: (record: LaboratoryRecord) => void;
    onDelete: (id: string) => void;
    isDeleting: boolean;
  }) => (
    <Card className="mb-3 p-3">
      <CardContent className="p-0 space-y-2">
        <div className="flex justify-between items-start">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                {format(new Date(record.date), "MMM dd, yyyy")}
              </span>
              <Badge variant="secondary" className="text-xs w-68">
                {record.testType}
              </Badge>
            </div>
            <p className="text-sm font-medium">{record.patientName}</p>
            <p className="text-xs text-muted-foreground">
              Invoice: {record.invoiceNumber}
            </p>
            {record.phoneNumber && (
              <p className="text-xs text-muted-foreground">
                Phone: {record.phoneNumber}
              </p>
            )}
            <div className="flex gap-4 mt-1">
              <p className="text-sm font-bold text-green-600">
                AFN {record.amountCharged.toFixed(2)}
              </p>
              <p className="text-sm font-bold text-blue-600">
                AFN {record.amountPaid.toFixed(2)}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="flex space-x-1 mt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(record)}
                className="h-6 w-6 p-0"
              >
                <PencilIcon className="h-3 w-3" />
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onDelete(record._id)}
                disabled={isDeleting}
                className="h-6 w-6 p-0"
              >
                <TrashIcon className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
);
MobileRecordCard.displayName = "MobileRecordCard";

function LaboratoryRecordsContent() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [patientName, setPatientName] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [testType, setTestType] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [amountCharged, setAmountCharged] = useState(0);
  const [amountPaid, setAmountPaid] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<LaboratoryRecord | null>(
    null
  );
  const [filterStartDate, setFilterStartDate] = useState<Date | undefined>();
  const [filterEndDate, setFilterEndDate] = useState<Date | undefined>();

  // Debounce filter changes
  const debouncedStartDate = useDebounce(filterStartDate, 500);
  const debouncedEndDate = useDebounce(filterEndDate, 500);

  // TanStack Query setup
  const queryClient = useQueryClient();
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  // Query for records
  const {
    data: response,
    error,
    isLoading,
    isError,
  } = useQuery({
    queryKey: [
      "laboratory-records",
      debouncedStartDate?.toISOString(),
      debouncedEndDate?.toISOString(),
      pagination.pageIndex,
      pagination.pageSize,
    ],
    queryFn: () =>
      fetchRecords({
        startDate: debouncedStartDate?.toISOString(),
        endDate: debouncedEndDate?.toISOString(),
        page: pagination.pageIndex + 1,
        pageSize: pagination.pageSize,
      }),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Mutations for CRUD operations
  const createRecordMutation = useMutation({
    mutationFn: (recordData: any) =>
      fetch("/api/laboratory/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(recordData),
      }).then((res) => {
        if (!res.ok) throw new Error("Failed to create record");
        return res.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["laboratory-records"] });
      toast.success("Record created successfully");
      setDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create record");
    },
  });

  const updateRecordMutation = useMutation({
    mutationFn: ({ id, recordData }: { id: string; recordData: any }) =>
      fetch(`/api/laboratory/records?id=${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(recordData),
      }).then((res) => {
        if (!res.ok) throw new Error("Failed to update record");
        return res.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["laboratory-records"] });
      toast.success("Record updated successfully");
      setDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update record");
    },
  });

  const deleteRecordMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/laboratory/records?id=${id}`, {
        method: "DELETE",
      }).then((res) => {
        if (!res.ok) throw new Error("Failed to delete record");
        return res.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["laboratory-records"] });
      toast.success("Record deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete record");
    },
  });

  // Handle errors
  useEffect(() => {
    if (isError && error) {
      console.error("Failed to fetch records:", error);
      toast.error("Failed to load records. Please try again.");
    }
  }, [isError, error]);

  const records = response?.records || [];
  const serverPagination = response?.pagination;

  // Reset to page 1 when filters change
  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [debouncedStartDate, debouncedEndDate]);

  const totalCharged = useMemo(
    () =>
      records.reduce(
        (sum: number, r: LaboratoryRecord) => sum + (r?.amountCharged || 0),
        0
      ),
    [records]
  );

  const totalPaid = useMemo(
    () =>
      records.reduce(
        (sum: number, r: LaboratoryRecord) => sum + (r?.amountPaid || 0),
        0
      ),
    [records]
  );

  const totalBalance = useMemo(
    () => totalCharged - totalPaid,
    [totalCharged, totalPaid]
  );

  // Define responsive columns for TanStack Table
  const columns: ColumnDef<LaboratoryRecord>[] = useMemo(
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
        accessorKey: "patientName",
        header: () => <span className="text-xs sm:text-sm">Patient</span>,
        cell: ({ row }) => {
          return (
            <div
              className="text-xs sm:text-sm font-medium truncate"
              title={row.original.patientName}
            >
              {row.original.patientName}
            </div>
          );
        },
      },
      {
        accessorKey: "invoiceNumber",
        header: () => (
          <span className="text-xs sm:text-sm hidden sm:table-cell">
            Invoice
          </span>
        ),
        cell: ({ row }) => {
          return (
            <div
              className="text-xs sm:text-sm hidden sm:table-cell truncate"
              title={row.original.invoiceNumber}
            >
              {row.original.invoiceNumber}
            </div>
          );
        },
      },
      {
        accessorKey: "testType",
        header: () => <span className="text-xs sm:text-sm">Test Type</span>,
        cell: ({ row }) => {
          return (
            <div
              className="text-xs sm:text-sm truncate w-64"
              title={row.original.testType}
            >
              {row.original.testType}
            </div>
          );
        },
      },
      {
        accessorKey: "amountCharged",
        header: () => <span className="text-xs sm:text-sm">Charged</span>,
        cell: ({ row }) => {
          return (
            <div className="text-xs sm:text-sm font-semibold text-green-600">
              AFN {row.original.amountCharged.toFixed(2)}
            </div>
          );
        },
      },
      {
        accessorKey: "amountPaid",
        header: () => (
          <span className="text-xs sm:text-sm hidden md:table-cell">Paid</span>
        ),
        cell: ({ row }) => {
          return (
            <div className="text-xs sm:text-sm hidden md:table-cell font-semibold text-blue-600">
              AFN {row.original.amountPaid.toFixed(2)}
            </div>
          );
        },
      },
      {
        id: "actions",
        header: () => <span className="text-xs sm:text-sm">Actions</span>,
        cell: ({ row }) => {
          return (
            <div className="flex space-x-1 sm:space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleEdit(row.original)}
                className="h-6 w-6 sm:h-8 sm:w-8 p-0"
              >
                <PencilIcon className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleDelete(row.original._id)}
                disabled={deleteRecordMutation.isPending}
                className="h-6 w-6 sm:h-8 sm:w-8 p-0"
              >
                <TrashIcon className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
            </div>
          );
        },
      },
    ],
    [deleteRecordMutation.isPending]
  );

  // Setup TanStack Table with built-in pagination
  const table = useReactTable({
    data: records,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onPaginationChange: setPagination,
    manualPagination: true,
    pageCount: serverPagination?.totalPages ?? -1,
    state: {
      pagination,
    },
  });

  const resetForm = useCallback(() => {
    setDate(new Date());
    setPatientName("");
    setInvoiceNumber("");
    setTestType("");
    setPhoneNumber("");
    setAmountCharged(0);
    setAmountPaid(0);
    setEditMode(false);
    setCurrentRecord(null);
  }, []);

  const handleEdit = useCallback((record: LaboratoryRecord) => {
    setDate(new Date(record.date));
    setPatientName(record.patientName);
    setInvoiceNumber(record.invoiceNumber);
    setTestType(record.testType);
    setPhoneNumber(record.phoneNumber || "");
    setAmountCharged(record.amountCharged);
    setAmountPaid(record.amountPaid);
    setCurrentRecord(record);
    setEditMode(true);
    setDialogOpen(true);
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this record?")) return;
    deleteRecordMutation.mutate(id);
  };

  const handleSubmit = async () => {
    if (
      !date ||
      !patientName ||
      !invoiceNumber ||
      !testType ||
      amountCharged <= 0
    ) {
      toast.error("Please fill all required fields");
      return;
    }

    try {
      const recordData = {
        date,
        patientName,
        invoiceNumber,
        testType,
        phoneNumber: phoneNumber || undefined,
        amountCharged,
        amountPaid,
      };

      if (editMode && currentRecord) {
        updateRecordMutation.mutate({ id: currentRecord._id, recordData });
      } else {
        createRecordMutation.mutate(recordData);
      }
    } catch (error: unknown) {
      toast.error(
        error instanceof Error
          ? error.message
          : "An error occurred while saving the record"
      );
    }
  };

  const handlePatientNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setPatientName(e.target.value);
    },
    []
  );

  const handleInvoiceNumberChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setInvoiceNumber(e.target.value);
    },
    []
  );

  const handleTestTypeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setTestType(e.target.value);
    },
    []
  );

  const handlePhoneNumberChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setPhoneNumber(e.target.value);
    },
    []
  );

  const handleAmountChargedChange = useCallback((value: number) => {
    setAmountCharged(value);
  }, []);

  const handleAmountPaidChange = useCallback((value: number) => {
    setAmountPaid(value);
  }, []);

  const isSubmitting =
    createRecordMutation.isPending || updateRecordMutation.isPending;

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 max-w-7xl">
      {/* Header - Responsive */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-4">
        <h1 className="text-xl sm:text-2xl font-bold">Laboratory Records</h1>
        <Button
          onClick={() => {
            setDialogOpen(true);
            resetForm();
          }}
          className="w-full sm:w-auto text-xs sm:text-sm"
        >
          <PlusIcon className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
          Add Record
        </Button>
      </div>

      {/* Filter Card - Responsive */}
      <Card className="mb-4 sm:mb-6">
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="text-sm sm:text-base">Filter Records</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <DateFilter
              label="Start Date"
              date={filterStartDate}
              setDate={setFilterStartDate}
            />
            <DateFilter
              label="End Date"
              date={filterEndDate}
              setDate={setFilterEndDate}
            />
            <div className="flex items-end">
              <Button
                variant="secondary"
                className="w-full text-xs sm:text-sm"
                onClick={() => {
                  setFilterStartDate(undefined);
                  setFilterEndDate(undefined);
                  setPagination((prev) => ({ ...prev, pageIndex: 0 }));
                }}
              >
                Clear Filter
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards - Responsive Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-6">
        <SummaryCard title="Total Charged" value={totalCharged} />
        <SummaryCard title="Total Paid" value={totalPaid} />
        <SummaryCard title="Balance" value={totalBalance} />
      </div>

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
                    No records found
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
        ) : records.length > 0 ? (
          records.map((record: LaboratoryRecord) => (
            <MobileRecordCard
              key={record._id}
              record={record}
              onEdit={handleEdit}
              onDelete={handleDelete}
              isDeleting={deleteRecordMutation.isPending}
            />
          ))
        ) : (
          <Card className="p-6 text-center">
            <CardContent>
              <p className="text-sm text-muted-foreground">No records found</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Pagination Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-sm text-muted-foreground">
          Showing {table.getRowModel().rows.length} of{" "}
          {serverPagination?.totalRecords || 0} records
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
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
          >
            Next
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          <p className="text-sm font-medium">Rows per page</p>
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

      {/* Dialog - Responsive */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-[95vw] max-w-md sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">
              {editMode ? "Edit Record" : "Add New Record"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Date Field - Responsive */}
            <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
              <Label
                htmlFor="date"
                className="text-left sm:text-right text-sm font-medium"
              >
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

            <FormField
              label="Patient Name*"
              value={patientName}
              onChange={handlePatientNameChange}
            />
            <FormField
              label="Invoice Number*"
              value={invoiceNumber}
              onChange={handleInvoiceNumberChange}
            />
            <FormField
              label="Test Type*"
              value={testType}
              onChange={handleTestTypeChange}
            />
            <FormField
              label="Phone Number"
              value={phoneNumber}
              onChange={handlePhoneNumberChange}
              optional
            />
            <NumberField
              label="Amount Charged*"
              value={amountCharged}
              onChange={handleAmountChargedChange}
            />
            <NumberField
              label="Amount Paid"
              value={amountPaid}
              onChange={handleAmountPaidChange}
            />
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
              type="button"
              className="w-full sm:w-auto text-xs sm:text-sm"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : editMode ? "Update" : "Create"}{" "}
              Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function LaboratoryRecords() {
  return (
    <ErrorBoundary>
      <LaboratoryRecordsContent />
    </ErrorBoundary>
  );
}
