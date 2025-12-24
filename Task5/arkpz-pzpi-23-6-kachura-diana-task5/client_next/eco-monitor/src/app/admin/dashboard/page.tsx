"use client";

import { useState, useEffect, useCallback } from "react";
import { apiService } from "@/api";
import axiosInstance from "@/api/axios.instance";
import type { SystemEvent, SystemEventType, SystemEventSource } from "@/api/types";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  RefreshCw,
  Trash2,
  Info,
  AlertCircle,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Database,
  HardDrive,
  Cpu,
  MemoryStick,
  Trash,
  Calendar,
  Filter,
} from "lucide-react";
import { format } from "date-fns";

interface DashboardData {
  health: {
    status: string;
    timestamp: string;
    checks: {
      database: any;
      disk: any;
      memory: any;
      cpu: any;
    };
    uptime: {
      seconds: number;
      formatted: string;
      systemStartTime?: string;
    } | number; // Can be object or number for backward compatibility
  };
  statistics: {
    timeRange: string;
    period: {
      start: string | Date;
      end: string | Date;
    };
    statistics: {
      events: Array<{ type: string; _count: { type: number } }>; // Array from groupBy
      users: {
        total: number;
        new: number;
      };
      activities: number;
      backups: Array<{ status: string; _count: { status: number } }>; // Array from groupBy
    };
    currentHealth: any;
    uptime: {
      seconds: number;
      formatted: string;
      systemStartTime?: string;
    } | number;
  };
  eventSummary: {
    totalEvents?: number;
    recentEvents?: SystemEvent[];
    last24Hours?: Array<{ type: string; _count: { type: number } }>;
    total?: number;
    byType?: Record<string, number>;
    bySource?: Record<string, number>;
    recent?: SystemEvent[];
  };
  timestamp: string;
}

export default function AdminDashboardPage() {
  const { toast } = useToast();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [events, setEvents] = useState<SystemEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [cleanupDialogOpen, setCleanupDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<SystemEvent | null>(null);
  const [eventTypeFilter, setEventTypeFilter] = useState<SystemEventType | "all">("all");
  const [eventSourceFilter, setEventSourceFilter] = useState<SystemEventSource | "all">("all");
  const [cleanupDays, setCleanupDays] = useState<string>("30");

  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Get raw dashboard data from server (server returns { health, statistics, eventSummary, timestamp })
      const response = await axiosInstance.get<any>('/system/dashboard');
      setDashboardData(response.data);
    } catch (err) {
      console.error("Error loading dashboard data:", err);
      let errorMessage = "Failed to load dashboard data. Please try again.";
      
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

  const loadEvents = useCallback(async () => {
    setIsLoadingEvents(true);
    try {
      const type = eventTypeFilter === "all" ? undefined : eventTypeFilter;
      const source = eventSourceFilter === "all" ? undefined : eventSourceFilter;
      const data = await apiService.getAllSystemEvents(type, source, undefined, undefined, 100);
      setEvents(data);
    } catch (err) {
      console.error("Error loading events:", err);
      let errorMessage = "Failed to load system events. Please try again.";
      
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
      setIsLoadingEvents(false);
    }
  }, [eventTypeFilter, eventSourceFilter, toast]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const handleDeleteEvent = useCallback(async () => {
    if (!selectedEvent) return;

    try {
      await apiService.deleteSystemEvent(selectedEvent.id);
      toast({
        title: "Success",
        description: "System event has been deleted.",
      });
      await loadEvents();
      if (dashboardData) {
        await loadDashboardData();
      }
    } catch (err) {
      console.error("Error deleting event:", err);
      let errorMessage = "Failed to delete system event. Please try again.";
      
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
      setSelectedEvent(null);
    }
  }, [selectedEvent, toast, loadEvents, loadDashboardData, dashboardData]);

  const handleCleanupOldEvents = useCallback(async () => {
    try {
      const days = cleanupDays ? parseInt(cleanupDays) : undefined;
      await apiService.cleanupOldSystemEvents(days);
      toast({
        title: "Success",
        description: `Old system events have been cleaned up (keeping events from last ${days || 30} days).`,
      });
      await loadEvents();
      if (dashboardData) {
        await loadDashboardData();
      }
    } catch (err) {
      console.error("Error cleaning up events:", err);
      let errorMessage = "Failed to cleanup old events. Please try again.";
      
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
      setCleanupDialogOpen(false);
    }
  }, [cleanupDays, toast, loadEvents, loadDashboardData, dashboardData]);

  const handleViewDetails = useCallback(async (event: SystemEvent) => {
    try {
      const details = await apiService.getSystemEventById(event.id);
      setSelectedEvent(details);
      setDetailsDialogOpen(true);
    } catch (err) {
      console.error("Error loading event details:", err);
      let errorMessage = "Failed to load event details.";
      
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

  const getHealthStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "healthy":
        return "text-green-600";
      case "warning":
        return "text-yellow-600";
      case "critical":
        return "text-red-600";
      case "unhealthy":
        return "text-red-600";
      default:
        return "text-muted-foreground";
    }
  };

  const getHealthStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case "healthy":
        return "default";
      case "warning":
        return "secondary";
      case "critical":
      case "unhealthy":
        return "destructive";
      default:
        return "outline";
    }
  };

  const getEventTypeBadge = (type: SystemEventType) => {
    switch (type) {
      case "info":
        return "default";
      case "warning":
        return "secondary";
      case "error":
        return "destructive";
      case "critical":
        return "destructive";
      case "maintenance":
        return "default";
      case "backup":
        return "default";
      case "export":
        return "default";
      default:
        return "outline";
    }
  };

  const getEventTypeIcon = (type: SystemEventType) => {
    switch (type) {
      case "info":
        return <Info className="h-4 w-4" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4" />;
      case "error":
      case "critical":
        return <XCircle className="h-4 w-4" />;
      case "maintenance":
        return <AlertCircle className="h-4 w-4" />;
      case "backup":
        return <HardDrive className="h-4 w-4" />;
      case "export":
        return <Database className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const formatUptime = (uptime: number | { seconds?: number; formatted?: string }) => {
    if (typeof uptime === 'number') {
      const days = Math.floor(uptime / 86400);
      const hours = Math.floor((uptime % 86400) / 3600);
      const minutes = Math.floor((uptime % 3600) / 60);
      
      if (days > 0) return `${days}d ${hours}h ${minutes}m`;
      if (hours > 0) return `${hours}h ${minutes}m`;
      return `${minutes}m`;
    }
    
    // If it's an object with formatted property, use it
    if (uptime.formatted) {
      return uptime.formatted;
    }
    
    // Otherwise use seconds
    if (uptime.seconds !== undefined) {
      const days = Math.floor(uptime.seconds / 86400);
      const hours = Math.floor((uptime.seconds % 86400) / 3600);
      const minutes = Math.floor((uptime.seconds % 3600) / 60);
      
      if (days > 0) return `${days}d ${hours}h ${minutes}m`;
      if (hours > 0) return `${hours}h ${minutes}m`;
      return `${minutes}m`;
    }
    
    return "Unknown";
  };

  const formatDate = (dateString: string | Date | null | undefined) => {
    if (!dateString) return "—";
    try {
      const date = dateString instanceof Date ? dateString : new Date(dateString);
      return format(date, "MMM dd, yyyy HH:mm:ss");
    } catch {
      return "Invalid date";
    }
  };

  const formatMetadata = (metadata: Record<string, unknown> | undefined) => {
    if (!metadata || Object.keys(metadata).length === 0) return "—";
    return JSON.stringify(metadata, null, 2);
  };

  return (
    <div className="flex min-h-svh w-full flex-col bg-background p-4 sm:p-6 md:p-10">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">System Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Monitor system health, statistics, and events
          </p>
        </div>
        <Button
          onClick={() => {
            loadDashboardData();
            loadEvents();
          }}
          variant="outline"
          disabled={isLoading || isLoadingEvents}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading || isLoadingEvents ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading dashboard data...</p>
          </div>
        </div>
      ) : !dashboardData ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">No dashboard data available.</p>
        </div>
      ) : (
        <Tabs defaultValue="health" className="w-full">
          <TabsList>
            <TabsTrigger value="health">System Health</TabsTrigger>
            <TabsTrigger value="statistics">System Statistics</TabsTrigger>
            <TabsTrigger value="events">System Events</TabsTrigger>
          </TabsList>

          <TabsContent value="health" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Overall Status</CardTitle>
                  <CardDescription>System health status</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Badge variant={getHealthStatusBadge(dashboardData.health.status)}>
                      {dashboardData.health.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Uptime</CardTitle>
                  <CardDescription>System uptime</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatUptime(dashboardData.health.uptime)}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Last Check</CardTitle>
                  <CardDescription>Health check timestamp</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    {formatDate(dashboardData.health.timestamp)}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Database
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <Badge variant={getHealthStatusBadge(dashboardData.health.checks.database?.status)}>
                      {dashboardData.health.checks.database?.status || "unknown"}
                    </Badge>
                  </div>
                  {dashboardData.health.checks.database?.responseTime && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Response Time</span>
                      <span className="text-sm font-medium">{dashboardData.health.checks.database.responseTime}</span>
                    </div>
                  )}
                  {dashboardData.health.checks.database?.message && (
                    <div className="text-sm text-muted-foreground">
                      {dashboardData.health.checks.database.message}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <HardDrive className="h-5 w-5" />
                    Disk
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <Badge variant={getHealthStatusBadge(dashboardData.health.checks.disk?.status)}>
                      {dashboardData.health.checks.disk?.status || "unknown"}
                    </Badge>
                  </div>
                  {dashboardData.health.checks.disk?.usagePercentage && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Usage</span>
                      <span className="text-sm font-medium">{dashboardData.health.checks.disk.usagePercentage}%</span>
                    </div>
                  )}
                  {dashboardData.health.checks.disk?.used && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Used</span>
                      <span className="text-sm font-medium">{dashboardData.health.checks.disk.used}</span>
                    </div>
                  )}
                  {dashboardData.health.checks.disk?.free && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Free</span>
                      <span className="text-sm font-medium">{dashboardData.health.checks.disk.free}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MemoryStick className="h-5 w-5" />
                    Memory
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <Badge variant={getHealthStatusBadge(dashboardData.health.checks.memory?.status)}>
                      {dashboardData.health.checks.memory?.status || "unknown"}
                    </Badge>
                  </div>
                  {dashboardData.health.checks.memory?.usagePercentage && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Usage</span>
                      <span className="text-sm font-medium">{dashboardData.health.checks.memory.usagePercentage}%</span>
                    </div>
                  )}
                  {dashboardData.health.checks.memory?.used && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Used</span>
                      <span className="text-sm font-medium">{dashboardData.health.checks.memory.used}</span>
                    </div>
                  )}
                  {dashboardData.health.checks.memory?.free && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Free</span>
                      <span className="text-sm font-medium">{dashboardData.health.checks.memory.free}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Cpu className="h-5 w-5" />
                    CPU
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <Badge variant={getHealthStatusBadge(dashboardData.health.checks.cpu?.status)}>
                      {dashboardData.health.checks.cpu?.status || "unknown"}
                    </Badge>
                  </div>
                  {dashboardData.health.checks.cpu?.loadPercentage && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Load</span>
                      <span className="text-sm font-medium">{dashboardData.health.checks.cpu.loadPercentage}%</span>
                    </div>
                  )}
                  {dashboardData.health.checks.cpu?.cpuCount && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">CPU Count</span>
                      <span className="text-sm font-medium">{dashboardData.health.checks.cpu.cpuCount}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="statistics" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Time Range</CardTitle>
                  <CardDescription>{dashboardData.statistics.timeRange}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-sm space-y-1">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">From:</span>
                      <span>{formatDate(dashboardData.statistics.period.start)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">To:</span>
                      <span>{formatDate(dashboardData.statistics.period.end)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Users</CardTitle>
                  <CardDescription>User statistics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Total</span>
                      <span className="text-2xl font-bold">{dashboardData.statistics.statistics.users.total}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">New</span>
                      <span className="text-xl font-semibold">{dashboardData.statistics.statistics.users.new}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Activities</CardTitle>
                  <CardDescription>User activities</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{dashboardData.statistics.statistics.activities}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Events</CardTitle>
                  <CardDescription>System events in time range</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {Array.isArray(dashboardData.statistics.statistics.events)
                      ? dashboardData.statistics.statistics.events.reduce(
                          (sum, item) => sum + (item._count?.type || 0),
                          0
                        )
                      : dashboardData.eventSummary?.totalEvents || dashboardData.eventSummary?.total || 0}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Backups</CardTitle>
                  <CardDescription>Backup statistics in time range</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Array.isArray(dashboardData.statistics.statistics.backups) ? (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Total</span>
                          <span className="text-xl font-semibold">
                            {dashboardData.statistics.statistics.backups.reduce(
                              (sum, item) => sum + (item._count?.status || 0),
                              0
                            )}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Completed</span>
                          <span className="text-xl font-semibold text-green-600">
                            {dashboardData.statistics.statistics.backups
                              .find((item) => item.status === 'COMPLETED')?._count?.status || 0}
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Total</span>
                          <span className="text-xl font-semibold">0</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Completed</span>
                          <span className="text-xl font-semibold text-green-600">0</span>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="events" className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Select value={eventTypeFilter} onValueChange={(value) => setEventTypeFilter(value as SystemEventType | "all")}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INFO">Info</SelectItem>
                    <SelectItem value="WARNING">Warning</SelectItem>
                    <SelectItem value="ERROR">Error</SelectItem>
                    <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={eventSourceFilter} onValueChange={(value) => setEventSourceFilter(value as SystemEventSource | "all")}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filter by source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sources</SelectItem>
                    <SelectItem value="api">API</SelectItem>
                    <SelectItem value="scheduler">Scheduler</SelectItem>
                    <SelectItem value="sensor">Sensor</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="automated">Automated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={() => setCleanupDialogOpen(true)}
                variant="outline"
                disabled={isLoadingEvents}
              >
                <Trash className="h-4 w-4 mr-2" />
                Cleanup Old Events
              </Button>
            </div>

            {isLoadingEvents ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Loading events...</p>
                </div>
              </div>
            ) : events.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-muted-foreground">No events found.</p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {events.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell>
                          <Badge variant={getEventTypeBadge(event.type)} className="flex items-center gap-1 w-fit">
                            {getEventTypeIcon(event.type)}
                            <span className="capitalize">{event.type}</span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="capitalize">{event.source}</span>
                        </TableCell>
                        <TableCell className="max-w-md truncate">{event.message}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(event.createdAt)}
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-2">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleViewDetails(event)}
                              title="View Details"
                            >
                              <Info className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                setSelectedEvent(event);
                                setDeleteDialogOpen(true);
                              }}
                              title="Delete Event"
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
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Event Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Event Details</DialogTitle>
            <DialogDescription>
              Detailed information about the system event
            </DialogDescription>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4 py-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label className="text-muted-foreground">ID</Label>
                  <p className="font-mono text-sm">{selectedEvent.id}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Type</Label>
                  <div className="mt-1">
                    <Badge variant={getEventTypeBadge(selectedEvent.type)} className="flex items-center gap-1 w-fit">
                      {getEventTypeIcon(selectedEvent.type)}
                      <span className="capitalize">{selectedEvent.type}</span>
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Source</Label>
                  <p className="capitalize">{selectedEvent.source}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Created</Label>
                  <p className="text-sm">{formatDate(selectedEvent.createdAt)}</p>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Message</Label>
                <p className="mt-1">{selectedEvent.message}</p>
              </div>
              {selectedEvent.metadata && Object.keys(selectedEvent.metadata).length > 0 && (
                <div>
                  <Label className="text-muted-foreground">Metadata</Label>
                  <pre className="mt-1 p-3 bg-muted rounded-md text-xs overflow-auto max-h-48">
                    {formatMetadata(selectedEvent.metadata)}
                  </pre>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Event Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete System Event</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this system event? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteEvent}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cleanup Old Events Dialog */}
      <Dialog open={cleanupDialogOpen} onOpenChange={setCleanupDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cleanup Old System Events</DialogTitle>
            <DialogDescription>
              Delete system events older than the specified number of days. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-2">
              <Label>Days to Keep</Label>
              <Select value={cleanupDays} onValueChange={setCleanupDays}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="60">60 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                  <SelectItem value="180">180 days</SelectItem>
                  <SelectItem value="365">365 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCleanupDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCleanupOldEvents}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Cleanup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

