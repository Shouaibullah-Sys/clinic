// app/laboratory/templates/page.tsx

"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import {
  Search,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Plus,
  TestTube,
  Clock,
  DollarSign,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Download,
  Upload,
  FileText,
  Activity,
  Beaker,
  Droplets,
  FlaskConical,
  Microscope,
  Pill,
  Syringe,
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { TemplateDetailsDialog } from "./components/TemplateDetailsDialog";
import { TemplateEditDialog } from "./components/TemplateEditDialog";
import { TemplateCreateDialog } from "./components/TemplateCreateDialog";

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

export default function LabTemplatesPage() {
  const { accessToken } = useAuthStore();
  const [templates, setTemplates] = useState<LabTestTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<LabTestTemplate[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedTemplate, setSelectedTemplate] =
    useState<LabTestTemplate | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Get unique categories from templates
  const categories = Array.from(new Set(templates.map((t) => t.category)));

  useEffect(() => {
    fetchTemplates();
  }, []);

  useEffect(() => {
    filterTemplates();
  }, [searchQuery, categoryFilter, statusFilter, templates]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      if (!accessToken) {
        setError("Authentication required");
        return;
      }

      const response = await fetch("/api/laboratory/templates", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (response.status === 401) {
        setError("Session expired. Please login again.");
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to fetch templates");
      }

      const data = await response.json();
      setTemplates(data.data || []);
      setFilteredTemplates(data.data || []);
    } catch (err: any) {
      setError(err.message || "Failed to load templates");
      console.error("Error fetching templates:", err);
    } finally {
      setLoading(false);
    }
  };

  const filterTemplates = () => {
    let filtered = [...templates];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (template) =>
          template.testCode.toLowerCase().includes(query) ||
          template.testName.toLowerCase().includes(query) ||
          (template.description &&
            template.description.toLowerCase().includes(query)),
      );
    }

    // Apply category filter
    if (categoryFilter !== "all") {
      filtered = filtered.filter(
        (template) => template.category === categoryFilter,
      );
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((template) =>
        statusFilter === "active" ? template.active : !template.active,
      );
    }

    setFilteredTemplates(filtered);
  };

  const handleDeleteTemplate = async () => {
    if (!selectedTemplate) return;

    try {
      setActionLoading(true);
      if (!accessToken) {
        setError("Authentication required");
        return;
      }

      const response = await fetch(
        `/api/laboratory/templates/${selectedTemplate._id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        throw new Error("Failed to delete template");
      }

      setSuccess(
        `Template "${selectedTemplate.testName}" deleted successfully`,
      );
      setShowDeleteDialog(false);
      setSelectedTemplate(null);
      fetchTemplates(); // Refresh list
    } catch (err: any) {
      setError(err.message || "Failed to delete template");
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async (template: LabTestTemplate) => {
    try {
      setActionLoading(true);
      if (!accessToken) {
        setError("Authentication required");
        return;
      }

      const response = await fetch(
        `/api/laboratory/templates/${template._id}/status`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ active: !template.active }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to update template status");
      }

      setSuccess(
        `Template "${template.testName}" ${!template.active ? "activated" : "deactivated"} successfully`,
      );
      fetchTemplates(); // Refresh list
    } catch (err: any) {
      setError(err.message || "Failed to update template status");
    } finally {
      setActionLoading(false);
    }
  };

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

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-8 w-64 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
        <div className="space-y-4">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Lab Test Templates
          </h1>
          <p className="text-muted-foreground">
            Manage laboratory test templates for quick test ordering
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchTemplates}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Template
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/laboratory/templates/import">
                  <Upload className="h-4 w-4 mr-2" />
                  Import Templates
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Download className="h-4 w-4 mr-2" />
                Export Templates
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">Success</AlertTitle>
          <AlertDescription className="text-green-700">
            {success}
          </AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search templates by code, name, or description..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    <div className="flex items-center gap-2">
                      {getCategoryIcon(category)}
                      <span className="capitalize">
                        {category
                          .replace(/_/g, " ")
                          .replace(/\b\w/g, (l) => l.toUpperCase())}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active Only</SelectItem>
                <SelectItem value="inactive">Inactive Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Templates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{templates.length}</div>
            <p className="text-xs text-muted-foreground">
              {templates.filter((t) => t.active).length} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categories.length}</div>
            <p className="text-xs text-muted-foreground">
              Different test categories
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Parameters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {templates.length > 0
                ? Math.round(
                    templates.reduce(
                      (sum, t) => sum + (t.parameters?.length || 0),
                      0,
                    ) / templates.length,
                  )
                : 0}
            </div>
            <p className="text-xs text-muted-foreground">Per template</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Price
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {templates.length > 0
                ? formatPrice(
                    Math.round(
                      templates.reduce((sum, t) => sum + t.basePrice, 0) /
                        templates.length,
                    ),
                  )
                : formatPrice(0)}
            </div>
            <p className="text-xs text-muted-foreground">Per test</p>
          </CardContent>
        </Card>
      </div>

      {/* Templates Table */}
      <Card>
        <CardHeader>
          <CardTitle>Test Templates</CardTitle>
          <CardDescription>
            {filteredTemplates.length} templates found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredTemplates.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No templates found</h3>
              <p className="text-muted-foreground mt-2 mb-4">
                {searchQuery ||
                categoryFilter !== "all" ||
                statusFilter !== "all"
                  ? "No templates match your search criteria"
                  : "No test templates available yet"}
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Template
              </Button>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Test Code</TableHead>
                    <TableHead>Test Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Specimen</TableHead>
                    <TableHead>Parameters</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Turnaround</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTemplates.map((template) => (
                    <TableRow key={template._id}>
                      <TableCell className="font-mono font-medium">
                        {template.testCode}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 max-w-38">
                          <div className="font-medium">{template.testName}</div>
                          {template.description && (
                            <div className="text-sm text-muted-foreground line-clamp-1 truncate">
                              {template.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
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
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-sm">
                            {template.specimenType.join(", ")}
                          </div>
                          {template.sampleVolume && (
                            <div className="text-xs text-muted-foreground">
                              Volume: {template.sampleVolume}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-gray-50">
                          {template.parameters?.length || 0} params
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-green-600" />
                          <span className="font-medium">
                            {formatPrice(template.basePrice)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-blue-600" />
                          <span className="text-sm">
                            {template.turnaroundTime}h
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {template.active ? (
                            <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Active
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-gray-500 border-gray-300"
                            >
                              <XCircle className="h-3 w-3 mr-1" />
                              Inactive
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedTemplate(template);
                                setShowDetailsDialog(true);
                              }}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedTemplate(template);
                                setShowEditDialog(true);
                              }}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Template
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleToggleStatus(template)}
                              disabled={actionLoading}
                            >
                              {template.active ? (
                                <>
                                  <XCircle className="h-4 w-4 mr-2 text-red-600" />
                                  Deactivate
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                                  Activate
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => {
                                setSelectedTemplate(template);
                                setShowDeleteDialog(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Template</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the template "
              {selectedTemplate?.testName}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This will permanently delete the template and all associated
                data. Test orders using this template will not be affected.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteDialog(false);
                setSelectedTemplate(null);
              }}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteTemplate}
              disabled={actionLoading}
            >
              {actionLoading ? "Deleting..." : "Delete Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      <TemplateDetailsDialog
        template={selectedTemplate}
        open={showDetailsDialog}
        onOpenChange={setShowDetailsDialog}
        onEditClick={() => {
          setShowDetailsDialog(false);
          setShowEditDialog(true);
        }}
      />

      {/* Edit Template Dialog */}
      <TemplateEditDialog
        template={selectedTemplate}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onSuccess={() => {
          fetchTemplates();
          setSuccess("Template updated successfully");
        }}
      />

      {/* Create Template Dialog */}
      <TemplateCreateDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={() => {
          fetchTemplates();
          setSuccess("Template created successfully");
        }}
      />

      {/* Category Tabs (Alternative View) */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid grid-cols-3 md:grid-cols-6 w-full">
          <TabsTrigger value="all">All ({templates.length})</TabsTrigger>
          <TabsTrigger value="hematology">
            <div className="flex items-center gap-1">
              <Droplets className="h-3 w-3" />
              <span>Hematology</span>
            </div>
          </TabsTrigger>
          <TabsTrigger value="biochemistry">
            <div className="flex items-center gap-1">
              <FlaskConical className="h-3 w-3" />
              <span>Biochemistry</span>
            </div>
          </TabsTrigger>
          <TabsTrigger value="microbiology">
            <div className="flex items-center gap-1">
              <Microscope className="h-3 w-3" />
              <span>Microbiology</span>
            </div>
          </TabsTrigger>
          <TabsTrigger value="serology">
            <div className="flex items-center gap-1">
              <TestTube className="h-3 w-3" />
              <span>Serology</span>
            </div>
          </TabsTrigger>
          <TabsTrigger value="urinalysis">
            <div className="flex items-center gap-1">
              <Beaker className="h-3 w-3" />
              <span>Urinalysis</span>
            </div>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {/* All templates are already shown in main table */}
        </TabsContent>

        {categories.map((category) => (
          <TabsContent key={category} value={category} className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {getCategoryIcon(category)}
                  <span className="capitalize">
                    {category
                      .replace(/_/g, " ")
                      .replace(/\b\w/g, (l) => l.toUpperCase())}{" "}
                    Tests
                  </span>
                </CardTitle>
                <CardDescription>
                  {
                    filteredTemplates.filter((t) => t.category === category)
                      .length
                  }{" "}
                  templates available
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredTemplates
                    .filter((template) => template.category === category)
                    .map((template) => (
                      <Card
                        key={template._id}
                        className="hover:shadow-md transition-shadow"
                      >
                        <CardHeader className="pb-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle className="text-lg">
                                {template.testName}
                              </CardTitle>
                              <CardDescription className="font-mono">
                                {template.testCode}
                              </CardDescription>
                            </div>
                            <Badge
                              className={
                                template.active
                                  ? "bg-green-100 text-green-800"
                                  : "bg-gray-100 text-gray-800"
                              }
                            >
                              {template.active ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-blue-600" />
                              <span>{template.turnaroundTime}h</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <DollarSign className="h-4 w-4 text-green-600" />
                              <span className="font-medium">
                                {formatPrice(template.basePrice)}
                              </span>
                            </div>
                          </div>

                          <div className="text-sm">
                            <div className="font-medium">Specimen:</div>
                            <div className="text-muted-foreground">
                              {template.specimenType.join(", ")}
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <Badge variant="outline">
                              {template.parameters?.length || 0} parameters
                            </Badge>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setSelectedTemplate(template);
                                  setShowDetailsDialog(true);
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setSelectedTemplate(template);
                                  setShowEditDialog(true);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
