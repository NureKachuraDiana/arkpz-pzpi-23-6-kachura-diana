"use client";

import { useState, useEffect, useCallback } from "react";
import { apiService } from "@/api";
import type { StationAlert, GetAlertsQuery, SensorType, AlertSeverity } from "@/api/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Filter,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";

interface StationAlertsTabProps {
  stationId: string;
}

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

const severities: AlertSeverity[] = ['critical', 'high', 'medium', 'low'];

export function StationAlertsTab({ stationId }: StationAlertsTabProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [activeAlerts, setActiveAlerts] = useState<StationAlert[]>([]);
  const [alertHistory, setAlertHistory] = useState<StationAlert[]>([]);
  const [isLoadingActive, setIsLoadingActive] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState("active");

  // Filters
  const [sensorTypeFilter, setSensorTypeFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");

  const isAdmin = user?.role === "ADMIN";
  const isOperator = user?.role === "OPERATOR" || isAdmin;
  const canAcknowledge = isAdmin || isOperator;

  const loadActiveAlerts = useCallback(async () => {
    setIsLoadingActive(true);
    try {
      const query: GetAlertsQuery = {
        stationId,
        isActive: true,
        limit: 100,
        sort: 'desc',
      };

      if (sensorTypeFilter !== "all") {
        query.sensorType = sensorTypeFilter as SensorType;
      }

      if (severityFilter !== "all") {
        query.severity = severityFilter as AlertSeverity;
      }

      const data = await apiService.getActiveAlerts(query);
      // Ensure we have an array
      setActiveAlerts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error loading active alerts:", err);
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: t("stations.alertsTab.loadActiveFailed"),
      });
    } finally {
      setIsLoadingActive(false);
    }
  }, [stationId, sensorTypeFilter, severityFilter, toast]);

  const loadAlertHistory = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const query: GetAlertsQuery = {
        stationId,
        isActive: false,
        limit: 100,
        sort: 'desc',
      };

      if (sensorTypeFilter !== "all") {
        query.sensorType = sensorTypeFilter as SensorType;
      }

      if (severityFilter !== "all") {
        query.severity = severityFilter as AlertSeverity;
      }

      const data = await apiService.getAlertHistory(query);
      // Ensure we have an array
      setAlertHistory(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error loading alert history:", err);
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: t("stations.alertsTab.loadHistoryFailed"),
      });
    } finally {
      setIsLoadingHistory(false);
    }
  }, [stationId, sensorTypeFilter, severityFilter, toast]);

  useEffect(() => {
    if (activeTab === "active") {
      loadActiveAlerts();
    } else {
      loadAlertHistory();
    }
  }, [activeTab, loadActiveAlerts, loadAlertHistory]);

  const handleAcknowledge = useCallback(async (alertId: string) => {
    setIsProcessing(true);
    try {
      await apiService.acknowledgeAlert(alertId);
      toast({
        title: t("common.success"),
        description: t("stations.alertsTab.acknowledgeSuccess"),
      });
      await loadActiveAlerts();
    } catch (err) {
      console.error("Error acknowledging alert:", err);
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: t("stations.alertsTab.acknowledgeFailed"),
      });
    } finally {
      setIsProcessing(false);
    }
  }, [loadActiveAlerts, toast, t]);

  const getSeverityBadge = (severity: AlertSeverity) => {
    const variants: Record<AlertSeverity, "default" | "secondary" | "destructive" | "outline"> = {
      critical: "destructive",
      high: "destructive",
      medium: "secondary",
      low: "outline",
    };

    const severityLabels: Record<AlertSeverity, string> = {
      critical: t("stations.alertsTab.severities.critical"),
      high: t("stations.alertsTab.severities.high"),
      medium: t("stations.alertsTab.severities.medium"),
      low: t("stations.alertsTab.severities.low"),
    };

    return (
      <Badge variant={variants[severity] || "outline"}>
        {severityLabels[severity] || severity}
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

  const clearFilters = () => {
    setSensorTypeFilter("all");
    setSeverityFilter("all");
  };

  const hasFilters = sensorTypeFilter !== "all" || severityFilter !== "all";

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t("stations.alertsTab.title")}</CardTitle>
              <CardDescription>
                {t("stations.alertsTab.description")}
              </CardDescription>
            </div>
            <Button
              onClick={activeTab === "active" ? loadActiveAlerts : loadAlertHistory}
              variant="outline"
              size="sm"
              disabled={activeTab === "active" ? isLoadingActive : isLoadingHistory}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${
                  (activeTab === "active" ? isLoadingActive : isLoadingHistory)
                    ? "animate-spin"
                    : ""
                }`}
              />
              {t("stations.alertsTab.refresh")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="text-sm font-medium mb-2 block">{t("stations.alertsTab.sensorType")}</label>
                <Select value={sensorTypeFilter} onValueChange={setSensorTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("stations.alertsTab.allTypes")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("stations.alertsTab.allTypes")}</SelectItem>
                    {sensorTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        <span className="capitalize">{type.replace("_", " ")}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="text-sm font-medium mb-2 block">{t("stations.alertsTab.severity")}</label>
                <Select value={severityFilter} onValueChange={setSeverityFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("stations.alertsTab.allSeverities")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("stations.alertsTab.allSeverities")}</SelectItem>
                    {severities.map((severity) => {
                      const severityLabels: Record<AlertSeverity, string> = {
                        critical: t("stations.alertsTab.severities.critical"),
                        high: t("stations.alertsTab.severities.high"),
                        medium: t("stations.alertsTab.severities.medium"),
                        low: t("stations.alertsTab.severities.low"),
                      };
                      return (
                        <SelectItem key={severity} value={severity}>
                          {severityLabels[severity] || severity}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              {hasFilters && (
                <Button onClick={clearFilters} variant="outline" size="sm">
                  <X className="h-4 w-4 mr-2" />
                  {t("stations.alertsTab.clearFilters")}
                </Button>
              )}
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="active">{t("stations.alertsTab.activeAlerts")}</TabsTrigger>
                <TabsTrigger value="history">{t("stations.alertsTab.history")}</TabsTrigger>
              </TabsList>

              <TabsContent value="active" className="mt-4">
                {isLoadingActive ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : activeAlerts.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-600 opacity-50" />
                    <p className="text-lg font-semibold">{t("stations.alertsTab.noActiveAlerts")}</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      {t("stations.alertsTab.noActiveAlertsDescription")}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("stations.alertsTab.tableHeaders.sensorType")}</TableHead>
                          <TableHead>{t("stations.alertsTab.tableHeaders.severity")}</TableHead>
                          <TableHead>{t("stations.alertsTab.tableHeaders.message")}</TableHead>
                          <TableHead>{t("stations.alertsTab.tableHeaders.created")}</TableHead>
                          {canAcknowledge && <TableHead className="text-right">{t("stations.alertsTab.tableHeaders.actions")}</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {activeAlerts.map((alert) => (
                          <TableRow key={alert.id}>
                            <TableCell>{getTypeBadge(alert.sensorType)}</TableCell>
                            <TableCell>{getSeverityBadge(alert.severity)}</TableCell>
                            <TableCell className="max-w-md">
                              <p className="text-sm">{alert.message}</p>
                              {alert.thresholdValue !== undefined && alert.actualValue !== undefined && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {t("stations.alertsTab.threshold")}: {alert.thresholdValue} | {t("stations.alertsTab.actual")}: {alert.actualValue}
                                </p>
                              )}
                            </TableCell>
                            <TableCell className="text-sm">
                              {format(new Date(alert.createdAt), "MMM dd, yyyy HH:mm")}
                            </TableCell>
                            {canAcknowledge && (
                              <TableCell className="text-right">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleAcknowledge(alert.id)}
                                  disabled={isProcessing}
                                >
                                  {t("stations.alertsTab.acknowledge")}
                                </Button>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="history" className="mt-4">
                {isLoadingHistory ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : alertHistory.length === 0 ? (
                  <div className="text-center py-12">
                    <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-lg font-semibold">{t("stations.alertsTab.noHistory")}</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      {t("stations.alertsTab.noHistoryDescription")}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("stations.alertsTab.tableHeaders.sensorType")}</TableHead>
                          <TableHead>{t("stations.alertsTab.tableHeaders.severity")}</TableHead>
                          <TableHead>{t("stations.alertsTab.tableHeaders.message")}</TableHead>
                          <TableHead>{t("stations.alertsTab.tableHeaders.created")}</TableHead>
                          <TableHead>{t("stations.alertsTab.tableHeaders.resolved")}</TableHead>
                          <TableHead>{t("stations.alertsTab.tableHeaders.acknowledged")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {alertHistory.map((alert) => (
                          <TableRow key={alert.id}>
                            <TableCell>{getTypeBadge(alert.sensorType)}</TableCell>
                            <TableCell>{getSeverityBadge(alert.severity)}</TableCell>
                            <TableCell className="max-w-md">
                              <p className="text-sm">{alert.message}</p>
                              {alert.thresholdValue !== undefined && alert.actualValue !== undefined && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {t("stations.alertsTab.threshold")}: {alert.thresholdValue} | {t("stations.alertsTab.actual")}: {alert.actualValue}
                                </p>
                              )}
                            </TableCell>
                            <TableCell className="text-sm">
                              {format(new Date(alert.createdAt), "MMM dd, yyyy HH:mm")}
                            </TableCell>
                            <TableCell className="text-sm">
                              {alert.resolvedAt
                                ? format(new Date(alert.resolvedAt), "MMM dd, yyyy HH:mm")
                                : "—"}
                            </TableCell>
                            <TableCell className="text-sm">
                              {alert.acknowledgedAt
                                ? format(new Date(alert.acknowledgedAt), "MMM dd, yyyy HH:mm")
                                : "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

