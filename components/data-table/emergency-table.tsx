// components/data-table/emergency-table.tsx
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Stethoscope, AlertTriangle } from "lucide-react";

interface EmergencyCase {
  id: string;
  emergencyId: string;
  patientName: string;
  triageLevel: string;
  chiefComplaint: string;
  status: string;
  arrivalTime: string;
  attendingDoctor: string;
}

const columns: ColumnDef<EmergencyCase>[] = [
  {
    accessorKey: "emergencyId",
    header: "ID",
  },
  {
    accessorKey: "patientName",
    header: "Patient",
  },
  {
    accessorKey: "triageLevel",
    header: "Triage",
    cell: ({ row }) => {
      const level = row.getValue("triageLevel") as string;
      const levelMap: Record<string, { label: string; color: string }> = {
        resuscitation: { label: "Resuscitation", color: "destructive" },
        emergent: { label: "Emergent", color: "destructive" },
        urgent: { label: "Urgent", color: "secondary" },
        less_urgent: { label: "Less Urgent", color: "outline" },
        non_urgent: { label: "Non-Urgent", color: "default" },
      };
      const config = levelMap[level] || { label: level, color: "default" };
      return <Badge variant={config.color as any}>{config.label}</Badge>;
    },
  },
  {
    accessorKey: "chiefComplaint",
    header: "Complaint",
    cell: ({ row }) => {
      const complaint = row.getValue("chiefComplaint") as string;
      return (
        <div className="max-w-50 truncate" title={complaint}>
          {complaint}
        </div>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      const variant = status === "active" ? "destructive" :
                     status === "admitted" ? "secondary" :
                     status === "discharged" ? "default" : "outline";
      return <Badge variant={variant}>{status}</Badge>;
    },
  },
  {
    accessorKey: "attendingDoctor",
    header: "Doctor",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Stethoscope className="h-4 w-4" />
        <span>{row.getValue("attendingDoctor")}</span>
      </div>
    ),
  },
  {
    accessorKey: "arrivalTime",
    header: "Arrival Time",
    cell: ({ row }) => {
      const time = new Date(row.getValue("arrivalTime"));
      return time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const caseId = row.original.id;
      return (
        <Button variant="ghost" size="sm">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      );
    },
  },
];

interface EmergencyTableProps {
  data: EmergencyCase[];
}

export function EmergencyTable({ data }: EmergencyTableProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          <h2 className="text-lg font-semibold">Emergency Cases</h2>
        </div>
        <div className="text-sm text-muted-foreground">
          Total: {data.length} cases
        </div>
      </div>
      <DataTable columns={columns} data={data} searchKey="patientName" />
    </div>
  );
}
