// app/laboratory/templates/components/TemplateDetailsDialog.tsx

"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileText,
  Clock,
  DollarSign,
  CheckCircle,
  XCircle,
  AlertCircle,
  Edit,
  Printer,
  TestTube,
  Droplets,
  FlaskConical,
  Microscope,
  Activity,
  Pill,
  Beaker,
  Syringe,
} from "lucide-react";

interface LabTestTemplate {
  _id: string;
  testCode: string;
  testName: string;
  category: string;
  description?: string;
  specimenType: string[];
  containerType?: string[];
  sampleVolume?: string;
  fastingRequired: boolean;
  preparationInstructions?: string;
  turnaroundTime: number;
  basePrice: number;
  active: boolean;
  parameters: Array<{
    parameterCode: string;
    parameterName: string;
    unit?: string;
    normalRange: string;
    criticalLow?: number;
    criticalHigh?: number;
    maleRange?: string;
    femaleRange?: string;
    childRange?: string;
    methodology?: string;
  }>;
  createdBy: {
    _id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface TemplateDetailsDialogProps {
  template: LabTestTemplate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEditClick: () => void;
}

export function TemplateDetailsDialog({
  template,
  open,
  onOpenChange,
  onEditClick,
}: TemplateDetailsDialogProps) {
  const [isPrinting, setIsPrinting] = useState(false);

  if (!template) return null;

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case "hematology":
        return <Droplets className="h-4 w-4" />;
      case "biochemistry":
        return <FlaskConical className="h-4 w-4" />;
      case "microbiology":
        return <Microscope className="h-4 w-4" />;
      case "serology":
        return <TestTube className="h-4 w-4" />;
      case "immunology":
        return <Activity className="h-4 w-4" />;
      case "hormonal":
        return <Pill className="h-4 w-4" />;
      case "urinalysis":
        return <Beaker className="h-4 w-4" />;
      case "stool_test":
        return <Syringe className="h-4 w-4" />;
      default:
        return <TestTube className="h-4 w-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case "hematology":
        return "bg-red-100 text-red-800 border-red-300";
      case "biochemistry":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "microbiology":
        return "bg-green-100 text-green-800 border-green-300";
      case "serology":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "immunology":
        return "bg-purple-100 text-purple-800 border-purple-300";
      case "hormonal":
        return "bg-pink-100 text-pink-800 border-pink-300";
      case "urinalysis":
        return "bg-cyan-100 text-cyan-800 border-cyan-300";
      case "stool_test":
        return "bg-orange-100 text-orange-800 border-orange-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 100);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] lg:max-w-6xl max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <FileText className="h-5 w-5" />
                Template Details: {template.testCode}
              </DialogTitle>
              <DialogDescription className="mt-1">
                Complete template information and parameters
              </DialogDescription>
            </div>
            <Badge
              variant="outline"
              className={getCategoryColor(template.category)}
            >
              <div className="flex items-center gap-1">
                {getCategoryIcon(template.category)}
                <span className="capitalize">
                  {template.category
                    .replace(/_/g, " ")
                    .replace(/\b\w/g, (l) => l.toUpperCase())}
                </span>
              </div>
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Test Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <span className="font-semibold">{template.testName}</span>
                </div>
                {template.description && (
                  <div className="text-sm text-muted-foreground">
                    {template.description}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Status & Pricing
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2">
                  {template.active ? (
                    <Badge className="bg-green-100 text-green-800">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-gray-500">
                      <XCircle className="h-3 w-3 mr-1" />
                      Inactive
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-lg font-semibold">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  {formatPrice(template.basePrice)}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  {template.turnaroundTime} hours turnaround
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Specimen Information */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Specimen Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium">Specimen Type</div>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {template.specimenType.map((specimen, index) => (
                      <Badge key={index} variant="outline">
                        {specimen.charAt(0).toUpperCase() + specimen.slice(1)}
                      </Badge>
                    ))}
                  </div>
                </div>
                {template.containerType &&
                  template.containerType.length > 0 && (
                    <div>
                      <div className="text-sm font-medium">Container Type</div>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {template.containerType.map((container, index) => (
                          <Badge
                            key={index}
                            variant="outline"
                            className="bg-blue-50"
                          >
                            {container}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                {template.sampleVolume && (
                  <div>
                    <div className="text-sm font-medium">Sample Volume</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {template.sampleVolume}
                    </div>
                  </div>
                )}
                <div>
                  <div className="text-sm font-medium">Fasting Required</div>
                  <div className="mt-1">
                    {template.fastingRequired ? (
                      <Badge className="bg-orange-100 text-orange-800">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Yes - Fasting required
                      </Badge>
                    ) : (
                      <Badge variant="outline">No</Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Preparation Instructions */}
          {template.preparationInstructions && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Preparation Instructions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm bg-yellow-50 p-3 rounded border border-yellow-200">
                  {template.preparationInstructions}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Parameters */}
          {template.parameters && template.parameters.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Test Parameters ({template.parameters.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Parameter</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead>Normal Range</TableHead>
                        <TableHead>Critical Range</TableHead>
                        <TableHead>Methodology</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {template.parameters.map((param, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-mono text-sm">
                            {param.parameterCode}
                          </TableCell>
                          <TableCell className="font-medium">
                            {param.parameterName}
                          </TableCell>
                          <TableCell>{param.unit || "-"}</TableCell>
                          <TableCell>{param.normalRange}</TableCell>
                          <TableCell>
                            {param.criticalLow !== undefined ||
                            param.criticalHigh !== undefined ? (
                              <span className="text-red-600 text-sm">
                                {param.criticalLow !== undefined &&
                                  `Low: ${param.criticalLow}`}
                                {param.criticalLow !== undefined &&
                                  param.criticalHigh !== undefined &&
                                  " / "}
                                {param.criticalHigh !== undefined &&
                                  `High: ${param.criticalHigh}`}
                              </span>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell>{param.methodology || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Metadata */}
          <div className="text-xs text-muted-foreground">
            <Separator className="my-4" />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="font-medium">Created by:</span>{" "}
                {template.createdBy?.name || "Unknown"}
              </div>
              <div>
                <span className="font-medium">Created:</span>{" "}
                {new Date(template.createdAt).toLocaleDateString("en-IN", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
              <div>
                <span className="font-medium">Last updated:</span>{" "}
                {new Date(template.updatedAt).toLocaleDateString("en-IN", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex justify-between sm:justify-between">
          <Button variant="outline" onClick={handlePrint} disabled={isPrinting}>
            <Printer className="h-4 w-4 mr-2" />
            {isPrinting ? "Printing..." : "Print"}
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button onClick={onEditClick}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Template
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
