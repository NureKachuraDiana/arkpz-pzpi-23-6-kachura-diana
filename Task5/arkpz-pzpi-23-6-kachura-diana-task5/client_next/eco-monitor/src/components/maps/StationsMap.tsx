"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import type { MonitoringStation } from "@/api/types";

// Ensure this component only renders on client
if (typeof window === "undefined") {
  // This will never execute, but helps with type checking
}

interface StationsMapProps {
  stations: MonitoringStation[];
  onStationClick: (station: MonitoringStation) => void;
  onMapClick?: (latitude: number, longitude: number) => void;
  className?: string;
}

// Extend Window interface for Google Maps
declare global {
  interface Window {
    google: any;
  }
}

export function StationsMap({ stations, onStationClick, onMapClick, className }: StationsMapProps) {
  const { t } = useLanguage();
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const tempMarkerRef = useRef<any>(null);
  const clickListenerRef = useRef<any>(null);
  const isInitializedRef = useRef(false);
  const lastStationsHashRef = useRef<string>('');

  // Функция для создания хеша станций для сравнения
  const getStationsHash = useCallback((stationsList: MonitoringStation[]) => {
    return stationsList.map(s => `${s.id}-${s.latitude}-${s.longitude}`).join('|');
  }, []);

  // Load Google Maps script - only once
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    // Check if already loaded
    if ((window as any).google) {
      setMapLoaded(true);
      return;
    }

    // Prevent multiple initializations
    if (isInitializedRef.current) {
      return;
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.warn("Google Maps API key not found.");
      setMapLoaded(true);
      return;
    }

    isInitializedRef.current = true;

    const existingScript = document.querySelector(`script[src*="maps.googleapis.com"]`);
    if (existingScript) {
      if ((window as any).google) {
        setMapLoaded(true);
      } else {
        existingScript.addEventListener("load", () => setMapLoaded(true));
        existingScript.addEventListener("error", () => setMapLoaded(true));
      }
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;

    const loadTimeout = setTimeout(() => {
      if ((window as any).google && (window as any).google.maps) {
        setMapLoaded(true);
      } else {
        setMapLoaded(true);
      }
    }, 5000);

    script.onload = () => {
      clearTimeout(loadTimeout);
      if ((window as any).google && (window as any).google.maps) {
        console.log("Google Maps loaded");
        setMapLoaded(true);
      } else {
        setTimeout(() => {
          if ((window as any).google && (window as any).google.maps) {
            setMapLoaded(true);
          } else {
            setMapLoaded(true);
          }
        }, 1000);
      }
    };

    script.onerror = (error) => {
      clearTimeout(loadTimeout);
      console.error("Failed to load Google Maps script:", error);
      setMapLoaded(true);
    };

    try {
      document.head.appendChild(script);
    } catch (error) {
      clearTimeout(loadTimeout);
      console.error("Error appending Google Maps script:", error);
      setMapLoaded(true);
    }
  }, []);

  // Initialize map - только один раз при загрузке скрипта
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || !(window as any).google || mapInstanceRef.current) {
      return;
    }

    console.log("Initializing map...");

    const googleMap = new (window as any).google.maps.Map(mapRef.current, {
      center: stations.length > 0
          ? { lat: stations[0].latitude, lng: stations[0].longitude }
          : { lat: 50.4501, lng: 30.5234 },
      zoom: stations.length > 1 ? 10 : 12,
      mapTypeControl: true,
      streetViewControl: false,
      fullscreenControl: true,
    });

    mapInstanceRef.current = googleMap;
    console.log("Map initialized");

    // Add click listener for creating new station
    if (onMapClick) {
      clickListenerRef.current = googleMap.addListener("click", (e: any) => {
        if (e.latLng) {
          const lat = e.latLng.lat();
          const lng = e.latLng.lng();

          if (tempMarkerRef.current) {
            tempMarkerRef.current.setMap(null);
          }

          tempMarkerRef.current = new (window as any).google.maps.Marker({
            position: { lat, lng },
            map: googleMap,
            icon: {
              path: (window as any).google.maps.SymbolPath.CIRCLE,
              scale: 10,
              fillColor: "#3b82f6",
              fillOpacity: 1,
              strokeColor: "#ffffff",
              strokeWeight: 3,
            },
            animation: (window as any).google.maps.Animation.BOUNCE,
            draggable: true,
          });

          setTimeout(() => {
            if (tempMarkerRef.current) {
              tempMarkerRef.current.setAnimation(null);
            }
          }, 2000);

          tempMarkerRef.current.addListener("dragend", (e: any) => {
            if (e.latLng && onMapClick) {
              onMapClick(e.latLng.lat(), e.latLng.lng());
            }
          });

          onMapClick(lat, lng);
        }
      });
    }

    // Сразу создаем маркеры после инициализации карты
    updateMarkers();

    return () => {
      if (clickListenerRef.current && (window as any).google) {
        (window as any).google.maps.event.removeListener(clickListenerRef.current);
      }
      if (tempMarkerRef.current) {
        tempMarkerRef.current.setMap(null);
      }
    };
  }, [mapLoaded, onMapClick]); // Убрал stations из зависимостей

  // Функция обновления маркеров
  const updateMarkers = useCallback(() => {
    if (!mapInstanceRef.current || !(window as any).google) {
      return;
    }

    const map = mapInstanceRef.current;
    const currentHash = getStationsHash(stations);

    // Проверяем, изменились ли станции
    if (currentHash === lastStationsHashRef.current) {
      return;
    }

    lastStationsHashRef.current = currentHash;

    console.log("Updating markers for", stations.length, "stations");

    // Clear existing markers
    markersRef.current.forEach((marker) => {
      marker.setMap(null);
      if ((window as any).google && (window as any).google.maps) {
        (window as any).google.maps.event.clearInstanceListeners(marker);
      }
    });
    markersRef.current = [];

    if (stations.length === 0) {
      console.log("No stations to display");
      return;
    }

    // Create markers for each station
    stations.forEach((station) => {
      try {
        const marker = new (window as any).google.maps.Marker({
          position: { lat: station.latitude, lng: station.longitude },
          map,
          title: station.name,
          icon: {
            path: (window as any).google.maps.SymbolPath.CIRCLE,
            scale: station.isActive ? 8 : 6,
            fillColor: station.isActive ? "#22c55e" : "#ef4444",
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 2,
          },
          animation: (window as any).google.maps.Animation.DROP,
        });

        marker.addListener("click", () => {
          onStationClick(station);
        });

        const infoWindow = new (window as any).google.maps.InfoWindow({
          content: `
            <div style="padding: 8px; min-width: 200px;">
              <h3 style="margin: 0 0 8px 0; font-weight: 600; font-size: 16px;">${station.name}</h3>
              <p style="margin: 4px 0; font-size: 14px; color: #666;">
                ${station.description || "No description"}
              </p>
              <p style="margin: 4px 0; font-size: 12px; color: #999;">
                Status: <span style="color: ${station.isActive ? "#22c55e" : "#ef4444"}; font-weight: 600;">
                  ${station.isActive ? "Active" : "Inactive"}
                </span>
              </p>
              ${station.address ? `<p style="margin: 4px 0; font-size: 12px; color: #999;">${station.address}</p>` : ""}
            </div>
          `,
        });

        marker.addListener("mouseover", () => {
          infoWindow.open(map, marker);
        });

        marker.addListener("mouseout", () => {
          infoWindow.close();
        });

        markersRef.current.push(marker);
        console.log("Marker created for station:", station.name);
      } catch (error) {
        console.error("Error creating marker for station:", station.name, error);
      }
    });

    // Update bounds
    if (stations.length > 0 && mapInstanceRef.current) {
      try {
        const bounds = new (window as any).google.maps.LatLngBounds();
        stations.forEach((station) => {
          bounds.extend({ lat: station.latitude, lng: station.longitude });
        });

        // Добавляем небольшую паузу перед обновлением границ
        setTimeout(() => {
          if (mapInstanceRef.current) {
            mapInstanceRef.current.fitBounds(bounds);
            // Устанавливаем максимальный зум, чтобы не было слишком далеко
            const listener = mapInstanceRef.current.addListener('bounds_changed', () => {
              if (mapInstanceRef.current) {
                if (mapInstanceRef.current.getZoom() > 15) {
                  mapInstanceRef.current.setZoom(15);
                }
                (window as any).google.maps.event.removeListener(listener);
              }
            });
          }
        }, 100);
      } catch (error) {
        console.error("Error updating map bounds:", error);
      }
    }
  }, [stations, onStationClick, getStationsHash]);

  // Отдельный эффект для обновления маркеров при изменении stations
  useEffect(() => {
    if (!mapInstanceRef.current) {
      return;
    }

    updateMarkers();
  }, [updateMarkers]);

  // Debug: отслеживаем изменения
  useEffect(() => {
    console.log("Stations changed:", stations.length, "items");
  }, [stations]);

  const clearTempMarker = useCallback(() => {
    if (tempMarkerRef.current) {
      tempMarkerRef.current.setMap(null);
      tempMarkerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (mapRef.current) {
      (mapRef.current as any).clearTempMarker = clearTempMarker;
    }
  }, [clearTempMarker]);

  if (!mapLoaded) {
    return (
        <div className={cn("w-full h-full min-h-[600px] rounded-lg overflow-hidden border flex items-center justify-center bg-muted", className)}>
          <p className="text-muted-foreground">{t("stations.map.loading")}</p>
        </div>
    );
  }

  if (!(window as any).google || !(window as any).google.maps) {
    return (
        <div className={cn("w-full h-full min-h-[600px] rounded-lg overflow-hidden border flex items-center justify-center bg-muted", className)}>
          <div className="text-center p-4 max-w-md">
            <p className="text-muted-foreground mb-2 font-medium">{t("stations.map.notAvailable")}</p>
            <p className="text-sm text-muted-foreground mb-4">
              {t("stations.map.notAvailableDescription")}
            </p>
            <div className="text-xs text-muted-foreground space-y-1 mb-4 bg-background p-3 rounded border">
              <p className="font-medium mb-2">{t("stations.map.fixInstructions")}</p>
              <ul className="list-disc list-inside space-y-1 text-left">
                <li>{t("stations.map.fixStep1")}</li>
                <li>{t("stations.map.fixStep2")}</li>
                <li>{t("stations.map.fixStep3")}</li>
              </ul>
            </div>
            {stations.length > 0 && (
                <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
                  <p className="text-sm font-medium mb-2">{t("stations.map.stationsList")}</p>
                  {stations.map((station) => (
                      <div key={station.id} className="p-2 bg-background rounded border text-left">
                        <p className="font-medium text-sm">{station.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {station.latitude.toFixed(6)}, {station.longitude.toFixed(6)}
                        </p>
                        {station.description && (
                            <p className="text-xs text-muted-foreground mt-1">{station.description}</p>
                        )}
                      </div>
                  ))}
                </div>
            )}
          </div>
        </div>
    );
  }

  return (
      <div className={cn("w-full h-full min-h-[600px] rounded-lg overflow-hidden border relative", className)}>
        <div ref={mapRef} className="w-full h-full" />
      </div>
  );
}