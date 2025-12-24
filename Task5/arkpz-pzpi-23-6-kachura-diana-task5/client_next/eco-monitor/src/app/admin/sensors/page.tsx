"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { apiService } from "@/api";
import { useAuth } from "@/contexts/AuthContext";
import type {
  Sensor,
  CreateSensorRequest,
  UpdateSensorRequest,
  SensorType,
  SensorStatus,
  SensorStatusInfo,
  MonitoringStation,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  Info,
  Search,
  Power,
  PowerOff,
  Activity,
  History,
  Shield,
  Radio,
  Battery,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";

const sensorTypes: SensorType[] = [
  'temperature',
  'humidity',
  'pressure',
  'air_quality',
  'co2',
  'noise',
  'wind_speed',
  'wind_direction',
  'precipitation',
  'uv_index',
  'soil_moisture',
  'ph',
];

const sensorStatuses: SensorStatus[] = ['active', 'inactive', 'calibrating', 'error'];

export default function SensorsAdminPage() {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [filteredSensors, setFilteredSensors] = useState<Sensor[]>([]);
  const [stations, setStations] = useState<MonitoringStation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [selectedSensor, setSelectedSensor] = useState<Sensor | null>(null);
  const [currentStatus, setCurrentStatus] = useState<SensorStatusInfo | null>(null);
  const [statusHistory, setStatusHistory] = useState<SensorStatusInfo[]>([]);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  // Form states
  const [stationId, setStationId] = useState("");
  const [type, setType] = useState<SensorType>("temperature");
  const [name, setName] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [calibrationDate, setCalibrationDate] = useState("");

  const isAdmin = useMemo(() => currentUser?.role === "ADMIN", [currentUser?.role]);
  const isOperator = useMemo(() => currentUser?.role === "OPERATOR" || isAdmin, [currentUser?.role, isAdmin]);

  const loadSensors = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiService.getAllSensors();
      setSensors(data);
      setFilteredSensors(data);
    } catch (err) {
      console.error("Error loading sensors:", err);
      let errorMessage = "Failed to load sensors. Please try again.";

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

  const loadStations = useCallback(async () => {
    try {
      const data = await apiService.getAllMonitoringStations();
      setStations(data);
    } catch (err) {
      console.error("Error loading stations:", err);
    }
  }, []);

  useEffect(() => {
    if (isOperator) {
      loadSensors();
      loadStations();
    }
  }, [isOperator, loadSensors, loadStations]);

  // Filter sensors based on search query and type filter
  useEffect(() => {
    let filtered = sensors;

    // Filter by type
    if (typeFilter !== "all") {
      filtered = filtered.filter((sensor) => sensor.type === typeFilter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (sensor) =>
          sensor.name.toLowerCase().includes(query) ||
          sensor.serialNumber.toLowerCase().includes(query) ||
          sensor.description?.toLowerCase().includes(query) ||
          sensor.location?.toLowerCase().includes(query) ||
          stations.find((s) => s.id === sensor.stationId)?.name.toLowerCase().includes(query)
      );
    }

    setFilteredSensors(filtered);
  }, [searchQuery, typeFilter, sensors, stations]);

  const handleRefresh = useCallback(async () => {
    setIsProcessing(true);
    try {
      await Promise.all([loadSensors(), loadStations()]);
      toast({
        title: "Success",
        description: "Sensors refreshed successfully.",
      });
    } catch (err) {
      console.error("Error refreshing sensors:", err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to refresh sensors.",
      });
    } finally {
      setIsProcessing(false);
    }
  }, [loadSensors, loadStations, toast]);

  const handleCreate = useCallback(async () => {
    if (!stationId || !name.trim() || !serialNumber.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Station, name, and serial number are required.",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const request: CreateSensorRequest = {
        stationId,
        type,
        name: name.trim(),
        serialNumber: serialNumber.trim(),
        description: description.trim() || undefined,
        location: location.trim() || undefined,
        calibrationDate: calibrationDate || undefined,
      };

      await apiService.createSensor(request);
      toast({
        title: "Success",
        description: "Sensor created successfully.",
      });
      setCreateDialogOpen(false);
      resetForm();
      await loadSensors();
    } catch (err) {
      console.error("Error creating sensor:", err);
      let errorMessage = "Failed to create sensor. Please try again.";

      if (err && typeof err === "object" && "response" in err) {
        const axiosError = err as {
          response?: { status?: number; data?: { message?: string } };
          message?: string;
        };

        if (axiosError.response?.status === 401) {
          errorMessage = "Your session has expired. Please log in again.";
        } else if (axiosError.response?.status === 403) {
          errorMessage = "You don't have permission to create sensors.";
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
  }, [stationId, type, name, serialNumber, description, location, calibrationDate, toast, loadSensors]);

  const handleUpdate = useCallback(async () => {
    if (!selectedSensor) return;

    if (!name.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Name is required.",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const request: UpdateSensorRequest = {
        name: name.trim(),
        description: description.trim() || undefined,
        location: location.trim() || undefined,
        calibrationDate: calibrationDate || undefined,
      };

      await apiService.updateSensor(selectedSensor.id, request);
      toast({
        title: "Success",
        description: "Sensor updated successfully.",
      });
      setEditDialogOpen(false);
      resetForm();
      await loadSensors();
    } catch (err) {
      console.error("Error updating sensor:", err);
      let errorMessage = "Failed to update sensor. Please try again.";

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
  }, [selectedSensor, name, description, location, calibrationDate, toast, loadSensors]);

  const handleDelete = useCallback(async () => {
    if (!selectedSensor) return;

    setIsProcessing(true);
    try {
      await apiService.deleteSensor(selectedSensor.id);
      toast({
        title: "Success",
        description: "Sensor has been deleted.",
      });
      await loadSensors();
    } catch (err) {
      console.error("Error deleting sensor:", err);
      let errorMessage = "Failed to delete sensor. Please try again.";

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
      setSelectedSensor(null);
    }
  }, [selectedSensor, toast, loadSensors]);

  const handleActivate = useCallback(async (sensor: Sensor) => {
    setIsProcessing(true);
    try {
      await apiService.activateSensor(sensor.id);
      toast({
        title: "Success",
        description: "Sensor has been activated.",
      });
      await loadSensors();
    } catch (err) {
      console.error("Error activating sensor:", err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to activate sensor.",
      });
    } finally {
      setIsProcessing(false);
    }
  }, [toast, loadSensors]);

  const handleDeactivate = useCallback(async (sensor: Sensor) => {
    setIsProcessing(true);
    try {
      await apiService.deactivateSensor(sensor.id);
      toast({
        title: "Success",
        description: "Sensor has been deactivated.",
      });
      await loadSensors();
    } catch (err) {
      console.error("Error deactivating sensor:", err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to deactivate sensor.",
      });
    } finally {
      setIsProcessing(false);
    }
  }, [toast, loadSensors]);

  const handleViewStatus = useCallback(async (sensor: Sensor) => {
    setSelectedSensor(sensor);
    setIsLoadingStatus(true);
    try {
      const status = await apiService.getSensorStatus(sensor.id);
      setCurrentStatus(status);
      setStatusDialogOpen(true);
    } catch (err) {
      console.error("Error loading sensor status:", err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load sensor status.",
      });
    } finally {
      setIsLoadingStatus(false);
    }
  }, [toast]);

  const handleViewHistory = useCallback(async (sensor: Sensor) => {
    setSelectedSensor(sensor);
    setIsLoadingStatus(true);
    try {
      const history = await apiService.getSensorStatusHistory(sensor.id);
      setStatusHistory(history);
      setHistoryDialogOpen(true);
    } catch (err) {
      console.error("Error loading sensor status history:", err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load sensor status history.",
      });
    } finally {
      setIsLoadingStatus(false);
    }
  }, [toast]);

  const handleOpenEdit = useCallback((sensor: Sensor) => {
    setSelectedSensor(sensor);
    setName(sensor.name);
    setDescription(sensor.description || "");
    setLocation(sensor.location || "");
    setCalibrationDate(
      sensor.calibrationDate ? format(new Date(sensor.calibrationDate), "yyyy-MM-dd") : ""
    );
    setEditDialogOpen(true);
  }, []);

  const resetForm = useCallback(() => {
    setStationId("");
    setType("temperature");
    setName("");
    setSerialNumber("");
    setDescription("");
    setLocation("");
    setCalibrationDate("");
    setSelectedSensor(null);
  }, []);

  const getStatusBadge = (status: SensorStatus) => {
    const variants: Record<SensorStatus, "default" | "secondary" | "destructive" | "outline"> = {
      active: "default",
      inactive: "secondary",
      calibrating: "outline",
      error: "destructive",
    };

    return (
      <Badge variant={variants[status]} className="capitalize">
        {status}
      </Badge>
    );
  };

  const getTypeBadge = (type: SensorType) => {
    return (
      <Badge variant="outline" className="capitalize">
        {type.replace("_", " ")}
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

  const getStationName = (stationId: string) => {
    const station = stations.find((s) => s.id === stationId);
    return station?.name || stationId;
  };

  if (!isOperator) {
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
          <h1 className="text-3xl font-bold">Sensor Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage sensors across all monitoring stations
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
          {isOperator && (
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Sensor
            </Button>
          )}
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Search & Filter</CardTitle>
          <CardDescription>Search sensors by name, serial number, or filter by type</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search sensors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {sensorTypes.map((st) => (
                    <SelectItem key={st} value={st}>
                      <span className="capitalize">{st.replace("_", " ")}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card>
          <CardContent className="py-12">
            <div className="flex items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Loading sensors...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : filteredSensors.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              {searchQuery || typeFilter !== "all" ? (
                <>
                  <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-semibold">No sensors found</p>
                  <p className="text-sm mt-2">Try adjusting your search or filter criteria.</p>
                </>
              ) : (
                <>
                  <Radio className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-semibold">No sensors found.</p>
                  <p className="text-sm mt-2">Create your first sensor to get started.</p>
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
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Serial Number</TableHead>
                    <TableHead>Station</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSensors.map((sensor) => (
                    <TableRow key={sensor.id}>
                      <TableCell className="font-medium">{sensor.name}</TableCell>
                      <TableCell>{getTypeBadge(sensor.type)}</TableCell>
                      <TableCell className="font-mono text-sm">{sensor.serialNumber}</TableCell>
                      <TableCell>{getStationName(sensor.stationId)}</TableCell>
                      <TableCell>{getStatusBadge(sensor.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {sensor.location || "—"}
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleViewStatus(sensor)}
                            title="View Status"
                          >
                            <Activity className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleViewHistory(sensor)}
                            title="View Status History"
                          >
                            <History className="h-4 w-4" />
                          </Button>
                          {isOperator && (
                            <>
                              {sensor.status === "active" ? (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handleDeactivate(sensor)}
                                  disabled={isProcessing}
                                  title="Deactivate Sensor"
                                >
                                  <PowerOff className="h-4 w-4 text-orange-600" />
                                </Button>
                              ) : (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handleActivate(sensor)}
                                  disabled={isProcessing}
                                  title="Activate Sensor"
                                >
                                  <Power className="h-4 w-4 text-green-600" />
                                </Button>
                              )}
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleOpenEdit(sensor)}
                                disabled={isProcessing}
                                title="Edit Sensor"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => {
                                  setSelectedSensor(sensor);
                                  setDeleteDialogOpen(true);
                                }}
                                disabled={isProcessing}
                                title="Delete Sensor"
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

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Sensor</DialogTitle>
            <DialogDescription>
              Create a new sensor for a monitoring station
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Station *</Label>
                <Select value={stationId} onValueChange={setStationId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select station" />
                  </SelectTrigger>
                  <SelectContent>
                    {stations.map((station) => (
                      <SelectItem key={station.id} value={station.id}>
                        {station.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Type *</Label>
                <Select value={type} onValueChange={(value) => setType(value as SensorType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {sensorTypes.map((st) => (
                      <SelectItem key={st} value={st}>
                        <span className="capitalize">{st.replace("_", " ")}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Sensor name"
              />
            </div>
            <div className="space-y-2">
              <Label>Serial Number *</Label>
              <Input
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                placeholder="Unique serial number"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Sensor description"
                rows={3}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Location</Label>
                <Input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Sensor location"
                />
              </div>
              <div className="space-y-2">
                <Label>Calibration Date</Label>
                <Input
                  type="date"
                  value={calibrationDate}
                  onChange={(e) => setCalibrationDate(e.target.value)}
                />
              </div>
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
            <Button
              onClick={handleCreate}
              disabled={isProcessing || !stationId || !name.trim() || !serialNumber.trim()}
            >
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
            <DialogTitle>Edit Sensor</DialogTitle>
            <DialogDescription>
              Update sensor information. Type and serial number cannot be changed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Sensor name"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Sensor description"
                rows={3}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Location</Label>
                <Input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Sensor location"
                />
              </div>
              <div className="space-y-2">
                <Label>Calibration Date</Label>
                <Input
                  type="date"
                  value={calibrationDate}
                  onChange={(e) => setCalibrationDate(e.target.value)}
                />
              </div>
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
            <Button onClick={handleUpdate} disabled={isProcessing || !name.trim()}>
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

      {/* Status Dialog */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Sensor Status</DialogTitle>
            <DialogDescription>
              Current status information for {selectedSensor?.name}
            </DialogDescription>
          </DialogHeader>
          {isLoadingStatus ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : currentStatus ? (
            <div className="space-y-4 py-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <div className="mt-1">{getStatusBadge(currentStatus.status)}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Last Updated</Label>
                  <p className="text-sm mt-1">{formatDate(currentStatus.updatedAt)}</p>
                </div>
                {currentStatus.lastReadingAt && (
                  <div>
                    <Label className="text-muted-foreground">Last Reading</Label>
                    <p className="text-sm mt-1">{formatDate(currentStatus.lastReadingAt)}</p>
                  </div>
                )}
                {currentStatus.batteryLevel !== undefined && (
                  <div>
                    <Label className="text-muted-foreground">Battery Level</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Battery className="h-4 w-4" />
                      <span className="text-sm">{currentStatus.batteryLevel}%</span>
                    </div>
                  </div>
                )}
                {currentStatus.signalStrength !== undefined && (
                  <div>
                    <Label className="text-muted-foreground">Signal Strength</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Radio className="h-4 w-4" />
                      <span className="text-sm">{currentStatus.signalStrength}%</span>
                    </div>
                  </div>
                )}
              </div>
              {currentStatus.errorMessage && (
                <div>
                  <Label className="text-muted-foreground">Error Message</Label>
                  <div className="mt-1 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                      <p className="text-sm text-destructive">{currentStatus.errorMessage}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status History Dialog */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Status History</DialogTitle>
            <DialogDescription>
              Historical status information for {selectedSensor?.name}
            </DialogDescription>
          </DialogHeader>
          {isLoadingStatus ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : statusHistory.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No status history available.</p>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Reading</TableHead>
                      <TableHead>Battery</TableHead>
                      <TableHead>Signal</TableHead>
                      <TableHead>Updated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {statusHistory.map((status, index) => (
                      <TableRow key={index}>
                        <TableCell>{getStatusBadge(status.status)}</TableCell>
                        <TableCell className="text-sm">
                          {formatDate(status.lastReadingAt)}
                        </TableCell>
                        <TableCell>
                          {status.batteryLevel !== undefined ? (
                            <div className="flex items-center gap-2">
                              <Battery className="h-4 w-4" />
                              <span className="text-sm">{status.batteryLevel}%</span>
                            </div>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell>
                          {status.signalStrength !== undefined ? (
                            <div className="flex items-center gap-2">
                              <Radio className="h-4 w-4" />
                              <span className="text-sm">{status.signalStrength}%</span>
                            </div>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="text-sm">{formatDate(status.updatedAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setHistoryDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Sensor</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the sensor{" "}
              <strong>{selectedSensor?.name}</strong> ({selectedSensor?.serialNumber})?
              This action cannot be undone and will delete all associated readings.
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

