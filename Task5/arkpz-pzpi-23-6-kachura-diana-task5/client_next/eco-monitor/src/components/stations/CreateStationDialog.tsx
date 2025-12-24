"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import type { CreateMonitoringStationRequest } from "@/api/types";
import { useLanguage } from "@/contexts/LanguageContext";
import { Loader2, CheckCircle2, MapPin } from "lucide-react";

interface CreateStationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  latitude: number;
  longitude: number;
  onStationCreated: () => void;
}

export function CreateStationDialog({
  open,
  onOpenChange,
  latitude,
  longitude,
  onStationCreated,
}: CreateStationDialogProps) {
  const { t } = useLanguage();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [formData, setFormData] = useState<CreateMonitoringStationRequest>({
    name: "",
    latitude,
    longitude,
    description: "",
    altitude: undefined,
    address: "",
  });

  // Update coordinates when dialog opens or coordinates change
  useEffect(() => {
    if (open) {
      setFormData((prev) => ({
        ...prev,
        latitude,
        longitude,
      }));
    }
  }, [open, latitude, longitude]);

  const handleChange = (name: keyof CreateMonitoringStationRequest, value: string | number | undefined) => {
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

    // Validation
    const newErrors: Record<string, string | null> = {};
    if (!formData.name.trim()) {
      newErrors.name = t("stations.createDialog.stationNameRequired");
    }
    if (formData.latitude === null || formData.latitude === undefined) {
      newErrors.latitude = t("stations.createDialog.latitudeRequired");
    }
    if (formData.longitude === null || formData.longitude === undefined) {
      newErrors.longitude = t("stations.createDialog.longitudeRequired");
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setIsSubmitting(false);
      return;
    }

    try {
      const createData: CreateMonitoringStationRequest = {
        name: formData.name.trim(),
        latitude: formData.latitude,
        longitude: formData.longitude,
        ...(formData.description?.trim() && { description: formData.description.trim() }),
        ...(formData.altitude !== undefined && formData.altitude !== null && { altitude: formData.altitude }),
        ...(formData.address?.trim() && { address: formData.address.trim() }),
      };

      await apiService.createMonitoringStation(createData);
      setIsSuccess(true);
      
      // Reset form
      setFormData({
        name: "",
        latitude,
        longitude,
        description: "",
        altitude: undefined,
        address: "",
      });

      // Close dialog after success
      setTimeout(() => {
        setIsSuccess(false);
        onOpenChange(false);
        onStationCreated();
      }, 1500);
    } catch (error) {
      let errorMessage = t("stations.createDialog.createFailed");
      
      if (error && typeof error === "object" && "response" in error) {
        const axiosError = error as {
          response?: { status?: number; data?: { message?: string } };
          message?: string;
        };
        
        if (axiosError.response?.status === 400) {
          errorMessage = axiosError.response.data?.message || t("stations.createDialog.invalidData");
        } else if (axiosError.response?.status === 401) {
          errorMessage = t("stations.createDialog.sessionExpired");
        } else if (axiosError.response?.status === 409) {
          errorMessage = t("stations.createDialog.stationExists");
        } else if (axiosError.response?.data?.message) {
          errorMessage = axiosError.response.data.message;
        } else if (axiosError.message) {
          errorMessage = axiosError.message;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      setErrors({ submit: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setFormData({
        name: "",
        latitude,
        longitude,
        description: "",
        altitude: undefined,
        address: "",
      });
      setErrors({});
      setIsSuccess(false);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            {t("stations.createDialog.title")}
          </DialogTitle>
          <DialogDescription>
            {t("stations.createDialog.description")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <FieldGroup>
            {errors.submit && (
              <div className="text-sm font-medium text-destructive bg-destructive/10 border border-destructive/20 rounded-md p-3">
                {errors.submit}
              </div>
            )}

            {isSuccess && (
              <div className="text-sm font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-md p-3 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                {t("stations.createDialog.createdSuccess")}
              </div>
            )}

            <Field>
              <FieldLabel htmlFor="name">{t("stations.createDialog.stationName")} *</FieldLabel>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                disabled={isSubmitting}
                required
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? "name-error" : undefined}
              />
              {errors.name && (
                <p id="name-error" className="text-sm font-medium text-destructive">
                  {errors.name}
                </p>
              )}
            </Field>

            <Field>
              <FieldLabel htmlFor="description">{t("stations.createDialog.description")}</FieldLabel>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleChange("description", e.target.value)}
                disabled={isSubmitting}
                rows={3}
                placeholder={t("stations.createDialog.descriptionPlaceholder")}
              />
            </Field>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Field>
                <FieldLabel htmlFor="latitude">{t("stations.createDialog.latitude")} *</FieldLabel>
                <Input
                  id="latitude"
                  type="number"
                  step="any"
                  value={formData.latitude}
                  onChange={(e) => handleChange("latitude", parseFloat(e.target.value))}
                  disabled={isSubmitting}
                  required
                  aria-invalid={!!errors.latitude}
                  aria-describedby={errors.latitude ? "latitude-error" : undefined}
                />
                {errors.latitude && (
                  <p id="latitude-error" className="text-sm font-medium text-destructive">
                    {errors.latitude}
                  </p>
                )}
                <FieldDescription>{t("stations.createDialog.autoFilled")}</FieldDescription>
              </Field>

              <Field>
                <FieldLabel htmlFor="longitude">{t("stations.createDialog.longitude")} *</FieldLabel>
                <Input
                  id="longitude"
                  type="number"
                  step="any"
                  value={formData.longitude}
                  onChange={(e) => handleChange("longitude", parseFloat(e.target.value))}
                  disabled={isSubmitting}
                  required
                  aria-invalid={!!errors.longitude}
                  aria-describedby={errors.longitude ? "longitude-error" : undefined}
                />
                {errors.longitude && (
                  <p id="longitude-error" className="text-sm font-medium text-destructive">
                    {errors.longitude}
                  </p>
                )}
                <FieldDescription>{t("stations.createDialog.autoFilled")}</FieldDescription>
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
                placeholder={t("stations.createDialog.altitudePlaceholder")}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="address">{t("stations.createDialog.address")}</FieldLabel>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => handleChange("address", e.target.value)}
                disabled={isSubmitting}
                placeholder={t("stations.createDialog.addressPlaceholder")}
              />
            </Field>
          </FieldGroup>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              {t("stations.createDialog.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || isSuccess}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {t("stations.createDialog.creating")}
                </>
              ) : isSuccess ? (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  {t("stations.createDialog.created")}
                </>
              ) : (
                t("stations.createDialog.create")
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

