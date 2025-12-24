// ============================================================================
// Base Types
// ============================================================================

export interface ApiResponse<T = unknown> {
  data: T;
  message?: string;
  success?: boolean;
}

export interface ApiError {
  message: string;
  statusCode?: number;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page?: number;
  limit?: number;
  skip?: number;
  take?: number;
}

// ============================================================================
// Auth Types
// ============================================================================

export type Role = 'ADMIN' | 'OPERATOR' | 'OBSERVER';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface User {
  id: number;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  role: Role;
  isActive: boolean;
  lastLogin?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthResponse {
  user: User;
  message?: string;
}

// ============================================================================
// Backup Types
// ============================================================================

export type BackupType = 'database' | 'full';
export type BackupStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';

export interface CreateBackupRequest {
  type?: BackupType;
  description?: string;
}

export interface Backup {
  id: string;
  type: BackupType;
  status: BackupStatus;
  description?: string;
  createdAt: string;
  completedAt?: string;
  fileSize?: number;
  error?: string;
}

export interface BackupStats {
  total: number;
  completed: number;
  failed: number;
  pending: number;
  totalSize?: number;
}

// ============================================================================
// Data Export Types
// ============================================================================

export type ExportFormat = 'csv' | 'json' | 'xlsx' | 'pdf';
export type ExportStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface CreateExportRequest {
  format: ExportFormat;
  filters: Record<string, unknown>;
}

export interface Export {
  id: string;
  format: ExportFormat;
  status: ExportStatus;
  filters: Record<string, unknown>;
  createdAt: string;
  completedAt?: string;
  fileSize?: number;
  downloadUrl?: string;
  error?: string;
}

// ============================================================================
// Maintenance Types
// ============================================================================

export type ScheduleType = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'one-time';
export type MaintenanceStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

export interface CreateMaintenanceScheduleRequest {
  title: string;
  scheduleType: ScheduleType;
  startDate: string;
  description?: string;
  assignedTo?: string;
  stationId?: number;
  sensorId?: number;
  endDate?: string;
  recurring?: boolean;
  interval?: number;
}

export interface UpdateMaintenanceScheduleRequest {
  title?: string;
  scheduleType?: ScheduleType;
  startDate?: string;
  description?: string;
  assignedTo?: string | null;
  stationId?: number | null;
  sensorId?: number | null;
  endDate?: string | null;
  recurring?: boolean;
  interval?: number;
}

export interface AssignMaintenanceRequest {
  assignedTo: string;
}

export interface CompleteMaintenanceRequest {
  notes?: string;
  completedAt?: string;
}

export interface MaintenanceSchedule {
  id: string;
  title: string;
  scheduleType: ScheduleType;
  startDate: string;
  status: MaintenanceStatus;
  description?: string;
  assignedTo?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Monitoring Station Types
// ============================================================================

export interface CreateMonitoringStationRequest {
  name: string;
  latitude: number;
  longitude: number;
  description?: string;
  altitude?: number;
  address?: string;
}

export interface UpdateMonitoringStationRequest {
  name?: string;
  latitude?: number;
  longitude?: number;
  description?: string;
  altitude?: number;
  address?: string;
  isActive?: boolean;
}

export interface GetMonitoringStationInRadiusRequest {
  latitude: number;
  longitude: number;
  radius: number;
}

export interface MonitoringStation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  description?: string;
  altitude?: number;
  address?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StationStats {
  stationId: string;
  totalReadings: number;
  activeSensors: number;
  lastReadingAt?: string;
  averageValues?: Record<string, number>;
}

export interface StationHealth {
  stationId: string;
  status: 'healthy' | 'warning' | 'critical';
  activeSensors: number;
  inactiveSensors: number;
  lastReadingAt?: string;
  issues?: string[];
}

// ============================================================================
// Sensor Types
// ============================================================================

export type SensorType = 
  | 'temperature' 
  | 'humidity' 
  | 'pressure' 
  | 'air_quality' 
  | 'co2' 
  | 'noise' 
  | 'wind_speed' 
  | 'wind_direction'
  | 'precipitation'
  | 'uv_index'
  | 'soil_moisture'
  | 'ph';

export type SensorStatus = 'active' | 'inactive' | 'calibrating' | 'error';

export interface CreateSensorRequest {
  stationId: string;
  type: SensorType;
  name: string;
  serialNumber: string;
  description?: string;
  calibrationDate?: string;
  location?: string;
}

export interface UpdateSensorRequest {
  name?: string;
  description?: string;
  location?: string;
  calibrationDate?: string;
}

export interface Sensor {
  id: string;
  stationId: string;
  type: SensorType;
  name: string;
  serialNumber: string;
  status: SensorStatus;
  description?: string;
  calibrationDate?: string;
  location?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SensorStatusInfo {
  sensorId: string;
  status: SensorStatus;
  lastReadingAt?: string;
  batteryLevel?: number;
  signalStrength?: number;
  errorMessage?: string;
  updatedAt: string;
}

// ============================================================================
// Notification Types
// ============================================================================

export type NotificationType = 
  | 'alert' 
  | 'warning' 
  | 'info' 
  | 'maintenance' 
  | 'system' 
  | 'threshold_exceeded';

export interface CreateNotificationRequest {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  priority?: 'low' | 'medium' | 'high';
  link?: string;
}

export interface CreateNotificationFromTemplateRequest {
  userId: string;
  type: NotificationType;
  variables?: Record<string, string>;
}

export interface MarkAsReadRequest {
  notificationIds: string[];
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  priority?: 'low' | 'medium' | 'high';
  link?: string;
  createdAt: string;
}

export interface CreateNotificationTemplateRequest {
  type: NotificationType;
  language: string;
  title: string;
  message: string;
}

export interface UpdateNotificationTemplateRequest {
  title?: string;
  message?: string;
}

export interface NotificationTemplate {
  id: string;
  type: NotificationType;
  language: string;
  title: string;
  message: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Sensor Reading Types
// ============================================================================

export interface GetReadingsQuery {
  startTime: string;
  endTime: string;
  sensorSerialNumber?: string;
  stationId?: string | null;
  sensorType?: SensorType;
}

export interface AggregationQuery {
  startTime: string;
  endTime: string;
  sensorSerialNumber?: string;
  stationId?: string | null;
  sensorType?: SensorType;
  interval?: 'hour' | 'day' | 'week' | 'month';
}

export interface SensorReading {
  id: string;
  sensorSerialNumber: string;
  stationId: string;
  sensorType: SensorType;
  value: number;
  unit?: string;
  timestamp: string;
  quality?: 'good' | 'fair' | 'poor';
  metadata?: Record<string, unknown>;
}

export interface AggregatedData {
  sensorSerialNumber?: string;
  stationId?: string;
  sensorType?: SensorType;
  interval: string;
  startTime: string;
  endTime: string;
  average: number;
  min: number;
  max: number;
  count: number;
  dataPoints: Array<{
    timestamp: string;
    value: number;
  }>;
}

export interface DataQualityReport {
  sensorSerialNumber: string;
  hours: number;
  totalReadings: number;
  validReadings: number;
  invalidReadings: number;
  missingReadings: number;
  qualityScore: number;
  issues?: string[];
}

// ============================================================================
// Settings Types
// ============================================================================

export interface Settings {
  [key: string]: unknown;
}

export interface UpdateSettingsRequest {
  [key: string]: unknown;
}

// ============================================================================
// Station Alert Types
// ============================================================================

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface GetAlertsQuery {
  stationId?: string | null;
  sensorType?: SensorType;
  severity?: AlertSeverity;
  isActive?: boolean | null;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
  sort?: 'asc' | 'desc';
}

export interface ClearHistoryRequest {
  stationId?: string;
  sensorType?: SensorType;
  severity?: AlertSeverity;
  olderThan?: string;
}

export interface StationAlert {
  id: string;
  stationId: string;
  sensorType: SensorType;
  severity: AlertSeverity;
  message: string;
  isActive: boolean;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  resolvedAt?: string;
  thresholdValue?: number;
  actualValue?: number;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// System Types
// ============================================================================

export type SystemEventType = 
  | 'info' 
  | 'warning' 
  | 'error' 
  | 'critical' 
  | 'maintenance' 
  | 'backup' 
  | 'export';

export type SystemEventSource = 
  | 'api' 
  | 'scheduler' 
  | 'sensor' 
  | 'system' 
  | 'user' 
  | 'automated';

export interface CreateSystemEventRequest {
  type: SystemEventType;
  message: string;
  source?: SystemEventSource;
  metadata?: Record<string, unknown>;
}

export interface SystemEvent {
  id: string;
  type: SystemEventType;
  source: SystemEventSource;
  message: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface SystemEventSummary {
  total: number;
  byType: Record<SystemEventType, number>;
  bySource: Record<SystemEventSource, number>;
  recent: SystemEvent[];
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'down';
  uptime: number;
  database: 'connected' | 'disconnected';
  sensors: {
    total: number;
    active: number;
    inactive: number;
  };
  lastBackup?: string;
  version?: string;
}

export interface SystemStatistics {
  timeRange?: string;
  totalReadings: number;
  activeStations: number;
  activeSensors: number;
  alerts: {
    active: number;
    resolved: number;
  };
  users: {
    total: number;
    active: number;
  };
}

export interface DashboardData {
  systemHealth: SystemHealth;
  recentAlerts: StationAlert[];
  recentEvents: SystemEvent[];
  statistics: SystemStatistics;
  stationStatuses: Array<{
    stationId: string;
    name: string;
    status: 'healthy' | 'warning' | 'critical';
    activeSensors: number;
  }>;
}

// ============================================================================
// Threshold Types
// ============================================================================

export interface CreateThresholdRequest {
  sensorType: SensorType;
  severity: AlertSeverity;
  minValue?: number;
  maxValue?: number;
  isActive?: boolean;
  description?: string;
}

export interface UpdateThresholdRequest {
  minValue?: number;
  maxValue?: number;
  isActive?: boolean;
  description?: string;
}

export interface Threshold {
  id: string;
  sensorType: SensorType;
  severity: AlertSeverity;
  minValue?: number;
  maxValue?: number;
  isActive: boolean;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ValidateReadingResponse {
  isValid: boolean;
  severity?: AlertSeverity;
  message?: string;
  threshold?: Threshold;
}

// ============================================================================
// User Types
// ============================================================================

export type UserRole = 'admin' | 'user' | 'viewer' | 'operator';

export interface ChangeUserRoleRequest {
  id: string;
  role: UserRole;
}

export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
}

// ============================================================================
// User Activity Log Types
// ============================================================================

export type ActivityAction = 
  | 'login' 
  | 'logout' 
  | 'create' 
  | 'update' 
  | 'delete' 
  | 'view' 
  | 'export' 
  | 'import'
  | 'settings_change'
  | 'permission_change';

export interface CreateUserActivityLogRequest {
  userId: string;
  action: ActivityAction;
  resource?: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
}

export interface UserActivityLog {
  id: string;
  userId: string;
  action: ActivityAction;
  resource?: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  createdAt: string;
}

