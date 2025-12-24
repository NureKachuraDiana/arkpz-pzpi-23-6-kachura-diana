"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useLayoutEffect } from "react";
import dynamic from "next/dynamic";
import { StationDialog } from "@/components/stations/StationDialog";
import { CreateStationDialog } from "@/components/stations/CreateStationDialog";
import { apiService } from "@/api";
import type { MonitoringStation } from "@/api/types";
import { Loader2, Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";

// Dynamically import StationsMap to avoid SSR issues
const StationsMap = dynamic(() => import("@/components/maps/StationsMap").then(mod => ({ default: mod.StationsMap })), {
  ssr: false,
  loading: () => {
    // Note: t() cannot be used here as this is outside component scope
    // This will be handled by StationsMap component itself
    return (
      <div className="w-full h-[calc(100vh-200px)] rounded-lg overflow-hidden border flex items-center justify-center bg-muted">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading map...</p>
        </div>
      </div>
    );
  },
});

export default function StationsPage() {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const { t } = useLanguage();
  const [stations, setStations] = useState<MonitoringStation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStation, setSelectedStation] = useState<MonitoringStation | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mapRef = useRef<{ clearTempMarker?: () => void } | null>(null);

  const isAdmin = user?.role === "ADMIN";
  const isOperator = user?.role === "OPERATOR" || isAdmin;
  const canCreateStation = isAdmin || isOperator;

  useLayoutEffect(() => {
    document.body.classList.remove("landing-theme");
    document.body.style.display = "block";
    document.body.style.flexDirection = "";
  }, []);

  const loadStations = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log("Loading stations...");
      const data = await apiService.getAllMonitoringStations();
      console.log("Stations loaded:", data.length, data);
      setStations(data);
    } catch (err) {
      console.error("Error loading stations:", err);
      let errorMessage = t("stations.page.loadFailed");
      
      if (err && typeof err === "object" && "response" in err) {
        const axiosError = err as {
          response?: { status?: number; data?: { message?: string } };
          message?: string;
        };
        
        if (axiosError.response?.status === 401) {
          errorMessage = t("stations.page.sessionExpired");
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
  }, [t]);

  useEffect(() => {
    console.log("StationsPage useEffect:", { authLoading, isAuthenticated });
    if (authLoading) {
      console.log("Auth still loading, skipping station load");
      return;
    }
    if (!isAuthenticated) {
      console.log("User not authenticated, skipping station load");
      return;
    }
    console.log("User authenticated, loading stations...");
    loadStations();
  }, [isAuthenticated, authLoading, loadStations]);

  const handleStationClick = useCallback((station: MonitoringStation) => {
    setSelectedStation(station);
    setDialogOpen(true);
  }, []);

  const handleMapClick = useCallback((latitude: number, longitude: number) => {
    if (canCreateStation) {
      setSelectedLocation({ lat: latitude, lng: longitude });
      setCreateDialogOpen(true);
    }
  }, [canCreateStation]);

  const handleStationCreated = useCallback(async () => {
    // Clear temporary marker if available
    if (mapRef.current?.clearTempMarker) {
      mapRef.current.clearTempMarker();
    }
    
    // Reload stations list
    await loadStations();
  }, [loadStations]);

  const handleAddStationClick = useCallback(() => {
    // Default location (Kyiv center) if no location selected
    setSelectedLocation({ lat: 50.4501, lng: 30.5234 });
    setCreateDialogOpen(true);
  }, []);

  const handleCreateDialogClose = useCallback((open: boolean) => {
    if (!open) {
      // Clear temporary marker if available
      if (mapRef.current?.clearTempMarker) {
        mapRef.current.clearTempMarker();
      }
    }
    setCreateDialogOpen(open);
  }, []);

  if (authLoading || isLoading) {
    return (
      <div className="flex min-h-svh w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{t("stations.loadingStations")}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-svh w-full items-center justify-center bg-background p-4">
        <div className="text-center">
          <p className="text-sm font-medium text-destructive mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="text-sm text-primary hover:underline"
          >
            {t("stations.reloadPage")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-svh w-full flex-col bg-background p-4 sm:p-6 md:p-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("stations.title")}</h1>
          <p className="text-muted-foreground mt-2">
            {canCreateStation
              ? t("stations.description")
              : t("stations.descriptionViewOnly")}
          </p>
        </div>
        {canCreateStation && (
          <Button
            onClick={handleAddStationClick}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t("stations.addStation")}
          </Button>
        )}
      </div>

      <div className="flex-1 w-full">
        <StationsMap
          stations={stations}
          onStationClick={handleStationClick}
          onMapClick={handleMapClick}
          className="w-full h-[calc(100vh-200px)]"
        />
      </div>

      <StationDialog
        station={selectedStation}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />

      {selectedLocation && (
        <CreateStationDialog
          open={createDialogOpen}
          onOpenChange={handleCreateDialogClose}
          latitude={selectedLocation.lat}
          longitude={selectedLocation.lng}
          onStationCreated={handleStationCreated}
        />
      )}
    </div>
  );
}

