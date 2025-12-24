"use client";

import { useState, useEffect, useCallback } from "react";
import { apiService } from "@/api";
import type { Backup, BackupStatus, CreateBackupRequest, BackupStats } from "@/api/types";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Loader2,
  Plus,
  Trash2,
  Download,
  X,
  Info,
  Database,
  HardDrive,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Ban,
} from "lucide-react";
import { format } from "date-fns";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export default function AdminBackupsPage() {
  const { toast } = useToast();
  const [backups, setBackups] = useState<Backup[]>([]);
  const [stats, setStats] = useState<BackupStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<Backup | null>(null);
  const [backupType, setBackupType] = useState<"database" | "full">("database");
  const [backupDescription, setBackupDescription] = useState("");
  const [statusFilter, setStatusFilter] = useState<BackupStatus | "all">("all");
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const [creatingBackupId, setCreatingBackupId] = useState<string | null>(null);

  const loadBackups = useCallback(async () => {
    try {
      const status = statusFilter === "all" ? undefined : statusFilter;
      const data = await apiService.listBackups(undefined, undefined, status);
      setBackups(data);
    } catch (err) {
      console.error("Error loading backups:", err);
      let errorMessage = "Failed to load backups. Please try again.";
      
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
  }, [statusFilter, toast]);

  const loadStats = useCallback(async () => {
    try {
      const data = await apiService.getBackupStats();
      setStats(data);
    } catch (err) {
      console.error("Error loading backup stats:", err);
      let errorMessage = "Failed to load backup statistics.";
      
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
    }
  }, [toast]);

  useEffect(() => {
    loadBackups();
    loadStats();
  }, [loadBackups, loadStats]);

  // Poll for backup status updates when there's a backup in progress
  useEffect(() => {
    const hasInProgressBackup = backups.some(
      (b) => b.status === "pending" || b.status === "in_progress"
    );

    if (hasInProgressBackup) {
      const interval = setInterval(() => {
        loadBackups();
        loadStats();
      }, 3000); // Poll every 3 seconds

      setPollingInterval(interval);

      return () => {
        clearInterval(interval);
      };
    } else {
      if (pollingInterval) {
        clearInterval(pollingInterval);
        setPollingInterval(null);
      }
    }
  }, [backups, loadBackups, loadStats, pollingInterval]);

  const handleCreateBackup = useCallback(async () => {
    setIsCreating(true);

    try {
      const createRequest: CreateBackupRequest = {
        type: backupType,
        description: backupDescription.trim() || undefined,
      };

      const newBackup = await apiService.createBackup(createRequest);
      setCreatingBackupId(newBackup.id);
      setCreateDialogOpen(false);
      setBackupDescription("");
      
      toast({
        title: "Backup Started",
        description: `${backupType === "database" ? "Database" : "Full"} backup creation has been initiated.`,
      });

      // Reload backups to show the new backup
      await loadBackups();
      await loadStats();
    } catch (err) {
      console.error("Error creating backup:", err);
      let errorMessage = "Failed to create backup. Please try again.";
      
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
      setIsCreating(false);
      setCreatingBackupId(null);
    }
  }, [backupType, backupDescription, toast, loadBackups, loadStats]);

  const handleCancelBackup = useCallback(async (backup: Backup) => {
    try {
      await apiService.cancelBackup(backup.id);
      toast({
        title: "Backup Cancelled",
        description: "The backup has been cancelled successfully.",
      });
      await loadBackups();
      await loadStats();
    } catch (err) {
      console.error("Error cancelling backup:", err);
      let errorMessage = "Failed to cancel backup. Please try again.";
      
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
    }
  }, [toast, loadBackups, loadStats]);

  const handleDeleteBackup = useCallback(async () => {
    if (!selectedBackup) return;

    try {
      await apiService.deleteBackup(selectedBackup.id);
      toast({
        title: "Success",
        description: "Backup has been deleted successfully.",
      });
      await loadBackups();
      await loadStats();
    } catch (err) {
      console.error("Error deleting backup:", err);
      let errorMessage = "Failed to delete backup. Please try again.";
      
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
      setDeleteDialogOpen(false);
      setSelectedBackup(null);
    }
  }, [selectedBackup, toast, loadBackups, loadStats]);

  const handleDownloadBackup = useCallback(async (backup: Backup) => {
    if (backup.status !== "completed") {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Only completed backups can be downloaded.",
      });
      return;
    }

    try {
      const blob = await apiService.downloadBackup(backup.id);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      
      // Try to get filename from backup, or use a default
      const fileName = (backup as any).fileName || `backup-${backup.id}.sql`;
      a.download = fileName;
      
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Download Started",
        description: "Backup download has started.",
      });
    } catch (err) {
      console.error("Error downloading backup:", err);
      let errorMessage = "Failed to download backup. Please try again.";
      
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
    }
  }, [toast]);

  const handleViewDetails = useCallback(async (backup: Backup) => {
    try {
      const details = await apiService.getBackup(backup.id);
      setSelectedBackup(details);
      setDetailsDialogOpen(true);
    } catch (err) {
      console.error("Error loading backup details:", err);
      let errorMessage = "Failed to load backup details.";
      
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
    }
  }, [toast]);

  const getStatusBadgeVariant = (status: BackupStatus) => {
    switch (status) {
      case "completed":
        return "default";
      case "pending":
      case "in_progress":
        return "secondary";
      case "failed":
        return "destructive";
      case "cancelled":
        return "outline";
      default:
        return "outline";
    }
  };

  const getStatusIcon = (status: BackupStatus) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4" />;
      case "pending":
      case "in_progress":
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case "failed":
        return <XCircle className="h-4 w-4" />;
      case "cancelled":
        return <Ban className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const inferBackupType = (backup: Backup): "database" | "full" => {
    // Try to infer from type field if available
    if (backup.type) return backup.type;
    
    // Infer from fileName if available
    const fileName = (backup as any).fileName || "";
    if (fileName.includes("full-backup")) return "full";
    if (fileName.includes("db-backup")) return "database";
    
    // Default to database
    return "database";
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "—";
    try {
      return format(new Date(dateString), "MMM dd, yyyy HH:mm:ss");
    } catch {
      return "Invalid date";
    }
  };

  const formatFileSize = (sizeMB: number | undefined) => {
    if (!sizeMB) return "—";
    if (sizeMB < 1) return `${(sizeMB * 1024).toFixed(2)} KB`;
    return `${sizeMB.toFixed(2)} MB`;
  };


  return (
    <div className="flex min-h-svh w-full flex-col bg-background p-4 sm:p-6 md:p-10">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Backup Management</h1>
          <p className="text-muted-foreground mt-2">
            Create, manage, and download system backups
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => {
              loadBackups();
              loadStats();
            }}
            variant="outline"
            disabled={isLoading || isCreating}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            onClick={() => setCreateDialogOpen(true)}
            disabled={isCreating}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Backup
          </Button>
        </div>
      </div>

      <Tabs defaultValue="backups" className="w-full">
        <TabsList>
          <TabsTrigger value="backups">Backups</TabsTrigger>
          <TabsTrigger value="stats">Statistics</TabsTrigger>
        </TabsList>

        <TabsContent value="backups" className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as BackupStatus | "all")}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Loading backups...</p>
              </div>
            </div>
          ) : backups.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">No backups found.</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {backups.map((backup) => {
                    const backupType = inferBackupType(backup);
                    const isInProgress = backup.status === "pending" || backup.status === "in_progress";
                    const isCreatingThis = creatingBackupId === backup.id;

                    return (
                      <TableRow key={backup.id}>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(backup.status)} className="flex items-center gap-1 w-fit">
                            {getStatusIcon(backup.status)}
                            <span className="capitalize">{backup.status.replace("_", " ")}</span>
                          </Badge>
                        </TableCell>
                        <TableCell>{formatFileSize(backup.fileSize)}</TableCell>
                        <TableCell className="max-w-xs truncate">
                          {backup.description || "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(backup.createdAt)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(backup.completedAt)}
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-2">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleViewDetails(backup)}
                              title="View Details"
                            >
                              <Info className="h-4 w-4" />
                            </Button>
                            {backup.status === "completed" && (
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleDownloadBackup(backup)}
                                title="Download Backup"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            )}
                            {isInProgress && (
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleCancelBackup(backup)}
                                disabled={isCreating}
                                title="Cancel Backup"
                              >
                                <X className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                setSelectedBackup(backup);
                                setDeleteDialogOpen(true);
                              }}
                              disabled={isInProgress}
                              title="Delete Backup"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="stats" className="space-y-4">
          {stats ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Total Backups</CardTitle>
                  <CardDescription>All backup records</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.total}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Completed</CardTitle>
                  <CardDescription>Successfully completed backups</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">{stats.completed}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Failed</CardTitle>
                  <CardDescription>Backups that failed</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-destructive">{stats.failed}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Pending</CardTitle>
                  <CardDescription>Backups waiting to start</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-yellow-600">{stats.pending}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Total Size</CardTitle>
                  <CardDescription>Combined size of all backups</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {stats.totalSize ? formatFileSize(stats.totalSize) : "—"}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Backup Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Backup</DialogTitle>
            <DialogDescription>
              Choose the type of backup you want to create
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Backup Type</Label>
              <Select value={backupType} onValueChange={(value) => setBackupType(value as "database" | "full")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="database">
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4" />
                      <span>Database Backup</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="full">
                    <div className="flex items-center gap-2">
                      <HardDrive className="h-4 w-4" />
                      <span>Full System Backup</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description (Optional)</Label>
              <Textarea
                placeholder="Add a description for this backup..."
                value={backupDescription}
                onChange={(e) => setBackupDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreateDialogOpen(false);
                setBackupDescription("");
              }}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateBackup} disabled={isCreating}>
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Backup
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Backup Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Backup Details</DialogTitle>
            <DialogDescription>
              Detailed information about the backup
            </DialogDescription>
          </DialogHeader>
          {selectedBackup && (
            <div className="space-y-4 py-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label className="text-muted-foreground">ID</Label>
                  <p className="font-mono text-sm">{selectedBackup.id}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Type</Label>
                  <p className="capitalize">{inferBackupType(selectedBackup)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <div className="mt-1">
                    <Badge variant={getStatusBadgeVariant(selectedBackup.status)} className="flex items-center gap-1 w-fit">
                      {getStatusIcon(selectedBackup.status)}
                      <span className="capitalize">{selectedBackup.status.replace("_", " ")}</span>
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Size</Label>
                  <p>{formatFileSize(selectedBackup.fileSize)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Created</Label>
                  <p className="text-sm">{formatDate(selectedBackup.createdAt)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Completed</Label>
                  <p className="text-sm">{formatDate(selectedBackup.completedAt)}</p>
                </div>
              </div>
              {selectedBackup.description && (
                <div>
                  <Label className="text-muted-foreground">Description</Label>
                  <p className="mt-1">{selectedBackup.description}</p>
                </div>
              )}
              {(selectedBackup as any).fileName && (
                <div>
                  <Label className="text-muted-foreground">File Name</Label>
                  <p className="font-mono text-sm mt-1">{(selectedBackup as any).fileName}</p>
                </div>
              )}
              {selectedBackup.error && (
                <div>
                  <Label className="text-muted-foreground text-destructive">Error</Label>
                  <p className="mt-1 text-sm text-destructive">{selectedBackup.error}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            {selectedBackup?.status === "completed" && (
              <Button
                onClick={() => {
                  if (selectedBackup) {
                    handleDownloadBackup(selectedBackup);
                  }
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            )}
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
            <AlertDialogTitle>Delete Backup</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this backup? This action cannot be undone
              and will permanently remove the backup file and record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBackup}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

