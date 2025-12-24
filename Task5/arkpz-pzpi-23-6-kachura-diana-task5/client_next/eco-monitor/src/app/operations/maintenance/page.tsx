"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { apiService } from "@/api";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import type {
  MaintenanceSchedule,
  CreateMaintenanceScheduleRequest,
  UpdateMaintenanceScheduleRequest,
  AssignMaintenanceRequest,
  CompleteMaintenanceRequest,
  ScheduleType,
  MonitoringStation,
  Sensor,
  User,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2,
  Plus,
  Edit,
  Trash2,
  UserPlus,
  CheckCircle2,
  Calendar,
  RefreshCw,
  Wrench,
  Clock,
  AlertCircle,
  Info,
} from "lucide-react";
import { format } from "date-fns";

export default function MaintenancePage() {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const { t } = useLanguage();
  const [schedules, setSchedules] = useState<MaintenanceSchedule[]>([]);
  const [mySchedules, setMySchedules] = useState<MaintenanceSchedule[]>([]);
  const [stations, setStations] = useState<MonitoringStation[]>([]);
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMy, setIsLoadingMy] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<MaintenanceSchedule | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [scheduleType, setScheduleType] = useState<ScheduleType>("one-time");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedStationId, setSelectedStationId] = useState<string>("");
  const [selectedSensorId, setSelectedSensorId] = useState<string>("");
  const [assignedUserId, setAssignedUserId] = useState<string>("");
  const [completionNotes, setCompletionNotes] = useState("");
  const [daysFilter, setDaysFilter] = useState<string>("7");

  // Refs для предотвращения циклических вызовов
  const initialLoadRef = useRef(false);
  const mySchedulesLoadRef = useRef(false);

  const isAdmin = useMemo(() => currentUser?.role === "ADMIN", [currentUser?.role]);
  const isOperator = useMemo(() => currentUser?.role === "OPERATOR" || isAdmin, [currentUser?.role, isAdmin]);

  const loadSchedules = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiService.getAllMaintenanceSchedules();
      setSchedules(data);
    } catch (err) {
      console.error("Error loading maintenance schedules:", err);
      let errorMessage = t("maintenance.toast.error.loadFailed");

      if (err && typeof err === "object" && "response" in err) {
        const axiosError = err as {
          response?: { status?: number; data?: { message?: string } };
          message?: string;
        };

        if (axiosError.response?.status === 401) {
          errorMessage = t("maintenance.toast.error.sessionExpired");
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
        title: t("common.error"),
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const loadMySchedules = useCallback(async () => {
    if (!currentUser?.id) {
      setMySchedules([]);
      return;
    }

    // Предотвращаем одновременные вызовы
    if (mySchedulesLoadRef.current) return;

    setIsLoadingMy(true);
    mySchedulesLoadRef.current = true;

    try {
      const days = parseInt(daysFilter) || 7;
      const data = await apiService.getUpcomingMaintenanceForUser(
          currentUser.id.toString(),
          days
      );
      setMySchedules(data);
    } catch (err) {
      console.error("Error loading my maintenance schedules:", err);
      let errorMessage = t("maintenance.toast.error.loadMyFailed");

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
        title: t("common.error"),
        description: errorMessage,
      });
      setMySchedules([]);
    } finally {
      setIsLoadingMy(false);
      // Сбрасываем флаг с задержкой для предотвращения рекурсии
      setTimeout(() => {
        mySchedulesLoadRef.current = false;
      }, 100);
    }
  }, [currentUser, daysFilter, toast, t]);

  const loadStations = useCallback(async () => {
    try {
      const data = await apiService.getAllMonitoringStations();
      setStations(data);
    } catch (err) {
      console.error("Error loading stations:", err);
    }
  }, []);

  const loadSensorsForStation = useCallback(async (stationId: string) => {
    if (!stationId) {
      setSensors([]);
      return;
    }

    try {
      const sensorsData = await apiService.getSensorsInStation(stationId);
      setSensors(sensorsData || []);
    } catch (err) {
      console.error("Error loading sensors:", err);
      setSensors([]);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      const data = await apiService.getAllUsers();
      // Filter to show only OPERATOR and ADMIN users for assignment
      const operators = data.filter(
          (u) => u.role === "OPERATOR" || u.role === "ADMIN"
      );
      setUsers(operators);
    } catch (err) {
      console.error("Error loading users:", err);
    }
  }, []);

  // Load initial data один раз при монтировании
  useEffect(() => {
    if (initialLoadRef.current) return;

    const initData = async () => {
      initialLoadRef.current = true;
      await loadSchedules();
      await loadStations();
      if (isAdmin) {
        await loadUsers();
      }
    };

    initData();

    return () => {
      // Cleanup при размонтировании
      initialLoadRef.current = false;
    };
  }, [isAdmin, loadSchedules, loadStations, loadUsers]);

  // Load user's schedules когда меняется currentUser или daysFilter
  useEffect(() => {
    const timer = setTimeout(() => {
      loadMySchedules();
    }, 300); // Небольшая задержка для предотвращения частых вызовов

    return () => clearTimeout(timer);
  }, [currentUser, daysFilter]);

  // Load sensors when station is selected (только для форм)
  useEffect(() => {
    if (selectedStationId && (createDialogOpen || editDialogOpen)) {
      loadSensorsForStation(selectedStationId);
    }
  }, [selectedStationId, createDialogOpen, editDialogOpen, loadSensorsForStation]);

  const handleRefreshAll = useCallback(async () => {
    setIsProcessing(true);
    try {
      await Promise.all([
        loadSchedules(),
        loadMySchedules(),
        loadStations(),
        isAdmin ? loadUsers() : Promise.resolve()
      ]);
      toast({
        title: t("common.success"),
        description: t("maintenance.toast.success.dataRefreshed"),
      });
    } catch (err) {
      console.error("Error refreshing data:", err);
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: t("maintenance.toast.error.refreshFailed"),
      });
    } finally {
      setIsProcessing(false);
    }
  }, [loadSchedules, loadMySchedules, loadStations, loadUsers, isAdmin, toast, t]);

  const handleCreate = useCallback(async () => {
    if (!title || !startDate) {
      toast({
        variant: "destructive",
        title: t("maintenance.toast.error.validationError"),
        description: t("maintenance.toast.error.titleAndDateRequired"),
      });
      return;
    }

    setIsProcessing(true);
    try {
      const request: CreateMaintenanceScheduleRequest = {
        title,
        description: description.trim() || undefined,
        scheduleType,
        startDate: new Date(startDate).toISOString(),
        assignedTo: assignedUserId || undefined,
        stationId: selectedStationId && selectedStationId !== "none" ? parseInt(selectedStationId) : undefined,
        sensorId: selectedSensorId && selectedSensorId !== "none" ? parseInt(selectedSensorId) : undefined,
        endDate: endDate ? new Date(endDate).toISOString() : undefined,
      };

      await apiService.createMaintenanceSchedule(request);
      toast({
        title: t("common.success"),
        description: t("maintenance.toast.success.scheduleCreated"),
      });
      setCreateDialogOpen(false);
      resetForm();
      await loadSchedules();
    } catch (err) {
      console.error("Error creating maintenance schedule:", err);
      let errorMessage = t("maintenance.toast.error.createFailed");

      if (err && typeof err === "object" && "response" in err) {
        const axiosError = err as {
          response?: { status?: number; data?: { message?: string } };
          message?: string;
        };

        if (axiosError.response?.status === 401) {
          errorMessage = t("maintenance.toast.error.sessionExpired");
        } else if (axiosError.response?.status === 403) {
          errorMessage = t("maintenance.toast.error.noPermission");
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
        title: t("common.error"),
        description: errorMessage,
      });
    } finally {
      setIsProcessing(false);
    }
  }, [
    title,
    description,
    scheduleType,
    startDate,
    endDate,
    selectedStationId,
    selectedSensorId,
    assignedUserId,
    toast,
    loadSchedules,
  ]);

  const handleUpdate = useCallback(async () => {
    if (!selectedSchedule) return;

    setIsProcessing(true);
    try {
      const request: UpdateMaintenanceScheduleRequest = {
        title: title || undefined,
        description: description.trim() || undefined,
        scheduleType: scheduleType || undefined,
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
        // If "none" is selected, we need to send null to clear the value
        // If a value is selected, send the number
        // If empty/undefined, don't include in update (undefined)
        stationId: selectedStationId === "none" ? null : (selectedStationId ? parseInt(selectedStationId) : undefined),
        sensorId: selectedSensorId === "none" ? null : (selectedSensorId ? parseInt(selectedSensorId) : undefined),
        endDate: endDate ? new Date(endDate).toISOString() : undefined,
        assignedTo: assignedUserId === "none" || assignedUserId === "" ? null : (assignedUserId || undefined),
      };

      await apiService.updateMaintenanceSchedule(
          selectedSchedule.id,
          request
      );
      toast({
        title: t("common.success"),
        description: t("maintenance.toast.success.scheduleUpdated"),
      });
      setEditDialogOpen(false);
      resetForm();
      await loadSchedules();
    } catch (err) {
      console.error("Error updating maintenance schedule:", err);
      let errorMessage = t("maintenance.toast.error.updateFailed");

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
        title: t("common.error"),
        description: errorMessage,
      });
    } finally {
      setIsProcessing(false);
    }
  }, [
    selectedSchedule,
    title,
    description,
    scheduleType,
    startDate,
    endDate,
    selectedStationId,
    selectedSensorId,
    assignedUserId,
    toast,
    loadSchedules,
  ]);

  const handleAssign = useCallback(async () => {
    if (!selectedSchedule || !assignedUserId) return;

    setIsProcessing(true);
    try {
      const request: AssignMaintenanceRequest = {
        assignedTo: assignedUserId,
      };
      await apiService.assignMaintenance(selectedSchedule.id, request);
      toast({
        title: t("common.success"),
        description: t("maintenance.toast.success.maintenanceAssigned"),
      });
      setAssignDialogOpen(false);
      setAssignedUserId("");
      await loadSchedules();
    } catch (err) {
      console.error("Error assigning maintenance:", err);
      let errorMessage = t("maintenance.toast.error.assignFailed");

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
        title: t("common.error"),
        description: errorMessage,
      });
    } finally {
      setIsProcessing(false);
    }
  }, [selectedSchedule, assignedUserId, toast, loadSchedules, t]);

  const handleComplete = useCallback(async () => {
    if (!selectedSchedule) return;

    setIsProcessing(true);
    try {
      const request: CompleteMaintenanceRequest = {
        notes: completionNotes.trim() || undefined,
      };
      await apiService.completeMaintenance(selectedSchedule.id, request);
      toast({
        title: t("common.success"),
        description: t("maintenance.toast.success.maintenanceCompleted"),
      });
      setCompleteDialogOpen(false);
      setCompletionNotes("");
      await loadSchedules();
    } catch (err) {
      console.error("Error completing maintenance:", err);
      let errorMessage = t("maintenance.toast.error.completeFailed");

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
        title: t("common.error"),
        description: errorMessage,
      });
    } finally {
      setIsProcessing(false);
    }
  }, [selectedSchedule, completionNotes, toast, loadSchedules, t]);

  const handleDelete = useCallback(async () => {
    if (!selectedSchedule) return;

    setIsProcessing(true);
    try {
      await apiService.deleteMaintenanceSchedule(selectedSchedule.id);
      toast({
        title: t("common.success"),
        description: t("maintenance.toast.success.scheduleDeleted"),
      });
      await loadSchedules();
    } catch (err) {
      console.error("Error deleting maintenance schedule:", err);
      let errorMessage = t("maintenance.toast.error.deleteFailed");

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
        title: t("common.error"),
        description: errorMessage,
      });
    } finally {
      setIsProcessing(false);
      setDeleteDialogOpen(false);
      setSelectedSchedule(null);
    }
  }, [selectedSchedule, toast, loadSchedules, t]);

  const handleCheckUpcoming = useCallback(async () => {
    setIsProcessing(true);
    try {
      await apiService.checkUpcomingMaintenance();
      toast({
        title: t("common.success"),
        description: t("maintenance.toast.success.upcomingChecked"),
      });
      await loadMySchedules();
    } catch (err) {
      console.error("Error checking upcoming maintenance:", err);
      let errorMessage = t("maintenance.toast.error.checkFailed");

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
        title: t("common.error"),
        description: errorMessage,
      });
    } finally {
      setIsProcessing(false);
    }
  }, [toast, loadMySchedules, t]);

  const handleViewDetails = useCallback(async (schedule: MaintenanceSchedule) => {
    try {
      const details = await apiService.getMaintenanceScheduleById(schedule.id);
      setSelectedSchedule(details);
      setDetailsDialogOpen(true);
    } catch (err) {
      console.error("Error loading maintenance details:", err);
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: t("maintenance.toast.error.loadDetailsFailed"),
      });
    }
  }, [toast, t]);

  const handleOpenEdit = useCallback((schedule: MaintenanceSchedule) => {
    setSelectedSchedule(schedule);
    setTitle(schedule.title);
    setDescription(schedule.description || "");
    setScheduleType(schedule.scheduleType);
    setStartDate(format(new Date(schedule.startDate), "yyyy-MM-dd'T'HH:mm"));
    setEndDate(
        (schedule as any).endDate
            ? format(new Date((schedule as any).endDate), "yyyy-MM-dd'T'HH:mm")
            : ""
    );
    setSelectedStationId((schedule as any).stationId?.toString() || "");
    setSelectedSensorId((schedule as any).sensorId?.toString() || "");
    setAssignedUserId(schedule.assignedTo || "");
    setEditDialogOpen(true);
  }, []);

  const handleOpenAssign = useCallback((schedule: MaintenanceSchedule) => {
    setSelectedSchedule(schedule);
    setAssignedUserId(schedule.assignedTo || "");
    setAssignDialogOpen(true);
  }, []);

  const handleOpenComplete = useCallback((schedule: MaintenanceSchedule) => {
    setSelectedSchedule(schedule);
    setCompletionNotes("");
    setCompleteDialogOpen(true);
  }, []);

  const resetForm = useCallback(() => {
    setTitle("");
    setDescription("");
    setScheduleType("one-time");
    setStartDate("");
    setEndDate("");
    setSelectedStationId("");
    setSelectedSensorId("");
    setAssignedUserId("");
    setCompletionNotes("");
    setSelectedSchedule(null);
  }, []);

  const getStatusBadge = useCallback((schedule: MaintenanceSchedule) => {
    const isCompleted = (schedule as any).isCompleted || schedule.status === "completed";
    if (isCompleted) {
      return <Badge variant="default" className="flex items-center gap-1 w-fit">
        <CheckCircle2 className="h-3 w-3" />
        {t("maintenance.status.completed")}
      </Badge>;
    }

    const startDate = new Date(schedule.startDate);
    const now = new Date();

    if (startDate < now) {
      return <Badge variant="destructive" className="flex items-center gap-1 w-fit">
        <AlertCircle className="h-3 w-3" />
        {t("maintenance.status.overdue")}
      </Badge>;
    }

    if (startDate.getTime() - now.getTime() < 24 * 60 * 60 * 1000) {
      return <Badge variant="secondary" className="flex items-center gap-1 w-fit">
        <Clock className="h-3 w-3" />
        {t("maintenance.status.upcoming")}
      </Badge>;
    }

    return <Badge variant="outline" className="flex items-center gap-1 w-fit">
      <Calendar className="h-3 w-3" />
      {t("maintenance.status.scheduled")}
    </Badge>;
  }, [t]);

  const formatDate = useCallback((dateString: string | null | undefined) => {
    if (!dateString) return "—";
    try {
      return format(new Date(dateString), "MMM dd, yyyy HH:mm");
    } catch {
      return t("common.invalidDate");
    }
  }, [t]);

  const scheduleTypes: ScheduleType[] = ["one-time", "daily", "weekly", "monthly", "yearly"];

  const getScheduleTypeLabel = useCallback((type: ScheduleType): string => {
    const typeMap: Record<ScheduleType, string> = {
      "one-time": t("maintenance.scheduleTypes.oneTime"),
      "daily": t("maintenance.scheduleTypes.daily"),
      "weekly": t("maintenance.scheduleTypes.weekly"),
      "monthly": t("maintenance.scheduleTypes.monthly"),
      "yearly": t("maintenance.scheduleTypes.yearly"),
    };
    return typeMap[type] || type;
  }, [t]);

  return (
      <div className="flex min-h-svh w-full flex-col bg-background p-4 sm:p-6 md:p-10">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">{t("maintenance.title")}</h1>
            <p className="text-muted-foreground mt-2">
              {t("maintenance.description")}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
                onClick={handleRefreshAll}
                variant="outline"
                disabled={isProcessing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isProcessing ? "animate-spin" : ""}`} />
              {t("maintenance.refresh")}
            </Button>
            {isOperator && (
                <Button onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t("maintenance.createSchedule")}
                </Button>
            )}
          </div>
        </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList>
            <TabsTrigger value="all">{t("maintenance.allSchedules")}</TabsTrigger>
            {isOperator && (
                <TabsTrigger value="my-schedule">{t("maintenance.mySchedule")}</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">{t("maintenance.loadingSchedules")}</p>
                  </div>
                </div>
            ) : schedules.length === 0 ? (
                <Card>
                  <CardContent className="py-12">
                    <div className="text-center text-muted-foreground">
                      {t("maintenance.noSchedules")}
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
                            <TableHead>{t("maintenance.tableHeaders.title")}</TableHead>
                            <TableHead>{t("maintenance.tableHeaders.type")}</TableHead>
                            <TableHead>{t("maintenance.tableHeaders.startDate")}</TableHead>
                            <TableHead>{t("maintenance.tableHeaders.assignedTo")}</TableHead>
                            <TableHead>{t("maintenance.tableHeaders.status")}</TableHead>
                            <TableHead className="text-right">{t("maintenance.tableHeaders.actions")}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {schedules.map((schedule) => (
                              <TableRow key={schedule.id}>
                                <TableCell className="font-medium">{schedule.title}</TableCell>
                                <TableCell>
                                  {getScheduleTypeLabel(schedule.scheduleType)}
                                </TableCell>
                                <TableCell className="text-sm">
                                  {formatDate(schedule.startDate)}
                                </TableCell>
                                <TableCell>
                                  {schedule.assignedTo
                                      ? users.find((u) => u.id.toString() === schedule.assignedTo)?.email ||
                                      schedule.assignedTo
                                      : t("maintenance.status.unassigned")}
                                </TableCell>
                                <TableCell>{getStatusBadge(schedule)}</TableCell>
                                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex justify-end gap-2">
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={() => handleViewDetails(schedule)}
                                        title={t("maintenance.actions.viewDetails")}
                                    >
                                      <Info className="h-4 w-4" />
                                    </Button>
                                    {isOperator && (
                                        <>
                                          <Button
                                              size="icon"
                                              variant="ghost"
                                              onClick={() => handleOpenEdit(schedule)}
                                              disabled={isProcessing}
                                              title={t("maintenance.actions.editSchedule")}
                                          >
                                            <Edit className="h-4 w-4" />
                                          </Button>
                                          {isAdmin && (
                                              <Button
                                                  size="icon"
                                                  variant="ghost"
                                                  onClick={() => handleOpenAssign(schedule)}
                                                  disabled={isProcessing}
                                                  title={t("maintenance.actions.assignOperator")}
                                              >
                                                <UserPlus className="h-4 w-4" />
                                              </Button>
                                          )}
                                          {!((schedule as any).isCompleted) && (
                                              <Button
                                                  size="icon"
                                                  variant="ghost"
                                                  onClick={() => handleOpenComplete(schedule)}
                                                  disabled={isProcessing}
                                                  title={t("maintenance.actions.markAsCompleted")}
                                              >
                                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                                              </Button>
                                          )}
                                          <Button
                                              size="icon"
                                              variant="ghost"
                                              onClick={() => {
                                                setSelectedSchedule(schedule);
                                                setDeleteDialogOpen(true);
                                              }}
                                              disabled={isProcessing}
                                              title={t("maintenance.actions.deleteSchedule")}
                                          >
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                          </Button>
                                        </>
                                    )}
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
          </TabsContent>

          {isOperator && (
              <TabsContent value="my-schedule" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>{t("maintenance.filter.title")}</CardTitle>
                    <CardDescription>{t("maintenance.filter.description")}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <Label>{t("maintenance.filter.daysAhead")}</Label>
                        <Select value={daysFilter} onValueChange={setDaysFilter}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="7">7 {t("maintenance.days")}</SelectItem>
                            <SelectItem value="14">14 {t("maintenance.days")}</SelectItem>
                            <SelectItem value="30">30 {t("maintenance.days")}</SelectItem>
                            <SelectItem value="60">60 {t("maintenance.days")}</SelectItem>
                            <SelectItem value="90">90 {t("maintenance.days")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-end">
                        <Button
                            onClick={handleCheckUpcoming}
                            variant="outline"
                            disabled={isProcessing}
                        >
                          {isProcessing ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                {t("maintenance.filter.checking")}
                              </>
                          ) : (
                              <>
                                <AlertCircle className="h-4 w-4 mr-2" />
                                {t("maintenance.filter.checkUpcoming")}
                              </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {isLoadingMy ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">{t("maintenance.loadingMySchedule")}</p>
                      </div>
                    </div>
                ) : mySchedules.length === 0 ? (
                    <Card>
                      <CardContent className="py-12">
                        <div className="text-center text-muted-foreground">
                          {t("maintenance.noMySchedules")}
                        </div>
                      </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {mySchedules.map((schedule) => {
                        const isCompleted = (schedule as any).isCompleted;
                        const startDate = new Date(schedule.startDate);
                        const isOverdue = startDate < new Date() && !isCompleted;
                        const isUpcoming = startDate.getTime() - new Date().getTime() < 24 * 60 * 60 * 1000;

                        return (
                            <Card
                                key={schedule.id}
                                className={isOverdue ? "border-destructive" : isUpcoming ? "border-yellow-500" : ""}
                            >
                              <CardHeader>
                                <div className="flex items-start justify-between">
                                  <CardTitle className="text-lg">{schedule.title}</CardTitle>
                                  {getStatusBadge(schedule)}
                                </div>
                                <CardDescription>
                                  {schedule.description || t("maintenance.details.noDescription")}
                                </CardDescription>
                              </CardHeader>
                              <CardContent className="space-y-4">
                                <div className="space-y-2 text-sm">
                                  <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">{t("maintenance.tableHeaders.type")}:</span>
                                    <span>
                                      {getScheduleTypeLabel(schedule.scheduleType)}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">{t("maintenance.tableHeaders.startDate")}:</span>
                                    <span>{formatDate(schedule.startDate)}</span>
                                  </div>
                                  {(schedule as any).endDate && (
                                      <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">{t("maintenance.tableHeaders.endDate")}:</span>
                                        <span>{formatDate((schedule as any).endDate)}</span>
                                      </div>
                                  )}
                                </div>
                                <div className="flex gap-2 pt-2">
                                  <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleViewDetails(schedule)}
                                      className="flex-1"
                                  >
                                    <Info className="h-4 w-4 mr-2" />
                                    {t("maintenance.actions.details")}
                                  </Button>
                                  {!isCompleted && !schedule.assignedTo && (
                                      <Button
                                          size="sm"
                                          onClick={() => {
                                            setSelectedSchedule(schedule);
                                            setAssignedUserId(currentUser?.id.toString() || "");
                                            setAssignDialogOpen(true);
                                          }}
                                          disabled={isProcessing}
                                          className="flex-1"
                                      >
                                        <UserPlus className="h-4 w-4 mr-2" />
                                        {t("maintenance.actions.accept")}
                                      </Button>
                                  )}
                                  {!isCompleted && schedule.assignedTo === currentUser?.id.toString() && (
                                      <Button
                                          size="sm"
                                          onClick={() => handleOpenComplete(schedule)}
                                          disabled={isProcessing}
                                          className="flex-1"
                                      >
                                        <CheckCircle2 className="h-4 w-4 mr-2" />
                                        {t("maintenance.actions.complete")}
                                      </Button>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                        );
                      })}
                    </div>
                )}
              </TabsContent>
          )}
        </Tabs>

        {/* Create Dialog */}
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t("maintenance.dialog.create.title")}</DialogTitle>
              <DialogDescription>
                {t("maintenance.dialog.create.description")}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>{t("maintenance.form.title")} {t("maintenance.form.required")}</Label>
                <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={t("maintenance.form.titlePlaceholder")}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("maintenance.form.description")}</Label>
                <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t("maintenance.form.descriptionPlaceholder")}
                    rows={3}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t("maintenance.form.scheduleType")} {t("maintenance.form.required")}</Label>
                  <Select
                      value={scheduleType}
                      onValueChange={(value) => setScheduleType(value as ScheduleType)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {scheduleTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {getScheduleTypeLabel(type)}
                          </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("maintenance.form.startDate")} {t("maintenance.form.required")}</Label>
                  <Input
                      type="datetime-local"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("maintenance.form.endDate")}</Label>
                <Input
                    type="datetime-local"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t("maintenance.form.station")}</Label>
                  <Select value={selectedStationId} onValueChange={setSelectedStationId}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("maintenance.form.selectStation")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t("maintenance.form.none")}</SelectItem>
                      {stations.map((station) => (
                          <SelectItem key={station.id} value={station.id.toString()}>
                            {station.name}
                          </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("maintenance.form.sensor")}</Label>
                  <Select
                      value={selectedSensorId}
                      onValueChange={setSelectedSensorId}
                      disabled={!selectedStationId || selectedStationId === "none"}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("maintenance.form.selectSensor")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t("maintenance.form.none")}</SelectItem>
                      {sensors.map((sensor) => (
                          <SelectItem key={sensor.id} value={sensor.id.toString()}>
                            {sensor.name} ({sensor.serialNumber})
                          </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {isAdmin && (
                  <div className="space-y-2">
                    <Label>{t("maintenance.form.assignTo")}</Label>
                    <Select value={assignedUserId} onValueChange={setAssignedUserId}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("maintenance.form.selectOperator")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{t("maintenance.status.unassigned")}</SelectItem>
                        {users.map((user) => (
                            <SelectItem key={user.id} value={user.id.toString()}>
                              {user.email}
                              {user.firstName || user.lastName
                                  ? ` (${user.firstName || ""} ${user.lastName || ""})`.trim()
                                  : ""}
                            </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
              )}
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
                {t("maintenance.actions.cancel")}
              </Button>
              <Button onClick={handleCreate} disabled={isProcessing || !title || !startDate}>
                {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t("maintenance.actions.creating")}
                    </>
                ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      {t("maintenance.actions.create")}
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
              <DialogTitle>{t("maintenance.dialog.edit.title")}</DialogTitle>
              <DialogDescription>
                {t("maintenance.dialog.edit.description")}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>{t("maintenance.form.title")} {t("maintenance.form.required")}</Label>
                <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={t("maintenance.form.titlePlaceholder")}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("maintenance.form.description")}</Label>
                <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t("maintenance.form.descriptionPlaceholder")}
                    rows={3}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t("maintenance.form.scheduleType")} {t("maintenance.form.required")}</Label>
                  <Select
                      value={scheduleType}
                      onValueChange={(value) => setScheduleType(value as ScheduleType)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {scheduleTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {getScheduleTypeLabel(type)}
                          </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("maintenance.form.startDate")} {t("maintenance.form.required")}</Label>
                  <Input
                      type="datetime-local"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("maintenance.form.endDate")}</Label>
                <Input
                    type="datetime-local"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t("maintenance.form.station")}</Label>
                  <Select value={selectedStationId} onValueChange={setSelectedStationId}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("maintenance.form.selectStation")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t("maintenance.form.none")}</SelectItem>
                      {stations.map((station) => (
                          <SelectItem key={station.id} value={station.id.toString()}>
                            {station.name}
                          </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("maintenance.form.sensor")}</Label>
                  <Select
                      value={selectedSensorId}
                      onValueChange={setSelectedSensorId}
                      disabled={!selectedStationId || selectedStationId === "none"}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("maintenance.form.selectSensor")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t("maintenance.form.none")}</SelectItem>
                      {sensors.map((sensor) => (
                          <SelectItem key={sensor.id} value={sensor.id.toString()}>
                            {sensor.name} ({sensor.serialNumber})
                          </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {isAdmin && (
                  <div className="space-y-2">
                    <Label>{t("maintenance.form.assignTo")}</Label>
                    <Select value={assignedUserId} onValueChange={setAssignedUserId}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("maintenance.form.selectOperator")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{t("maintenance.status.unassigned")}</SelectItem>
                        {users.map((user) => (
                            <SelectItem key={user.id} value={user.id.toString()}>
                              {user.email}
                              {user.firstName || user.lastName
                                  ? ` (${user.firstName || ""} ${user.lastName || ""})`.trim()
                                  : ""}
                            </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
              )}
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
                {t("maintenance.actions.cancel")}
              </Button>
              <Button onClick={handleUpdate} disabled={isProcessing || !title || !startDate}>
                {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t("maintenance.actions.updating")}
                    </>
                ) : (
                    t("maintenance.actions.update")
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Assign Dialog */}
        <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("maintenance.dialog.assign.title")}</DialogTitle>
              <DialogDescription>
                {t("maintenance.dialog.assign.description")}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="space-y-2">
                <Label>{t("maintenance.form.assignTo")} {t("maintenance.form.required")}</Label>
                <Select value={assignedUserId} onValueChange={setAssignedUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("maintenance.form.selectOperator")} />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                        <SelectItem key={user.id} value={user.id.toString()}>
                          {user.email}
                          {user.firstName || user.lastName
                              ? ` (${user.firstName || ""} ${user.lastName || ""})`.trim()
                              : ""}
                        </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                  variant="outline"
                  onClick={() => {
                    setAssignDialogOpen(false);
                    setAssignedUserId("");
                  }}
                  disabled={isProcessing}
              >
                {t("maintenance.actions.cancel")}
              </Button>
              <Button onClick={handleAssign} disabled={isProcessing || !assignedUserId}>
                {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t("maintenance.actions.assigning")}
                    </>
                ) : (
                    <>
                      <UserPlus className="h-4 w-4 mr-2" />
                      {t("maintenance.actions.assign")}
                    </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Complete Dialog */}
        <Dialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("maintenance.dialog.complete.title")}</DialogTitle>
              <DialogDescription>
                {t("maintenance.dialog.complete.description")}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="space-y-2">
                <Label>{t("maintenance.form.completionNotes")}</Label>
                <Textarea
                    value={completionNotes}
                    onChange={(e) => setCompletionNotes(e.target.value)}
                    placeholder={t("maintenance.form.completionNotesPlaceholder")}
                    rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                  variant="outline"
                  onClick={() => {
                    setCompleteDialogOpen(false);
                    setCompletionNotes("");
                  }}
                  disabled={isProcessing}
              >
                {t("maintenance.actions.cancel")}
              </Button>
              <Button onClick={handleComplete} disabled={isProcessing}>
                {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t("maintenance.actions.completing")}
                    </>
                ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      {t("maintenance.actions.markAsCompleted")}
                    </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Details Dialog */}
        <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t("maintenance.dialog.details.title")}</DialogTitle>
              <DialogDescription>
                {t("maintenance.dialog.details.description")}
              </DialogDescription>
            </DialogHeader>
            {selectedSchedule && (
                <div className="space-y-4 py-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label className="text-muted-foreground">{t("maintenance.details.id")}</Label>
                      <p className="font-mono text-sm">{selectedSchedule.id}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">{t("maintenance.details.status")}</Label>
                      <div className="mt-1">{getStatusBadge(selectedSchedule)}</div>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">{t("maintenance.details.title")}</Label>
                      <p>{selectedSchedule.title}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">{t("maintenance.details.scheduleType")}</Label>
                      <p>
                        {getScheduleTypeLabel(selectedSchedule.scheduleType)}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">{t("maintenance.details.startDate")}</Label>
                      <p className="text-sm">{formatDate(selectedSchedule.startDate)}</p>
                    </div>
                    {(selectedSchedule as any).endDate && (
                        <div>
                          <Label className="text-muted-foreground">{t("maintenance.details.endDate")}</Label>
                          <p className="text-sm">{formatDate((selectedSchedule as any).endDate)}</p>
                        </div>
                    )}
                    <div>
                      <Label className="text-muted-foreground">{t("maintenance.details.assignedTo")}</Label>
                      <p>
                        {selectedSchedule.assignedTo
                            ? users.find((u) => u.id.toString() === selectedSchedule.assignedTo)?.email ||
                            selectedSchedule.assignedTo
                            : t("maintenance.status.unassigned")}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">{t("maintenance.details.created")}</Label>
                      <p className="text-sm">{formatDate(selectedSchedule.createdAt)}</p>
                    </div>
                  </div>
                  {selectedSchedule.description && (
                      <div>
                        <Label className="text-muted-foreground">{t("maintenance.details.description")}</Label>
                        <p className="mt-1">{selectedSchedule.description}</p>
                      </div>
                  )}
                </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setDetailsDialogOpen(false)}>
                {t("maintenance.actions.close")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("maintenance.dialog.delete.title")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("maintenance.dialog.delete.description").replace("{title}", selectedSchedule?.title || "")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isProcessing}>{t("maintenance.actions.cancel")}</AlertDialogCancel>
              <AlertDialogAction
                  onClick={handleDelete}
                  disabled={isProcessing}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t("maintenance.actions.deleting")}
                    </>
                ) : (
                    t("maintenance.actions.delete")
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
  );
}
