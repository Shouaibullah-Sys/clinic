// components/pharmacy/MedicineStockReport.tsx
"use client";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import PDFGenerator from "@/components/pharmacy/PDFGenerator";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";

interface MedicineStock {
  _id: string;
  name: string;
  batchNumber: string;
  currentQuantity: number;
  originalQuantity: number;
  expiryDate: string;
  supplier: string;
  sellingPrice: number;
  unitPrice: number;
}

type ReportType = "all" | "expiring" | "expired" | "low";

interface MedicineStockReportProps {
  data: MedicineStock[];
}

export default function MedicineStockReport({
  data,
}: MedicineStockReportProps) {
  const [reportType, setReportType] = useState<ReportType>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15; // Set to 15 rows per page as requested

  // Calculate expiry status and filter data based on report type
  const filteredData = useMemo(() => {
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    return data.filter((item) => {
      const expiryDate = new Date(item.expiryDate);

      if (reportType === "expiring") {
        return expiryDate > today && expiryDate <= thirtyDaysFromNow;
      }

      if (reportType === "expired") {
        return expiryDate < today;
      }

      if (reportType === "low") {
        const stockPercentage =
          (item.currentQuantity / item.originalQuantity) * 100;
        return stockPercentage < 20; // Less than 20% stock remaining
      }

      return true;
    });
  }, [data, reportType]);

  // Calculate pagination data
  const paginationData = useMemo(() => {
    const totalItems = filteredData.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    // Ensure current page is valid when data changes
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    } else if (currentPage < 1 && totalItems > 0) {
      setCurrentPage(1);
    }

    // Get data for current page
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentItems = filteredData.slice(startIndex, endIndex);

    return {
      totalItems,
      totalPages,
      currentItems,
    };
  }, [filteredData, currentPage, itemsPerPage]);

  // Handle page change
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= paginationData.totalPages) {
      setCurrentPage(page);
    }
  };

  const getReportTitle = (): string => {
    switch (reportType) {
      case "expiring":
        return "Expiring Soon Medicines";
      case "expired":
        return "Expired Medicines";
      case "low":
        return "Low Stock Medicines";
      default:
        return "All Medicines Stock Report";
    }
  };

  const calculateStockPercentage = (current: number, original: number) => {
    if (original === 0) return 0;
    return Math.round((current / original) * 100);
  };

  const getExpiryStatus = (expiryDate: string) => {
    const expiry = new Date(expiryDate);
    const today = new Date();
    const daysToExpiry = Math.floor(
      (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (expiry < today) {
      return { status: "Expired", variant: "destructive" as const };
    } else if (daysToExpiry <= 30) {
      return {
        status: `Expires in ${daysToExpiry} days`,
        variant: "destructive" as const,
      };
    } else if (daysToExpiry <= 90) {
      return {
        status: `Expires in ${daysToExpiry} days`,
        variant: "outline" as const,
      };
    } else {
      return { status: "Valid", variant: "default" as const };
    }
  };

  // Generate pagination items
  const renderPaginationItems = () => {
    const items = [];
    const totalPages = paginationData.totalPages;

    // Always show first page
    items.push(
      <PaginationItem key={1}>
        <PaginationLink
          isActive={currentPage === 1}
          onClick={() => handlePageChange(1)}
        >
          1
        </PaginationLink>
      </PaginationItem>
    );

    // Add ellipsis if needed
    if (currentPage > 3) {
      items.push(
        <PaginationItem key="ellipsis-start">
          <PaginationEllipsis />
        </PaginationItem>
      );
    }

    // Show pages around current page
    for (
      let i = Math.max(2, currentPage - 1);
      i <= Math.min(totalPages - 1, currentPage + 1);
      i++
    ) {
      if (i > 1 && i < totalPages) {
        items.push(
          <PaginationItem key={i}>
            <PaginationLink
              isActive={currentPage === i}
              onClick={() => handlePageChange(i)}
            >
              {i}
            </PaginationLink>
          </PaginationItem>
        );
      }
    }

    // Add ellipsis if needed
    if (currentPage < totalPages - 2) {
      items.push(
        <PaginationItem key="ellipsis-end">
          <PaginationEllipsis />
        </PaginationItem>
      );
    }

    // Always show last page if there is more than one page
    if (totalPages > 1) {
      items.push(
        <PaginationItem key={totalPages}>
          <PaginationLink
            isActive={currentPage === totalPages}
            onClick={() => handlePageChange(totalPages)}
          >
            {totalPages}
          </PaginationLink>
        </PaginationItem>
      );
    }

    return items;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <Button
            variant={reportType === "all" ? "default" : "outline"}
            onClick={() => {
              setReportType("all");
              setCurrentPage(1);
            }}
          >
            All Medicines
          </Button>
          <Button
            variant={reportType === "expiring" ? "default" : "outline"}
            onClick={() => {
              setReportType("expiring");
              setCurrentPage(1);
            }}
          >
            Expiring Soon
          </Button>
          <Button
            variant={reportType === "expired" ? "default" : "outline"}
            onClick={() => {
              setReportType("expired");
              setCurrentPage(1);
            }}
          >
            Expired
          </Button>
          <Button
            variant={reportType === "low" ? "default" : "outline"}
            onClick={() => {
              setReportType("low");
              setCurrentPage(1);
            }}
          >
            Low Stock
          </Button>
        </div>

        <PDFGenerator data={filteredData} title={getReportTitle()} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {getReportTitle()} ({filteredData.length} items)
            {paginationData.totalPages > 1 && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                (Page {currentPage} of {paginationData.totalPages})
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Medicine</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead>Stock Level</TableHead>
                <TableHead>Expiry Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Unit Price</TableHead>
                <TableHead>Selling Price</TableHead>
                <TableHead>Supplier</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginationData.currentItems.length > 0 ? (
                paginationData.currentItems.map((item) => {
                  const stockPercentage = calculateStockPercentage(
                    item.currentQuantity,
                    item.originalQuantity
                  );
                  const expiryStatus = getExpiryStatus(item.expiryDate);

                  return (
                    <TableRow key={item._id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{item.batchNumber}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-4">
                          <div className="min-w-[100px]">
                            <Progress value={stockPercentage} className="h-2" />
                            <div className="text-xs text-muted-foreground text-right">
                              {item.currentQuantity}/{item.originalQuantity} (
                              {stockPercentage}%)
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(item.expiryDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant={expiryStatus.variant}>
                          {expiryStatus.status}
                        </Badge>
                      </TableCell>
                      <TableCell>AFN {item.unitPrice.toFixed(2)}</TableCell>
                      <TableCell>AFN {item.sellingPrice.toFixed(2)}</TableCell>
                      <TableCell>{item.supplier}</TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    No medicines found for this report
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* Pagination Controls */}
          {paginationData.totalPages > 1 && (
            <div className="mt-6">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => handlePageChange(currentPage - 1)}
                      className={
                        currentPage === 1
                          ? "pointer-events-none opacity-50"
                          : "cursor-pointer"
                      }
                    />
                  </PaginationItem>

                  {renderPaginationItems()}

                  <PaginationItem>
                    <PaginationNext
                      onClick={() => handlePageChange(currentPage + 1)}
                      className={
                        currentPage === paginationData.totalPages
                          ? "pointer-events-none opacity-50"
                          : "cursor-pointer"
                      }
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
