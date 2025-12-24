"use client";

import { useState, useEffect, useCallback } from "react";
import { useLayoutEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiService } from "@/api";
import type { MonitoringStation } from "@/api/types";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { StationInfoTab } from "@/components/stations/StationInfoTab";
import { SensorsManagementTab } from "@/components/stations/SensorsManagementTab";
import { StationStatisticsTab } from "@/components/stations/StationStatisticsTab";
import { StationAlertsTab } from "@/components/stations/StationAlertsTab";

export default function StationDetailsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const router = useRouter();
  const stationId = searchParams.get("id");

  const [station, setStation] = useState<MonitoringStation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("info");

  useLayoutEffect(() => {
    document.body.classList.remove("landing-theme");
    document.body.style.display = "block";
    document.body.style.flexDirection = "";
  }, []);

  const loadStation = useCallback(async () => {
    if (!stationId) {
      setError(t("stations.stationDetails.errors.stationIdRequired"));
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await apiService.getMonitoringStationById(stationId);
      setStation(data);
    } catch (err) {
      let errorMessage = t("stations.stationDetails.errors.loadFailed");
      
      if (err && typeof err === "object" && "response" in err) {
        const axiosError = err as {
          response?: { status?: number; data?: { message?: string } };
          message?: string;
        };
        
        if (axiosError.response?.status === 401) {
          errorMessage = t("stations.stationDetails.errors.sessionExpired");
        } else if (axiosError.response?.status === 404) {
          errorMessage = t("stations.stationDetails.errors.notFound");
        } else if (axiosError.response?.data?.message) {
          errorMessage = axiosError.response.data.message;
        } else if (axiosError.message) {
          errorMessage = axiosError.message;
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [stationId, t]);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) return;
    loadStation();
  }, [stationId, isAuthenticated, authLoading, loadStation]);

  const handleStationUpdate = useCallback(async () => {
    if (!stationId) return;
    try {
      const updated = await apiService.getMonitoringStationById(stationId);
      setStation(updated);
    } catch (err) {
      console.error("Failed to refresh station data:", err);
    }
  }, [stationId]);

  if (authLoading || isLoading) {
    return (
      <div className="flex min-h-svh w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{t("stations.stationDetails.loading")}</p>
        </div>
      </div>
    );
  }

  if (error || !station) {
    return (
      <div className="flex min-h-svh w-full items-center justify-center bg-background p-4">
        <div className="text-center max-w-md">
          <p className="text-sm font-medium text-destructive mb-4">
            {error || t("stations.stationDetails.errors.notFound")}
          </p>
          <Button onClick={() => router.push("/stations")} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("stations.stationDetails.backToStations")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-svh w-full flex-col bg-background p-4 sm:p-6 md:p-10">
      <div className="mb-6">
        <Button
          onClick={() => router.push("/stations")}
          variant="ghost"
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("stations.stationDetails.backToStations")}
        </Button>
        <h1 className="text-3xl font-bold">{station.name}</h1>
        <p className="text-muted-foreground mt-2">
          {station.description || t("stations.stationDetails.description")}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="info">{t("stations.stationDetails.tabs.info")}</TabsTrigger>
          <TabsTrigger value="sensors">{t("stations.stationDetails.tabs.sensors")}</TabsTrigger>
          <TabsTrigger value="alerts">{t("stations.stationDetails.tabs.alerts")}</TabsTrigger>
          <TabsTrigger value="statistics">{t("stations.stationDetails.tabs.statistics")}</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="mt-6">
          <StationInfoTab
            station={station}
            onStationUpdate={handleStationUpdate}
          />
        </TabsContent>

        <TabsContent value="sensors" className="mt-6">
          <SensorsManagementTab
            stationId={stationId!}
            onSensorUpdate={handleStationUpdate}
          />
        </TabsContent>

        <TabsContent value="alerts" className="mt-6">
          <StationAlertsTab stationId={stationId!} />
        </TabsContent>

        <TabsContent value="statistics" className="mt-6">
          <StationStatisticsTab stationId={stationId!} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

