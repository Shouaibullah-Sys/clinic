// components/radiologist/RadiologyTemplateTable.tsx
"use client";

import { useState } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  useRadiologyTemplates,
  useDeleteRadiologyTemplate,
} from "@/lib/hooks/use-services";
import { RadiologyTemplateForm } from "./RadiologyTemplateForm";
import { Edit, Trash2, Eye, Search } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";

interface RadiologyTemplateTableProps {
  onSelectTemplate?: (template: any) => void;
}

export function RadiologyTemplateTable({
  onSelectTemplate,
}: RadiologyTemplateTableProps) {
  const [search, setSearch] = useState("");
  const [serviceTypeFilter, setServiceTypeFilter] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [activeFilter, setActiveFilter] = useState<string>("true");
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  const { user } = useAuthStore();
  const {
    data: templatesData,
    isLoading,
    refetch,
  } = useRadiologyTemplates({
    search: search || undefined,
    serviceType: serviceTypeFilter || undefined,
    category: categoryFilter || undefined,
    active: activeFilter !== "" ? activeFilter : undefined,
  });

  const deleteMutation = useDeleteRadiologyTemplate();

  const templates = templatesData?.data || [];
  const canEdit =
    user?.role === "radiologist" ||
    user?.role === "doctor" ||
    user?.role === "admin";
  const canDelete = user?.role === "admin";

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this template?")) {
      try {
        await deleteMutation.mutateAsync(id);
        toast.success("Template deleted successfully");
      } catch (error: any) {
        toast.error(error.message || "Failed to delete template");
      }
    }
  };

  const handleEdit = (template: any) => {
    setSelectedTemplate(template);
    setIsDialogOpen(true);
  };

  const handleView = (template: any) => {
    setSelectedTemplate(template);
    setIsViewDialogOpen(true);
  };

  const handleCreateNew = () => {
    setSelectedTemplate(null);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedTemplate(null);
  };

  const handleCloseViewDialog = () => {
    setIsViewDialogOpen(false);
    setSelectedTemplate(null);
  };

  const getServiceTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      "x-ray": "bg-blue-100 text-blue-800",
      "ct-scan": "bg-purple-100 text-purple-800",
      mri: "bg-indigo-100 text-indigo-800",
      ultrasound: "bg-green-100 text-green-800",
      mammography: "bg-pink-100 text-pink-800",
      fluoroscopy: "bg-orange-100 text-orange-800",
      "pet-scan": "bg-red-100 text-red-800",
      "bone-density": "bg-yellow-100 text-yellow-800",
    };
    return colors[type] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-50 sm:w-75"
            />
          </div>

          <Select
            value={serviceTypeFilter}
            onValueChange={setServiceTypeFilter}
          >
            <SelectTrigger className="w-35">
              <SelectValue placeholder="Service Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Service Types</SelectItem>
              <SelectItem value="x-ray">X-Ray</SelectItem>
              <SelectItem value="ct-scan">CT Scan</SelectItem>
              <SelectItem value="mri">MRI</SelectItem>
              <SelectItem value="ultrasound">Ultrasound</SelectItem>
              <SelectItem value="mammography">Mammography</SelectItem>
              <SelectItem value="fluoroscopy">Fluoroscopy</SelectItem>
              <SelectItem value="pet-scan">PET Scan</SelectItem>
              <SelectItem value="bone-density">Bone Density</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-35">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Categories</SelectItem>
              <SelectItem value="diagnostic">Diagnostic</SelectItem>
              <SelectItem value="screening">Screening</SelectItem>
              <SelectItem value="interventional">Interventional</SelectItem>
              <SelectItem value="therapeutic">Therapeutic</SelectItem>
              <SelectItem value="follow-up">Follow-up</SelectItem>
              <SelectItem value="emergency">Emergency</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>

          <Select value={activeFilter} onValueChange={setActiveFilter}>
            <SelectTrigger className="w-30">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All</SelectItem>
              <SelectItem value="true">Active</SelectItem>
              <SelectItem value="false">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {canEdit && (
          <Button onClick={handleCreateNew}>Create New Template</Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Exam Name</TableHead>
              <TableHead>Service Type</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Body Part</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8">
                  Loading templates...
                </TableCell>
              </TableRow>
            ) : templates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8">
                  No templates found
                </TableCell>
              </TableRow>
            ) : (
              templates.map((template: any) => (
                <TableRow key={template._id}>
                  <TableCell className="font-mono text-sm">
                    {template.templateCode}
                  </TableCell>
                  <TableCell className="font-medium">
                    {template.examName}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={getServiceTypeBadge(template.serviceType)}
                    >
                      {template.serviceType}
                    </Badge>
                  </TableCell>
                  <TableCell className="capitalize">
                    {template.category}
                  </TableCell>
                  <TableCell className="capitalize">
                    {template.bodyPart || "-"}
                  </TableCell>
                  <TableCell>{template.duration} min</TableCell>
                  <TableCell>${template.basePrice.toFixed(2)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={template.active}
                        disabled
                        className="h-4 w-4"
                      />
                      <span className="text-sm">
                        {template.active ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleView(template)}
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(template)}
                          title="Edit Template"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(template._id)}
                          title="Delete Template"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit/Create Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedTemplate?._id ? "Edit Template" : "Create New Template"}
            </DialogTitle>
          </DialogHeader>
          <RadiologyTemplateForm
            template={selectedTemplate}
            onClose={handleCloseDialog}
            onSuccess={() => {
              refetch();
              handleCloseDialog();
            }}
          />
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Template Details</DialogTitle>
          </DialogHeader>
          {selectedTemplate && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Template Code</label>
                  <p className="font-mono">{selectedTemplate.templateCode}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Exam Name</label>
                  <p>{selectedTemplate.examName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Service Type</label>
                  <p className="capitalize">{selectedTemplate.serviceType}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Category</label>
                  <p className="capitalize">{selectedTemplate.category}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Body Part</label>
                  <p className="capitalize">
                    {selectedTemplate.bodyPart || "-"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Duration</label>
                  <p>{selectedTemplate.duration} minutes</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Base Price</label>
                  <p>${selectedTemplate.basePrice.toFixed(2)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <p>{selectedTemplate.active ? "Active" : "Inactive"}</p>
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium">Views</label>
                  <p>
                    {selectedTemplate.views && selectedTemplate.views.length > 0
                      ? selectedTemplate.views.join(", ")
                      : "No views specified"}
                  </p>
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium">Description</label>
                  <p>{selectedTemplate.description || "No description"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">
                    Contrast Required
                  </label>
                  <p>{selectedTemplate.contrastRequired ? "Yes" : "No"}</p>
                </div>
                {selectedTemplate.contrastRequired && (
                  <div>
                    <label className="text-sm font-medium">Contrast Type</label>
                    <p className="capitalize">
                      {selectedTemplate.contrastType}
                    </p>
                  </div>
                )}
                <div className="col-span-2">
                  <label className="text-sm font-medium">
                    Preparation Instructions
                  </label>
                  <p>
                    {selectedTemplate.preparationInstructions ||
                      "No preparation instructions"}
                  </p>
                </div>
                {selectedTemplate.parameters &&
                  selectedTemplate.parameters.length > 0 && (
                    <div className="col-span-2">
                      <label className="text-sm font-medium">Parameters</label>
                      <div className="mt-2 border rounded-md">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Code</TableHead>
                              <TableHead>Name</TableHead>
                              <TableHead>Unit</TableHead>
                              <TableHead>Normal Findings</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedTemplate.parameters.map(
                              (param: any, index: number) => (
                                <TableRow key={index}>
                                  <TableCell>{param.parameterCode}</TableCell>
                                  <TableCell>{param.parameterName}</TableCell>
                                  <TableCell>{param.unit || "-"}</TableCell>
                                  <TableCell>
                                    {param.normalFindings || "-"}
                                  </TableCell>
                                </TableRow>
                              ),
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
