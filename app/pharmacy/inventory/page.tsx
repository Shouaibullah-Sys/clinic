// app/pharmacy/inventory/page.tsx
"use client";
import { useState, useMemo, useEffect } from "react";
import useSWR, { mutate } from "swr";
import {
  PrinterIcon,
  SearchIcon,
  FilterIcon,
  CalendarIcon,
  RefreshCwIcon,
  MoreVerticalIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Import TanStack Table components and hooks
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
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

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface DailyIssuedItem {
  _id: string;
  medicineId: string;
  name: string;
  form: string;
  dosage: string;
  quantityIssued: number;
  currentStock: number;
  originalStock: number;
  issueDate: string;
  issuedTo: string;
  issuedBy: string;
  unitPrice: number;
  totalPrice: number;
  prescriptionId?: string;
}

// Mobile Inventory Card Component
const MobileInventoryCard = ({ item }: { item: DailyIssuedItem }) => {
  const stockPercentage = (item.currentStock / item.originalStock) * 100;

  return (
    <Card className="mb-3">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div className="flex-1">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium text-sm">{item.name}</span>
              <span className="font-bold text-sm">
                AFN {item.totalPrice.toFixed(2)}
              </span>
            </div>
            <div className="space-y-1 text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>Form:</span>
                <span>{item.form}</span>
              </div>
              <div className="flex justify-between">
                <span>Dosage:</span>
                <span>{item.dosage}</span>
              </div>
              <div className="flex justify-between">
                <span>Qty Issued:</span>
                <Badge variant="outline" className="text-xs">
                  {item.quantityIssued}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>Current Stock:</span>
                <span>{item.currentStock}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Stock Level:</span>
                <div className="flex items-center gap-1">
                  <Progress
                    value={stockPercentage}
                    className="h-1 w-12"
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
                  <span className="text-xs w-6">
                    {Math.round(stockPercentage)}%
                  </span>
                </div>
              </div>
              <div className="flex justify-between">
                <span>Issued To:</span>
                <span>{item.issuedTo}</span>
              </div>
              <div className="flex justify-between">
                <span>Issued By:</span>
                <span>{item.issuedBy}</span>
              </div>
              <div className="flex justify-between">
                <span>Time:</span>
                <span>{format(new Date(item.issueDate), "MMM dd, HH:mm")}</span>
              </div>
              {item.prescriptionId && (
                <div className="flex justify-between">
                  <span>Invoice:</span>
                  <span className="text-xs">{item.prescriptionId}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default function DailyIssuedItemsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState<Date | undefined>(new Date());
  const [issuedToFilter, setIssuedToFilter] = useState("all");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch daily issued items
  const {
    data: issuedItemsResponse,
    isLoading,
    error,
    mutate,
  } = useSWR<{ issuedItems: DailyIssuedItem[]; pagination: any }>(
    `/api/pharmacy/issued-items?date=${dateFilter?.toISOString()}`,
    fetcher,
  );

  const issuedItems = issuedItemsResponse?.issuedItems || [];

  // Get unique issuedTo values for filter
  const issuedToOptions = useMemo(() => {
    if (!Array.isArray(issuedItems)) return [];
    const uniqueValues = Array.from(
      new Set(issuedItems.map((item) => item.issuedTo)),
    );
    return ["all", ...uniqueValues];
  }, [issuedItems]);

  const filteredItems = useMemo(() => {
    if (!issuedItems) return [];

    return issuedItems.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.form.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.dosage.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.issuedTo.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesIssuedTo =
        issuedToFilter === "all" || item.issuedTo === issuedToFilter;

      return matchesSearch && matchesIssuedTo;
    });
  }, [issuedItems, searchTerm, issuedToFilter]);

  // Define columns for daily issued items
  const columns: ColumnDef<DailyIssuedItem>[] = [
    {
      accessorKey: "name",
      header: "Medicine",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="font-medium">
            {item.name}
            <div className="text-xs text-muted-foreground">
              {item.form} | {item.dosage}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "quantityIssued",
      header: "Qty Issued",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <Badge variant="outline" className="text-sm">
            {item.quantityIssued}
          </Badge>
        );
      },
    },
    {
      accessorKey: "currentStock",
      header: "Qty on Hand",
      cell: ({ row }) => {
        const item = row.original;
        const stockPercentage = (item.currentStock / item.originalStock) * 100;

        return (
          <div className="flex items-center gap-2">
            <span className="font-medium">{item.currentStock}</span>
            <Progress
              value={stockPercentage}
              className="h-2 w-16"
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
            <span className="text-xs w-8 text-muted-foreground">
              {Math.round(stockPercentage)}%
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "issuedTo",
      header: "Issued To",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="text-sm">
            {item.issuedTo}
            {item.prescriptionId && (
              <div className="text-xs text-muted-foreground">
                Invoice: {item.prescriptionId}
              </div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "issuedBy",
      header: "Issued By",
      cell: ({ row }) => {
        const item = row.original;
        return <div className="text-sm">{item.issuedBy}</div>;
      },
    },
    {
      accessorKey: "issueDate",
      header: "Time",
      cell: ({ row }) => {
        const item = row.original;
        const issueDate = new Date(item.issueDate);
        return (
          <div className="text-xs">
            <div>{format(issueDate, "MMM dd, yyyy")}</div>
            <div className="text-muted-foreground">
              {format(issueDate, "HH:mm")}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "totalPrice",
      header: "Amount",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="text-sm font-medium">
            AFN {item.totalPrice.toFixed(2)}
          </div>
        );
      },
    },
  ];

  // Setup TanStack Table with pagination
  const table = useReactTable({
    data: filteredItems,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await mutate();
      toast.success("Inventory data refreshed");
    } catch (error) {
      toast.error("Failed to refresh data");
    } finally {
      setIsRefreshing(false);
    }
  };

  const generateDailyReport = () => {
    if (!filteredItems.length) {
      toast.error("No data to generate report");
      return;
    }

    const doc = new jsPDF();
    const date = dateFilter
      ? format(dateFilter, "PPP")
      : format(new Date(), "PPP");

    doc.setFontSize(18);
    doc.setTextColor(40);
    doc.text("Daily Issued Items Report", 105, 20, { align: "center" });

    doc.setFontSize(12);
    doc.text(`Date: ${date}`, 105, 30, { align: "center" });

    autoTable(doc, {
      startY: 40,
      head: [
        [
          "Medicine",
          "Form",
          "Dosage",
          "Qty Issued",
          "Qty on Hand",
          "Issued To",
          "Issued By",
          "Time",
          "Amount",
        ],
      ],
      body: filteredItems.map((item) => [
        item.name,
        item.form,
        item.dosage,
        item.quantityIssued.toString(),
        `${item.currentStock}/${item.originalStock}`,
        item.issuedTo,
        item.issuedBy,
        format(new Date(item.issueDate), "HH:mm"),
        `AFN ${item.totalPrice.toFixed(2)}`,
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [59, 130, 246], textColor: 255 },
      alternateRowStyles: { fillColor: [241, 245, 249] },
    });

    const totalItems = filteredItems.length;
    const totalValue = filteredItems.reduce(
      (sum, item) => sum + item.totalPrice,
      0,
    );
    const totalQuantity = filteredItems.reduce(
      (sum, item) => sum + item.quantityIssued,
      0,
    );

    doc.setFontSize(12);
    doc.text("Daily Summary", 14, (doc as any).lastAutoTable.finalY + 20);

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 25,
      body: [
        ["Total Items Issued", totalItems],
        ["Total Quantity", totalQuantity],
        ["Total Value", `AFN ${totalValue.toFixed(2)}`],
      ],
      styles: { fontSize: 10 },
      columnStyles: { 1: { fontStyle: "bold" } },
    });

    doc.save(`daily_issued_report_${date.replace(/\s/g, "_")}.pdf`);
  };

  // Calculate daily totals
  const dailyTotals = useMemo(() => {
    if (!filteredItems.length) return null;

    const totalValue = filteredItems.reduce(
      (sum, item) => sum + item.totalPrice,
      0,
    );
    const totalQuantity = filteredItems.reduce(
      (sum, item) => sum + item.quantityIssued,
      0,
    );

    return { totalValue, totalQuantity, totalItems: filteredItems.length };
  }, [filteredItems]);

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <CardTitle>Daily Issued Items & Inventory</CardTitle>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search medicines, batches, or recipients..."
                className="pl-9 w-full md:w-64"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex items-center gap-2">
              <FilterIcon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Filters:</span>
            </div>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full sm:w-[200px] justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateFilter ? format(dateFilter, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={dateFilter}
                  onSelect={setDateFilter}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <Select value={issuedToFilter} onValueChange={setIssuedToFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Issued to" />
              </SelectTrigger>
              <SelectContent>
                {issuedToOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option === "all" ? "All Recipients" : option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="w-full sm:w-auto"
            >
              <RefreshCwIcon
                className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
              />
              Refresh Stock
            </Button>
          </div>

          {error ? (
            <div className="text-red-500 text-center py-8">
              Failed to load daily issued items
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : (
            <>
              {/* Daily Summary */}
              {dailyTotals && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold">
                        {dailyTotals.totalItems}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Total Items Issued
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold">
                        {dailyTotals.totalQuantity}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Total Quantity
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold">
                        AFN {dailyTotals.totalValue.toFixed(2)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Total Value
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold">
                        {filteredItems.reduce(
                          (sum, item) => sum + item.currentStock,
                          0,
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Total Current Stock
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Mobile Card View */}
              <div className="block sm:hidden space-y-3">
                {table.getRowModel().rows?.length ? (
                  table
                    .getRowModel()
                    .rows.map((row) => (
                      <MobileInventoryCard key={row.id} item={row.original} />
                    ))
                ) : (
                  <div className="text-center py-8 border rounded-lg">
                    <p className="text-muted-foreground">
                      No items issued on selected date
                    </p>
                  </div>
                )}
              </div>

              {/* Desktop Table View */}
              <div className="hidden sm:block rounded-md border">
                <Table>
                  <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <TableHead key={header.id}>
                            {header.isPlaceholder
                              ? null
                              : flexRender(
                                  header.column.columnDef.header,
                                  header.getContext(),
                                )}
                          </TableHead>
                        ))}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody>
                    {table.getRowModel().rows?.length ? (
                      table.getRowModel().rows.map((row) => (
                        <TableRow
                          key={row.id}
                          data-state={row.getIsSelected() && "selected"}
                        >
                          {row.getVisibleCells().map((cell) => (
                            <TableCell key={cell.id}>
                              {flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext(),
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
                          No items issued on selected date
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination Controls */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4">
                <div className="text-sm text-muted-foreground">
                  Showing {table.getRowModel().rows.length} of{" "}
                  {filteredItems.length} items
                </div>

                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => table.previousPage()}
                        className={
                          !table.getCanPreviousPage()
                            ? "pointer-events-none opacity-50"
                            : "cursor-pointer"
                        }
                      />
                    </PaginationItem>

                    {Array.from(
                      { length: Math.min(3, table.getPageCount()) },
                      (_, i) => {
                        let pageNum = i + 1;
                        if (
                          table.getState().pagination.pageIndex > 1 &&
                          table.getPageCount() > 3
                        ) {
                          pageNum =
                            table.getState().pagination.pageIndex - 1 + i;
                        }
                        if (pageNum > table.getPageCount())
                          pageNum = table.getPageCount() - (2 - i);

                        return (
                          <PaginationItem key={pageNum}>
                            <PaginationLink
                              onClick={() => table.setPageIndex(pageNum - 1)}
                              isActive={
                                table.getState().pagination.pageIndex ===
                                pageNum - 1
                              }
                              className="cursor-pointer"
                            >
                              {pageNum}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      },
                    )}

                    <PaginationItem>
                      <PaginationNext
                        onClick={() => table.nextPage()}
                        className={
                          !table.getCanNextPage()
                            ? "pointer-events-none opacity-50"
                            : "cursor-pointer"
                        }
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>

                <div className="flex items-center space-x-2">
                  <p className="text-sm font-medium hidden sm:block">
                    Rows per page
                  </p>
                  <Select
                    value={`${table.getState().pagination.pageSize}`}
                    onValueChange={(value) => {
                      table.setPageSize(Number(value));
                    }}
                  >
                    <SelectTrigger className="h-8 w-[70px]">
                      <SelectValue
                        placeholder={table.getState().pagination.pageSize}
                      />
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
            </>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <div className="text-sm text-muted-foreground">
            {dateFilter
              ? `Items issued on ${format(dateFilter, "PPP")}`
              : "Today's issued items"}
          </div>
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCwIcon
              className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
