"use client";

import { useState, useEffect, useCallback } from "react";
import { useLayoutEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiService } from "@/api";
import type { Sensor, SensorStatusInfo, SensorReading } from "@/api/types";
import { Loader2, ArrowLeft, Activity, Calendar, Battery, Signal, AlertCircle, Power, PowerOff, Settings, Trash2, Edit, Save, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { format, subDays } from "date-fns";
import { Input } from "@/components/ui/input";
import {
  FieldGroup,
  Field,
  FieldLabel,
} from "@/components/ui/field";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { UpdateSensorRequest } from "@/api/types";

// Функция для логирования
const logApiCall = (method: string, params: any, response: any, error?: any) => {
  const timestamp = new Date().toISOString();
  console.group(`🔄 API Call - ${method} - ${timestamp}`);
  console.log('📤 Parameters:', JSON.stringify(params, null, 2));

  if (error) {
    console.error('❌ Error:', error);
    if (error.response) {
      console.error('📉 Response Status:', error.response.status);
      console.error('📄 Response Data:', error.response.data);
      console.error('🔧 Response Headers:', error.response.headers);
    } else if (error.request) {
      console.error('🚫 No Response Received:', error.request);
    } else {
      console.error('⚠️ Request Error:', error.message);
    }
  } else {
    console.log('✅ Success Response:', JSON.stringify(response, null, 2));
    console.log('📊 Response Type:', typeof response);
    console.log('🔢 Response Length:', Array.isArray(response) ? response.length : 'N/A');
    if (Array.isArray(response) && response.length > 0) {
      console.log('📋 First Item Sample:', response[0]);
    }
  }
  console.groupEnd();
};

export default function SensorDetailsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const sensorId = searchParams.get("id");

  const [sensor, setSensor] = useState<Sensor | null>(null);
  const [status, setStatus] = useState<SensorStatusInfo | null>(null);
  const [statusHistory, setStatusHistory] = useState<SensorStatusInfo[]>([]);
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("status");
  const [isToggling, setIsToggling] = useState(false);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: "",
    description: "",
    location: "",
  });

  useLayoutEffect(() => {
    document.body.classList.remove("landing-theme");
    document.body.style.display = "block";
    document.body.style.flexDirection = "";
  }, []);

  const loadSensorData = useCallback(async () => {
    if (!sensorId) {
      setError("Sensor ID is required");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('🚀 Starting to load sensor data for ID:', sensorId);

      // 1. Запрос информации о сенсоре
      console.log('📡 Making getSensorById request...');
      const sensorData = await apiService.getSensorById(sensorId);
      logApiCall('getSensorById', { sensorId }, sensorData);
      setSensor(sensorData);

      // 2. Запрос статуса сенсора
      console.log('📡 Making getSensorStatus request...');
      const statusData = await apiService.getSensorStatus(sensorId);
      logApiCall('getSensorStatus', { sensorId }, statusData);
      setStatus(statusData);

      // 3. Запрос истории статусов
      console.log('📡 Making getSensorStatusHistory request...');
      const historyData = await apiService.getSensorStatusHistory(sensorId);
      logApiCall('getSensorStatusHistory', { sensorId }, historyData);
      setStatusHistory(historyData);

      // Устанавливаем данные формы
      setEditFormData({
        name: sensorData.name,
        description: sensorData.description || "",
        location: sensorData.location || "",
      });

      // 4. Запрос показаний за последние 7 дней
      console.log('📡 Making getReadings request...');
      const endTime = new Date();
      const startTime = subDays(endTime, 7);

      const startTimeISO = startTime instanceof Date && !isNaN(startTime.getTime())
          ? startTime.toISOString()
          : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const endTimeISO = endTime instanceof Date && !isNaN(endTime.getTime())
          ? endTime.toISOString()
          : new Date().toISOString();

      const readingsParams = {
        sensorSerialNumber: sensorData.serialNumber,
        startTime: startTimeISO,
        endTime: endTimeISO,
      };

      console.log('📊 Readings request parameters:', readingsParams);
      const readingsData = await apiService.getReadings(readingsParams);
      logApiCall('getReadings', readingsParams, readingsData);
      setReadings(readingsData);

      console.log('✅ All data loaded successfully');
      console.log('📋 Summary:', {
        sensor: sensorData ? 'Loaded' : 'Missing',
        status: statusData ? 'Loaded' : 'Missing',
        statusHistory: Array.isArray(historyData) ? `Loaded ${historyData.length} items` : 'Missing',
        readings: Array.isArray(readingsData) ? `Loaded ${readingsData.length} items` : 'Missing',
      });

    } catch (err) {
      let errorMessage = "Failed to load sensor details. Please try again.";

      logApiCall('loadSensorData', { sensorId }, null, err);

      if (err && typeof err === "object" && "response" in err) {
        const axiosError = err as {
          response?: { status?: number; data?: { message?: string } };
          message?: string;
        };

        if (axiosError.response?.status === 401) {
          errorMessage = "Your session has expired. Please log in again.";
        } else if (axiosError.response?.status === 404) {
          errorMessage = "Sensor not found.";
        } else if (axiosError.response?.data?.message) {
          errorMessage = axiosError.response.data.message;
        } else if (axiosError.message) {
          errorMessage = axiosError.message;
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }

      setError(errorMessage);
      console.error('💥 Error loading sensor data:', errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [sensorId]);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) return;

    loadSensorData();
  }, [sensorId, isAuthenticated, authLoading, loadSensorData]);

  const handleToggleActive = useCallback(async () => {
    if (!sensorId || !sensor) return;

    setIsToggling(true);
    try {
      console.log(`🔄 Toggling sensor ${sensorId} from status: ${sensor.status}`);

      if (sensor.status === "active") {
        console.log('📡 Making deactivateSensor request...');
        const response = await apiService.deactivateSensor(sensorId);
        logApiCall('deactivateSensor', { sensorId }, response);
      } else {
        console.log('📡 Making activateSensor request...');
        const response = await apiService.activateSensor(sensorId);
        logApiCall('activateSensor', { sensorId }, response);
      }

      await loadSensorData();
    } catch (error) {
      console.error("Failed to toggle sensor:", error);
      logApiCall('toggleSensor', { sensorId, currentStatus: sensor?.status }, null, error);
    } finally {
      setIsToggling(false);
    }
  }, [sensorId, sensor, loadSensorData]);

  const handleCalibrate = useCallback(async () => {
    if (!sensorId) return;

    setIsCalibrating(true);
    try {
      console.log(`🔧 Calibrating sensor ${sensorId}`);
      const response = await apiService.calibrateSensor(sensorId);
      logApiCall('calibrateSensor', { sensorId }, response);
      await loadSensorData();
    } catch (error) {
      console.error("Failed to calibrate sensor:", error);
      logApiCall('calibrateSensor', { sensorId }, null, error);
    } finally {
      setIsCalibrating(false);
    }
  }, [sensorId, loadSensorData]);

  const handleUpdate = useCallback(async () => {
    if (!sensorId || !sensor) return;

    setIsSubmitting(true);
    try {
      const updateData: UpdateSensorRequest = {};
      if (editFormData.name !== sensor.name) updateData.name = editFormData.name;
      if (editFormData.description !== (sensor.description || "")) updateData.description = editFormData.description;
      if (editFormData.location !== (sensor.location || "")) updateData.location = editFormData.location;

      if (Object.keys(updateData).length > 0) {
        console.log('📡 Making updateSensor request...', { sensorId, updateData });
        const response = await apiService.updateSensor(sensorId, updateData);
        logApiCall('updateSensor', { sensorId, updateData }, response);
        await loadSensorData();
        setIsEditing(false);
      } else {
        console.log('ℹ️ No changes to update');
      }
    } catch (error) {
      console.error("Failed to update sensor:", error);
      logApiCall('updateSensor', { sensorId, updateData }, null, error);
    } finally {
      setIsSubmitting(false);
    }
  }, [sensorId, sensor, editFormData, loadSensorData]);

  const handleDelete = useCallback(async () => {
    if (!sensorId || !sensor) return;

    setIsDeleting(true);
    try {
      console.log(`🗑️ Deleting sensor ${sensorId}`);
      const response = await apiService.deleteSensor(sensorId);
      logApiCall('deleteSensor', { sensorId }, response);
      router.push(`/stationDetails?id=${sensor.stationId}`);
    } catch (error) {
      console.error("Failed to delete sensor:", error);
      logApiCall('deleteSensor', { sensorId }, null, error);
      setIsDeleting(false);
    }
  }, [sensorId, sensor, router]);

  // Добавим дополнительный лог при рендере для отладки
  useEffect(() => {
    console.log('🔄 Component render state:', {
      sensorId,
      isLoading,
      error,
      sensor: sensor ? `Loaded: ${sensor.name}` : 'Not loaded',
      status: status ? 'Loaded' : 'Not loaded',
      statusHistory: statusHistory.length,
      readings: readings.length,
      isAuthenticated,
      authLoading
    });
  }, [sensor, status, statusHistory, readings, isLoading, error, sensorId, isAuthenticated, authLoading]);

  if (authLoading || isLoading) {
    console.log('⏳ Loading state:', { authLoading, isLoading });
    return (
        <div className="flex min-h-svh w-full items-center justify-center bg-background">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading sensor details...</p>
          </div>
        </div>
    );
  }

  if (error || !sensor) {
    console.log('❌ Error state:', { error, sensor: sensor ? 'Present' : 'Missing' });
    return (
        <div className="flex min-h-svh w-full items-center justify-center bg-background p-4">
          <div className="text-center max-w-md">
            <p className="text-sm font-medium text-destructive mb-4">
              {error || "Sensor not found"}
            </p>
            <Button onClick={() => router.back()} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </div>
        </div>
    );
  }

  console.log('🎨 Rendering component with data:', {
    sensorName: sensor.name,
    statusAvailable: !!status,
    readingsCount: readings.length,
    statusHistoryCount: statusHistory.length
  });

  return (
      <div className="flex min-h-svh w-full flex-col bg-background p-4 sm:p-6 md:p-10">
        <div className="mb-6">
          <Button
              onClick={() => router.back()}
              variant="ghost"
              className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">{sensor.name}</h1>
              <p className="text-muted-foreground mt-2">
                {sensor.type} • Serial: {sensor.serialNumber}
              </p>
            </div>
            <Badge variant={sensor.status === "active" ? "default" : "secondary"}>
              {sensor.status}
            </Badge>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList>
            <TabsTrigger value="status">Status</TabsTrigger>
            <TabsTrigger value="history">Reading History</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="status" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Sensor Information</CardTitle>
                    <div className="flex gap-2">
                      <Button
                          size="sm"
                          variant="outline"
                          onClick={handleToggleActive}
                          disabled={isToggling}
                      >
                        {isToggling ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                        ) : sensor.status === "active" ? (
                            <>
                              <PowerOff className="h-3 w-3 mr-1" />
                              Deactivate
                            </>
                        ) : (
                            <>
                              <Power className="h-3 w-3 mr-1" />
                              Activate
                            </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-medium">Type</p>
                    <p className="text-sm text-muted-foreground capitalize">{sensor.type.replace("_", " ")}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Serial Number</p>
                    <p className="text-sm text-muted-foreground">{sensor.serialNumber}</p>
                  </div>
                  {sensor.description && (
                      <div>
                        <p className="text-sm font-medium">Description</p>
                        <p className="text-sm text-muted-foreground">{sensor.description}</p>
                      </div>
                  )}
                  {sensor.location && (
                      <div>
                        <p className="text-sm font-medium">Location</p>
                        <p className="text-sm text-muted-foreground">{sensor.location}</p>
                      </div>
                  )}
                  {sensor.calibrationDate && (
                      <div>
                        <p className="text-sm font-medium">Last Calibration</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(sensor.calibrationDate), "PPp")}
                        </p>
                      </div>
                  )}
                </CardContent>
              </Card>

              {status && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Current Status</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-3">
                        <Activity className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Status</p>
                          <Badge variant={status.status === "active" ? "default" : "secondary"}>
                            {status.status}
                          </Badge>
                        </div>
                      </div>
                      {status.batteryLevel !== undefined && (
                          <div className="flex items-center gap-3">
                            <Battery className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">Battery Level</p>
                              <p className="text-sm text-muted-foreground">{status.batteryLevel}%</p>
                            </div>
                          </div>
                      )}
                      {status.signalStrength !== undefined && (
                          <div className="flex items-center gap-3">
                            <Signal className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">Signal Strength</p>
                              <p className="text-sm text-muted-foreground">{status.signalStrength}%</p>
                            </div>
                          </div>
                      )}
                      {status.lastReadingAt && (
                          <div className="flex items-center gap-3">
                            <Calendar className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">Last Reading</p>
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(status.lastReadingAt), "PPp")}
                              </p>
                            </div>
                          </div>
                      )}
                      {status.errorMessage && (
                          <div className="flex items-start gap-3 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                            <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                            <div>
                              <p className="text-sm font-medium text-destructive">Error</p>
                              <p className="text-sm text-destructive">{status.errorMessage}</p>
                            </div>
                          </div>
                      )}
                    </CardContent>
                  </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Reading History</CardTitle>
                  <CardDescription>Last 7 days of sensor readings</CardDescription>
                </CardHeader>
                <CardContent>
                  {readings.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No readings available for this period
                      </p>
                  ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                          <tr className="border-b">
                            <th className="text-left p-2 text-sm font-medium">Timestamp</th>
                            <th className="text-left p-2 text-sm font-medium">Value</th>
                            <th className="text-left p-2 text-sm font-medium">Unit</th>
                            <th className="text-left p-2 text-sm font-medium">Quality</th>
                          </tr>
                          </thead>
                          <tbody>
                          {readings.map((reading) => (
                              <tr key={reading.id} className="border-b">
                                <td className="p-2 text-sm">
                                  {format(new Date(reading.timestamp), "PPp")}
                                </td>
                                <td className="p-2 text-sm font-medium">{reading.value.toFixed(2)}</td>
                                <td className="p-2 text-sm text-muted-foreground">{reading.unit || "N/A"}</td>
                                <td className="p-2">
                                  {reading.quality && (
                                      <Badge
                                          variant={
                                            reading.quality === "good"
                                                ? "default"
                                                : reading.quality === "fair"
                                                    ? "secondary"
                                                    : "destructive"
                                          }
                                      >
                                        {reading.quality}
                                      </Badge>
                                  )}
                                </td>
                              </tr>
                          ))}
                          </tbody>
                        </table>
                      </div>
                  )}
                </CardContent>
              </Card>

              {statusHistory.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Status History</CardTitle>
                      <CardDescription>Historical status changes</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                          <tr className="border-b">
                            <th className="text-left p-2 text-sm font-medium">Date</th>
                            <th className="text-left p-2 text-sm font-medium">Status</th>
                            <th className="text-left p-2 text-sm font-medium">Battery</th>
                            <th className="text-left p-2 text-sm font-medium">Signal</th>
                          </tr>
                          </thead>
                          <tbody>
                          {statusHistory.map((statusItem, index) => (
                              <tr key={index} className="border-b">
                                <td className="p-2 text-sm">
                                  {statusItem.lastReadingAt ? format(new Date(statusItem.lastReadingAt), "PPp") : "N/A"}
                                </td>
                                <td className="p-2">
                                  <Badge variant={statusItem.status === "active" ? "default" : "secondary"}>
                                    {statusItem.status}
                                  </Badge>
                                </td>
                                <td className="p-2 text-sm text-muted-foreground">
                                  {statusItem.batteryLevel !== undefined ? `${statusItem.batteryLevel}%` : "N/A"}
                                </td>
                                <td className="p-2 text-sm text-muted-foreground">
                                  {statusItem.signalStrength !== undefined ? `${statusItem.signalStrength}%` : "N/A"}
                                </td>
                              </tr>
                          ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="settings" className="mt-6">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Edit Sensor Information</CardTitle>
                  <CardDescription>Update sensor details</CardDescription>
                </CardHeader>
                <CardContent>
                  {isEditing ? (
                      <form onSubmit={(e) => { e.preventDefault(); handleUpdate(); }}>
                        <FieldGroup>
                          <Field>
                            <FieldLabel htmlFor="name">Sensor Name</FieldLabel>
                            <Input
                                id="name"
                                value={editFormData.name}
                                onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                                disabled={isSubmitting}
                                required
                            />
                          </Field>
                          <Field>
                            <FieldLabel htmlFor="description">Description</FieldLabel>
                            <Input
                                id="description"
                                value={editFormData.description}
                                onChange={(e) => setEditFormData(prev => ({ ...prev, description: e.target.value }))}
                                disabled={isSubmitting}
                            />
                          </Field>
                          <Field>
                            <FieldLabel htmlFor="location">Location</FieldLabel>
                            <Input
                                id="location"
                                value={editFormData.location}
                                onChange={(e) => setEditFormData(prev => ({ ...prev, location: e.target.value }))}
                                disabled={isSubmitting}
                            />
                          </Field>
                          <div className="flex gap-2 mt-4">
                            <Button
                                type="submit"
                                disabled={isSubmitting}
                            >
                              {isSubmitting ? (
                                  <>
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    Saving...
                                  </>
                              ) : (
                                  <>
                                    <Save className="h-4 w-4 mr-2" />
                                    Save Changes
                                  </>
                              )}
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                  setIsEditing(false);
                                  setEditFormData({
                                    name: sensor.name,
                                    description: sensor.description || "",
                                    location: sensor.location || "",
                                  });
                                }}
                                disabled={isSubmitting}
                            >
                              <X className="h-4 w-4 mr-2" />
                              Cancel
                            </Button>
                          </div>
                        </FieldGroup>
                      </form>
                  ) : (
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm font-medium">Name</p>
                          <p className="text-sm text-muted-foreground">{sensor.name}</p>
                        </div>
                        {sensor.description && (
                            <div>
                              <p className="text-sm font-medium">Description</p>
                              <p className="text-sm text-muted-foreground">{sensor.description}</p>
                            </div>
                        )}
                        {sensor.location && (
                            <div>
                              <p className="text-sm font-medium">Location</p>
                              <p className="text-sm text-muted-foreground">{sensor.location}</p>
                            </div>
                        )}
                        <Button
                            onClick={() => setIsEditing(true)}
                            variant="outline"
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Information
                        </Button>
                      </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Sensor Actions</CardTitle>
                  <CardDescription>Manage sensor operations</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Button
                        onClick={handleCalibrate}
                        disabled={isCalibrating}
                        variant="outline"
                    >
                      {isCalibrating ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Calibrating...
                          </>
                      ) : (
                          <>
                            <Settings className="h-4 w-4 mr-2" />
                            Calibrate Sensor
                          </>
                      )}
                    </Button>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                            variant="destructive"
                            disabled={isDeleting}
                        >
                          {isDeleting ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                              <>
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Sensor
                              </>
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the sensor
                            "{sensor.name}" and all its readings and status history.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                              onClick={handleDelete}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
  );
}
