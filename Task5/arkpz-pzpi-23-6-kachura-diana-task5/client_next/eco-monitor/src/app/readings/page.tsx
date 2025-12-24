"use client";

import { useState, useEffect, useCallback } from "react";
import { apiService } from "@/api";
import type {
  SensorReading,
  AggregatedData,
  GetReadingsQuery,
  AggregationQuery,
  SensorType,
  MonitoringStation,
  Sensor,
} from "@/api/types";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  RefreshCw,
  Search,
  Download,
  Play,
  Calendar,
  Filter,
  TrendingUp,
  BarChart3,
} from "lucide-react";
import { format, subDays, subHours } from "date-fns";

export default function ReadingsPage() {
  const { toast } = useToast();
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [aggregatedData, setAggregatedData] = useState<AggregatedData | null>(null);
  const [isLoadingReadings, setIsLoadingReadings] = useState(false);
  const [isLoadingAggregated, setIsLoadingAggregated] = useState(false);
  const [isProcessingRaw, setIsProcessingRaw] = useState(false);
  const [stations, setStations] = useState<MonitoringStation[]>([]);
  const [sensors, setSensors] = useState<Sensor[]>([]);

  // Filters for readings
  const [startTime, setStartTime] = useState<string>(
    format(subDays(new Date(), 1), "yyyy-MM-dd'T'HH:mm")
  );
  const [endTime, setEndTime] = useState<string>(
    format(new Date(), "yyyy-MM-dd'T'HH:mm")
  );
  const [selectedStationId, setSelectedStationId] = useState<string>("");
  const [selectedSensorSerial, setSelectedSensorSerial] = useState<string>("");
  const [selectedSensorType, setSelectedSensorType] = useState<SensorType | "">("");

  // Filters for aggregated data
  const [aggStartTime, setAggStartTime] = useState<string>(
    format(subDays(new Date(), 7), "yyyy-MM-dd'T'HH:mm")
  );
  const [aggEndTime, setAggEndTime] = useState<string>(
    format(new Date(), "yyyy-MM-dd'T'HH:mm")
  );
  const [aggStationId, setAggStationId] = useState<string>("");
  const [aggSensorSerial, setAggSensorSerial] = useState<string>("");
  const [aggSensorType, setAggSensorType] = useState<SensorType | "">("");
  const [aggInterval, setAggInterval] = useState<"hour" | "day" | "week" | "month">("hour");

  useEffect(() => {
    loadStations();
  }, []);

  useEffect(() => {
    if (selectedStationId) {
      loadSensorsForStation(selectedStationId);
    } else {
      setSensors([]);
      setSelectedSensorSerial("");
    }
  }, [selectedStationId]);

  useEffect(() => {
    if (aggStationId) {
      loadSensorsForStation(aggStationId);
    }
  }, [aggStationId]);

  const loadStations = useCallback(async () => {
    try {
      const data = await apiService.getAllMonitoringStations();
      setStations(data);
    } catch (err) {
      console.error("Error loading stations:", err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load monitoring stations.",
      });
    }
  }, [toast]);

  const loadSensorsForStation = useCallback(async (stationId: string) => {
    try {
      const station = await apiService.getMonitoringStationById(stationId);
      setSensors(station.sensors || []);
    } catch (err) {
      console.error("Error loading sensors:", err);
      setSensors([]);
    }
  }, []);

  const loadReadings = useCallback(async () => {
    setIsLoadingReadings(true);
    try {
      const query: GetReadingsQuery = {
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
      };

      if (selectedStationId) {
        query.stationId = selectedStationId;
      }
      if (selectedSensorSerial && selectedSensorSerial !== "All sensors" && selectedSensorSerial !== "All+sensors") {
        query.sensorSerialNumber = selectedSensorSerial;
      }
      if (selectedSensorType && selectedSensorType !== "All types") {
        query.sensorType = selectedSensorType;
      }

      const data = await apiService.getReadings(query);
      setReadings(data);
    } catch (err) {
      console.error("Error loading readings:", err);
      let errorMessage = "Failed to load sensor readings. Please try again.";

      if (err && typeof err === "object" && "response" in err) {
        const axiosError = err as {
          response?: { status?: number; data?: { message?: string } };
          message?: string;
        };

        if (axiosError.response?.data?.message) {
          errorMessage = axiosError.response.data.message;
        } else if (axiosError.message) {
          errorMessage = axiosError.message;
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }

      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage,
      });
    } finally {
      setIsLoadingReadings(false);
    }
  }, [startTime, endTime, selectedStationId, selectedSensorSerial, selectedSensorType, toast]);

  const loadAggregatedData = useCallback(async () => {
    setIsLoadingAggregated(true);
    try {
      const query: AggregationQuery = {
        startTime: new Date(aggStartTime).toISOString(),
        endTime: new Date(aggEndTime).toISOString(),
        interval: aggInterval,
      } as any; // Type assertion needed because server expects number but type says string

      if (aggStationId) {
        query.stationId = aggStationId;
      }
      if (aggSensorSerial && aggSensorSerial !== "All sensors" && aggSensorSerial !== "All+sensors") {
        query.sensorSerialNumber = aggSensorSerial;
      }
      if (aggSensorType && aggSensorType !== "All types") {
        query.sensorType = aggSensorType;
      }

      const data = await apiService.getAggregatedData(query);
      setAggregatedData(data);
    } catch (err) {
      console.error("Error loading aggregated data:", err);
      let errorMessage = "Failed to load aggregated data. Please try again.";

      if (err && typeof err === "object" && "response" in err) {
        const axiosError = err as {
          response?: { status?: number; data?: { message?: string } };
          message?: string;
        };

        if (axiosError.response?.data?.message) {
          errorMessage = axiosError.response.data.message;
        } else if (axiosError.message) {
          errorMessage = axiosError.message;
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }

      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage,
      });
    } finally {
      setIsLoadingAggregated(false);
    }
  }, [aggStartTime, aggEndTime, aggStationId, aggSensorSerial, aggSensorType, aggInterval, toast]);

  const handleProcessRawData = useCallback(async () => {
    setIsProcessingRaw(true);
    try {
      await apiService.processRawData();
      toast({
        title: "Success",
        description: "Raw sensor data has been processed successfully.",
      });
      // Reload readings after processing
      await loadReadings();
    } catch (err) {
      console.error("Error processing raw data:", err);
      let errorMessage = "Failed to process raw data. Please try again.";

      if (err && typeof err === "object" && "response" in err) {
        const axiosError = err as {
          response?: { status?: number; data?: { message?: string } };
          message?: string;
        };

        if (axiosError.response?.data?.message) {
          errorMessage = axiosError.response.data.message;
        } else if (axiosError.message) {
          errorMessage = axiosError.message;
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }

      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage,
      });
    } finally {
      setIsProcessingRaw(false);
    }
  }, [toast, loadReadings]);

  const getQualityBadge = (quality?: string) => {
    switch (quality) {
      case "good":
        return "default";
      case "fair":
        return "secondary";
      case "poor":
        return "destructive";
      default:
        return "outline";
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMM dd, yyyy HH:mm:ss");
    } catch {
      return "Invalid date";
    }
  };

  const sensorTypes: SensorType[] = [
    "temperature",
    "humidity",
    "pressure",
    "air_quality",
    "co2",
    "noise",
    "wind_speed",
    "wind_direction",
    "precipitation",
    "uv_index",
    "soil_moisture",
    "ph",
  ];

  return (
    <div className="flex min-h-svh w-full flex-col bg-background p-4 sm:p-6 md:p-10">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Sensor Readings</h1>
          <p className="text-muted-foreground mt-2">
            Monitor and analyze sensor readings across all stations
          </p>
        </div>
      </div>

      <Tabs defaultValue="readings" className="w-full">
        <TabsList>
          <TabsTrigger value="readings">Sensor Readings</TabsTrigger>
          <TabsTrigger value="aggregated">Aggregated Data</TabsTrigger>
        </TabsList>

        <TabsContent value="readings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Filters</CardTitle>
              <CardDescription>Filter sensor readings by time, station, and sensor</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-2">
                  <Label>Start Time</Label>
                  <Input
                    type="datetime-local"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Time</Label>
                  <Input
                    type="datetime-local"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Station</Label>
                  <Select value={selectedStationId} onValueChange={setSelectedStationId}>
                    <SelectTrigger>
                      <SelectValue placeholder="All stations" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All stations">All stations</SelectItem>
                      {stations.map((station) => (
                        <SelectItem key={station.id} value={station.id}>
                          {station.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Sensor Serial Number</Label>
                  <Select
                    value={selectedSensorSerial}
                    onValueChange={setSelectedSensorSerial}
                    disabled={!selectedStationId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All sensors" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All sensors">All sensors</SelectItem>
                      {sensors.map((sensor) => (
                        <SelectItem key={sensor.serialNumber} value={sensor.serialNumber}>
                          {sensor.serialNumber} ({sensor.name})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Sensor Type</Label>
                  <Select
                    value={selectedSensorType}
                    onValueChange={(value) => setSelectedSensorType(value as SensorType | "")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All types">All types</SelectItem>
                      {sensorTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 flex items-end">
                  <Button onClick={loadReadings} disabled={isLoadingReadings} className="w-full">
                    {isLoadingReadings ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <Search className="h-4 w-4 mr-2" />
                        Search
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              {readings.length} reading{readings.length !== 1 ? "s" : ""} found
            </div>
            <Button
              onClick={handleProcessRawData}
              variant="outline"
              disabled={isProcessingRaw}
            >
              {isProcessingRaw ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Process Raw Data
                </>
              )}
            </Button>
          </div>

          {isLoadingReadings ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Loading readings...</p>
              </div>
            </div>
          ) : readings.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  No readings found. Adjust your filters and try again.
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>Station</TableHead>
                        <TableHead>Sensor</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Value</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead>Quality</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {readings.map((reading) => (
                        <TableRow key={reading.id}>
                          <TableCell className="text-sm">
                            {formatDate(reading.timestamp)}
                          </TableCell>
                          <TableCell>{reading.stationId}</TableCell>
                          <TableCell className="font-mono text-xs">
                            {reading.sensorSerialNumber}
                          </TableCell>
                          <TableCell>
                            <span className="capitalize">
                              {reading.sensorType.replace("_", " ")}
                            </span>
                          </TableCell>
                          <TableCell className="font-semibold">
                            {reading.value.toFixed(2)}
                          </TableCell>
                          <TableCell>{reading.unit || "—"}</TableCell>
                          <TableCell>
                            <Badge variant={getQualityBadge(reading.quality)}>
                              {reading.quality || "unknown"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="aggregated" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Aggregation Filters</CardTitle>
              <CardDescription>
                Configure time range and filters for aggregated data analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-2">
                  <Label>Start Time</Label>
                  <Input
                    type="datetime-local"
                    value={aggStartTime}
                    onChange={(e) => setAggStartTime(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Time</Label>
                  <Input
                    type="datetime-local"
                    value={aggEndTime}
                    onChange={(e) => setAggEndTime(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Interval</Label>
                  <Select
                    value={aggInterval}
                    onValueChange={(value) =>
                      setAggInterval(value as "hour" | "day" | "week" | "month")
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hour">Hour</SelectItem>
                      <SelectItem value="day">Day</SelectItem>
                      <SelectItem value="week">Week</SelectItem>
                      <SelectItem value="month">Month</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Station</Label>
                  <Select value={aggStationId} onValueChange={setAggStationId}>
                    <SelectTrigger>
                      <SelectValue placeholder="All stations" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All stations">All stations</SelectItem>
                      {stations.map((station) => (
                        <SelectItem key={station.id} value={station.id}>
                          {station.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Sensor Serial Number</Label>
                  <Select
                    value={aggSensorSerial}
                    onValueChange={setAggSensorSerial}
                    disabled={!aggStationId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All sensors" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All sensors">All sensors</SelectItem>
                      {sensors.map((sensor) => (
                        <SelectItem key={sensor.serialNumber} value={sensor.serialNumber}>
                          {sensor.serialNumber} ({sensor.name})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Sensor Type</Label>
                  <Select
                    value={aggSensorType}
                    onValueChange={(value) => setAggSensorType(value as SensorType | "")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All types">All types</SelectItem>
                      {sensorTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 flex items-end">
                  <Button
                    onClick={loadAggregatedData}
                    disabled={isLoadingAggregated}
                    className="w-full"
                  >
                    {isLoadingAggregated ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Load Aggregated Data
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {isLoadingAggregated ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Loading aggregated data...</p>
              </div>
            </div>
          ) : aggregatedData ? (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Average</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {aggregatedData.average.toFixed(2)}
                    </div>
                    {aggregatedData.sensorType && (
                      <p className="text-sm text-muted-foreground capitalize mt-1">
                        {aggregatedData.sensorType.replace("_", " ")}
                      </p>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Minimum</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {aggregatedData.min.toFixed(2)}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Maximum</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {aggregatedData.max.toFixed(2)}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Data Points</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{aggregatedData.count}</div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Data Visualization</CardTitle>
                  <CardDescription>
                    Time series chart of aggregated sensor readings ({aggregatedData.dataPoints.length} data points)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {aggregatedData.dataPoints && aggregatedData.dataPoints.length > 0 ? (
                    <div className="h-96 w-full">
                      <div className="h-full w-full flex flex-col items-center justify-center bg-muted rounded-lg p-4">
                        <div className="w-full h-full relative">
                          {/* Simple bar chart visualization */}
                          <div className="w-full h-full flex items-end justify-between gap-1">
                            {aggregatedData.dataPoints.slice(0, 50).map((point, index) => {
                              const maxValue = aggregatedData.max || 1;
                              const height = (point.value / maxValue) * 100;
                              return (
                                <div
                                  key={index}
                                  className="flex-1 bg-primary rounded-t transition-all hover:bg-primary/80"
                                  style={{ height: `${Math.max(height, 2)}%` }}
                                  title={`${formatDate(point.timestamp)}: ${point.value.toFixed(2)}`}
                                />
                              );
                            })}
                          </div>
                        </div>
                        <div className="mt-4 text-center space-y-1">
                          <p className="text-sm font-medium">
                            Average: {aggregatedData.average.toFixed(2)} | Min: {aggregatedData.min.toFixed(2)} | Max: {aggregatedData.max.toFixed(2)}
                          </p>
                          {aggregatedData.dataPoints.length > 50 && (
                            <p className="text-xs text-muted-foreground">
                              Showing first 50 of {aggregatedData.dataPoints.length} data points
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-96 flex items-center justify-center bg-muted rounded-lg">
                      <div className="text-center space-y-2">
                        <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">No data points available</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {aggregatedData.dataPoints && aggregatedData.dataPoints.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Data Points</CardTitle>
                    <CardDescription>Detailed aggregated data points</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Timestamp</TableHead>
                            <TableHead>Value</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {aggregatedData.dataPoints.slice(0, 50).map((point, index) => (
                            <TableRow key={index}>
                              <TableCell className="text-sm">
                                {formatDate(point.timestamp)}
                              </TableCell>
                              <TableCell className="font-semibold">
                                {point.value.toFixed(2)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      {aggregatedData.dataPoints.length > 50 && (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          Showing first 50 of {aggregatedData.dataPoints.length} data points
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  No aggregated data loaded. Configure filters and click "Load Aggregated Data".
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

