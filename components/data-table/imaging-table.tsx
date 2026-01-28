// components/data-table/imaging-table.tsx
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ImagingRecord {
  id: string;
  serviceId: string;
  imagingType: string;
  patientName: string;
  bodyPart: string;
  status: string;
  priority: string;
  createdAt: string;
  scheduledDate?: string;
  performedDate?: string;
  reportStatus?: string;
  billingStatus?: string;
  referringDoctor?: string;
  radiologist?: string;
  technician?: string;
}

const columns: ColumnDef<ImagingRecord>[] = [
  {
    accessorKey: "serviceId",
    header: "Service ID",
    cell: ({ row }) => {
      return <span className="font-mono text-sm">{row.getValue("serviceId")}</span>;
    },
  },
  {
    accessorKey: "imagingType",
    header: "Type",
    cell: ({ row }) => {
      const type = row.getValue("imagingType") as string;
      const typeMap: Record<string, string> = {
        "x-ray": "X-Ray",
        "ct-scan": "CT Scan",
        mri: "MRI",
        ultrasound: "Ultrasound",
      };
      return typeMap[type] || type;
    },
  },
  {
    accessorKey: "patientName",
    header: "Patient",
  },
  {
    accessorKey: "bodyPart",
    header: "Body Part",
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      const variant = status === "completed" ? "default" :
                     status === "in-progress" ? "secondary" :
                     status === "scheduled" ? "outline" : "destructive";
      const label = status === "in-progress" ? "In Progress" : 
                   status.charAt(0).toUpperCase() + status.slice(1);
      return <Badge variant={variant}>{label}</Badge>;
    },
  },
  {
    accessorKey: "priority",
    header: "Priority",
    cell: ({ row }) => {
      const priority = row.getValue("priority") as string;
      const variant = priority === "emergency" ? "destructive" :
                     priority === "urgent" ? "secondary" : "outline";
      const label = priority.charAt(0).toUpperCase() + priority.slice(1);
      return <Badge variant={variant}>{label}</Badge>;
    },
  },
  {
    accessorKey: "reportStatus",
    header: "Report",
    cell: ({ row }) => {
      const reportStatus = row.getValue("reportStatus") as string;
      if (!reportStatus) return <span className="text-muted-foreground">-</span>;
      const variant = reportStatus === "completed" ? "default" :
                     reportStatus === "reviewed" ? "secondary" :
                     reportStatus === "approved" ? "outline" : "destructive";
      const label = reportStatus.charAt(0).toUpperCase() + reportStatus.slice(1);
      return <Badge variant={variant}>{label}</Badge>;
    },
  },
  {
    accessorKey: "billingStatus",
    header: "Billing",
    cell: ({ row }) => {
      const billingStatus = row.getValue("billingStatus") as string;
      if (!billingStatus) return <span className="text-muted-foreground">-</span>;
      const variant = billingStatus === "paid" ? "default" :
                     billingStatus === "billed" ? "secondary" : "outline";
      const label = billingStatus.charAt(0).toUpperCase() + billingStatus.slice(1);
      return <Badge variant={variant}>{label}</Badge>;
    },
  },
  {
    accessorKey: "scheduledDate",
    header: "Scheduled",
    cell: ({ row }) => {
      const date = row.getValue("scheduledDate") as string;
      if (!date) return <span className="text-muted-foreground">-</span>;
      return new Date(date).toLocaleDateString();
    },
  },
];

interface ImagingTableProps {
  data: ImagingRecord[];
}

export function ImagingTable({ data }: ImagingTableProps) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
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
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {table.getRowModel().rows.length} of {data.length} results
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}