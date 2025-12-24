"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Activity, TrendingUp, AlertTriangle, CheckCircle } from "lucide-react";
import { apiService } from "@/api";
import type { StationStats, StationHealth } from "@/api/types";
import { useLanguage } from "@/contexts/LanguageContext";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface StationStatisticsTabProps {
  stationId: string;
}

export function StationStatisticsTab({ stationId }: StationStatisticsTabProps) {
  const { t } = useLanguage();
  const [stats, setStats] = useState<StationStats | null>(null);
  const [health, setHealth] = useState<StationHealth | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStatistics = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [statsData, healthData] = await Promise.all([
        apiService.getStationStats(stationId),
        apiService.getStationHealth(stationId),
      ]);
      setStats(statsData);
      setHealth(healthData);
    } catch (err) {
      let errorMessage = t("stations.statisticsTab.loadFailed");
      
      if (err && typeof err === "object" && "response" in err) {
        const axiosError = err as {
          response?: { status?: number; data?: { message?: string } };
          message?: string;
        };
        
        if (axiosError.response?.data?.message) {
          errorMessage = axiosError.response.data.message;
        }
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [stationId, t]);

  useEffect(() => {
    loadStatistics();
  }, [loadStatistics]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm font-medium text-destructive bg-destructive/10 border border-destructive/20 rounded-md p-3">
        {error}
      </div>
    );
  }

  const getHealthBadgeVariant = (status: string) => {
    switch (status) {
      case "healthy":
        return "default";
      case "warning":
        return "secondary";
      case "critical":
        return "destructive";
      default:
        return "outline";
    }
  };

  const getHealthStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      healthy: t("stations.statisticsTab.healthStatuses.healthy"),
      warning: t("stations.statisticsTab.healthStatuses.warning"),
      critical: t("stations.statisticsTab.healthStatuses.critical"),
    };
    return statusMap[status] || status.toUpperCase();
  };

  return (
    <div className="space-y-6">
      {health && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              {t("stations.statisticsTab.title")}
            </CardTitle>
            <CardDescription>{t("stations.statisticsTab.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-muted">
                  <CheckCircle className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">{t("stations.statisticsTab.status")}</p>
                  <Badge variant={getHealthBadgeVariant(health.status)} className="mt-1">
                    {getHealthStatusLabel(health.status)}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-muted">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">{t("stations.statisticsTab.activeSensors")}</p>
                  <p className="text-2xl font-bold">{health.activeSensors ?? 0}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-muted">
                  <AlertTriangle className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">{t("stations.statisticsTab.inactiveSensors")}</p>
                  <p className="text-2xl font-bold">{health.inactiveSensors ?? 0}</p>
                </div>
              </div>
            </div>
            {health.issues && health.issues.length > 0 && (
              <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="text-sm font-medium text-destructive mb-2">{t("stations.statisticsTab.issues")}</p>
                <ul className="list-disc list-inside text-sm text-destructive space-y-1">
                  {health.issues.map((issue, index) => (
                    <li key={index}>{issue}</li>
                  ))}
                </ul>
              </div>
            )}
            {health.lastReadingAt && (
              <p className="text-sm text-muted-foreground mt-4">
                {t("stations.statisticsTab.lastReading")} {format(new Date(health.lastReadingAt), "PPp")}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("stations.statisticsTab.overview")}</CardTitle>
              <CardDescription>{t("stations.statisticsTab.overviewDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{t("stations.statisticsTab.totalReadings")}</span>
                  <span className="text-2xl font-bold">
                    {(stats.totalReadings ?? 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{t("stations.statisticsTab.activeSensors")}</span>
                  <span className="text-2xl font-bold">{stats.activeSensors ?? 0}</span>
                </div>
                {stats.lastReadingAt && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{t("stations.statisticsTab.lastReadingDate")}</span>
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(stats.lastReadingAt), "PPp")}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {stats.averageValues && Object.keys(stats.averageValues).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>{t("stations.statisticsTab.averageValues")}</CardTitle>
                <CardDescription>{t("stations.statisticsTab.averageValuesDescription")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(stats.averageValues).map(([type, value]) => (
                    <div key={type} className="flex items-center justify-between">
                      <span className="text-sm font-medium capitalize">{type.replace("_", " ")}</span>
                      <span className="text-lg font-semibold">
                        {typeof value === 'number' ? value.toFixed(2) : 'N/A'}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t("stations.statisticsTab.dataTrends")}</CardTitle>
          <CardDescription>{t("stations.statisticsTab.dataTrendsDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              {t("stations.statisticsTab.chartPlaceholder")}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

