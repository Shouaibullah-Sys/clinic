// components/pharmacy/MedicineInventoryForm.tsx

'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const formSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  batchNumber: z.string().min(1, 'Batch number is required'),
  expiryDate: z.date().refine(val => val instanceof Date, 'Expiry date is required'),
  originalQuantity: z.number().min(0, 'Quantity must be at least 0'),
  currentQuantity: z.number().min(0).optional(),
  unitPrice: z.number().min(0, 'Unit price must be at least 0'),
  sellingPrice: z.number().min(0, 'Selling price must be at least 0'),
  supplier: z.string().min(2, 'Supplier must be at least 2 characters'),
  description: z.string().optional(),
});

interface Medicine {
  _id: string;
  name: string;
  batchNumber: string;
  expiryDate: Date;
  originalQuantity: number;
  currentQuantity: number;
  unitPrice: number;
  sellingPrice: number;
  supplier: string;
  description?: string;
}

interface MedicineStockFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: Medicine;
  onSuccess: () => void;
}

export function MedicineStockForm({ open, onOpenChange, initialData, onSuccess }: MedicineStockFormProps) {
  const [loading, setLoading] = useState(false);
  const isEditMode = !!initialData;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData || {
      name: '',
      batchNumber: '',
      expiryDate: new Date(),
      originalQuantity: 0,
      currentQuantity: 0,
      unitPrice: 0,
      sellingPrice: 0,
      supplier: '',
      description: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    try {
      const url = initialData 
        ? `/api/pharmacy/inventory/${initialData._id}` 
        : '/api/pharmacy/inventory';
      
      const method = initialData ? 'PUT' : 'POST';
      
      // For new items, set currentQuantity = originalQuantity if not provided
      const payload = {
        ...values,
        currentQuantity: values.currentQuantity || values.originalQuantity
      };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast.success(isEditMode ? 'Medicine updated successfully' : 'Medicine added successfully');
        onSuccess();
      } else {
        const errorData = await response.json() as { error?: string };
        throw new Error(errorData.error || 'Failed to save medicine');
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to save medicine');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Medicine' : 'Add New Medicine'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Medicine Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter medicine name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="batchNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Batch Number *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter batch number" 
                        {...field} 
                        disabled={isEditMode}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="expiryDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Expiry Date *</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {isEditMode ? (
                <>
                  <FormField
                    control={form.control}
                    name="originalQuantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Original Quantity *</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="Original quantity" 
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="currentQuantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Quantity *</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="Current quantity" 
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              ) : (
                <FormField
                  control={form.control}
                  name="originalQuantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantity *</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="Enter quantity" 
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="unitPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit Price *</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01"
                        placeholder="Enter unit price" 
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sellingPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Selling Price *</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01"
                        placeholder="Enter selling price" 
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="supplier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Supplier *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter supplier name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Additional details about the medicine" 
                        {...field} 
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-4">
              <Button 
                type="button" 
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </span>
                ) : isEditMode ? 'Update Medicine' : 'Add Medicine'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}