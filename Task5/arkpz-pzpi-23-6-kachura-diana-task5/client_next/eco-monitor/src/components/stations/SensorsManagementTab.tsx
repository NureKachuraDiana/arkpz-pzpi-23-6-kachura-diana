"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FieldGroup,
  Field,
  FieldLabel,
  FieldDescription,
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
import { apiService } from "@/api";
import type { Sensor, CreateSensorRequest, SensorType } from "@/api/types";
import { useLanguage } from "@/contexts/LanguageContext";
import { Loader2, Plus, Power, PowerOff, Trash2, Settings } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";

interface SensorsManagementTabProps {
  stationId: string;
  onSensorUpdate: () => void;
}

// Map frontend lowercase types to backend UPPERCASE types
const getSensorTypes = (t: (key: string) => string): { value: SensorType; label: string; backendValue: string }[] => [
  { value: "temperature", label: t("stations.sensorsTab.types.temperature"), backendValue: "TEMPERATURE" },
  { value: "humidity", label: t("stations.sensorsTab.types.humidity"), backendValue: "HUMIDITY" },
  { value: "pressure", label: t("stations.sensorsTab.types.pressure"), backendValue: "PRESSURE" },
  { value: "air_quality", label: t("stations.sensorsTab.types.air_quality"), backendValue: "AIR_QUALITY" },
  { value: "co2", label: t("stations.sensorsTab.types.co2"), backendValue: "CO2" },
  { value: "noise", label: t("stations.sensorsTab.types.noise"), backendValue: "NOISE" },
  // Note: PM2_5, PM10, WATER_QUALITY are available in backend but not in frontend types yet
];

export function SensorsManagementTab({ stationId, onSensorUpdate }: SensorsManagementTabProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isToggling, setIsToggling] = useState<Record<string, boolean>>({});
  const [isDeleting, setIsDeleting] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [formData, setFormData] = useState<CreateSensorRequest>({
    stationId,
    type: "temperature",
    name: "",
    serialNumber: "",
    description: "",
    location: "",
  });

  const loadSensors = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiService.getSensorsInStation(stationId);
      setSensors(data);
    } catch (error) {
      let errorMessage = t("stations.sensorsTab.loadFailed");
      
      if (error && typeof error === "object" && "response" in error) {
        const axiosError = error as {
          response?: { status?: number; data?: { message?: string } };
          message?: string;
        };
        
        if (axiosError.response?.data?.message) {
          errorMessage = axiosError.response.data.message;
        }
      }
      
      setErrors({ load: errorMessage });
    } finally {
      setIsLoading(false);
    }
  }, [stationId, t]);

  useEffect(() => {
    loadSensors();
  }, [loadSensors]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    try {
      await apiService.createSensor(formData);
      setIsDialogOpen(false);
      setFormData({
        stationId,
        type: "temperature",
        name: "",
        serialNumber: "",
        description: "",
        location: "",
      });
      await loadSensors();
      onSensorUpdate();
    } catch (error) {
      let errorMessage = t("stations.sensorsTab.createFailed");
      
      if (error && typeof error === "object" && "response" in error) {
        const axiosError = error as {
          response?: { status?: number; data?: { message?: string } };
          message?: string;
        };
        
        if (axiosError.response?.data?.message) {
          errorMessage = axiosError.response.data.message;
        }
      }
      
      setErrors({ submit: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = useCallback(async (sensorId: string, isActive: boolean) => {
    setIsToggling((prev) => ({ ...prev, [sensorId]: true }));
    try {
      if (isActive) {
        await apiService.deactivateSensor(sensorId);
      } else {
        await apiService.activateSensor(sensorId);
      }
      await loadSensors();
      onSensorUpdate();
    } catch (error) {
      console.error("Failed to toggle sensor:", error);
    } finally {
      setIsToggling((prev) => ({ ...prev, [sensorId]: false }));
    }
  }, [loadSensors, onSensorUpdate]);

  const handleDelete = useCallback(async (sensorId: string) => {
    setIsDeleting((prev) => ({ ...prev, [sensorId]: true }));
    try {
      await apiService.deleteSensor(sensorId);
      await loadSensors();
      onSensorUpdate();
    } catch (error) {
      console.error("Failed to delete sensor:", error);
    } finally {
      setIsDeleting((prev) => ({ ...prev, [sensorId]: false }));
    }
  }, [loadSensors, onSensorUpdate]);

  const handleViewDetails = useCallback((sensorId: string) => {
    router.push(`/sensorDetails?id=${sensorId}`);
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {errors.load && (
        <div className="text-sm font-medium text-destructive bg-destructive/10 border border-destructive/20 rounded-md p-3">
          {errors.load}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{t("stations.sensorsTab.title")}</h2>
          <p className="text-muted-foreground">{t("stations.sensorsTab.description")}</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-green-600 hover:bg-green-700">
              <Plus className="h-4 w-4 mr-2" />
              {t("stations.sensorsTab.addSensor")}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{t("stations.sensorsTab.addNewSensor")}</DialogTitle>
              <DialogDescription>
                {t("stations.sensorsTab.registerDescription")}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <FieldGroup>
                {errors.submit && (
                  <div className="text-sm font-medium text-destructive bg-destructive/10 border border-destructive/20 rounded-md p-3">
                    {errors.submit}
                  </div>
                )}

                <Field>
                  <FieldLabel htmlFor="type">{t("stations.sensorsTab.sensorType")}</FieldLabel>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, type: value as SensorType }))}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger id="type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {getSensorTypes(t).map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field>
                  <FieldLabel htmlFor="name">{t("stations.sensorsTab.sensorName")}</FieldLabel>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    disabled={isSubmitting}
                    required
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="serialNumber">{t("stations.sensorsTab.serialNumber")}</FieldLabel>
                  <Input
                    id="serialNumber"
                    value={formData.serialNumber}
                    onChange={(e) => setFormData((prev) => ({ ...prev, serialNumber: e.target.value }))}
                    disabled={isSubmitting}
                    required
                  />
                  <FieldDescription>{t("stations.sensorsTab.serialNumberDescription")}</FieldDescription>
                </Field>

                <Field>
                  <FieldLabel htmlFor="description">{t("stations.sensorsTab.description")}</FieldLabel>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                    disabled={isSubmitting}
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="location">{t("stations.sensorsTab.location")}</FieldLabel>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
                    disabled={isSubmitting}
                  />
                  <FieldDescription>{t("stations.sensorsTab.locationDescription")}</FieldDescription>
                </Field>
              </FieldGroup>

              <DialogFooter className="mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  disabled={isSubmitting}
                >
                  {t("stations.sensorsTab.cancel")}
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      {t("stations.sensorsTab.creating")}
                    </>
                  ) : (
                    t("stations.sensorsTab.create")
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {sensors.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">{t("stations.sensorsTab.noSensors")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sensors.map((sensor) => (
            <Card key={sensor.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{sensor.name}</CardTitle>
                  <Badge variant={sensor.status === "active" ? "default" : "secondary"}>
                    {sensor.status}
                  </Badge>
                </div>
                <CardDescription>{sensor.type}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 mb-4">
                  <p className="text-sm">
                    <span className="font-medium">{t("stations.sensorsTab.serial")}</span> {sensor.serialNumber}
                  </p>
                  {sensor.description && (
                    <p className="text-sm text-muted-foreground">{sensor.description}</p>
                  )}
                  {sensor.location && (
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">{t("stations.sensorsTab.location")}:</span> {sensor.location}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleToggleActive(sensor.id, sensor.status === "active")}
                    disabled={isToggling[sensor.id]}
                  >
                    {isToggling[sensor.id] ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : sensor.status === "active" ? (
                      <>
                        <PowerOff className="h-3 w-3 mr-1" />
                        {t("stations.sensorsTab.deactivate")}
                      </>
                    ) : (
                      <>
                        <Power className="h-3 w-3 mr-1" />
                        {t("stations.sensorsTab.activate")}
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleViewDetails(sensor.id)}
                  >
                    <Settings className="h-3 w-3 mr-1" />
                    {t("stations.sensorsTab.details")}
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={isDeleting[sensor.id]}
                      >
                        {isDeleting[sensor.id] ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <>
                            <Trash2 className="h-3 w-3 mr-1" />
                            {t("stations.sensorsTab.delete")}
                          </>
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t("stations.sensorsTab.deleteConfirmTitle")}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {t("stations.sensorsTab.deleteConfirmDescription").replace("{name}", sensor.name)}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t("stations.sensorsTab.deleteConfirmCancel")}</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(sensor.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {t("stations.sensorsTab.deleteConfirmDelete")}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

