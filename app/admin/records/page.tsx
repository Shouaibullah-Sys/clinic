// app/admin/records/page.tsx

"use client";

import { useState, useCallback, memo, useMemo, useEffect } from "react";
import useSWR, { mutate } from "swr";
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon, 
  CalendarIcon,
  PackageIcon,
  CheckCircleIcon,
  ClockIcon,
  DollarSignIcon,
  ScissorsIcon,
  ShirtIcon
} from "lucide-react";
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
import { format, differenceInDays } from "date-fns";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

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

interface TailorRecord {
  _id: string;
  date: string;
  customerName: string;
  invoiceNumber: string;
  serviceType: string;
  clothingType: string;
  phoneNumber?: string;
  amountCharged: number;
  amountPaid: number;
  discount: number;
  paymentStatus: "paid" | "unpaid" | "partial";
  orderStatus: "pending" | "in_progress" | "completed" | "delivered";
  deliveryDate: string;
  measurements?: Record<string, any>;
  specialInstructions?: string;
  recordedBy?: {
    name: string;
    _id: string;
  };
}

interface FormFieldProps {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  optional?: boolean;
  type?: string;
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
  subtitle?: string;
  icon?: React.ReactNode;
  isCurrency?: boolean;
}

// Service type options
const SERVICE_TYPES = [
  { value: "stitching", label: "Stitching" },
  { value: "alteration", label: "Alteration" },
  { value: "repair", label: "Repair" },
  { value: "dry_cleaning", label: "Dry Cleaning" },
  { value: "other", label: "Other" },
];

// Clothing type options
const CLOTHING_TYPES = [
  { value: "shirt", label: "Shirt" },
  { value: "pant", label: "Pant" },
  { value: "suit", label: "Suit" },
  { value: "dress", label: "Dress" },
  { value: "blouse", label: "Blouse" },
  { value: "skirt", label: "Skirt" },
  { value: "jacket", label: "Jacket" },
  { value: "other", label: "Other" },
];

// Order status options
const ORDER_STATUS = [
  { value: "pending", label: "Pending", color: "bg-yellow-100 text-yellow-800" },
  { value: "in_progress", label: "In Progress", color: "bg-blue-100 text-blue-800" },
  { value: "completed", label: "Completed", color: "bg-green-100 text-green-800" },
  { value: "delivered", label: "Delivered", color: "bg-purple-100 text-purple-800" },
];

// Payment status options
const PAYMENT_STATUS = [
  { value: "paid", label: "Paid", color: "bg-green-100 text-green-800" },
  { value: "unpaid", label: "Unpaid", color: "bg-red-100 text-red-800" },
  { value: "partial", label: "Partial", color: "bg-orange-100 text-orange-800" },
];

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const FormField = memo(
  ({ label, value, onChange, optional = false, type = "text" }: FormFieldProps) => {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
        <Label
          htmlFor={label.toLowerCase().replace(/\s+/g, "-")}
          className="text-left sm:text-right text-sm font-medium"
        >
          {label}
          {!optional && "*"}
        </Label>
        {type === "textarea" ? (
          <Textarea
            id={label.toLowerCase().replace(/\s+/g, "-")}
            value={value}
            onChange={onChange}
            className="col-span-1 sm:col-span-3"
            rows={3}
          />
        ) : (
          <Input
            id={label.toLowerCase().replace(/\s+/g, "-")}
            value={value}
            onChange={onChange}
            className="col-span-1 sm:col-span-3"
            type={type}
          />
        )}
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

const SummaryCard = memo(({ title, value, subtitle, icon, isCurrency = true }: SummaryCardProps) => {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-3 sm:p-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm sm:text-base font-medium text-muted-foreground">
              {title}
            </h3>
            {icon}
          </div>
          <div className="space-y-1">
            <p className="text-lg sm:text-2xl font-bold">{isCurrency ? `AFN${value.toFixed(2)}` : value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
SummaryCard.displayName = "SummaryCard";

// Update the MeasurementField component
const MeasurementField = memo(({ 
  label, 
  value, 
  onChange 
}: { 
  label: string; 
  value: string; 
  onChange: (label: string, value: string) => void;
}) => {
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(label, e.target.value);
  }, [label, onChange]);

  return (
    <div className="flex items-center gap-2">
      <Label className="min-w-[80px] text-sm">{label}</Label>
      <Input
        value={value}
        onChange={handleChange}
        placeholder="Enter measurement"
        className="flex-1"
      />
    </div>
  );
});
MeasurementField.displayName = "MeasurementField";

export default function TailorRecords() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [deliveryDate, setDeliveryDate] = useState<Date | undefined>(new Date(new Date().setDate(new Date().getDate() + 7)));
  const [customerName, setCustomerName] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [clothingType, setClothingType] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [amountCharged, setAmountCharged] = useState(0);
  const [amountPaid, setAmountPaid] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [orderStatus, setOrderStatus] = useState("pending");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [measurements, setMeasurements] = useState<Record<string, string>>({
    chest: "",
    waist: "",
    length: "",
    shoulder: "",
    sleeve: "",
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<TailorRecord | null>(null);
  const [filterStartDate, setFilterStartDate] = useState<Date | undefined>();
  const [filterEndDate, setFilterEndDate] = useState<Date | undefined>();
  const [filterOrderStatus, setFilterOrderStatus] = useState<string>("");
  const [filterPaymentStatus, setFilterPaymentStatus] = useState<string>("");
  const [activeTab, setActiveTab] = useState("all");

  const handleCustomerNameChange = useCallback(
  (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setCustomerName(e.target.value);
  },
  []
);

  const handlePhoneNumberChange = useCallback(
  (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setPhoneNumber(e.target.value);
  },
  []
);

  const handleSpecialInstructionsChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setSpecialInstructions(e.target.value);
    },
    []
  );

  const handleAmountChargedChange = useCallback((value: number) => {
    setAmountCharged(value);
  }, []);

  const handleAmountPaidChange = useCallback((value: number) => {
    setAmountPaid(value);
  }, []);

  const handleDiscountChange = useCallback((value: number) => {
    setDiscount(value);
  }, []);

  const handleMeasurementChange = useCallback((label: string, value: string) => {
    setMeasurements(prev => ({ ...prev, [label]: value }));
  }, []);

  const queryString = new URLSearchParams();
  if (filterStartDate) queryString.append("startDate", filterStartDate.toISOString());
  if (filterEndDate) queryString.append("endDate", filterEndDate.toISOString());
  if (filterOrderStatus) queryString.append("orderStatus", filterOrderStatus);
  if (filterPaymentStatus) queryString.append("paymentStatus", filterPaymentStatus);

  const { data: records, isLoading } = useSWR<TailorRecord[]>(
    `/api/tailor/records?${queryString.toString()}`,
    fetcher
  );

  const { data: upcomingDeliveries } = useSWR<TailorRecord[]>(
    "/api/tailor/records/upcoming",
    fetcher
  );

  const totalCharged = useMemo(
    () =>
      Array.isArray(records)
        ? records.reduce((sum, r) => sum + (r?.amountCharged || 0), 0)
        : 0,
    [records]
  );

  const totalPaid = useMemo(
    () =>
      Array.isArray(records)
        ? records.reduce((sum, r) => sum + (r?.amountPaid || 0), 0)
        : 0,
    [records]
  );

  const totalDiscount = useMemo(
    () =>
      Array.isArray(records)
        ? records.reduce((sum, r) => sum + (r?.discount || 0), 0)
        : 0,
    [records]
  );

  const totalBalance = useMemo(
    () => totalCharged - totalPaid - totalDiscount,
    [totalCharged, totalPaid, totalDiscount]
  );

  const pendingOrders = useMemo(
    () =>
      Array.isArray(records)
        ? records.filter(r => r.orderStatus === "pending" || r.orderStatus === "in_progress").length
        : 0,
    [records]
  );

  // Define columns for TanStack Table
  const columns: ColumnDef<TailorRecord>[] = [
    {
      accessorKey: "date",
      header: "Order Date",
      cell: ({ row }) => {
        return format(new Date(row.original.date), "MMM d, yy");
      },
    },
    {
      accessorKey: "customerName",
      header: "Customer",
      cell: ({ row }) => {
        return (
          <div className="max-w-[120px] sm:max-w-none truncate">
            {row.original.customerName}
            <div className="text-xs text-muted-foreground">{row.original.phoneNumber}</div>
          </div>
        );
      },
    },
    {
      accessorKey: "invoiceNumber",
      header: "Invoice",
      cell: ({ row }) => {
        return (
          <div className="font-mono text-xs sm:text-sm">
            {row.original.invoiceNumber}
          </div>
        );
      },
    },
    {
      accessorKey: "serviceType",
      header: "Service",
      cell: ({ row }) => {
        const service = SERVICE_TYPES.find(s => s.value === row.original.serviceType);
        return (
          <Badge variant="outline" className="text-xs capitalize">
            {service?.label || row.original.serviceType}
          </Badge>
        );
      },
    },
    {
      accessorKey: "clothingType",
      header: "Item",
      cell: ({ row }) => {
        return (
          <div className="capitalize text-sm">
            {row.original.clothingType}
          </div>
        );
      },
    },
    {
      accessorKey: "deliveryDate",
      header: "Delivery",
      cell: ({ row }) => {
        const daysLeft = differenceInDays(new Date(row.original.deliveryDate), new Date());
        return (
          <div>
            <div className="text-sm">{format(new Date(row.original.deliveryDate), "MMM d")}</div>
            <div className={cn(
              "text-xs",
              daysLeft <= 2 ? "text-red-600 font-semibold" :
              daysLeft <= 5 ? "text-orange-600" :
              "text-muted-foreground"
            )}>
              {daysLeft > 0 ? `${daysLeft} days` : daysLeft === 0 ? "Today" : `${Math.abs(daysLeft)} days ago`}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "orderStatus",
      header: "Status",
      cell: ({ row }) => {
        const status = ORDER_STATUS.find(s => s.value === row.original.orderStatus);
        return (
          <Badge className={cn("text-xs", status?.color)}>
            {status?.label || row.original.orderStatus}
          </Badge>
        );
      },
    },
    {
      accessorKey: "paymentStatus",
      header: "Payment",
      cell: ({ row }) => {
        const status = PAYMENT_STATUS.find(s => s.value === row.original.paymentStatus);
        return (
          <Badge className={cn("text-xs", status?.color)}>
            {status?.label || row.original.paymentStatus}
          </Badge>
        );
      },
    },
    {
      accessorKey: "amountCharged",
      header: "Amount",
      cell: ({ row }) => {
        const balance = row.original.amountCharged - row.original.amountPaid - row.original.discount;
        return (
          <div>
            <div className="font-semibold">AFN {row.original.amountCharged.toFixed(2)}</div>
            {balance > 0 && (
              <div className="text-xs text-red-600">Balance: AFN {balance.toFixed(2)}</div>
            )}
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const record = row.original;
        return (
          <div className="flex gap-1 sm:gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 sm:h-8 sm:w-8"
              onClick={() => handleEdit(record)}
              title="Edit"
            >
              <PencilIcon className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 sm:h-8 sm:w-8"
              onClick={() => handleAddPayment(record._id)}
              title="Add Payment"
            >
              <DollarSignIcon className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 sm:h-8 sm:w-8"
              onClick={() => handleMarkDelivered(record._id)}
              title="Mark Delivered"
            >
              <CheckCircleIcon className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 sm:h-8 sm:w-8"
              onClick={() => handleDelete(record._id)}
              title="Delete"
            >
              <TrashIcon className="h-3 w-3 sm:h-4 sm:w-4 text-red-500" />
            </Button>
          </div>
        );
      },
    },
  ];

  // Setup TanStack Table with pagination
  const table = useReactTable({
    data: Array.isArray(records) ? records : [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  const resetForm = useCallback(() => {
  setDate(new Date());
  setDeliveryDate(new Date(new Date().setDate(new Date().getDate() + 7)));
  setCustomerName("");
  setServiceType("");
  setClothingType("");
  setPhoneNumber("");
  setAmountCharged(0);
  setAmountPaid(0);
  setDiscount(0);
  setOrderStatus("pending");
  setSpecialInstructions("");
  setMeasurements({
    chest: "",
    waist: "",
    length: "",
    shoulder: "",
    sleeve: "",
  });
  setEditMode(false);
  setCurrentRecord(null);
}, []);

  const handleEdit = useCallback((record: TailorRecord) => {
  setDate(new Date(record.date));
  setDeliveryDate(new Date(record.deliveryDate));
  setCustomerName(record.customerName);
  setServiceType(record.serviceType);
  setClothingType(record.clothingType);
  setPhoneNumber(record.phoneNumber || "");
  setAmountCharged(record.amountCharged);
  setAmountPaid(record.amountPaid);
  setDiscount(record.discount || 0);
  setOrderStatus(record.orderStatus);
  setSpecialInstructions(record.specialInstructions || "");
  
  // Update measurements properly
  const defaultMeasurements = {
    chest: "",
    waist: "",
    length: "",
    shoulder: "",
    sleeve: "",
  };
  
  if (record.measurements) {
    // Merge record measurements with defaults
    setMeasurements({
      ...defaultMeasurements,
      ...record.measurements,
    });
  } else {
    setMeasurements(defaultMeasurements);
  }
  
  setCurrentRecord(record);
  setEditMode(true);
  setDialogOpen(true);
}, []);

  const handleSubmit = async () => {
    if (
      !date ||
      !deliveryDate ||
      !customerName ||
      !serviceType ||
      !clothingType ||
      amountCharged <= 0
    ) {
      toast.error("Please fill all required fields");
      return;
    }

    try {
      const recordData = {
        date,
        deliveryDate,
        customerName,
        serviceType,
        clothingType,
        phoneNumber: phoneNumber || undefined,
        amountCharged,
        amountPaid,
        discount,
        orderStatus,
        specialInstructions: specialInstructions || undefined,
        measurements: Object.fromEntries(
          Object.entries(measurements).filter(([_, value]) => value.trim() !== "")
        ),
      };

      const url = editMode
        ? `/api/tailor/records?id=${currentRecord?._id}`
        : "/api/tailor/records";

      const method = editMode ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(recordData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Request failed");
      }

      toast.success(`Order ${editMode ? "updated" : "created"} successfully`);
      setDialogOpen(false);
      mutate(`/api/tailor/records?${queryString.toString()}`);
      resetForm();
    } catch (error: unknown) {
      toast.error(
        error instanceof Error
          ? error.message
          : "An error occurred while saving the order"
      );
    }
  };

  const handleAddPayment = async (id: string) => {
    const amount = prompt("Enter payment amount:");
    if (!amount || isNaN(parseFloat(amount))) {
      toast.error("Please enter a valid amount");
      return;
    }

    try {
      const response = await fetch(`/api/tailor/records/${id}/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: parseFloat(amount) }),
      });

      if (!response.ok) {
        throw new Error("Failed to add payment");
      }

      toast.success("Payment added successfully");
      mutate(`/api/tailor/records?${queryString.toString()}`);
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "Failed to add payment"
      );
    }
  };

  const handleMarkDelivered = async (id: string) => {
    if (!confirm("Mark this order as delivered?")) return;

    try {
      const response = await fetch(`/api/tailor/records/${id}/deliver`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to mark as delivered");
      }

      toast.success("Order marked as delivered");
      mutate(`/api/tailor/records?${queryString.toString()}`);
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "Failed to mark as delivered"
      );
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this order?")) return;

    try {
      const response = await fetch(`/api/tailor/records?id=${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete order");
      }

      toast.success("Order deleted successfully");
      mutate(`/api/tailor/records?${queryString.toString()}`);
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete order"
      );
    }
  };

  // Filter records based on active tab
  const filteredRecords = useMemo(() => {
    if (!Array.isArray(records)) return [];
    
    switch (activeTab) {
      case "pending":
        return records.filter(r => r.orderStatus === "pending" || r.orderStatus === "in_progress");
      case "upcoming":
        return records.filter(r => {
          const daysLeft = differenceInDays(new Date(r.deliveryDate), new Date());
          return daysLeft <= 7 && r.orderStatus !== "delivered";
        });
      case "unpaid":
        return records.filter(r => r.paymentStatus === "unpaid" || r.paymentStatus === "partial");
      default:
        return records;
    }
  }, [records, activeTab]);

  // Update table data when filteredRecords changes
  useEffect(() => {
    table.setPageIndex(0);
  }, [filteredRecords, table]);

  // Generate pagination items
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
          <h1 className="text-xl sm:text-2xl font-bold">Tailor Shop Records</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage orders, payments, and deliveries
          </p>
        </div>
        <Button
          onClick={() => {
            setDialogOpen(true);
            resetForm();
          }}
          className="w-full sm:w-auto text-xs sm:text-sm"
        >
          <PlusIcon className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
          New Order
        </Button>
      </div>

      {/* Tabs for different views */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="grid grid-cols-4 w-full max-w-md">
          <TabsTrigger value="all">All Orders</TabsTrigger>
          <TabsTrigger value="pending">Pending ({pendingOrders})</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="unpaid">Unpaid</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Filter Card - Responsive */}
      <Card className="mb-4 sm:mb-6">
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="text-sm sm:text-base">Filter Orders</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
            <div className="space-y-2">
              <Label className="text-sm font-medium">Order Status</Label>
              <Select value={filterOrderStatus || "all"} onValueChange={(value) => setFilterOrderStatus(value === "all" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {ORDER_STATUS.map(status => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Payment Status</Label>
              <Select value={filterPaymentStatus || "all"} onValueChange={(value) => setFilterPaymentStatus(value === "all" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All payments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {PAYMENT_STATUS.map(status => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <Button
              variant="secondary"
              className="text-xs sm:text-sm"
              onClick={() => {
                setFilterStartDate(undefined);
                setFilterEndDate(undefined);
                setFilterOrderStatus("");
                setFilterPaymentStatus("");
              }}
            >
              Clear All Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards - Responsive Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-6">
        <SummaryCard 
          title="Total Orders" 
          value={totalCharged}
          subtitle={`${Array.isArray(records) ? records.length : 0} orders`}
          icon={<PackageIcon className="h-5 w-5 text-muted-foreground" />}
        />
        <SummaryCard 
          title="Total Received" 
          value={totalPaid}
          subtitle="Amount collected"
          icon={<DollarSignIcon className="h-5 w-5 text-green-600" />}
        />
        <SummaryCard 
          title="Balance Due" 
          value={totalBalance}
          subtitle="Pending collection"
          icon={<ClockIcon className="h-5 w-5 text-orange-600" />}
        />
        <SummaryCard 
          title="Discount Given" 
          value={totalDiscount}
          subtitle="Total discount"
          icon={<ScissorsIcon className="h-5 w-5 text-purple-600" />}
        />
      </div>

      {/* Upcoming Deliveries */}
      {upcomingDeliveries && upcomingDeliveries.length > 0 && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              Upcoming Deliveries (Next 7 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {upcomingDeliveries.slice(0, 4).map(record => (
                <Card key={record._id} className="border-dashed">
                  <CardContent className="p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-sm">{record.customerName}</p>
                        <p className="text-xs text-muted-foreground">{record.clothingType}</p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {format(new Date(record.deliveryDate), "MMM d")}
                      </Badge>
                    </div>
                    <div className="mt-2 flex justify-between items-center">
                      <span className="text-sm font-semibold">AFN {record.amountCharged.toFixed(2)}</span>
                      <Badge className={cn(
                        "text-xs",
                        record.paymentStatus === "paid" ? "bg-green-100 text-green-800" :
                        record.paymentStatus === "partial" ? "bg-orange-100 text-orange-800" :
                        "bg-red-100 text-red-800"
                      )}>
                        {record.paymentStatus}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            {upcomingDeliveries.length > 4 && (
              <p className="text-sm text-muted-foreground mt-3">
                +{upcomingDeliveries.length - 4} more deliveries
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Table - Responsive with horizontal scroll */}
      <div className="border rounded-lg overflow-hidden mb-4">
        <div className="overflow-x-auto">
          <Table className="min-w-full">
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className="text-xs sm:text-sm whitespace-nowrap"
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
                      <TableCell key={cell.id} className="text-xs sm:text-sm">
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
                    No orders found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-sm text-muted-foreground">
          Showing {table.getRowModel().rows.length} of {filteredRecords.length} orders
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

      {/* Dialog - Responsive */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">
              {editMode ? "Edit Order" : "Create New Order"}
            </DialogTitle>
            <DialogDescription>
              {editMode 
                ? "Update the order details below."
                : "Fill in the details for the new tailoring order."
              }
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Customer Details */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Customer Details</h3>
              <FormField
                label="Customer Name*"
                value={customerName}
                onChange={handleCustomerNameChange}
              />
              <FormField
                label="Phone Number"
                value={phoneNumber}
                onChange={handlePhoneNumberChange}
                optional
                type="tel"
              />
            </div>

            {/* Order Details */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Order Details</h3>
              
              {/* Service Type */}
              <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                <Label className="text-left sm:text-right text-sm font-medium">
                  Service Type*
                </Label>
                <Select value={serviceType} onValueChange={setServiceType}>
                  <SelectTrigger className="col-span-1 sm:col-span-3">
                    <SelectValue placeholder="Select service type" />
                  </SelectTrigger>
                  <SelectContent>
                    {SERVICE_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Clothing Type */}
              <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                <Label className="text-left sm:text-right text-sm font-medium">
                  Clothing Type*
                </Label>
                <Select value={clothingType} onValueChange={setClothingType}>
                  <SelectTrigger className="col-span-1 sm:col-span-3">
                    <SelectValue placeholder="Select clothing type" />
                  </SelectTrigger>
                  <SelectContent>
                    {CLOTHING_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Order Status */}
              <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                <Label className="text-left sm:text-right text-sm font-medium">
                  Order Status
                </Label>
                <Select value={orderStatus} onValueChange={setOrderStatus}>
                  <SelectTrigger className="col-span-1 sm:col-span-3">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {ORDER_STATUS.map(status => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Dates */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Dates</h3>
              
              {/* Order Date */}
              <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                <Label className="text-left sm:text-right text-sm font-medium">
                  Order Date*
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
                      {date ? format(date, "PPP") : <span>Pick order date</span>}
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

              {/* Delivery Date */}
              <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                <Label className="text-left sm:text-right text-sm font-medium">
                  Delivery Date*
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "col-span-1 sm:col-span-3 justify-start text-left font-normal text-xs sm:text-sm",
                        !deliveryDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                      {deliveryDate ? format(deliveryDate, "PPP") : <span>Pick delivery date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={deliveryDate}
                      onSelect={setDeliveryDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Measurements */}
<div className="space-y-4">
  <h3 className="text-sm font-semibold">Measurements (Optional)</h3>
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
    <MeasurementField 
      label="chest" 
      value={measurements.chest || ""} 
      onChange={handleMeasurementChange} 
    />
    <MeasurementField 
      label="waist" 
      value={measurements.waist || ""} 
      onChange={handleMeasurementChange} 
    />
    <MeasurementField 
      label="length" 
      value={measurements.length || ""} 
      onChange={handleMeasurementChange} 
    />
    <MeasurementField 
      label="shoulder" 
      value={measurements.shoulder || ""} 
      onChange={handleMeasurementChange} 
    />
    <MeasurementField 
      label="sleeve" 
      value={measurements.sleeve || ""} 
      onChange={handleMeasurementChange} 
    />
  </div>
</div>

            {/* Special Instructions */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Special Instructions</h3>
              <Textarea
                value={specialInstructions}
                onChange={handleSpecialInstructionsChange}
                placeholder="Any special instructions or notes for this order..."
                className="min-h-[100px]"
              />
            </div>

            {/* Financial Details */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Financial Details</h3>
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
              <NumberField
                label="Discount"
                value={discount}
                onChange={handleDiscountChange}
              />
              {amountCharged > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                  <Label className="text-left sm:text-right text-sm font-medium">
                    Balance Due
                  </Label>
                  <div className="col-span-1 sm:col-span-3">
                    <p className="text-lg font-semibold">
                      AFN {(amountCharged - amountPaid - discount).toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Payment Status: {
                        amountPaid >= (amountCharged - discount) ? "Paid" :
                        amountPaid > 0 ? "Partial" : "Unpaid"
                      }
                    </p>
                  </div>
                </div>
              )}
            </div>
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
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="w-full sm:w-auto text-xs sm:text-sm"
              onClick={handleSubmit}
              disabled={isLoading}
            >
              {editMode ? "Update" : "Create"} Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}