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
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar, Activity, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import type { MonitoringStation, StationAlert } from "@/api/types";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { apiService } from "@/api";
import { format } from "date-fns";

interface StationDialogProps {
  station: MonitoringStation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StationDialog({ station, open, onOpenChange }: StationDialogProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [alerts, setAlerts] = useState<StationAlert[]>([]);
  const [isLoadingAlerts, setIsLoadingAlerts] = useState(false);

  const isAdmin = user?.role === "ADMIN";
  const isOperator = user?.role === "OPERATOR" || isAdmin;
  const canViewDetails = isAdmin || isOperator;

  useEffect(() => {
    if (open && station) {
      loadAlerts();
    }
  }, [open, station]);

  const loadAlerts = async () => {
    if (!station) return;

    setIsLoadingAlerts(true);
    try {
      const activeAlerts = await apiService.getActiveAlerts({
        stationId: station.id,
        isActive: true,
        limit: 10,
      });
      setAlerts(activeAlerts);
    } catch (err) {
      console.error("Error loading alerts:", err);
      setAlerts([]);
    } finally {
      setIsLoadingAlerts(false);
    }
  };

  if (!station) return null;

  const handleViewDetails = () => {
    onOpenChange(false);
    router.push(`/stationDetails?id=${station.id}`);
  };

  const getSeverityBadge = (severity: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      critical: "destructive",
      high: "destructive",
      medium: "secondary",
      low: "outline",
    };

    return (
      <Badge variant={variants[severity.toLowerCase()] || "outline"} className="capitalize">
        {severity}
      </Badge>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold">{station.name}</DialogTitle>
            <Badge variant={station.isActive ? "default" : "destructive"}>
              {station.isActive ? t("stations.dialog.active") : t("stations.dialog.inactive")}
            </Badge>
          </div>
          <DialogDescription>
            {station.description || t("stations.dialog.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {station.address && (
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">{t("stations.dialog.address")}</p>
                <p className="text-sm text-muted-foreground">{station.address}</p>
              </div>
            </div>
          )}

          <div className="flex items-start gap-3">
            <Activity className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-medium">{t("stations.dialog.location")}</p>
              <p className="text-sm text-muted-foreground">
                {station.latitude.toFixed(6)}, {station.longitude.toFixed(6)}
              </p>
            </div>
          </div>

          {station.altitude && (
            <div className="flex items-start gap-3">
              <Activity className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">{t("stations.dialog.altitude")}</p>
                <p className="text-sm text-muted-foreground">{station.altitude} m</p>
              </div>
            </div>
          )}

          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-medium">{t("stations.dialog.created")}</p>
              <p className="text-sm text-muted-foreground">
                {format(new Date(station.createdAt), "PPp")}
              </p>
            </div>
          </div>

          {/* Alerts Section */}
          <div className="border-t pt-4 mt-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="h-5 w-5 text-muted-foreground" />
              <p className="text-sm font-medium">{t("stations.dialog.activeAlerts")}</p>
            </div>

            {isLoadingAlerts ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : !Array.isArray(alerts) || alerts.length === 0 ? (
              <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-md">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-green-900 dark:text-green-100">
                    {t("stations.dialog.allSystemsOperational")}
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                    {t("stations.dialog.allSystemsOperationalDescription")}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {Array.isArray(alerts) && alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="p-3 bg-destructive/10 border border-destructive/20 rounded-md"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-destructive" />
                        <span className="text-sm font-medium">{alert.sensorType}</span>
                      </div>
                      {getSeverityBadge(alert.severity)}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{alert.message}</p>
                    {alert.createdAt && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(alert.createdAt), "MMM dd, yyyy HH:mm")}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("stations.dialog.close")}
          </Button>
          {canViewDetails && (
            <Button onClick={handleViewDetails} className="bg-green-600 hover:bg-green-700">
              {t("stations.dialog.viewDetails")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

