import { useState } from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  ColumnFiltersState,
  getFilteredRowModel,
} from '@tanstack/react-table';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { MoreVertical, ArrowUpDown } from 'lucide-react';
import { useSWRConfig } from 'swr';
import { toast } from 'sonner';
import DeleteConfirmationDialog from '@/components/DeleteConfirmationDialog';
import { useAuthStore } from '@/store/useAuthStore';
import { Badge } from '@/components/ui/badge';

// Define the medicine stock type
interface MedicineStock {
  _id: string;
  name: string;
  batchNumber: string;
  currentQuantity: number;
  originalQuantity: number;
  remainingPercentage: number;
  expiryDate: string | Date;
  expiryStatus: 'valid' | 'expiring-soon' | 'expired';
  unitPrice: number;
  sellingPrice: number;
  supplier: string;
}

// Define the pagination type
interface Pagination {
  page: number;
  totalPages: number;
}

// Define the component props
interface MedicineStockTableProps {
  data: MedicineStock[];
  onEdit: (stock: MedicineStock) => void;
  onDeleteSuccess: () => void;
  pagination?: Pagination;
}

export default function MedicineStockTable({ 
  data, 
  onEdit,
  onDeleteSuccess,
  pagination
}: MedicineStockTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState<MedicineStock | null>(null);
  const { mutate } = useSWRConfig();
  const { user } = useAuthStore();

  const columns: ColumnDef<MedicineStock>[] = [
    {
      accessorKey: 'name',
      header: 'Medicine Name',
    },
    {
      accessorKey: 'batchNumber',
      header: 'Batch Number',
    },
    {
      accessorKey: 'currentQuantity',
      header: 'Current Quantity',
      cell: ({ row }) => {
        const stock = row.original;
        return (
          <div>
            <div className="font-medium">{stock.currentQuantity}</div>
            <div className="flex items-center gap-2 mt-1">
              <Progress 
                value={stock.remainingPercentage} 
                className="h-2 w-24" 
              />
              <span className="text-xs text-muted-foreground">
                {Math.round(stock.remainingPercentage)}%
              </span>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'originalQuantity',
      header: 'Original Quantity',
    },
    {
      accessorKey: 'expiryDate',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Expiry Date
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const date = new Date(row.getValue('expiryDate'));
        return (
          <div className="flex flex-col">
            <span>{date.toLocaleDateString()}</span>
            <Badge 
              variant={
                row.original.expiryStatus === 'expired' ? 'destructive' : 
                row.original.expiryStatus === 'expiring-soon' ? 'warning' : 'default'
              }
              className="mt-1 w-fit"
            >
              {row.original.expiryStatus === 'expired' ? 'Expired' : 
               row.original.expiryStatus === 'expiring-soon' ? 'Expiring Soon' : 'Valid'}
            </Badge>
          </div>
        );
      },
    },
    {
      accessorKey: 'unitPrice',
      header: 'Unit Price',
      cell: ({ row }) => `AFN ${parseFloat(row.getValue('unitPrice')).toFixed(2)}`,
    },
    {
      accessorKey: 'sellingPrice',
      header: 'Selling Price',
      cell: ({ row }) => `AFN ${parseFloat(row.getValue('sellingPrice')).toFixed(2)}`,
    },
    {
      accessorKey: 'supplier',
      header: 'Supplier',
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const stock = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {(user?.role === 'pharmacy' || user?.role === 'admin') && (
                <DropdownMenuItem onClick={() => onEdit(stock)}>
                  Edit
                </DropdownMenuItem>
              )}
              {user?.role === 'admin' && (
                <DropdownMenuItem
                  onClick={() => {
                    setSelectedStock(stock);
                    setDeleteDialogOpen(true);
                  }}
                >
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
    },
  });

  const handleDelete = async () => {
    if (!selectedStock) return;
    
    try {
      const response = await fetch(`/api/pharmacy/stock/${selectedStock._id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast('Success', {
          description: 'Medicine deleted successfully',
        });
        onDeleteSuccess();
      } else {
        throw new Error('Failed to delete medicine');
      }
    } catch (error) {
      toast('Error', {
        description: 'Could not delete medicine',
      });
    } finally {
      setDeleteDialogOpen(false);
      setSelectedStock(null);
    }
  };

  return (
    <div>
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
                  No medicines found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between py-4">
        <div className="text-sm text-muted-foreground">
          Page {pagination?.page} of {pagination?.totalPages}
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => mutate('/api/pharmacy/stock')}
          >
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!pagination || pagination.page <= 1}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!pagination || pagination.page >= pagination.totalPages}
          >
            Next
          </Button>
        </div>
      </div>

      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
        title="Delete Medicine"
        description={`Are you sure you want to delete ${selectedStock?.name} (Batch: ${selectedStock?.batchNumber})?`}
      />
    </div>
  );
}
