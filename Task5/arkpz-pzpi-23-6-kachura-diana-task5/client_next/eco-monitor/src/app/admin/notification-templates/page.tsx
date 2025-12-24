"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { apiService } from "@/api";
import { useAuth } from "@/contexts/AuthContext";
import type {
  NotificationTemplate,
  CreateNotificationTemplateRequest,
  UpdateNotificationTemplateRequest,
  NotificationType,
} from "@/api/types";
import { useToast } from "@/hooks/use-toast";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2,
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  Info,
  Search,
  FileText,
  Globe,
  Shield,
} from "lucide-react";
import { format } from "date-fns";

// Map client notification types to server types
const notificationTypeMap: Record<string, string> = {
  'alert': 'ALERT',
  'warning': 'WARNING',
  'info': 'INFO',
  'system': 'SYSTEM',
  'maintenance': 'SYSTEM',
  'threshold_exceeded': 'ALERT',
};

const serverToClientTypeMap: Record<string, NotificationType> = {
  'ALERT': 'alert',
  'WARNING': 'warning',
  'INFO': 'info',
  'SYSTEM': 'system',
};

const notificationTypes: NotificationType[] = ['alert', 'warning', 'info', 'system'];
const languages = ['uk', 'en', 'ru'];

export default function NotificationTemplatesPage() {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<NotificationTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<NotificationTemplate | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Form states
  const [type, setType] = useState<NotificationType>("info");
  const [language, setLanguage] = useState("uk");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");

  const isAdmin = useMemo(() => currentUser?.role === "ADMIN", [currentUser?.role]);

  const loadTemplates = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiService.getAllNotificationTemplates();
      setTemplates(data);
      setFilteredTemplates(data);
    } catch (err) {
      console.error("Error loading notification templates:", err);
      let errorMessage = "Failed to load notification templates. Please try again.";

      if (err && typeof err === "object" && "response" in err) {
        const axiosError = err as {
          response?: { status?: number; data?: { message?: string } };
          message?: string;
        };

        if (axiosError.response?.status === 401) {
          errorMessage = "Your session has expired. Please log in again.";
        } else if (axiosError.response?.data?.message) {
          errorMessage = axiosError.response.data.message;
        } else if (axiosError.message) {
          errorMessage = axiosError.message;
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }

      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (isAdmin) {
      loadTemplates();
    }
  }, [isAdmin, loadTemplates]);

  // Filter templates based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredTemplates(templates);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = templates.filter(
      (template) =>
        template.title.toLowerCase().includes(query) ||
        template.message.toLowerCase().includes(query) ||
        template.type.toLowerCase().includes(query) ||
        template.language.toLowerCase().includes(query)
    );
    setFilteredTemplates(filtered);
  }, [searchQuery, templates]);

  const handleRefresh = useCallback(async () => {
    setIsProcessing(true);
    try {
      await loadTemplates();
      toast({
        title: "Success",
        description: "Templates refreshed successfully.",
      });
    } catch (err) {
      console.error("Error refreshing templates:", err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to refresh templates.",
      });
    } finally {
      setIsProcessing(false);
    }
  }, [loadTemplates, toast]);

  const handleCreate = useCallback(async () => {
    if (!title.trim() || !message.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Title and message are required.",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const request: CreateNotificationTemplateRequest = {
        type,
        language,
        title: title.trim(),
        message: message.trim(),
      };

      await apiService.createNotificationTemplate(request);
      toast({
        title: "Success",
        description: "Notification template created successfully.",
      });
      setCreateDialogOpen(false);
      resetForm();
      await loadTemplates();
    } catch (err) {
      console.error("Error creating notification template:", err);
      let errorMessage = "Failed to create notification template. Please try again.";

      if (err && typeof err === "object" && "response" in err) {
        const axiosError = err as {
          response?: { status?: number; data?: { message?: string } };
          message?: string;
        };

        if (axiosError.response?.status === 401) {
          errorMessage = "Your session has expired. Please log in again.";
        } else if (axiosError.response?.status === 403) {
          errorMessage = "You don't have permission to create notification templates.";
        } else if (axiosError.response?.status === 409) {
          errorMessage = "A template with this type and language already exists.";
        } else if (axiosError.response?.data?.message) {
          errorMessage = axiosError.response.data.message;
        } else if (axiosError.message) {
          errorMessage = axiosError.message;
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }

      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage,
      });
    } finally {
      setIsProcessing(false);
    }
  }, [type, language, title, message, toast, loadTemplates]);

  const handleUpdate = useCallback(async () => {
    if (!selectedTemplate) return;

    if (!title.trim() || !message.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Title and message are required.",
      });
      return;
    }

    setIsProcessing(true);
    try {
      // Convert client type to server type
      const serverType = notificationTypeMap[selectedTemplate.type] || selectedTemplate.type.toUpperCase();
      
      const request: UpdateNotificationTemplateRequest = {
        title: title.trim(),
        message: message.trim(),
      };

      await apiService.updateNotificationTemplate(
        serverType,
        selectedTemplate.language,
        request
      );
      toast({
        title: "Success",
        description: "Notification template updated successfully.",
      });
      setEditDialogOpen(false);
      resetForm();
      await loadTemplates();
    } catch (err) {
      console.error("Error updating notification template:", err);
      let errorMessage = "Failed to update notification template. Please try again.";

      if (err && typeof err === "object" && "response" in err) {
        const axiosError = err as {
          response?: { status?: number; data?: { message?: string } };
          message?: string;
        };

        if (axiosError.response?.data?.message) {
          errorMessage = axiosError.response.data.message;
        } else if (axiosError.message) {
          errorMessage = axiosError.message;
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }

      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage,
      });
    } finally {
      setIsProcessing(false);
    }
  }, [selectedTemplate, title, message, toast, loadTemplates]);

  const handleDelete = useCallback(async () => {
    if (!selectedTemplate) return;

    setIsProcessing(true);
    try {
      await apiService.deleteNotificationTemplate(selectedTemplate.id);
      toast({
        title: "Success",
        description: "Notification template has been deleted.",
      });
      await loadTemplates();
    } catch (err) {
      console.error("Error deleting notification template:", err);
      let errorMessage = "Failed to delete notification template. Please try again.";

      if (err && typeof err === "object" && "response" in err) {
        const axiosError = err as {
          response?: { status?: number; data?: { message?: string } };
          message?: string;
        };

        if (axiosError.response?.data?.message) {
          errorMessage = axiosError.response.data.message;
        } else if (axiosError.message) {
          errorMessage = axiosError.message;
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }

      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage,
      });
    } finally {
      setIsProcessing(false);
      setDeleteDialogOpen(false);
      setSelectedTemplate(null);
    }
  }, [selectedTemplate, toast, loadTemplates]);

  const handleViewDetails = useCallback(async (template: NotificationTemplate) => {
    try {
      const details = await apiService.getNotificationTemplateById(template.id);
      setSelectedTemplate(details);
      setDetailsDialogOpen(true);
    } catch (err) {
      console.error("Error loading template details:", err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load template details.",
      });
    }
  }, [toast]);

  const handleOpenEdit = useCallback((template: NotificationTemplate) => {
    setSelectedTemplate(template);
    setType(template.type);
    setLanguage(template.language);
    setTitle(template.title);
    setMessage(template.message);
    setEditDialogOpen(true);
  }, []);

  const resetForm = useCallback(() => {
    setType("info");
    setLanguage("uk");
    setTitle("");
    setMessage("");
    setSelectedTemplate(null);
  }, []);

  const getTypeBadge = (type: NotificationType) => {
    const variants: Record<NotificationType, "default" | "secondary" | "destructive" | "outline"> = {
      alert: "destructive",
      warning: "secondary",
      info: "default",
      system: "outline",
      maintenance: "outline",
      threshold_exceeded: "destructive",
    };

    return (
      <Badge variant={variants[type] || "outline"} className="capitalize">
        {type.replace("_", " ")}
      </Badge>
    );
  };

  const getLanguageBadge = (lang: string) => {
    const langNames: Record<string, string> = {
      uk: "🇺🇦 Українська",
      en: "🇬🇧 English",
      ru: "🇷🇺 Русский",
    };

    return (
      <Badge variant="outline" className="flex items-center gap-1 w-fit">
        <Globe className="h-3 w-3" />
        {langNames[lang] || lang.toUpperCase()}
      </Badge>
    );
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "—";
    try {
      return format(new Date(dateString), "MMM dd, yyyy HH:mm");
    } catch {
      return "Invalid date";
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex min-h-svh w-full flex-col bg-background p-4 sm:p-6 md:p-10">
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-semibold">Access Denied</p>
              <p className="text-sm mt-2">You don't have permission to access this page.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-svh w-full flex-col bg-background p-4 sm:p-6 md:p-10">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Notification Templates</h1>
          <p className="text-muted-foreground mt-2">
            Manage notification templates for different types and languages
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleRefresh}
            variant="outline"
            disabled={isProcessing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isProcessing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Template
          </Button>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Search & Filter</CardTitle>
          <CardDescription>Search templates by title, message, type, or language</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card>
          <CardContent className="py-12">
            <div className="flex items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Loading templates...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : filteredTemplates.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              {searchQuery ? (
                <>
                  <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-semibold">No templates found</p>
                  <p className="text-sm mt-2">Try adjusting your search query.</p>
                </>
              ) : (
                <>
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-semibold">No notification templates found.</p>
                  <p className="text-sm mt-2">Create your first template to get started.</p>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Language</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Message Preview</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTemplates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell>{getTypeBadge(template.type)}</TableCell>
                      <TableCell>{getLanguageBadge(template.language)}</TableCell>
                      <TableCell className="font-medium max-w-xs truncate" title={template.title}>
                        {template.title}
                      </TableCell>
                      <TableCell className="max-w-md">
                        <p className="text-sm text-muted-foreground truncate" title={template.message}>
                          {template.message}
                        </p>
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(template.updatedAt)}
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleViewDetails(template)}
                            title="View Details"
                          >
                            <Info className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleOpenEdit(template)}
                            disabled={isProcessing}
                            title="Edit Template"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setSelectedTemplate(template);
                              setDeleteDialogOpen(true);
                            }}
                            disabled={isProcessing}
                            title="Delete Template"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Notification Template</DialogTitle>
            <DialogDescription>
              Create a new notification template. Use variables like {"{{userName}}"} in your message.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Type *</Label>
                <Select value={type} onValueChange={(value) => setType(value as NotificationType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {notificationTypes.map((nt) => (
                      <SelectItem key={nt} value={nt}>
                        <span className="capitalize">{nt.replace("_", " ")}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Language *</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {languages.map((lang) => (
                      <SelectItem key={lang} value={lang}>
                        {lang === "uk" && "🇺🇦 Українська"}
                        {lang === "en" && "🇬🇧 English"}
                        {lang === "ru" && "🇷🇺 Русский"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Notification title (e.g., Alert: {{stationName}})"
              />
              <p className="text-xs text-muted-foreground">
                Use variables like {"{{userName}}"}, {"{{stationName}}"}, {"{{sensorName}}"} in your title
              </p>
            </div>
            <div className="space-y-2">
              <Label>Message *</Label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Notification message with variables..."
                rows={6}
              />
              <p className="text-xs text-muted-foreground">
                Use variables like {"{{userName}}"}, {"{{stationName}}"}, {"{{sensorName}}"}, {"{{value}}"} in your message
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreateDialogOpen(false);
                resetForm();
              }}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={isProcessing || !title.trim() || !message.trim()}>
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Notification Template</DialogTitle>
            <DialogDescription>
              Update the notification template. Type and language cannot be changed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Type</Label>
                <Input value={type} disabled className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label>Language</Label>
                <Input value={language} disabled className="bg-muted" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Notification title"
              />
            </div>
            <div className="space-y-2">
              <Label>Message *</Label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Notification message"
                rows={6}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditDialogOpen(false);
                resetForm();
              }}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={isProcessing || !title.trim() || !message.trim()}>
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Template Details</DialogTitle>
            <DialogDescription>
              Detailed information about the notification template
            </DialogDescription>
          </DialogHeader>
          {selectedTemplate && (
            <div className="space-y-4 py-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label className="text-muted-foreground">ID</Label>
                  <p className="font-mono text-sm">{selectedTemplate.id}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Type</Label>
                  <div className="mt-1">{getTypeBadge(selectedTemplate.type)}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Language</Label>
                  <div className="mt-1">{getLanguageBadge(selectedTemplate.language)}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Created</Label>
                  <p className="text-sm">{formatDate(selectedTemplate.createdAt)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Updated</Label>
                  <p className="text-sm">{formatDate(selectedTemplate.updatedAt)}</p>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Title</Label>
                <p className="mt-1 font-medium">{selectedTemplate.title}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Message</Label>
                <p className="mt-1 whitespace-pre-wrap">{selectedTemplate.message}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Notification Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the template{" "}
              <strong>{selectedTemplate?.title}</strong> ({selectedTemplate?.type} - {selectedTemplate?.language})?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isProcessing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

