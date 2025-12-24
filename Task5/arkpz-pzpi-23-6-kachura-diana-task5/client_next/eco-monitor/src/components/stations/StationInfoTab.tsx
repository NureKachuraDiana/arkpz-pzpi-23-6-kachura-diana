"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  FieldGroup,
  Field,
  FieldLabel,
  FieldDescription,
} from "@/components/ui/field";
import { apiService } from "@/api";
import type { MonitoringStation, UpdateMonitoringStationRequest } from "@/api/types";
import { useLanguage } from "@/contexts/LanguageContext";
import { Loader2, CheckCircle2, MapPin, Calendar, Activity, Power } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface StationInfoTabProps {
  station: MonitoringStation;
  onStationUpdate: () => void;
}

export function StationInfoTab({ station, onStationUpdate }: StationInfoTabProps) {
  const { t } = useLanguage();
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [formData, setFormData] = useState<UpdateMonitoringStationRequest>({
    name: station.name,
    description: station.description || "",
    latitude: station.latitude,
    longitude: station.longitude,
    altitude: station.altitude,
    address: station.address || "",
  });

  const handleChange = (name: keyof UpdateMonitoringStationRequest, value: string | number | undefined) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});
    setIsSuccess(false);

    try {
      const updateData: UpdateMonitoringStationRequest = {};
      
      if (formData.name !== station.name) updateData.name = formData.name;
      if (formData.description !== (station.description || "")) updateData.description = formData.description;
      if (formData.latitude !== station.latitude) updateData.latitude = formData.latitude;
      if (formData.longitude !== station.longitude) updateData.longitude = formData.longitude;
      if (formData.altitude !== station.altitude) updateData.altitude = formData.altitude;
      if (formData.address !== (station.address || "")) updateData.address = formData.address;

      if (Object.keys(updateData).length === 0) {
        setIsEditing(false);
        setIsSubmitting(false);
        return;
      }

      await apiService.updateMonitoringStation(station.id, updateData);
      setIsSuccess(true);
      setIsEditing(false);
      onStationUpdate();
      
      setTimeout(() => setIsSuccess(false), 3000);
    } catch (error) {
      let errorMessage = t("stations.infoTab.updateFailed");
      
      if (error && typeof error === "object" && "response" in error) {
        const axiosError = error as {
          response?: { status?: number; data?: { message?: string } };
          message?: string;
        };
        
        if (axiosError.response?.data?.message) {
          errorMessage = axiosError.response.data.message;
        } else if (axiosError.message) {
          errorMessage = axiosError.message;
        }
      }
      
      setErrors({ submit: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async () => {
    setIsToggling(true);
    try {
      if (station.isActive) {
        await apiService.deactivateMonitoringStation(station.id);
      } else {
        await apiService.activateMonitoringStation(station.id);
      }
      onStationUpdate();
    } catch (error) {
      let errorMessage = t("stations.infoTab.toggleFailed");
      
      if (error && typeof error === "object" && "response" in error) {
        const axiosError = error as {
          response?: { status?: number; data?: { message?: string } };
          message?: string;
        };
        
        if (axiosError.response?.data?.message) {
          errorMessage = axiosError.response.data.message;
        }
      }
      
      setErrors({ toggle: errorMessage });
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <div className="space-y-6">
      {isSuccess && (
        <div className="text-sm font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-md p-3 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          {t("stations.infoTab.updatedSuccess")}
        </div>
      )}

      {errors.submit && (
        <div className="text-sm font-medium text-destructive bg-destructive/10 border border-destructive/20 rounded-md p-3">
          {errors.submit}
        </div>
      )}

      {errors.toggle && (
        <div className="text-sm font-medium text-destructive bg-destructive/10 border border-destructive/20 rounded-md p-3">
          {errors.toggle}
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t("stations.infoTab.title")}</CardTitle>
              <CardDescription>{t("stations.infoTab.description")}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={station.isActive ? "default" : "destructive"}>
                {station.isActive ? t("stations.dialog.active") : t("stations.dialog.inactive")}
              </Badge>
              {!isEditing && (
                <Button onClick={() => setIsEditing(true)} variant="outline">
                  {t("stations.infoTab.edit")}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="name">{t("stations.createDialog.stationName")}</FieldLabel>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    disabled={isSubmitting}
                    required
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="description">{t("stations.createDialog.description")}</FieldLabel>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleChange("description", e.target.value)}
                    disabled={isSubmitting}
                    rows={3}
                  />
                </Field>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Field>
                    <FieldLabel htmlFor="latitude">{t("stations.createDialog.latitude")}</FieldLabel>
                    <Input
                      id="latitude"
                      type="number"
                      step="any"
                      value={formData.latitude}
                      onChange={(e) => handleChange("latitude", parseFloat(e.target.value))}
                      disabled={isSubmitting}
                      required
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="longitude">{t("stations.createDialog.longitude")}</FieldLabel>
                    <Input
                      id="longitude"
                      type="number"
                      step="any"
                      value={formData.longitude}
                      onChange={(e) => handleChange("longitude", parseFloat(e.target.value))}
                      disabled={isSubmitting}
                      required
                    />
                  </Field>
                </div>

                <Field>
                  <FieldLabel htmlFor="altitude">{t("stations.createDialog.altitude")}</FieldLabel>
                  <Input
                    id="altitude"
                    type="number"
                    step="any"
                    value={formData.altitude || ""}
                    onChange={(e) => handleChange("altitude", e.target.value ? parseFloat(e.target.value) : undefined)}
                    disabled={isSubmitting}
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="address">{t("stations.createDialog.address")}</FieldLabel>
                  <Input
                    id="address"
                    value={formData.address || ""}
                    onChange={(e) => handleChange("address", e.target.value)}
                    disabled={isSubmitting}
                  />
                </Field>

                <div className="flex gap-2">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        {t("stations.infoTab.saving")}
                      </>
                    ) : (
                      t("stations.infoTab.saveChanges")
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsEditing(false);
                      setFormData({
                        name: station.name,
                        description: station.description || "",
                        latitude: station.latitude,
                        longitude: station.longitude,
                        altitude: station.altitude,
                        address: station.address || "",
                      });
                      setErrors({});
                    }}
                    disabled={isSubmitting}
                  >
                    {t("stations.infoTab.cancel")}
                  </Button>
                </div>
              </FieldGroup>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">{t("stations.infoTab.location")}</p>
                  <p className="text-sm text-muted-foreground">
                    {station.latitude.toFixed(6)}, {station.longitude.toFixed(6)}
                  </p>
                </div>
              </div>

              {station.altitude && (
                <div className="flex items-start gap-3">
                  <Activity className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">{t("stations.infoTab.altitude")}</p>
                    <p className="text-sm text-muted-foreground">{station.altitude} m</p>
                  </div>
                </div>
              )}

              {station.address && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">{t("stations.infoTab.address")}</p>
                    <p className="text-sm text-muted-foreground">{station.address}</p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">{t("stations.infoTab.created")}</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(station.createdAt), "PPp")}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Power className="h-5 w-5" />
            {t("stations.infoTab.statusTitle")}
          </CardTitle>
          <CardDescription>{t("stations.infoTab.statusDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{t("stations.infoTab.currentStatus")}</p>
              <p className="text-sm text-muted-foreground">
                {station.isActive ? t("stations.infoTab.currentlyActive") : t("stations.infoTab.currentlyInactive")}
              </p>
            </div>
            <Button
              onClick={handleToggleActive}
              disabled={isToggling}
              variant={station.isActive ? "destructive" : "default"}
            >
              {isToggling ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {t("stations.infoTab.processing")}
                </>
              ) : station.isActive ? (
                t("stations.infoTab.deactivate")
              ) : (
                t("stations.infoTab.activate")
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

