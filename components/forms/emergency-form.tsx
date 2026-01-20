// components/forms/emergency-form.tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { EmergencyCaseSchema, type EmergencyCase } from "@/lib/schemas/emergency";
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
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface EmergencyFormProps {
  onSubmit: (data: EmergencyCase) => void;
  isLoading?: boolean;
  defaultValues?: {
    id?: string;
    patientId?: string;
    triageLevel?: EmergencyCase['triageLevel'];
    chiefComplaint?: string;
    vitalSigns?: Partial<EmergencyCase['vitalSigns']>;
    allergies?: string[];
    medications?: string[];
  };
}

export function EmergencyForm({ onSubmit, isLoading, defaultValues }: EmergencyFormProps) {
  const form = useForm<EmergencyCase>({
    defaultValues: {
      triageLevel: "urgent",
      vitalSigns: {
        bloodPressure: "120/80",
        heartRate: 72,
        respiratoryRate: 16,
        temperature: 37,
        oxygenSaturation: 98,
        painScale: 0,
      },
      allergies: [],
      medications: [],
      ...defaultValues,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
            name="triageLevel"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Triage Level</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select triage level" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="resuscitation">Resuscitation</SelectItem>
                    <SelectItem value="emergent">Emergent</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="less_urgent">Less Urgent</SelectItem>
                    <SelectItem value="non_urgent">Non-Urgent</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="chiefComplaint"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Chief Complaint</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Patient's main complaint..."
                    className="min-h-[80px]"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="allergies"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Allergies</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="List allergies separated by commas..."
                    className="min-h-[60px]"
                    value={field.value?.join(", ") || ""}
                    onChange={(e) => field.onChange(e.target.value.split(",").map(s => s.trim()).filter(s => s))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="medications"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Current Medications</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="List current medications separated by commas..."
                    className="min-h-[60px]"
                    value={field.value?.join(", ") || ""}
                    onChange={(e) => field.onChange(e.target.value.split(",").map(s => s.trim()).filter(s => s))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="md:col-span-2">
            <h3 className="text-lg font-semibold mb-4">Vital Signs</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="vitalSigns.bloodPressure"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>BP (mmHg)</FormLabel>
                    <FormControl>
                      <Input placeholder="120/80" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="vitalSigns.heartRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Heart Rate</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="72"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="vitalSigns.respiratoryRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Respiratory Rate</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="16"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="vitalSigns.temperature"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Temperature (°C)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="37.0"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="vitalSigns.oxygenSaturation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SpO₂ (%)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="98"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="vitalSigns.painScale"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pain (0-10)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        max="10"
                        placeholder="0"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {defaultValues?.id ? "Update" : "Create"} Emergency Case
          </Button>
        </div>
      </form>
    </Form>
  );
}
