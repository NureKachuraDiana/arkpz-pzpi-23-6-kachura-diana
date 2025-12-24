"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { apiService } from "@/api";
import type { UserActivityLog, User } from "@/api/types";
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
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  ArrowLeft,
  Trash2,
  RefreshCw,
  Trash,
} from "lucide-react";
import { format } from "date-fns";

export default function UserActivityLogsPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params?.userId as string;
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [logs, setLogs] = useState<UserActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [cleanupDialogOpen, setCleanupDialogOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<UserActivityLog | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const loadUserAndLogs = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    try {
      // Load user info
      const userData = await apiService.getUserById(userId);
      setUser(userData);

      // Load user activity logs
      const logsData = await apiService.getUserActivityLogsByUserId(userId);
      setLogs(logsData);
    } catch (err) {
      console.error("Error loading user activity logs:", err);
      let errorMessage = "Failed to load user activity logs. Please try again.";
      
      if (err && typeof err === "object" && "response" in err) {
        const axiosError = err as {
          response?: { status?: number; data?: { message?: string } };
          message?: string;
        };
        
        if (axiosError.response?.status === 401) {
          errorMessage = "Your session has expired. Please log in again.";
        } else if (axiosError.response?.status === 404) {
          errorMessage = "User not found.";
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
  }, [userId, toast]);

  useEffect(() => {
    loadUserAndLogs();
  }, [loadUserAndLogs]);

  const handleDeleteLog = useCallback(async () => {
    if (!selectedLog) return;

    setIsProcessing(true);
    try {
      await apiService.deleteUserActivityLog(selectedLog.id);
      setLogs((prev) => prev.filter((log) => log.id !== selectedLog.id));
      toast({
        title: "Success",
        description: "Activity log has been deleted.",
      });
    } catch (err) {
      console.error("Error deleting log:", err);
      let errorMessage = "Failed to delete activity log. Please try again.";
      
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
      setSelectedLog(null);
    }
  }, [selectedLog, toast]);

  const handleCleanupOldLogs = useCallback(async () => {
    setIsProcessing(true);
    try {
      await apiService.cleanupOldUserActivityLogs();
      // Reload logs after cleanup
      if (userId) {
        const logsData = await apiService.getUserActivityLogsByUserId(userId);
        setLogs(logsData);
      }
      toast({
        title: "Success",
        description: "Old activity logs have been cleaned up.",
      });
    } catch (err) {
      console.error("Error cleaning up logs:", err);
      let errorMessage = "Failed to cleanup old logs. Please try again.";
      
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
      setCleanupDialogOpen(false);
    }
  }, [userId, toast]);

  const handleOpenDeleteDialog = useCallback((log: UserActivityLog) => {
    setSelectedLog(log);
    setDeleteDialogOpen(true);
  }, []);

  const getActionBadgeVariant = (action: string) => {
    switch (action) {
      case "login":
        return "default";
      case "logout":
        return "secondary";
      case "create":
        return "default";
      case "update":
        return "default";
      case "delete":
        return "destructive";
      case "view":
        return "secondary";
      case "export":
        return "default";
      case "import":
        return "default";
      case "settings_change":
        return "default";
      case "permission_change":
        return "destructive";
      default:
        return "outline";
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMM dd, yyyy HH:mm:ss");
    } catch {
      return "Invalid date";
    }
  };

  const formatDetails = (details: Record<string, unknown> | undefined) => {
    if (!details || Object.keys(details).length === 0) return "—";
    return JSON.stringify(details, null, 2);
  };

  return (
    <div className="flex min-h-svh w-full flex-col bg-background p-4 sm:p-6 md:p-10">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/admin/users")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">User Activity Logs</h1>
            {user && (
              <p className="text-muted-foreground mt-2">
                Activity logs for {user.email}
                {user.firstName || user.lastName
                  ? ` (${user.firstName || ""} ${user.lastName || ""})`.trim()
                  : ""}
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setCleanupDialogOpen(true)}
            variant="outline"
            disabled={isLoading || isProcessing || logs.length === 0}
          >
            <Trash className="h-4 w-4 mr-2" />
            Cleanup Old Logs
          </Button>
          <Button
            onClick={loadUserAndLogs}
            variant="outline"
            disabled={isLoading || isProcessing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading activity logs...</p>
          </div>
        </div>
      ) : logs.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">No activity logs found for this user.</p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead>Resource ID</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>Timestamp</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    <Badge variant={getActionBadgeVariant(log.action)}>
                      {log.action}
                    </Badge>
                  </TableCell>
                  <TableCell>{log.resource || "—"}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {log.resourceId || "—"}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {log.ipAddress || "—"}
                  </TableCell>
                  <TableCell>
                    <div className="max-w-xs truncate" title={formatDetails(log.details)}>
                      {formatDetails(log.details)}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(log.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleOpenDeleteDialog(log)}
                      disabled={isProcessing}
                      title="Delete Log"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Delete Log Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Activity Log</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this activity log? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteLog}
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

      {/* Cleanup Old Logs Confirmation Dialog */}
      <AlertDialog open={cleanupDialogOpen} onOpenChange={setCleanupDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cleanup Old Activity Logs</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cleanup old activity logs? This will
              permanently delete old logs from the system. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCleanupOldLogs}
              disabled={isProcessing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Cleaning up...
                </>
              ) : (
                "Cleanup"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

