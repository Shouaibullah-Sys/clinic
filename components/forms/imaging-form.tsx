// components/forms/imaging-form.tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ImagingRecordSchema, type ImagingRecord } from "@/lib/schemas/imaging";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface ImagingFormProps {
  onSubmit: (data: ImagingRecord) => void;
  isLoading?: boolean;
  defaultValues?: Partial<ImagingRecord>;
}

export function ImagingForm({ onSubmit, isLoading, defaultValues }: ImagingFormProps) {
  const form = useForm<ImagingRecord>({
    resolver: zodResolver(ImagingRecordSchema),
    defaultValues: {
      imagingType: "xray",
      priority: "routine",
      contrast: false,
      views: [],
      ...defaultValues,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="imagingType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Imaging Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select imaging type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="xray">X-Ray</SelectItem>
                    <SelectItem value="ct_scan">CT Scan</SelectItem>
                    <SelectItem value="mri">MRI</SelectItem>
                    <SelectItem value="ultrasound">Ultrasound</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="patientId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Patient</FormLabel>
                <FormControl>
                  <Input placeholder="Select patient" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="bodyPart"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Body Part</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Chest, Abdomen, Head" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Priority</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="routine">Routine</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="emergency">Emergency</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="clinicalIndication"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Clinical Indication</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Reason for imaging..."
                    className="min-h-[100px]"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="contrast"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Contrast Required</FormLabel>
                </div>
              </FormItem>
            )}
          />

          {form.watch("contrast") && (
            <FormField
              control={form.control}
              name="contrastType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contrast Type</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Iodinated, Gadolinium" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {defaultValues?.id ? "Update" : "Create"} Imaging Record
          </Button>
        </div>
      </form>
    </Form>
  );
}